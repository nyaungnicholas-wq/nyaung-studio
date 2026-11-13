import * as THREE from 'three';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export default function createTunnelChart(scene, opts) {
  const isMobile = !!opts.isMobile;
  const reduced = !!opts.reducedMotion;
  const N = isMobile ? 70 : 120;
  const SPACING = 1.15;
  const rng = mulberry32(7);

  const SLATE = new THREE.Color(0x2b3036);
  const UP = new THREE.Color(0x22E39A);
  const DOWN = new THREE.Color(0xFF4D5E);

  const opens = new Float32Array(N);
  const closes = new Float32Array(N);
  const highs = new Float32Array(N);
  const lows = new Float32Array(N);
  const vols = new Float32Array(N);
  const zPos = new Float32Array(N);

  let price = 0;
  let globalMin = Infinity, globalMax = -Infinity;

  for (let i = 0; i < N; i++) {
    const open = price;
    const drift = (rng() - 0.5) * 0.9 + 0.08 * Math.sin(i * 0.11);
    const close = open + drift;
    const high = Math.max(open, close) + rng() * 0.35;
    const low = Math.min(open, close) - rng() * 0.35;
    const vol = Math.min(1, 0.25 + Math.abs(drift) * 0.9 + rng() * 0.35);
    price = close;

    opens[i] = open; closes[i] = close; highs[i] = high; lows[i] = low; vols[i] = vol;
    zPos[i] = -6 - i * SPACING;
    globalMin = Math.min(globalMin, low);
    globalMax = Math.max(globalMax, high);
  }

  // taller relief (-1.85..-0.35) so the price swings read from the camera's height; top stays 0.3 under the lowest camera
  const yScale = 1.5 / (globalMax - globalMin);
  const yOffset = -1.85 - globalMin * yScale;

  const bodyCentres = new Float32Array(N);
  const bodyHeights = new Float32Array(N);
  const wickCentres = new Float32Array(N);
  const wickHeights = new Float32Array(N);
  const volWidths = new Float32Array(N);
  const bodyColors = new Float32Array(N * 3);
  const wickColors = new Float32Array(N * 3);
  const volColors = new Float32Array(N * 3);
  const lastG = new Float32Array(N).fill(-1);   // -1 forces every candle through the first update

  for (let i = 0; i < N; i++) {
    const o = (opens[i] * yScale + yOffset);
    const c = (closes[i] * yScale + yOffset);
    const h = (highs[i] * yScale + yOffset);
    const l = (lows[i] * yScale + yOffset);
    const up = closes[i] >= opens[i];
    const baseH = Math.max(0.03, Math.abs(c - o));
    const wickH = h - l;
    const vw = 0.18 + vols[i] * 1.1;

    bodyCentres[i] = (o + c) * 0.5;
    bodyHeights[i] = baseH;
    wickCentres[i] = (h + l) * 0.5;
    wickHeights[i] = wickH;
    volWidths[i] = vw;

    const col = SLATE.clone().lerp(up ? UP : DOWN, 0.55);
    bodyColors[i*3] = col.r; bodyColors[i*3+1] = col.g; bodyColors[i*3+2] = col.b;
    col.multiplyScalar(0.8);
    wickColors[i*3] = col.r; wickColors[i*3+1] = col.g; wickColors[i*3+2] = col.b;
    col.multiplyScalar(0.75);
    volColors[i*3] = col.r; volColors[i*3+1] = col.g; volColors[i*3+2] = col.b;
  }

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: true });
  const wickMat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: true });
  const volMat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: true });

  const bodyMesh = new THREE.InstancedMesh(geo, bodyMat, N);
  const wickMesh = new THREE.InstancedMesh(geo, wickMat, N);
  const volMesh = new THREE.InstancedMesh(geo, volMat, N);
  bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  wickMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  volMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const bodyColorAttr = new THREE.InstancedBufferAttribute(bodyColors, 3);
  const wickColorAttr = new THREE.InstancedBufferAttribute(wickColors, 3);
  const volColorAttr = new THREE.InstancedBufferAttribute(volColors, 3);
  // per-instance colours go on the mesh (three reads InstancedMesh.instanceColor), not on the shared geometry
  bodyMesh.instanceColor = bodyColorAttr;
  wickMesh.instanceColor = wickColorAttr;
  volMesh.instanceColor = volColorAttr;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    dummy.position.set(0, bodyCentres[i], zPos[i]);
    dummy.scale.set(0.4, bodyHeights[i], 0.62);
    dummy.updateMatrix();
    bodyMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(0, wickCentres[i], zPos[i]);
    dummy.scale.set(0.05, wickHeights[i], 0.035);
    dummy.updateMatrix();
    wickMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(0, -1.985, zPos[i]);
    dummy.scale.set(volWidths[i], 0.02, 0.62);
    dummy.updateMatrix();
    volMesh.setMatrixAt(i, dummy.matrix);
  }
  bodyMesh.instanceMatrix.needsUpdate = true;
  wickMesh.instanceMatrix.needsUpdate = true;
  volMesh.instanceMatrix.needsUpdate = true;

  scene.add(bodyMesh, wickMesh, volMesh);

  const linePoints = [];
  for (let i = 0; i < N; i++) {
    linePoints.push(new THREE.Vector3(0, closes[i] * yScale + yOffset, zPos[i]));
  }
  const curve = new THREE.CatmullRomCurve3(linePoints);
  const tubeGeo = new THREE.TubeGeometry(curve, N * 4, 0.028, 6, false);

  const lineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uReveal: { value: -27 } },
    vertexShader: `
      varying float vU; varying float vZ; varying float vDist;
      void main() {
        vU = uv.x;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vDist = length(mvPos.xyz);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vZ = worldPos.z;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vU; varying float vZ; varying float vDist;
      uniform float uTime; uniform float uReveal;
      void main() {
        float d = fract(vU * 6.0 + uTime * 0.35);
        float pulse = smoothstep(0.92, 1.0, d);
        float show = smoothstep(uReveal, uReveal + 3.0, vZ);
        float a = (0.55 + 0.75 * pulse) * exp(-vDist * 0.04) * show;
        gl_FragColor = vec4(vec3(0.66, 0.94, 0.82) * a, a);
      }
    `
  });
  const lineMesh = new THREE.Mesh(tubeGeo, lineMat);
  lineMesh.frustumCulled = false;
  scene.add(lineMesh);

  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  return {
    update(time, camZ) {
      lineMat.uniforms.uTime.value = reduced ? 0 : time;
      lineMat.uniforms.uReveal.value = camZ - 27;

      let any = false;
      for (let i = 0; i < N; i++) {
        const ahead = camZ - zPos[i];
        const g = reduced ? 1 : smoothstep(34, 20, ahead);
        if (Math.abs(g - lastG[i]) < 1e-4) continue;
        lastG[i] = g;
        any = true;

        const o = (opens[i] * yScale + yOffset);
        const c = (closes[i] * yScale + yOffset);
        const h = (highs[i] * yScale + yOffset);
        const l = (lows[i] * yScale + yOffset);

        dummy.position.set(0, o + (bodyCentres[i] - o) * g, zPos[i]);
        dummy.scale.set(0.4, bodyHeights[i] * g, 0.62);
        dummy.updateMatrix();
        bodyMesh.setMatrixAt(i, dummy.matrix);

        const wickStart = (o + c) * 0.5;
        dummy.position.set(0, wickStart + (wickCentres[i] - wickStart) * g, zPos[i]);
        dummy.scale.set(0.05, wickHeights[i] * g, 0.035);
        dummy.updateMatrix();
        wickMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(0, -1.985, zPos[i]);
        dummy.scale.set(volWidths[i] * g, 0.02, 0.62);
        dummy.updateMatrix();
        volMesh.setMatrixAt(i, dummy.matrix);
      }
      if (any) {
        bodyMesh.instanceMatrix.needsUpdate = true;
        wickMesh.instanceMatrix.needsUpdate = true;
        volMesh.instanceMatrix.needsUpdate = true;
      }
    }
  };
}