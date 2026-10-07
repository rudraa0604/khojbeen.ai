from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.models import FacultyCoordinator, Admin
from app.schemas import (
    FacultyCoordinatorCreate,
    FacultyCoordinatorUpdate,
    FacultyCoordinatorPublic,
)
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/api/faculty", tags=["faculty"])

@router.get("", response_model=List[FacultyCoordinatorPublic])
def list_faculty_coordinators(
    campus_id: Optional[int] = Query(None, description="Filter by campus/college ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    q: Optional[str] = Query(None, description="Search by name, department, or office"),
    db: Session = Depends(get_db)
):
    """
    Public listing of all faculty and staff coordinators.
    Supports campus, department filtering and search.
    """
    query = db.query(FacultyCoordinator)

    if campus_id is not None:
        query = query.filter(FacultyCoordinator.campus_id == campus_id)

    if department and department.lower() != "all":
        query = query.filter(FacultyCoordinator.department.ilike(f"%{department}%"))

    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            (FacultyCoordinator.name.ilike(search_term)) |
            (FacultyCoordinator.department.ilike(search_term)) |
            (FacultyCoordinator.office.ilike(search_term)) |
            (FacultyCoordinator.designation.ilike(search_term))
        )

    return query.order_by(FacultyCoordinator.department.asc(), FacultyCoordinator.name.asc()).all()


@router.get("/{coordinator_id}", response_model=FacultyCoordinatorPublic)
def get_faculty_coordinator(coordinator_id: int, db: Session = Depends(get_db)):
    """
    Public endpoint to view a specific coordinator's profile.
    """
    coordinator = db.query(FacultyCoordinator).filter(FacultyCoordinator.id == coordinator_id).first()
    if not coordinator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty coordinator not found")
    return coordinator


@router.post("", response_model=FacultyCoordinatorPublic, status_code=status.HTTP_201_CREATED)
def create_faculty_coordinator(
    payload: FacultyCoordinatorCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Authenticated endpoint to add a faculty coordinator profile.
    - Super Admin: Can add coordinator for any college/campus (uses payload.campus_id or default).
    - College Admin: Can ONLY add coordinator for their assigned college (enforced current_admin.campus_id).
    """
    # Determine campus_id based on admin role
    if current_admin.role == "super_admin":
        assigned_campus_id = payload.campus_id if payload.campus_id else (current_admin.campus_id or 1)
    else:
        # College Admin is strictly scoped to their own campus
        assigned_campus_id = current_admin.campus_id or 1

    coordinator = FacultyCoordinator(
        campus_id=assigned_campus_id,
        admin_id=current_admin.id,
        name=payload.name.strip(),
        department=payload.department.strip(),
        designation=payload.designation.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip(),
        office=payload.office.strip(),
        available_timings=payload.available_timings.strip(),
        photo=payload.photo
    )
    db.add(coordinator)
    db.commit()
    db.refresh(coordinator)
    return coordinator


@router.put("/{coordinator_id}", response_model=FacultyCoordinatorPublic)
def update_faculty_coordinator(
    coordinator_id: int,
    payload: FacultyCoordinatorUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Authenticated endpoint to update coordinator profile.
    - Super Admin: Can edit any coordinator across any college.
    - College Admin: Can ONLY edit coordinators belonging to their own college (campus_id match).
    """
    coordinator = db.query(FacultyCoordinator).filter(FacultyCoordinator.id == coordinator_id).first()
    if not coordinator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty coordinator not found")

    # Verify authorization
    if current_admin.role != "super_admin":
        if coordinator.campus_id and current_admin.campus_id and coordinator.campus_id != current_admin.campus_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are only authorized to manage faculty coordinators from your own college/campus."
            )

    update_data = payload.model_dump(exclude_unset=True)

    # Prevent College Admin from moving coordinator to another college
    if current_admin.role != "super_admin":
        update_data.pop("campus_id", None)

    for key, value in update_data.items():
        if value is not None:
            if isinstance(value, str):
                value = value.strip()
                if key == "email":
                    value = value.lower()
            setattr(coordinator, key, value)

    db.commit()
    db.refresh(coordinator)
    return coordinator


@router.delete("/{coordinator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faculty_coordinator(
    coordinator_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Authenticated endpoint to delete a coordinator profile.
    - Super Admin: Can delete any coordinator.
    - College Admin: Can ONLY delete coordinators belonging to their own college.
    """
    coordinator = db.query(FacultyCoordinator).filter(FacultyCoordinator.id == coordinator_id).first()
    if not coordinator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty coordinator not found")

    # Verify authorization
    if current_admin.role != "super_admin":
        if coordinator.campus_id and current_admin.campus_id and coordinator.campus_id != current_admin.campus_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are only authorized to delete faculty coordinators from your own college/campus."
            )

    db.delete(coordinator)
    db.commit()
    return None

