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
  const thresh = new THREE.Mesh(new THREE.BoxGeometry(cfg.width, 0.006, 0.07), materials.brass);
  thresh.position.set((cfg.xMin + cfg.xMax) / 2, 0.003, cfg.z);
  thresh.receiveShadow = true;
  group.add(thresh);

  // Architectural hinge barrels (paumelles)
  for (const hy of [0.34, 1.05, 1.78]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.075, 10), materials.chrome);
    hinge.position.set(cfg.hingeX, hy, cfg.z - 0.02);
    group.add(hinge);
  }

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

  const handleX = dir * (leafW - 0.075);
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.14, 0.008), materials.brass);
    plate.position.set(handleX, 1.02, side * (leafT / 2 + 0.004));
    pivot.add(plate);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.036, 12), materials.brass);
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

  const sill = new THREE.Mesh(
    new RoundedBoxGeometry(winW + 0.08, 0.036, 0.24, 2, 0.005),
    materials.oak
  );
  sill.position.set((cfg.xMin + cfg.xMax) / 2, cfg.sillY + 0.01, cfg.z + 0.03);
  sill.castShadow = true;
  sill.receiveShadow = true;
  group.add(sill);

  const fT = 0.045;
  const frameDepth = 0.12;
  const frameZ = cfg.z + 0.07;

  addWallBox(group, materials.windowFrame, cfg.xMin, cfg.xMin + fT, cfg.sillY + 0.02, cfg.topY, frameZ - frameDepth / 2, frameZ + frameDepth / 2);
  addWallBox(group, materials.windowFrame, cfg.xMax - fT, cfg.xMax, cfg.sillY + 0.02, cfg.topY, frameZ - frameDepth / 2, frameZ + frameDepth / 2);
  addWallBox(group, materials.windowFrame, cfg.xMin, cfg.xMax, cfg.topY - fT, cfg.topY, frameZ - frameDepth / 2, frameZ + frameDepth / 2);
  addWallBox(group, materials.windowFrame, cfg.xMin, cfg.xMax, cfg.sillY + 0.02, cfg.sillY + 0.02 + fT, frameZ - frameDepth / 2, frameZ + frameDepth / 2);

  const panelW = (winW - fT * 2) * 0.52;
  const panelH = winH - fT * 2 - 0.02;
  const panelY = cfg.sillY + 0.02 + fT + panelH / 2;

  function makeSash(zPos, isMovable) {
    const sash = new THREE.Group();
    sash.position.set(0, panelY, zPos);
    const bar = 0.036;
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
    glass.userData.skipAO = true;
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
  const geo = new THREE.PlaneGeometry(width, height, 72, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const rawX = pos.getX(i);
    const rawY = pos.getY(i);
    const u = (rawX + width / 2) / width;
    const v = 1 - (rawY + height / 2) / height;

    const anchoredX = anchorSide === 'left' ? u * width : (u - 1) * width;
    const flare = 1 + 0.042 * v;
    const wavePhase = u * folds * Math.PI * 2;
    const multiFold = Math.sin(wavePhase) + 0.24 * Math.sin(wavePhase * 2.0 + 0.55);
    const waveDepth = multiFold * depthAmp * (0.60 + 0.40 * Math.sin(v * Math.PI * 0.85));
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
  const centerX = (xStart + xEnd) / 2;

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

  const drapeH = 1.67;
  const drapeCenterY = rodY - 0.02 - drapeH / 2;
  const quarterW = rodSpan / 4 + 0.018;

  const beigeMat = new THREE.MeshPhysicalMaterial({
    map: textures.curtainBeige.map,
    normalMap: textures.curtainBeige.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.88,
    metalness: 0.0,
    sheen: 0.9,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xf8f0e2),
    emissive: new THREE.Color(0xffebd0),
    emissiveIntensity: 0.04,
    side: THREE.DoubleSide,
  });

  const emeraldMat = new THREE.MeshPhysicalMaterial({
    map: textures.curtainEmerald.map,
    normalMap: textures.curtainEmerald.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.86,
    metalness: 0.0,
    sheen: 0.9,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(0x5fa891),
    emissive: new THREE.Color(0x1b4739),
    emissiveIntensity: 0.02,
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
    makePanel(xStart, 'left', emeraldMat, rodZ - 0.003, 0.48),
    makePanel(centerX - 0.005, 'right', beigeMat, rodZ + 0.003, 0.46),
    makePanel(centerX + 0.005, 'left', beigeMat, rodZ + 0.003, 0.46),
    makePanel(xEnd, 'right', emeraldMat, rodZ - 0.003, 0.48),
  ];

  function syncPanels(openRatio) {
    for (const p of panels) {
      const curScaleX = 1 - openRatio * (1 - p.openScale);
      const curScaleZ = 1 + openRatio * 0.34;
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
    beigeMat,
    emeraldMat,
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

function createSkyShaderMaterial() {
  const uniforms = {
    uZenithColor: { value: new THREE.Color(0x6da4d6) },
    uHorizonColor: { value: new THREE.Color(0xdfeaf4) },
    uSunColor: { value: new THREE.Color(0xfff1d4) },
    uSunDir: { value: new THREE.Vector3(-0.26, 0.48, 0.84).normalize() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y * 1.15 + 0.08, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uZenithColor, pow(h, 0.65));
        float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
        col += uSunColor * pow(sunAmt, 16.0) * 0.45;
        col += uSunColor * pow(sunAmt, 180.0) * 1.1;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return { mat, uniforms };
}

export function buildRoom(textures) {
  const root = new THREE.Group();
  const interactables = [];

  const materials = {
    darkTile: new THREE.MeshPhysicalMaterial({
      map: textures.darkTile.map,
      normalMap: textures.darkTile.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: textures.darkTile.roughnessMap,
      roughness: 0.44,
      metalness: 0.06,
      clearcoat: 0.24,
      clearcoatRoughness: 0.34,
      envMapIntensity: 1.35,
    }),
    terrazzo: new THREE.MeshStandardMaterial({
      map: textures.terrazzo.map,
      normalMap: textures.terrazzo.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: textures.terrazzo.roughnessMap,
      roughness: 0.44,
      metalness: 0.04,
      envMapIntensity: 1.1,
    }),
    tileMint: new THREE.MeshPhysicalMaterial({
      map: textures.tileMint.map,
      normalMap: textures.tileMint.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: textures.tileMint.roughnessMap,
      roughness: 0.34,
      metalness: 0.04,
      clearcoat: 0.2,
      clearcoatRoughness: 0.28,
      envMapIntensity: 1.2,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0xf1ece3,
      map: textures.plaster.map,
      normalMap: textures.plaster.normalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: 0.5,
    }),
    westPaintWall: new THREE.MeshStandardMaterial({
      color: 0xe2dad0,
      map: textures.plaster.map,
      normalMap: textures.plaster.normalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: 0.87,
      metalness: 0.0,
      envMapIntensity: 0.5,
    }),
    accentWall: new THREE.MeshStandardMaterial({
      color: 0x2e6f5b,
      map: textures.plaster.map,
      normalMap: textures.plaster.normalMap,
      normalScale: new THREE.Vector2(0.24, 0.24),
      roughness: 0.85,
      metalness: 0.0,
      envMapIntensity: 0.55,
    }),
    baseboard: new THREE.MeshStandardMaterial({
      color: 0xfbf9f5,
      roughness: 0.42,
      metalness: 0.02,
      envMapIntensity: 0.7,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: 0xf8f6f2,
      roughness: 0.94,
      metalness: 0.0,
      envMapIntensity: 0.4,
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
      normalMap: textures.woodWalnut.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.44,
      metalness: 0.04,
    }),
    doorInset: new THREE.MeshStandardMaterial({
      color: 0xe9e2d7,
      roughness: 0.52,
    }),
    oak: new THREE.MeshPhysicalMaterial({
      map: textures.woodOak.map,
      normalMap: textures.woodOak.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: textures.woodOak.roughnessMap,
      roughness: 0.46,
      metalness: 0.03,
      clearcoat: 0.1,
      clearcoatRoughness: 0.42,
      envMapIntensity: 1.0,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xc9a15a,
      roughness: 0.24,
      metalness: 0.9,
      envMapIntensity: 1.4,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xdce1e6,
      roughness: 0.15,
      metalness: 0.94,
      envMapIntensity: 1.5,
    }),
    windowFrame: new THREE.MeshStandardMaterial({
      color: 0x25292e,
      roughness: 0.34,
      metalness: 0.72,
      envMapIntensity: 1.1,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xe6f4fa,
      transparent: true,
      opacity: 0.18,
      roughness: 0.04,
      metalness: 0.06,
      reflectivity: 0.95,
      ior: 1.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.6,
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

  addWallBox(root, materials.westPaintWall, -E, 0, 0, H, 0, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, -E, 0, 0, H, -ROOM.backDepth - E, 0);
  addWallBox(root, materials.accentWall, W, W + E, 0, H, 0, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, W, W + E, 0, H, -ROOM.backDepth - E, 0);
  addWallBox(root, materials.wall, 0, W, 0, H, -ROOM.backDepth - E, -ROOM.backDepth);
  addWallBox(root, materials.wall, ROOM.kitchenWidth - I, ROOM.kitchenWidth + I, 0, H, -ROOM.backDepth, 0);

  const cDoor = OPENINGS.cuisineDoor;
  const dDoor = OPENINGS.doucheDoor;
  addWallBox(root, materials.wall, 0, cDoor.xMin, 0, H, -I, I);
  addWallBox(root, materials.wall, cDoor.xMin, cDoor.xMax, cDoor.height, H, -I, I);
  addWallBox(root, materials.wall, cDoor.xMax, dDoor.xMin, 0, H, -I, I);
  addWallBox(root, materials.wall, dDoor.xMin, dDoor.xMax, dDoor.height, H, -I, I);
  addWallBox(root, materials.wall, dDoor.xMax, W, 0, H, -I, I);

  const win = OPENINGS.window;
  const eDoor = OPENINGS.entreeDoor;
  addWallBox(root, materials.wall, 0, win.xMin, 0, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, win.xMin, win.xMax, 0, win.sillY, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, win.xMin, win.xMax, win.topY, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, win.xMax, eDoor.xMin, 0, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, eDoor.xMin, eDoor.xMax, eDoor.height, H, ROOM.studioDepth, ROOM.studioDepth + E);
  addWallBox(root, materials.wall, eDoor.xMax, W, 0, H, ROOM.studioDepth, ROOM.studioDepth + E);

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

  // --- SUBTLE FLOOR/WALL AMBIENT GROUNDING STRIPS ---
  const cornerShadeMat = new THREE.MeshBasicMaterial({
    map: textures.cornerShade,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  function addCornerAoStrip(x, z, len, rotY) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.28), cornerShadeMat);
    strip.position.set(x, 0.14, z);
    strip.rotation.y = rotY;
    strip.userData.skipAO = true;
    root.add(strip);
  }
  addCornerAoStrip(0.016, 2.0, 3.92, Math.PI / 2);
  addCornerAoStrip(3.984, 2.0, 3.92, -Math.PI / 2);
  addCornerAoStrip(cDoor.xMin / 2, 0.06, cDoor.xMin, 0);
  addCornerAoStrip(win.xMax / 2, 3.984, win.xMax, Math.PI);

  // --- CEILING GROUP ---
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

  const moldingH = 0.05;
  addWallBox(ceilingGroup, materials.baseboard, 0, 0.03, H - moldingH, H, 0.045, ROOM.studioDepth);
  addWallBox(ceilingGroup, materials.baseboard, W - 0.03, W, H - moldingH, H, 0.045, ROOM.studioDepth);
  addWallBox(ceilingGroup, materials.baseboard, 0, W, H - moldingH, H, 0.045, 0.075);
  addWallBox(ceilingGroup, materials.baseboard, 0, W, H - moldingH, H, ROOM.studioDepth - 0.03, ROOM.studioDepth);

  const pendantCord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.42, 8),
    materials.cableDark
  );
  pendantCord.position.set(2.0, H - 0.21, 2.0);
  ceilingGroup.add(pendantCord);

  const pendantShadeMat = new THREE.MeshPhysicalMaterial({
    color: 0xf3ece0,
    emissive: 0xffd296,
    emissiveIntensity: 0.12,
    roughness: 0.76,
    sheen: 0.7,
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

  // --- DOORS, SLIDING WINDOW & 4 CURTAINS ---
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

  const curtainsRig = buildCurtains(textures, materials);
  root.add(curtainsRig.group);
  interactables.push(curtainsRig);

  // --- VOLUMETRIC WINDOW LIGHT SHAFTS ---
  const sunShaftsMat = new THREE.MeshBasicMaterial({
    map: textures.lightShaft,
    color: 0xfff1d6,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sunShaftsGroup = new THREE.Group();
  for (const [sx, rotY] of [
    [0.86, 0.18],
    [2.02, 0.16],
  ]) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.85), sunShaftsMat);
    beam.position.set(sx, 1.32, 2.85);
    beam.rotation.x = -0.82;
    beam.rotation.y = rotY;
    beam.userData.skipAO = true;
    sunShaftsGroup.add(beam);
  }
  root.add(sunShaftsGroup);

  // --- REAL PLANAR MIRROR ---
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
  reflector.userData.skipAO = true;
  reflector.userData.isMirror = true;
  mirrorGroup.add(reflector);

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
    root.add(buildOutlet(o, materials));
  }
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
  root.add(
    buildPowerCable(
      [
        [1.10, 0.34, 3.97],
        [1.10, 0.26, 3.88],
        [1.10, 0.52, 3.82],
        [1.10, 0.74, 3.78],
      ],
      materials.cableDark
    )
  );

  // --- EXTERIOR COURTYARD & PHYSICAL SKY DOME ---
  const exteriorGroup = new THREE.Group();
  const skyShader = createSkyShaderMaterial();
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(55, 28, 18), skyShader.mat);
  skyDome.userData.skipAO = true;
  exteriorGroup.add(skyDome);

  const courtyardFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 26),
    new THREE.MeshStandardMaterial({ color: 0x6f7568, roughness: 0.92 })
  );
  courtyardFloor.rotation.x = -Math.PI / 2;
  courtyardFloor.position.set(2.0, -2.4, 14.0);
  courtyardFloor.receiveShadow = true;
  exteriorGroup.add(courtyardFloor);

  const facadeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 14),
    new THREE.MeshStandardMaterial({ map: textures.facade, roughness: 0.85 })
  );
  facadeMesh.position.set(2.0, 2.8, 12.8);
  facadeMesh.rotation.y = Math.PI;
  exteriorGroup.add(facadeMesh);

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x456844, roughness: 0.8 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4738, roughness: 0.9 });
  for (const [tx, tz, scale] of [
    [-0.6, 6.4, 1.05],
    [1.8, 7.6, 1.2],
    [4.2, 6.8, 0.95],
  ]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.4, 10), trunkMat);
    trunk.position.set(tx, -0.7, tz);
    exteriorGroup.add(trunk);

    for (const [ox, oy, oz, rad] of [
      [0, 1.35, 0, 1.0],
      [-0.45, 1.05, 0.25, 0.72],
      [0.48, 1.12, -0.18, 0.75],
    ]) {
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(rad * scale, 1), foliageMat);
      canopy.position.set(tx + ox, oy * scale, tz + oz);
      exteriorGroup.add(canopy);
    }
  }

  const hallFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x8f887d, roughness: 0.8 })
  );
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(3.45, -0.002, 4.88);
  hallFloor.receiveShadow = true;
  exteriorGroup.add(hallFloor);

  addWallBox(exteriorGroup, materials.westPaintWall, 2.55, 4.35, 0, H, 5.45, 5.56, false, true);
  addWallBox(exteriorGroup, materials.westPaintWall, 4.25, 4.36, 0, H, 4.14, 5.50, false, true);
  addWallBox(exteriorGroup, materials.westPaintWall, 2.55, 2.66, 0, H, 4.14, 5.50, false, true);
  root.add(exteriorGroup);

  // --- TOGGLEABLE 3D ARCHITECTURAL GUIDES ---
  const guidesGroup = new THREE.Group();
  guidesGroup.visible = false;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xd89b56 });

  function addDimLine(p1, p2, labelText, labelOffset = [0, 0.14, 0]) {
    const pts = [new THREE.Vector3(...p1), new THREE.Vector3(...p2)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, lineMat);
    line.userData.skipAO = true;
    guidesGroup.add(line);
    const sprite = createTextSprite(labelText);
    sprite.position.set(
      (p1[0] + p2[0]) / 2 + labelOffset[0],
      (p1[1] + p2[1]) / 2 + labelOffset[1],
      (p1[2] + p2[2]) / 2 + labelOffset[2]
    );
    sprite.userData.skipAO = true;
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
    marker.userData.skipAO = true;
    guidesGroup.add(marker);

    const lbl = createTextSprite('Prise électrique', 'rgba(180, 48, 38, 0.9)');
    lbl.scale.set(0.62, 0.16, 1);
    lbl.position.set(o.x + (o.x < 0.5 ? 0.16 : 0), o.y + 0.24, o.z - (o.z > 3.5 ? 0.12 : 0));
    lbl.userData.skipAO = true;
    guidesGroup.add(lbl);
  }
  root.add(guidesGroup);

  return {
    root,
    ceilingGroup,
    exteriorGroup,
    skyUniforms: skyShader.uniforms,
    sunShaftsMat,
    sunShaftsGroup,
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
