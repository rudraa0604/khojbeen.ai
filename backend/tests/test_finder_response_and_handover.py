import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import datetime

from app.main import app
from app.db import Base, get_db
from app.models import Item, Campus, User, Admin, Claim, Match, FinderResponse, FacultyCoordinator
from app.routers.auth import create_access_token

# Test In-Memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        # Seed test data
        campus1 = Campus(id=1, name="Campus One", city="Delhi", slug="campus-one")
        campus2 = Campus(id=2, name="Campus Two", city="Mumbai", slug="campus-two")
        session.add_all([campus1, campus2])
        session.commit()

        # Seed Faculty Coordinator
        coord = FacultyCoordinator(
            id=1,
            campus_id=1,
            name="Dr. R. Sharma",
            department="Computer Science",
            designation="Professor",
            email="r.sharma@campus.edu",
            phone="9876543210",
            office="Block B, 204",
            available_timings="10am-1pm"
        )
        session.add(coord)

        # Seed User
        user = User(
            id=1,
            campus_id=1,
            email="student@campus.edu",
            password_hash="fakehash",
            full_name="Priya Patel",
            mobile="9876543210",
            department="Computer Science"
        )
        session.add(user)

        # Seed Tagged/Lost Item
        item = Item(
            id=1,
            campus_id=1,
            user_id=1,
            unique_qr_code="KB-TEST1234",
            type="lost",
            title="Black Milton Thermal Flask",
            description="Matte black stainless steel bottle with silver cap",
            category="Bottles & Flasks",
            brand="Milton",
            color="Black",
            location="Library 2nd Floor",
            event_date=datetime.datetime.utcnow(),
            contact_name="Priya Patel",
            contact_email_or_phone="student@campus.edu",
            status="open"
        )
        session.add(item)
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_public_scan_info_does_not_leak_private_contact(client, db_session):
    """Ensure public scan page never leaks owner phone, email, or user_id."""
    res = client.get("/api/students/scan/KB-TEST1234")
    assert res.status_code == 200
    data = res.json()
    assert data["unique_code"] == "KB-TEST1234"
    assert data["title"] == "Black Milton Thermal Flask"
    assert "student@campus.edu" not in str(data)
    assert "9876543210" not in str(data)


def test_finder_option_a_anonymous_message(client, db_session):
    """Option A: Anonymous message to owner with location."""
    res = client.post(
        "/api/students/scan/KB-TEST1234/finder-response",
        data={
            "option_type": "A",
            "message": "Found your bottle near Reading Hall Table 4",
            "found_location": "Central Library 2nd Floor"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["option_type"] == "A"

    # Verify FinderResponse record created
    resp = db_session.query(FinderResponse).filter(FinderResponse.unique_code == "KB-TEST1234").first()
    assert resp is not None
    assert resp.option_type == "A"
    assert "Reading Hall" in resp.message


def test_finder_option_b_coordinator_handover(client, db_session):
    """Option B: Hand to Faculty Coordinator / Desk."""
    res = client.post(
        "/api/students/scan/KB-TEST1234/finder-response",
        data={
            "option_type": "B",
            "coordinator_id": 1,
            "meeting_time": "Today at 1:30 PM",
            "message": "Leaving with Dr. Sharma in Block B Room 204"
        }
    )
    assert res.status_code == 200
    resp = db_session.query(FinderResponse).filter(FinderResponse.option_type == "B").first()
    assert resp is not None
    assert resp.coordinator_id == 1


def test_finder_option_c_requires_consent_and_contact(client, db_session):
    """Option C: Requires consent, name, and contact."""
    # Attempt without consent -> 400
    res = client.post(
        "/api/students/scan/KB-TEST1234/finder-response",
        data={
            "option_type": "C",
            "finder_name": "Rohan Kumar",
            "finder_mobile": "9998887776",
            "consent_given": False
        }
    )
    assert res.status_code == 400

    # Success with consent
    res2 = client.post(
        "/api/students/scan/KB-TEST1234/finder-response",
        data={
            "option_type": "C",
            "finder_name": "Rohan Kumar",
            "finder_mobile": "9998887776",
            "meeting_place": "Central Library Reading Hall",
            "meeting_time": "Lunch Break",
            "consent_given": True
        }
    )
    assert res2.status_code == 200


def test_claim_approval_generates_handover_code_and_verification(client, db_session):
    """Admin approves claim, generates 4-digit code, and verifies at collection."""
    # 1. Create a claim
    claim = Claim(
        found_id=1,
        claimant_name="Priya Patel",
        claimant_contact="student@campus.edu",
        proof_text="My bottle has a scratch on the bottom and a black Milton sticker",
        status="pending"
    )
    db_session.add(claim)
    db_session.commit()

    admin = Admin(id=1, campus_id=1, username="admin1", password_hash="fake", role="college_admin")
    db_session.add(admin)
    db_session.commit()

    admin_token = create_access_token({"sub": "admin1", "role": "college_admin", "campus_id": 1})

    # 2. Admin approves claim
    approve_res = client.patch(
        f"/api/admin/claims/{claim.id}",
        json={"status": "approved", "admin_note": "Proof verified with student ID"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approve_res.status_code == 200
    claim_data = approve_res.json()
    assert claim_data["status"] == "approved"
    assert claim_data["handover_code"] is not None
    code = claim_data["handover_code"]
    assert len(code) == 4

    # 3. Test wrong handover code fails
    wrong_res = client.post("/api/students/verify-handover", json={"code": "0000", "item_id": 1})
    assert wrong_res.status_code == 400

    # 4. Test correct handover code succeeds and marks item recovered
    correct_res = client.post("/api/students/verify-handover", json={"code": code, "item_id": 1})
    assert correct_res.status_code == 200
    assert "Recovered" in correct_res.json()["message"]
