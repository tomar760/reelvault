/* ReelVault — Google clients (service account from GOOGLE_KEY_BASE64) */
const { google } = require("googleapis");

let _clients = null;

function clients() {
  if (_clients) return _clients;
  const b64 = process.env.GOOGLE_KEY_BASE64 || "";
  if (!b64) throw new Error("GOOGLE_KEY_BASE64 is not set");
  let key;
  try {
    key = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch (e) {
    throw new Error("GOOGLE_KEY_BASE64 is not valid base64 JSON");
  }
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
