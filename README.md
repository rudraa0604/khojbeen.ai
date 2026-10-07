# 🔍 khojbeen.ai

> **"Khoya hai? Khojbeen karega."**  
> _Campus Lost & Found Intelligent Matcher_  
> **Jagran College of Art, Science & Commerce — Hackathon 2026 (Problem Statement 02)**

---

## 📌 Overview

**khojbeen.ai** is an intelligent multi-campus lost-and-found management platform built to solve description mismatch problems. When students or faculty lose items, they describe them differently (*"black matte water flask"* vs *"black Milton-type bottle"*).

**khojbeen.ai** solves this with an automated **TF-IDF + Cross-Lingual Semantic Matching Engine**, visual image embeddings, an intuitive **Left Sidebar Navigation System**, a **"Tag My Item" Pre-Registration System**, a universal **QR Scanner Tab**, scoped **College Admin Panels**, a centralized **Super Admin Panel**, **Cross-College Privacy-Preserving Report Visibility & Portal Inquiries**, and a **Draggable Multilingual AI Assistant**.

---

## ✨ System Architecture & Key Features

### 1. 🏷️ "Tag My Item" — Pre-Register Belongings (Step 1 - Task 21)
- **Pre-Emptive Protection:** Logged-in students can register up to 20 belongings *before* losing them (`/dashboard` -> "My Tagged Items").
- **Smart Tag Metadata:** Name, category, color, brand, finder note ("Please return to CS lab"), and photo (gallery upload or live camera with timestamp overlay).
- **Status Lifecycle:** Items start as `Safe`. 
- **1-Click "Mark as Lost":** Automatically transitions the tagged item to a live Lost report linked to the **exact same QR code**, immediately triggering AI text + image matching against all found items and notifying the student of top matches.
- **1-Click "Mark as Recovered":** Restores status to `Safe` and closes the active lost report.
- **Printable Waterproof Stickers:** Instant QR modal offering:
  1. PNG Image Download
  2. Single Waterproof Sticker Layout (PDF/Print View with Item Name, Code & "Scan if found")
  3. **Sheet of 6 Stickers** layout for printing multiple belongings at once.
- **Privacy-Preserving Public Scan (`/item/{code}`):**
  - If `Safe`: Displays college affiliation banner and a private "Notify Owner" relay button (owner receives a notification that their item was scanned).
  - If `Lost`: Displays item details, finder note, and "I found this item" notification button.
  - **Zero Public Exposure:** Student's name, email, phone, and department are NEVER shown publicly.

---

### 2. 📷 QR Scanner Tab (Step 2 - Task 22)
- **Direct Navigation:** Public "Scan QR" tab on the Left Sidebar (`/scan`) accessible without login.
- **Dual Scanning Modes:**
  1. **Live Camera Scanner:** Real-time viewfinder overlay with animated laser beam, camera flip (front/back), and torch/flashlight toggle. Automatically stops camera stream on tab switch or page unload.
  2. **Gallery & Clipboard Upload:** Drag & drop image files (PNG/JPG/WebP) or paste directly from the system clipboard (`Ctrl+V`) for instant QR decoding.
- **Manual Fallback:** Enter readable code directly (e.g. `KB-37096D25`).
- **Validation & Routing:** Validates `KB-XXXXXXXX` code format and domain. Automatically redirects to `/item/{code}` with a success chime/animation, while rejecting non-Khojbeen QR codes.
- **Knowledge Base & FAQ:** 100% integrated into the FAQ and AI Chatbot with zero fallbacks across all 9 languages.

---

### 3. 🏛️ Scoped College Admin Panels & Super Admin (Step 3 - Task 23)
- **Role Hierarchy:**
  - `super_admin`: Platform owner with global college management, campus admin provisioning, and platform-wide analytics.
  - `college_admin`: College coordinator bound strictly to their assigned `campus_id`.
  - `faculty`: Departmental coordinators.
  - `student`: Standard authenticated student.
- **Backend Campus Scoping:** Every admin API enforces `campus_id` constraints on items, claims, students, coordinators, and inquiries at the database query level (returns `403 Forbidden` if a college admin queries another college's resources).
- **College Admin Panel (`/admin`):**
  - **Overview Stats & Activity:** College-scoped lost, found, matched, recovered, pending claims, and active student metrics.
  - **Report Management:** Filter, approve, reject, resolve, or delete reports.
  - **Student & Faculty Management:** View and disable students; manage faculty coordinators.
  - **Inquiries Inbox:** Manage cross-college inquiries received from students at other institutions.
  - **QR Scan Logs & Tagged Stats:** Anonymized scan frequency statistics.
  - **College Settings:** Name, logo, contact email, and a toggle for *"Share our reports with other colleges"* (default ON).
- **Super Admin Panel (`/super-admin`):**
  - Platform-wide aggregated metrics across all registered campuses.
  - Create, update, or disable colleges (name, city, logo, contact email, slug).
  - Provision college admin accounts and bind them to specific campuses.

---

### 4. 🌐 Cross-College Report Visibility & Portal Inquiries (Step 3 - Task 23)
- **Federated Search (`/search`):** Filter by college or toggle **"All Colleges"** to view lost/found reports from other participating institutions.
- **College Badges:** Every card displays the institution's badge (name and logo).
- **Privacy Safe & Read-Only:** Cross-college cards never expose finder/owner phone, email, or name.
- **Cross-College "Contact via Portal":** If a user spots an item from another college, they send an inquiry through the secure portal relay. The message is dispatched to the reporting college admin's Inquiries inbox and notifies the item owner in-app and via email.
- **Cross-College AI Matching:** The matcher searches across all participating colleges when the user selects cross-campus search.

---

### 5. 🎨 Theme & Persistent UI / i18n
- **Design Tokens:** Modern Emerald/Teal primary (`#10B981` / `#0D9488`) with high-contrast slate typography and glassmorphic cards.
- **Full 9-Language Parity:** English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, and Urdu (with automatic RTL layout).
- **Accessibility & Animations:** Smooth scroll transitions, responsive layouts for mobile and desktop.

---

## 🔑 Demo Credentials

> ⚠️ **Note:** These credentials are for local hackathon demo and evaluation purposes only.

| Role | Username / Email | Password | Assigned Scope / Route |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | `SuperAdmin@12345` | Global (`/super-admin`) |
| **College Admin 1** | `campus_admin1` | `Admin@12345` | Jagran College of Art, Science & Commerce (`/admin`) |
| **College Admin 2** | `campus_admin2` | `Admin@12345` | Indian Institute of Technology Kanpur (`/admin`) |
| **College Admin 3** | `campus_admin3` | `Admin@12345` | Christ Church College (`/admin`) |
| **Student 1** | `aarav.sharma@jagran.edu` | `Student@12345` | Jagran College (`/student/login` -> `/dashboard`) |
| **Student 2** | `priya.patel@jagran.edu` | `Student@12345` | Jagran College (`/student/login` -> `/dashboard`) |
| **Student 3** | `rohit.singh@iitk.ac.in` | `Student@12345` | IIT Kanpur (`/student/login` -> `/dashboard`) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**

---

### 1️⃣ Backend Setup

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

- **API Base URL:** `http://127.0.0.1:8000`
- **Swagger Interactive Docs:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/api/health`

---

### 2️⃣ Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

- **Web Application:** `http://localhost:5173`

---

## 🧪 Testing & Verification

### Run Backend Pytest Suite
```powershell
backend\venv\Scripts\pytest.exe backend\tests -v
```
*Result: 16 test suites passing (including cross-college scoping, Tag My Item, and Super Admin tests).*

### Run Chatbot Knowledge Base Tests
```powershell
backend\venv\Scripts\python.exe test_chatbot_kb.py
```
*Result: 36 test queries across all 9 languages & Hinglish passing with 100% confidence.*

### Frontend Production Build
```powershell
cd frontend
npm run build
```
*Result: Clean production bundle created in under 2 seconds.*

---

## 👥 Contributors
- **Team khojbeen.ai** — Jagran College of Art, Science & Commerce Hackathon 2026
