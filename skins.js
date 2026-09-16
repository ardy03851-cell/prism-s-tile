// skins.js — Skins catalog, model factories, and dressing-room editor.
//
// Add a new skin by appending an object to the SKINS array. Nothing
// else in the project needs to change.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const PLAYER_R = 0.62;

/* ============================================================
   MODEL FACTORIES — single geometry so the BackSide outline works
   ============================================================ */
function mkBlob() {
  const g = new THREE.SphereGeometry(PLAYER_R * 1.05, 16, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 3.1) * Math.cos(y * 2.7) * Math.sin(z * 3.3) * 0.07;
    p.setXYZ(i, x * (1 + n), y * (1 + n), z * (1 + n));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

const MODEL_DEFS = {
  octahedron:   { make: () => new THREE.OctahedronGeometry(PLAYER_R, 0),                                    outline: 1.10 },
  diamond:      { make: () => { const g = new THREE.OctahedronGeometry(PLAYER_R, 0); g.scale(1,1.4,1); return g; }, outline: 1.10 },
  cube:         { make: () => new THREE.BoxGeometry(PLAYER_R*1.55, PLAYER_R*1.55, PLAYER_R*1.55),            outline: 1.08 },
  sphere:       { make: () => new THREE.SphereGeometry(PLAYER_R*1.05, 14, 12),                              outline: 1.10 },
  icosahedron:  { make: () => new THREE.IcosahedronGeometry(PLAYER_R, 0),                                   outline: 1.10 },
  dodecahedron: { make: () => new THREE.DodecahedronGeometry(PLAYER_R, 0),                                  outline: 1.10 },
  tetrahedron:  { make: () => new THREE.TetrahedronGeometry(PLAYER_R*1.30, 0),                              outline: 1.14 },
  torus:        { make: () => new THREE.TorusGeometry(PLAYER_R*0.85, PLAYER_R*0.36, 10, 22),                outline: 1.16 },
  cone:         { make: () => new THREE.ConeGeometry(PLAYER_R*0.95, PLAYER_R*2.15, 8),                      outline: 1.10 },
  crystal:      { make: () => new THREE.CylinderGeometry(PLAYER_R*0.72, PLAYER_R*0.72, PLAYER_R*2.2, 6, 1),  outline: 1.10 },
  blob:         { make: mkBlob,                                                                             outline: 1.10 },
  gem:          { make: () => new THREE.IcosahedronGeometry(PLAYER_R, 1),                                   outline: 1.08 },
  star:         { make: () => new THREE.OctahedronGeometry(PLAYER_R*1.15, 0),                               outline: 1.12 },
};

/* ============================================================
   SKIN CATALOG
   ============================================================ */
export const SKINS = [
  { id:'ember',  name:'Classic Ember',  desc:'The original spark. Warm, round, ready.',
    model:'octahedron',   primary:0xff8a68, secondary:0xffd9c2, accent:0xffb090,
    trail:{ color:0xff8a68, opacity:0.16, size:1.00 }, burst:{ color:0xffb090 } },

  { id:'jade',   name:'Jade Prism',     desc:'Cool, faceted, and impossibly precise.',
    model:'diamond',      primary:0x4fd6a8, secondary:0xd6f7ec, accent:0xa8f0d6,
    trail:{ color:0x4fd6a8, opacity:0.14, size:0.95 }, burst:{ color:0xa8f0d6 } },

  { id:'bubble', name:'Bubble',         desc:'Soft, squishy, and irresistibly bouncy.',
    model:'blob',         primary:0x8db8ea, secondary:0xdbe9f8, accent:0xc6dcf7,
    trail:{ color:0x8db8ea, opacity:0.14, size:1.15 }, burst:{ color:0xc6dcf7 } },

  { id:'dice',   name:'Lucky Dice',     desc:'Roll the beat. Trust the rhythm.',
    model:'cube',         primary:0xffffff, secondary:0xff6b8a, accent:0xff6b8a,
    trail:{ color:0xff6b8a, opacity:0.14, size:1.00 }, burst:{ color:0xff6b8a } },

  { id:'void',   name:'Void Shard',     desc:'A splinter of something darker.',
    model:'tetrahedron',  primary:0x5a4a9a, secondary:0x8a7ac8, accent:0xb8a8f0,
    trail:{ color:0x8a7ac8, opacity:0.18, size:0.95 }, burst:{ color:0xb8a8f0 } },

  { id:'beach',  name:'Beach Ball',     desc:'Every day is a holiday with this one.',
    model:'sphere',       primary:0xff6b8a, secondary:0xfff0d0, accent:0x7ed6ba,
    trail:{ color:0xff6b8a, opacity:0.14, size:1.05 }, burst:{ color:0x7ed6ba } },

  { id:'frost',  name:'Frost Crystal',  desc:'Chiselled, cold, and very precise.',
    model:'crystal',      primary:0xa8d8ff, secondary:0xffffff, accent:0xe0f0ff,
    trail:{ color:0xa8d8ff, opacity:0.16, size:0.90 }, burst:{ color:0xe0f0ff } },

  { id:'donut',  name:'Donut',          desc:'Sweet loop. Goes round and round.',
    model:'torus',        primary:0xff9ec4, secondary:0xffe9c4, accent:0xffd6a8,
    trail:{ color:0xff9ec4, opacity:0.14, size:1.10 }, burst:{ color:0xffd6a8 } },

  { id:'rocket', name:'Rocket',         desc:'Pointy, fast, and full of thrust.',
    model:'cone',         primary:0xff7a89, secondary:0xffffff, accent:0xffd166,
    trail:{ color:0xff7a89, opacity:0.18, size:1.00 }, burst:{ color:0xffd166 } },

  { id:'gem',    name:'Rainbow Gem',    desc:'Cut from a dozen colours at once.',
    model:'gem',          primary:0xb88aff, secondary:0xffffff, accent:0xffb8d6,
    trail:{ color:0xb88aff, opacity:0.15, size:0.95 }, burst:{ color:0xffb8d6 } },

  { id:'star',   name:'Star',           desc:'Stellated and shiny. A little loud.',
    model:'star',         primary:0xffe066, secondary:0xffffff, accent:0xfff3a8,
    trail:{ color:0xffe066, opacity:0.18, size:0.90 }, burst:{ color:0xfff3a8 } },

  { id:'nebula', name:'Nebula',         desc:'A pocket of deep space. Quietly huge.',
    model:'icosahedron',  primary:0x5f4fc4, secondary:0xa88aff, accent:0xff8ad6,
    trail:{ color:0xa88aff, opacity:0.20, size:1.10 }, burst:{ color:0xff8ad6 } },
];

export function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

/* ============================================================
   PLAYER MESH BUILDER — used by both the game and the preview
   ============================================================ */
export function buildPlayerMesh(skin, gradientMap, outlineMat, radiusOverride) {
  const r = radiusOverride != null ? radiusOverride : PLAYER_R;
  const def = MODEL_DEFS[skin.model] || MODEL_DEFS.octahedron;
  // Build with the requested radius by rebuilding the model def's
  // factory against the default radius, then scaling.
  const geo = def.make();
  if (r !== PLAYER_R) geo.scale(r / PLAYER_R, r / PLAYER_R, r / PLAYER_R);

  const mat = new THREE.MeshToonMaterial({ color: skin.primary, gradientMap });
  const mesh = new THREE.Mesh(geo, mat);

  const outline = new THREE.Mesh(geo, outlineMat);
  outline.scale.setScalar(def.outline);
  mesh.add(outline);
  mesh.userData.outline = outline;

  return mesh;
}

/* ============================================================
   DRESSING-ROOM EDITOR
   ============================================================ */
export function createSkinEditor(opts = {}) {
  const onApply = opts.onApply || (() => {});
  const onClose = opts.onClose || (() => {});

  /* ---- DOM ---- */
  const el = document.createElement('div');
  el.id = 'skinsEditor';
  el.className = 'screen hidden';
  el.innerHTML = `
    <div class="skins-room">
      <div class="skins-stage">
        <canvas class="skins-canvas"></canvas>
        <div class="skins-stage-name" id="skinStageName">—</div>
        <div class="skins-stage-desc" id="skinStageDesc"></div>
      </div>
      <div class="skins-shelf">
        <div class="skin-cards" id="skinCards"></div>
        <div class="skins-actions">
          <button class="btn ghost" id="skinCloseBtn">Close</button>
          <button class="btn primary" id="skinApplyBtn">Wear this</button>
        </div>
      </div>
    </div>
  `;

  const canvas    = el.querySelector('.skins-canvas');
  const cardsEl   = el.querySelector('#skinCards');
  const stageName = el.querySelector('#skinStageName');
  const stageDesc = el.querySelector('#skinStageDesc');
  const closeBtn  = el.querySelector('#skinCloseBtn');
  const applyBtn  = el.querySelector('#skinApplyBtn');

  /* ---- Preview scene ---- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(1.45, 1.30, 2.75);
  camera.lookAt(0, 0.15, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 2.05));
  const key = new THREE.DirectionalLight(0xffffff, 2.25); key.position.set(2, 3, 3);  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd8c0, 1.05); rim.position.set(-2, 1, -2); scene.add(rim);

  const gradData = new Uint8Array([104, 178, 255]);
  const gradMap = new THREE.DataTexture(gradData, 3, 1, THREE.RedFormat);
  gradMap.minFilter = THREE.NearestFilter;
  gradMap.magFilter = THREE.NearestFilter;
  gradMap.generateMipmaps = false;
  gradMap.needsUpdate = true;

  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x33304a, side: THREE.BackSide });

  /* Pedestal */
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.90, 1.00, 0.14, 40),
    new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradMap })
  );
  pedestal.position.y = -0.58;
  scene.add(pedestal);

  const pedestalRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.90, 0.035, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x33304a })
  );
  pedestalRim.rotation.x = Math.PI / 2;
  pedestalRim.position.y = -0.51;
  scene.add(pedestalRim);

  /* Preview mesh state */
  let previewMesh = null;
  let previewSkin = null;
  let swapProgress = 1;

  function setPreviewSkin(skin, animate) {
    if (previewMesh) {
      scene.remove(previewMesh);
      if (previewMesh.geometry) previewMesh.geometry.dispose();
      if (previewMesh.material) previewMesh.material.dispose();
    }
    previewSkin = skin;
    previewMesh = buildPlayerMesh(skin, gradMap, outlineMat, PLAYER_R);
    previewMesh.position.y = 0.10;
    scene.add(previewMesh);

    swapProgress = animate === false ? 1 : 0;

    stageName.textContent = skin.name;
    stageDesc.textContent = skin.desc || '';

    for (const c of cardsEl.querySelectorAll('.skin-card')) {
      c.classList.toggle('selected', c.dataset.id === skin.id);
    }
    // Re-trigger the selected card's scale-in animation
    const sel = cardsEl.querySelector('.skin-card.selected');
    if (sel) { sel.classList.remove('pop'); void sel.offsetWidth; sel.classList.add('pop'); }
  }

  /* ---- Cards ---- */
  const hex = n => '#' + n.toString(16).padStart(6, '0');

  function buildCards() {
    cardsEl.innerHTML = '';
    SKINS.forEach((skin, i) => {
      const card = document.createElement('button');
      card.className = 'skin-card';
      card.dataset.id = skin.id;
      card.style.setProperty('--skin-primary',   hex(skin.primary));
      card.style.setProperty('--skin-secondary', hex(skin.secondary));
      card.style.setProperty('--skin-accent',    hex(skin.accent));
      card.style.animationDelay = (i * 0.025) + 's';
      card.innerHTML = `
        <span class="skin-card-swatch"><span class="skin-card-shape"></span></span>
        <span class="skin-card-name">${skin.name}</span>
      `;
      card.addEventListener('click', () => {
        if (previewSkin && previewSkin.id === skin.id) return;
        setPreviewSkin(skin, true);
      });
      cardsEl.appendChild(card);
    });
  }
  buildCards();

  /* ---- Actions ---- */
  let closingTimer = 0;
  closeBtn.addEventListener('click', () => { close(); onClose(); });
  applyBtn.addEventListener('click', () => {
    if (!previewSkin) { close(); onClose(); return; }
    onApply(previewSkin);
    // quick confirmation bow before closing
    applyBtn.textContent = 'Applied!';
    applyBtn.disabled = true;
    clearTimeout(closingTimer);
    closingTimer = setTimeout(() => {
      applyBtn.textContent = 'Wear this';
      applyBtn.disabled = false;
      close();
      onClose();
    }, 380);
  });

  /* ---- Loop ---- */
  let raf = 0, active = false, t = 0, last = performance.now();

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!active) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    /* Resize canvas to display size */
    const w = Math.max(1, canvas.clientWidth | 0);
    const h = Math.max(1, canvas.clientHeight | 0);
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    if (previewMesh) {
      // Base rotation
      previewMesh.rotation.y += dt * 1.15;

      // Springy swap animation
      if (swapProgress < 1) {
        swapProgress = Math.min(1, swapProgress + dt * 3.8);
        const ease = 1 - Math.pow(1 - swapProgress, 3);
        previewMesh.scale.setScalar(0.42 + 0.58 * ease);
        previewMesh.rotation.y += (1 - ease) * 8.5 * dt;
      } else {
        previewMesh.scale.setScalar(1);
      }

      // Gentle bob
      previewMesh.position.y = 0.10 + Math.sin(t * 1.55) * 0.05;
    }

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  /* ---- Public open/close ---- */
  function open(initialId) {
    const skin = getSkin(initialId || (previewSkin && previewSkin.id) || SKINS[0].id);
    setPreviewSkin(skin, false);
    el.classList.remove('hidden');
    active = true;
    last = performance.now();
  }
  function close() {
    el.classList.add('hidden');
    active = false;
  }

  return {
    element: el,
    open,
    close,
    getSelected: () => previewSkin,
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}
