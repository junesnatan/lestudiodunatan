import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ROOM, OPENINGS, FURNITURE_COLLIDERS } from './planData.js';

const EYE_HEIGHT = 1.60;
const PLAYER_RADIUS = 0.19;
const DEFAULT_FOV = 62;
const MIN_FOV = 20;
const MAX_FOV = 90;

export function createNavigator(camera, domElement, doors, ceilingGroup, onStateChange) {
  let mode = 'fps'; // 'fps' | 'orbit'
  let yaw = 0;
  let pitch = 0;
  let targetEyeY = EYE_HEIGHT;
  let targetFov = DEFAULT_FOV;
  let activeTransition = null;
  let walkTarget = null;
  let dragMoved = false;

  const keys = new Set();
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;

  const orbit = new OrbitControls(camera, domElement);
  orbit.enabled = false;
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.enableZoom = true;
  orbit.zoomSpeed = 1.1;
  orbit.maxPolarAngle = Math.PI * 0.485;
  orbit.minDistance = 1.5;
  orbit.maxDistance = 14.0;
  orbit.target.set(2.0, 0.85, 1.1);

  function setLookFromTarget(pos, lookAt) {
    const dir = new THREE.Vector3().subVectors(lookAt, pos).normalize();
    yaw = Math.atan2(-dir.x, -dir.z);
    pitch = Math.asin(Math.max(-0.98, Math.min(0.98, dir.y)));
  }

  function applyFpsRotation() {
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  }

  function isBlocked(nx, nz) {
    // Exterior walls
    if (nx < PLAYER_RADIUS || nx > ROOM.width - PLAYER_RADIUS) return true;
    if (nz < -ROOM.backDepth + PLAYER_RADIUS || nz > ROOM.studioDepth - PLAYER_RADIUS) return true;

    // Divider between Cuisine and Douche (z < 0, x = 2.40)
    if (nz < 0.05 && Math.abs(nx - ROOM.kitchenWidth) < ROOM.intWallT / 2 + PLAYER_RADIUS) {
      return true;
    }

    // Partition wall at z = 0 between Studio and Cuisine/Douche
    if (Math.abs(nz - 0.0) < ROOM.intWallT / 2 + PLAYER_RADIUS) {
      const cDoor = doors.find((d) => d.id === 'door-cuisine');
      const dDoor = doors.find((d) => d.id === 'door-douche');
      const inCuisineGap =
        nx > OPENINGS.cuisineDoor.xMin + PLAYER_RADIUS * 0.65 &&
        nx < OPENINGS.cuisineDoor.xMax - PLAYER_RADIUS * 0.65 &&
        (!cDoor || cDoor.isOpen);
      const inDoucheGap =
        nx > OPENINGS.doucheDoor.xMin + PLAYER_RADIUS * 0.65 &&
        nx < OPENINGS.doucheDoor.xMax - PLAYER_RADIUS * 0.65 &&
        (!dDoor || dDoor.isOpen);
      if (!inCuisineGap && !inDoucheGap) return true;
    }

    // Static furniture AABBs
    for (const box of FURNITURE_COLLIDERS) {
      if (
        nx > box.minX - PLAYER_RADIUS &&
        nx < box.maxX + PLAYER_RADIUS &&
        nz > box.minZ - PLAYER_RADIUS &&
        nz < box.maxZ + PLAYER_RADIUS
      ) {
        return true;
      }
    }
    return false;
  }

  function moveWithSlide(dx, dz) {
    const curX = camera.position.x;
    const curZ = camera.position.z;
    if (!isBlocked(curX + dx, curZ)) {
      camera.position.x += dx;
    }
    if (!isBlocked(camera.position.x, curZ + dz)) {
      camera.position.z += dz;
    }
  }

  function setMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    walkTarget = null;
    if (mode === 'orbit') {
      if (document.pointerLockElement === domElement) {
        document.exitPointerLock();
      }
      targetFov = DEFAULT_FOV;
      ceilingGroup.visible = false;
      orbit.enabled = true;
      orbit.target.set(2.0, 0.85, 1.1);
      orbit.update();
    } else {
      orbit.enabled = false;
      ceilingGroup.visible = true;
      setLookFromTarget(camera.position, orbit.target);
    }
    onStateChange?.({ mode });
  }

  function snapToViewpoint(vp) {
    activeTransition = null;
    walkTarget = null;
    targetFov = DEFAULT_FOV;
    camera.fov = DEFAULT_FOV;
    camera.updateProjectionMatrix();
    if (vp.mode === 'orbit') {
      mode = 'orbit';
      ceilingGroup.visible = false;
      camera.position.set(...vp.pos);
      orbit.target.set(...vp.lookAt);
      orbit.enabled = true;
      orbit.update();
    } else {
      mode = 'fps';
      orbit.enabled = false;
      ceilingGroup.visible = true;
      targetEyeY = vp.pos[1];
      camera.position.set(...vp.pos);
      setLookFromTarget(camera.position, new THREE.Vector3(...vp.lookAt));
      applyFpsRotation();
    }
    onStateChange?.({ mode, viewpointId: vp.id });
  }

  function goToViewpoint(vp) {
    walkTarget = null;
    targetFov = DEFAULT_FOV;
    if (vp.mode === 'orbit') {
      mode = 'orbit';
      if (document.pointerLockElement === domElement) {
        document.exitPointerLock();
      }
      ceilingGroup.visible = false;
      orbit.enabled = false;
      activeTransition = {
        elapsed: 0,
        duration: 0.78,
        startPos: camera.position.clone(),
        endPos: new THREE.Vector3(...vp.pos),
        startQuat: camera.quaternion.clone(),
        endLookAt: new THREE.Vector3(...vp.lookAt),
        targetMode: 'orbit',
      };
      onStateChange?.({ mode: 'orbit', viewpointId: vp.id });
      return;
    }

    // Auto-open Cuisine/Douche door when flying into those rooms
    if (vp.room === 'Cuisine') {
      const cDoor = doors.find((d) => d.id === 'door-cuisine');
      if (cDoor && !cDoor.isOpen) cDoor.toggle();
    } else if (vp.room === 'Douche') {
      const dDoor = doors.find((d) => d.id === 'door-douche');
      if (dDoor && !dDoor.isOpen) dDoor.toggle();
    }

    mode = 'fps';
    orbit.enabled = false;
    ceilingGroup.visible = true;
    targetEyeY = vp.pos[1];

    const endPos = new THREE.Vector3(...vp.pos);
    const endLookAt = new THREE.Vector3(...vp.lookAt);
    const dummyCam = camera.clone();
    dummyCam.position.copy(endPos);
    dummyCam.lookAt(endLookAt);

    activeTransition = {
      elapsed: 0,
      duration: 0.72,
      startPos: camera.position.clone(),
      endPos,
      startQuat: camera.quaternion.clone(),
      endQuat: dummyCam.quaternion.clone(),
      endLookAt,
      targetMode: 'fps',
    };
    onStateChange?.({ mode: 'fps', viewpointId: vp.id });
  }

  function walkToPoint(x, z) {
    if (mode !== 'fps') {
      setMode('fps');
    }
    activeTransition = null;
    targetEyeY = EYE_HEIGHT;
    // Clamp slightly away from outer walls
    const cx = Math.max(0.24, Math.min(ROOM.width - 0.24, x));
    const cz = Math.max(-ROOM.backDepth + 0.24, Math.min(ROOM.studioDepth - 0.24, z));
    // Auto-open doors if target is inside Cuisine or Douche
    if (cz < 0) {
      const doorId = cx < ROOM.kitchenWidth ? 'door-cuisine' : 'door-douche';
      const door = doors.find((d) => d.id === doorId);
      if (door && !door.isOpen) door.toggle();
    }
    if (!isBlocked(cx, cz)) {
      walkTarget = new THREE.Vector3(cx, EYE_HEIGHT, cz);
    } else {
      // Try slight nudges around target if user clicked near a furniture edge
      for (const [ox, oz] of [
        [0.25, 0],
        [-0.25, 0],
        [0, 0.25],
        [0, -0.25],
        [0.4, 0.4],
        [-0.4, -0.4],
      ]) {
        if (!isBlocked(cx + ox, cz + oz)) {
          walkTarget = new THREE.Vector3(cx + ox, EYE_HEIGHT, cz + oz);
          break;
        }
      }
    }
  }

  function zoomBy(steps) {
    if (mode === 'orbit') {
      const offset = camera.position.clone().sub(orbit.target);
      const dist = offset.length();
      const factor = steps > 0 ? 0.82 : 1.22;
      const nextDist = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, dist * factor));
      offset.setLength(nextDist);
      camera.position.copy(orbit.target).add(offset);
      orbit.update();
      return;
    }
    targetFov = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFov - steps * 8));
  }

  function resetZoom() {
    if (mode === 'orbit') {
      const offset = camera.position.clone().sub(orbit.target);
      offset.setLength(9.4);
      camera.position.copy(orbit.target).add(offset);
      orbit.update();
      return;
    }
    targetFov = DEFAULT_FOV;
  }

  function getZoomFactor() {
    if (mode === 'orbit') {
      const dist = Math.max(0.5, camera.position.distanceTo(orbit.target));
      return 9.4 / dist;
    }
    const baseTan = Math.tan(THREE.MathUtils.degToRad(DEFAULT_FOV / 2));
    const curTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return baseTan / Math.max(0.05, curTan);
  }

  function togglePointerLock() {
    if (mode !== 'fps') setMode('fps');
    if (document.pointerLockElement === domElement) {
      document.exitPointerLock();
    } else {
      domElement.requestPointerLock?.();
    }
  }

  // Keyboard listeners (supports French AZERTY ZQSD + QWERTY WASD + Arrow keys)
  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onPointerDown(e) {
    if (mode !== 'fps') return;
    isDragging = true;
    dragMoved = false;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
  }

  function onPointerMove(e) {
    if (mode !== 'fps') return;
    const zoomScale = Math.max(0.3, camera.fov / DEFAULT_FOV);
    if (document.pointerLockElement === domElement) {
      yaw -= e.movementX * 0.0022 * zoomScale;
      pitch = Math.max(-1.25, Math.min(1.25, pitch - e.movementY * 0.0022 * zoomScale));
      activeTransition = null;
      return;
    }
    if (!isDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    if (Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY) > 6) {
      dragMoved = true;
    }
    yaw -= dx * 0.0036 * zoomScale;
    pitch = Math.max(-1.25, Math.min(1.25, pitch - dy * 0.0036 * zoomScale));
    activeTransition = null;
  }

  function onWheel(e) {
    if (mode !== 'fps') return; // OrbitControls handles wheel in orbit mode
    e.preventDefault();
    targetFov = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFov + e.deltaY * 0.04));
  }

  function onPointerUp() {
    isDragging = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  function update(dt) {
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 10);
      camera.updateProjectionMatrix();
    }
    if (activeTransition) {
      activeTransition.elapsed += dt;
      const raw = Math.min(1, activeTransition.elapsed / activeTransition.duration);
      const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;

      camera.position.lerpVectors(activeTransition.startPos, activeTransition.endPos, t);

      if (activeTransition.targetMode === 'orbit') {
        const tempCam = camera.clone();
        tempCam.position.copy(activeTransition.endPos);
        tempCam.lookAt(activeTransition.endLookAt);
        camera.quaternion.slerpQuaternions(activeTransition.startQuat, tempCam.quaternion, t);
      } else {
        camera.quaternion.slerpQuaternions(activeTransition.startQuat, activeTransition.endQuat, t);
      }

      if (raw >= 1) {
        const finished = activeTransition;
        activeTransition = null;
        if (finished.targetMode === 'orbit') {
          orbit.target.copy(finished.endLookAt);
          orbit.enabled = true;
          orbit.update();
        } else {
          setLookFromTarget(finished.endPos, finished.endLookAt);
          applyFpsRotation();
        }
      }
      return;
    }

    if (mode === 'orbit') {
      orbit.update();
      return;
    }

    // FPS manual movement (KeyW handles Z on AZERTY, KeyA handles Q on AZERTY!)
    let forward = 0;
    let strafe = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;

    if (forward !== 0 || strafe !== 0) {
      walkTarget = null;
      targetEyeY = EYE_HEIGHT;
      const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.4 : 1.55;
      const len = Math.hypot(forward, strafe);
      const f = (forward / len) * speed * dt;
      const s = (strafe / len) * speed * dt;

      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      const dx = -sinY * f + cosY * s;
      const dz = -cosY * f - sinY * s;
      moveWithSlide(dx, dz);
    } else if (walkTarget) {
      const toX = walkTarget.x - camera.position.x;
      const toZ = walkTarget.z - camera.position.z;
      const dist = Math.hypot(toX, toZ);
      if (dist < 0.05) {
        walkTarget = null;
      } else {
        const step = Math.min(dist, 2.2 * dt);
        const prevX = camera.position.x;
        const prevZ = camera.position.z;
        moveWithSlide((toX / dist) * step, (toZ / dist) * step);
        if (Math.hypot(camera.position.x - prevX, camera.position.z - prevZ) < 0.002) {
          walkTarget = null;
        }
      }
    }

    camera.position.y += (targetEyeY - camera.position.y) * Math.min(1, dt * 8);
    applyFpsRotation();
  }

  return {
    getMode: () => mode,
    getYaw: () => yaw,
    wasDragged: () => dragMoved,
    setMode,
    snapToViewpoint,
    goToViewpoint,
    walkToPoint,
    zoomBy,
    resetZoom,
    getZoomFactor,
    togglePointerLock,
    update,
  };
}
