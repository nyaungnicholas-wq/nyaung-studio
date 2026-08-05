/* ============================================================
   NICHOLAS — persistent WebGL background (Three.js, ESM)
   Lives on EVERY page and stays visible through the whole scroll.
   Home = dramatic scroll journey (morph + flythrough).
   Other pages = calm, off-to-the-side ambient motion.
   Progressive enhancement: CSS ambient bg carries it if this fails.
   ============================================================ */
import * as THREE from 'three';

const canvas = document.getElementById('hero-canvas');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAGE = document.documentElement.dataset.page || 'home';
const DRAMATIC = PAGE === 'home';

// On phones, skip WebGL entirely — the CSS ambient background carries it
// (protects Core Web Vitals + battery; mobile is 60%+ of traffic).
const MOBILE = window.matchMedia('(max-width: 768px)').matches;
if (canvas && window.WebGLRenderingContext && !MOBILE) {
  initScene().catch((e) => console.warn('hero scene skipped', e));
}

async function initScene() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 9;

  // Real bloom post-processing for cinematic glow. Falls back to direct render on failure.
  let composer = null, bloom = null;
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
    ]);
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.6, 0.12);
    composer.addPass(bloom);
    composer.setSize(window.innerWidth, window.innerHeight);
  } catch (e) { composer = null; bloom = null; }
  const draw = () => { if (composer) composer.render(); else renderer.render(scene, camera); };

  const C = { indigo: 0x6366f1, violet: 0x818cf8, fuchsia: 0xc084fc, magenta: 0xe879f9, cyan: 0x38bdf8 };

  // soft circular sprite so particles/core read as glowing dots, not squares
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

  const group = new THREE.Group();
  scene.add(group);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.5, 1)),
    new THREE.LineBasicMaterial({ color: C.violet, transparent: true, opacity: 0.55 })
  );
  group.add(wire);

  const morph = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(1.7, 0.55, 120, 16)),
    new THREE.LineBasicMaterial({ color: C.fuchsia, transparent: true, opacity: 0 })
  );
  group.add(morph);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.15, 1),
    new THREE.MeshBasicMaterial({ color: C.indigo, transparent: true, opacity: 0.07, side: THREE.BackSide })
  );
  group.add(inner);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: C.fuchsia, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(2.9); group.add(glow);
  const glow2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow2.scale.setScalar(1.35); group.add(glow2);

  // orbit ring
  const RING = reduce ? 0 : 220;
  if (RING) {
    const rpos = new Float32Array(RING * 3);
    for (let i = 0; i < RING; i++) {
      const a = (i / RING) * Math.PI * 2, r = 3.5 + Math.random() * 0.25;
      rpos[i * 3] = Math.cos(a) * r; rpos[i * 3 + 1] = (Math.random() - 0.5) * 0.5; rpos[i * 3 + 2] = Math.sin(a) * r;
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3));
    const ring = new THREE.Points(ringGeo, new THREE.PointsMaterial({ color: C.violet, size: 0.13, map: dotTex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    ring.rotation.x = 1.15; group.add(ring); group.userData.ring = ring;
  }

  // starfield
  const COUNT = reduce ? 800 : 2900;
  const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3);
  const palette = [new THREE.Color(C.violet), new THREE.Color(C.indigo), new THREE.Color(C.fuchsia), new THREE.Color(C.cyan), new THREE.Color(0xffffff)];
  for (let i = 0; i < COUNT; i++) {
    const r = 7 + Math.random() * 17, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph);
    const c = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  starGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  // custom shader: soft round points + CURSOR REPULSION (field parts around the mouse)
  const starUniforms = {
    uMouse: { value: new THREE.Vector2(0, 0) },   // cursor in NDC (-1..1)
    uRadius: { value: 0.34 }, uPush: { value: 2.6 },
    uSize: { value: 92.0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) },
    uOpacity: { value: 0.95 },
  };
  const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    uniforms: starUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor; varying vec3 vColor;
      uniform vec2 uMouse; uniform float uRadius, uPush, uSize, uPR;
      void main(){
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec4 clip = projectionMatrix * mv;
        vec2 ndc = clip.xy / clip.w;
        float d = distance(ndc, uMouse);
        float f = smoothstep(uRadius, 0.0, d);
        vec2 dir = normalize(ndc - uMouse + vec2(0.0001));
        mv.xy += dir * f * uPush;            // push away from cursor
        mv.xyz += normalize(mv.xyz) * f * 0.6;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR / max(-mv.z, 0.1);
      }`,
    fragmentShader: `
      varying vec3 vColor; uniform float uOpacity;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * uOpacity);
      }`,
  }));
  stars.frustumCulled = false;
  scene.add(stars);

  // ---- GLASS CORE: custom GLSL fresnel + screen-space refraction of the starfield ----
  let glass = null, sceneRT = null;
  try {
    const dbs = renderer.getDrawingBufferSize(new THREE.Vector2());
    sceneRT = new THREE.WebGLRenderTarget(dbs.x, dbs.y);
    const glassUniforms = {
      tScene: { value: sceneRT.texture },
      uRes: { value: new THREE.Vector2(dbs.x, dbs.y) },
      uRefract: { value: 0.085 }, uFresPower: { value: 2.3 }, uTime: { value: 0 },
      uFres: { value: new THREE.Color(0x9aa8ff) },
    };
    glass = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 6),
      new THREE.ShaderMaterial({
        uniforms: glassUniforms, transparent: true, depthWrite: false,
        vertexShader: `
          varying vec3 vN; varying vec3 vView;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform sampler2D tScene; uniform vec2 uRes; uniform float uRefract, uFresPower, uTime; uniform vec3 uFres;
          varying vec3 vN; varying vec3 vView;
          void main(){
            vec2 uv = gl_FragCoord.xy / uRes;
            vec2 off = vN.xy * uRefract;
            float ca = uRefract * 0.5;                  // chromatic dispersion
            vec3 refr;
            refr.r = texture2D(tScene, uv + off + vN.xy * ca).r;
            refr.g = texture2D(tScene, uv + off).g;
            refr.b = texture2D(tScene, uv + off - vN.xy * ca).b;
            float fres = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), uFresPower);
            vec3 col = refr * 1.06 + uFres * fres * 1.6;
            float alpha = clamp(fres * 0.9 + 0.16 + length(refr) * 0.6, 0.0, 1.0);
            gl_FragColor = vec4(col, alpha);
          }`,
      })
    );
    glass.frustumCulled = false;
    group.add(glass);
  } catch (e) { glass = null; sceneRT = null; }

  // input
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  // DRAG-TO-EXPLORE: grab the empty background to spin the core (with momentum)
  const drag = { active: false, lx: 0, ly: 0, ox: 0, oy: 0, vx: 0, vy: 0 };
  const isBackground = (t) => !(t && t.closest && t.closest('a, button, input, textarea, select, summary, .proj, .bento-card, .feature, .cta-card, .filter, .cmdk, .cmdk-hint, .assistant-panel, .assistant-btn, .snd-toggle, .section-nav, .case-nav, .tcard, .post, .modal-card, .nav'));
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !isBackground(e.target)) return;
    drag.active = true; drag.lx = e.clientX; drag.ly = e.clientY; drag.vx = 0; drag.vy = 0;
    document.body.classList.add('grabbing'); start();
  }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (!drag.active) return;
    drag.vx = (e.clientX - drag.lx) * 0.005; drag.vy = (e.clientY - drag.ly) * 0.005;
    drag.lx = e.clientX; drag.ly = e.clientY;
    drag.ox += drag.vx; drag.oy = Math.max(-1.2, Math.min(1.2, drag.oy + drag.vy));
  }, { passive: true });
  const endDrag = () => { if (drag.active) { drag.active = false; document.body.classList.remove('grabbing'); } };
  window.addEventListener('pointerup', endDrag, { passive: true });
  window.addEventListener('pointercancel', endDrag, { passive: true });

  // helpers
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };
  const kf = (p, stops) => { for (let i = 0; i < stops.length - 1; i++) { const [p0, v0] = stops[i], [p1, v1] = stops[i + 1]; if (p <= p1) return lerp(v0, v1, (p - p0) / ((p1 - p0) || 1)); } return stops[stops.length - 1][1]; };

  const range = () => window.innerHeight * (DRAMATIC ? 2.2 : 1.4);
  const targetProg = () => Math.min(window.scrollY / range(), 1);
  // persistent: opacity floors so the 3D NEVER fully disappears
  const FLOOR = DRAMATIC ? 0.26 : 0.22;
  const TOP = DRAMATIC ? 1 : 0.62;
  const opacityFor = (p) => FLOOR + (TOP - FLOOR) * (1 - smoothstep(DRAMATIC ? 0.28 : 0, DRAMATIC ? 0.72 : 0.55, p));
  // full-screen 3D moment: 0..1 of how centered the #moment section is
  const momentEl = document.getElementById('moment');
  const momentCenter = () => {
    if (!momentEl) return 0;
    const r = momentEl.getBoundingClientRect(), vh = window.innerHeight;
    const d = Math.abs((r.top + r.height / 2) - vh / 2) / vh;
    return Math.max(0, 1 - d * 1.5);
  };
  const setOpacity = () => { canvas.style.opacity = String(Math.max(opacityFor(targetProg()), momentCenter() * 0.92)); };

  const colA = new THREE.Color(C.violet), colB = new THREE.Color(C.fuchsia), colC = new THREE.Color(C.magenta);
  const clock = new THREE.Clock();
  const TWO_PI = Math.PI * 2;
  let prog = 0, running = false, burst = 0;
  // reduce guard: reduced-motion users get the single static frame, never the loop
  const start = () => { if (reduce || running || window.__scenePaused) return; running = true; requestAnimationFrame(render); };
  // click anywhere = a glow shockwave through the scene
  window.addEventListener('pointerdown', () => { burst = 1; start(); }, { passive: true });

  // pause the loop on backgrounded tabs (battery + perf), resume on return
  document.addEventListener('visibilitychange', () => { window.__scenePaused = document.hidden; if (!document.hidden) start(); });
  // release GPU resources when leaving the page (prevents VRAM build-up across navigations)
  window.addEventListener('pagehide', () => {
    try {
      renderer.dispose();
      [wire, morph, inner, stars, glow, glow2, glass].forEach(o => { if (!o) return; o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); });
      if (group.userData.ring) { group.userData.ring.geometry.dispose(); group.userData.ring.material.dispose(); }
      if (sceneRT) sceneRT.dispose();
      dotTex.dispose();
    } catch (e) {}
  });

  window.addEventListener('scroll', () => { setOpacity(); start(); }, { passive: true });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    if (bloom) bloom.setSize(window.innerWidth, window.innerHeight);
    if (sceneRT) { const dbs = renderer.getDrawingBufferSize(new THREE.Vector2()); sceneRT.setSize(dbs.x, dbs.y); if (glass) glass.material.uniforms.uRes.value.copy(dbs); }
    if (reduce) { setOpacity(); draw(); }
  });

  function render() {
    if (window.__scenePaused) { running = false; return; }
    const tgt = targetProg();
    prog += (tgt - prog) * 0.075;
    setOpacity();
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;

    if (DRAMATIC) {
      group.rotation.y = t * 0.1 + prog * TWO_PI * 3;
      group.rotation.x = Math.sin(t * 0.1) * 0.12 + prog * 1.4;
      group.rotation.z = prog * 0.9;
      if (group.userData.ring) group.userData.ring.rotation.z = t * 0.45 + prog * 2.6;
      group.position.x = kf(prog, [[0, 0], [0.3, -3.3], [0.6, 3.1], [1, -1.4]]);
      group.position.y = kf(prog, [[0, 0], [0.5, 0.8], [1, 2.4]]);
      group.scale.setScalar(kf(prog, [[0, 1], [0.45, 1.75], [0.7, 0.9], [1, 0.32]]));
      wire.material.opacity = kf(prog, [[0, 0.55], [0.32, 0.55], [0.5, 0]]);
      morph.material.opacity = kf(prog, [[0, 0], [0.34, 0], [0.52, 0.6], [0.82, 0.5], [1, 0.25]]);
      morph.rotation.y = t * 0.2 - prog * 4; morph.rotation.x = prog * 3;
      wire.material.color.copy(colA).lerp(colB, smoothstep(0, 0.55, prog));
      morph.material.color.copy(colB).lerp(colC, smoothstep(0.5, 1, prog));
      stars.position.z = kf(prog, [[0, 0], [0.45, 7], [1, 19]]);
      stars.material.size = kf(prog, [[0, 0.12], [0.45, 0.32], [1, 0.12]]);
      stars.rotation.y = t * 0.02 + prog * 0.9; stars.rotation.x = t * 0.012;
      glow.material.opacity = kf(prog, [[0, 0.85], [0.32, 1], [0.45, 0.25], [0.7, 0.55], [1, 0.2]]);
      camera.position.z = kf(prog, [[0, 10], [0.45, 2.2], [0.7, 6.5], [1, 16]]);
      camera.fov = kf(prog, [[0, 55], [0.45, 80], [0.7, 58], [1, 55]]);
      camera.updateProjectionMatrix();
      const roll = kf(prog, [[0, 0], [0.5, 0.45], [1, -0.35]]);
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      camera.position.x = mouse.x * 1.6; camera.position.y = -mouse.y * 1.0;
      camera.lookAt(0, 0, 0);

      // FULL-SCREEN 3D MOMENT: when the #moment section centers, recompose the core
      // into a glowing showcase pose (overrides the end-of-journey shrink).
      const mb = momentCenter();
      if (mb > 0.02) {
        group.position.x = lerp(group.position.x, 0, mb);
        group.position.y = lerp(group.position.y, 0, mb);
        group.scale.setScalar(lerp(group.scale.x, 1.3, mb));
        group.rotation.z = lerp(group.rotation.z, 0, mb * 0.6);
        camera.up.set(0, 1, 0);
        camera.position.z = lerp(camera.position.z, 8.5, mb);
        camera.position.x = lerp(camera.position.x, mouse.x * 0.8, mb);
        camera.fov = lerp(camera.fov, 62, mb); camera.updateProjectionMatrix();
        wire.material.opacity = Math.max(wire.material.opacity, 0.6 * mb);
        morph.material.opacity = Math.max(morph.material.opacity, 0.45 * mb);
        glow.material.opacity = Math.max(glow.material.opacity, 0.95 * mb);
        camera.lookAt(0, 0, 0);
      }
    } else {
      // calm ambient: object sits off to the side, gentle motion, never blocks content
      wire.material.opacity = 0.5; wire.material.color.copy(colA).lerp(colB, 0.3);
      morph.material.opacity = 0;
      group.rotation.y = t * 0.08 + prog * 0.9;
      group.rotation.x = Math.sin(t * 0.1) * 0.12 + prog * 0.3;
      if (group.userData.ring) group.userData.ring.rotation.z = t * 0.3;
      group.position.x = 2.4; group.position.y = kf(prog, [[0, 0.2], [1, -1.2]]);
      group.scale.setScalar(0.85);
      glow.material.opacity = 0.55;
      stars.position.z = kf(prog, [[0, 0], [1, 5]]);
      stars.material.size = 0.12; stars.rotation.y = t * 0.02; stars.rotation.x = t * 0.01;
      camera.fov = 55; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0);
      camera.position.z = 9; camera.position.x = mouse.x * 1.2; camera.position.y = -mouse.y * 0.8;
      camera.lookAt(0, 0, 0);
    }

    // INTERACTIVE: core tilts to cursor; starfield parallaxes + repels around the pointer
    group.rotation.y += mouse.x * 0.6;
    group.rotation.x += -mouse.y * 0.35;
    // drag-to-explore: accumulated grab offset + throw momentum
    if (!drag.active) { drag.ox += drag.vx; drag.oy = Math.max(-1.2, Math.min(1.2, drag.oy + drag.vy)); drag.vx *= 0.92; drag.vy *= 0.92; }
    group.rotation.y += drag.ox;
    group.rotation.x += drag.oy;
    stars.rotation.y += mouse.x * 0.07;
    stars.rotation.x += -mouse.y * 0.04;
    starUniforms.uMouse.value.set(mouse.x * 2.0, -mouse.y * 2.0);
    // click shockwave: pulse the core + bloom, then decay
    burst *= 0.9;
    glow.scale.setScalar(2.9 + burst * 1.0);
    glow2.scale.setScalar(1.35 + burst * 0.5);

    // bloom pulses with scroll velocity + click burst (and a gentle idle breath)
    if (bloom) {
      const v = window.__lenis ? Math.min(Math.abs(window.__lenis.velocity || 0) / 35, 1) : 0;
      const base = DRAMATIC ? 0.95 : 0.72;
      bloom.strength = base + v * 1.4 + burst * 0.7 + Math.sin(t * 1.4) * 0.14;
    }

    // GLASS refraction: render the scene (minus the glass) to a target the glass samples
    if (glass && sceneRT) {
      glass.material.uniforms.uTime.value = t;
      glass.visible = false;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      glass.visible = true;
    }
    draw();
    requestAnimationFrame(render);
  }

  // discoverability hint for drag-to-explore (home, desktop, motion-on)
  if (DRAMATIC && !reduce) {
    const dh = document.createElement('div'); dh.className = 'drag-hint';
    dh.textContent = '✦ Drag the background to explore';
    document.body.appendChild(dh);
    const hide = () => { dh.classList.add('gone'); window.removeEventListener('pointerdown', onDrag, true); setTimeout(() => dh.remove(), 700); };
    const onDrag = (e) => { if (isBackground(e.target)) hide(); };
    window.addEventListener('pointerdown', onDrag, true);
    setTimeout(hide, 7000);
  }

  setOpacity();
  if (reduce) {
    group.position.x = DRAMATIC ? 0 : 2.4; group.rotation.set(0.3, 0.5, 0);
    draw();
  } else {
    start();
  }
}
