import datetime
import pytest
from app.services.matcher import (
    clean_text,
    compute_text_similarity,
    compute_category_score,
    compute_location_score,
    compute_date_score,
    calculate_match
)

class MockItem:
    def __init__(self, title, description, category, location, event_date):
        self.title = title
        self.description = description
        self.category = category
        self.location = location
        self.event_date = event_date

def test_synonym_normalization():
    # Test "matte water flask" vs "black Milton-type bottle" vs "black bottle"
    t1 = clean_text("black matte water flask")
    t2 = clean_text("black Milton-type bottle")
    t3 = clean_text("black bottle")

    # Both flask and bottle should map to bottle
    assert "bottle" in t1
    assert "bottle" in t2
    assert "bottle" in t3

def test_water_bottle_similarity():
    # PRD requirement: Unit test that "black bottle", "matte water flask" and "black Milton-type bottle" match
    sim1 = compute_text_similarity("matte water flask", "black Milton-type bottle")
    sim2 = compute_text_similarity("black bottle", "black Milton-type bottle")
    sim3 = compute_text_similarity("matte water flask", "black bottle")

    assert sim1 > 0.35, f"Similarity between flask and Milton bottle was {sim1}"
    assert sim2 > 0.40, f"Similarity between bottle and Milton bottle was {sim2}"
    assert sim3 > 0.35, f"Similarity between flask and bottle was {sim3}"

def test_weighted_matching_full_case():
    today = datetime.date.today()
    lost_item = MockItem(
        title="Black matte water flask",
        description="Black matte water flask left on study table",
        category="Bottles & Flasks",
        location="Library",
        event_date=today - datetime.timedelta(days=1)
    )
    found_item = MockItem(
        title="Black Milton type bottle",
        description="Black insulated bottle found in reading hall",
        category="Bottles & Flasks",
        location="Reading Hall",
        event_date=today - datetime.timedelta(days=1)
    )

    match_result = calculate_match(lost_item, found_item)

    # Score should be High (>= 70) because:
    # Text similarity high (>0.5) * 50 = ~30+
    # Category identical (1.0) * 20 = 20
    # Location same zone Library / Reading Hall (0.5) * 15 = 7.5
    # Date exact same day (1.0) * 15 = 15
    # Total >= 70
    assert match_result["score"] >= 70.0
    assert match_result["label"] == "High"
    assert match_result["category_score"] == 1.0
    assert match_result["location_score"] == 0.5  # Same Study Zone
    assert match_result["date_score"] == 1.0

def test_category_mismatch():
    score = compute_category_score("Electronics", "Cards & IDs")
    assert score == 0.0

    score_same = compute_category_score("Cards & IDs", "Cards & IDs")
    assert score_same == 1.0

def test_date_decay():
    today = datetime.date.today()
    same_day = compute_date_score(today, today)
    assert same_day == 1.0

    two_days_later = compute_date_score(today, today + datetime.timedelta(days=2))
    assert 0.8 <= two_days_later < 1.0

    twenty_days_later = compute_date_score(today, today + datetime.timedelta(days=20))
    assert twenty_days_later == 0.0
