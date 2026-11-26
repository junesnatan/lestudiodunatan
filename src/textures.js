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

function createDarkTileTextures(maxAniso) {
  const size = 1024;
  const colorC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const bCtx = bumpC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const rand = seededRandom(42);

  // Dark charcoal mortar grout background
  cCtx.fillStyle = '#242629';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#555555';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#e5e5e5';
  rCtx.fillRect(0, 0, size, size);

  const grid = 4; // 4x4 porcelain floor tiles per repeat
  const tile = size / grid;
  const grout = 5;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const x = col * tile + grout / 2;
      const y = row * tile + grout / 2;
      const w = tile - grout;
      const h = tile - grout;

      const base = 58 + Math.floor((rand() - 0.5) * 10);
      const r = base;
      const g = base + 2;
      const b = base + 5;

      cCtx.fillStyle = `rgb(${r},${g},${b})`;
      cCtx.fillRect(x, y, w, h);

      const roughBase = 92 + Math.floor((rand() - 0.5) * 26);
      rCtx.fillStyle = `rgb(${roughBase},${roughBase},${roughBase})`;
      rCtx.fillRect(x, y, w, h);

      bCtx.fillStyle = '#cfcfcf';
      bCtx.fillRect(x, y, w, h);

      // Subtle mineral porcelain stone grain & veins
      for (let i = 0; i < 420; i++) {
        const sx = x + rand() * w;
        const sy = y + rand() * h;
        const rad = 1 + rand() * 5;
        const light = rand() > 0.48;
        cCtx.fillStyle = light
          ? `rgba(110,115,122,${0.03 + rand() * 0.05})`
          : `rgba(26,28,31,${0.04 + rand() * 0.06})`;
        cCtx.beginPath();
        cCtx.arc(sx, sy, rad, 0, Math.PI * 2);
        cCtx.fill();

        const rv = light ? 74 : 118;
        rCtx.fillStyle = `rgba(${rv},${rv},${rv},0.16)`;
        rCtx.fillRect(sx, sy, 3, 3);
      }

      // Faint stone vein per tile
      cCtx.strokeStyle = 'rgba(130,136,144,0.06)';
      cCtx.lineWidth = 1.5;
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

      // Subtle chamfer highlight along top-left tile edge
      bCtx.strokeStyle = '#ececec';
      bCtx.lineWidth = 2;
      bCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2.0, 2.0, true, maxAniso),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 2.0, 2.0, false, maxAniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 2.0, 2.0, false, maxAniso),
  };
}

function createTerrazzoTextures(maxAniso) {
  const size = 512;
  const colorC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const rand = seededRandom(101);

  cCtx.fillStyle = '#ede3d4';
  cCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#a8a8a8';
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

    rCtx.fillStyle = rand() > 0.5 ? '#787878' : '#969696';
    rCtx.beginPath();
    rCtx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    rCtx.fill();
  }

  // Tile grid 2x2
  cCtx.strokeStyle = 'rgba(155,142,126,0.38)';
  cCtx.lineWidth = 3;
  rCtx.strokeStyle = '#dadada';
  rCtx.lineWidth = 3;
  for (let i = 0; i <= 2; i++) {
    const p = (i * size) / 2;
    cCtx.beginPath();
    cCtx.moveTo(p, 0);
    cCtx.lineTo(p, size);
    cCtx.moveTo(0, p);
    cCtx.lineTo(size, p);
    cCtx.stroke();

    rCtx.beginPath();
    rCtx.moveTo(p, 0);
    rCtx.lineTo(p, size);
    rCtx.moveTo(0, p);
    rCtx.lineTo(size, p);
    rCtx.stroke();
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2.5, 2.2, true, maxAniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 2.5, 2.2, false, maxAniso),
  };
}

function createTileMintTextures(maxAniso) {
  const size = 512;
  const colorC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const bCtx = bumpC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const rand = seededRandom(77);

  cCtx.fillStyle = '#ddeae4';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#dcdcdc';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#7c7c7c';
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
      // subtle mineral speckle
      for (let k = 0; k < 18; k++) {
        cCtx.fillStyle = 'rgba(130,152,144,0.08)';
        cCtx.fillRect(c * tw + 4 + rand() * (tw - 8), r * th + 4 + rand() * (th - 8), 2, 2);
      }
      bCtx.strokeStyle = '#707070';
      bCtx.lineWidth = 4;
      bCtx.strokeRect(c * tw, r * th, tw, th);
      rCtx.strokeStyle = '#d8d8d8';
      rCtx.lineWidth = 4;
      rCtx.strokeRect(c * tw, r * th, tw, th);
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2, 2.2, true, maxAniso),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 2, 2.2, false, maxAniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 2, 2.2, false, maxAniso),
  };
}

function createPlasterTextures(maxAniso) {
  const size = 512;
  const colorC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const bCtx = bumpC.getContext('2d');
  const rand = seededRandom(19);

  cCtx.fillStyle = '#f2ede5';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#c8c8c8';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 1 + rand() * 3.5;
    const v = rand() > 0.5 ? 255 : 225;
    cCtx.fillStyle = `rgba(${v},${v - 4},${v - 10},0.05)`;
    cCtx.beginPath();
    cCtx.arc(x, y, rad, 0, Math.PI * 2);
    cCtx.fill();

    const bv = rand() > 0.5 ? 215 : 175;
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.12)`;
    bCtx.fillRect(x, y, 2, 2);
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 2.5, 1.5, true, maxAniso),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 2.5, 1.5, false, maxAniso),
  };
}

function createWoodOakTextures(maxAniso, tint = [198, 158, 110]) {
  const size = 512;
  const colorC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const bCtx = bumpC.getContext('2d');
  const rand = seededRandom(305);

  cCtx.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#c8c8c8';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 240; i++) {
    const y = rand() * size;
    const alpha = 0.03 + rand() * 0.09;
    cCtx.strokeStyle = rand() > 0.35 ? `rgba(110,72,36,${alpha})` : `rgba(240,214,180,${alpha})`;
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

    bCtx.strokeStyle = `rgba(140,140,140,${alpha * 1.4})`;
    bCtx.lineWidth = 1;
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(size, y);
    bCtx.stroke();
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 1, 1, true, maxAniso),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 1, 1, false, maxAniso),
  };
}

function createFabricTextures(maxAniso, baseHex, weaveAlpha = 0.14) {
  const size = 256;
  const colorC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const bCtx = bumpC.getContext('2d');
  const rand = seededRandom(55);

  cCtx.fillStyle = baseHex;
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#a0a0a0';
  bCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const toggle = ((x + y) / 4) % 2 === 0;
      const n = (rand() - 0.5) * 16;
      cCtx.fillStyle = toggle
        ? `rgba(255,250,244,${weaveAlpha})`
        : `rgba(80,68,58,${weaveAlpha * 0.8})`;
      cCtx.fillRect(x, y, 3, 3);

      const bv = Math.max(90, Math.min(230, (toggle ? 200 : 135) + n));
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect(x, y, 3, 3);
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 4, 4, true, maxAniso),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 4, 4, false, maxAniso),
  };
}

function createRugTexture(maxAniso) {
  const size = 512;
  const colorC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const cCtx = colorC.getContext('2d');
  const bCtx = bumpC.getContext('2d');
  const rand = seededRandom(88);

  cCtx.fillStyle = '#eae2d4';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#a0a0a0';
  bCtx.fillRect(0, 0, size, size);

  // Subtle woven stripes
  for (let y = 0; y < size; y += 3) {
    const shade = 228 + Math.floor((rand() - 0.5) * 18);
    cCtx.fillStyle = `rgb(${shade},${shade - 8},${shade - 18})`;
    cCtx.fillRect(0, y, size, 2);

    const b = 150 + Math.floor((rand() - 0.5) * 65);
    bCtx.fillStyle = `rgb(${b},${b},${b})`;
    bCtx.fillRect(0, y, size, 2);
  }

  // Minimal architectural border lines
  cCtx.strokeStyle = 'rgba(136,118,98,0.45)';
  cCtx.lineWidth = 6;
  cCtx.strokeRect(26, 26, size - 52, size - 52);
  cCtx.lineWidth = 2;
  cCtx.strokeRect(38, 38, size - 76, size - 76);

  return {
    map: configureTex(new THREE.CanvasTexture(colorC), 1, 1, true, maxAniso),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 2, 2, false, maxAniso),
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
    // Botanical minimalist relief print
    ctx.fillStyle = '#e6ded2';
    ctx.fillRect(46, 56, 420, 528);
    ctx.strokeStyle = '#3b4e44';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(256, 520);
    ctx.quadraticCurveTo(240, 320, 268, 130);
    ctx.stroke();

    ctx.fillStyle = '#5c7566';
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
    // Architectural ochre & charcoal lines
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
  ctx.fillStyle = '#dfd5c5';
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal limestone courses
  ctx.strokeStyle = 'rgba(130,120,104,0.22)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Parisian apartment windows
  const cols = [52, 198, 344];
  const rows = [42, 210, 372];
  for (const ry of rows) {
    for (const cx of cols) {
      ctx.fillStyle = '#36444e';
      ctx.fillRect(cx, ry, 108, 128);
      // Warm interior curtains on some windows
      ctx.fillStyle = 'rgba(246, 224, 188, 0.28)';
      ctx.fillRect(cx + 6, ry + 6, 36, 116);
      // Window frame
      ctx.strokeStyle = '#f2ede4';
      ctx.lineWidth = 4;
      ctx.strokeRect(cx, ry, 108, 128);
      ctx.beginPath();
      ctx.moveTo(cx + 54, ry);
      ctx.lineTo(cx + 54, ry + 128);
      ctx.stroke();
      // Balcony railing
      ctx.strokeStyle = '#252627';
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

  // Subtle architectural floorplan preview on laptop screen!
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

export function createDynamicTVScreen() {
  const canvas = makeCanvas(512, 288);
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  function update(time, isOn) {
    if (!isOn) {
      ctx.fillStyle = '#0c0d0f';
      ctx.fillRect(0, 0, 512, 288);
      // Subtle glossy reflection band
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

    // Slow glowing sun orb
    const sx = 256 + Math.sin(t * 0.4) * 45;
    const sy = 128 + Math.cos(t * 0.3) * 14;
    const sunG = ctx.createRadialGradient(sx, sy, 6, sx, sy, 95);
    sunG.addColorStop(0, 'rgba(255,236,184,0.95)');
    sunG.addColorStop(0.4, 'rgba(244,154,96,0.45)');
    sunG.addColorStop(1, 'rgba(244,154,96,0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(0, 0, 512, 288);

    // Distant calm mountains / sea ripples
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

    // Shimmering reflection on water
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
  };
}
