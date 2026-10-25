import test from 'node:test';
import assert from 'node:assert/strict';
import { Input, GameplayInputBuffer } from '../src/input.js';
import { Simulation } from '../src/simulation.js';
import { Surface } from '../src/surface.js';
import { HUD } from '../src/hud.js';
import { CONFIG, WEAPONS } from '../src/config.js';

class Target {
  constructor(){this.listeners={};this.dataset={};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setPointerCapture(){}
  focus(){}
  getBoundingClientRect(){return{left:0,top:0,width:400,height:800};}
}
globalThis.window=new Target();
globalThis.document={fullscreenElement:null};
Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});
const pointer=(type='touch')=>({pointerType:type,pointerId:1,clientX:100,clientY:400,button:0});
const emptyArena=()=>{const s=new Simulation(123);s.start();s.curvedWorld=true;s.enemies=[];s.obstacles=[];s.gates=[];s.weaponDrops=[];s.spawnClock=100;s.player.x=s.player.z=0;return s;};

test('boost, pulse and weapon presses survive a render frame with no simulation step at 120 and 144 Hz',()=>{
  for(const hz of[120,144]){
    const input=new Input(new Target()),buffer=new GameplayInputBuffer(),s=emptyArena();
    input.onClear=()=>buffer.clear();s.player.ownedWeapons.push(1);
    input.pressed.add('Space');input.pressed.add('KeyE');input.pressed.add('Digit2');
    let accumulator=0,dashes=0,pulses=0;
    for(let frame=0;frame<12;frame++){
      const current=input.getFrame();buffer.capture(current);accumulator+=1/hz;
      if(frame===0)assert.ok(accumulator<CONFIG.step);
      while(accumulator+1e-10>=CONFIG.step){s.update(CONFIG.step,buffer.consume(current));accumulator-=CONFIG.step;dashes+=s.events.filter(e=>e.type==='dash').length;pulses+=s.events.filter(e=>e.type==='burst').length;s.events=[];}
      input.endFrame();
    }
    assert.equal(dashes,1);assert.equal(pulses,1);assert.equal(s.player.weapon,1);
  }
});
test('catch-up steps consume ability edges once and menu or focus changes discard pending actions',()=>{
  const b=new GameplayInputBuffer(),f={moveX:1,dash:true,burst:true,weapon:4};b.capture(f);
  assert.equal(b.consume(f).dash,true);const second=b.consume(f);assert.equal(second.dash,false);assert.equal(second.burst,false);assert.equal(second.weapon,undefined);assert.equal(second.moveX,1);
  b.capture(f);b.capture({},false);assert.equal(b.consume({}).dash,false);
  const input=new Input(new Target());input.onClear=()=>b.clear();b.capture(f);input.pointerDown(pointer('mouse'));input.clear();
  assert.equal(b.consume({}).dash,false);assert.equal(input.actions.length,0);assert.equal(input.mouse.active,false);
});
test('weapon reselection, cycling and refills cannot bypass a slow weapon firing interval',()=>{
  const s=emptyArena(),p=s.player;p.ownedWeapons.push(1,6);p.ammo[6]=WEAPONS[6].ammo;s.equipWeapon(6);s.melee();
  const cooldown=p.shotCD,ammo=p.ammo[6];assert.ok(cooldown>1.8);
  for(let i=0;i<20;i++){s.equipWeapon(6);s.cycleWeapon(1);s.equipWeapon(6);s.melee();}
  assert.equal(p.shotCD,cooldown);assert.equal(p.ammo[6],ammo);assert.equal(s.bullets.length,1);
  s.spawnWeapon(6,0,0);s.updateWeaponDrops(CONFIG.step);assert.equal(p.shotCD,cooldown);
});
test('pointer drags and cancellations do not activate markers and lost capture releases steering',()=>{
  for(const type of['touch','mouse']){
    const target=new Target(),input=new Input(target),p=pointer(type);input.pointerDown(p);assert.equal(input.actions.length,0);
    input.pointerMove({...p,clientX:180});input.pointerUp({...p,clientX:180});assert.equal(input.actions.length,0);
    input.pointerDown(p);target.listeners.lostpointercapture({pointerId:1});assert.equal(input.left,null);assert.equal(input.right,null);assert.equal(input.mouse.down,false);assert.equal(input.actions.length,0);
    input.pointerUp(p,true);assert.equal(input.actions.length,0);
    input.pointerDown(p);input.pointerUp(p);assert.equal(input.actions.length,1);assert.equal(input.actions[0].type,'navigate');
  }
});
test('touch ability buttons act immediately without producing a destination on release',()=>{
  const input=new Input(new Target());let count=0;input.onTouchButton=()=>{count++;input.pressed.add('Dash');return'dash';};
  input.pointerDown(pointer());assert.equal(count,1);assert.equal(input.getFrame().dash,true);input.pointerUp(pointer());assert.equal(input.actions.length,0);assert.equal(input.left,null);
});
test('modal menus discard hidden world, weapon and ability hit targets',()=>{
  const s=emptyArena(),hud=new HUD(s,{},new Input(new Target()),{});hud.width=400;hud.height=800;
  const ctx=new Proxy({},{get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
  hud.area('weapon6',10,10,80,80);hud.area('navigateGate1',100,100,60,60);hud.drawPause(ctx,400,800);
  assert.equal(hud.hit(.1,.1),undefined);assert.equal(hud.hit(.3,.15),undefined);assert.equal(hud.hit(.5,.51),'resume');
  hud.drawSettings(ctx,400,800);assert.ok(hud.hitAreas.every(a=>a.id.startsWith('setting')||a.id==='closeSettings'));assert.equal(hud.hit(.5,.84),'closeSettings');
});
test('tapping sky or the open center of a ring never creates a fictitious floor destination',()=>{
  const surface=new Surface();surface.distance=p=>Math.hypot(p.x,p.y,p.z)-5;
  assert.equal(surface.raycast({x:0,y:0,z:10},{x:0,y:0,z:1}),null);
  const hit=surface.raycast({x:0,y:0,z:10},{x:0,y:0,z:-1});assert.ok(hit);assert.ok(Math.abs(hit.z-5)<.03);
  surface.distance=p=>Math.hypot(Math.hypot(p.x,p.y)-12,p.z)-3;
  assert.equal(surface.raycast({x:0,y:0,z:30},{x:0,y:0,z:-1}),null);
});
test('overlapping world targets select the nearest symbol while HUD buttons retain priority',()=>{
  const hud=new HUD({}, {}, {}, {});hud.width=400;hud.height=800;
  hud.area('navigateWeapon1',100,300,56,56);hud.area('navigateWeapon2',120,310,56,56);
  assert.equal(hud.hit(128/400,328/800),'navigateWeapon1');assert.equal(hud.hit(148/400,338/800),'navigateWeapon2');
  hud.area('dash',100,300,72,72);assert.equal(hud.hit(128/400,328/800),'dash');
});
