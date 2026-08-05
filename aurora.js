// Luxury aurora / iridescent background
// $100k aesthetic: deep moody purples, liquid silk, champagne-gold flares, bokeh glass spheres

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
      vec3 base = mix(baseTop, baseBottom, uv.y);
      
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
      
      vec3 col = base * 0.6;
      col = mix(col, darkAmethyst, band1 * 0.7);
      col = mix(col, mutedViolet, band2 * 0.6);
      col = mix(col, glowingLavender, smoothstep(0.85, 1.0, f) * 0.3);
      
      // Luminance cap
      col = clamp(col * 0.45, 0.0, 0.30);
      
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
      
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  
  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Aurora shader compile failed:', gl.getShaderInfoLog(shader));
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
  
  // Full-screen triangle
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
  
  // Uniforms
  const u_time = gl.getUniformLocation(program, 'u_time');
  const u_res = gl.getUniformLocation(program, 'u_res');
  const u_mouse = gl.getUniformLocation(program, 'u_mouse');
  const u_scroll = gl.getUniformLocation(program, 'u_scroll');
  const u_vel = gl.getUniformLocation(program, 'u_vel');
  
  // State
  let mouseX = 0.5, mouseY = 0.35;
  let targetMouseX = 0.5, targetMouseY = 0.35;
  let scrollY = window.scrollY;
  let prevScrollY = scrollY;
  let scrollVel = 0;
  let startTime = null;
  let lastFrameTime = null;
  
  // Canvas size
  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75;
    canvas.width = window.innerWidth * scale;
    canvas.height = window.innerHeight * scale;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (prefersReducedMotion && startTime !== null) drawStatic();
  }

  function drawStatic() {
    gl.uniform1f(u_time, 0);
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform2f(u_mouse, mouseX, mouseY);
    gl.uniform1f(u_scroll, getScrollProgress());
    gl.uniform1f(u_vel, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  
  // Scroll progress
  function getScrollProgress() {
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    return docHeight > winHeight ? window.scrollY / (docHeight - winHeight) : 0;
  }
  
  // Event listeners
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
  
  // Animation loop
  function frame(timestamp) {
    if (document.hidden) {
      requestAnimationFrame(frame);
      return;
    }
    
    if (!startTime) startTime = timestamp;
    const time = (timestamp - startTime) * 0.001;
    
    // Smooth mouse
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;
    
    // Smooth scroll velocity
    const currentScroll = window.scrollY;
    const deltaScroll = (currentScroll - prevScrollY) * 0.001;
    scrollVel += (Math.min(Math.max(deltaScroll, -1), 1) - scrollVel) * 0.08;
    prevScrollY = currentScroll;
    
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform2f(u_mouse, mouseX, mouseY);
    gl.uniform1f(u_scroll, getScrollProgress());
    gl.uniform1f(u_vel, scrollVel);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  
  // Initialization
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  
  if (prefersReducedMotion) {
    startTime = 0;
    mouseX = targetMouseX;
    mouseY = targetMouseY;
    drawStatic();
  } else {
    requestAnimationFrame(frame);
  }
})();