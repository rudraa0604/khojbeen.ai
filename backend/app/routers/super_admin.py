import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models import Admin, Campus, Item, User, ScanEvent, CrossCollegeInquiry, Claim
from app.schemas import (
    SuperAdminStats, CampusPublic, CampusCreate, CampusUpdate,
    AdminPublic, AdminCreate, AdminUpdate
)
from app.routers.auth import get_current_super_admin, get_password_hash

router = APIRouter(prefix="/api/super-admin", tags=["super-admin"])

@router.get("/stats", response_model=SuperAdminStats)
def get_super_admin_stats(
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    total_colleges = db.query(Campus).count()
    active_colleges = db.query(Campus).filter(Campus.is_active == True).count()
    total_items = db.query(Item).count()
    total_lost = db.query(Item).filter(Item.type == "lost").count()
    total_found = db.query(Item).filter(Item.type == "found").count()
    total_matched = db.query(Item).filter(Item.status == "matched").count()
    total_recovered = db.query(Item).filter(Item.status == "closed").count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_scans = db.query(ScanEvent).count()
    total_inquiries = db.query(CrossCollegeInquiry).count()

    return SuperAdminStats(
        total_colleges=total_colleges,
        active_colleges=active_colleges,
        total_items=total_items,
        total_lost=total_lost,
        total_found=total_found,
        total_matched=total_matched,
        total_recovered=total_recovered,
        total_students=total_students,
        total_scans=total_scans,
        total_inquiries=total_inquiries
    )

# --- College Management ---

@router.get("/colleges", response_model=List[CampusPublic])
def list_all_colleges(
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    return db.query(Campus).order_by(Campus.id).all()

@router.post("/colleges", response_model=CampusPublic)
def create_college(
    payload: CampusCreate,
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Campus).filter(Campus.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="A college with this name already exists")

    slug = payload.slug or payload.name.lower().replace(" ", "-").replace("(", "").replace(")", "")
    campus = Campus(
        name=payload.name,
        city=payload.city,
        slug=slug,
        logo_url=payload.logo_url,
        contact_email=payload.contact_email,
        share_reports=payload.share_reports if payload.share_reports is not None else True,
        announcement=payload.announcement,
        is_active=payload.is_active if payload.is_active is not None else True
    )
    db.add(campus)
    db.commit()
    db.refresh(campus)
    return campus

@router.put("/colleges/{campus_id}", response_model=CampusPublic)
def update_college(
    campus_id: int,
    payload: CampusUpdate,
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    campus = db.query(Campus).filter(Campus.id == campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="College not found")

    if payload.name is not None:
        campus.name = payload.name
    if payload.city is not None:
        campus.city = payload.city
    if payload.slug is not None:
        campus.slug = payload.slug
    if payload.logo_url is not None:
        campus.logo_url = payload.logo_url
    if payload.contact_email is not None:
        campus.contact_email = payload.contact_email
    if payload.share_reports is not None:
        campus.share_reports = payload.share_reports
    if payload.announcement is not None:
        campus.announcement = payload.announcement
    if payload.is_active is not None:
        campus.is_active = payload.is_active

    db.commit()
    db.refresh(campus)
    return campus

@router.patch("/colleges/{campus_id}/toggle-status", response_model=CampusPublic)
def toggle_college_status(
    campus_id: int,
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    campus = db.query(Campus).filter(Campus.id == campus_id).first()
    if not campus:
        raise HTTPException(status_code=404, detail="College not found")

    campus.is_active = not bool(campus.is_active)
    db.commit()
    db.refresh(campus)
    return campus

# --- Admin Accounts Management ---

@router.get("/admins", response_model=List[AdminPublic])
def list_admins(
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    admins = db.query(Admin).order_by(Admin.id).all()
    res = []
    for a in admins:
        campus = db.query(Campus).filter(Campus.id == a.campus_id).first() if a.campus_id else None
        res.append(AdminPublic(
            id=a.id,
            username=a.username,
            role=a.role or "college_admin",
            campus_id=a.campus_id,
            campus_name=campus.name if campus else ("All Campuses" if a.role == "super_admin" else None),
            full_name=a.full_name,
            email=a.email
        ))
    return res

@router.post("/admins", response_model=AdminPublic)
def create_admin_account(
    payload: AdminCreate,
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Admin).filter(Admin.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    if payload.role == "college_admin" and not payload.campus_id:
        raise HTTPException(status_code=400, detail="College Admin must be assigned to a campus")

    if payload.campus_id:
        campus = db.query(Campus).filter(Campus.id == payload.campus_id).first()
        if not campus:
            raise HTTPException(status_code=404, detail="Assigned campus not found")

    new_admin = Admin(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        campus_id=payload.campus_id,
        full_name=payload.full_name,
        email=payload.email
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    campus = db.query(Campus).filter(Campus.id == new_admin.campus_id).first() if new_admin.campus_id else None
    return AdminPublic(
        id=new_admin.id,
        username=new_admin.username,
        role=new_admin.role,
        campus_id=new_admin.campus_id,
        campus_name=campus.name if campus else None,
        full_name=new_admin.full_name,
        email=new_admin.email
    )

@router.put("/admins/{admin_id}", response_model=AdminPublic)
def update_admin_account(
    admin_id: int,
    payload: AdminUpdate,
    super_admin: Admin = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin account not found")

    if payload.password:
        admin.password_hash = get_password_hash(payload.password)
    if payload.role is not None:
        admin.role = payload.role
    if payload.campus_id is not None:
        admin.campus_id = payload.campus_id
    if payload.full_name is not None:
        admin.full_name = payload.full_name
    if payload.email is not None:
        admin.email = payload.email

    db.commit()
    db.refresh(admin)

    campus = db.query(Campus).filter(Campus.id == admin.campus_id).first() if admin.campus_id else None
    return AdminPublic(
        id=admin.id,
        username=admin.username,
        role=admin.role or "college_admin",
        campus_id=admin.campus_id,
        campus_name=campus.name if campus else None,
        full_name=admin.full_name,
        email=admin.email
    )
