/* ============================================================
   ReelVault — ANIMATED BACKGROUND ENGINE
   Every page declares a DIFFERENT effect via <body data-bg="...">
   Effects: orbs | strips | shards | waves | rings | aurora
   Performance: single canvas, rAF, pauses on hidden tab,
   reduced-motion + settings toggle supported.
   ============================================================ */
(function () {
  "use strict";
  let canvas, ctx, W, H, raf = null, t = 0, effect = null, running = false;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function cssVar(name, fb) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  function resize() {
    if (!canvas) return;
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  const R = (a, b) => a + Math.random() * (b - a);

  /* ---------------- EFFECT 1: ORBS (Dashboard) ---------------- */
  const CANDY = [100, 40, 12]; // matcha green, ochre gold, terracotta
  function makeOrbs() {
    const nodes = [];
    for (let i = 0; i < 26; i++) nodes.push({ x: R(0, W), y: R(0, H), r: R(2, 5), vx: R(-0.25, 0.25), vy: R(-0.2, 0.2), hue: CANDY[i % 3] + R(-12, 12) });
    return () => {
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 160) {
          ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 80%, 60%, ${(1 - d / 160) * 0.16})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const n of nodes) {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
        g.addColorStop(0, `hsla(${n.hue}, 55%, 48%, .42)`); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 5, 0, 7); ctx.fill();
        ctx.fillStyle = `hsla(${n.hue}, 55%, 42%, .85)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill();
      }
    };
  }

  /* ---------------- EFFECT 2: STRIPS (Library — film frames rising) ---------------- */
  function makeStrips() {
    const frames = [];
    for (let i = 0; i < 16; i++) frames.push({ x: R(0, W), y: R(0, H + 200), w: R(70, 130), h: R(44, 78), sp: R(0.25, 0.7), sway: R(0, 6.28), sa: R(0.07, 0.22), hue: CANDY[i % 3] });
    return () => {
      for (const f of frames) {
        f.y -= f.sp; f.sway += 0.008;
        if (f.y < -120) { f.y = H + 120; f.x = R(0, W); }
        const x = f.x + Math.sin(f.sway) * 14;
        ctx.strokeStyle = `hsla(${f.hue}, 85%, 70%, ${f.sa})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const r = 9;
        ctx.roundRect(x, f.y, f.w, f.h, r); ctx.stroke();
        ctx.fillStyle = `hsla(${f.hue}, 85%, 62%, ${f.sa * 0.14})`;
        ctx.beginPath(); ctx.roundRect(x, f.y, f.w, f.h, r); ctx.fill();
        // play triangle
        ctx.fillStyle = `hsla(${f.hue}, 92%, 74%, ${f.sa * 0.85})`;
        const cx = x + f.w / 2, cy = f.y + f.h / 2, s = 9;
        ctx.beginPath(); ctx.moveTo(cx - s * 0.6, cy - s); ctx.lineTo(cx - s * 0.6, cy + s); ctx.lineTo(cx + s, cy); ctx.closePath(); ctx.fill();
      }
    };
  }

  /* ---------------- EFFECT 3: SHARDS (Vault — rotating crystals) ---------------- */
  function makeShards() {
    const sh = [];
    for (let i = 0; i < 12; i++) sh.push({ x: R(0, W), y: R(0, H), s: R(26, 84), rot: R(0, 6.28), vr: R(-0.004, 0.004), vx: R(-0.15, 0.15), vy: R(-0.1, 0.1), a: R(0.05, 0.16), hue: CANDY[i % 3] });
    return () => {
      for (const s of sh) {
        s.rot += s.vr; s.x += s.vx; s.y += s.vy;
        if (s.x < -120) s.x = W + 120; if (s.x > W + 120) s.x = -120;
        if (s.y < -120) s.y = H + 120; if (s.y > H + 120) s.y = -120;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        const g = ctx.createLinearGradient(-s.s, 0, s.s, 0);
        g.addColorStop(0, `hsla(${s.hue}, 80%, 62%, ${s.a})`);
        g.addColorStop(1, `hsla(${(s.hue + 40) % 360}, 85%, 66%, ${s.a * 0.7})`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.7, s.s * 0.5); ctx.lineTo(-s.s * 0.7, s.s * 0.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = `hsla(${s.hue}, 85%, 72%, ${s.a + 0.05})`; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* ---------------- EFFECT 4: WAVES (Analytics — undulating bars + waves) ---------------- */
  function makeWaves() {
    const N = 42, bars = new Array(N).fill(0).map(() => R(0.2, 1));
    return () => {
      const bw = W / N;
      for (let i = 0; i < N; i++) {
        bars[i] += Math.sin(t / 40 + i * 0.55) * 0.012;
        bars[i] = Math.max(0.12, Math.min(1, bars[i]));
        const bh = bars[i] * H * 0.34;
        const hAlpha = 0.04 + bars[i] * 0.05;
        const g = ctx.createLinearGradient(0, H - bh, 0, H);
        g.addColorStop(0, `hsla(${CANDY[i % 3]}, 85%, 62%, ${hAlpha})`);
        g.addColorStop(1, `hsla(${CANDY[i % 3]}, 85%, 55%, ${hAlpha * 0.4})`);
        ctx.fillStyle = g;
        ctx.fillRect(i * bw + 2, H - bh, bw - 4, bh);
      }
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const y = H * (0.3 + k * 0.18) + Math.sin(x / 140 + t / 55 + k * 2) * 22 + Math.sin(x / 61 - t / 40 + k) * 9;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${CANDY[k]}, 85%, 66%, ${0.10 - k * 0.02})`;
        ctx.lineWidth = 1.4; ctx.stroke();
      }
    };
  }

  /* ---------------- EFFECT 5: RINGS (Activity — pulsing ripples) ---------------- */
  function makeRings() {
    let rings = [];
    const spawn = () => rings.push({ x: R(0, W), y: R(0, H), r: 0, max: R(90, 260), sp: R(0.5, 1.4), a: R(0.10, 0.22) });
    for (let i = 0; i < 5; i++) spawn();
    return () => {
      if (Math.random() < 0.02 && rings.length < 9) spawn();
      rings = rings.filter((r) => r.r < r.max);
      for (const r of rings) {
        r.r += r.sp;
        const fade = 1 - r.r / r.max;
        ctx.strokeStyle = `hsla(100, 45%, 45%, ${r.a * fade})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
        ctx.strokeStyle = `hsla(40, 55%, 50%, ${r.a * fade * 0.7})`;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.6, 0, 7); ctx.stroke();
      }
    };
  }

  /* ---------------- EFFECT 6: AURORA (Settings — slow silk bands) ---------------- */
  function makeAurora() {
    return () => {
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        const baseY = H * (0.2 + k * 0.22);
        for (let x = 0; x <= W; x += 8) {
          const y = baseY + Math.sin(x / 260 + t / 95 + k * 1.8) * 46 + Math.sin(x / 110 - t / 70 + k * 0.9) * 18;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const g = ctx.createLinearGradient(0, baseY - 60, 0, baseY + 60);
        g.addColorStop(0, "transparent");
        g.addColorStop(0.5, `hsla(${[100, 40, 12, 80][k]}, 60%, 55%, ${0.05 + 0.02 * Math.sin(t / 60 + k)})`);
        g.addColorStop(1, "transparent");
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = g; ctx.fill();
      }
    };
  }

  const FACTORIES = { orbs: makeOrbs, strips: makeStrips, shards: makeShards, waves: makeWaves, rings: makeRings, aurora: makeAurora };

  function frame() {
    if (!running) return;
    t++;
    ctx.clearRect(0, 0, W, H);
    effect && effect();
    raf = requestAnimationFrame(frame);
  }

  window.RV_BG = {
    start(name) {
      if (localStorage.getItem("rv_anim_bg") === "off") return;
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
      canvas = document.getElementById("rv-bg");
      if (!canvas) return;
      ctx = canvas.getContext("2d");
      resize(); window.addEventListener("resize", resize);
      effect = (FACTORIES[name] || makeOrbs)();
      running = true; frame();
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running && localStorage.getItem("rv_anim_bg") !== "off") { running = true; frame(); }
      });
    },
    toggle(on) {
      if (on) { this.start(document.body.dataset.bg || "orbs"); }
      else { running = false; cancelAnimationFrame(raf); canvas && ctx && ctx.clearRect(0, 0, W, H); }
    },
  };
})();
