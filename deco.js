// deco.js — voxel-style floating island scenery for Prism s-tile
//
// Exports createDecoSystem(scene, opts) which returns an object with:
//   .setTheme(theme)             — store theme reference
//   .build(level, seed)          — clear + scatter deco along the track
//   .update(worldTime, dt, cam, pulse) — animate deco (bob)
//   .root                         — the parent THREE.Group (optional)
//   .clear()                      — remove + dispose everything
//
// Every decoration is a hand-authored voxel-style floating island —
// a grass-topped rock body with a curving tree, moss, hanging vines
// and small blue flowers. Layout is deterministic per song seed so
// replays look identical.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/* ------------------------------------------------------------------
   Seeded RNG — same as the main game so a given song looks the same
   every time you play it.
   ------------------------------------------------------------------ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

/* ==================================================================
   NATURAL VOXEL PALETTE
   Colours picked directly from the reference art: bluish-grey stone,
   bright yellow-green grass, warm brown wood, mid-green leaves,
   yellow-green vines, small blue flowers.
   ================================================================== */
const PAL = {
  stone:   [0x9aa0ad, 0x8a8f9c, 0x7a8090, 0xaab0bc, 0x9298a6],
  stoneDk: [0x5a6070, 0x4a5060, 0x6a7080, 0x3a4050],
  grass:   [0x78c452, 0x8ad35e, 0x66b046, 0x9be070, 0x5a9e3e],
  moss:    [0x5a8a3a, 0x6a9a44, 0x4a7a30],
  dirt:    [0x6a5a40, 0x7a6a4a, 0x5a4a30],
  wood:    [0x8b6a3f, 0x9a7848, 0x7a5a30, 0xa08050, 0x6a4a28],
  leaf:    [0x5cb84a, 0x6fca55, 0x4a9a3a, 0x82d96a, 0x9ae078],
  leafDk:  [0x3a7a2a, 0x4a8a35, 0x2e6a22],
  vine:    [0x9ac056, 0x88b048, 0xa8cc66, 0xb0d570],
  flower:  [0x66aaff, 0x88bbff, 0x5599ee],
  stem:    [0x5a8a3a, 0x4a7a30]
};

function pick(rng, arr) { return arr[(rng() * arr.length) | 0]; }

/* Push a voxel into the flat array the InstancedMesh builder reads. */
function pushVoxel(arr, x, y, z, s, c, syOverride) {
  arr.push({
    x, y, z,
    s,
    sy: syOverride != null ? syOverride : s,
    c
  });
}

/* ==================================================================
   ISLAND BUILDERS
   Each returns a flat array of voxel descriptors
   { x, y, z, s, sy, c }. All coordinates are in local island space
   with (0,0,0) at the top of the grass.
   ================================================================== */

/* --- Hero: grass-topped island with a big curving tree ------------- */
function buildTreeIsland(rng) {
  const voxels = [];

  const R = 2.6 + rng() * 1.2;          // island radius
  const VS = 0.72;                       // terrain voxel size
  const botDepth = 1.8 + rng() * 1.4;   // deepest point of the base

  const grid = Math.ceil(R / VS);

  /* ---- 1. Terrain body (stone + grass cap) ---- */
  for (let ix = -grid; ix <= grid; ix++) {
    for (let iz = -grid; iz <= grid; iz++) {
      const x = ix * VS;
      const z = iz * VS;
      const d = Math.sqrt(x * x + z * z);
      if (d > R) continue;

      const rr = d / R;

      // Top: gentle dome, slightly raised at centre
      const topNoise = Math.sin(x * 1.4 + 0.7) * Math.cos(z * 1.2) * 0.14;
      const topY = 0.12 - rr * 0.18 + topNoise;

      // Bottom: tapers to a jagged point
      const taper = Math.pow(1 - rr, 0.75);
      let botY = -botDepth * taper;
      botY += Math.sin(x * 1.9 + z * 0.7) * 0.28;
      if (rng() < 0.16) botY -= 0.45 + rng() * 0.9;   // spike

      const layers = Math.max(1, Math.round((topY - botY) / VS));
      for (let k = 0; k < layers; k++) {
        const vy = botY + (k + 0.5) * (topY - botY) / layers;
        const isTop = (k === layers - 1);

        let c;
        if (isTop) {
          c = pick(rng, PAL.grass);
        } else if (k === layers - 2 && rr > 0.55) {
          c = pick(rng, rng() < 0.55 ? PAL.moss : PAL.grass);
        } else if (vy > -0.55) {
          c = pick(rng, PAL.stone);
        } else {
          c = pick(rng, PAL.stoneDk);
        }

        pushVoxel(voxels,
          x + (rng() - 0.5) * VS * 0.12,
          vy,
          z + (rng() - 0.5) * VS * 0.12,
          VS * (0.9 + rng() * 0.18),
          c
        );
      }
    }
  }

  /* ---- 2. Small rocks scattered on top of the grass ---- */
  const nRocks = 3 + ((rng() * 5) | 0);
  for (let i = 0; i < nRocks; i++) {
    const a = rng() * Math.PI * 2;
    const rr = rng() * R * 0.72;
    const rx = Math.cos(a) * rr;
    const rz = Math.sin(a) * rr;
    const rw = 0.34 + rng() * 0.5;
    const rh = 0.22 + rng() * 0.35;
    pushVoxel(voxels, rx, 0.12 + rh * 0.5, rz, rw, pick(rng, PAL.stone), rh);
    if (rng() < 0.4) {
      pushVoxel(voxels,
        rx + (rng() - 0.5) * 0.7, 0.12 + rh * 0.3,
        rz + (rng() - 0.5) * 0.7,
        rw * 0.6, pick(rng, PAL.stone), rh * 0.7);
    }
  }

  /* ---- 3. The tree: curving trunk + branches + leaf canopy ---- */
  const trunkX = (rng() - 0.5) * 0.5;
  const trunkZ = (rng() - 0.5) * 0.5;
  const trunkH = 2.5 + rng() * 1.6;
  const trunkW = 0.44 + rng() * 0.14;
  const woodVS = 0.42;
  const tSteps = Math.max(4, Math.ceil(trunkH / woodVS));

  const trunkPoints = [];
  for (let k = 0; k < tSteps; k++) {
    const u = k / (tSteps - 1);
    const y = u * trunkH;
    const cx = trunkX + Math.sin(y * 0.85) * 0.20;
    const cz = trunkZ + Math.cos(y * 0.65) * 0.16;
    const w = trunkW * (1 - u * 0.32);
    trunkPoints.push({ x: cx, y, z: cz, w });

    const c = pick(rng, PAL.wood);
    pushVoxel(voxels, cx, y + 0.05, cz, w, c);

    // occasionally thicken the trunk
    if (u < 0.3 && rng() < 0.55) {
      pushVoxel(voxels,
        cx + (rng() - 0.5) * w * 0.8,
        y + 0.05,
        cz + (rng() - 0.5) * w * 0.8,
        w * 0.75, c);
    }
  }

  // Branches from the upper half of the trunk, curving outward
  const nBranch = 3 + ((rng() * 3) | 0);
  const branchTips = [];
  for (let i = 0; i < nBranch; i++) {
    const startIdx = Math.floor(tSteps * (0.52 + rng() * 0.36));
    const sp = trunkPoints[Math.min(tSteps - 1, startIdx)];
    const angle = (i / nBranch) * Math.PI * 2 + rng() * 0.8;
    const bLen = 0.85 + rng() * 0.95;
    const endX = sp.x + Math.cos(angle) * bLen;
    const endZ = sp.z + Math.sin(angle) * bLen;
    const endY = sp.y + 0.55 + rng() * 0.7;

    const bSteps = 4;
    for (let k = 0; k <= bSteps; k++) {
      const u = k / bSteps;
      // ease the branch outward
      const eu = u * u * (3 - 2 * u);
      const vx = sp.x + (endX - sp.x) * eu;
      const vz = sp.z + (endZ - sp.z) * eu;
      const vy = sp.y + (endY - sp.y) * u;
      const w = trunkW * 0.82 * (1 - u * 0.45);
      pushVoxel(voxels, vx, vy, vz, w, pick(rng, PAL.wood));
    }
    branchTips.push({ x: endX, y: endY, z: endZ });
  }

  // Canopy — a solid squashed sphere of leaf voxels
  const canopyR = 1.85 + rng() * 1.05;
  const cx0 = trunkX + (rng() - 0.5) * 0.4;
  const cz0 = trunkZ + (rng() - 0.5) * 0.4;
  const cy0 = trunkH + 0.55 + rng() * 0.5;
  const cVS = 0.74;
  const cGrid = Math.ceil(canopyR / cVS);
  const squashY = 0.72;

  for (let ix = -cGrid; ix <= cGrid; ix++) {
    for (let iy = -cGrid; iy <= cGrid; iy++) {
      for (let iz = -cGrid; iz <= cGrid; iz++) {
        const x = ix * cVS;
        const y = iy * cVS;
        const z = iz * cVS;
        const dx = x, dy = y / squashY, dz = z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > canopyR) continue;

        // Leave a hollow for the trunk to enter the underside
        if (y < -canopyR * 0.55 && Math.abs(x) < 0.85 && Math.abs(z) < 0.85) continue;

        // Slight dome bias: skip bottom corners
        if (y < -canopyR * 0.3 && d > canopyR * 0.85) continue;

        const edge = d > canopyR * 0.72;
        const c = pick(rng, edge ? PAL.leafDk : PAL.leaf);

        pushVoxel(voxels,
          cx0 + x + (rng() - 0.5) * 0.12,
          cy0 + y * squashY + (rng() - 0.5) * 0.12,
          cz0 + z + (rng() - 0.5) * 0.12,
          cVS * (0.85 + rng() * 0.30),
          c
        );
      }
    }
  }

  // Fill a little extra leaf near branch tips
  for (const bt of branchTips) {
    for (let k = 0; k < 3; k++) {
      pushVoxel(voxels,
        bt.x + (rng() - 0.5) * 0.85,
        bt.y + (rng() - 0.35) * 0.65,
        bt.z + (rng() - 0.5) * 0.85,
        cVS * 0.8, pick(rng, PAL.leaf));
    }
  }

  /* ---- 4. Vines hanging from the rim ---- */
  const nVines = 2 + ((rng() * 3) | 0);
  for (let i = 0; i < nVines; i++) {
    const a = rng() * Math.PI * 2;
    const vr = R * (0.68 + rng() * 0.25);
    const vx = Math.cos(a) * vr;
    const vz = Math.sin(a) * vr;
    const vLen = 0.9 + rng() * 1.5;
    const step = 0.36;
    const steps = Math.ceil(vLen / step);
    const c = pick(rng, PAL.vine);
    for (let k = 0; k < steps; k++) {
      const y = -0.08 - k * step;
      const sw = Math.sin(k * 0.7 + i * 1.3) * 0.06;
      pushVoxel(voxels, vx + sw, y, vz + sw * 0.7, 0.20 + rng() * 0.06, c);
    }
  }

  /* ---- 5. Small blue flowers on the grass ---- */
  const nFlowers = 3 + ((rng() * 4) | 0);
  for (let i = 0; i < nFlowers; i++) {
    const a = rng() * Math.PI * 2;
    const rr = rng() * R * 0.72;
    const fx = Math.cos(a) * rr;
    const fz = Math.sin(a) * rr;
    pushVoxel(voxels, fx, 0.26, fz, 0.11, pick(rng, PAL.stem));
    pushVoxel(voxels, fx, 0.40, fz, 0.18, pick(rng, PAL.flower));
  }

  return voxels;
}

/* --- Mid: small mossy rock island (no tree) ------------------------ */
function buildRockIsland(rng) {
  const voxels = [];
  const R = 1.3 + rng() * 1.0;
  const VS = 0.58;
  const botDepth = 1.1 + rng() * 1.0;
  const grid = Math.ceil(R / VS);

  for (let ix = -grid; ix <= grid; ix++) {
    for (let iz = -grid; iz <= grid; iz++) {
      const x = ix * VS;
      const z = iz * VS;
      const d = Math.sqrt(x * x + z * z);
      if (d > R) continue;
      const rr = d / R;

      const topY = 0.08 - rr * 0.12 + Math.sin(x * 1.7) * Math.cos(z * 1.4) * 0.12;
      const taper = Math.pow(1 - rr, 0.72);
      let botY = -botDepth * taper;
      botY += Math.sin(x * 2.1 + z) * 0.22;
      if (rng() < 0.22) botY -= 0.35 + rng() * 0.6;

      const layers = Math.max(1, Math.round((topY - botY) / VS));
      for (let k = 0; k < layers; k++) {
        const vy = botY + (k + 0.5) * (topY - botY) / layers;
        const isTop = (k === layers - 1);
        let c;
        if (isTop) c = pick(rng, PAL.moss);
        else if (vy > -0.5) c = pick(rng, PAL.stone);
        else c = pick(rng, PAL.stoneDk);

        pushVoxel(voxels,
          x + (rng() - 0.5) * 0.08, vy,
          z + (rng() - 0.5) * 0.08,
          VS * (0.9 + rng() * 0.2), c);
      }
    }
  }

  // Rocks on top
  const nRocks = 2 + ((rng() * 3) | 0);
  for (let i = 0; i < nRocks; i++) {
    const a = rng() * Math.PI * 2;
    const rr = rng() * R * 0.7;
    const rw = 0.24 + rng() * 0.38;
    const rh = 0.18 + rng() * 0.28;
    pushVoxel(voxels,
      Math.cos(a) * rr, 0.08 + rh * 0.5, Math.sin(a) * rr,
      rw, pick(rng, PAL.stone), rh);
  }

  // Grass tufts
  const nTufts = 4 + ((rng() * 4) | 0);
  for (let i = 0; i < nTufts; i++) {
    const a = rng() * Math.PI * 2;
    const rr = rng() * R * 0.75;
    pushVoxel(voxels,
      Math.cos(a) * rr, 0.18, Math.sin(a) * rr,
      0.18 + rng() * 0.10, pick(rng, PAL.grass), 0.32);
  }

  // Occasional tiny flower
  if (rng() < 0.55) {
    const a = rng() * Math.PI * 2;
    const rr = rng() * R * 0.7;
    const fx = Math.cos(a) * rr, fz = Math.sin(a) * rr;
    pushVoxel(voxels, fx, 0.22, fz, 0.09, pick(rng, PAL.stem));
    pushVoxel(voxels, fx, 0.36, fz, 0.15, pick(rng, PAL.flower));
  }

  return voxels;
}

/* --- Tiny: single mossy rock -------------------------------------- */
function buildTinyRock(rng) {
  const voxels = [];
  const R = 0.65 + rng() * 0.5;
  const VS = 0.42;
  const grid = Math.ceil(R / VS);

  for (let ix = -grid; ix <= grid; ix++) {
    for (let iz = -grid; iz <= grid; iz++) {
      const x = ix * VS;
      const z = iz * VS;
      const d = Math.sqrt(x * x + z * z);
      if (d > R) continue;
      const rr = d / R;

      const topY = 0.05 - rr * 0.2;
      let botY = -0.75 * Math.pow(1 - rr, 0.8) - rng() * 0.3;

      const layers = Math.max(1, Math.round((topY - botY) / VS));
      for (let k = 0; k < layers; k++) {
        const vy = botY + (k + 0.5) * (topY - botY) / layers;
        const isTop = (k === layers - 1);
        const c = isTop ? pick(rng, PAL.moss) : pick(rng, PAL.stone);
        pushVoxel(voxels, x, vy, z, VS * 0.95, c);
      }
    }
  }
  return voxels;
}

/* ==================================================================
   createDecoSystem
   ================================================================== */
export function createDecoSystem(scene, opts = {}) {
  const density = opts.density != null ? opts.density : 1;

  const root = new THREE.Group();
  root.name = 'decoRoot';
  scene.add(root);

  /* ---- Shared 3-tone toon ramp ---- */
  const gradData = new Uint8Array([104, 178, 255]);
  const gradientMap = new THREE.DataTexture(gradData, 3, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;

  /* ---- Shared unit cube + material (instanceColor does the work) ---- */
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const voxelMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap
  });

  /* ---- State ---- */
  let theme = null;
  let items = [];
  let rng = mulberry32(1);

  /* ---- Build one InstancedMesh from an array of voxel descriptors ---- */
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _c = new THREE.Color();

  function makeInstanced(voxels) {
    if (!voxels.length) return null;
    const mesh = new THREE.InstancedMesh(cubeGeo, voxelMat, voxels.length);

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      _p.set(v.x, v.y, v.z);
      _s.set(v.s, v.sy, v.s);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      _c.setHex(v.c);
      mesh.setColorAt(i, _c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Let three.js cull it correctly; if the method isn't available
    // in this build, disable culling to be safe.
    if (typeof mesh.computeBoundingSphere === 'function') {
      try { mesh.computeBoundingSphere(); } catch (e) { /* noop */ }
    } else {
      mesh.frustumCulled = false;
    }

    return mesh;
  }

  /* ------------------------------------------------------------------
     PUBLIC: setTheme
     Islands use natural colours, so we only remember the theme for
     potential future tinting. Nothing else to do.
     ------------------------------------------------------------------ */
  function setTheme(th) {
    theme = th;
  }

  /* ------------------------------------------------------------------
     PUBLIC: clear
     ------------------------------------------------------------------ */
  function clearAll() {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      root.remove(it.mesh);
      try { it.mesh.dispose(); } catch (e) { /* noop */ }
    }
    items.length = 0;
  }

  /* ------------------------------------------------------------------
     PUBLIC: build
     Scatter voxel islands around the track, some floating high, some
     near the ground, some mid-height. Deterministic per seed.
     ------------------------------------------------------------------ */
  function build(level, seed) {
    clearAll();
    if (!level || level.count < 2) return;

    rng = mulberry32((seed >>> 0) ^ 0xC0FFEE);

    const N = level.count;
    // Scenery count scales with track length but stays bounded.
    const total = clamp(Math.round(N * 0.35 * density), 4, 30);

    for (let i = 0; i < total; i++) {
      const anchor = Math.min(N - 1, Math.floor((i / total) * N));

      const bx = level.x[anchor];
      const by = level.y[anchor];
      const bz = level.z[anchor];

      /* --- Pick a builder --- */
      const roll = rng();
      let voxels;
      let baseScale;
      if (roll < 0.55) {
        voxels = buildTreeIsland(rng);
        baseScale = 0.80 + rng() * 0.55;
      } else if (roll < 0.85) {
        voxels = buildRockIsland(rng);
        baseScale = 0.75 + rng() * 0.55;
      } else {
        voxels = buildTinyRock(rng);
        baseScale = 0.65 + rng() * 0.55;
      }

      const mesh = makeInstanced(voxels);
      if (!mesh) continue;

      /* --- Position around the track, alternating sides --- */
      const sideSign = (i % 2 === 0) ? 1 : -1;
      // Push islands further out so they read as scenery, not obstacles.
      const sideDist = 14 + rng() * 14;                 // was 7..19, now 14..28
      const aheadBias = (rng() - 0.5) * 12;             // more Z spread
      const px = bx + sideSign * sideDist + (rng() - 0.5) * 4;
      const pz = bz + aheadBias;

      /* --- Height band --- */
      const heightRoll = rng();
      let py;
      if (heightRoll < 0.55) {
        // floating high, above the track
        py = 3.0 + rng() * 5.0 + by * 0.5;
      } else if (heightRoll < 0.82) {
        // mid-height, near the track
        py = 1.2 + rng() * 2.0 + by * 0.3;
      } else {
        // close to the ground
        py = -1.6 + rng() * 1.4;
      }

      mesh.position.set(px, py, pz);
      mesh.rotation.y = rng() * Math.PI * 2;
      mesh.scale.setScalar(baseScale);

      root.add(mesh);

      items.push({
        mesh,
        baseY: py,
        bobAmp: 0.14 + rng() * 0.42,
        bobSpeed: 0.22 + rng() * 0.5,
        bobPhase: rng() * Math.PI * 2,
        float: heightRoll < 0.82
      });
    }
  }

  /* ------------------------------------------------------------------
     PUBLIC: update
     Gentle vertical bob; cull to a radius around the camera so we
     only animate what the player can see.
     ------------------------------------------------------------------ */
  function update(worldTime, dt, camTarget, pulse) {
    if (!items.length) return;

    const cx = camTarget ? camTarget.x : 0;
    const cz = camTarget ? camTarget.z : 0;
    const cull = 95;
    const cullSq = cull * cull;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dx = it.mesh.position.x - cx;
      const dz = it.mesh.position.z - cz;
      if (dx * dx + dz * dz > cullSq) continue;

      if (it.float) {
        it.mesh.position.y =
          it.baseY + Math.sin(worldTime * it.bobSpeed + it.bobPhase) * it.bobAmp;
      }
    }
  }

  return { setTheme, build, update, root, clear: clearAll };
}
