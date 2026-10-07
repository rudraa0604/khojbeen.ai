# 🔍 khojbeen.ai — Frontend

React + Vite + Tailwind CSS frontend for **khojbeen.ai** (Campus Lost & Found Intelligent Matcher).

## 🚀 Running the Frontend

```powershell
# Install dependencies (first time)
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

The app will be accessible at: `http://localhost:5173`

## 📁 Key Directories

- `src/pages/`: Main application routes (`Home`, `ReportLost`, `ReportFound`, `Search`, `ItemDetail`, `ClaimForm`, `AdminLogin`, `AdminDashboard`, `Privacy`, `Terms`, `NotFound`).
- `src/components/`: Reusable components (`Navbar`, `Footer`, `ItemCard`, `MatchCard`, `ScoreBadge`, `StatusBadge`, `FormField`, `CookieBanner`, `SEO`, `Toast`).
- `src/lib/`:
  - `api.js`: Centralized REST API client.
  - `validators.js`: Client-side form validation rules.
  - `analytics.js`: Privacy-first analytics loaded only with consent.

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

_(No secrets are ever stored in frontend code)_
