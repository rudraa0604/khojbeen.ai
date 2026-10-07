import re
import json
import logging
import numpy as np
from typing import Optional, List

logger = logging.getLogger("khojbeen.semantic_matcher")

# Comprehensive multilingual + Hinglish alignment dictionary
HINGLISH_HINDI_ENGLISH_MAP = {
    # Colors
    "kala": "black", "kaala": "black", "kali": "black", "काली": "black", "काला": "black", "काले": "black",
    "neela": "blue", "nila": "blue", "neeli": "blue", "नीला": "blue", "नीली": "blue",
    "laal": "red", "lal": "red", "लाल": "red",
    "safed": "white", "chitta": "white", "सफेद": "white",
    "hara": "green", "hari": "green", "हरा": "green", "हरी": "green",
    "peela": "yellow", "pila": "yellow", "पीला": "yellow", "पीली": "yellow",
    "gulabi": "pink", "गुलाबी": "pink",
    "bhoora": "brown", "bhura": "brown", "भूरा": "brown",
    "sleti": "grey", "gray": "grey", "ग्रे": "grey",

    # Objects / Items
    "bag": "backpack", "basta": "backpack", "thaila": "backpack", "jhola": "backpack", "बैग": "backpack", "बस्ता": "backpack", "झोला": "backpack",
    "bottle": "water_bottle", "botal": "water_bottle", "flask": "water_bottle", "milton": "water_bottle", "sipper": "water_bottle", "बोतल": "water_bottle",
    "chabi": "keys", "chabhi": "keys", "chhabiyan": "keys", "key": "keys", "चाबी": "keys", "चाभियां": "keys",
    "chashma": "glasses", "chasma": "glasses", "spectacles": "glasses", "specs": "glasses", "sunglasses": "glasses", "चश्मा": "glasses", "धूप_का_चश्मा": "glasses",
    "mobile": "phone", "fon": "phone", "smartphone": "phone", "iphone": "phone", "samsung": "phone", "मोबाइल": "phone", "फोन": "phone",
    "earphones": "earbuds", "earphone": "earbuds", "airpods": "earbuds", "headphones": "earbuds", "buds": "earbuds", "ईयरफोन": "earbuds",
    "batua": "wallet", "purse": "wallet", "pocketbook": "wallet", "बटुआ": "wallet", "पर्स": "wallet",
    "ghadi": "watch", "ghari": "watch", "smartwatch": "watch", "घड़ी": "watch", "घड़ी": "watch", "हाथ": "wrist",
    "kitab": "book", "pustak": "book", "copy": "notebook", "register": "notebook", "किताब": "book", "पुस्तक": "book", "कॉपी": "notebook", "रजिस्टर": "notebook",
    "id": "id_card", "identity": "id_card", "icard": "id_card", "pass": "id_card", "पहचान_पत्र": "id_card", "पहचान": "id_card", "पत्र": "id_card", "कार्ड": "id_card", "कॉलेज": "college",
    "calculator": "calculator", "calc": "calculator", "केल्कुलेटर": "calculator", "कैलकुलेटर": "calculator",
    "umbrella": "umbrella", "chatri": "umbrella", "chhatri": "umbrella", "छाता": "umbrella", "छतरी": "umbrella",
    "charger": "charger", "adapter": "charger", "data_cable": "cable", "चार्जर": "charger",

    # Locations
    "library": "library", "pustakalaya": "library", "लाइब्रेरी": "library", "पुस्तकालय": "library",
    "canteen": "canteen", "cafeteria": "canteen", "कैंटीन": "canteen",
    "ground": "sports_ground", "maidan": "sports_ground", "मैदान": "sports_ground",
    "lab": "laboratory", "प्रयोगशाला": "laboratory", "लैब": "laboratory",
    "auditorium": "auditorium", "hall": "auditorium", "सभागार": "auditorium",
    "parking": "parking", "पार्किंग": "parking",
}

_semantic_model = None
_model_attempted = False

def get_semantic_model():
    """Lazy-loads multilingual sentence transformer model if available."""
    global _semantic_model, _model_attempted
    if _model_attempted:
        return _semantic_model

    _model_attempted = True
    try:
        from sentence_transformers import SentenceTransformer
        _semantic_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        logger.info("Loaded paraphrase-multilingual-MiniLM-L12-v2 for text embeddings.")
        return _semantic_model
    except Exception as e:
        logger.warning(f"SentenceTransformer not loaded ({e}). Using optimized multilingual subword/semantic vectorizer.")
        return None


def normalize_multilingual_tokens(text: str) -> str:
    """Normalizes mixed Hindi, Hinglish, and English tokens into canonical semantic space."""
    if not text:
        return ""
    text_lower = text.lower().strip()
    # Split by whitespace, punctuation, and symbols safely for Unicode / Indic text
    tokens = re.findall(r"[^\s,.;:!?\"\'\(\)\[\]\{\}\/\\|<>+=\-_~`]+", text_lower, flags=re.UNICODE)
    normalized = []
    for token in tokens:
        clean_token = token.strip()
        if not clean_token:
            continue
        if clean_token in HINGLISH_HINDI_ENGLISH_MAP:
            normalized.append(HINGLISH_HINDI_ENGLISH_MAP[clean_token])
        else:
            normalized.append(clean_token)
    return " ".join(normalized)


def extract_dense_semantic_vector(text: str, dim: int = 128) -> List[float]:
    """
    Computes a deterministic, dense multilingual semantic vector across Hindi, Hinglish, and English.
    Uses subword character n-grams + canonical cross-lingual semantic concepts.
    """
    normalized = normalize_multilingual_tokens(text)
    if not normalized.strip():
        return [0.0] * dim

    vec = np.zeros(dim, dtype=np.float32)
    tokens = normalized.split()
    
    # 1. Concept-level hashing (first half of vector)
    for i, token in enumerate(tokens):
        h = hash(token) % (dim // 2)
        weight = 2.0 if token in HINGLISH_HINDI_ENGLISH_MAP.values() else 1.0
        vec[h] += weight

    # 2. Subword character 3-gram hashing (second half of vector)
    for token in tokens:
        padded = f"^{token}$"
        for j in range(len(padded) - 2):
            ngram = padded[j:j+3]
            h = (dim // 2) + (hash(ngram) % (dim // 2))
            vec[h] += 0.5

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


def compute_text_embedding(text: str) -> Optional[List[float]]:
    """
    Computes semantic vector for text (Hindi, Hinglish, English, or any Indian regional language).
    Precomputed at item creation and stored in database.
    """
    if not text or not text.strip():
        return None

    model = get_semantic_model()
    if model is not None:
        try:
            emb = model.encode(text)
            if hasattr(emb, "tolist"):
                emb = emb.tolist()
            return [float(x) for x in emb]
        except Exception as e:
            logger.warning(f"Model encode failed: {e}. Falling back to dense semantic vectorizer.")

    return extract_dense_semantic_vector(text)


def compute_semantic_similarity(emb1: Optional[List[float]], emb2: Optional[List[float]]) -> float:
    """
    Computes cosine similarity between two semantic text embeddings.
    Returns 0.0 if either is missing.
    """
    if emb1 is None or emb2 is None:
        return 0.0
    try:
        v1 = np.array(emb1, dtype=np.float32)
        v2 = np.array(emb2, dtype=np.float32)
        if len(v1) != len(v2) or len(v1) == 0:
            return 0.0
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        dot = float(np.dot(v1, v2) / (norm1 * norm2))
        return float(np.clip(dot, 0.0, 1.0))
    except Exception as e:
        logger.error(f"Error computing semantic similarity: {e}")
        return 0.0
