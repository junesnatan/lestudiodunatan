import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function configureTex(tex, repeatX, repeatY, isColor, maxAniso) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

// Convert a grayscale height canvas into a true tangent-space RGB normal map texture
function heightCanvasToNormalTexture(heightCanvas, strength, repeatX, repeatY, maxAniso) {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d');
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = makeCanvas(w, h);
  const outCtx = outCanvas.getContext('2d');
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;
  const inv255 = 1 / 255;

  for (let y = 0; y < h; y++) {
    const ym1 = ((y - 1 + h) % h) * w;
    const y0 = y * w;
    const yp1 = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const xm1 = (x - 1 + w) % w;
      const xp1 = (x + 1) % w;

      const tl = src[(ym1 + xm1) << 2] * inv255;
      const t = src[(ym1 + x) << 2] * inv255;
      const tr = src[(ym1 + xp1) << 2] * inv255;
      const l = src[(y0 + xm1) << 2] * inv255;
      const r = src[(y0 + xp1) << 2] * inv255;
      const bl = src[(yp1 + xm1) << 2] * inv255;
      const b = src[(yp1 + x) << 2] * inv255;
      const br = src[(yp1 + xp1) << 2] * inv255;

      const dx = tr + 2 * r + br - (tl + 2 * l + bl);
      const dy = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = dy * strength;
      let nz = 1.0;
      const invLen = 1.0 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y0 + x) << 2;
      dst[idx] = (nx * 127.5 + 127.5) | 0;
      dst[idx + 1] = (ny * 127.5 + 127.5) | 0;
      dst[idx + 2] = (nz * 127.5 + 127.5) | 0;
      dst[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return configureTex(new THREE.CanvasTexture(outCanvas), repeatX, repeatY, false, maxAniso);
}

function createDarkTileTextures(maxAniso) {
  const size = 512;
  const colorC = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const hCtx = heightC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const rand = seededRandom(42);

  // Dark slate mortar joints
  cCtx.fillStyle = '#222427';
  cCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#404040';
  hCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#e8e8e8';
  rCtx.fillRect(0, 0, size, size);

  const grid = 4;
  const tile = size / grid;
  const grout = 5;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const x = col * tile + grout / 2;
      const y = row * tile + grout / 2;
      const w = tile - grout;
      const h = tile - grout;

      const base = 54 + Math.floor((rand() - 0.5) * 10);
      cCtx.fillStyle = `rgb(${base},${base + 2},${base + 5})`;
      cCtx.fillRect(x, y, w, h);

      const roughBase = 86 + Math.floor((rand() - 0.5) * 24);
      rCtx.fillStyle = `rgb(${roughBase},${roughBase},${roughBase})`;
      rCtx.fillRect(x, y, w, h);

      // Raised bevel edge -> flat satin interior
      hCtx.fillStyle = '#b0b0b0';
      hCtx.fillRect(x, y, w, h);
      hCtx.fillStyle = '#d4d4d4';
      hCtx.fillRect(x + 3, y + 3, w - 6, h - 6);

      // Fine porcelain stone grain
      for (let i = 0; i < 160; i++) {
        const sx = x + 2 + rand() * (w - 4);
        const sy = y + 2 + rand() * (h - 4);
        const rad = 0.8 + rand() * 3.0;
        const light = rand() > 0.48;
        cCtx.fillStyle = light
          ? `rgba(116,122,129,${0.03 + rand() * 0.05})`
          : `rgba(24,26,29,${0.04 + rand() * 0.06})`;
        cCtx.beginPath();
        cCtx.arc(sx, sy, rad, 0, Math.PI * 2);
        cCtx.fill();

        const rv = light ? 66 : 114;
        rCtx.fillStyle = `rgba(${rv},${rv},${rv},0.16)`;
        rCtx.fillRect(sx, sy, 3, 3);

        const hv = light ? 218 : 198;
        hCtx.fillStyle = `rgba(${hv},${hv},${hv},0.18)`;
        hCtx.fillRect(sx, sy, 2, 2);
      }

      // Subtle mineral stone vein
      cCtx.strokeStyle = 'rgba(136,142,150,0.065)';
      cCtx.lineWidth = 1.6;
      cCtx.beginPath();
      const vx = x + rand() * w * 0.4;
      const vy = y + rand() * h;
      cCtx.moveTo(vx, vy);
      cCtx.bezierCurveTo(
        x + w * 0.4,
        vy + (rand() - 0.5) * 55,
        x + w * 0.7,
        vy + (rand() - 0.5) * 55,
        x + w,
        y + rand() * h
      );
      cCtx.stroke();
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2.2, 2.2, true, maxAniso),
    normalMap: heightCanvasToNormalTexture(heightC, 1.8, 2.2, 2.2, maxAniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 2.2, 2.2, false, maxAniso),
  };
}

function createTerrazzoTextures(maxAniso) {
  const size = 256;
  const colorC = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const hCtx = heightC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const rand = seededRandom(101);

  cCtx.fillStyle = '#ede3d4';
  cCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#d2d2d2';
  hCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#9c9c9c';
  rCtx.fillRect(0, 0, size, size);

  const chipColors = ['#d4b998', '#bfa082', '#9d8c7b', '#f8f3eb', '#c68e68', '#8e968f'];
  for (let i = 0; i < 650; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 1.5 + rand() * 5.5;
    cCtx.fillStyle = chipColors[Math.floor(rand() * chipColors.length)];
    cCtx.beginPath();
    cCtx.moveTo(cx + r, cy);
    for (let a = 1; a <= 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      const rr = r * (0.65 + rand() * 0.5);
      cCtx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
    }
    cCtx.closePath();
    cCtx.fill();

    rCtx.fillStyle = rand() > 0.5 ? '#6e6e6e' : '#8d8d8d';
    rCtx.beginPath();
    rCtx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    rCtx.fill();
  }

  cCtx.strokeStyle = 'rgba(155,142,126,0.38)';
  cCtx.lineWidth = 3;
  hCtx.strokeStyle = '#585858';
  hCtx.lineWidth = 4;
  rCtx.strokeStyle = '#dcdcdc';
  rCtx.lineWidth = 3;
  for (let i = 0; i <= 2; i++) {
    const p = (i * size) / 2;
    for (const ctx of [cCtx, hCtx, rCtx]) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2.5, 2.2, true, maxAniso),
    normalMap: heightCanvasToNormalTexture(heightC, 1.3, 2.5, 2.2, maxAniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 2.5, 2.2, false, maxAniso),
  };
}

function createTileMintTextures(maxAniso) {
  const size = 256;
  const colorC = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const hCtx = heightC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const rand = seededRandom(77);

  cCtx.fillStyle = '#ddeae4';
  cCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#d4d4d4';
  hCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#727272';
  rCtx.fillRect(0, 0, size, size);

  const cols = 4;
  const rows = 4;
  const tw = size / cols;
  const th = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shade = Math.floor((rand() - 0.5) * 10);
      cCtx.fillStyle = `rgb(${218 + shade},${234 + shade},${227 + shade})`;
      cCtx.fillRect(c * tw + 2, r * th + 2, tw - 4, th - 4);
      for (let k = 0; k < 18; k++) {
        cCtx.fillStyle = 'rgba(130,152,144,0.08)';
        cCtx.fillRect(c * tw + 4 + rand() * (tw - 8), r * th + 4 + rand() * (th - 8), 2, 2);
      }
      hCtx.strokeStyle = '#5a5a5a';
      hCtx.lineWidth = 4;
      hCtx.strokeRect(c * tw, r * th, tw, th);
      rCtx.strokeStyle = '#dadada';
      rCtx.lineWidth = 4;
      rCtx.strokeRect(c * tw, r * th, tw, th);
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2, 2.2, true, maxAniso),
    normalMap: heightCanvasToNormalTexture(heightC, 1.4, 2, 2.2, maxAniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 2, 2.2, false, maxAniso),
  };
}

function createPlasterTextures(maxAniso) {
  const size = 256;
  const colorC = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const hCtx = heightC.getContext('2d');
  const rand = seededRandom(19);

  cCtx.fillStyle = '#f5f2ec';
  cCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#c8c8c8';
  hCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 0.8 + rand() * 2.8;
    const v = rand() > 0.5 ? 255 : 228;
    cCtx.fillStyle = `rgba(${v},${v - 2},${v - 6},0.045)`;
    cCtx.beginPath();
    cCtx.arc(x, y, rad, 0, Math.PI * 2);
    cCtx.fill();

    const bv = rand() > 0.5 ? 218 : 178;
    hCtx.fillStyle = `rgba(${bv},${bv},${bv},0.16)`;
    hCtx.fillRect(x, y, 2, 2);
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2.5, 1.5, true, maxAniso),
    normalMap: heightCanvasToNormalTexture(heightC, 0.75, 2.5, 1.5, maxAniso),
  };
}

function createWoodOakTextures(maxAniso, tint = [196, 155, 108]) {
  const size = 256;
  const colorC = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const hCtx = heightC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const rand = seededRandom(305);

  cCtx.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
  cCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#c8c8c8';
  hCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#7c7c7c';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 280; i++) {
    const y = rand() * size;
    const alpha = 0.035 + rand() * 0.09;
    const dark = rand() > 0.35;
    cCtx.strokeStyle = dark ? `rgba(105,68,34,${alpha})` : `rgba(242,216,182,${alpha})`;
    cCtx.lineWidth = 0.7 + rand() * 2;
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.bezierCurveTo(
      size * 0.3,
      y + (rand() - 0.5) * 14,
      size * 0.7,
      y + (rand() - 0.5) * 14,
      size,
      y + (rand() - 0.5) * 6
    );
    cCtx.stroke();

    hCtx.strokeStyle = dark ? `rgba(148,148,148,${alpha * 1.6})` : `rgba(220,220,220,${alpha})`;
    hCtx.lineWidth = 1.2;
    hCtx.beginPath();
    hCtx.moveTo(0, y);
    hCtx.lineTo(size, y);
    hCtx.stroke();

    rCtx.strokeStyle = dark ? 'rgba(150,150,150,0.22)' : 'rgba(95,95,95,0.18)';
    rCtx.lineWidth = 1.2;
    rCtx.beginPath();
    rCtx.moveTo(0, y);
    rCtx.lineTo(size, y);
    rCtx.stroke();
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 1, 1, true, maxAniso),
    normalMap: heightCanvasToNormalTexture(heightC, 1.15, 1, 1, maxAniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 1, 1, false, maxAniso),
  };
}

function createFabricTextures(maxAniso, baseHex, weaveAlpha = 0.14) {
  const size = 128;
  const colorC = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const hCtx = heightC.getContext('2d');
  const rand = seededRandom(55);

  cCtx.fillStyle = baseHex;
  cCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#a0a0a0';
  hCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const toggle = ((x + y) / 4) % 2 === 0;
      const n = (rand() - 0.5) * 16;
      cCtx.fillStyle = toggle
        ? `rgba(255,250,244,${weaveAlpha})`
        : `rgba(72,62,54,${weaveAlpha * 0.85})`;
      cCtx.fillRect(x, y, 3, 3);

      const bv = Math.max(85, Math.min(235, (toggle ? 205 : 132) + n));
      hCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      hCtx.fillRect(x, y, 3, 3);
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 5, 5, true, maxAniso),
    normalMap: heightCanvasToNormalTexture(heightC, 1.35, 5, 5, maxAniso),
  };
}

function createRugTexture(maxAniso) {
  const size = 256;
  const colorC = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const hCtx = heightC.getContext('2d');
  const rand = seededRandom(88);

  cCtx.fillStyle = '#e8dfd1';
  cCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#a0a0a0';
  hCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    const shade = 228 + Math.floor((rand() - 0.5) * 18);
    cCtx.fillStyle = `rgb(${shade},${shade - 7},${shade - 17})`;
    cCtx.fillRect(0, y, size, 2);

    const b = 148 + Math.floor((rand() - 0.5) * 68);
    hCtx.fillStyle = `rgb(${b},${b},${b})`;
    hCtx.fillRect(0, y, size, 2);
  }

  // Modern architectural emerald & charcoal border motif matching the room
  cCtx.strokeStyle = 'rgba(46,111,91,0.52)';
  cCtx.lineWidth = 8;
  cCtx.strokeRect(26, 26, size - 52, size - 52);
  cCtx.strokeStyle = 'rgba(56,58,62,0.42)';
  cCtx.lineWidth = 2;
  cCtx.strokeRect(40, 40, size - 80, size - 80);

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 1, 1, true, maxAniso),
    normalMap: heightCanvasToNormalTexture(heightC, 1.5, 2, 2, maxAniso),
  };
}

function createArtTexture(maxAniso, variant = 0) {
  const c = makeCanvas(512, 640);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, 512, 640);

  if (variant === 0) {
    ctx.fillStyle = '#cf8962';
    ctx.beginPath();
    ctx.arc(256, 235, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d3b38';
    ctx.beginPath();
    ctx.moveTo(110, 540);
    ctx.lineTo(110, 330);
    ctx.arc(220, 330, 110, Math.PI, 0, false);
    ctx.lineTo(330, 540);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#1f1d1a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(325, 360, 74, 0.2, Math.PI * 1.45);
    ctx.stroke();
  } else if (variant === 1) {
    ctx.fillStyle = '#e6ded2';
    ctx.fillRect(46, 56, 420, 528);
    ctx.strokeStyle = '#2e6f5b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(256, 520);
    ctx.quadraticCurveTo(240, 320, 268, 130);
    ctx.stroke();

    ctx.fillStyle = '#3b7f69';
    for (const [lx, ly, rot, sx] of [
      [195, 380, -0.55, 1],
      [318, 340, 0.55, 1],
      [205, 255, -0.45, 0.85],
      [312, 215, 0.48, 0.85],
    ]) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 62 * sx, 26 * sx, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.fillStyle = '#2c3035';
    ctx.fillRect(72, 120, 180, 380);
    ctx.fillStyle = '#d89b56';
    ctx.beginPath();
    ctx.arc(320, 310, 108, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5f0e8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(140, 220);
    ctx.lineTo(390, 220);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createFacadeTexture(maxAniso) {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ded4c4';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(130,120,104,0.22)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const cols = [52, 198, 344];
  const rows = [42, 210, 372];
  for (const ry of rows) {
    for (const cx of cols) {
      // Stone window surround
      ctx.fillStyle = '#ede5d7';
      ctx.fillRect(cx - 8, ry - 8, 124, 144);
      ctx.fillStyle = '#2d3942';
      ctx.fillRect(cx, ry, 108, 128);
      ctx.fillStyle = 'rgba(246, 224, 188, 0.34)';
      ctx.fillRect(cx + 6, ry + 6, 38, 116);
      ctx.strokeStyle = '#f5f0e8';
      ctx.lineWidth = 4;
      ctx.strokeRect(cx, ry, 108, 128);
      ctx.beginPath();
      ctx.moveTo(cx + 54, ry);
      ctx.lineTo(cx + 54, ry + 128);
      ctx.stroke();
      ctx.strokeStyle = '#202224';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 6, ry + 84, 120, 44);
      for (let bx = cx; bx <= cx + 108; bx += 14) {
        ctx.beginPath();
        ctx.moveTo(bx, ry + 84);
        ctx.lineTo(bx, ry + 128);
        ctx.stroke();
      }
    }
  }

  return configureTex(new THREE.CanvasTexture(c), 2, 1.5, true, maxAniso);
}

function createLaptopTexture(maxAniso) {
  const c = makeCanvas(512, 320);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 320);
  grad.addColorStop(0, '#18242b');
  grad.addColorStop(1, '#253c43');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 320);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(24, 24, 464, 272);
  ctx.strokeStyle = '#73b29a';
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 72, 152, 172);
  ctx.fillStyle = '#e7b174';
  ctx.fillRect(42, 48, 110, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(42, 76, 95, 8);
  ctx.fillRect(42, 94, 80, 8);
  ctx.fillRect(42, 112, 102, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createContactShadowTexture() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Soft rectangular pillowed falloff for grounded GI contact shadows
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const inset = 14 + t * 56;
    const alpha = 0.045 * (1 - t * 0.65);
    ctx.fillStyle = `rgba(8, 8, 10, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(inset, inset, size - inset * 2, size - inset * 2, 36);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createRadialShadowTexture() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  g.addColorStop(0, 'rgba(6, 7, 9, 0.56)');
  g.addColorStop(0.55, 'rgba(6, 7, 9, 0.24)');
  g.addColorStop(1, 'rgba(6, 7, 9, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createCornerShadeTexture() {
  const c = makeCanvas(32, 256);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(10, 10, 12, 0.0)');
  g.addColorStop(1, 'rgba(10, 10, 12, 0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createLightShaftTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255, 240, 206, 0.36)');
  g.addColorStop(0.45, 'rgba(255, 232, 186, 0.14)');
  g.addColorStop(1, 'rgba(255, 230, 182, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // Soft lateral edge fade
  ctx.globalCompositeOperation = 'destination-in';
  const side = ctx.createLinearGradient(0, 0, 256, 0);
  side.addColorStop(0, 'rgba(0,0,0,0)');
  side.addColorStop(0.22, 'rgba(0,0,0,1)');
  side.addColorStop(0.78, 'rgba(0,0,0,1)');
  side.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createDynamicTVScreen() {
  const canvas = makeCanvas(512, 288);
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  function update(time, isOn) {
    if (!isOn) {
      ctx.fillStyle = '#0a0b0d';
      ctx.fillRect(0, 0, 512, 288);
      const g = ctx.createLinearGradient(0, 0, 512, 288);
      g.addColorStop(0, 'rgba(255,255,255,0.06)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.01)');
      g.addColorStop(1, 'rgba(255,255,255,0.04)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 288);
      tex.needsUpdate = true;
      return;
    }

    const t = time * 0.35;
    const sky = ctx.createLinearGradient(0, 0, 0, 288);
    sky.addColorStop(0, '#1f364d');
    sky.addColorStop(0.55, '#d47f56');
    sky.addColorStop(1, '#263845');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 288);

    const sx = 256 + Math.sin(t * 0.4) * 45;
    const sy = 128 + Math.cos(t * 0.3) * 14;
    const sunG = ctx.createRadialGradient(sx, sy, 6, sx, sy, 95);
    sunG.addColorStop(0, 'rgba(255,236,184,0.95)');
    sunG.addColorStop(0.4, 'rgba(244,154,96,0.45)');
    sunG.addColorStop(1, 'rgba(244,154,96,0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(0, 0, 512, 288);

    ctx.fillStyle = '#1d2b36';
    ctx.beginPath();
    ctx.moveTo(0, 195);
    for (let x = 0; x <= 512; x += 16) {
      const h = Math.sin(x * 0.014 + t * 0.25) * 14 + Math.cos(x * 0.03) * 7;
      ctx.lineTo(x, 185 + h);
    }
    ctx.lineTo(512, 288);
    ctx.lineTo(0, 288);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,212,150,0.22)';
    for (let i = 0; i < 8; i++) {
      const y = 205 + i * 9;
      const w = 90 - i * 8 + Math.sin(t * 2 + i) * 12;
      ctx.fillRect(sx - w / 2, y, w, 2.5);
    }

    tex.needsUpdate = true;
  }

  update(0, true);
  return { tex, update };
}

export function createTextures(maxAniso = 8) {
  return {
    darkTile: createDarkTileTextures(maxAniso),
    terrazzo: createTerrazzoTextures(maxAniso),
    tileMint: createTileMintTextures(maxAniso),
    plaster: createPlasterTextures(maxAniso),
    woodOak: createWoodOakTextures(maxAniso, [196, 155, 108]),
    woodWalnut: createWoodOakTextures(maxAniso, [118, 82, 52]),
    boucle: createFabricTextures(maxAniso, '#e8d8cd', 0.14),
    linenBed: createFabricTextures(maxAniso, '#dcd9eb', 0.11),
    linenThrow: createFabricTextures(maxAniso, '#7e998b', 0.14),
    curtainBeige: createFabricTextures(maxAniso, '#e7dac5', 0.16),
    curtainEmerald: createFabricTextures(maxAniso, '#2e6f5b', 0.16),
    rug: createRugTexture(maxAniso),
    artFrame: createArtTexture(maxAniso, 0),
    artBotanical: createArtTexture(maxAniso, 1),
    artArch: createArtTexture(maxAniso, 2),
    facade: createFacadeTexture(maxAniso),
    laptopScreen: createLaptopTexture(maxAniso),
    contactShadowRect: createContactShadowTexture(),
    contactShadowRound: createRadialShadowTexture(),
    cornerShade: createCornerShadeTexture(),
    lightShaft: createLightShaftTexture(),
  };
}
