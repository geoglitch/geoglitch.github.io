import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { LEVELS } from '../src/levels.js';
import { CONFIG } from '../src/config.js';
import { segmentCircle, clampToArena, arenaRadiusAt, TAU } from '../src/math.js';

const step = (sim, seconds, input = {}) => {
  for (let i = 0; i < Math.ceil(seconds / CONFIG.step); i++) { sim.update(CONFIG.step, input); sim.events.length = 0; }
};
test('50 gates have a rising sawtooth, changing geometry and ten guardians', () => {
  assert.equal(LEVELS.length, 50);
  assert.equal(LEVELS.filter(l => l.boss).length, 10);
  assert.equal(new Set(LEVELS.map(l => l.name)).size, 10);
  assert.ok(LEVELS[49].intensity > LEVELS[4].intensity);
  assert.ok(LEVELS[1].intensity > LEVELS[2].intensity);
  assert.ok(new Set(LEVELS.map(l => l.sides)).size >= 6);
});
test('swept collision catches a projectile that crosses a small target in one frame', () => {
  assert.equal(segmentCircle(-10, 0, 10, 0, 0, 0, 0.4), true);
  assert.equal(segmentCircle(-10, 3, 10, 3, 0, 0, 0.4), false);
});
test('arena clamp remains finite and inside every changing geometric boundary', () => {
  for (const l of LEVELS) for (let i = 0; i < 32; i++) {
    const a = i / 32 * TAU, arena = { from: 8, to: l.sides, mix: 0.6, rotation: l.rotation };
    const p = clampToArena(Math.cos(a) * 100, Math.sin(a) * 100 * CONFIG.arenaScaleZ, arena);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
    assert.ok(Math.hypot(p.x, p.z / CONFIG.arenaScaleZ) <= arenaRadiusAt(a, arena) + 0.001);
  }
});
test('diagonal input does not exceed cardinal movement speed', () => {
  const a = new Simulation(1), b = new Simulation(1); a.start(); b.start();
  a.enemies = []; b.enemies = []; a.spawnClock = 100; b.spawnClock = 100;
  step(a, 0.6, { moveX: 1, moveZ: 1 }); step(b, 0.6, { moveX: 1, moveZ: 0 });
  assert.ok(Math.abs(Math.hypot(a.player.vx, a.player.vz) - Math.hypot(b.player.vx, b.player.vz)) < 0.01);
});
test('dash is immediately fast, invulnerable, and cooldown limited', () => {
  const s = new Simulation(); s.start(); s.player.invuln = 0;
  s.update(CONFIG.step, { moveX: 1, dash: true });
  assert.ok(s.player.vx > 35); assert.ok(s.player.invuln > 0); assert.ok(s.player.dashCD > 1);
  const hp = s.player.hp; s.damagePlayer(s.player.x, s.player.z);
  assert.equal(s.player.hp, hp);
});
test('pause freezes combat, cooldowns and level progression', () => {
  const s = new Simulation(); s.start(); s.player.burstCD = 5; s.setPause();
  const clock = s.levelTime, x = s.player.x;
  step(s, 2, { moveX: 1, fire: true });
  assert.equal(s.levelTime, clock); assert.equal(s.player.x, x); assert.equal(s.player.burstCD, 5);
});
test('telegraphed spawning enemies cannot hurt the player or be shot', () => {
  const s = new Simulation(); s.start(); s.enemies = []; s.spawnClock = 100;
  const e = s.spawnEnemy('diamond', 0, -3, 0.8), hp = e.hp;
  s.damageEnemy(e, 100);
  assert.equal(e.hp, hp); assert.equal(e.dead, false);
});
test('anchor block destruction applies impulses and chain damage to enemies', () => {
  const s = new Simulation(); s.start(); s.enemies = [];
  const anchor = s.spawnEnemy('anchor', 0, 0, 0), diamond = s.spawnEnemy('diamond', 2, 0, 0);
  s.grid.clear(); s.grid.insert(anchor); s.grid.insert(diamond);
  s.damageEnemy(anchor, 100);
  assert.equal(anchor.dead, true); assert.ok(diamond.dead || diamond.hp < diamond.maxHp); assert.ok(diamond.vx > 0);
});
test('boss upgrade resumes progression and applies a lasting power', () => {
  const s = new Simulation(); s.start(); s.mode = 'upgrade';
  s.upgradeChoices = [{ id: 'orbit' }]; const n = s.player.orbit;
  s.chooseUpgrade(0);
  assert.equal(s.mode, 'playing'); assert.equal(s.player.orbit, n + 3); assert.equal(s.level.number, 2);
});
test('boss defeats continue seamlessly beyond the initial fifty encounter patterns', () => {
  const s = new Simulation(); s.start(); s.enemies = [];
  s.levelIndex = 49; s.level = LEVELS[49];
  const boss = s.spawnEnemy('boss', 0, 10, 0);
  s.damageEnemy(boss, 100000);
  assert.equal(s.mode,'playing');assert.equal(s.bossDefeated,true);assert.ok(s.score>=6000);
  s.nextLevel();assert.equal(s.level.number,51);assert.ok(s.level.intensity>LEVELS[0].intensity);assert.equal(s.mode,'playing');
});
test('sustained crowded combat stays bounded and finite', () => {
  const s = new Simulation(19); s.start(); s.god = true;
  for (let i = 0; i < 6000; i++) {
    if (s.mode === 'upgrade') s.chooseUpgrade(0);
    const target = s.nearestTarget(s.player.x, s.player.z);
    const exit=s.exitZone,dx=exit?exit.x-s.player.x:Math.sin(i*.015),dz=exit?exit.z-s.player.z:Math.cos(i*.013),d=exit?Math.max(1,Math.hypot(dx,dz)):1;
    s.update(CONFIG.step, { moveX:dx/d,moveZ:dz/d, aimX: target?.x, aimZ: target?.z, fire: true, dash: i % 100 === 0, burst: i % 400 === 0 });
    s.events.length = 0;
    assert.ok(Number.isFinite(s.player.x) && Number.isFinite(s.player.z));
    assert.ok(s.bullets.length <= CONFIG.maxBullets); assert.ok(s.enemies.length <= CONFIG.maxEnemies + 1); assert.ok(s.particles.length <= CONFIG.maxParticles);
  }
  assert.ok(s.kills > 50); assert.ok(s.score > 0); assert.ok(s.level.number >= 4);
});
