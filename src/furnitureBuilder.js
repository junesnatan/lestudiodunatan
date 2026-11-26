import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createDynamicTVScreen } from './textures.js';

function makeLeg(radiusTop, radiusBottom, height, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildPottedPlant(scale, potMat, leafMat) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * scale, 0.055 * scale, 0.13 * scale, 18), potMat);
  pot.position.y = 0.065 * scale;
  pot.castShadow = true;
  pot.receiveShadow = true;
  g.add(pot);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068 * scale, 0.068 * scale, 0.015 * scale, 16),
    new THREE.MeshStandardMaterial({ color: 0x38281c, roughness: 0.95 })
  );
  soil.position.y = 0.125 * scale;
  g.add(soil);

  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + 0.3;
    const tilt = 0.3 + (i % 3) * 0.22;
    const leafPivot = new THREE.Group();
    leafPivot.position.y = 0.12 * scale;
    leafPivot.rotation.y = ang;
    leafPivot.rotation.z = tilt;

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * scale, 0.006 * scale, 0.14 * scale, 6), leafMat);
    stem.position.y = 0.07 * scale;
    leafPivot.add(stem);

    const blade = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 10, 8), leafMat);
    blade.scale.set(0.85, 0.18, 1.35);
    blade.position.y = 0.15 * scale;
    blade.rotation.x = 0.35;
    blade.castShadow = true;
    leafPivot.add(blade);

    g.add(leafPivot);
  }
  return g;
}

export function buildFurniture(textures) {
  const root = new THREE.Group();
  const interactables = [];

  const mats = {
    oak: new THREE.MeshStandardMaterial({
      map: textures.woodOak.map,
      bumpMap: textures.woodOak.bumpMap,
      bumpScale: 0.004,
      roughness: 0.48,
      metalness: 0.04,
    }),
    walnut: new THREE.MeshStandardMaterial({
      map: textures.woodWalnut.map,
      roughness: 0.44,
      metalness: 0.05,
    }),
    boucle: new THREE.MeshStandardMaterial({
      map: textures.boucle.map,
      bumpMap: textures.boucle.bumpMap,
      bumpScale: 0.01,
      roughness: 0.88,
      metalness: 0.0,
    }),
    pillowWarm: new THREE.MeshStandardMaterial({
      color: 0xc98860,
      bumpMap: textures.boucle.bumpMap,
      bumpScale: 0.008,
      roughness: 0.86,
    }),
    pillowSage: new THREE.MeshStandardMaterial({
      map: textures.linenThrow.map,
      bumpMap: textures.linenThrow.bumpMap,
      bumpScale: 0.008,
      roughness: 0.85,
    }),
    linenBed: new THREE.MeshStandardMaterial({
      map: textures.linenBed.map,
      bumpMap: textures.linenBed.bumpMap,
      bumpScale: 0.008,
      roughness: 0.84,
    }),
    sheetWhite: new THREE.MeshStandardMaterial({
      color: 0xf7f4ee,
      roughness: 0.78,
    }),
    headboard: new THREE.MeshStandardMaterial({
      color: 0xbfb8c9,
      bumpMap: textures.boucle.bumpMap,
      bumpScale: 0.009,
      roughness: 0.86,
    }),
    rug: new THREE.MeshStandardMaterial({
      map: textures.rug.map,
      bumpMap: textures.rug.bumpMap,
      bumpScale: 0.012,
      roughness: 0.94,
    }),
    matteWhite: new THREE.MeshStandardMaterial({
      color: 0xf1ede6,
      roughness: 0.46,
      metalness: 0.03,
    }),
    wardrobeMat: new THREE.MeshStandardMaterial({
      color: 0xe6e1d7,
      roughness: 0.52,
      metalness: 0.02,
    }),
    matteBlack: new THREE.MeshStandardMaterial({
      color: 0x202226,
      roughness: 0.38,
      metalness: 0.55,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xcba35c,
      roughness: 0.25,
      metalness: 0.88,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xdde2e7,
      roughness: 0.16,
      metalness: 0.92,
    }),
    ceramic: new THREE.MeshStandardMaterial({
      color: 0xf7f5f0,
      roughness: 0.22,
      metalness: 0.05,
    }),
    terracottaPot: new THREE.MeshStandardMaterial({
      color: 0xc27c5b,
      roughness: 0.78,
    }),
    leaf: new THREE.MeshStandardMaterial({
      color: 0x456b47,
      roughness: 0.58,
    }),
    glassClear: new THREE.MeshPhysicalMaterial({
      color: 0xdcf0f2,
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      metalness: 0.05,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  };

  // =========================================================
  // 1. WOVEN RUG under living area (x: 0.52..2.18, z: 0.82..2.85)
  // =========================================================
  const rug = new THREE.Mesh(
    new RoundedBoxGeometry(1.66, 0.012, 2.04, 2, 0.005),
    mats.rug
  );
  rug.position.set(1.35, 0.006, 1.84);
  rug.receiveShadow = true;
  root.add(rug);

  // =========================================================
  // 2. LIT 1.40 × 1.90 m (x: 2.56..3.96, z: 1.10..3.00)
  // =========================================================
  const bedGroup = new THREE.Group();
  const bedX = 3.26;
  const bedZ = 2.05;

  // Bed frame
  const bedFrame = new THREE.Mesh(
    new RoundedBoxGeometry(1.40, 0.16, 1.90, 3, 0.025),
    mats.oak
  );
  bedFrame.position.set(bedX, 0.20, bedZ);
  bedFrame.castShadow = true;
  bedFrame.receiveShadow = true;
  bedGroup.add(bedFrame);

  for (const lx of [-0.60, 0.60]) {
    for (const lz of [-0.84, 0.84]) {
      const leg = makeLeg(0.028, 0.02, 0.13, mats.oak);
      leg.position.set(bedX + lx, 0.065, bedZ + lz);
      bedGroup.add(leg);
    }
  }

  // Headboard at North end (z = 1.13) near Armoire
  const headboard = new THREE.Mesh(
    new RoundedBoxGeometry(1.42, 0.88, 0.08, 3, 0.03),
    mats.headboard
  );
  headboard.position.set(bedX, 0.54, 1.14);
  headboard.castShadow = true;
  headboard.receiveShadow = true;
  bedGroup.add(headboard);

  // Mattress (1.36 x 1.84)
  const mattress = new THREE.Mesh(
    new RoundedBoxGeometry(1.34, 0.21, 1.82, 4, 0.045),
    mats.sheetWhite
  );
  mattress.position.set(bedX, 0.365, bedZ + 0.02);
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  bedGroup.add(mattress);

  // Plush lavender-linen duvet covering lower 72% of bed
  const duvet = new THREE.Mesh(
    new RoundedBoxGeometry(1.41, 0.11, 1.32, 4, 0.048),
    mats.linenBed
  );
  duvet.position.set(bedX, 0.445, 2.34);
  duvet.castShadow = true;
  duvet.receiveShadow = true;
  bedGroup.add(duvet);

  // Sage throw runner across foot of bed
  const bedRunner = new THREE.Mesh(
    new RoundedBoxGeometry(1.43, 0.06, 0.44, 3, 0.028),
    mats.pillowSage
  );
  bedRunner.position.set(bedX, 0.475, 2.74);
  bedRunner.castShadow = true;
  bedGroup.add(bedRunner);

  // Two sleeping pillows + accent cushion
  for (const px of [-0.33, 0.33]) {
    const pillow = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 0.12, 0.38, 4, 0.05),
      mats.sheetWhite
    );
    pillow.position.set(bedX + px, 0.52, 1.37);
    pillow.rotation.x = 0.24;
    pillow.castShadow = true;
    bedGroup.add(pillow);
  }
  const bedCushion = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.10, 0.30, 4, 0.04),
    mats.pillowWarm
  );
  bedCushion.position.set(bedX, 0.56, 1.54);
  bedCushion.rotation.x = 0.46;
  bedCushion.castShadow = true;
  bedGroup.add(bedCushion);

  // Subtle wall reading sconce on East wall beside bed
  const sconceBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), mats.brass);
  sconceBase.rotation.z = Math.PI / 2;
  sconceBase.position.set(3.988, 1.18, 1.48);
  bedGroup.add(sconceBase);

  const sconceShadeMat = new THREE.MeshStandardMaterial({
    color: 0xf4ece0,
    emissive: 0xffc67c,
    emissiveIntensity: 0.15,
    roughness: 0.6,
  });
  const sconceShade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 16, 1, true), sconceShadeMat);
  sconceShade.position.set(3.88, 1.18, 1.48);
  bedGroup.add(sconceShade);

  root.add(bedGroup);

  // =========================================================
  // 3. ARMOIRE (x: 3.28..3.98, z: 0.04..1.09, height: 2.15 m)
  // =========================================================
  const armoireGroup = new THREE.Group();
  const armX = 3.63;
  const armZ = 0.565;
  const armW = 0.68; // X depth
  const armL = 1.04; // Z width
  const armH = 2.15;

  // Cabinet carcass (open towards -X so doors swing open cleanly!)
  const armPlinth = new THREE.Mesh(new THREE.BoxGeometry(armW - 0.03, 0.08, armL), mats.wardrobeMat);
  armPlinth.position.set(armX + 0.015, 0.04, armZ);
  armPlinth.castShadow = true;
  armPlinth.receiveShadow = true;
  armoireGroup.add(armPlinth);

  const armBack = new THREE.Mesh(new THREE.BoxGeometry(0.025, armH - 0.08, armL), mats.wardrobeMat);
  armBack.position.set(3.968, 0.08 + (armH - 0.08) / 2, armZ);
  armBack.castShadow = true;
  armoireGroup.add(armBack);

  for (const sz of [0.055, 1.075]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(armW, armH - 0.08, 0.025), mats.wardrobeMat);
    side.position.set(armX, 0.08 + (armH - 0.08) / 2, sz);
    side.castShadow = true;
    side.receiveShadow = true;
    armoireGroup.add(side);
  }
  const armTop = new THREE.Mesh(new THREE.BoxGeometry(armW, 0.03, armL), mats.wardrobeMat);
  armTop.position.set(armX, armH - 0.015, armZ);
  armTop.castShadow = true;
  armoireGroup.add(armTop);

  // Interior shelves + hanging rail + shirts
  const armShelf = new THREE.Mesh(new THREE.BoxGeometry(armW - 0.05, 0.022, armL - 0.05), mats.oak);
  armShelf.position.set(armX, 1.72, armZ);
  armoireGroup.add(armShelf);

  const armRail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, armL - 0.06, 10), mats.chrome);
  armRail.rotation.x = Math.PI / 2;
  armRail.position.set(armX, 1.62, armZ);
  armoireGroup.add(armRail);

  const shirtColors = [0xe8e4dc, 0x4b6374, 0x7e998b, 0xc98860, 0x2c3035];
  for (let i = 0; i < 6; i++) {
    const shirt = new THREE.Mesh(
      new RoundedBoxGeometry(0.36, 0.62, 0.035, 2, 0.01),
      new THREE.MeshStandardMaterial({ color: shirtColors[i % shirtColors.length], roughness: 0.8 })
    );
    shirt.position.set(armX + 0.02, 1.28, 0.24 + i * 0.12);
    armoireGroup.add(shirt);
  }

  // Two hinged wardrobe doors facing -X
  const armDoorW = (armL - 0.05) / 2 - 0.004;
  const armDoorH = armH - 0.12;
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(3.29, 0.09, 0.065);
  armoireGroup.add(leftArmPivot);

  const leftArmLeaf = new THREE.Mesh(
    new RoundedBoxGeometry(0.022, armDoorH, armDoorW, 2, 0.004),
    mats.wardrobeMat
  );
  leftArmLeaf.position.set(0, armDoorH / 2, armDoorW / 2);
  leftArmLeaf.castShadow = true;
  leftArmLeaf.receiveShadow = true;
  leftArmLeaf.userData.interactId = 'armoire';
  leftArmPivot.add(leftArmLeaf);

  const leftArmHandle = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.24, 0.012, 2, 0.004), mats.oak);
  leftArmHandle.position.set(-0.016, 1.05, armDoorW - 0.035);
  leftArmHandle.userData.interactId = 'armoire';
  leftArmPivot.add(leftArmHandle);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(3.29, 0.09, 1.065);
  armoireGroup.add(rightArmPivot);

  const rightArmLeaf = new THREE.Mesh(
    new RoundedBoxGeometry(0.022, armDoorH, armDoorW, 2, 0.004),
    mats.wardrobeMat
  );
  rightArmLeaf.position.set(0, armDoorH / 2, -armDoorW / 2);
  rightArmLeaf.castShadow = true;
  rightArmLeaf.receiveShadow = true;
  rightArmLeaf.userData.interactId = 'armoire';
  rightArmPivot.add(rightArmLeaf);

  const rightArmHandle = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.24, 0.012, 2, 0.004), mats.oak);
  rightArmHandle.position.set(-0.016, 1.05, -armDoorW + 0.035);
  rightArmHandle.userData.interactId = 'armoire';
  rightArmPivot.add(rightArmHandle);

  const armoireCtrl = {
    id: 'armoire',
    label: "Portes de l'armoire",
    isOpen: false,
    angle: 0,
    target: 0,
    toggle() {
      this.isOpen = !this.isOpen;
      this.target = this.isOpen ? Math.PI * 0.44 : 0;
      return this.isOpen;
    },
    update(dt) {
      this.angle += (this.target - this.angle) * Math.min(1, dt * 7);
      leftArmPivot.rotation.y = this.angle;
      rightArmPivot.rotation.y = -this.angle;
    },
  };
  interactables.push(armoireCtrl);
  root.add(armoireGroup);

  // =========================================================
  // 4. CANAPÉ (x: 0.98..2.02, z: 1.12..2.77) facing -X toward TV
  // =========================================================
  const sofaGroup = new THREE.Group();
  const sofaX = 1.50;
  const sofaZ = 1.945;

  // Oak base plinth & legs
  const sofaBase = new THREE.Mesh(
    new RoundedBoxGeometry(0.96, 0.14, 1.62, 3, 0.02),
    mats.boucle
  );
  sofaBase.position.set(sofaX, 0.19, sofaZ);
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  sofaGroup.add(sofaBase);

  for (const lx of [-0.40, 0.40]) {
    for (const lz of [-0.72, 0.72]) {
      const leg = makeLeg(0.025, 0.018, 0.12, mats.oak);
      leg.position.set(sofaX + lx, 0.06, sofaZ + lz);
      sofaGroup.add(leg);
    }
  }

  // Backrest on the East side (x = 1.91)
  const sofaBack = new THREE.Mesh(
    new RoundedBoxGeometry(0.18, 0.62, 1.62, 4, 0.045),
    mats.boucle
  );
  sofaBack.position.set(1.91, 0.49, sofaZ);
  sofaBack.castShadow = true;
  sofaBack.receiveShadow = true;
  sofaGroup.add(sofaBack);

  // Armrests (north z = 1.19, south z = 2.70)
  for (const az of [1.19, 2.70]) {
    const arm = new THREE.Mesh(
      new RoundedBoxGeometry(0.96, 0.36, 0.15, 4, 0.04),
      mats.boucle
    );
    arm.position.set(sofaX, 0.42, az);
    arm.castShadow = true;
    arm.receiveShadow = true;
    sofaGroup.add(arm);
  }

  // Two plush seat cushions
  for (const cz of [sofaZ - 0.335, sofaZ + 0.335]) {
    const seat = new THREE.Mesh(
      new RoundedBoxGeometry(0.79, 0.15, 0.65, 4, 0.045),
      mats.boucle
    );
    seat.position.set(1.42, 0.335, cz);
    seat.castShadow = true;
    seat.receiveShadow = true;
    sofaGroup.add(seat);

    const backCush = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.38, 0.64, 4, 0.05),
      mats.boucle
    );
    backCush.position.set(1.74, 0.56, cz);
    backCush.rotation.z = -0.14;
    backCush.castShadow = true;
    sofaGroup.add(backCush);
  }

  // Decorative throw pillows & folded blanket
  const sofaPillow1 = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.32, 0.32, 4, 0.045), mats.pillowWarm);
  sofaPillow1.position.set(1.62, 0.53, 1.42);
  sofaPillow1.rotation.set(0.18, 0.32, -0.2);
  sofaPillow1.castShadow = true;
  sofaGroup.add(sofaPillow1);

  const sofaPillow2 = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.32, 0.32, 4, 0.045), mats.pillowSage);
  sofaPillow2.position.set(1.60, 0.53, 2.48);
  sofaPillow2.rotation.set(-0.2, -0.35, -0.2);
  sofaPillow2.castShadow = true;
  sofaGroup.add(sofaPillow2);

  // Draped throw blanket over South armrest
  const sofaThrow = new THREE.Mesh(
    new RoundedBoxGeometry(0.46, 0.34, 0.17, 3, 0.03),
    mats.pillowWarm
  );
  sofaThrow.position.set(1.42, 0.44, 2.71);
  sofaThrow.castShadow = true;
  sofaGroup.add(sofaThrow);

  // Wall gallery duo on North wall (above Guéridon / left corner)
  for (const [ax, ay, aw, ah, tex] of [
    [0.54, 1.56, 0.46, 0.62, textures.artFrame],
    [1.04, 1.48, 0.38, 0.50, textures.artBotanical],
  ]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(aw + 0.05, ah + 0.05, 0.025), mats.walnut);
    frame.position.set(ax, ay, 0.058);
    frame.castShadow = true;
    root.add(frame);

    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(aw, ah),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 })
    );
    print.position.set(ax, ay, 0.072);
    root.add(print);
  }

  // Framed prints above the bed on the sage-green East wall
  for (const [az, tex] of [
    [1.82, textures.artBotanical],
    [2.38, textures.artArch],
  ]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.56, 0.42), mats.oak);
    frame.position.set(3.986, 1.56, az);
    frame.castShadow = true;
    root.add(frame);

    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(0.37, 0.50),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 })
    );
    print.rotation.y = -Math.PI / 2;
    print.position.set(3.972, 1.56, az);
    root.add(print);
  }

  // Floating oak wall shelf above Meuble TV with books, ceramic vase & plant
  const tvShelf = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.03, 0.96, 2, 0.005), mats.oak);
  tvShelf.position.set(0.11, 1.48, 2.00);
  tvShelf.castShadow = true;
  tvShelf.receiveShadow = true;
  root.add(tvShelf);

  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, 0.19, 18), mats.ceramic);
  vase.position.set(0.11, 1.59, 1.68);
  vase.castShadow = true;
  root.add(vase);

  for (let b = 0; b < 3; b++) {
    const book = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.024, 0.21, 2, 0.004),
      new THREE.MeshStandardMaterial({ color: [0x3b4d46, 0xd89b56, 0xeae2d4][b], roughness: 0.75 })
    );
    book.position.set(0.11, 1.508 + b * 0.025, 2.02);
    book.rotation.y = b * 0.14;
    book.castShadow = true;
    root.add(book);
  }

  const shelfPlant = buildPottedPlant(0.72, mats.terracottaPot, mats.leaf);
  shelfPlant.position.set(0.11, 1.495, 2.34);
  root.add(shelfPlant);

  // Tall indoor plant in sunny corner between Desk and Entrée (x=2.38, z=3.74)
  const cornerPlanter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.28, 24),
    mats.terracottaPot
  );
  cornerPlanter.position.set(2.38, 0.14, 3.74);
  cornerPlanter.castShadow = true;
  cornerPlanter.receiveShadow = true;
  root.add(cornerPlanter);

  const tallPlant = buildPottedPlant(1.9, mats.terracottaPot, mats.leaf);
  tallPlant.position.set(2.38, 0.22, 3.74);
  root.add(tallPlant);

  // Tripod standing floor lamp (lampadaire) between Meuble TV and Bureau (x=0.21, z=2.95)
  const floorLampGroup = new THREE.Group();
  const flX = 0.21;
  const flZ = 2.95;
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.5;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1.24, 10), mats.walnut);
    leg.position.set(flX + Math.cos(ang) * 0.09, 0.60, flZ + Math.sin(ang) * 0.09);
    leg.rotation.z = Math.cos(ang) * 0.11;
    leg.rotation.x = -Math.sin(ang) * 0.11;
    leg.castShadow = true;
    leg.userData.interactId = 'floor-lamp';
    floorLampGroup.add(leg);
  }
  const flShadeMat = new THREE.MeshStandardMaterial({
    color: 0xf4ece0,
    emissive: 0xffd08e,
    emissiveIntensity: 0.12,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const flShade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.24, 28, 1, true), flShadeMat);
  flShade.position.set(flX, 1.32, flZ);
  flShade.castShadow = true;
  flShade.userData.interactId = 'floor-lamp';
  floorLampGroup.add(flShade);

  const flBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff6e5,
    emissive: 0xffce82,
    emissiveIntensity: 0.45,
  });
  const flBulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), flBulbMat);
  flBulb.position.set(flX, 1.30, flZ);
  flBulb.userData.interactId = 'floor-lamp';
  floorLampGroup.add(flBulb);
  root.add(floorLampGroup);

  root.add(sofaGroup);

  // =========================================================
  // 5. GUÉRIDON (round table north of Canapé: x=1.48, z=0.87)
  // =========================================================
  const gueridonGroup = new THREE.Group();
  const gX = 1.48;
  const gZ = 0.87;
  const gTop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.27, 0.028, 32), mats.oak);
  gTop.position.set(gX, 0.54, gZ);
  gTop.castShadow = true;
  gTop.receiveShadow = true;
  gueridonGroup.add(gTop);

  // Tripod splayed legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const leg = makeLeg(0.016, 0.012, 0.55, mats.oak);
    leg.position.set(gX + Math.cos(a) * 0.14, 0.27, gZ + Math.sin(a) * 0.14);
    leg.rotation.z = Math.cos(a) * 0.12;
    leg.rotation.x = -Math.sin(a) * 0.12;
    gueridonGroup.add(leg);
  }

  // Book + ceramic mug + small plant on Guéridon
  const artBook = new THREE.Mesh(
    new RoundedBoxGeometry(0.19, 0.024, 0.24, 2, 0.004),
    new THREE.MeshStandardMaterial({ color: 0x3b4d46, roughness: 0.68 })
  );
  artBook.position.set(gX - 0.04, 0.566, gZ + 0.03);
  artBook.rotation.y = 0.3;
  artBook.castShadow = true;
  gueridonGroup.add(artBook);

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.035, 0.085, 16), mats.ceramic);
  mug.position.set(gX + 0.10, 0.596, gZ - 0.05);
  mug.castShadow = true;
  gueridonGroup.add(mug);

  const gPlant = buildPottedPlant(0.75, mats.terracottaPot, mats.leaf);
  gPlant.position.set(gX - 0.04, 0.578, gZ + 0.02);
  gueridonGroup.add(gPlant);

  root.add(gueridonGroup);

  // =========================================================
  // 6. MEUBLE TV + TV (left wall: x: 0.02..0.41, z: 1.40..2.60)
  // =========================================================
  const tvUnitGroup = new THREE.Group();
  const tvX = 0.215;
  const tvZ = 2.00;

  // Console body
  const consoleBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.38, 0.34, 1.20, 2, 0.01),
    mats.matteWhite
  );
  consoleBody.position.set(tvX, 0.31, tvZ);
  consoleBody.castShadow = true;
  consoleBody.receiveShadow = true;
  tvUnitGroup.add(consoleBody);

  const consoleTop = new THREE.Mesh(
    new RoundedBoxGeometry(0.39, 0.025, 1.21, 2, 0.006),
    mats.oak
  );
  consoleTop.position.set(tvX, 0.49, tvZ);
  consoleTop.castShadow = true;
  consoleTop.receiveShadow = true;
  tvUnitGroup.add(consoleTop);

  // Two oak drawer fronts + open shelf accent
  for (const dz of [1.62, 2.38]) {
    const drawer = new THREE.Mesh(
      new RoundedBoxGeometry(0.015, 0.28, 0.36, 2, 0.004),
      mats.oak
    );
    drawer.position.set(0.405, 0.31, dz);
    tvUnitGroup.add(drawer);
  }
  const niche = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.24, 0.38),
    mats.matteBlack
  );
  niche.position.set(0.39, 0.31, tvZ);
  tvUnitGroup.add(niche);

  for (const lx of [0.06, 0.36]) {
    for (const lz of [1.46, 2.54]) {
      const leg = makeLeg(0.018, 0.012, 0.14, mats.oak);
      leg.position.set(lx, 0.07, lz);
      tvUnitGroup.add(leg);
    }
  }

  // Flat-screen TV facing +X (toward Canapé)
  const tvStandBase = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.014, 0.36, 2, 0.004), mats.matteBlack);
  tvStandBase.position.set(0.16, 0.51, tvZ);
  tvUnitGroup.add(tvStandBase);

  const tvNeck = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), mats.matteBlack);
  tvNeck.position.set(0.13, 0.57, tvZ);
  tvUnitGroup.add(tvNeck);

  const tvChassis = new THREE.Mesh(new RoundedBoxGeometry(0.028, 0.50, 0.86, 2, 0.006), mats.matteBlack);
  tvChassis.position.set(0.14, 0.85, tvZ);
  tvChassis.castShadow = true;
  tvChassis.userData.interactId = 'tv';
  tvUnitGroup.add(tvChassis);

  const tvScreenRig = createDynamicTVScreen();
  const tvScreenMat = new THREE.MeshStandardMaterial({
    map: tvScreenRig.tex,
    emissiveMap: tvScreenRig.tex,
    emissive: 0xffffff,
    emissiveIntensity: 0.72,
    roughness: 0.16,
    metalness: 0.12,
  });
  const tvScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.46), tvScreenMat);
  tvScreenMesh.position.set(0.156, 0.85, tvZ);
  tvScreenMesh.rotation.y = Math.PI / 2;
  tvScreenMesh.userData.interactId = 'tv';
  tvUnitGroup.add(tvScreenMesh);

  const tvCtrl = {
    id: 'tv',
    label: 'Téléviseur',
    isOn: true,
    toggle() {
      this.isOn = !this.isOn;
      tvScreenMat.emissiveIntensity = this.isOn ? 0.72 : 0.0;
      tvScreenRig.update(0, this.isOn);
      return this.isOn;
    },
    update(_dt, elapsed) {
      if (this.isOn) {
        tvScreenRig.update(elapsed, true);
      }
    },
  };
  interactables.push(tvCtrl);
  root.add(tvUnitGroup);

  // =========================================================
  // 7. BUREAU + TABOURET/CHAISE (x: 0.41..1.79, z: 3.28..3.92)
  // =========================================================
  const deskGroup = new THREE.Group();
  const deskX = 1.10;
  const deskZ = 3.60;

  const deskTop = new THREE.Mesh(
    new RoundedBoxGeometry(1.38, 0.032, 0.64, 3, 0.008),
    mats.oak
  );
  deskTop.position.set(deskX, 0.74, deskZ);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  deskGroup.add(deskTop);

  // Slim matte-black trestle frame
  for (const sx of [0.46, 1.74]) {
    for (const sz of [3.34, 3.86]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.725, 0.03), mats.matteBlack);
      leg.position.set(sx, 0.3625, sz);
      leg.castShadow = true;
      deskGroup.add(leg);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.52), mats.matteBlack);
    cross.position.set(sx, 0.14, deskZ);
    deskGroup.add(cross);
  }

  // Desk mat
  const deskMat = new THREE.Mesh(
    new RoundedBoxGeometry(0.68, 0.004, 0.34, 2, 0.002),
    new THREE.MeshStandardMaterial({ color: 0x3b4943, roughness: 0.85 })
  );
  deskMat.position.set(deskX, 0.758, deskZ - 0.06);
  deskGroup.add(deskMat);

  // Open Laptop facing -Z (toward chair at z=3.02)
  const laptopBase = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.012, 0.22, 2, 0.004), mats.chrome);
  laptopBase.position.set(deskX, 0.764, deskZ - 0.04);
  laptopBase.castShadow = true;
  deskGroup.add(laptopBase);

  const laptopLidGroup = new THREE.Group();
  laptopLidGroup.position.set(deskX, 0.77, deskZ + 0.068);
  laptopLidGroup.rotation.x = 0.24; // tilted back towards window
  deskGroup.add(laptopLidGroup);

  const laptopLid = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.21, 0.008, 2, 0.003), mats.chrome);
  laptopLid.position.set(0, 0.105, 0);
  laptopLid.castShadow = true;
  laptopLidGroup.add(laptopLid);

  const laptopDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.19),
    new THREE.MeshStandardMaterial({
      map: textures.laptopScreen,
      emissiveMap: textures.laptopScreen,
      emissive: 0xffffff,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    })
  );
  laptopDisplay.position.set(0, 0.105, -0.005);
  laptopDisplay.rotation.y = Math.PI;
  laptopLidGroup.add(laptopDisplay);

  // Articulated brass desk lamp (clickable!)
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.018, 20), mats.matteBlack);
  lampBase.position.set(0.62, 0.765, 3.72);
  lampBase.castShadow = true;
  lampBase.userData.interactId = 'desk-lamp';
  deskGroup.add(lampBase);

  const lampArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 8), mats.brass);
  lampArm1.position.set(0.62, 0.89, 3.75);
  lampArm1.rotation.x = -0.25;
  lampArm1.userData.interactId = 'desk-lamp';
  deskGroup.add(lampArm1);

  const lampArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.22, 8), mats.brass);
  lampArm2.position.set(0.66, 1.04, 3.69);
  lampArm2.rotation.x = 0.65;
  lampArm2.rotation.z = -0.35;
  lampArm2.userData.interactId = 'desk-lamp';
  deskGroup.add(lampArm2);

  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.11, 20, 1, true), mats.matteBlack);
  lampShade.position.set(0.71, 1.07, 3.62);
  lampShade.rotation.z = -0.5;
  lampShade.rotation.x = 0.35;
  lampShade.castShadow = true;
  lampShade.userData.interactId = 'desk-lamp';
  deskGroup.add(lampShade);

  const deskBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff3db,
    emissive: 0xffc97a,
    emissiveIntensity: 0.4,
  });
  const deskBulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 12), deskBulbMat);
  deskBulb.position.set(0.72, 1.05, 3.61);
  deskBulb.userData.interactId = 'desk-lamp';
  deskGroup.add(deskBulb);

  // Small potted plant on right side of Bureau
  const deskPlant = buildPottedPlant(0.85, mats.ceramic, mats.leaf);
  deskPlant.position.set(1.58, 0.756, 3.72);
  deskGroup.add(deskPlant);

  // Round stool / studio chair (Tabouret / Chaise at x=1.10, z=3.04)
  const chairGroup = new THREE.Group();
  const chairX = 1.10;
  const chairZ = 3.04;
  const seatCushion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.20, 0.065, 28),
    mats.pillowSage
  );
  seatCushion.position.set(chairX, 0.46, chairZ);
  seatCushion.castShadow = true;
  seatCushion.receiveShadow = true;
  chairGroup.add(seatCushion);

  const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.36, 12), mats.matteBlack);
  chairStem.position.set(chairX, 0.26, chairZ);
  chairGroup.add(chairStem);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.024, 0.22, 2, 0.005), mats.matteBlack);
    foot.position.set(chairX + Math.sin(a) * 0.11, 0.04, chairZ + Math.cos(a) * 0.11);
    foot.rotation.y = a;
    foot.rotation.x = -0.18;
    chairGroup.add(foot);
  }
  deskGroup.add(chairGroup);
  root.add(deskGroup);

  // =========================================================
  // 8. CUISINE ÉQUIPÉE (x: 0..2.40, z: -2.00..0)
  // =========================================================
  const kitchenGroup = new THREE.Group();

  // Compact Fridge (x: 0.04..0.64, z: -1.96..-1.36)
  const fridgeMat = new THREE.MeshStandardMaterial({
    color: 0xd9dad6,
    roughness: 0.32,
    metalness: 0.45,
  });
  const fridgeBody = new THREE.Mesh(new RoundedBoxGeometry(0.58, 1.72, 0.58, 3, 0.025), fridgeMat);
  fridgeBody.position.set(0.34, 0.86, -1.66);
  fridgeBody.castShadow = true;
  fridgeBody.receiveShadow = true;
  kitchenGroup.add(fridgeBody);

  for (const hy of [1.22, 0.58]) {
    const fHandle = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.22, 0.025, 2, 0.005), mats.chrome);
    fHandle.position.set(0.56, hy, -1.36);
    kitchenGroup.add(fHandle);
  }

  // Base cabinets (x: 0.65..2.36, z: -1.96..-1.36)
  const kCab = new THREE.Mesh(new THREE.BoxGeometry(1.71, 0.86, 0.58), mats.matteWhite);
  kCab.position.set(1.505, 0.43, -1.67);
  kCab.castShadow = true;
  kCab.receiveShadow = true;
  kitchenGroup.add(kCab);

  // Oak butcher-block counter
  const kCounter = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.036, 0.60, 2, 0.005), mats.oak);
  kCounter.position.set(1.505, 0.878, -1.665);
  kCounter.castShadow = true;
  kCounter.receiveShadow = true;
  kitchenGroup.add(kCounter);

  // Backsplash
  const backsplash = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.58, 0.016),
    new THREE.MeshStandardMaterial({ color: 0xe8ded0, roughness: 0.38 })
  );
  backsplash.position.set(1.505, 1.18, -1.988);
  kitchenGroup.add(backsplash);

  // 2-burner induction hob
  const hob = new THREE.Mesh(
    new RoundedBoxGeometry(0.52, 0.008, 0.44, 2, 0.003),
    new THREE.MeshStandardMaterial({ color: 0x151619, roughness: 0.14, metalness: 0.4 })
  );
  hob.position.set(1.04, 0.898, -1.66);
  kitchenGroup.add(hob);

  // Stainless sink & gooseneck tap
  const sinkBasin = new THREE.Mesh(
    new RoundedBoxGeometry(0.46, 0.015, 0.40, 2, 0.004),
    mats.chrome
  );
  sinkBasin.position.set(1.94, 0.895, -1.66);
  kitchenGroup.add(sinkBasin);

  const sinkInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.016, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x878d94, roughness: 0.28, metalness: 0.8 })
  );
  sinkInner.position.set(1.94, 0.896, -1.66);
  kitchenGroup.add(sinkInner);

  const faucetPost = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.22, 12), mats.chrome);
  faucetPost.position.set(1.94, 1.00, -1.87);
  kitchenGroup.add(faucetPost);

  const faucetArch = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.01, 10, 18, Math.PI), mats.chrome);
  faucetArch.rotation.y = Math.PI / 2;
  faucetArch.position.set(1.94, 1.10, -1.805);
  kitchenGroup.add(faucetArch);

  // Upper wall cabinets + extractor hood + warm LED strip
  const upperCab = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.64, 0.34), mats.matteWhite);
  upperCab.position.set(1.505, 1.84, -1.82);
  upperCab.castShadow = true;
  kitchenGroup.add(upperCab);

  const ledStripMat = new THREE.MeshStandardMaterial({
    color: 0xfff5de,
    emissive: 0xffd79b,
    emissiveIntensity: 0.8,
  });
  const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.01, 0.025), ledStripMat);
  ledStrip.position.set(1.505, 1.515, -1.78);
  kitchenGroup.add(ledStrip);

  // Espresso kettle on counter
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.19, 16), mats.matteBlack);
  kettle.position.set(1.48, 0.99, -1.74);
  kettle.castShadow = true;
  kitchenGroup.add(kettle);

  root.add(kitchenGroup);

  // =========================================================
  // 9. DOUCHE ÉQUIPÉE (x: 2.40..4.00, z: -2.00..0)
  // =========================================================
  const bathGroup = new THREE.Group();

  // Walk-in shower tray (x: 3.05..3.98, z: -1.98..-1.04)
  const showerTray = new THREE.Mesh(
    new RoundedBoxGeometry(0.92, 0.045, 0.94, 2, 0.008),
    mats.ceramic
  );
  showerTray.position.set(3.52, 0.022, -1.51);
  showerTray.receiveShadow = true;
  bathGroup.add(showerTray);

  // Frameless glass shower screen (x = 3.05, z: -1.98..-1.12, height 2.02)
  const glassScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 2.02, 0.86),
    mats.glassClear
  );
  glassScreen.position.set(3.05, 1.04, -1.54);
  bathGroup.add(glassScreen);

  const glassProfile = new THREE.Mesh(new THREE.BoxGeometry(0.022, 2.04, 0.022), mats.chrome);
  glassProfile.position.set(3.05, 1.04, -1.975);
  bathGroup.add(glassProfile);

  // Rain shower column & head
  const showerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.15, 12), mats.chrome);
  showerColumn.position.set(3.93, 1.52, -1.52);
  bathGroup.add(showerColumn);

  const showerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.34, 10), mats.chrome);
  showerArm.rotation.z = Math.PI / 2;
  showerArm.position.set(3.77, 2.08, -1.52);
  bathGroup.add(showerArm);

  const rainHead = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.014, 24), mats.chrome);
  rainHead.position.set(3.61, 2.06, -1.52);
  bathGroup.add(rainHead);

  // Compact wall-hung WC (x: 2.68, z: -1.72)
  const wcTank = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.95, 0.18, 2, 0.01), mats.matteWhite);
  wcTank.position.set(2.68, 0.48, -1.90);
  wcTank.castShadow = true;
  bathGroup.add(wcTank);

  const wcBowl = new THREE.Mesh(new CylinderOrSphereBowl(), mats.ceramic);
  wcBowl.position.set(2.68, 0.34, -1.62);
  wcBowl.castShadow = true;
  bathGroup.add(wcBowl);

  const wcSeat = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.028, 0.42, 3, 0.012), mats.ceramic);
  wcSeat.position.set(2.68, 0.42, -1.61);
  bathGroup.add(wcSeat);

  // Floating oak vanity + ceramic basin + backlit round mirror (East wall z: -0.54)
  const vanityCab = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.44, 0.64, 2, 0.01), mats.oak);
  vanityCab.position.set(3.77, 0.56, -0.54);
  vanityCab.castShadow = true;
  vanityCab.receiveShadow = true;
  bathGroup.add(vanityCab);

  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.11, 24), mats.ceramic);
  basin.position.set(3.75, 0.835, -0.54);
  basin.castShadow = true;
  bathGroup.add(basin);

  const vanityTap = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.16, 12), mats.chrome);
  vanityTap.position.set(3.92, 0.86, -0.54);
  bathGroup.add(vanityTap);

  // Backlit round mirror in Douche
  const haloMat = new THREE.MeshStandardMaterial({
    color: 0xfff3dc,
    emissive: 0xffe2b0,
    emissiveIntensity: 0.75,
  });
  const mirrorHalo = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.01, 32), haloMat);
  mirrorHalo.rotation.z = Math.PI / 2;
  mirrorHalo.position.set(3.988, 1.46, -0.54);
  bathGroup.add(mirrorHalo);

  const bathMirror = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.014, 32),
    new THREE.MeshStandardMaterial({ color: 0xcfd9dd, roughness: 0.06, metalness: 0.92 })
  );
  bathMirror.rotation.z = Math.PI / 2;
  bathMirror.position.set(3.982, 1.46, -0.54);
  bathGroup.add(bathMirror);

  root.add(bathGroup);

  return {
    root,
    interactables,
    sconceShadeMat,
    deskBulbMat,
    flShadeMat,
    flBulbMat,
    ledStripMat,
    haloMat,
    tvCtrl,
    armoireCtrl,
  };
}

function CylinderOrSphereBowl() {
  const g = new THREE.CylinderGeometry(0.17, 0.13, 0.24, 20);
  g.scale(1.0, 1.0, 1.24);
  return g;
}
