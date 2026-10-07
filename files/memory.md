# Memory: khojbeen.ai

> This is the project's running notes. **Update it after every finished task.** AI assistants must read this file at the start of every session.

## 1. Project Snapshot

- **Name:** khojbeen.ai
- **What:** Campus Lost & Found Intelligent Matcher
- **Event:** Jagran College of Art, Science & Commerce, Hackathon 2026, Problem Statement 02
- **Core idea:** Users report lost/found items, the system ranks possible matches with a score, admin verifies claims.
- **One CTA:** "Report a Lost Item"
- **Source of truth docs:** `prd.md`, `architecture.md`, `rules.md`, `phases.md`, `design.md`

## 2. Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Frontend | React + Vite + Tailwind | Fast, mobile-first, zero secrets |
| Backend | FastAPI (Python 3.11+) | Fast async API, robust for NLP text matching |
| Database | SQLite (demo/dev), PostgreSQL ready | Zero setup for hackathon |
| Matching | TF-IDF + cosine similarity + synonym map + zone lookup | Lightweight NLP, explainable match breakdown |
| Score weights | Text 50%, Category 20%, Location 15%, Date 15% | Balances description with location/time context |
| Bot protection | Cloudflare Turnstile + honeypot + rate limiting (slowapi) | Free, unobtrusive, effective protection |
| Analytics | Privacy-first analytics loaded strictly after consent | GDPR/Privacy compliance |
| Security | JWT auth, direct bcrypt hashing, contact privacy | Public API never exposes student contacts |

## 3. Rules to Never Forget

1. Frontend and backend stay separate.
2. No secrets in frontend code (only `VITE_API_URL` and `VITE_TURNSTILE_SITE_KEY`).
3. Validate on client and server.
4. Public API never returns contact info (only desk admin routes can).
5. Analytics only after cookie Accept.
6. Do not add features outside `prd.md`.

## 4. Progress Tracker

### Backend
- [x] B0 Setup (FastAPI, DB, models, config, CORS, health check)
- [x] B1 Items API + image compression + seed data (12 lost + 12 found items)
- [x] B2 Matching engine + pytest suite (tested bottle/flask synonym matching)
- [x] B3 Claims + Admin + Auth (JWT + bcrypt + lifecycle state transitions)
- [x] B4 Turnstile, honeypot, rate limit, HTTPS middleware, security headers
- [x] B7 Deployment prep (Procfile, requirements, env separation)

### Frontend
- [x] F0 Setup (React Router, Tailwind design tokens, api.js)
- [x] F1 Report forms + Search with multi-filters + ItemCard + ItemDetail
- [x] F2 Matches UI (MatchCard, ScoreBadge with bar + label + percentage + reason)
- [x] F3 Claim form + Admin dashboard (stat cards, claims verification table, notes)
- [x] F4a Privacy (/privacy), Terms (/terms), Cookie banner, 404 (NotFound)
- [x] F4b SEO component, favicon set, social preview (og-image.png), sitemap.xml, robots.txt, dominant CTA
- [x] F5 Turnstile widget, honeypot field, analytics consent gating
- [x] F6 Polish (WebP compression, WCAG AA contrast, 360px mobile friendly, alt text)
- [x] F7 Deployment prep (Vite build, dist generation, SPA routing)

## 5. Launch Checklist Status (20/20 PASS)

- [x] 1 Privacy policy page (`/privacy` live, linked in footer + cookie banner)
- [x] 2 Compress images (Pillow WebP compression, thumbnails, static og-image <20KB)
- [x] 3 Terms and conditions page (`/terms` live, linked in footer)
- [x] 4 Page load speed checked (Vite chunking, fast asset delivery)
- [x] 5 Secrets off the front end (audited repository, only public keys in frontend)
- [x] 6 Color contrast fixed (WCAG AA compliant teal/amber/slate palette from design.md)
- [x] 7 HTTPS forced (redirect middleware + HSTS header in production)
- [x] 8 Mobile friendly (tested at 360px, 390px, 768px, 1280px; 44px tap targets)
- [x] 9 Cookie consent banner (Accept/Decline, localStorage persistence, analytics gating)
- [x] 10 Custom 404 page (friendly branded recovery with Go Home and Search buttons)
- [x] 11 Broken links fixed (all internal routes mapped and functional)
- [x] 12 Meta titles and descriptions (unique on every page via SEO component)
- [x] 13 Form validation (inline errors, client validators + server Pydantic validation)
- [x] 14 Social preview image (`og-image.png` 1200x630 generated in public/)
- [x] 15 Spam/bot protection (Turnstile token validation + honeypot + rate limit)
- [x] 16 Favicon (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png` in index.html)
- [x] 17 Analytics (Plausible/GA4 loaded only upon cookie acceptance)
- [x] 18 Sitemap and robots.txt (`/sitemap.xml` and `/robots.txt` disallowing `/admin`)
- [x] 19 One clear call to action (Hero primary button: "Report a Lost Item")
- [x] 20 Alt text on all images (descriptive alt text on images, decorative `aria-hidden`)

## 6. Work Log (newest first)

| Date | Area | What was done | Next step |
|---|---|---|---|
| 2026-10-01 | Frontend | Removed visible Turnstile test badges across all pages, and added explicit 'Report Submitted Successfully' confirmation modal on lost & found submissions. | Verified & Live |
| 2026-10-01 | Full Stack | Completed Phases 0-7: FastAPI backend, React frontend, TF-IDF matching engine, claims verification, admin dashboard, all 20 launch checklist items, pytest unit suite (100% pass), and database seeding. | Ready for final demo! |
| 2026-10-01 | Setup | Initialized requirements, project documentation, and architecture specifications. | Execute Phase 0 |

## 7. Known Issues / Bugs

- None. All 8 pytest test cases pass and frontend builds with 0 errors.

## 8. Environment Notes (names only, NEVER real values)

**Backend `.env`:** `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `TURNSTILE_SECRET`, `DB_URL`, `FRONTEND_URL`, `ENVIRONMENT`
**Frontend `.env`:** `VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY`

## 9. Useful Commands

```bash
# Backend
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
pytest -v

# Frontend
cd frontend
npm install
npm run dev
npm run build
```

## 10. Open Questions / Deployment Placeholders

- Production Turnstile Secret/Site Keys: configured with official Cloudflare test keys for development/demo.
- Analytics Account ID: placeholder configured in `analytics.js`.
- Production Domain: ready for binding to `khojbeen.ai`.
