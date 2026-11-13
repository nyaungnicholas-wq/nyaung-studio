import * as THREE from 'three';

const MINT = new THREE.Color(0.66, 0.94, 0.82);
const NODE_KEYS = ['work', 'about', 'services', 'writing', 'now'];

function createLineMat(opacity) {
  return new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
}

function createIconGeometry(key) {
  const group = new THREE.Group();
  const edgesMat = createLineMat(1);

  if (key === 'work') {
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BoxGeometry(3.2, 0.12, 2.2);
      const edges = new THREE.EdgesGeometry(geo);
      const mesh = new THREE.LineSegments(edges, edgesMat.clone());
      mesh.position.set(0.3 * i, 0.55 * i, 0);
      group.add(mesh);
    }
  } else if (key === 'about') {
    const icoGeo = new THREE.IcosahedronGeometry(1.5, 0);
    const icoEdges = new THREE.EdgesGeometry(icoGeo);
    group.add(new THREE.LineSegments(icoEdges, edgesMat.clone()));
    const circleGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
    }
    circleGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.LineLoop(circleGeo, edgesMat.clone()));
  } else if (key === 'services') {
    const outer = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(outer), edgesMat.clone()));
    const inner = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const innerEdges = new THREE.EdgesGeometry(inner);
    const innerMesh = new THREE.LineSegments(innerEdges, edgesMat.clone());
    innerMesh.rotation.set(Math.PI / 4, Math.PI / 4, 0);
    group.add(innerMesh);
  } else if (key === 'writing') {
    const pageGeo = new THREE.PlaneGeometry(1.6, 2.2);
    const pageEdges = new THREE.EdgesGeometry(pageGeo);
    for (let side = 0; side < 2; side++) {
      const mesh = new THREE.LineSegments(pageEdges, edgesMat.clone());
      mesh.rotation.z = side === 0 ? 0.45 : -0.45;
      mesh.rotation.y = side === 0 ? 0 : Math.PI;
      mesh.position.x = side === 0 ? -0.05 : 0.05;
      group.add(mesh);
      const lines = [];
      for (let l = 0; l < 3; l++) {
        const y = -0.7 + l * 0.7;
        lines.push(-0.6, y, 0.01, 0.6, y, 0.01);
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
      const lineMesh = new THREE.LineSegments(lineGeo, edgesMat.clone());
      lineMesh.rotation.z = side === 0 ? 0.45 : -0.45;
      lineMesh.rotation.y = side === 0 ? 0 : Math.PI;
      lineMesh.position.x = side === 0 ? -0.05 : 0.05;
      group.add(lineMesh);
    }
  } else if (key === 'now') {
    const circleGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0);
    }
    circleGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.LineLoop(circleGeo, edgesMat.clone()));
    const tickGeo = new THREE.BufferGeometry();
    const tickPts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = 1.5, r2 = 1.8;
      tickPts.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0);
    }
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
    group.add(new THREE.LineSegments(tickGeo, edgesMat.clone()));
    const handGeo = new THREE.BufferGeometry();
    handGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1.35, 0], 3));
    const hand = new THREE.LineSegments(handGeo, edgesMat.clone());
    hand.userData.isHand = true;
    group.add(hand);
  }
  return group;
}

function createOverlayGeometry(h) {
  const group = new THREE.Group();
  const baseY = -14;
  const topY = 1;

  // a) Corner rails
  const railGeo = new THREE.BufferGeometry();
  const railPts = [];
  const corners = [[-2.3, -2.3], [2.3, -2.3], [2.3, 2.3], [-2.3, 2.3]];
  for (const [cx, cz] of corners) {
    for (let y = baseY; y <= topY; y += 2) {
      railPts.push(cx, y, cz, cx, y + 1, cz);
      const dx = cx > 0 ? 0.5 : -0.5;
      const dz = cz > 0 ? 0.5 : -0.5;
      const len = Math.sqrt(dx * dx + dz * dz);
      const nx = dx / len * 0.5, nz = dz / len * 0.5;
      railPts.push(cx, y, cz, cx + nx, y, cz + nz);
    }
  }
  railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPts, 3));
  group.add(new THREE.LineSegments(railGeo, createLineMat(0.55)));

  // b) Segmented ring
  const ringGeo = new THREE.BufferGeometry();
  const ringPts = [];
  const segs = 24;
  for (let s = 0; s < segs; s += 2) {
    const a1 = (s / segs) * Math.PI * 2;
    const a2 = ((s + 1) / segs) * Math.PI * 2;
    for (let p = 0; p <= 5; p++) {
      const a = a1 + (a2 - a1) * (p / 5);
      ringPts.push(Math.cos(a) * 5.5, 0.3, Math.sin(a) * 5.5);
    }
  }
  ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPts, 3));
  const ring = new THREE.LineSegments(ringGeo, createLineMat(0.7));
  ring.userData.isRing = true;
  group.add(ring);

  // c) Tick ring
  const tickGeo = new THREE.BufferGeometry();
  const tickPts = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const len = i % 5 === 0 ? 0.8 : 0.35;
    tickPts.push(Math.cos(a) * 6.6, 0.3, Math.sin(a) * 6.6, Math.cos(a) * (6.6 + len), 0.3, Math.sin(a) * (6.6 + len));
  }
  tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
  const tickRing = new THREE.LineSegments(tickGeo, createLineMat(0.45));
  tickRing.userData.isTickRing = true;
  group.add(tickRing);

  // d) Scan square
  const scanGeo = new THREE.BufferGeometry();
  const s = 5.2 / 2;
  const scanPts = [-s, 0, -s, s, 0, -s, s, 0, s, -s, 0, s, -s, 0, -s];
  scanGeo.setAttribute('position', new THREE.Float32BufferAttribute(scanPts, 3));
  const scan = new THREE.LineLoop(scanGeo, createLineMat(0.8));
  scan.userData.isScan = true;
  group.add(scan);

  return group;
}

export default function createCityDeco(scene, NODES) {
  const icons = [];
  const antennas = [];
  const warningLights = [];
  const overlays = [];
  const alphas = new Float32Array(5).fill(0);
  const iconMats = [];
  const overlayMats = { rails: [], ring: [], tickRing: [], scan: [] };

  for (let i = 0; i < 5; i++) {
    const node = NODES[i];
    const key = NODE_KEYS[i];

    // Icon
    const icon = createIconGeometry(key);
    icon.position.set(node.x, node.h + 7, node.z);
    icon.traverse(o => { if (o.isLineSegments || o.isLineLoop) iconMats.push(o.material); });
    scene.add(icon);
    icons.push(icon);

    // Antenna mast
    const mastGeo = new THREE.BoxGeometry(0.12, 6, 0.12);
    const mastMat = new THREE.MeshBasicMaterial({ color: 0x1a2230 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(node.x + 1.5, node.h + 3, node.z + 1.5);
    scene.add(mast);
    antennas.push(mast);

    // Warning light
    const lightGeo = new THREE.SphereGeometry(0.22, 10, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(node.x + 1.5, node.h + 6.15, node.z + 1.5);
    scene.add(light);
    warningLights.push({ mesh: light, mat: lightMat, index: i });

    // Overlay
    const overlay = createOverlayGeometry(node.h);
    overlay.position.set(node.x, 0, node.z);
    overlay.visible = false;
    overlay.traverse(o => {
      if (o.isLineSegments || o.isLineLoop) {
        if (o.userData.isRing) overlayMats.ring.push(o.material);
        else if (o.userData.isTickRing) overlayMats.tickRing.push(o.material);
        else if (o.userData.isScan) overlayMats.scan.push(o.material);
        else overlayMats.rails.push(o.material);
      }
    });
    scene.add(overlay);
    overlays.push(overlay);
  }

  const k = 1 - Math.pow(0.9, 60); // precompute for dt=1/60, scaled in update

  return {
    update(time, dt, active) {
      const ease = 1 - Math.pow(0.9, dt * 60);
      for (let i = 0; i < 5; i++) {
        const target = active === i ? 1 : 0;
        alphas[i] += (target - alphas[i]) * ease;
        const a = alphas[i];
        const node = NODES[i];

        // Icon animation
        const icon = icons[i];
        icon.rotation.y += dt * 0.35;
        icon.position.y = node.h + 7 + Math.sin(time * 1.2 + i) * 0.35;
        const iconOpacity = 0.35 + 0.65 * a;
        icon.traverse(o => { if (o.material && o.material.opacity !== undefined) o.material.opacity = iconOpacity; });

        // Warning light
        const wl = warningLights[i];
        const pulse = (time * 0.55 + i * 0.21) % 1;
        wl.mat.opacity = pulse < 0.14 ? 1 : 0.12;

        // Overlay
        const overlay = overlays[i];
        overlay.visible = a > 0.01;
        if (a > 0.01) {
          overlayMats.rails[i].opacity = 0.55 * a;
          overlayMats.ring[i].opacity = 0.7 * a;
          overlayMats.tickRing[i].opacity = 0.45 * a;
          const u = (time * 0.35) % 1;
          overlayMats.scan[i].opacity = a * 0.8 * Math.sin(Math.PI * u);
          overlay.children.find(c => c.userData.isScan).position.y = node.h - 14 + 15 * u;
          overlay.children.find(c => c.userData.isRing).rotation.y = time * 0.25;
          overlay.children.find(c => c.userData.isTickRing).rotation.y = -time * 0.12;
        }

        // Clock hand
        if (i === 4) {
          const hand = icons[i].children.find(c => c.userData.isHand);
          if (hand) hand.rotation.z = -time * 0.8;
        }
      }
    }
  };
}