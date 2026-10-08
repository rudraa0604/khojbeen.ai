import os
import re
from typing import List, Dict, Any, Optional
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

KNOWLEDGE_BASE = [
    {
        "id": "student_dashboard",
        "keywords": "student dashboard how does student dashboard work view my lost items recover item edit profile scan alerts check status",
        "question_en": "How does the Student Dashboard work?",
        "topic": "Student Dashboard",
        "answers": {
            "en": "**Student Dashboard Guide:**\n- **My Lost Items**: View all your reported lost belongings, live status badges (*Open*, *Matched*, *Recovered*), and unique QR Smart Tags with PNG download and sticker print options.\n- **QR Scan Alerts**: Real-time log of every finder who scanned your item's tag with timestamps, location, and message.\n- **AI Matches**: View automated high-similarity matches detected by our machine learning matcher.\n- **1-Click Recovery**: When you get your item back, click **'Mark Recovered'** to resolve the complaint.\n- **Profile**: View and edit your registered mobile number and department.",
            "hi": "**स्टूडेंट डैशबोर्ड की जानकारी:**\n- **सामान की सूची**: आपके द्वारा दर्ज सभी खोए सामान, स्थिति (खुला, मेल मिला, वापस मिला) और डाउनलोड/प्रिंट हेतु QR स्मार्ट टैग।\n- **QR स्कैन अलर्ट**: जब कोई आपका QR टैग स्कैन करता है, तो समय, स्थान और फाइंडर का संदेश यहाँ दिखता है।\n- **AI मिलान**: हमारे सिस्टम द्वारा खोजे गए संभावित मेल देखें।\n- **सामान वापस मिलना (Recovered)**: सामान मिलने पर **'Mark Recovered'** बटन दबाएं।\n- **प्रोफ़ाइल**: अपना मोबाइल नंबर और विभाग अपडेट करें।",
            "hinglish": "Student Dashboard par aap apne reported lost items, unke QR tags, live scan alerts aur AI matches dekh sakte hain. Item wapas milne par 'Mark Recovered' button daba kar status update kar sakte hain."
        },
        "suggestions": [
            "How do I report a lost item & get QR tag?",
            "What happens when someone scans my QR?",
            "How to log in to student dashboard?"
        ]
    },
    {
        "id": "student_login",
        "keywords": "student login log in log-in how to login student account password forgot password sign in portal",
        "question_en": "How do I log in to the Student Portal?",
        "topic": "Student Login",
        "answers": {
            "en": "**Student Login Instructions:**\n1. Click **'Student Login / My Dashboard'** in the left sidebar.\n2. Enter your registered college email and password.\n3. If you don't have an account yet, one is created automatically when you submit a **'Report Lost Item'** complaint!\n4. Click **'Forgot password?'** if you need a password reset link sent to your email.",
            "hi": "**छात्र लॉगिन निर्देश:**\n1. बाएं साइडबार में **'छात्र लॉगिन / डैशबोर्ड'** पर क्लिक करें।\n2. अपना कॉलेज ईमेल और पासवर्ड दर्ज करें।\n3. यदि खाता नहीं है, तो **'खोया सामान दर्ज करें'** फॉर्म भरते ही खाता स्वतः बन जाता है!\n4. पासवर्ड भूलने पर **'Forgot password?'** लिंक का उपयोग करें।",
            "hinglish": "Sidebar me 'Student Login' par jayein aur registered email + password enter karein. Agar account nahi hai toh 'Report Lost Item' form bharte hi account ban jata hai."
        },
        "suggestions": [
            "How does the Student Dashboard work?",
            "How do I report a lost item & get QR tag?"
        ]
    },
    {
        "id": "claim_item_guide",
        "keywords": "claim how to claim a found item verify proof reclaim owner collect belonging proof of ownership दावा क्लेम",
        "question_en": "How do I claim a found item?",
        "topic": "Claiming Belongings",
        "answers": {
            "en": "**To Claim a Found Item:**\n1. Open the item's detail page and click **'Claim This Item'**.\n2. Enter your name, student ID, and contact details.\n3. Provide specific proof of ownership (e.g., serial number, wallpaper description, unique contents, purchase receipt).\n4. Campus coordinators review your claim and notify you to collect the item from the designated desk!",
            "hi": "**मिले सामान पर दावा कैसे करें:**\n1. सामान के विवरण पृष्ठ पर **'सामान पर दावा करें'** पर क्लिक करें।\n2. अपना नाम और आईडी भरें।\n3. स्वामित्व का पुख्ता प्रमाण दें (जैसे सीरियल नंबर, वॉलपेपर, अंदर का सामान)।\n4. समन्वयक सत्यापन के बाद सामान सुपुर्द करेंगे।",
            "hinglish": "Found item ke page par 'Claim This Item' par click karein aur ownership proof (serial number, bill, identification mark) submit karein."
        },
        "suggestions": [
            "Who are Faculty Coordinators?",
            "How does AI matching work?"
        ]
    },
    {
        "id": "unified_lost_and_qr",
        "keywords": "report lost item generate qr smart tag unique code download png sticker student account password registration how do i report a lost item & get qr tag",
        "question_en": "How do I report a lost item and generate a QR Smart Tag?",
        "topic": "Report Lost Item & QR Smart Tag",
        "answers": {
            "en": "**Unified Lost Report & QR Smart Tag:**\n1. Click **'Report Lost Item'** in the left sidebar.\n2. Fill in item details: Title, Category, Campus Location, Date, and Photo (Live Camera or upload).\n3. Enter your Full Name, College Email, Mobile Number, Department, and create a Password (min 8 characters).\n4. On submit, your student account is created, your report is saved, and a unique **QR Smart Tag (`KB-XXXXXXXX`)** is generated instantly!\n5. You can **Download PNG**, **Print Sticker**, or manage it anytime in your **Student Dashboard**.",
            "hi": "**खोया सामान दर्ज करना और स्मार्ट QR टैग:**\n1. बाएं साइडबार में **'खोया सामान दर्ज करें'** पर क्लिक करें।\n2. सामान का विवरण भरें: नाम, श्रेणी, स्थान, तारीख और लाइव फोटो।\n3. नाम, ईमेल, मोबाइल नंबर, विभाग और 8 अक्षरों का पासवर्ड दर्ज करें।\n4. सबमिट करते ही आपका छात्र खाता बन जाएगा और एक अनोखा **स्मार्ट QR टैग (KB-XXXXXXXX)** बन जाएगा!\n5. आप इसे **PNG डाउनलोड** कर सकते हैं, **स्टिकर प्रिंट** कर सकते हैं या अपने **स्टूडेंट डैशबोर्ड** में देख सकते हैं।",
            "hinglish": "Sidebar me 'Report Lost Item' par jayein. Item details aur student password enter karein. Submit karte hi aapka student account aur unique QR Smart Tag (KB-XXXXXXXX) generate ho jayega."
        },
        "suggestions": [
            "How does the Student Dashboard work?",
            "What happens when someone scans my QR?",
            "How does AI matching work?"
        ]
    },
    {
        "id": "qr_scan_notifications",
        "keywords": "what happens when someone scans my qr code notification sms email in app alert finder message privacy safe tag जब कोई मेरा qr कोड स्कैन करेगा स्कैन अलर्ट",
        "question_en": "What happens when someone scans my item's QR code?",
        "topic": "Instant QR Scan Notifications",
        "answers": {
            "en": "**Instant QR Scan Alerts:**\n1. When a finder scans your physical QR Smart Tag, they see a safe portal with only the item name and photo—**your personal phone number and email are completely hidden**.\n2. When the finder taps **'I Found This Item'** and sends their location/message, you receive:\n   - 🔔 **In-App Notification** (Bell badge in the sidebar)\n   - 📧 **Instant Email** with the finder's details and message\n   - 📱 **Instant SMS** alert directly to your registered mobile number!\n3. The scan event is permanently recorded in your **Student Dashboard**.",
            "hi": "**त्वरित QR स्कैन सूचनाएँ:**\n1. जब कोई आपका QR टैग स्कैन करता है, तो उसे केवल सामान का नाम और फोटो दिखता है—**आपका फ़ोन और ईमेल पूरी तरह सुरक्षित और गुप्त रहता है**।\n2. फाइंडर के संदेश भेजते ही आपको प्राप्त होता है:\n   - 🔔 **इन-ऐप नोटिफिकेशन** (घंटी आइकन)\n   - 📧 **ईमेल सूचना** फाइंडर के संदेश के साथ\n   - 📱 **एसएमएस (SMS) अलर्ट** आपके पंजीकृत मोबाइल पर!\n3. यह स्कैन आपके **स्टूडेंट डैशबोर्ड** पर भी तुरंत दर्ज हो जाता है।",
            "hinglish": "Jab koi aapka QR code scan karta hai, aapko In-App Bell notification, Email aur registered mobile number par instant SMS milta hai. Finder ko aapka personal contact nahi dikhta!"
        },
        "suggestions": [
            "How does the Student Dashboard work?",
            "How do I report a lost item & get QR tag?"
        ]
    },
    {
        "id": "qr_download_and_print",
        "keywords": "download qr png print sticker printable smart tag kb unique code",
        "question_en": "How do I download and print my QR Smart Tag sticker?",
        "topic": "Download & Print QR Stickers",
        "answers": {
            "en": "**Downloading & Printing QR Smart Tags:**\n1. Open your **Student Dashboard** or view your report success screen.\n2. Click **'Download PNG'** to save a high-resolution QR image.\n3. Click **'Print Sticker'** to open the ready-to-print campus smart tag layout.\n4. Paste or attach the tag to your bottle, laptop, bag, or keys so finders can scan and notify you safely.",
            "hi": "**QR स्मार्ट टैग डाउनलोड और प्रिंट करना:**\n1. अपने **स्टूडेंट डैशबोर्ड** पर जाएं।\n2. **'PNG डाउनलोड'** पर क्लिक करके हाई-रेजोल्यूशन QR कोड सेव करें।\n3. **'स्टिकर प्रिंट'** दबाकर प्रिंट करने योग्य स्मार्ट टैग खोलें।\n4. इसे अपनी बोतल, लैपटॉप, बैग या चाबी पर लगाएं।",
            "hinglish": "Aap Student Dashboard se apne item ka QR code PNG download kar sakte hain ya 'Print Sticker' par click karke print nikaal sakte hain."
        },
        "suggestions": [
            "What happens when someone scans my QR?",
            "How does the Student Dashboard work?"
        ]
    },
    {
        "id": "how_to_report_found",
        "keywords": "report found item deposit handed over security desk found keys bottle umbrella phone i found something मिला हुआ सामान मुझे कुछ मिला",
        "question_en": "How do I report an item I found on campus?",
        "topic": "Report Found Item",
        "answers": {
            "en": "**To report a found item:**\n1. Click **'I Found Something'** in the left sidebar.\n2. Enter the item name, category, campus location where found, and date.\n3. Note where the item is kept (e.g. Security Desk, Dept Office).\n4. Take a live camera photo or upload an image.\n5. Enter your contact details and submit. Our AI matcher will scan for matching lost complaints automatically!",
            "hi": "**मिला सामान दर्ज करने के लिए:**\n1. बाएं साइडबार में **'मुझे कुछ मिला'** पर क्लिक करें।\n2. सामान का नाम, श्रेणी, स्थान और तारीख भरें।\n3. बताएं कि सामान कहाँ जमा है (सुरक्षा डेस्क, ऑफिस आदि)।\n4. लाइव फोटो खींचें या अपलोड करें और फॉर्म सबमिट करें।",
            "hinglish": "Agar aapko campus me koi item mila hai toh sidebar me 'I Found Something' par click karein, details aur photo upload karke submit karein."
        },
        "suggestions": [
            "How does AI matching work?",
            "How to claim an item?",
            "Who are Faculty Coordinators?"
        ]
    },
    {
        "id": "matching_algorithm_guide",
        "keywords": "how does ai matching work algorithm score tf idf text category location date weights sentence transformer semantic matching मैचिंग सिस्टम",
        "question_en": "How does the AI matching algorithm work?",
        "topic": "Intelligent Matching Engine",
        "answers": {
            "en": "**Multi-Factor AI Matching Engine:**\n- **Text & Multilingual Semantics (50%)**: Uses TF-IDF cosine similarity + Multilingual Dense Semantic Transformers (matching English, Hindi, and Hinglish descriptions).\n- **Category Match (20%)**: High weight for identical categories.\n- **Campus Location & Zones (15%)**: Exact spot gives full score; adjacent zone gives 50%.\n- **Date Proximity (15%)**: Maximum score within 48 hours, decaying over 14 days.\n- Items scoring ≥70% are flagged as **High Match** and trigger automated notifications!",
            "hi": "**AI मैचिंग एल्गोरिदम कैसे काम करता है:**\n- **टेक्स्ट विवरण (50%)**: TF-IDF और बहुभाषी AI एम्बेडिंग (हिंदी, अंग्रेजी और हिंग्लिश)।\n- **श्रेणी (20%)**: समान श्रेणी।\n- **स्थान (15%)**: कैंपस स्थान या ज़ोन।\n- **तारीख (15%)**: खोने/मिलने के समय की निकटता।\n- 70%+ स्कोर पर मालिक को तुरंत स्वचालित सूचना जाती है।",
            "hinglish": "Humara AI matching engine 50% Text similarity (TF-IDF + Hindi/Hinglish embeddings), 20% Category, 15% Location aur 15% Date mila kar calculate karta hai."
        },
        "suggestions": [
            "How to report a lost item & get QR tag?",
            "How to claim an item?",
            "How does the Student Dashboard work?"
        ]
    },
    {
        "id": "sidebar_and_navigation",
        "keywords": "sidebar tabs navigation header search college campus selector dark mode language menu साइडबार",
        "question_en": "How do I navigate the site using the sidebar and header?",
        "topic": "Navigation & Sidebar Layout",
        "answers": {
            "en": "**Layout & Navigation Guide:**\n- **Top Header**: Contains only the Brand Logo, College Campus Selector, and Global Search bar.\n- **Left Sidebar**: Persistent vertical tabs (*Browse & Search*, *I Found Something*, *Report Lost Item*, *Faculty Coordinators*, *FAQ*, *Student Login / Dashboard*, *Admin*).\n- **Sidebar Footer**: Notification bell with live badge, 9-language switcher, dark/light theme toggle, and desktop collapse rail button.",
            "hi": "**नेविगेशन और साइडबार गाइड:**\n- **शीर्ष हेडर**: केवल ब्रांड लोगो, कॉलेज चयनकर्ता और सर्च बार शामिल हैं।\n- **बायां साइडबार**: सभी मुख्य पृष्ठों के टैब (सर्च, मुझे कुछ मिला, खोया सामान, फैकल्टी समन्वयक, FAQ, स्टूडेंट लॉगिन, एडमिन)।\n- **साइडबार नीचे**: नोटिफिकेशन बेल, 9 भाषाओं का चयन, डार्क/लाइट थीम और साइडबार छोटा करने का बटन।",
            "hinglish": "Top header me search aur college selector hai. Baaki saare navigation tabs (Search, Lost, Found, Faculty, FAQ, Student Dashboard, Admin) left sidebar me hain."
        },
        "suggestions": [
            "How to change language or switch to dark mode?",
            "How does the Student Dashboard work?"
        ]
    },
    {
        "id": "language_and_theme_guide",
        "keywords": "how to change language or switch to dark mode urdu hindi switch theme dark mode light mode rtl toggle system डार्क मोड भाषा बदलें थीम",
        "question_en": "How do I change language or switch to dark mode?",
        "topic": "Language & Theme Settings",
        "answers": {
            "en": "**Language & Theme Settings:**\n- **Language**: Click the Globe icon at the bottom of the sidebar to choose from 9 languages (English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, Urdu). Urdu automatically switches to right-to-left (RTL) mode.\n- **Dark/Light Mode**: Click the Sun/Moon/Laptop icon at the bottom of the sidebar to toggle between Light, Dark, and System modes.",
            "hi": "**भाषा और थीम बदलना:**\n- **भाषा**: साइडबार के नीचे ग्लोब आइकन पर क्लिक करके 9 भारतीय भाषाओं में से चुनें।\n- **डार्क/लाइट मोड**: साइडबार के नीचे सूर्य/चांद आइकन दबाकर लाइट, डार्क या सिस्टम थीम चुनें।",
            "hinglish": "Sidebar ke bottom me Globe icon se language (Hindi, English, Urdu RTL, etc.) aur Sun/Moon icon se Light/Dark/System theme change kar sakte hain."
        },
        "suggestions": [
            "How to navigate using sidebar?",
            "How does draggable chatbot work?"
        ]
    },
    {
        "id": "faculty_coordinators_guide",
        "keywords": "who are faculty coordinators department contact phone email office timings supervisor help how to contact faculty समन्वयक फैकल्टी",
        "question_en": "Who are Faculty Coordinators and how do I contact them?",
        "topic": "Faculty Coordinators",
        "answers": {
            "en": "**Faculty Coordinators Tab:**\n1. Click **'Faculty Coordinators'** in the left sidebar.\n2. Filter by department (Computer Science, Mechanical, Library, Sports, Admin).\n3. Search by coordinator name or designation.\n4. Click **'Call Now'** or **'Send Email'** to contact them directly during their office timings.",
            "hi": "**फैकल्टी समन्वयक से संपर्क:**\n1. साइडबार में **'फैकल्टी समन्वयक'** टैब पर जाएं।\n2. विभाग चुनें (कंप्यूटर साइंस, लाइब्रेरी आदि)।\n3. नाम से खोजें और सीधे कॉल या ईमेल करें।",
            "hinglish": "Sidebar me 'Faculty Coordinators' tab par jayein aur apne department ke coordinator ko direct call ya email karein."
        },
        "suggestions": [
            "How to claim an item?",
            "How do I report a lost item & get QR tag?"
        ]
    },
    {
        "id": "live_camera_guide",
        "keywords": "how does live camera capture work watermark date time photo upload permissions take live photo लाइव कैमरा फोटो",
        "question_en": "How does live camera capture and timestamp work?",
        "topic": "Live Camera Capture",
        "answers": {
            "en": "**Live Camera Feature:**\n- Click **'Live Photo'** on the Report Lost or Report Found form.\n- Allow camera access when prompted.\n- Tap **'Capture Photo'**—the system automatically stamps a verified date and timestamp in the corner.\n- Click **'Use Photo'** to attach it directly to your report.",
            "hi": "**लाइव कैमरा फीचर:**\n- फॉर्म पर **'लाइव फोटो'** पर क्लिक करें।\n- कैमरा अनुमति स्वीकार करें।\n- **'फोटो खींचें'** दबाएं—फोटो पर तारीख और समय स्वतः अंकित हो जाएगा।\n- **'फोटो का उपयोग करें'** दबाकर रिपोर्ट में जोड़ें।",
            "hinglish": "Report form me 'Live Photo' button par click karein. Photo capture karte hi automatic date-time stamp lag jayega."
        },
        "suggestions": [
            "How do I report a lost item & get QR tag?",
            "How does AI matching work?"
        ]
    },
    {
        "id": "draggable_chatbot_guide",
        "keywords": "how does draggable chatbot work mic voice typing reset position language selector speech recognition चैटबॉट",
        "question_en": "How do I use the draggable circular chatbot and voice typing?",
        "topic": "Draggable AI Chatbot",
        "answers": {
            "en": "**Draggable AI Chatbot Features:**\n- **Draggable Button**: Press and drag the circular bot button anywhere on your screen. When released, it smoothly snaps to the nearest screen edge and remembers its position!\n- **Voice Typing**: Click the **Microphone icon** inside the chat box to speak your question.\n- **Multilingual Support**: Select your preferred language from the dropdown (or leave it on Auto-detect) and ask in Hindi, Hinglish, Bengali, Tamil, etc.",
            "hi": "**ड्रैग करने योग्य AI चैटबॉट:**\n- **ड्रैग बटन**: गोल चैटबॉट बटन को स्क्रीन पर कहीं भी खींचकर छोड़ें, यह किनारे पर चिपक जाएगा और अपनी स्थिति याद रखेगा!\n- **वॉइस टाइपिंग**: चैट बॉक्स में **माइक आइकन** दबाकर बोलकर सवाल पूछें।\n- **बहुभाषी**: आप हिंदी, हिंग्लिश, अंग्रेजी या किसी भी भारतीय भाषा में बात कर सकते हैं।",
            "hinglish": "Aap circular chatbot button ko screen par kahin bhi drag kar sakte hain. Chat ke andar Mic button se bol kar question pooch sakte hain."
        },
        "suggestions": [
            "How does the Student Dashboard work?",
            "How to change language or switch to dark mode?"
        ]
    },
    {
        "id": "multi_campus_guide",
        "keywords": "how does multi campus selector work college dropdown jagran main city jim कॉलेज कैंपस",
        "question_en": "How does the multi-campus college selector work?",
        "topic": "Multi-Campus Portal",
        "answers": {
            "en": "**Multi-Campus Selector:**\n- Use the **College / Campus Dropdown** in the top header to filter listings by your specific campus (e.g. *Jagran Main Campus*, *Jagran City Campus*, *Jagran Institute of Management*).\n- You can also choose **'All Campuses'** to search across all locations simultaneously.",
            "hi": "**मल्टी-कैंपस चयनकर्ता:**\n- टॉप हेडर में **कॉलेज/कैंपस ड्रॉपडाउन** से अपने कॉलेज का चयन करें।\n- सभी कैंपस में एक साथ खोजने के लिए **'All Campuses'** चुनें।",
            "hinglish": "Top header me Campus dropdown se aap apna college select kar sakte hain ya 'All Campuses' choose karke sabhi jagah search kar sakte hain."
        },
        "suggestions": [
            "How to navigate using sidebar?",
            "How does AI matching work?"
        ]
    },
    {
        "id": "tag_my_item_guide",
        "keywords": "tag my item pre register belongings before losing safe status qr sticker sheet 6 stickers mark as lost one click student dashboard pre-tagging tag item",
        "question_en": "How does 'Tag My Item' work to protect belongings before losing them?",
        "topic": "Tag My Item & QR Stickers",
        "answers": {
            "en": "**Tag My Item (Pre-loss Protection):**\n1. Go to **Student Dashboard** and open the **'My Tagged Items'** tab.\n2. Click **'Tag New Item'** and enter details (name, category, brand, color, photo, and optional note for finder).\n3. Each student can tag up to 20 belongings with status set to **'Safe'**.\n4. Instantly get a unique **KB-XXXXXXXX QR sticker** with options to **Download PNG**, **Print Single Sticker**, or **Print Sheet of 6 Stickers**.\n5. If an item is ever lost, 1-click **'Mark as Lost'** turns it into an active Lost report using the **same QR code** and immediately runs AI matching!",
            "hi": "**सामान पहले से टैग करें (Tag My Item):**\n1. **स्टूडेंट डैशबोर्ड** में **'टैग किए गए सामान'** टैब पर जाएं।\n2. **'नया सामान टैग करें'** पर क्लिक करें और विवरण (नाम, ब्रांड, रंग, फोटो, नोट) भरें।\n3. प्रत्येक छात्र अधिकतम 20 सामान सुरक्षित (Safe) स्थिति में टैग कर सकता है।\n4. तुरंत **KB-XXXXXXXX QR स्टिकर** पाएं, **PNG डाउनलोड** करें या **6 स्टिकर्स की शीट** प्रिंट करें।\n5. खो जाने पर **'Mark as Lost'** बटन दबाते ही यह उसी QR कोड के साथ एक्टिव रिपोर्ट में बदल जाता है!",
            "hinglish": "Student Dashboard me 'My Tagged Items' tab me jakar aap apne belongings ko pehle se register kar sakte hain (status: Safe). Aapko 6-sticker print sheet milti hai aur item khone par 1 click me 'Mark as Lost' kar sakte hain."
        },
        "suggestions": [
            "How does the QR Scanner tab work?",
            "What happens when someone scans my QR?",
            "How does the Student Dashboard work?"
        ]
    },
    {
        "id": "qr_scanner_tab_guide",
        "keywords": "qr scanner tab live camera gallery upload scan qr sidebar enter code manually decode flashlight front back switch barcode scan",
        "question_en": "How do I use the QR Scanner tab on khojbeen.ai?",
        "topic": "QR Scanner Tab",
        "answers": {
            "en": "**QR Scanner Tab Guide:**\n- **Access**: Click the **'Scan QR'** tab in the left sidebar or visit `/scan` (no login needed!).\n- **Scan with Camera**: Opens your camera with an active laser frame, switch front/back camera, and torch/flashlight toggle.\n- **Upload from Gallery / Clipboard**: Drag & drop or paste an image containing a QR code to decode instantly.\n- **Manual Fallback**: Type any `KB-XXXXXXXX` code directly to open the item scan page.\n- **Validation**: Automatically validates authentic Khojbeen codes and opens the safe owner notification page.",
            "hi": "**QR स्कैनर टैब का उपयोग:**\n- **पहुंच**: बाएं साइडबार में **'QR स्कैन करें'** टैब पर क्लिक करें या `/scan` पर जाएं।\n- **लाइव कैमरा**: लेजर फ्रेम, फ्रंट/बैक कैमरा स्विच और टॉर्च सुविधा के साथ स्कैन करें।\n- **गैलरी / पेस्ट अपलोड**: QR कोड वाली फोटो को खींचें, चुनें या क्लिपबोर्ड से पेस्ट करें।\n- **मैनुअल कोड**: किसी भी `KB-XXXXXXXX` कोड को सीधे टाइप करें।",
            "hinglish": "Sidebar me 'Scan QR' tab par jayein. Aap live camera, gallery image upload, clipboard paste ya manual KB- code enter karke kisi bhi Khojbeen QR ko scan kar sakte hain."
        },
        "suggestions": [
            "How does 'Tag My Item' work?",
            "What happens when someone scans my QR?",
            "How does the Student Dashboard work?"
        ]
    },
    {
        "id": "faq_portal_guide",
        "keywords": "faq portal questions answers help categories search faq प्रश्न उत्तर",
        "question_en": "Where can I find frequently asked questions?",
        "topic": "FAQ Portal",
        "answers": {
            "en": "**Comprehensive FAQ Portal:**\n- Click **'FAQ'** in the left sidebar to access categorized questions and answers covering reports, claims, Tag My Item, QR scanner, AI matching, camera timestamps, and privacy.",
            "hi": "**विस्तृत FAQ पोर्टल:**\n- साइडबार में **'FAQ'** पर क्लिक करके सभी प्रश्नों के उत्तर प्राप्त करें।",
            "hinglish": "Sidebar me 'FAQ' par click karke aap common questions ke detailed answers dekh sakte hain."
        },
        "suggestions": [
            "Who are Faculty Coordinators?",
            "How does the Student Dashboard work?"
        ]
    },
    {
        "id": "admin_match_verification",
        "keywords": "how does admin verify match approve claim review match breakdown why matched side by side comparison handover code reject proof एडमिन मिलान सत्यापन कैसे करता है",
        "question_en": "How does the admin verify a match?",
        "topic": "Admin Match Verification",
        "answers": {
            "en": "**Admin Match Review & Verification Guide:**\n- **Side-by-Side Comparison**: Admins inspect Lost vs Found reports side by side.\n- **Circular Score & Verdict**: Strong (80%+), Possible (50-79%), Weak (<50%).\n- **Score Breakdown**: Semantic text, image similarity, and attribute & proximity scores.\n- **Why Matched Chips**: Highlights matching attributes (color, brand, location) and penalties for mismatches.\n- **Claim Proof & Secret Question**: Verifies claimant proof, receipt images, and secret question answers.\n- **Decision Actions**: **Approve (Release 4-digit Handover Code)**, **Reject with reason**, or **Ask for More Proof**.",
            "hi": "**व्यवस्थापक द्वारा मिलान सत्यापन:**\n- खोई और मिली वस्तुओं की तुलना साइड-बाय-साइड की जाती है।\n- स्कोर ब्रेकडाउन: पाठ समानता, दृश्य समानता, विशेषताएँ और निकटता।\n- अनुमोदन पर 4-अंकों का हैंडओवर कोड जारी किया जाता है।",
            "hinglish": "Admin side-by-side Lost aur Found report compare karta hai, semantic score, visual similarity aur secret answer verify karke handover code approve karta hai."
        },
        "suggestions": [
            "What is the AI Matches list on admin dashboard?",
            "What happens when someone scans my QR?",
            "How does the Student Dashboard work?"
        ]
    },
    {
        "id": "admin_matches_tab",
        "keywords": "admin matches tab matches list who matched with whom counterpart item pair row review match एडमिन मैच टैब",
        "question_en": "What is the Matches tab on the College Admin dashboard?",
        "topic": "Admin Matches Tab",
        "answers": {
            "en": "**Admin AI Matches Tab:**\n- Displays all detected lost-and-found pairs for the college with photos, score badges, verdicts, and review buttons.\n- Direct navigation to side-by-side Match Review screen.\n- Multi-tenant campus scoped for full privacy.",
            "hi": "**एडमिन एआई मिलान टैब:**\n- कॉलेज के सभी जोड़े (खोई व मिली वस्तुएं) फोटो, स्कोर और स्थिति के साथ दिखाता है।",
            "hinglish": "Admin dashboard ke Matches tab me har Lost item ko uske Found counterpart ke sath pair row me score aur review button ke sath dekha ja sakta hai."
        },
        "suggestions": [
            "How does the admin verify a match?",
            "How does 'Tag My Item' work?"
        ]
    },
    {
        "id": "finder_qr_options",
        "keywords": "i found someone item what should i do scan qr tag finder options message owner faculty coordinator share details मुझे किसी का सामान मिला क्या करूँ",
        "question_en": "I found someone's item, what should I do?",
        "topic": "Found Item QR Options",
        "answers": {
            "en": "**Finder QR Scan Options:**\nWhen you scan a Khojbeen QR smart tag on a found item, you get 3 privacy-safe choices:\n1. **Message Owner (Anonymous)**: Send a quick message, location, or photo without revealing your identity.\n2. **Hand to Faculty Coordinator / Desk**: Choose a campus coordinator or lost & found desk to deposit the item.\n3. **Share Details with Verification**: Share your name and contact, which is released to the owner only AFTER the college admin approves their claim.",
            "hi": "**क्यूआर स्कैन करने पर फाइंडर के विकल्प:**\n1. **मालिक को अनाम संदेश भेजें**।\n2. **संकाय समन्वयक / हेल्पडेस्क को सौंपें**।\n3. **सत्यापन के बाद संपर्क साझा करें** (केवल व्यवस्थापक अनुमोदन के बाद)।",
            "hinglish": "QR tag scan karne par aap 3 safe options chuniye: (A) Anonymous message bhejein, (B) Faculty Coordinator ya desk ko de dein, ya (C) Verification ke baad contact share karein."
        },
        "suggestions": [
            "How do I use the QR Scanner tab?",
            "How does 'Tag My Item' work?"
        ]
    }
]

# Pre-vectorize knowledge base
_documents = []
for entry in KNOWLEDGE_BASE:
    doc = f"{entry['keywords']} {entry['question_en']} {entry['answers']['en']} {entry['answers'].get('hinglish', '')} {entry['answers'].get('hi', '')}"
    _documents.append(doc)

_vectorizer = TfidfVectorizer(token_pattern=r"(?u)\b\w+\b", min_df=1)
_tfidf_matrix = _vectorizer.fit_transform(_documents)


def detect_language(text: str) -> str:
    if not text:
        return "en"

    # Script checks
    if re.search(r"[\u0600-\u06FF]", text):
        return "ur"
    if re.search(r"[\u0980-\u09FF]", text):
        return "bn"
    if re.search(r"[\u0B80-\u0BFF]", text):
        return "ta"
    if re.search(r"[\u0C00-\u0C7F]", text):
        return "te"
    if re.search(r"[\u0A80-\u0AFF]", text):
        return "gu"
    if re.search(r"[\u0A00-\u0A7F]", text):
        return "pa"
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"

    # Hinglish detection heuristic
    hinglish_words = [
        "mera", "meri", "mere", "kaha", "kho", "gaya", "gayi", "mila", "milega", 
        "kaise", "kya", "hai", "batao", "saman", "karna", "dashboard", "bhai", 
        "hoga", "kare", "karen", "kaise", "karte", "hain", "tag", "qr", "on"
    ]
    lower_tokens = re.findall(r"\b\w+\b", text.lower())
    hinglish_matches = sum(1 for token in lower_tokens if token in hinglish_words)
    if hinglish_matches >= 1:
        return "hinglish"

    return "en"


def find_best_answer(query: str, language: str = "auto") -> Dict[str, Any]:
    clean_query = query.strip()
    if not clean_query:
        return {
            "reply": "Hello! Ask me about reporting lost items, generating QR smart tags, student dashboard, or faculty coordinators.",
            "matched_topic": None,
            "confidence": 0.0,
            "suggestions": [
                "How do I report a lost item & get QR tag?",
                "How does the Student Dashboard work?",
                "What happens when someone scans my QR?"
            ]
        }

    if not language or language == "auto":
        detected_lang = detect_language(clean_query)
    else:
        detected_lang = language.lower()

    if detected_lang not in ["en", "hi", "hinglish", "bn", "ta", "te", "mr", "gu", "pa", "ur"]:
        detected_lang = "en"

    try:
        query_vec = _vectorizer.transform([clean_query])
        similarities = cosine_similarity(query_vec, _tfidf_matrix)[0]
        best_idx = int(np.argmax(similarities))
        confidence = float(similarities[best_idx])

        # Exact and synonym intent matching
        q_lower = clean_query.lower()
        
        # Map KB entries by ID for robust priority lookup
        id_to_idx = {entry["id"]: idx for idx, entry in enumerate(KNOWLEDGE_BASE)}
        
        # Priority rules
        if "login" in q_lower or "log in" in q_lower or "लॉगिन" in q_lower or "password" in q_lower or "forgot" in q_lower or "student portal" in q_lower:
            best_idx = id_to_idx.get("student_login", best_idx)
            confidence = max(confidence, 0.95)
        elif "verify a match" in q_lower or "admin verify" in q_lower or "handover code" in q_lower or "match review" in q_lower or "सत्यापन" in q_lower:
            best_idx = id_to_idx.get("admin_match_verification", best_idx)
            confidence = max(confidence, 0.95)
        elif "matches tab" in q_lower or "who matched with whom" in q_lower or "matches list" in q_lower or "मैच टैब" in q_lower:
            best_idx = id_to_idx.get("admin_matches_tab", best_idx)
            confidence = max(confidence, 0.95)
        elif "found someone" in q_lower or "what should i do" in q_lower or "finder option" in q_lower or "किसी का सामान मिला" in q_lower:
            best_idx = id_to_idx.get("finder_qr_options", best_idx)
            confidence = max(confidence, 0.95)
        elif "student dashboard" in q_lower or "डैशबोर्ड" in q_lower or "recover" in q_lower:
            best_idx = id_to_idx.get("student_dashboard", best_idx)
            confidence = max(confidence, 0.95)
        elif "claim" in q_lower or "proof" in q_lower or "दावा" in q_lower or "क्लेम" in q_lower:
            best_idx = id_to_idx.get("claim_item_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "tag my item" in q_lower or "tagged item" in q_lower or "pre-tag" in q_lower or "टैग किए गए" in q_lower or "सामान पहले से टैग" in q_lower or "tag item" in q_lower:
            best_idx = id_to_idx.get("tag_my_item_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "someone scans" in q_lower or "scans my" in q_lower or "scan alert" in q_lower or "स्कैन अलर्ट" in q_lower or "स्कैन करेगा" in q_lower or "scan karega" in q_lower or "sms" in q_lower or "notification" in q_lower:
            best_idx = id_to_idx.get("qr_scan_notifications", best_idx)
            confidence = max(confidence, 0.95)
        elif "scan qr" in q_lower or "qr scanner" in q_lower or "scanner tab" in q_lower or "scan with camera" in q_lower or "qr स्कैनर" in q_lower or "स्कैनर" in q_lower or "qr कोड कैसे स्कैन" in q_lower or "स्कैन कैसे करें" in q_lower or "/scan" in q_lower:
            best_idx = id_to_idx.get("qr_scanner_tab_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "sticker" in q_lower or "print" in q_lower or "png" in q_lower or "डाउनलोड" in q_lower or "प्रिंट" in q_lower:
            best_idx = id_to_idx.get("qr_download_and_print", best_idx)
            confidence = max(confidence, 0.95)
        elif "lost" in q_lower or "kho gaya" in q_lower or "khoya" in q_lower or "खोया" in q_lower or "report lost" in q_lower or "get qr tag" in q_lower:
            best_idx = id_to_idx.get("unified_lost_and_qr", best_idx)
            confidence = max(confidence, 0.95)
        elif "found" in q_lower or "mila" in q_lower or "मिला" in q_lower or "something" in q_lower:
            best_idx = id_to_idx.get("how_to_report_found", best_idx)
            confidence = max(confidence, 0.95)
        elif "match" in q_lower or "algorithm" in q_lower or "score" in q_lower or "मैच" in q_lower or "मैचिंग" in q_lower:
            best_idx = id_to_idx.get("matching_algorithm_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "sidebar" in q_lower or "tabs in" in q_lower or "साइडबार" in q_lower or "navigat" in q_lower:
            best_idx = id_to_idx.get("sidebar_and_navigation", best_idx)
            confidence = max(confidence, 0.95)
        elif "language" in q_lower or "dark" in q_lower or "light mode" in q_lower or "theme" in q_lower or "urdu" in q_lower or "थीम" in q_lower or "भाषा" in q_lower or "डार्क" in q_lower:
            best_idx = id_to_idx.get("language_and_theme_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "faculty" in q_lower or "coordinator" in q_lower or "समन्वयक" in q_lower or "teacher" in q_lower or "फैकल्टी" in q_lower or "फ़ैकल्टी" in q_lower or "कोऑर्डिनेटर" in q_lower:
            best_idx = id_to_idx.get("faculty_coordinators_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "camera" in q_lower or "watermark" in q_lower or "फोटो" in q_lower or "कैमरा" in q_lower:
            best_idx = id_to_idx.get("live_camera_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "drag" in q_lower or "mic" in q_lower or "voice" in q_lower or "चैटबॉट" in q_lower or "chatbot" in q_lower:
            best_idx = id_to_idx.get("draggable_chatbot_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "campus" in q_lower or "college" in q_lower or "कैंपस" in q_lower or "कॉलेज" in q_lower:
            best_idx = id_to_idx.get("multi_campus_guide", best_idx)
            confidence = max(confidence, 0.95)
        elif "faq" in q_lower or "question" in q_lower or "प्रश्न" in q_lower:
            best_idx = id_to_idx.get("faq_portal_guide", best_idx)
            confidence = max(confidence, 0.95)

        if confidence > 0.05:
            matched_entry = KNOWLEDGE_BASE[best_idx]
            reply_text = matched_entry["answers"].get(detected_lang) or matched_entry["answers"].get("hinglish") or matched_entry["answers"].get("en")
            return {
                "reply": reply_text,
                "matched_topic": matched_entry["topic"],
                "confidence": round(confidence, 3),
                "detected_language": detected_lang,
                "suggestions": matched_entry.get("suggestions", [])
            }
        else:
            fallbacks = {
                "en": "I couldn't find an exact match for that question. Here are the closest helpful topics you can explore:",
                "hi": "मुझे इस सवाल का सटीक उत्तर नहीं मिला। आप नीचे दिए गए विषयों में से चुन सकते हैं:",
                "hinglish": "Mujhe iska exact match nahi mila. Aap in topics ko check kar sakte hain:"
            }
            return {
                "reply": fallbacks.get(detected_lang, fallbacks["en"]),
                "matched_topic": None,
                "confidence": 0.0,
                "detected_language": detected_lang,
                "suggestions": [
                    "How does the Student Dashboard work?",
                    "How do I report a lost item & get QR tag?",
                    "What happens when someone scans my QR?",
                    "Who are Faculty Coordinators?"
                ]
            }
    except Exception:
        return {
            "reply": "I am here to help you navigate khojbeen.ai. Ask me about reporting lost items, QR smart tags, student dashboard, or faculty coordinators!",
            "matched_topic": None,
            "confidence": 0.0,
            "detected_language": "en",
            "suggestions": [
                "How do I report a lost item & get QR tag?",
                "How does the Student Dashboard work?"
            ]
        }
