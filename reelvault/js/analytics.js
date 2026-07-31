/* ReelVault — INSIGHTS PAGE (deep-dive animated charts) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$;
  let charts = [];
  const css = (v, fb) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;

  function destroyAll() { charts.forEach((c) => c.destroy()); charts = []; }
  function baseOpts() {
    Chart.defaults.font.family = "Instrument Sans, system-ui, sans-serif";
    Chart.defaults.color = css("--muted", "#8b949e");
    return { responsive: true, maintainAspectRatio: false, animation: { duration: 1100, easing: "easeOutQuart" } };
  }

  function render() {
    destroyAll();
    if (typeof Chart === "undefined") return;
    const mode = $("#an-mode") ? $("#an-mode").value : "line";

    // C1 downloads per week (line/bar toggle)
    const wk = RVData.weeklyCounts(12);
    charts.push(new Chart($("#an-weekly"), {
      type: mode,
      data: { labels: wk.map((w) => w.label), datasets: [{
        label: "Videos / week", data: wk.map((w) => w.count),
        borderColor: "#1f6feb", backgroundColor: mode === "bar" ? "rgba(31,111,235,.55)" : "rgba(31,111,235,.14)",
        fill: true, tension: 0.4, pointRadius: 4, borderRadius: 6,
      }] },
      options: { ...baseOpts(), plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: css("--line") + "55" } }, x: { grid: { display: false } } } },
    }));

    // C2 per-topic horizontal bars
    const tp = RVData.byTopic();
    charts.push(new Chart($("#an-topics"), {
      type: "bar",
      data: { labels: tp.map((t) => t.label), datasets: [{
        data: tp.map((t) => t.count), backgroundColor: tp.map((t) => t.color + "cc"), borderRadius: 7,
      }] },
      options: { ...baseOpts(), indexAxis: "y", plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: css("--line") + "55" } }, y: { grid: { display: false } } } },
    }));

    // C3 rating share per platform (grouped stacked feel)
    const pl = RVData.byPlatform().filter((p) => p.count > 0);
    const rr = RVData.RATINGS;
    const vs = RVData.allVideos();
    charts.push(new Chart($("#an-platrate"), {
      type: "bar",
      data: {
        labels: pl.map((p) => p.key),
        datasets: rr.map((r) => ({
          label: r.label, backgroundColor: r.color + "cc", borderRadius: 5,
          data: pl.map((p) => vs.filter((v) => v.platform === p.key && v.ratingKey === r.key).length),
        })),
      },
      options: { ...baseOpts(), plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: css("--line") + "55" } } } },
    }));

    // C4 workflow share donut
    const wf = vs.filter((v) => v.workflow).length;
    charts.push(new Chart($("#an-wf"), {
      type: "doughnut",
      data: { labels: ["With resource", "Video only"], datasets: [{ data: [wf, vs.length - wf], backgroundColor: ["#8250df", css("--line")], borderWidth: 0, hoverOffset: 8 }] },
      options: { ...baseOpts(), cutout: "66%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } } },
    }));
  }

  window.RVRefresh = render;
  window.RV_PAGE_analytics = function () {
    $("#an-mode").addEventListener("change", render);
    render();
  };
})();
