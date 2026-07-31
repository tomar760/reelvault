/* ReelVault — ACTIVITY PAGE (M10 retry queue + M13 full timeline) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$, esc = RVUI.esc;
  const state = { type: "" };

  function renderQueue() {
    const failed = RVData.allVideos().filter((v) => v.status === "Failed" || v.status === "Retrying");
    $("#queue-body").innerHTML = failed.length ? failed.map((v) => `
      <div class="fail-row big" data-sr="${v.sr}">
        <span class="dot ${v.status === "Retrying" ? "dot-amber" : "dot-red"}"></span>
        <div class="fail-info">
          <b>${esc(v.title)}</b>
          <small class="muted">${esc(v.failReason || "—")} · stage: ${esc(v.failStage || "download")} · auto-retries used: ${v.retryCount ?? 0}/3</small>
        </div>
        <span class="chip ${v.status === "Retrying" ? "chip-amber" : "chip-red"}">${v.status}</span>
        <button class="btn btn-mini" data-retry="${v.sr}">Retry now</button>
      </div>`).join("")
      : `<div class="empty-state ok big">All clear ✓ — nothing in the retry queue.</div>`;
    $$("#queue-body [data-retry]").forEach((b) => b.addEventListener("click", () => {
      b.disabled = true; b.textContent = "Queued…";
      RVUI.toast("Retry queued — backend would re-download now (demo).");
      RVData.addActivity("retry", "Manual retry queued from Activity page");
      renderTimeline();
    }));
  }

  function renderTimeline() {
    let acts = RVData.allActivity();
    if (state.type) acts = acts.filter((a) => a.type === state.type);
    const ic = { added: "＋", retry: "↻", duplicate: "⚑", failed: "✖", export: "⬇", edit: "✎" };
    $("#act-count").textContent = acts.length + " events";
    $("#timeline").innerHTML = acts.slice(0, 60).map((a) => `
      <div class="tl-row">
        <span class="tl-ic tl-${a.type}">${ic[a.type] || "•"}</span>
        <div class="tl-text">${esc(a.text)}</div>
        <span class="tl-time muted">${RVUI.agoTs(a.ts)}</span>
      </div>`).join("");
  }

  function refresh() { renderQueue(); renderTimeline(); }
  window.RVRefresh = refresh;
  window.RV_PAGE_activity = function () {
    $("#af-type").addEventListener("change", (e) => { state.type = e.target.value; renderTimeline(); });
    refresh();
  };
})();
