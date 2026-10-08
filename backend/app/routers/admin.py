import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.db import get_db
from app.models import Item, Claim, Match, Admin, Campus, User, ScanEvent, FacultyCoordinator, CrossCollegeInquiry, Notification, FinderResponse
from app.schemas import (
    AdminDashboardStats, ClaimAdmin, ClaimDecision, ItemAdmin,
    CollegeSettingsUpdate, CampusPublic, CrossCollegeInquiryPublic, CrossCollegeInquiryReply,
    StudentResponse, FacultyCoordinatorPublic, FacultyCoordinatorCreate, FacultyCoordinatorUpdate,
    AdminMatchPair, AdminMatchesResponse, FinderResponseAdmin
)
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

def scope_admin_query(query, model, current_admin: Admin):
    """Helper to enforce campus scoping for college_admins."""
    if current_admin.role != "super_admin" and current_admin.campus_id is not None:
        if hasattr(model, "campus_id"):
            return query.filter(model.campus_id == current_admin.campus_id)
    return query

@router.get("/dashboard", response_model=AdminDashboardStats)
def get_dashboard_stats(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    campus_id = current_admin.campus_id if current_admin.role != "super_admin" else None
    
    # Base queries scoped by campus
    items_q = db.query(Item)
    if campus_id:
        items_q = items_q.filter(Item.campus_id == campus_id)

    total_items = items_q.count()
    open_lost = items_q.filter(Item.type == "lost", Item.status == "open").count()
    open_found = items_q.filter(Item.type == "found", Item.status == "open").count()
    matched_count = items_q.filter(Item.status == "matched").count()
    claimed_count = items_q.filter(Item.status == "claimed").count()
    closed_count = items_q.filter(Item.status == "closed").count()
    tagged_items_count = items_q.filter(Item.is_tagged == True).count()

    # Active students count
    students_q = db.query(User).filter(User.role == "student")
    if campus_id:
        students_q = students_q.filter(User.campus_id == campus_id)
    active_students_count = students_q.filter(User.is_disabled == False).count()

    # QR scans count
    scans_q = db.query(ScanEvent).join(Item, ScanEvent.item_id == Item.id)
    if campus_id:
        scans_q = scans_q.filter(Item.campus_id == campus_id)
    qr_scans_count = scans_q.count()

    # Pending claims
    claims_q = db.query(Claim).join(Item, Claim.found_id == Item.id)
    if campus_id:
        claims_q = claims_q.filter(Item.campus_id == campus_id)
    pending_claims_db = claims_q.filter(Claim.status == "pending").order_by(desc(Claim.created_at)).all()
    pending_claims_count = len(pending_claims_db)

    formatted_claims = []
    for c in pending_claims_db:
        found_i = db.query(Item).filter(Item.id == c.found_id).first()
        formatted_claims.append(
            ClaimAdmin(
                id=c.id,
                found_id=c.found_id,
                match_id=c.match_id,
                claimant_name=c.claimant_name,
                claimant_contact=c.claimant_contact,
                proof_text=c.proof_text,
                status=c.status,
                admin_note=c.admin_note,
                created_at=c.created_at,
                decided_at=c.decided_at,
                found_item=ItemAdmin.model_validate(found_i) if found_i else None
            )
        )

    # Campus details
    campus_name = "All Campuses"
    campus_logo = None
    share_reports = True
    announcement = None

    if current_admin.campus_id:
        campus = db.query(Campus).filter(Campus.id == current_admin.campus_id).first()
        if campus:
            campus_name = campus.name
            campus_logo = campus.logo_url
            share_reports = campus.share_reports if campus.share_reports is not None else True
            announcement = campus.announcement

    # Recent activity
    recent_items = items_q.order_by(desc(Item.created_at)).limit(5).all()
    recent_activity = []
    for item in recent_items:
        recent_activity.append({
            "id": f"item-{item.id}",
            "type": item.type,
            "title": item.title,
            "category": item.category,
            "status": item.status,
            "timestamp": item.created_at.isoformat() if item.created_at else None
        })

    return AdminDashboardStats(
        total_items=total_items,
        open_lost=open_lost,
        open_found=open_found,
        matched_count=matched_count,
        claimed_count=claimed_count,
        closed_count=closed_count,
        pending_claims_count=pending_claims_count,
        active_students_count=active_students_count,
        qr_scans_count=qr_scans_count,
        tagged_items_count=tagged_items_count,
        campus_name=campus_name,
        campus_logo=campus_logo,
        share_reports=share_reports,
        announcement=announcement,
        pending_claims=formatted_claims,
        recent_activity=recent_activity
    )

@router.get("/claims", response_model=List[ClaimAdmin])
def list_all_claims(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    claims_q = db.query(Claim).join(Item, Claim.found_id == Item.id)
    if current_admin.role != "super_admin" and current_admin.campus_id:
        claims_q = claims_q.filter(Item.campus_id == current_admin.campus_id)
    
    claims = claims_q.order_by(desc(Claim.created_at)).all()
    res = []
    for c in claims:
        found_i = db.query(Item).filter(Item.id == c.found_id).first()
        res.append(
            ClaimAdmin(
                id=c.id,
                found_id=c.found_id,
                match_id=c.match_id,
                claimant_name=c.claimant_name,
                claimant_contact=c.claimant_contact,
                claimant_department=getattr(c, "claimant_department", None),
                proof_text=c.proof_text,
                secret_question=getattr(c, "secret_question", None),
                secret_answer=getattr(c, "secret_answer", None),
                claimant_answer=getattr(c, "claimant_answer", None),
                proof_image=getattr(c, "proof_image", None),
                status=c.status,
                admin_note=c.admin_note,
                handover_code=getattr(c, "handover_code", None),
                handover_status=getattr(c, "handover_status", "pending"),
                created_at=c.created_at,
                decided_at=c.decided_at,
                found_item=ItemAdmin.model_validate(found_i) if found_i else None
            )
        )
    return res

@router.patch("/claims/{claim_id}", response_model=ClaimAdmin)
def update_claim_status(
    claim_id: int,
    decision: ClaimDecision,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    found_item = db.query(Item).filter(Item.id == claim.found_id).first()
    if current_admin.role != "super_admin" and current_admin.campus_id:
        if found_item and found_item.campus_id != current_admin.campus_id:
            raise HTTPException(status_code=403, detail="Not authorized to manage claims for other colleges")

    claim.status = decision.status
    claim.admin_note = decision.admin_note
    claim.decided_at = datetime.datetime.utcnow()

    if decision.status == "approved":
        import random
        if not getattr(claim, "handover_code", None):
            claim.handover_code = str(random.randint(1000, 9999))
        claim.handover_status = "pending"
        if found_item:
            found_item.status = "closed"
        if claim.match_id:
            match = db.query(Match).filter(Match.id == claim.match_id).first()
            if match:
                lost_item = db.query(Item).filter(Item.id == match.lost_id).first()
                if lost_item:
                    lost_item.status = "closed"
    elif decision.status == "rejected":
        if found_item and found_item.status == "claimed":
            has_matches = db.query(Match).filter(
                (Match.found_id == found_item.id) | (Match.lost_id == found_item.id)
            ).count() > 0
            found_item.status = "matched" if has_matches else "open"

    db.commit()
    db.refresh(claim)

    return ClaimAdmin(
        id=claim.id,
        found_id=claim.found_id,
        match_id=claim.match_id,
        claimant_name=claim.claimant_name,
        claimant_contact=claim.claimant_contact,
        claimant_department=getattr(claim, "claimant_department", None),
        proof_text=claim.proof_text,
        secret_question=getattr(claim, "secret_question", None),
        secret_answer=getattr(claim, "secret_answer", None),
        claimant_answer=getattr(claim, "claimant_answer", None),
        proof_image=getattr(claim, "proof_image", None),
        status=claim.status,
        admin_note=claim.admin_note,
        handover_code=getattr(claim, "handover_code", None),
        handover_status=getattr(claim, "handover_status", "pending"),
        created_at=claim.created_at,
        decided_at=claim.decided_at,
        found_item=ItemAdmin.model_validate(found_item) if found_item else None
    )

@router.get("/finder-responses", response_model=List[FinderResponseAdmin])
def list_admin_finder_responses(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Lists finder responses scoped strictly to the admin's campus.
    """
    responses_q = db.query(FinderResponse)
    if current_admin.role != "super_admin" and current_admin.campus_id:
        responses_q = responses_q.filter(FinderResponse.campus_id == current_admin.campus_id)

    responses = responses_q.order_by(desc(FinderResponse.created_at)).all()
    res = []
    for r in responses:
        coord = db.query(FacultyCoordinator).filter(FacultyCoordinator.id == r.coordinator_id).first() if r.coordinator_id else None
        res.append(
            FinderResponseAdmin(
                id=r.id,
                item_id=r.item_id,
                unique_code=r.unique_code,
                campus_id=r.campus_id,
                option_type=r.option_type,
                message=r.message,
                found_location=r.found_location,
                photo_path=r.photo_path,
                meeting_place=r.meeting_place,
                meeting_time=r.meeting_time,
                coordinator_id=r.coordinator_id,
                coordinator_name=coord.name if coord else None,
                finder_name=r.finder_name,
                finder_mobile=r.finder_mobile,
                finder_department=r.finder_department,
                consent_given=r.consent_given,
                status=r.status,
                created_at=r.created_at
            )
        )
    return res

@router.get("/items", response_model=List[ItemAdmin])
def list_admin_items(
    type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    items_q = db.query(Item)
    if current_admin.role != "super_admin" and current_admin.campus_id:
        items_q = items_q.filter(Item.campus_id == current_admin.campus_id)

    if type:
        items_q = items_q.filter(Item.type == type)
    if status:
        items_q = items_q.filter(Item.status == status)
    if search:
        s = f"%{search.strip()}%"
        items_q = items_q.filter(
            or_(
                Item.title.ilike(s),
                Item.description.ilike(s),
                Item.category.ilike(s),
                Item.contact_name.ilike(s)
            )
        )

    return items_q.order_by(desc(Item.created_at)).all()

@router.patch("/items/{item_id}/status", response_model=ItemAdmin)
def update_item_status(
    item_id: int,
    new_status: str = Query(..., pattern="^(open|matched|claimed|closed|recovered)$"),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if current_admin.role != "super_admin" and current_admin.campus_id:
        if item.campus_id != current_admin.campus_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit items of other colleges")

    item.status = new_status
    db.commit()
    db.refresh(item)
    return item

@router.patch("/items/{item_id}/close", response_model=ItemAdmin)
def close_item(
    item_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return update_item_status(item_id=item_id, new_status="closed", current_admin=current_admin, db=db)

@router.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if current_admin.role != "super_admin" and current_admin.campus_id:
        if item.campus_id != current_admin.campus_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete items of other colleges")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": "Item deleted successfully"}

# --- Manage Students of This College ---

@router.get("/students", response_model=List[StudentResponse])
def list_college_students(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    students_q = db.query(User).filter(User.role == "student")
    if current_admin.role != "super_admin" and current_admin.campus_id:
        students_q = students_q.filter(User.campus_id == current_admin.campus_id)

    return students_q.order_by(desc(User.created_at)).all()

@router.patch("/students/{user_id}/toggle-status")
def toggle_student_status(
    user_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_admin.role != "super_admin" and current_admin.campus_id:
        if user.campus_id != current_admin.campus_id:
            raise HTTPException(status_code=403, detail="Not authorized to manage students of other colleges")

    user.is_disabled = not bool(user.is_disabled)
    db.commit()
    db.refresh(user)
    return {
        "status": "success",
        "user_id": user.id,
        "is_disabled": user.is_disabled,
        "message": f"Student account {'disabled' if user.is_disabled else 'enabled'} successfully"
    }

# --- Manage Faculty Coordinators of This College ---

@router.get("/coordinators", response_model=List[FacultyCoordinatorPublic])
def list_college_coordinators(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    coords_q = db.query(FacultyCoordinator)
    if current_admin.role != "super_admin" and current_admin.campus_id:
        coords_q = coords_q.filter(FacultyCoordinator.campus_id == current_admin.campus_id)

    return coords_q.order_by(FacultyCoordinator.department, FacultyCoordinator.name).all()

# --- Scan Logs of This College ---

@router.get("/scan-logs")
def list_scan_logs(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    scans_q = db.query(ScanEvent).join(Item, ScanEvent.item_id == Item.id)
    if current_admin.role != "super_admin" and current_admin.campus_id:
        scans_q = scans_q.filter(Item.campus_id == current_admin.campus_id)

    events = scans_q.order_by(desc(ScanEvent.created_at)).limit(100).all()
    res = []
    for e in events:
        item = db.query(Item).filter(Item.id == e.item_id).first()
        res.append({
            "id": e.id,
            "item_id": e.item_id,
            "item_title": item.title if item else "Unknown Item",
            "item_code": item.unique_qr_code if item else None,
            "finder_name": e.finder_name,
            "finder_contact": e.finder_contact,
            "finder_message": e.finder_message,
            "finder_location": e.finder_location,
            "scanned_at": e.created_at
        })
    return res

# --- College Settings & Profile ---

@router.get("/college-settings", response_model=CampusPublic)
def get_college_settings(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if not current_admin.campus_id:
        raise HTTPException(status_code=400, detail="Super admin must specify a campus or visit Super Admin panel")

    campus = db.query(Campus).filter(Campus.id == current_admin.campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    return campus

@router.put("/college-settings", response_model=CampusPublic)
def update_college_settings(
    settings_data: CollegeSettingsUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if not current_admin.campus_id:
        raise HTTPException(status_code=400, detail="Super admin must manage colleges from /api/super-admin/colleges")

    campus = db.query(Campus).filter(Campus.id == current_admin.campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")

    if settings_data.name is not None:
        campus.name = settings_data.name
    if settings_data.logo_url is not None:
        campus.logo_url = settings_data.logo_url
    if settings_data.contact_email is not None:
        campus.contact_email = settings_data.contact_email
    if settings_data.share_reports is not None:
        campus.share_reports = settings_data.share_reports
    if settings_data.announcement is not None:
        campus.announcement = settings_data.announcement

    db.commit()
    db.refresh(campus)
    return campus

# --- Cross-College Inquiries Inbox & Sent ---

@router.get("/inquiries")
def list_cross_college_inquiries(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    campus_id = current_admin.campus_id
    if not campus_id and current_admin.role == "super_admin":
        inquiries = db.query(CrossCollegeInquiry).order_by(desc(CrossCollegeInquiry.created_at)).all()
    else:
        # Get both received (to_campus_id == campus_id) and sent (from_campus_id == campus_id)
        inquiries = db.query(CrossCollegeInquiry).filter(
            or_(
                CrossCollegeInquiry.to_campus_id == campus_id,
                CrossCollegeInquiry.from_campus_id == campus_id
            )
        ).order_by(desc(CrossCollegeInquiry.created_at)).all()

    res = []
    for inq in inquiries:
        item = db.query(Item).filter(Item.id == inq.item_id).first()
        from_c = db.query(Campus).filter(Campus.id == inq.from_campus_id).first() if inq.from_campus_id else None
        to_c = db.query(Campus).filter(Campus.id == inq.to_campus_id).first() if inq.to_campus_id else None
        res.append({
            "id": inq.id,
            "item_id": inq.item_id,
            "item_title": item.title if item else "Unknown Item",
            "item_type": item.type if item else "lost",
            "from_campus_id": inq.from_campus_id,
            "from_campus_name": from_c.name if from_c else "External / Visitor",
            "to_campus_id": inq.to_campus_id,
            "to_campus_name": to_c.name if to_c else "Unknown Campus",
            "sender_name": inq.sender_name,
            "sender_contact": inq.sender_contact,
            "message": inq.message,
            "inquiry_type": inq.inquiry_type,
            "status": inq.status,
            "admin_reply": inq.admin_reply,
            "is_received": inq.to_campus_id == campus_id,
            "created_at": inq.created_at
        })
    return res

@router.patch("/inquiries/{inquiry_id}/reply")
def reply_to_inquiry(
    inquiry_id: int,
    payload: CrossCollegeInquiryReply,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    inquiry = db.query(CrossCollegeInquiry).filter(CrossCollegeInquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    if current_admin.role != "super_admin" and current_admin.campus_id:
        if inquiry.to_campus_id != current_admin.campus_id:
            raise HTTPException(status_code=403, detail="Not authorized to reply to inquiries for other colleges")

    inquiry.status = payload.status
    if payload.admin_reply:
        inquiry.admin_reply = payload.admin_reply

    # Also notify the inquirer if user_id or sender_contact exists
    if inquiry.user_id:
        notif = Notification(
            recipient_contact=inquiry.sender_contact,
            type="cross_college_inquiry",
            title="Update on your Cross-College Inquiry",
            message=f"Admin updated your inquiry status to '{payload.status}'. Reply: {payload.admin_reply or 'No additional remarks.'}",
            link_url=f"/items/{inquiry.item_id}"
        )
        db.add(notif)

    db.commit()
    db.refresh(inquiry)
    return {"status": "success", "message": "Inquiry updated successfully", "inquiry_id": inquiry.id}

def format_admin_item(item: Item, db: Session, current_admin: Admin) -> ItemAdmin:
    campus_name = "Unknown Campus"
    campus_logo = None
    campus_city = None
    if item.campus_id:
        c = db.query(Campus).filter(Campus.id == item.campus_id).first()
        if c:
            campus_name = c.name
            campus_logo = c.logo_url
            campus_city = c.city

    # Check privacy scoping: if item belongs to another campus and admin is not super_admin,
    # mask direct contact details
    is_same_campus = (current_admin.role == "super_admin") or (current_admin.campus_id == item.campus_id)
    contact_name = item.contact_name if is_same_campus else f"Desk Coordinator ({campus_name})"
    contact_info = item.contact_email_or_phone if is_same_campus else "Protected by Cross-College Privacy"

    return ItemAdmin(
        id=item.id,
        campus_id=item.campus_id,
        campus_name=campus_name,
        campus_logo=campus_logo,
        campus_city=campus_city,
        user_id=item.user_id if is_same_campus else None,
        unique_qr_code=item.unique_qr_code,
        type=item.type,
        title=item.title,
        description=item.description,
        category=item.category,
        brand=item.brand,
        color=item.color,
        finder_note=item.finder_note,
        is_tagged=item.is_tagged,
        location=item.location,
        event_date=item.event_date.date() if isinstance(item.event_date, datetime.datetime) else item.event_date,
        image_path=item.image_path,
        thumbnail_path=item.thumbnail_path,
        contact_name=contact_name,
        contact_email_or_phone=contact_info,
        status=item.status,
        created_at=item.created_at
    )

def format_admin_match(match: Match, db: Session, current_admin: Admin) -> Optional[AdminMatchPair]:
    lost_i = db.query(Item).filter(Item.id == match.lost_id).first()
    found_i = db.query(Item).filter(Item.id == match.found_id).first()
    if not lost_i or not found_i:
        return None

    # Multi-tenant scoping: College Admin can only see matches where either lost or found belongs to their campus
    if current_admin.role != "super_admin" and current_admin.campus_id is not None:
        if lost_i.campus_id != current_admin.campus_id and found_i.campus_id != current_admin.campus_id:
            return None

    score = round(match.score, 1)
    if score >= 80.0:
        verdict = "Strong"
        label = "High"
    elif score >= 50.0:
        verdict = "Possible"
        label = "Medium"
    else:
        verdict = "Weak"
        label = "Low"

    # Associated claim
    claim = db.query(Claim).filter(
        or_(
            Claim.match_id == match.id,
            Claim.found_id == found_i.id
        )
    ).order_by(desc(Claim.created_at)).first()

    has_claim = claim is not None
    claim_id = claim.id if claim else None
    claim_status = claim.status if claim else None

    # Match status
    if claim:
        if claim.status == "approved":
            status_val = "approved"
        elif claim.status == "rejected":
            status_val = "rejected"
        else:
            status_val = "claimed"
    elif lost_i.status == "closed" or found_i.status == "closed":
        status_val = "closed"
    elif score >= 80.0 or match.text_score >= 0.6:
        status_val = "under_review"
    else:
        status_val = "new"

    # QR confirmed
    is_qr_confirmed = bool(
        lost_i.is_tagged or found_i.is_tagged or 
        (lost_i.unique_qr_code and found_i.unique_qr_code and lost_i.unique_qr_code == found_i.unique_qr_code) or
        db.query(ScanEvent).filter(ScanEvent.item_id == found_i.id).first() is not None
    )

    reasons_list = []
    penalties_list = []

    # Brand check
    if lost_i.brand and found_i.brand:
        if lost_i.brand.strip().lower() == found_i.brand.strip().lower():
            reasons_list.append(f"Same brand ({lost_i.brand})")
        else:
            penalties_list.append(f"Different brand ({lost_i.brand} vs {found_i.brand})")
    elif lost_i.brand or found_i.brand:
        reasons_list.append(f"Brand identified ({lost_i.brand or found_i.brand})")

    # Color check
    if lost_i.color and found_i.color:
        if lost_i.color.strip().lower() == found_i.color.strip().lower():
            reasons_list.append(f"Same color ({lost_i.color})")
        else:
            penalties_list.append(f"Different color ({lost_i.color} vs {found_i.color})")

    # Category
    if match.category_score >= 1.0:
        reasons_list.append("Identical category")
    
    # Location
    if match.location_score >= 1.0:
        reasons_list.append(f"Same location ({lost_i.location})")
    elif match.location_score >= 0.5:
        reasons_list.append("Same campus zone")
    else:
        penalties_list.append(f"Different campus spots ({lost_i.location} vs {found_i.location})")

    # Date
    if match.date_score >= 0.8:
        reasons_list.append("Reported within 24-48 hours")
    elif match.date_score >= 0.4:
        reasons_list.append("Reported within a few days")
    else:
        penalties_list.append("Date gap over 1 week")

    # Semantic & Image
    if match.has_image_match and match.image_score and match.image_score >= 0.6:
        reasons_list.append(f"Visual photo match ({int(match.image_score * 100)}%)")
    if match.text_score >= 0.6:
        reasons_list.append("High semantic text similarity")

    if is_qr_confirmed:
        reasons_list.insert(0, "QR Smart Tag Confirmed")

    import re
    stop_words = {"the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "is", "was", "it", "my", "of", "from", "left", "found", "lost", "this"}
    words_lost = set(w.lower() for w in re.findall(r"\w+", f"{lost_i.title} {lost_i.description}") if len(w) > 2 and w.lower() not in stop_words)
    words_found = set(w.lower() for w in re.findall(r"\w+", f"{found_i.title} {found_i.description}") if len(w) > 2 and w.lower() not in stop_words)
    common_keywords = sorted(list(words_lost.intersection(words_found)))

    why_str = ", ".join(reasons_list) if reasons_list else "General semantic match"

    return AdminMatchPair(
        id=match.id,
        lost_id=lost_i.id,
        found_id=found_i.id,
        score=score,
        verdict=verdict,
        label=label,
        status=status_val,
        text_score=round(match.text_score, 3),
        image_score=round(match.image_score, 3) if match.image_score is not None else None,
        has_image_match=match.has_image_match,
        category_score=round(match.category_score, 3),
        location_score=round(match.location_score, 3),
        date_score=round(match.date_score, 3),
        why_matched=why_str,
        reasons_list=reasons_list,
        penalties_list=penalties_list,
        matching_keywords=common_keywords[:8],
        lost_item=format_admin_item(lost_i, db, current_admin),
        found_item=format_admin_item(found_i, db, current_admin),
        has_claim=has_claim,
        claim_id=claim_id,
        claim_status=claim_status,
        is_qr_confirmed=is_qr_confirmed,
        created_at=match.created_at
    )

@router.get("/matches", response_model=AdminMatchesResponse)
def get_admin_matches(
    status: Optional[str] = Query("all", description="Status filter: all, new, under_review, claimed, approved, rejected, closed"),
    verdict: Optional[str] = Query("all", description="Verdict filter: all, strong, possible, weak"),
    category: Optional[str] = Query("all", description="Category filter"),
    search: Optional[str] = Query(None, description="Search keyword"),
    sort: Optional[str] = Query("score", description="Sort by score or date"),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    campus_id = current_admin.campus_id if current_admin.role != "super_admin" else None

    # Base query for all matches
    all_matches_db = db.query(Match).order_by(desc(Match.score)).all()

    formatted_matches: List[AdminMatchPair] = []
    strong_count = 0
    possible_count = 0
    weak_count = 0

    for m in all_matches_db:
        pair = format_admin_match(m, db, current_admin)
        if not pair:
            continue

        if pair.verdict == "Strong":
            strong_count += 1
        elif pair.verdict == "Possible":
            possible_count += 1
        else:
            weak_count += 1

        # Apply status filter
        if status and status != "all":
            if pair.status.lower() != status.lower():
                continue

        # Apply verdict filter
        if verdict and verdict != "all":
            if pair.verdict.lower() != verdict.lower():
                continue

        # Apply category filter
        if category and category != "all":
            if pair.lost_item.category.lower() != category.lower() and pair.found_item.category.lower() != category.lower():
                continue

        # Apply search filter
        if search and search.strip():
            s = search.strip().lower()
            text_corpus = f"{pair.lost_item.title} {pair.lost_item.description} {pair.found_item.title} {pair.found_item.description}".lower()
            if s not in text_corpus:
                continue

        formatted_matches.append(pair)

    # Sort
    if sort == "date":
        formatted_matches.sort(key=lambda x: x.created_at, reverse=True)
    else:
        formatted_matches.sort(key=lambda x: x.score, reverse=True)

    return AdminMatchesResponse(
        matches=formatted_matches,
        total=len(formatted_matches),
        strong_count=strong_count,
        possible_count=possible_count,
        weak_count=weak_count
    )

@router.get("/matches/{match_id}", response_model=AdminMatchPair)
def get_admin_match_detail(
    match_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    m = db.query(Match).filter(Match.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")

    pair = format_admin_match(m, db, current_admin)
    if not pair:
        raise HTTPException(status_code=403, detail="Not authorized to access matches outside your campus")

    return pair

@router.get("/items/{item_id}/matches", response_model=List[AdminMatchPair])
def get_admin_item_matches(
    item_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    target_item = db.query(Item).filter(Item.id == item_id).first()
    if not target_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Campus permission check
    if current_admin.role != "super_admin" and current_admin.campus_id is not None:
        if target_item.campus_id != current_admin.campus_id:
            raise HTTPException(status_code=403, detail="Not authorized to access items from another campus")

    matches_db = db.query(Match).filter(
        or_(
            Match.lost_id == item_id,
            Match.found_id == item_id
        )
    ).order_by(desc(Match.score)).all()

    res = []
    for m in matches_db:
        pair = format_admin_match(m, db, current_admin)
        if pair:
            res.append(pair)

    return res

