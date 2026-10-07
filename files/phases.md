# Phases: khojbeen.ai (Step-by-Step Execution + Prompts)

**How to use this file:**
1. Do phases in order. Inside each phase, do **Backend** first, then **Frontend**.
2. Copy each prompt into your AI coding tool (Claude Code, Cursor, etc.) one at a time.
3. Start every new AI session with the **Master Prompt** below.
4. After each step, test it, then update `memory.md`.

---

## Master Prompt (paste at the start of every session)

```
I am building "khojbeen.ai", a Campus Lost & Found Intelligent Matcher for a college hackathon.
Read these files in the repo first: prd.md, architecture.md, rules.md, design.md, memory.md.
Follow rules.md strictly. Keep frontend/ and backend/ completely separate.
Never put secrets in frontend code. Work on ONE task at a time.
Tell me if the task is FRONTEND or BACKEND. When done, summarize changes and give me
the text to add to memory.md.
```

---

## Phase 0: Setup (30-45 min)

### Backend
**Prompt B0:**
```
BACKEND TASK. Create the backend/ folder with FastAPI as per architecture.md.
Add: app/main.py, config.py (reads env vars), db.py (SQLAlchemy + SQLite), models.py
(items, matches, claims, admins), schemas.py, requirements.txt, .env.example
(SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, TURNSTILE_SECRET, DB_URL, FRONTEND_URL).
Add a /api/health endpoint and CORS allowing only FRONTEND_URL. Show me how to run it.
```

### Frontend
**Prompt F0:**
```
FRONTEND TASK. Create the frontend/ folder with React + Vite + Tailwind.
Set up React Router with routes: /, /report-lost, /report-found, /search, /item/:id,
/claim/:id, /admin/login, /admin, /privacy, /terms, and * (404).
Add Navbar, Footer, and placeholder pages. Add .env.example with only VITE_API_URL
and VITE_TURNSTILE_SITE_KEY. Create src/lib/api.js as the single place for API calls.
Apply color tokens and fonts from design.md in tailwind.config.js.
```

---

## Phase 1: Core Items (Report + List + Search) (2-3 hrs)

### Backend
**Prompt B1:**
```
BACKEND TASK. Build routers/items.py:
POST /api/items (lost or found), GET /api/items (filter by type, category, date range,
location, q keyword, with pagination), GET /api/items/{id}.
Validate with Pydantic (title 3-80 chars, description 10-500 chars, valid category list,
date not in the future, contact required). Public responses must NOT include contact info.
Add services/images.py: accept jpg/png/webp up to 5 MB, resize to max 1200px, convert to
WebP, create a 400px thumbnail. Add seed.py with 12 lost and 12 found realistic campus items.
```

### Frontend
**Prompt F1:**
```
FRONTEND TASK. Build the pages ReportLost and ReportFound (separate forms), Search page
with filters (category, date, location, keyword), and ItemCard + ItemDetail.
Add client-side validation with clear inline error messages (src/lib/validators.js).
Show a loading state and success message after submit. Use design.md components.
Mobile-first layout. All images need alt text and lazy loading.
```

---

## Phase 2: Matching Engine (2 hrs)

### Backend
**Prompt B2:**
```
BACKEND TASK. Build services/matcher.py exactly as in architecture.md section 6:
text cleaning + synonym map, TF-IDF cosine similarity, category/location/date scores,
weights 50/20/15/15, final score 0-100. Run matching automatically when an item is created
and save the top 5 to the matches table. Add GET /api/items/{id}/matches returning ranked
matches with score and label (High >= 70, Medium 40-69, Low < 40). Write unit tests using
"black bottle", "matte water flask", "black Milton-type bottle" as one matching example.
```

### Frontend
**Prompt F2:**
```
FRONTEND TASK. On ItemDetail, add a "Possible Matches" section using MatchCard and
ScoreBadge components: show percentage, High/Medium/Low label, a small bar, and a short
reason ("Similar description, same category, same area"). Add an empty state when no matches
exist. Match design.md colors (do not rely on color alone; always show the text label).
```

---

## Phase 3: Claim Workflow + Admin (2-3 hrs)

### Backend
**Prompt B3:**
```
BACKEND TASK. Build routers/claims.py and routers/admin.py and routers/auth.py.
POST /api/claims (claimant name, contact, proof_text min 15 chars), POST /api/auth/login
(bcrypt + JWT), GET /api/admin/dashboard (counts of open/matched/claimed/closed + pending
claims), PATCH /api/admin/claims/{id} (approve/reject with admin_note),
PATCH /api/admin/items/{id}/close. Protect admin routes with JWT. Only admin responses may
include contact info. Update item statuses according to the lifecycle in prd.md.
```

### Frontend
**Prompt F3:**
```
FRONTEND TASK. Build ClaimForm (name, contact, proof of ownership), AdminLogin, and
AdminDashboard: stat cards, pending claims table with Approve/Reject buttons and a note
field, and a Close Case button. Store the admin token in memory (or sessionStorage), never
in code. Show clear success/error toasts. Table must scroll horizontally on mobile
inside its own container.
```

---

## Phase 4: Legal, Consent, SEO, 404 (1.5-2 hrs)

### Frontend (mostly)
**Prompt F4a (items 1, 3, 9, 10):**
```
FRONTEND TASK. Add these pages and components:
1) Privacy Policy page (/privacy): what we collect (item details, contact info, claim proof,
   optional analytics), why, how long we keep it, who can see it (admins only), user rights,
   contact email, last updated date. Plain simple English.
2) Terms & Conditions page (/terms): acceptable use, no false claims, admin may reject
   claims, no guarantee of recovery, liability limits, changes to terms.
3) CookieBanner: appears on first visit with Accept and Decline buttons and a Privacy link.
   Save choice in localStorage. Analytics must NOT load unless Accept was chosen.
4) NotFound page (*): friendly message, search box or big "Go Home" button, same navbar.
Link Privacy and Terms in the footer. Add "I agree to Terms and Privacy" checkbox on forms.
Add a note in the footer that this is a student hackathon project and policies are not
a substitute for legal advice.
```

**Prompt F4b (items 12, 14, 16, 18, 19):**
```
FRONTEND TASK. Create an SEO component (title, description, canonical, Open Graph, Twitter
card) and use it on every page with unique titles under 60 chars and descriptions under 160.
Add favicon.ico, favicon.svg, apple-touch-icon.png and link them in index.html. Add
public/og-image.png (1200x630) for social preview. Generate public/sitemap.xml with all
public routes (not admin) and public/robots.txt (disallow /admin, link the sitemap).
Make sure the home page has ONE dominant call to action: "Report a Lost Item", with a
smaller text link "I found something".
```

### Backend
**Prompt B4:**
```
BACKEND TASK. Add Turnstile verification in services/turnstile.py (server-side with
TURNSTILE_SECRET), a honeypot field check ("website" must be empty), and rate limiting
with slowapi on POST /api/items, /api/claims and /api/auth/login. Add a middleware that
redirects http to https in production and sets HSTS, X-Content-Type-Options,
X-Frame-Options, Referrer-Policy and a basic Content-Security-Policy.
```

---

## Phase 5: Spam Protection, Analytics, Hardening (1 hr)

### Frontend
**Prompt F5:**
```
FRONTEND TASK. Add the Turnstile widget (component Turnstile.jsx using only the PUBLIC
site key) to ReportLost, ReportFound, ClaimForm and AdminLogin, and send the token to the
API. Add a hidden honeypot input named "website" (visually hidden, tabindex -1,
autocomplete off). Add src/lib/analytics.js that loads Plausible or GA4 only after cookie
Accept, tracks page views, and tracks the "report lost click" event on the main CTA.
```

### Security check (manual)
**Prompt S5:**
```
Audit the whole repo for secrets in frontend/. Search for "SECRET", "KEY", "TOKEN",
"PASSWORD". List anything that should move to backend env vars. Confirm .env files are in
.gitignore and only .env.example files are committed.
```

---

## Phase 6: Performance, Contrast, Mobile, Links (1.5 hrs)

### Frontend
**Prompt F6:**
```
FRONTEND TASK. Polish pass:
1) Images: convert all static images to WebP, resize to needed dimensions, set width and
   height attributes, loading="lazy" except hero. Target under 200 KB per image.
2) Contrast: check every text/background pair against WCAG AA (4.5:1 normal text, 3:1 large
   text) using the palette in design.md. Fix any failing pair.
3) Mobile: test at 360px, 390px, 768px, 1280px. No horizontal page scroll, tap targets at
   least 44px, readable font size 16px+ on inputs.
4) Performance: route-based code splitting, remove unused packages, preload one font or use
   system fonts. Run Lighthouse (mobile) and fix issues until Performance 85+,
   Accessibility 90+, SEO 90+.
5) Links: run a link checker and fix every broken link and every route that 404s.
6) Alt text: every meaningful image gets descriptive alt text; decorative images alt="".
```

---

## Phase 7: Deploy + Demo (1-2 hrs)

### Backend
**Prompt B7:**
```
BACKEND TASK. Prepare for deployment on Render/Railway: add Procfile or start command
(uvicorn), pin requirements, set env vars in the dashboard (not in git), run seed.py to load
demo data, confirm /api/health works and HTTPS is enforced.
```

### Frontend
**Prompt F7:**
```
FRONTEND TASK. Prepare for Vercel/Netlify: set VITE_API_URL and VITE_TURNSTILE_SITE_KEY in
the dashboard, add SPA rewrite rule so all routes serve index.html, verify the custom 404,
sitemap.xml, robots.txt and social preview work on the live URL.
```

### Final Checklist Prompt
```
Go through the 20-item Launch Checklist in rules.md section 6 one by one on the deployed
site. For each item, say PASS or FAIL with proof, and fix every FAIL.
```

---

## Time Plan (about 14-16 hours total)

| Phase | Time |
|---|---|
| 0 Setup | 0.5-1 h |
| 1 Core items | 2-3 h |
| 2 Matching | 2 h |
| 3 Claim + Admin | 2-3 h |
| 4 Legal, SEO, 404 | 1.5-2 h |
| 5 Spam + Analytics | 1 h |
| 6 Polish | 1.5 h |
| 7 Deploy + Demo | 1-2 h |

**Short on time?** Do Phases 0-3 first (working product), then Phase 4-7 in the order of checklist items you can finish. Optional extras (image similarity, notifications) only if everything else is done.

## 20-Item Checklist to Phase Map

| Item | Phase |
|---|---|
| 1 Privacy, 3 Terms, 9 Cookie banner, 10 404 | 4 |
| 12 Meta, 14 Social image, 16 Favicon, 18 Sitemap, 19 CTA | 4 |
| 13 Form validation | 1 (client) + 1 (server) |
| 15 Spam protection | 4 (backend) + 5 (frontend) |
| 17 Analytics | 5 |
| 5 Secrets off front end | 0 + 5 audit |
| 7 Force HTTPS | 4 (backend) + 7 |
| 2 Images, 4 Speed, 6 Contrast, 8 Mobile, 11 Links, 20 Alt text | 6 |
