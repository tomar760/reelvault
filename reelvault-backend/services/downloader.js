/* ReelVault — yt-dlp wrapper (metadata + download, live progress) */
const fs = require("fs");
const path = require("path");
const { CFG } = require("../config");

let youtubedl = null;
try {
  youtubedl = require("yt-dlp-exec");
} catch (e) {
  console.error("yt-dlp-exec not installed:", e.message);
}

/* optional cookies for stubborn platforms */
let cookiesFile = null;
if (process.env.IG_COOKIES_BASE64) {
  try {
    cookiesFile = "/tmp/rv_cookies.txt";
    fs.writeFileSync(cookiesFile, Buffer.from(process.env.IG_COOKIES_BASE64, "base64"));
  } catch (e) { console.error("cookies decode failed", e.message); cookiesFile = null; }
}

function detectPlatform(url) {
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/twitter\.com|x\.com/i.test(url)) return "X";
  return "Other";
}

async function fetchMetadata(url) {
  if (!youtubedl) throw new Error("yt-dlp unavailable");
  const flags = { dumpSingleJson: true, noPlaylist: true, noWarnings: true };
  if (cookiesFile) flags.cookies = cookiesFile;
  const info = await youtubedl(url, flags);
  return {
    title: (info.title || "Untitled video").toString().slice(0, 140),
    caption: (info.description || info.title || "").toString().slice(0, 600),
    duration: Math.round(info.duration || 0),
    platform: detectPlatform(url),
    webpage: info.webpage_url || url,
    thumb: (() => {
      const t = info.thumbnail || "";
      if (/^https?:\/\//.test(t)) return t;
      // YouTube fallback — img.youtube.com thumbs never expire
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
    const flags = {
      output: outTpl,
      noPlaylist: true,
      noWarnings: true,
      format: "best[ext=mp4]/best",
      maxFilesize: CFG.MAX_FILE_MB + "M",
      mergeOutputFormat: "mp4",
      newline: true,
    };
    if (cookiesFile) flags.cookies = cookiesFile;
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
      const msg = String(e.stderr || e.message || "");
      if (/login|required|private/i.test(msg)) reject(new Error("Private account — login required (add IG_COOKIES_BASE64)"));
      else if (/Unsupported/i.test(msg)) reject(new Error("Unsupported link / platform"));
      else reject(new Error(msg.slice(0, 160) || "download failed"));
    });
  });
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

module.exports = { fetchMetadata, downloadVideo, detectPlatform, cleanupTmp };
