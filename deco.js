// deco.js — procedural scenery for Prism s-tile
//
// Exports createDecoSystem(scene, opts) which returns an object with:
//   .setTheme(theme)             — recolour everything to match the palette
//   .build(level, seed)          — clear + scatter deco along the track
//   .update(worldTime, dt, cam, pulse) — animate deco (bob / spin)
//   .root                         — the parent THREE.Group (optional)
//
// Every decoration is built from a small, hand-authored "builder" that
// returns a Group plus an optional per-frame update. The builders cover
// crystals, pillars, arches, floating rings, monoliths, stacks and more.
// Layout is deterministic per song seed so replays look identical.

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
   createDecoSystem
   ================================================================== */
export function createDecoSystem(scene, opts = {}) {
  const density = opts.density != null ? opts.density : 1;

  const root = new THREE.Group();
  root.name = 'decoRoot';
  scene.add(root);

  /* ---- Shared toon ramp (same 3-tone ramp the game uses) ---- */
  const gradData = new Uint8Array([104, 178, 255]);
  const gradientMap = new THREE.DataTexture(gradData, 3, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;

  /* ---- Shared outline material (back-face silhouette trick) ---- */
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x33304a,
    side: THREE.BackSide,
    depthWrite: true
  });

  /* ---- Geometry cache — everything is a unit shape, scaled per instance ---- */
  const geos = {
    octa:   new THREE.OctahedronGeometry(1, 0),
    icosa:  new THREE.IcosahedronGeometry(1, 0),
    tetra:  new THREE.TetrahedronGeometry(1, 0),
    box:    new THREE.BoxGeometry(1, 1, 1),
    cyl:    new THREE.CylinderGeometry(1, 1, 1, 10),
    cone:   new THREE.ConeGeometry(1, 1, 7),
    sphere: new THREE.SphereGeometry(1, 12, 8),
    torus:  new THREE.TorusGeometry(1, 0.16, 8, 24),
    torusHalf: new THREE.TorusGeometry(1, 0.14, 8, 22, Math.PI),
    ring:   new THREE.TorusGeometry(1, 0.06, 8, 32)
  };

  /* ---- State ---- */
  let theme = null;
  let items = [];
  let rng = mulberry32(1);

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */

  function toonMat(color) {
    return new THREE.MeshToonMaterial({
      color: color.clone(),
      gradientMap
    });
  }

  // Attach a slightly-larger back-face copy as a child to give the
  // shape a clean illustrated outline.
  function outlineFor(mesh, geo, factor) {
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.setScalar(factor != null ? factor : 1.06);
    mesh.add(o);
  }

  /* ==================================================================
     BUILDERS
     Each builder takes (color, rng) and returns
       { mesh: THREE.Group|THREE.Mesh,
         float: bool,               // true → placed up in the air
         update: fn(t) | null }     // optional per-frame animation
     ================================================================== */

  /* --- 1. Crystal cluster — a small fan of tilted octahedra --- */
  function bCrystal(color, rng) {
    const g = new THREE.Group();
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const h = 1.6 + rng() * 3.4;
      const w = 0.38 + rng() * 0.48;
      const m = new THREE.Mesh(geos.octa, toonMat(color));
      m.scale.set(w, h, w);
      m.position.set((rng() - 0.5) * 1.4, h * 0.5, (rng() - 0.5) * 1.4);
      m.rotation.y = rng() * Math.PI * 2;
      m.rotation.z = (rng() - 0.5) * 0.20;
      outlineFor(m, geos.octa, 1.05);
      g.add(m);
    }
    return { mesh: g, float: false };
  }

  /* --- 2. Pillar — a tall column with a wider cap --- */
  function bPillar(color, rng) {
    const g = new THREE.Group();
    const h = 3.5 + rng() * 6.0;
    const w = 0.65 + rng() * 0.60;

    const body = new THREE.Mesh(geos.box, toonMat(color));
    body.scale.set(w, h, w);
    body.position.y = h / 2;
    outlineFor(body, geos.box, 1.04);
    g.add(body);

    const capCol = color.clone().offsetHSL(0, 0.04, 0.12);
    const cap = new THREE.Mesh(geos.box, toonMat(capCol));
    cap.scale.set(w * 1.42, 0.5, w * 1.42);
    cap.position.y = h + 0.22;
    outlineFor(cap, geos.box, 1.05);
    g.add(cap);

    return { mesh: g, float: false };
  }

  /* --- 3. Arch — a half-torus standing on the ground --- */
  function bArch(color, rng) {
    const g = new THREE.Group();
    const r = 1.6 + rng() * 1.8;

    const arch = new THREE.Mesh(geos.torusHalf, toonMat(color));
    arch.scale.setScalar(r);
    arch.position.y = r * 0.9;
    outlineFor(arch, geos.torusHalf, 1.10);
    g.add(arch);

    // Optional pendant hanging inside the arch
    if (rng() < 0.55) {
      const orn = new THREE.Mesh(geos.octa, toonMat(color.clone().offsetHSL(0, 0.05, 0.14)));
      orn.scale.setScalar(0.42 + rng() * 0.35);
      orn.position.y = r * 0.65;
      outlineFor(orn, geos.octa, 1.08);
      g.add(orn);
    }
    return { mesh: g, float: false };
  }

  /* --- 4. Orb ring — a floating sphere with a tilted ring --- */
  function bOrbRing(color, rng) {
    const g = new THREE.Group();
    const r = 1.1 + rng() * 1.2;

    const orb = new THREE.Mesh(geos.sphere, toonMat(color));
    orb.scale.setScalar(r * 0.55);
    outlineFor(orb, geos.sphere, 1.06);
    g.add(orb);

    const ring = new THREE.Mesh(geos.ring, toonMat(color.clone().offsetHSL(0, -0.08, 0.08)));
    ring.scale.setScalar(r);
    ring.rotation.x = Math.PI / 2 + (rng() - 0.5) * 0.5;
    ring.rotation.z = (rng() - 0.5) * 0.7;
    g.add(ring);

    const spin = 0.30 + rng() * 0.55;
    const orbSpin = 0.15 + rng() * 0.30;
    return {
      mesh: g,
      float: true,
      update: (t) => {
        ring.rotation.z += 0.006 * spin;
        orb.rotation.y  += 0.004 * orbSpin;
      }
    };
  }

  /* --- 5. Spire — a lone cone shooting out of the ground --- */
  function bSpire(color, rng) {
    const g = new THREE.Group();
    const h = 2.8 + rng() * 5.5;
    const m = new THREE.Mesh(geos.cone, toonMat(color));
    m.scale.set(0.65 + rng() * 0.4, h, 0.65 + rng() * 0.4);
    m.position.y = h / 2;
    outlineFor(m, geos.cone, 1.06);
    g.add(m);
    return { mesh: g, float: false };
  }

  /* --- 6. Stack — a tower of shrinking cubes --- */
  function bStack(color, rng) {
    const g = new THREE.Group();
    const n = 2 + Math.floor(rng() * 3);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const s = 1.25 - i * 0.16 + rng() * 0.28;
      const col = color.clone().offsetHSL(0, 0, i * 0.035);
      const m = new THREE.Mesh(geos.box, toonMat(col));
      m.scale.set(s, 0.58, s);
      m.position.y = y + 0.29;
      m.rotation.y = rng() * Math.PI * 0.5;
      outlineFor(m, geos.box, 1.05);
      g.add(m);
      y += 0.58;
    }
    return { mesh: g, float: false };
  }

  /* --- 7. Diamond on a pole — classic landmark shape --- */
  function bDiamondPole(color, rng) {
    const g = new THREE.Group();
    const h = 2.0 + rng() * 3.2;
    const poleCol = color.clone().offsetHSL(0, -0.16, -0.06);

    const pole = new THREE.Mesh(geos.cyl, toonMat(poleCol));
    pole.scale.set(0.11, h, 0.11);
    pole.position.y = h / 2;
    outlineFor(pole, geos.cyl, 1.14);
    g.add(pole);

    const d = new THREE.Mesh(geos.octa, toonMat(color));
    d.scale.setScalar(0.65 + rng() * 0.45);
    d.position.y = h + 0.6;
    outlineFor(d, geos.octa, 1.06);
    g.add(d);

    const spin = 0.55 + rng() * 0.7;
    return {
      mesh: g,
      float: false,
      update: (t) => { d.rotation.y = t * spin; }
    };
  }

  /* --- 8. Tetrahedron pile — a scattered cluster --- */
  function bTets(color, rng) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const s = 0.5 + rng() * 0.85;
      const col = color.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.10);
      const m = new THREE.Mesh(geos.tetra, toonMat(col));
      m.scale.setScalar(s);
      m.position.set((rng() - 0.5) * 2.6, s * 0.55, (rng() - 0.5) * 2.6);
      m.rotation.set(rng() * 6, rng() * 6, rng() * 6);
      outlineFor(m, geos.tetra, 1.06);
      g.add(m);
    }
    return { mesh: g, float: false };
  }

  /* --- 9. Float ring — a big rotating torus in the air --- */
  function bFloatRing(color, rng) {
    const g = new THREE.Group();
    const r = 1.4 + rng() * 1.6;

    const m = new THREE.Mesh(geos.torus, toonMat(color));
    m.scale.setScalar(r);
    m.rotation.x = Math.PI / 2 + (rng() - 0.5) * 0.4;
    outlineFor(m, geos.torus, 1.08);
    g.add(m);

    const tilt = (rng() - 0.5) * 0.4;
    const spin = 0.35 + rng() * 0.45;
    return {
      mesh: g,
      float: true,
      update: (t) => {
        m.rotation.y = t * spin;
        m.rotation.z = tilt + Math.sin(t * 0.6) * 0.25;
      }
    };
  }

  /* --- 10. Monolith — a thin rectangular slab --- */
  function bMonolith(color, rng) {
    const g = new THREE.Group();
    const h = 4.5 + rng() * 4.5;
    const w = 0.55 + rng() * 0.55;
    const d = 0.35 + rng() * 0.45;

    const m = new THREE.Mesh(geos.box, toonMat(color));
    m.scale.set(w, h, d);
    m.position.y = h / 2;
    m.rotation.y = rng() * Math.PI;
    outlineFor(m, geos.box, 1.04);
    g.add(m);

    return { mesh: g, float: false };
  }

  /* --- 11. Icosahedron cluster — low rounded boulders --- */
  function bBoulders(color, rng) {
    const g = new THREE.Group();
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const s = 0.9 + rng() * 1.1;
      const col = color.clone().offsetHSL(0, -0.05, (rng() - 0.5) * 0.10);
      const m = new THREE.Mesh(geos.icosa, toonMat(col));
      m.scale.set(s, s * (0.7 + rng() * 0.4), s);
      m.position.set((rng() - 0.5) * 2.4, s * 0.5, (rng() - 0.5) * 2.4);
      m.rotation.set(rng() * 6, rng() * 6, rng() * 6);
      outlineFor(m, geos.icosa, 1.06);
      g.add(m);
    }
    return { mesh: g, float: false };
  }

  /* --- 12. Sky lantern — a small orb floating high above --- */
  function bSkyLantern(color, rng) {
    const g = new THREE.Group();
    const r = 0.45 + rng() * 0.35;

    const orb = new THREE.Mesh(geos.sphere, toonMat(color));
    orb.scale.setScalar(r);
    outlineFor(orb, geos.sphere, 1.10);
    g.add(orb);

    // A little dark tassel below
    const t = new THREE.Mesh(geos.cyl, toonMat(color.clone().offsetHSL(0, -0.2, -0.25)));
    t.scale.set(0.06, 0.55, 0.06);
    t.position.y = -r - 0.30;
    g.add(t);

    const spin = 0.6 + rng() * 0.6;
    return {
      mesh: g,
      float: true,
      update: (t) => { orb.rotation.y = t * spin; }
    };
  }

  /* ---- The full menu of builders ---- */
  const BUILDERS = [
    bCrystal,
    bPillar,
    bArch,
    bOrbRing,
    bSpire,
    bStack,
    bDiamondPole,
    bTets,
    bFloatRing,
    bMonolith,
    bBoulders,
    bSkyLantern
  ];

  /* ==================================================================
     PUBLIC API
     ================================================================== */

  /* -- Recolour every existing decoration to the current palette -- */
  function setTheme(th) {
    theme = th;
    outlineMat.color.copy(th.ink);

    if (!items.length) return;

    const recolRnd = mulberry32((th.seed >>> 0) ^ 0x77aa11);
    const pal = th.tiles;

    for (const it of items) {
      const col = pal[Math.floor(recolRnd() * pal.length)];
      it.mesh.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (!m || m === outlineMat) return;
        if (!m.color) return;
        m.color.copy(col);
      });
    }
  }

  /* -- Remove every decoration and dispose materials -- */
  function clearAll() {
    for (const it of items) {
      root.remove(it.mesh);
      it.mesh.traverse((o) => {
        if (o.isMesh && o.material && o.material !== outlineMat) {
          o.material.dispose();
        }
      });
    }
    items.length = 0;
  }

  /* -- Scatter fresh scenery along a level -- */
  function build(level, seed) {
    clearAll();
    if (!theme) return;
    if (!level || level.count < 2) return;

    rng = mulberry32((seed >>> 0) ^ 0xC0FFEE);

    const pal = theme.tiles;
    const N = level.count;

    // How many pieces of scenery to place. Scales with song length
    // but stays bounded so we never wreck performance on a long mix.
    const total = clamp(Math.round(N * 0.85 * density), 8, 120);

    // Walk the track and drop scenery to alternating sides, with a
    // sprinkle of far-away silhouettes and a few high sky lanterns.
    for (let i = 0; i < total; i++) {
      const anchor = Math.min(N - 1, Math.floor((i / total) * N));

      const bx = level.x[anchor];
      const by = level.y[anchor];
      const bz = level.z[anchor];

      // Every third item is a distant silhouette — pushed far out
      // laterally and slightly ahead/behind, for a sense of scale.
      const isFar    = (i % 3 === 2);
      const isSky    = !isFar && rng() < 0.10;

      const sideSign = (i % 2 === 0) ? 1 : -1;
      let sideDist;
      if (isFar)      sideDist = 26 + rng() * 22;
      else if (isSky) sideDist = 10 + rng() * 10;
      else            sideDist = 6 + rng() * 12;

      const px = bx + sideSign * sideDist + (rng() - 0.5) * 4.0;
      const pz = bz + (rng() - 0.5) * 7.0;

      // Pick a builder — far ones are only the tall / big shapes so
      // they read clearly through the fog.
      let builder;
      if (isFar) {
        builder = [bPillar, bMonolith, bSpire, bArch][Math.floor(rng() * 4)];
      } else if (isSky) {
        builder = [bSkyLantern, bFloatRing, bOrbRing][Math.floor(rng() * 3)];
      } else {
        builder = BUILDERS[Math.floor(rng() * BUILDERS.length)];
      }

      const color = pal[Math.floor(rng() * pal.length)].clone();
      const built = builder(color, rng);
      const g = built.mesh;

      // Vertical placement
      let py;
      if (built.float) {
        py = 3.5 + rng() * 6.5;            // hover in the air
      } else if (isFar) {
        py = -0.4;
      } else {
        py = -0.4 + (rng() - 0.5) * 0.6;   // sit on the ground with a bit of jitter
      }
      // Nudge up if the track itself is already elevated there
      if (!built.float && !isFar) py += Math.min(0.6, by * 0.10);

      g.position.set(px, py, pz);
      g.rotation.y = rng() * Math.PI * 2;

      // Scale: near items a little bigger, far items very big
      let s;
      if (isFar)      s = 2.0 + rng() * 1.6;
      else if (isSky) s = 0.85 + rng() * 0.55;
      else            s = 0.75 + rng() * 0.95;
      g.scale.setScalar(s);

      root.add(g);

      items.push({
        mesh: g,
        baseY: py,
        bobAmp:   built.float ? (0.20 + rng() * 0.50) : (0.04 + rng() * 0.14),
        bobSpeed: 0.30 + rng() * 0.80,
        bobPhase: rng() * Math.PI * 2,
        update:   built.update || null,
        far:      isFar
      });
    }
  }

  /* -- Per-frame animation (bob + gentle spin) -- */
  function update(worldTime, dt, camTarget, pulse) {
    if (!theme || !items.length) return;

    // Cull to a bubble around the camera — no point animating scenery
    // the player can't see.
    const cx = camTarget ? camTarget.x : 0;
    const cz = camTarget ? camTarget.z : 0;
    const cull = 78;
    const cullSq = cull * cull;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dx = it.mesh.position.x - cx;
      const dz = it.mesh.position.z - cz;
      if (dx * dx + dz * dz > cullSq) continue;

      const s = it.bobSpeed;
      const p = it.bobPhase;
      it.mesh.position.y = it.baseY + Math.sin(worldTime * s + p) * it.bobAmp;

      if (it.update) it.update(worldTime);
    }
  }

  /* ---- Return the public surface ---- */
  return { setTheme, build, update, root, clear: clearAll };
}
