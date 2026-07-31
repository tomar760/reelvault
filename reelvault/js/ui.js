/* ============================================================
   ReelVault — SHARED UI ENGINE
   Topbar + sidebar (desktop), bottom nav + FAB (mobile),
   passcode lock, quick-add modal with simulated pipeline,
   toasts, theme, and REAL Excel export (SheetJS) — 1 click.
   UI language: English only (per project rule).
   ============================================================ */
(function () {
  "use strict";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const NAV = [
    { id: "dashboard", href: "index.html",  label: "Dashboard", icon: "◈" },
    { id: "library",   href: "library.html",label: "Library",   icon: "▦" },
    { id: "vault",     href: "vault.html",  label: "Vault",     icon: "◆" },
    { id: "analytics", href: "analytics.html", label: "Insights", icon: "▲" },
    { id: "activity",  href: "activity.html",label: "Activity", icon: "↻" },
    { id: "settings",  href: "settings.html",label: "Settings", icon: "⚙" },
  ];

  /* ---------------- toast system ---------------- */
  function toast(msg, type = "ok", ms = 3400) {
    let root = $("#rv-toasts");
    if (!root) { root = document.createElement("div"); root.id = "rv-toasts"; document.body.appendChild(root); }
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-dot"></span><span>${esc(msg)}</span>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 350); }, ms);
  }

  /* ---------------- theme ---------------- */
  function applyTheme() {
    const th = localStorage.getItem("rv_theme") || "dark";
    document.documentElement.dataset.theme = th;
    $$(".js-theme-icon").forEach((e) => (e.textContent = th === "dark" ? "☾" : "☀"));
  }
  function toggleTheme() {
    localStorage.setItem("rv_theme", (localStorage.getItem("rv_theme") || "dark") === "dark" ? "light" : "dark");
    applyTheme(); toast("Theme updated");
  }

  /* ---------------- passcode lock ---------------- */
  function lockIfNeeded(onOk) {
    if (localStorage.getItem("rv_unlocked") === "1") return onOk();
    const code = localStorage.getItem("rv_passcode") || "1234";
    const ov = document.createElement("div");
    ov.className = "lock-screen";
    ov.innerHTML = `
      <div class="lock-card">
        <img src="assets/logo.png" alt="ReelVault" class="lock-logo"/>
        <h1>ReelVault</h1>
        <p class="muted">Paste. Download. Organize. Done.</p>
        <div class="lock-dots">${"<span></span>".repeat(4)}</div>
        <input type="password" inputmode="numeric" maxlength="4" class="lock-input" placeholder="••••" autocomplete="off"/>
        <p class="lock-hint muted">Demo passcode: 1234</p>
        <p class="lock-err"></p>
      </div>`;
    document.body.appendChild(ov);
    const input = $(".lock-input", ov), dots = $$(".lock-dots span", ov), err = $(".lock-err", ov);
    input.focus();
    input.addEventListener("input", () => {
      dots.forEach((d, i) => d.classList.toggle("on", i < input.value.length));
      if (input.value.length === 4) {
        if (input.value === code) {
          localStorage.setItem("rv_unlocked", "1");
          ov.classList.add("bye"); setTimeout(() => ov.remove(), 500);
          onOk();
        } else {
          err.textContent = "Wrong passcode — try again";
          input.value = ""; dots.forEach((d) => d.classList.remove("on"));
          ov.classList.add("shake"); setTimeout(() => ov.classList.remove("shake"), 450);
        }
      }
    });
  }

  /* ---------------- shell (topbar + nav) ---------------- */
  function buildShell(page) {
    const top = document.createElement("header");
    top.className = "topbar glass";
    top.innerHTML = `
      <a class="brand" href="index.html">
        <img src="assets/logo.png" alt="logo"/><span>Reel<b>Vault</b></span>
      </a>
      <div class="topbar-right">
        <span class="chip chip-demo" title="Frontend demo — backend connects next">DEMO MODE</span>
        <span class="chip chip-status" id="rv-be-status"><span class="dot dot-green"></span>Backend: ready</span>
        <button class="btn btn-export js-export" title="Download Excel (.xlsx)"><span class="dl-anim">⬇</span> Excel</button>
        <button class="icon-btn js-theme" title="Toggle theme"><span class="js-theme-icon">☾</span></button>
      </div>`;
    document.body.prepend(top);

    const side = document.createElement("aside");
    side.className = "sidebar glass";
    side.innerHTML = NAV.map((n) => `
      <a href="${n.href}" class="side-link ${n.id === page ? "active" : ""}">
        <span class="side-ic">${n.icon}</span><span>${n.label}</span>
      </a>`).join("") +
      `<button class="side-link side-add js-quickadd"><span class="side-ic">＋</span><span>Quick Add</span></button>`;
    document.body.prepend(side);

    const bnav = document.createElement("nav");
    bnav.className = "bottomnav glass";
    const main5 = NAV.filter((n) => ["dashboard","library","vault","analytics","activity","settings"].includes(n.id));
    bnav.innerHTML =
      main5.slice(0, 2).map(mkBN).join("") +
      `<button class="bn-fab js-quickadd" aria-label="Quick Add"><span>＋</span></button>` +
      main5.slice(2).map(mkBN).join("");
    function mkBN(n) { return `<a href="${n.href}" class="bn-link ${n.id === page ? "active" : ""}"><span class="bn-ic">${n.icon}</span><small>${n.label}</small></a>`; }
    document.body.appendChild(bnav);

    $$(".js-theme").forEach((b) => b.addEventListener("click", toggleTheme));
    $$(".js-export").forEach((b) => b.addEventListener("click", () => exportExcel(b)));
    $$(".js-quickadd").forEach((b) => b.addEventListener("click", openQuickAdd));
  }

  /* ---------------- modal helpers ---------------- */
  function openModal(html, cls = "") {
    closeModal();
    const wrap = document.createElement("div");
    wrap.className = `modal-wrap ${cls}`;
    wrap.innerHTML = `<div class="modal-back"></div><div class="modal glass-strong">${html}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    $(".modal-back", wrap).addEventListener("click", closeModal);
    return wrap;
  }
  function closeModal() { $$(".modal-wrap").forEach((m) => m.remove()); }

  /* ---------------- quick-add (simulated pipeline) ---------------- */
  function detectPlatform(url) {
    if (/instagram\.com/i.test(url)) return "Instagram";
    if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
    if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
    if (/twitter\.com|x\.com/i.test(url)) return "X";
    return "Other";
  }

  function openQuickAdd() {
    const topics = RVData.TOPICS.map((t) => `<option value="${t.key}">${t.label}</option>`).join("");
    const wrap = openModal(`
      <div class="qa-head grad-border-anim">
        <h2>Quick Add Video</h2>
        <p class="muted">Paste a link — everything else happens automatically.</p>
      </div>
      <form class="qa-form" id="qa-form" novalidate>
        <label class="fld">
          <span>Video Link *</span>
          <div class="link-row">
            <input id="qa-link" type="url" placeholder="https://www.instagram.com/reel/..." required/>
            <span class="plat-badge" id="qa-plat">—</span>
          </div>
        </label>
        <div class="qa-grid">
          <label class="fld"><span>Topic</span>
            <select id="qa-topic">${topics}</select>
          </label>
          <div class="fld"><span>Rating (this decides the Drive folder)</span>
            <div class="rate-row" id="qa-rate">
              <button type="button" data-r="high" class="rate-btn rate-high active">Very Useful</button>
              <button type="button" data-r="medium" class="rate-btn rate-med">Useful</button>
              <button type="button" data-r="low" class="rate-btn rate-low">Average</button>
            </div>
          </div>
        </div>
        <label class="wf-toggle">
          <input type="checkbox" id="qa-wf"/>
          <span class="wf-slider"></span>
          <span>Received a workflow / resource from this influencer?</span>
        </label>
        <div class="wf-extra" id="qa-wf-extra" hidden>
          <div class="qa-grid">
            <label class="fld"><span>Resource name</span><input id="qa-res" placeholder="e.g. 5 n8n Workflows Pack"/></label>
            <label class="fld"><span>Type</span>
              <select id="qa-restype">${RVData.VAULT_TYPES.map((t) => `<option value="${t.key}">${t.label}</option>`).join("")}</select>
            </label>
          </div>
          <label class="fld"><span>Influencer message / remarks</span>
            <textarea id="qa-msg" rows="3" placeholder="Paste the message you received..."></textarea>
          </label>
        </div>
        <button class="btn btn-primary btn-big" type="submit"><span class="btn-spark"></span>ADD VIDEO</button>
      </form>
      <div class="qa-progress" id="qa-prog" hidden>
        <div class="prog-title" id="qa-prog-title">Queued…</div>
        <div class="prog-bar"><div class="prog-fill stripes-anim" id="qa-prog-fill" style="width:0%"></div></div>
        <div class="prog-sub muted" id="qa-prog-sub">Preparing</div>
      </div>`);

    let rating = "high";
    $$("#qa-rate .rate-btn", wrap).forEach((b) => b.addEventListener("click", () => {
      $$("#qa-rate .rate-btn", wrap).forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); rating = b.dataset.r;
    }));
    $("#qa-link", wrap).addEventListener("input", (e) => {
      const p = detectPlatform(e.target.value);
      const pm = RVData.platformOf(p);
      const badge = $("#qa-plat", wrap);
      badge.textContent = pm.code; badge.style.background = pm.color; badge.style.color = "#fff";
    });
    $("#qa-wf", wrap).addEventListener("change", (e) => { $("#qa-wf-extra", wrap).hidden = !e.target.checked; });

    $("#qa-form", wrap).addEventListener("submit", (e) => {
      e.preventDefault();
      const link = $("#qa-link", wrap).value.trim();
      if (!/^https?:\/\/.+\..+/.test(link)) {
        $("#qa-link", wrap).classList.add("fld-err");
        toast("That link does not look right — please check it.", "err");
        return;
      }
      // duplicate check (demo)
      if (RVData.allVideos().some((v) => v.link === link)) {
        toast("Duplicate skipped — this link is already saved.", "warn", 4200);
        RVData.addActivity("duplicate", "Duplicate skipped — link already exists");
        return;
      }
      const topicKey = $("#qa-topic", wrap).value;
      const wf = $("#qa-wf", wrap).checked;
      const now = new Date();
      const v = {
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
        time: now.toTimeString().slice(0, 5),
        title: "Untitled video — fetching metadata…",
        platform: detectPlatform(link), link, topicKey, ratingKey: rating,
        status: "Pending", size: 0, duration: 0, workflow: wf,
        remarks: $("#qa-msg", wrap).value || "",
        tags: [], src: "Dashboard", modified: null, dup: false, notes: "",
        influencer: wf ? "@creator" : "",
        vaultName: $("#qa-res", wrap).value || "", vaultType: $("#qa-restype", wrap).value,
        importance: RVData.ratingOf(rating).importance,
        folderPath: RVData.folderPath(rating, topicKey),
        fileName: "—", driveLink: "",
      };

      const prog = $("#qa-prog", wrap), fill = $("#qa-prog-fill", wrap),
            ttl = $("#qa-prog-title", wrap), sub = $("#qa-prog-sub", wrap);
      $("#qa-form", wrap).style.opacity = 0.35;
      prog.hidden = false;
      simulateAdd(v, {
        onStage(st) {
          fill.style.width = st.pct + "%";
          if (st.label) ttl.textContent = st.label;
          sub.textContent = st.sub || "";
          if (st.done) { fill.classList.remove("stripes-anim"); fill.classList.add("prog-done"); }
        },
        onDone(saved) {
          setTimeout(() => {
            closeModal();
            if (saved && saved.failed) {
              if (saved.duplicate) RVUI.toast("Duplicate skipped — this reel is already saved.", "warn", 4200);
              else RVUI.toast("Failed: " + (saved.error || "download error"), "err", 4800);
            } else {
              toast(`Saved — ${saved.fileName || "row created"}`, "ok", 4200);
            }
            window.RVRefresh && window.RVRefresh();
          }, 900);
        },
      });
    });
  }

  /* ---------------- simulated download pipeline (demo) ---------------- */
  function simulateAdd(v, hooks = {}) {
    let pct = 0, si = 0;
    const stages = [
      [2,  "Checking for duplicates…"],
      [14, "Fetching metadata (yt-dlp)…"],
      [26, "AI tagging (NVIDIA NIM)…"],
      [30, "Downloading video…"],
      [72, "Uploading to Google Drive…"],
      [86, "Writing row to Google Sheet…"],
      [100,"Done — saved!"],
    ];
    const tick = setInterval(() => {
      if (si < stages.length && pct >= stages[si][0]) { hooks.onStage({ label: stages[si][1], pct }); si++; }
      let subText = "";
      if (pct >= 30 && pct < 72) subText = ((pct - 30) / 42 * (8 + Math.random() * 9)).toFixed(1) + " MB / ~18 MB";
      else if (pct >= 72 && pct < 86) subText = v.folderPath;
      else if (pct >= 86 && pct < 100) subText = "Row + Drive link + remarks";
      if (subText) hooks.onStage({ pct, sub: subText });
      pct = Math.min(100, pct + 1 + Math.random() * 1.6);
      if (pct >= 100) {
        clearInterval(tick);
        v.status = "Done";
        v.size = +(8 + Math.random() * 22).toFixed(1);
        v.duration = 15 + Math.floor(Math.random() * 70);
        if (v.title.startsWith("Untitled")) v.title = ["New workflow video", "Saved reel — auto import", "Influencer resource reel"][Math.floor(Math.random() * 3)];
        RVData.addVideo(v);            // assigns v.sr first…
        const pm = RVData.platformOf(v.platform);
        v.fileName = `${v.date}_${pm.code}_${RVData.topicOf(v.topicKey).folder}_SrNo-${v.sr}.mp4`;
        v.driveLink = "#demo-drive";
        localStorage.setItem("rv_user_videos", JSON.stringify(JSON.parse(localStorage.getItem("rv_user_videos"))));
        RVData.addActivity("added", `Reel added — “${v.title}” — ${RVData.ratingOf(v.ratingKey).label}`);
        if (v.workflow) RVData.addActivity("added", "Workflow received → saved to Vault");
        hooks.onStage({ label: "Saved to ReelVault ✓", sub: v.folderPath, pct: 100, done: true });
        hooks.onDone && hooks.onDone(v);
      } else {
        hooks.onStage({ pct });
      }
    }, 55);
    return tick;
  }

  /* shared add builder (dashboard inline form + modal) */
  function buildVideo({ link, topicKey, rating, wf, msg, res, restype, src }) {
    const now = new Date();
    const p2 = (n) => String(n).padStart(2, "0");
    return {
      date: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`,
      time: now.toTimeString().slice(0, 5),
      title: "Untitled video — fetching metadata…",
      platform: detectPlatform(link), link, topicKey, ratingKey: rating,
      status: "Pending", size: 0, duration: 0, workflow: !!wf,
      remarks: msg || "", tags: [], src: src || "Dashboard",
      modified: null, dup: false, notes: "",
      influencer: wf ? "@creator" : "", vaultName: res || "", vaultType: restype || "link",
      importance: RVData.ratingOf(rating).importance,
      folderPath: RVData.folderPath(rating, topicKey),
      fileName: "—", driveLink: "",
    };
  }
  function isDuplicate(link) {
    return RVData.allVideos().some((v) => v.link === link);
  }

  /* ---------------- Excel export (SheetJS) ---------------- */
  function exportExcel(btn) {
    try {
      if (typeof XLSX === "undefined") { toast("Excel engine not loaded yet.", "err"); return; }
      btn && btn.classList.add("busy");
      const vs = RVData.allVideos();
      const rows = vs.map((v) => ({
        "Sr No": v.sr, "Date Added": v.date, "Time": v.time, "Video Title": v.title,
        "Platform": v.platform, "Original Link": v.link,
        "Topic": RVData.topicOf(v.topicKey).label,
        "Rating": RVData.ratingOf(v.ratingKey).label,
        "Importance": v.importance, "Drive Folder Path": v.folderPath,
        "File Name": v.fileName, "Drive File Link": v.driveLink,
        "Status": v.status, "Size (MB)": v.size, "Duration (s)": v.duration,
        "Workflow Received": v.workflow ? "Yes" : "No", "Remarks / Message": v.remarks,
        "Tags": (v.tags || []).join(", "), "Added From": v.src,
        "Duplicate Flag": v.dup ? "Yes" : "No", "Notes": v.notes || "",
      }));
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(rows);
      ws1["!cols"] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(12, Math.min(48, k.length + 8)) }));
      XLSX.utils.book_append_sheet(wb, ws1, "Videos");

      const vrows = RVData.vault().map((w) => ({
        "Vault ID": w.id, "Date": w.date, "Resource Name": w.name,
        "Type": (RVData.VAULT_TYPES.find((t) => t.key === w.type) || {}).label || w.type,
        "Source Video Sr No": w.srcSr, "Influencer": w.influencer,
        "Resource Link": w.link, "Message": w.message, "Used It": w.used ? "Yes" : "No",
      }));
      const ws2 = XLSX.utils.json_to_sheet(vrows.length ? vrows : [{ "Vault ID": "—" }]);
      XLSX.utils.book_append_sheet(wb, ws2, "Workflows_Vault");

      const s = RVData.stats();
      const ws3 = XLSX.utils.aoa_to_sheet([
        ["ReelVault — Summary (exported)"], [],
        ["Total videos", s.total], ["Very Useful", s.high],
        ["Failed / Retrying", s.failed], ["Pending", s.pending],
        ["Workflows received", s.workflows], ["Drive used (GB, demo est.)", s.driveGB],
        ["Duplicates blocked", s.dupBlocked],
      ]);
      XLSX.utils.book_append_sheet(wb, ws3, "Summary");

      const now = new Date();
      const fname = `ReelVault_Export_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.xlsx`;
      XLSX.writeFile(wb, fname);
      RVData.addActivity("export", `Excel exported — ${rows.length} rows`);
      toast(`Excel ready — ${rows.length} rows exported ✓`);
      window.RVRefresh && window.RVRefresh();
    } catch (e) {
      console.error(e); toast("Export failed — see console.", "err");
    } finally { btn && btn.classList.remove("busy"); }
  }

  /* ---------------- small helpers shared by pages ---------------- */
  function fmtDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  }
  function agoTs(ts) {
    const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const h = Math.floor(mins / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }
  function todayInfo() {
    const d = new Date();
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  /* ---------------- boot ---------------- */
  window.RVUI = {
    init(page) {
      document.title = `${NAV.find((n) => n.id === page)?.label || ""} · ReelVault`;
      applyTheme();
      lockIfNeeded(() => {
        buildShell(page);
        window.RV_BG.start(document.body.dataset.bg || "orbs");
        const boot = window["RV_PAGE_" + page];
        boot && boot();
      });
    },
    toast, openModal, closeModal, openQuickAdd, exportExcel,
    simulateAdd, buildVideo, isDuplicate, detectPlatform,
    fmtDate, agoTs, todayInfo, esc, $, $$,
  };
})();
