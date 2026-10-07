import os
import sys
import json
import datetime
import bcrypt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.db import engine, SessionLocal, Base
from app.models import Item, Match, Claim, Admin, FacultyCoordinator, Campus, Notification, RegisteredItem, User, CrossCollegeInquiry, ScanEvent
from app.services.matcher import calculate_match
from app.services.semantic_matcher import compute_text_embedding
from app.services.image_matcher import compute_image_embedding

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        # 1. Seed 3 Campuses (Task 12 & Task 23)
        campuses = [
            Campus(
                id=1,
                name="Jagran Main Campus (Kanpur)",
                city="Kanpur",
                slug="jagran-main",
                logo_url="https://images.unsplash.com/photo-1562774053-701939374585?w=120&auto=format&fit=crop&q=80",
                contact_email="helpdesk.main@jagran.edu",
                share_reports=True,
                announcement="Welcome to Jagran Main Campus Lost & Found! Please tag your laptops and IDs at Student Dashboard.",
                is_active=True
            ),
            Campus(
                id=2,
                name="Jagran City Campus (Civil Lines)",
                city="Kanpur",
                slug="jagran-city",
                logo_url="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=120&auto=format&fit=crop&q=80",
                contact_email="helpdesk.city@jagran.edu",
                share_reports=True,
                announcement="Civil Lines desk is open Mon-Sat 9 AM - 5 PM for lost belongings collection.",
                is_active=True
            ),
            Campus(
                id=3,
                name="Jagran Institute of Management (South City)",
                city="Kanpur",
                slug="jagran-jim",
                logo_url="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=120&auto=format&fit=crop&q=80",
                contact_email="helpdesk.jim@jagran.edu",
                share_reports=True,
                announcement="JIM Management Building Lost & Found Counter located in Room 102.",
                is_active=True
            ),
        ]
        db.add_all(campuses)
        db.commit()
        print("[OK] Seeded 3 Campuses")

        # 2. Seed Admin Users (Task 23: Super Admin + 3 College Admins)
        admins = [
            Admin(
                username="superadmin",
                campus_id=None,
                role="super_admin",
                full_name="Chief Platform Administrator",
                email="superadmin@khojbeen.ai",
                password_hash=hash_password("SuperAdmin@12345")
            ),
            Admin(
                username="campus_admin1",
                campus_id=1,
                role="college_admin",
                full_name="Prof. Arvind Kumar (Main Campus)",
                email="admin.main@jagran.edu",
                password_hash=hash_password("Admin@12345")
            ),
            Admin(
                username="campus_admin2",
                campus_id=2,
                role="college_admin",
                full_name="Dr. Shalini Gupta (City Campus)",
                email="admin.city@jagran.edu",
                password_hash=hash_password("Admin@12345")
            ),
            Admin(
                username="campus_admin3",
                campus_id=3,
                role="college_admin",
                full_name="Mr. Rajeev Mishra (JIM)",
                email="admin.jim@jagran.edu",
                password_hash=hash_password("Admin@12345")
            ),
            Admin(
                username="admin",
                campus_id=1,
                role="college_admin",
                full_name="Legacy Desk Admin",
                email="admin@jagran.edu",
                password_hash=hash_password("admin123")
            )
        ]
        db.add_all(admins)
        db.commit()
        print("[OK] Created Super Admin and 3 College Admins")

        # 3. Seed Demo Students
        students = [
            User(
                id=1,
                campus_id=1,
                email="aarav.sharma@campus.edu",
                password_hash=hash_password("Student@12345"),
                full_name="Aarav Sharma",
                mobile="+91 98765 43210",
                department="Computer Science",
                role="student"
            ),
            User(
                id=2,
                campus_id=1,
                email="priya.v@campus.edu",
                password_hash=hash_password("Student@12345"),
                full_name="Priya Verma",
                mobile="+91 98765 11223",
                department="Electronics",
                role="student"
            ),
            User(
                id=3,
                campus_id=2,
                email="student.city@jagran.edu",
                password_hash=hash_password("Student@12345"),
                full_name="Karan Malhotra",
                mobile="+91 98111 99887",
                department="Commerce",
                role="student"
            ),
            User(
                id=4,
                campus_id=3,
                email="student.jim@jagran.edu",
                password_hash=hash_password("Student@12345"),
                full_name="Sanya Kapoor",
                mobile="+91 98222 77665",
                department="Management Studies",
                role="student"
            )
        ]
        db.add_all(students)
        db.commit()
        print("[OK] Seeded 4 Demo Student accounts across 3 colleges")

        today = datetime.date.today()

        # 4. 12 Lost Items distributed across 3 Campuses
        lost_data = [
            # Campus 1 (Main Campus)
            {
                "campus_id": 1,
                "user_id": 1,
                "title": "Black matte water flask",
                "description": "Black matte water flask with a small dent on the bottom cap, left on a study table.",
                "category": "Bottles & Flasks",
                "brand": "Milton",
                "color": "Black",
                "location": "Library",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Aarav Sharma",
                "contact_email_or_phone": "aarav.sharma@campus.edu",
            },
            {
                "campus_id": 1,
                "user_id": 2,
                "title": "College Identity Card with Blue Lanyard",
                "description": "Student ID card in a blue plastic holder with Jagran College lanyard, Roll No. 22CS104.",
                "category": "Cards & IDs",
                "brand": None,
                "color": "Blue",
                "location": "Cafeteria",
                "event_date": today - datetime.timedelta(days=1),
                "contact_name": "Priya Verma",
                "contact_email_or_phone": "priya.v@campus.edu",
            },
            {
                "campus_id": 1,
                "user_id": None,
                "title": "Casio scientific calculator fx-991EX",
                "description": "Black Casio scientific calculator with white slider cover. Has a tiny silver sticker on back.",
                "category": "Electronics",
                "brand": "Casio",
                "color": "Black",
                "location": "Science Block",
                "event_date": today - datetime.timedelta(days=3),
                "contact_name": "Rohan Gupta",
                "contact_email_or_phone": "9876543210",
            },
            {
                "campus_id": 1,
                "user_id": None,
                "title": "White wireless earbuds with charging case",
                "description": "White true wireless earbuds in glossy white charging case with a small scratch near the hinge.",
                "category": "Electronics",
                "brand": "Boat",
                "color": "White",
                "location": "Computer Lab",
                "event_date": today - datetime.timedelta(days=1),
                "contact_name": "Sneha Patel",
                "contact_email_or_phone": "sneha.p@campus.edu",
            },
            # Campus 2 (City Campus)
            {
                "campus_id": 2,
                "user_id": 3,
                "title": "House and bike keys with Doraemon keychain",
                "description": "Set of 3 metal keys with a blue rubber Doraemon keychain and a small ring.",
                "category": "Keys & Locks",
                "brand": None,
                "color": "Blue",
                "location": "Parking Area",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Aditya Singh",
                "contact_email_or_phone": "9823456789",
            },
            {
                "campus_id": 2,
                "user_id": None,
                "title": "Grey pullover hoodie (Size M)",
                "description": "Dark grey Nike fleece pullover hoodie with front kangaroo pocket, left on bench.",
                "category": "Clothing",
                "brand": "Nike",
                "color": "Grey",
                "location": "Sports Complex",
                "event_date": today - datetime.timedelta(days=4),
                "contact_name": "Kabir Mehta",
                "contact_email_or_phone": "kabir.m@campus.edu",
            },
            {
                "campus_id": 2,
                "user_id": None,
                "title": "Red foldable rain umbrella",
                "description": "Compact red 3-fold umbrella with black handle and wrist strap.",
                "category": "Other",
                "brand": None,
                "color": "Red",
                "location": "Classroom Block A",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Ananya Joshi",
                "contact_email_or_phone": "ananya.j@campus.edu",
            },
            {
                "campus_id": 2,
                "user_id": None,
                "title": "Black Noise ColorFit smartwatch",
                "description": "Black rectangular smartwatch with silicone strap and black magnetic charger pin marks on back.",
                "category": "Electronics",
                "brand": "Noise",
                "color": "Black",
                "location": "Main Auditorium",
                "event_date": today - datetime.timedelta(days=3),
                "contact_name": "Vikram Das",
                "contact_email_or_phone": "9811223344",
            },
            # Campus 3 (JIM South City)
            {
                "campus_id": 3,
                "user_id": 4,
                "title": "Brown leather bi-fold wallet",
                "description": "Brown leather wallet containing metro card, college library card, and some currency notes.",
                "category": "Bags & Accessories",
                "brand": "Wildhorn",
                "color": "Brown",
                "location": "Cafeteria",
                "event_date": today - datetime.timedelta(days=1),
                "contact_name": "Manish Tiwari",
                "contact_email_or_phone": "manish.t@campus.edu",
            },
            {
                "campus_id": 3,
                "user_id": None,
                "title": "Data Structures spiral notebook",
                "description": "Classmate spiral notebook with CS notes and name sticker 'Ritu Sen' on front cover.",
                "category": "Books & Stationery",
                "brand": "Classmate",
                "color": "Yellow",
                "location": "Classroom Block B",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Ritu Sen",
                "contact_email_or_phone": "ritu.sen@campus.edu",
            },
            {
                "campus_id": 3,
                "user_id": None,
                "title": "Black 65W Type-C laptop charger",
                "description": "Original Lenovo 65W USB-C power adapter with long black cable and velcro tie.",
                "category": "Electronics",
                "brand": "Lenovo",
                "color": "Black",
                "location": "Library",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Siddharth Roy",
                "contact_email_or_phone": "sid.roy@campus.edu",
            },
            {
                "campus_id": 3,
                "user_id": None,
                "title": "Ray-Ban reading spectacles in brown case",
                "description": "Black rimmed spectacles with anti-glare lenses inside a magnetic brown hard case.",
                "category": "Other",
                "brand": "Ray-Ban",
                "color": "Black",
                "location": "Admin Block",
                "event_date": today - datetime.timedelta(days=3),
                "contact_name": "Dr. S. K. Nair",
                "contact_email_or_phone": "sk.nair@campus.edu",
            }
        ]

        # 5. 12 Found Items distributed across 3 Campuses
        found_data = [
            # Campus 1
            {
                "campus_id": 1,
                "title": "Black Milton type bottle",
                "description": "Black insulated stainless steel Milton water bottle found on second floor study area.",
                "category": "Bottles & Flasks",
                "location": "Reading Hall",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Librarian Desk",
                "contact_email_or_phone": "library.staff@campus.edu",
            },
            {
                "campus_id": 1,
                "title": "Student ID card found near food counter",
                "description": "Blue lanyard college student identity card belonging to Priya Verma, found on lunch table.",
                "category": "Cards & IDs",
                "location": "Cafeteria",
                "event_date": today - datetime.timedelta(days=1),
                "contact_name": "Cafeteria Manager",
                "contact_email_or_phone": "cafe@campus.edu",
            },
            {
                "campus_id": 1,
                "title": "Casio scientific calculator",
                "description": "Casio black calculator found after physics lab session on bench 4.",
                "category": "Electronics",
                "location": "Science Block",
                "event_date": today - datetime.timedelta(days=3),
                "contact_name": "Lab Assistant Suresh",
                "contact_email_or_phone": "lab.physics@campus.edu",
            },
            {
                "campus_id": 1,
                "title": "White wireless Bluetooth earphones",
                "description": "Pair of white wireless earbuds in battery charging case found plugged near terminal 12.",
                "category": "Electronics",
                "location": "Computer Lab",
                "event_date": today - datetime.timedelta(days=1),
                "contact_name": "Lab Incharge",
                "contact_email_or_phone": "complab@campus.edu",
            },
            # Campus 2
            {
                "campus_id": 2,
                "title": "Keys ring with cartoon character",
                "description": "Three silver keys with a blue Doraemon keychain found near two-wheeler parking.",
                "category": "Keys & Locks",
                "location": "Parking Area",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Security Guard Ram",
                "contact_email_or_phone": "security@campus.edu",
            },
            {
                "campus_id": 2,
                "title": "Grey athletic hoodie jacket",
                "description": "Grey branded fleece hoodie jacket picked up from badminton court spectator seats.",
                "category": "Clothing",
                "location": "Sports Complex",
                "event_date": today - datetime.timedelta(days=4),
                "contact_name": "Sports Coach",
                "contact_email_or_phone": "sports@campus.edu",
            },
            {
                "campus_id": 2,
                "title": "Red folding umbrella",
                "description": "Red rain umbrella left behind in room 204 after morning lecture.",
                "category": "Other",
                "location": "Classroom Block A",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Floor Staff Anita",
                "contact_email_or_phone": "staff.blocka@campus.edu",
            },
            {
                "campus_id": 2,
                "title": "Black digital fitness smartwatch",
                "description": "Black smartwatch with rectangular display found in row F of auditorium after orientation.",
                "category": "Electronics",
                "location": "Main Auditorium",
                "event_date": today - datetime.timedelta(days=3),
                "contact_name": "Event Coordinator",
                "contact_email_or_phone": "events@campus.edu",
            },
            # Campus 3
            {
                "campus_id": 3,
                "title": "Men's brown wallet",
                "description": "Brown leather wallet found near water cooler, contains cards and cash.",
                "category": "Bags & Accessories",
                "location": "Cafeteria",
                "event_date": today - datetime.timedelta(days=1),
                "contact_name": "Canteen Staff Ramesh",
                "contact_email_or_phone": "canteen.staff@campus.edu",
            },
            {
                "campus_id": 3,
                "title": "Classmate CS subject notebook",
                "description": "Spiral notebook with computer science notes found in room B-12.",
                "category": "Books & Stationery",
                "location": "Classroom Block B",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Prof. Verma Office",
                "contact_email_or_phone": "prof.verma@campus.edu",
            },
            {
                "campus_id": 3,
                "title": "Lenovo USB-C laptop power brick",
                "description": "Lenovo 65W Type-C adapter found under study desk 14.",
                "category": "Electronics",
                "location": "Library",
                "event_date": today - datetime.timedelta(days=2),
                "contact_name": "Library Circulation Desk",
                "contact_email_or_phone": "circulation@campus.edu",
            },
            {
                "campus_id": 3,
                "title": "Eyeglasses in brown case",
                "description": "Black frame spectacles in brown protective case left near reception counter.",
                "category": "Other",
                "location": "Admin Block",
                "event_date": today - datetime.timedelta(days=3),
                "contact_name": "Reception Desk",
                "contact_email_or_phone": "reception@campus.edu",
            }
        ]

        created_lost = []
        for l in lost_data:
            text_emb = compute_text_embedding(f"{l['title']} {l['description']}")
            item = Item(
                campus_id=l.get("campus_id", 1),
                user_id=l.get("user_id"),
                type="lost",
                title=l["title"],
                description=l["description"],
                category=l["category"],
                brand=l.get("brand"),
                color=l.get("color"),
                location=l["location"],
                event_date=datetime.datetime.combine(l["event_date"], datetime.time.min),
                text_embedding=json.dumps(text_emb) if text_emb else None,
                contact_name=l["contact_name"],
                contact_email_or_phone=l["contact_email_or_phone"],
                unique_qr_code=f"KB-{abs(hash(l['title'])) % 100000000:08X}",
                status="open"
            )
            db.add(item)
            created_lost.append(item)
        
        db.commit()

        created_found = []
        for f in found_data:
            text_emb = compute_text_embedding(f"{f['title']} {f['description']}")
            item = Item(
                campus_id=f.get("campus_id", 1),
                type="found",
                title=f["title"],
                description=f["description"],
                category=f["category"],
                location=f["location"],
                event_date=datetime.datetime.combine(f["event_date"], datetime.time.min),
                text_embedding=json.dumps(text_emb) if text_emb else None,
                contact_name=f["contact_name"],
                contact_email_or_phone=f["contact_email_or_phone"],
                status="open"
            )
            db.add(item)
            created_found.append(item)

        db.commit()

        # Refresh instances
        for item in created_lost + created_found:
            db.refresh(item)

        # 6. Generate Matches
        match_count = 0
        for lost_item in created_lost:
            for found_item in created_found:
                res = calculate_match(lost_item, found_item)
                if res["score"] >= 35.0:
                    match_entry = Match(
                        lost_id=lost_item.id,
                        found_id=found_item.id,
                        score=res["score"],
                        text_score=res["text_score"],
                        image_score=res.get("image_score"),
                        has_image_match=res.get("has_image_match", False),
                        category_score=res["category_score"],
                        location_score=res["location_score"],
                        date_score=res["date_score"]
                    )
                    db.add(match_entry)
                    match_count += 1
                    lost_item.status = "matched"
                    found_item.status = "matched"

        db.commit()
        print(f"[OK] Seeded 12 Lost items & 12 Found items across 3 colleges ({match_count} matches)")

        # 7. Seed 1 Sample Pending Claim for demo
        first_found = created_found[0]  # Black Milton type bottle
        first_match = db.query(Match).filter(Match.found_id == first_found.id).first()
        
        sample_claim = Claim(
            found_id=first_found.id,
            match_id=first_match.id if first_match else None,
            claimant_name="Aarav Sharma",
            claimant_contact="aarav.sharma@campus.edu",
            proof_text="The bottle has a tiny dent right on the bottom silver rim and a scratch on the silicone grip ring.",
            status="pending"
        )
        db.add(sample_claim)
        first_found.status = "claimed"
        db.commit()
        print("[OK] Seeded 1 sample pending claim for demo verification")

        # 8. Seed Tagged Items (Pre-loss belonging protection - Task 21)
        tagged_items = [
            Item(
                campus_id=1,
                user_id=1,
                type="tagged",
                title="Dell XPS 15 9520 Laptop",
                description="Silver aluminium body with carbon fibre palm rest and Khojbeen sticker on bottom cover.",
                category="Electronics",
                brand="Dell",
                color="Silver",
                finder_note="Please return to CSE Dept Library desk or call through Khojbeen portal.",
                is_tagged=True,
                status="safe",
                location="Main Campus",
                event_date=datetime.datetime.utcnow(),
                unique_qr_code="KB-7A8B9C0D",
                contact_name="Aarav Sharma",
                contact_email_or_phone="aarav.sharma@campus.edu"
            ),
            Item(
                campus_id=2,
                user_id=3,
                type="tagged",
                title="Stanley Hydro Flask (Olive Green)",
                description="32oz Olive green insulated water bottle with metal straw lid.",
                category="Bottles & Flasks",
                brand="Hydro Flask",
                color="Olive Green",
                finder_note="Kindly hand over at Civil Lines Security desk.",
                is_tagged=True,
                status="safe",
                location="Civil Lines",
                event_date=datetime.datetime.utcnow(),
                unique_qr_code="KB-1E2F3A4B",
                contact_name="Karan Malhotra",
                contact_email_or_phone="student.city@jagran.edu"
            )
        ]
        db.add_all(tagged_items)
        db.commit()
        print(f"[OK] Seeded {len(tagged_items)} Pre-tagged Items (Status: Safe, Task 21)")

        # 9. Seed Sample Cross-College Inquiry (Task 23)
        sample_inquiry = CrossCollegeInquiry(
            item_id=created_found[0].id,
            from_campus_id=2,  # From City Campus
            to_campus_id=1,    # To Main Campus
            user_id=3,
            sender_name="Karan Malhotra",
            sender_contact="student.city@jagran.edu",
            message="I believe this water flask belongs to me; I visited Main Campus for the Sports Meet and left it near the Reading Hall.",
            inquiry_type="claim",
            status="pending"
        )
        db.add(sample_inquiry)
        db.commit()
        print("[OK] Seeded 1 sample Cross-College Inquiry for demo")

        # 10. Seed Sample Notifications
        notifications = [
            Notification(
                recipient_contact="aarav.sharma@campus.edu",
                recipient_email="aarav.sharma@campus.edu",
                type="match_found",
                title="🔍 High Match Found (76%)!",
                message="A Black Milton type bottle was reported at Reading Hall matching your lost flask.",
                link_url="/items/1",
                is_read=False
            ),
            Notification(
                recipient_contact="student.city@jagran.edu",
                type="cross_college_inquiry",
                title="Cross-College Inquiry Received",
                message="Your inquiry regarding 'Black Milton type bottle' was sent to Jagran Main Campus coordinators.",
                link_url="/items/13",
                is_read=False
            )
        ]
        db.add_all(notifications)
        db.commit()
        print(f"[OK] Seeded {len(notifications)} sample notifications")

        # 11. Seed Sample Faculty Coordinators across departments and colleges
        coordinators_data = [
            {
                "campus_id": 1,
                "name": "Dr. Rajesh K. Sharma",
                "department": "Computer Science & Engineering",
                "designation": "Professor & Head of Department",
                "email": "rajesh.sharma@campus.edu",
                "phone": "+91 98765 43210",
                "office": "Tech Block A, Room 304",
                "available_timings": "Mon - Fri: 10:00 AM - 1:00 PM",
                "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
                "admin_id": 2
            },
            {
                "campus_id": 1,
                "name": "Dr. Sunita Deshmukh",
                "department": "Electronics & Communication",
                "designation": "Associate Professor & Lab In-charge",
                "email": "sunita.d@campus.edu",
                "phone": "+91 98765 12345",
                "office": "ECE Block, Room 212",
                "available_timings": "Mon - Thu: 2:00 PM - 4:30 PM",
                "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
                "admin_id": None
            },
            {
                "campus_id": 2,
                "name": "Prof. Vikram Malhotra",
                "department": "Commerce & Economics",
                "designation": "Assistant Professor & Coordinator",
                "email": "vikram.m@campus.edu",
                "phone": "+91 98111 22334",
                "office": "Civil Lines Block, Room 105",
                "available_timings": "Tue - Sat: 11:00 AM - 3:00 PM",
                "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
                "admin_id": 3
            },
            {
                "campus_id": 3,
                "name": "Ms. Ananya Sengupta",
                "department": "Management & Business Studies",
                "designation": "Head Coordinator & JIM In-charge",
                "email": "ananya.jim@campus.edu",
                "phone": "+91 98222 33445",
                "office": "JIM South City, Room 102",
                "available_timings": "Mon - Sat: 9:00 AM - 5:00 PM",
                "photo": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
                "admin_id": 4
            }
        ]

        for coord in coordinators_data:
            fc = FacultyCoordinator(**coord)
            db.add(fc)

        db.commit()
        print(f"[OK] Seeded {len(coordinators_data)} sample Faculty Coordinators across 3 campuses")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
