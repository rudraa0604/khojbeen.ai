import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db import Base

class Campus(Base):
    __tablename__ = "campuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    city = Column(String(100), nullable=False, index=True)
    slug = Column(String(100), nullable=True, unique=True, index=True)
    logo_url = Column(String(255), nullable=True)
    contact_email = Column(String(100), nullable=True)
    share_reports = Column(Boolean, default=True)
    announcement = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    items = relationship("Item", back_populates="campus")
    coordinators = relationship("FacultyCoordinator", back_populates="campus")
    users = relationship("User", back_populates="campus")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True, default=1, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    mobile = Column(String(30), nullable=False)
    department = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="student")  # 'student', 'faculty', 'college_admin', 'super_admin'
    is_disabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    campus = relationship("Campus", back_populates="users")
    items = relationship("Item", back_populates="user", cascade="all, delete-orphan")
    scan_events = relationship("ScanEvent", back_populates="user", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True, default=1, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    unique_qr_code = Column(String(50), unique=True, nullable=True, index=True)
    type = Column(String(10), nullable=False, index=True)  # 'lost', 'found', 'tagged'
    title = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    brand = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    finder_note = Column(Text, nullable=True)
    is_tagged = Column(Boolean, default=False, index=True)
    location = Column(String(100), nullable=False, index=True)
    event_date = Column(DateTime, nullable=False)
    image_path = Column(String(255), nullable=True)
    thumbnail_path = Column(String(255), nullable=True)
    image_embedding = Column(Text, nullable=True)  # JSON-encoded float list for visual similarity
    text_embedding = Column(Text, nullable=True)   # JSON-encoded float list for semantic similarity
    contact_name = Column(String(100), nullable=False)
    contact_email_or_phone = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="open", index=True)  # open, matched, claimed, closed, recovered, safe, lost
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    campus = relationship("Campus", back_populates="items")
    user = relationship("User", back_populates="items")
    lost_matches = relationship("Match", foreign_keys="[Match.lost_id]", back_populates="lost_item", cascade="all, delete-orphan")
    found_matches = relationship("Match", foreign_keys="[Match.found_id]", back_populates="found_item", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="found_item", cascade="all, delete-orphan")
    scan_events = relationship("ScanEvent", back_populates="item", cascade="all, delete-orphan")


class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    finder_name = Column(String(100), nullable=True)
    finder_contact = Column(String(100), nullable=True)
    finder_message = Column(Text, nullable=True)
    finder_location = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    item = relationship("Item", back_populates="scan_events")
    user = relationship("User", back_populates="scan_events")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    lost_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    found_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    score = Column(Float, nullable=False)  # Final combined score 0 - 100
    text_score = Column(Float, nullable=False)  # 0 - 1 (combined TF-IDF + Semantic)
    image_score = Column(Float, nullable=True)  # 0 - 1 (Visual similarity)
    has_image_match = Column(Boolean, default=False)
    category_score = Column(Float, nullable=False)  # 0 - 1
    location_score = Column(Float, nullable=False)  # 0 - 1
    date_score = Column(Float, nullable=False)  # 0 - 1
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    lost_item = relationship("Item", foreign_keys=[lost_id], back_populates="lost_matches")
    found_item = relationship("Item", foreign_keys=[found_id], back_populates="found_matches")
    claims = relationship("Claim", back_populates="match", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    found_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    claimant_name = Column(String(100), nullable=False)
    claimant_contact = Column(String(100), nullable=False)
    claimant_department = Column(String(100), nullable=True)
    proof_text = Column(Text, nullable=False)
    secret_question = Column(String(255), nullable=True)
    secret_answer = Column(String(255), nullable=True)
    claimant_answer = Column(String(255), nullable=True)
    proof_image = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, approved, rejected, more_proof_requested
    admin_note = Column(Text, nullable=True)
    handover_code = Column(String(10), nullable=True)
    handover_status = Column(String(30), default="pending")  # pending, handed_over
    wrong_code_attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)

    match = relationship("Match", back_populates="claims")
    found_item = relationship("Item", back_populates="claims")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True, default=1)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default="college_admin")  # 'super_admin', 'college_admin'
    full_name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)

    campus = relationship("Campus")


class FacultyCoordinator(Base):
    __tablename__ = "faculty_coordinators"

    id = Column(Integer, primary_key=True, index=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True, default=1, index=True)
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=True)
    name = Column(String(100), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    designation = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    office = Column(String(100), nullable=False)
    available_timings = Column(String(100), nullable=False)
    photo = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    campus = relationship("Campus", back_populates="coordinators")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(100), nullable=True, index=True)
    recipient_contact = Column(String(100), nullable=True, index=True)
    type = Column(String(50), nullable=False, default="match_found")  # match_found, claim_update, qr_scanned, item_scanned, cross_college_inquiry
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class CrossCollegeInquiry(Base):
    __tablename__ = "cross_college_inquiries"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    from_campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True, index=True)
    to_campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    sender_name = Column(String(100), nullable=False)
    sender_contact = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    inquiry_type = Column(String(50), default="claim")  # "claim", "found_report", "general"
    status = Column(String(20), default="pending", index=True)  # "pending", "approved", "replied", "closed"
    admin_reply = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    item = relationship("Item")
    from_campus = relationship("Campus", foreign_keys=[from_campus_id])
    to_campus = relationship("Campus", foreign_keys=[to_campus_id])
    user = relationship("User")


class RegisteredItem(Base):
    __tablename__ = "registered_items"

    id = Column(Integer, primary_key=True, index=True)
    unique_code = Column(String(50), unique=True, nullable=False, index=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True, default=1, index=True)
    owner_name = Column(String(100), nullable=False)
    owner_contact = Column(String(100), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    contact_preference = Column(String(50), default="portal")
    is_lost = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class FinderResponse(Base):
    __tablename__ = "finder_responses"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True, index=True)
    unique_code = Column(String(50), nullable=False, index=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True, index=True)
    option_type = Column(String(10), nullable=False)  # 'A', 'B', 'C'
    message = Column(Text, nullable=True)
    found_location = Column(String(150), nullable=True)
    photo_path = Column(String(255), nullable=True)
    meeting_place = Column(String(100), nullable=True)
    meeting_time = Column(String(100), nullable=True)
    coordinator_id = Column(Integer, ForeignKey("faculty_coordinators.id"), nullable=True, index=True)
    finder_name = Column(String(100), nullable=True)
    finder_mobile = Column(String(50), nullable=True)
    finder_department = Column(String(100), nullable=True)
    consent_given = Column(Boolean, default=False)
    status = Column(String(30), default="submitted")  # submitted, item_received, claim_approved, handed_over, spam_blocked
    handover_code_hash = Column(String(255), nullable=True)
    finder_token = Column(String(100), unique=True, nullable=True, index=True)
    owner_reply = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    item = relationship("Item")
    campus = relationship("Campus")
    coordinator = relationship("FacultyCoordinator")
