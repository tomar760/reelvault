/* ============================================================
   ReelVault — yt-dlp wrapper (metadata + download, live progress)
   v2 — auto-updates yt-dlp on boot (Instagram changes todpete
   hain purane versions ko), hardened flags, self-test probe.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFile } = require("child_process");
const { CFG } = require("../config");

let ytdlpExec = null;
let youtubedl = null;
let activeVer = "unknown";
let activeSrc = "none";
try {
  ytdlpExec = require("yt-dlp-exec");
  youtubedl = ytdlpExec;
  activeSrc = "bundled";
} catch (e) {
  console.error("yt-dlp-exec not installed:", e.message);
}

/* ---------- version helper ---------- */
function verOf(binPath) {
  return new Promise((resolve) => {
    execFile(binPath, ["--version"], { timeout: 8000 }, (err, stdout) => {
      resolve(err ? null : String(stdout || "").trim());
    });
  });
}
const BIN_BUNDLED = (() => {
  try { return require("yt-dlp-exec/src/constants").YOUTUBE_DL_PATH; } catch { return null; }
})();

async function refreshActiveVersion() {
  if (BIN_BUNDLED) {
    const v = await verOf(activeSrc === "custom" ? "/tmp/yt-dlp-latest" : BIN_BUNDLED);
    if (v) activeVer = `${v} (${activeSrc})`;
  }
}

/* ---------- AUTO-UPDATE: latest yt-dlp from GitHub releases ----------
   Instagram har kuch week mein kuch todta hai — purana yt-dlp = downloads fail.
   Server boot pe latest binary le aate hain; fail ho toh bundled pe chalte hain. */
const CUSTOM_BIN = "/tmp/yt-dlp-latest";
let updateState = { tried: false, ok: false, error: "" };

function downloadFile(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "reelvault-updater" } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(downloadFile(res.headers.location, dest, redirects - 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error("HTTP " + res.statusCode)); }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () => out.close(resolve));
      out.on("error", reject);
    }).on("error", reject);
  });
}

async function ensureLatestYtDlp() {
  if (!ytdlpExec) return;
  updateState.tried = true;
  try {
    fs.chmodSync(BIN_BUNDLED, 0o755);
  } catch {}
  try {
    console.log("[yt-dlp] checking latest release…");
    await downloadFile("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp", CUSTOM_BIN);
    fs.chmodSync(CUSTOM_BIN, 0o755);
    const v = await verOf(CUSTOM_BIN);
    if (!v) throw new Error("downloaded binary failed to run");
    youtubedl = ytdlpExec.create(CUSTOM_BIN);
    activeSrc = "custom";
    updateState.ok = true;
    console.log(`[yt-dlp] AUTO-UPDATED to ${v} ✓`);
  } catch (e) {
    updateState.error = e.message;
    console.log(`[yt-dlp] update skipped (${e.message}) — using bundled`);
    /* try self-update of bundled as a middle path */
    try {
      await new Promise((res) => {
        execFile(BIN_BUNDLED, ["-U", "--update-to", "stable"], { timeout: 60000 }, () => res());
      });
    } catch {}
  }
  await refreshActiveVersion();
}
refreshActiveVersion();

/* ---------- optional cookies for stubborn platforms ----------
   IG_COOKIES_TXT  → seedha cookies.txt ka CONTENT paste karo (sabse aasan)
   IG_COOKIES_BASE64 → purana tareeka (base64 string) */
let cookiesFile = null, cookiesSource = "";
function saveCookies(text, label) {
  try {
    const t = String(text || "");
    if (!/Netscape HTTP Cookie File/i.test(t) && !/\.(instagram|facebook|google|youtube|fb)\.[\w.\-]*\t/i.test(t)) {
      console.error(`${label}: yeh cookies.txt (Netscape) format nahi lagta — extension se export kiya hua file ka poora content paste karo`);
      return;
    }
    cookiesFile = "/tmp/rv_cookies.txt"; cookiesSource = label;
    fs.writeFileSync(cookiesFile, t);
    console.log(`🍪 cookies loaded from ${label}`);
  } catch (e) { console.error("cookies save failed", e.message); cookiesFile = null; cookiesSource = ""; }
}
if (process.env.IG_COOKIES_TXT) saveCookies(process.env.IG_COOKIES_TXT, "IG_COOKIES_TXT");
else if (process.env.IG_COOKIES_BASE64) {
  try { saveCookies(Buffer.from(process.env.IG_COOKIES_BASE64, "base64").toString("utf8"), "IG_COOKIES_BASE64"); }
  catch (e) { console.error("cookies decode failed", e.message); }
}

/* ---------- hardened default flags ---------- */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
/* Render pe ffmpeg nahi hota — bina iske YouTube ke split streams "Requested format is not available" dete hain.
   ffmpeg-static npm package apna binary saath lata hai → merge hamesha possible. */
let FFMPEG_PATH = null;
try { FFMPEG_PATH = require("ffmpeg-static"); } catch (e) { console.error("ffmpeg-static missing:", e.message); }
function baseFlags(extra = {}) {
  const f = {
    noPlaylist: true, noWarnings: true,
    userAgent: UA,
    socketTimeout: 25, retries: 3, fragmentRetries: 3,
    ...extra,
  };
  if (FFMPEG_PATH) f.ffmpegLocation = FFMPEG_PATH;
  if (cookiesFile) f.cookies = cookiesFile;
  return f;
}

function detectPlatform(url) {
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/twitter\.com|x\.com/i.test(url)) return "X";
  return "Other";
}

/* ---------- friendly error mapping ---------- */
function friendlyError(raw) {
  const msg = String(raw || "");
  if (/Service Accounts do not have storage quota|storageQuotaExceeded|storage quota/i.test(msg)) return "Google Drive ne service-account upload roka (2025 rule) — OAuth setup karo (guide: 🌟 DRIVE OAUTH chapter, 10 min)";
  if (/sign in to confirm|not a bot|bot.?check|consent|challenge/i.test(msg)) return "YouTube/Instagram ne server ko bot samajh liya — cookies lagao (IG_COOKIES_TXT, guide dekho)";
  if (/rate.?limit|429|too many requests/i.test(msg)) return "Instagram rate-limit — thodi der baad Retry karo (ya IG_COOKIES lagao)";
  if (/login|required|private|403/i.test(msg)) return "Login mang raha hai — cookies lagao (IG_COOKIES_TXT, guide dekho)";
  if (/Unsupported/i.test(msg)) return "Unsupported link / platform";
  if (/Version of|parse|extract|unable to extract/i.test(msg)) return "Platform ne page badal diya — server restart pe yt-dlp auto-update hoga, thodi der baad Retry karo";
  if (/max-filesize|File is larger/i.test(msg)) return "Video too large (limit cross)";
  return msg.slice(0, 170) || "download failed";
}

async function fetchMetadata(url) {
  if (!youtubedl) throw new Error("yt-dlp unavailable");
  const info = await youtubedl(url, baseFlags({ dumpSingleJson: true, ignoreNoFormatsError: true }));
  return {
    title: (info.title || "Untitled video").toString().slice(0, 140),
    caption: (info.description || info.title || "").toString().slice(0, 600),
    duration: Math.round(info.duration || 0),
    platform: detectPlatform(url),
    webpage: info.webpage_url || url,
    thumb: (() => {
      const t = info.thumbnail || "";
      if (/^https?:\/\//.test(t)) return t;
      const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,20})/.exec(url);
      return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : "";
    })(),
  };
}

function downloadVideo(url, outDir, onProgress) {
  return new Promise((resolve, reject) => {
    if (!youtubedl) return reject(new Error("yt-dlp unavailable"));
    fs.mkdirSync(outDir, { recursive: true });
    const outTpl = path.join(outDir, "rv_video.%(ext)s");
    const flags = baseFlags({
      output: outTpl,
      format: "bv*[height<=1080]+ba/b[height<=1080][ext=mp4]/b[ext=mp4]/b/best",
      maxFilesize: CFG.MAX_FILE_MB + "M",
      mergeOutputFormat: "mp4",
      newline: true,
    });
    const sub = youtubedl.exec(url, flags);
    if (sub.ytDlpEmitter) {
      sub.ytDlpEmitter.on("update", (u) => {
        if (onProgress && u && u.percent != null) {
          onProgress({ percent: +u.percent, speed: u.currentSpeed || "", eta: u.eta || "", size: u.totalSize || "" });
        }
      });
    }
    sub.then(() => {
      const f = fs.readdirSync(outDir).find((x) => x.startsWith("rv_video."));
      if (!f) return reject(new Error("download produced no file"));
      const fp = path.join(outDir, f);
      resolve({ filePath: fp, sizeMB: +(fs.statSync(fp).size / 1048576).toFixed(1) });
    }).catch((e) => {
      reject(new Error(friendlyError(e.stderr || e.message)));
    });
  });
}

/* ---------- self-test probe (Settings → Run download test) ---------- */
const PROBE_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"; // Blender's free open movie
async function probe() {
  const t0 = Date.now();
  try {
    const m = await fetchMetadata(PROBE_URL);
    return { ok: true, title: m.title, duration: m.duration, tookMs: Date.now() - t0 };
  } catch (e) {
    const raw = String((e && (e.stderr || e.shortMessage)) || (e && e.message) || e);
    const errLine = (raw.match(/ERROR:[^\n]*/m) || [raw.split("\n").filter(Boolean).pop() || raw])[0] || raw;
    return { ok: false, error: errLine.slice(0, 240), tookMs: Date.now() - t0 };
  }
}
function diagInfo() {
  let ffmpeg = false;
  try { ffmpeg = !!(FFMPEG_PATH && fs.existsSync(FFMPEG_PATH)); } catch (e) {}
  return {
    ytVersion: activeVer,
    source: activeSrc,
    autoUpdate: updateState,
    cookies: !!cookiesFile,
    cookiesSource,
    ffmpeg, // false ho toh "Clear build cache & deploy" karo
    maxFileMB: CFG.MAX_FILE_MB,
  };
}

function cleanupTmp(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }

/* periodic sweep of stale tmp dirs (>24h) */
setInterval(() => {
  try {
    fs.readdirSync("/tmp").forEach((f) => {
      if (!f.startsWith("rvjob_")) return;
      const p = path.join("/tmp", f);
      if (Date.now() - fs.statSync(p).mtimeMs > 86400000) cleanupTmp(p);
    });
  } catch (e) {}
}, 6 * 3600 * 1000).unref();

module.exports = { fetchMetadata, downloadVideo, detectPlatform, cleanupTmp, ensureLatestYtDlp, probe, diagInfo, friendlyError };
