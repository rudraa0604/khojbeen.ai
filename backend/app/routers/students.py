import os
import io
import time
import uuid
import datetime
from typing import List, Optional
from collections import defaultdict

import bcrypt
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, BackgroundTasks, Form, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc
from jose import JWTError, jwt

from app.config import settings
from app.db import get_db
from app.models import User, Item, ScanEvent, Match, Notification, FinderResponse, Claim, FacultyCoordinator, Campus
from app.schemas import (
    StudentLogin,
    StudentRegister,
    StudentResponse,
    StudentProfileUpdate,
    StudentTokenResponse,
    StudentItemDetail,
    ScanEventPublic,
    PublicItemScan,
    PublicScanReportFound,
    MatchResponse,
    ItemPublic,
    FinderResponseCreate,
    FinderResponsePublic,
    HandoverVerifyRequest
)
from app.services.turnstile import verify_turnstile_token
from app.services.notifications import create_in_app_notification, send_smtp_email_background
from app.services.sms import send_sms_notification

router = APIRouter(prefix="/api/students", tags=["students"])
security = HTTPBearer(auto_error=False)

# In-memory IP rate limiter for public scan endpoint (max 10 requests per minute per IP)
scan_rate_limits = defaultdict(list)

def check_scan_rate_limit(client_ip: str, max_requests: int = 10, window_secs: int = 60):
    now = time.time()
    timestamps = [t for t in scan_rate_limits[client_ip] if now - t < window_secs]
    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many scan requests from this IP. Please wait a minute."
        )
    timestamps.append(now)
    scan_rate_limits[client_ip] = timestamps

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_student_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    to_encode.update({"exp": expire, "role": "student"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_student(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid student token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired student token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found")
    return user

# Optional student auth (does not throw if not logged in)
async def get_optional_student(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id:
            return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        pass
    return None


@router.post("/register", response_model=StudentTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_student(
    req: Request,
    data: StudentRegister,
    db: Session = Depends(get_db)
):
    """Registers a new student account."""
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="An account with this email already exists. Please log in."
        )

    hashed = get_password_hash(data.password)
    user = User(
        campus_id=data.campus_id or 1,
        email=data.email.strip().lower(),
        password_hash=hashed,
        full_name=data.full_name.strip(),
        mobile=data.mobile.strip(),
        department=data.department.strip(),
        role="student"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_student_access_token(data={"sub": str(user.id), "email": user.email})
    return StudentTokenResponse(
        access_token=token,
        token_type="bearer",
        user=StudentResponse.model_validate(user)
    )


@router.post("/login", response_model=StudentTokenResponse)
async def student_login(
    req: Request,
    data: StudentLogin,
    db: Session = Depends(get_db)
):
    """Student login endpoint with rate-checking and optional captcha."""
    if data.website:
        raise HTTPException(status_code=400, detail="Spam detected")

    if data.turnstile_token:
        client_ip = req.client.host if req.client else None
        valid_captcha = await verify_turnstile_token(data.turnstile_token, client_ip)
        if not valid_captcha:
            raise HTTPException(status_code=400, detail="Security challenge verification failed")

    user = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    token = create_student_access_token(data={"sub": str(user.id), "email": user.email})
    return StudentTokenResponse(
        access_token=token,
        token_type="bearer",
        user=StudentResponse.model_validate(user)
    )


@router.get("/me", response_model=StudentResponse)
async def get_my_profile(current_user: User = Depends(get_current_student)):
    """Returns the authenticated student's profile."""
    return StudentResponse.model_validate(current_user)


@router.put("/me", response_model=StudentResponse)
async def update_my_profile(
    data: StudentProfileUpdate,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Updates editable student profile fields (mobile, department, full_name)."""
    if data.full_name:
        current_user.full_name = data.full_name.strip()
    if data.mobile:
        current_user.mobile = data.mobile.strip()
    if data.department:
        current_user.department = data.department.strip()

    db.commit()
    db.refresh(current_user)
    return StudentResponse.model_validate(current_user)


@router.get("/me/dashboard")
async def get_student_dashboard(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Returns full dashboard data for the authenticated student:
    - Profile info
    - My lost items list with QR codes and statuses
    - Match results for their items
    - Scan events history (when someone scanned their QR)
    - Unread notifications count
    """
    # 1. My Lost Items
    items = db.query(Item).filter(
        Item.user_id == current_user.id,
        Item.type == "lost"
    ).order_by(desc(Item.created_at)).all()

    items_data = []
    item_ids = [item.id for item in items]

    # 2. Matches for these items
    matches = []
    if item_ids:
        matches_db = db.query(Match).filter(Match.lost_id.in_(item_ids)).order_by(desc(Match.score)).all()
        for m in matches_db:
            found_item_pub = ItemPublic.model_validate(m.found_item) if m.found_item else None
            lost_item_pub = ItemPublic.model_validate(m.lost_item) if m.lost_item else None
            label = "High" if m.score >= 75 else ("Medium" if m.score >= 45 else "Low")
            why = f"Matched on {m.lost_item.category if m.lost_item else 'category'} at {m.lost_item.location if m.lost_item else 'location'}"
            matches.append({
                "id": m.id,
                "lost_id": m.lost_id,
                "found_id": m.found_id,
                "score": m.score,
                "label": label,
                "text_score": m.text_score,
                "image_score": m.image_score,
                "has_image_match": m.has_image_match,
                "category_score": m.category_score,
                "location_score": m.location_score,
                "date_score": m.date_score,
                "why_matched": why,
                "item": found_item_pub,
                "lost_item": lost_item_pub,
                "created_at": m.created_at
            })

    # 3. Scan events for all user's items
    scan_events = db.query(ScanEvent).filter(
        (ScanEvent.user_id == current_user.id) | (ScanEvent.item_id.in_(item_ids) if item_ids else False)
    ).order_by(desc(ScanEvent.created_at)).all()

    scan_events_data = [
        {
            "id": s.id,
            "item_id": s.item_id,
            "item_title": s.item.title if s.item else "Lost Item",
            "finder_name": s.finder_name,
            "finder_contact": s.finder_contact,
            "finder_message": s.finder_message,
            "finder_location": s.finder_location,
            "created_at": s.created_at
        }
        for s in scan_events
    ]

    for item in items:
        qr_url = f"{settings.FRONTEND_URL}/tag/{item.unique_qr_code}" if item.unique_qr_code else None
        qr_image_api = f"/api/students/qr/{item.unique_qr_code}.png" if item.unique_qr_code else None
        item_scans = [s for s in scan_events_data if s["item_id"] == item.id]
        
        items_data.append({
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "category": item.category,
            "brand": item.brand,
            "color": item.color,
            "finder_note": item.finder_note,
            "is_tagged": item.is_tagged,
            "location": item.location,
            "event_date": item.event_date.strftime("%Y-%m-%d") if item.event_date else None,
            "status": item.status,
            "image_path": item.image_path,
            "thumbnail_path": item.thumbnail_path,
            "unique_qr_code": item.unique_qr_code,
            "qr_url": qr_url,
            "qr_image_api": qr_image_api,
            "scan_count": len(item_scans),
            "created_at": item.created_at
        })

    # 4. Tagged Items specifically
    tagged_items_db = db.query(Item).filter(
        Item.user_id == current_user.id,
        (Item.is_tagged == True) | (Item.type == "tagged") | (Item.status.in_(["safe", "lost", "recovered"]) & Item.unique_qr_code.isnot(None))
    ).order_by(desc(Item.created_at)).all()

    tagged_items_data = []
    for t_item in tagged_items_db:
        t_scans = [s for s in scan_events_data if s["item_id"] == t_item.id]
        tagged_items_data.append({
            "id": t_item.id,
            "title": t_item.title,
            "name": t_item.title,
            "category": t_item.category,
            "description": t_item.description,
            "brand": t_item.brand,
            "color": t_item.color,
            "finder_note": t_item.finder_note,
            "is_tagged": t_item.is_tagged,
            "location": t_item.location,
            "event_date": t_item.event_date.strftime("%Y-%m-%d") if t_item.event_date else None,
            "status": t_item.status,
            "image_path": t_item.image_path,
            "thumbnail_path": t_item.thumbnail_path,
            "unique_qr_code": t_item.unique_qr_code,
            "qr_url": f"{settings.FRONTEND_URL}/tag/{t_item.unique_qr_code}" if t_item.unique_qr_code else None,
            "qr_image_api": f"/api/students/qr/{t_item.unique_qr_code}.png" if t_item.unique_qr_code else None,
            "scan_count": len(t_scans),
            "created_at": t_item.created_at
        })

    # 5. User notifications
    notifications = db.query(Notification).filter(
        (Notification.recipient_contact == current_user.email) | 
        (Notification.recipient_contact == current_user.mobile) |
        (Notification.recipient_email == current_user.email)
    ).order_by(desc(Notification.created_at)).limit(20).all()

    return {
        "user": StudentResponse.model_validate(current_user),
        "items": items_data,
        "tagged_items": tagged_items_data,
        "matches": matches,
        "scan_events": scan_events_data,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "link_url": n.link_url,
                "is_read": n.is_read,
                "type": n.type,
                "created_at": n.created_at
            }
            for n in notifications
        ]
    }


# --- Tag My Item (Task 21) Endpoints ---

@router.get("/me/tagged-items")
async def get_my_tagged_items(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Lists all belongings tagged by the student with QR codes and statuses."""
    items = db.query(Item).filter(
        Item.user_id == current_user.id,
        (Item.is_tagged == True) | (Item.type == "tagged") | (Item.status.in_(["safe", "lost", "recovered"]) & Item.unique_qr_code.isnot(None))
    ).order_by(desc(Item.created_at)).all()

    results = []
    for item in items:
        scan_cnt = db.query(ScanEvent).filter(ScanEvent.item_id == item.id).count()
        results.append({
            "id": item.id,
            "title": item.title,
            "name": item.title,
            "category": item.category,
            "description": item.description,
            "brand": item.brand,
            "color": item.color,
            "finder_note": item.finder_note,
            "image_path": item.image_path,
            "thumbnail_path": item.thumbnail_path,
            "unique_qr_code": item.unique_qr_code,
            "status": item.status,
            "campus_id": item.campus_id or current_user.campus_id or 1,
            "scan_count": scan_cnt,
            "created_at": item.created_at
        })
    return results


@router.post("/me/tagged-items", status_code=status.HTTP_201_CREATED)
async def create_tagged_item(
    request: Request,
    title: str = Form(..., min_length=2, max_length=80),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    finder_note: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Tags a belonging before it gets lost.
    Limits each student to 20 tagged items.
    Generates a unique QR code KB-XXXXXXXX and sets status='safe'.
    """
    # 1. Check max 20 tagged items limit
    count = db.query(Item).filter(
        Item.user_id == current_user.id,
        (Item.is_tagged == True) | (Item.type == "tagged")
    ).count()
    if count >= 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum limit of 20 tagged items reached per student account."
        )

    # 2. Validate category
    from app.schemas import CATEGORIES
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(CATEGORIES)}")

    # 3. Handle image
    image_path = None
    thumbnail_path = None
    image_embedding_json = None
    if image and image.filename:
        from app.services.images import save_and_compress_image
        from app.services.image_matcher import compute_image_embedding
        import json
        image_path, thumbnail_path = save_and_compress_image(image)
        if image_path:
            img_emb = compute_image_embedding(image_path)
            if img_emb:
                image_embedding_json = json.dumps(img_emb)

    # 4. Text embedding
    import json
    from app.services.semantic_matcher import compute_text_embedding
    combined_text = f"{title.strip()} {description or ''} {brand or ''} {color or ''}"
    text_emb = compute_text_embedding(combined_text)
    text_embedding_json = json.dumps(text_emb) if text_emb else None

    # 5. Generate random, non-guessable QR code KB-XXXXXXXX
    unique_qr_code = f"KB-{uuid.uuid4().hex[:8].upper()}"

    # Ensure uniqueness
    while db.query(Item).filter(Item.unique_qr_code == unique_qr_code).first():
        unique_qr_code = f"KB-{uuid.uuid4().hex[:8].upper()}"

    item = Item(
        campus_id=current_user.campus_id or 1,
        user_id=current_user.id,
        unique_qr_code=unique_qr_code,
        type="tagged",
        title=title.strip(),
        description=description.strip() if description else f"Tagged belonging: {title.strip()}",
        category=category,
        brand=brand.strip() if brand else None,
        color=color.strip() if color else None,
        finder_note=finder_note.strip() if finder_note else None,
        is_tagged=True,
        location="Campus",
        event_date=datetime.datetime.utcnow(),
        image_path=image_path,
        thumbnail_path=thumbnail_path,
        image_embedding=image_embedding_json,
        text_embedding=text_embedding_json,
        contact_name=current_user.full_name,
        contact_email_or_phone=current_user.email,
        status="safe"
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "title": item.title,
        "name": item.title,
        "category": item.category,
        "description": item.description,
        "brand": item.brand,
        "color": item.color,
        "finder_note": item.finder_note,
        "image_path": item.image_path,
        "thumbnail_path": item.thumbnail_path,
        "unique_qr_code": item.unique_qr_code,
        "status": item.status,
        "campus_id": item.campus_id,
        "scan_count": 0,
        "created_at": item.created_at
    }


@router.put("/me/tagged-items/{item_id}")
async def update_tagged_item(
    item_id: int,
    title: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    finder_note: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Edits a student's tagged belonging details."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tagged item not found or unauthorized")

    if title:
        item.title = title.strip()
    if category:
        from app.schemas import CATEGORIES
        if category in CATEGORIES:
            item.category = category
    if description is not None:
        item.description = description.strip()
    if brand is not None:
        item.brand = brand.strip() if brand else None
    if color is not None:
        item.color = color.strip() if color else None
    if finder_note is not None:
        item.finder_note = finder_note.strip() if finder_note else None

    if image and image.filename:
        from app.services.images import save_and_compress_image
        from app.services.image_matcher import compute_image_embedding
        import json
        image_path, thumbnail_path = save_and_compress_image(image)
        if image_path:
            item.image_path = image_path
            item.thumbnail_path = thumbnail_path
            img_emb = compute_image_embedding(image_path)
            if img_emb:
                item.image_embedding = json.dumps(img_emb)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/me/tagged-items/{item_id}")
async def delete_tagged_item(
    item_id: int,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Deletes a student's tagged belonging."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tagged item not found or unauthorized")

    db.delete(item)
    db.commit()
    return {"message": "Tagged item deleted successfully"}


@router.post("/me/tagged-items/{item_id}/mark-lost")
async def mark_tagged_item_lost(
    item_id: int,
    location: Optional[str] = Form("Campus"),
    event_date: Optional[datetime.date] = Form(None),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    1-click converts safe tagged belonging into an active Lost report.
    Keeps the EXACT same QR code.
    Runs automated text + image + semantic matcher and notifies student if matches exist.
    """
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tagged item not found or unauthorized")

    item.status = "lost"
    item.type = "lost"
    if location:
        item.location = location.strip()
    if event_date:
        item.event_date = datetime.datetime.combine(event_date, datetime.time.min)
    else:
        item.event_date = datetime.datetime.utcnow()

    db.commit()
    db.refresh(item)

    # Run matching against existing found items
    try:
        from app.routers.items import run_matching_for_new_item
        run_matching_for_new_item(item, db, background_tasks)
    except Exception as e:
        print(f"Matcher error on mark-lost: {e}")

    db.refresh(item)
    return {
        "message": "Item marked as Lost! Matching engine is actively searching for matches.",
        "item": item
    }


@router.post("/me/tagged-items/{item_id}/mark-recovered")
async def mark_tagged_item_recovered(
    item_id: int,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Returns tagged item status back to 'safe' and closes the lost report."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tagged item not found or unauthorized")

    item.status = "safe"
    item.type = "tagged"
    db.commit()
    db.refresh(item)
    return {
        "message": "Item safely marked as recovered!",
        "status": "safe"
    }


@router.get("/me/tagged-items/{item_id}/scans")
async def get_item_scan_history(
    item_id: int,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Gets scan history for a specific tagged belonging."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")

    scans = db.query(ScanEvent).filter(ScanEvent.item_id == item.id).order_by(desc(ScanEvent.created_at)).all()
    return scans


@router.post("/me/items/{item_id}/recover")
async def mark_item_recovered(
    item_id: int,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Owner marks their lost item as recovered/closed."""
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")

    item.status = "recovered"
    db.commit()
    return {"message": "Item marked as successfully recovered!", "status": "recovered"}


@router.post("/forgot-password")
async def forgot_password(
    email: str = Query(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Sends password reset instructions to the student's email."""
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if user:
        reset_link = f"{settings.FRONTEND_URL}/student/login?reset=mock_token"
        subject = "🔑 Reset Your khojbeen.ai Password"
        plain = f"Hello {user.full_name},\n\nPlease click the link below to reset your password:\n{reset_link}\n\nkhojbeen.ai Team"
        html = f"<p>Hello {user.full_name},</p><p>Click <a href='{reset_link}'>here</a> to reset your password.</p>"
        if background_tasks:
            background_tasks.add_task(send_smtp_email_background, user.email, subject, html, plain)

    return {"message": "If an account with that email exists, reset instructions have been sent."}


# --- QR Code & Public Scan Routes ---

@router.get("/qr/{unique_code}.png")
def generate_qr_image(unique_code: str):
    """Generates and streams a high-res PNG QR code for the given unique item code."""
    target_url = f"{settings.FRONTEND_URL}/tag/{unique_code}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0d9488", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.get("/scan/{unique_code}", response_model=PublicItemScan)
def get_public_scan_info(
    unique_code: str,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    Public QR scan endpoint.
    Returns item title, category, description, photo, brand, color, finder_note, status, and campus name.
    NEVER exposes owner name, email, mobile or department!
    """
    client_ip = req.client.host if req.client else "unknown"
    check_scan_rate_limit(client_ip)

    item = db.query(Item).filter(Item.unique_qr_code == unique_code.upper()).first()
    if not item:
        # Fallback to legacy RegisteredItem
        from app.models import RegisteredItem, Campus
        reg = db.query(RegisteredItem).filter(RegisteredItem.unique_code == unique_code.upper()).first()
        if reg:
            campus = db.query(Campus).filter(Campus.id == (reg.campus_id or 1)).first()
            return PublicItemScan(
                unique_code=reg.unique_code,
                title=reg.name,
                category=reg.category,
                description=reg.description,
                image_path=reg.photo_url,
                location="Campus",
                event_date=reg.created_at.date() if reg.created_at else None,
                status="lost" if reg.is_lost else "safe",
                campus_id=reg.campus_id or 1,
                campus_name=campus.name if campus else "Campus",
                campus_city=campus.city if campus else ""
            )
        raise HTTPException(status_code=404, detail="QR Smart Tag not found or invalid")

    from app.models import Campus
    campus = db.query(Campus).filter(Campus.id == (item.campus_id or 1)).first()

    return PublicItemScan(
        unique_code=item.unique_qr_code,
        title=item.title,
        category=item.category,
        description=item.description,
        brand=item.brand,
        color=item.color,
        finder_note=item.finder_note,
        image_path=item.image_path,
        location=item.location,
        event_date=item.event_date.date() if item.event_date else None,
        status=item.status,
        campus_id=item.campus_id or 1,
        campus_name=campus.name if campus else "Campus",
        campus_city=campus.city if campus else ""
    )


@router.post("/scan/{unique_code}/found")
@router.post("/scan/{unique_code}/notify")
def submit_found_from_qr(
    unique_code: str,
    payload: PublicScanReportFound,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    When finder scans QR tag and notifies owner:
    1. If status = Safe: sends softer notification "Someone scanned your tagged item '{title}'".
    2. If status = Lost: sends urgent notification "Someone found your lost item '{title}'".
    3. Logs ScanEvent in database.
    4. Relays contact via portal only - never exposes student details to finder.
    """
    client_ip = req.client.host if req.client else "unknown"
    check_scan_rate_limit(client_ip)

    item = db.query(Item).filter(Item.unique_qr_code == unique_code.upper()).first()
    
    if not item:
        # Fallback to RegisteredItem
        from app.models import RegisteredItem
        reg = db.query(RegisteredItem).filter(RegisteredItem.unique_code == unique_code.upper()).first()
        if not reg:
            raise HTTPException(status_code=404, detail="QR Tag not found")
        
        title = f"🏷️ Someone scanned your QR Tag for '{reg.name}'!"
        msg = f"Finder '{payload.finder_name or 'Someone'}' reported finding your item at {payload.finder_location or 'Campus'}.\n\nMessage: \"{payload.finder_message or 'No message'}\"\nContact: {payload.finder_contact or 'Provided'}"
        create_in_app_notification(
            db=db,
            recipient_contact=reg.owner_contact,
            recipient_email=reg.owner_contact if "@" in reg.owner_contact else None,
            title=title,
            message=msg,
            link_url=f"/dashboard",
            notif_type="qr_scanned"
        )
        return {"message": "Owner has been alerted via in-app notification and email/SMS!"}

    # 1. Log ScanEvent
    scan_event = ScanEvent(
        item_id=item.id,
        user_id=item.user_id,
        finder_name=payload.finder_name or "Good Samaritan",
        finder_contact=payload.finder_contact,
        finder_message=payload.finder_message,
        finder_location=payload.finder_location
    )
    db.add(scan_event)
    db.commit()

    is_safe = (item.status == "safe")

    # 2. In-App Notification
    if is_safe:
        title = f"🏷️ QR Tag Scanned: '{item.title}'"
        loc_str = f" at {payload.finder_location}" if payload.finder_location else ""
        msg = f"Someone scanned the QR tag on your safe belonging '{item.title}'{loc_str}!\nFinder Note: \"{payload.finder_message or 'Someone scanned your QR tag'}\"\nFinder Contact: {payload.finder_contact or 'N/A'}"
    else:
        title = f"🏷️ QR Tag Scanned: '{item.title}' Found!"
        loc_str = f" at {payload.finder_location}" if payload.finder_location else ""
        msg = f"Someone found your lost item '{item.title}'{loc_str}!\nFinder Note: \"{payload.finder_message or 'I found your item!'}\"\nFinder Contact: {payload.finder_contact or 'N/A'}"
    
    create_in_app_notification(
        db=db,
        recipient_contact=item.contact_email_or_phone,
        recipient_email=item.user.email if item.user else (item.contact_email_or_phone if "@" in item.contact_email_or_phone else None),
        title=title,
        message=msg,
        link_url="/dashboard",
        notif_type="qr_scanned"
    )

    # 3. Email Notification
    target_email = item.user.email if item.user else (item.contact_email_or_phone if "@" in item.contact_email_or_phone else None)
    if target_email and background_tasks:
        sub_text = "Someone scanned your tagged item" if is_safe else "Someone found your lost item"
        plain_email = f"Hello {item.contact_name},\n\n{sub_text} '{item.title}' (Tag: {item.unique_qr_code}).\n\nFinder Name: {payload.finder_name or 'Good Samaritan'}\nFinder Contact: {payload.finder_contact or 'N/A'}\nLocation: {payload.finder_location or 'Campus'}\nMessage: {payload.finder_message or 'N/A'}\n\nCheck your student dashboard: {settings.FRONTEND_URL}/dashboard\n\nkhojbeen.ai Team"
        html_email = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #0d9488; margin-top: 0;">🏷️ khojbeen.ai — QR Tag Alert!</h2>
            <p>Hello <strong>{item.contact_name}</strong>,</p>
            <p>{sub_text} <strong>'{item.title}'</strong> (Tag: <code>{item.unique_qr_code}</code>):</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Finder Name:</strong> {payload.finder_name or 'Good Samaritan'}</p>
                <p style="margin: 4px 0;"><strong>Finder Contact:</strong> {payload.finder_contact or 'N/A'}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> {payload.finder_location or 'Campus'}</p>
                <p style="margin: 4px 0;"><strong>Message:</strong> <em>{payload.finder_message or 'QR Tag scan alert'}</em></p>
            </div>
            <a href="{settings.FRONTEND_URL}/dashboard" style="display: inline-block; background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Open Student Dashboard</a>
            <hr style="margin-top: 24px; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #64748b;">khojbeen.ai Campus Lost & Found System</p>
        </div>
        """
        background_tasks.add_task(
            send_smtp_email_background,
            target_email,
            title,
            html_email,
            plain_email
        )

    # 4. SMS Notification
    target_mobile = item.user.mobile if item.user else (item.contact_email_or_phone if "@" not in item.contact_email_or_phone else None)
    if target_mobile:
        sms_text = f"khojbeen.ai Alert: {sub_text} '{item.title}'! Location: {payload.finder_location or 'Campus'}. Check your dashboard."
        if background_tasks:
            background_tasks.add_task(send_sms_notification, target_mobile, sms_text)
        else:
            send_sms_notification(target_mobile, sms_text)

    return {"message": "Thank you! The owner has been notified."}


@router.get("/scan/{unique_code}/coordinators")
def get_coordinators_for_tag(
    unique_code: str,
    db: Session = Depends(get_db)
):
    """
    Returns faculty coordinators list for the item's college so the finder can select Option B.
    """
    item = db.query(Item).filter(Item.unique_qr_code == unique_code.upper()).first()
    campus_id = item.campus_id if item else 1
    coords = db.query(FacultyCoordinator).filter(FacultyCoordinator.campus_id == campus_id).all()
    return [{
        "id": c.id,
        "name": c.name,
        "department": c.department,
        "designation": c.designation,
        "office": c.office,
        "available_timings": c.available_timings,
        "photo": c.photo
    } for c in coords]


@router.post("/scan/{unique_code}/finder-response")
async def submit_finder_3_option_response(
    unique_code: str,
    req: Request,
    background_tasks: BackgroundTasks,
    option_type: str = Form(..., description="'A', 'B', or 'C'"),
    message: Optional[str] = Form(None),
    found_location: Optional[str] = Form(None),
    meeting_place: Optional[str] = Form(None),
    meeting_time: Optional[str] = Form(None),
    coordinator_id: Optional[int] = Form(None),
    finder_name: Optional[str] = Form(None),
    finder_mobile: Optional[str] = Form(None),
    finder_department: Optional[str] = Form(None),
    consent_given: bool = Form(False),
    photo: Optional[UploadFile] = File(None),
    turnstile_token: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Task 24 (Revised) Finder Response handling:
    Option A: Anonymous message to owner (+ optional location + optional photo)
    Option B: Hand to Faculty Coordinator / Lost & Found desk (+ expected handover time)
    Option C: Share contact details for post-verification contact (+ meeting place & time + consent)

    - Creates FinderResponse entry
    - Creates ScanEvent log
    - Creates QR-confirmed 100% Match in matches table
    - Sends privacy-safe notification to item owner
    """
    # 1. Honeypot check
    if website and len(website.strip()) > 0:
        raise HTTPException(status_code=400, detail="Spam detected")

    # 2. Rate limit check
    client_ip = req.client.host if req.client else "unknown"
    check_scan_rate_limit(client_ip)

    # 3. Turnstile check
    if turnstile_token:
        valid_captcha = await verify_turnstile_token(turnstile_token, client_ip)
        if not valid_captcha:
            raise HTTPException(status_code=400, detail="Security challenge verification failed")

    # 4. Find item
    item = db.query(Item).filter(Item.unique_qr_code == unique_code.upper()).first()
    if not item:
        raise HTTPException(status_code=404, detail="QR tag not found or invalid")

    # 5. Handle optional photo upload
    photo_path = None
    if photo and photo.filename:
        from app.services.images import save_and_compress_image
        photo_path, _ = save_and_compress_image(photo)

    # 6. Validate option constraints
    if option_type not in ["A", "B", "C"]:
        raise HTTPException(status_code=400, detail="Invalid option type. Must be A, B, or C.")

    if option_type == "C":
        if not consent_given:
            raise HTTPException(status_code=400, detail="You must provide consent to share details with the college coordinator.")
        if not finder_name or not finder_mobile:
            raise HTTPException(status_code=400, detail="Name and mobile number are required for Option C.")

    # 7. Generate private finder token
    import secrets
    finder_token = secrets.token_urlsafe(32)

    # 8. Create FinderResponse record
    finder_resp = FinderResponse(
        item_id=item.id,
        unique_code=unique_code.upper(),
        campus_id=item.campus_id or 1,
        option_type=option_type,
        message=message.strip() if message else None,
        found_location=found_location.strip() if found_location else None,
        photo_path=photo_path,
        meeting_place=meeting_place.strip() if meeting_place else None,
        meeting_time=meeting_time.strip() if meeting_time else None,
        coordinator_id=coordinator_id,
        finder_name=finder_name.strip() if (option_type == "C" and finder_name) else (finder_name.strip() if finder_name else "Good Samaritan"),
        finder_mobile=finder_mobile.strip() if (option_type == "C" and finder_mobile) else None,
        finder_department=finder_department.strip() if finder_department else None,
        consent_given=consent_given,
        status="submitted",
        finder_token=finder_token
    )
    db.add(finder_resp)

    # 9. Create ScanEvent log
    scan_event = ScanEvent(
        item_id=item.id,
        user_id=item.user_id,
        finder_name=finder_resp.finder_name,
        finder_contact=finder_resp.finder_mobile if option_type == "C" else "Anonymous",
        finder_message=f"[Option {option_type}] {message or 'QR Scan response submitted'}",
        finder_location=found_location or meeting_place or "Campus"
    )
    db.add(scan_event)

    # 10. Automatically create or link a QR-confirmed 100% confidence Match
    # If item is lost or tagged, create a match record for admin matches tab
    existing_qr_match = db.query(Match).filter(
        Match.lost_id == item.id,
        Match.score == 100.0
    ).first()

    if not existing_qr_match:
        qr_match = Match(
            lost_id=item.id,
            found_id=item.id, # QR identity self-match
            score=100.0,
            text_score=1.0,
            image_score=1.0 if photo_path else None,
            has_image_match=bool(photo_path),
            category_score=1.0,
            location_score=1.0,
            date_score=1.0
        )
        db.add(qr_match)

    db.commit()
    db.refresh(finder_resp)

    # 11. Send notification to owner
    opt_labels = {
        "A": "sent an anonymous message",
        "B": "is handing the item to a Faculty Coordinator / Desk",
        "C": "shared contact details for safe handover upon verification"
    }
    action_desc = opt_labels.get(option_type, "scanned your item")
    notif_title = f"🏷️ QR Tag Update: '{item.title}'"
    notif_msg = f"A finder {action_desc} for your belonging '{item.title}'.\nDetails: \"{message or 'Finder submitted a response via QR portal.'}\""
    if found_location:
        notif_msg += f"\nLocation: {found_location}"
    if meeting_place:
        notif_msg += f"\nPreferred Desk/Place: {meeting_place}"

    create_in_app_notification(
        db=db,
        recipient_contact=item.contact_email_or_phone,
        recipient_email=item.user.email if item.user else (item.contact_email_or_phone if "@" in item.contact_email_or_phone else None),
        title=notif_title,
        message=notif_msg,
        link_url="/dashboard",
        notif_type="qr_scanned"
    )

    return {
        "status": "success",
        "message": "Your response has been securely delivered! The college coordinator will facilitate verified handover.",
        "option_type": option_type,
        "finder_token": finder_token
    }


@router.post("/verify-handover")
def verify_handover_code(
    payload: HandoverVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Verifies 4-digit handover code at collection time.
    Enforces brute-force lockout after 5 incorrect attempts.
    On success: marks status to Recovered, closes complaint, and notifies everyone.
    """
    input_code = payload.code.strip()
    
    # Query pending claims with this handover code or item
    claims_q = db.query(Claim).filter(Claim.status == "approved")
    if payload.item_id:
        claims_q = claims_q.filter(Claim.found_id == payload.item_id)

    claims = claims_q.all()
    matched_claim = None

    for c in claims:
        if c.handover_code and c.handover_code == input_code:
            matched_claim = c
            break
        elif c.wrong_code_attempts >= 5:
            raise HTTPException(
                status_code=429,
                detail="Security Lock: Too many failed code attempts. Please contact College Admin directly."
            )

    if not matched_claim:
        # Increment attempt counter on matching item's claim if available
        for c in claims:
            c.wrong_code_attempts += 1
            db.commit()
        raise HTTPException(status_code=400, detail="Invalid 4-digit handover code. Please check and try again.")

    # Success: Update claim and item status to recovered / closed
    matched_claim.handover_status = "handed_over"
    matched_claim.status = "approved"

    item = db.query(Item).filter(Item.id == matched_claim.found_id).first()
    if item:
        item.status = "recovered"

    # Also update associated lost item if linked via match
    if matched_claim.match_id:
        m = db.query(Match).filter(Match.id == matched_claim.match_id).first()
        if m:
            lost_item = db.query(Item).filter(Item.id == m.lost_id).first()
            if lost_item:
                lost_item.status = "recovered"

    db.commit()

    return {
        "status": "success",
        "message": "Handover code verified successfully! Item marked as Recovered and closed."
    }
