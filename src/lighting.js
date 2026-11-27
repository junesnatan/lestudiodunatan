import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const PRESETS = {
  day: {
    zenith: new THREE.Color(0x5b95cc),
    horizon: new THREE.Color(0xdbe8f3),
    bg: new THREE.Color(0xaecce0),
    sunColor: new THREE.Color(0xfff4e2),
    sunIntensity: 3.1,
    sunPos: new THREE.Vector3(-2.4, 4.8, 8.6),
    rectColor: new THREE.Color(0xf2f6ff),
    rectIntensity: 3.4,
    shaftOpacity: 0.14,
    hemiSky: new THREE.Color(0xdceaf7),
    hemiGround: new THREE.Color(0x7d7266),
    hemiIntensity: 0.62,
    pendantIntensity: 0.25,
    kitchenIntensity: 0.65,
    bathIntensity: 0.65,
    sconceIntensity: 0.10,
    deskLampMax: 1.45,
    exposure: 1.06,
  },
  golden: {
    zenith: new THREE.Color(0x5d6e8f),
    horizon: new THREE.Color(0xe6ad7f),
    bg: new THREE.Color(0xc79268),
    sunColor: new THREE.Color(0xffb469),
    sunIntensity: 2.95,
    sunPos: new THREE.Vector3(-4.4, 2.55, 8.2),
    rectColor: new THREE.Color(0xffd7b0),
    rectIntensity: 2.6,
    shaftOpacity: 0.18,
    hemiSky: new THREE.Color(0xf4cfa8),
    hemiGround: new THREE.Color(0x695442),
    hemiIntensity: 0.54,
    pendantIntensity: 0.95,
    kitchenIntensity: 1.15,
    bathIntensity: 1.05,
    sconceIntensity: 0.45,
    deskLampMax: 1.65,
    exposure: 1.08,
  },
  night: {
    zenith: new THREE.Color(0x0c1322),
    horizon: new THREE.Color(0x1f2d45),
    bg: new THREE.Color(0x121926),
    sunColor: new THREE.Color(0x7c97c6),
    sunIntensity: 0.34,
    sunPos: new THREE.Vector3(-2.6, 5.2, 8.8),
    rectColor: new THREE.Color(0x415a85),
    rectIntensity: 0.45,
    shaftOpacity: 0.0,
    hemiSky: new THREE.Color(0x283652),
    hemiGround: new THREE.Color(0x221b16),
    hemiIntensity: 0.28,
    pendantIntensity: 2.55,
    kitchenIntensity: 1.95,
    bathIntensity: 1.75,
    sconceIntensity: 1.25,
    deskLampMax: 2.0,
    exposure: 1.05,
  },
};

export function createLighting(scene, renderer, roomRig, furnitureRig) {
  RectAreaLightUniformsLib.init();

  let activePreset = 'day';
  let deskLampUserOverride = null;
  let floorLampUserOverride = null;
  let dirtyEnvTimer = 0.05;

  const sunLight = new THREE.DirectionalLight(0xfff4e2, 3.1);
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
  sunLight.shadow.bias = -0.00045;
  sunLight.shadow.normalBias = 0.018;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Soft rectangular window area light (ArchViz window glow & floor specular streaks)
  const windowRectLight = new THREE.RectAreaLight(0xf2f6ff, 3.4, 2.30, 1.48);
  windowRectLight.position.set(1.435, 1.54, 3.98);
  windowRectLight.lookAt(1.435, 1.25, 0.0);
  scene.add(windowRectLight);

  const hemiLight = new THREE.HemisphereLight(0xdceaf7, 0x7d7266, 0.62);
  hemiLight.position.set(2.0, 2.65, 1.5);
  scene.add(hemiLight);

  const pendantLight = new THREE.PointLight(0xffd7a1, 0.25, 7.2, 1.6);
  pendantLight.position.set(2.0, 2.12, 2.0);
  scene.add(pendantLight);

  const deskLampLight = new THREE.PointLight(0xffca82, 0.4, 3.2, 1.8);
  deskLampLight.position.set(0.75, 1.02, 3.58);
  scene.add(deskLampLight);

  const floorLampLight = new THREE.PointLight(0xffcb84, 0.35, 4.2, 1.7);
  floorLampLight.position.set(0.28, 1.32, 2.95);
  scene.add(floorLampLight);

  const sconceLight = new THREE.PointLight(0xffc985, 0.10, 3.0, 1.8);
  sconceLight.position.set(3.75, 1.24, 1.52);
  scene.add(sconceLight);

  const kitchenLight = new THREE.PointLight(0xffe5bd, 0.65, 4.5, 1.6);
  kitchenLight.position.set(1.25, 2.35, -1.15);
  scene.add(kitchenLight);

  const bathLight = new THREE.PointLight(0xfff0d6, 0.65, 4.2, 1.6);
  bathLight.position.set(3.2, 2.35, -0.95);
  scene.add(bathLight);

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
      dirtyEnvTimer = 0.08;
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
      dirtyEnvTimer = 0.08;
      return floorLampUserOverride;
    },
  };

  function setPreset(name) {
    if (!PRESETS[name]) return;
    activePreset = name;
    deskLampUserOverride = null;
    floorLampUserOverride = null;
    dirtyEnvTimer = 0.25;
  }

  function requestEnvRefresh() {
    dirtyEnvTimer = 0.22;
  }

  function update(dt, onRefreshEnv) {
    const p = PRESETS[activePreset];
    const k = Math.min(1, dt * 4.5);
    const curtainOpen = roomRig.curtainsRig ? roomRig.curtainsRig.openRatio : 1;

    scene.background.lerp(p.bg, k);
    roomRig.skyUniforms.uZenithColor.value.lerp(p.zenith, k);
    roomRig.skyUniforms.uHorizonColor.value.lerp(p.horizon, k);
    roomRig.skyUniforms.uSunColor.value.lerp(p.sunColor, k);
    roomRig.skyUniforms.uSunDir.value.copy(p.sunPos).normalize();

    sunLight.color.lerp(p.sunColor, k);
    const sunTarget = p.sunIntensity * (0.28 + 0.72 * curtainOpen);
    sunLight.intensity += (sunTarget - sunLight.intensity) * k;
    sunLight.position.lerp(p.sunPos, k);

    windowRectLight.color.lerp(p.rectColor, k);
    const rectTarget = p.rectIntensity * (0.34 + 0.66 * curtainOpen);
    windowRectLight.intensity += (rectTarget - windowRectLight.intensity) * k;

    const shaftTarget = p.shaftOpacity * curtainOpen;
    roomRig.sunShaftsMat.opacity += (shaftTarget - roomRig.sunShaftsMat.opacity) * k;
    roomRig.sunShaftsGroup.visible = roomRig.sunShaftsMat.opacity > 0.005;

    // Subtle fabric subsurface daylight glow when beige curtains are drawn closed
    if (roomRig.curtainsRig) {
      const sunGlow = activePreset === 'night' ? 0.01 : 0.04 + (1 - curtainOpen) * 0.11;
      roomRig.curtainsRig.beigeMat.emissiveIntensity +=
        (sunGlow - roomRig.curtainsRig.beigeMat.emissiveIntensity) * k;
    }

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

    if (dirtyEnvTimer > 0) {
      dirtyEnvTimer -= dt;
      if (dirtyEnvTimer <= 0) {
        onRefreshEnv?.();
      }
    }
  }

  scene.background = PRESETS.day.bg.clone();

  return {
    setPreset,
    getPreset: () => activePreset,
    requestEnvRefresh,
    deskLampCtrl,
    floorLampCtrl,
    update,
  };
}
