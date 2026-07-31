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
      if (RVUI.tryInstall()) return;
      RVUI.openModal(`
        <h2>Install ReelVault on your phone</h2>
        <ol class="install-steps">
          <li><b>Android (Chrome):</b> open the site → menu ⋮ → <i>Add to Home screen</i> → <i>Install</i>.</li>
          <li><b>iPhone (Safari):</b> open the site → Share → <i>Add to Home Screen</i>.</li>
          <li>Launch from the home-screen icon — full-screen app jaisa khulega.</li>
          <li>Open → paste link → ADD VIDEO. Backend sab kuch automatically karega.</li>
        </ol>`);
    });
  };
})();
