import urllib.request
import urllib.parse
import json
import sys
import time

BASE_URL = 'http://localhost:5173'

def log_test(name, success, details=''):
    mark = ' PASS ' if success else ' FAIL '
    print(f'[{mark}] {name} {details}')
    return success

all_passed = True

print('====================================================')
print('   KHOJBEEN.AI COMPLETE WEB APPLICATION TEST RUN    ')
print('====================================================\n')

# 1. Frontend Web Server Assets & Pages Check
print('--- 1. FRONTEND PAGES & ASSETS ---')
pages = ['/', '/browse', '/report-lost', '/report-found', '/coordinators', '/faq', '/my-items', '/student/login', '/admin']
for page in pages:
    try:
        req = urllib.request.Request(f'{BASE_URL}{page}', headers={'User-Agent': 'KhojbeenTest/1.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8')
            has_root = 'id="root"' in html or '<div id="root">' in html
            has_title = 'Khojbeen' in html or '<title>' in html
            success = resp.status == 200 and (has_root or has_title)
            all_passed &= log_test(f'Route {page}', success, f'(HTTP {resp.status})')
    except Exception as e:
        all_passed &= log_test(f'Route {page}', False, f'Error: {e}')

# Check mascot asset
try:
    req = urllib.request.Request(f'{BASE_URL}/search-mascot.png')
    with urllib.request.urlopen(req, timeout=5) as resp:
        all_passed &= log_test('Mascot Asset (search-mascot.png)', resp.status == 200, f'({len(resp.read())} bytes)')
except Exception as e:
    all_passed &= log_test('Mascot Asset (search-mascot.png)', False, f'Error: {e}')

# 2. Backend Health & Core APIs
print('\n--- 2. CORE BACKEND APIS ---')
try:
    req = urllib.request.Request(f'{BASE_URL}/api/health')
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        all_passed &= log_test('Health API', data.get('status') == 'ok', f"App: {data.get('app')} v{data.get('version')}")
except Exception as e:
    all_passed &= log_test('Health API', False, f'Error: {e}')

try:
    req = urllib.request.Request(f'{BASE_URL}/api/campuses')
    with urllib.request.urlopen(req) as resp:
        campuses = json.loads(resp.read().decode())
        all_passed &= log_test('Campuses API', len(campuses) > 0, f'Found {len(campuses)} campuses')
except Exception as e:
    all_passed &= log_test('Campuses API', False, f'Error: {e}')

# 3. Items Browsing, Filtering & Search
print('\n--- 3. ITEMS BROWSE & SEARCH ---')
try:
    req = urllib.request.Request(f'{BASE_URL}/api/items?page=1&size=10')
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        items_count = len(res.get('items', []))
        total = res.get('total', 0)
        all_passed &= log_test('Items List API', resp.status == 200, f'Total items: {total}, Page items: {items_count}')
except Exception as e:
    all_passed &= log_test('Items List API', False, f'Error: {e}')

try:
    params = urllib.parse.urlencode({'q': 'bottle', 'category': 'Bottles & Flasks'})
    req = urllib.request.Request(f'{BASE_URL}/api/items?{params}')
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        all_passed &= log_test('Items Filter/Search API', resp.status == 200, f"Matches returned: {len(res.get('items', []))}")
except Exception as e:
    all_passed &= log_test('Items Filter/Search API', False, f'Error: {e}')

# 4. Form Submission: Report Lost Item with QR Tag & Student Account
print('\n--- 4. REPORT LOST FORM SUBMISSION ---')
created_qr = None
created_id = None
try:
    unique_email = f'student_e2e_{int(time.time())}@campus.edu'
    lost_data = urllib.parse.urlencode({
        'type': 'lost',
        'title': 'MacBook Pro Space Grey 14-inch',
        'description': 'Left in CS Department Lab 3 near station 12 on Tuesday evening',
        'category': 'Electronics',
        'location': 'Computer Lab',
        'event_date': '2026-10-06',
        'contact_name': 'Rohan Sharma',
        'contact_email_or_phone': unique_email,
        'contact_mobile': '9876543210',
        'department': 'Computer Science',
        'password': 'securepassword123',
        'turnstile_token': '1x00000000000000000000AA'
    }).encode('utf-8')

    req = urllib.request.Request(f'{BASE_URL}/api/items', data=lost_data, method='POST')
    with urllib.request.urlopen(req) as resp:
        item = json.loads(resp.read().decode())
        created_id = item.get('id')
        created_qr = item.get('unique_qr_code')
        student_token = resp.headers.get('X-Student-Token')
        success = resp.status == 201 and created_qr is not None
        all_passed &= log_test('Report Lost Item Submit', success, f'Created ID: {created_id}, QR: {created_qr}')
        all_passed &= log_test('Student Token Header', student_token is not None, 'Token returned for instant login')
except Exception as e:
    all_passed &= log_test('Report Lost Item Submit', False, f'Error: {e}')

# 5. QR Code Generation Endpoint
print('\n--- 5. QR CODE GENERATION ---')
if created_qr:
    try:
        req = urllib.request.Request(f'{BASE_URL}/api/students/qr/{created_qr}.png')
        with urllib.request.urlopen(req) as resp:
            png_bytes = resp.read()
            all_passed &= log_test('QR Code PNG Generator', resp.status == 200 and len(png_bytes) > 100, f'Generated {len(png_bytes)} bytes PNG')
    except Exception as e:
        all_passed &= log_test('QR Code PNG Generator', False, f'Error: {e}')

# 6. Public QR Scan Verification
print('\n--- 6. PUBLIC SMART TAG SCAN INFO ---')
if created_qr:
    try:
        req = urllib.request.Request(f'{BASE_URL}/api/students/scan/{created_qr}')
        with urllib.request.urlopen(req) as resp:
            tag_data = json.loads(resp.read().decode())
            all_passed &= log_test('Public Tag Scan Info', tag_data.get('unique_code') == created_qr, f"Item: {tag_data.get('title')}")
    except Exception as e:
        all_passed &= log_test('Public Tag Scan Info', False, f'Error: {e}')

# 7. AI Mascot Chatbot Assistant
print('\n--- 7. AI MASCOT CHATBOT ASSISTANT ---')
try:
    chat_payload = json.dumps({
        'message': 'How can I report a lost laptop and get a QR code?',
        'language': 'en',
        'history': []
    }).encode('utf-8')
    req = urllib.request.Request(f'{BASE_URL}/api/chat', data=chat_payload, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as resp:
        chat_resp = json.loads(resp.read().decode())
        reply = chat_resp.get('reply', '')
        all_passed &= log_test('AI Chatbot English Query', len(reply) > 20, f'Reply snippet: "{reply[:70]}..."')
except Exception as e:
    all_passed &= log_test('AI Chatbot English Query', False, f'Error: {e}')

# 8. Notifications Stream
print('\n--- 8. NOTIFICATIONS SYSTEM ---')
try:
    req = urllib.request.Request(f'{BASE_URL}/api/notifications')
    with urllib.request.urlopen(req) as resp:
        notifs = json.loads(resp.read().decode())
        all_passed &= log_test('Notifications List', isinstance(notifs, list), f'{len(notifs)} notifications found')
except Exception as e:
    all_passed &= log_test('Notifications List', False, f'Error: {e}')

# 9. Faculty Coordinators
print('\n--- 9. FACULTY COORDINATORS ---')
try:
    req = urllib.request.Request(f'{BASE_URL}/api/faculty')
    with urllib.request.urlopen(req) as resp:
        coordinators = json.loads(resp.read().decode())
        all_passed &= log_test('Faculty Coordinators List', len(coordinators) > 0, f'{len(coordinators)} coordinators available')
except Exception as e:
    all_passed &= log_test('Faculty Coordinators List', False, f'Error: {e}')

print('\n====================================================')
if all_passed:
    print('  >>> ALL 18 SYSTEM & INTEGRATION TESTS PASSED! <<< ')
else:
    print('  >>> SOME TESTS FAILED! CHECK OUTPUT ABOVE. <<<   ')
print('====================================================')

if not all_passed:
    sys.exit(1)
