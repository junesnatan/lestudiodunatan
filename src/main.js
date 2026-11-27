import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { VIEWPOINTS, detectRoom } from './planData.js';
import { createTextures } from './textures.js';
import { buildRoom } from './roomBuilder.js';
import { buildFurniture } from './furnitureBuilder.js';
import { createLighting } from './lighting.js';
import { createNavigator } from './navigation.js';
import { createMinimap } from './minimap.js';

const canvas = document.getElementById('scene-canvas');
const roomBadge = document.getElementById('room-badge');
const promptPill = document.getElementById('interact-prompt');
const promptText = document.getElementById('interact-text');
const viewpointDock = document.getElementById('viewpoint-dock');
const minimapCard = document.getElementById('minimap-card');
const minimapCanvas = document.getElementById('minimap-canvas');
const btnModeFps = document.getElementById('btn-mode-fps');
const btnModeOrbit = document.getElementById('btn-mode-orbit');
const btnCurtains = document.getElementById('btn-curtains');
const btnArchviz = document.getElementById('btn-archviz');
const btnSnapshot = document.getElementById('btn-snapshot');
const btnDimensions = document.getElementById('btn-dimensions');
const btnPlan = document.getElementById('btn-plan');
const btnPointerLock = document.getElementById('btn-pointer-lock');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');
const lightButtons = document.querySelectorAll('[data-light]');

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.06;

// --- SCENE & CAMERA ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.06, 120);

const pmrem = new THREE.PMREMGenerator(renderer);
let currentEnvRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
scene.environment = currentEnvRT.texture;
scene.environmentIntensity = 0.62;

// --- BUILD WORLD ---
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const textures = createTextures(maxAniso);
const roomRig = buildRoom(textures);
scene.add(roomRig.root);

const furnitureRig = buildFurniture(textures);
scene.add(furnitureRig.root);

const lighting = createLighting(scene, renderer, roomRig, furnitureRig);

// --- DYNAMIC STUDIO CUBEMAP PROBE (REAL ROOM REFLECTIONS ON FLOOR & METALS) ---
const cubeRT = new THREE.WebGLCubeRenderTarget(128, {
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter,
  type: THREE.HalfFloatType,
});
const cubeCamera = new THREE.CubeCamera(0.15, 35, cubeRT);
cubeCamera.position.set(2.0, 1.35, 2.0);
scene.add(cubeCamera);

function refreshStudioIBL() {
  const prevMirrorVis = roomRig.reflector.visible;
  const prevShaftsVis = roomRig.sunShaftsGroup.visible;
  const prevGuidesVis = roomRig.guidesGroup.visible;
  roomRig.reflector.visible = false;
  roomRig.sunShaftsGroup.visible = false;
  roomRig.guidesGroup.visible = false;

  cubeCamera.update(renderer, scene);

  roomRig.reflector.visible = prevMirrorVis;
  roomRig.sunShaftsGroup.visible = prevShaftsVis;
  roomRig.guidesGroup.visible = prevGuidesVis;

  const nextEnvRT = pmrem.fromCubemap(cubeRT.texture);
  scene.environment = nextEnvRT.texture;
  scene.environmentIntensity = 0.75;
  if (currentEnvRT) currentEnvRT.dispose();
  currentEnvRT = nextEnvRT;
}

// --- ARCHVIZ POST-PROCESSING PIPELINE (GTAO + BLOOM + AgX + FXAA) ---
let archvizEnabled = true;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const gtaoPass = new GTAOPass(
  scene,
  camera,
  Math.max(320, Math.floor(window.innerWidth * 0.65)),
  Math.max(240, Math.floor(window.innerHeight * 0.65))
);
gtaoPass.output = GTAOPass.OUTPUT.Default;
gtaoPass.blendIntensity = 0.62;
gtaoPass.pdRings = 1;
gtaoPass.pdRadiusExponent = 2;
gtaoPass.pdSamples = 8;
gtaoPass.updateGtaoMaterial({
  radius: 0.36,
  distanceExponent: 1.45,
  thickness: 1.0,
  scale: 1.05,
  samples: 8,
  distanceFallOff: 1.0,
});

const origGtaoRender = gtaoPass.render.bind(gtaoPass);
gtaoPass.render = (rend, writeBuffer, readBuffer, deltaTime, maskActive) => {
  const hidden = [];
  scene.traverse((obj) => {
    if (obj.userData?.skipAO && obj.visible) {
      obj.visible = false;
      hidden.push(obj);
    }
  });
  try {
    origGtaoRender(rend, writeBuffer, readBuffer, deltaTime, maskActive);
  } finally {
    for (const obj of hidden) obj.visible = true;
  }
};
composer.addPass(gtaoPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.14,
  0.42,
  0.94
);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const fxaaPass = new ShaderPass(FXAAShader);
function syncFxaaResolution() {
  const dpr = renderer.getPixelRatio();
  fxaaPass.material.uniforms.resolution.value.set(
    1 / (window.innerWidth * dpr),
    1 / (window.innerHeight * dpr)
  );
}
syncFxaaResolution();
composer.addPass(fxaaPass);

// Collect all interactive controllers by id
const interactiveMap = new Map();
for (const item of [
  ...roomRig.interactables,
  ...furnitureRig.interactables,
  lighting.deskLampCtrl,
  lighting.floorLampCtrl,
]) {
  interactiveMap.set(item.id, item);
}

// --- NAVIGATION ---
let activeViewpointId = 'entree';
const navigator = createNavigator(camera, canvas, roomRig.doors, roomRig.ceilingGroup, (state) => {
  if (state.viewpointId) activeViewpointId = state.viewpointId;
  syncModeUI();
});

const startVp = VIEWPOINTS[0];
navigator.snapToViewpoint(startVp);

// --- MINIMAP ---
const minimap = createMinimap(minimapCanvas, (wx, wz) => {
  activeViewpointId = '';
  syncViewpointButtons();
  navigator.walkToPoint(wx, wz);
});
minimap.render(camera.position.x, camera.position.z, navigator.getYaw(), navigator.getMode());

// --- UI BINDINGS ---
function syncViewpointButtons() {
  for (const btn of viewpointDock.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.vp === activeViewpointId);
  }
}

function syncModeUI() {
  const m = navigator.getMode();
  btnModeFps.classList.toggle('active', m === 'fps');
  btnModeOrbit.classList.toggle('active', m === 'orbit');
  btnPointerLock.style.display = m === 'fps' ? 'inline-flex' : 'none';
  syncViewpointButtons();
}

for (const vp of VIEWPOINTS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'vp-btn';
  btn.dataset.vp = vp.id;
  btn.textContent = vp.label;
  btn.addEventListener('click', () => {
    activeViewpointId = vp.id;
    navigator.goToViewpoint(vp);
    syncModeUI();
  });
  viewpointDock.appendChild(btn);
}
syncModeUI();

btnModeFps.addEventListener('click', () => {
  if (navigator.getMode() === 'orbit') {
    activeViewpointId = 'ensemble';
    navigator.goToViewpoint(VIEWPOINTS[1]);
  }
});

btnModeOrbit.addEventListener('click', () => {
  const maquetteVp = VIEWPOINTS.find((v) => v.id === 'maquette');
  if (maquetteVp) {
    activeViewpointId = 'maquette';
    navigator.goToViewpoint(maquetteVp);
  }
});

btnPointerLock.addEventListener('click', () => {
  navigator.togglePointerLock();
});

btnZoomIn.addEventListener('click', () => navigator.zoomBy(1));
btnZoomOut.addEventListener('click', () => navigator.zoomBy(-1));
btnZoomReset.addEventListener('click', () => navigator.resetZoom());

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  btnPointerLock.classList.toggle('active', locked);
  btnPointerLock.textContent = locked ? 'Quitter souris libre (Échap)' : 'Visée souris libre';
});

function syncCurtainsBtn() {
  const closed = !roomRig.curtainsRig.isOpen;
  btnCurtains.classList.toggle('active', closed);
  btnCurtains.textContent = closed ? 'Ouvrir rideaux' : 'Fermer rideaux';
}
syncCurtainsBtn();

let shadowAnimTimer = 0.9;

btnCurtains.addEventListener('click', () => {
  roomRig.curtainsRig.toggle();
  syncCurtainsBtn();
  shadowAnimTimer = 1.0;
  lighting.requestEnvRefresh();
});

btnArchviz.addEventListener('click', () => {
  archvizEnabled = !archvizEnabled;
  if (archvizEnabled) {
    gtaoPass.enabled = true;
    slowFrameStreak = 0;
  }
  btnArchviz.classList.toggle('active', archvizEnabled);
  btnArchviz.textContent = archvizEnabled ? 'Rendu Studio HD' : 'Mode fluide';
});

btnSnapshot.addEventListener('click', () => {
  renderer.shadowMap.needsUpdate = true;
  renderCurrentFrame();
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `studio-rendu-${lighting.getPreset()}.png`;
  a.click();
});

btnDimensions.addEventListener('click', () => {
  roomRig.guidesGroup.visible = !roomRig.guidesGroup.visible;
  btnDimensions.classList.toggle('active', roomRig.guidesGroup.visible);
});

btnPlan.addEventListener('click', () => {
  const hidden = minimapCard.classList.toggle('collapsed');
  btnPlan.classList.toggle('active', !hidden);
});

for (const btn of lightButtons) {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.light;
    lighting.setPreset(preset);
    shadowAnimTimer = 1.1;
    for (const b of lightButtons) {
      b.classList.toggle('active', b === btn);
    }
  });
}

// --- RAYCAST INTERACTION ---
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2(0, 0);
let hoveredInteractId = null;

function getInteractLabel(id) {
  const ctrl = interactiveMap.get(id);
  if (!ctrl) return '';
  if ('isOpen' in ctrl) {
    return `${ctrl.isOpen ? 'Fermer' : 'Ouvrir'} : ${ctrl.label}`;
  }
  if ('isOn' in ctrl) {
    return `${ctrl.isOn ? 'Éteindre' : 'Allumer'} : ${ctrl.label}`;
  }
  return ctrl.label;
}

function updateHover(clientX, clientY) {
  if (document.pointerLockElement === canvas) {
    pointerNDC.set(0, 0);
  } else if (clientX !== undefined && clientY !== undefined) {
    pointerNDC.x = (clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  let foundId = null;
  for (const h of hits) {
    if (h.distance > 4.2) break;
    let obj = h.object;
    while (obj) {
      if (obj.userData && obj.userData.interactId) {
        foundId = obj.userData.interactId;
        break;
      }
      obj = obj.parent;
    }
    if (foundId) break;
    if (h.object.material && !h.object.material.transparent) break;
  }

  hoveredInteractId = foundId;
  if (foundId && interactiveMap.has(foundId)) {
    promptText.textContent = getInteractLabel(foundId);
    promptPill.classList.add('visible');
    canvas.style.cursor = 'pointer';
  } else {
    promptPill.classList.remove('visible');
    canvas.style.cursor = navigator.getMode() === 'fps' ? 'grab' : 'move';
  }
}

function triggerInteract(id) {
  const ctrl = interactiveMap.get(id);
  if (!ctrl) return;
  ctrl.toggle();
  if (id === 'curtains') syncCurtainsBtn();
  shadowAnimTimer = 0.9;
  lighting.requestEnvRefresh();
  updateHover();
}

canvas.addEventListener('pointermove', (e) => {
  updateHover(e.clientX, e.clientY);
});

canvas.addEventListener('click', (e) => {
  if (navigator.wasDragged()) return;
  updateHover(e.clientX, e.clientY);
  if (hoveredInteractId) {
    triggerInteract(hoveredInteractId);
  }
});

canvas.addEventListener('dblclick', (e) => {
  if (navigator.getMode() !== 'fps') return;
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const h of hits) {
    if (h.object.userData?.walkableFloor) {
      activeViewpointId = '';
      syncViewpointButtons();
      navigator.walkToPoint(h.point.x, h.point.z);
      break;
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'KeyE' && hoveredInteractId) {
    triggerInteract(hoveredInteractId);
  } else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
    navigator.zoomBy(1);
  } else if (e.key === '-' || e.code === 'NumpadSubtract') {
    navigator.zoomBy(-1);
  } else if (e.key === '0' || e.code === 'Numpad0') {
    navigator.resetZoom();
  }
});

// --- RESIZE ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  gtaoPass.setSize(
    Math.max(320, Math.floor(window.innerWidth * 0.65)),
    Math.max(240, Math.floor(window.innerHeight * 0.65))
  );
  bloomPass.setSize(window.innerWidth, window.innerHeight);
  syncFxaaResolution();
});

// --- ANIMATION LOOP WITH ADAPTIVE GPU WATCHDOG ---
const clock = new THREE.Clock();
let lastRoom = '';
let slowFrameStreak = 0;

function renderCurrentFrame() {
  if (archvizEnabled) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function scheduleNextFrame(lastFrameMs) {
  if (lastFrameMs > 65) {
    setTimeout(() => requestAnimationFrame(animate), 24);
  } else {
    requestAnimationFrame(animate);
  }
}

function animate() {
  const t0 = performance.now();
  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;

  navigator.update(dt);
  lighting.update(dt, refreshStudioIBL);

  if (shadowAnimTimer > 0) {
    shadowAnimTimer -= dt;
    renderer.shadowMap.needsUpdate = true;
  }

  for (const d of roomRig.doors) d.update(dt);
  roomRig.windowRig.update(dt);
  roomRig.curtainsRig.update(dt);
  furnitureRig.armoireCtrl.update(dt);
  furnitureRig.tvCtrl.update(dt, elapsed);

  const curRoom =
    navigator.getMode() === 'orbit'
      ? 'Vue maquette'
      : detectRoom(camera.position.x, camera.position.z);
  if (curRoom !== lastRoom) {
    lastRoom = curRoom;
    roomBadge.textContent = curRoom;
  }

  if (document.pointerLockElement === canvas) {
    updateHover();
  }

  const zLabel = `${navigator.getZoomFactor().toFixed(1)}×`;
  if (btnZoomReset.textContent !== zLabel) {
    btnZoomReset.textContent = zLabel;
  }

  minimap.render(camera.position.x, camera.position.z, navigator.getYaw(), navigator.getMode());
  renderCurrentFrame();

  const frameMs = performance.now() - t0;
  if (archvizEnabled && gtaoPass.enabled && frameMs > 180) {
    slowFrameStreak += 1;
    if (slowFrameStreak >= 3) {
      // Automatically keep UI responsive on software/low-end GPUs
      gtaoPass.enabled = false;
    }
  } else {
    slowFrameStreak = 0;
  }

  scheduleNextFrame(frameMs);
}

// Defer first frame to allow immediate DOM paint & non-blocking page load
requestAnimationFrame(animate);

window.__STUDIO_APP__ = {
  navigator,
  lighting,
  roomRig,
  furnitureRig,
  camera,
  VIEWPOINTS,
};
