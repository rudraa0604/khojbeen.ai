# PRD: khojbeen.ai

**Tagline:** Khoya hai? Khojbeen karega.
**Hackathon:** Jagran College of Art, Science & Commerce, Hackathon 2026
**Problem Statement:** 02, Campus Lost & Found Intelligent Matcher
**Domain:** Campus Utility + Information Retrieval

---

## 1. Problem

Lost-and-found desks compare descriptions by hand. Two people describe the same object differently ("black bottle", "matte water flask", "black Milton-type bottle"), so staff cannot quickly tell whether a found item belongs to someone who reported it missing.

## 2. Goal

Let users report lost or found items, then automatically show a **ranked list of possible matches with a confidence score**, and run a safe **claim and admin verification** workflow.

## 3. Non-goals (do NOT build these)

- Real-time chat between users
- Mobile native app (responsive web only)
- Payments, rewards, or user ratings
- Heavy deep-learning image models (optional only if time remains)

## 4. Users

| User | What they want |
|---|---|
| **Loser** (student/staff who lost something) | Report fast, see if it was found, claim it |
| **Finder** (person who found something) | Report in under a minute, hand over item |
| **Admin** (lost-and-found desk) | See matches ranked, verify claims, close cases |

## 5. User Stories

1. As a loser, I submit a Lost Item form so the system can look for it.
2. As a finder, I submit a Found Item form so the owner can be found.
3. As a user, I search and filter items by category, date, location, keyword.
4. As a user, I see a "possible matches" list with a % score.
5. As an owner, I send a claim request with proof (describe a hidden detail).
6. As an admin, I approve, reject, or close a claim after verifying.
7. As an admin, I see a dashboard of open, matched, claimed, closed cases.

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR1 | Separate Lost and Found submission forms (title, description, category, location, date, optional image, contact) | Must |
| FR2 | Search + filter by category, date range, location, keywords | Must |
| FR3 | Similarity matching using description, category, location, time | Must |
| FR4 | Match score (0-100%) with label: High / Medium / Low | Must |
| FR5 | Claim request workflow with admin verification | Must |
| FR6 | Admin dashboard: approve / reject / close | Must |
| FR7 | Image upload with automatic compression | Should |
| FR8 | Synonym-aware text matching (TF-IDF, optionally embeddings) | Should |
| FR9 | Image-feature comparison | Could |
| FR10 | Email/WhatsApp notification on new match | Could |

## 7. Matching Spec

Final score = weighted sum (0-100):

- Text similarity (TF-IDF cosine, with synonym map): **50%**
- Category match: **20%**
- Location match (same / nearby / different): **15%**
- Date closeness (found date on or after lost date, closer is better): **15%**

Labels: **High >= 70**, **Medium 40-69**, **Low < 40** (hide Low by default).

## 8. Case Lifecycle

`Reported -> Matched -> Claim Requested -> Verified (Approved) -> Closed`
Alternate: `Claim Requested -> Rejected -> back to Matched`

## 9. Non-Functional Requirements

- Page load under 3 seconds on 4G; images compressed to WebP
- Works on 360px wide phones
- WCAG AA color contrast
- HTTPS only; no secrets in frontend code
- Form validation on client AND server
- Spam/bot protection on all public forms
- Privacy policy, Terms, cookie consent live before launch

## 10. Launch Checklist (20 items, all required)

1. Privacy policy page
2. Compress images
3. Terms and conditions page
4. Check page load speed
5. Secrets off the front end
6. Fix color contrast
7. Force HTTPS
8. Make it mobile friendly
9. Cookie consent banner
10. Custom 404 page
11. Fix broken links
12. Meta titles and descriptions
13. Form validation
14. Social preview image
15. Spam/bot protection
16. Favicon
17. Analytics
18. Sitemap and robots.txt
19. One clear call to action
20. Alt text on all images

**The one call to action:** a big button on the home page: **"Report a Lost Item"** (secondary link: "I found something").

## 11. Success Metrics (for demo)

- 10+ sample lost and 10+ sample found records loaded
- At least 3 matches visibly ranked with scores
- Full claim flow demoed in under 2 minutes
- Lighthouse score 85+ on Performance, Accessibility, SEO

## 12. Demo Script (2 minutes)

1. Open home page, point to the single CTA.
2. Submit Lost: "black matte water flask, library, 28 Sep".
3. Submit Found: "black Milton type bottle, reading hall, 28 Sep".
4. Show the ranked match with an 80%+ score.
5. Owner sends claim with proof, admin approves, case closes.

## 13. Sample Data Ideas

Black water bottle, blue ID card holder, Casio calculator, silver earphones case, college ID, red umbrella, house keys with a Doraemon keychain, Noise smartwatch, notebook with a name sticker, grey hoodie.

## 14. Risks

| Risk | Mitigation |
|---|---|
| Fake claims | Proof question + admin verification, contact details hidden until approved |
| Spam submissions | Turnstile/CAPTCHA + rate limiting + honeypot field |
| Demo breaks | Seed script resets DB to known good sample data |
| Privacy of personal data | Collect only needed fields, show privacy policy, hide contact info |
