/* ============================================================
   ReelVault — DEMO DATA LAYER (frontend-only, no backend yet)
   Mirrors the future Google Sheet structure (Columns A–W).
   When backend arrives, only fetch sources change — UI stays.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- deterministic seeded random ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260730);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const pad = (n, w) => String(n).padStart(w, "0");

  /* ---------- config (mirrors Lists_Settings tab) ---------- */
  const TOPICS = [
    { key: "tech",     label: "Tech & n8n Workflows", folder: "Tech-n8n",      thumb: "tech.jpg",     color: "#1f6feb" },
    { key: "ai",       label: "AI Tools",             folder: "AI-Tools",      thumb: "ai.jpg",       color: "#7c5cff" },
    { key: "business", label: "Business & Marketing", folder: "Business-Mktg", thumb: "business.jpg", color: "#bf7500" },
    { key: "finance",  label: "Finance & Money",      folder: "Finance-Money", thumb: "finance.jpg",  color: "#2da44e" },
    { key: "fitness",  label: "Fitness & Health",     folder: "Fitness-Health",thumb: "fitness.jpg",  color: "#d1242f" },
    { key: "misc",     label: "Misc / Other",         folder: "Misc-Other",    thumb: "misc.jpg",     color: "#57606a" },
  ];
  const RATINGS = [
    { key: "high",   label: "Very Useful", importance: "High",   color: "#1aa179", folder: "01_High_Importance"  },
    { key: "medium", label: "Useful",      importance: "Medium", color: "#e8930c", folder: "02_Medium_Importance"},
    { key: "low",    label: "Average",     importance: "Low",    color: "#98a2b3", folder: "03_Low_Importance"  },
  ];
  const PLATFORMS = [
    { key: "Instagram", code: "IG", color: "#c2255c" },
    { key: "Facebook",  code: "FB", color: "#1877f2" },
    { key: "YouTube",   code: "YT", color: "#d1242f" },
    { key: "X",         code: "X",  color: "#1f2328" },
    { key: "Other",     code: "OT", color: "#57606a" },
  ];

  /* ---------- title / remark pools (demo realism) ---------- */
  const TITLES = {
    tech: [
      "5 n8n workflows that automate everything", "Build an AI agent in 12 minutes with n8n",
      "n8n + Google Sheets = free CRM", "This webhook trick saves 3 hours daily",
      "Automate Instagram DMs with n8n", "Self-hosted n8n full setup guide",
      "n8n error handling patterns nobody tells you", "Cron-job to content machine in n8n",
      "Scrape any site ethically with n8n", "My entire business runs on these 3 workflows",
    ],
    ai: [
      "This AI tool replaced my research intern", "Claude projects walkthrough — full guide",
      "10 ChatGPT prompts that actually work", "AI video editing is getting scary good",
      "Fine-tune vs RAG explained in 60 seconds", "New free AI image model beats everything",
      "Perplexity tricks for daily research", "Build a personal knowledge base with AI",
    ],
    business: [
      "How this reel got 2M views — breakdown", "Pricing psychology in 45 seconds",
      "The 3-hook formula for viral reels", "Cold DM script that books meetings",
      "One-person business roadmap 2026", "Why your landing page is not converting",
      "Personal branding in 30 days — day 1", "Steal this content calendar system",
    ],
    finance: [
      "Index funds vs FD — honest math", "Emergency fund before anything else",
      "How compounding actually feels year 5", "3 money habits that changed my life",
      "Tax saving basics for freelancers", "Why I track every rupee for 90 days",
    ],
    fitness: [
      "5-minute morning mobility routine", "Protein targets without supplements",
      "Desk workers — fix your posture today", "Walking 8k steps — real results month 3",
      "Sleep is the real pre-workout", "Beginner home workout — no equipment",
    ],
    misc: [
      "This productivity setup is oddly satisfying", "Books that rewired my brain",
      "The 2-minute rule changed my mornings", "Why I journal on paper in 2026",
    ],
  };
  const REMARKS = [
    "Got the full workflow JSON from the creator after commenting. Saved to Vault.",
    "Creator shared a free template link in DM — attached in Vault.",
    "Commented 'interested' — received the resource pack link within 2 hours.",
    "Workflow file received via comment reply. Linked below.",
    "Template received, need to test it in n8n this weekend.",
    "", "", "", "",
  ];
  const TAGPOOL = {
    tech: ["n8n", "automation", "workflow", "webhooks", "free template"],
    ai: ["ai", "llm", "prompts", "research", "productivity"],
    business: ["marketing", "growth", "content", "sales", "branding"],
    finance: ["investing", "money", "habits", "tax", "tracking"],
    fitness: ["health", "routine", "mobility", "diet", "sleep"],
    misc: ["life", "learning", "habits", "notes"],
  };
  const INFLUENCERS = ["@automate.with.aryan", "@theworkflows.guy", "@growth.simplified", "@fit.with.farhan", "@money.mindset.ig", "@ai.tools.daily"];

  /* ---------- video factory ---------- */
  const END = new Date("2026-07-30T12:00:00");
  const dayMs = 86400000;
  function dstr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`; }
  function fileName(v, t) {
    const p = PLATFORMS.find((x) => x.key === v.platform).code;
    const r = RATINGS.find((x) => x.key === v.ratingKey);
    const topic = TOPICS.find((x) => x.key === v.topicKey);
    return `${v.date}_${p}_${topic.folder}_SrNo-${v.sr}.mp4`;
  }
  function folderPath(ratingKey, topicKey) {
    const r = RATINGS.find((x) => x.key === ratingKey);
    const t = TOPICS.find((x) => x.key === topicKey);
    return `ReelVault/${r.folder}/${t.folder}`;
  }

  const videos = [];
  const topicKeys = ["tech","tech","tech","tech","ai","ai","ai","business","business","business","finance","finance","fitness","fitness","misc"];
  /* NO DEMO DATA — aapki real entries yahan ayengi (live mode mein Sheet se) */
  for (let i = 0; i < 0; i++) {
    const topicKey = pick(topicKeys);
    const ratingKey = rnd() < 0.32 ? "high" : rnd() < 0.72 ? "medium" : "low";
    const platform = pick(["Instagram","Instagram","Instagram","Facebook","YouTube","X"]);
    const daysBack = Math.floor(rnd() * 78);           // ~11 weeks spread
    const d = new Date(END.getTime() - daysBack * dayMs - Math.floor(rnd() * 10) * 3600000);
    const wf = rnd() < 0.24;
    const v = {
      sr: pad(i + 1, 4),
      date: dstr(d),
      time: `${pad(8 + Math.floor(rnd() * 14), 2)}:${pad(Math.floor(rnd() * 60), 2)}`,
      title: pick(TITLES[topicKey]),
      platform,
      link: `https://www.${platform === "YouTube" ? "youtube.com/shorts" : platform === "X" ? "x.com" : platform.toLowerCase() + ".com/reel"}/Rv${pad(i + 1042, 6)}x${Math.floor(rnd() * 900 + 100)}`,
      topicKey, ratingKey,
      status: "Done",
      size: +(4 + rnd() * 38).toFixed(1),
      duration: 12 + Math.floor(rnd() * 88),
      workflow: wf,
      remarks: wf ? REMARKS[Math.floor(rnd() * 4)] : pick(REMARKS),
      tags: TAGPOOL[topicKey].filter(() => rnd() < 0.55),
      src: pick(["Dashboard", "Dashboard", "Dashboard", "Telegram Bot", "Mobile Share"]),
      modified: null,
      dup: false,
      notes: rnd() < 0.25 ? "Review again before next n8n sprint." : "",
      influencer: wf ? pick(INFLUENCERS) : "",
    };
    if (i === 5)  { v.status = "Failed";  v.failStage = "download"; v.failReason = "Private account — login required"; v.retryCount = 3; }
    if (i === 17) { v.status = "Failed";  v.failStage = "download"; v.failReason = "Platform changed — yt-dlp update pending"; v.retryCount = 3; }
    if (i === 26) { v.status = "Retrying"; v.failStage = "download"; v.failReason = "Network timeout"; v.retryCount = 1; }
    if (i === 33) { v.status = "Pending"; }
    if (i === 9)  { v.dup = true; v.notes = "Same link was pasted twice — duplicate auto-blocked on 2nd try."; }
    v.importance = RATINGS.find((r) => r.key === v.ratingKey).importance;
    v.folderPath = folderPath(v.ratingKey, v.topicKey);
    v.fileName = v.status === "Failed" || v.status === "Pending" ? "—" : fileName(v, topicKey);
    v.driveLink = v.fileName === "—" ? "" : `https://drive.google.com/file/d/1x${v.sr}${Math.floor(rnd()*9e6+1e6)}/view`;
    videos.push(v);
  }
  videos.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  /* ---------- vault (Workflows_Vault tab demo) ---------- */
  const vaultSrc = videos.filter((v) => v.workflow).slice(0, 12);
  const VAULT_TYPES = [
    { key: "n8n-template", label: "n8n Template", icon: "⚙" },
    { key: "pdf",          label: "PDF Guide",    icon: "📄" },
    { key: "notion",       label: "Notion Doc",   icon: "📓" },
    { key: "link",         label: "Resource Link",icon: "🔗" },
    { key: "code",         label: "Code Snippet", icon: "💻" },
  ];
  const vault = vaultSrc.map((v, i) => ({
    id: "W" + pad(i + 1, 3),
    date: v.date,
    name: [
      "5 n8n Automation Workflows Pack", "Viral Hooks Swipe File (PDF)", "AI Agent Starter Template",
      "Content Calendar Notion System", "Instagram DM Automation JSON", "Lead Scraping Workflow",
      "Prompt Library — 200 prompts", "Notion Second-Brain Template", "Sheets-to-CRM Sync Recipe",
      "Reels Script Framework (PDF)", "Auto-Archive n8n Workflow", "Cold Outreach Sequence Doc",
    ][i] || "Resource Pack " + (i + 1),
    type: pick(VAULT_TYPES).key,
    srcSr: v.sr,
    influencer: v.influencer || pick(INFLUENCERS),
    link: "https://drive.google.com/file/d/vault" + pad(i + 11, 3) + "/view",
    message: v.remarks || "Shared after commenting on the reel.",
    used: rnd() < 0.4,
  }));

  /* ---------- activity timeline (demo) ---------- */
  const ACT = [
    ["added", "Reel added — “{t}” — {r}"],
    ["retry", "Retry successful — “{t}”"],
    ["duplicate", "Duplicate skipped — already saved as Sr. No. {s}"],
    ["failed", "Download failed — “{t}” ({stage})"],
    ["export", "Excel exported — {n} rows"],
    ["edit", "Rating changed — “{t}” → {r}"],
  ];
  const activity = [];
  for (let i = 0; i < 0; i++) {
    const v = videos[Math.floor(rnd() * videos.length)];
    const type = pick(["added","added","added","added","retry","duplicate","failed","export","edit"]);
    const tpl = ACT.find((a) => a[0] === type)[1];
    const text = tpl
      .replace("{t}", v.title.length > 42 ? v.title.slice(0, 42) + "…" : v.title)
      .replace("{r}", RATINGS.find((x) => x.key === v.ratingKey).label)
      .replace("{s}", v.sr).replace("{stage}", v.failStage || "download")
      .replace("{n}", "48");
    const d = new Date(END.getTime() - Math.floor(rnd() * 9000) * 60000);
    activity.push({ ts: d.getTime(), type, text });
  }
  activity.sort((a, b) => b.ts - a.ts);

  /* ---------- user-added demo entries (localStorage) ---------- */
  const LS_V = "rv_user_videos", LS_A = "rv_user_activity";
  const userVideos = () => JSON.parse(localStorage.getItem(LS_V) || "[]");
  const userActivity = () => JSON.parse(localStorage.getItem(LS_A) || "[]");

  /* ---------- public helpers ---------- */
  const allVideos = () => userVideos().concat(videos);
  const allActivity = () => userActivity().concat(activity).sort((a, b) => b.ts - a.ts);

  function stats() {
    const vs = allVideos();
    const wk = new Date(END.getTime() - 7 * dayMs);
    return {
      total: vs.length,
      week: vs.filter((v) => new Date(v.date) >= wk).length,
      high: vs.filter((v) => v.ratingKey === "high").length,
      failed: vs.filter((v) => v.status === "Failed" || v.status === "Retrying").length,
      pending: vs.filter((v) => v.status === "Pending").length,
      workflows: vault.length + userVideos().filter((v) => v.workflow).length,
      driveGB: +(vs.filter((v) => v.status !== "Failed").reduce((s, v) => s + (v.size || 0), 0) / 1024).toFixed(1),
      dupBlocked: 0,
    };
  }
  function weeklyCounts(n) {
    const out = [];
    for (let w = n - 1; w >= 0; w--) {
      const start = new Date(END.getTime() - (w + 1) * 7 * dayMs);
      const end = new Date(END.getTime() - w * 7 * dayMs);
      const c = allVideos().filter((v) => { const d = new Date(v.date); return d >= start && d < end; }).length;
      out.push({ label: (start.getDate() + 1) + "/" + (start.getMonth() + 1), count: c });
    }
    return out;
  }
  function byTopic() {
    const m = {}; TOPICS.forEach((t) => (m[t.key] = 0));
    allVideos().forEach((v) => m[v.topicKey]++);
    return TOPICS.map((t) => ({ ...t, count: m[t.key] }));
  }
  function byRating() {
    return RATINGS.map((r) => ({ ...r, count: allVideos().filter((v) => v.ratingKey === r.key).length }));
  }
  function byPlatform() {
    return PLATFORMS.map((p) => ({ ...p, count: allVideos().filter((v) => v.platform === p.key).length }));
  }
  function addVideo(v) {
    const uv = userVideos();
    v.sr = pad(allVideos().length + 1, 4);
    uv.unshift(v); localStorage.setItem(LS_V, JSON.stringify(uv));
    return v;
  }
  function addActivity(type, text) {
    const ua = userActivity();
    ua.unshift({ ts: Date.now(), type, text });
    localStorage.setItem(LS_A, JSON.stringify(ua.slice(0, 60)));
  }
  function updateUserVideo(sr, patch) {
    const uv = userVideos();
    const i = uv.findIndex((v) => v.sr === sr);
    if (i >= 0) { uv[i] = { ...uv[i], ...patch }; localStorage.setItem(LS_V, JSON.stringify(uv)); return true; }
    return false;
  }
  function resetDemo() { localStorage.removeItem(LS_V); localStorage.removeItem(LS_A); }

  window.RVData = {
    TOPICS, RATINGS, PLATFORMS, VAULT_TYPES, END,
    allVideos, allActivity, vault: () => vault.concat(userVideos().filter((v) => v.workflow).map((v) => ({
      id: "W-new-" + v.sr, date: v.date, name: v.vaultName || "Received Resource",
      type: v.vaultType || "link", srcSr: v.sr, influencer: v.influencer || "—",
      link: "#", message: v.remarks || "", used: false,
    }))),
    stats, weeklyCounts, byTopic, byRating, byPlatform,
    addVideo, addActivity, updateUserVideo, resetDemo,
    topicOf: (k) => TOPICS.find((t) => t.key === k),
    ratingOf: (k) => RATINGS.find((r) => r.key === k),
    platformOf: (k) => PLATFORMS.find((p) => p.key === k),
    folderPath,
  };
})();
