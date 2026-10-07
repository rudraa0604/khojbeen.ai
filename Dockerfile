# Multi-stage Dockerfile for Khojbeen.ai Full-Stack Application
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Production Runtime
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    ENVIRONMENT=production

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy Backend application
COPY backend /app/backend
WORKDIR /app/backend

# Copy built frontend dist from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Ensure upload directories exist
RUN mkdir -p /app/backend/uploads/thumbnails /app/backend/uploads/qr_codes

# Expose default port
EXPOSE 8000

# Start Uvicorn with dynamic $PORT support (for Render, Railway, Fly.io, etc.)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
