import os
import io
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, UploadFile, File, Form, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

import qrcode
from app.db import get_db
from app.models import RegisteredItem, Item, Notification
from app.schemas import (
    RegisteredItemCreate,
    RegisteredItemPublic,
    RegisteredItemOwnerView,
    ContactOwnerPayload,
    CATEGORIES
)
from app.config import settings
from app.services.images import save_and_compress_image
from app.services.turnstile import verify_turnstile_token
from app.services.notifications import create_in_app_notification, send_smtp_email_background

router = APIRouter(prefix="/api", tags=["qr_tags"])

@router.get("/my-items", response_model=List[RegisteredItemOwnerView])
def list_my_items(
    owner_contact: str = Query(..., min_length=3),
    db: Session = Depends(get_db)
):
    """Lists pre-registered belongings for a user identified by contact email/phone."""
    return db.query(RegisteredItem).filter(
        RegisteredItem.owner_contact == owner_contact.strip()
    ).order_by(desc(RegisteredItem.created_at)).all()


@router.post("/my-items", response_model=RegisteredItemOwnerView, status_code=status.HTTP_201_CREATED)
async def register_item(
    request: Request,
    name: str = Form(..., min_length=2, max_length=100),
    category: str = Form(...),
    owner_name: str = Form(..., min_length=2, max_length=100),
    owner_contact: str = Form(..., min_length=5, max_length=100),
    description: Optional[str] = Form(None),
    contact_preference: Optional[str] = Form("portal"),
    campus_id: Optional[int] = Form(1),
    image: Optional[UploadFile] = File(None),
    turnstile_token: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Registers a belonging and generates a unique QR code."""
    if website and len(website.strip()) > 0:
        raise HTTPException(status_code=400, detail="Spam detected")

    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(CATEGORIES)}")

    image_path = None
    if image and image.filename:
        image_path, _ = save_and_compress_image(image)

    unique_code = f"KB-{uuid.uuid4().hex[:8].upper()}"

    reg_item = RegisteredItem(
        unique_code=unique_code,
        campus_id=campus_id or 1,
        owner_name=owner_name.strip(),
        owner_contact=owner_contact.strip(),
        name=name.strip(),
        category=category,
        description=description.strip() if description else None,
        photo_url=image_path,
        contact_preference=contact_preference or "portal",
        is_lost=False
    )
    db.add(reg_item)
    db.commit()
    db.refresh(reg_item)

    return reg_item


@router.delete("/my-items/{item_id}", status_code=status.HTTP_200_OK)
def delete_registered_item(
    item_id: int,
    owner_contact: str = Query(..., min_length=3),
    db: Session = Depends(get_db)
):
    """Deletes a pre-registered item belonging to the specified owner."""
    item = db.query(RegisteredItem).filter(
        RegisteredItem.id == item_id,
        RegisteredItem.owner_contact == owner_contact.strip()
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")

    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


@router.post("/my-items/{item_id}/report-lost", response_model=RegisteredItemOwnerView)
def mark_item_as_lost(
    item_id: int,
    owner_contact: str = Query(..., min_length=3),
    location: str = Query("Library"),
    db: Session = Depends(get_db)
):
    """Marks registered item as lost and auto-creates a Lost complaint in the portal."""
    reg = db.query(RegisteredItem).filter(
        RegisteredItem.id == item_id,
        RegisteredItem.owner_contact == owner_contact.strip()
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")

    reg.is_lost = True
    
    # Auto-create Lost complaint
    lost_item = Item(
        campus_id=reg.campus_id or 1,
        type="lost",
        title=reg.name,
        description=reg.description or f"Registered item {reg.name} ({reg.unique_code})",
        category=reg.category,
        location=location,
        event_date=datetime.datetime.utcnow(),
        image_path=reg.photo_url,
        contact_name=reg.owner_name,
        contact_email_or_phone=reg.owner_contact,
        status="open"
    )
    db.add(lost_item)
    db.commit()
    db.refresh(reg)

    return reg


@router.get("/qr/{unique_code}.png")
def generate_qr_image(unique_code: str):
    """Generates and streams a PNG QR code for the given unique item code."""
    target_url = f"{settings.FRONTEND_URL}/tag/{unique_code}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f766e", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.get("/public/tag/{unique_code}", response_model=RegisteredItemPublic)
def get_public_tag_info(unique_code: str, db: Session = Depends(get_db)):
    """
    Public QR scan endpoint.
    Returns item name, category, and safe details. NEVER exposes owner contact info.
    """
    item = db.query(RegisteredItem).filter(RegisteredItem.unique_code == unique_code.upper()).first()
    if not item:
        raise HTTPException(status_code=404, detail="QR Tag not found or invalid")
    return item


@router.post("/public/tag/{unique_code}/contact", status_code=status.HTTP_200_OK)
def contact_owner_via_qr(
    unique_code: str,
    payload: ContactOwnerPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Relays a finder's message to the registered owner without exposing private contact info.
    Creates an in-app alert and sends an email notification.
    """
    item = db.query(RegisteredItem).filter(RegisteredItem.unique_code == unique_code.upper()).first()
    if not item:
        raise HTTPException(status_code=404, detail="QR Tag not found")

    title = f"🏷️ Someone scanned your QR Tag for '{item.name}'!"
    loc_info = f" at {payload.location_found}" if payload.location_found else ""
    msg = f"Finder '{payload.finder_name}' reported finding your item{loc_info}.\n\nMessage: \"{payload.message}\"\n\nFinder Contact: {payload.finder_contact}"

    create_in_app_notification(
        db=db,
        recipient_contact=item.owner_contact,
        recipient_email=item.owner_contact if "@" in item.owner_contact else None,
        title=title,
        message=msg,
        link_url=f"/my-items",
        notif_type="qr_scanned"
    )

    if "@" in item.owner_contact:
        plain = f"Hello {item.owner_name},\n\nGreat news! Someone has scanned your QR Tag on '{item.name}'.\n\nFinder: {payload.finder_name} ({payload.finder_contact})\nLocation: {payload.location_found or 'Campus'}\nMessage: {payload.message}\n\nPlease check your portal under My Items.\n\nRegards,\nkhojbeen.ai Team"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f766e;">🏷️ khojbeen.ai — QR Tag Scanned!</h2>
            <p>Hello <strong>{item.owner_name}</strong>,</p>
            <p>Someone found your item <strong>'{item.name}'</strong> (Tag: {item.unique_code}) and scanned its QR code!</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>Finder Name:</strong> {payload.finder_name}</p>
                <p><strong>Finder Contact:</strong> {payload.finder_contact}</p>
                <p><strong>Location:</strong> {payload.location_found or 'Campus'}</p>
                <p><strong>Message:</strong> {payload.message}</p>
            </div>
            <a href="{settings.FRONTEND_URL}/my-items" style="display: inline-block; background-color: #0f766e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View My Items</a>
        </div>
        """
        background_tasks.add_task(
            send_smtp_email_background,
            item.owner_contact,
            title,
            html,
            plain
        )

    return {"message": "Message successfully relayed to the owner. Thank you!"}
