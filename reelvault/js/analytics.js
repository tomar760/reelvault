/* ReelVault — INSIGHTS PAGE (Aurora graph gallery — 4 alag styles, animated) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$;
  let charts = [];
  const css = (v, fb) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;
  /* Aurora palette */
  const A = { teal: "#37e0c8", violet: "#8a6ff5", pink: "#ff6fb0", gold: "#f2b04c", blue: "#6aa8ff", coral: "#e07856", mint: "#8fd8a0" };
  const PALETTE = [A.teal, A.violet, A.pink, A.gold, A.blue, A.coral, A.mint];

  function destroyAll() { charts.forEach((c) => c.destroy()); charts = []; }
  function baseOpts() {
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.color = css("--muted", "#9aa3c7");
    Chart.defaults.borderColor = css("--line", "rgba(255,255,255,.12)");
    return { responsive: true, maintainAspectRatio: false, animation: { duration: 1200, easing: "easeOutQuart" } };
  }

  function render() {
    destroyAll();
    if (typeof Chart === "undefined") return;
    const gridCol = css("--line", "rgba(255,255,255,.12)") ;
    const mode = $("#an-mode") ? $("#an-mode").value : "line";

    /* ── C1: weekly ACTIVITY WAVE (gradient area / bars) ───────────── */
    const wk = RVData.weeklyCounts(12);
    const wc = $("#an-weekly").getContext("2d");
    const wg = wc.createLinearGradient(0, 0, 0, 250);
    wg.addColorStop(0, A.teal + "aa"); wg.addColorStop(0.55, A.violet + "3d"); wg.addColorStop(1, A.violet + "00");
    charts.push(new Chart($("#an-weekly"), {
      type: mode,
      data: { labels: wk.map((w) => w.label), datasets: [{
        label: "Videos / week", data: wk.map((w) => w.count),
        borderColor: A.teal, backgroundColor: mode === "bar"
          ? wk.map((_, i) => PALETTE[i % PALETTE.length] + "b8")
          : wg,
        fill: true, tension: 0.45, borderWidth: 2.4,
        pointRadius: 4, pointBackgroundColor: A.teal, pointBorderColor: "#0b1020", pointBorderWidth: 2, borderRadius: 7,
      }] },
      options: { ...baseOpts(), plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridCol + "44" } }, x: { grid: { display: false } } } },
    }));

    /* ── C2: topics RAINBOW RACE (horizontal gradient bars) ────────── */
    const tp = RVData.byTopic();
    charts.push(new Chart($("#an-topics"), {
      type: "bar",
      data: { labels: tp.map((t) => t.label), datasets: [{
        data: tp.map((t) => t.count),
        backgroundColor: tp.map((_, i) => PALETTE[i % PALETTE.length] + "c8"),
        hoverBackgroundColor: tp.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 9, borderSkipped: "start",
      }] },
      options: { ...baseOpts(), indexAxis: "y", plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridCol + "44" } }, y: { grid: { display: false } } } },
    }));

    /* ── C3: platform × rating AURORA STACK ────────────────────────── */
    const pl = RVData.byPlatform().filter((p) => p.count > 0);
    const rr = RVData.RATINGS;
    const vs = RVData.allVideos();
    const stackCols = [A.teal, A.violet, A.pink];
    charts.push(new Chart($("#an-platrate"), {
      type: "bar",
      data: {
        labels: pl.map((p) => p.key),
        datasets: rr.map((r, i) => ({
          label: r.label, backgroundColor: stackCols[i % 3] + "cc", hoverBackgroundColor: stackCols[i % 3],
          borderRadius: 6,
          data: pl.map((p) => vs.filter((v) => v.platform === p.key && v.ratingKey === r.key).length),
        })),
      },
      options: { ...baseOpts(), plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14 } } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridCol + "44" } } } },
    }));

    /* ── C5: topic balance RADAR ────────────────────────────────────── */
    if ($("#an-radar")) {
      charts.push(new Chart($("#an-radar"), {
        type: "radar",
        data: { labels: tp.map((t) => t.label.replace(" & ", " &\n")), datasets: [{
          data: tp.map((t) => t.count),
          backgroundColor: A.violet + "33", borderColor: A.violet, borderWidth: 2.2,
          pointBackgroundColor: A.teal, pointBorderColor: "#0b1020", pointRadius: 4,
        }] },
        options: { ...baseOpts(), plugins: { legend: { display: false } },
          scales: { r: { beginAtZero: true, ticks: { display: false }, grid: { color: gridCol + "55" }, angleLines: { color: gridCol + "55" }, pointLabels: { font: { size: 11 } } } } },
      }));
    }

    /* ── C6: platform split POLAR ───────────────────────────────────── */
    if ($("#an-polar")) {
      const pl2 = RVData.byPlatform().filter((p) => p.count > 0);
      charts.push(new Chart($("#an-polar"), {
        type: "polarArea",
        data: { labels: pl2.map((p) => p.key), datasets: [{
          data: pl2.map((p) => p.count),
          backgroundColor: pl2.map((_, i) => PALETTE[i % PALETTE.length] + "a8"),
          borderWidth: 0,
        }] },
        options: { ...baseOpts(), plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 12 } } },
          scales: { r: { ticks: { display: false }, grid: { color: gridCol + "44" } } } },
      }));
    }

    /* ── C4: vault share DONUT (aurora ring) ───────────────────────── */
    const wf = vs.filter((v) => v.workflow).length;
    charts.push(new Chart($("#an-wf"), {
      type: "doughnut",
      data: { labels: ["Workflow wale", "Sirf videos"], datasets: [{
        data: [wf, vs.length - wf],
        backgroundColor: [A.coral, A.violet + "55"], hoverBackgroundColor: [A.coral, A.violet + "88"],
        borderWidth: 0, hoverOffset: 10,
      }] },
      options: { ...baseOpts(), cutout: "68%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14 } } } },
    }));
  }

  window.RVRefresh = render;
  window.RV_PAGE_analytics = function () {
    $("#an-mode").addEventListener("change", render);
    render();
  };
})();

/* ---------- v7: ✨ AI Monthly Report (REAL stats → real NIM AI) ---------- */
(function () {
  "use strict";
  function paint(arr, cached) {
    const el = document.getElementById("an-ai-body");
    if (!el) return;
    el.innerHTML = `
      <div class="ai-lines ai-report-lines">
        ${arr.map((t, i) => `<div class="ai-line vault-line"><b class="ai-num">${i + 1}</b><span>${RVUI.esc(t)}</span></div>`).join("")}
      </div>
      <div class="ai-foot" style="margin-top:12px">
        <button class="btn btn-mini btn-ghost" id="an-ai-re" type="button">↻ Nayi report</button>
        <small class="muted">${cached ? "aaj ki saved report · AI calls bachao" : "abhi-abhi AI se"}</small>
      </div>`;
    document.getElementById("an-ai-re").addEventListener("click", () => generate(true));
  }
  async function generate(force) {
    const el = document.getElementById("an-ai-body");
    if (!el) return;
    el.innerHTML = `<div class="ai-shimmer"><i style="width:84%"></i><i style="width:68%"></i><i style="width:76%"></i><i style="width:60%"></i><i style="width:48%"></i></div><small class="muted">AI tumhare poore vault ke REAL stats padh raha hai… (5-10 sec)</small>`;
    const r = await RVAI.report(force);
    if (!r.ok) {
      el.innerHTML = (r.reason === "nokey" ? RVAI.nokeyHtml() : RVAI.offlineHtml()) +
        `<div style="margin-top:10px"><button class="btn btn-mini btn-ai" id="an-ai-go2" type="button">↻ Dobara try karo</button></div>`;
      const g = document.getElementById("an-ai-go2");
      if (g) g.addEventListener("click", () => generate(false));
      return;
    }
    paint(r.bullets, r.cached);
  }
  const boot = function () {
    const el = document.getElementById("an-ai-body");
    if (!el) return;
    const c = window.RVAI ? RVAI.cache.get("report") : null;
    const today = new Date().toISOString().slice(0, 10);
    if (c && c.day === today && Array.isArray(c.b) && c.b.length) paint(c.b, true);
    else {
      const g = document.getElementById("an-ai-go");
      if (g) g.addEventListener("click", () => generate(false));
    }
  };
  const prev = window.RV_PAGE_analytics;
  window.RV_PAGE_analytics = function () { prev && prev(); boot(); };
})();
