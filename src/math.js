export const TAU = Math.PI * 2;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const mod = (a, b) => ((a % b) + b) % b;
export function rng(seed = 78243) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function polygonRadius(angle, sides, rotation = 0) {
  const segment = TAU / sides;
  return Math.cos(Math.PI / sides) / Math.cos(mod(angle - rotation + Math.PI / sides, segment) - Math.PI / sides);
}
export function arenaRadiusAt(angle, arena, radius = 29) {
  return radius * lerp(polygonRadius(angle, arena.from, arena.rotation), polygonRadius(angle, arena.to, arena.rotation), arena.mix);
}
export function clampToArena(x, z, arena, radius = 29, scaleZ = 0.78, margin = 0.8) {
  const a = Math.atan2(z / scaleZ, x);
  const r = Math.hypot(x, z / scaleZ);
  const limit = arenaRadiusAt(a, arena, radius) - margin;
  return r > limit ? { x: Math.cos(a) * limit, z: Math.sin(a) * limit * scaleZ } : { x, z };
}
export function segmentCircle(ax, az, bx, bz, cx, cz, r) {
  const dx = bx - ax, dz = bz - az;
  const denom = dx * dx + dz * dz;
  const t = denom ? clamp(((cx - ax) * dx + (cz - az) * dz) / denom, 0, 1) : 0;
  return (ax + t * dx - cx) ** 2 + (az + t * dz - cz) ** 2 <= r * r;
}

export class SpatialGrid {
  constructor(size = 4) { this.size = size; this.cells = new Map(); }
  clear() { this.cells.clear(); }
  insert(entity) {
    const k = `${Math.floor(entity.x / this.size)},${Math.floor(entity.z / this.size)}`;
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(entity); else this.cells.set(k, [entity]);
  }
  query(x, z, radius) {
    const items = [];
    for (let cx = Math.floor((x - radius) / this.size); cx <= Math.floor((x + radius) / this.size); cx++)
      for (let cz = Math.floor((z - radius) / this.size); cz <= Math.floor((z + radius) / this.size); cz++) {
        const bucket = this.cells.get(`${cx},${cz}`);
        if (bucket) items.push(...bucket);
      }
    return items;
  }
}
// Invert the projected tangent basis. Screen-space aiming stays correct even
// when the curved world's normal and camera bank change underneath the ship.
export function tangentAimAngle(screenAngle,right,up){
  const dx=Math.sin(screenAngle),dy=-Math.cos(screenAngle),det=right.x*up.y-right.y*up.x;
  if(Math.abs(det)<1e-6)return screenAngle;
  return Math.atan2((dx*up.y-dy*up.x)/det,(right.x*dy-right.y*dx)/det);
}
export function ribbonPoint(origin,angle,reach,time,f){
  const r=.8+(reach-.8)*f,side=Math.sin(f*Math.PI*2.6-time*12)*.55*f;
  return {x:origin.x+Math.sin(angle)*r+Math.cos(angle)*side,z:origin.z+Math.cos(angle)*r-Math.sin(angle)*side};
}
