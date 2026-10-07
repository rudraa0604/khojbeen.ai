import os
from pydantic_settings import BaseSettings
from typing import List

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_DB_PATH = os.path.join(_BACKEND_DIR, "khojbeen.db").replace("\\", "/")
_DEFAULT_UPLOAD_DIR = os.path.join(_BACKEND_DIR, "uploads")

class Settings(BaseSettings):
    SECRET_KEY: str = "dev-super-secret-key-khojbeen-hackathon-2026-secure"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = "$2b$12$e868d4f4e15647a7b8e19e7529faacab7847c2cbe17e3efbe864506f36611598"
    TURNSTILE_SECRET: str = "1x0000000000000000000000000000000AA"
    DB_URL: str = f"sqlite:///{_DEFAULT_DB_PATH}"
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    UPLOAD_DIR: str = _DEFAULT_UPLOAD_DIR
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Matching Weights (Task 8 & Task 9)
    TEXT_WEIGHT: float = 0.6
    IMAGE_WEIGHT: float = 0.4
    TFIDF_TEXT_WEIGHT: float = 0.4
    SEMANTIC_TEXT_WEIGHT: float = 0.6
    MATCH_NOTIFICATION_THRESHOLD: float = 65.0  # Percentage (0-100)

    # SMTP Notifications Settings (Task 10)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@khojbeen.ai"
    SMTP_TLS: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "thumbnails"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "qr_codes"), exist_ok=True)
