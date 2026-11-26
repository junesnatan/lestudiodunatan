import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ROOM, OPENINGS, OUTLETS } from './planData.js';

function createTextSprite(text, bgColor = 'rgba(20, 18, 16, 0.86)', textColor = '#f5f2ec') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(16, 22, 480, 84, 42);
  ctx.fill();

  ctx.strokeStyle = 'rgba(216, 155, 86, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = '600 36px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 65);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.95, 0.24, 1);
  return sprite;
}

function addWallBox(parent, mat, x0, x1, y0, y1, z0, z1, cast = true, receive = true) {
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  const d = Math.abs(z1 - z0);
  if (w < 0.001 || h < 0.001 || d < 0.001) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function addBaseboard(parent, mat, x0, x1, z0, z1) {
  const h = 0.085;
  return addWallBox(parent, mat, x0, x1, 0, h, z0, z1, false, true);
}

function buildDoor(cfg, materials) {
  const group = new THREE.Group();
  const frameDepth = ROOM.intWallT + 0.028;
  const frameW = 0.042;

  // Door frame jambs & header
  const leftJamb = new THREE.Mesh(
    new THREE.BoxGeometry(frameW, cfg.height + frameW, frameDepth),
    materials.doorFrame
  );
  leftJamb.position.set(cfg.xMin - frameW / 2 + 0.01, (cfg.height + frameW) / 2, cfg.z);
  leftJamb.castShadow = true;
  leftJamb.receiveShadow = true;
  group.add(leftJamb);

  const rightJamb = new THREE.Mesh(
    new THREE.BoxGeometry(frameW, cfg.height + frameW, frameDepth),
    materials.doorFrame
  );
  rightJamb.position.set(cfg.xMax + frameW / 2 - 0.01, (cfg.height + frameW) / 2, cfg.z);
  rightJamb.castShadow = true;
  rightJamb.receiveShadow = true;
  group.add(rightJamb);

  const topJamb = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.width + frameW * 2, frameW, frameDepth),
    materials.doorFrame
  );
  topJamb.position.set((cfg.xMin + cfg.xMax) / 2, cfg.height + frameW / 2, cfg.z);
  topJamb.castShadow = true;
  group.add(topJamb);

  // Brass threshold
  const thresh = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.width, 0.008, 0.07),
    materials.brass
  );
  thresh.position.set((cfg.xMin + cfg.xMax) / 2, 0.004, cfg.z);
  thresh.receiveShadow = true;
  group.add(thresh);

  // Articulated pivot at hinge edge
  const pivot = new THREE.Group();
  pivot.position.set(cfg.hingeX, 0, cfg.z);
  group.add(pivot);

  const dir = cfg.hingeSide === 'right' ? -1 : 1;
  const leafW = cfg.width - 0.012;
  const leafH = cfg.height - 0.01;
  const leafT = 0.042;

  const leafMesh = new THREE.Mesh(
    new RoundedBoxGeometry(leafW, leafH, leafT, 2, 0.004),
    cfg.id === 'door-entree' ? materials.entranceDoor : materials.interiorDoor
  );
  leafMesh.position.set(dir * (leafW / 2 + 0.004), leafH / 2 + 0.005, 0);
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;
  leafMesh.userData.interactId = cfg.id;
  pivot.add(leafMesh);

  // Subtle recessed architectural trim panels on both sides of door leaf
  for (const py of [0.55, 1.48]) {
    const pH = py < 1 ? 0.68 : 0.82;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(leafW * 0.68, pH, leafT + 0.006),
      materials.doorInset
    );
    panel.position.set(dir * (leafW / 2 + 0.004), py, 0);
    panel.userData.interactId = cfg.id;
    pivot.add(panel);
  }

  // Brass lever handles on both faces
  const handleX = dir * (leafW - 0.075);
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.14, 0.008),
      materials.brass
    );
    plate.position.set(handleX, 1.02, side * (leafT / 2 + 0.004));
    pivot.add(plate);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.036, 12),
      materials.brass
    );
    neck.rotation.x = Math.PI / 2;
    neck.position.set(handleX, 1.04, side * (leafT / 2 + 0.022));
    pivot.add(neck);

    const lever = new THREE.Mesh(
      new RoundedBoxGeometry(0.115, 0.018, 0.016, 2, 0.005),
      materials.brass
    );
    lever.position.set(handleX - dir * 0.045, 1.04, side * (leafT / 2 + 0.04));
    lever.userData.interactId = cfg.id;
    pivot.add(lever);
  }

  const initialOpen = Boolean(cfg.defaultOpen);
  pivot.rotation.y = initialOpen ? cfg.openAngle : 0;

  return {
    id: cfg.id,
    label: cfg.label,
    cfg,
    group,
    pivot,
    isOpen: initialOpen,
    currentAngle: pivot.rotation.y,
    targetAngle: pivot.rotation.y,
    toggle() {
      this.isOpen = !this.isOpen;
      this.targetAngle = this.isOpen ? cfg.openAngle : 0;
      return this.isOpen;
    },
    update(dt) {
      this.currentAngle += (this.targetAngle - this.currentAngle) * Math.min(1, dt * 8);
      this.pivot.rotation.y = this.currentAngle;
    },
  };
}

function buildSlidingWindow(materials) {
  const cfg = OPENINGS.window;
  const winW = cfg.xMax - cfg.xMin;
  const winH = cfg.topY - cfg.sillY;
  const group = new THREE.Group();

  // Oak interior windowsill
  const sill = new THREE.Mesh(
    new RoundedBoxGeometry(winW + 0.08, 0.036, 0.24, 2, 0.005),
    materials.oak
  );
  sill.position.set((cfg.xMin + cfg.xMax) / 2, cfg.sillY + 0.01, cfg.z + 0.03);
  sill.castShadow = true;
  sill.receiveShadow = true;
  group.add(sill);

  // Outer perimeter aluminum frame
  const fT = 0.045;
  const frameDepth = 0.12;
  const frameZ = cfg.z + 0.07;

  addWallBox(group, materials.windowFrame, cfg.xMin, cfg.xMin + fT, cfg.sillY + 0.02, cfg.topY, frameZ - frameDepth / 2, frameZ + frameDepth / 2);
  addWallBox(group, materials.windowFrame, cfg.xMax - fT, cfg.xMax, cfg.sillY + 0.02, cfg.topY, frameZ - frameDepth / 2, frameZ + frameDepth / 2);
  addWallBox(group, materials.windowFrame, cfg.xMin, cfg.xMax, cfg.topY - fT, cfg.topY, frameZ - frameDepth / 2, frameZ + frameDepth / 2);
  addWallBox(group, materials.windowFrame, cfg.xMin, cfg.xMax, cfg.sillY + 0.02, cfg.sillY + 0.02 + fT, frameZ - frameDepth / 2, frameZ + frameDepth / 2);

  // Two glass sliding panels (left outer track, right inner track)
  const panelW = (winW - fT * 2) * 0.52;
  const panelH = winH - fT * 2 - 0.02;
  const panelY = cfg.sillY + 0.02 + fT + panelH / 2;

  function makeSash(zPos, isMovable) {
    const sash = new THREE.Group();
    sash.position.set(0, panelY, zPos);
    const bar = 0.036;
    // Top / bottom / left / right rails
    for (const rail of [
      addWallBox(sash, materials.windowFrame, -panelW / 2, panelW / 2, panelH / 2 - bar, panelH / 2, -0.018, 0.018),
      addWallBox(sash, materials.windowFrame, -panelW / 2, panelW / 2, -panelH / 2, -panelH / 2 + bar, -0.018, 0.018),
      addWallBox(sash, materials.windowFrame, -panelW / 2, -panelW / 2 + bar, -panelH / 2, panelH / 2, -0.018, 0.018),
      addWallBox(sash, materials.windowFrame, panelW / 2 - bar, panelW / 2, -panelH / 2, panelH / 2, -0.018, 0.018),
    ]) {
      if (rail) rail.userData.interactId = cfg.id;
    }

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(panelW - bar * 2, panelH - bar * 2),
      materials.glass
    );
    glass.castShadow = false;
    glass.userData.interactId = cfg.id;
    sash.add(glass);

    if (isMovable) {
      const handle = new THREE.Mesh(
        new RoundedBoxGeometry(0.018, 0.14, 0.024, 2, 0.005),
        materials.chrome
      );
      handle.position.set(panelW / 2 - 0.022, -0.08, -0.026);
      handle.userData.interactId = cfg.id;
      sash.add(handle);
    }
    return sash;
  }

  const leftSash = makeSash(frameZ + 0.024, false);
  leftSash.position.x = cfg.xMin + fT + panelW / 2;
  group.add(leftSash);

  const rightClosedX = cfg.xMax - fT - panelW / 2;
  const rightOpenX = cfg.xMin + fT + panelW / 2 + 0.06;
  const rightSash = makeSash(frameZ - 0.02, true);
  rightSash.position.x = rightClosedX;
  group.add(rightSash);

  return {
    id: cfg.id,
    label: cfg.label,
    group,
    isOpen: false,
    currentX: rightClosedX,
    targetX: rightClosedX,
    toggle() {
      this.isOpen = !this.isOpen;
      this.targetX = this.isOpen ? rightOpenX : rightClosedX;
      return this.isOpen;
    },
    update(dt) {
      this.currentX += (this.targetX - this.currentX) * Math.min(1, dt * 6.5);
      rightSash.position.x = this.currentX;
    },
  };
}

function buildOutlet(outletCfg, materials) {
  const group = new THREE.Group();
  group.position.set(outletCfg.x, outletCfg.y, outletCfg.z);
  group.rotation.y = outletCfg.rotY;

  const plate = new THREE.Mesh(
    new RoundedBoxGeometry(0.085, 0.085, 0.012, 2, 0.004),
    materials.outletPlastic
  );
  plate.userData.interactId = outletCfg.id;
  group.add(plate);

  const recess = new THREE.Mesh(
    new THREE.CylinderGeometry(0.023, 0.023, 0.008, 24),
    materials.outletRecess
  );
  recess.rotation.x = Math.PI / 2;
  recess.position.z = 0.005;
  recess.userData.interactId = outletCfg.id;
  group.add(recess);

  // French Type-E holes + earth pin + plugged angled plug
  const earthPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0022, 0.0022, 0.012, 8),
    materials.brass
  );
  earthPin.rotation.x = Math.PI / 2;
  earthPin.position.set(0, 0.011, 0.01);
  group.add(earthPin);

  const plugBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.036, 0.042, 0.026, 2, 0.006),
    materials.cableDark
  );
  plugBody.position.set(0, -0.004, 0.018);
  plugBody.userData.interactId = outletCfg.id;
  group.add(plugBody);

  return group;
}

function buildPowerCable(points, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geo = new THREE.TubeGeometry(curve, 24, 0.0045, 8, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function createPleatedCurtainGeometry(width, height, folds, depthAmp, anchorSide = 'left') {
  const geo = new THREE.PlaneGeometry(width, height, 68, 22);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const rawX = pos.getX(i); // -width/2 .. +width/2
    const rawY = pos.getY(i); // -height/2 .. +height/2
    const u = (rawX + width / 2) / width; // 0..1 across width
    const v = 1 - (rawY + height / 2) / height; // 0 at top rod, 1 at bottom hem

    // Shift origin to anchor edge (0..width for left, -width..0 for right)
    const anchoredX = anchorSide === 'left' ? u * width : (u - 1) * width;
    // Slight natural expansion toward the bottom hem
    const flare = 1 + 0.04 * v;
    const wavePhase = u * folds * Math.PI * 2;
    const waveDepth = Math.sin(wavePhase) * depthAmp * (0.62 + 0.38 * Math.sin(v * Math.PI * 0.85));
    // Gentle pinch at top grommets + subtle gravity drape
    const topPinch = (1 - v) * 0.008 * Math.cos(wavePhase);

    pos.setXYZ(i, anchoredX * flare + topPinch, rawY, waveDepth);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildCurtains(textures, materials) {
  const group = new THREE.Group();
  const rodY = 2.45;
  const rodZ = 3.925;
  const xStart = 0.14;
  const xEnd = 2.72;
  const rodSpan = xEnd - xStart;
  const centerX = (xStart + xEnd) / 2; // 1.43

  // Matte-black curtain rod + brass finials + 3 wall brackets
  const mainRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, rodSpan + 0.12, 14),
    materials.windowFrame
  );
  mainRod.rotation.z = Math.PI / 2;
  mainRod.position.set(centerX, rodY, rodZ);
  mainRod.castShadow = true;
  group.add(mainRod);

  for (const fx of [xStart - 0.065, xEnd + 0.065]) {
    const finial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.019, 0.028, 16),
      materials.brass
    );
    finial.rotation.z = Math.PI / 2;
    finial.position.set(fx, rodY, rodZ);
    group.add(finial);
  }

  for (const bx of [xStart + 0.04, centerX, xEnd - 0.04]) {
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.085), materials.windowFrame);
    stem.position.set(bx, rodY, rodZ + 0.036);
    group.add(stem);
    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 14), materials.windowFrame);
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(bx, rodY, 3.996);
    group.add(rosette);
  }

  // 4 tailored wave-pleat curtains:
  // Emerald (left) | Beige (center-left) | Beige (center-right) | Emerald (right)
  const drapeH = 1.67;
  const drapeCenterY = rodY - 0.02 - drapeH / 2;
  const quarterW = rodSpan / 4 + 0.018; // ~0.663 m each with slight seam overlap when closed

  const beigeMat = new THREE.MeshStandardMaterial({
    map: textures.curtainBeige.map,
    bumpMap: textures.curtainBeige.bumpMap,
    bumpScale: 0.008,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const emeraldMat = new THREE.MeshStandardMaterial({
    map: textures.curtainEmerald.map,
    bumpMap: textures.curtainEmerald.bumpMap,
    bumpScale: 0.008,
    roughness: 0.86,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const ringCount = 6;
  const ringGeo = new THREE.TorusGeometry(0.018, 0.0032, 8, 18);

  function makePanel(anchorX, anchorSide, mat, zPos, openScale) {
    const geo = createPleatedCurtainGeometry(quarterW, drapeH, 6, 0.028, anchorSide);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(anchorX, drapeCenterY, zPos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.interactId = 'curtains';
    group.add(mesh);

    const rings = [];
    for (let i = 0; i < ringCount; i++) {
      const r = new THREE.Mesh(ringGeo, materials.brass);
      r.rotation.y = Math.PI / 2;
      r.position.set(anchorX, rodY, rodZ);
      group.add(r);
      rings.push(r);
    }

    return { mesh, rings, anchorX, anchorSide, openScale };
  }

  const panels = [
    makePanel(xStart, 'left', emeraldMat, rodZ - 0.003, 0.48),       // Émeraude gauche
    makePanel(centerX - 0.005, 'right', beigeMat, rodZ + 0.003, 0.46), // Beige milieu gauche
    makePanel(centerX + 0.005, 'left', beigeMat, rodZ + 0.003, 0.46),  // Beige milieu droit
    makePanel(xEnd, 'right', emeraldMat, rodZ - 0.003, 0.48),        // Émeraude droite
  ];

  function syncPanels(openRatio) {
    for (const p of panels) {
      const curScaleX = 1 - openRatio * (1 - p.openScale);
      const curScaleZ = 1 + openRatio * 0.32;
      p.mesh.scale.set(curScaleX, 1, curScaleZ);

      const dir = p.anchorSide === 'left' ? 1 : -1;
      const spanNow = quarterW * curScaleX;
      for (let i = 0; i < ringCount; i++) {
        const frac = i / (ringCount - 1);
        p.rings[i].position.x = p.anchorX + dir * (0.012 + frac * Math.max(0.05, spanNow - 0.024));
      }
    }
  }

  syncPanels(1);

  return {
    id: 'curtains',
    label: 'Rideaux (2 beiges, 2 émeraude)',
    group,
    isOpen: true,
    openRatio: 1,
    targetRatio: 1,
    toggle() {
      this.isOpen = !this.isOpen;
      this.targetRatio = this.isOpen ? 1 : 0;
      return this.isOpen;
    },
    update(dt) {
      this.openRatio += (this.targetRatio - this.openRatio) * Math.min(1, dt * 6);
      syncPanels(this.openRatio);
    },
  };
}

export function buildRoom(textures) {
  const root = new THREE.Group();
  const interactables = [];

  const materials = {
    darkTile: new THREE.MeshStandardMaterial({
      map: textures.darkTile.map,
      bumpMap: textures.darkTile.bumpMap,
      bumpScale: 0.008,
      roughnessMap: textures.darkTile.roughnessMap,
      roughness: 0.48,
      metalness: 0.08,
    }),
    terrazzo: new THREE.MeshStandardMaterial({
      map: textures.terrazzo.map,
      roughnessMap: textures.terrazzo.roughnessMap,
      roughness: 0.48,
      metalness: 0.05,
    }),
    tileMint: new THREE.MeshStandardMaterial({
      map: textures.tileMint.map,
      bumpMap: textures.tileMint.bumpMap,
      bumpScale: 0.006,
      roughnessMap: textures.tileMint.roughnessMap,
      roughness: 0.36,
      metalness: 0.04,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0xf3eee6,
      map: textures.plaster.map,
      bumpMap: textures.plaster.bumpMap,
      bumpScale: 0.003,
      roughness: 0.86,
      metalness: 0.0,
    }),
    westPaintWall: new THREE.MeshStandardMaterial({
      color: 0xe3dbd0,
      map: textures.plaster.map,
      bumpMap: textures.plaster.bumpMap,
      bumpScale: 0.003,
      roughness: 0.85,
      metalness: 0.0,
    }),
    accentWall: new THREE.MeshStandardMaterial({
      color: 0x2e6f5b,
      map: textures.plaster.map,
      bumpMap: textures.plaster.bumpMap,
      bumpScale: 0.0035,
      roughness: 0.85,
      metalness: 0.0,
    }),
    baseboard: new THREE.MeshStandardMaterial({
      color: 0xfbf9f5,
      roughness: 0.45,
      metalness: 0.02,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: 0xf8f6f2,
      roughness: 0.92,
      metalness: 0.0,
    }),
    doorFrame: new THREE.MeshStandardMaterial({
      color: 0xfaf7f2,
      roughness: 0.42,
      metalness: 0.03,
    }),
    interiorDoor: new THREE.MeshStandardMaterial({
      color: 0xf3eee6,
      roughness: 0.48,
      metalness: 0.02,
    }),
    entranceDoor: new THREE.MeshStandardMaterial({
      map: textures.woodWalnut.map,
      roughness: 0.46,
      metalness: 0.04,
    }),
    doorInset: new THREE.MeshStandardMaterial({
      color: 0xe9e2d7,
      roughness: 0.52,
    }),
    oak: new THREE.MeshStandardMaterial({
      map: textures.woodOak.map,
      bumpMap: textures.woodOak.bumpMap,
      bumpScale: 0.004,
      roughness: 0.48,
      metalness: 0.04,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xc9a15a,
      roughness: 0.28,
      metalness: 0.85,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xd9dee3,
      roughness: 0.18,
      metalness: 0.9,
    }),
    windowFrame: new THREE.MeshStandardMaterial({
      color: 0x2a2e33,
      roughness: 0.36,
      metalness: 0.65,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdff0f6,
      transparent: true,
      opacity: 0.22,
      roughness: 0.06,
      metalness: 0.05,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    outletPlastic: new THREE.MeshStandardMaterial({
      color: 0xf4f2ed,
      roughness: 0.35,
      metalness: 0.04,
    }),
    outletRecess: new THREE.MeshStandardMaterial({
      color: 0xdcd9d0,
      roughness: 0.5,
    }),
    cableDark: new THREE.MeshStandardMaterial({
      color: 0x222326,
      roughness: 0.6,
    }),
  };

  // --- FLOORS ---
  const studioFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.studioDepth),
    materials.darkTile
  );
  studioFloor.rotation.x = -Math.PI / 2;
  studioFloor.position.set(ROOM.width / 2, 0, ROOM.studioDepth / 2);
  studioFloor.receiveShadow = true;
  studioFloor.userData.walkableFloor = true;
  root.add(studioFloor);

  const kitchenFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.kitchenWidth, ROOM.backDepth),
    materials.terrazzo
  );
  kitchenFloor.rotation.x = -Math.PI / 2;
  kitchenFloor.position.set(ROOM.kitchenWidth / 2, 0.001, -ROOM.backDepth / 2);
  kitchenFloor.receiveShadow = true;
  kitchenFloor.userData.walkableFloor = true;
  root.add(kitchenFloor);

  const showerFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.showerWidth, ROOM.backDepth),
    materials.tileMint
  );
  showerFloor.rotation.x = -Math.PI / 2;
  showerFloor.position.set(ROOM.kitchenWidth + ROOM.showerWidth / 2, 0.001, -ROOM.backDepth / 2);
  showerFloor.receiveShadow = true;
  showerFloor.userData.walkableFloor = true;
  root.add(showerFloor);

  // --- WALLS ---
  const H = ROOM.height;
  const W = ROOM.width;
  const E = ROOM.extWallT;
  const I = ROOM.intWallT / 2;

  // West exterior wall (x: -E..0) — warm cashmere/greige paint in Studio
  addWallBox(root, materials.westPaintWall, -E, 0, 0, H, 0, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, -E, 0, 0, H, -ROOM.backDepth - E, 0);
  // East exterior wall (x: W..W+E) — mineral sage-eucalyptus feature paint in Studio
  addWallBox(root, materials.accentWall, W, W + E, 0, H, 0, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, W, W + E, 0, H, -ROOM.backDepth - E, 0);
  // North exterior wall (z: -2-E..-2)
  addWallBox(root, materials.wall, 0, W, 0, H, -ROOM.backDepth - E, -ROOM.backDepth);
  // Kitchen / Douche divider (x = 2.40)
  addWallBox(root, materials.wall, ROOM.kitchenWidth - I, ROOM.kitchenWidth + I, 0, H, -ROOM.backDepth, 0);

  // Studio / Back rooms partition (z = 0, openings for Cuisine & Douche doors)
  const cDoor = OPENINGS.cuisineDoor;
  const dDoor = OPENINGS.doucheDoor;
  addWallBox(root, materials.wall, 0, cDoor.xMin, 0, H, -I, I);
  addWallBox(root, materials.wall, cDoor.xMin, cDoor.xMax, cDoor.height, H, -I, I);
  addWallBox(root, materials.wall, cDoor.xMax, dDoor.xMin, 0, H, -I, I);
  addWallBox(root, materials.wall, dDoor.xMin, dDoor.xMax, dDoor.height, H, -I, I);
  addWallBox(root, materials.wall, dDoor.xMax, W, 0, H, -I, I);

  // South exterior wall (z = 4.00..4.14, opening for Fenêtre coulissante & Entrée)
  const win = OPENINGS.window;
  const eDoor = OPENINGS.entreeDoor;
  addWallBox(root, materials.wall, 0, win.xMin, 0, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, win.xMin, win.xMax, 0, win.sillY, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, win.xMin, win.xMax, win.topY, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, win.xMax, eDoor.xMin, 0, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, eDoor.xMin, eDoor.xMax, eDoor.height, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, eDoor.xMax, W, 0, H, ROOM.studioDepth, ROOM.studioDepth + E);

  // Douche tiled walls (wet zone + vanity splashback)
  addWallBox(root, materials.tileMint, 2.45, 3.998, 0, 2.45, -2.0, -1.992, false, true);
  addWallBox(root, materials.tileMint, 3.992, 4.0, 0, 2.45, -2.0, -1.02, false, true);
  addWallBox(root, materials.tileMint, 3.992, 4.0, 0, 1.35, -1.02, -0.05, false, true);

  // --- BASEBOARDS (Plinthes) ---
  addBaseboard(root, materials.baseboard, 0, 0.014, 0.045, ROOM.studioDepth);
  addBaseboard(root, materials.baseboard, W - 0.014, W, 0.045, ROOM.studioDepth);
  addBaseboard(root, materials.baseboard, 0, cDoor.xMin, 0.045, 0.058);
  addBaseboard(root, materials.baseboard, cDoor.xMax, dDoor.xMin, 0.045, 0.058);
  addBaseboard(root, materials.baseboard, dDoor.xMax, W, 0.045, 0.058);
  addBaseboard(root, materials.baseboard, 0, eDoor.xMin, ROOM.studioDepth - 0.014, ROOM.studioDepth);
  addBaseboard(root, materials.baseboard, eDoor.xMax, W, ROOM.studioDepth - 0.014, ROOM.studioDepth);

  // --- CEILING GROUP (hidden in Vue maquette) ---
  const ceilingGroup = new THREE.Group();
  addWallBox(
    ceilingGroup,
    materials.ceiling,
    -E,
    W + E,
    H,
    H + 0.12,
    -ROOM.backDepth - E,
    ROOM.studioDepth + E,
    true,
    true
  );

  // Subtle crown molding in Studio
  const moldingH = 0.05;
  addWallBox(ceilingGroup, materials.baseboard, 0, 0.03, H - moldingH, H, 0.045, ROOM.studioDepth);
  addWallBox(ceilingGroup, materials.baseboard, W - 0.03, W, H - moldingH, H, 0.045, ROOM.studioDepth);
  addWallBox(ceilingGroup, materials.baseboard, 0, W, H - moldingH, H, 0.045, 0.075);
  addWallBox(ceilingGroup, materials.baseboard, 0, W, H - moldingH, H, ROOM.studioDepth - 0.03, ROOM.studioDepth);

  // Central woven linen / brass pendant light in Studio
  const pendantCord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.42, 8),
    materials.cableDark
  );
  pendantCord.position.set(2.0, H - 0.21, 2.0);
  ceilingGroup.add(pendantCord);

  const pendantShadeMat = new THREE.MeshStandardMaterial({
    color: 0xf3ece0,
    emissive: 0xffd296,
    emissiveIntensity: 0.12,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const pendantShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 0.18, 32, 1, true),
    pendantShadeMat
  );
  pendantShade.position.set(2.0, H - 0.46, 2.0);
  pendantShade.castShadow = true;
  ceilingGroup.add(pendantShade);

  const pendantBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff5e0,
    emissive: 0xffd89e,
    emissiveIntensity: 0.5,
  });
  const pendantBulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), pendantBulbMat);
  pendantBulb.position.set(2.0, H - 0.46, 2.0);
  ceilingGroup.add(pendantBulb);

  // Recessed spotlights in Cuisine & Douche
  const spotMats = [];
  for (const [sx, sz] of [
    [1.2, -1.0],
    [3.2, -1.0],
  ]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 20), materials.chrome);
    ring.position.set(sx, H - 0.004, sz);
    ceilingGroup.add(ring);

    const discMat = new THREE.MeshStandardMaterial({
      color: 0xfff8eb,
      emissive: 0xffe4b8,
      emissiveIntensity: 0.65,
    });
    spotMats.push(discMat);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.014, 20), discMat);
    disc.position.set(sx, H - 0.006, sz);
    ceilingGroup.add(disc);
  }
  root.add(ceilingGroup);

  // --- DOORS & SLIDING WINDOW ---
  const doors = [
    buildDoor(OPENINGS.cuisineDoor, materials),
    buildDoor(OPENINGS.doucheDoor, materials),
    buildDoor(OPENINGS.entreeDoor, materials),
  ];
  for (const d of doors) {
    root.add(d.group);
    interactables.push(d);
  }

  const windowRig = buildSlidingWindow(materials);
  root.add(windowRig.group);
  interactables.push(windowRig);

  // --- INTERACTIVE PLEATED CURTAINS & VOILAGE ON SLIDING WINDOW ---
  const curtainsRig = buildCurtains(textures, materials);
  root.add(curtainsRig.group);
  interactables.push(curtainsRig);

  // --- REAL PLANAR MIRROR (left wall north: x=0.018, z=0.56) ---
  const mirrorGroup = new THREE.Group();
  const mirrorW = 0.72;
  const mirrorH = 1.62;
  const mirrorPos = new THREE.Vector3(0.022, 1.24, 0.56);

  const reflector = new Reflector(new THREE.PlaneGeometry(mirrorW, mirrorH), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    color: 0xd0d4d8,
  });
  reflector.position.copy(mirrorPos);
  reflector.rotation.y = Math.PI / 2;
  mirrorGroup.add(reflector);

  // Warm oak & brass mirror frame
  const mirrorBack = new THREE.Mesh(
    new RoundedBoxGeometry(0.02, mirrorH + 0.05, mirrorW + 0.05, 2, 0.006),
    materials.oak
  );
  mirrorBack.position.set(0.01, mirrorPos.y, mirrorPos.z);
  mirrorBack.castShadow = true;
  mirrorGroup.add(mirrorBack);
  root.add(mirrorGroup);

  // --- ELECTRICAL OUTLETS & CABLES ---
  for (const o of OUTLETS) {
    const outlet = buildOutlet(o, materials);
    root.add(outlet);
  }
  // Power cord from TV outlet (0.01, 0.34, 2.00) into Meuble TV / TV
  root.add(
    buildPowerCable(
      [
        [0.025, 0.34, 2.0],
        [0.08, 0.24, 2.02],
        [0.14, 0.35, 2.0],
        [0.14, 0.65, 2.0],
      ],
      materials.cableDark
    )
  );
  // Power cord from Bureau outlet (1.10, 0.34, 3.98) up to desk
  root.add(
    buildPowerCable(
      [
        [1.10, 0.34, 3.97],
        [1.10, 0.26, 3.90],
        [1.10, 0.52, 3.84],
        [1.10, 0.74, 3.82],
      ],
      materials.cableDark
    )
  );

  // --- EXTERIOR COURTYARD & STAIRWELL LANDING ---
  const exteriorGroup = new THREE.Group();
  // Sky dome
  const skyMat = new THREE.MeshBasicMaterial({ color: 0xb7d5ea, side: THREE.BackSide });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(55, 24, 16), skyMat);
  exteriorGroup.add(skyDome);

  // Ground courtyard below window
  const courtyardFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 26),
    new THREE.MeshStandardMaterial({ color: 0x7a8072, roughness: 0.92 })
  );
  courtyardFloor.rotation.x = -Math.PI / 2;
  courtyardFloor.position.set(2.0, -2.4, 14.0);
  courtyardFloor.receiveShadow = true;
  exteriorGroup.add(courtyardFloor);

  // Opposite Parisian limestone building facade across courtyard
  const facadeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 14),
    new THREE.MeshStandardMaterial({ map: textures.facade, roughness: 0.85 })
  );
  facadeMesh.position.set(2.0, 2.8, 12.8);
  facadeMesh.rotation.y = Math.PI;
  exteriorGroup.add(facadeMesh);

  // Courtyard greenery visible from the desk & window
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4b6e49, roughness: 0.82 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4738, roughness: 0.9 });
  for (const [tx, tz, scale] of [
    [-0.6, 6.4, 1.05],
    [1.8, 7.6, 1.2],
    [4.2, 6.8, 0.95],
  ]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.4, 10), trunkMat);
    trunk.position.set(tx, -0.7, tz);
    exteriorGroup.add(trunk);

    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 * scale, 1), foliageMat);
    canopy.position.set(tx, 1.35 * scale, tz);
    exteriorGroup.add(canopy);
  }

  // Apartment hallway landing outside Entrée door (z: 4.14..5.4, x: 2.7..4.2)
  const hallFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x8f887d, roughness: 0.8 })
  );
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(3.45, -0.002, 4.88);
  hallFloor.receiveShadow = true;
  exteriorGroup.add(hallFloor);

  addWallBox(exteriorGroup, materials.accentWall, 2.55, 4.35, 0, H, 5.45, 5.56, false, true);
  addWallBox(exteriorGroup, materials.accentWall, 4.25, 4.36, 0, H, 4.14, 5.50, false, true);
  addWallBox(exteriorGroup, materials.accentWall, 2.55, 2.66, 0, H, 4.14, 5.50, false, true);

  root.add(exteriorGroup);

  // --- TOGGLEABLE 3D ARCHITECTURAL GUIDES ("Cotes 4 m & Prises") ---
  const guidesGroup = new THREE.Group();
  guidesGroup.visible = false;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xd89b56 });

  function addDimLine(p1, p2, labelText, labelOffset = [0, 0.14, 0]) {
    const pts = [new THREE.Vector3(...p1), new THREE.Vector3(...p2)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    guidesGroup.add(new THREE.Line(geo, lineMat));
    const sprite = createTextSprite(labelText);
    sprite.position.set(
      (p1[0] + p2[0]) / 2 + labelOffset[0],
      (p1[1] + p2[1]) / 2 + labelOffset[1],
      (p1[2] + p2[2]) / 2 + labelOffset[2]
    );
    guidesGroup.add(sprite);
  }

  addDimLine([0, 0.04, 4.24], [4.0, 0.04, 4.24], 'Largeur Studio : 4,00 m', [0, 0.18, 0.12]);
  addDimLine([4.24, 0.04, 0], [4.24, 0.04, 4.0], 'Profondeur Studio : 4,00 m', [0.15, 0.18, 0]);
  addDimLine([2.56, 0.62, 1.10], [3.96, 0.62, 3.00], 'Lit 1,40 × 1,90 m', [0, 0.35, 0]);

  for (const o of OUTLETS) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.085, 24),
      new THREE.MeshBasicMaterial({ color: 0xe0483e, side: THREE.DoubleSide })
    );
    marker.position.set(o.x + (o.x < 0.5 ? 0.03 : 0), o.y, o.z - (o.z > 3.5 ? 0.03 : 0));
    marker.rotation.y = o.rotY;
    guidesGroup.add(marker);

    const lbl = createTextSprite('Prise électrique', 'rgba(180, 48, 38, 0.9)');
    lbl.scale.set(0.62, 0.16, 1);
    lbl.position.set(o.x + (o.x < 0.5 ? 0.16 : 0), o.y + 0.24, o.z - (o.z > 3.5 ? 0.12 : 0));
    guidesGroup.add(lbl);
  }

  root.add(guidesGroup);

  return {
    root,
    ceilingGroup,
    exteriorGroup,
    skyMat,
    pendantShadeMat,
    pendantBulbMat,
    spotMats,
    doors,
    windowRig,
    curtainsRig,
    reflector,
    guidesGroup,
    interactables,
  };
}
