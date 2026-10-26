import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { CONFIG, WEAPONS } from '../src/config.js';
import { FRACTURE_STAGES, fractureChildren } from '../src/fractures.js';
import { pickupArt } from '../src/pickup-art.js';
import { GameRenderer, drawableSegment } from '../src/renderer.js';
import { Vector3 } from '../vendor/babylon-core.js';

function arena(){const s=new Simulation(92);s.curvedWorld=true;s.reset();s.enemies=[];s.obstacles=[];s.gates=[];s.weaponDrops=[];return s;}
function prune(s){s.enemies=s.enemies.filter(e=>!e.dead);s.releaseFractures();}
function grid(s){s.grid.clear();for(const e of s.enemies)if(!e.dead)s.grid.insert(e);}

test('a giant cube fractures into three, nine, then twenty-seven progressively faster enemies',()=>{
  const s=arena();assert.ok(s.spawnFractureEncounter());assert.equal(s.spawnFractureEncounter(),false);
  assert.equal(s.enemies[0].fractureStage,3);assert.equal(s.enemies[0].width,8);assert.ok(Math.hypot(s.enemies[0].x,s.enemies[0].z)>20);
  const stages=[];s.player.hp=2;s.player.burstCD=5;
  for(let stage=3;stage>=0;stage--){
    const members=s.enemies.filter(e=>!e.dead);stages.push(members.length);
    assert.ok(members.every(e=>e.fractureStage===stage));
    for(const e of members){e.warmup=0;s.damageEnemy(e,10000);}
    if(stage>0)assert.equal(s.fracturesCleared,0);
    prune(s);
  }
  assert.deepEqual(stages,[1,3,9,27]);assert.equal(s.kills,40);assert.equal(s.fracturesCleared,1);assert.equal(s.fractureFamilies.size,0);assert.ok(s.fractureNotice.bonus>=3000);
  assert.equal(s.player.hp,2);assert.equal(s.player.burstCD,5);assert.equal(s.events.filter(e=>e.type==='fractureClear').length,1);
  assert.ok(FRACTURE_STAGES.every((p,i)=>!i||p.radius>FRACTURE_STAGES[i-1].radius&&p.hp>FRACTURE_STAGES[i-1].hp&&p.speed<FRACTURE_STAGES[i-1].speed));
});
test('fracture children wait at the population cap without losing descendants or granting an early reward',()=>{
  const s=arena();s.spawnFractureEncounter();const root=s.enemies[0];root.warmup=0;
  while(s.enemies.length<CONFIG.maxEnemies)s.spawnEnemy('mote',30,30,0);
  s.damageEnemy(root,10000);assert.equal(s.pendingFractures.length,3);s.releaseFractures();assert.equal(s.pendingFractures.length,3);
  prune(s);assert.equal(s.enemies.length,CONFIG.maxEnemies);assert.equal(s.pendingFractures.length,2);assert.equal([...s.fractureFamilies.values()][0].remaining,3);
  s.enemies=s.enemies.filter(e=>e.type==='fracture');s.releaseFractures();assert.equal(s.pendingFractures.length,0);assert.equal(s.enemies.length,3);assert.equal(s.fracturesCleared,0);
});
test('children are announced and placed outside the player and their pending positions follow chart travel',()=>{
  const s=arena();const parent={x:0,z:0,phase:0,radius:5.6,fractureStage:3,familyId:9};
  const children=fractureChildren(parent,{x:0,z:4});for(const c of children)assert.ok(Math.hypot(c.x,c.z-4)>=FRACTURE_STAGES[c.stage].radius+2-.001);
  s.pendingFractures=children;const original=children.map(c=>({x:c.x,z:c.z}));s.player.x=7;s.player.z=-4;s.recenter();
  children.forEach((c,i)=>{assert.equal(c.x,original[i].x-7);assert.equal(c.z,original[i].z+4);});s.releaseFractures();assert.ok(s.enemies.every(e=>e.warmup===.65));
});
test('leaving fracture enemies behind abandons the full-clear reward, and bosses clear pending families',()=>{
  const s=arena();s.spawnFractureEncounter();const root=s.enemies[0];root.warmup=0;s.damageEnemy(root,10000);prune(s);
  s.enemies[0].x=90;s.recenter();assert.equal([...s.fractureFamilies.values()][0].abandoned,true);
  while(s.enemies.some(e=>!e.dead)){for(const e of [...s.enemies]){e.warmup=0;s.damageEnemy(e,10000);}prune(s);}
  assert.equal(s.fracturesCleared,0);assert.equal(s.fractureFamilies.size,0);
  s.spawnFractureEncounter();s.enemies[0].warmup=0;s.damageEnemy(s.enemies[0],10000);s.levelIndex=3;s.nextLevel();
  assert.equal(s.level.boss,true);assert.equal(s.pendingFractures.length,0);assert.equal(s.fractureFamilies.size,0);assert.ok(s.enemies.every(e=>e.type!=='fracture'));
});
test('eight kills inside 1.1 seconds pay a single cascade, while slow kills do not',()=>{
  const s=arena();s.player.hp=2;s.player.burstCD=5;
  const targets=Array.from({length:12},(_,i)=>s.spawnEnemy('mote',i,14,0));for(const e of targets)s.damageEnemy(e,10);
  assert.equal(s.cascades,1);assert.equal(s.cascadeNotice.count,8);assert.ok(s.cascadeNotice.bonus>=1200);assert.equal(s.player.hp,2);assert.equal(s.player.burstCD,5);
  const score=s.score;s.killEnemy(targets[0]);assert.equal(s.score,score);
  const slow=arena();for(let i=0;i<12;i++){slow.time+=.3;slow.damageEnemy(slow.spawnEnemy('mote',i,14,0),10);}assert.equal(slow.cascades,0);
});
test('projectiles and area blasts hit giant blocks at their edges without healing them',()=>{
  const s=arena();const giant=s.spawnFracture(3,8,0,0,0);grid(s);
  s.shoot(2.6,-1,0,{speed:40,life:1,damage:3,radius:.2});s.updateBullets(CONFIG.step);assert.equal(giant.hp,giant.maxHp-3);
  const hp=giant.hp;s.explodeProjectile({x:0,z:0,damage:20,explosionRadius:4.7,color:'#ffffff'});assert.ok(giant.hp<hp);
});
test('a short ribbon cuts shards but cannot erase an intact giant block in one contact',()=>{
  const s=arena();s.player.weapon=8;const giant=s.spawnFracture(3,0,8,0,0);grid(s);s.melee();s.updateRibbonHits();assert.ok(giant.hp>0&&giant.hp<giant.maxHp);assert.equal(s.pendingFractures.length,0);
});
test('equipment pictograms stay inside their seal and each weapon has a distinct illustrated silhouette',()=>{
  const signatures=new Set();
  for(let i=0;i<WEAPONS.length;i++){
    const strokes=pickupArt(i,WEAPONS[i].color);assert.ok(strokes.length>=10);
    for(const {a,b,width}of strokes)for(const q of[a,b])assert.ok(Math.hypot(...q)+width*.5<1.96,`art ${i} crosses its seal`);
    signatures.add(JSON.stringify(strokes));
  }
  assert.equal(signatures.size,WEAPONS.length);
});
test('portal rings animate in place, have bounded segments, and add a temporary warp flare',()=>{
  const segments=[],origin=new Vector3(0,0,0),renderer={sim:{reduced:false},frame:()=>({point:origin,right:Vector3.Right(),normal:Vector3.Up(),forward:Vector3.Forward()}),ring:()=>{},string:(a,b,width,color)=>segments.push({a,b,width,color})};
  const gate={x:0,z:0,color:'#74caff',id:1,warpTime:0},player={x:7,z:0};
  GameRenderer.prototype.gatePortal.call(renderer,gate,0,player);const first=segments.map(s=>s.a.asArray());segments.length=0;
  GameRenderer.prototype.gatePortal.call(renderer,gate,1,player);assert.notDeepEqual(segments.map(s=>s.a.asArray()),first);const base=segments.length;
  segments.length=0;gate.warpTime=.7;GameRenderer.prototype.gatePortal.call(renderer,gate,1,player);assert.ok(segments.length>base);
  for(const s of segments){assert.ok(drawableSegment(s.a,s.b));assert.ok(Vector3.Distance(s.a,origin)<8);}
});
