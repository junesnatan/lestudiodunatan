import { ROOM, OPENINGS, OUTLETS } from './planData.js';

export function createMinimap(canvas, onWalkTo) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pad = 16;

  // Map world bounds x: [0..4], z: [-2..4] into canvas
  const worldW = ROOM.width;
  const worldH = ROOM.backDepth + ROOM.studioDepth;
  const scale = Math.min((W - pad * 2) / worldW, (H - pad * 2) / worldH);
  const offX = (W - worldW * scale) / 2;
  const offY = (H - worldH * scale) / 2;

  const toPx = (wx, wz) => [offX + wx * scale, offY + (wz + ROOM.backDepth) * scale];
  const toWorld = (px, py) => [(px - offX) / scale, (py - offY) / scale - ROOM.backDepth];

  function drawRoundedRect(wx, wz, ww, wh, fill, stroke, radius = 3) {
    const [x, y] = toPx(wx, wz);
    ctx.beginPath();
    ctx.roundRect(x, y, ww * scale, wh * scale, radius);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function render(camX, camZ, yaw, mode) {
    ctx.clearRect(0, 0, W, H);

    // Room floor fills (Studio dark grey tiles, Cuisine warm terrazzo, Douche mint)
    drawRoundedRect(0, -2.0, 2.4, 2.0, 'rgba(242, 214, 178, 0.28)', null, 0); // Cuisine
    drawRoundedRect(2.4, -2.0, 1.6, 2.0, 'rgba(176, 224, 206, 0.25)', null, 0); // Douche
    drawRoundedRect(0, 0, 4.0, 4.0, 'rgba(58, 62, 68, 0.72)', null, 0); // Studio dark tile floor

    // Furniture silhouettes (matching exact positions)
    drawRoundedRect(0.02, 0.14, 0.08, 0.82, 'rgba(130, 190, 240, 0.35)', '#6ba6d8', 2); // Miroir
    drawRoundedRect(3.28, 0.04, 0.70, 1.05, 'rgba(225, 220, 208, 0.28)', 'rgba(245,242,236,0.45)', 3); // Armoire
    drawRoundedRect(2.56, 1.10, 1.40, 1.90, 'rgba(178, 172, 222, 0.28)', '#9a92d8', 4); // Lit
    drawRoundedRect(0.98, 1.12, 1.04, 1.65, 'rgba(232, 196, 178, 0.28)', '#d29b82', 4); // Canapé
    drawRoundedRect(0.03, 1.40, 0.38, 1.20, 'rgba(245, 242, 236, 0.18)', 'rgba(245,242,236,0.4)', 3); // Meuble TV
    drawRoundedRect(0.41, 3.32, 1.38, 0.64, 'rgba(107, 165, 142, 0.30)', '#6ba58e', 4); // Bureau

    // Guéridon & Tabouret circles
    for (const [cx, cz, r, stroke] of [
      [1.48, 0.87, 0.28, '#d89b56'],
      [1.10, 3.04, 0.21, 'rgba(245,242,236,0.45)'],
    ]) {
      const [px, py] = toPx(cx, cz);
      ctx.beginPath();
      ctx.arc(px, py, r * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,242,236,0.16)';
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    // Walls
    ctx.strokeStyle = '#f5f2ec';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    // Outer perimeter (leave sliding window & entrance gap visually distinguished)
    const [tlx, tly] = toPx(0, -2.0);
    const [trx, try_] = toPx(4.0, -2.0);
    const [brx, bry] = toPx(4.0, 4.0);
    const [blx, bly] = toPx(0, 4.0);
    ctx.moveTo(tlx, tly);
    ctx.lineTo(trx, try_);
    ctx.lineTo(brx, bry);
    const [eRightX, eRightY] = toPx(OPENINGS.entreeDoor.xMax, 4.0);
    ctx.lineTo(eRightX, eRightY);
    ctx.moveTo(...toPx(OPENINGS.entreeDoor.xMin, 4.0));
    ctx.lineTo(...toPx(OPENINGS.window.xMax, 4.0));
    ctx.moveTo(...toPx(OPENINGS.window.xMin, 4.0));
    ctx.lineTo(blx, bly);
    ctx.lineTo(tlx, tly);
    // Cuisine / Douche divider
    ctx.moveTo(...toPx(2.4, -2.0));
    ctx.lineTo(...toPx(2.4, 0));
    // Studio north partition with door gaps
    ctx.moveTo(...toPx(0, 0));
    ctx.lineTo(...toPx(OPENINGS.cuisineDoor.xMin, 0));
    ctx.moveTo(...toPx(OPENINGS.cuisineDoor.xMax, 0));
    ctx.lineTo(...toPx(OPENINGS.doucheDoor.xMin, 0));
    ctx.moveTo(...toPx(OPENINGS.doucheDoor.xMax, 0));
    ctx.lineTo(...toPx(4.0, 0));
    ctx.stroke();

    // Sliding window blue highlight
    ctx.strokeStyle = '#4ba3e3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(...toPx(OPENINGS.window.xMin, 4.0));
    ctx.lineTo(...toPx(OPENINGS.window.xMax, 4.0));
    ctx.stroke();

    // Red outlets
    for (const o of OUTLETS) {
      const [ox, oy] = toPx(o.x, o.z);
      ctx.beginPath();
      ctx.arc(ox, oy, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = '#e0483e';
      ctx.fill();
    }

    // Room labels
    ctx.fillStyle = 'rgba(245, 242, 236, 0.78)';
    ctx.font = '600 10px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cuisine', ...toPx(1.2, -1.05));
    ctx.fillText('Douche', ...toPx(3.2, -1.05));
    ctx.fillText('Lit', ...toPx(3.26, 2.08));
    ctx.fillText('Canapé', ...toPx(1.5, 1.95));
    ctx.fillText('Bureau', ...toPx(1.1, 3.65));

    // Camera position & viewing cone (when in FPS mode or inside bounds)
    if (mode === 'fps' || (camX >= -0.2 && camX <= 4.2 && camZ >= -2.2 && camZ <= 4.2)) {
      const [cx, cy] = toPx(camX, camZ);
      // Forward vector in world XZ is (-sin(yaw), -cos(yaw))
      const dirX = -Math.sin(yaw);
      const dirZ = -Math.cos(yaw);
      const ang = Math.atan2(dirZ, dirX);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 26, ang - 0.52, ang + 0.52);
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
      grad.addColorStop(0, 'rgba(216, 155, 86, 0.55)');
      grad.addColorStop(1, 'rgba(216, 155, 86, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 4.6, 0, Math.PI * 2);
      ctx.fillStyle = '#d89b56';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const [wx, wz] = toWorld(px, py);
    if (wx >= 0 && wx <= ROOM.width && wz >= -ROOM.backDepth && wz <= ROOM.studioDepth) {
      onWalkTo(wx, wz);
    }
  });

  return { render };
}
