import { Simulation } from './simulation.js';
import { GameRenderer } from './renderer.js';
import { Input, GameplayInputBuffer } from './input.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';
import { CONFIG, WEAPONS } from './config.js';
import { Surface } from './surface.js';
import { installLayout } from './layout.js';

const canvas = document.getElementById('game');
const sim = new Simulation();
sim.curvedWorld = true;
sim.createObstacles();
sim.enemies=sim.enemies.filter(e=>e.type!=='anchor');
const input = new Input(canvas);
const gameplayInput = new GameplayInputBuffer();
input.onClear=()=>gameplayInput.clear();
const audio = new AudioEngine();
let renderer, hud;

async function loadFonts() {
  try {
    const base = new URL('../public/', import.meta.url).href;
    const fonts = [new FontFace('Barlow Condensed', `url(${base}fonts/barlow-heavy.ttf)`, { weight: '900' }), new FontFace('Space Grotesk', `url(${base}fonts/space-grotesk.ttf)`, { weight: '100 900' })];
    await Promise.race([Promise.all(fonts.map(async f => { await f.load(); document.fonts.add(f); })), new Promise(resolve => setTimeout(resolve, 2000))]);
  } catch { /* The canvas font fallback keeps offline boot playable. */ }
}

function save() {
  try { localStorage.setItem('geometry-glitch-v1', JSON.stringify({ best: Math.max(sim.highScore, sim.score), muted: audio.muted, music: audio.music, reduced: sim.reduced, drone:sim.supportChoice })); } catch { /* Private-browsing storage can be unavailable. */ }
}
function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
function start() { audio.unlock(); sim.start(); renderer.surface = new Surface();renderer.navigationTarget=null;renderer.navigationEntity=null;renderer.pulseSerial=0;renderer.cameraRig.reset();renderer.mapCache.clear(); hud.settingsOpen = false; input.clear(); canvas.focus({ preventScroll: true }); }
function openSettings() {
  hud.settingsOpen = true; hud.menuRow = 0;
  if (sim.mode === 'playing') sim.setPause();
}
function closeSettings() { hud.settingsOpen = false; if (sim.mode === 'paused') sim.setPause(); save(); }
function setting(i) {
  if (i === 0) audio.setMute();
  if (i === 1) audio.music = !audio.music;
  if (i === 2) sim.reduced = !sim.reduced;
  if (i === 3) fullscreen();
  if (i === 4) sim.selectSupport(sim.supportChoice+1);
  save();
}
function action(id) {
  if (id === 'mute') { audio.unlock(); audio.setMute(); save(); }
  else if (id === 'settings') openSettings();
  else if (id === 'closeSettings') closeSettings();
  else if (id === 'start' || id === 'restart') { save(); start(); }
  else if (id === 'pause' || id === 'touchPause' || id === 'resume') sim.setPause();
  else if (id === 'dash') input.pressed.add('Dash');
  else if (id === 'strike') input.pressed.add('Strike');
  else if (id === 'burst') input.pressed.add('Burst');
  else if(id?.startsWith('navigate')&&sim.mode==='playing'){
    renderer.navigationTarget=null;input.mouse.active=false;
    renderer.navigationEntity=id==='navigateSafe'?{type:'zone'}:id.startsWith('navigateWeapon')?{type:'weapon',id:Number(id.slice(14))}:id.startsWith('navigateGate')?{type:'gate',id:Number(id.slice(12))}:{type:'boss',id:Number(id.slice(12))};
  }
  else if (id?.startsWith('weapon')) sim.equipWeapon(Number(id.slice(-1)));
  else if (id?.startsWith('drone')) {sim.selectSupport(Number(id.slice(-1)));save();}
  else if (id?.startsWith('upgrade')) sim.chooseUpgrade(Number(id.slice(-1)));
  else if (id?.startsWith('setting')) setting(Number(id.slice(-1)));
  else if (id?.startsWith('tune')) { hud.tuningRow = Number(id.slice(4)); hud.adjustTuning(1); }
}

async function boot() {
  await loadFonts();
  try { renderer = new GameRenderer(canvas, sim); }
  catch (error) {
    throw new Error(`Graphics initialization failed: ${error.message}. Check that WebGL and hardware acceleration are enabled.`, { cause: error });
  }
  hud = new HUD(sim, renderer, input, audio);
  sim.movementResolver=(x,z)=>renderer.surface.resolveMotion(x,z);
  sim.enemyMotionResolver=(e,dx,dz)=>renderer.surface.resolveActorMotion(e.x,e.z,dx,dz);
  sim.shotMotionResolver=(b,dx,dz)=>renderer.surface.terrainFraction(b.px,b.pz,dx,dz);
  try {
    const saved = JSON.parse(localStorage.getItem('geometry-glitch-v1') || localStorage.getItem('vector-shift-v1') || localStorage.getItem('inkferno-v1') || '{}');
    sim.highScore = saved.best || 0; sim.reduced = saved.reduced || false;
    audio.muted = saved.muted || false; audio.music = saved.music !== false;
    sim.selectSupport(saved.drone||0);
  } catch { /* New save. */ }
  input.touch = window.matchMedia('(any-pointer: coarse)').matches;
  installLayout(canvas,input,()=>renderer.resize());
  input.onTouchButton = (x, y) => {
    const id = hud.hit(x, y);
    if (id && id !== 'start' && !id.startsWith('navigate')) { action(id); return id; }
    return false;
  };
  document.getElementById('boot').remove();
  window.addEventListener('blur', () => { if (sim.mode === 'playing') sim.setPause(); save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && sim.mode === 'playing') sim.setPause(); });
  window.addEventListener('pagehide', save);
  let last = performance.now(), accumulator = 0, frames = 0, fpsClock = 0;
  const frameTimes=[];let frameManualAim=false,logicMs=0,prepareMs=0,drawMs=0;
  const handleMenus = () => {
    if(sim.mode==='attract'&&!hud.settingsOpen){
      if(input.just('ArrowLeft')||input.just('KeyA'))sim.selectSupport(sim.supportChoice-1);
      if(input.just('ArrowRight')||input.just('KeyD'))sim.selectSupport(sim.supportChoice+1);
    }
    if (input.just('KeyM')) { audio.setMute(); save(); }
    if (input.just('KeyF')) fullscreen();
    if (input.just('Backquote')) hud.tuningOpen = !hud.tuningOpen;
    if (input.just('F2')) hud.debug = !hud.debug;
    if (input.just('F6')) sim.god = !sim.god;
    if (input.just('F7')) sim.spawnFractureEncounter();
    if (input.just('F8')) { sim.nextLevel(); }
    if (input.just('Escape') || input.just('KeyP')) {
      if (hud.settingsOpen) closeSettings(); else sim.setPause();
    }
    if (input.just('KeyR') && ['dead', 'victory', 'paused'].includes(sim.mode)) start();
    if (hud.tuningOpen) {
      if (input.just('ArrowDown')) hud.tuningRow = (hud.tuningRow + 1) % 12;
      if (input.just('ArrowUp')) hud.tuningRow = (hud.tuningRow + 11) % 12;
      if (input.just('ArrowLeft')) hud.adjustTuning(-1);
      if (input.just('ArrowRight')) hud.adjustTuning(1);
      if (input.just('KeyC')) navigator.clipboard?.writeText(JSON.stringify(CONFIG, null, 2)).catch(() => {});
    } else if (hud.settingsOpen || sim.mode === 'paused' || sim.mode === 'upgrade') {
      const len = hud.settingsOpen ? 5 : 3;
      if (input.just('ArrowDown') || input.just('KeyS') || input.just('ArrowRight') || input.just('KeyD')) hud.menuRow = (hud.menuRow + 1) % len;
      if (input.just('ArrowUp') || input.just('KeyW') || input.just('ArrowLeft') || input.just('KeyA')) hud.menuRow = (hud.menuRow + len - 1) % len;
      if (sim.mode === 'upgrade') for (let i = 0; i < 3; i++) if (input.just(`Digit${i + 1}`)) sim.chooseUpgrade(i);
      if (input.just('Enter') || input.just('Space')) {
        if (hud.settingsOpen) setting(hud.menuRow);
        else if (sim.mode === 'upgrade') sim.chooseUpgrade(hud.menuRow);
        else action(['resume', 'settings', 'restart'][hud.menuRow]);
      }
    } else if (['attract', 'dead', 'victory'].includes(sim.mode) && (input.just('Enter') || input.just('Space'))) start();
    for (const tap of input.actions) {
      audio.unlock();
      const id = hud.hit(tap.x, tap.y);
      if (id) action(id);
      else if(tap.type==='navigate'&&sim.mode==='playing'){
        const destination=renderer.navigationPoint(tap.x,tap.y);
        if(destination){renderer.navigationEntity=null;renderer.navigationTarget=destination;input.mouse.active=false;}
      }
      else if (sim.mode === 'attract' && !hud.settingsOpen) start();
      else if (sim.mode === 'dead' || sim.mode === 'victory') start();
    }
  };
  renderer.engine.runRenderLoop(() => {
    const now = performance.now(), elapsed=now-last, dt = Math.min(elapsed / 1000, 0.08); last = now;
    frameTimes.push(elapsed);if(frameTimes.length>120)frameTimes.shift();
    frames++; fpsClock += dt;
    if (fpsClock >= 0.5) {
      Object.assign(canvas.dataset,{fractureStages:sim.enemies.filter(e=>e.type==='fracture'&&!e.dead).map(e=>e.fractureStage).join(','),fracturesCleared:String(sim.fracturesCleared),cascades:String(sim.cascades)});
      hud.fps = frames / fpsClock;renderer.adaptResolution(hud.fps); frames = 0; fpsClock = 0;
      Object.assign(canvas.dataset, { rifts:String(sim.rifts.length),riftsCleared:String(sim.riftsCleared),touch:String(input.touch),safeArea:JSON.stringify(input.layout?.safe),logicMs:logicMs.toFixed(1),prepareMs:prepareMs.toFixed(1),drawMs:drawMs.toFixed(1),mode: sim.mode, time:sim.time.toFixed(1), level: String(sim.level.number), hp: String(sim.player.hp), score: String(sim.score), enemies: String(sim.enemies.length), shots: String(sim.bullets.length), fps: hud.fps.toFixed(1),frameP95:[...frameTimes].sort((a,b)=>a-b)[Math.floor((frameTimes.length-1)*.95)].toFixed(1), x: sim.player.x.toFixed(2), z: sim.player.z.toFixed(2), drone:sim.supports[0].type,droneCount:String(sim.supports.length),credits:String(sim.credits),obstacles:String(sim.obstacles.filter(o=>!o.broken).length),weapon:String(sim.player.weapon),musicSection:audio.section||'intro',audioVoices:String(audio.fxVoices),bossPorts:String(sim.enemies.filter(e=>e.type==='boss'&&!e.dead).reduce((sum,e)=>sum+e.ports.filter(hp=>hp>0).length,0)),fireMode:WEAPONS[sim.player.weapon].autoTarget?'auto-target':WEAPONS[sim.player.weapon].homing?'forward-homing':'forward',fireHeading:(sim.player.aim*180/Math.PI).toFixed(1),ownedWeapons:sim.player.ownedWeapons.join(','),weaponDrops:String(sim.weaponDrops.length),ammo:String(sim.player.ammo[sim.player.weapon]??''),exit:sim.exitZone?'open':'closed',terrainPulse:String(sim.terrainPulse),worldScale:renderer.surface.worldScale.toFixed(2),geometry:'native',autoFire:'true',dashCooldown:sim.player.dashCD.toFixed(2),debugInvulnerable:String(!!sim.god),damageTaken:String(sim.damageTaken),waveHeld:String(sim.waveHeld),manualAim:String(frameManualAim),heading:(sim.player.angle*180/Math.PI).toFixed(0),speed:Math.hypot(sim.player.vx,sim.player.vz).toFixed(1),travel:renderer.surface.travel.toFixed(1),destination:renderer.navigationEntity?renderer.navigationEntity.type:renderer.navigationTarget?'active':'none',cameraDistance:renderer.surface.distance(renderer.camera.position).toFixed(1),cameraStep:renderer.cameraRig.step.toFixed(3),cameraAngle:(renderer.cameraRig.angleError*180/Math.PI).toFixed(1),cameraRadius:renderer.cameraRig.radius.toFixed(2),anchorError:renderer.surface.distance(renderer.surface.anchor).toFixed(3),overdrive:sim.player.overdrive.toFixed(1),charge:String(sim.player.charge),sisters:String(sim.sisters.length),waves:String(sim.waveCount),wavesCleared:String(sim.wavesCleared),reactorChain:String(sim.bestReactorChain),wavePattern:sim.lastWave?.pattern||'',waveSize:String(sim.lastWave?.count??0),terrainBlocked:String(renderer.surface.blocked),warpCooldown:sim.player.warpCD.toFixed(1),targets:JSON.stringify(hud.hitAreas.filter(a=>a.id.startsWith('navigate')).map(a=>({id:a.id,x:a.x+a.w/2,y:a.y+a.h/2}))),resolutionScale:renderer.engine.getHardwareScalingLevel().toFixed(2),pillars:String(sim.enemies.filter(e=>e.type==='pillar'&&!e.dead).length),enemyKinds:[...new Set(sim.enemies.map(e=>e.type))].join(','),reactors:String(sim.enemies.filter(e=>e.type==='anchor'&&!e.dead).length) });
    }
    const world = input.mouse.active && !input.touch ? renderer.worldPoint(input.mouse.x, input.mouse.y) : null;
    input.menu = hud.settingsOpen || ['paused', 'upgrade'].includes(sim.mode);
    const frame = input.getFrame(world);
    if(frame.aimAngle!==undefined)frame.aimAngle=renderer.surfaceAimAngle(frame.aimAngle);
    const moveLength=Math.hypot(frame.moveX,frame.moveZ);
    if(moveLength>.01){const a=renderer.surfaceAimAngle(Math.atan2(frame.moveX,frame.moveZ));frame.moveX=Math.sin(a)*moveLength;frame.moveZ=Math.cos(a)*moveLength;}
    if(sim.mode==='attract'&&frame.weapon<0){sim.selectSupport(sim.supportChoice+(frame.weapon===-1?-1:1));frame.weapon=undefined;}
    const modeBeforeMenus=sim.mode;handleMenus();
    if(modeBeforeMenus!=='playing'&&sim.mode==='playing'){frame.dash=false;frame.burst=false;frame.weapon=undefined;}
    if(Math.hypot(frame.moveX,frame.moveZ)>.1){renderer.navigationTarget=null;renderer.navigationEntity=null;}
    else if((renderer.navigationTarget||renderer.navigationEntity)&&sim.mode==='playing'){
      const goal=renderer.navigationLocal(),d=goal?Math.hypot(goal.x,goal.z):0;
      const bossTarget=renderer.navigationEntity?.type==='boss';
      const attackDistance=goal?.approach??(bossTarget?Math.min(6.5,Math.max(2.8,(WEAPONS[sim.player.weapon].reach||5)*.75+(goal?.radius||0)*.6)):0);
      if(!goal||(!bossTarget&&d<.75)){renderer.navigationTarget=null;renderer.navigationEntity=null;}
      else{const steering=bossTarget&&d<attackDistance?{x:0,z:0}:renderer.navigationSteering(goal);frame.moveX=steering.x;frame.moveZ=steering.z;if(!frame.manualAim){frame.aimX=bossTarget?(goal.aimX??goal.x):undefined;frame.aimZ=bossTarget?(goal.aimZ??goal.z):undefined;frame.aimAngle=undefined;frame.manualAim=bossTarget;}frame.assist=true;}
    }
    sim.targetWeaponId=renderer.navigationEntity?.type==='weapon'?renderer.navigationEntity.id:null;
    frameManualAim=!!frame.manualAim;
    frame.dash ||= input.just('Dash'); frame.burst ||= input.just('Burst');
    if (frame.weapon < 0) {sim.cycleWeapon(frame.weapon===-1?-1:1);frame.weapon=undefined;}
    if (hud.tuningOpen) { frame.moveX = 0; frame.moveZ = 0; }
    gameplayInput.capture(frame,sim.mode==='playing'&&modeBeforeMenus==='playing');
    accumulator += dt;
    while (accumulator >= CONFIG.step) {
      sim.update(CONFIG.step, gameplayInput.consume(frame));
      if(sim.events.some(e=>e.type==='warp')){renderer.navigationTarget=null;renderer.navigationEntity=null;}
      if (['playing','attract'].includes(sim.mode)) {
        const { dx, dz } = sim.recenter(); renderer.surface.advance(dx, dz);
      }
      accumulator -= CONFIG.step;
    }
    if (sim.mode !== 'attract') {
      for (const event of sim.events) audio.event(event);
      if (sim.events.some(e => ['death', 'shift', 'bossKill'].includes(e.type))) save();
    }
    sim.events.length = 0;
    audio.update(sim);
    const renderStart=performance.now();logicMs+=(renderStart-now-logicMs)*.1;
    renderer.update(dt);
    const drawStart=performance.now();prepareMs+=(drawStart-renderStart-prepareMs)*.1;
    renderer.render(hud);
    drawMs+=(performance.now()-drawStart-drawMs)*.1;
    input.endFrame();
  });
  // A read-only snapshot makes automated smoke checks possible without UI hooks.
  window.__GEOMETRYGLITCH__ = { snapshot: () => ({ mode: sim.mode, level: sim.level.number, hp: sim.player.hp, score: sim.score, enemies: sim.enemies.length, shots: sim.bullets.length, fps: hud.fps, width: renderer.width, height: renderer.height, player: { x: sim.player.x, z: sim.player.z }, engine: 'Babylon.js', supports: sim.supports.map(s => s.type), gates: 50 }) };
}
export const ready = boot();
