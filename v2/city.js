import * as THREE from 'three';
import createCityMap, { nearNode, capHeight, NODES } from './citymap.js';
import createCityDeco from './citydeco.js';

export default function createCity(ctx) {
  const { THREE: T, renderer, width, height, isMobile, reducedMotion } = ctx;

  const scene = new T.Scene();
  scene.background = new T.Color(0x060a12);

  const camera = new T.PerspectiveCamera(55, width / height, 0.5, 400);

  // --- Building shader (shared) ---
  const buildingVertex = `
    attribute float aSeed;
    varying vec2 vFacade; varying float vRoof; varying float vSeed; varying float vDepth; varying float vHeight; varying float vShade; varying vec2 vWorldXZ;
    void main(){
      vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vRoof = step(0.5, normal.y);
      vFacade = abs(normal.x) > 0.5 ? vec2(position.z * sc.z, position.y * sc.y) : vec2(position.x * sc.x, position.y * sc.y);
      vShade = abs(normal.x) > 0.5 ? 0.78 : 1.0;
      vSeed = aSeed; vHeight = wp.y;
      vWorldXZ = wp.xz;
      vec4 mv = viewMatrix * wp; vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const buildingFragment = `
    uniform float uTime;
    varying vec2 vFacade; varying float vRoof; varying float vSeed; varying float vDepth; varying float vHeight; varying float vShade; varying vec2 vWorldXZ;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec3 base = mix(vec3(0.09, 0.14, 0.23), vec3(0.22, 0.32, 0.47), clamp(vHeight / 60.0, 0.0, 1.0)) * vShade;
      vec2 cell = vec2(0.9, 1.1);
      vec2 id = floor(vFacade / cell); vec2 f = fract(vFacade / cell);
      float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.8);
      float lit = step(0.64, hash(id + vSeed * 17.0));
      vec3 wc = mix(vec3(0.98, 0.86, 0.6), vec3(0.75, 0.88, 1.0), hash(id + 3.1)) * (0.55 + 0.6 * hash(id + 7.7));
      vec3 col = base + wc * win * lit * (1.0 - vRoof);
      // roof: dark with small rooftop units
      vec2 rf = floor(vWorldXZ * 1.3);
      vec3 roof = vec3(0.06, 0.09, 0.15) + vec3(0.05) * step(0.8, hash(rf + vSeed));
      col = mix(col, roof, vRoof);
      float fogF = smoothstep(45.0, 170.0, vDepth);
      col = mix(col, vec3(0.04, 0.07, 0.13), fogF);
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  const buildingMaterial = new T.ShaderMaterial({
    vertexShader: buildingVertex,
    fragmentShader: buildingFragment,
    uniforms: { uTime: { value: 0 } }
  });

  // --- Ground shader ---
  const groundVertex = `
    varying vec2 vWorldXZ; varying float vDepth;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldXZ = wp.xz;
      vec4 mv = viewMatrix * wp; vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const groundFragment = `
    uniform float uTime;
    varying vec2 vWorldXZ; varying float vDepth;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      const float PITCH = 6.0;
      const float STREET = 1.6;
      vec2 p = vWorldXZ + PITCH * 0.5;
      vec2 m = mod(p, PITCH);
      bool streetX = m.x < STREET;
      bool streetZ = m.y < STREET;
      bool street = streetX || streetZ;
      vec3 base = street ? vec3(0.05, 0.08, 0.14) : vec3(0.03, 0.05, 0.09);
      // street lights every 1.5 along centrelines
      if (street) {
        if (streetX) {
          float cx = floor(p.x / PITCH) * PITCH;
          float dist = abs(vWorldXZ.x - cx);
          float along = mod(vWorldXZ.y + 0.75, 1.5);
          if (dist < 0.08 && along < 0.08) base += vec3(1.0, 0.7, 0.35) * 0.9;
        }
        if (streetZ) {
          float cz = floor(p.y / PITCH) * PITCH;
          float dist = abs(vWorldXZ.y - cz);
          float along = mod(vWorldXZ.x + 0.75, 1.5);
          if (dist < 0.08 && along < 0.08) base += vec3(1.0, 0.7, 0.35) * 0.9;
        }
      }
      float fogF = smoothstep(45.0, 170.0, vDepth);
      base = mix(base, vec3(0.04, 0.07, 0.13), fogF);
      gl_FragColor = vec4(base, 1.0);
    }
  `;
  const groundMaterial = new T.ShaderMaterial({
    vertexShader: groundVertex,
    fragmentShader: groundFragment,
    uniforms: { uTime: { value: 0 } }
  });

  // --- Skylight shader ---
  const skylightVertex = `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const skylightFragment = `
    uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec2 d = (vUv - 0.5) * vec2(1.0, 1.4);
      float dist = length(d);
      vec3 col = mix(vec3(1.0, 0.38, 0.22), vec3(0.88, 0.1, 0.07), smoothstep(0.0, 0.6, dist));
      // interior grid
      vec2 grid = fract(vUv * 8.0);
      float lines = step(0.92, grid.x) + step(0.92, grid.y);
      col *= 1.0 - 0.15 * lines;
      // pulse
      col *= 0.92 + 0.08 * sin(uTime * 2.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  const skylightMaterial = new T.ShaderMaterial({
    vertexShader: skylightVertex,
    fragmentShader: skylightFragment,
    uniforms: { uTime: { value: 0 } }
  });

  // --- Glow halo shader ---
  const glowVertex = `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const glowFragment = `
    uniform float uGlow;
    varying vec2 vUv;
    void main(){
      float d = length(vUv - 0.5) * 2.0;
      float a = pow(1.0 - clamp(d, 0.0, 1.0), 3.0) * uGlow;
      gl_FragColor = vec4(vec3(1.0, 0.18, 0.1), a);
    }
  `;
  const glowMaterial = new T.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    uniforms: { uGlow: { value: 0.35 } },
    blending: T.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  // --- Generate building instances ---
  const N = isMobile ? 26 : 36;
  const PITCH = 6;
  const STREET = 1.6;
  const LOT_SIZE = PITCH - STREET; // 4.4
  const GAP = 0.25;
  const half = (N - 1) * 0.5;

  const positions = [];
  const scales = [];
  const seeds = [];

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const blockX = (i - half) * PITCH;
      const blockZ = (j - half) * PITCH;
      const blockDist = Math.hypot(blockX, blockZ);
      if (blockDist < 5) continue; // skip hero tower area

      const r = Math.random();
      let layout;
      if (r < 0.4) layout = 1;
      else if (r < 0.75) layout = 2;
      else layout = 4;

      if (layout === 1) {
        const cx = blockX;
        const cz = blockZ;
        const dist = Math.hypot(cx, cz);
        if (nearNode(cx, cz)) continue;   // keep the destination towers and the red tower clear
        const h = capHeight(cx, cz, (3 + Math.pow(Math.random(), 3) * 52) * (1 + 0.9 * Math.exp(-dist / 38)));
        positions.push(cx, 0, cz);
        scales.push(LOT_SIZE, h, LOT_SIZE);
        seeds.push(Math.random());
      } else if (layout === 2) {
        const splitX = Math.random() < 0.5;
        const lotSize = (LOT_SIZE - GAP) * 0.5;
        if (splitX) {
          for (let k = 0; k < 2; k++) {
            const cx = blockX + (k - 0.5) * (lotSize + GAP);
            const cz = blockZ;
            const dist = Math.hypot(cx, cz);
            if (nearNode(cx, cz)) continue;   // keep the destination towers and the red tower clear
            const h = capHeight(cx, cz, (3 + Math.pow(Math.random(), 3) * 52) * (1 + 0.9 * Math.exp(-dist / 38)));
            positions.push(cx, 0, cz);
            scales.push(lotSize, h, lotSize);
            seeds.push(Math.random());
          }
        } else {
          for (let k = 0; k < 2; k++) {
            const cx = blockX;
            const cz = blockZ + (k - 0.5) * (lotSize + GAP);
            const dist = Math.hypot(cx, cz);
            if (nearNode(cx, cz)) continue;   // keep the destination towers and the red tower clear
            const h = capHeight(cx, cz, (3 + Math.pow(Math.random(), 3) * 52) * (1 + 0.9 * Math.exp(-dist / 38)));
            positions.push(cx, 0, cz);
            scales.push(lotSize, h, lotSize);
            seeds.push(Math.random());
          }
        }
      } else { // 4 lots
        const lotSize = (LOT_SIZE - 3 * GAP) * 0.25;
        for (let kx = 0; kx < 2; kx++) {
          for (let kz = 0; kz < 2; kz++) {
            const cx = blockX + (kx - 0.5) * (lotSize + GAP) + (kx === 0 ? -GAP * 0.5 : GAP * 0.5);
            const cz = blockZ + (kz - 0.5) * (lotSize + GAP) + (kz === 0 ? -GAP * 0.5 : GAP * 0.5);
            const dist = Math.hypot(cx, cz);
            if (nearNode(cx, cz)) continue;   // keep the destination towers and the red tower clear
            const h = capHeight(cx, cz, (3 + Math.pow(Math.random(), 3) * 52) * (1 + 0.9 * Math.exp(-dist / 38)));
            positions.push(cx, 0, cz);
            scales.push(lotSize, h, lotSize);
            seeds.push(Math.random());
          }
        }
      }
    }
  }

  const count = positions.length / 3;
  const buildingGeo = new T.BoxGeometry(1, 1, 1);
  buildingGeo.translate(0, 0.5, 0);

  const buildingMesh = new T.InstancedMesh(buildingGeo, buildingMaterial, count);
  buildingMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);

  const dummy = new T.Object3D();
  const seedAttr = new T.InstancedBufferAttribute(new Float32Array(seeds), 1);
  buildingGeo.setAttribute('aSeed', seedAttr);

  for (let i = 0; i < count; i++) {
    dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    dummy.scale.set(scales[i * 3], scales[i * 3 + 1], scales[i * 3 + 2]);
    dummy.updateMatrix();
    buildingMesh.setMatrixAt(i, dummy.matrix);
  }
  buildingMesh.instanceMatrix.needsUpdate = true;
  scene.add(buildingMesh);

  // --- Ground ---
  const groundGeo = new T.PlaneGeometry(420, 420);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new T.Mesh(groundGeo, groundMaterial);
  groundMesh.position.y = 0;
  scene.add(groundMesh);

  // --- Hero tower (count 1 InstancedMesh with same material) ---
  const towerGeo = new T.BoxGeometry(1, 1, 1);
  towerGeo.translate(0, 0.5, 0);
  const towerMesh = new T.InstancedMesh(towerGeo, buildingMaterial, 1);
  const towerSeedAttr = new T.InstancedBufferAttribute(new Float32Array([0.37]), 1);
  towerGeo.setAttribute('aSeed', towerSeedAttr);
  dummy.position.set(0, 0, 0);
  dummy.scale.set(4, 30, 4);
  dummy.updateMatrix();
  towerMesh.setMatrixAt(0, dummy.matrix);
  towerMesh.instanceMatrix.needsUpdate = true;
  scene.add(towerMesh);

  // --- Red skylight ---
  const skylightGeo = new T.PlaneGeometry(2.4, 3.4);
  skylightGeo.rotateX(-Math.PI / 2);
  const skylightMesh = new T.Mesh(skylightGeo, skylightMaterial);
  skylightMesh.position.set(0, 30.08, 0);
  scene.add(skylightMesh);

  // --- Glow halo ---
  const glowGeo = new T.PlaneGeometry(14, 14);
  glowGeo.rotateX(-Math.PI / 2);
  const glowMesh = new T.Mesh(glowGeo, glowMaterial);
  glowMesh.position.set(0, 30.1, 0);
  scene.add(glowMesh);

  // --- Site map: destination towers, roof pads, beams and the arcs that link them ---
  const map = createCityMap(scene, buildingMaterial);
  const deco = createCityDeco(scene, NODES);   // rooftop icon per destination, antennas, HUD overlays on the active one
  const mapOut = new Float32Array(18);

  // --- Camera path state ---
  let p = 0, active = -1;
  const target = new T.Vector3(0, 0, 0);
  const upVec = new T.Vector3();

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function update(s) {
    const k = 1 - Math.pow(1 - 0.08, s.dt * 60);
    p += (s.progress - p) * k;

    // route: overview -> each destination in turn (hop, pause) -> drop into the red skylight
    active = map.pose(p, camera.position, target, upVec, s.dt);
    if (!reducedMotion) {                       // a little pointer parallax while hovering, none in the final drop
      const sway = 1.6 * (1 - Math.min(1, Math.max(0, (p - 0.83) / 0.12)));
      camera.position.x += s.mouse.x * sway;
      camera.position.z -= s.mouse.y * sway;
    }
    camera.up.copy(upVec);
    camera.lookAt(target);
    // portrait phones: open the lens on the overview so the whole map fits the narrow frame
    camera.fov = map.fov + (camera.aspect < 0.8 ? 22 * (1 - Math.min(1, p * 6)) : 0);
    camera.updateProjectionMatrix();
    map.update(s.time, active, p, s.dt);
    deco.update(s.time, s.dt, active);

    const t = s.time;
    buildingMaterial.uniforms.uTime.value = t;
    groundMaterial.uniforms.uTime.value = t;
    skylightMaterial.uniforms.uTime.value = t;
    glowMaterial.uniforms.uGlow.value = 0.35 + 0.65 * p;
  }

  resize(width, height);

  return {
    scene, camera, update, resize,
    get activeIndex() { return active; },                 // -1 overview/travelling, 0..4 destinations, 5 red (contact)
    get progress() { return p; },                         // eased section progress
    get alt() { return map.alt || 0; }, get heading() { return map.heading || 0; }, get speed() { return map.speed || 0; },
    mapScreen(w, h) { map.project(camera, w, h, mapOut); return mapOut; }   // [x, y, visible] x 6, CSS px
  };
}