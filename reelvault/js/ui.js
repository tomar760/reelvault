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
        <p class="lock-hint muted">Enter your 4-digit passcode</p>
        <p class="lock-err"></p>
      </div>`;
    document.body.appendChild(ov);
    const input = $(".lock-input", ov), dots = $$(".lock-dots span", ov), err = $(".lock-err", ov);
    input.focus();
    input.addEventListener("input", () => {
      dots.forEach((d, i) => d.classList.toggle("on", i < input.value.length));
      if (input.value.length !== 4) return;
      const entered = input.value;
      const localOk = entered === (localStorage.getItem("rv_passcode") || "1234");
      const finish = (ok) => {
        if (ok) {
          localStorage.setItem("rv_passcode", entered);
          localStorage.setItem("rv_unlocked", "1");
          ov.classList.add("bye"); setTimeout(() => ov.remove(), 500);
          onOk();
        } else {
          err.textContent = "Wrong passcode — try again";
          input.value = ""; dots.forEach((d) => d.classList.remove("on"));
          ov.classList.add("shake"); setTimeout(() => ov.classList.remove("shake"), 450);
        }
      };
      /* Live mode: verify against the real backend (one code works on every phone).
         Backend asleep/unreachable → fall back to local check. */
      if (window.RV_API && RV_API.isLive()) {
        err.textContent = "Checking…";
        fetch(RV_API.backendURL() + "/api/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: entered }),
        }).then((r) => r.json()).then((d) => { err.textContent = ""; finish(d.ok === true || localOk); })
          .catch(() => { err.textContent = ""; finish(localOk); });
      } else finish(localOk);
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
    wrap.innerHTML = `<div class="modal-back"></div><div class="modal glass-strong"><div class="modal-handle"></div>${html}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    $(".modal-back", wrap).addEventListener("click", closeModal);
    $(".modal-handle", wrap).addEventListener("click", closeModal);
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
            <button type="button" class="paste-btn" id="qa-paste" title="Paste from clipboard">⧉ Paste</button>
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
    /* clipboard — auto-fill if a link is already copied (killer feature on phone) */
    const linkInp = $("#qa-link", wrap);
    async function pasteFromClipboard(target, silent) {
      try {
        const t = (await navigator.clipboard.readText() || "").trim();
        if (/^https?:\/\/.+\..+/.test(t)) {
          target.value = t;
          target.dispatchEvent(new Event("input", { bubbles: true }));
          RVUI.toast("Link pasted from clipboard ✨");
          return true;
        }
        if (!silent) RVUI.toast("No link found in the clipboard", "warn");
      } catch (e) {
        if (!silent) RVUI.toast("Clipboard access blocked — long-press and paste manually", "warn");
      }
      return false;
    }
    pasteFromClipboard(linkInp, true);
    $("#qa-paste", wrap).addEventListener("click", () => pasteFromClipboard(linkInp, false));

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
              navigator.vibrate && navigator.vibrate([40, 60, 40]);
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

  /* ---------------- Excel export (COLORFUL, styled — xlsx-js-style) ---------------- */
  function exportExcel(btn) {
    try {
      if (typeof XLSX === "undefined") { toast("Excel engine not loaded yet.", "err"); return; }
      btn && btn.classList.add("busy");

      /* palette (ARGB) */
      const C = {
        plum: "FF3B1D8F", violet: "FF7C3AED", pink: "FFEC4899", cyan: "FF0891B2",
        green: "FF16A34A", amber: "FFF59E0B", red: "FFDC2626", slate: "FF64748B",
        zebra: "FFF5F2FF", white: "FFFFFFFF", dark: "FF221A38", link: "FF0563C1",
        line: "FFDCD4F5", label: "FFEDE9FE",
      };
      const B = (c) => ({ style: "thin", color: { rgb: c || C.line } });
      const border = { top: B(), bottom: B(), left: B(), right: B() };
      const hdrStyle = (fill) => ({
        fill: { fgColor: { rgb: fill } }, border,
        font: { bold: true, color: { rgb: C.white }, sz: 11 },
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
      });
      const cellStyle = (zebra, extra = {}) => ({ border, ...(zebra ? { fill: { fgColor: { rgb: C.zebra } } } : {}), ...extra });
      const enc = XLSX.utils.encode_cell;
      const ratingFill = { "Very Useful": C.green, "Useful": C.amber, "Average": C.slate };
      const statusFill = { Done: C.green, Failed: C.red, Pending: C.amber, Retrying: C.cyan };

      function buildSheet(title, head, data, colWidths, opts = {}) {
        const ws = {};
        XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
        XLSX.utils.sheet_add_aoa(ws, [head], { origin: "A2" });
        if (data.length) XLSX.utils.sheet_add_aoa(ws, data, { origin: "A3" });
        const lastC = head.length - 1;
        ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastC } }];
        ws["!cols"] = colWidths.map((w) => ({ wch: w }));
        ws["!rows"] = [{ hpt: 30 }, { hpt: 26 }];
        ws["!autofilter"] = { ref: `A2:${XLSX.utils.encode_col(lastC)}${data.length + 2}` };
        ws.A1.s = { fill: { fgColor: { rgb: C.plum } }, font: { bold: true, sz: 15, color: { rgb: C.white } }, alignment: { horizontal: "center", vertical: "center" } };
        for (let c = 0; c <= lastC; c++) ws[enc({ r: 1, c })].s = hdrStyle(opts.hdrFill || C.violet);
        for (let i = 0; i < data.length; i++) {
          const r = 2 + i, zebra = i % 2 === 1;
          for (let c = 0; c <= lastC; c++) {
            const ref = enc({ r, c });
            if (!ws[ref]) continue;
            ws[ref].s = cellStyle(zebra);
            const colName = head[c], val = data[i][c];
            if (colName === "Rating" && ratingFill[val]) {
              const dark = val === "Useful";
              ws[ref].s = cellStyle(false, { fill: { fgColor: { rgb: ratingFill[val] } }, font: { bold: true, color: { rgb: dark ? C.dark : C.white } }, alignment: { horizontal: "center", vertical: "center" } });
            }
            if (colName === "Status" && statusFill[val]) {
              const dark = val === "Pending";
              ws[ref].s = cellStyle(false, { fill: { fgColor: { rgb: statusFill[val] } }, font: { bold: true, color: { rgb: dark ? C.dark : C.white } }, alignment: { horizontal: "center", vertical: "center" } });
            }
            if ((colName.includes("Link") && /^https?:\/\//.test(String(val)))) {
              ws[ref].l = { Target: val };
              ws[ref].s = cellStyle(zebra, { font: { color: { rgb: C.link }, underline: true } });
            }
          }
        }
        return ws;
      }

      const vs = RVData.allVideos();
      const head1 = ["Sr No", "Date Added", "Time", "Video Title", "Platform", "Original Link", "Topic", "Rating", "Importance", "Drive Folder Path", "File Name", "Drive File Link", "Status", "Size (MB)", "Duration (s)", "Workflow Received", "Remarks / Message", "Tags", "Added From", "Duplicate Flag", "Notes"];
      const data1 = vs.map((v) => [
        v.sr, v.date, v.time, v.title, v.platform, v.link,
        RVData.topicOf(v.topicKey).label, RVData.ratingOf(v.ratingKey).label,
        v.importance, v.folderPath, v.fileName, v.driveLink === "#demo-drive" ? "" : v.driveLink,
        v.status, v.size || "", v.duration || "", v.workflow ? "Yes" : "No",
        v.remarks || "", (v.tags || []).join(", "), v.src || "", v.dup ? "Yes" : "No", v.notes || "",
      ]);
      const ws1 = buildSheet(
        `REELVAULT — VIDEO MASTER  ·  ${vs.length} videos  ·  exported ${new Date().toLocaleString("en-IN")}`,
        head1, data1,
        [7, 12, 7, 34, 10, 26, 20, 12, 11, 30, 30, 26, 10, 10, 11, 12, 34, 22, 12, 12, 24]
      );

      const vault = RVData.vault();
      const head2 = ["Vault ID", "Date", "Resource Name", "Type", "Source Video Sr No", "Influencer", "Resource Link", "Message", "Used It"];
      const data2 = vault.map((w) => [
        w.id, w.date, w.name, (RVData.VAULT_TYPES.find((t) => t.key === w.type) || {}).label || w.type,
        w.srcSr, w.influencer, w.link, w.message, w.used ? "Yes" : "No",
      ]);
      const ws2 = buildSheet(`REELVAULT — WORKFLOW & RESOURCE VAULT  ·  ${vault.length} resources`, head2, data2.length ? data2 : [["—", "", "No resources yet", "", "", "", "", "", ""]], [8, 12, 30, 14, 16, 20, 26, 40, 9], { hdrFill: C.pink });

      /* colorful summary */
      const s = RVData.stats();
      const ws3 = {};
      XLSX.utils.sheet_add_aoa(ws3, [["REELVAULT — SUMMARY"]], { origin: "A1" });
      XLSX.utils.sheet_add_aoa(ws3, [["Metric", "Value"]], { origin: "A3" });
      const sRows = [
        ["Total Videos", s.total, C.violet], ["Very Useful ★", s.high, C.green],
        ["Added This Week", s.week, C.cyan], ["Failed / Retrying", s.failed, C.red],
        ["Pending", s.pending, C.amber], ["Workflows in Vault", s.workflows, C.pink],
        ["Drive Used (GB / 15)", s.driveGB, C.slate],
        ["Exported On", new Date().toLocaleString("en-IN"), C.plum],
      ];
      sRows.forEach((r, i) => {
        const row = 4 + i;
        XLSX.utils.sheet_add_aoa(ws3, [[r[0], r[1]]], { origin: `A${row}` });
        ws3[`A${row}`].s = { fill: { fgColor: { rgb: C.label } }, border, font: { bold: true, color: { rgb: C.dark }, sz: 11 } };
        ws3[`B${row}`].s = { fill: { fgColor: { rgb: r[2] } }, border, font: { bold: true, color: { rgb: C.white }, sz: 11 }, alignment: { horizontal: "center" } };
      });
      ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
      ws3.A1.s = { fill: { fgColor: { rgb: C.plum } }, font: { bold: true, sz: 15, color: { rgb: C.white } }, alignment: { horizontal: "center", vertical: "center" } };
      ws3["A3"].s = hdrStyle(C.violet); ws3["B3"].s = hdrStyle(C.violet);
      ws3["!cols"] = [{ wch: 24 }, { wch: 22 }];
      ws3["!rows"] = [{ hpt: 30 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Videos");
      XLSX.utils.book_append_sheet(wb, ws2, "Workflows_Vault");
      XLSX.utils.book_append_sheet(wb, ws3, "Summary");

      const now = new Date();
      const fname = `ReelVault_Export_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.xlsx`;
      XLSX.writeFile(wb, fname);
      RVData.addActivity("export", `Excel exported — ${data1.length} rows`);
      toast(`Colorful Excel ready — ${data1.length} rows ✓`);
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

  /* ---------------- install-prompt capture (PWA) ---------------- */
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; });
  function tryInstall() {
    if (!deferredInstall) return false;
    deferredInstall.prompt();
    deferredInstall.userChoice.finally(() => (deferredInstall = null));
    return true;
  }

  /* ---------------- boot ---------------- */
  /* ---------------- pull-to-refresh (mobile) ---------------- */
  function initPullToRefresh() {
    if (window.matchMedia("(min-width: 1000px)").matches) return; // desktop skip
    if (!window.RVRefresh && !("ontouchstart" in window)) return;
    const chip = document.createElement("div");
    chip.id = "rv-ptr";
    chip.innerHTML = `<span class="ptr-ico">↓</span><span class="ptr-txt">Pull to refresh</span>`;
    document.body.appendChild(chip);
    let startY = 0, pulling = false, dist = 0, busy = false;
    const THRESH = 72;
    window.addEventListener("touchstart", (e) => {
      if (busy || window.scrollY > 2) return;
      if (e.target.closest(".modal-wrap, .bottomnav, input, textarea, select")) return;
      startY = e.touches[0].clientY; pulling = true; dist = 0;
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
      if (!pulling || busy) return;
      dist = e.touches[0].clientY - startY;
      if (dist < 0) { pulling = false; chip.classList.remove("show", "ready"); return; }
      const p = Math.min(dist / THRESH, 1.25);
      chip.classList.toggle("show", dist > 14);
      chip.classList.toggle("ready", dist >= THRESH);
      chip.style.setProperty("--ptr", p.toFixed(2));
      chip.querySelector(".ptr-txt").textContent = dist >= THRESH ? "Release to refresh" : "Pull to refresh";
      chip.querySelector(".ptr-ico").style.transform = `rotate(${dist >= THRESH ? 180 : 0}deg)`;
    }, { passive: true });
    window.addEventListener("touchend", async () => {
      if (!pulling) return; pulling = false;
      chip.classList.remove("show", "ready");
      if (dist >= THRESH && !busy) {
        busy = true;
        navigator.vibrate && navigator.vibrate(12);
        chip.classList.add("spin"); chip.classList.add("show");
        chip.querySelector(".ptr-txt").textContent = "Refreshing…";
        try { window.RVRefresh ? await window.RVRefresh() : location.reload(); }
        catch (_) {}
        setTimeout(() => { chip.classList.remove("show", "spin"); busy = false; }, 650);
      }
    }, { passive: true });
  }

  window.RVUI = {
    init(page) {
      document.title = `${NAV.find((n) => n.id === page)?.label || ""} · ReelVault`;
      applyTheme();
      lockIfNeeded(() => {
        buildShell(page);
        /* offline indicator (phone ke liye zaroori) */
        const off = document.createElement("div");
        off.id = "rv-offline"; off.textContent = "📡 You are offline — reconnecting…";
        document.body.appendChild(off);
        const upd = () => off.classList.toggle("show", !navigator.onLine);
        window.addEventListener("online", upd); window.addEventListener("offline", upd); upd();
        window.RV_BG.start(document.body.dataset.bg || "orbs");
        initPullToRefresh();
        const boot = window["RV_PAGE_" + page];
        boot && boot();
      });
    },
    tryInstall,
    toast, openModal, closeModal, openQuickAdd, exportExcel,
    simulateAdd, buildVideo, isDuplicate, detectPlatform,
    fmtDate, agoTs, todayInfo, esc, $, $$,
  };
})();
