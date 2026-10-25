import test from 'node:test';
import assert from 'node:assert/strict';
import { Surface } from '../src/surface.js';
import { Simulation } from '../src/simulation.js';
import { CONFIG } from '../src/config.js';
import { CameraRig } from '../src/camera.js';
import { Matrix, Vector3 } from '../vendor/babylon-core.js';
const arena=()=>{const s=new Simulation(88);s.curvedWorld=true;s.reset();s.enemies=[];s.obstacles=[];s.gates=[];s.weaponDrops=[];s.player.x=s.player.z=0;return s;};

test('opening movement is unobstructed in every direction and the first choices fit on the broad face',()=>{
  for(let direction=0;direction<8;direction++){
    const s=new Surface(),a=direction*Math.PI/4;let travelled=0;
    for(let i=0;i<90;i++){s.update(CONFIG.step,1);const m=s.resolveMotion(Math.sin(a)*.22,Math.cos(a)*.22);travelled+=Math.hypot(m.x,m.z);s.advance(m.x,m.z);assert.equal(s.blocked,false);assert.ok(Math.abs(s.distance(s.anchor))<.02);}
    assert.ok(travelled>19.7);
  }
  const s=new Surface();for(const[x,z]of[[-7,9],[7,-7]]){const p=s.map(x,z).point;assert.ok(Math.abs(p.x-x)<.1);assert.ok(Math.abs(p.y-z)<.1);}
});
test('both opening weapon choices are visible and tappable in portrait while retaining twenty-unit separation',()=>{
  const s=new Surface(),sim=new Simulation(),pose=new CameraRig().update(s,390,844,CONFIG.step),matrix=Matrix.LookAtLH(pose.position,pose.target,pose.up).multiply(Matrix.PerspectiveFovLH(pose.fov,390/844,.1,250));
  for(const drop of sim.weaponDrops.slice(0,2)){const p=s.map(drop.x,drop.z,.16).point,q=Vector3.Project(new Vector3(p.x,p.y,p.z),Matrix.Identity(),matrix,{x:0,y:0,width:390,height:844});assert.ok(q.x>28&&q.x<362&&q.y>145&&q.y<674,`opening module ${drop.weapon} is hidden at ${q.x},${q.y}`);}
  for(let i=0;i<sim.weaponDrops.length;i++)for(let j=i+1;j<sim.weaponDrops.length;j++)assert.ok(Math.hypot(sim.weaponDrops[i].x-sim.weaponDrops[j].x,sim.weaponDrops[i].z-sim.weaponDrops[j].z)>=20);
});
test('solid barriers emerge gradually after the opening and remain genuinely impassable later',()=>{
  const s=new Surface();for(let i=0;i<300;i++)s.update(CONFIG.step,1);assert.equal(s.terrainStrength,0);
  s.update(CONFIG.step,2);assert.ok(s.terrainStrength>0&&s.terrainStrength<.01);
  for(let i=0;i<240;i++)s.update(CONFIG.step,2);assert.ok(s.terrainStrength>.28&&s.terrainStrength<.34);
  for(let i=0;i<720;i++)s.update(CONFIG.step,4);assert.ok(s.terrainStrength>.99);
  s.anchor={x:-14,y:3,z:-24};s.advance(0,0);let blocked=0;
  for(let i=0;i<250;i++){const step=s.resolveMotion(.2,0);blocked+=Number(s.blocked);s.advance(step.x,step.z);}assert.ok(blocked>0);
});
test('starter fire can engage a forward target before contact without hitting behind the ship',()=>{
  const s=arena(),ahead=s.spawnEnemy('guard',0,12,0),behind=s.spawnEnemy('guard',0,-4,0);s.grid.clear();s.grid.insert(ahead);s.grid.insert(behind);s.melee();
  for(let i=0;i<24;i++)s.updateBullets(CONFIG.step);
  assert.ok(ahead.hp<ahead.maxHp);assert.equal(behind.hp,behind.maxHp);assert.equal(s.player.ammo[0],undefined);
  const far=arena(),target=far.spawnEnemy('guard',0,19,0);far.grid.clear();far.grid.insert(target);far.melee();for(let i=0;i<30;i++)far.updateBullets(CONFIG.step);assert.equal(target.hp,target.maxHp);
});
test('a completed wave creates a collection window and attracts existing energy without taking equipment or healing',()=>{
  const s=arena(),e=s.spawnEnemy('diamond',0,16,0);e.waveId=1;s.wavePacks.set(1,{count:1,remaining:1,abandoned:false});s.spawnClock=-.1;s.player.hp=2;s.player.dashCD=1;s.player.burstCD=7;
  s.pickups=[{id:999,x:0,z:18,vx:0,vz:0,age:0,type:'energy'},{id:1000,x:32,z:0,vx:0,vz:0,age:0,type:'energy'}];s.spawnWeapon(6,0,19);
  s.damageEnemy(e,100);assert.equal(s.salvageTime,1.25);assert.equal(s.spawnClock,2);assert.equal(s.player.hp,2);assert.equal(s.player.dashCD,1);assert.equal(s.player.burstCD,7);
  for(let i=0;i<50;i++)s.updatePickups(CONFIG.step);
  assert.ok(!s.pickups.some(p=>p.id===999));assert.equal(s.pickups.find(p=>p.id===1000).x,32);assert.equal(s.weaponDrops[0].z,19);assert.equal(s.player.hp,2);assert.equal(s.player.invuln,3);
});
test('almost-ready defensive inputs execute once while early or paused inputs expire',()=>{
  for(const ability of['dash','burst']){
    const s=arena(),key=ability+'CD',buffer=ability+'Buffer';s.player[key]=.08;s.updatePlayer(CONFIG.step,{[ability]:true,moveX:1});assert.ok(s.player[buffer]>0);
    for(let i=0;i<8;i++)s.updatePlayer(CONFIG.step,{moveX:1});assert.equal(s.events.filter(e=>e.type===ability).length,1);assert.equal(s.player[buffer],0);
    const early=arena();early.player[key]=.5;early.updatePlayer(CONFIG.step,{[ability]:true});for(let i=0;i<40;i++)early.updatePlayer(CONFIG.step,{});assert.equal(early.events.filter(e=>e.type===ability).length,0);
    const paused=arena();paused.player[key]=.08;paused.updatePlayer(CONFIG.step,{[ability]:true});paused.setPause();assert.equal(paused.player[buffer],0);
  }
});
