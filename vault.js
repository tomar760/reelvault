/* ReelVault — WORKFLOW & RESOURCE VAULT (v7: multi-select ☑ + ✨ REAL AI batch guide) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$, esc = RVUI.esc;
  const state = { q: "", type: "", used: "", selMode: false, sel: new Set() };

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
      const id = String(w.id), selOn = state.sel.has(id);
      let h = 0; for (const c of ty.label || "") h = (h + c.charCodeAt(0)) % 360;
      const hue = [172, 262, 334, 24, 205][h % 5];
      return `
      <article class="vault-card glass ${state.selMode && selOn ? "sel-card" : ""}" data-id="${esc(id)}" style="--vh:${hue}">
        ${state.selMode ? `<span class="sel-check ${selOn ? "on" : ""}">✓</span>` : ""}
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
          <a class="btn btn-mini btn-ghost" href="library.html">Source reel →</a>
          <a class="btn btn-mini btn-primary" href="${w.link}" target="_blank" rel="noopener">Open resource ↗</a>
        </div>
      </article>`;
    }).join("") || `<div class="empty-state big">No resources match these filters.</div>`;

    $$("#vault-grid .vault-card").forEach((c) => {
      c.addEventListener("click", (e) => {
        if (!state.selMode) return;
        if (e.target.closest("a,button")) return;
        const id = c.dataset.id;
        state.sel.has(id) ? state.sel.delete(id) : state.sel.add(id);
        render();
      });
    });
    syncBar();
  }

  /* ---------- ✨ REAL AI guide (batch ya poori filtered list) ---------- */
  function openAI(items, title) {
    if (!items.length) { RVUI.toast("Pehle kuch resources select karo (ya filter hatao)", "warn"); return; }
    const wrap = RVUI.openModal(`
      <h2 style="margin-bottom:4px">✨ AI Vault Guide</h2>
      <p class="muted" style="margin:0 0 14px;font-size:12.5px">${esc(title)} — <b>real AI (NVIDIA NIM)</b> se, koi demo text nahi.</p>
      <div class="ai-body" id="vai-body">
        <div class="ai-shimmer"><i style="width:86%"></i><i style="width:70%"></i><i style="width:78%"></i><i style="width:64%"></i><i style="width:52%"></i></div>
        <small class="muted">AI tumhare ${items.length} resources padh raha hai… (5-10 sec)</small>
      </div>`);
    RVAI.vaultGuide(items).then((r) => {
      const body = wrap.querySelector("#vai-body");
      if (!document.contains(wrap)) return;
      if (!r.ok) {
        body.innerHTML = r.reason === "nokey" ? RVAI.nokeyHtml() : RVAI.offlineHtml();
        return;
      }
      body.innerHTML = `
        <div class="ai-lines">
          ${r.bullets.map((t, i) => `<div class="ai-line vault-line"><b class="ai-num">${i + 1}</b><span>${esc(t)}</span></div>`).join("")}
        </div>
        <small class="muted" style="display:block;margin-top:10px">Sirf tumhare vault ke data se bana — kuch bhi guess nahi.</small>`;
    }).catch(() => {
      const body = wrap.querySelector("#vai-body");
      if (body && document.contains(wrap)) body.innerHTML = RVAI.offlineHtml();
    });
  }

  /* ---------- ☑ batch bar ---------- */
  function ensureBar() {
    if ($("#vault-batch-bar")) return;
    const bar = document.createElement("div");
    bar.id = "vault-batch-bar"; bar.className = "batch-bar glass-strong"; bar.hidden = true;
    bar.innerHTML = `
      <b id="vb-count">0</b>
      <button class="btn btn-mini btn-ai" id="vb-ai" type="button" title="Selected resources ka AI analysis">✨ AI Analysis</button>
      <button class="btn btn-mini btn-ghost" id="vb-exit" type="button" title="Select mode band">✕</button>`;
    document.body.appendChild(bar);
    $("#vb-ai").addEventListener("click", () => {
      const items = RVData.vault().filter((w) => state.sel.has(String(w.id)));
      openAI(items, `${items.length} selected resources`);
    });
    $("#vb-exit").addEventListener("click", () => setSelMode(false));
  }

  function syncBar() {
    const bar = $("#vault-batch-bar");
    if (!bar) return;
    bar.hidden = !state.selMode;
    document.body.classList.toggle("batch-on", state.selMode);
    $("#vb-count").textContent = `${state.sel.size} selected`;
  }

  function setSelMode(on) {
    state.selMode = !!on;
    if (!on) state.sel.clear();
    const b = $("#vf-select");
    if (b) { b.textContent = on ? "✕ Done" : "☑ Select"; b.classList.toggle("fav-on", on); }
    syncBar(); render();
  }

  window.RVRefresh = render;
  window.RV_PAGE_vault = function () {
    ensureBar();
    $("#vault-search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    $("#vf-type").innerHTML = `<option value="">All types</option>` + RVData.VAULT_TYPES.map((t) => `<option value="${t.key}">${t.label}</option>`).join("");
    $("#vf-type").addEventListener("change", (e) => { state.type = e.target.value; render(); });
    $("#vf-used").addEventListener("change", (e) => { state.used = e.target.value; render(); });
    $("#vf-ai").addEventListener("click", () => openAI(filtered(), `${filtered().length} resources (filtered list)`));
    $("#vf-select").addEventListener("click", () => setSelMode(!state.selMode));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.selMode) setSelMode(false); });
    render();
  };
})();
