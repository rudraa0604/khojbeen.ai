import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import datetime

from app.main import app
from app.db import Base, get_db
from app.models import Item, Campus, Admin, Match
from app.routers.auth import create_access_token

# In-Memory SQLite database
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
        # Seed test campuses
        campus1 = Campus(id=1, name="Campus One", city="Delhi", slug="campus-one")
        campus2 = Campus(id=2, name="Campus Two", city="Mumbai", slug="campus-two")
        session.add_all([campus1, campus2])

        # Seed test admins
        admin_super = Admin(id=1, campus_id=None, username="superadmin", password_hash="fake", role="super_admin")
        admin_c1 = Admin(id=2, campus_id=1, username="campus_admin1", password_hash="fake", role="college_admin")
        admin_c2 = Admin(id=3, campus_id=2, username="campus_admin2", password_hash="fake", role="college_admin")
        session.add_all([admin_super, admin_c1, admin_c2])

        # Seed items
        item_lost_c1 = Item(
            id=1,
            campus_id=1,
            type="lost",
            title="White Wireless Earbuds",
            description="Boat Airdopes 141 in white charging case",
            category="Electronics",
            brand="Boat",
            color="White",
            location="Library Reading Hall",
            event_date=datetime.datetime.utcnow(),
            contact_name="Aarav Sharma",
            contact_email_or_phone="aarav@campus.edu",
            status="matched"
        )
        item_found_c1 = Item(
            id=2,
            campus_id=1,
            type="found",
            title="White Earphones Case",
            description="Found white wireless earbuds case in library",
            category="Electronics",
            brand="Boat",
            color="White",
            location="Library Desk",
            event_date=datetime.datetime.utcnow(),
            contact_name="Security Desk",
            contact_email_or_phone="security@campus.edu",
            status="matched"
        )
        item_lost_c2 = Item(
            id=3,
            campus_id=2,
            type="lost",
            title="Blue Dell Laptop",
            description="Dell Inspiron with Linux sticker",
            category="Electronics",
            brand="Dell",
            color="Blue",
            location="Canteen",
            event_date=datetime.datetime.utcnow(),
            contact_name="Rohan Mehra",
            contact_email_or_phone="rohan@campus2.edu",
            status="open"
        )
        session.add_all([item_lost_c1, item_found_c1, item_lost_c2])
        session.commit()

        # Seed match
        match1 = Match(
            id=1,
            lost_id=1,
            found_id=2,
            score=87.5,
            text_score=0.88,
            image_score=0.85,
            has_image_match=True,
            category_score=1.0,
            location_score=0.9,
            date_score=0.95
        )
        session.add(match1)
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


def test_admin_matches_super_admin(client, db_session):
    token = create_access_token({"sub": "superadmin", "role": "super_admin"})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/matches", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "matches" in data
    assert data["total"] == 1
    assert data["strong_count"] == 1


def test_admin_matches_campus_scoping(client, db_session):
    # Admin for Campus 1 sees match 1
    token1 = create_access_token({"sub": "campus_admin1", "role": "college_admin", "campus_id": 1})
    headers1 = {"Authorization": f"Bearer {token1}"}
    res1 = client.get("/api/admin/matches", headers=headers1)
    assert res1.status_code == 200
    assert len(res1.json()["matches"]) == 1

    # Admin for Campus 2 sees 0 matches (no matches on campus 2)
    token2 = create_access_token({"sub": "campus_admin2", "role": "college_admin", "campus_id": 2})
    headers2 = {"Authorization": f"Bearer {token2}"}
    res2 = client.get("/api/admin/matches", headers=headers2)
    assert res2.status_code == 200
    assert len(res2.json()["matches"]) == 0


def test_admin_match_detail_and_verdicts(client, db_session):
    token = create_access_token({"sub": "campus_admin1", "role": "college_admin", "campus_id": 1})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/matches/1", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["score"] == 87.5
    assert data["verdict"] == "Strong"
    assert data["text_score"] > 0.8
    assert "reasons_list" in data
    assert len(data["reasons_list"]) > 0


def test_admin_item_matches(client, db_session):
    token = create_access_token({"sub": "campus_admin1", "role": "college_admin", "campus_id": 1})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/items/1/matches", headers=headers)
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) == 1
    assert matches[0]["found_item"]["title"] == "White Earphones Case"
