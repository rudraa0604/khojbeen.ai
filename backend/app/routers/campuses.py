from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models import Campus
from app.schemas import CampusPublic, CampusCreate
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/api/campuses", tags=["campuses"])

@router.get("", response_model=List[CampusPublic])
def list_campuses(db: Session = Depends(get_db)):
    """Returns all active campuses."""
    return db.query(Campus).order_by(Campus.id).all()


@router.post("", response_model=CampusPublic, status_code=status.HTTP_201_CREATED)
def create_campus(
    payload: CampusCreate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to register a new campus."""
    existing = db.query(Campus).filter(Campus.name == payload.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Campus with this name already exists")

    campus = Campus(
        name=payload.name.strip(),
        city=payload.city.strip(),
        logo_url=payload.logo_url,
        contact_email=payload.contact_email
    )
    db.add(campus)
    db.commit()
    db.refresh(campus)
    return campus
