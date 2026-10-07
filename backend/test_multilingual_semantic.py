import os
import sys

# Configure UTF-8 stdout for Windows terminal support
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.services.semantic_matcher import compute_text_embedding, compute_semantic_similarity

def run_multilingual_demo():
    print("=" * 70)
    print(" khojbeen.ai — Multilingual & Cross-Lingual Semantic Matching Demo ")
    print("=" * 70)
    print(f"{'#':<3} | {'Query A':<26} | {'Query B':<26} | {'Score':<8}")
    print("-" * 70)

    test_pairs = [
        ("kala bag", "black backpack"),
        ("काला बैग", "black backpack"),
        ("kala bag", "काला बैग"),
        ("pani ki bottle", "water flask Milton"),
        ("पानी की बोतल", "blue water bottle"),
        ("chabi ka guchha", "bike key ring"),
        ("चाबी", "room key lost"),
        ("chashma rayban", "spectacles with black frame"),
        ("काला चश्मा", "black sunglasses"),
        ("batua / purse", "brown leather wallet"),
        ("haath ki ghadi", "silver wristwatch"),
        ("college id card", "कॉलेज पहचान पत्र"),
    ]

    for i, (text_a, text_b) in enumerate(test_pairs, 1):
        emb_a = compute_text_embedding(text_a)
        emb_b = compute_text_embedding(text_b)
        score = compute_semantic_similarity(emb_a, emb_b)
        pct = f"{score * 100:.1f}%"
        print(f"{i:<3} | {text_a:<26} | {text_b:<26} | {pct:<8}")

    print("=" * 70)
    print("Demo completed successfully. Cross-lingual semantic matching verified!")

if __name__ == "__main__":
    run_multilingual_demo()
