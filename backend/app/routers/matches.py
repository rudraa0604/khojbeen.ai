from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models import Item, Match
from app.schemas import MatchResponse, ItemPublic
from app.services.matcher import calculate_match

router = APIRouter(prefix="/api/items", tags=["matches"])

@router.get("/{item_id}/matches", response_model=List[MatchResponse])
def get_item_matches(item_id: int, db: Session = Depends(get_db)):
    target_item = db.query(Item).filter(Item.id == item_id).first()
    if not target_item:
        raise HTTPException(status_code=404, detail="Item not found")

    opposite_type = "found" if target_item.type == "lost" else "lost"
    candidates = db.query(Item).filter(
        Item.type == opposite_type,
        Item.status.in_(["open", "matched", "claimed"])
    ).all()

    # Calculate real-time fresh ranked matches
    match_results = []
    for cand in candidates:
        lost_item = target_item if target_item.type == "lost" else cand
        found_item = cand if target_item.type == "lost" else target_item

        res = calculate_match(lost_item, found_item)
        
        # Only return items with a meaningful score (e.g. > 15%)
        if res["score"] >= 15.0:
            match_results.append({
                "id": cand.id,
                "lost_id": lost_item.id,
                "found_id": found_item.id,
                "score": res["score"],
                "label": res["label"],
                "text_score": res["text_score"],
                "image_score": res.get("image_score"),
                "has_image_match": res.get("has_image_match", False),
                "category_score": res["category_score"],
                "location_score": res["location_score"],
                "date_score": res["date_score"],
                "why_matched": res["why_matched"],
                "item": ItemPublic.model_validate(cand),
                "lost_item": ItemPublic.model_validate(lost_item),
                "created_at": cand.created_at
            })

    # Sort descending by score
    match_results.sort(key=lambda x: x["score"], reverse=True)
    return match_results[:10]

