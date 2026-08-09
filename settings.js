/* ReelVault — SETTINGS PAGE */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$, esc = RVUI.esc;

  function renderTopics() {
    $("#set-topics").innerHTML = RVData.TOPICS.map((t) => `
      <div class="topic-row glass-soft">
        <span class="dot" style="background:${t.color}"></span>
        <b>${t.label}</b>
        <code class="muted">…/${t.folder}</code>
      </div>`).join("");
  }

  window.RV_PAGE_settings = function () {
    renderTopics();

    /* ---------- backend connection module ---------- */
    const urlIn = $("#be-url"), passIn = $("#be-pass"), statusLine = $("#be-status-line"), modeTag = $("#be-mode-tag");
    urlIn.value = localStorage.getItem("rv_backend_url") || (window.RV_CONFIG && RV_CONFIG.BACKEND_URL) || "";
    passIn.value = localStorage.getItem("rv_passcode") || "1234";
    function paintMode() {
      if (window.RV_API && RV_API.isLive()) {
        modeTag.textContent = "LIVE"; modeTag.style.background = "rgba(45,164,78,.18)"; modeTag.style.color = "#3fb950";
        statusLine.textContent = "Status: LIVE — connected to your real Sheet + Drive.";
      } else {
        modeTag.textContent = "DEMO"; modeTag.style.background = "rgba(130,80,223,.18)"; modeTag.style.color = "#b79df5";
        statusLine.textContent = "Status: DEMO MODE — sample data only.";
      }
    }
    paintMode();
    $("#be-save").addEventListener("click", async () => {
      const u = urlIn.value.trim().replace(/\/+$/, "");
      if (!/^https?:\/\//.test(u)) { RVUI.toast("Enter a valid backend URL (https://…).", "err"); return; }
      try {
        statusLine.textContent = "Status: connecting… (first wake can take 30–50 sec on free tier)";
        await RV_API.connect(u, passIn.value.trim());
        RVUI.toast("Connected! Switching to LIVE mode…");
        setTimeout(() => location.reload(), 900);
      } catch (e) {
        statusLine.textContent = "Status: connection failed — " + e.message;
        RVUI.toast("Connection failed: " + e.message, "err", 5200);
      }
    });
    $("#be-test").addEventListener("click", async () => {
      const u = urlIn.value.trim().replace(/\/+$/, "");
      if (!/^https?:\/\//.test(u)) { RVUI.toast("Enter a valid backend URL first.", "err"); return; }
      try {
        statusLine.textContent = "Status: pinging… (cold start may take 30–50 sec)";
        const r = await fetch(u + "/api/health"); const d = await r.json();
        statusLine.textContent = `Status: backend alive ✓ · sheet: ${d.sheet} · queue: ${d.queue}`;
      } catch (e) { statusLine.textContent = "Status: unreachable — " + e.message; }
    });
    $("#be-disc").addEventListener("click", () => { RV_API.disconnect(); });

    // animated background toggle
    const bgT = $("#set-bg");
    bgT.checked = localStorage.getItem("rv_anim_bg") !== "off";
    bgT.addEventListener("change", () => {
      localStorage.setItem("rv_anim_bg", bgT.checked ? "on" : "off");
      window.RV_BG.toggle(bgT.checked);
      RVUI.toast(bgT.checked ? "Animated background ON" : "Animated background OFF");
    });

    // passcode change
    $("#set-pass-save").addEventListener("click", () => {
      const v = $("#set-pass").value.trim();
      if (!/^\d{4}$/.test(v)) { RVUI.toast("Passcode must be exactly 4 digits.", "err"); return; }
      localStorage.setItem("rv_passcode", v);
      $("#set-pass").value = "";
      RVUI.toast("Passcode updated.");
    });

    // re-lock demo
    $("#set-lock").addEventListener("click", () => {
      localStorage.removeItem("rv_unlocked");
      location.reload();
    });

    // demo data reset
    $("#set-reset").addEventListener("click", () => {
      RVData.resetDemo();
      RVData.addActivity("edit", "Demo data reset to defaults");
      RVUI.toast("Demo data reset.", "warn");
      setTimeout(() => location.reload(), 600);
    });

    // storage numbers
    const s = RVData.stats();
    $("#set-storage").innerHTML = `
      ${row("Videos stored", s.total)}
      ${row("Drive used (est.)", s.driveGB + " / 15 GB")}
      ${row("Workflows in vault", s.workflows)}
      ${row("Failed / pending", s.failed + s.pending)}`;
    function row(k, v) { return `<div class="kv"><span class="muted">${k}</span><b>${v}</b></div>`; }

    // PWA install — real prompt ho to direct install, warna instructions
    $("#set-install").addEventListener("click", () => {
    /* ---- AI assistant stats ---- */
    async function loadAIStats() {
      const line = $("#ai-status-line"), tagEl = $("#ai-mode-tag");
      try {
        if (!(window.RV_API && RV_API.isLive && RV_API.isLive())) {
          if (tagEl) { tagEl.textContent = "DEMO"; }
          ["#ai-total","#ai-chat","#ai-tag","#ai-err"].forEach((id) => { const e = $(id); if (e) e.textContent = "—"; });
          if (line) line.textContent = "Connect the backend above to see live AI usage. (Demo mode: local tagging simulation only.)";
          return;
        }
        const s = await RV_API.aistats();
        if (!s) throw new Error("no data");
        if (tagEl) { tagEl.textContent = s.configured ? "LIVE AI" : "LOCAL MODE"; tagEl.classList.toggle("anim", !!s.configured); }
        $("#ai-total").textContent = s.callsTotal;
        $("#ai-chat").textContent = s.callsChat;
        $("#ai-tag").textContent = s.callsTagging;
        $("#ai-err").textContent = s.errors;
        if (line) line.textContent = s.configured
          ? `Mode: ${s.mode} · Model: ${s.model} · counting since ${new Date(s.countingSince).toLocaleString()}${s.lastError ? " · last error: " + s.lastError : ""}. ${s.note}`
          : "NIM_API_KEY is not set on the backend — AI is running in LOCAL fallback mode (app still works). Add the key on Render to enable real AI.";
      } catch (e) {
        if (line) line.textContent = "Could not load AI stats: " + e.message;
      }
    }
    const aiBtn = $("#ai-refresh");
    aiBtn && aiBtn.addEventListener("click", loadAIStats);
    const openChatBtn = $("#ai-open-chat");
    openChatBtn && openChatBtn.addEventListener("click", () => {
      const fab = document.getElementById("aichat-fab");
      if (fab) { fab.click(); RVUI.toast("Chat opened — ask anything ✦"); }
      else RVUI.toast("Chat is available on every page — bottom-right", "warn");
    });
    loadAIStats();

    /* ---- download self-test ---- */
    const dgBtn = $("#diag-run");
    dgBtn && dgBtn.addEventListener("click", async () => {
      const line = $("#diag-line"), tag = $("#diag-tag");
      if (!(window.RV_API && RV_API.isLive && RV_API.isLive())) {
        line.innerHTML = "Backend connect nahi hai — pehle upar backend URL + passcode se connect karo, phir self-test chalega.";
        return;
      }
      dgBtn.disabled = true; dgBtn.textContent = "Testing… (~10-15 sec)";
      if (tag) tag.textContent = "RUNNING";
      line.innerHTML = "⏳ Server pe engine test chal raha hai — ek chhoti public video ki metadata fetch ho rahi hai…";
      try {
        const d = await RV_API.req("/api/diag");
        const parts = [];
        parts.push(`<b>yt-dlp:</b> ${d.ytVersion} ${d.autoUpdate && d.autoUpdate.ok ? "· auto-update ✓" : ""}`);
        parts.push(`<b>Engine test:</b> ${d.probe.ok ? "✅ PASS — <i>" + esc(d.probe.title.slice(0, 60)) + "</i> (" + d.probe.tookMs + "ms)" : "❌ FAIL — " + esc(d.probe.error || "")}`);
        parts.push(`<b>IG cookies:</b> ${d.cookies ? "✅ lagai hui" : "⚠️ nahi hai — private reels fail hongi"}`);
        parts.push(`<b>AI key:</b> ${d.nimConfigured ? "✅" : "⚠️ local mode"}`);
        line.innerHTML = parts.map((x) => '<small style="display:block;margin:3px 0">' + x + "</small>").join("");
        if (tag) tag.textContent = d.probe.ok ? "PASS ✓" : "FAIL";
        if (!d.probe.ok) {
          line.innerHTML += '<small style="display:block;margin-top:6px;color:var(--red)">💡 Render dashboard → Manual Deploy → <b>"Clear build cache & deploy"</b> karo — naya yt-dlp auto-download hoga boot pe. Phir 2 min baad ye test dobara chalao.</small>';
        }
      } catch (e) {
        line.innerHTML = "❌ Self-test fail: " + esc(e.message) + ' — <small>server so raha hai? 30-60 sec baad dobara dabao.</small>';
        if (tag) tag.textContent = "ERROR";
      }
      dgBtn.disabled = false; dgBtn.textContent = "▶ Run self-test";
    });

      if (RVUI.tryInstall()) return;
      RVUI.openModal(`
        <h2>Install ReelVault on your phone</h2>
        <ol class="install-steps">
          <li><b>Android (Chrome):</b> open the site → menu ⋮ → <i>Add to Home screen</i> → <i>Install</i>.</li>
          <li><b>iPhone (Safari):</b> open the site → Share → <i>Add to Home Screen</i>.</li>
          <li>Launch from the home-screen icon — it opens full-screen like an app.</li>
          <li>Open → paste link → ADD VIDEO. The backend handles everything automatically.</li>
        </ol>`);
    });
  };
})();

/* ---------- v6: Backup & Restore ---------- */
(function () {
  "use strict";
  const $ = RVUI.$;
  const ex = $("#bk-export");
  if (!ex) return;
  ex.addEventListener("click", async () => {
    try {
      ex.disabled = true; ex.textContent = "⏳ Preparing…";
      let data;
      if (window.RV_API && RV_API.isLive && RV_API.isLive()) {
        const r = await RV_API.req("/api/export");
        data = { videos: r.videos || [], vault: r.vault || [] };
      } else {
        data = { videos: RVData.allVideos(), vault: RVData.vault() };
      }
      data.favourites = localStorage.getItem("rv_favs") || "[]";
      data.recentlyViewed = localStorage.getItem("rv_recent") || "[]";
      data.theme = localStorage.getItem("rv_theme") || "dark";
      data.folders = localStorage.getItem("rv_folders_map") || "{}";
      data.customOrder = localStorage.getItem("rv_order") || "[]";
      data.watchProgress = localStorage.getItem("rv_progress") || "{}";
      data.aiChecks = localStorage.getItem("rv_ai_checks") || "{}";
      data.leads = localStorage.getItem("rv_leads") || "{}";
      data.exportedAt = new Date().toISOString();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `reelvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(a.href);
      RVUI.toast("Backup download ho gaya 💾");
    } catch (e) { RVUI.toast("Backup failed: " + e.message, "err"); }
    finally { ex.disabled = false; ex.textContent = "⬇ Backup JSON"; }
  });
  $("#bk-import").addEventListener("click", () => $("#bk-file").click());
  $("#bk-file").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        if (d.favourites) localStorage.setItem("rv_favs", d.favourites);
        if (d.recentlyViewed) localStorage.setItem("rv_recent", d.recentlyViewed);
        if (d.theme) localStorage.setItem("rv_theme", d.theme);
        if (d.folders) localStorage.setItem("rv_folders_map", d.folders);
        if (d.customOrder) localStorage.setItem("rv_order", d.customOrder);
        if (d.watchProgress) localStorage.setItem("rv_progress", d.watchProgress);
        if (d.aiChecks) localStorage.setItem("rv_ai_checks", d.aiChecks);
        if (d.leads) localStorage.setItem("rv_leads", d.leads);
        const n = Array.isArray(d.videos) ? d.videos.length : 0;
        RVUI.toast(`Restore ho gaya — ${n} videos backup mein mile (videos Sheet se hi aate hain) · ♥ favourites · 🗂 folders · ⠿ order · ▶ progress · 💬 leads restored`);
        setTimeout(() => location.reload(), 1200);
      } catch (err) { RVUI.toast("Ye backup file nahi lag rahi: " + err.message, "err"); }
    };
    rd.readAsText(f);
    e.target.value = "";
  });
})();
