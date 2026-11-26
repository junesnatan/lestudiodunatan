import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

// --- SCENE & CAMERA ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.06, 120);

// Physically-based environment lighting for realistic glass, chrome & oak sheen
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;

// --- BUILD WORLD ---
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const textures = createTextures(maxAniso);
const roomRig = buildRoom(textures);
scene.add(roomRig.root);

const furnitureRig = buildFurniture(textures);
scene.add(furnitureRig.root);

const lighting = createLighting(scene, renderer, roomRig, furnitureRig);

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

// Start cleanly at the Entrance looking diagonally across the studio
const startVp = VIEWPOINTS[0];
navigator.snapToViewpoint(startVp);

// --- MINIMAP ---
const minimap = createMinimap(minimapCanvas, (wx, wz) => {
  activeViewpointId = '';
  syncViewpointButtons();
  navigator.walkToPoint(wx, wz);
});

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

btnCurtains.addEventListener('click', () => {
  roomRig.curtainsRig.toggle();
  syncCurtainsBtn();
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
    // Stop at solid walls/opaque blockers
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
});

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
let lastRoom = '';

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;

  navigator.update(dt);
  lighting.update(dt);

  for (const d of roomRig.doors) d.update(dt);
  roomRig.windowRig.update(dt);
  roomRig.curtainsRig.update(dt);
  furnitureRig.armoireCtrl.update(dt);
  furnitureRig.tvCtrl.update(dt, elapsed);

  // Update active room label
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
  renderer.render(scene, camera);
}

animate();

// Expose clean debug hook for Playwright inspection if needed
window.__STUDIO_APP__ = {
  navigator,
  lighting,
  roomRig,
  furnitureRig,
  camera,
  VIEWPOINTS,
};
