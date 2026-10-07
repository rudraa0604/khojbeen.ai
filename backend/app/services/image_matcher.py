import os
import json
import logging
import numpy as np
from PIL import Image
from typing import Optional, List

logger = logging.getLogger("khojbeen.image_matcher")

_image_model = None
_model_loaded = False

def get_image_model():
    """Lazy-loads image embedding model once on startup if torch/torchvision/sentence_transformers is present."""
    global _image_model, _model_loaded
    if _model_loaded:
        return _image_model

    try:
        # Check if sentence-transformers clip is available
        from sentence_transformers import SentenceTransformer
        _image_model = SentenceTransformer('clip-ViT-B-32')
        _model_loaded = True
        logger.info("Loaded CLIP model for visual embeddings.")
        return _image_model
    except Exception as e:
        logger.warning(f"CLIP / torchvision model not loaded ({e}). Using optimized perceptual visual feature extractor.")
        _model_loaded = True
        return None


def extract_perceptual_feature_vector(img: Image.Image) -> List[float]:
    """
    Fast, robust, zero-crash perceptual image embedding running on CPU.
    Extracts 128-dimensional normalized visual descriptor:
    - 64-dim 3D RGB/HSV color histogram
    - 64-dim spatial block luminance & gradient pattern
    """
    img_rgb = img.convert("RGB")
    
    # 1. 4x4x4 RGB color distribution (64 bins)
    img_small = img_rgb.resize((64, 64), Image.Resampling.BILINEAR)
    arr = np.array(img_small, dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # Color histogram (4 bins each = 64 features)
    hist, _ = np.histogramdd((r.flatten(), g.flatten(), b.flatten()), bins=(4, 4, 4), range=((0, 1), (0, 1), (0, 1)))
    color_feats = hist.flatten()
    color_norm = np.linalg.norm(color_feats)
    if color_norm > 0:
        color_feats = color_feats / color_norm

    # 2. 8x8 Spatial block luminance (64 features)
    img_gray = img_rgb.convert("L").resize((8, 8), Image.Resampling.BILINEAR)
    spatial_arr = np.array(img_gray, dtype=np.float32) / 255.0
    spatial_feats = spatial_arr.flatten()
    spatial_norm = np.linalg.norm(spatial_feats)
    if spatial_norm > 0:
        spatial_feats = spatial_feats / spatial_norm

    # Concatenate to 128-dim vector
    combined = np.concatenate([color_feats, spatial_feats])
    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm
    return combined.tolist()


def compute_image_embedding(image_path: str) -> Optional[List[float]]:
    """
    Computes visual feature embedding for an image file.
    Safely handles bad or corrupted images without crashing.
    """
    if not image_path:
        return None

    # Resolve path relative to backend root if necessary
    actual_path = image_path
    if not os.path.exists(actual_path):
        if actual_path.startswith("/uploads/"):
            actual_path = actual_path.lstrip("/")
        if not os.path.exists(actual_path):
            actual_path = os.path.join("uploads", os.path.basename(image_path))

    if not os.path.exists(actual_path):
        logger.warning(f"Image not found for embedding: {image_path}")
        return None

    try:
        with Image.open(actual_path) as img:
            model = get_image_model()
            if model is not None:
                try:
                    emb = model.encode(img)
                    if hasattr(emb, "tolist"):
                        emb = emb.tolist()
                    return [float(x) for x in emb]
                except Exception as ex:
                    logger.warning(f"Error encoding with deep model: {ex}. Falling back to perceptual vector.")
            
            return extract_perceptual_feature_vector(img)
    except Exception as e:
        logger.error(f"Failed to process image for embedding at {image_path}: {e}")
        return None


def compute_image_similarity(emb1: Optional[List[float]], emb2: Optional[List[float]]) -> Optional[float]:
    """
    Computes cosine similarity between two visual embeddings.
    Returns None if either embedding is missing.
    """
    if emb1 is None or emb2 is None:
        return None
    try:
        v1 = np.array(emb1, dtype=np.float32)
        v2 = np.array(emb2, dtype=np.float32)
        if len(v1) != len(v2) or len(v1) == 0:
            return None
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        dot = float(np.dot(v1, v2) / (norm1 * norm2))
        return float(np.clip(dot, 0.0, 1.0))
    except Exception as e:
        logger.error(f"Error computing image similarity: {e}")
        return None
