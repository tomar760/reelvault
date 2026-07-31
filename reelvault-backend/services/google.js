/* ReelVault — Google clients (service account)
   Key load karne ke 4 tareeke (jo pehle mile, wahi use hoga):
   1) GOOGLE_KEY_FILE      → file ka path (Render Secret File)
   2) /etc/secrets/key.json→ Render Secret File ka default path
   3) GOOGLE_KEY_JSON      → JSON ka content as-is paste (single variable)
   4) GOOGLE_KEY_BASE64    → base64 string (old method) */
const fs = require("fs");
const { google } = require("googleapis");

let _clients = null;

function loadKey() {
  // (1,2) — FILE based (SABSE EASY: Render pe Secret File upload kar do)
  const fileCandidates = [
    process.env.GOOGLE_KEY_FILE,
    "/etc/secrets/key.json",
    "/etc/secrets/service-account.json",
    "/etc/secrets/credentials.json",
  ].filter(Boolean);
  for (const p of fileCandidates) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) { /* try next */ }
  }
  // (3) — raw JSON paste in one variable
  if (process.env.GOOGLE_KEY_JSON) {
    try { return JSON.parse(process.env.GOOGLE_KEY_JSON); }
    catch (e) { throw new Error("GOOGLE_KEY_JSON is not valid JSON"); }
  }
  // (4) — base64 encoded JSON
  if (process.env.GOOGLE_KEY_BASE64) {
    try { return JSON.parse(Buffer.from(process.env.GOOGLE_KEY_BASE64, "base64").toString("utf8")); }
    catch (e) { throw new Error("GOOGLE_KEY_BASE64 is not valid base64 JSON"); }
  }
  throw new Error(
    "Google key nahi mili! Render pe Secret File 'key.json' upload karo " +
    "(ya GOOGLE_KEY_JSON / GOOGLE_KEY_BASE64 set karo)."
  );
}

function clients() {
  if (_clients) return _clients;
  const key = loadKey();
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
  _clients = {
    drive: google.drive({ version: "v3", auth }),
    sheets: google.sheets({ version: "v4", auth }),
    email: key.client_email,
  };
  return _clients;
}

module.exports = { clients };
