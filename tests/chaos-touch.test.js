import test from 'node:test';
import assert from 'node:assert/strict';
import { gameLayout } from '../src/layout.js';
import { Input } from '../src/input.js';
import { HUD } from '../src/hud.js';
import { Simulation } from '../src/simulation.js';
import { wavePosition } from '../src/waves.js';
import { riftDistance,riftTouches } from '../src/rifts.js';
import { CONFIG } from '../src/config.js';
const arena=()=>{const s=new Simulation(63);s.curvedWorld=true;s.reset();s.enemies=[];s.obstacles=[];s.weaponDrops=[];s.gates=[];s.player.x=s.player.z=0;return s;};
class Target{constructor(w=400,h=800){this.listeners={};this.dataset={};this.w=w;this.h=h;}addEventListener(n,f){this.listeners[n]=f;}setPointerCapture(){}focus(){}getBoundingClientRect(){return{left:0,top:0,width:this.w,height:this.h};}}
globalThis.window=new Target();Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});
const pointer=(id,x,y,type='touch')=>({pointerId:id,clientX:x,clientY:y,pointerType:type,button:0});
const rect=(p,r)=>({x:p.x-r,y:p.y-r,w:r*2,h:r*2});
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.1;

test('phone, Duo window sizes, iPad and split view keep touch controls inside every safe edge without overlap',()=>{
  for(const[w,h,insets]of[[320,568,{}],[382,580,{}],[594,368,{left:47,right:47,bottom:21}],[669,867,{}],[951,585,{}],[385,571,{}],[390,844,{top:59,bottom:34}],[768,1024,{top:24,bottom:20}],[1024,768,{top:24,bottom:20}],[507,768,{top:24,bottom:20}]]){
    const l=gameLayout(w,h,insets),buttons=l.abilities.map(a=>rect(a,36)),slots=l.slots.map(p=>rect(p,l.slotSize/2)),sticks=[rect(l.left,l.stickRadius),rect(l.right,l.stickRadius)];
    for(const r of[...buttons,...slots,...sticks]){assert.ok(r.x>=l.safe.x-.01&&r.y>=l.safe.y-.01&&r.x+r.w<=l.safe.x+l.safe.width+.01&&r.y+r.h<=l.safe.y+l.safe.height+.01,`clipped control at ${w}x${h}`);}
    for(const slot of slots){assert.ok(slot.w>=44);for(const b of buttons)assert.equal(overlap(slot,b),false,`inventory/ability overlap at ${w}x${h}`);for(const stick of sticks)assert.equal(overlap(slot,stick),false,`inventory/stick overlap at ${w}x${h}`);}
    assert.equal(overlap(buttons[0],buttons[1]),false);
  }
});
test('reported fold segments keep all touch targets off the fold and optional APIs are unnecessary for ordinary layouts',()=>{
  const segments=[{x:0,y:0,width:460,height:620,right:460,bottom:620},{x:491,y:0,width:460,height:620,right:951,bottom:620}],l=gameLayout(951,620,{},segments),gap={x:460,y:0,w:31,h:620};
  for(const r of[...l.slots.map(p=>rect(p,24)),...l.abilities.map(p=>rect(p,36)),rect(l.left,52),rect(l.right,52)])assert.equal(overlap(r,gap),false);
  assert.equal(gameLayout(382,580).slots.length,9);
});
test('two thumbs plus an ability finger remain independent, and a spare contact cannot become aim or a destination',()=>{
  const input=new Input(new Target());let boosts=0;input.onTouchButton=(x,y)=>{if(x>.8&&y>.8){boosts++;input.pressed.add('Dash');return'dash';}return false;};
  input.pointerDown(pointer(1,60,500));input.pointerMove(pointer(1,105,460));input.pointerDown(pointer(2,280,500));input.pointerMove(pointer(2,315,470));input.pointerDown(pointer(3,380,760));
  const f=input.getFrame();assert.ok(f.moveX>0&&f.moveZ>0&&f.manualAim&&f.dash);assert.equal(boosts,1);
  input.pointerUp(pointer(3,380,760));input.pointerUp(pointer(2,315,470));input.pointerUp(pointer(1,105,460));assert.equal(input.actions.length,0);
  input.pointerDown(pointer(4,60,500));input.pointerDown(pointer(5,90,500));assert.equal(input.right,null);input.pointerUp(pointer(5,90,500));input.pointerUp(pointer(4,60,500));assert.equal(input.actions.length,0);
});
test('safe-area touches are ignored and Pencil contacts use the same cancellation-safe gesture controls',()=>{
  const i=new Input(new Target());i.layout=gameLayout(400,800,{top:50,bottom:30});i.pointerDown(pointer(1,80,10));i.pointerUp(pointer(1,80,10));assert.equal(i.actions.length,0);
  i.pointerDown(pointer(2,80,500,'pen'));i.pointerMove(pointer(2,120,460,'pen'));assert.ok(i.getFrame().moveX>0);i.pointerUp(pointer(2,120,460,'pen'),true);assert.equal(i.actions.length,0);assert.equal(i.left,null);
});
test('HUD uses global safe-area hit coordinates so a visibly inset weapon can be tapped correctly',()=>{
  const input=new Input(new Target(390,844));input.touch=true;input.layout=gameLayout(390,844,{top:59,bottom:34});const s=arena();s.player.ownedWeapons=[0,1,3];s.player.ammo[3]=100;
  const hud=new HUD(s,{},input,{});hud.layout=input.layout;hud.offsetX=0;hud.offsetY=59;hud.width=390;hud.height=751;hud.canvasWidth=390;hud.canvasHeight=844;
  const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});hud.drawTouchWeapons(ctx,390,751);const slot=input.layout.slots[3];assert.equal(hud.hit(slot.x/390,slot.y/844),'weapon3');
});
test('rift beams announce before firing, hit both sides once, expire, and leave an open starting corridor',()=>{
  const s=arena();s.time=60;s.spawnRift();assert.equal(s.rifts.length,2);assert.ok(s.rifts.every(r=>riftDistance(r,s.player)>9));assert.equal(s.spawnRift(),false);
  const r=s.rifts[0],light=s.spawnEnemy('diamond',r.x,r.z,0),tank=s.spawnEnemy('guard',r.x+1,r.z,0);s.player.invuln=0;s.player.x=r.x;s.player.z=r.z;s.updateRifts(1.5);assert.equal(s.player.hp,5);assert.equal(light.dead,false);
  s.updateRifts(.16);assert.equal(s.player.hp,4);assert.equal(light.dead,true);assert.equal(tank.hp,tank.maxHp-12);s.updateRifts(.2);assert.equal(tank.hp,tank.maxHp-12);assert.equal(s.player.hp,4);s.updateRifts(1);assert.equal(s.rifts.length,0);
});
test('pulse collapses only nearby rifts, dash crosses safely, and recentering preserves beam contact',()=>{
  const s=arena();s.spawnRift();const r=s.rifts[0];s.player.z=8;const touching=riftTouches(r,s.player);const shift=s.recenter();assert.equal(riftTouches(r,s.player),touching);assert.equal(shift.dz,8);
  s.burst();assert.equal(r.cancelled,true);assert.equal(s.riftsCleared,1);s.updateRifts(2);assert.equal(s.rifts.length,0);
  const far=arena();far.spawnRift();far.burst();assert.equal(far.rifts[0].cancelled,undefined);
  far.player.x=far.rifts[0].x;far.player.z=far.rifts[0].z;far.player.invuln=0;far.player.dash=.1;far.updateRifts(1.7);assert.equal(far.player.hp,5);
});
test('braids arrive as two broad weaving fronts and the new emitter telegraphs a split fan with a central gap',()=>{
  const s=arena();s.time=14;s.waveCount=1;s.spawnWave();assert.equal(s.lastWave.pattern,'braid');assert.equal(new Set(s.enemies.map(e=>e.packId)).size,2);assert.ok(s.enemies.every(e=>e.braided&&Math.hypot(e.x,e.z)>20));
  const points=Array.from({length:60},(_,i)=>wavePosition('braid',i,60,.2));for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z)>1.6);
  const a=arena(),e=a.spawnEnemy('weaver',0,16,0);e.cd=-1;a.grid.clear();a.grid.insert(e);a.updateEnemies(CONFIG.step);assert.ok(e.windup>.9);assert.equal(a.bullets.length,0);
  for(let i=0;i<60;i++)a.updateEnemies(CONFIG.step);const shots=a.bullets.filter(b=>b.enemy);assert.equal(shots.length,6);const heading=Math.atan2(e.aimX-e.x,e.aimZ-e.z);assert.ok(shots.every(b=>Math.abs(Math.atan2(Math.sin(b.angle-heading),Math.cos(b.angle-heading)))>.12));
});
test('pause and system controls retain forty-four-pixel targets without overlapping adjacent buttons',()=>{
  const hud=new HUD(arena(),{},{touch:true},{muted:false}),ctx=new Proxy({},{get:()=>()=>{},set:()=>true});hud.width=382;hud.height=580;hud.drawTopIcons(ctx,382,580);
  for(const area of hud.hitAreas)assert.ok(area.w>=44&&area.h>=44);
  for(let i=0;i<hud.hitAreas.length;i++)for(let j=i+1;j<hud.hitAreas.length;j++)assert.equal(overlap(hud.hitAreas[i],hud.hitAreas[j]),false);
});
test('visible equipment in the Duo inner landscape remains tappable above the tablet inventory',()=>{
  const s=arena();s.spawnWeapon(1,-7,9);s.spawnWeapon(3,7,-7);const input={touch:true,layout:gameLayout(951,585)},renderer={screenPoint:(x,y,z)=>({x:x<0?354:589,y:x<0?173:437,visible:true})};
  const hud=new HUD(s,renderer,input,{});hud.layout=input.layout;hud.width=951;hud.height=585;hud.canvasWidth=951;hud.canvasHeight=585;hud.drawWeaponBeacons();assert.equal(hud.hitAreas.length,2);assert.equal(hud.hit(589/951,437/585),`navigateWeapon${s.weaponDrops[1].id}`);
});
test('destroying an emitter converts its fire into a bounded friendly burst that can clear nearby motes',()=>{
  const s=arena(),emitter=s.spawnEnemy('weaver',0,6,0),near=s.spawnEnemy('mote',0,10,0),far=s.spawnEnemy('cube',0,25,0);emitter.angle=0;s.grid.clear();for(const e of s.enemies)s.grid.insert(e);s.damageEnemy(emitter,1000);
  const bolts=s.bullets.filter(b=>b.owner==='reclaimed');assert.equal(bolts.length,6);assert.ok(bolts.every(b=>!b.enemy&&b.damage===1.6&&b.life===.5));
  for(let i=0;i<35;i++)s.updateBullets(CONFIG.step);assert.equal(near.dead,true);assert.equal(far.hp,far.maxHp);
});
