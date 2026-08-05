// Homepage scroll-driven particle story: idea -> build -> ship -> live
// aurora.js is the calm fallback + other-page background
(function() {
  'use strict';

  const canvas = document.getElementById('hero-canvas');
  const bail = (() => {
    let injected = false;
    return function() {
      if (!injected) {
        const s = document.createElement('script');
        s.defer = true;
        s.src = 'aurora.js?v=1';
        document.head.appendChild(s);
        injected = true;
      }
    };
  })();

  if (!canvas) return bail();
  if (window.matchMedia("(max-width: 768px)").matches) return bail();

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return bail();

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const compileShader = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      bail();
      return null;
    }
    return shader;
  };

  const createProgram = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('Program link error:', gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      bail();
      return null;
    }
    return p;
  };

  // Aurora background (Pass A)
  const auroraVS = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;
  const auroraFS = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_res;
    uniform float u_scroll;
    varying vec2 v_uv;

    #define PI 3.14159265
    #define TAU 6.28318530

    mat2 rot(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float val = 0.0;
      float amp = 0.5;
      mat2 rotMat = rot(0.6);
      for (int i = 0; i < 4; i++) {
        val += amp * valueNoise(p);
        p = rotMat * p * 2.0 + vec2(100.0);
        amp *= 0.5;
      }
      return val;
    }

    void main() {
      vec2 uv = v_uv;
      float t = u_time * 0.08;
      vec2 scrollOffset = vec2(0.0, u_scroll * 0.5);

      // Domain warping (Inigo Quilez style)
      vec2 q = vec2(
        fbm(uv + vec2(0.0, 0.0) + scrollOffset),
        fbm(uv + vec2(5.2, 1.3) + scrollOffset)
      );
      vec2 r = vec2(
        fbm(uv + 4.0 * q + vec2(1.7, 9.2) + t * 0.2),
        fbm(uv + 4.0 * q + vec2(8.3, 2.8) + t * 0.2)
      );
      float f = fbm(uv + 4.0 * r);

      // Palette with hue phase drift
      float hue = u_scroll * 0.7 + t * 0.1; // ~40deg over full page
      vec3 base = vec3(0.024, 0.024, 0.035); // #060609
      vec3 indigo = vec3(0.388, 0.400, 0.945); // #6366f1
      vec3 violet = vec3(0.506, 0.549, 0.973); // #818cf8
      vec3 fuchsia = vec3(0.753, 0.518, 0.996); // #c084fc
      vec3 magenta = vec3(0.910, 0.475, 0.976); // #e879f9
      vec3 cyan = vec3(0.220, 0.741, 0.973); // #38bdf8

      // Smooth band mixing
      vec3 col = base;
      col = mix(col, indigo, smoothstep(0.2, 0.6, f));
      col = mix(col, violet, smoothstep(0.4, 0.8, f + 0.1 * sin(hue)));
      col = mix(col, fuchsia, smoothstep(0.6, 1.0, f * 0.8 + 0.2));
      col = mix(col, magenta, smoothstep(0.7, 1.0, r.x * 0.5 + 0.5));
      col = mix(col, cyan * 0.3, smoothstep(0.3, 0.5, r.y * 0.5 + 0.5) * 0.2);

      // Vignette
      float vig = 1.0 - dot((uv - 0.5) * 1.2, (uv - 0.5) * 1.2);
      col *= smoothstep(0.0, 0.8, vig);

      // Film grain
      float grain = (noise(uv * 500.0 + t * 100.0) - 0.5) * 0.024;
      col += grain;

      // Low luminance cap
      col = min(col, 0.28);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const auroraProg = createProgram(auroraVS, auroraFS);
  if (!auroraProg) return bail();

  // Particle story (Pass B)
  const N = 14000;
  const seeds = new Float32Array(N * 4);
  const glyphs = new Float32Array(N * 2);

  // Generate N monogram glyphs
  const genCanvas = document.createElement('canvas');
  genCanvas.width = genCanvas.height = 512;
  const ctx = genCanvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'white';
  ctx.font = '900 420px Satoshi, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const m = ctx.measureText('N');
  if (m.width < 1) return bail();
  ctx.fillText('N', 256, 280);
  const imgData = ctx.getImageData(0, 0, 512, 512).data;
  const glyphPixels = [];
  for (let i = 0; i < imgData.length; i += 4) {
    if (imgData[i] > 128) {
      const x = (i / 4) % 512;
      const y = Math.floor((i / 4) / 512);
      glyphPixels.push(x, y);
    }
  }
  if (glyphPixels.length < 400) return bail();

  for (let i = 0; i < N; i++) {
    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = Math.random();

    const gi = Math.floor(Math.random() * (glyphPixels.length / 2)) * 2;
    glyphs[i * 2] = (glyphPixels[gi] / 512 - 0.5) * 1.15;
    glyphs[i * 2 + 1] = (0.5 - glyphPixels[gi + 1] / 512) * 1.15;
  }

  const particleVS = `
    attribute vec4 a_seed;
    attribute vec2 a_glyph;
    uniform float u_time;
    uniform vec2 u_res;
    uniform float u_p1, u_p2, u_p3;
    uniform vec2 u_mouse;
    uniform float u_dpr;
    varying vec3 v_col;
    varying float v_alpha;

    void main() {
      float idx = a_seed.x * 100.0;
      float jdx = a_seed.y * 70.0;

      // State 0: CHAOS
      vec2 s0 = (a_seed.xy * 2.0 - 1.0) * vec2(1.6, 1.0);
      s0 += 0.22 * vec2(
        sin(u_time * 0.31 + a_seed.z * 6.28 + s0.x),
        cos(u_time * 0.27 + a_seed.w * 6.28 + s0.y)
      );

      // State 1: LATTICE
      vec2 s1 = vec2(
        (floor(a_seed.x * 100.0) / 99.0 - 0.5) * 1.7,
        (floor(a_seed.y * 70.0) / 69.0 - 0.5) * 1.05
      );
      s1 += 0.012 * vec2(sin(u_time * 0.5 + a_seed.z * 6.28), cos(u_time * 0.5 + a_seed.w * 6.28));

      // State 2: GLYPH
      vec2 s2 = a_glyph + 0.006 * vec2(sin(u_time * 0.3 + a_seed.z * 6.28), cos(u_time * 0.3 + a_seed.w * 6.28));

      // State 3: DISSOLVE — embers rise from a low band and wrap (stable over time)
      vec2 s3;
      s3.x = s2.x * 1.6 + sin(u_time * 0.2 + a_seed.z * 6.28) * 0.1;
      s3.y = -0.35 + fract(a_seed.w + u_time * 0.025) * 1.1;

      // Blend states
      vec2 pos = mix(s0, s1, u_p1);
      pos = mix(pos, s2, u_p2);
      pos = mix(pos, s3, u_p3);

      // Mouse repel
      vec2 mPos = u_mouse;
      vec2 diff = pos - mPos;
      float dist = length(diff);
      if (dist > 0.001) {
        pos += normalize(diff) * 0.18 * exp(-dist * 4.0) * (1.0 - u_p2 * 0.5);
      }

      // Aspect correction
      pos.x *= u_res.y / u_res.x;

      gl_Position = vec4(pos, 0.0, 1.0);
      float size = (1.5 + a_seed.w * 2.5) * u_dpr;
      size *= 1.0 + 0.25 * u_p2;
      gl_PointSize = size;

      // Color — luxury palette: muted amethyst field, champagne-gold assembled N
      vec3 col1 = vec3(0.298, 0.169, 0.478); // muted violet
      vec3 col2 = vec3(0.655, 0.545, 0.859); // glowing lavender
      vec3 col3 = vec3(0.910, 0.784, 0.478); // champagne gold
      vec3 col4 = vec3(0.820, 0.780, 0.880); // calm lavender-white

      v_col = mix(col1, col2, a_seed.x);
      v_col = mix(v_col, col3, u_p2);
      v_col = mix(v_col, col4, u_p3 * 0.5);

      // additive blending: 14k sprites concentrated into the glyph saturate fast.
      // Concentration alone brightens the N ~4x, so the assembled alpha stays low.
      v_alpha = 0.22;
      v_alpha *= 0.75 + 0.25 * sin(u_time + a_seed.z * 6.28);
      if (u_p1 < 0.5) v_alpha *= 0.35;
      v_alpha = mix(v_alpha, 0.25, u_p2);
    }
  `;
  const particleFS = `
    precision highp float;
    varying vec3 v_col;
    varying float v_alpha;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      float alpha = smoothstep(0.5, 0.1, d) * v_alpha;
      gl_FragColor = vec4(v_col * alpha, alpha);
    }
  `;

  const particleProg = createProgram(particleVS, particleFS);
  if (!particleProg) return bail();

  // Buffer setup
  const seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  const glyphBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, glyphBuf);
  gl.bufferData(gl.ARRAY_BUFFER, glyphs, gl.STATIC_DRAW);

  // Attribute locations
  const a_seed = gl.getAttribLocation(particleProg, 'a_seed');
  const a_glyph = gl.getAttribLocation(particleProg, 'a_glyph');

  // Fullscreen quad for aurora
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const a_pos = gl.getAttribLocation(auroraProg, 'a_pos');

  // Uniform locations
  const u_timeA = gl.getUniformLocation(auroraProg, 'u_time');
  const u_resA = gl.getUniformLocation(auroraProg, 'u_res');
  const u_scrollA = gl.getUniformLocation(auroraProg, 'u_scroll');

  const u_timeB = gl.getUniformLocation(particleProg, 'u_time');
  const u_resB = gl.getUniformLocation(particleProg, 'u_res');
  const u_p1 = gl.getUniformLocation(particleProg, 'u_p1');
  const u_p2 = gl.getUniformLocation(particleProg, 'u_p2');
  const u_p3 = gl.getUniformLocation(particleProg, 'u_p3');
  const u_mouse = gl.getUniformLocation(particleProg, 'u_mouse');
  const u_dpr = gl.getUniformLocation(particleProg, 'u_dpr');

  // Section progress helper
  const sections = {
    cap: document.getElementById('capabilities'),
    moment: document.getElementById('moment'),
    contact: document.getElementById('contact-cta')
  };

  function prog(el, startVh, endVh) {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const start = startVh * window.innerHeight;
    const end = endVh * window.innerHeight;
    const p = (start - rect.top) / (start - end);
    return Math.max(0, Math.min(1, p));
  }

  // Chapter label
  const label = document.createElement('div');
  label.className = 'story-chapter';
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:5;font:600 11px/1 "IBM Plex Mono",monospace;letter-spacing:.18em;color:rgba(178,162,204,.75);pointer-events:none;transition:opacity .45s ease;opacity:0';
  document.body.appendChild(label);
  const chapters = ['01 — IDEA', '02 — BUILD', '03 — SHIP', '04 — LIVE'];
  let lastChapter = -1;
  let labelTimeout = null;
  let labelInit = false;

  function updateLabel(p1, p2, p3) {
    const idx = p3 > 0.5 ? 3 : p2 > 0.5 ? 2 : p1 > 0.5 ? 1 : 0;
    if (idx === lastChapter) return;

    clearTimeout(labelTimeout);
    labelTimeout = setTimeout(() => {
      label.textContent = chapters[idx];
      label.style.opacity = '0.8';
      lastChapter = idx;
    }, 200);
    label.style.opacity = '0';
  }

  // Mouse tracking
  let mouseTarget = [0.5, 0.35];
  let mouse = [0.5, 0.35];
  const pointermove = (e) => {
    // particles live in authored (square) space; scale clip x by aspect to match
    mouseTarget = [
      ((e.clientX / window.innerWidth) * 2 - 1) * (window.innerWidth / window.innerHeight),
      -(e.clientY / window.innerHeight) * 2 + 1
    ];
  };
  window.addEventListener('pointermove', pointermove, { passive: true });

  // Resize handling
  let dpr = Math.min(window.devicePixelRatio, 1.5) * 0.85;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio, 1.5) * 0.85;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (reduce) drawStaticFrame();
  };
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });
  resize();

  // Draw function
  function draw(time) {
    mouse[0] += (mouseTarget[0] - mouse[0]) * 0.06;
    mouse[1] += (mouseTarget[1] - mouse[1]) * 0.06;

    const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    const scroll = scrollMax > 0 ? window.scrollY / scrollMax : 0;

    const p1 = Math.pow(prog(sections.cap, 0.9, 0.1), 3) * (3 - 2 * prog(sections.cap, 0.9, 0.1));
    const p2 = Math.pow(prog(sections.moment, 0.85, 0.15), 3) * (3 - 2 * prog(sections.moment, 0.85, 0.15));
    const p3 = Math.pow(prog(sections.contact, 0.9, 0.2), 3) * (3 - 2 * prog(sections.contact, 0.9, 0.2));

    updateLabel(p1, p2, p3);

    // Pass A: Aurora
    gl.useProgram(auroraProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(a_pos);
    gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u_timeA, time);
    gl.uniform2f(u_resA, canvas.width, canvas.height);
    gl.uniform1f(u_scrollA, scroll);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pass B: Particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(particleProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.enableVertexAttribArray(a_seed);
    gl.vertexAttribPointer(a_seed, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, glyphBuf);
    gl.enableVertexAttribArray(a_glyph);
    gl.vertexAttribPointer(a_glyph, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u_timeB, time);
    gl.uniform2f(u_resB, canvas.width, canvas.height);
    gl.uniform1f(u_p1, p1);
    gl.uniform1f(u_p2, p2);
    gl.uniform1f(u_p3, p3);
    gl.uniform2f(u_mouse, mouse[0], mouse[1]);
    gl.uniform1f(u_dpr, dpr);
    gl.drawArrays(gl.POINTS, 0, N);

    gl.disable(gl.BLEND);
  }

  // Static frame for reduced motion
  function drawStaticFrame() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    draw(0);
  }

  if (reduce) {
    drawStaticFrame();
    return;
  }

  // Animation loop
  let loop = true;
  const tick = (time) => {
    if (!loop) return;
    if (!document.hidden) draw(time * 0.001);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Label init after 2s
  setTimeout(() => {
    if (lastChapter === 0) {
      label.style.opacity = '0.8';
    }
    labelInit = true;
  }, 2000);

  // Cleanup on page leave
  window.addEventListener('beforeunload', () => {
    loop = false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  });
})();