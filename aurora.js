// Liquid aurora / iridescent background
// Replaces old Three.js space scene — site-wide animated background

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
      // 4 octaves, ~0.6rad rotation per octave, normalized to 0..1
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
      
      // Mouse influence
      vec2 mousePos = u_mouse * 2.0 - 1.0;
      mousePos.x *= u_res.x / u_res.y;
      float mouseDist = length(p - mousePos);
      vec2 mouseOffset = vec2(0.0);
      if (mouseDist > 0.0) {
        mouseOffset = normalize(p - mousePos) * 0.35 * exp(-mouseDist * 3.5);
      }
      
      // Time and scroll influence
      float t = u_time * 0.08 + u_vel * 0.25;
      float scrollShift = u_scroll * 1.4; // ~80 degrees
      p += mouseOffset;
      
      // Domain warping
      vec2 q = vec2(
        fbm(p + vec2(scrollShift, t * 0.3)),
        fbm(p + vec2(5.2, 1.3) + vec2(scrollShift, t * 0.3))
      );
      
      vec2 r = vec2(
        fbm(p + 2.2 * q + vec2(1.7, 9.2) + vec2(scrollShift, t * 0.12)),
        fbm(p + 2.2 * q + vec2(8.3, 2.8) + vec2(scrollShift, t * 0.1))
      );
      
      float f = fbm(p + 2.4 * r);
      
      // Color palette
      vec3 deepBase = vec3(0.024, 0.024, 0.035); // #060609
      vec3 indigo = vec3(0.388, 0.400, 0.945); // #6366f1
      vec3 violet = vec3(0.506, 0.549, 0.973); // #818cf8
      vec3 fuchsia = vec3(0.753, 0.518, 0.988); // #c084fc
      vec3 magenta = vec3(0.910, 0.475, 0.976); // #e879f9
      vec3 cyan = vec3(0.220, 0.741, 0.969); // #38bdf8
      
      // Color mixing
      float colorMix1 = smoothstep(0.1, 0.4, f);
      float colorMix2 = smoothstep(0.3, 0.7, q.x);
      float colorMix3 = smoothstep(0.5, 0.9, r.y);
      
      vec3 col = mix(deepBase, indigo, colorMix1);
      col = mix(col, violet, colorMix2 * 0.8);
      col = mix(col, fuchsia, colorMix3 * 0.6);
      col = mix(col, magenta, smoothstep(0.7, 1.0, f) * 0.5);
      
      // Cyan accent in dark areas
      float darkAccent = smoothstep(0.0, 0.3, 1.0 - f) * smoothstep(0.0, 0.2, f);
      col += cyan * darkAccent * 0.15;
      
      // Brightness control (keep low)
      float brightness = 0.3 * colorMix1 + 0.25 * colorMix2 + 0.2 * colorMix3;
      brightness += u_vel * 0.08;
      brightness = clamp(brightness, 0.0, 0.35);
      col *= brightness + 0.15;
      
      // Mouse glow
      if (mouseDist < 0.25) {
        float glow = smoothstep(0.25, 0.0, mouseDist) * 0.08;
        col += violet * glow;
      }
      
      // Vignette
      vec2 vigUv = uv;
      float vig = 1.0 - dot((vigUv - 0.5) * 1.2, (vigUv - 0.5) * 1.2);
      vig = clamp(pow(vig, 1.5), 0.0, 1.0);
      col *= vig * 0.65 + 0.35;
      
      // Film grain
      float grain = hash(uv + fract(u_time)) * 0.024 - 0.012;
      col += grain;
      
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
    // resizing clears the buffer; the static (reduced-motion) frame must be redrawn
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
    targetMouseY = 1.0 - (e.clientY / window.innerHeight); // Flip Y for GL
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
    // Draw one frame and stop
    startTime = 0;
    mouseX = targetMouseX;
    mouseY = targetMouseY;
    drawStatic();
  } else {
    requestAnimationFrame(frame);
  }
})();