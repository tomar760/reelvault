/* ============================================================
   ReelVault — LIVE BACKEND CONNECTOR
   When a backend URL is configured (Settings page or config.js),
   this module swaps the demo data layer for the real API:
   same UI, same modules — real Sheet/Drive data.
   ============================================================ */
(function () {
  "use strict";

  function backendURL() {
    return (localStorage.getItem("rv_backend_url") || (window.RV_CONFIG && RV_CONFIG.BACKEND_URL) || "").replace(/\/+$/, "");
  }
  function passcode() { return localStorage.getItem("rv_passcode") || "1234"; }
  function isLive() { return /^https?:\/\//.test(backendURL()); }

  async function req(path, opts = {}) {
    const res = await fetch(backendURL() + path, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-passcode": passcode(), ...(opts.headers || {}) },
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Invalid server response" }));
    if (res.status === 401) { RVUI.toast("Wrong passcode for the backend.", "err", 5000); throw new Error("unauthorized"); }
    if (!res.ok || data.ok === false) throw new Error(data.error || `Server error (${res.status})`);
    return data;
  }

  /* ---------------- cache ---------------- */
  const cache = { videos: [], vault: [], loaded: false };
  const isoDate = (sheetDate) => {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(sheetDate || "");
    return m ? `${m[3]}-${m[2]}-${m[1]}` : sheetDate || "";
  };

  async function refreshCaches() {
    const [lib, vlt] = await Promise.all([req("/api/library?size=500"), req("/api/vault")]);
    cache.videos = lib.videos;
    cache.vault = vlt.vault.map((w) => ({ ...w, date: isoDate(w.date) }));
    cache.loaded = true;
  }

  function computeStats() {
    const vs = cache.videos;
    const wk = Date.now() - 7 * 86400000;
    const done = vs.filter((v) => v.status === "Done");
    return {
      total: vs.length,
      week: vs.filter((v) => new Date(v.date).getTime() >= wk).length,
      high: vs.filter((v) => v.ratingKey === "high").length,
      failed: vs.filter((v) => v.status === "Failed" || v.status === "Retrying").length,
      pending: vs.filter((v) => v.status === "Pending").length,
      workflows: cache.vault.length,
      driveGB: +(done.reduce((s, v) => s + (v.size || 0), 0) / 1024).toFixed(1),
      dupBlocked: 0,
    };
  }

  /* ---------------- override layer (only in live mode) ---------------- */
  function activate() {
    /* data reads */
    RVData.allVideos = () => cache.videos;
    RVData.vault = () => cache.vault;
    RVData.stats = computeStats;
    RVData.weeklyCounts = (n) => {
      const out = [];
      for (let w = n - 1; w >= 0; w--) {
        const start = Date.now() - (w + 1) * 7 * 86400000, end = Date.now() - w * 7 * 86400000;
        const c = cache.videos.filter((v) => { const t = new Date(v.date).getTime(); return t >= start && t < end; }).length;
        out.push({ label: new Date(start + 86400000).getDate() + "/" + (new Date(start + 86400000).getMonth() + 1), count: c });
      }
      return out;
    };
    RVData.byTopic = () => RVData.TOPICS.map((t) => ({ ...t, count: cache.videos.filter((v) => v.topicKey === t.key).length }));
    RVData.byRating = () => RVData.RATINGS.map((r) => ({ ...r, count: cache.videos.filter((v) => v.ratingKey === r.key).length }));
    RVData.byPlatform = () => RVData.PLATFORMS.map((p) => ({ ...p, count: cache.videos.filter((v) => v.platform === p.key).length }));

    /* edits (rating change from detail modal) */
    RVData.updateUserVideo = (sr, patch) => {
      (async () => {
        try {
          await req(`/api/edit/${sr}`, { method: "POST", body: JSON.stringify({ ratingKey: patch.ratingKey, remarks: patch.remarks }) });
          const v = cache.videos.find((x) => x.sr === sr);
          if (v && patch.ratingKey) { v.ratingKey = patch.ratingKey; v.importance = RVData.ratingOf(patch.ratingKey).importance; v.modified = patch.modified; }
          RVUI.toast("Rating updated — Drive file moved to the new folder.");
          window.RVRefresh && window.RVRefresh();
        } catch (e) { RVUI.toast("Edit failed: " + e.message, "err"); }
      })();
      return true;
    };

    /* real pipeline — replaces the demo simulator */
    RVUI.simulateAdd = (v, hooks = {}) => {
      (async () => {
        try {
          hooks.onStage({ label: "Sending to backend…", pct: 2 });
          const { jobId } = await req("/api/add", {
            method: "POST",
            body: JSON.stringify({
              link: v.link, topicKey: v.topicKey, ratingKey: v.ratingKey,
              wf: v.workflow, msg: v.remarks, resName: v.vaultName, resType: v.vaultType,
              influencer: v.influencer, src: v.src,
            }),
          });
          hooks.onStage({ label: "Queued on server…", pct: 4 });
          const MAP = {
            queued: [4, "Queued on server…"], checking: [8, "Checking for duplicates…"],
            metadata: [16, "Fetching metadata (yt-dlp)…"], tagging: [26, "AI tagging (NVIDIA NIM)…"],
            downloading: null, uploading: [76, "Uploading to Google Drive…"],
            recording: [90, "Writing row to Google Sheet…"],
          };
          const poll = setInterval(async () => {
            try {
              const { job } = await req(`/api/status/${jobId}`);
              if (job.state === "downloading") hooks.onStage({ label: job.label || "Downloading video…", pct: Math.round(job.pct || 40), sub: job.sub || "" });
              else if (MAP[job.state]) hooks.onStage({ label: MAP[job.state][1], pct: MAP[job.state][0], sub: job.sub || "" });
              if (job.state === "done") {
                clearInterval(poll);
                await refreshCaches().catch(() => {});
                hooks.onStage({ label: job.label || "Saved to ReelVault ✓", sub: job.sub || "", pct: 100, done: true });
                hooks.onDone && hooks.onDone({ ...v, failed: false, sr: job.srNo, fileName: job.fileName });
              } else if (job.state === "failed") {
                clearInterval(poll);
                const dup = /duplicate/i.test(job.error || "");
                hooks.onStage({ label: dup ? "Duplicate" : "Failed", pct: 100, sub: job.sub || "", done: true });
                hooks.onDone && hooks.onDone({ ...v, failed: true, duplicate: dup, error: job.error || "Download failed" });
              }
            } catch (e) {
              if (/job not found/i.test(e.message || "")) {
                clearInterval(poll);
                await refreshCaches().catch(() => {});
                hooks.onStage({ label: "Interrupted", pct: 100, done: true });
                hooks.onDone && hooks.onDone({ ...v, failed: true, error: "Server restarted mid-download — this video is in Activity → Retry Queue, press Retry." });
                return;
              }
              /* transient poll error — keep polling */
            }
          }, 2500);
        } catch (e) {
          hooks.onStage({ label: "Failed", pct: 100, done: true });
          hooks.onDone && hooks.onDone({ ...v, failed: true, error: e.message });
        }
      })();
      return 0;
    };

    /* retry buttons — real retry instead of demo toast */
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-retry]");
      if (!btn) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const sr = btn.dataset.retry;
      btn.disabled = true; btn.textContent = "Queued…";
      req(`/api/retry/${sr}`, { method: "POST", body: "{}" })
        .then(() => {
          RVUI.toast(`Retry started for Sr. No. ${sr}`);
          RVData.addActivity("retry", `Manual retry queued — Sr. No. ${sr}`);
          const v = cache.videos.find((x) => x.sr === sr); if (v) v.status = "Retrying";
          setTimeout(() => refreshCaches().then(() => window.RVRefresh && window.RVRefresh()).catch(() => {}), 26000);
          window.RVRefresh && window.RVRefresh();
        })
        .catch((err) => { RVUI.toast("Retry failed: " + err.message, "err"); btn.disabled = false; btn.textContent = "Retry now"; });
    }, true);
  }

  /* ---------------- status chips ---------------- */
  function paintChips(health) {
    const demo = document.querySelector(".chip-demo");
    if (demo) { demo.textContent = "LIVE"; demo.classList.remove("chip-violet"); demo.style.background = "rgba(45,164,78,.18)"; demo.style.color = "#3fb950"; demo.title = "Connected to your real backend"; }
    const st = document.getElementById("rv-be-status");
    if (st && health) {
      st.innerHTML = health.sheet === "ok"
        ? '<span class="dot dot-green"></span>Backend: live'
        : '<span class="dot dot-amber"></span>Backend: sheet issue';
    }
  }

  /* ---------------- boot ---------------- */
  window.RV_API = {
    isLive, backendURL, req,
    async connect(url, code) {
      if (url) localStorage.setItem("rv_backend_url", url.replace(/\/+$/, ""));
      if (code) { localStorage.setItem("rv_passcode", code); localStorage.setItem("rv_unlocked", "1"); }
      const h = await req("/api/health");
      return h;
    },
    async disconnect() { localStorage.removeItem("rv_backend_url"); location.reload(); },
    refresh: async () => { await refreshCaches(); window.RVRefresh && window.RVRefresh(); },
  };

  if (!isLive()) return; // ← DEMO MODE: nothing changes

  // LIVE MODE boot (runs before RVUI.init finishes page build)
  activate();
  document.addEventListener("DOMContentLoaded", () => {});
  const origInit = RVUI.init.bind(RVUI);
  RVUI.init = function (page) {
    // paint shell as usual, but swap in live data first
    const api = this;
    origInit(page);
    const chip = document.querySelector(".chip-demo");
    if (chip) { chip.textContent = "LIVE · SYNCING"; chip.style.background = "rgba(31,111,235,.16)"; chip.style.color = "#58a6ff"; }
    const st = document.getElementById("rv-be-status");
    if (st) st.innerHTML = '<span class="dot dot-amber"></span>Backend: syncing…';
    (async () => {
      try {
        const health = await req("/api/health");
        await refreshCaches();
        paintChips(health);
      } catch (e) {
        const st2 = document.getElementById("rv-be-status");
        if (st2) st2.innerHTML = '<span class="dot dot-red"></span>Backend: unreachable';
        RVUI.toast("Backend unreachable — showing demo data. (" + e.message + ")", "err", 5200);
        return;
      }
      window.RVRefresh && window.RVRefresh();
    })();
  };
})();
