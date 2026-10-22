import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { wavePosition } from '../src/waves.js';
import { CONFIG } from '../src/config.js';

function arena(){const s=new Simulation(731);s.curvedWorld=true;s.reset();s.enemies=[];s.obstacles=[];s.weaponDrops=[];s.gates=[];s.player.x=0;s.player.z=0;return s;}
const fillGrid=s=>{s.grid.clear();for(const e of s.enemies)if(!e.dead)s.grid.insert(e);};

test('surges surround the ship with a large synchronized wave but preserve its forward escape cone',()=>{
  const s=arena();s.time=60;s.waveCount=4;s.player.angle=.8;s.spawnWave();
  assert.equal(s.lastWave.pattern,'surge');assert.ok(s.lastWave.count>=50);
  for(const e of s.enemies){const delta=Math.atan2(Math.sin(Math.atan2(e.x,e.z)-s.player.angle),Math.cos(Math.atan2(e.x,e.z)-s.player.angle));assert.ok(Math.abs(delta)>=Math.PI*49/180);assert.ok(Math.hypot(e.x,e.z)>=22-.001);}
  assert.equal(new Set(s.enemies.map(e=>e.warmup)).size,1);assert.ok(s.enemies[0].warmup>1.7);
});
test('spirals and broad fronts have distinct arrival shapes instead of identical blocks',()=>{
  const spiral=Array.from({length:40},(_,i)=>wavePosition('spiral',i,40,0));
  assert.ok(new Set(spiral.map(p=>Math.round(Math.atan2(p.z,p.x)*10))).size>30);
  const flood=Array.from({length:40},(_,i)=>wavePosition('flood',i,40,0));
  const span=key=>Math.max(...flood.map(p=>p[key]))-Math.min(...flood.map(p=>p[key]));
  assert.ok(span('z')>span('x')*3);
});
test('clearing a complete wave awards a single sweep bonus without restoring health or cooldowns',()=>{
  const s=arena();s.spawnWave();s.player.hp=2;s.player.burstCD=5;
  const targets=[...s.enemies];for(const e of targets){e.warmup=0;s.damageEnemy(e,10000);}
  assert.equal(s.wavesCleared,1);assert.equal(s.events.filter(e=>e.type==='waveClear').length,1);assert.ok(s.sweepNotice.bonus>500);
  const score=s.score;s.killEnemy(targets[0]);assert.equal(s.score,score);assert.equal(s.player.hp,2);assert.equal(s.player.burstCD,5);
});
test('leaving a wave behind does not count as clearing it',()=>{
  const s=arena();s.spawnWave();s.enemies[0].x=80;s.recenter();
  for(const e of s.enemies){e.warmup=0;s.damageEnemy(e,10000);}assert.equal(s.wavesCleared,0);assert.equal(s.sweepNotice,null);
});
test('splitting enemies keep a wave unresolved until their children are destroyed',()=>{
  const s=arena();s.level={...s.level,number:16};const parent=s.spawnEnemy('splitter',0,10,0);parent.waveId=1;s.wavePacks.set(1,{count:1,remaining:1,abandoned:false});
  s.damageEnemy(parent,10000);assert.equal(s.wavesCleared,0);assert.equal(s.wavePacks.get(1).remaining,4);
  for(const child of s.enemies.filter(e=>!e.dead)){child.warmup=0;s.damageEnemy(child,10000);}assert.equal(s.wavesCleared,1);
});
test('linked reactor clusters chain locally, fling bounded debris and award a combo',()=>{
  const s=arena();assert.equal(s.spawnReactorCluster(),3);assert.equal(s.spawnReactorCluster(),0);
  const cores=s.enemies.filter(e=>e.type==='anchor');for(const e of cores)e.warmup=0;
  const far=s.spawnEnemy('guard',50,50,0);fillGrid(s);s.damageEnemy(cores[0],10000);
  assert.ok(cores.every(e=>e.dead));assert.equal(far.hp,far.maxHp);assert.equal(s.bestReactorChain,3);assert.ok(s.chainNotice.bonus>0);
  assert.ok(s.fragments.length>0&&s.fragments.length<=48);for(let i=0;i<120;i++)s.updateEffects(CONFIG.step);assert.equal(s.fragments.length,0);
});
test('pillar objectives cannot be discarded by travelling away and return with their health preserved',()=>{
  const s=arena();const pillar=s.spawnEnemy('pillar',80,0,0);pillar.hp=83;s.recenter();assert.ok(s.enemies.includes(pillar));
  fillGrid(s);s.updateEnemies(CONFIG.step);assert.ok(Math.hypot(pillar.x,pillar.z)<30);assert.equal(pillar.hp,83);assert.ok(pillar.warmup>2.9);assert.equal(pillar.landed,false);
});
