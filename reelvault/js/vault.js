/* ReelVault — WORKFLOW & RESOURCE VAULT PAGE (M9, full-screen) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$, esc = RVUI.esc;
  const state = { q: "", type: "", used: "" };

  function filtered() {
    let vs = RVData.vault();
    if (state.q) { const q = state.q.toLowerCase(); vs = vs.filter((w) => [w.name, w.message, w.influencer].join(" ").toLowerCase().includes(q)); }
    if (state.type) vs = vs.filter((w) => w.type === state.type);
    if (state.used === "used") vs = vs.filter((w) => w.used);
    if (state.used === "unused") vs = vs.filter((w) => !w.used);
    return vs;
  }

  function render() {
    const vs = filtered();
    $("#vault-count").textContent = `${vs.length} resource${vs.length === 1 ? "" : "s"}`;
    $("#vault-grid").innerHTML = vs.map((w) => {
      const ty = RVData.VAULT_TYPES.find((x) => x.key === w.type) || { label: w.type, icon: "◆" };
      return `
      <article class="vault-card glass" data-id="${w.id}">
        <div class="vc-top">
          <span class="vc-ic">${ty.icon}</span>
          <span class="chip chip-violet">${ty.label}</span>
          ${w.used ? `<span class="chip chip-green" title="You have used this">Used ✓</span>` : ""}
        </div>
        <h3>${esc(w.name)}</h3>
        <p class="muted vc-msg">${esc(w.message)}</p>
        <div class="vc-meta">
          <span>${esc(w.influencer)}</span><span>·</span>
          <span>${RVUI.fmtDate(w.date)}</span><span>·</span>
          <span>from video #${esc(w.srcSr)}</span>
        </div>
        <div class="btn-row">
          <a class="btn btn-mini btn-ghost" href="library.html" >Source reel →</a>
          <a class="btn btn-mini btn-primary" href="${w.link}" target="_blank" rel="noopener">Open resource ↗</a>
        </div>
      </article>`;
    }).join("") || `<div class="empty-state big">No resources match these filters.</div>`;
  }

  window.RVRefresh = render;
  window.RV_PAGE_vault = function () {
    $("#vault-search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    $("#vf-type").innerHTML = `<option value="">All types</option>` + RVData.VAULT_TYPES.map((t) => `<option value="${t.key}">${t.label}</option>`).join("");
    $("#vf-type").addEventListener("change", (e) => { state.type = e.target.value; render(); });
    $("#vf-used").addEventListener("change", (e) => { state.used = e.target.value; render(); });
    render();
  };
})();
