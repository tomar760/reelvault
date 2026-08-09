/* ReelVault — LIBRARY PAGE (v7 FULL POWER: folders 🗂 · multi-select ☑ · drag ⠿ · progress ▶ · AI ✨) */
(function () {
  "use strict";
  const $ = RVUI.$, $$ = RVUI.$$, esc = RVUI.esc;
  const state = {
    q: "", platform: "", topic: "", rating: "", status: "", wf: false,
    sort: "date-desc", shown: 12,
    view: localStorage.getItem("rv_libview") || "grid",
    favOnly: false, fpath: "",
    selMode: false, sel: new Set(),
    openSr: "",
  };
  let suppressClick = false;

  function applyUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get("r")) state.rating = p.get("r");
    if (p.get("t")) state.topic = p.get("t");
    if (p.get("q")) state.q = p.get("q");
    if (p.get("open")) state.openSr = p.get("open");
  }

  /* ---------- data pipeline: scope (folders) → filters → sort ---------- */
  function inScope(vs) {
    if (state.view !== "folders") return vs;
    if (state.fpath === "__unfiled__") return vs.filter((v) => !RVFolders.get(v.sr));
    if (state.fpath) {
      const pre = state.fpath + "/";
      return vs.filter((v) => { const f = RVFolders.get(v.sr); return f === state.fpath || f.startsWith(pre); });
    }
    /* folders root — search/filter active ho to poore vault se results dikhao */
    const anyFilter = state.q || state.platform || state.topic || state.rating || state.status || state.wf || state.favOnly;
    return anyFilter ? vs : [];
  }

  function filtered() {
    let vs = inScope(RVData.allVideos());
    if (state.q) {
      const q = state.q.toLowerCase();
      vs = vs.filter((v) => [v.title, v.remarks, v.fileName, (v.tags || []).join(" "), v.link].join(" ").toLowerCase().includes(q));
    }
    if (state.platform) vs = vs.filter((v) => v.platform === state.platform);
    if (state.topic) vs = vs.filter((v) => v.topicKey === state.topic);
    if (state.rating) vs = vs.filter((v) => v.ratingKey === state.rating);
    if (state.status) vs = vs.filter((v) => v.status === state.status);
    if (state.wf) vs = vs.filter((v) => v.workflow);
    if (state.favOnly && window.RVFavs) vs = vs.filter((v) => RVFavs.has(v.sr));
    if (state.sort === "custom" && window.RVOrder) return RVOrder.apply(vs);
    return vs.slice().sort((a, b) => {
      switch (state.sort) {
        case "date-asc": return (a.date + a.time).localeCompare(b.date + b.time);
        case "size-desc": return (b.size || 0) - (a.size || 0);
        case "rating": return ["high", "medium", "low"].indexOf(a.ratingKey) - ["high", "medium", "low"].indexOf(b.ratingKey);
        default: return (b.date + b.time).localeCompare(a.date + b.time);
      }
    });
  }

  function statusChip(v) {
    const m = { Done: ["chip-green", "Done"], Failed: ["chip-red", "Failed"], Pending: ["chip-amber", "Pending"], Retrying: ["chip-blue", "Retrying"] };
    const [cls, label] = m[v.status] || ["chip-amber", v.status];
    return `<span class="chip ${cls}">${label}</span>`;
  }

  const durFmt = (s) => { s = Math.round(+s || 0); if (!s) return "—"; const m = Math.floor(s / 60); return m ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`; };

  function thumbOf(v, t) {
    let thumbUrl = v.thumb || "";
    if (!/^https?:\/\//.test(thumbUrl)) {
      const ym = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,20})/.exec(v.link || "");
      thumbUrl = ym ? `https://img.youtube.com/vi/${ym[1]}/mqdefault.jpg` : t.thumb;
    }
    return thumbUrl;
  }

  /* ▶ watch-progress bit (thumb overlay) */
  function wpBits(v) {
    if (!window.RVProgress) return "";
    const p = RVProgress.get(v.sr);
    if (!p) return "";
    if (p.done) return `<span class="wp-done" title="Poora dekha hua">✓ Dekha</span>`;
    if (+v.duration) return `<span class="wp-bar" title="${esc(RVProgress.fmt(v.sr, +v.duration))}"><i style="width:${RVProgress.pct(v.sr, +v.duration)}%"></i></span>`;
    return `<span class="wp-time" title="Player jitni der khula utna count">▶ ${Math.round(p.secs)}s</span>`;
  }

  /* ---------- card html (grid/list dono mein same) ---------- */
  function cardHtml(v) {
    const t = RVData.topicOf(v.topicKey), r = RVData.ratingOf(v.ratingKey), p = RVData.platformOf(v.platform);
    const sr = String(v.sr);
    const selOn = state.sel.has(sr);
    return `
    <article class="lib-card glass ${state.selMode && selOn ? "sel-card" : ""}" data-sr="${esc(sr)}">
      <div class="lib-thumb" style="background-image:url('${t.thumb}')">
        <img class="lib-thumb-img" loading="lazy" src="${thumbOf(v, t)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()"/>
        <span class="plat-badge" style="background:${p.color}">${p.code}</span>
        ${window.RVFavs && RVFavs.has(v.sr) ? `<span class="fav-badge">♥</span>` : ""}
        ${!state.selMode && state.view !== "folders" ? `<span class="drag-handle" title="Pakdo aur drag karo — apna order banao">⠿</span>` : ""}
        ${state.selMode ? `<span class="sel-check ${selOn ? "on" : ""}">✓</span>` : ""}
        <span class="dur">${durFmt(v.duration)}</span>
        ${v.status !== "Done" ? `<span class="thumb-flag">${v.status}</span>` : ""}
        ${wpBits(v)}
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
          ${window.RVLeads && RVLeads.has(v.sr) ? `<span class="chip chip-ghost lead-chip" title="Influencer ka lead/DM saved hai">💬 Lead</span>` : ""}
          ${state.view !== "folders" && window.RVFolders && RVFolders.get(v.sr) ? `<span class="chip chip-ghost" title="Folder">🗂 ${esc(RVFolders.get(v.sr))}</span>` : ""}
        </div>
      </div>
    </article>`;
  }

  /* ---------- 🗂 folder cards ---------- */
  function folderCardHtml(f, icon) {
    let h = 0; for (const c of f.name) h = (h + c.charCodeAt(0)) % 360;
    const hue = [172, 262, 334, 24, 205][h % 5]; // aurora hues only
    return `
    <article class="folder-card glass" data-fp="${esc(f.path)}">
      <span class="folder-ic" style="--fh:${hue}">${icon || "🗂"}</span>
      <div class="folder-info"><b>${esc(f.name)}</b><small class="muted">${f.count} video${f.count === 1 ? "" : "s"}</small></div>
      <span class="folder-go">→</span>
    </article>`;
  }

  function renderCrumbs() {
    const c = $("#lib-crumbs");
    if (state.view !== "folders") { c.hidden = true; c.innerHTML = ""; return; }
    c.hidden = false;
    const parts = state.fpath && state.fpath !== "__unfiled__" ? state.fpath.split("/") : [];
    let acc = "";
    c.innerHTML =
      `<button class="crumb ${!state.fpath ? "on" : ""}" data-fp="" type="button">🗂 Folders</button>` +
      (state.fpath === "__unfiled__"
        ? `<span class="crumb-sep">›</span><button class="crumb on" data-fp="__unfiled__" type="button">📥 Baaki Videos</button>`
        : parts.map((p) => { acc = acc ? acc + "/" + p : p; return `<span class="crumb-sep">›</span><button class="crumb ${acc === state.fpath ? "on" : ""}" data-fp="${esc(acc)}" type="button">${esc(p)}</button>`; }).join("")) +
      `<span class="crumb-hint muted">view badalne ke liye upar ▦ wala button</span>`;
    c.querySelectorAll(".crumb").forEach((b) => b.addEventListener("click", () => {
      state.fpath = b.dataset.fp || ""; state.shown = 12; render();
    }));
  }

  /* ---------- main render ---------- */
  function render() {
    const grid = $("#lib-grid");
    grid.className = state.view === "list" ? "lib-grid lib-list" : "lib-grid";
    renderCrumbs();
    let html = "";

    if (state.view === "folders") {
      const all = RVData.allVideos();
      const kids = RVFolders.children(state.fpath === "__unfiled__" ? "" : state.fpath, all);
      if (!state.fpath) {
        const un = RVFolders.unfiled(all);
        html += kids.map((f) => folderCardHtml(f)).join("");
        if (un.length) html += folderCardHtml({ path: "__unfiled__", name: "Baaki Videos", count: un.length }, "📥");
        if (!kids.length && !un.length) {
          grid.innerHTML = `<div class="empty-state big">Abhi koi video nahi. 🗂 Folders tab kaam aayenge jab videos hongi — card kholo → <b>🗂 Move…</b>, ya ☑ Select se batch move.</div>`;
          finishCount(0);
          $("#lib-more").style.display = "none";
          syncBar();
          return;
        }
      } else html += kids.map((f) => folderCardHtml(f)).join("");
    }

    const vs = filtered();
    const shown = vs.slice(0, state.shown);
    html += shown.map(cardHtml).join("");

    if (state.view === "folders" && state.fpath && !vs.length && !html.includes("folder-card")) {
      html = `<div class="empty-state big">Is folder mein koi video nahi mili.</div>`;
    }
    if (state.view !== "folders" && !vs.length) {
      html = `<div class="empty-state big">No videos match these filters.</div>`;
    }
    grid.innerHTML = html;

    /* wire folder cards */
    grid.querySelectorAll(".folder-card").forEach((c) => c.addEventListener("click", () => {
      state.fpath = c.dataset.fp; state.shown = 12; render();
    }));
    /* wire video cards */
    grid.querySelectorAll(".lib-card").forEach((c) => {
      c.addEventListener("click", () => {
        if (suppressClick) return;
        const sr = c.dataset.sr;
        if (state.selMode) { toggleSel(sr); return; }
        openDetail(sr);
      });
      const h = c.querySelector(".drag-handle");
      if (h) wireDrag(h, c);
    });

    finishCount(vs.length);
    $("#lib-more").style.display =
      vs.length > state.shown && !(state.view === "folders" && !state.fpath) ? "" : "none";
    syncBar();
  }

  function finishCount(n) {
    if (state.view === "folders") {
      const all = RVData.allVideos();
      const fc = RVFolders.allPaths().filter((p) => RVFolders.insideCount(p, all) > 0).length;
      $("#lib-count").textContent = state.fpath
        ? `${n} video${n === 1 ? "" : "s"} · is folder mein`
        : `${fc} folder${fc === 1 ? "" : "s"} · ${all.length} videos total`;
    } else {
      $("#lib-count").textContent = `${n} video${n === 1 ? "" : "s"}`;
    }
  }

  /* ---------- ☑ multi-select + batch bar ---------- */
  function ensureBar() {
    if ($("#batch-bar")) return;
    const bar = document.createElement("div");
    bar.id = "batch-bar"; bar.className = "batch-bar glass-strong"; bar.hidden = true;
    bar.innerHTML = `
      <b id="bb-count">0</b>
      <button class="btn btn-mini" id="bb-fav" type="button" title="Sabko favourite karo">♥ Fav</button>
      <button class="btn btn-mini" id="bb-unfav" type="button" title="Favourite hatao">♡</button>
      <button class="btn btn-mini btn-ai" id="bb-move" type="button" title="Folder mein daalo">🗂 Move</button>
      <button class="btn btn-mini btn-ghost" id="bb-exit" type="button" title="Select mode band">✕</button>`;
    document.body.appendChild(bar);
    const srs = () => [...state.sel];
    $("#bb-fav").addEventListener("click", () => {
      let n = 0; srs().forEach((sr) => { if (!RVFavs.has(sr)) { RVFavs.toggle(sr); n++; } });
      RVUI.toast(n ? `${n} videos favourites mein ♥` : "Sab pehle se favourites mein hain");
      render();
    });
    $("#bb-unfav").addEventListener("click", () => {
      let n = 0; srs().forEach((sr) => { if (RVFavs.has(sr)) { RVFavs.toggle(sr); n++; } });
      RVUI.toast(n ? `${n} favourites se hataye` : "In mein se koi favourite tha hi nahi");
      render();
    });
    $("#bb-move").addEventListener("click", async () => {
      if (!state.sel.size) { RVUI.toast("Pehle kuch select karo", "warn"); return; }
      const p = await RVUI.pickFolder("");
      if (p === null) return;
      const n = state.sel.size;
      RVFolders.moveMany(srs(), p);
      RVUI.toast(`${n} video${n === 1 ? "" : "s"} → ${p ? "🗂 " + p : "📥 Baaki Videos"}`);
      state.sel.clear(); syncBar(); render();
    });
    $("#bb-exit").addEventListener("click", () => setSelMode(false));
  }

  function syncBar() {
    const bar = $("#batch-bar");
    if (!bar) return;
    bar.hidden = !state.selMode;
    document.body.classList.toggle("batch-on", state.selMode);
    $("#bb-count").textContent = `${state.sel.size} selected`;
  }

  function toggleSel(sr) {
    sr = String(sr);
    state.sel.has(sr) ? state.sel.delete(sr) : state.sel.add(sr);
    render();
  }

  function setSelMode(on) {
    state.selMode = !!on;
    if (!on) state.sel.clear();
    const b = $("#f-select");
    if (b) { b.textContent = on ? "✕ Done" : "☑ Select"; b.classList.toggle("fav-on", on); }
    syncBar(); render();
  }

  /* ---------- ⠿ drag & drop custom order ---------- */
  function wireDrag(handle, card) {
    handle.style.touchAction = "none";
    handle.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); });
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      let started = false, ghost = null, target = null, before = true;
      const dragSr = card.dataset.sr;

      const begin = (ev) => {
        started = true;
        ghost = card.cloneNode(true);
        const r = card.getBoundingClientRect();
        ghost.classList.add("drag-ghost");
        ghost.style.width = r.width + "px";
        ghost.style.left = r.left + "px";
        ghost.style.top = r.top + "px";
        document.body.appendChild(ghost);
        card.classList.add("drag-src");
        try { navigator.vibrate && navigator.vibrate(8); } catch (_) {}
      };
      const move = (ev) => {
        if (!started) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return; begin(ev); }
        ghost.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px) rotate(1.4deg)`;
        /* edge auto-scroll — phone pe neeche/upar le jaate waqt page khud scroll ho */
        const EDGE = 70;
        if (ev.clientY < EDGE) window.scrollBy(0, -16);
        else if (ev.clientY > window.innerHeight - EDGE) window.scrollBy(0, 16);
        $$("#lib-grid .lib-card").forEach((c) => c.classList.remove("drop-before", "drop-after"));
        if (ev.cancelable) ev.preventDefault();
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const over = el && el.closest ? el.closest(".lib-card") : null;
        if (over && over !== card) {
          const r = over.getBoundingClientRect();
          const cy = r.top + r.height / 2, cx = r.left + r.width / 2;
          before = ev.clientY < cy - 4 || (Math.abs(ev.clientY - cy) <= r.height / 2 && ev.clientX < cx);
          over.classList.add(before ? "drop-before" : "drop-after");
          target = over;
        } else target = null;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (ghost) ghost.remove();
        card.classList.remove("drag-src");
        $$("#lib-grid .lib-card").forEach((c) => c.classList.remove("drop-before", "drop-after"));
        if (started) {
          suppressClick = true; setTimeout(() => (suppressClick = false), 380);
          commit(target, before, dragSr);
        }
      };
      const commit = (tEl, bef, dsr) => {
        if (!tEl) return;
        const order = $$("#lib-grid .lib-card").map((c) => c.dataset.sr).filter(Boolean);
        const from = order.indexOf(dsr); if (from < 0) return;
        order.splice(from, 1);
        let to = order.indexOf(tEl.dataset.sr); if (to < 0) return;
        if (!bef) to++;
        order.splice(to, 0, dsr);
        const rest = RVData.allVideos().map((v) => String(v.sr));
        const full = [...new Set([...order, ...RVOrder.get(), ...rest])];
        RVOrder.set(full);
        if (state.sort !== "custom") {
          state.sort = "custom";
          const sel = $("#f-sort"); if (sel) sel.value = "custom";
          RVUI.toast("✨ 'My order' ban gaya — ab yahi sort chalu hai");
        } else RVUI.toast("Order save ho gaya ✨");
        render();
      };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  }

  /* ---------- ✨ AI key points block (detail modal) ---------- */
  function aiBlockHtml(v) {
    const c = window.RVAI ? RVAI.cache.get("vp_" + v.sr) : null;
    return `
    <div class="fld-block ai-box" id="dt-ai">
      <div class="ai-head"><span>✨ AI Key Points</span><small class="muted">${c ? "saved · " + new Date(c.t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "real AI (NIM) — sirf is video ke data se"}</small></div>
      <div class="ai-body" id="dt-ai-body">
        ${c ? aiBulletsHtml(v, c.b, true) : `<button class="btn btn-mini btn-ai" id="dt-ai-go" type="button">✨ Key points banao</button>`}
      </div>
    </div>`;
  }
  function aiBulletsHtml(v, arr, fromCache) {
    const checks = window.RVChecks ? RVChecks.list(v.sr) : [];
    return `
      <div class="ai-lines">
        ${arr.map((t, i) => `<label class="ai-line ${checks.includes(i) ? "done" : ""}"><input type="checkbox" data-i="${i}" ${checks.includes(i) ? "checked" : ""}/><span>${esc(t)}</span></label>`).join("")}
      </div>
      <div class="ai-foot">
        <button class="btn btn-mini btn-ghost" id="dt-ai-re" type="button" title="Naye points banao">↻ Naya banao</button>
        <small class="muted">${fromCache ? "cache se · AI calls bachao" : "abhi-abhi AI se"}</small>
      </div>`;
  }
  function wireAIBlock(wrap, v) {
    const body = wrap.querySelector("#dt-ai-body");
    if (!body) return;
    const wireLines = () => {
      body.querySelectorAll(".ai-line input").forEach((cb) => cb.addEventListener("change", () => {
        if (!window.RVChecks) return;
        const on = RVChecks.toggle(v.sr, +cb.dataset.i);
        cb.closest(".ai-line").classList.toggle("done", on);
        const left = body.querySelectorAll(".ai-line:not(.done)").length;
        if (left === 0) RVUI.toast("Saare points complete — badhiya! 🎉");
      }));
      const re = body.querySelector("#dt-ai-re");
      if (re) re.addEventListener("click", () => generate(true));
    };
    const generate = async (force) => {
      body.innerHTML = `<div class="ai-shimmer"><i style="width:88%"></i><i style="width:72%"></i><i style="width:80%"></i><i style="width:60%"></i></div><small class="muted">AI tumhare video ka data padh raha hai… (5-10 sec)</small>`;
      const r = await RVAI.videoPoints(v, force);
      if (!r.ok) {
        body.innerHTML = (r.reason === "nokey" ? RVAI.nokeyHtml() : RVAI.offlineHtml()) +
          `<div style="margin-top:10px"><button class="btn btn-mini btn-ai" id="dt-ai-go" type="button">↻ Dobara try karo</button></div>`;
        const g = body.querySelector("#dt-ai-go");
        if (g) g.addEventListener("click", () => generate(false));
        return;
      }
      body.innerHTML = aiBulletsHtml(v, r.bullets, r.cached);
      wireLines();
      if (!r.cached) RVUI.toast("✨ AI points ready — checkbox se track karo");
    };
    const go = body.querySelector("#dt-ai-go");
    if (go) go.addEventListener("click", () => generate(false));
    wireLines();
  }

  /* ---------- 💬 Influencer DM / Lead block (baad mein kabhi bhi add/edit) ---------- */
  function leadBlockHtml(v) {
    const L = window.RVLeads && RVLeads.get(v.sr);
    return `<div class="fld-block lead-block">
      <span>💬 Influencer DM / Lead</span>
      ${L ? `
        ${L.msg ? `<p class="remark-box">${esc(L.msg)}</p>` : ""}
        <div class="btn-row" style="margin-top:6px">
          ${L.link ? `<a class="btn btn-mini btn-ghost" href="${esc(L.link)}" target="_blank" rel="noopener">Open resource ↗</a>` : ""}
          <button class="btn btn-mini" id="dt-lead-edit" type="button">✏️ Edit lead</button>
        </div>`
      : `<p class="muted" style="font-size:12px;margin:2px 0 6px">Influencer ka DM / workflow link aane par yahan save kar do — kabhi bhi, kitni baar bhi edit kar sakte ho.</p>
         <button class="btn btn-mini" id="dt-lead-edit" type="button">＋ Add lead</button>`}
    </div>`;
  }
  function wireLeadBlock(wrap, v) {
    const btn = wrap.querySelector("#dt-lead-edit");
    if (!btn || !window.RVLeads) return;
    btn.addEventListener("click", () => {
      const blk = wrap.querySelector(".lead-block");
      if (!blk) return;
      const L = RVLeads.get(v.sr) || {};
      blk.innerHTML = `<span>💬 Influencer DM / Lead</span>
        <textarea id="dt-lead-msg" rows="3" placeholder="Influencer ka message yahan paste karo…">${esc(L.msg || "")}</textarea>
        <input id="dt-lead-link" type="url" placeholder="Resource link (optional) — https://…" value="${esc(L.link || "")}" style="margin-top:7px"/>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn btn-primary btn-mini" id="dt-lead-save" type="button">Save lead</button>
          <button class="btn btn-ghost btn-mini" id="dt-lead-cancel" type="button">Cancel</button>
        </div>`;
      blk.querySelector("#dt-lead-save").addEventListener("click", () => {
        RVLeads.set(v.sr, { msg: blk.querySelector("#dt-lead-msg").value.trim(), link: blk.querySelector("#dt-lead-link").value.trim() });
        RVUI.toast("💬 Lead save ho gaya — backup JSON mein bhi shamil hai");
        if (RVData.addActivity) RVData.addActivity("edit", `Lead saved — “${String(v.title).slice(0, 38)}…”`);
        render(); openDetail(v.sr);
      });
      blk.querySelector("#dt-lead-cancel").addEventListener("click", () => openDetail(v.sr));
    });
  }

  /* ---------- detail modal ---------- */
  function openDetail(sr) {
    const v = RVData.allVideos().find((x) => String(x.sr) === String(sr));
    if (!v) return;
    if (window.RVRecent) RVRecent.push(v.sr);
    const t = RVData.topicOf(v.topicKey), r = RVData.ratingOf(v.ratingKey), p = RVData.platformOf(v.platform);
    const driveId = (/\/d\/([a-zA-Z0-9_-]{15,})/.exec(v.driveLink || "") || [])[1] || "";
    const ytIdM = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,20})/.exec(v.link || "");
    const player = driveId
      ? { src: `https://drive.google.com/file/d/${driveId}/preview` }
      : (ytIdM && v.platform === "YouTube") ? { src: `https://www.youtube-nocookie.com/embed/${ytIdM[1]}?rel=0` } : null;

    const curFolder = window.RVFolders ? RVFolders.get(v.sr) : "";
    const wpTxt = window.RVProgress ? RVProgress.fmt(v.sr, +v.duration || 0) : "";

    const wrap = RVUI.openModal(`
      <div class="detail">
        <div class="detail-thumb" style="background-image:url('${t.thumb}')">
          <img class="lib-thumb-img" loading="lazy" src="${thumbOf(v, t)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()"/>
          <span class="plat-badge" style="background:${p.color}">${p.code}</span>
          ${player ? `<button class="dt-play" id="dt-play" type="button" title="Play yahin, ReelVault ke andar">▶</button>` : ""}
        </div>
        <h2>${esc(v.title)}</h2>
        <div class="lib-meta" style="margin:6px 0 12px">
          <span class="chip topic-chip" style="--tc:${t.color}">${t.label}</span>
          <span class="chip rate-chip" style="--rc:${r.color}">${r.label}</span>
          <span class="chip ${v.status === "Done" ? "chip-green" : "chip-red"}">${v.status}</span>
          ${wpTxt ? `<span class="chip chip-blue" id="dt-wp">${esc(wpTxt)}</span>` : `<span class="chip chip-blue" id="dt-wp" hidden></span>`}
        </div>
        <div class="kv-grid">
          ${kv("Sr. No.", v.sr)} ${kv("Added", RVUI.fmtDate(v.date) + " · " + v.time)}
          ${kv("Size", v.size ? v.size + " MB" : "—")} ${kv("Duration", durFmt(v.duration))}
          ${kv("Importance", v.importance)} ${kv("Added from", v.src)}
        </div>
        <div class="fld-block">
          <span>🗂 Folder</span>
          <div class="fld-folder-row">
            <code id="dt-folder-name">${curFolder ? esc(curFolder) : "📥 Baaki Videos (unfiled)"}</code>
            <button class="btn btn-mini" id="dt-move" type="button">Move…</button>
          </div>
        </div>
        <div class="fld-block"><span>File name</span><code>${esc(v.fileName)}</code></div>
        <div class="fld-block"><span>Drive folder</span><code>${esc(v.folderPath)}</code></div>
        ${v.remarks ? `<div class="fld-block"><span>Remarks / influencer message</span><p class="remark-box">${esc(v.remarks)}</p></div>` : ""}
        ${(v.tags || []).length ? `<div class="fld-block"><span>Tags</span><div>${v.tags.map((x) => `<span class="chip chip-ghost">#${esc(x)}</span>`).join(" ")}</div></div>` : ""}
        ${leadBlockHtml(v)}
        ${aiBlockHtml(v)}
        <div class="fld-block">
          <span>Change rating (Drive folder auto-moves in the real backend)</span>
          <div class="rate-row" id="dt-rate">
            ${RVData.RATINGS.map((x) => `<button data-r="${x.key}" class="rate-btn rate-${x.key === "high" ? "high" : x.key === "medium" ? "med" : "low"} ${x.key === v.ratingKey ? "active" : ""}">${x.label}</button>`).join("")}
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost" id="dt-fav" type="button">${window.RVFavs && RVFavs.has(v.sr) ? "♥ Favourited" : "♡ Favourite"}</button>
          <a class="btn btn-ghost" href="${v.link}" target="_blank" rel="noopener">Open Original ↗</a>
          <a class="btn btn-primary" href="${v.driveLink}" target="_blank" rel="noopener">Open in Drive ↗</a>
        </div>
      </div>`);

    /* ▶ poster → real player + ▶ progress tracking (honest: jitni der khula) */
    let watchTimer = null;
    const startWatch = () => {
      if (watchTimer) return;
      watchTimer = setInterval(() => {
        if (!document.contains(wrap)) { clearInterval(watchTimer); watchTimer = null; render(); return; }
        RVProgress.add(v.sr, 5, +v.duration || 0);
        const chip = wrap.querySelector("#dt-wp");
        if (chip) { chip.hidden = false; chip.textContent = RVProgress.fmt(v.sr, +v.duration || 0); }
      }, 5000);
    };
    const playBtn = wrap.querySelector("#dt-play");
    if (playBtn && player) playBtn.addEventListener("click", () => {
      const th = wrap.querySelector(".detail-thumb");
      if (th) {
        th.innerHTML = `<iframe src="${player.src}" allow="autoplay; fullscreen" allowfullscreen style="width:100%;height:100%;border:0;border-radius:inherit;display:block"></iframe>`;
        startWatch();
        RVUI.toast("▶ Progress ab track ho rahi hai (honest count — jitna dekha utna hi)");
      }
    });

    /* 🗂 move to folder */
    const mv = wrap.querySelector("#dt-move");
    if (mv) mv.addEventListener("click", async () => {
      const cur = RVFolders.get(v.sr);
      const p = await RVUI.pickFolder(cur);
      if (p === null) { openDetail(v.sr); return; } // picker band — modal wapas kholo
      RVFolders.set(v.sr, p);
      RVUI.toast(`🗂 ${p ? p : "Baaki Videos"} mein daal diya`);
      render();
      openDetail(v.sr);
    });

    /* ✨ AI block */
    if (window.RVAI) wireAIBlock(wrap, v);

    /* 💬 lead block */
    wireLeadBlock(wrap, v);

    /* ♥ favourite toggle */
    const favBtn = wrap.querySelector("#dt-fav");
    if (favBtn && window.RVFavs) favBtn.addEventListener("click", () => {
      const on = RVFavs.toggle(v.sr);
      favBtn.textContent = on ? "♥ Favourited" : "♡ Favourite";
      RVUI.toast(on ? "Favourites mein add hua ♥" : "Favourites se hataya");
      render();
    });

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

  /* ---------- filters / toolbar ---------- */
  const VIEW_LABELS = { grid: "▦ Grid view", list: "☰ List view", folders: "🗂 Folders" };
  function paintViewBtn() {
    const vb = $("#f-view");
    if (vb) vb.textContent = VIEW_LABELS[state.view] || VIEW_LABELS.grid;
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
    if (state.q) $("#lib-search").value = state.q;

    /* ▦/☰/🗂 view cycle */
    paintViewBtn();
    $("#f-view").addEventListener("click", () => {
      state.view = state.view === "grid" ? "list" : state.view === "list" ? "folders" : "grid";
      localStorage.setItem("rv_libview", state.view);
      state.shown = 12;
      paintViewBtn(); render();
      if (state.view === "folders" && !RVFolders.allPaths().length) {
        RVUI.toast("Folders abhi khali hain — card kholo → 🗂 Move… ya ☑ Select se batch move", "warn", 4600);
      }
    });
    /* ☑ select mode */
    $("#f-select").addEventListener("click", () => setSelMode(!state.selMode));
    /* ♥ favourites */
    const fb = $("#f-fav");
    if (fb) {
      const paintF = () => { fb.classList.toggle("fav-on", state.favOnly); fb.textContent = state.favOnly ? "♥ Favourites" : "♡ Favourites"; };
      paintF();
      fb.addEventListener("click", () => { state.favOnly = !state.favOnly; paintF(); render(); });
    }
    $("#f-sort").addEventListener("change", (e) => {
      state.sort = e.target.value; render();
      if (state.sort === "custom" && !RVOrder.get().length) {
        RVUI.toast("Apna order banane ke liye kisi card ka ⠿ pakdo aur drag karo", "warn", 4600);
      }
    });
    if (state.sort) $("#f-sort").value = state.sort;
    $("#f-wf").addEventListener("change", (e) => { state.wf = e.target.checked; state.shown = 12; render(); });
    $("#lib-more").addEventListener("click", () => { state.shown += 12; render(); });
    $("#lib-clear").addEventListener("click", () => {
      Object.assign(state, { q: "", platform: "", topic: "", rating: "", status: "", wf: false, shown: 12, favOnly: false, fpath: "" });
      if ($("#f-fav")) $("#f-fav").classList.remove("fav-on");
      $("#lib-search").value = ""; ["#f-platform", "#f-topic", "#f-rating", "#f-status"].forEach((id) => ($(id).value = ""));
      $("#f-wf").checked = false; setSelMode(false); render();
      RVUI.toast("Filters cleared");
    });
    /* Esc = select mode band (sabse pehle) */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.selMode) setSelMode(false);
    });
  }

  window.RVRefresh = render;
  window.RV_PAGE_library = function () {
    applyUrl(); ensureBar(); wireFilters(); render();
    if (state.openSr) { const s = state.openSr; state.openSr = ""; setTimeout(() => openDetail(s), 350); }
  };
})();
