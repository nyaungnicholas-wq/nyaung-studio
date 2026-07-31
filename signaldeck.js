/* ============================================================
   SIGNALDECK — scroll-driven case study (work-signaldeck.html)

   One WebGL renderer, seven act-scenes built lazily on intersection and
   disposed on exit. Same guards as scene.js: skipped entirely on phones
   (max-width: 768px) and under prefers-reduced-motion, and wrapped so a
   WebGL failure leaves the static SVG figures carrying the whole narrative.

   EVERY NUMBER BELOW TRACES TO A SOURCE IN ~/claude code/signaldeck.
   Nothing is rounded for effect and nothing is here that could not be
   traced — claims that could not be sourced were cut, not approximated.
   ============================================================ */
import * as THREE from 'three';

/* ------------------------------------------------------------
   SIGNALDECK_FACTS — the single hardcoded source of truth.
   No live API calls: the daemon is local-only and this page is a
   static artifact. Source cited per figure.
   ------------------------------------------------------------ */
export const SIGNALDECK_FACTS = {
  // --- Act 3: the live directional record and its retirement ---
  // SOURCE: signaldeck/PREDICTION_PROCESS.md, "Layer 6 — What it does with a failure"
  directional: {
    accuracy: 0.481,          // 48.1% live
    n: 13044,                 // independent (symbol, horizon, UTC-day) observations
    nullAccuracy: 0.546,      // majority-class (not 50%) baseline
    skillPP: -6.5,            // 48.1 - 54.6
    verdict: 'retired',       // internal/modelhealth -> emitting: false
    emitting: false,
    // Inversion arithmetic, on record in the same section:
    invertedAccuracy: 0.519,  // 1 - 0.481
    invertedGapPP: -2.7,      // 51.9 - 54.6, still below the null
    inversionUsefulBelow: 0.454, // 1 - 0.546
  },

  // --- Act 2: the arithmetic ceiling ---
  // SOURCE: signaldeck/SCORE_LOOP_SUPERPROMPT.md L16 — 1-day direction capped
  // around 55%, proven two independent ways (Sheppard's arcsin bound, and an
  // exhaustive walk-forward test over ~1M observations). Values below are that
  // relation evaluated directly: P = 1/2 + arcsin(IC)/pi.
  ceiling: {
    icWorldClassLo: 0.10,
    icWorldClassHi: 0.17,
    icRealistic: 0.05,
    icFor70: 0.5878,          // sin(0.2*pi)
    cap1d: 0.55,
  },

  // --- Act 4: the structural predictors that survived ---
  // SOURCE: signaldeck/daemon/internal/structregime/structregime.go (package doc
  // + accuracyFor), trend63.go. Replicated 2026-07-17 by an independent
  // re-implementation within 2 jackknife SEs.
  // STATUS SOURCE: signaldeck/data/accuracy_registry.json — every structural row
  // is PENDING, live_n 0, 0/30 resolved. These are BACKTEST claims, not a live
  // record, and are labelled that way everywhere they render.
  structural: {
    status: 'PENDING — backtested claim, 0 of 30 required observations resolved',
    firstGrade: '2026-08-07',
    trend21: {
      label: 'trend21 — same side of SMA200 in 21 sessions',
      cumulativeAll: 0.833,
      // per-band accuracy (what a forecast actually reports) and the MEASURED
      // mean forward 21d return of that same band
      bands: [
        { floor: 0.00, acc: 0.731, ret: +0.41 },
        { floor: 0.50, acc: 0.900, ret: +0.58 },
        { floor: 0.80, acc: 0.946, ret: +0.79 },
        { floor: 0.90, acc: 0.972, ret: -0.76 },
      ],
      topCI: [0.965, 0.978],
      baseRate: '54–57% — the null is trend persistence, never 50%',
    },
    vol21: { label: 'vol21 — volatility regime persists', cumulativeAll: 0.622, top: 0.720, topCI: [0.674, 0.759] },
    liquidity21: {
      label: 'liquidity21 — dollar volume vs its 200d median',
      cumulativeAll: 0.710, top: 0.876, topCI: [0.857, 0.892],
      caveat: 'a naive persistence rule scores the SAME 0.876 — the accuracy holds, the skill claim does not',
    },
    trend63: { label: 'trend63 — same side of SMA200 in 63 sessions', cumulativeAll: 0.700, top: 0.837, topCI: [0.789, 0.883], topReturn: -1.30 },
  },

  // --- Act 5: the trap ---
  // SOURCE: signaldeck/daemon/internal/structregime/structregime.go forwardReturnFor.
  // The top band was CORRECTED 2026-07-26 from -0.39% to -0.76% by an in-repo
  // replication: 976 stock symbols, conviction >= 0.9, NON-OVERLAPPING 21-session
  // forward windows, one call per (symbol, day), n = 18,850.
  trap: {
    topBandReturn: -0.76,
    topBandCI: [-1.19, -0.32],
    topBandMedian: -0.05,     // the loss lives in a tail, not the typical call
    replicationN: 18850,
    replicationSymbols: 976,
    correctedFrom: -0.39,
    correctedOn: '2026-07-26',
    unreproducedClaim: -2.05, // an adversarial review's magnitude; direction replicated, magnitude did not
    trend63Top: -1.30,
  },

  // --- Act 6: the machinery that catches the mistakes ---
  machinery: {
    // SOURCE: measured read-only against signaldeck/data/signaldeck.db, 2026-07-27.
    // PREDICTION_PROCESS.md Layer 5 documents the same table at 235k rows.
    ledgerRows: 246595,
    outcomeRows: 250921,
    // SOURCE: PREDICTION_PROCESS.md Part 3 — registered 2026-07-26, first grade
    // 2026-08-07, 0 of 30 required observations resolved at registration.
    prereg: {
      registered: '2026-07-26',
      firstGrade: '2026-08-07',
      frozenDays: 12,
      predictors: 6,
      outstandingForecasts: 12529,
      graderCommit: '04395a2e8fec1e558cd8cfe0c12a50dbc360cabb',
      refusal: 'under 30 independent observations = INSUFFICIENT; under 10 distinct UTC days = no interval, and no interval means no verdict',
    },
    // SOURCE: daemon/internal/pipeline/researchledger.go, hypothesis H019
    magnet52w: {
      nearHigh: '76.0–83.3%',
      matchedNull: '85.0–87.8%',
      skill: '-3 to -9pp',
      n: 16093,
    },
    // SOURCE: daemon/internal/pipeline/researchledger.go (gapfill conditioning
    // correction) + daemon/internal/pipeline/volregime.go (not emitted)
    gapfill: { unconditional: '72–87%', conditional: '45.1–60.6%', bar: '70%' },
    // SOURCE: daemon/internal/pipeline/researchledger.go, cointegration pairs
    pairs: { selectionEdge: '+0.017%/trade', corrRho: 0.725, cointRho: -0.004 },
    // SOURCE: PREDICTION_PROCESS.md Part 2 point F, nightly bias regression
    bias: { invariantTests: 20, rawOutcomes: 151924, independent: 19128, inflation: 7.9 },
  },

  // --- Act 7: scale ---
  // SOURCE: measured read-only against signaldeck/data/signaldeck.db, 2026-07-27.
  scale: { researchWeeks: 166285, distinctWeeks: 341 },
};

const F = SIGNALDECK_FACTS;

/* ------------------------------------------------------------
   Environment guards — identical policy to scene.js
   ------------------------------------------------------------ */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 768px)').matches;
const canvas = document.getElementById('sd-canvas');

/* ------------------------------------------------------------
   Number count-up. The final value already lives in the DOM as text, so
   nothing here is required for the page to read correctly — this only
   animates from 0 up to that value and holds. Never overshoots.
   ------------------------------------------------------------ */
function countUp() {
  const els = document.querySelectorAll('[data-sd-count]');
  if (!els.length) return;
  if (reduce || !('IntersectionObserver' in window)) return; // text is already final
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const target = parseFloat(el.dataset.sdCount);
      if (!isFinite(target)) return;
      const dp = parseInt(el.dataset.sdDp || '0', 10);
      const pre = el.dataset.sdPre || '';
      const post = el.dataset.sdPost || '';
      const grouped = el.dataset.sdGroup === '1';
      const t0 = performance.now();
      const dur = 900;
      const fmt = (v) => {
        const s = grouped ? Math.round(v).toLocaleString('en-US') : Math.abs(v).toFixed(dp);
        return pre + (v < 0 && !grouped ? '−' : '') + s + post;
      };
      const step = (now) => {
        // Clamp low as well as high: a rAF timestamp can predate the
        // performance.now() taken when the animation was queued, which drives
        // the eased value negative and flashes a minus sign on a real number.
        const p = Math.min(Math.max((now - t0) / dur, 0), 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target); // hold on the real value
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------
   Act 4 conviction slider — plain input[type=range], keyboard driven.
   Every band shows its OWN accuracy and its OWN forward return.
   Works with no WebGL and under reduced motion.
   ------------------------------------------------------------ */
function convictionSlider(onChange) {
  const input = document.getElementById('sd-conviction');
  if (!input) return () => {};
  const accEl = document.getElementById('sd-band-acc');
  const retEl = document.getElementById('sd-band-ret');
  const retWrap = document.getElementById('sd-band-ret-wrap');
  const nameEl = document.getElementById('sd-band-name');
  const ciEl = document.getElementById('sd-band-ci');
  const bands = F.structural.trend21.bands;
  const bandFor = (c) => {
    let b = bands[0];
    for (const x of bands) if (c >= x.floor) b = x;
    return b;
  };
  const names = { 0: 'conviction < 0.5', 0.5: 'conviction 0.5–0.8', 0.8: 'conviction 0.8–0.9', 0.9: 'conviction ≥ 0.9' };
  const apply = () => {
    const c = parseInt(input.value, 10) / 100;
    const b = bandFor(c);
    const isTop = b.floor === 0.9;
    accEl.textContent = (b.acc * 100).toFixed(1) + '%';
    retEl.textContent = (b.ret < 0 ? '−' : '+') + Math.abs(b.ret).toFixed(2) + '%';
    retWrap.dataset.neg = b.ret < 0 ? '1' : '0';
    nameEl.textContent = names[b.floor];
    ciEl.textContent = isTop
      ? '95% CI [' + F.structural.trend21.topCI[0].toFixed(3) + ', ' + F.structural.trend21.topCI[1].toFixed(3) + ']'
      : 'interval published only for the ≥0.9 band';
    input.setAttribute('aria-valuetext', names[b.floor] + ': ' + (b.acc * 100).toFixed(1) + '% accurate, mean 21-day forward return ' + (b.ret < 0 ? 'minus ' : 'plus ') + Math.abs(b.ret).toFixed(2) + ' percent');
    onChange(c, b);
  };
  input.addEventListener('input', apply);
  apply();
  return apply;
}

/* ------------------------------------------------------------
   WebGL — one renderer, seven scenes, lazily built and disposed.
   ------------------------------------------------------------ */
function initWebGL() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const C = {
    indigo: 0x6366f1, violet: 0x818cf8, fuchsia: 0xc084fc,
    cyan: 0x38bdf8, emerald: 0x34d399, amber: 0xfbbf24, red: 0xf87171,
    muted: 0x8e8ea8,
  };

  const dotTex = (() => {
    const s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  })();

  // deterministic pseudo-random so the "noise" field is identical every load
  let seed = 20260727;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

  /* --- shared helpers --- */
  const line = (pts, color, opacity = 0.9, width = 1) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width }));
  };
  const points = (arr, color, size, opacity = 0.9) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({
      color, size, map: dotTex, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
  };

  /* ============================================================
     ACT BUILDERS. Each returns { scene, camera, update(progress) }.
     `progress` is 0..1 scrubbed from the act's scroll position.
     ============================================================ */
  const ACTS = {};

  // ---- Act 1: the wall. A dense field of daily returns that resolves to noise.
  ACTS[1] = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const N = 5200;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // x = time, y = a daily return draw, z = symbol — a wall of symbol-days
      pos[i * 3] = (rnd() - 0.5) * 26;
      pos[i * 3 + 1] = gauss() * 2.1;
      pos[i * 3 + 2] = (rnd() - 0.5) * 26;
    }
    const cloud = points(pos, C.violet, 0.11, 0.75);
    cloud.frustumCulled = false;
    scene.add(cloud);
    // the 50% plane the whole page is measured against
    const grid = new THREE.GridHelper(26, 26, C.indigo, C.indigo);
    grid.material.transparent = true; grid.material.opacity = 0.1;
    scene.add(grid);
    return {
      scene, camera,
      update(p, t) {
        camera.position.set(Math.sin(t * 0.06) * 1.2, 3.4 - p * 2.0, lerp(22, 8, p));
        camera.lookAt(0, 0, 0);
        cloud.rotation.y = t * 0.015;
        cloud.material.opacity = lerp(0.75, 0.95, p);
      },
    };
  };

  // ---- Act 2: the arcsin ceiling. P = 1/2 + arcsin(IC)/pi, with a marker.
  ACTS[2] = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const P = (ic) => 0.5 + Math.asin(ic) / Math.PI;
    const X = (ic) => (ic - 0.3) * 18;              // IC axis
    const Y = (p) => (p - 0.5) * 44;                // accuracy axis
    // the relation itself, drawn as a ribbon of stacked lines for depth
    const grp = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const ic = i / 120 * 0.7;
        pts.push(new THREE.Vector3(X(ic), Y(P(ic)), (k - 4) * 0.35));
      }
      grp.add(line(pts, k === 4 ? C.cyan : C.indigo, k === 4 ? 0.95 : 0.16));
    }
    scene.add(grp);
    // the 70% target plane — unreachable without IC 0.5878
    const target = line([new THREE.Vector3(X(0), Y(0.70), 0), new THREE.Vector3(X(0.7), Y(0.70), 0)], C.amber, 0.5);
    scene.add(target);
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: C.cyan, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    marker.scale.setScalar(1.5);
    scene.add(marker);
    return {
      scene, camera,
      update(p) {
        // walk the marker from the realistic IC to what 70% would demand
        const ic = lerp(F.ceiling.icRealistic, F.ceiling.icFor70, p);
        marker.position.set(X(ic), Y(P(ic)), 0);
        marker.material.color.set(p > 0.75 ? C.amber : C.cyan);
        camera.position.set(lerp(1, 4, p), lerp(1, 4, p), lerp(18, 22, p));
        camera.lookAt(lerp(-2, 2, p), lerp(0, 4, p), 0);
      },
    };
  };

  // ---- Act 3: the kill. The live record accrues as a ribbon below the 50% plane.
  ACTS[3] = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    const STEPS = 200;
    // A prequential walk that lands exactly on the measured 48.1% — the endpoint
    // is the real number; the path to it is a rendering of accrual, not data.
    const acc = [];
    let a = 0.5;
    for (let i = 0; i <= STEPS; i++) {
      const w = i / STEPS;
      a = lerp(0.5, F.directional.accuracy, w) + gauss() * 0.012 * (1 - w);
      acc.push(a);
    }
    acc[STEPS] = F.directional.accuracy;
    const X = (i) => (i / STEPS - 0.5) * 30;
    const Y = (v) => (v - 0.5) * 150;
    const ribbon = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array((STEPS + 1) * 2 * 3);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({ color: C.violet, transparent: true, opacity: 0.95 });
    const path = line(acc.map((v, i) => new THREE.Vector3(X(i), Y(v), 0)), C.violet, 0.95);
    ribbon.add(path);
    scene.add(ribbon);
    // the 50% plane, and the majority-class null it is actually judged against
    scene.add(line([new THREE.Vector3(-16, 0, 0), new THREE.Vector3(16, 0, 0)], C.muted, 0.4));
    scene.add(line([new THREE.Vector3(-16, Y(F.directional.nullAccuracy), 0), new THREE.Vector3(16, Y(F.directional.nullAccuracy), 0)], C.amber, 0.65));
    const field = [];
    for (let i = 0; i < 900; i++) field.push((rnd() - 0.5) * 34, (rnd() - 0.5) * 20, (rnd() - 0.5) * 14);
    const dust = points(field, C.indigo, 0.09, 0.3);
    scene.add(dust);
    geo.dispose();
    return {
      scene, camera,
      update(p, t) {
        // draw the record in as scroll progresses, then the retirement fires
        const drawn = Math.max(2, Math.floor(clamp01(p / 0.7) * (STEPS + 1)));
        path.geometry.setDrawRange(0, drawn);
        const retired = clamp01((p - 0.72) / 0.2);
        path.material.color.set(C.violet).lerp(new THREE.Color(C.fuchsia), retired);
        path.material.opacity = lerp(0.95, 0.55, retired);
        dust.material.opacity = lerp(0.3, 0.08, retired);
        camera.position.set(0, lerp(2, -1, p), lerp(26, 20, p));
        camera.lookAt(0, lerp(0, -3, p), 0);
        dust.rotation.y = t * 0.02;
      },
    };
  };

  // ---- Act 4: what survived. Conviction bands as 3D columns.
  ACTS[4] = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    const bands = F.structural.trend21.bands;
    const cols = bands.map((b, i) => {
      // Height is accuracy above the 50% floor. Scaled so the tallest band
      // (97.2%) still sits inside the frame at the camera distance below.
      const h = (b.acc - 0.5) * 13;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 1, 2.1),
        new THREE.MeshBasicMaterial({ color: C.indigo, transparent: true, opacity: 0.5 })
      );
      m.position.set((i - 1.5) * 3.4, 0, 0);
      m.userData.h = h;
      scene.add(m);
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2.1, 1, 2.1)),
        new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.8 })
      );
      edge.position.copy(m.position);
      edge.userData.h = h;
      scene.add(edge);
      return { m, edge, h };
    });
    scene.add(line([new THREE.Vector3(-8, 0, 0), new THREE.Vector3(8, 0, 0)], C.muted, 0.35));
    let selected = 0;
    return {
      scene, camera,
      setBand(i) { selected = i; },
      update(p, t) {
        cols.forEach((c, i) => {
          const grow = clamp01((p - i * 0.09) / 0.4);
          const h = c.h * grow;
          c.m.scale.y = Math.max(h, 0.001);
          c.m.position.y = h / 2;
          c.edge.scale.y = Math.max(h, 0.001);
          c.edge.position.y = h / 2;
          const on = i === selected;
          c.m.material.opacity = on ? 0.75 : 0.28;
          c.edge.material.color.set(on ? C.cyan : C.indigo);
          c.edge.material.opacity = on ? 1 : 0.35;
        });
        camera.position.set(Math.sin(t * 0.08) * 2.2, 4.2, 21);
        camera.lookAt(0, 2.6, 0);
      },
    };
  };

  // ---- Act 5: the trap. Accuracy and forward return, diverging.
  ACTS[5] = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    const bands = F.structural.trend21.bands;
    const X = (i) => (i - 1.5) * 4.2;
    // Two different quantities on one frame: accuracy above the 50% floor, and
    // percent forward return around a zero axis. Scaled so both stay in shot —
    // the point is the shape of the divergence, not a shared unit.
    const accPts = bands.map((b, i) => new THREE.Vector3(X(i), (b.acc - 0.5) * 13, -1.6));
    const retPts = bands.map((b, i) => new THREE.Vector3(X(i), b.ret * 2.2, 1.6));
    const accLine = line(accPts, C.cyan, 0.95);
    const retLine = line(retPts, C.red, 0.95);
    scene.add(accLine, retLine);
    scene.add(line([new THREE.Vector3(-8, 0, 1.6), new THREE.Vector3(8, 0, 1.6)], C.muted, 0.4));
    const accDots = accPts.map((v) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: C.cyan, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.copy(v); s.scale.setScalar(0.9); scene.add(s); return s; });
    const retDots = retPts.map((v) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: C.red, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.copy(v); s.scale.setScalar(0.9); scene.add(s); return s; });
    return {
      scene, camera,
      update(p, t) {
        const n = bands.length;
        accLine.geometry.setDrawRange(0, Math.max(2, Math.ceil(clamp01(p / 0.55) * n)));
        retLine.geometry.setDrawRange(0, Math.max(2, Math.ceil(clamp01((p - 0.15) / 0.55) * n)));
        accDots.forEach((s, i) => { s.material.opacity = clamp01(p / 0.55 * n - i); });
        retDots.forEach((s, i) => { s.material.opacity = clamp01((p - 0.15) / 0.55 * n - i); });
        camera.position.set(lerp(-1.5, 1.5, p), 3.2, lerp(20, 17, p));
        camera.lookAt(0, 1.6, 0);
      },
    };
  };

  // ---- Act 6: the machinery. A hash chain, with the rejections in it.
  ACTS[6] = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    const N = 60;
    const links = [];
    const chain = new THREE.Group();
    // three links are rejections — shown with the same weight as the rest
    const rejected = new Set([17, 34, 48]);
    for (let i = 0; i < N; i++) {
      const a = i * 0.42;
      const r = 5.2;
      const pos = new THREE.Vector3(Math.cos(a) * r, (i - N / 2) * 0.36, Math.sin(a) * r);
      const isRej = rejected.has(i);
      const box = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.75, 0.75, 0.75)),
        new THREE.LineBasicMaterial({ color: isRej ? C.fuchsia : C.emerald, transparent: true, opacity: 0 })
      );
      box.position.copy(pos);
      box.rotation.set(a, a * 0.5, 0);
      chain.add(box);
      links.push({ box, pos, isRej });
      if (i > 0) {
        const l = line([links[i - 1].pos, pos], isRej ? C.fuchsia : C.emerald, 0);
        chain.add(l);
        links[i].link = l;
      }
    }
    scene.add(chain);
    return {
      scene, camera,
      update(p, t) {
        const shown = clamp01(p / 0.8) * N;
        links.forEach((l, i) => {
          const on = clamp01(shown - i);
          l.box.material.opacity = on * (l.isRej ? 1 : 0.7);
          if (l.link) l.link.material.opacity = on * (l.isRej ? 0.9 : 0.4);
        });
        chain.rotation.y = t * 0.09 + p * 1.4;
        camera.position.set(0, lerp(-9, 9, p), 14);
        camera.lookAt(0, lerp(-6, 6, p), 0);
      },
    };
  };

  // ---- Act 7: close. Quiet field, slow drift.
  ACTS[7] = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const arr = [];
    for (let i = 0; i < 1400; i++) {
      const r = 6 + rnd() * 14, th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      arr.push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
    }
    const field = points(arr, C.indigo, 0.1, 0.5);
    field.frustumCulled = false;
    scene.add(field);
    return {
      scene, camera,
      update(p, t) {
        field.rotation.y = t * 0.02;
        field.rotation.x = t * 0.008;
        camera.position.set(0, 0, lerp(14, 11, p));
        camera.lookAt(0, 0, 0);
      },
    };
  };

  /* --- lifecycle: build on approach, dispose on exit --- */
  const live = new Map();   // actNumber -> instance
  const progress = new Map();
  let current = 1;

  const disposeScene = (inst) => {
    inst.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  };

  const sections = Array.from(document.querySelectorAll('.sd-act[data-act]'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const n = parseInt(e.target.dataset.act, 10);
      if (e.isIntersecting) {
        if (!live.has(n) && ACTS[n]) live.set(n, ACTS[n]());
      } else if (live.has(n)) {
        disposeScene(live.get(n));
        live.delete(n);
      }
    });
  }, { rootMargin: '25% 0px 25% 0px' });
  sections.forEach((s) => io.observe(s));

  // Build act 1 eagerly. The observer callback is async, so without this the
  // first synchronous frame has no scene and the canvas paints empty until the
  // first rAF lands — visible as a black flash on a cold load.
  if (ACTS[1]) live.set(1, ACTS[1]());

  // Scrub progress from each act's own scroll position, and pick the act to
  // draw by which one's centre is nearest the viewport centre. Several acts
  // intersect at once (the observer uses a 25% margin), so trusting the order
  // the observer happens to fire in renders the wrong act's scene.
  const measure = () => {
    const vh = window.innerHeight;
    let best = Infinity;
    sections.forEach((s) => {
      const n = parseInt(s.dataset.act, 10);
      const r = s.getBoundingClientRect();
      progress.set(n, clamp01(-r.top / Math.max(r.height - vh, 1)));
      // distance from the act's own box to the viewport centre — 0 for the act
      // the centre line is actually inside, so tall acts win over their neighbours
      const mid = vh / 2;
      const d = r.top > mid ? r.top - mid : (r.bottom < mid ? mid - r.bottom : 0);
      if (d < best) { best = d; current = n; }
    });
  };

  const clock = new THREE.Clock();
  let raf = 0;
  const frame = () => {
    measure();
    const inst = live.get(current);
    if (!inst) return;
    inst.update(progress.get(current) ?? 0, clock.getElapsedTime());
    inst.camera.aspect = window.innerWidth / window.innerHeight;
    inst.camera.updateProjectionMatrix();
    renderer.render(inst.scene, inst.camera);
  };
  const render = () => {
    raf = requestAnimationFrame(render);
    if (document.hidden) return;
    frame();
  };
  render();

  // Draw on scroll as well as on rAF, so the scrubbed state always matches the
  // scroll position even when the frame loop is throttled (backgrounded tab,
  // low-power mode) — same pattern as scene.js.
  window.addEventListener('scroll', frame, { passive: true });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    live.forEach(disposeScene);
    live.clear();
    dotTex.dispose();
    renderer.dispose();
  });

  document.body.classList.add('sd-webgl');
  return {
    setBand(i) { const a = live.get(4); if (a && a.setBand) a.setBand(i); },
  };
}

/* ------------------------------------------------------------
   Boot. WebGL is strictly an enhancement: the slider and the numbers
   are wired up first and work without it.
   ------------------------------------------------------------ */
countUp();

let gl = null;
if (canvas && window.WebGLRenderingContext && !mobile && !reduce) {
  try {
    gl = initWebGL();
  } catch (e) {
    console.warn('signaldeck scene skipped', e); // CSS ambient background carries it
  }
}

convictionSlider((c, band) => {
  const i = F.structural.trend21.bands.indexOf(band);
  if (gl) gl.setBand(i);
});
