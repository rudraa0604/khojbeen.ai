import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.db import get_db
from app.models import Item, Claim, Match, Admin, Campus, User, ScanEvent, FacultyCoordinator, CrossCollegeInquiry, Notification
from app.schemas import (
    AdminDashboardStats, ClaimAdmin, ClaimDecision, ItemAdmin,
    CollegeSettingsUpdate, CampusPublic, CrossCollegeInquiryPublic, CrossCollegeInquiryReply,
    StudentResponse, FacultyCoordinatorPublic, FacultyCoordinatorCreate, FacultyCoordinatorUpdate
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
                proof_text=c.proof_text,
                status=c.status,
                admin_note=c.admin_note,
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
        proof_text=claim.proof_text,
        status=claim.status,
        admin_note=claim.admin_note,
        created_at=claim.created_at,
        decided_at=claim.decided_at,
        found_item=ItemAdmin.model_validate(found_item) if found_item else None
    )

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
