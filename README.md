# ⚡ ReelVault — Complete Project (Frontend + Backend)

**Paste. Download. Organize. Done.**

## 📦 What's inside

| Folder | What | Where it runs |
|---|---|---|
| `reelvault/` | Frontend dashboard (6 pages, 13 modules, animated) | GitHub Pages (FREE) |
| `reelvault-backend/` | API server (yt-dlp + Drive + Sheets + AI) | Render (FREE) |
| `index.html` (root) | Redirect for GitHub Pages | keep at repo root |

## 🚀 Start here

**Open: `reelvault-backend/SETUP_GUIDE_HINGLISH.md`** — complete step-by-step
live-setup guide (Google Cloud → Sheet → Drive → Render → GitHub Pages → phone install). ~30 min one-time.

## ✅ Quick check (frontend demo, 10 seconds)

```bash
cd reelvault
python3 -m http.server 8080
```
Open `http://localhost:8080` — passcode **1234** (demo mode with sample data).

## 🔧 Backend local run (after setup)

```bash
cd reelvault-backend
cp .env.example .env   # fill real values
npm install
npm start
```
