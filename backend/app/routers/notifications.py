from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models import Notification
from app.schemas import NotificationPublic

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationPublic])
def list_notifications(
    recipient: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Fetches latest notifications for current user/contact.
    If no recipient is provided, returns recent global portal alerts.
    """
    query = db.query(Notification)
    if recipient and recipient.strip():
        search = recipient.strip()
        query = query.filter(
            (Notification.recipient_contact == search) | 
            (Notification.recipient_email == search)
        )
    
    return query.order_by(desc(Notification.created_at)).limit(limit).all()


@router.get("/unread-count")
def get_unread_count(
    recipient: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns number of unread notifications."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if recipient and recipient.strip():
        search = recipient.strip()
        query = query.filter(
            (Notification.recipient_contact == search) | 
            (Notification.recipient_email == search)
        )
    return {"unread_count": query.count()}


@router.put("/{notification_id}/read", response_model=NotificationPublic)
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    """Marks a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    recipient: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Marks all notifications as read."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if recipient and recipient.strip():
        search = recipient.strip()
        query = query.filter(
            (Notification.recipient_contact == search) | 
            (Notification.recipient_email == search)
        )
    
    count = query.update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read", "updated_count": count}
