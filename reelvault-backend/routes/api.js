/* ReelVault — API ROUTES (SOP Section 10.1) */
const express = require("express");
const { CFG, RATINGS, TOPICS, slug, todayParts } = require("../config");
const sheets = require("../services/sheets");
const driveSvc = require("../services/drive");
const queue = require("../services/queue");

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

/* ---------- library ---------- */
r.get("/api/library", async (req, res) => {
  try {
    let vs = (await sheets.readVideos()).map(sheetToJSON).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
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
