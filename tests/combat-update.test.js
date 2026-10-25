import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {Surface} from '../src/surface.js';
import {CONFIG,WEAPONS} from '../src/config.js';
import {rng} from '../src/math.js';

function arena(){const s=new Simulation(42);s.curvedWorld=true;s.rand=rng(42);s.reset();s.enemies=[];s.obstacles=[];s.weaponDrops=[];s.gates=[];s.spawnClock=1000;s.player.x=0;s.player.z=0;return s;}
const grid=s=>{s.grid.clear();for(const e of s.enemies)s.grid.insert(e);};

test('waves arrive together in large formations, then leave a real spawning gap',()=>{
  const s=arena();s.spawnClock=0;s.updateDirector(CONFIG.step);assert.ok(s.enemies.length>=20);
  assert.equal(new Set(s.enemies.map(e=>e.warmup)).size,1);assert.ok(s.enemies.every(e=>Math.hypot(e.x,e.z)>15));
  const count=s.enemies.length;for(let i=0;i<120;i++)s.updateDirector(CONFIG.step);assert.equal(s.enemies.length,count);
});
test('later swarm waves bring dozens of small triangles in one synchronized pack',()=>{
  const s=arena();s.time=70;s.waveCount=2;s.spawnWave();assert.ok(s.enemies.length>=70);
  assert.ok(s.enemies.every(e=>e.type==='mote'&&e.size<.65));assert.equal(new Set(s.enemies.map(e=>e.packId)).size,1);assert.equal(new Set(s.enemies.map(e=>e.warmup)).size,1);
});
test('pincer waves create two distinct groups on opposing sides',()=>{
  const s=arena();s.time=70;s.waveCount=3;s.spawnWave();const packs=[...new Set(s.enemies.map(e=>e.packId))];assert.equal(packs.length,2);
  const centers=packs.map(id=>{const list=s.enemies.filter(e=>e.packId===id);return{x:list.reduce((n,e)=>n+e.x,0)/list.length,z:list.reduce((n,e)=>n+e.z,0)/list.length};});
  assert.ok(centers[0].x*centers[1].x+centers[0].z*centers[1].z<0);
});
test('diamonds pursue, cubes scatter, prisms retreat and crosses orbit',()=>{
  const velocity=(type,x)=>{const s=arena();const e=s.spawnEnemy(type,x,0,0);e.phase=-Math.PI/2;e.maneuverClock=100;for(let i=0;i<15;i++){grid(s);s.updateEnemies(CONFIG.step);}return e;};
  assert.ok(velocity('diamond',10).vx<0);assert.ok(velocity('cube',3).vx>0);assert.ok(velocity('prism',8).vx>0);
  const spinner=velocity('spinner',8);assert.ok(Math.abs(spinner.vz)>Math.abs(spinner.vx));
});
test('Twin Echo deploys exactly two temporary ships and returns to the previous weapon',()=>{
  const s=arena();s.spawnWeapon(3,0,0);s.updateWeaponDrops(CONFIG.step);s.spawnWeapon(7,0,0);s.updateWeaponDrops(CONFIG.step);s.equipWeapon(7);s.player.shotCD=0;s.melee();
  assert.equal(s.sisters.length,2);assert.equal(s.supports.length,1);assert.equal(s.player.weapon,3);assert.equal(s.player.ammo[7],WEAPONS[7].ammo-1);
  const ammo=s.player.ammo[7];s.equipWeapon(7);s.player.shotCD=0;s.melee();assert.equal(s.sisters.length,2);assert.equal(s.player.ammo[7],ammo);
  s.updateSisters(WEAPONS[7].duration+.1);assert.equal(s.sisters.length,0);assert.ok(s.player.sisterCD>0);
});
test('the sister ships independently fire at different nearby threats',()=>{
  const s=arena();s.spawnWeapon(7,0,0);s.updateWeaponDrops(CONFIG.step);s.equipWeapon(7);s.player.shotCD=0;s.melee();s.spawnEnemy('guard',-4,9,0);s.spawnEnemy('guard',4,9,0);s.updateSisters(.25);
  const shots=s.bullets.filter(b=>b.owner==='sister');assert.equal(shots.length,2);assert.equal(new Set(shots.map(b=>b.targetId)).size,2);
});
test('controller weapon cycling skips a sister-ship module while it recharges',()=>{
  const s=arena();s.player.ownedWeapons=[0,7,8];s.player.ammo[7]=4;s.player.sisterCD=4;
  s.cycleWeapon(1);assert.equal(s.player.weapon,8);s.cycleWeapon(1);assert.equal(s.player.weapon,0);
  s.player.sisterCD=0;s.cycleWeapon(1);assert.equal(s.player.weapon,7);
});
test('a short ribbon destroys contacted enemies but cannot erase distant threats or pillars',()=>{
  const s=arena();s.player.ownedWeapons.push(8);s.equipWeapon(8);s.player.aim=0;s.player.shotCD=0;
  const near=s.spawnEnemy('guard',0,2.4,0),far=s.spawnEnemy('diamond',0,8,0),side=s.spawnEnemy('cube',5,0,0),pillar=s.spawnEnemy('pillar',.3,3,0),hp=pillar.hp;
  grid(s);s.melee();s.updateRibbonHits();s.updateRibbonHits();assert.equal(near.dead,true);assert.equal(far.dead,false);assert.equal(side.dead,false);assert.equal(pillar.dead,false);assert.equal(pillar.hp,hp-32);
});
test('later pillar encounters wait for every descending pillar to be destroyed',()=>{
  const s=arena();s.levelIndex=5;s.nextLevel();assert.equal(s.level.number,7);s.levelTime=3;s.updateDirector(CONFIG.step);
  const pillars=s.enemies.filter(e=>e.type==='pillar');assert.equal(pillars.length,2);assert.ok(pillars.every(e=>e.warmup===3));
  s.levelTime=100;s.updateDirector(CONFIG.step);assert.equal(s.exitZone,null);
  for(const e of pillars){e.warmup=0;s.damageEnemy(e,10000);}s.updateDirector(CONFIG.step);assert.ok(s.exitZone);
});
test('energy no longer heals damage and a defensive pulse leaves armored enemies alive',()=>{
  const s=arena(),p=s.player;p.hp=2;s.credits=99;s.pickups=[{id:999,x:0,z:0,vx:0,vz:0,age:0,type:'energy'}];s.updatePickups(CONFIG.step);assert.equal(s.credits,100);assert.equal(p.hp,2);
  const guard=s.spawnEnemy('guard',0,4,0);s.burst();assert.equal(guard.dead,false);assert.ok(guard.hp>guard.maxHp*.5);
  p.invuln=0;s.damagePlayer(0,1);for(let i=0;i<60;i++)s.updatePlayer(CONFIG.step,{});s.damagePlayer(0,1);assert.equal(p.hp,0);
});
test('a piercing lance can trigger only one chain per projectile',()=>{
  const s=arena();s.spawnWeapon(4,0,0);s.updateWeaponDrops(CONFIG.step);for(const z of[4,7,10,13])s.spawnEnemy('guard',0,z,0);grid(s);s.player.aim=0;s.player.shotCD=0;s.melee();for(let i=0;i<40;i++)s.updateBullets(CONFIG.step);assert.equal(s.bolts.length,2);
});
test('paired gates cross the arena and never bounce a stationary ship back automatically',()=>{
  const s=arena();s.createGates();s.player.x=-18;s.player.invuln=0;s.updatePlayer(CONFIG.step,{});assert.equal(s.player.x,18);assert.ok(s.player.warpCD>2);
  for(let i=0;i<220;i++)s.updatePlayer(CONFIG.step,{});assert.equal(s.player.x,18);
  s.player.x=25;s.updatePlayer(CONFIG.step,{});s.player.x=18;s.updatePlayer(CONFIG.step,{});assert.equal(s.player.x,-18);
});
test('the surface motion resolver prevents a ship from flying straight through a raised ridge',()=>{
  const surface=new Surface();surface.terrainStrength=1;surface.anchor={x:-14,y:3,z:-24};surface.advance(0,0);let blocked=0;
  for(let i=0;i<250;i++){const step=surface.resolveMotion(.2,0);if(surface.blocked)blocked++;surface.advance(step.x,step.z);}
  assert.ok(blocked>0);assert.ok(surface.ridgeHeight(surface.anchor)<.8);
  const s=arena();s.movementResolver=()=>({x:0,z:0});s.updatePlayer(CONFIG.step,{moveX:1,dash:true});assert.equal(s.player.x,0);
});
test('a new world request cannot restart an unfinished ground morph',()=>{
  const s=new Surface();s.update(.5,2);const mix=s.mix,from=s.from,to=s.to;s.update(1/60,3);assert.equal(s.from,from);assert.equal(s.to,to);assert.ok(s.mix>=mix);assert.ok(s.mix-mix<.01);
});
test('both travel gate approaches have a passable opening through raised terrain',()=>{
  for(const side of[-1,1]){
    const s=new Surface();s.terrainStrength=1;s.advance(0,0);const goal={x:side*18,z:0};
    for(const z of[0,2,-2,4,-4,7,-7,10,-10])if(s.ridgeHeight(s.map(goal.x,z).point)<.35){goal.z=z;break;}
    for(let i=0;i<300&&Math.hypot(goal.x,goal.z)>1;i++){s.gateCenters=[s.map(goal.x,goal.z).point];const direction=s.steerTowards(goal),move=s.resolveMotion(direction.x*.22,direction.z*.22);s.advance(move.x,move.z);goal.x-=move.x;goal.z-=move.z;}
    assert.ok(Math.hypot(goal.x,goal.z)<1);
  }
});
test('wave telegraphs wait for a musical beat and the music clock pauses with gameplay',()=>{
  const s=arena();s.spawnClock=-.1;s.musicBeat=.5;s.updateDirector(CONFIG.step);assert.equal(s.waveCount,0);
  s.musicBeat=1.02;s.updateDirector(CONFIG.step);assert.equal(s.waveCount,1);
  assert.equal(s.enemies[0].warmup,3*60/(134+Math.min(8,s.level.chapter)));
  const beat=s.musicBeat;s.mode='paused';s.update(1);assert.equal(s.musicBeat,beat);
});
test('a gate escape clears only nearby light enemies and rewards a risky approach',()=>{
  const s=arena();s.createGates();s.player.x=-18;
  const near=s.spawnEnemy('diamond',-16,1,0),far=s.spawnEnemy('diamond',-10,0,0),guard=s.spawnEnemy('guard',-18,3,0);grid(s);
  s.updatePlayer(CONFIG.step,{});assert.equal(near.dead,true);assert.equal(far.dead,false);assert.equal(guard.dead,false);assert.equal(guard.hp,guard.maxHp-8);
  assert.equal(s.events.find(e=>e.type==='warp').cleared,1);assert.ok(s.score>=240);
});
test('drive upgrades improve navigation modestly and preserve a boost cooldown',()=>{
  const normal=arena(),upgraded=arena();upgraded.upgrades.haste=12;
  for(let i=0;i<90;i++){normal.updatePlayer(CONFIG.step,{moveX:1});upgraded.updatePlayer(CONFIG.step,{moveX:1});}
  assert.ok(upgraded.player.vx>normal.player.vx*1.1);assert.ok(upgraded.player.vx<normal.player.vx*1.2);
  upgraded.updatePlayer(CONFIG.step,{dash:true,moveX:1});assert.ok(upgraded.player.dashCD>=1);
});
test('tap routes can go around solid ridges to all five opening weapon areas',()=>{
  for(const [x,z] of [[-7,9],[7,-7],[18,15],[-17,-17],[0,34]]){
    const surface=new Surface(),goal={x,z},gates=[{x:-18,z:0},{x:18,z:0}];surface.update(0,1);
    for(let i=0;i<600&&Math.hypot(goal.x,goal.z)>1;i++){
      surface.update(CONFIG.step,1);surface.landingCenters=Math.hypot(goal.x,goal.z)<16?[surface.map(goal.x,goal.z).point]:[];
      surface.routeAvoid=gates;surface.gateCenters=gates.map(g=>surface.map(g.x,g.z).point);
      const steer=surface.steerTowards(goal),move=surface.resolveMotion(steer.x*.22,steer.z*.22);
      surface.advance(move.x,move.z);goal.x-=move.x;goal.z-=move.z;
      for(const gate of gates){gate.x-=move.x;gate.z-=move.z;assert.ok(Math.hypot(gate.x,gate.z)>1.5,'a pickup route should avoid an unselected warp gate');}
    }
    assert.ok(Math.hypot(goal.x,goal.z)<1,`weapon at ${x},${z} remains reachable`);
  }
});
