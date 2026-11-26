import * as THREE from 'three';

const PRESETS = {
  day: {
    sky: new THREE.Color(0xb8d7ec),
    bg: new THREE.Color(0xaecce0),
    sunColor: new THREE.Color(0xfff4e0),
    sunIntensity: 3.15,
    sunPos: new THREE.Vector3(-2.4, 4.8, 8.6),
    hemiSky: new THREE.Color(0xddebf7),
    hemiGround: new THREE.Color(0x9a846c),
    hemiIntensity: 0.78,
    pendantIntensity: 0.35,
    kitchenIntensity: 0.55,
    bathIntensity: 0.55,
    sconceIntensity: 0.12,
    deskLampMax: 1.45,
    exposure: 1.08,
  },
  golden: {
    sky: new THREE.Color(0xdba77b),
    bg: new THREE.Color(0xc79268),
    sunColor: new THREE.Color(0xffb469),
    sunIntensity: 2.85,
    sunPos: new THREE.Vector3(-4.4, 2.55, 8.2),
    hemiSky: new THREE.Color(0xf6cfa8),
    hemiGround: new THREE.Color(0x745842),
    hemiIntensity: 0.62,
    pendantIntensity: 0.95,
    kitchenIntensity: 1.05,
    bathIntensity: 0.95,
    sconceIntensity: 0.45,
    deskLampMax: 1.65,
    exposure: 1.06,
  },
  night: {
    sky: new THREE.Color(0x162033),
    bg: new THREE.Color(0x121926),
    sunColor: new THREE.Color(0x7c97c6),
    sunIntensity: 0.38,
    sunPos: new THREE.Vector3(-2.6, 5.2, 8.8),
    hemiSky: new THREE.Color(0x2c3b59),
    hemiGround: new THREE.Color(0x281f18),
    hemiIntensity: 0.34,
    pendantIntensity: 2.35,
    kitchenIntensity: 1.85,
    bathIntensity: 1.65,
    sconceIntensity: 1.15,
    deskLampMax: 1.95,
    exposure: 1.04,
  },
};

export function createLighting(scene, renderer, roomRig, furnitureRig) {
  let activePreset = 'day';
  let deskLampUserOverride = null; // null = follow preset, boolean = explicit user toggle
  let floorLampUserOverride = null;

  const sunLight = new THREE.DirectionalLight(0xfff4e0, 3.15);
  sunLight.position.copy(PRESETS.day.sunPos);
  sunLight.target.position.set(1.85, 0.4, 1.55);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1.0;
  sunLight.shadow.camera.far = 20.0;
  sunLight.shadow.camera.left = -4.2;
  sunLight.shadow.camera.right = 4.2;
  sunLight.shadow.camera.top = 4.2;
  sunLight.shadow.camera.bottom = -4.2;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const hemiLight = new THREE.HemisphereLight(0xddebf7, 0x9a846c, 0.78);
  hemiLight.position.set(2.0, 2.65, 1.5);
  scene.add(hemiLight);

  // Studio central warm pendant light
  const pendantLight = new THREE.PointLight(0xffd7a1, 0.35, 7.2, 1.6);
  pendantLight.position.set(2.0, 2.12, 2.0);
  scene.add(pendantLight);

  // Desk lamp practical light
  const deskLampLight = new THREE.PointLight(0xffca82, 0.4, 3.2, 1.8);
  deskLampLight.position.set(0.75, 1.02, 3.60);
  scene.add(deskLampLight);

  // Standing tripod floor lamp light
  const floorLampLight = new THREE.PointLight(0xffcb84, 0.35, 4.2, 1.7);
  floorLampLight.position.set(0.28, 1.32, 2.95);
  scene.add(floorLampLight);

  // Bed reading sconce light
  const sconceLight = new THREE.PointLight(0xffc985, 0.12, 3.0, 1.8);
  sconceLight.position.set(3.75, 1.24, 1.52);
  scene.add(sconceLight);

  // Kitchen ceiling + under-cabinet light
  const kitchenLight = new THREE.PointLight(0xffe5bd, 0.55, 4.5, 1.6);
  kitchenLight.position.set(1.25, 2.35, -1.15);
  scene.add(kitchenLight);

  // Douche vanity + ceiling light
  const bathLight = new THREE.PointLight(0xfff0d6, 0.55, 4.2, 1.6);
  bathLight.position.set(3.2, 2.35, -0.95);
  scene.add(bathLight);

  // TV screen ambient bounce light
  const tvGlowLight = new THREE.PointLight(0xe09f68, 0.35, 3.2, 1.8);
  tvGlowLight.position.set(0.38, 0.85, 2.0);
  scene.add(tvGlowLight);

  const deskLampCtrl = {
    id: 'desk-lamp',
    label: 'Lampe de bureau',
    get isOn() {
      if (deskLampUserOverride !== null) return deskLampUserOverride;
      return activePreset !== 'day';
    },
    toggle() {
      deskLampUserOverride = !this.isOn;
      return deskLampUserOverride;
    },
  };

  const floorLampCtrl = {
    id: 'floor-lamp',
    label: 'Lampadaire',
    get isOn() {
      if (floorLampUserOverride !== null) return floorLampUserOverride;
      return activePreset !== 'day';
    },
    toggle() {
      floorLampUserOverride = !this.isOn;
      return floorLampUserOverride;
    },
  };

  function setPreset(name) {
    if (!PRESETS[name]) return;
    activePreset = name;
    deskLampUserOverride = null;
    floorLampUserOverride = null;
  }

  function update(dt) {
    const p = PRESETS[activePreset];
    const k = Math.min(1, dt * 4.5);

    scene.background.lerp(p.bg, k);
    roomRig.skyMat.color.lerp(p.sky, k);

    sunLight.color.lerp(p.sunColor, k);
    sunLight.intensity += (p.sunIntensity - sunLight.intensity) * k;
    sunLight.position.lerp(p.sunPos, k);

    hemiLight.color.lerp(p.hemiSky, k);
    hemiLight.groundColor.lerp(p.hemiGround, k);
    hemiLight.intensity += (p.hemiIntensity - hemiLight.intensity) * k;

    pendantLight.intensity += (p.pendantIntensity - pendantLight.intensity) * k;
    kitchenLight.intensity += (p.kitchenIntensity - kitchenLight.intensity) * k;
    bathLight.intensity += (p.bathIntensity - bathLight.intensity) * k;
    sconceLight.intensity += (p.sconceIntensity - sconceLight.intensity) * k;

    const lampTarget = deskLampCtrl.isOn ? p.deskLampMax : 0.0;
    deskLampLight.intensity += (lampTarget - deskLampLight.intensity) * k;

    const floorLampTarget = floorLampCtrl.isOn ? p.deskLampMax * 1.15 : 0.0;
    floorLampLight.intensity += (floorLampTarget - floorLampLight.intensity) * k;

    const tvTarget = furnitureRig.tvCtrl.isOn ? (activePreset === 'night' ? 0.85 : 0.3) : 0.0;
    tvGlowLight.intensity += (tvTarget - tvGlowLight.intensity) * k;

    // Sync emissive materials on fixtures
    roomRig.pendantShadeMat.emissiveIntensity = 0.08 + pendantLight.intensity * 0.22;
    roomRig.pendantBulbMat.emissiveIntensity = 0.25 + pendantLight.intensity * 0.65;
    for (const sm of roomRig.spotMats) {
      sm.emissiveIntensity = 0.35 + kitchenLight.intensity * 0.45;
    }
    furnitureRig.deskBulbMat.emissiveIntensity = deskLampCtrl.isOn ? 1.1 : 0.05;
    furnitureRig.flBulbMat.emissiveIntensity = floorLampCtrl.isOn ? 1.1 : 0.08;
    furnitureRig.flShadeMat.emissiveIntensity = floorLampCtrl.isOn ? 0.38 : 0.04;
    furnitureRig.sconceShadeMat.emissiveIntensity = 0.08 + sconceLight.intensity * 0.55;
    furnitureRig.ledStripMat.emissiveIntensity = 0.35 + kitchenLight.intensity * 0.45;
    furnitureRig.haloMat.emissiveIntensity = 0.35 + bathLight.intensity * 0.45;

    renderer.toneMappingExposure += (p.exposure - renderer.toneMappingExposure) * k;
  }

  scene.background = PRESETS.day.bg.clone();

  return {
    setPreset,
    getPreset: () => activePreset,
    deskLampCtrl,
    floorLampCtrl,
    update,
  };
}
