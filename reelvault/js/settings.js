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
