# ReelVault — Final v3 (Mobile-First + Colourful Excel)

## Folders
- `reelvault/` → Frontend (GitHub Pages par jata hai)
- `reelvault-backend/` → Backend (Render par jata hai — GitHub repo se auto-deploy)

## Update karne ka short tareeka
1. ZIP extract karo.
2. `reelvault/js/config.js` kholo → apna Render URL daalo:
   `BACKEND_URL: "https://aapka-app.onrender.com"` (sirf EK baar — iske baad har phone apne-aap connect hoga)
3. Dono folders apne GitHub repo mein upload/replace karo → commit.
4. Render backend apne-aap redeploy hoga (2-3 min), GitHub Pages frontend apne-aap update hoga (1-2 min).
5. Phone mein site kholo → sirf passcode daalo. Bas. URL kabhi dobara nahi mangna.

## Is version mein kya naya hai
- Bilkul naya unique design (Plum Night × Neon Candy, Unbounded + Outfit fonts)
- Phone-first layout — bottom sheet modals, bade touch targets, paste buttons, pull-to-refresh
- Colourful Excel export (3 sheets, colored headers, status/rating colors, clickable links, auto-filter)
- Demo data hata diya — sirf aapka real data dikhega
- Service worker cache v3 — purana design phone mein atka nahi rahega
