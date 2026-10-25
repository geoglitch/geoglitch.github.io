import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { Surface } from '../src/surface.js';
import { CONFIG,WEAPONS } from '../src/config.js';
const arena=()=>{const s=new Simulation(19);s.curvedWorld=true;s.reset();s.enemies=[];s.obstacles=[];s.gates=[];s.weaponDrops=[];s.player.x=s.player.z=0;return s;};
const wall=()=>{const surface=new Surface();surface.anchor={x:0,y:0,z:0};surface.right={x:1,y:0,z:0};surface.up={x:0,y:0,z:1};surface.project=p=>p;surface.ridgeHeight=p=>p.x>2&&p.x<3?2:0;return surface;};
const grid=s=>{s.grid.clear();for(const e of s.enemies)s.grid.insert(e);};

test('ship, enemy and swept shots meet the same ridge boundary',()=>{
  const surface=wall();assert.ok(surface.resolveMotion(5,0).x<2);assert.ok(surface.resolveActorMotion(5,0,-5,0).x>-2);assert.ok(surface.terrainFraction(0,0,5,0)<.4);
  assert.equal(surface.terrainFraction(0,0,0,5),1);assert.equal(surface.terrainFraction(2.5,0,-1,0),1,'an actor placed on rising terrain can escape downwards');
});
test('a charging enemy hits terrain, recovers and cannot cross the wall',()=>{
  const s=arena(),surface=wall();s.player.x=5;s.enemyMotionResolver=(e,x,z)=>surface.resolveActorMotion(e.x,e.z,x,z);
  const e=s.spawnEnemy('dart',0,0,0);e.state='charge';e.aimX=1;e.aimZ=0;e.windup=1;e.vx=35;
  for(let i=0;i<20;i++){grid(s);s.updateEnemies(CONFIG.step);}assert.ok(e.x<2.01);assert.equal(e.state,'recover');
});
test('both sides of combat can use terrain as cover, including fast shots and slow explosives',()=>{
  const s=arena(),surface=wall();s.shotMotionResolver=(b,x,z)=>surface.terrainFraction(b.px,b.pz,x,z);
  s.shoot(0,0,Math.PI/2,{enemy:true,speed:240,life:1});s.updateBullets(CONFIG.step);assert.equal(s.bullets[0].life,0);assert.ok(s.bullets[0].x<2);
  s.bullets=[];s.shoot(0,0,Math.PI/2,{weapon:6,speed:240,life:1,damage:20,explosionRadius:4.7,color:'#48adff'});s.updateBullets(CONFIG.step);
  assert.equal(s.bullets[0].detonated,true);assert.ok(s.bullets[0].x<2);assert.equal(s.events.filter(e=>e.type==='explosion').length,1);
});
test('a fresh pickup equips but refilling another owned weapon preserves the current choice',()=>{
  const s=arena();s.spawnWeapon(3,0,0);s.updateWeaponDrops(CONFIG.step);assert.equal(s.player.weapon,3);
  s.spawnWeapon(4,0,0);s.targetWeaponId=s.weaponDrops[0].id;s.updateWeaponDrops(CONFIG.step);assert.equal(s.player.weapon,4);s.targetWeaponId=null;
  s.player.ammo[3]=2;s.spawnWeapon(3,0,0);s.updateWeaponDrops(CONFIG.step);assert.equal(s.player.weapon,4);assert.equal(s.player.ammo[3],WEAPONS[3].ammo);
});
test('a close crowd or recent hit delays one wave, then pressure resumes rather than being disabled',()=>{
  const s=arena();s.time=20;s.lastHurt=19;s.spawnClock=-1;s.musicBeat=2;
  s.updateDirector(CONFIG.step);assert.equal(s.waveCount,0);assert.equal(s.waveHeld,true);assert.equal(s.spawnClock,2.2);
  s.spawnClock=-1;s.musicBeat=3;s.lastHurt=20;s.updateDirector(CONFIG.step);assert.equal(s.waveCount,1);assert.equal(s.waveHeld,false);
});
test('the ribbon cuts contacted incoming shots without acting as an all-around shield',()=>{
  const s=arena();s.player.weapon=8;s.player.ownedWeapons.push(8);s.melee();
  s.shoot(0,1.8,0,{enemy:true,life:1,radius:.3});s.shoot(0,-2,0,{enemy:true,life:1,radius:.3});s.shoot(8,4,0,{enemy:true,life:1,radius:.3});
  s.updateRibbonHits();assert.equal(s.bullets[0].life,0);assert.ok(s.bullets[1].life>0);assert.ok(s.bullets[2].life>0);
});
test('terrain sampling cache expires when the surface chart advances',()=>{
  const s=new Surface();s.terrainHeight(2,3);assert.ok(s.heightCache.size>0);s.advance(.1,0);assert.equal(s.heightCache.size,0);
});
test('an unselected gate remains avoided even when a route starts close to it',()=>{
  const s=new Surface();s.routeAvoid=[{x:2.2,z:0}];assert.equal(s.gateObstructs(.15,0),true);assert.equal(s.gateObstructs(-.15,0),false);assert.equal(s.gateObstructs(0,1),false);
});
test('collecting a new weapon during a committed boss approach does not interrupt the attack',()=>{
  const s=arena();s.player.ownedWeapons.push(1);s.equipWeapon(1);s.targetWeaponId=null;s.spawnWeapon(8,0,0);s.updateWeaponDrops(CONFIG.step);
  assert.ok(s.player.ownedWeapons.includes(8));assert.equal(s.player.weapon,1);assert.ok(s.equipWeapon(8));
});
test('automatic steering can leave a nearby gate without routing further into it',()=>{
  const s=wall();s.terrainHeight=()=>0;s.routeAvoid=[{x:2.2,z:0}];const direction=s.steerTowards({x:10,z:0});
  assert.ok(Math.hypot(direction.x,direction.z)>.5);assert.equal(s.gateObstructs(direction.x*.4,direction.z*.4),false);
});
test('an incidental discovery preserves your gun, while an explicitly selected pickup equips',()=>{
  const s=arena();s.player.ownedWeapons.push(1);s.equipWeapon(1);s.spawnWeapon(3,0,0);s.updateWeaponDrops(CONFIG.step);assert.equal(s.player.weapon,1);assert.ok(s.player.ownedWeapons.includes(3));
  s.spawnWeapon(8,0,0);s.targetWeaponId=s.weaponDrops[0].id;s.updateWeaponDrops(CONFIG.step);assert.equal(s.player.weapon,8);
});
test('breaking the last boss lock creates an offensive window before the denser core attacks',()=>{
  const s=arena(),boss=s.spawnEnemy('boss',0,6,0);boss.portAngle=0;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;s.damageEnemy(boss,999,false,{x:Math.sin(a)*8,z:6+Math.cos(a)*8});}
  assert.equal(boss.shielded,false);assert.equal(boss.coreIntro,3);assert.ok(boss.cd>=2.1);s.bullets=[];grid(s);
  for(let i=0;i<90;i++)s.updateEnemies(CONFIG.step);assert.equal(s.bullets.filter(b=>b.enemy).length,0);assert.ok(boss.coreIntro>0);
});
