import { TAU } from './math.js';

// Four distinct silhouettes: a fortress-sized cube ends as 27 fast shards.
export const FRACTURE_STAGES = [
  { width: .85, radius: .6, hp: 1.8, speed: 1.65, value: 45, color: '#ffb36c' },
  { width: 2.1, radius: 1.5, hp: 7, speed: .86, value: 130, color: '#ff966b' },
  { width: 4.2, radius: 3, hp: 23, speed: .48, value: 320, color: '#ff776f' },
  { width: 8, radius: 5.6, hp: 78, speed: .22, value: 900, color: '#ff5f87' },
];

export function fractureChildren(parent, player) {
  if (parent.fractureStage <= 0) return [];
  const stage = parent.fractureStage - 1, profile = FRACTURE_STAGES[stage];
  const radius = Math.max(parent.radius * .72, profile.radius * 1.25);
  return Array.from({ length: 3 }, (_, i) => {
    const angle = parent.phase + i * TAU / 3;
    let x = parent.x + Math.sin(angle) * radius, z = parent.z + Math.cos(angle) * radius;
    const dx = x - player.x, dz = z - player.z, distance = Math.hypot(dx, dz), safe = profile.radius + 2;
    if (distance < safe) {
      const heading = distance > .001 ? Math.atan2(dx, dz) : angle;
      x = player.x + Math.sin(heading) * safe; z = player.z + Math.cos(heading) * safe;
    }
    return { x, z, angle, stage, familyId: parent.familyId };
  });
}
