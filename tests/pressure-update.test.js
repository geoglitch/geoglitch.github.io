import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { wavePosition } from '../src/waves.js';
import { bossPorts } from '../src/boss.js';
import { CONFIG, WEAPONS } from '../src/config.js';
import { GameRenderer } from '../src/renderer.js';
import { Vector3 } from '../vendor/babylon-core.js';
const arena=()=>{const s=new Simulation(31);s.curvedWorld=true;s.reset();s.enemies=[];s.obstacles=[];s.weaponDrops=[];s.gates=[];s.player.x=0;s.player.z=0;return s;};
const grid=s=>{s.grid.clear();for(const e of s.enemies)if(!e.dead)s.grid.insert(e);};

test('large waves are dispersed across broad sectors instead of compact grids',()=>{
  for(const pattern of['hunt','flood','swarm','pincer','ritual','spiral','surge']){
    const points=Array.from({length:100},(_,i)=>wavePosition(pattern,i,100,.7,4,pattern==='swarm'));
    const nearest=points.map((p,i)=>Math.min(...points.filter((_,j)=>j!==i).map(q=>Math.hypot(p.x-q.x,p.z-q.z))));
    assert.ok(Math.min(...nearest)>2,`${pattern} has adjacent clumps`);
    assert.ok(points.every(p=>Math.hypot(p.x,p.z)>=20));
    assert.ok(new Set(points.map(p=>Math.floor(Math.atan2(p.x,p.z)*3))).size>=5);
  }
});
test('swarm members have independent rhythms and no attraction toward their neighbors',()=>{
  const s=arena();s.time=70;s.waveCount=2;s.spawnWave();assert.ok(new Set(s.enemies.map(e=>e.packPhase)).size>30);
  s.enemies=[];const a=s.spawnEnemy('mote',10,.3,0),b=s.spawnEnemy('mote',10,-.3,0);
  for(const e of[a,b]){e.phase=0;e.flank=1;e.maneuverClock=100;}grid(s);s.updateEnemies(CONFIG.step);
  assert.ok(a.vz>b.vz,'overlapping lanes should separate');
});
test('hunters lead a moving ship while crosses alternate circling with a committed cut-in',()=>{
  const s=arena();s.player.vz=14;const e=s.spawnEnemy('diamond',12,0,0);e.flank=1;grid(s);s.updateEnemies(CONFIG.step);
  assert.ok(e.vx<0&&e.vz>0,'interceptor should aim ahead of the escape direction');
  const orbit=arena(),attack=arena();const a=orbit.spawnEnemy('spinner',8,0,0),b=attack.spawnEnemy('spinner',8,0,0);
  a.phase=-Math.PI/2;b.phase=Math.PI/2;grid(orbit);grid(attack);orbit.updateEnemies(CONFIG.step);attack.updateEnemies(CONFIG.step);
  assert.ok(Math.abs(a.vz)>Math.abs(a.vx));assert.ok(Math.abs(b.vx)>Math.abs(b.vz));
});
test('a dart locks its predicted charge during its warning and allows a dodge',()=>{
  const s=arena();s.player.vz=12;const e=s.spawnEnemy('dart',12,0,0);e.cd=-1;grid(s);s.updateEnemies(CONFIG.step);
  assert.equal(e.state,'windup');assert.ok(e.aimZ>0);const aim={x:e.aimX,z:e.aimZ};
  s.player.z=-20;s.player.vz=-12;
  for(let i=0;i<52;i++){grid(s);s.updateEnemies(CONFIG.step);}
  assert.equal(e.state,'charge');assert.equal(e.aimX,aim.x);assert.equal(e.aimZ,aim.z);assert.ok(e.vz>0);
});
test('boss armor requires three different approach angles before its core is vulnerable',()=>{
  const s=arena(),boss=s.spawnEnemy('boss',0,12,0),hp=boss.hp;boss.portAngle=0;
  s.damageEnemy(boss,999,false,{x:Math.sin(Math.PI/3)*12,z:12+Math.cos(Math.PI/3)*12});assert.equal(boss.hp,hp);
  for(let i=0;i<3;i++){
    const port=bossPorts(boss)[i];s.damageEnemy(boss,999,false,port);
    assert.equal(boss.ports[i],0);assert.ok(boss.hp>0);assert.equal(boss.shielded,i<2);
    const remain=boss.hp;if(i<2){s.damageEnemy(boss,999,false,port);assert.equal(boss.hp,remain);}
  }
  assert.ok(Math.abs(boss.hp-hp*.45)<1e-6);s.damageEnemy(boss,999);assert.equal(boss.dead,true);
});
test('boss volleys leave an approach lane open and navigation approaches an intact port',()=>{
  const s=arena(),boss=s.spawnEnemy('boss',0,12,0);boss.portAngle=0;boss.cd=-1;grid(s);s.updateEnemies(CONFIG.step);
  assert.ok(s.bullets.filter(b=>b.enemy).length>=8);
  for(const b of s.bullets.filter(b=>b.enemy))assert.ok(Math.abs(Math.atan2(Math.sin(b.angle-boss.portAngle),Math.cos(b.angle-boss.portAngle)))>=.42);
  const renderer={sim:s,navigationEntity:{type:'boss',id:boss.id}};
  const goal=GameRenderer.prototype.navigationLocal.call(renderer);assert.equal(goal.aimX,boss.x);assert.equal(goal.aimZ,boss.z);assert.ok(Math.abs(Math.hypot(goal.x-boss.x,goal.z-boss.z)-5.46)<1e-6);
  assert.ok(boss.portAngle>0);
});
test('deliberate right-stick input steers the nose while movement still strafes',()=>{
  const s=arena();for(let i=0;i<90;i++)s.updatePlayer(CONFIG.step,{moveX:1,moveZ:0,aimAngle:0,manualAim:true});
  assert.ok(s.player.x>15);assert.ok(Math.abs(s.player.angle)<.001);assert.ok(s.bullets.filter(b=>b.owner==='player').every(b=>Math.abs(b.angle)<.1));
});
test('a Nova breaks nearby props and hostile fire without clearing the whole arena',()=>{
  const s=arena();s.obstacles=[{id:99,x:0,z:0,warmup:0,broken:false,hp:10,maxHp:10}];
  s.shoot(1,0,0,{enemy:true});s.shoot(14,0,0,{enemy:true});const far=s.bullets[1];
  const b={x:0,z:0,color:'#48adff',damage:20,explosionRadius:4.7,life:1};s.explodeProjectile(b);
  assert.equal(s.obstacles[0].broken,true);assert.equal(s.bullets[0].life,0);assert.ok(far.life>0);
  const count=s.rings.length;s.explodeProjectile(b);assert.equal(s.rings.length,count);
});
test('missile splash hits a nearby target once and keeps its reach tightly bounded',()=>{
  const s=arena();const target=s.spawnEnemy('guard',0,2,0),near=s.spawnEnemy('guard',1.6,2,0),far=s.spawnEnemy('guard',6,2,0);grid(s);
  s.shoot(0,0,0,{weapon:5,homing:3.8,damage:4,speed:26,life:1,color:WEAPONS[5].color});
  for(let i=0;i<10;i++)s.updateBullets(CONFIG.step);
  assert.equal(target.hp,target.maxHp-4);assert.equal(near.hp,near.maxHp-1.2);assert.equal(far.hp,far.maxHp);
});
test('weapon emitters remain attached and projectile geometry stays bounded in every weapon mode',()=>{
  const origin=new Vector3(0,0,0),f={point:origin,right:Vector3.Right(),forward:Vector3.Forward(),normal:Vector3.Up()},points=[];
  const renderer={frame:()=>f,camera:{position:new Vector3(0,20,0)},map:(x,z,y)=>({point:{x,y,z}}),string:(a,b)=>points.push(a,b),lines:{line:(a,b)=>points.push(a,b)},ring:()=>{},solid:()=>{}};
  for(let weapon=0;weapon<9;weapon++){
    GameRenderer.prototype.weaponMuzzle.call(renderer,{weapon,angle:0,attackTime:.15,shotCD:0});
    GameRenderer.prototype.projectile.call(renderer,{x:0,z:0,angle:0,weapon,color:WEAPONS[weapon].color,homing:weapon===5?3.8:0,explosionRadius:weapon===6?4.7:0},1);
  }
  assert.ok(points.length>100&&points.length<250);
  assert.ok(points.every(p=>Number.isFinite(p.x+p.y+p.z)&&p.length()<4));
});
test('a pickup grants a brief switch window without healing or resetting the defensive abilities',()=>{
  const s=arena(),p=s.player;p.hp=2;p.invuln=0;p.dashCD=1;p.burstCD=6;s.spawnWeapon(4,0,0);s.updateWeaponDrops(CONFIG.step);
  assert.equal(p.weapon,4);assert.equal(p.hp,2);assert.equal(p.invuln,.45);assert.equal(p.dashCD,1);assert.equal(p.burstCD,6);
});
test('a new run never inherits debug invulnerability from a focused playtest',()=>{
  const s=arena();s.god=true;s.reset();assert.equal(s.god,false);
});
test('boss approach selection stays stable until its chosen armor lock breaks',()=>{
  const s=arena(),boss=s.spawnEnemy('boss',0,12,0);boss.portAngle=0;
  const renderer={sim:s,navigationEntity:{type:'boss',id:boss.id}};GameRenderer.prototype.navigationLocal.call(renderer);
  const index=renderer.navigationEntity.portIndex;boss.x=index===1?-2:2;GameRenderer.prototype.navigationLocal.call(renderer);assert.equal(renderer.navigationEntity.portIndex,index);
  boss.ports[index]=0;GameRenderer.prototype.navigationLocal.call(renderer);assert.notEqual(renderer.navigationEntity.portIndex,index);
});
test('breaking a boss lock invalidates hostile shots even during the current bullet iteration',()=>{
  const s=arena(),boss=s.spawnEnemy('boss',0,6,0);boss.portAngle=0;s.shoot(0,1,0,{enemy:true});const oldIteration=s.bullets;
  s.damageEnemy(boss,999,false,bossPorts(boss)[0]);assert.equal(oldIteration[0].life,0);assert.equal(s.bullets,oldIteration);
});
test('boss approaches adjust to a short weapon instead of stopping beyond contact range',()=>{
  for(const weapon of[0,1,8]){
    const s=arena();s.player.weapon=weapon;const boss=s.spawnEnemy('boss',0,12,0),renderer={sim:s,navigationEntity:{type:'boss',id:boss.id}};
    const goal=GameRenderer.prototype.navigationLocal.call(renderer),d=Math.hypot(goal.x-boss.x,goal.z-boss.z);
    assert.ok(d>boss.radius+.6);assert.ok(d+goal.approach<WEAPONS[weapon].reach+boss.radius);
  }
});
