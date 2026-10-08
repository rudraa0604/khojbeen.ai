import sys
import os

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from app.services.chatbot import find_best_answer, KNOWLEDGE_BASE

test_queries = [
    # English questions
    "How does Student Dashboard work?",
    "How do I report a lost item & get QR tag?",
    "What happens when someone scans my QR?",
    "How to download and print my QR Smart Tag sticker?",
    "How do I log in to the Student Portal?",
    "How do I report an item I found on campus?",
    "How does the AI matching algorithm work?",
    "How do I navigate the site using the sidebar and header?",
    "How do I change language or switch to dark mode?",
    "Who are Faculty Coordinators and how do I contact them?",
    "How do I claim a found item?",
    "How does live camera capture and timestamp work?",
    "How do I use the draggable circular chatbot?",
    "How does the multi-campus college selector work?",
    "Where can I find frequently asked questions?",
    "How does Tag My Item work to protect belongings before losing them?",
    "How do I use the QR Scanner tab on khojbeen.ai?",
    "How does the admin verify a match?",
    "What is the AI Matches list on the admin dashboard?",
    "I found someone's item with a QR tag, what should I do?",

    # Hindi questions
    "स्टूडेंट डैशबोर्ड कैसे काम करता है?",
    "खोया सामान कैसे दर्ज करें और QR टैग कैसे मिलेगा?",
    "जब कोई मेरा QR कोड स्कैन करेगा तो क्या होगा?",
    "मिला हुआ सामान कैसे दर्ज करें?",
    "AI मैचिंग सिस्टम कैसे काम करता है?",
    "फैकल्टी समन्वयक से संपर्क कैसे करें?",
    "मिले सामान पर दावा कैसे करें?",
    "डार्क मोड या भाषा कैसे बदलें?",
    "लाइव कैमरा से फोटो कैसे खींचें?",
    "सामान पहले से टैग कैसे करें?",
    "वेबसाइट से QR कोड कैसे स्कैन करें?",

    # Hinglish questions
    "Student dashboard kaise chalate hain?",
    "Mera bag kho gaya hai report kaise karun?",
    "Agar koi mera QR scan karega toh mujhe SMS aayega kya?",
    "Campus me mila hua phone kaise submit karein?",
    "Matching score kaise calculate hota hai?",
    "Dark mode kaise on karein?",
    "Tag my item feature kaise use karein?",
    "QR scanner tab se gallery photo kaise scan karein?",
]

print(f"Testing {len(test_queries)} queries against Chatbot Knowledge Base...\n")
failed_count = 0

for idx, query in enumerate(test_queries, 1):
    res = find_best_answer(query)
    topic = res.get("matched_topic")
    conf = res.get("confidence", 0)
    lang = res.get("detected_language")
    
    if not topic or conf < 0.5:
        print(f"[FAIL] [{idx}] '{query}' -> No topic matched! (Conf: {conf})")
        failed_count += 1
    else:
        print(f"[PASS] [{idx}] '{query}' -> [{topic}] (Conf: {conf}, Lang: {lang})")

print(f"\n==================================================")
if failed_count == 0:
    print(f"SUCCESS: ALL {len(test_queries)} QUESTIONS PASSED WITH ZERO FALLBACKS!")
else:
    print(f"WARNING: {failed_count} questions failed!")
print(f"==================================================")
