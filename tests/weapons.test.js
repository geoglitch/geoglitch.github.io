import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { CONFIG, WEAPONS } from '../src/config.js';

function arena(){
  const s=new Simulation(7);s.curvedWorld=true;s.start();s.enemies=[];s.obstacles=[];s.weaponDrops=[];
  s.player.x=0;s.player.z=0;return s;
}
test('weapons must be found; walking over a drop unlocks and equips it',()=>{
  const s=arena();assert.equal(s.equipWeapon(1),false);assert.equal(s.player.weapon,0);
  s.spawnWeapon(1,0,.8);s.updateWeaponDrops(CONFIG.step);
  assert.equal(s.player.weapon,1);assert.deepEqual(s.player.ownedWeapons,[0,1]);assert.equal(s.weaponDrops.length,0);
  s.cycleWeapon(-1);assert.equal(s.player.weapon,0);s.cycleWeapon(1);assert.equal(s.player.weapon,1);
});
test('drones and loot magnet leave equipment on the ground',()=>{
  const s=arena();s.selectSupport(1);s.supports[0].x=10;s.supports[0].z=0;s.upgrades.magnet=10;
  s.spawnWeapon(3,10,0);
  for(let i=0;i<60;i++){s.updatePickups(CONFIG.step);s.updateWeaponDrops(CONFIG.step);}
  assert.equal(s.weaponDrops.length,1);assert.equal(s.weaponDrops[0].x,10);assert.equal(s.player.weapon,0);
});
test('ranged modules use ammo and swept hits; empty weapons fall back to the filament',()=>{
  const s=arena();s.spawnWeapon(4,0,0);s.updateWeaponDrops(CONFIG.step);
  const enemy=s.spawnEnemy('guard',0,5,0),hp=enemy.hp;s.grid.clear();s.grid.insert(enemy);
  assert.equal(s.player.ammo[4],WEAPONS[4].ammo);
  s.player.aim=0;s.melee();assert.equal(s.bullets.length,1);assert.equal(s.bullets[0].owner,'player');
  for(let i=0;i<10;i++)s.updateBullets(CONFIG.step);
  assert.ok(enemy.hp<hp);assert.equal(s.player.ammo[4],WEAPONS[4].ammo-1);
  s.player.ammo[4]=1;s.player.shotCD=0;s.melee();assert.equal(s.player.ammo[4],0);assert.equal(s.player.weapon,0);assert.equal(s.equipWeapon(4),false);
  s.spawnWeapon(4,0,0);s.updateWeaponDrops(CONFIG.step);assert.equal(s.player.weapon,4);assert.equal(s.player.ammo[4],WEAPONS[4].ammo);
});
test('equipment moves with the surface chart and cannot accumulate without bound',()=>{
  const s=arena();s.player.x=3;s.player.z=-2;s.spawnWeapon(2,8,4);s.recenter();
  assert.equal(s.weaponDrops[0].x,5);assert.equal(s.weaponDrops[0].z,6);
  for(let i=0;i<100;i++)s.spawnWeapon(1,12+i,5);assert.equal(s.weaponDrops.length,6);
  for(const drop of s.weaponDrops)drop.age=91;s.updateWeaponDrops(CONFIG.step);assert.equal(s.weaponDrops.length,0);
});
test('horde heading turns smoothly and walking distance advances each creature independently',()=>{
  const s=arena();const a=s.spawnEnemy('diamond',-10,0,0),b=s.spawnEnemy('diamond',10,0,0);
  a.angle=0;b.angle=0;a.stride=0;b.stride=0;a.vx=5;b.vx=-3;
  s.grid.clear();s.grid.insert(a);s.grid.insert(b);s.updateEnemies(CONFIG.step);
  assert.ok(a.angle>0&&b.angle<0);assert.ok(Math.abs(a.angle)<.5);assert.ok(a.stride>b.stride);
});
test('horde contact keeps solid bodies outside the player and respects hurt invulnerability',()=>{
  const s=arena();s.player.invuln=0;const enemy=s.spawnEnemy('diamond',.1,0,0);
  s.grid.clear();s.grid.insert(enemy);s.updateEnemies(CONFIG.step);
  assert.equal(s.player.hp,4);assert.ok(Math.hypot(enemy.x,enemy.z)>=enemy.radius+.59);
  s.updateEnemies(CONFIG.step);assert.equal(s.player.hp,4);
});
