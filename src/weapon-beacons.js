import { clamp } from './math.js';

// Keep every pickup tappable even when several project onto the same horizon.
// Stable IDs break ties; small screen-space displacements get a leader line.
export function layoutWeaponBeacons(entries, width, height, obstacles = [], ship = { x: width / 2, y: height / 2 }) {
  const placed = [];
  const bounds = { left: 8, right: width - 8, top: Math.min(146, height * .25), bottom: height - Math.min(180, height * .28) };
  const overlaps = (a, b, gap = 7) => Math.abs(a.x - b.x) < (a.size + b.size) / 2 + gap && Math.abs(a.y - b.y) < (a.size + b.size) / 2 + gap;
  for (const entry of [...entries].sort((a, b) => Number(b.selected) - Number(a.selected) || a.id - b.id)) {
    const size = entry.inside && height >= 500 ? (width < 760 ? 58 : 66) : 48, r = size / 2;
    const origin = { x: clamp(entry.x, bounds.left + r, bounds.right - r), y: clamp(entry.y, bounds.top + r, bounds.bottom - r), size };
    let best = origin, bestScore = Infinity;
    for (let ring = 0; ring <= Math.ceil(Math.max(width, height) / 30); ring++) {
      const count = ring ? ring * 8 : 1;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count;
        const candidate = { x: clamp(origin.x + Math.cos(angle) * ring * 15, bounds.left + r, bounds.right - r), y: clamp(origin.y + Math.sin(angle) * ring * 15, bounds.top + r, bounds.bottom - r), size };
        const collisions = placed.filter(p => overlaps(candidate, p)).length;
        const blocked = obstacles.filter(p => overlaps(candidate, p, 3)).length;
        const coversShip = Math.abs(candidate.x - ship.x) < r + 42 && Math.abs(candidate.y - ship.y) < r + 42;
        const score = collisions * 1e7 + blocked * 1e6 + Number(coversShip) * 1e5 + (candidate.x - origin.x) ** 2 + (candidate.y - origin.y) ** 2;
        if (score < bestScore) { best = candidate; bestScore = score; }
      }
      if (bestScore < 1e5) break;
    }
    placed.push({ ...entry, ...best });
  }
  return placed;
}
