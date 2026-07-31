/* ReelVault — LIBRARY PAGE (M4 + M5, full-screen version) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$, esc = RVUI.esc;
  const state = { q: "", platform: "", topic: "", rating: "", status: "", wf: false, sort: "date-desc", shown: 12 };

  function applyUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get("r")) state.rating = p.get("r");
    if (p.get("t")) state.topic = p.get("t");
  }

  function filtered() {
    let vs = RVData.allVideos();
    if (state.q) {
      const q = state.q.toLowerCase();
      vs = vs.filter((v) => [v.title, v.remarks, v.fileName, (v.tags || []).join(" "), v.link].join(" ").toLowerCase().includes(q));
    }
    if (state.platform) vs = vs.filter((v) => v.platform === state.platform);
    if (state.topic) vs = vs.filter((v) => v.topicKey === state.topic);
    if (state.rating) vs = vs.filter((v) => v.ratingKey === state.rating);
    if (state.status) vs = vs.filter((v) => v.status === state.status);
    if (state.wf) vs = vs.filter((v) => v.workflow);
    vs = vs.slice().sort((a, b) => {
      switch (state.sort) {
        case "date-asc": return (a.date + a.time).localeCompare(b.date + b.time);
        case "size-desc": return (b.size || 0) - (a.size || 0);
        case "rating": return ["high", "medium", "low"].indexOf(a.ratingKey) - ["high", "medium", "low"].indexOf(b.ratingKey);
        default: return (b.date + b.time).localeCompare(a.date + a.time);
      }
    });
    return vs;
  }

  function statusChip(v) {
    const m = { Done: ["chip-green", "Done"], Failed: ["chip-red", "Failed"], Pending: ["chip-amber", "Pending"], Retrying: ["chip-blue", "Retrying"] };
    const [cls, label] = m[v.status] || ["chip-amber", v.status];
    return `<span class="chip ${cls}">${label}</span>`;
  }

  function render() {
    const vs = filtered();
    const shown = vs.slice(0, state.shown);
    $("#lib-count").textContent = `${vs.length} video${vs.length === 1 ? "" : "s"}`;
    $("#lib-grid").innerHTML = shown.map((v) => {
      const t = RVData.topicOf(v.topicKey), r = RVData.ratingOf(v.ratingKey), p = RVData.platformOf(v.platform);
      return `
      <article class="lib-card glass" data-sr="${v.sr}">
        <div class="lib-thumb" style="background-image:url('${t.thumb}')">
          <span class="plat-badge" style="background:${p.color}">${p.code}</span>
          <span class="dur">${v.duration ? v.duration + "s" : "—"}</span>
          ${v.status !== "Done" ? `<span class="thumb-flag">${v.status}</span>` : ""}
        </div>
        <div class="lib-body">
          <h3 class="lib-title" title="${esc(v.title)}">${esc(v.title)}</h3>
          <div class="lib-meta">
            <span class="chip topic-chip" style="--tc:${t.color}">${t.label}</span>
            <span class="chip rate-chip" style="--rc:${r.color}">${r.label}</span>
          </div>
          <div class="lib-foot">
            ${statusChip(v)}
            <span class="muted">${RVUI.fmtDate(v.date)}</span>
            ${v.workflow ? `<span class="chip chip-violet" title="Workflow received">⚙ WF</span>` : ""}
          </div>
        </div>
      </article>`;
    }).join("") || `<div class="empty-state big">No videos match these filters.</div>`;

    $("#lib-more").style.display = vs.length > state.shown ? "" : "none";
    $$("#lib-grid .lib-card").forEach((c) => c.addEventListener("click", () => openDetail(c.dataset.sr)));
  }

  function openDetail(sr) {
    const v = RVData.allVideos().find((x) => x.sr === sr);
    if (!v) return;
    const t = RVData.topicOf(v.topicKey), r = RVData.ratingOf(v.ratingKey), p = RVData.platformOf(v.platform);
    const wrap = RVUI.openModal(`
      <div class="detail">
        <div class="detail-thumb" style="background-image:url('${t.thumb}')">
          <span class="plat-badge" style="background:${p.color}">${p.code}</span>
        </div>
        <h2>${esc(v.title)}</h2>
        <div class="lib-meta" style="margin:6px 0 12px">
          <span class="chip topic-chip" style="--tc:${t.color}">${t.label}</span>
          <span class="chip rate-chip" style="--rc:${r.color}">${r.label}</span>
          <span class="chip ${v.status === "Done" ? "chip-green" : "chip-red"}">${v.status}</span>
        </div>
        <div class="kv-grid">
          ${kv("Sr. No.", v.sr)} ${kv("Added", RVUI.fmtDate(v.date) + " · " + v.time)}
          ${kv("Size", v.size ? v.size + " MB" : "—")} ${kv("Duration", v.duration ? v.duration + " s" : "—")}
          ${kv("Importance", v.importance)} ${kv("Added from", v.src)}
        </div>
        <div class="fld-block"><span>File name</span><code>${esc(v.fileName)}</code></div>
        <div class="fld-block"><span>Drive folder</span><code>${esc(v.folderPath)}</code></div>
        ${v.remarks ? `<div class="fld-block"><span>Remarks / influencer message</span><p class="remark-box">${esc(v.remarks)}</p></div>` : ""}
        ${(v.tags || []).length ? `<div class="fld-block"><span>Tags</span><div>${v.tags.map((x) => `<span class="chip chip-ghost">#${esc(x)}</span>`).join(" ")}</div></div>` : ""}
        <div class="fld-block">
          <span>Change rating (Drive folder auto-moves in the real backend)</span>
          <div class="rate-row" id="dt-rate">
            ${RVData.RATINGS.map((x) => `<button data-r="${x.key}" class="rate-btn rate-${x.key === "high" ? "high" : x.key === "medium" ? "med" : "low"} ${x.key === v.ratingKey ? "active" : ""}">${x.label}</button>`).join("")}
          </div>
        </div>
        <div class="btn-row">
          <a class="btn btn-ghost" href="${v.link}" target="_blank" rel="noopener">Open Original ↗</a>
          <a class="btn btn-primary" href="${v.driveLink}" target="_blank" rel="noopener">Open in Drive ↗</a>
        </div>
      </div>`);
    function kv(k, val) { return `<div class="kv"><span class="muted">${k}</span><b>${esc(String(val))}</b></div>`; }
    $$("#dt-rate .rate-btn").forEach((b) => b.addEventListener("click", () => {
      const nr = b.dataset.r;
      if (RVData.updateUserVideo(sr, { ratingKey: nr, importance: RVData.ratingOf(nr).importance, modified: new Date().toISOString().slice(0, 16).replace("T", " ") })) {
        $$("#dt-rate .rate-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        RVData.addActivity("edit", `Rating changed — “${v.title.slice(0, 38)}…” → ${RVData.ratingOf(nr).label}`);
        RVUI.toast("Rating updated — file would move folders (demo).");
        render();
      } else {
        RVUI.toast("Rating change is saved only for items you added in this demo.", "warn", 4200);
      }
    }));
  }

  function wireFilters() {
    $("#lib-search").addEventListener("input", (e) => { state.q = e.target.value; state.shown = 12; render(); });
    const mk = (id, key, items, labelFn) => {
      const sel = $(id);
      sel.innerHTML = `<option value="">All</option>` + items.map((i) => `<option value="${labelFn(i)[0]}">${labelFn(i)[1]}</option>`).join("");
      sel.addEventListener("change", (e) => { state[key] = e.target.value; state.shown = 12; render(); });
      return sel;
    };
    mk("#f-platform", "platform", RVData.PLATFORMS, (p) => [p.key, p.key]);
    const ts = mk("#f-topic", "topic", RVData.TOPICS, (t) => [t.key, t.label]);
    const rs = mk("#f-rating", "rating", RVData.RATINGS, (r) => [r.key, r.label]);
    mk("#f-status", "status", ["Done", "Pending", "Failed", "Retrying"], (s) => [s, s]);
    if (state.topic) ts.value = state.topic;
    if (state.rating) rs.value = state.rating;
    $("#f-sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
    $("#f-wf").addEventListener("change", (e) => { state.wf = e.target.checked; state.shown = 12; render(); });
    $("#lib-more").addEventListener("click", () => { state.shown += 12; render(); });
    $("#lib-clear").addEventListener("click", () => {
      Object.assign(state, { q: "", platform: "", topic: "", rating: "", status: "", wf: false, shown: 12 });
      $("#lib-search").value = ""; ["#f-platform", "#f-topic", "#f-rating", "#f-status"].forEach((id) => ($(id).value = ""));
      $("#f-wf").checked = false; render();
      RVUI.toast("Filters cleared");
    });
  }

  window.RVRefresh = render;
  window.RV_PAGE_library = function () {
    applyUrl(); wireFilters(); render();
  };
})();
