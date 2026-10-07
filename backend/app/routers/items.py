import json
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Response, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.db import get_db
from app.models import Item, Match, User
from app.schemas import ItemPublic, PaginatedItems, CATEGORIES, LOCATIONS
from app.config import settings
from app.services.images import save_and_compress_image
from app.services.turnstile import verify_turnstile_token
from app.services.matcher import calculate_match
from app.services.image_matcher import compute_image_embedding
from app.services.semantic_matcher import compute_text_embedding
from app.services.notifications import notify_match_detected
from app.routers.students import get_optional_student, get_password_hash, create_student_access_token, verify_password

router = APIRouter(prefix="/api/items", tags=["items"])

def run_matching_for_new_item(new_item: Item, db: Session, background_tasks: Optional[BackgroundTasks] = None):
    """
    Computes matches between new_item and existing open/matched items of opposite type.
    Saves top matches into the matches table and triggers notifications if threshold is met.
    """
    opposite_type = "found" if new_item.type == "lost" else "lost"
    query = db.query(Item).filter(
        Item.type == opposite_type,
        Item.status.in_(["open", "matched", "claimed"])
    )
    if new_item.campus_id:
        query = query.filter(or_(Item.campus_id == new_item.campus_id, Item.campus_id.is_(None)))

    candidates = query.all()
    if not candidates:
        return

    scored_matches = []
    for cand in candidates:
        lost_item = new_item if new_item.type == "lost" else cand
        found_item = cand if new_item.type == "lost" else new_item

        result = calculate_match(lost_item, found_item)
        scored_matches.append((cand, result, lost_item, found_item))

    # Sort descending by score
    scored_matches.sort(key=lambda x: x[1]["score"], reverse=True)
    top_matches = scored_matches[:6]

    has_significant_match = False
    for cand, res, lost_i, found_i in top_matches:
        if res["score"] >= 25.0:
            match_entry = Match(
                lost_id=lost_i.id,
                found_id=found_i.id,
                score=res["score"],
                text_score=res["text_score"],
                image_score=res.get("image_score"),
                has_image_match=res.get("has_image_match", False),
                category_score=res["category_score"],
                location_score=res["location_score"],
                date_score=res["date_score"]
            )
            db.add(match_entry)
            if res["score"] >= 40.0:
                has_significant_match = True

            if res["score"] >= settings.MATCH_NOTIFICATION_THRESHOLD:
                notify_match_detected(
                    db=db,
                    background_tasks=background_tasks,
                    lost_item=lost_i,
                    found_item=found_i,
                    score=res["score"],
                    why_matched=res.get("why_matched", "High similarity detected")
                )

    if has_significant_match:
        if new_item.status == "open":
            new_item.status = "matched"

    db.commit()


@router.post("", response_model=ItemPublic, status_code=status.HTTP_201_CREATED)
async def create_item(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    type: str = Form(..., description="'lost' or 'found'"),
    title: str = Form(..., min_length=3, max_length=80),
    description: str = Form(..., min_length=10, max_length=500),
    category: str = Form(...),
    location: str = Form(...),
    event_date: datetime.date = Form(...),
    contact_name: str = Form(..., min_length=2, max_length=100),
    contact_email_or_phone: str = Form(..., min_length=5, max_length=100),
    contact_mobile: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    campus_id: Optional[int] = Form(1),
    image: Optional[UploadFile] = File(None),
    turnstile_token: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    current_student: Optional[User] = Depends(get_optional_student),
    db: Session = Depends(get_db)
):
    # 1. Honeypot check
    if website and isinstance(website, str) and len(website.strip()) > 0:
        raise HTTPException(status_code=400, detail="Spam detected")

    # 2. Turnstile verification
    client_ip = request.client.host if request.client else None
    token_str = turnstile_token if isinstance(turnstile_token, str) else None
    valid_captcha = await verify_turnstile_token(token_str, client_ip)
    if not valid_captcha:
        raise HTTPException(status_code=400, detail="Security challenge verification failed")

    # 3. Input Validation
    if type not in ("lost", "found"):
        raise HTTPException(status_code=400, detail="Type must be 'lost' or 'found'")
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(CATEGORIES)}")
    if event_date > datetime.date.today():
        raise HTTPException(status_code=400, detail="Event date cannot be in the future")

    # 4. Handle Account Linking / Creation for Lost Reports (Task 14)
    user_id = None
    student_token = None
    unique_qr_code = None

    if type == "lost":
        unique_qr_code = f"KB-{uuid.uuid4().hex[:8].upper()}"

        if current_student:
            user_id = current_student.id
            if not contact_name:
                contact_name = current_student.full_name
            if not contact_email_or_phone:
                contact_email_or_phone = current_student.email
        else:
            # Check if an account with this email already exists
            email_candidate = contact_email_or_phone.strip().lower() if isinstance(contact_email_or_phone, str) and "@" in contact_email_or_phone else None
            if email_candidate:
                existing_user = db.query(User).filter(User.email == email_candidate).first()
                if existing_user:
                    if password and isinstance(password, str) and verify_password(password, existing_user.password_hash):
                        user_id = existing_user.id
                        student_token = create_student_access_token(data={"sub": str(existing_user.id), "email": existing_user.email})
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail="An account with this email already exists. Please log in first or enter correct password."
                        )
                else:
                    # Create student account if password provided
                    if password and isinstance(password, str) and len(password) >= 8:
                        hashed_pw = get_password_hash(password)
                        user_mobile = contact_mobile.strip() if contact_mobile and isinstance(contact_mobile, str) and len(contact_mobile.strip()) > 0 else (contact_email_or_phone if isinstance(contact_email_or_phone, str) and "@" not in contact_email_or_phone else "N/A")
                        user_dept = department.strip() if department and isinstance(department, str) and len(department.strip()) > 0 else "General"
                        new_user = User(
                            campus_id=campus_id or 1,
                            email=email_candidate,
                            password_hash=hashed_pw,
                            full_name=contact_name.strip() if isinstance(contact_name, str) else "Student",
                            mobile=user_mobile,
                            department=user_dept,
                            role="student"
                        )
                        db.add(new_user)
                        db.commit()
                        db.refresh(new_user)
                        user_id = new_user.id
                        student_token = create_student_access_token(data={"sub": str(new_user.id), "email": new_user.email})

    # 5. Handle optional image upload, compression & embedding
    image_path = None
    thumbnail_path = None
    image_embedding_json = None
    if image and image.filename:
        image_path, thumbnail_path = save_and_compress_image(image)
        if image_path:
            img_emb = compute_image_embedding(image_path)
            if img_emb:
                image_embedding_json = json.dumps(img_emb)

    # 6. Precompute text embedding (Task 9)
    combined_text = f"{title.strip()} {description.strip()}"
    text_emb = compute_text_embedding(combined_text)
    text_embedding_json = json.dumps(text_emb) if text_emb else None

    # 7. Create item
    item = Item(
        campus_id=campus_id or 1,
        user_id=user_id,
        unique_qr_code=unique_qr_code,
        type=type,
        title=title.strip(),
        description=description.strip(),
        category=category,
        location=location,
        event_date=datetime.datetime.combine(event_date, datetime.time.min),
        image_path=image_path,
        thumbnail_path=thumbnail_path,
        image_embedding=image_embedding_json,
        text_embedding=text_embedding_json,
        contact_name=contact_name.strip(),
        contact_email_or_phone=contact_email_or_phone.strip(),
        status="open"
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # 8. Run automated matching engine
    run_matching_for_new_item(item, db, background_tasks)
    db.refresh(item)

    # If student token was generated, set it in response header
    if student_token:
        response.headers["X-Student-Token"] = student_token

    return item


from app.models import Item, Match, User, Campus, CrossCollegeInquiry, Notification
from app.schemas import ItemPublic, PaginatedItems, CATEGORIES, LOCATIONS, CrossCollegeInquiryCreate, CrossCollegeInquiryPublic

def populate_item_campus_info(item: Item, db: Session) -> ItemPublic:
    campus_name = "Main Campus"
    campus_logo = None
    if item.campus_id:
        c = db.query(Campus).filter(Campus.id == item.campus_id).first()
        if c:
            campus_name = c.name
            campus_logo = c.logo_url

    return ItemPublic(
        id=item.id,
        title=item.title,
        description=item.description,
        category=item.category,
        brand=item.brand,
        color=item.color,
        location=item.location,
        event_date=item.event_date.date() if isinstance(item.event_date, datetime.datetime) else item.event_date,
        type=item.type,
        image_path=item.image_path,
        thumbnail_path=item.thumbnail_path,
        status=item.status,
        unique_qr_code=item.unique_qr_code,
        is_tagged=bool(item.is_tagged),
        campus_id=item.campus_id or 1,
        campus_name=campus_name,
        campus_logo=campus_logo,
        created_at=item.created_at
    )

@router.get("", response_model=PaginatedItems)
def list_items(
    type: Optional[str] = Query(None, pattern="^(lost|found)$"),
    category: Optional[str] = None,
    location: Optional[str] = None,
    campus_id: Optional[int] = None,
    all_campuses: bool = Query(False),
    include_all_colleges: bool = Query(False),
    date_from: Optional[datetime.date] = None,
    date_to: Optional[datetime.date] = None,
    q: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Item)

    # Exclude pre-tagged items that are still 'safe' from general public lost/found search
    query = query.filter(Item.status != "safe")

    if all_campuses or include_all_colleges:
        # Include items from colleges that allow sharing reports
        sharing_campus_ids = [c.id for c in db.query(Campus).filter(Campus.share_reports == True, Campus.is_active == True).all()]
        query = query.filter(or_(Item.campus_id.in_(sharing_campus_ids), Item.campus_id.is_(None)))
    elif isinstance(campus_id, int):
        query = query.filter(or_(Item.campus_id == campus_id, Item.campus_id.is_(None)))

    if isinstance(type, str) and type in ("lost", "found"):
        query = query.filter(Item.type == type)
    if isinstance(category, str) and category != "All" and len(category.strip()) > 0:
        query = query.filter(Item.category == category)
    if isinstance(location, str) and location != "All" and len(location.strip()) > 0:
        query = query.filter(Item.location == location)
    if isinstance(status_filter, str) and status_filter != "All" and len(status_filter.strip()) > 0:
        query = query.filter(Item.status == status_filter)
    if isinstance(date_from, datetime.date):
        query = query.filter(Item.event_date >= datetime.datetime.combine(date_from, datetime.time.min))
    if isinstance(date_to, datetime.date):
        query = query.filter(Item.event_date <= datetime.datetime.combine(date_to, datetime.time.max))
    if isinstance(q, str) and q.strip():
        search_terms = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Item.title.ilike(search_terms),
                Item.description.ilike(search_terms),
                Item.location.ilike(search_terms)
            )
        )

    total = query.count()
    items_db = query.order_by(desc(Item.created_at)).offset((page - 1) * size).limit(size).all()
    pages = (total + size - 1) // size if total > 0 else 1

    formatted_items = [populate_item_campus_info(i, db) for i in items_db]

    return PaginatedItems(
        items=formatted_items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/{item_id}", response_model=ItemPublic)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return populate_item_campus_info(item, db)


@router.post("/{item_id}/inquire", response_model=CrossCollegeInquiryPublic)
def create_cross_college_inquiry(
    item_id: int,
    payload: CrossCollegeInquiryCreate,
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    to_campus_id = item.campus_id or 1
    to_campus = db.query(Campus).filter(Campus.id == to_campus_id).first()
    from_campus = db.query(Campus).filter(Campus.id == payload.from_campus_id).first() if payload.from_campus_id else None

    # Check student user if email/mobile matches
    user = db.query(User).filter(
        or_(User.email == payload.sender_contact, User.mobile == payload.sender_contact)
    ).first()

    inquiry = CrossCollegeInquiry(
        item_id=item_id,
        from_campus_id=payload.from_campus_id,
        to_campus_id=to_campus_id,
        user_id=user.id if user else None,
        sender_name=payload.sender_name.strip(),
        sender_contact=payload.sender_contact.strip(),
        message=payload.message.strip(),
        inquiry_type=payload.inquiry_type or "claim",
        status="pending"
    )
    db.add(inquiry)

    # Send Notification to report owner if they have contact on file
    if item.contact_email_or_phone:
        notif = Notification(
            recipient_contact=item.contact_email_or_phone,
            type="cross_college_inquiry",
            title=f"New Cross-College Inquiry for '{item.title}'",
            message=f"{payload.sender_name} from {from_campus.name if from_campus else 'another campus'} sent an inquiry: '{payload.message[:120]}...'",
            link_url=f"/items/{item.id}"
        )
        db.add(notif)

    db.commit()
    db.refresh(inquiry)

    return CrossCollegeInquiryPublic(
        id=inquiry.id,
        item_id=inquiry.item_id,
        item_title=item.title,
        item_type=item.type,
        from_campus_id=inquiry.from_campus_id,
        from_campus_name=from_campus.name if from_campus else "External / Visitor",
        to_campus_id=inquiry.to_campus_id,
        to_campus_name=to_campus.name if to_campus else "Main Campus",
        sender_name=inquiry.sender_name,
        sender_contact=inquiry.sender_contact,
        message=inquiry.message,
        inquiry_type=inquiry.inquiry_type,
        status=inquiry.status,
        admin_reply=inquiry.admin_reply,
        created_at=inquiry.created_at
    )
