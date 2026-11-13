import * as THREE from 'three';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export default function createTradeStream(scene, opts) {
  const COUNT = opts.isMobile ? 40 : 80;
  const rng = mulberry32(11);

  const pos = new Float32Array(COUNT * 6);
  const col = new Float32Array(COUNT * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  scene.add(lines);

  const xs = new Float32Array(COUNT);
  const ys = new Float32Array(COUNT);
  const zs = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  const lens = new Float32Array(COUNT);
  let initialized = false;
  let reducedDone = false;

  function spawn(i, camZ, initial) {
    let x = (rng() - 0.5) * 3.2;
    if (Math.abs(x) < 0.35) x = (x === 0 ? 1 : Math.sign(x)) * 0.35;
    xs[i] = x;
    ys[i] = 0.45 + rng() * 1.3;
    zs[i] = initial ? camZ - rng() * 80 : camZ - 60 - rng() * 20;
    speeds[i] = 7 + rng() * 11;
    lens[i] = 1.2 + rng() * 2.4;

    let r, g, b;
    if (rng() < 0.17) { r = 0.66; g = 0.94; b = 0.82; }
    else if (x < 0) { r = 0.13; g = 0.89; b = 0.60; }
    else { r = 1.0; g = 0.30; b = 0.37; }
    const s = 0.9 + rng() * 0.45;
    r *= s; g *= s; b *= s;

    const ci = i * 6;
    col[ci] = r; col[ci + 1] = g; col[ci + 2] = b;
    col[ci + 3] = 0; col[ci + 4] = 0; col[ci + 5] = 0;
  }

  return {
    update(time, dt, camZ) {
      if (reducedDone) return;                       // reduced motion: one frozen frame, drawn once
      let recolor = false;
      if (!initialized) { for (let i = 0; i < COUNT; i++) spawn(i, camZ, true); initialized = true; recolor = true; }
      const step = opts.reducedMotion ? 0 : dt;
      for (let i = 0; i < COUNT; i++) {
        zs[i] += speeds[i] * step;
        if (zs[i] > camZ + 2) { spawn(i, camZ, false); recolor = true; }

        const pi = i * 6;
        const z = zs[i], len = lens[i];
        pos[pi] = xs[i]; pos[pi + 1] = ys[i]; pos[pi + 2] = z;
        pos[pi + 3] = xs[i]; pos[pi + 4] = ys[i]; pos[pi + 5] = z - len;
      }
      if (recolor) geo.attributes.color.needsUpdate = true;
      if (opts.reducedMotion) reducedDone = true;
      geo.attributes.position.needsUpdate = true;
    }
  };
}