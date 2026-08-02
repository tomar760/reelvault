/* ReelVault — API ROUTES (SOP Section 10.1) */
const express = require("express");
const { CFG, RATINGS, TOPICS, slug, todayParts } = require("../config");
const sheets = require("../services/sheets");
const driveSvc = require("../services/drive");
const queue = require("../services/queue");
const nim = require("../services/nim");

const r = express.Router();

/* ---------- mappings sheet <-> frontend ---------- */
const t2k = {
  "Tech & n8n Workflows": "tech", "AI Tools": "ai", "Business & Marketing": "business",
  "Finance & Money": "finance", "Fitness & Health": "fitness", "Misc / Other": "misc",
};
const k2t = Object.fromEntries(Object.entries(t2k).map(([a, b]) => [b, a]));
const r2k = { "Very Useful": "high", "Useful": "medium", "Average": "low" };

function sheetToJSON(v) {
  const [dd, mm, yy] = (v.Date_Added || "").split("-");
  return {
    sr: v.Sr_No,
    date: yy ? `${yy}-${mm}-${dd}` : (v.Date_Added || ""),
    time: v.Time_Added || "",
    title: v.Video_Title || "",
    platform: v.Platform || "Other",
    link: v.Original_Link || "",
    topicKey: t2k[v.Topic] || "misc",
    topicLabel: v.Topic,
    ratingKey: r2k[v.Rating] || "medium",
    status: v.Download_Status || "Done",
    size: parseFloat(v.File_Size_MB) || 0,
    duration: parseInt(v.Duration_Sec, 10) || 0,
    workflow: v.Workflow_Received === "Yes",
    remarks: v.Remarks_Message || "",
    tags: (v.Tags || "").split(",").map((x) => x.trim()).filter(Boolean),
    src: v.Added_From || "Dashboard",
    modified: v.Last_Modified || null,
    dup: v.Duplicate_Flag === "Yes",
    notes: v.Notes || "",
    importance: v.Importance || "",
    folderPath: v.Drive_Folder_Path || "",
    fileName: v.File_Name || "",
    driveLink: v.Drive_File_Link || "",
    thumb: v.Thumbnail_Link || "",
    failReason: v.Notes || "",
    retryCount: 0,
  };
}

const fail = (res, e, code = 500) => {
  console.error(e.message || e);
  res.status(code).json({ ok: false, error: (e.message || String(e)).slice(0, 200) });
};

/* ---------- health (public) ---------- */
r.get("/api/health", async (req, res) => {
  let sheet = "unknown";
  try { await sheets.readLists(); sheet = "ok"; } catch (e) { sheet = "error: " + e.message.slice(0, 80); }
  res.json({ ok: true, awake: true, ts: Date.now(), queue: queue.queueLength(), sheet });
});

/* ---------- verify passcode (public — lock screen uses this) ---------- */
r.post("/api/verify", async (req, res) => {
  const code = (req.body || {}).code;
  if (code === CFG.PASSCODE) return res.json({ ok: true });
  await new Promise((s) => setTimeout(s, 400)); // slow down guessing
  res.json({ ok: false });
});

/* ---------- AI usage stats ---------- */
r.get("/api/aistats", async (_req, res) => {
  try {
    const s = nim.stats();
    res.json({
      ok: true,
      mode: s.configured ? "NVIDIA NIM (Llama 3.1 · free tier)" : "Not configured — add NIM_API_KEY on Render",
      model: s.model,
      configured: s.configured,
      callsTotal: s.total,
      callsChat: s.chat,
      callsTagging: s.tag,
      errors: s.errors,
      lastError: s.lastError || "",
      countingSince: s.since,
      note: "Counts reset when the server redeploys/restarts.",
    });
  } catch (e) { fail(res, e); }
});

/* ---------- download self-test + diagnostics (waqf download fail ho toh) ---------- */
r.get("/api/diag", async (_req, res) => {
  try {
    const dl = require("../services/downloader");
    const p = await dl.probe();
    let driveMode = "unknown", oauthCheck = null, oauthEnv = null;
    try {
      driveMode = require("../services/google").driveClient().mode;
      if (driveMode === "oauth-user") {
        const { google } = require("googleapis");
        const o = new google.auth.OAuth2(CFG.OAUTH_CLIENT_ID, CFG.OAUTH_CLIENT_SECRET);
        o.setCredentials({ refresh_token: CFG.OAUTH_REFRESH_TOKEN });
        /* masked fingerprints — sirf shuru/aakhir ke characters (paste galti pakadne ke liye) */
        const mask = (s, a, b) => (s && s.length > a + b ? `${s.slice(0, a)}…${s.slice(-b)}` : "(too short)");
        oauthEnv = {
          clientIdEnds: (CFG.OAUTH_CLIENT_ID || "").slice(-27), // hona chahiye: …apps.googleusercontent.com
          secretStarts: (CFG.OAUTH_CLIENT_SECRET || "").slice(0, 7),  // hona chahiye: GOCSPX-
          refreshStarts: (CFG.OAUTH_REFRESH_TOKEN || "").slice(0, 4), // hona chahiye: 1//
          maskNote: mask(CFG.OAUTH_REFRESH_TOKEN, 3, 4),
        };
        try {
          await o.getAccessToken(); // asli refresh try — Google ka exact jawab
          oauthCheck = { ok: true };
        } catch (e) {
          const d = (e.response && e.response.data) || {};
          oauthCheck = {
            ok: false,
            error: d.error || e.message.slice(0, 60),
            detail: (d.error_description || "").slice(0, 160),
            meaning: /invalid_client/.test(d.error || "")
              ? "Client ID ya Client Secret galat hai"
              : /unauthorized_client/.test(d.error || "")
                ? "Client SECRET galat/mismatch hai — Cloud Console → Credentials → ReelVault Web → secret RESET karke naya paste karo"
                : /invalid_grant/.test(d.error || "")
                  ? "Refresh token galat/revoked hai — ya Playground mein 'Use your own OAuth credentials' tick nahi tha"
                  : "network/other — dobara try karo",
          };
        }
      }
    } catch (e) { driveMode = "error: " + e.message.slice(0, 80); }
    res.json({
      ok: true, ...dl.diagInfo(), nimConfigured: !!CFG.NIM_KEY, probe: p,
      driveMode, oauthCheck, oauthEnv,
      driveHint: driveMode === "oauth-user"
        ? "Uploads tumhaare apne account + 15GB se honge ✓"
        : "Google (2025) service-account uploads BLOCK karta hai — 3 OAuth vars set karo (guide: DRIVE OAUTH chapter)",
      time: new Date().toISOString(),
    });
  } catch (e) { fail(res, e); }
});

/* ---------- AI chat (dashboard chatbot) ---------- */
r.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ ok: false, error: "messages[] required" });
    let ctx = "";
    try {
      const vs = await sheets.readVideos();
      const doneArr = vs.filter((x) => x.Download_Status === "Done");
      const usedGB = doneArr.reduce((s, x) => s + (parseFloat(x.File_Size_MB) || 0), 0) / 1024;
      const fails = await sheets.readFailures(6).catch(() => []);
      const failLines = fails.map((f) => `• Sr ${f.sr} — [${f.stage}] ${f.error} (${f.ts})`).join("\n");
      ctx = [
        `Total videos saved: ${vs.length}, Done: ${doneArr.length}, Failed: ${vs.filter((x) => x.Download_Status === "Failed").length}, Pending: ${vs.filter((x) => x.Download_Status === "Pending").length}.`,
        `Google Drive storage: ${usedGB.toFixed(1)} GB used out of 15 GB free — storage is ${usedGB < 13 ? "NOT full (plenty free)" : "ALMOST FULL"}.`,
        fails.length
          ? `REAL failure reasons from Failed_Log (quote these exactly, never invent other reasons):\n${failLines}`
          : "Failed_Log is empty — no recorded failure reasons.",
      ].join("\n");
    } catch {}
    const reply = await nim.chat(messages, ctx);
    if (!reply) return res.json({ ok: true, reply: null, fallback: true });
    res.json({ ok: true, reply });
  } catch (e) { fail(res, e); }
});

/* ---------- add video ---------- */
r.post("/api/add", async (req, res) => {
  try {
    const { link, topicKey, ratingKey, wf, msg, resName, resType, influencer, src } = req.body || {};
    if (!link || !/^https?:\/\/.+\..+/.test(link)) return fail(res, new Error("That link does not look right"), 400);
    const jobId = queue.enqueue({
      link, topicLabel: k2t[topicKey] || topicKey || "Misc / Other",
      ratingKey: ratingKey || "high", wf: !!wf,
      msg: msg || "", resName: resName || "", resType: resType || "link",
      influencer: influencer || "", src: src || "Dashboard",
    });
    res.json({ ok: true, jobId });
  } catch (e) { fail(res, e); }
});

/* ---------- job status ---------- */
r.get("/api/status/:jobId", (req, res) => {
  const j = queue.getJob(req.params.jobId);
  if (!j) return res.status(404).json({ ok: false, error: "job not found" });
  res.json({ ok: true, job: j });
});

/* ---------- failed log (REAL reasons — AI/chat/dashboard read these) ---------- */
r.get("/api/failures", async (_req, res) => {
  try { res.json({ ok: true, failures: await sheets.readFailures(25) }); }
  catch (e) { fail(res, e); }
});

/* ---------- library ---------- */
r.get("/api/library", async (req, res) => {
  try {
    let vs = (await sheets.readVideos()).map(sheetToJSON).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    /* attach real failure reasons from Failed_Log where the row's Notes column is empty */
    try {
      const need = vs.some((v) => (v.status === "Failed" || v.status === "Retrying") && !v.failReason);
      if (need) {
        const logs = await sheets.readFailures(60); // newest first
        const bySr = {};
        logs.forEach((l) => { if (l.sr && !bySr[l.sr]) bySr[l.sr] = l; });
        vs = vs.map((v) => (v.failReason || !bySr[v.sr] ? v : { ...v, failReason: `[${bySr[v.sr].stage}] ${bySr[v.sr].error}`, retryCount: bySr[v.sr].retries }));
      }
    } catch (_) { /* log tab missing — rows just show blank reason */ }
    const { q, topic, rating, platform, status, wf } = req.query;
    if (q) { const s = q.toLowerCase(); vs = vs.filter((v) => [v.title, v.remarks, v.fileName, v.link, v.tags.join(" ")].join(" ").toLowerCase().includes(s)); }
    if (topic) vs = vs.filter((v) => v.topicKey === topic);
    if (rating) vs = vs.filter((v) => v.ratingKey === rating);
    if (platform) vs = vs.filter((v) => v.platform === platform);
    if (status) vs = vs.filter((v) => v.status === status);
    if (wf === "1") vs = vs.filter((v) => v.workflow);
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const size = Math.min(200, parseInt(req.query.size || "500", 10));
    res.json({ ok: true, total: vs.length, page, videos: vs.slice((page - 1) * size, page * size) });
  } catch (e) { fail(res, e); }
});

/* ---------- stats ---------- */
r.get("/api/stats", async (req, res) => {
  try {
    const vs = (await sheets.readVideos()).map(sheetToJSON);
    const wkAgo = Date.now() - 7 * 86400000;
    const vault = await sheets.readVault();
    res.json({
      ok: true,
      total: vs.length,
      week: vs.filter((v) => new Date(v.date).getTime() >= wkAgo).length,
      high: vs.filter((v) => v.ratingKey === "high").length,
      failed: vs.filter((v) => v.status === "Failed" || v.status === "Retrying").length,
      pending: vs.filter((v) => v.status === "Pending").length,
      workflows: vault.length,
      driveGB: +(vs.filter((v) => v.status === "Done").reduce((s, v) => s + v.size, 0) / 1024).toFixed(1),
    });
  } catch (e) { fail(res, e); }
});

/* ---------- vault ---------- */
r.get("/api/vault", async (req, res) => {
  try { res.json({ ok: true, vault: await sheets.readVault() }); }
  catch (e) { fail(res, e); }
});

/* ---------- lists ---------- */
r.get("/api/lists", async (req, res) => {
  try { res.json({ ok: true, ...(await sheets.readLists()) }); }
  catch (e) { fail(res, e); }
});

r.post("/api/lists/add-topic", async (req, res) => {
  try {
    const label = String((req.body || {}).label || "").trim();
    if (label.length < 2 || label.length > 40) return fail(res, new Error("topic name must be 2–40 chars"), 400);
    const added = await sheets.addTopic(label);
    if (added) {
      // pre-create subfolders under 3 importance folders
      const tree = await driveSvc.ensureTree((await sheets.readLists()).topics);
      res.json({ ok: true, added: true, folder: slug(label), tree: Object.keys(tree).length });
    } else res.json({ ok: true, added: false, note: "already exists" });
  } catch (e) { fail(res, e); }
});

/* ---------- export ---------- */
r.get("/api/export", async (req, res) => {
  try {
    const vs = (await sheets.readVideos()).map(sheetToJSON).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const vault = await sheets.readVault();
    res.json({ ok: true, videos: vs, vault });
  } catch (e) { fail(res, e); }
});

/* ---------- retry ---------- */
r.post("/api/retry/:srNo", async (req, res) => {
  try {
    const sr = req.params.srNo;
    const all = await sheets.readVideos();
    const v = all.find((x) => x.Sr_No === sr);
    if (!v) return fail(res, new Error("Sr. No. not found"), 404);
    if (v.Download_Status === "Done") return fail(res, new Error("already downloaded"), 400);
    const rowIndex = await sheets.findRowIndexBySr(sr);
    const jobId = queue.enqueue({
      link: v.Original_Link, topicLabel: v.Topic, ratingKey: r2k[v.Rating] || "medium",
      wf: v.Workflow_Received === "Yes", msg: v.Remarks_Message || "",
      sr, rowIndex, attempts: 1, src: "Retry",
    });
    res.json({ ok: true, jobId });
  } catch (e) { fail(res, e); }
});

/* ---------- edit (rating / topic / remarks) ---------- */
r.post("/api/edit/:srNo", async (req, res) => {
  try {
    const sr = req.params.srNo;
    const { ratingKey, topicKey, remarks } = req.body || {};
    const all = await sheets.readVideos();
    const v = all.find((x) => x.Sr_No === sr);
    if (!v) return fail(res, new Error("Sr. No. not found"), 404);
    const rowIndex = await sheets.findRowIndexBySr(sr);

    let moved = false;
    const newRating = ratingKey ? (RATINGS.find((x) => x.label === { high: "Very Useful", medium: "Useful", low: "Average" }[ratingKey]) || null) : null;
    const newTopic = topicKey ? (k2t[topicKey] || null) : null;

    if ((newRating || newTopic) && v.Download_Status === "Done") {
      const rating = newRating || RATINGS.find((x) => x.label === v.Rating) || RATINGS[0];
      const topic = newTopic || v.Topic;
      const folderKey = rating.folder;
      const tree = await driveSvc.ensureTree((await sheets.readLists()).topics);
      const target = tree[folderKey].subs[slug(topic)] || (await driveSvc.ensureFolder(tree[folderKey].id, slug(topic)));
      const fid = driveSvc.fileIdFromLink(v.Drive_File_Link);
      if (fid) {
        await driveSvc.moveFile(fid, target);
        const [dd, mm, yy] = (v.Date_Added || "").split("-");
        const p = (v.Platform || "Other");
        const code = { Instagram: "IG", Facebook: "FB", YouTube: "YT", X: "X" }[p] || "OT";
        const newName = `${yy}-${mm}-${dd}_${code}_${slug(topic)}_SrNo-${sr}.mp4`;
        await driveSvc.renameFile(fid, newName).catch(() => {});
        v.File_Name = newName;
        moved = true;
      }
      v.Drive_Folder_Path = `ReelVault/${folderKey}/${slug(topic)}`;
      v.Rating = rating.label;
      v.Importance = rating.importance;
      v.Topic = topic;
    }
    if (typeof remarks === "string") v.Remarks_Message = remarks;
    v.Last_Modified = todayParts().stamp;
    await sheets.updateVideoRow(rowIndex, await sheets.videoToRow(v));
    res.json({ ok: true, moved, sr });
  } catch (e) { fail(res, e); }
});

module.exports = r;
