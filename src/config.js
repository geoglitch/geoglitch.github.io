/**
 * GEOMETRY GLITCH — a pure Babylon.js geometric arcade game.
 * Small ship, automatic neon weapons, swarms and deformable 3D surfaces;
 * 50 encounter templates in an endless flow; no backend or runtime CDN.
 * Keyboard: WASD/arrows move; mouse aim/hold fire; Space/Shift dash; E/RMB burst;
 * 1–9 collected weapons; P/Escape pause; M mute; F fullscreen; R retry; ` tuning.
 * Touch: floating left move stick + assisted attacks, optional right aim stick;
 * dedicated 72px dash/burst targets. Gamepad: twin sticks, RT/X attack, A dash.
 * Fixed 60Hz simulation. All menus, HUD and touch controls rendered by the engine.
 */
export const CONFIG = {
  step: 1 / 60,
  speed: 16,
  acceleration: 15,
  drag: 20,
  dashSpeed: 54,
  dashDuration: 0.19,
  dashCooldown: 1.4,
  invulnerability: 0.95,
  fireInterval: 0.22,
  bulletSpeed: 47,
  enemySpeed: 6.1,
  spawnInterval: 0.22,
  maxEnemies: 240,
  maxBullets: 650,
  maxParticles: 1600,
  pickupRadius: 4.6,
  arenaRadius: 29,
  arenaScaleZ: 0.78,
  waveDuration: 26,
  burstCooldown: 9,
  burstRadius: 8.5,
  overdriveCharge: 72,
  overdriveDuration: 3.2,
  overdrivePower: 1.15,
  overdriveRate: 1.2,
  shake: 0.5,
  bloom: 1.1,
  volume: 0.55,
};

export const COLORS = {
  jade: '#43ffdc', teal: '#00dcc0', orange: '#ff592b', pink: '#ff3096',
  violet: '#9864ff', gold: '#ffe56b', white: '#efffff', dim: '#8598bb',
};

export const WEAPONS = [
  { name: 'FILAMENT', color: '#54fff1', interval: 1.25, damage: 2.4, reach: 5, arc: 2.4, knockback: 7, glyph: '∿', hybrid: true },
  { name: 'ARC LASH', color: '#ff5de9', interval: 1.55, damage: 4.4, reach: 7.2, arc: 2.2, knockback: 10, glyph: '≈' },
  { name: 'ORBIT CUTTER', color: '#ffb14a', interval: 2.9, damage: 5.2, reach: 4.8, arc: Math.PI*2, knockback: 12, glyph: '◎' },
  { name: 'WAVE FAN', color: '#b7ff48', interval: 1.25, damage: 1.7, reach: 20, ranged: true, ammo: 140, count: 5, spread: .14, speed: 40, pierce: 0, glyph: '⋔' },
  { name: 'PULSE LANCE', color: '#a28bff', interval: 1.45, damage: 6.5, reach: 27, ranged: true, ammo: 65, count: 1, spread: 0, speed: 57, pierce: 2, glyph: 'ϟ' },
  { name: 'SEEKER ARRAY', color: '#ffdc62', interval: 3.2, damage: 4, reach: 28, ranged: true, ammo: 70, count: 3, spread: .3, speed: 26, pierce: 0, homing: 3.8, glyph: '⋈' },
  { name: 'NOVA WELL', color: '#48adff', interval: 8.4, damage: 20, reach: 22, ranged: true, ammo: 24, count: 1, spread: 0, speed: 18, pierce: 0, explosionRadius: 4.7, glyph: '⊕' },
  { name: 'TWIN ECHO', color: '#9bbcff', interval: 40, damage: 1.1, reach: 14, ranged: true, summon: true, duration: 6, cooldown: 9, ammo: 5, glyph: '⋈' },
  { name: 'PRISM RIBBON', color: '#ff7fc7', interval: 3, damage: 55, reach: 3.6, arc: .5, knockback: 0, ribbon: true, glyph: '∿' },
];

export const UPGRADES = [
  { id: 'petals', name: 'AMPLIFIER', glyph: '✦', detail: 'longer strings · stronger hits', color: COLORS.jade },
  { id: 'orbit', name: 'SATELLITES', glyph: '◎', detail: '+3 orbiting cutters', color: COLORS.gold },
  { id: 'lightning', name: 'DEAD CURRENT', glyph: 'ϟ', detail: 'kills arc lightning', color: COLORS.violet },
  { id: 'haste', name: 'AFTERIMAGE', glyph: '»', detail: 'faster fire · drive · boost recharge', color: COLORS.jade },
  { id: 'heart', name: 'RECHARGE', glyph: '+', detail: 'restore shields · larger pulse', color: COLORS.pink },
  { id: 'magnet', name: 'ATTRACTOR', glyph: '◉', detail: 'pull geoms · higher score', color: COLORS.orange },
];

export const DRONES = [
  { id: 'attack', name: 'STRIKER', role: 'ATTACK', color: COLORS.jade },
  { id: 'collector', name: 'MAGNET', role: 'COLLECT', color: COLORS.gold },
  { id: 'shield', name: 'GUARD', role: 'SHIELD', color: COLORS.violet },
];
