import os
import uuid
from PIL import Image
import io
from fastapi import UploadFile, HTTPException
from app.config import settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def save_and_compress_image(file: UploadFile) -> tuple[str, str]:
    """
    Accepts an uploaded image file, verifies type and size,
    resizes to max 1200px (standard) and max 400px (thumbnail),
    converts to WebP format, strips EXIF/metadata, and returns relative paths.
    """
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image type. Allowed: JPG, PNG, WEBP.")

    try:
        content = file.file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Image file exceeds 5MB limit.")

        image = Image.open(io.BytesIO(content))
        
        # Convert RGBA/P to RGB if needed for WebP or handle transparency cleanly
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            # Keep alpha channel for WebP
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        file_id = str(uuid.uuid4())
        filename = f"{file_id}.webp"
        thumb_filename = f"{file_id}_thumb.webp"

        full_path = os.path.join(settings.UPLOAD_DIR, filename)
        thumb_path = os.path.join(settings.UPLOAD_DIR, "thumbnails", thumb_filename)

        # 1. Main image: Resize maintaining aspect ratio to max 1200px
        main_img = image.copy()
        main_img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        main_img.save(full_path, "WEBP", quality=80, optimize=True)

        # 2. Thumbnail: Resize maintaining aspect ratio to max 400px
        thumb_img = image.copy()
        thumb_img.thumbnail((400, 400), Image.Resampling.LANCZOS)
        thumb_img.save(thumb_path, "WEBP", quality=75, optimize=True)

        rel_path = f"/uploads/{filename}"
        rel_thumb_path = f"/uploads/thumbnails/{thumb_filename}"

        return rel_path, rel_thumb_path

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")
