import os
import re
import json
import logging
import datetime
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import math
from collections import Counter

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:
    class TfidfVectorizer:
        def __init__(self, token_pattern=r"(?u)\b\w+\b", min_df=1):
            self.pattern = re.compile(token_pattern)
            self.vocabulary_ = {}
            self.idf_ = {}

        def _tokenize(self, text):
            return [w.lower() for w in self.pattern.findall(text)]

        def fit_transform(self, docs):
            tokenized_docs = [self._tokenize(d) for d in docs]
            vocab = set()
            doc_freq = Counter()
            for doc in tokenized_docs:
                unique_words = set(doc)
                vocab.update(unique_words)
                for w in unique_words:
                    doc_freq[w] += 1
            self.vocabulary_ = {w: i for i, w in enumerate(sorted(vocab))}
            n_docs = len(docs)
            self.idf_ = {w: math.log((1 + n_docs) / (1 + doc_freq[w])) + 1 for w in vocab}
            
            rows = []
            for doc in tokenized_docs:
                tf = Counter(doc)
                row = [0.0] * len(self.vocabulary_)
                for w, cnt in tf.items():
                    if w in self.vocabulary_:
                        row[self.vocabulary_[w]] = cnt * self.idf_.get(w, 1.0)
                norm = math.sqrt(sum(x * x for x in row))
                if norm > 0:
                    row = [x / norm for x in row]
                rows.append(row)
            return rows

        def transform(self, docs):
            rows = []
            for d in docs:
                tokens = self._tokenize(d)
                tf = Counter(tokens)
                row = [0.0] * len(self.vocabulary_)
                for w, cnt in tf.items():
                    if w in self.vocabulary_:
                        row[self.vocabulary_[w]] = cnt * self.idf_.get(w, 1.0)
                norm = math.sqrt(sum(x * x for x in row))
                if norm > 0:
                    row = [x / norm for x in row]
                rows.append(row)
            return rows

    def cosine_similarity(X, Y):
        res = []
        for x in X:
            row = []
            for y in Y:
                dot = sum(a * b for a, b in zip(x, y))
                row.append(dot)
            res.append(row)
        return np.array(res)

from app.config import settings
from app.services.image_matcher import compute_image_embedding, compute_image_similarity
from app.services.semantic_matcher import compute_text_embedding, compute_semantic_similarity

logger = logging.getLogger("khojbeen.matcher")

# Synonyms and term normalizations
SYNONYM_MAP = {
    r"\b(water\s*flask|water\s*bottle|flask|sippers?|thermos|tumblers?|miltons?|bottles?)\b": "bottle",
    r"\b(identity\s*cards?|id\s*cards?|college\s*ids?|student\s*ids?|idcards?|hall\s*tickets?|admit\s*cards?)\b": "id_card",
    r"\b(earbuds?|airpods?|earphones?|headphones?|buds|headsets?)\b": "earphones",
    r"\b(calculators?|scientific\s*calculator|fx[\s\-_]*991[a-z]*|casios?)\b": "calculator",
    r"\b(keychains?|key\s*rings?|keys?|house\s*keys?|bike\s*keys?|scooty\s*keys?|car\s*keys?)\b": "keys",
    r"\b(smartwatches?|smart\s*watch|fitness\s*bands?|bands?|apple\s*watch|noise\s*watch|boat\s*watch)\b": "smartwatch",
    r"\b(hoodies?|jackets?|sweatshirts?|sweaters?|coats?)\b": "hoodie",
    r"\b(umbrellas?|parasols?|raincoats?)\b": "umbrella",
    r"\b(wallets?|purses?|pouches?|clutch)\b": "wallet",
    r"\b(spectacles?|specs?|glasses?|sunglasses?|eyewears?|shades?)\b": "glasses",
    r"\b(notebooks?|registers?|notepads?|diaries?|spiral\s*books?)\b": "notebook",
    r"\b(pendrives?|pen\s*drives?|usbs?|flash\s*drives?)\b": "usb_drive",
    r"\b(chargers?|adapters?|cables?|power\s*banks?|powerbanks?)\b": "charger",
}

LOCATION_ZONES = {
    "Library": "Study Zone",
    "Reading Hall": "Study Zone",
    "Computer Lab": "Academic Zone",
    "Science Block": "Academic Zone",
    "Classroom Block A": "Academic Zone",
    "Classroom Block B": "Academic Zone",
    "Cafeteria": "Central Zone",
    "Admin Block": "Central Zone",
    "Main Auditorium": "Central Zone",
    "Sports Complex": "Recreation Zone",
    "Parking Area": "Recreation Zone",
    "Other": "Other Zone",
}

STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "by", "of",
    "is", "it", "my", "i", "lost", "found", "item", "please", "help", "color", "colour",
    "type", "like", "near", "around", "inside", "outside", "from", "left", "area", "table",
    "hall", "room", "floor", "block", "bench", "desk", "seat", "seats", "study"
}

def clean_text(text: str) -> str:
    """Clean text, normalize synonyms, and remove punctuation while preserving Unicode words."""
    if not text:
        return ""
    text = text.lower()
    
    # Apply synonym map
    for pattern, replacement in SYNONYM_MAP.items():
        text = re.sub(pattern, replacement, text)

    # Remove punctuation and non-alphanumeric characters while preserving all Unicode word characters
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    words = [w for w in text.split() if w not in STOP_WORDS and len(w) >= 1]
    return " ".join(words)

def compute_tfidf_similarity(text1: str, text2: str) -> float:
    """
    Computes text similarity using TF-IDF cosine similarity and token overlap.
    Supports English and Indic/Unicode non-English scripts.
    """
    clean1 = clean_text(text1)
    clean2 = clean_text(text2)

    if not clean1 or not clean2:
        return 0.0

    words1 = clean1.split()
    words2 = clean2.split()
    set1, set2 = set(words1), set(words2)

    intersection = set1 & set2
    if not intersection:
        return 0.0

    overlap = len(intersection) / min(len(set1), len(set2))
    dice = (2.0 * len(intersection)) / (len(set1) + len(set2))

    tfidf_sim = 0.0
    try:
        vectorizer = TfidfVectorizer(token_pattern=r"(?u)\b\w+\b", min_df=1)
        matrix = vectorizer.fit_transform([clean1, clean2])
        tfidf_sim = float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
    except Exception:
        tfidf_sim = dice

    sim = 0.4 * tfidf_sim + 0.6 * overlap
    return float(np.clip(sim, 0.0, 1.0))

# Alias for backwards compatibility
compute_text_similarity = compute_tfidf_similarity

def parse_vector(embedding_field: Any) -> Optional[List[float]]:
    """Helper to deserialize embedding vector from database column."""
    if embedding_field is None:
        return None
    if isinstance(embedding_field, list):
        return embedding_field
    if isinstance(embedding_field, str):
        try:
            parsed = json.loads(embedding_field)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return None

def compute_item_text_score(lost_item: Any, found_item: Any) -> float:
    """
    Computes hybrid text score combining TF-IDF and Multilingual Semantic Embeddings.
    Weights configured via settings: TFIDF_TEXT_WEIGHT (0.4) and SEMANTIC_TEXT_WEIGHT (0.6).
    """
    # 1. TF-IDF title & description score
    title_sim = compute_tfidf_similarity(lost_item.title, found_item.title)
    desc_sim = compute_tfidf_similarity(lost_item.description, found_item.description)
    full_sim = compute_tfidf_similarity(f"{lost_item.title} {lost_item.description}", f"{found_item.title} {found_item.description}")
    tfidf_score = max(0.6 * title_sim + 0.4 * desc_sim, full_sim)

    # 2. Semantic multilingual score
    sem1 = parse_vector(getattr(lost_item, "text_embedding", None))
    sem2 = parse_vector(getattr(found_item, "text_embedding", None))

    if sem1 is None:
        sem1 = compute_text_embedding(f"{lost_item.title} {lost_item.description}")
    if sem2 is None:
        sem2 = compute_text_embedding(f"{found_item.title} {found_item.description}")

    semantic_score = compute_semantic_similarity(sem1, sem2) if (sem1 and sem2) else tfidf_score

    # Blended text score
    combined_text = (settings.TFIDF_TEXT_WEIGHT * tfidf_score) + (settings.SEMANTIC_TEXT_WEIGHT * semantic_score)
    return float(np.clip(combined_text, 0.0, 1.0))

def compute_category_score(cat1: str, cat2: str) -> float:
    """1.0 if identical category, 0.0 otherwise."""
    return 1.0 if cat1.strip().lower() == cat2.strip().lower() else 0.0

def compute_location_score(loc1: str, loc2: str) -> float:
    """1.0 if same location, 0.5 if same zone, 0.0 otherwise."""
    l1 = loc1.strip()
    l2 = loc2.strip()
    if l1.lower() == l2.lower():
        return 1.0
    
    zone1 = LOCATION_ZONES.get(l1, "")
    zone2 = LOCATION_ZONES.get(l2, "")
    if zone1 and zone2 and zone1 != "Other Zone" and zone1 == zone2:
        return 0.5
    
    return 0.0

def compute_date_score(lost_date: datetime.date | datetime.datetime, found_date: datetime.date | datetime.datetime) -> float:
    """
    1.0 if found within 1 day of lost date.
    Linearly decays to 0.0 over 14 days.
    0.0 if found more than 14 days after, or found before lost.
    """
    if isinstance(lost_date, datetime.datetime):
        lost_date = lost_date.date()
    if isinstance(found_date, datetime.datetime):
        found_date = found_date.date()

    delta_days = (found_date - lost_date).days

    if delta_days < 0:
        if delta_days == -1:
            return 0.5
        return 0.0

    if delta_days <= 1:
        return 1.0
    elif delta_days <= 14:
        return max(0.0, 1.0 - (delta_days - 1) / 13.0)
    else:
        return 0.0

def calculate_match(lost_item: Any, found_item: Any) -> Dict[str, Any]:
    """
    Calculates weighted multi-factor match between a lost item and a found item.
    Combines:
    - Text similarity (TF-IDF + Semantic multilingual embeddings)
    - Visual similarity (precomputed image embeddings, Task 8)
    - Category, Location Zone, and Date decay
    """
    text_score = compute_item_text_score(lost_item, found_item)
    cat_score = compute_category_score(lost_item.category, found_item.category)
    loc_score = compute_location_score(lost_item.location, found_item.location)
    date_score = compute_date_score(lost_item.event_date, found_item.event_date)

    # Multi-factor text/metadata composite score (0 - 100)
    meta_composite = 100.0 * (
        0.50 * text_score +
        0.20 * cat_score +
        0.15 * loc_score +
        0.15 * date_score
    )

    # Visual image similarity
    img1 = parse_vector(getattr(lost_item, "image_embedding", None))
    img2 = parse_vector(getattr(found_item, "image_embedding", None))

    # Lazy-compute if image path exists but embedding is missing
    if img1 is None and getattr(lost_item, "image_path", None):
        img1 = compute_image_embedding(lost_item.image_path)
    if img2 is None and getattr(found_item, "image_path", None):
        img2 = compute_image_embedding(found_item.image_path)

    image_sim = compute_image_similarity(img1, img2) if (img1 and img2) else None
    has_image_match = image_sim is not None

    if has_image_match:
        # Weighted combination of text/metadata and image similarity (Task 8)
        # e.g., 0.6 meta_composite + 0.4 (image_sim * 100)
        final_score = (settings.TEXT_WEIGHT * meta_composite) + (settings.IMAGE_WEIGHT * (image_sim * 100.0))
    else:
        final_score = meta_composite

    final_score = round(min(100.0, max(0.0, final_score)), 1)

    if final_score >= 70.0:
        label = "High"
    elif final_score >= 40.0:
        label = "Medium"
    else:
        label = "Low"

    # Generate human-readable "Why matched" summary
    reasons = []
    if has_image_match and image_sim >= 0.6:
        reasons.append(f"Visual photo match ({int(image_sim * 100)}%)")
    
    if text_score >= 0.5:
        reasons.append("Very similar description")
    elif text_score >= 0.2:
        reasons.append("Matching keywords & meaning")
    
    if cat_score == 1.0:
        reasons.append("Same category")
    
    if loc_score == 1.0:
        reasons.append(f"Same spot ({lost_item.location})")
    elif loc_score == 0.5:
        reasons.append("Same campus area")

    if date_score >= 0.8:
        reasons.append("Reported within 24-48 hours")
    elif date_score >= 0.4:
        reasons.append("Reported within a few days")

    why_matched = ", ".join(reasons) if reasons else "Partial general match"

    return {
        "score": final_score,
        "label": label,
        "text_score": round(text_score, 3),
        "image_score": round(image_sim, 3) if image_sim is not None else None,
        "has_image_match": has_image_match,
        "category_score": round(cat_score, 3),
        "location_score": round(loc_score, 3),
        "date_score": round(date_score, 3),
        "why_matched": why_matched
    }

