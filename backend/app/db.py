from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# SQLite connect args
connect_args = {"check_same_thread": False} if settings.DB_URL.startswith("sqlite") else {}

engine = create_engine(settings.DB_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def run_migrations():
    try:
        from sqlalchemy import inspect, text
        with engine.connect() as conn:
            inspector = inspect(engine)
            table_names = inspector.get_table_names()
            if "items" in table_names:
                cols = [c["name"] for c in inspector.get_columns("items")]
                if "brand" not in cols:
                    conn.execute(text("ALTER TABLE items ADD COLUMN brand VARCHAR(100)"))
                if "color" not in cols:
                    conn.execute(text("ALTER TABLE items ADD COLUMN color VARCHAR(50)"))
                if "finder_note" not in cols:
                    conn.execute(text("ALTER TABLE items ADD COLUMN finder_note TEXT"))
                if "is_tagged" not in cols:
                    conn.execute(text("ALTER TABLE items ADD COLUMN is_tagged BOOLEAN DEFAULT 0"))

            if "users" in table_names:
                cols = [c["name"] for c in inspector.get_columns("users")]
                if "is_disabled" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_disabled BOOLEAN DEFAULT 0"))

            if "admins" in table_names:
                cols = [c["name"] for c in inspector.get_columns("admins")]
                if "role" not in cols:
                    conn.execute(text("ALTER TABLE admins ADD COLUMN role VARCHAR(30) DEFAULT 'college_admin'"))
                if "full_name" not in cols:
                    conn.execute(text("ALTER TABLE admins ADD COLUMN full_name VARCHAR(100)"))
                if "email" not in cols:
                    conn.execute(text("ALTER TABLE admins ADD COLUMN email VARCHAR(100)"))

            if "campuses" in table_names:
                cols = [c["name"] for c in inspector.get_columns("campuses")]
                if "slug" not in cols:
                    conn.execute(text("ALTER TABLE campuses ADD COLUMN slug VARCHAR(100)"))
                if "share_reports" not in cols:
                    conn.execute(text("ALTER TABLE campuses ADD COLUMN share_reports BOOLEAN DEFAULT 1"))
                if "announcement" not in cols:
                    conn.execute(text("ALTER TABLE campuses ADD COLUMN announcement TEXT"))
                if "is_active" not in cols:
                    conn.execute(text("ALTER TABLE campuses ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            conn.commit()
    except Exception as e:
        print(f"Migration warning: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
