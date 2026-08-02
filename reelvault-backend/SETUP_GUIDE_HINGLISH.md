# 🚀 ReelVault — LIVE Karne Ka Complete Setup Guide (HINGLISH, A to Z)

**Time:** ~30 minute (sirf EK BAAR karna hai) • **Cost:** ₹0 (sab free)
**Result:** Phone se link paste karo → video khud Drive mein → entry khud Sheet mein → dashboard mein sab dikhe

> Har step ke aage ✅ tick karte jao. Kahi atko to us step ka naam + error ka text mujhe bhejo.

---

# 📌 POORA MAP (pehle ye samjho — 5 boxes, bas itna hi hai)

```
[1] GOOGLE CLOUD  ──► bot (service account) + uski KEY file (JSON)
        │
[2] GOOGLE SHEET  ──► "ReelVault_Master" + bot ko Editor access
        │
[3] GOOGLE DRIVE  ──► "ReelVault" folder + bot ko Editor access
        │
[4] RENDER        ──► backend yahan chalega (code GitHub se, key Secret File se)
        │
[5] GITHUB PAGES  ──► frontend (dashboard) yahan host hoga
        │
     PHONE 💚 app install → link paste → SAB AUTOMATIC
```

**3 cheezein collect karni hain shuru mein:**
1. **Key file (JSON)** — Google Cloud se download hogi (Step 1)
2. **SHEET_ID** — sheet ke URL se (Step 2)
3. **DRIVE_FOLDER_ID** — folder ke URL se (Step 3)

---

# STEP 1 — Google Cloud Project + Key File (10 min)

Matlab: Google ko bolte hain "mera ek robot (bot) hai jo meri sheet/drive use karega" — aur us robot ki **chabhi (key file)** download karte hain.

1. [ ] `console.cloud.google.com` kholo (apni Gmail se login)
2. [ ] Upar top bar mein project ka naam dikh raha hoga (jaise "My First Project") → uspe click → **New Project**
3. [ ] Name: `reelvault` → **Create** → 10-20 sec ruko → phir upar se `reelvault` project SELECT kar lena (zaroori!)
4. [ ] Left side hamburger menu ☰ → **APIs & Services** → **Library**
5. [ ] Search box mein likho: `Google Drive API` → uspe click → **ENABLE** ✅
6. [ ] Wapas Library → search: `Google Sheets API` → **ENABLE** ✅
7. [ ] Left menu → **APIs & Services** → **Credentials**
8. [ ] Upar **+ Create Credentials** → **Service Account**
9. [ ] Service account name: `reelvault-bot` → **CREATE AND CONTINUE**
10. [ ] Role puche to **skip** kar do (koi role nahi chahiye) → **CONTINUE** → **DONE**
11. [ ] Neeche "Service Accounts" list mein `reelvault-bot@...` dikh raha hoga → uspe **click**
12. [ ] Upar tabs mein **KEYS** → **Add Key → Create new key → JSON** → **CREATE**
    - ⬇ Ek file download hogi: `reelvault-xxxxx-abc123.json` — **YE HAI KEY FILE. Isko safe jagah rakho. Kisi ko mat do. GitHub pe mat daalo.**
13. [ ] Us JSON file ko Notepad/TextEdit mein kholo → andar ek line dikh rahi hogi:
    `"client_email": "reelvault-bot@reelvault.iam.gserviceaccount.com"`
    - **Ye email copy karke kahin note kar lo** — agle 2 steps mein chahiye

---

# STEP 2 — Google Sheet (4 min)

1. [ ] [sheets.google.com](https://sheets.google.com) → **Blank** sheet kholo
2. [ ] Upar left "Untitled spreadsheet" pe click → naam likho: **`ReelVault_Master`** → Enter
3. [ ] Sheet ke URL ko dekho:
   ```
   https://docs.google.com/spreadsheets/d/1Ab2Cd3Ef4Gh5Ij6Kl7Mn/edit#gid=0
                                         └─── YE POORA PART = SHEET_ID ───┘
   ```
   Beech wala lamba code copy karke note kar lo = **SHEET_ID** ✅
4. [ ] **Share** (green button upar right) → Step 1.13 wali **client_email** paste karo → dropdown se **Editor** select → **Send/Done**
   - ⚠️ **Ye SABSE IMPORTANT step hai** — bot ko sheet ka access yahi deta hai. Miss kiya to "permission" error aayega.
5. [ ] Aur KUCH mat karo — tabs/columns/headers **backend khud bana dega** pehli baar chalne pe! 🪄

---

# STEP 3 — Google Drive Folder (3 min)

1. [ ] [drive.google.com](https://drive.google.com) → **+ New** → **Folder** → naam: **`ReelVault`**
2. [ ] Folder pe double-click → andar jao → URL dekho:
   ```
   https://drive.google.com/drive/folders/1Xy7Zab8Cd9Ef
                                          └── YE PART = DRIVE_FOLDER_ID ──┘
   ```
   Copy karke note kar lo = **DRIVE_FOLDER_ID** ✅
3. [ ] Wapas My Drive mein jao → `ReelVault` folder pe **right-click → Share → Share**
4. [ ] Wahi **client_email** paste → **Editor** → **Send** ✅
5. [ ] Andar koi folder MAT banao — 6 folders (01_High, 02_Medium...) backend auto-create karega

---

# STEP 4 — NVIDIA NIM Key (OPTIONAL — 4 min; skip kar sakte ho)

Ye sirf AI auto-tagging ke liye hai (caption padh ke topic/tags suggest karta hai). Bina iske bhi app 100% chalega.

1. [ ] [build.nvidia.com](https://build.nvidia.com) → **Login/Sign up** (free)
2. [ ] Kisi bhi model ka card kholo (jaise **Llama 3.1 8B Instruct**)
3. [ ] **Get API Key** / **Generate Key** button → key copy kar lo (`nvapi-...` se shuru hoti hai) = **NIM_API_KEY**

---

# STEP 5 — GitHub Pe Code Push (6 min)

1. [ ] [github.com](https://github.com) → **New repository** → naam: `reelvault` → **Private** rakho ✅ → Create
2. [ ] ZIP extract karke dono folders ready rakho. Terminal/CMD kholkar:
   ```bash
   cd <jahan ZIP extract kiya>
   git init
   git add .
   git commit -m "ReelVault v1 — frontend + backend"
   git branch -M main
   git remote add origin https://github.com/<TUMHARA-USERNAME>/reelvault.git
   git push -u origin main
   ```
   - Username/password maange to GitHub login kar lena (ya GitHub Desktop app use karo — drag-drop easier)
3. [ ] Repo mein ye hona chahiye:
   ```
   reelvault/            ← frontend folder
   reelvault-backend/    ← backend folder
   index.html            ← root redirect (ZIP mein already hai)
   README.md
   ```
   ⚠️ **KEY FILE (JSON) GITHUB PE MAT DAALNA** — wo sirf Render pe jayegi (next step)

---

# STEP 6 — Backend: Render Deploy (8 min) ⭐

1. [ ] [render.com](https://render.com) → **Sign up with GitHub** → repo access do
2. [ ] **New + → Web Service** → apna `reelvault` repo select karo → **Connect**
3. [ ] Form bharo:
   | Field | Value |
   |---|---|
   | Name | `reelvault-api` |
   | **Root Directory** | `reelvault-backend` ← (ye mat bhoolna!) |
   | Runtime | `Node` |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Instance Type | **Free** |
4. [ ] Neeche **Environment Variables** section mein **Add Environment Variable** se ye 5 daalo:

   | Key | Value | Kahan se |
   |---|---|---|
   | `SHEET_ID` | Step 2.3 wala | sheet URL |
   | `DRIVE_FOLDER_ID` | Step 3.2 wala | folder URL |
   | `APP_PASSCODE` | apna 4-digit code | khud socho (e.g. `4782`) |
   | `FRONTEND_URL` | `https://<TUMHARA-USERNAME>.github.io` | tumhara GitHub username |
   | `NIM_API_KEY` | Step 4 wala (optional — khali chhod sakte ho) | build.nvidia.com |

5. [ ] **🔑 KEY FILE kaise den (BASE64 KI ZAROORAT NAHI — naya easy tareeka):**
   - Usi Environment section mein **"Secret Files"** wala block dhundo → **"Add Secret File"**
   - **Filename:** `key.json`  ← bilkul yahi naam
   - **Contents:** apni downloaded JSON file Notepad mein kholkar **Ctrl+A → Ctrl+C** → yahan **paste** (ya upload option ho to file hi upload kar do)
   - **Save.** Bas. Backend isko khud `/etc/secrets/key.json` se padh lega.
   - (Base64 wala tareeka ab chahiye hi nahi — code dono handle karta hai, par file upload sabse aasaan hai)

6. [ ] **Create Web Service** → deploy shuru hoga (2-4 min). Jab **"Live"** 🟢 dikhe:
   - Upar URL milega: `https://reelvault-api-xxxx.onrender.com` → **copy kar lo**
7. [ ] **TEST:** Browser mein kholo → `https://reelvault-api-xxxx.onrender.com/api/health`
   - ✅ Sahi output: `{"ok":true,"awake":true,...,"sheet":"ok"}`
   - ❌ `"sheet":"error: ...permission..."` → Step 2.4 / 3.4 (Editor access) miss hua — wahi fix karo
8. [ ] Render → **Logs** tab mein dekho: `"Sheet structure verified ✓"` likha aaya?
   - Haan → tumhari Google Sheet kholo — 5 tabs + headers **apne aap ban chuke honge!** 🔥

---

# STEP 7 — Frontend: GitHub Pages (4 min)

1. [ ] Repo → **Settings** → left mein **Pages**
2. [ ] Source: **Deploy from a branch** → Branch: `main` → folder: `/ (root)` → **Save**
3. [ ] 1-2 min ruko → page refresh → upar green box mein URL:
   `https://<USERNAME>.github.io/reelvault/`
   - (Root `index.html` redirect karega → dashboard `.../reelvault/reelvault/` pe khulega)
4. [ ] Dashboard kholo → **Passcode 1234** (demo wala) → **Settings** page jao
5. [ ] **Backend Connection** box mein:
   - Backend URL: Step 6.6 wali Render URL paste karo
   - Passcode: Step 6.4 wala `APP_PASSCODE` (e.g. 4782)
   - **Save & Connect** dabao
6. [ ] Pehli baar 30-50 sec lag sakta hai (backend "so raha" hota hai, jaagta hai — normal hai)
7. [ ] Upar chip **DEMO MODE → LIVE** 🟢 ho gaya? → **CONGRATS, SAB LIVE HAI!** 🎉

---

# STEP 8 — Phone Pe App (2 min)

**Android:** Chrome mein tumhari site kholo → ⋮ menu → **Add to Home screen** → **Install**
**iPhone:** Safari → Share → **Add to Home Screen**

**Ab DAILY USE:**
`Reel achhi lagi → Share → Copy Link → ReelVault app kholo → paste → ADD VIDEO → 🟢 Bas!`
Backend khud: download → Drive ke sahi folder → Sheet entry → dashboard update.

---

# 🛠 PROBLEM-FIX TABLE (jo sabse zyada hoti hai)

| Naam/Error | Wajah | Fix |
|---|---|---|
| `"caller does not have permission"` | Bot ko Sheet/Drive access nahi | client_email ko dono jagah **Editor** banao (Step 2.4, 3.4) |
| `"Google key nahi mili"` | Secret File upload nahi hui / naam galat | Render Secret File ka naam exactly `key.json` hona chahiye |
| `"DECODER routines"` / key error | JSON paste karte waqt cut ho gayi | Puri file dobara copy-paste karo — starting `{` se ending `}` tak |
| Site khuli par `not found` | GitHub Pages abhi build ho raha | 2-3 min ruko, refresh |
| Pehli request 30-50 sec slow | Render free sleep-wake | **Normal hai.** Roz pehla use slow, baad mein fast |
| `Private account — login required` | Instagram ne block kiya | Wo reel private hai; cookies wala option baad mein lagayenge |
| CORS error console mein | FRONTEND_URL galat | Render env mein exact URL: `https://username.github.io` (aage `/` NAHI) |
| Dashboard LIVE nahi ho raha | Passcode mismatch | Settings mein wahi code jo `APP_PASSCODE` mein dala |

---

# ✅ FINAL CHECKLIST (sab tick ho to LIVE hai)

- [ ] Google Cloud project `reelvault` + 2 APIs enabled + key file downloaded
- [ ] Sheet `ReelVault_Master` + bot ko **Editor**
- [ ] Drive folder `ReelVault` + bot ko **Editor**
- [ ] Render deploy **Live 🟢** + `/api/health` mein `"sheet":"ok"`
- [ ] Sheet mein 5 tabs apne aap bane
- [ ] GitHub Pages site khul rahi hai
- [ ] Settings mein backend connect → chip **LIVE**
- [ ] Ek test link se video add karke dekha → Drive mein file + Sheet mein row ✅

**Bas! Ab tumhara apna automatic video-vault zinda hai. 🚀**

---

## 🍪 COOKIES LAGANA (Download ka PERMANENT FIX) — 10 minute, sirf ek baar

**Kyun?** Instagram/YouTube cloud servers (Render) ke IP address ko "bot" samajh kar video download rok dete hain. Cookies ka matlab: "main asli logged-in insaan hoon" ka saboot. Cookies lagate hi dono platform download karne lagenge.

### Step A — Extension lagao (1 min)
1. PC pe **Chrome/Edge** kholo.
2. Chrome Web Store mein jao, search karo: **"Get cookies.txt LOCALLY"** (purple icon wali, made by "ccoreil" / Rahul Shaw — 5 lakh+ users). Ya seedha ye likho address mein: `chrome web store get cookies.txt locally`
3. **Add to Chrome** dabao → **Add extension** confirm.

### Step B — Instagram pe login + export (2 min)
1. Naye tab mein **instagram.com** kholo → apne account se **log in** karo (agar pehle se logged in ho toh bhi chalega).
2. Usi Instagram tab pe rehte hue, upar-right **puzzle icon 🧩 (Extensions)** dabao → **"Get cookies.txt LOCALLY"** pe click.
3. **Export** / **Download** button dabao → ek file download hogi: `instagram.com_cookies.txt`.

### Step C — Render pe paste karo (3 min)
1. Downloaded file ko **Notepad** mein kholo (file pe right-click → Open with → Notepad).
2. **Ctrl + A** (sab select) → **Ctrl + C** (copy).
3. **render.com → reelvault (tumhara Web Service) → Environment** tab.
4. **Add Environment Variable** dabao:
   - **Key**: `IG_COOKIES_TXT`
   - **Value**: **Ctrl + V** se poora content paste karo (multiline chalega — chinta mat karo).
5. **Save Changes** dabao → Render khud **redeploy** shuru kar dega (2–3 min ruko).

### Step D — Test karo (1 min)
1. App kholo → **Settings → ▶ Run self-test** → ab **PASS** dikhna chahiye + `cookies: true (IG_COOKIES_TXT)`.
2. Failed videos pe **Retry** dabao (ya AI chat mein bolo "retry karo") → Done hote dikhenge. ✅

### FAQs
- **YouTube videos bhi fail ho rahe?** Wahi process **youtube.com** pe login karke dohrao — nikalne wali file ka content Notepad mein Instagram wale ke **neeche jod do (append)**, phir dono ka mila content ek saath `IG_COOKIES_TXT` mein paste karo. (Header line `# Netscape HTTP Cookie File...` sirf ek baar upar rahe — doosri file ki header hata dena.)
- **Cookies kitne din chalti hain?** Instagram ki cookies hafton-chale; agar kabhi phir "login required" aane lage toh Step B–C dohra do (fresh export → paste → save).
- **Khatra?** Ye cookies sirf tumhare apne Render server pe rehti hain — par phir bhi kisi ko mat bhejna. Apna kaam ho jaye toh chaaho toh Instagram mein kuch nahi karna — cookies mein password hota hi nahi.
