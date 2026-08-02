/* ReelVault Backend — CONFIG */
require("dotenv").config();

const CFG = {
  PORT: process.env.PORT || 3000,
  SHEET_ID: process.env.SHEET_ID || "",
  DRIVE_ROOT: process.env.DRIVE_FOLDER_ID || "",
  NIM_KEY: process.env.NIM_API_KEY || "",
  PASSCODE: process.env.APP_PASSCODE || "1234",
  FRONTEND_URL: (process.env.FRONTEND_URL || "").replace(/\/$/, ""),
  RETRY_GAP_MIN: +(process.env.RETRY_GAP_MIN || 5),
  RETRY_MAX: 3,
  MAX_FILE_MB: 700,
  /* Drive upload as the USER (Google 2025: service accounts can't upload) */
  OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
  OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
  OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "",
};

/* Must match the frontend (js/data.js) + SOP sections 6 & 7 */
const TOPICS = [
  { label: "Tech & n8n Workflows", color: "#1f6feb" },
  { label: "AI Tools", color: "#8250df" },
  { label: "Business & Marketing", color: "#bf7500" },
  { label: "Finance & Money", color: "#2da44e" },
  { label: "Fitness & Health", color: "#d1242f" },
  { label: "Misc / Other", color: "#57606a" },
];
const RATINGS = [
  { label: "Very Useful", importance: "High",   folder: "01_High_Importance"   },
  { label: "Useful",      importance: "Medium", folder: "02_Medium_Importance" },
  { label: "Average",     importance: "Low",    folder: "03_Low_Importance"    },
];
const SPECIAL_FOLDERS = ["04_Workflows_Resources", "05_Pending_Review", "06_Failed_Retry"];
const PLATFORMS = ["Instagram", "Facebook", "YouTube", "X", "Other"];
const PLATFORM_CODES = { Instagram: "IG", Facebook: "FB", YouTube: "YT", X: "X", Other: "OT" };

/* Videos tab columns A–W (SOP 7.2 — order is sacred) */
const COLS = [
  "Sr_No","Date_Added","Time_Added","Video_Title","Platform","Original_Link","Topic","Rating",
  "Importance","Drive_Folder_Path","File_Name","Drive_File_Link","Download_Status","File_Size_MB",
  "Duration_Sec","Thumbnail_Link","Workflow_Received","Remarks_Message","Tags","Added_From",
  "Last_Modified","Duplicate_Flag","Notes",
];

const slug = (s) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");

function todayParts(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return {
    dateISO: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    dateSheet: `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
    stamp: `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

module.exports = { CFG, TOPICS, RATINGS, SPECIAL_FOLDERS, PLATFORMS, PLATFORM_CODES, COLS, slug, todayParts };
