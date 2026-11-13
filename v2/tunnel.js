import * as THREE from 'three';
import createTunnelChart from './tunnelchart.js';
import createTradeStream from './tradestream.js';

export default function createTunnel(ctx) {
  const { THREE: T, renderer, width, height, isMobile, reducedMotion } = ctx;
  const L = 140;
  const ROWS = 14;
  const COLS = isMobile ? 80 : 150;
  const COUNT = 2 * ROWS * COLS;

  const scene = new T.Scene();
  scene.background = new T.Color(0x050506);
  scene.fog = new T.FogExp2(0x050506, 0.05);

  const camera = new T.PerspectiveCamera(68, width / height, 0.1, 200);

  // --- 1) Depth-ladder bars ---
  const geo = new T.BoxGeometry(1, 1, 1);
  const mat = new T.MeshLambertMaterial({ color: 0xffffff, fog: true });
  // light the slabs so tops, faces and ends read as solid blocks (instance colours still drive hue)
  scene.add(new T.HemisphereLight(0xffffff, 0x202428, 2.3));
  const key = new T.DirectionalLight(0xffffff, 1.2); key.position.set(0.3, 1, 0.6); scene.add(key);
  const bars = new T.InstancedMesh(geo, mat, COUNT);
  bars.instanceMatrix.setUsage(T.DynamicDrawUsage);
  bars.instanceColor = new T.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
  bars.instanceColor.setUsage(T.DynamicDrawUsage);
  scene.add(bars);

  const base = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);
  const rate = new Float32Array(COUNT);
  const flashEnd = new Float32Array(COUNT);
  const dummy = new T.Object3D();
  const color = new T.Color();

  let idx = 0;
  const bidColor = new T.Color(0x22E39A);
  const askColor = new T.Color(0xFF4D5E);
  const SLATE = new T.Color(0x2b3036);
  const halfRows = (ROWS - 1) / 2;

  for (let side = 0; side < 2; side++) {
    const wallColor = side === 0 ? bidColor : askColor;
    const wallX = side === 0 ? -3 : 3;
    const xSign = side === 0 ? 1 : -1;

    for (let r = 0; r < ROWS; r++) {
      const mid = Math.abs(r - halfRows) / halfRows;
      const y = -1.75 + r * (3.5 / (ROWS - 1));

      for (let c = 0; c < COLS; c++) {
        const z = -c * 0.92 - 2;
        const len = 0.12 + 1.5 * Math.pow(Math.random(), 1.8) * (1.0 - 0.65 * mid);
        const xCenter = wallX + xSign * len / 2;

        base[idx] = len;
        phase[idx] = Math.random() * Math.PI * 2;
        rate[idx] = 0.6 + Math.random() * 1.6;

        const k = 0.22 + 0.78 * (len / 1.62);
        color.copy(SLATE).lerp(wallColor, k * k * 0.6);   // graphite slabs; colour only on the deepest levels
        bars.setColorAt(idx, color);

        dummy.position.set(xCenter, y, z);
        dummy.scale.set(len, 0.15, 0.74);
        dummy.updateMatrix();
        bars.setMatrixAt(idx, dummy.matrix);

        idx++;
      }
    }
  }
  bars.instanceMatrix.needsUpdate = true;
  bars.instanceColor.needsUpdate = true;

  // --- 2) Floor ---
  const floorGeo = new T.PlaneGeometry(6, L + 20);
  const floorMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uFogColor: { value: new T.Color(0x050506) },
      uFogDensity: { value: 0.05 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vViewPos;   // interpolate the position, not its length: the floor is two huge triangles
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vec4 mvPos = viewMatrix * worldPos;
        vViewPos = mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      varying vec3 vViewPos;
      uniform float uTime;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      void main() {
        float vViewDist = length(vViewPos);   // true per-pixel distance
        float x = vWorldPos.x;
        float z = vWorldPos.z;
        vec3 baseCol = vec3(0.045, 0.05, 0.06);
        vec3 lineCol = vec3(0.15, 0.165, 0.185);

        float gz = abs(fract(z * 1.087 + 0.5) - 0.5);
        float gx1 = abs(fract((x + 1.0) * 0.5 + 0.5) - 0.5);
        float gx2 = abs(fract(x * 0.5 + 0.5) - 0.5);
        float gx3 = abs(fract((x - 1.0) * 0.5 + 0.5) - 0.5);
        float grid = step(gz, 0.015) + step(gx1, 0.015) + step(gx2, 0.015) + step(gx3, 0.015);
        vec3 col = mix(baseCol, lineCol, clamp(grid, 0.0, 1.0));

        float laneW = 0.05;
        float t = uTime * 2.2;
        for (int i = 0; i < 3; i++) {
          float lx = float(i - 1) * 0.6;
          float dx = abs(x - lx);
          if (dx < laneW) {
            float f = fract(z * 1.6 + t + float(i) * 0.333);
            float dash = step(0.72, f);
            vec3 laneCol = vec3(0.66, 0.94, 0.82);
            if (i == 1) {
              float h = fract(floor(z * 1.6 + t) * 0.12345);
              laneCol = h < 0.5 ? vec3(0.133, 0.886, 0.604) : vec3(1.0, 0.302, 0.369);
            }
            col += laneCol * dash * 0.9 * (1.0 - dx / laneW);
          }
        }

        // the walls' light spills onto a glossy floor: green from the bid side, red from the ask side, a faint mint spine
        col += vec3(0.13, 0.89, 0.60) * exp(-(x + 3.0) * (x + 3.0) * 0.32) * 0.22;
        col += vec3(1.0, 0.30, 0.37) * exp(-(x - 3.0) * (x - 3.0) * 0.32) * 0.2;
        col += vec3(0.66, 0.94, 0.82) * exp(-x * x * 2.5) * 0.06;
        float fade = exp(-vViewDist * 0.05);
        col *= mix(0.35, 1.0, fade);   // dim with distance once (fog below does the rest)
        float fogFactor = 1.0 - exp(-vViewDist * uFogDensity);
        col = mix(col, uFogColor, fogFactor);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const floor = new T.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2, -L / 2);
  scene.add(floor);

  // --- 3) Ceiling LEDs ---
  const ledGeo = new T.BoxGeometry(0.55, 0.03, 0.22);
  const ledMat = new T.MeshBasicMaterial({ color: 0xdfe6ea, fog: true });
  const ledX = [-1.3, 0, 1.3];
  const ledCount = ledX.length * Math.floor((L + 2) / 1.8);
  const leds = new T.InstancedMesh(ledGeo, ledMat, ledCount);
  let li = 0;
  for (let xi = 0; xi < 3; xi++) {
    for (let z = -2; z > -L; z -= 1.8) {
      dummy.position.set(ledX[xi], 1.96, z);
      dummy.updateMatrix();
      leds.setMatrixAt(li, dummy.matrix);
      li++;
    }
  }
  leds.instanceMatrix.needsUpdate = true;
  scene.add(leds);

  // --- 4) Far glow ---
  const glowGeo = new T.PlaneGeometry(6, 4);
  const glowMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c * vec2(1.0, 1.5));
        float a = smoothstep(0.7, 0.0, d) * (0.6 + 0.4 * sin(uTime * 1.5));
        vec3 col = mix(vec3(1.0, 1.0, 0.9), vec3(0.66, 0.94, 0.82), 0.5 + 0.5 * sin(uTime * 0.7));
        gl_FragColor = vec4(col, a);
      }
    `
  });
  const glow = new T.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0, -L);
  glow.rotation.y = Math.PI;
  scene.add(glow);

  // --- 5) Dust ---
  const dustCount = isMobile ? 500 : 1100;
  const dustGeo = new T.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 5.6;
    dustPos[i * 3 + 1] = -1.9 + Math.random() * 3.8;
    dustPos[i * 3 + 2] = -Math.random() * L;
  }
  dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3));
  const dustMat = new T.PointsMaterial({
    size: 0.03,
    color: 0x9aa3ab,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    depthWrite: false
  });
  const dust = new T.Points(dustGeo, dustMat);
  scene.add(dust);

  // --- 6) Price chart down the middle: candles, volume on the floor, a live price line ---
  const chart = createTunnelChart(scene, { isMobile, reducedMotion });
  const trades = createTradeStream(scene, { isMobile, reducedMotion });   // trade prints streaming through the upper middle

  // --- Update / Resize ---
  const look = new T.Vector3();
  let camX = 0, camY = 0.15;
  let updateIdx = 0;
  const UPDATE_CHUNK = Math.ceil(COUNT / 8);
  let lastFlashTime = 0;
  let pe = 0;                          // eased scroll progress
  const TRAVEL = COLS * 0.92 - 28;     // stop ~30 units before the last bars (phones have fewer columns)
  const WHITE = new T.Color(0xffffff);

  function update(s) {
    pe += (s.progress - pe) * (1 - Math.pow(1 - 0.08, s.dt * 60));
    const camZ = 4 - pe * TRAVEL;
    chart.update(s.time, camZ);
    trades.update(s.time, s.dt, camZ);

    const kMouse = 1 - Math.pow(1 - 0.06, s.dt * 60);
    camX += (s.mouse.x * 0.35 - camX) * kMouse;
    camY += (0.15 + s.mouse.y * 0.2 - camY) * kMouse;

    camera.position.set(camX, camY, camZ);

    look.set(camX * 0.4, 0.05, camZ - 10);
    camera.lookAt(look);

    if (!reducedMotion) {
      camera.rotation.z += Math.sin(s.time * 0.3) * 0.012;
    }

    camera.fov = 68 + Math.abs(s.velocity) * 4;
    camera.updateProjectionMatrix();

    floorMat.uniforms.uTime.value = s.time;
    glowMat.uniforms.uTime.value = s.time;

    if (!reducedMotion) {
      const end = Math.min(updateIdx + UPDATE_CHUNK, COUNT);
      for (let i = updateIdx; i < end; i++) {
        const len = base[i] * (0.55 + 0.45 * Math.sin(s.time * rate[i] + phase[i]));
        const k = 0.22 + 0.78 * (len / 1.62);
        const side = i < ROWS * COLS ? 0 : 1;
        const wallColor = side === 0 ? bidColor : askColor;
        const wallX = side === 0 ? -3 : 3;
        const xSign = side === 0 ? 1 : -1;
        const localIdx = i % (ROWS * COLS);
        const r = Math.floor(localIdx / COLS);
        const c = localIdx % COLS;
        const y = -1.75 + r * (3.5 / (ROWS - 1));
        const z = -c * 0.92 - 2;
        const xCenter = wallX + xSign * len / 2;

        dummy.position.set(xCenter, y, z);
        dummy.scale.set(len, 0.15, 0.74);
        dummy.updateMatrix();
        bars.setMatrixAt(i, dummy.matrix);

        color.copy(SLATE).lerp(wallColor, k * k * 0.6);   // graphite slabs; colour only on the deepest levels
        bars.setColorAt(i, color);
      }
      updateIdx = end % COUNT;

      if (s.time - lastFlashTime > 0.25) {
        lastFlashTime = s.time;
        for (let j = 0; j < 2; j++) {
          const fi = Math.floor(Math.random() * COUNT);
          flashEnd[fi] = s.time + 0.12;
          bars.setColorAt(fi, WHITE);
        }
      }

      for (let i = 0; i < COUNT; i++) {
        if (flashEnd[i] > 0 && s.time > flashEnd[i]) {
          flashEnd[i] = 0;
          const side = i < ROWS * COLS ? 0 : 1;
          const wallColor = side === 0 ? bidColor : askColor;
          const localIdx = i % (ROWS * COLS);
          const r = Math.floor(localIdx / COLS);
          const c = localIdx % COLS;
          const mid = Math.abs(r - halfRows) / halfRows;
          const len = base[i] * (0.55 + 0.45 * Math.sin(s.time * rate[i] + phase[i]));
          const k = 0.22 + 0.78 * (len / 1.62);
          color.copy(SLATE).lerp(wallColor, k * k * 0.6);   // graphite slabs; colour only on the deepest levels
          bars.setColorAt(i, color);
        }
      }

      bars.instanceMatrix.needsUpdate = true;
      bars.instanceColor.needsUpdate = true;
    }
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  resize(width, height);

  return { scene, camera, update, resize };
}