import os
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db import engine, Base, run_migrations
from app.routers import auth, items, matches, claims, admin, chat, faculty, notifications, qr_tags, campuses, students, super_admin

# Create tables and run migrations
Base.metadata.create_all(bind=engine)
run_migrations()

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(
    title="khojbeen.ai API",
    description="Campus Lost & Found Intelligent Matcher REST API",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Student-Token", "Content-Disposition", "*"],
)

# Security Headers & HTTPS Enforcement Middleware
@app.middleware("http")
async def security_and_https_middleware(request: Request, call_next):
    # Production HTTPS enforcement
    if settings.ENVIRONMENT == "production":
        proto = request.headers.get("x-forwarded-proto", "http")
        if proto == "http":
            url = str(request.url).replace("http://", "https://", 1)
            return RedirectResponse(url=url, status_code=status.HTTP_301_MOVED_PERMANENTLY)

    response = await call_next(request)

    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    return response

# Mount uploads directory for static image serving
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "thumbnails"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "qr_codes"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(items.router)
app.include_router(matches.router)
app.include_router(claims.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(faculty.router)
app.include_router(notifications.router)
app.include_router(qr_tags.router)
app.include_router(campuses.router)
app.include_router(super_admin.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to khojbeen.ai Backend API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": "khojbeen.ai",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT
    }
