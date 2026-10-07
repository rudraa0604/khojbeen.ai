# Design: khojbeen.ai

Simple, friendly, trustworthy, and fast. Mobile-first. Accessible (WCAG AA).

## 1. Brand

- **Name:** khojbeen.ai ("khoj" = search)
- **Tagline:** Khoya hai? Khojbeen karega.
- **Tone:** helpful, calm, student-friendly. Short sentences. No jargon.
- **Logo idea:** a magnifying glass with a small location pin inside; wordmark in lowercase "khojbeen" with ".ai" in the accent color.

## 2. Color Tokens (all pass WCAG AA on white)

| Token | Hex | Use | Contrast on #FFFFFF |
|---|---|---|---|
| `--text` | `#0F172A` | Main text | about 17:1 |
| `--text-muted` | `#475569` | Secondary text | about 7.5:1 |
| `--primary` | `#0F766E` | Buttons, links, brand | about 5.5:1 |
| `--primary-hover` | `#115E59` | Button hover | about 7.6:1 |
| `--accent` | `#B45309` | Highlights, ".ai" | about 5:1 |
| `--success` | `#15803D` | Approved, High match | about 5:1 |
| `--warning` | `#B45309` | Medium match, pending | about 5:1 |
| `--danger` | `#B91C1C` | Errors, Rejected | about 6.5:1 |
| `--bg` | `#FFFFFF` | Page background | n/a |
| `--surface` | `#F1F5F9` | Cards, sections | n/a |
| `--border` | `#CBD5E1` | Borders | decorative only |

Rules:
- White text on `--primary` buttons passes AA (about 5.5:1).
- Never use light gray text (below `#64748B`) on white.
- Never rely on color alone: always pair with a text label or icon (for example "High 85%").
- Re-verify every pair with a contrast checker after any change.

## 3. Typography

- **Font:** Inter (one weight set: 400, 600, 700) or system font stack as fallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`.
- Base size **16px** (inputs at least 16px to stop iOS zoom).
- Scale: H1 32/40 (mobile 28), H2 24, H3 20, body 16, small 14.
- Line height 1.5 for body.

## 4. Layout and Spacing

- Mobile-first, breakpoints: `sm 640`, `md 768`, `lg 1024`.
- Max content width 1100px, centered, 16px side padding on mobile.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Cards: radius 12px, 1px border, soft shadow.
- Tap targets at least 44x44px.

## 5. Pages

| Page | Route | Main goal |
|---|---|---|
| Home | `/` | One CTA: **Report a Lost Item** |
| Report Lost | `/report-lost` | Submit lost item |
| Report Found | `/report-found` | Submit found item |
| Search | `/search` | Browse and filter items |
| Item Detail | `/item/:id` | Details + Possible Matches + Claim button |
| Claim | `/claim/:id` | Send ownership proof |
| Admin Login | `/admin/login` | Secure entry |
| Admin Dashboard | `/admin` | Verify claims, close cases |
| Privacy | `/privacy` | Policy |
| Terms | `/terms` | Terms and conditions |
| 404 | `*` | Friendly recovery |

### Home page structure
1. Navbar: logo, Search, Report Found, Admin (small).
2. Hero: headline "Lost something on campus?", one sentence, **one big primary button: Report a Lost Item**, small text link "I found something".
3. "How it works" in 3 steps: Report, We match, Claim.
4. Recent found items (4 cards, lazy-loaded images).
5. Footer: Privacy, Terms, contact, hackathon note.

## 6. Components

- **Button:** primary (filled teal), secondary (outlined), danger. Focus ring 2px visible on keyboard focus.
- **FormField:** label above input, helper text, inline error text in `--danger` with an icon.
- **ItemCard:** thumbnail (WebP, lazy), title, category chip, location, date, status badge.
- **ScoreBadge:** "High 85%" (green), "Medium 55%" (amber), "Low 30%" (gray). Always text + percentage + small bar.
- **MatchCard:** both items side by side on desktop, stacked on mobile, with a "Why matched" line.
- **StatusBadge:** Open, Matched, Claim Requested, Approved, Rejected, Closed.
- **CookieBanner:** fixed to bottom, short text, **Accept** and **Decline** equal visual weight, link to Privacy.
- **Toast:** success/error messages, announced to screen readers (`role="status"`).
- **Table (admin):** scrolls horizontally inside its own container on mobile.

## 7. Custom 404 Page

- Friendly illustration or icon with alt text (or decorative `alt=""`).
- Headline: "We could not find this page."
- Text: "Just like a lost bottle, it may have moved. Let's help you find your way."
- Buttons: **Go Home** (primary), **Search Items** (secondary).

## 8. Images

- Format WebP, max 1200px wide, under 200 KB (thumbnails 400px).
- Always set `width`, `height`, `alt`. Lazy-load below the fold.
- Alt text examples: "Black water bottle found near the library", "khojbeen.ai logo". Decorative: `alt=""`.

## 9. Favicon and Social Preview

- Favicon set: `favicon.ico` (32x32), `favicon.svg`, `apple-touch-icon.png` (180x180).
- Social preview `og-image.png`: **1200x630**, teal background, logo, tagline, short text "Campus Lost & Found, matched by AI". Keep important text inside the center safe area.
- Meta: `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card=summary_large_image`.

## 10. Accessibility Checklist

- Visible keyboard focus on all interactive elements
- Labels linked to inputs, errors announced (`aria-live="polite"`)
- Heading order H1 then H2 then H3, one H1 per page
- Contrast AA everywhere, status never by color alone
- Skip-to-content link at the top
- Respect `prefers-reduced-motion`

## 11. Microcopy Examples

- CTA: "Report a Lost Item"
- Empty search: "No items found. Try fewer words or another location."
- Form error: "Please describe the item in at least 10 characters."
- Claim success: "Claim sent. The desk will verify and contact you."
