/* ReelVault — DASHBOARD PAGE (Modules M1–M13 on one screen) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$, esc = RVUI.esc;
  let charts = [];

  function css(v, fb) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb; }

  /* ---------- count-up ---------- */
  function countUp(el, target, suffix = "", ms = 900) {
    const t0 = performance.now();
    function step(t) {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (Number.isInteger(target) ? Math.round(target * eased) : (target * eased).toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- M1: stat cards ---------- */
  function renderStats() {
    const s = RVData.stats();
    const cards = [
      { label: "Total Videos", val: s.total, ic: "▣", tint: "blue",  to: "library.html" },
      { label: "Added This Week", val: s.week, ic: "＋", tint: "green", to: "library.html" },
      { label: "Very Useful", val: s.high, ic: "★", tint: "gold", to: "library.html?r=high" },
      { label: "Failed / Pending", val: s.failed + s.pending, ic: "!", tint: "red", to: "activity.html" },
      { label: "Drive Used", val: s.driveGB, suffix: " /15 GB", ic: "◍", tint: "violet", to: "settings.html" },
    ];
    $("#m1-cards").innerHTML = cards.map((c) => `
      <a class="stat-card glass tint-${c.tint}" href="${c.to}">
        <div class="stat-ic">${c.ic}</div>
        <div class="stat-num" data-val="${c.val}" data-suf="${c.suffix || ""}">0</div>
        <div class="stat-label">${c.label}</div>
        <div class="stat-shimmer"></div>
      </a>`).join("");
    $$(".stat-num").forEach((el) => countUp(el, +el.dataset.val, el.dataset.suf));
  }

  /* ---------- M2 + M3: inline quick add → live status ---------- */
  function wireQuickAdd() {
    const form = $("#dash-qa-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const link = $("#dqa-link").value.trim();
      if (!/^https?:\/\/.+\..+/.test(link)) { RVUI.toast("That link does not look right — please check it.", "err"); return; }
      if (RVUI.isDuplicate(link)) {
        RVUI.toast("Duplicate skipped — this reel is already saved.", "warn", 4200);
        RVData.addActivity("duplicate", "Duplicate skipped — link already exists");
        return;
      }
      const rating = $("#dqa-rating .rate-btn.active").dataset.r;
      const v = RVUI.buildVideo({ link, topicKey: $("#dqa-topic").value, rating, wf: false });
      $("#dqa-link").value = "";
      runStatusCard(v);
    });
    $$("#dqa-rating .rate-btn").forEach((b) => b.addEventListener("click", () => {
      $$("#dqa-rating .rate-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    }));
    $("#dqa-link").addEventListener("input", (e) => {
      const p = RVData.platformOf(RVUI.detectPlatform(e.target.value));
      const b = $("#dqa-plat");
      b.textContent = p.code; b.style.background = p.color; b.style.color = "#fff";
    });
    /* paste button on the inline form (phone pe ek tap) */
    const pasteBtn = document.createElement("button");
    pasteBtn.type = "button"; pasteBtn.className = "paste-btn"; pasteBtn.textContent = "⧉ Paste";
    pasteBtn.addEventListener("click", async () => {
      try {
        const t = (await navigator.clipboard.readText() || "").trim();
        if (/^https?:\/\//.test(t)) {
          $("#dqa-link").value = t;
          $("#dqa-link").dispatchEvent(new Event("input", { bubbles: true }));
          RVUI.toast("Link pasted from clipboard ✨");
        } else RVUI.toast("No link found in the clipboard", "warn");
      } catch (e) { RVUI.toast("Clipboard access blocked by the browser", "warn"); }
    });
    $("#dqa-link").after(pasteBtn);
  }

  function runStatusCard(v) {
    const body = $("#m3-body");
    body.querySelector(".empty-state")?.remove();
    const card = document.createElement("div");
    card.className = "dl-card";
    card.innerHTML = `
      <div class="dl-top">
        <span class="plat-badge" style="background:${RVData.platformOf(v.platform).color}">${RVData.platformOf(v.platform).code}</span>
        <span class="dl-link" title="${esc(v.link)}">${esc(v.link.slice(0, 46))}…</span>
      </div>
      <div class="dl-stage">Queued…</div>
      <div class="prog-bar"><div class="prog-fill stripes-anim" style="width:0%"></div></div>
      <div class="dl-sub muted">Preparing</div>`;
    body.prepend(card);
    const fill = $(".prog-fill", card), stage = $(".dl-stage", card), sub = $(".dl-sub", card);
    RVUI.simulateAdd(v, {
      onStage(st) {
        fill.style.width = st.pct + "%";
        if (st.label) stage.textContent = st.label;
        if (st.sub) sub.textContent = st.sub;
        if (st.done) {
          fill.classList.remove("stripes-anim"); fill.classList.add("prog-done");
          card.classList.add("dl-done");
          setTimeout(() => { card.classList.add("fade-out"); setTimeout(() => card.remove(), 600); }, 2600);
        }
      },
      onDone(saved) {
        refresh();
        if (saved && saved.failed) {
          if (saved.duplicate) RVUI.toast("Duplicate skipped — this reel is already saved.", "warn", 4200);
          else RVUI.toast("Failed: " + (saved.error || "download error") + " — see retry queue.", "err", 5200);
        } else { RVUI.toast("Saved — sheet row created."); navigator.vibrate && navigator.vibrate([40, 60, 40]); }
      },
    });
  }

  /* ---------- M6 / M7 / M12: charts ---------- */
  function renderCharts() {
    charts.forEach((c) => c.destroy()); charts = [];
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = "Poppins, system-ui, sans-serif";
    Chart.defaults.color = css("--muted", "#8b949e");

    // M6 weekly line
    const wk = RVData.weeklyCounts(10);
    charts.push(new Chart($("#ch-weekly"), {
      type: "line",
      data: { labels: wk.map((w) => w.label), datasets: [{
        label: "Videos saved / week", data: wk.map((w) => w.count),
        borderColor: "#ff6b4a", backgroundColor: "rgba(255,107,74,.15)",
        fill: true, tension: 0.42, pointRadius: 4, pointBackgroundColor: "#ff6b4a",
      }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1200, easing: "easeOutQuart" },
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: css("--line", "#2a3140") + "55" } },
                  x: { grid: { display: false } } },
      },
    }));

    // M7 rating donut
    const rr = RVData.byRating();
    charts.push(new Chart($("#ch-rating"), {
      type: "doughnut",
      data: { labels: rr.map((r) => r.label), datasets: [{
        data: rr.map((r) => r.count),
        backgroundColor: rr.map((r) => r.color), borderWidth: 0, hoverOffset: 8,
      }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        animation: { animateRotate: true, duration: 1100, easing: "easeOutQuart" },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 12 } } },
        onClick(evt, els) {
          if (els.length) location.href = "library.html?r=" + rr[els[0].index].key;
        },
      },
    }));

    // M12 storage gauge
    const s = RVData.stats();
    const used = Math.min(15, s.driveGB), pct = used / 15 * 100;
    const col = pct < 66 ? "#12b8a0" : pct < 86 ? "#e8930c" : "#ff5d5d";
    charts.push(new Chart($("#ch-gauge"), {
      type: "doughnut",
      data: { datasets: [{ data: [pct, 100 - pct], backgroundColor: [col, css("--line", "#30363d")], borderWidth: 0 }] },
      options: {
        rotation: -120, circumference: 240, cutout: "74%",
        responsive: true, maintainAspectRatio: false,
        animation: { animateRotate: true, duration: 1300, easing: "easeOutCubic" },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    }));
    $("#gauge-center").innerHTML = `<b>${s.driveGB}</b><span>/ 15 GB</span>`;
    $("#be-dot").className = "dot dot-green";
  }

  /* ---------- M8 topic cloud ---------- */
  function renderTopics() {
    const list = RVData.byTopic();
    const max = Math.max(...list.map((t) => t.count));
    $("#m8-topics").innerHTML = list.map((t) => {
      const scale = 0.78 + (t.count / max) * 0.4;
      return `<a class="topic-tile" style="--tc:${t.color};transform:scale(${scale})" href="library.html?t=${t.key}">
        <b>${t.count}</b><span>${t.label}</span></a>`;
    }).join("");
  }

  /* ---------- M9 vault preview ---------- */
  function renderVault() {
    const items = RVData.vault().slice(0, 4);
    $("#m9-vault").innerHTML = items.map((w) => {
      const ty = RVData.VAULT_TYPES.find((x) => x.key === w.type) || { label: w.type, icon: "◆" };
      return `<a class="vault-mini" href="vault.html">
        <span class="vt-ic">${ty.icon}</span>
        <div><b>${esc(w.name)}</b><small class="muted">${ty.label} · ${esc(w.influencer)}</small></div>
      </a>`;
    }).join("") || `<div class="empty-state">No resources yet</div>`;
  }

  /* ---------- M10 failed queue preview ---------- */
  function renderFailed() {
    const failed = RVData.allVideos().filter((v) => v.status === "Failed" || v.status === "Retrying");
    $("#m10-failed").innerHTML = failed.length ? failed.slice(0, 3).map((v) => `
      <div class="fail-row">
        <span class="dot ${v.status === "Retrying" ? "dot-amber" : "dot-red"}"></span>
        <div class="fail-info"><b>${esc(v.title)}</b><small class="muted">${esc(v.failReason || "—")} · retries ${v.retryCount ?? 0}/3</small></div>
        <button class="btn btn-mini" data-retry="${v.sr}">Retry</button>
      </div>`).join("")
      : `<div class="empty-state ok">All clear ✓ — nothing failed</div>`;
    $$("#m10-failed [data-retry]").forEach((b) => b.addEventListener("click", () => {
      RVUI.toast("Retry queued — will re-attempt download (demo).");
      RVData.addActivity("retry", "Manual retry queued from dashboard");
    }));
  }

  /* ---------- M13 activity ticker ---------- */
  function renderTicker() {
    const acts = RVData.allActivity().slice(0, 18);
    const ic = { added: "＋", retry: "↻", duplicate: "⚑", failed: "✖", export: "⬇", edit: "✎" };
    $("#m13-ticker").innerHTML = acts.map((a) => `
      <span class="tk-item tk-${a.type}"><i>${ic[a.type] || "•"}</i>${esc(a.text)}<small>${RVUI.agoTs(a.ts)}</small></span>`).join("");
  }

  /* ---------- M4: recent videos strip ---------- */
  function renderRecent() {
    const vs = RVData.allVideos().slice(0, 6);
    /* ▶ Continue watching — progress wali pehle, phir recently opened */
    const ids = [];
    if (window.RVProgress) {
      Object.entries(RVProgress.all())
        .filter(([, p]) => p && p.secs > 0)
        .sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0))
        .forEach(([sr]) => ids.push(String(sr)));
    }
    (window.RVRecent ? RVRecent.list() : []).forEach((sr) => { if (!ids.includes(String(sr))) ids.push(String(sr)); });
    const cw = ids.map((sr) => RVData.allVideos().find((v) => String(v.sr) === sr)).filter(Boolean).slice(0, 6);
    const cwHtml = cw.length
      ? `<div class="cw-head">▶ Continue watching</div><div class="cw-strip">` +
        cw.map((v) => {
          const t2 = RVData.topicOf(v.topicKey);
          const th2 = v.thumb && /^https?:/.test(v.thumb) ? v.thumb : t2.thumb;
          const pr = window.RVProgress ? RVProgress.get(v.sr) : null;
          let bar = "";
          if (pr && !pr.done && +v.duration) bar = `<span class="wp-bar"><i style="width:${RVProgress.pct(v.sr, +v.duration)}%"></i></span>`;
          else if (pr && pr.done) bar = `<span class="wp-done xs">✓</span>`;
          const lbl = pr ? RVProgress.fmt(v.sr, +v.duration || 0) : "Abhi khola";
          return `<a class="cw-item" href="library.html?open=${encodeURIComponent(v.sr)}" title="${esc(v.title)} — click se wahan pahunch jao">
            <span class="cw-thumb" style="background-image:url('${th2}')">${bar}</span>
            <span class="cw-t">${esc((v.title || "").slice(0, 26))}${(v.title || "").length > 26 ? "…" : ""}</span>
            <span class="cw-p">${esc(lbl)}</span>
          </a>`;
        }).join("") + `</div>`
      : "";
    $("#m4-recent").innerHTML = cwHtml + vs.map((v) => {
      const t = RVData.topicOf(v.topicKey), r = RVData.ratingOf(v.ratingKey);
      return `<a class="rc-row" href="library.html">
        <span class="rc-thumb" style="background-image:url('${t.thumb}')"></span>
        <div class="rc-info">
          <b>${esc(v.title)}</b>
          <div class="lib-meta">
            <span class="chip topic-chip" style="--tc:${t.color}">${t.label}</span>
            <span class="chip rate-chip" style="--rc:${r.color}">${r.label}</span>
          </div>
        </div>
        <span class="chip ${v.status === "Done" ? "chip-green" : v.status === "Pending" ? "chip-amber" : "chip-red"}">${v.status}</span>
        <span class="muted rc-date">${RVUI.fmtDate(v.date)}</span>
      </a>`;
    }).join("");
  }

  /* ---------- refresh hook (called after quick-add / export) ---------- */
  function refresh() {
    renderStats(); renderCharts(); renderTopics(); renderVault(); renderFailed(); renderTicker(); renderRecent();
  }
  window.RVRefresh = refresh;

  window.RV_PAGE_dashboard = function () {
    $("#today-line").textContent = RVUI.todayInfo();
    wireQuickAdd();
    refresh();
  };
})();
