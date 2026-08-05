// Luxury aurora / iridescent background
// $100k aesthetic: deep moody purples, liquid silk, champagne-gold flares, bokeh glass spheres
// Interactive edition: cursor wake trail, click shockwaves, dust motes, gold light streak

(function() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || window.matchMedia('(max-width: 768px)').matches) return;
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return;
  
  const vs = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0, 1); }
  `;
  
  const fs = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_res;
    uniform vec2 u_mouse;
    uniform float u_scroll;
    uniform float u_vel;
    uniform vec3 u_trail[8];
    uniform vec3 u_clicks[3];
    
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
      
      vec2 mouseNorm = u_mouse - 0.5;
      float aspect = u_res.x / u_res.y;
      vec2 mouseOffset = mouseNorm * vec2(aspect, 1.0);
      
      float t = u_time * 0.048 + u_vel * 0.25;
      float scrollShift = u_scroll * 1.4;
      
      vec3 baseTop = vec3(0.043, 0.016, 0.063);
      vec3 baseBottom = vec3(0.102, 0.043, 0.180);
      vec3 base = mix(baseBottom, baseTop, uv.y);
      
      vec2 warpP = p;
      
      // Cursor wake trail effect
      for (int i = 0; i < 8; i++) {
        vec3 trailPoint = u_trail[i];
        if (trailPoint.z < 1.5) {
          vec2 trailPos = trailPoint.xy * 2.0 - 1.0;
          trailPos.x *= aspect;
          vec2 toPoint = warpP - trailPos;
          float dist = max(length(toPoint), 0.001);
          warpP += (toPoint / dist) * 0.10 * exp(-dist*6.0) * exp(-trailPoint.z*2.2);
        }
      }
      
      // Click shockwave effect
      vec3 clickEffect = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        vec3 click = u_clicks[i];
        if (click.z < 2.0) {
          vec2 clickPos = click.xy * 2.0 - 1.0;
          clickPos.x *= aspect;
          vec2 fromClick = warpP - clickPos;
          float dist = max(length(fromClick), 0.001);
          float R = click.z * 0.55;
          float ring = smoothstep(0.10, 0.02, abs(dist - R)) * exp(-click.z*1.8);
          warpP += (fromClick / dist) * ring * 0.12;
          clickEffect += vec3(0.910, 0.784, 0.478) * ring * 0.10;
        }
      }
      
      vec2 q = vec2(
        fbm(warpP * 0.8 + vec2(scrollShift, t * 0.18)),
        fbm(warpP * 0.8 + vec2(5.2, 1.3) + vec2(scrollShift, t * 0.18))
      );
      
      vec2 r = vec2(
        fbm(warpP * 0.8 + 2.2 * q + vec2(1.7, 9.2) + vec2(scrollShift, t * 0.072)),
        fbm(warpP * 0.8 + 2.2 * q + vec2(8.3, 2.8) + vec2(scrollShift, t * 0.06))
      );
      
      float f = fbm(warpP * 0.8 + 2.4 * r + mouseOffset * 0.015);
      
      vec3 darkAmethyst = vec3(0.165, 0.082, 0.282);
      vec3 mutedViolet = vec3(0.298, 0.169, 0.478);
      vec3 glowingLavender = vec3(0.655, 0.545, 0.859);
      
      float band1 = smoothstep(0.1, 0.4, f);
      float band2 = smoothstep(0.3, 0.7, q.x);
      float band3 = smoothstep(0.5, 0.9, r.y);
      
      vec3 col = base;
      col = mix(col, darkAmethyst, band1 * 0.7);
      col = mix(col, mutedViolet, band2 * 0.6);
      col = mix(col, glowingLavender, smoothstep(0.85, 1.0, f) * 0.3);
      
      col = min(col, 0.30);
      
      float flareField = smoothstep(0.72, 0.95, q.x * r.y) * 0.10;
      col += vec3(0.910, 0.784, 0.478) * flareField;
      
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
        
        float tX = fract(u_time * s.speedX + s.phaseX);
        float easeX = smoothstep(0.0, 1.0, tX);
        float tY = fract(u_time * s.speedY + s.phaseY);
        float easeY = smoothstep(0.0, 1.0, tY);
        
        vec2 drift = vec2(
          sin(easeX * 6.2832) * 0.08,
          cos(easeY * 6.2832) * 0.06
        );
        
        vec2 parallax = mouseOffset * mix(0.02, 0.08, s.depth);
        vec2 sphereCenter = s.center + drift + parallax;
        
        float dist = length(warpP - sphereCenter);
        float blurFactor = mix(2.0, 4.0, 1.0 - s.depth);
        float disc = exp(- (dist * dist) / (s.radius * s.radius * blurFactor));
        
        float interior = disc * 0.04 * s.depth;
        col += col * interior;
        
        float rim = smoothstep(s.radius * 0.85, s.radius * 0.96, dist)
                  * (1.0 - smoothstep(s.radius * 0.96, s.radius * 1.06, dist)) * 0.05;
        float angle = atan(warpP.y - sphereCenter.y, warpP.x - sphereCenter.x);
        vec3 rimColor = mix(
          vec3(0.655, 0.545, 0.859),
          vec3(0.910, 0.784, 0.478),
          (sin(angle) + 1.0) * 0.5
        );
        col += rimColor * rim;
      }
      
      // === PORTABLE:RINGS-RAYS === (uses only: p, uv, u_time, mouseOffset, col)
      {
        vec3 lav = vec3(0.655, 0.545, 0.859);
        vec3 gold = vec3(0.910, 0.784, 0.478);
        // halo ring 1 — thin rotating ellipse, iridescent stroke
        vec2 c1 = vec2(-0.55, 0.35) + mouseOffset * 0.05;
        float a1 = u_time * 0.03;
        vec2 l1 = p - c1;
        vec2 q1 = vec2(l1.x*cos(a1) - l1.y*sin(a1), l1.x*sin(a1) + l1.y*cos(a1));
        float rd1 = abs(length(q1 * vec2(1.0, 1.9)) - 0.62);
        float ringsGlow = exp(-rd1*rd1*2600.0) * 0.055;
        col += mix(lav, gold, 0.5 + 0.5*sin(atan(q1.y, q1.x)*2.0 + u_time*0.15)) * ringsGlow;
        // halo ring 2
        vec2 c2 = vec2(0.65, -0.45) + mouseOffset * 0.03;
        float a2 = -u_time * 0.021 + 1.5;
        vec2 l2 = p - c2;
        vec2 q2 = vec2(l2.x*cos(a2) - l2.y*sin(a2), l2.x*sin(a2) + l2.y*cos(a2));
        float rd2 = abs(length(q2 * vec2(1.0, 1.9)) - 0.78);
        float ring2Glow = exp(-rd2*rd2*2600.0) * 0.055;
        col += mix(lav, gold, 0.5 + 0.5*sin(atan(q2.y, q2.x)*2.0 - u_time*0.12)) * ring2Glow;
        // god rays — 3 soft shafts from the top-left, slow sway
        vec2 rayOrigin = vec2(-1.3, 1.15);
        vec2 rayV = p - rayOrigin;
        for (int k = 0; k < 3; k++) {
          float ak = -0.9 + float(k)*0.18 + 0.04*sin(u_time*0.11 + float(k)*2.1);
          float along = dot(rayV, vec2(cos(ak), sin(ak)));
          float perp = abs(dot(rayV, vec2(-sin(ak), cos(ak))));
          float godRay = exp(-perp*perp*55.0) * smoothstep(0.0, 0.9, along) * exp(-along*0.9);
          col += vec3(0.42, 0.36, 0.62) * godRay * 0.05;
        }
      }
      // === END-PORTABLE ===

      // Gold light streak (greppable variable "streak")
      float streak = 0.0;
      if (fract(u_time/15.0) < 0.12) {
        float s = fract(u_time/15.0);
        vec2 dir = normalize(vec2(0.8, -0.45));
        vec2 lineStart = -dir;
        vec2 lineEnd = dir;
        vec2 linePos = mix(lineStart, lineEnd, s/0.12);
        vec2 toPoint = warpP - linePos;
        float perpDist = abs(dot(toPoint, vec2(-dir.y, dir.x)));
        float headDist = dot(toPoint, dir);
        streak = exp(-perpDist*90.0) * exp(-abs(headDist)*4.0) * smoothstep(0.0,0.02,s) * smoothstep(0.12,0.06,s) * 0.35;
        col += vec3(0.910, 0.784, 0.478) * streak;
      }
      
      float vig = 1.0 - dot((uv - 0.5) * 1.2, (uv - 0.5) * 1.2);
      vig = clamp(pow(vig, 1.5), 0.0, 1.0);
      col *= mix(0.55, 1.0, vig);
      
      float grain = (hash(uv + fract(u_time)) - 0.5) * 0.06;
      col += grain;
      
      float warmth = u_scroll * 0.02 * (1.0 - uv.y);
      col += vec3(0.02, 0.01, 0.0) * warmth;
      
      col += vec3(u_vel * 0.04);
      col += clickEffect;
      
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  
  const dustVs = `
    attribute vec4 a_seed;
    attribute float a_index;
    uniform vec2 u_res;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_dpr;
    varying vec4 v_color;
    void main() {
      vec2 seed = a_seed.xy;
      float depth = a_seed.z;
      float colorSeed = a_seed.w;
      
      vec2 drift = vec2(
        sin(u_time * 0.3 + seed.x * 10.0) * 0.1,
        cos(u_time * 0.2 + seed.y * 10.0) * 0.08
      );
      vec2 pos = fract(seed + drift);
      
      vec2 parallax = (u_mouse - 0.5) * (0.03 + 0.05 * depth);
      pos += parallax;
      
      vec2 mouseNorm = u_mouse;
      vec2 toMouse = pos - mouseNorm;
      float dist = max(length(toMouse), 0.001);
      pos += (toMouse / dist) * 0.08 * exp(-dist*5.0);
      
      vec2 clipPos = pos * 2.0 - 1.0;
      gl_Position = vec4(clipPos, 0, 1);
      gl_PointSize = (1.0 + 2.5 * colorSeed) * u_dpr;
      
      float twinkle = 0.5 + 0.5 * sin(u_time * 1.5 + a_index * 7.0);
      float alpha = 0.10 + 0.18 * twinkle;
      vec3 lavender = vec3(0.655, 0.545, 0.859);
      vec3 gold = vec3(0.910, 0.784, 0.478);
      vec3 color = colorSeed > 0.8 ? gold : lavender;
      v_color = vec4(color, alpha);
    }
  `;
  
  const dustFs = `
    precision highp float;
    varying vec4 v_color;
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float r = length(coord);
      if (r > 0.5) discard;
      float alpha = v_color.a * (1.0 - r*2.0);
      gl_FragColor = vec4(v_color.rgb * alpha, alpha);
    }
  `;
  
  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  
  const vsShader = createShader(gl.VERTEX_SHADER, vs);
  const fsShader = createShader(gl.FRAGMENT_SHADER, fs);
  if (!vsShader || !fsShader) return;
  
  const program = gl.createProgram();
  gl.attachShader(program, vsShader);
  gl.attachShader(program, fsShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Aurora program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return;
  }
  
  gl.useProgram(program);
  
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     3, -1,
    -1,  3
  ]), gl.STATIC_DRAW);
  
  const posLoc = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  
  const u_time = gl.getUniformLocation(program, 'u_time');
  const u_res = gl.getUniformLocation(program, 'u_res');
  const u_mouse = gl.getUniformLocation(program, 'u_mouse');
  const u_scroll = gl.getUniformLocation(program, 'u_scroll');
  const u_vel = gl.getUniformLocation(program, 'u_vel');
  const u_trail = [];
  for (let i = 0; i < 8; i++) {
    u_trail.push(gl.getUniformLocation(program, `u_trail[${i}]`));
  }
  const u_clicks = [];
  for (let i = 0; i < 3; i++) {
    u_clicks.push(gl.getUniformLocation(program, `u_clicks[${i}]`));
  }
  
  // Dust mote program
  const dustVsShader = createShader(gl.VERTEX_SHADER, dustVs);
  const dustFsShader = createShader(gl.FRAGMENT_SHADER, dustFs);
  if (!dustVsShader || !dustFsShader) return;
  
  const dustProgram = gl.createProgram();
  gl.attachShader(dustProgram, dustVsShader);
  gl.attachShader(dustProgram, dustFsShader);
  gl.linkProgram(dustProgram);
  
  if (!gl.getProgramParameter(dustProgram, gl.LINK_STATUS)) {
    console.warn('Dust program link failed:', gl.getProgramInfoLog(dustProgram));
    gl.deleteProgram(dustProgram);
    return;
  }
  
  const dustRes = gl.getUniformLocation(dustProgram, 'u_res');
  const dustMouse = gl.getUniformLocation(dustProgram, 'u_mouse');
  const dustTime = gl.getUniformLocation(dustProgram, 'u_time');
  const dustDpr = gl.getUniformLocation(dustProgram, 'u_dpr');
  const dustSeedLoc = gl.getAttribLocation(dustProgram, 'a_seed');
  const dustIndexLoc = gl.getAttribLocation(dustProgram, 'a_index');
  
  // Generate dust motes
  const MOTE_COUNT = 1100;
  const moteSeeds = new Float32Array(MOTE_COUNT * 4);
  for (let i = 0; i < MOTE_COUNT; i++) {
    moteSeeds[i*4] = Math.random();
    moteSeeds[i*4+1] = Math.random();
    moteSeeds[i*4+2] = Math.random();
    moteSeeds[i*4+3] = Math.random();
  }
  
  const moteBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moteBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, moteSeeds, gl.STATIC_DRAW);
  
  const moteIndex = new Float32Array(MOTE_COUNT);
  for (let i = 0; i < MOTE_COUNT; i++) {
    moteIndex[i] = i;
  }
  const moteIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moteIndexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, moteIndex, gl.STATIC_DRAW);
  
  // Constellation web — drifting nodes joined by faint lavender threads
  const webVs = `
    attribute vec3 a_line;
    varying float v_a;
    void main() { gl_Position = vec4(a_line.xy * 2.0 - 1.0, 0.0, 1.0); v_a = a_line.z; }
  `;
  const webFs = `
    precision mediump float;
    varying float v_a;
    void main() { gl_FragColor = vec4(vec3(0.655, 0.545, 0.859) * v_a * 0.16, v_a * 0.16); }
  `;
  const webVsShader = createShader(gl.VERTEX_SHADER, webVs);
  const webFsShader = createShader(gl.FRAGMENT_SHADER, webFs);
  if (!webVsShader || !webFsShader) return;
  const webProgram = gl.createProgram();
  gl.attachShader(webProgram, webVsShader);
  gl.attachShader(webProgram, webFsShader);
  gl.linkProgram(webProgram);
  if (!gl.getProgramParameter(webProgram, gl.LINK_STATUS)) {
    console.warn('Web program link failed:', gl.getProgramInfoLog(webProgram));
    gl.deleteProgram(webProgram);
    return;
  }
  const webLineLoc = gl.getAttribLocation(webProgram, 'a_line');

  const WEB_NODES = 90;
  const webNodes = [];
  for (let i = 0; i < WEB_NODES; i++) {
    const a = Math.random() * Math.PI * 2;
    webNodes.push({ x: Math.random(), y: Math.random(), vx: Math.cos(a) * 0.008, vy: Math.sin(a) * 0.008 });
  }
  const WEB_MAX_VERTS = 2400;
  const webVerts = new Float32Array(WEB_MAX_VERTS * 3);
  const webBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, webBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, webVerts.byteLength, gl.DYNAMIC_DRAW);

  function stepWeb(dt) {
    for (let i = 0; i < WEB_NODES; i++) {
      const n = webNodes[i];
      const dx = n.x - mouseX, dy = n.y - mouseY;
      const d = Math.max(Math.hypot(dx, dy), 0.001);
      const f = 0.35 * Math.exp(-d * 6.0) * dt;
      n.vx += (dx / d) * f; n.vy += (dy / d) * f;
      const sp = Math.hypot(n.vx, n.vy);
      if (sp > 0.05) { n.vx *= 0.05 / sp; n.vy *= 0.05 / sp; }
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx); }
      if (n.x > 1) { n.x = 1; n.vx = -Math.abs(n.vx); }
      if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy); }
      if (n.y > 1) { n.y = 1; n.vy = -Math.abs(n.vy); }
    }
  }

  function drawWeb() {
    let c = 0;
    // ponytail: O(n^2) pair scan — 90 nodes = 4005 pairs/frame, fine; spatial hash if nodes ever grow
    for (let i = 0; i < WEB_NODES; i++) for (let j = i + 1; j < WEB_NODES; j++) {
      const a = webNodes[i], b = webNodes[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.16 && c + 6 <= WEB_MAX_VERTS * 3) {
        const al = 1 - d / 0.16;
        webVerts[c++] = a.x; webVerts[c++] = a.y; webVerts[c++] = al;
        webVerts[c++] = b.x; webVerts[c++] = b.y; webVerts[c++] = al;
      }
    }
    if (!c) return;
    gl.useProgram(webProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, webBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, webVerts.subarray(0, c));
    gl.enableVertexAttribArray(webLineLoc);
    gl.vertexAttribPointer(webLineLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.LINES, 0, c / 3);
    gl.disable(gl.BLEND);
    gl.disableVertexAttribArray(webLineLoc);
  }

  let mouseX = 0.5, mouseY = 0.35;
  let targetMouseX = 0.5, targetMouseY = 0.35;
  let scrollY = window.scrollY;
  let prevScrollY = scrollY;
  let scrollVel = 0;
  let startTime = null;
  let lastFrameTime = null;
  
  // Trail state
  const trail = [];
  for (let i = 0; i < 8; i++) {
    trail.push({ x: 0.5, y: 0.5, age: 99 });
  }
  let lastTrailX = 0.5, lastTrailY = 0.5;
  
  // Click state
  const clicks = [];
  for (let i = 0; i < 3; i++) {
    clicks.push({ x: 0.5, y: 0.5, age: 99 });
  }
  let clickIndex = 0;
  
  function resize() {
    // 0.85 render scale: soft content upscales fine, keeps the heavier shader cheap
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.85;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (prefersReducedMotion && startTime !== null) drawStatic();
  }
  
  function drawStatic() {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform1f(u_time, 0);
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform2f(u_mouse, mouseX, mouseY);
    gl.uniform1f(u_scroll, getScrollProgress());
    gl.uniform1f(u_vel, 0);
    
    for (let i = 0; i < 8; i++) {
      gl.uniform3f(u_trail[i], 0.5, 0.5, 99);
    }
    for (let i = 0; i < 3; i++) {
      gl.uniform3f(u_clicks[i], 0.5, 0.5, 99);
    }
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    // Draw static dust motes
    gl.useProgram(dustProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, moteBuffer);
    gl.vertexAttribPointer(dustSeedLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(dustSeedLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, moteIndexBuffer);
    gl.vertexAttribPointer(dustIndexLoc, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(dustIndexLoc);
    
    gl.uniform2f(dustRes, canvas.width, canvas.height);
    gl.uniform2f(dustMouse, mouseX, mouseY);
    gl.uniform1f(dustTime, 0);
    gl.uniform1f(dustDpr, Math.min(window.devicePixelRatio || 1, 1.5));
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, MOTE_COUNT);
    gl.disable(gl.BLEND);
    
    gl.disableVertexAttribArray(dustSeedLoc);
    gl.disableVertexAttribArray(dustIndexLoc);

    drawWeb();
  }

  function getScrollProgress() {
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    return docHeight > winHeight ? window.scrollY / (docHeight - winHeight) : 0;
  }
  
  function onPointerMove(e) {
    targetMouseX = e.clientX / window.innerWidth;
    targetMouseY = 1.0 - (e.clientY / window.innerHeight);
  }
  
  function onScroll() {
    scrollY = window.scrollY;
  }
  
  function onVisibility() {
    if (!document.hidden) lastFrameTime = performance.now();
  }
  
  function onPointerDown(e) {
    if (prefersReducedMotion) return;
    const x = e.clientX / window.innerWidth;
    const y = 1.0 - (e.clientY / window.innerHeight);
    clicks[clickIndex] = { x, y, age: 0 };
    clickIndex = (clickIndex + 1) % 3;
  }
  
  function frame(timestamp) {
    if (document.hidden) {
      requestAnimationFrame(frame);
      return;
    }
    
    if (!startTime) startTime = timestamp;
    const time = (timestamp - startTime) * 0.001;
    const dt = lastFrameTime ? (timestamp - lastFrameTime) * 0.001 : 0;
    lastFrameTime = timestamp;
    
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;
    
    const currentScroll = window.scrollY;
    const deltaScroll = (currentScroll - prevScrollY) * 0.001;
    scrollVel += (Math.min(Math.max(deltaScroll, -1), 1) - scrollVel) * 0.08;
    prevScrollY = currentScroll;
    
    // Update trail
    const dx = mouseX - lastTrailX;
    const dy = mouseY - lastTrailY;
    const viewportSize = Math.max(canvas.width, canvas.height);
    if (Math.sqrt(dx*dx + dy*dy) * viewportSize > viewportSize * 0.005) {
      for (let i = 7; i > 0; i--) {
        // copy by value — sharing references would age one object several times
        trail[i] = { x: trail[i-1].x, y: trail[i-1].y, age: trail[i-1].age + dt };
      }
      trail[0] = { x: mouseX, y: mouseY, age: 0 };
      lastTrailX = mouseX;
      lastTrailY = mouseY;
    } else {
      for (let i = 0; i < 8; i++) {
        trail[i].age += dt;
      }
    }
    
    // Update clicks
    for (let i = 0; i < 3; i++) {
      if (clicks[i].age < 100) {
        clicks[i].age += dt;
      }
    }
    
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform2f(u_mouse, mouseX, mouseY);
    gl.uniform1f(u_scroll, getScrollProgress());
    gl.uniform1f(u_vel, scrollVel);
    
    for (let i = 0; i < 8; i++) {
      gl.uniform3f(u_trail[i], trail[i].x, trail[i].y, trail[i].age);
    }
    for (let i = 0; i < 3; i++) {
      gl.uniform3f(u_clicks[i], clicks[i].x, clicks[i].y, clicks[i].age);
    }
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    // Draw dust motes
    gl.useProgram(dustProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, moteBuffer);
    gl.vertexAttribPointer(dustSeedLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(dustSeedLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, moteIndexBuffer);
    gl.vertexAttribPointer(dustIndexLoc, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(dustIndexLoc);
    
    gl.uniform2f(dustRes, canvas.width, canvas.height);
    gl.uniform2f(dustMouse, mouseX, mouseY);
    gl.uniform1f(dustTime, time);
    gl.uniform1f(dustDpr, Math.min(window.devicePixelRatio || 1, 1.5));
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, MOTE_COUNT);
    gl.disable(gl.BLEND);
    
    gl.disableVertexAttribArray(dustSeedLoc);
    gl.disableVertexAttribArray(dustIndexLoc);

    stepWeb(dt);
    drawWeb();

    requestAnimationFrame(frame);
  }
  
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  
  if (!prefersReducedMotion) {
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
  }
  
  if (prefersReducedMotion) {
    startTime = 0;
    mouseX = targetMouseX;
    mouseY = targetMouseY;
    drawStatic();
  } else {
    requestAnimationFrame(frame);
  }
})();