/* ReelVault — JOB QUEUE + PIPELINE
   One-by-one processing (stable on free tier), live job states,
   sheet-first recording (failed ≠ lost), auto-retry 3x. */
const fs = require("fs");
const path = require("path");
const { CFG, COLS, RATINGS, PLATFORM_CODES, slug, todayParts } = require("../config");
const sheets = require("./sheets");
const drive = require("./drive");
const dl = require("./downloader");
const { tagCaption } = require("./nim");

const jobs = new Map();          // jobId -> job state
const fifo = [];                 // waiting job ids
let working = false;
let seq = 0;
let tree = null;                 // cached drive folder tree

function newJobId() { return `j${Date.now().toString(36)}_${(++seq).toString(36)}`; }
const norm = (u) => String(u || "").split("?")[0].replace(/\/+$/, "").toLowerCase();

function setState(job, patch) { Object.assign(job, patch); }

/* ---------- public API ---------- */
function enqueue(payload) {
  const id = newJobId();
  const job = { id, state: "queued", pct: 0, label: "Queued…", sub: "", stage: "", error: "", srNo: payload.sr || "", rowIndex: payload.rowIndex || null, attempts: payload.attempts || 1, payload };
  jobs.set(id, job);
  fifo.push(id);
  pump();
  return id;
}
function getJob(id) {
  const j = jobs.get(id);
  if (!j) return null;
  const { payload, ...pub } = j;
  return pub;
}
function queueLength() { return fifo.length + (working ? 1 : 0); }

async function pump() {
  if (working) return;
  const id = fifo.shift();
  if (!id) return;
  working = true;
  const job = jobs.get(id);
  try { await processJob(job); }
  catch (err) { await failJob(job, job.stage || "pipeline", err); }
  finally {
    working = false;
    setTimeout(pump, 400);
  }
}

/* ---------- THE PIPELINE ---------- */
async function processJob(job) {
  const p = job.payload; // { link, topicLabel, ratingKey, wf, msg, resName, resType, src }
  const t = todayParts();

  /* 1 — duplicate check */
  job.stage = "duplicate_check";
  setState(job, { state: "checking", pct: 2, label: "Checking for duplicates…" });
  if (!job.rowIndex) {
    const all = await sheets.readVideos();
    const dup = all.find((v) => norm(v.Original_Link) === norm(p.link));
    if (dup) {
      setState(job, { state: "failed", pct: 100, label: "Duplicate", error: "duplicate", sub: `Already saved as Sr. No. ${dup.Sr_No}` });
      return;
    }
  }

  /* 2 — metadata */
  job.stage = "metadata";
  setState(job, { state: "metadata", pct: 14, label: "Fetching metadata (yt-dlp)…" });
  let meta = { title: "Untitled video", caption: "", duration: 0, platform: dl.detectPlatform(p.link), webpage: p.link, thumb: "" };
  try { meta = await dl.fetchMetadata(p.link); }
  catch (e) { console.error("metadata fallback:", e.message); }

  /* 3 — AI tagging */
  job.stage = "tagging";
  setState(job, { state: "tagging", pct: 26, label: "AI tagging (NVIDIA NIM)…" });
  const ai = await tagCaption(meta.caption).catch(() => null);
  let topicLabel = p.topicLabel;
  let pendingReview = false;
  if (ai) {
    if ((!topicLabel || topicLabel === "Misc / Other") && ai.confidence >= 0.7) topicLabel = ai.topic;
    else if (!topicLabel) pendingReview = true;
  } else if (!topicLabel) { topicLabel = "Misc / Other"; pendingReview = true; }
  const tags = (ai && ai.tags) || [];

  const rating = RATINGS.find((r) => r.label.toLowerCase().startsWith((p.ratingKey || "high")[0] === "h" ? "very" : (p.ratingKey === "medium" ? "useful" : "average"))) || RATINGS[0];
  const sr = job.srNo || (await sheets.nextSrNo());
  job.srNo = sr;
  const folderKey = pendingReview ? "05_Pending_Review" : rating.folder;
  const plat = PLATFORM_CODES[meta.platform] || "OT";
  const fileName = `${t.dateISO}_${plat}_${slug(topicLabel)}_SrNo-${sr}.mp4`;
  const folderPath = `ReelVault/${folderKey}/${pendingReview ? "" : slug(topicLabel)}`.replace(/\/$/, "");

  /* 4 — sheet row FIRST (failed ≠ lost) */
  const baseRow = sheets.buildVideoObject({
    Sr_No: sr, Date_Added: t.dateSheet, Time_Added: t.time,
    Video_Title: meta.title, Platform: meta.platform, Original_Link: p.link,
    Topic: topicLabel, Rating: rating.label, Importance: rating.importance,
    Drive_Folder_Path: folderPath, File_Name: "—", Drive_File_Link: "",
    Download_Status: "Pending", File_Size_MB: "", Duration_Sec: meta.duration || "",
    Thumbnail_Link: meta.thumb || "", Workflow_Received: p.wf ? "Yes" : "No",
    Remarks_Message: p.msg || "", Tags: tags.join(", "), Added_From: p.src || "Dashboard",
    Last_Modified: "", Duplicate_Flag: "No", Notes: "",
  });
  if (!job.rowIndex) {
    await sheets.addVideoRow(await sheets.videoToRow(baseRow));
    job.rowIndex = await sheets.findRowIndexBySr(sr);
  } else {
    const existing = await sheets.videoToRow({ ...baseRow, Download_Status: "Retrying" });
    await sheets.updateVideoRow(job.rowIndex, existing);
  }

  /* 5 — download */
  job.stage = "download";
  setState(job, { state: "downloading", pct: 30, label: "Downloading video…" });
  const tmpDir = `/tmp/rvjob_${job.id}`;
  const { filePath, sizeMB } = await dl.downloadVideo(p.link, tmpDir, (pg) => {
    setState(job, { pct: 30 + Math.min(0.42, (pg.percent / 100) * 0.42), sub: `${typeof pg.size === "string" ? pg.size : ""} ${pg.speed ? "· " + pg.speed : ""}`.trim() });
  });

  /* 6 — drive folders + upload */
  job.stage = "drive_upload";
  setState(job, { state: "uploading", pct: 74, label: "Uploading to Google Drive…", sub: folderPath });
  if (!tree) tree = await drive.ensureTree(await sheets.readLists().then((l) => l.topics.length ? l.topics : require("../config").TOPICS.map((t) => t.label)));
  const targetFolder = pendingReview
    ? tree["05_Pending_Review"].id
    : (tree[folderKey].subs[slug(topicLabel)] || (await drive.ensureFolder(tree[folderKey].id, slug(topicLabel))));
  const up = await drive.uploadVideo(filePath, fileName, targetFolder);
  setState(job, { pct: 86 });
  dl.cleanupTmp(tmpDir);

  /* 7 — finalize sheet row */
  job.stage = "sheet_write";
  setState(job, { state: "recording", pct: 90, label: "Writing row to Google Sheet…" });
  const finalRow = sheets.buildVideoObject({
    ...baseRow,
    Drive_Folder_Path: folderPath, File_Name: fileName,
    Drive_File_Link: up.webViewLink || `https://drive.google.com/file/d/${up.id}/view`,
    Download_Status: "Done", File_Size_MB: String(sizeMB),
    Thumbnail_Link: p.thumb || meta.thumb || up.thumbnailLink || `https://drive.google.com/thumbnail?id=${up.id}`,
  });
  await sheets.updateVideoRow(job.rowIndex, await sheets.videoToRow(finalRow));

  /* 8 — vault (if influencer resource received) */
  if (p.wf) {
    try {
      const resName = p.resName || `Resource from ${meta.platform}`;
      const text = [
        `ReelVault — Received Resource`,
        `----------------------------------------`,
        `Name: ${resName}`,
        `Type: ${p.resType || "link"}`,
        `From video: Sr. No. ${sr} (${meta.title})`,
        `Original link: ${p.link}`,
        `Date: ${t.stamp}`,
        ``,
        `Influencer message:`,
        p.msg || "(none)",
      ].join("\n");
      const upTxt = await drive.uploadText(`W_${sr}_${slug(resName).slice(0, 40)}.txt`, text, tree["04_Workflows_Resources"].id);
      await sheets.addVaultRow({
        date: t.dateSheet, name: resName, type: p.resType || "link",
        srcSr: sr, influencer: p.influencer || "—",
        link: upTxt.webViewLink, message: p.msg || "", used: false,
      });
    } catch (e) { console.error("vault save failed:", e.message); }
  }

  setState(job, { state: "done", pct: 100, label: "Saved to ReelVault ✓", sub: folderPath, srNo: sr, fileName });
}

/* ---------- failure path ---------- */
async function failJob(job, stage, err) {
  const msg = (err && err.message) || String(err);
  console.error(`Job ${job.id} failed @${stage}:`, msg);
  setState(job, { state: "failed", pct: 100, label: "Failed", error: msg, sub: stage });
  dl.cleanupTmp(`/tmp/rvjob_${job.id}`);
  try {
    if (job.rowIndex) {
      const all = await sheets.readVideos();
      const v = all.find((x) => x.Sr_No === job.srNo);
      if (v) {
        v.Download_Status = "Failed";
        v.Notes = ("[" + stage + "] " + msg).slice(0, 180); // real reason visible everywhere
        v.Last_Modified = todayParts().stamp;
        await sheets.updateVideoRow(job.rowIndex, await sheets.videoToRow(v));
      }
    }
    await sheets.logFailure(job.srNo || "----", stage, msg, job.attempts);
  } catch (e) { console.error("fail-logging failed:", e.message); }

  /* auto-retry (in-memory; survives until instance sleeps) */
  if (job.attempts < CFG.RETRY_MAX && !/duplicate/i.test(job.error || "")) {
    const ms = CFG.RETRY_GAP_MIN * 60000;
    setTimeout(() => {
      enqueue({ ...job.payload, sr: job.srNo, rowIndex: job.rowIndex, attempts: job.attempts + 1 });
    }, ms).unref?.();
  }
}

/* ---------- BOOT SWEEP: stale Pending/Retrying rows → Failed (retry queue) ----------
   Render free tier sleeps between uses. Agar instance mid-job so gaya/restart hua,
   in-memory job gayab → sheet row hamesha "Pending" atak jaati.
   Har boot pe ye sweep aisi rows ko "Failed" mark karta hai —
   taaki wo Activity → Retry Queue mein dikhne lagen (RULE 4: Failed ≠ lost). */
async function sweepStaleOnBoot() {
  try {
    const all = await sheets.readVideos();
    const stale = all.filter((v) => v.Download_Status === "Pending" || v.Download_Status === "Retrying");
    for (const v of stale) {
      const rowIndex = await sheets.findRowIndexBySr(v.Sr_No);
      if (rowIndex < 0) continue;
      v.Download_Status = "Failed";
      v.Notes = "[restart] Instance restarted/slept mid-job — press Retry";
      v.Last_Modified = todayParts().stamp;
      await sheets.updateVideoRow(rowIndex, await sheets.videoToRow(v));
      await sheets.logFailure(v.Sr_No, "restart", "Instance restarted/slept mid-job — marked failed (use Retry)", 0);
    }
    if (stale.length) console.log(`Boot sweep: ${stale.length} stale row(s) → Failed (retry queue)`);
  } catch (e) { console.error("boot sweep skipped:", e.message); }
}

module.exports = { enqueue, getJob, queueLength, sweepStaleOnBoot };
