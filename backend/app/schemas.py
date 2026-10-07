import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Union, Any

CATEGORIES = [
    "Electronics",
    "Cards & IDs",
    "Books & Stationery",
    "Bottles & Flasks",
    "Keys & Locks",
    "Bags & Accessories",
    "Clothing",
    "Other"
]

LOCATIONS = [
    "Library",
    "Reading Hall",
    "Cafeteria",
    "Computer Lab",
    "Science Block",
    "Main Auditorium",
    "Sports Complex",
    "Parking Area",
    "Admin Block",
    "Classroom Block A",
    "Classroom Block B",
    "Other"
]

# --- Campus Schemas ---

class CampusBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    city: str = Field(..., min_length=2, max_length=100)
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    share_reports: Optional[bool] = True
    announcement: Optional[str] = None
    is_active: Optional[bool] = True

class CampusCreate(CampusBase):
    pass

class CampusUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    share_reports: Optional[bool] = None
    announcement: Optional[str] = None
    is_active: Optional[bool] = None

class CampusPublic(CampusBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Student / User Schemas (Task 14 & 15) ---

class StudentRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    mobile: str = Field(..., min_length=8, max_length=20)
    department: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: Optional[str] = None
    campus_id: Optional[int] = 1

class StudentLogin(BaseModel):
    email: str
    password: str
    turnstile_token: Optional[str] = None
    website: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    email: str
    full_name: str
    mobile: str
    department: str
    role: str
    campus_id: Optional[int] = 1
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    mobile: Optional[str] = Field(None, min_length=8, max_length=20)
    department: Optional[str] = Field(None, min_length=2, max_length=100)

class StudentTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: StudentResponse

# --- Scan Event Schemas (Task 15) ---

class ScanEventPublic(BaseModel):
    id: int
    item_id: int
    finder_name: Optional[str] = None
    finder_contact: Optional[str] = None
    finder_message: Optional[str] = None
    finder_location: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class PublicScanReportFound(BaseModel):
    finder_name: Optional[str] = Field("Good Samaritan", max_length=100)
    finder_contact: Optional[str] = Field(None, max_length=100)
    finder_message: Optional[str] = Field(None, max_length=500)
    finder_location: Optional[str] = Field(None, max_length=150)
    turnstile_token: Optional[str] = None
    website: Optional[str] = None

# --- Item Schemas ---

class ItemBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=80, description="Item title (3-80 chars)")
    description: str = Field(..., min_length=10, max_length=500, description="Detailed description (10-500 chars)")
    category: str = Field(..., description="Category from approved list")
    brand: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    finder_note: Optional[str] = Field(None, max_length=500)
    location: str = Field(..., description="Campus location")
    event_date: Union[datetime.date, datetime.datetime] = Field(..., description="Date item was lost or found")
    campus_id: Optional[int] = Field(1, description="Associated Campus ID")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(CATEGORIES)}")
        return v

    @field_validator("event_date", mode="before")
    @classmethod
    def validate_event_date(cls, v: Any) -> datetime.date:
        if isinstance(v, datetime.datetime):
            v = v.date()
        elif isinstance(v, str):
            try:
                v = datetime.date.fromisoformat(v.split("T")[0].split(" ")[0])
            except Exception:
                pass
        today = datetime.date.today()
        if isinstance(v, datetime.date) and v > today:
            raise ValueError("Event date cannot be in the future")
        return v

class ItemCreate(ItemBase):
    type: str = Field(..., pattern="^(lost|found)$", description="'lost' or 'found'")
    contact_name: str = Field(..., min_length=2, max_length=100, description="Contact name")
    contact_email_or_phone: str = Field(..., min_length=5, max_length=100, description="Email or phone")
    turnstile_token: Optional[str] = Field(None, description="Cloudflare Turnstile token")
    website: Optional[str] = Field(None, description="Honeypot field (must be empty)")

    @field_validator("website")
    @classmethod
    def validate_honeypot(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 0:
            raise ValueError("Spam detected")
        return v

# Public Item Response (NEVER contains contact info)
class ItemPublic(ItemBase):
    id: int
    type: str
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: str
    unique_qr_code: Optional[str] = None
    is_tagged: Optional[bool] = False
    campus_id: Optional[int] = 1
    campus_name: Optional[str] = None
    campus_logo: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Admin Item Response (contains contact info)
class ItemAdmin(ItemPublic):
    contact_name: str
    contact_email_or_phone: str
    user_id: Optional[int] = None

# Paginated response
class PaginatedItems(BaseModel):
    items: List[ItemPublic]
    total: int
    page: int
    size: int
    pages: int

# Item Detail for Student Owner
class StudentItemDetail(ItemPublic):
    contact_name: str
    contact_email_or_phone: str
    unique_qr_code: Optional[str] = None
    qr_image_url: Optional[str] = None
    scan_events: List[ScanEventPublic] = []

# Public Scan View (NEVER includes owner info)
class PublicItemScan(BaseModel):
    unique_code: str
    title: str
    category: str
    description: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    finder_note: Optional[str] = None
    image_path: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime.date] = None
    status: str
    campus_id: Optional[int] = 1
    campus_name: Optional[str] = None
    campus_city: Optional[str] = None

    class Config:
        from_attributes = True

# Tagged Item Schemas (Task 21)
class TaggedItemResponse(BaseModel):
    id: int
    title: str
    category: str
    description: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    finder_note: Optional[str] = None
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    unique_qr_code: str
    status: str  # 'safe', 'lost', 'recovered'
    campus_id: Optional[int] = 1
    scan_count: int = 0
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class MarkLostPayload(BaseModel):
    location: Optional[str] = Field("Campus", max_length=100)
    event_date: Optional[datetime.date] = None

# --- Match Schemas ---

class MatchResponse(BaseModel):
    id: int
    lost_id: int
    found_id: int
    score: float
    label: str  # High, Medium, Low
    text_score: float
    image_score: Optional[float] = None
    has_image_match: bool = False
    category_score: float
    location_score: float
    date_score: float
    why_matched: str
    item: ItemPublic
    lost_item: Optional[ItemPublic] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Claim Schemas ---

class ClaimCreate(BaseModel):
    found_id: int
    match_id: Optional[int] = None
    claimant_name: str = Field(..., min_length=2, max_length=100)
    claimant_contact: str = Field(..., min_length=5, max_length=100)
    proof_text: str = Field(..., min_length=15, max_length=1000, description="Detailed proof of ownership (min 15 chars)")
    turnstile_token: Optional[str] = None
    website: Optional[str] = None  # honeypot

    @field_validator("website")
    @classmethod
    def validate_honeypot(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 0:
            raise ValueError("Spam detected")
        return v

class ClaimPublic(BaseModel):
    id: int
    found_id: int
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ClaimAdmin(BaseModel):
    id: int
    found_id: int
    match_id: Optional[int]
    claimant_name: str
    claimant_contact: str
    proof_text: str
    status: str
    admin_note: Optional[str]
    created_at: datetime.datetime
    decided_at: Optional[datetime.datetime]
    found_item: Optional[ItemAdmin] = None

    class Config:
        from_attributes = True

class ClaimDecision(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    admin_note: Optional[str] = Field(None, max_length=500)

# --- Admin Auth & Dashboard Schemas ---

class AdminLogin(BaseModel):
    username: str
    password: str
    turnstile_token: Optional[str] = None
    website: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str = "college_admin"  # "super_admin" or "college_admin"
    campus_id: Optional[int] = None
    campus_name: Optional[str] = None
    campus_logo: Optional[str] = None

class AdminDashboardStats(BaseModel):
    total_items: int
    open_lost: int
    open_found: int
    matched_count: int
    claimed_count: int
    closed_count: int
    pending_claims_count: int
    active_students_count: int = 0
    qr_scans_count: int = 0
    tagged_items_count: int = 0
    campus_name: Optional[str] = None
    campus_logo: Optional[str] = None
    share_reports: bool = True
    announcement: Optional[str] = None
    pending_claims: List[ClaimAdmin] = []
    recent_activity: List[Any] = []

class CollegeSettingsUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    share_reports: Optional[bool] = None
    announcement: Optional[str] = None

class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field("college_admin", pattern="^(super_admin|college_admin)$")
    campus_id: Optional[int] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

class AdminUpdate(BaseModel):
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    role: Optional[str] = Field(None, pattern="^(super_admin|college_admin)$")
    campus_id: Optional[int] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

class AdminPublic(BaseModel):
    id: int
    username: str
    role: str
    campus_id: Optional[int] = None
    campus_name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True

class SuperAdminStats(BaseModel):
    total_colleges: int
    active_colleges: int
    total_items: int
    total_lost: int
    total_found: int
    total_matched: int
    total_recovered: int
    total_students: int
    total_scans: int
    total_inquiries: int

# --- Cross-College Inquiry Schemas ---

class CrossCollegeInquiryCreate(BaseModel):
    item_id: int
    sender_name: str = Field(..., min_length=2, max_length=100)
    sender_contact: str = Field(..., min_length=5, max_length=100)
    message: str = Field(..., min_length=5, max_length=1000)
    inquiry_type: Optional[str] = Field("claim", pattern="^(claim|found_report|general)$")
    from_campus_id: Optional[int] = None
    website: Optional[str] = None

    @field_validator("website")
    @classmethod
    def validate_honeypot(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 0:
            raise ValueError("Spam detected")
        return v

class CrossCollegeInquiryReply(BaseModel):
    status: str = Field(..., pattern="^(pending|approved|replied|closed)$")
    admin_reply: Optional[str] = Field(None, max_length=1000)

class CrossCollegeInquiryPublic(BaseModel):
    id: int
    item_id: int
    item_title: Optional[str] = None
    item_type: Optional[str] = None
    from_campus_id: Optional[int] = None
    from_campus_name: Optional[str] = None
    to_campus_id: int
    to_campus_name: Optional[str] = None
    sender_name: str
    sender_contact: str
    message: str
    inquiry_type: str
    status: str
    admin_reply: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Faculty Coordinator Schemas ---

class FacultyCoordinatorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    designation: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    phone: str = Field(..., min_length=5, max_length=30)
    office: str = Field(..., min_length=2, max_length=100)
    available_timings: str = Field(..., min_length=2, max_length=100)
    campus_id: Optional[int] = 1
    photo: Optional[str] = None

class FacultyCoordinatorCreate(FacultyCoordinatorBase):
    pass

class FacultyCoordinatorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    designation: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = Field(None, min_length=5, max_length=100)
    phone: Optional[str] = Field(None, min_length=5, max_length=30)
    office: Optional[str] = Field(None, min_length=2, max_length=100)
    available_timings: Optional[str] = Field(None, min_length=2, max_length=100)
    campus_id: Optional[int] = None
    photo: Optional[str] = None

class FacultyCoordinatorPublic(FacultyCoordinatorBase):
    id: int
    admin_id: Optional[int] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Notification Schemas ---

class NotificationPublic(BaseModel):
    id: int
    recipient_contact: Optional[str] = None
    type: str
    title: str
    message: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- QR Registered Item Legacy Compatibility Schemas ---

class RegisteredItemCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., description="Category from approved list")
    owner_name: str = Field(..., min_length=2, max_length=100)
    owner_contact: str = Field(..., min_length=5, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    contact_preference: Optional[str] = Field("portal", max_length=50)
    campus_id: Optional[int] = 1
    photo_url: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(CATEGORIES)}")
        return v

class RegisteredItemPublic(BaseModel):
    id: int
    unique_code: str
    name: str
    category: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    contact_preference: Optional[str] = None
    campus_id: Optional[int] = 1
    is_lost: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class RegisteredItemOwnerView(RegisteredItemPublic):
    owner_name: str
    owner_contact: str

class ContactOwnerPayload(BaseModel):
    finder_name: str = Field(..., min_length=2, max_length=100)
    finder_contact: str = Field(..., min_length=5, max_length=100)
    message: str = Field(..., min_length=10, max_length=500)
    location_found: Optional[str] = None
    website: Optional[str] = None  # honeypot

    @field_validator("website")
    @classmethod
    def validate_honeypot(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 0:
            raise ValueError("Spam detected")
        return v
