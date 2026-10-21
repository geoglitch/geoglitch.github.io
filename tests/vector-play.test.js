import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { Surface, shapeDistance } from '../src/surface.js';
import { CONFIG, WEAPONS } from '../src/config.js';
import { tangentAimAngle } from '../src/math.js';
const arena=()=>{const s=new Simulation(42);s.curvedWorld=true;s.start();s.enemies=[];s.weaponDrops=[];s.obstacles=[];s.player.x=0;s.player.z=0;s.god=true;return s;};

test('screen aiming preserves all directions across a banked perspective basis',()=>{
  for(const[right,up]of[[{x:20,y:0},{x:0,y:-18}],[{x:14,y:7},{x:6,y:-17}],[{x:2,y:19},{x:15,y:-4}]])for(let i=0;i<32;i++){
    const angle=i*Math.PI/16,local=tangentAimAngle(angle,right,up),dx=right.x*Math.sin(local)+up.x*Math.cos(local),dy=right.y*Math.sin(local)+up.y*Math.cos(local),projected=Math.atan2(dx,-dy);
    assert.ok(Math.abs(Math.atan2(Math.sin(projected-angle),Math.cos(projected-angle)))<1e-8);
  }
});
test('the ship faces travel direction while automatic targeting tracks a separate threat',()=>{
  const s=arena();s.spawnEnemy('guard',-18,0,0);
  s.updatePlayer(CONFIG.step,{moveX:1});assert.ok(s.player.angle>0&&s.player.angle<.3,'a new heading eases in without snapping');
  for(let i=0;i<29;i++)s.updatePlayer(CONFIG.step,{moveX:1});
  assert.ok(Math.abs(s.player.angle-Math.PI/2)<.03);assert.ok(s.player.aim<0);
  for(let i=0;i<30;i++)s.updatePlayer(CONFIG.step,{moveZ:1});
  assert.ok(Math.abs(s.player.angle)<.03);
});
test('seeker arrays fire distinct homing missiles without a fire button',()=>{
  const s=arena();s.spawnWeapon(5,0,0);s.updateWeaponDrops(CONFIG.step);s.spawnEnemy('guard',7,11,0);
  s.updatePlayer(CONFIG.step,{});const missiles=s.bullets.filter(b=>b.homing);
  assert.equal(missiles.length,3);assert.equal(s.player.ammo[5],WEAPONS[5].ammo-1);
  const before=missiles[0].angle;for(let i=0;i<12;i++)s.updateBullets(CONFIG.step);
  assert.ok(missiles[0].angle>before);assert.ok(missiles.every(b=>Number.isFinite(b.x+b.z)));
});
test('slow nova projectiles damage an area and create luminous destruction effects',()=>{
  const s=arena();s.spawnWeapon(6,0,0);s.updateWeaponDrops(CONFIG.step);s.player.aim=0;
  const a=s.spawnEnemy('cube',0,6,0),b=s.spawnEnemy('diamond',3,7,0),far=s.spawnEnemy('diamond',-15,20,0);
  s.grid.clear();for(const e of s.enemies)s.grid.insert(e);s.melee();const nova=s.bullets[0];
  assert.ok(s.player.shotCD>1);for(let i=0;i<30;i++)s.updateBullets(CONFIG.step);
  assert.equal(nova.detonated,true);assert.equal(a.dead,true);assert.equal(b.dead,true);assert.equal(far.dead,false);
  assert.ok(s.particles.some(p=>p.color==='#efffff'));assert.equal(s.stains.length,0);
});
test('large blocks only split from stage sixteen, with recursive splitting from thirty-one',()=>{
  const s=arena();assert.equal(s.spawnEnemy('splitter',3,3,0).type,'cube');
  s.enemies=[];s.levelIndex=15;s.level=(levelAt(16));let block=s.spawnEnemy('splitter',0,6,0);s.damageEnemy(block,1000);
  assert.equal(s.enemies.filter(e=>!e.dead&&e.type==='cube').length,4);
  s.enemies=[];s.levelIndex=30;s.level=levelAt(31);block=s.spawnEnemy('splitter',0,6,0);s.damageEnemy(block,1000);
  assert.equal(s.enemies.filter(e=>!e.dead&&e.type==='splitter').length,4);
});
import { LEVELS } from '../src/levels.js';
const levelAt=n=>LEVELS[n-1];
test('clearing a stage opens a safe zone; reaching it advances the run',()=>{
  const s=arena();s.levelTime=s.level.duration+.1;s.updateDirector(CONFIG.step);
  assert.ok(s.exitZone);assert.equal(s.level.number,1);
  const zone={...s.exitZone};s.player.x=zone.x;s.player.z=zone.z;s.updateDirector(CONFIG.step);
  assert.equal(s.level.number,2);assert.equal(s.exitZone,null);assert.ok(s.player.invuln>0);
});
test('pulse changes the actual floor, respects its cooldown, and preserves navigation',()=>{
  const s=arena(),surface=new Surface();s.burst();s.burst();assert.equal(s.terrainPulse,1);
  surface.triggerPulse();const before=surface.distance({x:0,y:-9,z:-13});
  for(let i=0;i<200;i++){surface.update(CONFIG.step,3);surface.advance(.035,.075);assert.ok(Number.isFinite(surface.anchor.x+surface.anchor.y+surface.anchor.z));assert.ok(Math.abs(surface.distance(surface.anchor))<.15);}
  assert.ok(surface.floorPhase>1);assert.notEqual(surface.distance({x:0,y:-9,z:-13}),before);
});
test('separating lobes retain a solid bridge at every split phase and world size',()=>{
  for(let time=0;time<36;time+=.6)for(let y=-16;y<=16;y+=.5)assert.ok(shapeDistance({x:0,y,z:0},4,time)<0);
  const surface=new Surface();const sizes=new Set();
  for(let level=1;level<=50;level++)for(let i=0;i<150;i++){surface.update(CONFIG.step,level);surface.advance(.025,.08);if(i===149)sizes.add(surface.worldScale.toFixed(1));assert.ok(Math.abs(surface.distance(surface.anchor))<.15);}
  assert.ok(sizes.size>=5);
});
test('weapon areas keep a twenty-unit separation',()=>{
  const s=new Simulation();s.start();assert.equal(s.weaponDrops.length,5);
  for(let i=0;i<s.weaponDrops.length;i++)for(let j=i+1;j<s.weaponDrops.length;j++)assert.ok(Math.hypot(s.weaponDrops[i].x-s.weaponDrops[j].x,s.weaponDrops[i].z-s.weaponDrops[j].z)>=20);
});
test('safe zones expire into a new flow without a level-ending screen',()=>{
  const s=arena();s.levelTime=s.level.duration+1;s.updateDirector(CONFIG.step);const opened=s.exitZone.openedAt;
  s.levelTime=opened+8.1;s.updateDirector(CONFIG.step);assert.equal(s.mode,'playing');assert.equal(s.level.number,2);
});
test('armored enemies vary in scale and health and release collectible energy squares',()=>{
  const s=arena();s.time=30;for(let i=0;i<65;i++)s.spawnEnemy('cube',12+i*.2,8,.5);
  const sizes=s.enemies.map(e=>e.size),elite=s.enemies.find(e=>e.elite);assert.ok(Math.max(...sizes)>Math.min(...sizes)*1.8);assert.ok(elite.hp>12);
  elite.warmup=0;const hp=elite.hp;s.damageEnemy(elite,2);assert.equal(elite.dead,false);assert.ok(elite.hp<hp);
  s.damageEnemy(elite,1000);assert.ok(s.pickups.filter(p=>p.type==='energy').length>=8);
});
test('the opening pressure builds in density, cadence and speed over the first minute',()=>{
  const s=arena();const samples=[0,15,35,70].map(time=>{s.time=time;return s.pressure();});
  for(let i=1;i<samples.length;i++){assert.ok(samples[i].cap>samples[i-1].cap);assert.ok(samples[i].interval<samples[i-1].interval);assert.ok(samples[i].speed>samples[i-1].speed);}
  assert.ok(samples[0].group>=20);assert.ok(samples.at(-1).group>samples[0].group);
});
test('collecting energy activates a brief overdrive without resetting the floor pulse',()=>{
  const s=arena(),p=s.player;p.burstCD=5;p.charge=CONFIG.overdriveCharge-1;
  s.pickups=[{id:9999,x:0,z:0,vx:0,vz:0,age:0,type:'energy'}];s.updatePickups(CONFIG.step);
  assert.ok(p.overdrive>3);assert.ok(p.burstCD>3);assert.equal(p.charge,0);
  p.aim=0;p.shotCD=0;s.melee();assert.ok(s.attacks[0].reach>WEAPONS[0].reach);assert.ok(p.shotCD<CONFIG.fireInterval*WEAPONS[0].interval);
  for(let i=0;i<320;i++)s.updatePlayer(CONFIG.step,{});assert.equal(p.overdrive,0);
});
test('reactors chain through adjacent blocks and clear a tactical pocket in a swarm',()=>{
  const s=arena();const reactors=[0,5.5,11].map(x=>s.spawnEnemy('anchor',x,8,0));const target=s.spawnEnemy('guard',13,8,0),hp=target.hp;
  s.grid.clear();for(const e of s.enemies)s.grid.insert(e);s.damageEnemy(reactors[0],100);
  assert.ok(reactors.every(e=>e.dead));assert.ok(target.hp<hp);assert.ok(s.rings.some(r=>r.radius===6.5));
});
test('boosts damage nearby enemies but energy cannot create an invulnerable boost loop',()=>{
  const s=arena(),p=s.player;p.shotCD=100;p.aim=Math.PI;
  const direct=s.spawnEnemy('diamond',0,1.6,0),near=s.spawnEnemy('cube',2,1.8,0),hp=near.hp;
  s.grid.clear();for(const e of s.enemies)s.grid.insert(e);s.updatePlayer(CONFIG.step,{moveZ:1,dash:true});
  assert.equal(direct.dead,true);assert.equal(near.dead,false);assert.ok(near.hp<hp);const cooldown=p.dashCD;
  s.pickups=[{id:9999,x:p.x,z:p.z,vx:0,vz:0,age:0,type:'energy'}];s.updatePickups(CONFIG.step);assert.ok(p.dashCD<cooldown);assert.ok(p.dashCD>=.45);
});
test('a boss left behind re-enters ahead with health preserved and a safe telegraph',()=>{
  const s=arena();const boss=s.spawnEnemy('boss',0,-90,0);s.damageEnemy(boss,20);const hp=boss.hp;
  s.updateEnemies(CONFIG.step);assert.ok(Math.abs(Math.hypot(boss.x,boss.z)-22)<.01);assert.ok(boss.z>15);assert.ok(boss.warmup>1.5);assert.equal(boss.hp,hp);assert.ok(s.events.some(e=>e.type==='warning'));
});
test('the first boss entrance clears lingering hostile fire and caps the supporting swarm',()=>{
  const s=arena();s.levelIndex=3;s.level=LEVELS[3];s.time=80;
  for(let i=0;i<60;i++)s.spawnEnemy('cube',i*.4,10,0);s.shoot(0,5,0,{enemy:true});s.shoot(0,5,0,{enemy:false});s.nextLevel();
  assert.equal(s.level.boss,true);assert.equal(s.enemies.length,20);assert.ok(s.bullets.every(b=>!b.enemy));assert.ok(s.pressure().cap<40);
});
test('nearby tap destinations remain reachable on every surface family',()=>{
  for(let shape=0;shape<6;shape++){
    const surface=new Surface();surface.from=shape;surface.to=shape;surface.advance(0,0);let goal=surface.map(5,8).point,d=99;
    for(let i=0;i<300;i++){const local=surface.local(goal);d=Math.hypot(local.x,local.z);if(d<.7)break;surface.advance(local.x/d*.15,local.z/d*.15);goal=surface.project(goal,6);}
    assert.ok(d<.7,`shape ${shape} failed to reach the tap destination`);
  }
});
