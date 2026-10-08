export const FAQ_CATEGORIES = [
  'All Topics',
  'Getting Started',
  'Tag My Item & QR Scanner',
  'Lost Complaints',
  'Found Reports',
  'Photos & Live Camera',
  'Matching & Notifications',
  'Account & Login',
  'Language',
  'Faculty Coordinators',
  'Privacy & Safety'
];

export const FAQS_DATA = [
  // 1. Getting Started
  {
    id: 1,
    category: 'Getting Started',
    question: 'What is khojbeen.ai and how does it help our campus?',
    answer: 'khojbeen.ai is an intelligent, automated Lost and Found portal dedicated to reuniting students, professors, and campus staff with their lost belongings quickly and transparently using advanced semantic matching and location-aware heuristics.',
  },
  {
    id: 2,
    category: 'Getting Started',
    question: 'Is khojbeen.ai completely free to use for students and faculty?',
    answer: 'Yes, 100% free! Anyone on campus can report lost items, register found items, search listings, browse coordinators, and track claim status with zero fees.',
  },
  {
    id: 101,
    category: 'Tag My Item & QR Scanner',
    question: 'What is "Tag My Item" and how does pre-tagging work?',
    answer: 'Tag My Item lets logged-in students pre-register up to 20 personal belongings (like laptops, water bottles, keys, and bags) before anything gets lost. The item is saved with status "Safe" and given a unique KB-XXXXXXXX QR sticker.',
  },
  {
    id: 102,
    category: 'Tag My Item & QR Scanner',
    question: 'How do I print a sheet of QR stickers for my tagged item?',
    answer: 'In the Student Dashboard, click "View QR" on any tagged item. You can click "Print Sheet (6 Stickers)" to generate a waterproof printable sticker sheet ready for cutting and sticking onto your items.',
  },
  {
    id: 103,
    category: 'Tag My Item & QR Scanner',
    question: 'What happens if my tagged item actually gets lost?',
    answer: 'Simply click "Mark as Lost" on that item in your Student Dashboard. It instantly transforms into an active Lost Complaint using the SAME QR code, runs AI matching, and alerts you if any matches exist.',
  },
  {
    id: 104,
    category: 'Tag My Item & QR Scanner',
    question: 'How do I use the website QR Scanner tab to scan codes?',
    answer: 'Click "Scan QR" in the left sidebar or visit /scan. You can scan live using your device camera (with flashlight and front/back toggle), upload/drag an image or paste from clipboard, or enter a KB- code manually.',
  },
  {
    id: 3,
    category: 'Getting Started',
    question: 'How quickly does the system match a lost item with a found report?',
    answer: 'Instantly! The moment an item is submitted, our multi-factor TF-IDF algorithm calculates match scores against all existing campus listings within milliseconds.',
  },
  {
    id: 4,
    category: 'Getting Started',
    question: 'What should I do first if I just lost something on campus?',
    answer: 'First, check the Browse & Search tab to see if someone already turned it in. If not found, immediately submit a Lost Report with specific details so future found items match automatically.',
  },

  // 2. Lost Complaints
  {
    id: 5,
    category: 'Lost Complaints',
    question: 'How do I submit a report for a lost item?',
    answer: 'Click "Report Lost Item" in the navigation bar. Fill in the title, detailed description, category, last seen campus location, and date. You can also take a live photo or upload an image.',
  },
  {
    id: 6,
    category: 'Lost Complaints',
    question: 'What details make a lost report most effective for matching?',
    answer: 'Be as specific as possible: mention the exact brand, color shade, stickers, unique scratches, dents, case models, or identifying marks.',
  },
  {
    id: 7,
    category: 'Lost Complaints',
    question: 'What happens after I submit a lost report?',
    answer: 'You will receive a Report ID. You will be redirected to the item page displaying potential high and medium probability matches with detailed explanations on why they matched.',
  },
  {
    id: 8,
    category: 'Lost Complaints',
    question: 'What if no matching item is found immediately after I submit?',
    answer: 'Do not worry! Your report remains open in our active database. When a finder or security desk staff logs a matching found item later, the system will pair them automatically.',
  },

  // 3. Found Reports
  {
    id: 9,
    category: 'Found Reports',
    question: 'Where should I physically deposit an item I found on campus?',
    answer: 'You can deposit the item at the nearest Department Office, Central Library Helpdesk, or Campus Security Control Room, and mention that location in your Found Report.',
  },
  {
    id: 10,
    category: 'Found Reports',
    question: 'How do I submit a found item report on khojbeen.ai?',
    answer: 'Click "I Found Something" in the navbar, enter the item description, category, and where you found it, attach a photo with live camera or upload, and submit.',
  },
  {
    id: 11,
    category: 'Found Reports',
    question: 'Can I report a found item anonymously?',
    answer: 'Your name and contact information are required during submission for audit purposes, but they are kept strictly private and never displayed on public pages.',
  },
  {
    id: 12,
    category: 'Found Reports',
    question: 'What happens once the owner claims an item I reported as found?',
    answer: 'The campus coordinators verify the claim proof. Once approved, the item status changes to "Claimed" and then "Closed", resolving both reports.',
  },

  // 4. Photos & Live Camera
  {
    id: 13,
    category: 'Photos & Live Camera',
    question: 'How does the Live Camera capture feature work?',
    answer: 'Click "Take Live Photo" next to the upload button. Allow browser camera access, frame the object, and click Capture. The system burns a tamper-evident date and timestamp into the image.',
  },
  {
    id: 14,
    category: 'Photos & Live Camera',
    question: 'Why is the date and timestamp burned into the live photo?',
    answer: 'The burned timestamp provides clear, verifiable proof of the exact moment and date the photo was captured on campus, preventing stale or reused photos.',
  },
  {
    id: 15,
    category: 'Photos & Live Camera',
    question: 'What image formats and file size limits are supported?',
    answer: 'We support JPG, PNG, and WebP up to 5 MB. All uploaded images are automatically optimized and converted to modern WebP format with secure thumbnails.',
  },
  {
    id: 16,
    category: 'Photos & Live Camera',
    question: 'What should I do if my browser blocks camera permissions?',
    answer: 'Click the camera icon or site settings icon in your browser URL bar, set Camera permission to "Allow", and refresh the page. You can always fall back to standard photo upload.',
  },

  // 5. Matching & Notifications
  {
    id: 17,
    category: 'Matching & Notifications',
    question: 'How is the match score calculated between lost and found items?',
    answer: 'Our algorithm computes a weighted multi-factor score: 50% text similarity (TF-IDF semantics + synonyms), 20% category match, 15% location & campus zone proximity, and 15% event date proximity.',
  },
  {
    id: 18,
    category: 'Matching & Notifications',
    question: 'What do "High Match", "Medium Match", and "Low Match" mean?',
    answer: 'Scores ≥ 70% are classified as High Match (strong evidence of identity). Scores between 40% and 69% are Medium Match. Scores below 40% are classified as Low Match.',
  },
  {
    id: 19,
    category: 'Matching & Notifications',
    question: 'How do I claim a matched item?',
    answer: 'Click "View Matches" or browse to the item detail page, click "Claim This Item", and provide specific ownership verification proof (such as serial numbers, lock screens, or distinguishing marks).',
  },
  {
    id: 20,
    category: 'Matching & Notifications',
    question: 'How do campus coordinators review and verify claims?',
    answer: 'Designated faculty and desk staff review submitted proof against the physical item. Once satisfied, they approve the claim and coordinate physical handover.',
  },

  // 6. Account & Login
  {
    id: 21,
    category: 'Account & Login',
    question: 'Do students need an account to report or browse items?',
    answer: 'No! Students and visitors can report lost or found items, view public listings, search, and access coordinators without any registration or login.',
  },
  {
    id: 22,
    category: 'Account & Login',
    question: 'Who can log in through the Admin Portal?',
    answer: 'Campus lost & found desk administrators, security supervisors, and authorized faculty members log in to manage claims, close items, and update coordinator profiles.',
  },
  {
    id: 23,
    category: 'Account & Login',
    question: 'How is spam and malicious bot submission prevented?',
    answer: 'We utilize Cloudflare Turnstile anti-bot verification, honeypot traps, API rate limiting, and input validation to protect the portal from automated spam.',
  },

  // 7. Language
  {
    id: 24,
    category: 'Language',
    question: 'Which languages are supported on khojbeen.ai?',
    answer: 'We currently support 9 languages: English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, and Urdu. More regional languages can be added seamlessly.',
  },
  {
    id: 25,
    category: 'Language',
    question: 'Does the portal support Right-to-Left (RTL) for Urdu?',
    answer: 'Yes! Selecting Urdu automatically adjusts the entire layout, typography, navigation, and input alignment to RTL (Right-to-Left) mode.',
  },
  {
    id: 26,
    category: 'Language',
    question: 'Can I submit descriptions in my native language?',
    answer: 'Yes! All input fields fully support Unicode UTF-8 text, and our matching algorithm indexes and tokenizes non-Latin scripts accurately.',
  },

  // 8. Faculty Coordinators
  {
    id: 27,
    category: 'Faculty Coordinators',
    question: 'Who are Faculty Coordinators?',
    answer: 'Faculty Coordinators are designated departmental professors and staff members who oversee campus lost & found lockers and assist in item verification.',
  },
  {
    id: 28,
    category: 'Faculty Coordinators',
    question: 'How do I find the coordinator for my department or hostel?',
    answer: 'Visit the "Faculty Coordinators" tab in the navbar. Filter by your department or search by name to view office locations, available hours, phone numbers, and email.',
  },
  {
    id: 29,
    category: 'Faculty Coordinators',
    question: 'Can I call or email a Faculty Coordinator directly?',
    answer: 'Yes! Each coordinator card provides one-click "Call Now" and "Send Email" action buttons for quick mobile communication during their stated available hours.',
  },
  {
    id: 30,
    category: 'Faculty Coordinators',
    question: 'How can a faculty member create or edit their coordinator profile?',
    answer: 'Faculty members can log in via the Desk Admin login, navigate to Faculty Coordinators, and click "Add My Profile" or "Edit Profile" on their respective card.',
  },

  // 9. Privacy & Safety
  {
    id: 31,
    category: 'Privacy & Safety',
    question: 'Is my phone number or email exposed publicly?',
    answer: 'No! All contact details entered during complaint filing are strictly private and accessible solely by authenticated campus lost & found administrators.',
  },
  {
    id: 32,
    category: 'Privacy & Safety',
    question: 'What happens to my personal data once an item is closed?',
    answer: 'Contact details are retained only for official campus audit purposes according to college guidelines and are never shared with external third parties or advertisers.',
  },
  {
    id: 33,
    category: 'Privacy & Safety',
    question: 'How can I avoid false claims or fraud on valuable items?',
    answer: 'Finders should never disclose unique serial numbers, wallpapers, or specific secret markings in public descriptions. Keep those as proof questions for the claimant.',
  },
  {
    id: 34,
    category: 'Privacy & Safety',
    question: 'Who should I contact if I suspect fraudulent activity?',
    answer: 'Immediately reach out to the Central Library Helpdesk or your department Faculty Coordinator listed in the portal support directory.',
  },
  {
    id: 35,
    category: 'Matching & Notifications',
    question: 'How does the College Admin verify a match or pending claim?',
    answer: 'College admins access a side-by-side Match Review screen comparing the lost report with the found report. They examine the overall match score (Strong 80%+, Possible 50-79%, Weak <50%), individual breakdowns (semantic text, visual similarity, category/brand/color/location/date proximity), matching keywords, secret verification answers, and proof receipts before approving handover or rejecting.',
  },
  {
    id: 36,
    category: 'Matching & Notifications',
    question: 'What is the AI Matches tab on the College Admin dashboard?',
    answer: 'The Matches tab lists every AI-paired lost item and found item for that college with counterpart photos, titles, score chips, verdicts, statuses, and one-click Review buttons. Admins can filter by verdict, status, category, date, and search by item names.',
  },
  {
    id: 37,
    category: 'Tag My Item & QR Scanner',
    question: "I found someone's item with a QR Smart Tag, what should I do?",
    answer: 'Scan the QR sticker with your phone camera or visit /scan. You will see 3 secure options: (A) Send an anonymous message to the owner, (B) Choose a Faculty Coordinator or Lost & Found desk to drop it off, or (C) Share your details so the owner can contact you safely after college admin verification. The owner never sees your details without admin verification.',
  },
];
