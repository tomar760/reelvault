# 🚀 ReelVault — LIVE Karne Ka Complete Setup Guide (Hinglish)

**Target time:** ~25–30 minute (ek hi baar karna hai, phir hamesha ke liye LIVE)
**Cost:** ₹0 — sab free tier
**Kya banega:** Frontend (GitHub Pages) + Backend (Render) + Sheet + Drive — poora automatic system

> Ye guide SOP ke Section 11 ka step-by-step practical version hai. Har step ke saath ✅ tick karte jao.

---

## 📋 Cheezein Chahiye Shuru Karne Se Pehle
- [ ] Ek **Google account** (jis Gmail mein videos/sheet rahegi)
- [ ] Ek **GitHub account**
- [ ] Ek **Render account** (render.com — GitHub se login karna sabse easy)
- [ ] Ek **NVIDIA NIM key** (build.nvidia.com — free, optional par recommended)

---

## STEP 1 — Google Cloud Project (10 min)

1. [ ] `console.cloud.google.com` kholo → upar project dropdown → **New Project** → naam: `reelvault` → Create
2. [ ] Left menu → **APIs & Services → Library**
3. [ ] Search: **Google Drive API** → Enable ✅
4. [ ] Search: **Google Sheets API** → Enable ✅
5. [ ] Left menu → **Credentials → Create Credentials → Service Account**
   - Naam: `reelvault-bot` → Create → role koi nahi chahiye → Done
6. [ ] Service Accounts list mein `reelvault-bot` pe click → **Keys** tab → **Add Key → Create new key → JSON** → ek `.json` file download hogi — **ise SECRET rakho** (kisi ko mat do, GitHub pe mat daalo)
7. [ ] JSON file kholo → usme `client_email` dikh raha hai (jaise `reelvault-bot@reelvault.iam.gserviceaccount.com`) → **ye email copy karke rakh lo**

---

## STEP 2 — Google Sheet (5 min)

1. [ ] [sheets.google.com](https://sheets.google.com) → nayi blank sheet → naam: **`ReelVault_Master`**
2. [ ] Bas itna karna hai — **tabs/headers backend KHUD bana dega** pehli baar chalne pe!
3. [ ] Sheet ke URL se **SHEET_ID** copy karo:
   `https://docs.google.com/spreadsheets/d/`**`1AbCxyz...`**`/edit` → ye beech wala lamba part
4. [ ] **Share** button → Step 1 wali `client_email` paste karo → role: **Editor** → Send ✅
   (⚠️ Ye step miss hua to backend sheet likh nahi payega — sabse common galti yahi hoti hai)

---

## STEP 3 — Google Drive Folder (3 min)

1. [ ] Drive mein naya folder: **`ReelVault`**
2. [ ] Folder kholo → URL se folder ID copy karo:
   `drive.google.com/drive/folders/`**`1XyZabc...`**
3. [ ] Folder pe right-click → **Share** → wahi `client_email` → **Editor** ✅
4. [ ] Andar ke folders (01_High, 02_Medium...) **khud mat banao** — backend first-run pe auto-create karega

---

## STEP 4 — NVIDIA NIM Key (optional, 5 min)

1. [ ] [build.nvidia.com](https://build.nvidia.com) → free account banao
2. [ ] Koi bhi **Llama** model kholo (e.g. Llama 3.1 8B) → **Get API Key** → copy
3. [ ] Ye backend mein `NIM_API_KEY` ban jayega (tagging ke liye)
   - Skip kar sakte ho — app bina AI ke bhi chalega, bas auto-tags nahi aayenge

---

## STEP 5 — Code GitHub Pe Daalo (5 min)

1. [ ] GitHub pe naya **private repo** banao: `reelvault`
2. [ ] Is ZIP ke andar ka saara code zip extract karke repo mein push karo:
   - `reelvault/` folder → frontend (ye repo mein as-is)
   - `reelvault-backend/` folder → backend
   ```bash
   git init && git add . && git commit -m "ReelVault v1"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/reelvault.git
   git push -u origin main
   ```

---

## STEP 6 — Backend Deploy on Render (8 min)

1. [ ] [render.com](https://render.com) → **New → Web Service** → apna `reelvault` repo connect karo
2. [ ] Settings:
   - **Root Directory:** `reelvault-backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
3. [ ] **Environment Variables** add karo (sabse important step):

   | Variable | Value | Kahan se milega |
   |---|---|---|
   | `GOOGLE_KEY_BASE64` | base64 of JSON | Step 1 wali JSON file → base64 banane ke liye: PC pe terminal → `base64 -w0 key.json` (Linux/Mac) ya online "base64 encode file" tool |
   | `SHEET_ID` | sheet ka ID | Step 2 |
   | `DRIVE_FOLDER_ID` | folder ka ID | Step 3 |
   | `NIM_API_KEY` | nvapi-... | Step 4 (optional) |
   | `APP_PASSCODE` | apna 4-digit code | khud decide karo (e.g. `1234`) |
   | `FRONTEND_URL` | `https://YOUR-USERNAME.github.io` | Step 7 wali URL (bina trailing slash) |

4. [ ] **Deploy** → 2-3 minute mein live. URL milega: `https://reelvault-api-xxxx.onrender.com`
5. [ ] Browser mein `.../api/health` kholo → `{"ok":true,"awake":true,...}` dikhna chahiye
   - `sheet: "error..."` aaye to service-account email Sheet/Drive pe **Editor** hai ya nahi check karo
6. [ ] Render logs kholo — "**Sheet structure verified ✓**" dikha to Sheet mein tabs/headers apne aap ban gaye 🔥

---

## STEP 7 — Frontend LIVE on GitHub Pages (5 min)

1. [ ] Same repo → **Settings → Pages** → Source: `main` branch → **root** select karo
   - Frontend `reelvault/` subfolder mein hai isliye: repo root mein ek chhota sa `index.html` redirect bana do ya Pages source mein `/reelvault` ke liye "docs" approach use karo
   - **Easy tarika:** repo root mein `index.html` banao is content ke saath:
     ```html
     <meta http-equiv="refresh" content="0; url=reelvault/index.html">
     ```
2. [ ] 1-2 min mein site live: `https://YOUR-USERNAME.github.io/reelvault/reelvault/`
3. [ ] Dashboard kholo → **Settings** page → **Backend Connection** section:
   - Backend URL: Render wali URL paste karo
   - Passcode: apna code
   - **Save & Connect** ✅
4. [ ] Chip **DEMO MODE → LIVE** ho jayega. Bas — ab sab REAL hai! 🎉

---

## STEP 8 — Phone Pe App Install (2 min)

**Android:** Chrome mein site kholo → menu ⋮ → **Add to Home screen → Install**
**iPhone:** Safari → Share → **Add to Home Screen**

Ab: reel pasand aayi → link copy → app kholo → paste → **ADD VIDEO** → backend apne aap:
download → Drive ke sahi folder → Sheet entry → dashboard update. 🪄

---

## 🛠 Common Problems & Fixes

| Problem | Matlab | Fix |
|---|---|---|
| `sheet: "error: The caller does not have permission"` | Bot ko access nahi | `client_email` ko Sheet + Drive folder dono pe **Editor** banao |
| `GOOGLE_KEY_BASE64 is not valid` | base64 galat encode hua | Poori JSON file ek saath encode karo, line-breaks mat chhodo |
| Pehli request slow (30-50s) | Render sleep hai | Normal hai — free tier. Dashboard pe "waking" dikhega, phir fast |
| Instagram reel download fail "login required" | IG ne bot block kiya | Browser se cookies export karke `IG_COOKIES_BASE64` mein daalo |
| CORS error browser console mein | FRONTEND_URL mismatch | Render env mein exact frontend URL daalo (https, no trailing /) |
| Download hua par Sheet update nahi | Sheet share issue | Step 2.4 dobara check karo |
| HTML5 video thumbnail nahi | Drive thumbnail ban rahi hai | Kuch minute baad apne aap aa jayegi |

---

## 📂 Folder Structure Reference

```
reelvault repo
├── reelvault/                ← FRONTEND (GitHub Pages)
│   ├── index.html            (Dashboard — 13 modules)
│   ├── library.html / vault.html / analytics.html
│   ├── activity.html / settings.html
│   ├── js/config.js          ← backend URL yahan bhi set kar sakte ho
│   ├── js/api.js             ← LIVE connector (demo ↔ live switch)
│   └── ...
├── reelvault-backend/        ← BACKEND (Render)
│   ├── server.js             (entry)
│   ├── routes/api.js         (saare endpoints)
│   ├── services/             (drive, sheets, queue, downloader, nim)
│   ├── .env.example          (env template — real .env KABHI push mat karna)
│   └── SETUP_GUIDE_HINGLISH.md (ye file)
└── index.html                (redirect → reelvault/index.html)
```

---

**Ab sab LIVE! 🚀 Koi bhi step atke to error ka screenshot/text rakho — wahi batayega kya fix karna hai.**
