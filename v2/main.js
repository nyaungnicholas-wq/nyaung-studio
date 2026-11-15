import * as THREE from 'three';
import createHero from './hero.js';
import createWork from './work.js';
import createTunnel from './tunnel.js';
import createCity from './city.js';
import createContact from './contact.js';
import createMapHud from './maphud.js';
import createMapPreview from './mappreview.js';
import createMapTour from './maptour.js';

// Colour pipeline is "hex in = colour out" (see SPEC): stop three converting THREE.Color hex to linear.
THREE.ColorManagement.enabled = false;

function fail(err) {
  document.documentElement.classList.add('no-gl', 'loaded');
  const l = document.getElementById('loader');
  if (l) l.classList.add('done');
  if (err) console.warn('[v2] WebGL off:', err);
}

const isMobile = innerWidth < 768 || matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const POST = `
uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; uniform float uType; uniform float uTime; uniform vec2 uRes; uniform float uVel; uniform float uReduced; uniform float uBlur;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 A(vec2 uv){ return texture2D(tA, clamp(uv, 0.0, 1.0)).rgb; }
vec3 B(vec2 uv){ return texture2D(tB, clamp(uv, 0.0, 1.0)).rgb; }
vec3 composite(vec2 uv){
  float m = uMix;
  if (m <= 0.0001) return A(uv);
  if (uType < 0.5) {
    float edge = m + 0.07 * sin(3.14159 * uv.x) * (1.0 - m) * step(0.0005, m);
    if (uv.y < edge) return B(vec2(uv.x, uv.y + 1.0 - m));
    vec2 ua = uv; ua.y -= 0.35 * m;
    float bulge = 1.0 + 0.22 * m * (1.0 - pow(2.0 * uv.y - 1.0, 2.0));
    ua.x = 0.5 + (ua.x - 0.5) / bulge;
    vec3 c = A(ua);
    c *= 1.0 - 0.55 * smoothstep(0.18, 0.0, uv.y - edge);
    c += vec3(0.6) * smoothstep(0.004, 0.0, abs(uv.y - edge)) * step(0.0005, m);
    return c;
  } else if (uType < 1.5) {
    float spread = 0.025 * sin(3.14159 * m);
    vec3 c = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float o = (float(i) / 5.0 - 0.5) * spread;
      vec2 u = vec2(uv.x, uv.y + o);
      float band = step(abs(u.y - m), 0.02);
      u.x += band * (hash(vec2(floor(u.y * 80.0), floor(uTime * 30.0))) - 0.5) * 0.012;
      c += (u.y < m) ? B(vec2(u.x, u.y + 1.0 - m)) : A(vec2(u.x, u.y - m));
    }
    return c / 6.0;
  } else if (uType < 2.5) {
    vec3 a = A(0.5 + (uv - 0.5) / (1.0 + m * 0.6));
    vec3 b = B(0.5 + (uv - 0.5) / (1.4 - 0.4 * m));
    vec3 c = mix(a, b, smoothstep(0.35, 0.65, m));
    float flash = exp(-pow((m - 0.5) * 5.0, 2.0)) * max(0.0, 1.0 - length(uv - 0.5) * 1.1);
    return c + vec3(0.85, 0.92, 1.0) * flash * 0.5;
  } else {
    float e = pow(m, 1.6);
    vec2 hs = mix(vec2(0.06, 0.09), vec2(0.78, 0.78), e);
    vec2 q = abs(uv - 0.5) - hs + 0.02;
    float d = length(max(q, 0.0)) - 0.02;
    vec3 b = B(0.5 + (uv - 0.5) * mix(0.5, 1.0, e));
    vec3 c = d < 0.0 ? b : A(uv);
    c += vec3(1.0, 0.15, 0.1) * smoothstep(0.012, 0.0, abs(d)) * (1.0 - e);
    return c;
  }
  return A(uv);   // unreachable; silences the ANGLE/HLSL "uninitialized" warning
}
void main(){
  vec2 dir = vUv - 0.5;
  // restrained finish: colour fringing only while moving/transitioning, light vignette, fine grain
  float ab = (0.0003 + 0.0035 * abs(uVel) + 0.003 * sin(3.14159 * uMix)) * (1.0 - 0.7 * uReduced);
  vec3 col = vec3(composite(vUv + dir * ab).r, composite(vUv).g, composite(vUv - dir * ab).b);
  // speed blur: radial streaks toward the centre while the map camera is mid-jump (uBlur = camera speed)
  if (uBlur > 0.004) {
    vec3 acc = col;
    for (int i = 1; i < 7; i++) acc += composite(vUv - dir * (float(i) / 6.0) * uBlur * 0.034);
    col = acc / 7.0;
  }
  col *= mix(1.0, smoothstep(1.15, 0.35, length(dir) * 1.25), 0.32);
  col += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * 0.016 * (1.0 - uReduced);
  gl_FragColor = vec4(col, 1.0);
}
`;

async function init() {
  const canvas = document.getElementById('gl');
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');

  if (reducedMotion) document.documentElement.classList.add('reduced');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x050506, 1);

  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  function load(url) {
    return new Promise(resolve => {
      loader.load(url, t => { t.colorSpace = THREE.NoColorSpace; resolve(t); }, undefined, () => resolve(null));
    });
  }
  const urls = [
    'v2/img/portrait.png',
    'v2/img/work-shanty.jpg',
    'v2/img/work-1042s.jpg',
    'v2/img/work-taxlens.jpg',
    'v2/img/work-lotline.jpg',
    'v2/img/contact.jpg'   // if it fails to load, contact.js draws a procedural red field instead
  ];
  const total = urls.length;
  let loaded = 0;
  let shown = 0;
  const startTime = performance.now();
  const bar = document.querySelector('#loader .ld-bar i');
  const pct = document.querySelector('#loader .ld-pct');
  let introStart = 0;
  let ready = false;   // set at the end of init, once every chapter and listener exists
  const promises = urls.map(u => load(u).finally(() => { loaded++; }));
  const wait = () => {
    shown += (loaded / total - shown) * 0.12;
    if (bar) bar.style.transform = `scaleX(${shown})`;
    if (pct) pct.textContent = String(Math.round(shown * 100)).padStart(3, '0');
    if (ready && performance.now() - startTime >= 900 && shown > 0.985) {
      const loaderEl = document.getElementById('loader');
      loaderEl.classList.add('done');
      document.documentElement.classList.remove('no-gl');   // the page's slow-load fallback timer may have set it
      document.documentElement.classList.add('loaded');
      introStart = performance.now();
      setTimeout(() => loaderEl.remove(), 1000);
      renderer.setAnimationLoop(frame);
    } else requestAnimationFrame(wait);
  };
  requestAnimationFrame(wait);
  const [portrait, taxlens, shanty, lotline, signaldeck, contact = null] = await Promise.all(promises);
  await document.fonts.ready;

  const ctx = {
    THREE, renderer,
    textures: { portrait, work: [taxlens, shanty, lotline, signaldeck], contact },
    width: canvas.clientWidth || innerWidth, height: canvas.clientHeight || innerHeight, dpr, isMobile, reducedMotion
  };
  const chapters = [
    createHero(ctx), createWork(ctx), createTunnel(ctx), createCity(ctx), createContact(ctx)
  ];
  const sectionIds = ['hero', 'work', 'about', 'clients', 'contact'];
  const sections = sectionIds.map(id => document.getElementById(id));
  const states = Array.from({ length: 5 }, () => ({
    time: 0, dt: 0, progress: 0, velocity: 0,
    mouse: { x: 0, y: 0 }, mouseRaw: { x: 0, y: 0 }, mouseVel: 0, intro: 1
  }));

  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rtOpts = {
    type: renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType,
    depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter
  };
  const rtA = new THREE.WebGLRenderTarget(size.width, size.height, rtOpts);
  const rtB = new THREE.WebGLRenderTarget(size.width, size.height, rtOpts);

  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new THREE.ShaderMaterial({
    uniforms: {
      tA: { value: rtA.texture }, tB: { value: rtB.texture },
      uMix: { value: 0 }, uType: { value: 0 }, uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(size.width, size.height) },
      uVel: { value: 0 }, uReduced: { value: reducedMotion ? 1 : 0 }, uBlur: { value: 0 }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: POST,
    depthTest: false, depthWrite: false
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

  function renderChapter(i, rt) {
    const c = chapters[i];
    if (c.prerender) c.prerender(renderer);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(c.scene, c.camera);
  }

  const t0 = performance.now() / 1000;
  let last = t0;
  let lastWorkIdx = -1;
  const mmRoot = document.querySelector('#clients .mm');
  const mmNodes = mmRoot ? [...mmRoot.querySelectorAll('.mm-node')] : [];
  const hud = mmRoot ? createMapHud(mmRoot.closest('.stage'), { reducedMotion }) : null;   // route rail + telemetry + label decode
  // the map holds at each stop until the visitor clicks "Next stop" on the card (or skips / uses the rail)
  const tour = mmRoot ? createMapTour(document.getElementById('clients'), { reducedMotion }) : null;
  const preview = mmRoot ? createMapPreview(mmRoot.closest('.stage'), {
    reducedMotion,
    onNext: () => { if (tour) tour.next(); },
    onSkip: () => { document.dispatchEvent(new CustomEvent('v2:release')); document.getElementById('contact').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
  }) : null;   // card that pulls up on landing
  let blur = 0;
  let lastMapOn = false, lastMapActive = -2;
  let lastScrollY = scrollY;
  let velocity = 0;
  let mouseRaw = { x: 0, y: 0 };
  let mouse = { x: 0, y: 0 };
  let mouseVel = 0;
  let moved = 0;

  window.addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth * 2 - 1, y = -(e.clientY / innerHeight * 2 - 1);
    moved += Math.hypot(x - mouseRaw.x, y - mouseRaw.y);   // distance actually travelled since the last event
    mouseRaw.x = x; mouseRaw.y = y;
  });

  function frame() {
    if (document.hidden || document.documentElement.classList.contains('panel-open')) return;   // nothing to draw under an open panel
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last);
    last = now;

    const raw = (scrollY - lastScrollY) / Math.max(dt, 1e-3) / innerHeight;
    lastScrollY = scrollY;
    const target = Math.max(-1, Math.min(1, raw / 3));
    const kVel = 1 - Math.pow(0.9, dt * 60);
    velocity += (target - velocity) * kVel;

    const kMouse = 1 - Math.pow(0.92, dt * 60);
    mouse.x += (mouseRaw.x - mouse.x) * kMouse;   // kMouse = 0.08 per frame at 60 Hz, frame-rate independent
    mouse.y += (mouseRaw.y - mouse.y) * kMouse;
    const speed = moved / Math.max(dt, 1e-3);
    mouseVel = Math.max(mouseVel * Math.pow(0.92, dt * 60), Math.min(1, speed / 3));
    moved = 0;

    const rects = sections.map(s => s.getBoundingClientRect());
    const progresses = rects.map(r => Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight))));

    let active = 0;
    for (let i = 0; i < 5; i++) if (rects[i].top <= 1) active = i;
    const next = active + 1 < 5 ? active + 1 : -1;
    const tp = next >= 0 ? Math.max(0, Math.min(1, (innerHeight - rects[next].top) / innerHeight)) : 0;

    for (let i = 0; i < 5; i++) {
      if (i !== active && !(i === next && tp > 0.0001)) continue;   // only chapters that are on screen
      const s = states[i];
      s.time = now - t0;
      s.dt = dt;
      s.progress = progresses[i];
      s.velocity = velocity;
      s.mouse.x = mouse.x; s.mouse.y = mouse.y;
      s.mouseRaw.x = mouseRaw.x; s.mouseRaw.y = mouseRaw.y;
      s.mouseVel = mouseVel;
      s.intro = (i === 0 && introStart) ? Math.max(0, Math.min(1, (performance.now() - introStart) / 2800)) : 1;
      if (chapters[i].update) chapters[i].update(s);
    }

    if (tp > 0.0001 && next >= 0) {
      renderChapter(active, rtA);
      renderChapter(next, rtB);
      postMat.uniforms.uMix.value = tp;
      postMat.uniforms.uType.value = active;
    } else {
      renderChapter(active, rtA);
      postMat.uniforms.uMix.value = 0;
    }
    postMat.uniforms.uTime.value = now - t0;
    postMat.uniforms.uVel.value = velocity;
    const blurT = (active === 3 && tp < 0.12 && !reducedMotion) ? chapters[3].speed : 0;   // only the map's jumps blur
    blur += (blurT - blur) * (1 - Math.pow(0.85, dt * 60));
    postMat.uniforms.uBlur.value = blur;
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);

    const chapterId = (tp > 0.5 && next >= 0) ? sections[next].id : sections[active].id;
    if (document.documentElement.dataset.chapter !== chapterId) {
      document.documentElement.dataset.chapter = chapterId;
    }

    const workChapter = chapters[1];
    if (workChapter.activeIndex !== lastWorkIdx) {
      lastWorkIdx = workChapter.activeIndex;
      const items = document.querySelectorAll('#work .wl-item');
      const caps = document.querySelectorAll('#work .wl-cap');
      items.forEach((el, k) => el.classList.toggle('is-active', k === workChapter.activeIndex));
      caps.forEach((el, k) => el.classList.toggle('is-active', k === workChapter.activeIndex));
    }

    // site-map labels ride on the city's rooftops, only while the city is settled on screen
    const city = chapters[3];
    const mapOn = active === 3 && tp < 0.12;
    if (mapOn !== lastMapOn && mmRoot) { mmRoot.classList.toggle('is-on', mapOn); lastMapOn = mapOn; if (hud) hud.setVisible(mapOn); }
    if (mapOn && hud) hud.update({ p: city.progress, active: city.activeIndex, alt: city.alt, heading: city.heading });
    if (preview) { const ai = mapOn ? city.activeIndex : -1; if (ai >= 0 && ai <= 4) preview.show(ai); else preview.hide(); }
    if (mapOn && city.mapScreen) {
      const pts = city.mapScreen(canvas.clientWidth, canvas.clientHeight);
      for (let k = 0; k < mmNodes.length; k++) {
        mmNodes[k].style.transform = `translate3d(${pts[k * 3].toFixed(1)}px, ${pts[k * 3 + 1].toFixed(1)}px, 0)`;
        const hid = pts[k * 3 + 2] < 0.5;
        if (mmNodes[k].classList.contains('is-hidden') !== hid) mmNodes[k].classList.toggle('is-hidden', hid);
        const flip = pts[k * 3] > canvas.clientWidth * 0.62;   // labels near the right edge open to the left
        if (mmNodes[k].classList.contains('is-flip') !== flip) mmNodes[k].classList.toggle('is-flip', flip);
      }
      if (city.activeIndex !== lastMapActive) {
        lastMapActive = city.activeIndex;
        mmNodes.forEach((el, k) => el.classList.toggle('is-active', k === lastMapActive));
      }
    }
  }

  const workStage = document.querySelector('#work .stage');
  // NDC against the canvas itself (100lvh), not the 100svh stage, so phone picks land where the card is drawn
  const pickAt = e => {
    const r = canvas.getBoundingClientRect();
    return chapters[1].pick((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
  };
  if (workStage) {
    workStage.addEventListener('click', e => {
      if (document.documentElement.dataset.chapter !== 'work') return;
      const idx = pickAt(e);
      if (idx >= 0 && !e.target.closest('a')) {
        const links = document.querySelectorAll('#work .wl-item a');
        if (links[idx]) links[idx].click();   // same path as clicking the list link, so panel.js tracks history depth
      }
    });
    workStage.addEventListener('pointermove', e => {
      if (document.documentElement.dataset.chapter !== 'work') return;
      workStage.style.cursor = pickAt(e) >= 0 ? 'pointer' : '';
    });
  }

  let resizeTimer = 0, lastW = canvas.clientWidth, lastH = canvas.clientHeight;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // size from the canvas (100lvh): a phone toolbar showing/hiding changes innerHeight but not this,
      // so mid-scroll it costs nothing instead of reallocating two full-screen targets
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      renderer.setSize(w, h, false);
      const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
      rtA.setSize(sz.width, sz.height);
      rtB.setSize(sz.width, sz.height);
      postMat.uniforms.uRes.value.set(sz.width, sz.height);
      chapters.forEach(c => c.resize && c.resize(w, h));
    }, 120);
  });
  ready = true;
}
init().catch(fail);

const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('menu');
if (menuBtn && menu) {
  menuBtn.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
}
// open/close the menu; while open the page behind is inert so Tab stays in the menu + nav
function setMenu(open) {
  document.documentElement.classList.toggle('menu-open', open);
  if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  const main = document.querySelector('main');
  if (main) main.inert = open;
}
// plain anchors scroll the homepage; "#/..." routes are left to panel.js (default hash navigation)
document.querySelectorAll('a[href^="#"]:not([href^="#/"])').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) {
      setMenu(false);
      if (id !== 'hero') document.dispatchEvent(new CustomEvent('v2:release'));   // anchors may jump past the map's stops
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });   // skip link / anchors move keyboard focus too
    }
  });
});