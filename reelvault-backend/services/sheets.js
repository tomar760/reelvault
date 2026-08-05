/* ReelVault — Google Sheets service (Videos / Workflows_Vault / Failed_Log / Lists_Settings) */
const { clients } = require("./google");
const { CFG, COLS, TOPICS, RATINGS, PLATFORMS } = require("../config");

const sheet = () => clients().sheets;

/* ---------- generic helpers ---------- */
async function getRange(range) {
  const res = await sheet().spreadsheets.values.get({ spreadsheetId: CFG.SHEET_ID, range });
  return res.data.values || [];
}
async function updateRange(range, values) {
  await sheet().spreadsheets.values.update({
    spreadsheetId: CFG.SHEET_ID, range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}
async function appendRows(tab, rows) {
  await sheet().spreadsheets.values.append({
    spreadsheetId: CFG.SHEET_ID, range: `${tab}!A2`,
    valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

/* ---------- one-time structure check ---------- */
async function ensureStructure() {
  const meta = await sheet().spreadsheets.get({ spreadsheetId: CFG.SHEET_ID });
  const tabs = meta.data.sheets.map((s) => s.properties.title);
  const want = ["Videos", "Workflows_Vault", "Summary_Dashboard", "Failed_Log", "Lists_Settings"];
  const missing = want.filter((t) => !tabs.includes(t));
  if (missing.length) {
    await sheet().spreadsheets.batchUpdate({
      spreadsheetId: CFG.SHEET_ID,
      requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
    });
  }
  const vHead = await getRange("Videos!A1:W1");
  if (!vHead.length || vHead[0][0] !== "Sr_No") await updateRange("Videos!A1:W1", [COLS]);
  const wHead = await getRange("Workflows_Vault!A1:I1");
  if (!wHead.length) await updateRange("Workflows_Vault!A1:I1", [[
    "Vault_ID","Date","Resource_Name","Type","Source_Video_SrNo","Influencer","Resource_Link","Message_Text","Used_It",
  ]]);
  const fHead = await getRange("Failed_Log!A1:G1");
  if (!fHead.length) await updateRange("Failed_Log!A1:G1", [[
    "Log_ID","Videos_SrNo","Fail_DateTime","Fail_Stage","Error_Message","Retry_Count","Resolved",
  ]]);  const lists = await getRange("Lists_Settings!A1:D50");
  if (!lists.length) {
    const rows = [["TOPIC_LIST", "RATING_LIST", "PLATFORM_LIST", "STATUS_LIST"]];
    const max = Math.max(TOPICS.length, RATINGS.length, PLATFORMS.length, 4);
    for (let i = 0; i < max; i++) {
      rows.push([
        TOPICS[i] ? TOPICS[i].label : "",
        RATINGS[i] ? RATINGS[i].label : "",
        PLATFORMS[i] || "",
        ["Done","Failed","Pending","Retrying"][i] || "",
      ]);
    }
    await updateRange(`Lists_Settings!A1:D${rows.length}`, rows);
  }
}

/* ---------- videos table ---------- */
function rowToVideo(row) {
  const o = {};
  COLS.forEach((c, i) => (o[c] = row[i] ?? ""));
  return o;
}
async function readVideos() {
  const rows = await getRange("Videos!A2:W50000");
  return rows.filter((r) => r[0]).map(rowToVideo);
}
async function nextSrNo() {
  const col = await getRange("Videos!A2:A50000");
  let max = 0;
  col.forEach((r) => { const n = parseInt(r[0], 10); if (!isNaN(n) && n > max) max = n; });
  return String(max + 1); // unpadded — Sheet USER_ENTERED numbers ke saath hamesha match
}
/* Sr_No Sheet mein number ban jaata hai ("0002" → 2) — isliye compare numeric-tolerant */
async function findRowIndexBySr(sr) {
  const col = await getRange("Videos!A2:A50000");
  const want = String(sr ?? "").trim();
  const wantN = parseInt(want, 10);
  for (let i = 0; i < col.length; i++) {
    const got = String(col[i] && col[i][0] != null ? col[i][0] : "").trim();
    if (!got) continue;
    if (got === want) return i + 2; // 1-based + header
    if (!isNaN(wantN) && parseInt(got, 10) === wantN) return i + 2;
  }
  return -1;
}
async function addVideoRow(values) { await appendRows("Videos", [values]); }
/* rowIndex gum ho/delete ho gaya ho to CRASH kabhi nahi — nayi row append kar do */
async function updateVideoRow(rowIndex, values) {
  if (!rowIndex || rowIndex < 2) {
    console.warn("updateVideoRow: row missing (deleted?) — appending a fresh row instead");
    await appendRows("Videos", [values]);
    return;
  }
  await updateRange(`Videos!A${rowIndex}:W${rowIndex}`, [values]);
}
async function videoToRow(v) {
  return COLS.map((c) => v[c] ?? "");
}
function buildVideoObject(patch) {
  const o = {}; COLS.forEach((c) => (o[c] = patch[c] ?? "")); return o;
}

/* ---------- vault ---------- */
async function addVaultRow(w) {
  const col = await getRange("Workflows_Vault!A2:A5000");
  const id = "W" + String(col.length + 1).padStart(3, "0");
  await appendRows("Workflows_Vault", [[
    id, w.date, w.name, w.type, w.srcSr, w.influencer, w.link, w.message, w.used ? "Yes" : "No",
  ]]);
  return id;
}
async function readVault() {
  const rows = await getRange("Workflows_Vault!A2:I5000");
  return rows.filter((r) => r[0]).map((r) => ({
    id: r[0], date: r[1] || "", name: r[2] || "", type: r[3] || "", srcSr: r[4] || "",
    influencer: r[5] || "", link: r[6] || "", message: r[7] || "", used: (r[8] || "") === "Yes",
  }));
}

/* ---------- failed log ---------- */
async function logFailure(sr, stage, err, retryCount) {
  const col = await getRange("Failed_Log!A2:A5000");
  const id = "F" + String(col.length + 1).padStart(4, "0");
  const { todayParts } = require("../config");
  const t = todayParts();
  await appendRows("Failed_Log", [[id, sr, `${t.dateSheet} ${t.time}`, stage, String(err).slice(0, 180), String(retryCount), "No"]]);
}
/* read the FAILED LOG — newest first. This is where REAL error reasons live. */
async function readFailures(limit = 25) {
  const rows = await getRange("Failed_Log!A2:G5000");
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0], sr: r[1] || "", ts: r[2] || "", stage: r[3] || "",
      error: r[4] || "", retries: parseInt(r[5] || "0", 10) || 0, resolved: (r[6] || "") === "Yes",
    }))
    .reverse()
    .slice(0, limit);
}

/* ---------- lists ---------- */
async function readLists() {
  const rows = await getRange("Lists_Settings!A2:D100");
  const topics = [], ratings = [], platforms = [];
  rows.forEach((r) => { if (r[0]) topics.push(r[0]); if (r[1]) ratings.push(r[1]); if (r[2]) platforms.push(r[2]); });
  return { topics, ratings, platforms };
}
async function addTopic(label) {
  const lists = await readLists();
  if (lists.topics.includes(label)) return false;
  await updateRange(`Lists_Settings!A${lists.topics.length + 2}`, [[label]]);
  return true;
}

module.exports = {
  ensureStructure, readVideos, nextSrNo, findRowIndexBySr,
  addVideoRow, updateVideoRow, videoToRow, buildVideoObject,
  addVaultRow, readVault, logFailure, readFailures, readLists, addTopic,
};
