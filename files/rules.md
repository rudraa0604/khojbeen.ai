# Rules: khojbeen.ai

These rules apply to every person and every AI assistant working on this repo. Read `prd.md`, `architecture.md`, `design.md` and `memory.md` before writing code.

## 1. Golden Rules

1. **Frontend and backend stay separate.** Frontend never touches the database. Backend never renders pages.
2. **No secrets in the frontend. Ever.** Only public values (`VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY`) are allowed in frontend env.
3. **Validate twice:** in the browser (for users) and on the server (for safety).
4. **Build small, finish fully.** A working small feature beats a half-finished big one.
5. **One clear call to action per page.** Home page CTA: "Report a Lost Item".
6. **Never expose personal contact info** through public API responses.
7. **Do not add features outside `prd.md`** without updating `prd.md` first.

## 2. Backend Rules

- Python 3.11+, FastAPI, type hints everywhere, Pydantic schemas for all input/output.
- All config from environment variables via `config.py`. Commit `.env.example`, never `.env`.
- Every public POST route needs: validation, Turnstile check, rate limit.
- Admin routes need JWT auth. Passwords hashed with bcrypt.
- Return consistent errors: `{ "error": "message", "field": "optional" }`.
- Uploaded images must be re-encoded and compressed with Pillow (WebP, max 1200px).
- Matching logic lives only in `services/matcher.py` and must have unit tests.
- Add security headers and HTTPS redirect in `main.py`.

## 3. Frontend Rules

- React + Vite + Tailwind, functional components only.
- All API calls go through `src/lib/api.js`. No `fetch` scattered in components.
- Every page sets its own `<title>` and meta description through the `SEO` component.
- Every `<img>` has meaningful `alt` text (decorative images use `alt=""`), explicit width/height, and `loading="lazy"` (except the top hero image).
- Use semantic HTML (`header`, `main`, `nav`, `footer`, `button`, `label`).
- Mobile-first: design for 360px first, then scale up.
- Color tokens come only from `design.md`. Do not invent new colors.
- Analytics scripts load **only after** the user accepts cookies.
- No broken links: every `<Link>` points to an existing route.

## 4. Naming and Git

- Files: `PascalCase.jsx` for components, `snake_case.py` for Python.
- Branches: `feature/<name>`, `fix/<name>`. Commits: short and clear (`feat: add found item form`).
- Never commit: `.env`, `node_modules`, `uploads/`, `*.db`.
- After each finished task, update `memory.md`.

## 5. Definition of Done (per feature)

- [ ] Works on mobile (360px) and desktop
- [ ] Validation works (client + server)
- [ ] No console errors or warnings
- [ ] Color contrast passes AA
- [ ] Images have alt text
- [ ] `memory.md` updated

## 6. Launch Checklist (all 20 must be checked before demo)

| # | Item | How to verify |
|---|---|---|
| 1 | Privacy policy page | `/privacy` loads and is linked in footer + cookie banner |
| 2 | Compress images | All images are WebP, each under 200 KB |
| 3 | Terms and conditions page | `/terms` loads and is linked in footer |
| 4 | Page load speed | Lighthouse Performance 85+, PageSpeed mobile checked |
| 5 | Secrets off front end | Search built JS for keys; only public keys found |
| 6 | Color contrast | Lighthouse Accessibility 90+, manual check with contrast tool |
| 7 | Force HTTPS | `http://` redirects to `https://`; HSTS header present |
| 8 | Mobile friendly | Test at 360px, 390px, 768px; no horizontal scroll |
| 9 | Cookie consent banner | Shows on first visit; analytics blocked until Accept |
| 10 | Custom 404 page | Random URL shows branded 404 with home button |
| 11 | Fix broken links | Run a link checker; zero 404s |
| 12 | Meta titles and descriptions | Every page has unique title (under 60 chars) and description (under 160) |
| 13 | Form validation | Empty/invalid submits show clear error messages |
| 14 | Social preview image | `og-image.png` 1200x630; test in a share debugger |
| 15 | Spam/bot protection | Turnstile + honeypot + rate limit working |
| 16 | Favicon | Shows in browser tab, bookmarks, and mobile home screen |
| 17 | Analytics | Page views recorded after consent |
| 18 | Sitemap and robots.txt | `/sitemap.xml` and `/robots.txt` load correctly |
| 19 | One clear call to action | Home page has one dominant button |
| 20 | Alt text on all images | Lighthouse shows no missing alt warnings |

## 7. AI Assistant Instructions

When an AI assistant (Claude, Cursor, Copilot, etc.) works on this project:

1. Read all six `.md` files first.
2. Work on **one phase task at a time** from `phases.md`.
3. Say whether the task is **frontend** or **backend** before starting.
4. Never put secrets in frontend code; ask if unsure.
5. After finishing, summarize what changed and update `memory.md`.
6. If a requirement is unclear, ask one short question instead of guessing.
