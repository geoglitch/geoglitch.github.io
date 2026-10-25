import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '../vendor/babylon-core.js';
import { Simulation } from '../src/simulation.js';
import { Surface } from '../src/surface.js';
import { CameraRig,clearanceRadius } from '../src/camera.js';
import { CONFIG } from '../src/config.js';
import { drawableSegment } from '../src/renderer.js';

test('neon trails reject surface projection jumps and segments crossing behind the camera',()=>{
  const eye=Vector3.Zero(),view=Vector3.Forward();
  assert.equal(drawableSegment(new Vector3(0,0,5),new Vector3(1,0,6),eye,view),true);
  assert.equal(drawableSegment(new Vector3(0,0,-1),new Vector3(0,0,5),eye,view),false);
  assert.equal(drawableSegment(new Vector3(0,0,5),new Vector3(20,0,5),eye,view),false);
  assert.equal(drawableSegment(new Vector3(NaN,0,5),new Vector3(1,0,6),eye,view),false);
});

test('repeated close combat never pauses travel, cooldowns or the music clock',()=>{
  const s=new Simulation(47);s.curvedWorld=true;s.reset();s.enemies=[];s.gates=[];s.weaponDrops=[];s.obstacles=[];s.spawnClock=1000;s.god=true;
  const enemy=s.spawnEnemy('guard',2,0,0);enemy.hp=1e6;enemy.maxHp=1e6;
  for(let i=0;i<180;i++){
    enemy.x=s.player.x+2.6;enemy.z=s.player.z;enemy.vx=enemy.vz=0;enemy.warmup=0;
    const before=s.time;s.update(CONFIG.step,{moveX:1,aimAngle:Math.PI/2});
    assert.ok(Math.abs(s.time-before-CONFIG.step)<1e-9,'a hit froze the simulation');
    assert.ok(s.player.vx>0);
  }
  assert.ok(enemy.hp<1e6);assert.ok(s.player.x>40);assert.ok(s.musicBeat>6);
});
test('terrain contact removes blocked velocity while preserving slide instead of bouncing backward',()=>{
  const s=new Simulation(9);s.curvedWorld=true;s.reset();s.enemies=[];s.gates=[];s.obstacles=[];
  s.player.z=0;s.player.vx=10;s.player.vz=10;s.movementResolver=(x,z)=>({x:0,z});
  for(let i=0;i<40;i++){
    s.updatePlayer(CONFIG.step,{moveX:1,moveZ:1});assert.equal(s.player.x,0);assert.equal(s.player.vx,0);assert.ok(s.player.vz>0);
  }
  assert.ok(s.player.z>6);
});
test('an oblique ridge permits continuous tangential travel without climbing over it',()=>{
  const surface=new Surface();surface.anchor={x:0,y:0,z:0};surface.right={x:1,y:0,z:0};surface.up={x:0,y:0,z:1};surface.project=p=>p;surface.ridgeHeight=p=>.72+(p.x+p.z)*.5;
  const move=surface.resolveMotion(.2,.1);assert.ok(Math.hypot(move.x,move.z)>.06);assert.ok(Math.abs(move.x+move.z)<.0001);assert.ok(surface.ridgeHeight(move)<.721);
});
test('taking damage still costs a shield while retaining forward momentum',()=>{
  const s=new Simulation(5);s.reset();s.player.invuln=0;s.player.vx=CONFIG.speed;const hp=s.player.hp;
  s.damagePlayer(s.player.x+1,s.player.z);assert.equal(s.player.hp,hp-1);assert.ok(s.player.vx>CONFIG.speed*.7);assert.ok(s.player.invuln>0);
});
test('camera horizon follows the world shape without reacting to ridge and pulse normals',()=>{
  const surface=new Surface(),normal=surface.viewNormal();
  surface.floorPhase=2;surface.pulseAge=.2;surface.pulseOrigin={x:2,y:-10,z:-13};
  assert.deepEqual(surface.viewNormal(),normal);
});
test('camera clearance changes continuously instead of jumping between zoom bands',()=>{
  const origin=Vector3.Zero(),outward=new Vector3(0,0,-1),up=Vector3.Up();let previous;
  for(let size=35;size<55;size+=.025){
    const radius=clearanceRadius({distance:p=>p.length()-size},origin,outward,up,37,0,7);
    assert.ok(radius-size>=7-.0001);if(previous!==undefined)assert.ok(radius-previous<.04);previous=radius;
  }
});
test('the camera remains clear and finite during continuous travel on every world family',()=>{
  for(let shape=0;shape<6;shape++){
    const surface=new Surface(),rig=new CameraRig();surface.from=surface.to=shape;surface.advance(0,0);
    for(let i=0;i<400;i++){
      surface.update(CONFIG.step,1);surface.advance(Math.sin(i*.01)*.08,.14);
      const pose=rig.update(surface,390,844,CONFIG.step);
      assert.ok(Number.isFinite(pose.position.x+pose.position.y+pose.position.z));assert.ok(surface.distance(pose.position)>2.4);
      assert.ok(rig.step<3,`camera jumped ${rig.step} on shape ${shape}`);
    }
  }
});
test('the camera stays continuous through all fifty changing world encounters',()=>{
  const surface=new Surface(),rig=new CameraRig();
  for(let level=1;level<=50;level++)for(let i=0;i<260;i++){
    surface.update(CONFIG.step,level);surface.advance(.05,.07);
    const pose=rig.update(surface,1280,720,CONFIG.step);
    assert.ok(surface.distance(pose.position)>2.4);assert.ok(rig.step<3,`camera jumped ${rig.step} in encounter ${level}`);
  }
});
test('the camera keeps up with fast curved travel without a sustained grazing view',()=>{
  for(let shape=0;shape<6;shape++){
    const surface=new Surface(),rig=new CameraRig();surface.from=surface.to=shape;surface.advance(0,0);let error=0;
    for(let i=0;i<900;i++){surface.update(CONFIG.step,1);surface.advance(Math.sin(i*.013)*.16,.2);rig.update(surface,390,844,CONFIG.step);error+=rig.angleError;assert.ok(rig.step<3.5);}
    assert.ok(error/900<.25,`camera lagged behind world ${shape}`);
  }
});
test('portrait framing follows the visible world mass instead of always looking above the ship',()=>{
  for(const y of[-14,14]){
    const surface=new Surface(),rig=new CameraRig();surface.from=surface.to=2;surface.anchor={x:2,y,z:-12};surface.advance(0,0);
    const pose=rig.update(surface,390,844,CONFIG.step),view=surface.viewFrame(),center=Vector3.Dot(new Vector3(-view.point.x,-view.point.y,-view.point.z),pose.up);
    assert.ok(Math.abs(rig.focusBias)<=4);assert.equal(Math.sign(rig.focusBias),Math.sign(center));
  }
});
