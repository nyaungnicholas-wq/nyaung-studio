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
        s.src = 'aurora.js?v=3';
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
    uniform vec2 u_mouse;
    uniform float u_scroll;
    uniform float u_vel;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      mat2 rot = mat2(0.8253, 0.5646, -0.5646, 0.8253);
      float f = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        f += amp * noise(p);
        p = rot * p * 2.0 + vec2(1.7);
        amp *= 0.5;
      }
      return f / 0.9375;
    }
    
    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= u_res.x / u_res.y;
      
      // Mouse parallax
      vec2 mouseNorm = u_mouse - 0.5;
      float aspect = u_res.x / u_res.y;
      vec2 mouseOffset = mouseNorm * vec2(aspect, 1.0);
      
      // Time and scroll
      float t = u_time * 0.048 + u_vel * 0.25;
      float scrollShift = u_scroll * 1.4;
      
      // Base gradient: #0B0410 to #1A0B2E
      vec3 baseTop = vec3(0.043, 0.016, 0.063);
      vec3 baseBottom = vec3(0.102, 0.043, 0.180);
      vec3 base = mix(baseBottom, baseTop, uv.y);
      
      // Domain warping - slowed ~40%
      vec2 q = vec2(
        fbm(p * 0.8 + vec2(scrollShift, t * 0.18)),
        fbm(p * 0.8 + vec2(5.2, 1.3) + vec2(scrollShift, t * 0.18))
      );
      
      vec2 r = vec2(
        fbm(p * 0.8 + 2.2 * q + vec2(1.7, 9.2) + vec2(scrollShift, t * 0.072)),
        fbm(p * 0.8 + 2.2 * q + vec2(8.3, 2.8) + vec2(scrollShift, t * 0.06))
      );
      
      float f = fbm(p * 0.8 + 2.4 * r + mouseOffset * 0.015);
      
      // Luxury color palette - low saturation
      vec3 darkAmethyst = vec3(0.165, 0.082, 0.282);
      vec3 mutedViolet = vec3(0.298, 0.169, 0.478);
      vec3 glowingLavender = vec3(0.655, 0.545, 0.859);
      
      // Color bands with max luminance ~0.30
      float band1 = smoothstep(0.1, 0.4, f);
      float band2 = smoothstep(0.3, 0.7, q.x);
      float band3 = smoothstep(0.5, 0.9, r.y);
      
      vec3 col = base;
      col = mix(col, darkAmethyst, band1 * 0.7);
      col = mix(col, mutedViolet, band2 * 0.6);
      col = mix(col, glowingLavender, smoothstep(0.85, 1.0, f) * 0.3);
      
      // Luminance cap
      col = min(col, 0.30);
      
      // Champagne-gold rim flares
      float flareField = smoothstep(0.72, 0.95, q.x * r.y) * 0.10;
      col += vec3(0.910, 0.784, 0.478) * flareField;
      
      // Bokeh glass spheres - 4 hardcoded
      struct Sphere {
        vec2 center;
        float radius;
        float depth;
        float speedX;
        float speedY;
        float phaseX;
        float phaseY;
      };
      
      Sphere spheres[4];
      spheres[0] = Sphere(vec2(-0.7, 0.5), 0.18, 0.25, 0.08, 0.06, 0.0, 1.5);
      spheres[1] = Sphere(vec2(0.6, -0.4), 0.26, 0.5, 0.06, 0.09, 1.5, 3.0);
      spheres[2] = Sphere(vec2(-0.5, -0.6), 0.34, 0.75, 0.05, 0.07, 3.0, 4.5);
      spheres[3] = Sphere(vec2(0.8, 0.7), 0.5, 1.0, 0.03, 0.04, 4.5, 6.0);
      
      for (int i = 0; i < 4; i++) {
        Sphere s = spheres[i];
        
        // Eased sine drift
        float tX = fract(u_time * s.speedX + s.phaseX);
        float easeX = smoothstep(0.0, 1.0, tX);
        float tY = fract(u_time * s.speedY + s.phaseY);
        float easeY = smoothstep(0.0, 1.0, tY);
        
        vec2 drift = vec2(
          sin(easeX * 6.2832) * 0.08,
          cos(easeY * 6.2832) * 0.06
        );
        
        // Parallax
        vec2 parallax = mouseOffset * mix(0.02, 0.08, s.depth);
        vec2 sphereCenter = s.center + drift + parallax;
        
        float dist = length(p - sphereCenter);
        float blurFactor = mix(2.0, 4.0, 1.0 - s.depth);
        float disc = exp(- (dist * dist) / (s.radius * s.radius * blurFactor));
        
        // Interior brightening
        float interior = disc * 0.04 * s.depth;
        col += col * interior;
        
        // Iridescent rim — a thin ring, must fade back OFF outside the sphere
        float rim = smoothstep(s.radius * 0.85, s.radius * 0.96, dist)
                  * (1.0 - smoothstep(s.radius * 0.96, s.radius * 1.06, dist)) * 0.05;
        float angle = atan(p.y - sphereCenter.y, p.x - sphereCenter.x);
        vec3 rimColor = mix(
          vec3(0.655, 0.545, 0.859),
          vec3(0.910, 0.784, 0.478),
          (sin(angle) + 1.0) * 0.5
        );
        col += rimColor * rim;
      }
      

      // Gold light streak — rare comet sweep, shared with aurora.js
      if (fract(u_time/15.0) < 0.12) {
        float sk = fract(u_time/15.0);
        vec2 dir = normalize(vec2(0.8, -0.45));
        vec2 linePos = mix(-dir, dir, sk/0.12);
        vec2 toPoint = p - linePos;
        float perpDist = abs(dot(toPoint, vec2(-dir.y, dir.x)));
        float headDist = abs(dot(toPoint, dir));
        float streak = exp(-perpDist*90.0) * exp(-headDist*4.0) * smoothstep(0.0,0.02,sk) * smoothstep(0.12,0.06,sk) * 0.35;
        col += vec3(0.910, 0.784, 0.478) * streak;
      }

      // Strong vignette - edges ~45% darker
      float vig = 1.0 - dot((uv - 0.5) * 1.2, (uv - 0.5) * 1.2);
      vig = clamp(pow(vig, 1.5), 0.0, 1.0);
      col *= mix(0.55, 1.0, vig);
      
      // Film grain - 3%
      float grain = (hash(uv + fract(u_time)) - 0.5) * 0.06;
      col += grain;
      
      // Scroll warmth - subtle gold bias at bottom
      float warmth = u_scroll * 0.02 * (1.0 - uv.y);
      col += vec3(0.02, 0.01, 0.0) * warmth;
      
      // Velocity lift
      col += vec3(u_vel * 0.04);
      
      col *= 0.85;
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
    uniform vec3 u_click; // x, y (authored space), age seconds; age >= 99.0 = inactive
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

      // Click pulse — an expanding ring displaces particles as it passes through
      if (u_click.z < 2.0) {
        vec2 cd = pos - u_click.xy;
        float cl = length(cd);
        float ring = exp(-abs(cl - u_click.z * 0.9) * 8.0) * exp(-u_click.z * 1.6);
        if (cl > 0.001) pos += normalize(cd) * ring * 0.12;
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
  const u_mouseA = gl.getUniformLocation(auroraProg, 'u_mouse');

  const u_timeB = gl.getUniformLocation(particleProg, 'u_time');
  const u_resB = gl.getUniformLocation(particleProg, 'u_res');
  const u_p1 = gl.getUniformLocation(particleProg, 'u_p1');
  const u_p2 = gl.getUniformLocation(particleProg, 'u_p2');
  const u_p3 = gl.getUniformLocation(particleProg, 'u_p3');
  const u_mouse = gl.getUniformLocation(particleProg, 'u_mouse');
  const u_click = gl.getUniformLocation(particleProg, 'u_click');
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

  // Click pulse state — clickAt shares the rAF/performance.now() clock (seconds)
  let clickPt = [0, 0];
  let clickAt = -99;
  window.addEventListener('pointerdown', (e) => {
    clickPt = [
      ((e.clientX / window.innerWidth) * 2 - 1) * (window.innerWidth / window.innerHeight),
      -(e.clientY / window.innerHeight) * 2 + 1
    ];
    clickAt = performance.now() * 0.001;
  }, { passive: true });

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
    // backdrop shader wants mouse in 0..1; particle mouse is authored (aspect) space
    const asp = canvas.width / canvas.height;
    gl.uniform2f(u_mouseA, (mouse[0] / asp) * 0.5 + 0.5, mouse[1] * 0.5 + 0.5);
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
    gl.uniform3f(u_click, clickPt[0], clickPt[1], Math.min(time - clickAt, 99));
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