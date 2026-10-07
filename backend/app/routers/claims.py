import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Item, Claim, Match
from app.schemas import ClaimCreate, ClaimPublic
from app.services.turnstile import verify_turnstile_token

router = APIRouter(prefix="/api/claims", tags=["claims"])

@router.post("", response_model=ClaimPublic, status_code=status.HTTP_201_CREATED)
async def create_claim(
    request: Request,
    claim_data: ClaimCreate,
    db: Session = Depends(get_db)
):
    # 1. Honeypot check
    if claim_data.website and len(claim_data.website.strip()) > 0:
        raise HTTPException(status_code=400, detail="Spam detected")

    # 2. Turnstile check
    client_ip = request.client.host if request.client else None
    valid_captcha = await verify_turnstile_token(claim_data.turnstile_token, client_ip)
    if not valid_captcha:
        raise HTTPException(status_code=400, detail="Security challenge verification failed")

    # 3. Verify found item exists
    found_item = db.query(Item).filter(Item.id == claim_data.found_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item does not exist")

    # 4. Create claim
    claim = Claim(
        found_id=claim_data.found_id,
        match_id=claim_data.match_id,
        claimant_name=claim_data.claimant_name.strip(),
        claimant_contact=claim_data.claimant_contact.strip(),
        proof_text=claim_data.proof_text.strip(),
        status="pending"
    )
    db.add(claim)

    # 5. Update found item status
    if found_item.status != "closed":
        found_item.status = "claimed"

    db.commit()
    db.refresh(claim)

    return claim
