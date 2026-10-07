import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Notification, Item
from app.config import settings

logger = logging.getLogger("khojbeen.notifications")

def create_in_app_notification(
    db: Session,
    recipient_contact: str,
    title: str,
    message: str,
    link_url: Optional[str] = None,
    notif_type: str = "match_found",
    recipient_email: Optional[str] = None
) -> Notification:
    """Creates an in-app notification in the database."""
    try:
        notif = Notification(
            recipient_contact=recipient_contact,
            recipient_email=recipient_email or recipient_contact,
            type=notif_type,
            title=title,
            message=message,
            link_url=link_url,
            is_read=False
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save in-app notification: {e}")
        return None


def send_smtp_email_background(
    to_email: str,
    subject: str,
    html_content: str,
    plain_content: str
):
    """
    Sends email via SMTP in a background task.
    If SMTP is not configured or fails, logs message safely without throwing.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.info(f"[Mock SMTP / Config Empty] Would send email to: {to_email} | Subject: {subject}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email

        part1 = MIMEText(plain_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        if settings.SMTP_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Notification email successfully sent to {to_email}")
    except Exception as e:
        logger.warning(f"Failed to send email via SMTP to {to_email}: {e}")


def notify_match_detected(
    db: Session,
    background_tasks,
    lost_item: Item,
    found_item: Item,
    score: float,
    why_matched: str
):
    """
    Automatically sends in-app and email notifications to both parties when a high match is detected.
    """
    pct = int(score)
    
    # 1. Notify Lost item owner
    lost_title = f"🔍 Match Found! ({pct}%) for '{lost_item.title}'"
    lost_msg = f"A found item '{found_item.title}' was reported at {found_item.location}. Match score: {pct}%. {why_matched}"
    lost_link = f"/items/{lost_item.id}"
    
    create_in_app_notification(
        db=db,
        recipient_contact=lost_item.contact_email_or_phone,
        recipient_email=lost_item.contact_email_or_phone if "@" in lost_item.contact_email_or_phone else None,
        title=lost_title,
        message=lost_msg,
        link_url=lost_link,
        notif_type="match_found"
    )

    if "@" in lost_item.contact_email_or_phone and background_tasks:
        plain = f"Hello {lost_item.contact_name},\n\nA potential match ({pct}%) has been found for your lost item '{lost_item.title}' on khojbeen.ai!\n\nMatched Item: {found_item.title}\nLocation: {found_item.location}\nReason: {why_matched}\n\nView details: {settings.FRONTEND_URL}{lost_link}\n\nRegards,\nkhojbeen.ai Team"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f766e;">🔍 khojbeen.ai — Match Found ({pct}%)</h2>
            <p>Hello <strong>{lost_item.contact_name}</strong>,</p>
            <p>Good news! A matching item was reported on campus:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>Item:</strong> {found_item.title}</p>
                <p><strong>Location:</strong> {found_item.location}</p>
                <p><strong>Why matched:</strong> {why_matched}</p>
            </div>
            <a href="{settings.FRONTEND_URL}{lost_link}" style="display: inline-block; background-color: #0f766e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Matched Item</a>
            <hr style="margin-top: 24px; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #64748b;">Jagran College Lost & Found Portal</p>
        </div>
        """
        background_tasks.add_task(
            send_smtp_email_background,
            lost_item.contact_email_or_phone,
            lost_title,
            html,
            plain
        )
