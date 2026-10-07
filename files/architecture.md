# Architecture: khojbeen.ai

Frontend and backend are **two separate apps** in one repo. They talk only through a REST API.

> Default stack below is chosen for speed and simplicity. Swap it if your team knows something else, but keep the separation.

## 1. High-Level Diagram

```
 Browser (Student / Admin)
        |
        |  HTTPS
        v
 +--------------------+        REST (JSON)        +----------------------------+
 |  FRONTEND          |  ----------------------->  |  BACKEND                   |
 |  React + Vite      |                            |  Python FastAPI            |
 |  Tailwind CSS      |  <-----------------------  |                            |
 |  (static hosting)  |                            |  - Auth (admin JWT)        |
 +--------------------+                            |  - Items / Claims API      |
                                                   |  - Matching engine (TF-IDF)|
                                                   |  - Image compression       |
                                                   |  - Turnstile verification  |
                                                   |  - Rate limiting           |
                                                   +-------------+--------------+
                                                                 |
                                              +------------------+----------------+
                                              |                                   |
                                        SQLite / Postgres                  /uploads (WebP)
```

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind | Fast, easy, mobile-first |
| Routing | React Router | Pages: Home, Lost, Found, Search, Item, Admin, Privacy, Terms, 404 |
| Backend | FastAPI (Python) | Easy API + great for ML/text similarity |
| DB | SQLite (demo) -> Postgres (production) | Zero setup for hackathon |
| ORM | SQLAlchemy | Clean models |
| Matching | scikit-learn TF-IDF + cosine similarity | Lightweight NLP |
| Images | Pillow (resize + convert to WebP) | Compression |
| Bot protection | Cloudflare Turnstile + honeypot + rate limit (slowapi) | Free and simple |
| Analytics | Plausible or GA4 (loaded only after cookie consent) | Privacy-friendly |
| Hosting | Frontend: Vercel/Netlify. Backend: Render/Railway | Free tiers, automatic HTTPS |

## 3. Folder Structure

```
khojbeen-ai/
├── prd.md  architecture.md  rules.md  phases.md  design.md  memory.md
├── frontend/
│   ├── public/
│   │   ├── favicon.ico  favicon.svg  apple-touch-icon.png
│   │   ├── og-image.png          (1200x630 social preview)
│   │   ├── robots.txt  sitemap.xml
│   ├── src/
│   │   ├── pages/        Home, ReportLost, ReportFound, Search, ItemDetail,
│   │   │                 ClaimForm, AdminLogin, AdminDashboard,
│   │   │                 Privacy, Terms, NotFound
│   │   ├── components/   Navbar, Footer, ItemCard, MatchCard, ScoreBadge,
│   │   │                 CookieBanner, SEO, Turnstile, FormField
│   │   ├── lib/          api.js, validators.js, analytics.js
│   │   └── styles/
│   ├── .env.example      (only PUBLIC values: VITE_API_URL, VITE_TURNSTILE_SITE_KEY)
│   └── package.json
└── backend/
    ├── app/
    │   ├── main.py            FastAPI app, CORS, HTTPS redirect, security headers
    │   ├── config.py          reads secrets from environment
    │   ├── db.py  models.py  schemas.py
    │   ├── routers/           items.py, matches.py, claims.py, admin.py, auth.py
    │   ├── services/          matcher.py, images.py, turnstile.py, notify.py
    │   └── seed.py            sample lost/found data
    ├── tests/
    ├── .env.example           (SECRET_KEY, ADMIN_PASSWORD_HASH, TURNSTILE_SECRET, DB_URL)
    └── requirements.txt
```

## 4. Data Model

**items**
`id, type (lost|found), title, description, category, location, event_date, image_path, contact_name, contact_email_or_phone, status (open|matched|claimed|closed), created_at`

**matches**
`id, lost_id, found_id, score, text_score, category_score, location_score, date_score, created_at`

**claims**
`id, match_id, found_id, claimant_name, claimant_contact, proof_text, status (pending|approved|rejected), admin_note, created_at, decided_at`

**admins**
`id, username, password_hash`

## 5. API Endpoints (Backend)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/items` | Create lost/found item (validated, Turnstile-checked) |
| GET | `/api/items` | List + filter (category, date, location, q) |
| GET | `/api/items/{id}` | Item detail |
| GET | `/api/items/{id}/matches` | Ranked matches with score |
| POST | `/api/claims` | Create claim request |
| POST | `/api/auth/login` | Admin login, returns JWT |
| GET | `/api/admin/dashboard` | Counts + lists (admin only) |
| PATCH | `/api/admin/claims/{id}` | Approve / reject (admin only) |
| PATCH | `/api/admin/items/{id}/close` | Close case (admin only) |
| GET | `/api/health` | Uptime check |

## 6. Matching Engine (backend/app/services/matcher.py)

1. Clean text: lowercase, remove stopwords, apply synonym map (`flask, bottle, sipper, thermos` -> `bottle`; `id card, identity card, college id` -> `id_card`).
2. TF-IDF vectorize all open lost + found descriptions (title + description).
3. Cosine similarity -> text_score (0-1).
4. category_score: 1 if same, else 0.
5. location_score: 1 same place, 0.5 same zone/building, 0 otherwise (small lookup table).
6. date_score: 1 if found within 1 day of lost, decays to 0 over 14 days; 0 if found before lost.
7. final = 100 * (0.5*text + 0.2*category + 0.15*location + 0.15*date).
8. Save top 5 matches per item to `matches` table when an item is created.

## 7. Security Architecture

- **Secrets only in backend env vars.** Frontend `.env` has only public keys (API URL, Turnstile *site* key).
- Turnstile token verified **server-side** with the secret key.
- CORS allows only the frontend domain.
- HTTPS enforced by host + HSTS header + redirect middleware.
- Admin routes protected by JWT; passwords hashed (bcrypt).
- Rate limit public POST routes (example: 5 per minute per IP).
- File upload checks: type (jpg/png/webp), max 5 MB, re-encoded by Pillow (strips metadata, kills malicious payloads).
- Contact info of finders/losers never returned by public endpoints; only admin sees it.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, basic CSP.

## 8. Performance Architecture

- Images resized (max 1200px) and saved as WebP at ~75% quality; thumbnails 400px for lists.
- Lazy-load images, code-split routes, use system fonts or one preloaded font.
- API pagination (20 per page); gzip enabled.
- Test with Lighthouse and PageSpeed Insights before demo.

## 9. Deployment

| Part | Where | Notes |
|---|---|---|
| Frontend | Vercel / Netlify | Auto HTTPS, set `VITE_API_URL` |
| Backend | Render / Railway | Set env vars in dashboard, never in git |
| Domain | khojbeen.ai (or free subdomain for demo) | Force HTTPS |
