/* ReelVault — API SERVER (entry) */
const express = require("express");
const cors = require("cors");
const { CFG } = require("./config");
const auth = require("./middleware/auth");
const api = require("./routes/api");
const sheets = require("./services/sheets");
const queue = require("./services/queue");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

/* CORS — locked to our frontend URL (+ localhost during dev) */
const allowed = [CFG.FRONTEND_URL, /\.github\.io$/, /localhost(:\d+)?$/, /127\.0\.0\.1(:\d+)?$/].filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl / health pings
    const ok = allowed.some((a) => (a instanceof RegExp ? a.test(origin) : a === origin));
    cb(ok ? null : new Error("CORS blocked: " + origin), ok);
  },
  allowedHeaders: ["Content-Type", "x-passcode"],
  methods: ["GET", "POST"],
}));

app.get("/", (req, res) => {
  res.send(`<pre style="font-family:monospace;padding:20px">
  ⚡ ReelVault API is running
  ────────────────────────────
  Health check : /api/health
  Queue + jobs : POST /api/add → GET /api/status/:jobId
  Docs         : see SOP Section 10
  </pre>`);
});

app.use(auth);
app.use(api);

/* 404 + error shield */
app.use((req, res) => res.status(404).json({ ok: false, error: "not found" }));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ ok: false, error: err.message.slice(0, 160) });
});

app.listen(CFG.PORT, async () => {
  console.log(`ReelVault API listening on :${CFG.PORT}`);
  console.log(`CORS allowed: ${CFG.FRONTEND_URL || "(github.io + localhost)"}`);
  try {
    await sheets.ensureStructure();
    console.log("Sheet structure verified ✓ (tabs + headers + lists)");
    await queue.sweepStaleOnBoot();
  } catch (e) {
    console.error("Sheet structure check failed (will retry on first request):", e.message);
    console.error("→ Make sure the service-account email is EDITOR on the sheet + drive folder.");
  }
  /* yt-dlp auto-update (Instagram changes ne purana downloader tod diya tha —
     boot pe latest binary lao; downloads phir se chalne lagti hain) */
  const dl = require("./services/downloader");
  await dl.ensureLatestYtDlp().catch((e) => console.error("yt-dlp update err:", e.message));
  console.log("yt-dlp status:", dl.diagInfo().ytVersion);
});
