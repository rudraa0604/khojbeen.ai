import datetime
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.config import settings
from app.db import get_db
from app.models import Admin
from app.schemas import AdminLogin, TokenResponse
from app.services.turnstile import verify_turnstile_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: datetime.timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

from app.models import Admin, Campus

async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Admin:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    admin = db.query(Admin).filter(Admin.username == username).first()
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin user not found")
    return admin

async def get_current_super_admin(
    current_admin: Admin = Depends(get_current_admin)
) -> Admin:
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required for this action"
        )
    return current_admin

@router.post("/login", response_model=TokenResponse)
async def login(req: Request, data: AdminLogin, db: Session = Depends(get_db)):
    # Check honeypot
    if data.website:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Spam detected")

    # Verify Turnstile
    client_ip = req.client.host if req.client else None
    valid_captcha = await verify_turnstile_token(data.turnstile_token, client_ip)
    if not valid_captcha:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Security challenge verification failed")

    admin = db.query(Admin).filter(Admin.username == data.username).first()
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    campus = None
    if admin.campus_id:
        campus = db.query(Campus).filter(Campus.id == admin.campus_id).first()

    access_token = create_access_token(data={"sub": admin.username, "role": admin.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        username=admin.username,
        role=admin.role or "college_admin",
        campus_id=admin.campus_id,
        campus_name=campus.name if campus else ("All Campuses" if admin.role == "super_admin" else "Main Campus"),
        campus_logo=campus.logo_url if campus else None
    )
