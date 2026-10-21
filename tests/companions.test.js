import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { CONFIG } from '../src/config.js';

test('exactly one selected drone persists across new runs',()=>{
  const s=new Simulation();
  for(let i=0;i<3;i++){s.selectSupport(i);s.start();assert.equal(s.supports.length,1);assert.equal(s.supports[0].type,['attack','collector','shield'][i]);}
});
test('the drone collects geoms without the player touching it',()=>{
  const s=new Simulation();s.start();s.selectSupport(1);s.supports[0].x=10;s.supports[0].z=10;
  s.pickups=[{id:999,x:10,z:10,vx:0,vz:0,age:0,type:'energy'}];
  s.updatePickups(CONFIG.step);assert.equal(s.credits,1);assert.equal(s.pickups.length,0);assert.ok(s.score>0);
});
test('solid obstacles obstruct movement; fragile ones can be destroyed by dash',()=>{
  const s=new Simulation();s.start();s.curvedWorld=true;s.enemies=[];s.spawnClock=100;
  s.player.x=0;s.player.z=0;
  const wall={id:888,x:1,z:0,angle:0,length:8,radius:.55,height:2,hp:Infinity,maxHp:Infinity,warmup:0,broken:false};
  s.obstacles=[wall];
  for(let i=0;i<45;i++)s.updatePlayer(CONFIG.step,{moveX:1});
  assert.ok(s.player.x<1);
  wall.hp=8;wall.maxHp=8;s.player.x=0;s.player.z=0;s.player.dashCD=0;
  s.updatePlayer(CONFIG.step,{moveX:1,dash:true});assert.equal(wall.broken,true);assert.ok(s.pickups.length>=6);
});
test('automatic filament lashes nearby targets and launches short-range strings',()=>{
  const s=new Simulation();s.start();s.enemies=[];s.obstacles=[];s.player.shotCD=0;
  const near=s.spawnEnemy('diamond',0,0,0),far=s.spawnEnemy('diamond',0,12,0);
  s.updatePlayer(CONFIG.step,{aimX:0,aimZ:10});
  assert.equal(s.bullets.filter(b=>b.owner==='player').length,3);assert.equal(near.dead,true);assert.equal(far.dead,false);assert.equal(s.attacks.length,1);
});
test('the arc lash reaches farther than the filament and armored blocks survive light hits',()=>{
  const s=new Simulation();s.start();s.enemies=[];s.obstacles=[];s.player.x=0;s.player.z=0;
  const guard=s.spawnEnemy('guard',0,8,0),hp=guard.hp;
  s.player.weapon=0;s.player.shotCD=0;s.melee();assert.equal(guard.hp,hp);
  s.player.weapon=1;s.player.shotCD=0;s.melee();assert.ok(guard.hp<hp);assert.equal(guard.dead,false);
});
test('curved worlds use intrinsic terrain and do not generate detached wall props',()=>{
  const s=new Simulation();s.curvedWorld=true;s.start();assert.equal(s.obstacles.length,0);assert.equal(s.enemies.length,12);assert.ok(s.enemies.every(e=>!e.elite&&e.type!=='dart'));
});
