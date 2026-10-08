import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime

from app.main import app
from app.db import Base, get_db
from app.models import Admin, Campus, Item
from app.routers.auth import get_password_hash

from sqlalchemy.pool import StaticPool

TEST_DB_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True, scope="function")
def setup_test_database():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    
    db = TestingSessionLocal()
    
    # 1. Seed test campus
    campus = Campus(
        id=1,
        name="Jagran Main Campus (Kanpur)",
        city="Kanpur",
        contact_email="helpdesk.main@jagran.edu"
    )
    db.add(campus)

    # 2. Seed test admin
    admin = Admin(
        username="admin",
        campus_id=1,
        password_hash=get_password_hash("admin123")
    )
    db.add(admin)
    db.commit()
    db.close()

    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["app"] == "khojbeen.ai"

def test_create_item_and_public_privacy():
    payload = {
        "type": "lost",
        "title": "Black matte water flask",
        "description": "Black matte flask with a dent on bottom cap",
        "category": "Bottles & Flasks",
        "location": "Library",
        "event_date": str(datetime.date.today()),
        "contact_name": "Aarav Sharma",
        "contact_email_or_phone": "aarav.sharma@campus.edu",
    }
    res = client.post("/api/items", data=payload)
    assert res.status_code == 201
    item_data = res.json()
    assert item_data["title"] == "Black matte water flask"
    assert "id" in item_data

    # CRITICAL SECURITY CHECK: Contact info must NEVER appear in public response
    assert "contact_name" not in item_data
    assert "contact_email_or_phone" not in item_data

    # Check GET /api/items/{id} also protects privacy
    get_res = client.get(f"/api/items/{item_data['id']}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert "contact_name" not in get_data
    assert "contact_email_or_phone" not in get_data

def test_admin_auth_and_dashboard():
    # Attempt invalid login
    bad_login = client.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert bad_login.status_code == 401

    # Valid login
    good_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert good_login.status_code == 200
    token_data = good_login.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Access protected admin dashboard
    headers = {"Authorization": f"Bearer {token}"}
    dash_res = client.get("/api/admin/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "total_items" in dash_data
    assert "pending_claims" in dash_data

def test_chat_endpoint_multilingual():
    # Test English query
    res_en = client.post("/api/chat", json={"message": "How do I report a lost item?", "language": "en"})
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert "reply" in data_en
    assert "Report Lost Item" in data_en["reply"] or "Report Lost" in str(data_en.get("matched_topic"))

    # Test Hindi query
    res_hi = client.post("/api/chat", json={"message": "खोया सामान कैसे दर्ज करें?", "language": "hi"})
    assert res_hi.status_code == 200
    data_hi = res_hi.json()
    assert "reply" in data_hi
    assert len(data_hi["reply"]) > 10

def test_faculty_coordinators_crud():
    # 1. Login to get admin token
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create faculty coordinator
    payload = {
        "name": "Dr. Test Coordinator",
        "department": "Computer Science & Engineering",
        "designation": "Associate Professor",
        "email": "test.coord@campus.edu",
        "phone": "+91 99999 88888",
        "office": "Tech Wing, Room 101",
        "available_timings": "Mon-Fri 10am-12pm",
        "photo": "https://example.com/photo.jpg"
    }
    create_res = client.post("/api/faculty", json=payload, headers=headers)
    assert create_res.status_code == 201
    coord = create_res.json()
    assert coord["name"] == "Dr. Test Coordinator"
    coord_id = coord["id"]

    # 3. Public list check
    list_res = client.get("/api/faculty?department=Computer")
    assert list_res.status_code == 200
    coords_list = list_res.json()
    assert any(c["id"] == coord_id for c in coords_list)

    # 4. Public single get
    single_res = client.get(f"/api/faculty/{coord_id}")
    assert single_res.status_code == 200
    assert single_res.json()["email"] == "test.coord@campus.edu"

    # 5. Update coordinator
    update_res = client.put(
        f"/api/faculty/{coord_id}",
        json={"office": "Tech Wing, Room 202"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["office"] == "Tech Wing, Room 202"

    # 6. Delete coordinator
    del_res = client.delete(f"/api/faculty/{coord_id}", headers=headers)
    assert del_res.status_code == 204


def test_notifications_flow():
    # 1. List notifications
    list_res = client.get("/api/notifications")
    assert list_res.status_code == 200
    assert isinstance(list_res.json(), list)

    # 2. Check unread count
    count_res = client.get("/api/notifications/unread-count")
    assert count_res.status_code == 200
    assert "unread_count" in count_res.json()

    # 3. Mark all read
    read_all_res = client.put("/api/notifications/read-all")
    assert read_all_res.status_code == 200
    assert "updated_count" in read_all_res.json()


def test_qr_items_and_public_tag():
    # 1. Register a belonging
    payload = {
        "name": "Lenovo Legion Laptop",
        "category": "Electronics",
        "owner_name": "Test Owner",
        "owner_contact": "test.owner@campus.edu",
        "description": "Gaming laptop with blue skin on lid",
        "campus_id": 1
    }
    reg_res = client.post("/api/my-items", data=payload)
    assert reg_res.status_code == 201
    item = reg_res.json()
    assert item["name"] == "Lenovo Legion Laptop"
    assert "unique_code" in item
    code = item["unique_code"]
    item_id = item["id"]

    # 2. Fetch owner's items
    my_items_res = client.get("/api/my-items?owner_contact=test.owner@campus.edu")
    assert my_items_res.status_code == 200
    assert any(i["id"] == item_id for i in my_items_res.json())

    # 3. Test public QR scan endpoint (Verifies NO private contact is returned)
    pub_res = client.get(f"/api/public/tag/{code}")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["name"] == "Lenovo Legion Laptop"
    assert "owner_contact" not in pub_data
    assert "owner_name" not in pub_data

    # 4. Finder contacts owner via QR tag
    contact_payload = {
        "finder_name": "Kind Student",
        "finder_contact": "kind.student@campus.edu",
        "location_found": "Library 1st floor desk",
        "message": "I found your laptop and left it with the librarian."
    }
    msg_res = client.post(f"/api/public/tag/{code}/contact", json=contact_payload)
    assert msg_res.status_code == 200
    assert "relayed" in msg_res.json()["message"].lower()

    # 5. Report item as lost from My Items
    lost_res = client.post(f"/api/my-items/{item_id}/report-lost?owner_contact=test.owner@campus.edu&location=Library")
    assert lost_res.status_code == 200
    assert lost_res.json()["is_lost"] is True


def test_campuses_api():
    # 1. List campuses
    campuses_res = client.get("/api/campuses")
    assert campuses_res.status_code == 200
    campuses = campuses_res.json()
    assert len(campuses) >= 1
    assert "name" in campuses[0]
    assert "city" in campuses[0]


def test_student_tag_my_item_workflow():
    # 1. Register a student
    student_payload = {
        "full_name": "Rohan Verma",
        "email": "rohan.verma@jagran.edu",
        "mobile": "+919876543210",
        "department": "Computer Science",
        "password": "Password123!",
        "campus_id": 1
    }
    reg_res = client.post("/api/students/register", json=student_payload)
    assert reg_res.status_code == 201
    auth_data = reg_res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Tag a new item before losing it
    tag_payload = {
        "title": "Casio FX-991CW Calculator",
        "category": "Electronics",
        "description": "Black scientific calculator with initials RV on back",
        "brand": "Casio",
        "color": "Black",
        "finder_note": "Please return to CS Lab 3 or Library Reception"
    }
    tag_res = client.post("/api/students/me/tagged-items", data=tag_payload, headers=headers)
    assert tag_res.status_code == 201
    tagged_item = tag_res.json()
    assert tagged_item["status"] == "safe"
    assert tagged_item["title"] == "Casio FX-991CW Calculator"
    assert tagged_item["unique_qr_code"].startswith("KB-")
    qr_code = tagged_item["unique_qr_code"]
    item_id = tagged_item["id"]

    # 3. View my tagged items
    list_res = client.get("/api/students/me/tagged-items", headers=headers)
    assert list_res.status_code == 200
    items_list = list_res.json()
    assert any(i["id"] == item_id for i in items_list)

    # 4. Public scan of Safe item (verify privacy & status)
    scan_res = client.get(f"/api/students/scan/{qr_code}")
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    assert scan_data["status"] == "safe"
    assert scan_data["title"] == "Casio FX-991CW Calculator"
    assert scan_data["finder_note"] == "Please return to CS Lab 3 or Library Reception"
    # Verify owner's personal contact is NEVER exposed
    assert "owner_name" not in scan_data
    assert "contact_email_or_phone" not in scan_data
    assert "rohan.verma" not in str(scan_data)

    # 5. Notify owner for Safe item scan
    notify_payload = {
        "finder_name": "Priya",
        "finder_contact": "priya@jagran.edu",
        "finder_location": "Library Desk",
        "finder_message": "Just saw your calculator on the table."
    }
    notify_res = client.post(f"/api/students/scan/{qr_code}/notify", json=notify_payload)
    assert notify_res.status_code == 200

    # 6. Mark item as Lost (1-click)
    lost_res = client.post(
        f"/api/students/me/tagged-items/{item_id}/mark-lost",
        data={"location": "Library 2nd Floor"},
        headers=headers
    )
    assert lost_res.status_code == 200
    lost_data = lost_res.json()
    assert lost_data["item"]["status"] == "lost"
    # Verify QR code did NOT change
    assert lost_data["item"]["unique_qr_code"] == qr_code

    # 7. Scan Lost item (now shows reported lost)
    scan_lost_res = client.get(f"/api/students/scan/{qr_code}")
    assert scan_lost_res.status_code == 200
    assert scan_lost_res.json()["status"] == "lost"

    # 8. Mark item as Recovered (returns to Safe)
    rec_res = client.post(f"/api/students/me/tagged-items/{item_id}/mark-recovered", headers=headers)
    assert rec_res.status_code == 200
    assert rec_res.json()["status"] == "safe"


def test_college_admin_scoping_and_super_admin():
    db = TestingSessionLocal()
    # 1. Ensure College 2 and College Admins exist
    c2 = db.query(Campus).filter(Campus.id == 2).first()
    if not c2:
        c2 = Campus(id=2, name="Jagran City Campus", city="Kanpur", share_reports=True)
        db.add(c2)

    admin1 = db.query(Admin).filter(Admin.username == "admin_col1").first()
    if not admin1:
        admin1 = Admin(username="admin_col1", campus_id=1, role="college_admin", password_hash=get_password_hash("Col1@123"))
        db.add(admin1)

    admin2 = db.query(Admin).filter(Admin.username == "admin_col2").first()
    if not admin2:
        admin2 = Admin(username="admin_col2", campus_id=2, role="college_admin", password_hash=get_password_hash("Col2@123"))
        db.add(admin2)

    super_a = db.query(Admin).filter(Admin.username == "super_adm").first()
    if not super_a:
        super_a = Admin(username="super_adm", campus_id=None, role="super_admin", password_hash=get_password_hash("Super@123"))
        db.add(super_a)

    db.commit()

    # Create an item in College 2
    c2_item = Item(
        campus_id=2,
        type="lost",
        title="City Campus Sports Bag",
        description="Blue duffle bag with gym clothes",
        category="Bags & Accessories",
        location="Sports Complex",
        event_date=datetime.datetime.utcnow(),
        contact_name="City Student",
        contact_email_or_phone="city.student@jagran.edu",
        status="open"
    )
    db.add(c2_item)
    db.commit()
    db.refresh(c2_item)
    c2_item_id = c2_item.id
    db.close()

    # 2. Login as Admin 1 (College 1)
    login1_res = client.post("/api/auth/login", json={"username": "admin_col1", "password": "Col1@123"})
    assert login1_res.status_code == 200
    token1 = login1_res.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 3. Login as Admin 2 (College 2)
    login2_res = client.post("/api/auth/login", json={"username": "admin_col2", "password": "Col2@123"})
    assert login2_res.status_code == 200
    token2 = login2_res.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 4. Login as Super Admin
    login_super = client.post("/api/auth/login", json={"username": "super_adm", "password": "Super@123"})
    assert login_super.status_code == 200
    token_super = login_super.json()["access_token"]
    headers_super = {"Authorization": f"Bearer {token_super}"}

    # PROOF: Admin 1 cannot see College 2's item in their admin items list
    admin1_items = client.get("/api/admin/items", headers=headers1).json()
    assert not any(i["id"] == c2_item_id for i in admin1_items)

    # PROOF: Admin 2 CAN see College 2's item in their admin items list
    admin2_items = client.get("/api/admin/items", headers=headers2).json()
    assert any(i["id"] == c2_item_id for i in admin2_items)

    # PROOF: Admin 1 cannot delete or close College 2's item (Forbidden 403)
    delete_forbidden = client.delete(f"/api/admin/items/{c2_item_id}", headers=headers1)
    assert delete_forbidden.status_code == 403

    # PROOF: Super Admin CAN access Super Admin stats and colleges
    stats_res = client.get("/api/super-admin/stats", headers=headers_super)
    assert stats_res.status_code == 200
    assert stats_res.json()["total_colleges"] >= 2

    # PROOF: Cross-college inquiry creation and privacy
    inq_payload = {
        "item_id": c2_item_id,
        "sender_name": "Aarav Sharma",
        "sender_contact": "aarav.sharma@campus.edu",
        "message": "I think this bag is mine, I left it during yesterday's inter-college match.",
        "from_campus_id": 1,
        "inquiry_type": "claim"
    }
    inq_res = client.post(f"/api/items/{c2_item_id}/inquire", json=inq_payload)
    assert inq_res.status_code == 200
    inquiry_id = inq_res.json()["id"]

    # PROOF: Admin 2 (College 2) sees this inquiry in their inquiries tab
    inquiries_admin2 = client.get("/api/admin/inquiries", headers=headers2).json()
    assert any(inq["id"] == inquiry_id for inq in inquiries_admin2)

    # PROOF: Admin 2 replies to the cross-college inquiry
    reply_res = client.patch(
        f"/api/admin/inquiries/{inquiry_id}/reply",
        json={"status": "approved", "admin_reply": "Please collect it with your student ID from Civil Lines room 105."},
        headers=headers2
    )
    assert reply_res.status_code == 200




