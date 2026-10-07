import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.chatbot import find_best_answer, KNOWLEDGE_BASE

test_queries = [
    # English (15 queries)
    ("How does Student Dashboard work?", "Student Dashboard"),
    ("How do I log in to student dashboard?", "Student Login"),
    ("How to report a lost item and get QR tag?", "Report Lost Item & QR Smart Tag"),
    ("What happens when someone scans my QR code?", "Instant QR Scan Notifications"),
    ("How do I download and print my QR Smart Tag?", "Download & Print QR Stickers"),
    ("How do I claim a found item?", "Claiming Belongings"),
    ("How do I report an item I found on campus?", "Report Found Item"),
    ("How does AI matching and image matching work?", "Intelligent Matching Engine"),
    ("How to switch theme to dark mode or light mode?", "Language & Theme Settings"),
    ("How to switch language to Hindi or Urdu?", "Language & Theme Settings"),
    ("Who are Faculty Coordinators?", "Faculty Coordinators"),
    ("How to take photo with live camera?", "Live Camera Capture"),
    ("Can I drag the chatbot bubble around?", "Draggable AI Chatbot"),
    ("How do I filter items by campus location?", "Multi-Campus Portal"),
    ("What are the tabs in the left sidebar?", "Navigation & Sidebar Layout"),
    ("How does Tag My Item work to protect belongings?", "Tag My Item & QR Stickers"),
    ("How do I scan a QR code using the website scanner tab?", "QR Scanner Tab"),
    
    # Hindi (9 queries)
    ("स्टूडेंट डैशबोर्ड कैसे काम करता है?", "Student Dashboard"),
    ("छात्र लॉगिन कैसे करें?", "Student Login"),
    ("खोया सामान दर्ज कैसे करें और QR कोड पाएं?", "Report Lost Item & QR Smart Tag"),
    ("जब कोई मेरा QR स्कैन करेगा तो क्या होगा?", "Instant QR Scan Notifications"),
    ("सामान पर दावा (Claim) कैसे करें?", "Claiming Belongings"),
    ("डार्क मोड और थीम कैसे बदलें?", "Language & Theme Settings"),
    ("फ़ैकल्टी कोऑर्डिनेटर कौन हैं?", "Faculty Coordinators"),
    ("सामान पहले से टैग कैसे करें?", "Tag My Item & QR Stickers"),
    ("वेबसाइट से QR स्कैन कैसे करें?", "QR Scanner Tab"),
    
    # Hinglish (8 queries)
    ("student dashboard kaise use kare?", "Student Dashboard"),
    ("student portal me login kaise kare?", "Student Login"),
    ("qr code scan alert kaise aate hai?", "Instant QR Scan Notifications"),
    ("dark mode ya light mode kaise on kare?", "Language & Theme Settings"),
    ("urdu ya hindi language kaise select kare?", "Language & Theme Settings"),
    ("live camera se photo kaise kheenche?", "Live Camera Capture"),
    ("tag my item feature kaise use kare?", "Tag My Item & QR Stickers"),
    ("qr scanner tab se image scan kaise kare?", "QR Scanner Tab"),
]

def test_kb_queries():
    print(f"--- Running {len(test_queries)} KB Test Questions ---")
    failures = 0
    for query, expected_topic in test_queries:
        res = find_best_answer(query, language="auto")
        matched_topic = res.get("matched_topic")
        confidence = res.get("confidence", 0)
        if matched_topic != expected_topic:
            print(f"[FAIL] Query: '{query}' -> Expected: '{expected_topic}', Got: '{matched_topic}' (conf: {confidence})")
            failures += 1
        else:
            print(f"[PASS] Query: '{query}' -> {matched_topic} (conf: {confidence})")
            
    print(f"\nTotal: {len(test_queries)}, Passed: {len(test_queries) - failures}, Failed: {failures}")
    assert failures == 0, f"{failures} queries failed KB match!"

if __name__ == "__main__":
    test_kb_queries()
