// Exact architectural measurements derived from the 4 m × 4 m floor plan.
// Coordinate system: origin (0, 0) at Studio inner NW corner; +X East, +Z South, +Y Up.

export const ROOM = {
  width: 4.0,
  studioDepth: 4.0,
  backDepth: 2.0,
  kitchenWidth: 2.4,
  showerWidth: 1.6,
  height: 2.65,
  extWallT: 0.14,
  intWallT: 0.09,
};

export const OPENINGS = {
  cuisineDoor: {
    id: 'door-cuisine',
    label: 'Porte de la cuisine',
    xMin: 1.31,
    xMax: 2.07,
    z: 0.0,
    width: 0.76,
    height: 2.08,
    hingeX: 2.07,
    hingeSide: 'right', // swings into -Z (Cuisine) toward -X
    openAngle: -Math.PI * 0.44,
    defaultOpen: true,
  },
  doucheDoor: {
    id: 'door-douche',
    label: 'Porte de la douche',
    xMin: 2.62,
    xMax: 3.30,
    z: 0.0,
    width: 0.68,
    height: 2.08,
    hingeX: 2.62,
    hingeSide: 'left', // swings into -Z (Douche) toward +X
    openAngle: Math.PI * 0.44,
    defaultOpen: true,
  },
  entreeDoor: {
    id: 'door-entree',
    label: "Porte d'entrée",
    xMin: 3.05,
    xMax: 3.91,
    z: 4.0,
    width: 0.86,
    height: 2.10,
    hingeX: 3.91,
    hingeSide: 'right', // swings into -Z (Studio) toward -X
    openAngle: -Math.PI * 0.44,
    defaultOpen: false,
  },
  window: {
    id: 'sliding-window',
    label: 'Fenêtre coulissante',
    xMin: 0.27,
    xMax: 2.60,
    z: 4.0,
    sillY: 0.78,
    topY: 2.30,
  },
};

export const OUTLETS = [
  {
    id: 'outlet-tv',
    label: 'Prise électrique (Meuble TV)',
    x: 0.008,
    y: 0.34,
    z: 2.0,
    rotY: Math.PI / 2,
  },
  {
    id: 'outlet-bureau',
    label: 'Prise électrique (Bureau)',
    x: 1.10,
    y: 0.34,
    z: 3.992,
    rotY: Math.PI,
  },
];

// Static furniture bounding boxes for smooth collision sliding in FPS mode
export const FURNITURE_COLLIDERS = [
  // Studio
  { minX: 3.26, maxX: 4.00, minZ: 0.02, maxZ: 1.10, label: 'Armoire' },
  { minX: 2.56, maxX: 4.00, minZ: 1.10, maxZ: 3.00, label: 'Lit' },
  { minX: 0.96, maxX: 2.04, minZ: 1.11, maxZ: 2.77, label: 'Canapé' },
  { minX: 1.18, maxX: 1.78, minZ: 0.58, maxZ: 1.14, label: 'Guéridon' },
  { minX: 0.00, maxX: 0.43, minZ: 1.40, maxZ: 2.60, label: 'Meuble TV' },
  { minX: 0.39, maxX: 1.81, minZ: 3.26, maxZ: 3.94, label: 'Bureau' },
  { minX: 0.87, maxX: 1.33, minZ: 2.81, maxZ: 3.27, label: 'Tabouret' },
  { minX: 2.18, maxX: 2.58, minZ: 3.56, maxZ: 4.00, label: 'Plante' },
  { minX: 0.04, maxX: 0.38, minZ: 2.78, maxZ: 3.12, label: 'Lampadaire' },
  // Cuisine
  { minX: 0.00, maxX: 0.66, minZ: -2.00, maxZ: -1.33, label: 'Réfrigérateur' },
  { minX: 0.66, maxX: 2.36, minZ: -2.00, maxZ: -1.33, label: 'Plan de cuisine' },
  // Douche
  { minX: 3.04, maxX: 4.00, minZ: -2.00, maxZ: -1.04, label: 'Douche' },
  { minX: 2.42, maxX: 2.94, minZ: -2.00, maxZ: -1.36, label: 'WC' },
  { minX: 3.42, maxX: 4.00, minZ: -0.92, maxZ: -0.18, label: 'Lavabo' },
];

export const VIEWPOINTS = [
  {
    id: 'entree',
    label: 'Entrée',
    room: 'Studio',
    mode: 'fps',
    pos: [3.38, 1.60, 3.56],
    lookAt: [1.35, 1.12, 1.45],
  },
  {
    id: 'ensemble',
    label: 'Vue studio',
    room: 'Studio',
    mode: 'fps',
    pos: [0.58, 1.62, 3.08],
    lookAt: [2.45, 1.05, 1.25],
  },
  {
    id: 'salon',
    label: 'Canapé & TV',
    room: 'Studio',
    mode: 'fps',
    pos: [1.62, 1.22, 1.95],
    lookAt: [0.12, 0.92, 1.98],
  },
  {
    id: 'bureau',
    label: 'Bureau',
    room: 'Studio',
    mode: 'fps',
    pos: [1.14, 1.44, 2.66],
    lookAt: [1.10, 0.96, 3.92],
  },
  {
    id: 'nuit',
    label: 'Lit & Armoire',
    room: 'Studio',
    mode: 'fps',
    pos: [2.26, 1.52, 2.75],
    lookAt: [3.42, 0.96, 1.05],
  },
  {
    id: 'cuisine',
    label: 'Cuisine',
    room: 'Cuisine',
    mode: 'fps',
    pos: [1.66, 1.56, -0.34],
    lookAt: [1.15, 1.08, -1.78],
  },
  {
    id: 'douche',
    label: 'Douche',
    room: 'Douche',
    mode: 'fps',
    pos: [2.94, 1.56, -0.28],
    lookAt: [3.48, 1.14, -1.62],
  },
  {
    id: 'maquette',
    label: 'Vue maquette',
    room: 'Ensemble',
    mode: 'orbit',
    pos: [6.0, 6.2, 6.6],
    lookAt: [2.0, 0.85, 1.1],
  },
];

export function detectRoom(x, z) {
  if (z < 0) {
    return x < ROOM.kitchenWidth ? 'Cuisine' : 'Douche';
  }
  return 'Studio';
}
