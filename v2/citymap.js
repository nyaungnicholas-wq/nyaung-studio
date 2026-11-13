import * as THREE from 'three';

export const NODES = [
  { key: 'work',     x: -22.9, z:  32.8, h: 36 },
  { key: 'about',    x:  23.1, z:  27.6, h: 40 },
  { key: 'services', x:  42.5, z: -11.4, h: 32 },
  { key: 'writing',  x:   3.3, z: -37.9, h: 38 },
  { key: 'now',      x: -39.5, z: -14.4, h: 30 },
];

export function capHeight(x, z, h) {
  for (const n of NODES) {
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < 20) h = Math.min(h, Math.max(3, n.h - 8 + (d - 6) * 1.6));
  }
  return h;
}
export const RED = { key: 'contact', x: 0, z: 0, h: 30 };

export function nearNode(x, z, r = 5.2) {
  const r2 = r * r;
  for (const n of NODES) if ((n.x - x) ** 2 + (n.z - z) ** 2 <= r2) return true;
  return (RED.x - x) ** 2 + (RED.z - z) ** 2 <= r2;
}

const MINT = new THREE.Color(0.66, 0.94, 0.82);
const RED_COL = new THREE.Color(1.0, 0.25, 0.18);
const UP0 = new THREE.Vector3(Math.sin(0.6), 0, -Math.cos(0.6));
const UP6 = new THREE.Vector3(Math.sin(2.3), 0, -Math.cos(2.3));
const DIR = new THREE.Vector3();
const TMP_POS = new THREE.Vector3();
const TMP_TARGET = new THREE.Vector3();
const TMP_UP = new THREE.Vector3();
const PROJ_V = new THREE.Vector3();
const ALL = [...NODES, RED];
const OBJ3D = new THREE.Object3D();

const V3_0 = new THREE.Vector3();
const V3_1 = new THREE.Vector3();
const V3_2 = new THREE.Vector3();
const V3_3 = new THREE.Vector3();
const V3_4 = new THREE.Vector3();
const V3_5 = new THREE.Vector3();
const V3_6 = new THREE.Vector3();
const V3_7 = new THREE.Vector3();
const V3_8 = new THREE.Vector3();
const QUAT = new THREE.Quaternion();
const MAT4 = new THREE.Matrix4();
const COLOR = new THREE.Color();
const LAST_POS = new THREE.Vector3();
let LAST_POS_INIT = false;

function smoothstep(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function makePadShader() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uA; uniform float uTime; void main(){ vec2 c = vUv - 0.5; float d = length(c) * 2.0; float ring = smoothstep(0.05, 0.0, abs(d - 0.72)); float core = smoothstep(0.32, 0.0, d); float tick = smoothstep(0.94, 1.0, fract(atan(c.y, c.x) / 6.2831 * 12.0 + uTime * 0.06)) * smoothstep(0.1, 0.0, abs(d - 0.86)); vec3 mint = vec3(0.66, 0.94, 0.82); float a = (ring * 0.9 + core * 0.55 + tick * 0.6) * uA; gl_FragColor = vec4(mint * a, a); }`
  });
}

function makeBeamShader() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uA; void main(){ float fall = pow(1.0 - vUv.y, 2.2); float w = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x); float a = fall * w * 0.55 * uA; gl_FragColor = vec4(vec3(0.66, 0.94, 0.82) * a, a); }`
  });
}

function makeArcShader(colB) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 1 }, uOff: { value: Math.random() }, uColB: { value: colB } },
    vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying float vU; uniform float uTime; uniform float uA; uniform float uOff; uniform vec3 uColB; void main(){ float d1 = fract(vU - uTime * 0.16 + uOff); float d2 = fract(d1 + 0.5); float pulse1 = smoothstep(0.0, 0.03, d1) * smoothstep(0.14, 0.03, d1); float pulse2 = smoothstep(0.0, 0.03, d2) * smoothstep(0.14, 0.03, d2); float pulse = max(pulse1, pulse2 * 0.6); vec3 col = mix(vec3(0.66, 0.94, 0.82), uColB, vU); float a = (0.3 + 0.9 * pulse) * uA; gl_FragColor = vec4(col * a, a); }`
  });
}

function makeRippleShader() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uR: { value: 0 }, uA: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uR; uniform float uA; void main(){ float d = length(vUv - 0.5) * 2.0; float r1 = mix(0.1, 1.0, uR); float r2 = mix(0.1, 1.0, clamp(uR - 0.18, 0.0, 1.0)); float ring = smoothstep(0.03, 0.0, abs(d - r1)) * pow(1.0 - uR, 1.5) + 0.6 * smoothstep(0.025, 0.0, abs(d - r2)) * pow(clamp(1.0 - (uR - 0.18) / 0.82, 0.0, 1.0), 1.5) * step(0.18, uR); float a = ring * uA; gl_FragColor = vec4(vec3(0.66, 0.94, 0.82) * a, a); }`
  });
}

function makeRadarShader() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uA; void main(){ float d = length(vUv - 0.5) * 2.0; float r = fract(uTime * 0.28); float ping = smoothstep(0.012, 0.0, abs(d - r)) * (1.0 - r); float grid = (smoothstep(0.003, 0.0, abs(d - 0.25)) + smoothstep(0.003, 0.0, abs(d - 0.5)) + smoothstep(0.003, 0.0, abs(d - 0.75))) * 0.08; float a = (ping * 0.55 + grid) * uA * step(d, 1.0); gl_FragColor = vec4(vec3(0.66, 0.94, 0.82) * a, a); }`
  });
}

function makeTravelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(168,240,208,0.9)');
  grad.addColorStop(1.00, 'rgba(168,240,208,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function createCityMap(scene, buildingMaterial) {
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  towerGeo.translate(0, 0.5, 0);
  const seeds = new Float32Array([0.11, 0.29, 0.53, 0.71, 0.89]);
  towerGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const towers = new THREE.InstancedMesh(towerGeo, buildingMaterial, 5);
  NODES.forEach((n, i) => {
    OBJ3D.position.set(n.x, 0, n.z);
    OBJ3D.scale.set(4, n.h, 4);
    OBJ3D.updateMatrix();
    towers.setMatrixAt(i, OBJ3D.matrix);
  });
  towers.instanceMatrix.needsUpdate = true;
  scene.add(towers);

  const padGeo = new THREE.PlaneGeometry(3.6, 3.6);
  const pads = NODES.map(n => {
    const m = new THREE.Mesh(padGeo, makePadShader());
    m.rotation.x = -Math.PI / 2;
    m.position.set(n.x, n.h + 0.06, n.z);
    scene.add(m);
    return { mesh: m, uA: { value: 0 }, target: 0 };
  });

  const beamGeo = new THREE.PlaneGeometry(0.7, 70);
  const beams = NODES.map(n => {
    const g = new THREE.Group();
    const beamShader = makeBeamShader();
    [0, Math.PI / 2].forEach(ry => {
      const m = new THREE.Mesh(beamGeo, beamShader);
      m.rotation.y = ry;
      m.position.set(0, 35, 0);
      g.add(m);
    });
    g.position.set(n.x, n.h, n.z);
    scene.add(g);
    return { group: g, uA: { value: 0 }, target: 0 };
  });

  const uTime = { value: 0 };
  const spokes = [];
  const rings = [];
  const ringCurves = [];
  const spokeCurves = [];

  NODES.forEach((n, i) => {
    const a = new THREE.Vector3(n.x, n.h + 0.5, n.z);
    const b = new THREE.Vector3(0, RED.h + 0.5, 0);
    const len = a.distanceTo(b);
    const ctrl = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    ctrl.y += 16 + 0.25 * len;
    const curve = new THREE.QuadraticBezierCurve3(a, ctrl, b);
    const geo = new THREE.TubeGeometry(curve, 64, 0.2, 6, false);
    const mat = makeArcShader(RED_COL);
    mat.uniforms.uTime = uTime;
    const line = new THREE.Mesh(geo, mat);
    scene.add(line);
    spokes.push({ line, uA: { value: 1 }, nodeIdx: i, curve });
    spokeCurves.push(curve);
  });

  for (let i = 0; i < 4; i++) {
    const n0 = NODES[i], n1 = NODES[i + 1];
    const a = new THREE.Vector3(n0.x, n0.h + 0.5, n0.z);
    const b = new THREE.Vector3(n1.x, n1.h + 0.5, n1.z);
    const len = a.distanceTo(b);
    const ctrl = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    ctrl.y += 12 + 0.2 * len;
    const curve = new THREE.QuadraticBezierCurve3(a, ctrl, b);
    const geo = new THREE.TubeGeometry(curve, 64, 0.2, 6, false);
    const mat = makeArcShader(MINT);
    mat.uniforms.uTime = uTime;
    const line = new THREE.Mesh(geo, mat);
    scene.add(line);
    rings.push({ line, uA: { value: 1 }, nodeA: i, nodeB: i + 1, curve });
    ringCurves.push(curve);
  }

  const ripples = NODES.map((n, i) => {
    const geo = new THREE.PlaneGeometry(18, 18);
    const mat = makeRippleShader();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(n.x, n.h + 0.12, n.z);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, age: 1, on: false, uR: mat.uniforms.uR, uA: mat.uniforms.uA, flare: 0 };
  });

  const radarGeo = new THREE.PlaneGeometry(180, 180);
  const radarMat = makeRadarShader();
  const radar = new THREE.Mesh(radarGeo, radarMat);
  radar.rotation.x = -Math.PI / 2;
  radar.position.set(0, 44, 0);
  scene.add(radar);

  const travelTex = makeTravelTexture();
  const headMat = new THREE.SpriteMaterial({ map: travelTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const head = new THREE.Sprite(headMat);
  head.scale.set(3.4, 3.4, 1);
  head.visible = false;
  scene.add(head);

  const trailSprites = [];
  const trailMats = [];
  for (let k = 1; k <= 14; k++) {
    const mat = headMat.clone();
    mat.opacity = (1 - k / 15) * 0.7;
    trailMats.push(mat);
    const s = new THREE.Sprite(mat);
    s.scale.set(3.4 * (1 - k / 16), 3.4 * (1 - k / 16), 1);
    s.visible = false;
    scene.add(s);
    trailSprites.push(s);
  }

  const K = [];
  K.push({ pos: new THREE.Vector3(0.01, 118, 0.01), target: new THREE.Vector3(0, 0, 0), up: UP0.clone() });
  NODES.forEach(n => {
    DIR.set(n.x, 0, n.z).normalize();
    const pos = new THREE.Vector3(n.x + DIR.x * 22, n.h + 46, n.z + DIR.z * 22);
    const target = new THREE.Vector3(n.x - DIR.x * 7, n.h, n.z - DIR.z * 7);
    const up = new THREE.Vector3(-DIR.x, 0, -DIR.z);
    K.push({ pos, target, up });
  });
  K.push({ pos: new THREE.Vector3(0.01, 31.6, 0.01), target: new THREE.Vector3(0, 0, 0), up: UP6.clone() });

  let lastActive = -1;

  const api = {
    fov: 55,
    active: -1,
    seg: 0,
    e: 0,
    alt: 0,
    heading: 0,
    speed: 0,
    pose(p, outPos, outTarget, outUp, dt) {
      const seg = Math.min(5, Math.floor(p * 6));
      const t = p * 6 - seg;

      const u = Math.max(0, Math.min(1, (t - 0.14) / 0.72));
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

      const P0 = K[seg].pos;
      const P3 = K[seg + 1].pos;

      const L = (seg >= 1 && seg <= 4) ? 26 : (seg === 5 ? 12 : 0);

      V3_0.subVectors(P3, P0);
      V3_0.y = 0;
      const dirHLen = V3_0.length();
      if (dirHLen > 1e-4) V3_0.divideScalar(dirHLen);
      else V3_0.set(0, 0, 0);

      V3_1.copy(P0); V3_1.y += L;                 // take-off control point: straight up from the start
      if (L > 0) V3_1.addScaledVector(V3_0, -6);   // pull back against the travel direction (anticipation)

      V3_2.copy(P3); V3_2.y += L * 0.7;           // landing control point: above the destination

      const om_e = 1 - e;
      const om_e2 = om_e * om_e;
      const om_e3 = om_e2 * om_e;
      const e2 = e * e;
      const e3 = e2 * e;

      outPos.copy(P0).multiplyScalar(om_e3);
      V3_3.copy(V3_1).multiplyScalar(3 * om_e2 * e);
      outPos.add(V3_3);
      V3_3.copy(V3_2).multiplyScalar(3 * om_e * e2);
      outPos.add(V3_3);
      V3_3.copy(P3).multiplyScalar(e3);
      outPos.add(V3_3);

      const e2_look = (seg >= 1 && seg <= 4) ? smoothstep(0, 0.65, e) : e;
      outTarget.lerpVectors(K[seg].target, K[seg + 1].target, e2_look);

      outUp.lerpVectors(K[seg].up, K[seg + 1].up, e2_look);
      if (outUp.lengthSq() < 1e-6) outUp.set(0, 0, -1);
      outUp.normalize();

      if (seg >= 1 && seg <= 4) {
        V3_4.copy(K[seg].up).negate(); V3_4.y = 0; V3_4.normalize();
        V3_5.copy(K[seg + 1].up).negate(); V3_5.y = 0; V3_5.normalize();
        const turn = Math.sign(V3_4.x * V3_5.z - V3_4.z * V3_5.x);
        V3_6.subVectors(outTarget, outPos).normalize();
        V3_7.crossVectors(V3_6, outUp).normalize();
        outUp.addScaledVector(V3_7, Math.sin(Math.PI * e) * 0.16 * turn);
        outUp.normalize();
      }

      if (seg >= 1 && seg <= 4) api.fov = 55 + Math.sin(Math.PI * e) * 8;
      else if (seg === 5) api.fov = 55 - 10 * e * e;
      else api.fov = 55;

      const map = s => s === 0 ? -1 : s <= 5 ? s - 1 : 5;
      api.active = t < 0.14 ? map(seg) : t > 0.86 ? map(seg + 1) : -1;

      api.seg = seg;
      api.e = e;
      api.alt = outPos.y;
      api.heading = (Math.atan2(outUp.x, -outUp.z) * 180 / Math.PI + 360) % 360;

      if (!LAST_POS_INIT) {
        LAST_POS.copy(outPos);
        LAST_POS_INIT = true;
        api.speed = 0;
      } else {
        const dist = outPos.distanceTo(LAST_POS);
        const safeDt = Math.max(dt, 1 / 240);
        api.speed = Math.max(0, Math.min(1, dist / safeDt / 90));
        LAST_POS.copy(outPos);
      }

      return api.active;
    },
    update(time, active, p, dt) {
      uTime.value = time;
      const fade = 1 - smoothstep(0.86, 0.97, p);

      const k = 1 - Math.pow(1 - 0.12, dt * 60);

      pads.forEach((pad, i) => {
        pad.target = active === i ? 1.0 : (active === -1 ? 0.55 : 0.28);
        pad.uA.value += (pad.target - pad.uA.value) * k;
        pad.mesh.material.uniforms.uA.value = pad.uA.value;
        pad.mesh.material.uniforms.uTime.value = time;
        beams[i].uA.value += (pad.target - beams[i].uA.value) * k;
        beams[i].group.children.forEach(m => m.material.uniforms.uA.value = beams[i].uA.value);
      });

      spokes.forEach(s => {
        s.uA.value = pads[s.nodeIdx].uA.value;
        s.line.material.uniforms.uA.value = s.uA.value * fade;
      });

      rings.forEach(r => {
        const a = pads[r.nodeA].uA.value;
        const b = pads[r.nodeB].uA.value;
        r.uA.value = Math.max(a, b) * 0.8;
        r.line.material.uniforms.uA.value = r.uA.value * fade;
      });

      if (active !== lastActive) {
        if (active >= 0 && active <= 4) {
          ripples[active].age = 0;
          ripples[active].on = true;
          ripples[active].mesh.visible = true;
          ripples[active].flare = 1;
        }
        lastActive = active;
      }

      ripples.forEach(r => {
        if (r.on) {
          r.age += dt / 1.2;
          if (r.age >= 1) { r.age = 1; r.on = false; r.mesh.visible = false; }
          r.uR.value = r.age;
          r.uA.value = r.age < 1 ? 1 : 0;
        }
        r.flare *= Math.pow(0.04, dt);
        const beamIdx = ripples.indexOf(r);
        if (beamIdx >= 0) {
          const beamVal = beams[beamIdx].uA.value + r.flare * 1.2;
          beams[beamIdx].group.children.forEach(m => m.material.uniforms.uA.value = beamVal);
        }
      });

      let curve = null;
      if (api.seg >= 1 && api.seg <= 4) curve = ringCurves[api.seg - 1];
      else if (api.seg === 5) curve = spokeCurves[4];

      if (curve && api.e > 0 && api.e < 1) {
        const tHead = Math.max(0, Math.min(1, api.e * 1.1 - 0.05));
        curve.getPoint(tHead, V3_8);
        head.position.copy(V3_8);
        head.visible = true;
        trailSprites.forEach((s, k) => {
          const tTrail = Math.max(0, tHead - (k + 1) * 0.018);
          curve.getPoint(tTrail, V3_8);
          s.position.copy(V3_8);
          s.visible = true;
        });
      } else {
        head.visible = false;
        trailSprites.forEach(s => s.visible = false);
      }

      rings.forEach(r => {
        const traveling = (api.seg >= 1 && api.seg <= 4 && api.seg - 1 === rings.indexOf(r) && api.e > 0 && api.e < 1);
        if (traveling) r.line.material.uniforms.uA.value = 1.5 * fade;
      });

      radar.material.uniforms.uTime.value = time;
      radar.material.uniforms.uA.value = 1 - smoothstep(0.03, 0.14, p);
    },
    project(camera, w, h, out) {
      ALL.forEach((n, i) => {
        PROJ_V.set(n.x, n.h + 1.4, n.z).project(camera);
        const vis = (PROJ_V.z > -1 && PROJ_V.z < 1 && Math.abs(PROJ_V.x) < 1.1 && Math.abs(PROJ_V.y) < 1.1) ? 1 : 0;
        out[i * 3] = (PROJ_V.x * 0.5 + 0.5) * w;
        out[i * 3 + 1] = (-PROJ_V.y * 0.5 + 0.5) * h;
        out[i * 3 + 2] = vis;
      });
    }
  };

  return api;
}