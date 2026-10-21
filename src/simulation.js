import { CONFIG, COLORS, WEAPONS, UPGRADES, DRONES } from './config.js';
import { LEVELS, BOSS_NAMES } from './levels.js';
import { TAU, clamp, damp, lerp, distance, rng, arenaRadiusAt, clampToArena, segmentCircle, SpatialGrid, ribbonPoint } from './math.js';

const TYPES = {
  diamond: { hp: 2.4, speed: 1.35, radius: 0.5, value: 90, color: COLORS.orange },
  cube: { hp: 4.5, speed: 0.85, radius: 0.75, value: 140, color: COLORS.pink },
  spinner: { hp: 3, speed: 1.5, radius: 0.55, value: 120, color: COLORS.gold },
  mote: { hp: .9, speed: 1.75, radius: .24, value: 35, color: '#57bfff' },
  dart: { hp: 12, speed: 1.05, radius: 0.65, value: 180, color: COLORS.orange },
  prism: { hp: 7, speed: 0.8, radius: 0.66, value: 220, color: COLORS.violet },
  splitter: { hp: 36, speed: .68, radius: 1.55, value: 500, color: COLORS.pink },
  guard: { hp: 28, speed: 0.7, radius: 1, value: 360, color: COLORS.violet },
  anchor: { hp: 7, speed: 0, radius: 1.45, value: 70, color: COLORS.gold },
  boss: { hp: 170, speed: 0.35, radius: 2.8, value: 6000, color: COLORS.orange },
  pillar: { hp: 160, speed: 0, radius: 2.3, value: 3000, color: '#74ffd5' },
};

export class Simulation {
  constructor(seed = 619) {
    this.seed = seed;
    this.rand = rng(seed);
    this.id = 0;
    this.grid = new SpatialGrid(4);
    this.highScore = 0;
    this.supportChoice = 0;
    this.reduced = false;
    this.reset('attract');
  }
  reset(mode = 'playing') {
    this.mode = mode; this.previousMode = mode;
    this.enemies = []; this.bullets = []; this.particles = [];this.sisters=[];
    this.pickups = []; this.rings = []; this.bolts = []; this.events = [];
    this.attacks=[];this.stains=[];this.hitstop=0;this.weaponDrops=[];this.weaponClock=8;this.weaponNotice=null;this.terrainPulse=0;
    this.time = 0; this.musicBeat = 0; this.worldTime = 0; this.levelTime = 0; this.levelIndex = 0;
    this.level = LEVELS[0]; this.score = 0; this.kills = 0;
    this.exitZone=null;this.levelKills=0;this.reactorClock=16;this.dashHits=new Set();this.waveCount=0;this.lastWave=null;this.pillarEncounter=false;this.pillarsSpawned=false;
    this.combo = 1; this.comboTime = 0; this.souls = 0; this.credits = 0;
    this.trauma = 0; this.flash = 0; this.spawnClock = 4.8;
    this.bossSpawned = false; this.bossDefeated = false;
    this.banner = 4; this.shiftWarning = false; this.upgradeChoices = [];
    this.upgrades = { petals: 0, orbit: 0, lightning: 0, haste: 0, heart: 0, magnet: 0 };
    this.arena = { from: 8, to: 8, mix: 1, rotation: 0, targetRotation: 0 };
    this.player = {
      x: 0, z: -3, px: 0, pz: -3, vx: 0, vz: 0, angle: 0, aim: 0,
      hp: 5, maxHp: 5, invuln: 3, dash: 0, dashCD: 0, burstCD: 0,
      shotCD: 0, weapon: 0, lastWeapon:0, sisterCD:0, warpCD:0, ownedWeapons: [0], ammo: {}, orbit: 0, tail: [], comboStep:0, comboWindow:0, attackTime:0, charge:0, overdrive:0,
    };
    this.selectSupport(this.supportChoice);
    this.createObstacles();
    this.createGates();
    this.spawnWeapon(1,-14,9);this.spawnWeapon(3,14,14);this.spawnWeapon(2,8,-18);this.spawnWeapon(7,-17,-17);this.spawnWeapon(8,0,34);
    for (let i = 0; i < (this.curvedWorld?0:8); i++) {
      const angle = this.rand() * TAU, r = 10 + this.rand() * 14;
      this.spawnEnemy('anchor', Math.cos(angle) * r, Math.sin(angle) * r * CONFIG.arenaScaleZ, 0.4);
    }
    if (mode === 'attract') {
      for (let i = 0; i < 48; i++) this.spawnEnemy(['diamond', 'cube', 'spinner', 'prism', 'dart'][i % 5], undefined, undefined, this.rand() * .5);
      this.player.invuln = 999;
    } else {
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12,r=14+this.rand()*8;
        this.spawnEnemy(['diamond','diamond','cube','spinner'][i%4],Math.cos(a)*r,Math.sin(a)*r,1.1);
      }
    }
  }
  start() { this.rand = rng(Date.now() & 0xfffffff); this.reset('playing'); this.emit('start'); }
  createGates(){this.gates=[{id:++this.id,x:-18,z:0,color:'#74caff',placed:false},{id:++this.id,x:18,z:0,color:'#b895ff',placed:false}];}
  selectSupport(index) {
    this.supportChoice = ((index % DRONES.length) + DRONES.length) % DRONES.length;
    const d = DRONES[this.supportChoice];
    this.supports = [{ type: d.id, name: d.name, x: -2, z: -3, angle: 0, cd: 0.4, color: d.color }];
  }
  spawnWeapon(weapon,x,z) {
    if(this.weaponDrops.length>=6)return false;
    if(this.weaponDrops.some(d=>Math.hypot(d.x-x,d.z-z)<20))return false;
    this.weaponDrops.push({id:++this.id,weapon,x,z,age:0});
    return true;
  }
  equipWeapon(index) {
    if(!this.player.ownedWeapons.includes(index))return false;
    if(WEAPONS[index].summon&&(this.player.sisterCD>0||this.sisters.length))return false;
    if(WEAPONS[index].ranged&&!(this.player.ammo[index]>0))return false;
    this.player.weapon=index;if(!WEAPONS[index].summon)this.player.lastWeapon=index;this.player.shotCD=Math.min(this.player.shotCD,.12);return true;
  }
  cycleWeapon(direction) {
    const p=this.player,list=p.ownedWeapons.filter(i=>(!WEAPONS[i].ranged||p.ammo[i]>0)&&(!WEAPONS[i].summon||(p.sisterCD<=0&&!this.sisters.length)));
    this.equipWeapon(list[(list.indexOf(p.weapon)+direction+list.length)%list.length]);
  }
  updateWeaponDrops(dt) {
    const p=this.player;
    for(const drop of this.weaponDrops){
      drop.age+=dt;
      // Weapons stay on the ground. Only the player can take them; companions
      // continue gathering currency without stealing or magnetizing equipment.
      if(distance(drop,p)<1.35){
        const w=WEAPONS[drop.weapon];
        if(!p.ownedWeapons.includes(drop.weapon))p.ownedWeapons.push(drop.weapon);
        if(w.ranged)p.ammo[drop.weapon]=w.ammo;
        this.equipWeapon(drop.weapon);drop.collected=true;
        this.weaponNotice={weapon:drop.weapon,life:2.4};
        this.ring(drop.x,drop.z,w.color,2.3,.3);this.spark(drop.x,drop.z,w.color,15,.6);
        this.emit('weaponPickup',{weapon:drop.weapon});
      }
    }
    this.weaponDrops=this.weaponDrops.filter(d=>!d.collected&&d.age<90&&distance(d,p)<60);
    this.weaponClock-=dt;
    if(!this.weaponDrops.length)this.weaponClock=Math.min(this.weaponClock,1.5);
    if(this.weaponClock<=0){
      this.weaponClock=9+this.rand()*5;
      const missing=WEAPONS.map((_,i)=>i).filter(i=>i>0&&!p.ownedWeapons.includes(i)&&!this.weaponDrops.some(d=>d.weapon===i));
      const weapon=missing.length?missing[Math.floor(this.rand()*missing.length)]:1+Math.floor(this.rand()*(WEAPONS.length-1));
      let placed=false;
      for(let i=0;i<12&&!placed;i++){const a=p.angle+(this.rand()-.5)*2.4,r=22+this.rand()*10;placed=this.spawnWeapon(weapon,p.x+Math.sin(a)*r,p.z+Math.cos(a)*r);}
      if(!placed&&this.weaponDrops.length<6)this.weaponClock=1.5;
    }
  }
  createObstacles() {
    this.obstacles = [];
    // Curved worlds contain their own ridges, shelves and passages in the shared
    // implicit terrain field. No detached props or invisible flat-plane walls.
    if(this.curvedWorld)return;
    const count = Math.min(8, 3 + this.level.chapter);
    for (let i=0;i<count;i++) {
      const a = i * TAU / count + this.level.number * 0.37, r = 11 + (i % 2) * 6;
      // Paired walls leave a visible passage; alternate blocks can be shattered.
      for (const side of [-1,1]) {
        const angle = a + Math.PI / 2, offset = side * 4.2;
        this.obstacles.push({ id: ++this.id, x: Math.cos(a)*r+Math.sin(angle)*offset, z: Math.sin(a)*r+Math.cos(angle)*offset, angle, length: 5.5, radius: .55, height: 1.6+(i%3)*.6, hp: i%2?8:Infinity, maxHp:i%2?8:Infinity, warmup:1.8, broken:false });
      }
    }
  }
  obstacleContact(entity, obstacle, radius) {
    const sx=Math.sin(obstacle.angle)*obstacle.length/2, sz=Math.cos(obstacle.angle)*obstacle.length/2;
    const ax=obstacle.x-sx,az=obstacle.z-sz,dx=sx*2,dz=sz*2;
    const f=clamp(((entity.x-ax)*dx+(entity.z-az)*dz)/(dx*dx+dz*dz),0,1);
    const qx=ax+f*dx,qz=az+f*dz,ex=entity.x-qx,ez=entity.z-qz,d=Math.hypot(ex,ez);
    const minimum=radius+obstacle.radius;
    return d<minimum ? {x:qx,z:qz,nx:d>.001?ex/d:Math.cos(obstacle.angle),nz:d>.001?ez/d:-Math.sin(obstacle.angle),depth:minimum-d} : null;
  }
  damageObstacle(o, damage) {
    if(o.broken||!Number.isFinite(o.hp))return;
    o.hp-=damage;
    if(o.hp<=0){
      o.broken=true;this.spark(o.x,o.z,COLORS.violet,38,1.3);this.ring(o.x,o.z,COLORS.violet,4,.5);this.emit('shatter',{x:o.x,size:1.5});this.trauma=Math.max(this.trauma,.3);
      for(let i=0;i<6;i++)this.pickups.push({id:++this.id,x:o.x+(this.rand()-.5)*3,z:o.z+(this.rand()-.5)*3,vx:(this.rand()-.5)*8,vz:(this.rand()-.5)*8,age:0,type:'energy'});
    }
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  setPause() {
    if (this.mode === 'playing') { this.mode = 'paused'; this.emit('pause'); }
    else if (this.mode === 'paused') { this.mode = 'playing'; this.emit('resume'); }
  }
  spawnEnemy(type, x, z, warmup = 0.8) {
    if(type==='splitter'&&this.level.number<16)type='cube';
    if (this.enemies.length >= CONFIG.maxEnemies && type !== 'boss') return null;
    const proto = TYPES[type];
    const a = this.rand() * TAU;
    const r = arenaRadiusAt(a, this.arena, CONFIG.arenaRadius) - 2;
    const e = {
      ...proto, id: ++this.id, type, x: x ?? Math.cos(a) * r,
      z: z ?? Math.sin(a) * r * CONFIG.arenaScaleZ,
      vx: 0, vz: 0, angle: this.rand() * TAU, age: 0, warmup,
      hit: 0, cd: 1 + this.rand() * 2, phase: this.rand() * TAU,
      state: 'chase', windup: 0, aimX: 0, aimZ: 0,
      orbCD: 0, dead: false, size: .75+this.rand()*.5, stride: this.rand()*10, stagger: 0,
      maneuverClock:.6+this.rand()*1.4,sidestep:0,swerve:0,surge:1,roamAngle:a,packId:null,packPhase:0,
    };
    e.hp *= 1 + this.level.chapter * 0.16;
    if((this.time>25||this.level.number>2)&&['cube','dart','prism','guard'].includes(type)&&this.rand()<.16){e.elite=true;e.size*=1.65;e.radius*=1.5;e.hp*=5;e.speed*=.76;}
    if(type==='splitter'){e.size=1.55;e.splitDepth=0;}
    if(type==='mote')e.size*=.48;
    if(type==='pillar'){e.hp=160+this.level.chapter*35;e.size=1;e.landed=false;}
    if (type === 'boss') {
      e.hp = 180 + this.level.chapter * 85;e.shielded=false;
      e.radius = 2.8 + this.level.chapter * 0.06;
      e.name = BOSS_NAMES[this.level.chapter%BOSS_NAMES.length];
    }
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }
  shoot(x, z, angle, options = {}) {
    if (this.bullets.length >= CONFIG.maxBullets) return;
    const speed = options.speed ?? CONFIG.bulletSpeed;
    this.bullets.push({
      id: ++this.id, x, z, px: x, pz: z,
      vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed,
      angle, life: options.life ?? 1.35, damage: options.damage ?? 1,
      color: options.color ?? COLORS.jade, enemy: options.enemy ?? false,
      radius: options.radius ?? 0.18, pierce: options.pierce ?? 0,
      weapon: options.weapon ?? 0, hitIds: new Set(), ...options,
    });
  }
  spark(x, z, color, count = 14, power = 1, y = 0.6) {
    count = Math.floor(count * (this.reduced ? 0.45 : 1));
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= CONFIG.maxParticles) break;
      const a = this.rand() * TAU, speed = (2 + this.rand() * 12) * power;
      const life = 0.25 + this.rand() * 0.55;
      this.particles.push({ x, z, y, vx: Math.cos(a) * speed, vz: Math.sin(a) * speed, vy: 2 + this.rand() * 7 * power, life, maxLife: life, size: 0.035 + this.rand() * 0.11, color, spin: this.rand() * TAU });
    }
  }
  ring(x, z, color, radius = 4, duration = 0.5) {
    this.rings.push({ x, z, color, radius, life: duration, maxLife: duration });
  }
  burst() {
    const p = this.player;
    if (p.burstCD > 0) return;
    p.burstCD = CONFIG.burstCooldown; p.invuln = Math.max(p.invuln, 0.35);
    const radius = CONFIG.burstRadius + this.upgrades.heart * .8;
    this.terrainPulse++;
    this.ring(p.x,p.z,COLORS.jade,32,1.65);this.ring(p.x,p.z,COLORS.white,18,.8);
    this.spark(p.x, p.z, COLORS.jade, 100, 1.8);
    this.trauma = 0.85; this.flash = 0.16;
    const bladeCount = p.orbit;
    for(const o of this.obstacles)if(!o.broken&&Math.hypot(o.x-p.x,o.z-p.z)<radius)this.damageObstacle(o,30);
    for (const e of this.enemies) {
      const d = distance(e, p);
      if (d < radius) {
        this.damageEnemy(e, (1 - d / (radius + 5)) * (12 + bladeCount * .5), true);
        const force = 20 / Math.max(d, 1);
        e.vx += (e.x - p.x) * force; e.vz += (e.z - p.z) * force;
      }
    }
    for (const b of this.bullets) if (b.enemy && distance(b, p) < radius * 1.2) b.life = 0;
    this.attacks.push({x:p.x,z:p.z,angle:p.aim,reach:radius,arc:TAU,color:COLORS.jade,life:.65,maxLife:.65,heavy:true,weapon:2});
    p.attackTime=.4;
    this.emit('burst');
  }
  melee() {
    const p=this.player,w=WEAPONS[p.weapon],power=p.overdrive>0?CONFIG.overdrivePower:1,rate=p.overdrive>0?CONFIG.overdriveRate:1;
    if(p.shotCD>0)return;
    if(w.summon){
      if(!(p.ammo[p.weapon]>0)){this.equipWeapon(0);return;}
      if(this.sisters.length||p.sisterCD>0){if(!this.equipWeapon(p.lastWeapon))this.equipWeapon(0);return;}
      for(const side of[-1,1])this.sisters.push({id:++this.id,side,x:p.x+Math.cos(p.angle)*side*2,z:p.z-Math.sin(p.angle)*side*2,angle:p.angle,life:w.duration,cd:side===-1?.08:.22,damage:w.damage*power,color:side===-1?'#80d6ff':'#c5a0ff'});
      p.ammo[p.weapon]--;p.sisterCD=w.cooldown;p.attackTime=.3;
      this.ring(p.x,p.z,w.color,4,.5);this.spark(p.x,p.z,w.color,25,.8);this.emit('sisterDeploy');
      if(!this.equipWeapon(p.lastWeapon))this.equipWeapon(0);
      return;
    }
    if(w.ribbon){
      p.shotCD=CONFIG.fireInterval*w.interval/rate;p.attackTime=.28;
      this.attacks.push({x:p.x,z:p.z,angle:p.aim,reach:w.reach,arc:w.arc,color:w.color,life:.28,maxLife:.28,weapon:p.weapon,ribbon:true,hitIds:new Set()});this.emit('swing',{weapon:p.weapon});
      return;
    }
    if(w.ranged){
      if(!(p.ammo[p.weapon]>0)){this.equipWeapon(0);return;}
      p.shotCD=CONFIG.fireInterval*w.interval/(1+this.upgrades.haste*.09)/rate;p.attackTime=.15;
      const group=++this.id;
      for(let i=0;i<w.count;i++)this.shoot(p.x+Math.sin(p.aim)*.8,p.z+Math.cos(p.aim)*.8,p.aim+(i-(w.count-1)/2)*w.spread,{weapon:p.weapon,damage:w.damage*power*(1+this.upgrades.petals*.08),speed:w.speed,pierce:w.pierce,life:w.reach/w.speed,color:w.color,radius:(p.weapon===6?.75:p.weapon===4?.4:.3)*power,strokeGroup:group,wavePhase:group,owner:'player',homing:w.homing||0,explosionRadius:(w.explosionRadius||0)*power,amplified:p.overdrive>0});
      p.ammo[p.weapon]--;this.emit('shoot',{weapon:p.weapon});
      if(p.ammo[p.weapon]===0)this.equipWeapon(0);
      return;
    }
    p.comboStep=p.comboWindow>0?(p.comboStep+1)%3:0;p.comboWindow=1.2;
    const finisher=p.comboStep===2;
    p.shotCD=CONFIG.fireInterval*w.interval/(1+this.upgrades.haste*.09)/rate*(finisher?1.15:1);
    p.attackTime=p.shotCD;
    const reach=(w.reach+this.upgrades.petals*.25+(finisher?.3:0))*power,arc=w.arc+(finisher?.35:0);
    this.attacks.push({x:p.x,z:p.z,angle:p.aim,reach,arc,color:w.color,life:p.weapon===1?.38:.3,maxLife:p.weapon===1?.38:.3,heavy:finisher,weapon:p.weapon});
    if(w.hybrid){
      const group=++this.id;
      for(const side of [-1,0,1])this.shoot(p.x+Math.sin(p.aim)*.7,p.z+Math.cos(p.aim)*.7,p.aim+side*.085,{owner:'player',weapon:0,damage:1.1*power,speed:44,life:.24,pierce:0,radius:.32*power,color:w.color,strokeGroup:group,wavePhase:group,amplified:p.overdrive>0});
    }
    let hits=0;
    for(const e of this.enemies){
      if(e.dead||e.warmup>0)continue;
      const d=distance(e,p),angle=Math.atan2(e.x-p.x,e.z-p.z),delta=Math.abs(Math.atan2(Math.sin(angle-p.aim),Math.cos(angle-p.aim)));
      if(d<reach+e.radius&&delta<arc*.5){
        this.damageEnemy(e,w.damage*power*(finisher?1.3:1)*(1+this.level.chapter*.04+this.upgrades.petals*.08));
        const n=Math.max(.1,d),force=w.knockback*(finisher?1.2:1);
        e.vx+=(e.x-p.x)/n*force;e.vz+=(e.z-p.z)/n*force;
        this.spark(e.x,e.z,w.color,16,1.2);hits++;
      }
    }
    if(hits){this.hitstop=finisher?.025:.012;this.trauma=Math.max(this.trauma,finisher?.4:.18);this.emit('meleeHit',{size:finisher?1.8:1,hits});}
    this.emit('swing',{weapon:p.weapon,heavy:finisher});
  }
  damagePlayer(x, z) {
    const p = this.player;
    if (p.invuln > 0 || p.dash > 0 || this.god) return;
    p.hp--; p.invuln = CONFIG.invulnerability;
    this.combo = Math.max(1, this.combo * 0.55);
    const d = Math.max(1, Math.hypot(p.x - x, p.z - z));
    p.vx += (p.x - x) / d * 14; p.vz += (p.z - z) / d * 14;
    this.trauma = 0.65; this.flash = 0.1;
    this.spark(p.x, p.z, COLORS.pink, 36, 1.5);
    this.emit('hurt');
    if (p.hp <= 0) {
      this.mode = this.mode === 'attract' ? 'attract' : 'dead';
      this.highScore = Math.max(this.score, this.highScore);
      this.spark(p.x, p.z, COLORS.jade, 100, 2.4);
      this.ring(p.x, p.z, COLORS.pink, 12, 1);
      this.emit('death');
    }
  }
  damageEnemy(e, damage, chain = false) {
    if (e.dead || e.warmup > 0) return;
    e.hp -= damage*(e.type==='boss'&&e.shielded?.22:1); e.hit = 0.13;e.stagger=.08;
    if (e.hp <= 0) this.killEnemy(e, chain);
  }
  killEnemy(e, chain = false) {
    if (e.dead) return;
    e.dead = true; this.kills++;if(e.type!=='anchor')this.levelKills++;
    this.score += Math.round(e.value * this.combo);
    const big = e.type === 'boss',tower=e.type==='pillar';
    this.spark(e.x,e.z,e.color,big||tower?140:44,big||tower?3:1.7);
    this.spark(e.x,e.z,COLORS.white,big?60:13,big?2.5:1.25);
    this.ring(e.x,e.z,e.color,big||tower?15:e.radius*3+1.5,big||tower?1.1:.48);
    this.ring(e.x,e.z,COLORS.white,big?8:e.radius*1.8,.22);
    this.trauma = Math.max(this.trauma, big ? 1 : 0.11);
    this.emit(big ? 'bossKill' : e.type === 'anchor' ? 'shatter' : 'kill', { x: e.x, color: e.color, size: e.radius });
    const drops = big ? 32 : tower?16:e.elite?8:e.type==='mote'?1:e.type === 'anchor' ? 4 : 2+Math.floor(this.rand()*3);
    for (let i = 0; i < drops; i++) {
      const a = this.rand() * TAU;
      this.pickups.push({ id: ++this.id, x: e.x, z: e.z, vx: Math.cos(a) * (2 + this.rand() * 6), vz: Math.sin(a) * (2 + this.rand() * 6), age: 0, type: 'energy' });
    }
    if (e.type === 'splitter' && this.level.number>=16 && this.enemies.length < CONFIG.maxEnemies - 4) {
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4,recursive=this.level.number>=31&&e.splitDepth===0;
        const child = this.spawnEnemy(recursive?'splitter':'cube', e.x + Math.cos(a), e.z + Math.sin(a), 0.32);
        if (child) { child.radius = recursive?.8:.38; child.size = recursive?.85:.48; child.hp = recursive?14:2.5;child.maxHp=child.hp; child.speed = 1.5;child.splitDepth=(e.splitDepth||0)+1;child.vx=Math.cos(a)*14;child.vz=Math.sin(a)*14; }
      }
    }
    if (e.type === 'anchor') {
      this.ring(e.x,e.z,COLORS.gold,6.5,.7);this.spark(e.x,e.z,COLORS.gold,55,2);this.emit('explosion',{x:e.x,size:2});
      if (e.size > 0.6) for (let i = 0; i < 3; i++) {
        const a = this.rand() * TAU;
        this.shoot(e.x, e.z, a, { damage: 2, speed: 25, color: COLORS.gold, life: 1, pierce: 0, radius: 0.3 });
      }
      for (const near of this.grid.query(e.x, e.z, 6.5)) {
        if (near !== e && !near.dead && distance(near, e) < 6.5) {
          const d = Math.max(distance(near, e), 0.5);
          near.vx += (near.x - e.x) / d * 15; near.vz += (near.z - e.z) / d * 15;
          this.damageEnemy(near, 14, true);
        }
      }
    }
    if (this.upgrades.lightning > 0 && !chain) this.chainLightning(e.x, e.z, 2 + this.upgrades.lightning, 1.2 + this.upgrades.lightning*.6);
    if (this.kills % 80 === 0) this.pickups.push({ id: ++this.id, x: e.x, z: e.z, vx: 0, vz: 0, age: 0, type: 'heart' });
    if(e.type!=='anchor'&&(this.kills%23===0||big)){const a=this.rand()*TAU;this.spawnWeapon(1+Math.floor(this.rand()*(WEAPONS.length-1)),e.x+Math.sin(a)*18,e.z+Math.cos(a)*18);}
    if (big) {
      this.bossDefeated = true; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
      this.player.burstCD = 0;
    }
  }
  chainLightning(x, z, count, damage) {
    const seen = new Set();
    for (let i = 0; i < count; i++) {
      let target = null, minD = 7.5;
      for (const e of this.enemies) if (!e.dead && e.warmup <= 0 && !seen.has(e.id)) {
        const d = Math.hypot(e.x - x, e.z - z);
        if (d < minD) { target = e; minD = d; }
      }
      if (!target) break;
      seen.add(target.id);
      this.bolts.push({ x, z, tx: target.x, tz: target.z, life: 0.22, color: COLORS.violet });
      x = target.x; z = target.z;
      this.damageEnemy(target, damage, true);
    }
  }
  chooseUpgrade(index) {
    if (this.mode !== 'upgrade' || !this.upgradeChoices[index]) return;
    const item = this.upgradeChoices[index];
    this.applyUpgrade(item);
    this.mode = 'playing'; this.nextLevel(); this.emit('upgrade');
  }
  applyUpgrade(item){
    this.upgrades[item.id]=Math.min(12,this.upgrades[item.id]+1);
    if (item.id === 'orbit') this.player.orbit = Math.min(10, this.player.orbit + 3);
    if (item.id === 'heart') { this.player.maxHp = Math.min(8, this.player.maxHp + 1); this.player.hp = this.player.maxHp; }
  }
  nextLevel() {
    this.levelIndex++;const base=LEVELS[this.levelIndex%LEVELS.length],cycle=Math.floor(this.levelIndex/LEVELS.length);
    this.level={...base,number:this.levelIndex+1,chapter:Math.min(20,base.chapter+cycle*4),intensity:base.intensity*(1+Math.min(3,cycle*.25))};
    this.levelTime = 0;this.levelKills=0;this.exitZone=null;
    this.pillarEncounter=this.level.number>=7&&this.level.beat===1;this.pillarsSpawned=false;
    this.createGates();
    if(this.level.boss){this.bullets=this.bullets.filter(b=>!b.enemy);this.enemies=this.enemies.filter(e=>!e.dead).sort((a,b)=>distance(a,this.player)-distance(b,this.player)).slice(0,20);}
    this.createObstacles();
    this.bossSpawned = false; this.bossDefeated = false; this.shiftWarning = false;
    this.arena.from = this.arena.to; this.arena.to = this.level.sides; this.arena.mix = 0;
    this.arena.targetRotation = this.level.rotation;
    this.banner = 3.2; this.player.invuln = Math.max(.65, this.player.invuln);
    this.ring(0, 0, this.level.color, CONFIG.arenaRadius * 1.2, 1.4);
    this.emit('shift', { phase: this.level.number });
    if(!this.curvedWorld)for (let i = 0; i < 2 + this.level.beat; i++) this.spawnEnemy('anchor');
  }
  update(dt, input = {}) {
    this.worldTime += dt;
    this.trauma = Math.max(0, this.trauma - dt * 2);
    this.flash = Math.max(0, this.flash - dt);
    this.updateEffects(dt);
    if(this.hitstop>0){this.hitstop=Math.max(0,this.hitstop-dt);return;}
    if (this.mode === 'paused' || this.mode === 'upgrade' || this.mode === 'victory' || this.mode === 'dead') return;
    if (this.mode === 'attract') input = this.demoInput();
    this.time += dt; this.musicBeat += dt * (134 + Math.min(8,this.level.chapter)) / 60; this.levelTime += dt; this.banner = Math.max(0, this.banner - dt);
    for(const o of this.obstacles)o.warmup=Math.max(0,o.warmup-dt);
    this.arena.mix = Math.min(1, this.arena.mix + dt * 0.3);
    this.arena.rotation = damp(this.arena.rotation, this.arena.targetRotation, 0.6, dt);
    this.updatePlayer(dt, input);
    this.updateDirector(dt);
    this.grid.clear();
    for (const e of this.enemies) if (!e.dead) this.grid.insert(e);
    this.updateEnemies(dt);
    this.updateRibbonHits();
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateWeaponDrops(dt);
    this.updateSupports(dt);
    this.updateSisters(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.bullets = this.bullets.filter(b => b.life > 0);
    this.comboTime -= dt;
    if (this.comboTime < 0) this.combo = Math.max(1, this.combo - dt * 0.15);
    if (this.mode === 'attract' && this.time > 65) this.reset('attract');
  }
  demoInput() {
    const p = this.player, t = this.time;
    const tx = Math.sin(t * 0.3) * 11, tz = Math.cos(t * 0.43) * 8;
    const d = Math.max(1, Math.hypot(tx - p.x, tz - p.z));
    const target = this.nearestTarget(p.x, p.z);
    p.weapon = Math.floor(t / 9) % 3;
    return { moveX: (tx - p.x) / d, moveZ: (tz - p.z) / d, aimX: target?.x, aimZ: target?.z, fire: true, dash: this.enemies.some(e => e.type !== 'anchor' && e.warmup <= 0 && distance(e, p) < 3), burst: (t % 14 > 12 && t % 14 < 12.1) || this.enemies.filter(e => distance(e, p) < 12).length > 13 };
  }
  nearestTarget(x, z, max = 100) {
    let target = null;
    for (const e of this.enemies) if (!e.dead && e.warmup <= 0) {
      const d = Math.hypot(e.x - x, e.z - z) * (e.type === 'anchor' ? 1.6 : 1);
      if (d < max) { max = d; target = e; }
    }
    return target;
  }
  recenter() {
    const p = this.player, dx = p.x, dz = p.z;
    p.x = 0; p.z = 0; p.px -= dx; p.pz -= dz;
    if(this.exitZone){this.exitZone.x-=dx;this.exitZone.z-=dz;}
    for (const list of [this.enemies, this.bullets, this.pickups, this.particles, this.rings, this.bolts, this.supports, this.sisters,this.gates,this.obstacles, this.attacks,this.stains,this.weaponDrops,p.tail]) for (const e of list) {
      e.x -= dx; e.z -= dz;
      if (e.px !== undefined) { e.px -= dx; e.pz -= dz; }
      if (e.tx !== undefined) { e.tx -= dx; e.tz -= dz; }
      if (e.type === 'prism' || e.type === 'guard') { e.aimX -= dx; e.aimZ -= dz; }
      if (e.trail) for (const point of e.trail) { point.x -= dx; point.z -= dz; }
    }
    this.enemies = this.enemies.filter(e => e.type === 'boss' || Math.hypot(e.x,e.z) < 65);
    this.grid.clear(); for (const e of this.enemies) if (!e.dead) this.grid.insert(e);
    return { dx, dz };
  }
  updatePlayer(dt, input) {
    const p = this.player;
    p.px = p.x; p.pz = p.z;
    for (const key of ['invuln', 'dash', 'dashCD', 'burstCD', 'shotCD','comboWindow','attackTime','overdrive','sisterCD','warpCD']) p[key] = Math.max(0, p[key] - dt);
    if (Number.isInteger(input.weapon)) this.equipWeapon(clamp(input.weapon, 0, WEAPONS.length-1));
    let mx = input.moveX ?? 0, mz = input.moveZ ?? 0;
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    if (Number.isFinite(input.aimX) && Number.isFinite(input.aimZ)) p.aim = Math.atan2(input.aimX - p.x, input.aimZ - p.z);
    else if (input.aimAngle !== undefined) p.aim = input.aimAngle;
    else if(!input.manualAim) { const target = this.nearestTarget(p.x, p.z); if (target) p.aim = Math.atan2(target.x - p.x, target.z - p.z); }
    const heading=ml>.08?Math.atan2(mx,mz):input.aimAngle!==undefined?input.aimAngle:p.angle;
    const turn=Math.atan2(Math.sin(heading-p.angle),Math.cos(heading-p.angle))*(1-Math.exp(-12*dt));
    p.angle+=clamp(turn,-9*dt,9*dt);
    if (input.dash && p.dashCD <= 0) {
      this.dashHits.clear();
      const a = ml > 0.1 ? Math.atan2(mx, mz) : p.aim;
      p.dash = CONFIG.dashDuration; p.dashCD = CONFIG.dashCooldown - Math.min(5,this.upgrades.haste) * 0.07;
      p.vx = Math.sin(a) * CONFIG.dashSpeed; p.vz = Math.cos(a) * CONFIG.dashSpeed;
      p.invuln = Math.max(p.invuln, CONFIG.dashDuration + 0.06);
      this.ring(p.x, p.z, COLORS.jade, 3.5, 0.25); this.emit('dash'); this.trauma = Math.max(this.trauma, 0.13);
    }
    if (p.dash <= 0) {
      const driveSpeed=CONFIG.speed*(1+Math.min(5,this.upgrades.haste)*.035);
      p.vx = damp(p.vx, mx * driveSpeed, ml ? CONFIG.acceleration : CONFIG.drag, dt);
      p.vz = damp(p.vz, mz * driveSpeed, ml ? CONFIG.acceleration : CONFIG.drag, dt);
    } else {
      this.spark(p.x, p.z, COLORS.jade, 3, 0.3);
      for (const e of this.grid.query(p.x, p.z, 3)) if (!e.dead && !this.dashHits.has(e.id) && segmentCircle(p.x,p.z,p.x+p.vx*dt,p.z+p.vz*dt,e.x,e.z,e.radius+1.2)) {
        this.dashHits.add(e.id);this.damageEnemy(e,6,true);this.ring(e.x,e.z,COLORS.jade,2.4,.35);
        for(const near of this.grid.query(e.x,e.z,2.4))if(near!==e&&!near.dead&&distance(near,e)<2.4)this.damageEnemy(near,1.6,true);
        this.emit('meleeHit',{size:1.1});
      }
    }
    p.x += p.vx * dt; p.z += p.vz * dt;
    const bounded = this.curvedWorld ? (this.movementResolver?.(p.x,p.z)??{x:p.x,z:p.z}) : clampToArena(p.x, p.z, this.arena, CONFIG.arenaRadius, CONFIG.arenaScaleZ, 0.9);
    if (bounded.x !== p.x || bounded.z !== p.z) {
      this.spark(bounded.x, bounded.z, COLORS.jade, p.dash > 0 ? 6 : 1, 0.5);
      p.vx *= -0.35; p.vz *= -0.35;
    }
    p.x = bounded.x; p.z = bounded.z;
    for(const o of this.obstacles)if(!o.broken&&o.warmup<=0){
      const hit=this.obstacleContact(p,o,.65);
      if(hit){
        if(p.dash>0&&Number.isFinite(o.hp)){this.damageObstacle(o,100);continue;}
        p.x+=hit.nx*hit.depth;p.z+=hit.nz*hit.depth;
        const into=p.vx*hit.nx+p.vz*hit.nz;
        if(into<0){p.vx-=hit.nx*into*1.2;p.vz-=hit.nz*into*1.2;}
        if(Math.hypot(p.vx,p.vz)>3)this.spark(hit.x,hit.z,COLORS.jade,2,.3);
      }
    }
    if(!this.gates.some(g=>distance(g,p)<2.5))p.gateLatch=null;
    if(p.warpCD<=0){const entered=this.gates.find(g=>distance(g,p)<1.5&&g.id!==p.gateLatch);if(entered){
      const target=this.gates.find(g=>g!==entered);let cleared=0;
      // A risky gate approach rewards luring a pack close, without clearing the far side.
      for(const e of this.enemies)if(!e.dead&&e.warmup<=0&&distance(e,entered)<4.5){
        this.damageEnemy(e,e.type==='boss'||e.type==='pillar'?4:8,true);if(e.dead)cleared++;
      }
      if(cleared){this.score+=cleared*150;this.comboTime=Math.max(this.comboTime,3);}
      p.x=target.x;p.z=target.z;p.gateLatch=target.id;p.warpCD=2.8;p.invuln=Math.max(p.invuln,.6);p.vx*=.3;p.vz*=.3;
      this.ring(entered.x,entered.z,entered.color,4.5,.5);this.ring(target.x,target.z,target.color,5,.65);this.spark(target.x,target.z,target.color,35,1);this.emit('warp',{cleared});
    }}
    p.tail.unshift({ x: p.x, z: p.z, angle: p.angle }); if (p.tail.length > 36) p.tail.pop();
    if(p.shotCD<=0)this.melee();
    if (input.burst) this.burst();
  }
  spawnWave(){
    const p=this.player,l=this.level,pressure=this.pressure(),demo=this.mode==='attract';
    const active=this.enemies.filter(e=>!e.dead&&e.type!=='anchor').length,room=Math.min(CONFIG.maxEnemies-this.enemies.length,(demo?65:pressure.cap)-active);
    if(room<Math.min(6,pressure.group))return 0;
    this.waveCount++;
    const pool=this.time<18?['diamond','cube','spinner']:l.enemies;
    const swarm=this.time>18&&this.waveCount%3===0;
    const pattern=swarm?'swarm':this.waveCount%4===0?'pincer':l.pattern;
    const count=Math.min(room,swarm?Math.max(12,pressure.group*2):demo?8:pressure.group),angle=this.rand()*TAU,packPhase=this.rand()*TAU;
    const primary=swarm?'mote':pool[Math.floor(this.rand()*pool.length)],secondary=pool[Math.floor(this.rand()*pool.length)];
    const warmup=3*60/(134+Math.min(8,l.chapter));
    for(let i=0;i<count;i++){
      const side=pattern==='pincer'?i%2:pattern==='ritual'?i%3:0,sector=angle+(pattern==='pincer'?side*Math.PI:pattern==='ritual'?side*TAU/3:0);
      const index=pattern==='pincer'?Math.floor(i/2):pattern==='ritual'?Math.floor(i/3):i,spacing=swarm?.78:1.55,columns=Math.ceil(Math.sqrt(count/(pattern==='pincer'?2:pattern==='ritual'?3:1)));
      const across=(index%columns-(columns-1)/2)*spacing,depth=Math.floor(index/columns)*spacing,r=18+Math.min(5,l.chapter*.45)+depth;
      const x=p.x+Math.cos(sector)*r-Math.sin(sector)*across,z=p.z+Math.sin(sector)*r+Math.cos(sector)*across;
      const e=this.spawnEnemy(side===1&&!swarm?secondary:primary,x,z,warmup);
      if(e){e.packId=this.waveCount*3+side;e.packPhase=packPhase;e.roamAngle=sector+Math.PI/2;}
    }
    this.lastWave={count,pattern,type:primary,time:this.time};
    this.emit('wave',{size:count,color:TYPES[primary].color});
    return count;
  }
  updateDirector(dt) {
    const l = this.level;
    if(this.gates.length&&this.gates.every(g=>distance(g,this.player)>55))this.createGates();
    if(this.curvedWorld)for(const o of this.obstacles)if(Math.hypot(o.x,o.z)>48){
      const a=this.rand()*TAU,r=17+this.rand()*8;
      o.x=Math.cos(a)*r;o.z=Math.sin(a)*r;o.angle=a+Math.PI/2;o.warmup=1.8;o.broken=false;o.hp=o.maxHp;o.id=++this.id;
    }
    const demo = this.mode === 'attract';
    const pressure=this.pressure();
    const interval = demo ? 2 : pressure.interval;
    this.spawnClock -= dt;
    // Land the telegraph on a beat. This clock also drives audio and keeps running muted.
    const beatPhase=this.musicBeat%1;
    if(this.spawnClock<=0&&(beatPhase<.07||this.spawnClock<-.46)&&this.spawnWave()>0)this.spawnClock=interval*(.92+this.rand()*.16);
    this.reactorClock-=dt;
    if(this.curvedWorld&&this.reactorClock<=0){
      this.reactorClock=14+this.rand()*6;
      if(this.enemies.filter(e=>e.type==='anchor'&&!e.dead).length<3){const p=this.player,a=p.angle+(this.rand()-.5)*1.3,r=13+this.rand()*5;this.spawnEnemy('anchor',p.x+Math.sin(a)*r,p.z+Math.cos(a)*r,1.3);}
    }
    if (l.boss && !this.bossSpawned && this.levelTime > 3) {
      this.bossSpawned = true; this.spawnEnemy('boss', 0, 10, 2);
      this.emit('boss'); this.banner = 3;
    }
    if(this.pillarEncounter&&!this.pillarsSpawned&&this.levelTime>2&&this.enemies.length<=CONFIG.maxEnemies-2){
      this.pillarsSpawned=true;const p=this.player;
      for(const side of[-1,1]){const a=p.angle+side*.9;this.spawnEnemy('pillar',p.x+Math.sin(a)*17,p.z+Math.cos(a)*17,3);}
      this.emit('warning');
    }
    if (!this.shiftWarning && this.levelTime > l.duration - 2.5 && !l.boss) {
      this.shiftWarning = true; this.emit('warning');
    }
    const ready=l.boss?this.bossDefeated:this.pillarEncounter?this.pillarsSpawned&&!this.enemies.some(e=>e.type==='pillar'&&!e.dead):this.levelTime>l.duration||(this.levelKills>=34+l.chapter*8+l.beat*5&&this.levelTime>9);
    if(ready&&!this.exitZone&&this.mode==='playing'){
      const p=this.player,a=Math.hypot(p.vx,p.vz)>2?Math.atan2(p.vx,p.vz):p.aim;
      this.exitZone={x:p.x+Math.sin(a)*12,z:p.z+Math.cos(a)*12,radius:2.7,openedAt:this.levelTime};
      for(const e of this.enemies)if(!e.dead&&distance(e,this.exitZone)<5.5)this.killEnemy(e,true);
      this.ring(this.exitZone.x,this.exitZone.z,'#91ff79',6,1);this.emit('zone');
    }
    if (this.exitZone&&this.mode==='playing'&&(distance(this.player,this.exitZone)<this.exitZone.radius||this.levelTime-this.exitZone.openedAt>8)) {
      if(distance(this.player,this.exitZone)<this.exitZone.radius){this.player.invuln=Math.max(this.player.invuln,1);this.player.hp=Math.min(this.player.maxHp,this.player.hp+1);}
      if(l.boss){this.applyUpgrade(UPGRADES[Math.floor(this.rand()*UPGRADES.length)]);this.emit('upgrade');}
      this.nextLevel();
    }
  }
  pressure(){
    const ramp=clamp((this.time-5)/65,0,1),l=this.level;
    const cap=Math.min(CONFIG.maxEnemies-12,36+Math.floor(ramp*130)+l.number*2),interval=Math.max(3.2,lerp(6.5,4.8,ramp)/Math.sqrt(l.intensity));
    return {cap:l.boss?Math.min(cap,32+l.chapter*4):cap,interval:l.boss?Math.max(4.8,interval):interval,group:l.boss?8+Math.floor(l.chapter*.5):Math.min(60,20+Math.floor(ramp*20)+l.chapter*2+(l.pattern==='flood'?8:l.pattern==='pincer'?4:0)),speed:lerp(.62,1,clamp(this.time/65,0,1))};
  }
  updateEnemies(dt) {
    const p = this.player,pace=this.pressure().speed;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if(this.curvedWorld&&e.type==='boss'&&distance(e,p)>36){
        const a=p.angle+(this.rand()>.5?1:-1)*.65;e.x=p.x+Math.sin(a)*22;e.z=p.z+Math.cos(a)*22;e.vx=0;e.vz=0;e.warmup=1.6;
        this.ring(e.x,e.z,COLORS.pink,5,1.6);this.emit('warning');
      }
      const previousX=e.x,previousZ=e.z;
      e.age += dt; e.hit = Math.max(0, e.hit - dt); e.orbCD -= dt;e.stagger=Math.max(0,e.stagger-dt);
      if (e.warmup > 0) { e.warmup -= dt; continue; }
      if(e.type==='pillar'){
        if(!e.landed){e.landed=true;this.ring(e.x,e.z,e.color,7,.8);this.spark(e.x,e.z,e.color,60,1.4);this.emit('explosion',{size:2});if(distance(e,p)<4)this.damagePlayer(e.x,e.z);}
        const d=distance(e,p),r=e.radius+.65;if(d<r){const nx=(p.x-e.x)/Math.max(.001,d),nz=(p.z-e.z)/Math.max(.001,d);p.x=e.x+nx*r;p.z=e.z+nz*r;}
        continue;
      }
      e.maneuverClock-=dt;
      if(e.maneuverClock<=0){e.maneuverClock=.65+this.rand()*1.4;e.sidestep=(this.rand()-.5)*1.8;e.surge=.7+this.rand()*.8;e.roamAngle+=(this.rand()-.5)*1.7;}
      e.swerve=damp(e.swerve,e.sidestep,3,dt);
      e.cd -= dt;
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.max(0.1, Math.hypot(dx, dz));
      const nx = dx / d, nz = dz / d;
      let tx = nx, tz = nz;
      const speed = e.speed * CONFIG.enemySpeed * (1 + this.level.chapter * 0.055) * pace;
      if (e.type === 'anchor') {
        e.vx *= Math.exp(-1.1 * dt); e.vz *= Math.exp(-1.1 * dt);
        e.angle += dt * 0.2;
        const momentum = Math.hypot(e.vx, e.vz);
        if (momentum > 3 && e.orbCD <= 0) for (const other of this.grid.query(e.x, e.z, 3.5)) {
          if (other !== e && !other.dead && other.warmup <= 0 && distance(e, other) < e.radius + other.radius) {
            other.vx += e.vx * 0.8; other.vz += e.vz * 0.8;
            this.damageEnemy(other, Math.min(12, momentum * 0.7), true);
            this.spark(e.x, e.z, COLORS.gold, 8, 0.8);
            e.vx *= -0.45; e.vz *= -0.45; e.orbCD = 0.3;
            this.emit('shatter', { x: e.x, size: 0.6 }); break;
          }
        }
      } else {
        if(e.type==='diamond'){
          const weave=Math.sin(e.age*2.3+e.phase)*.2+e.swerve*.6;
          tx=nx-nz*weave;tz=nz+nx*weave;
          if(d>7){tx+=(p.vx*.35)/Math.max(d,1);tz+=(p.vz*.35)/Math.max(d,1);}
        }
        if (e.type === 'spinner') {
          const orbit = (Math.sin(e.phase)>0?1:-1)*(1+Math.sin(e.age*2+e.phase)*.15),toward=d>10?1:d<6?-.9:0;
          tx = nx*toward - nz * orbit; tz = nz*toward + nx * orbit;
        }
        if(e.type==='cube'){
          const retreat=d<5?1:d>24?-1:0;
          tx=retreat?-nx*retreat:Math.sin(e.roamAngle);tz=retreat?-nz*retreat:Math.cos(e.roamAngle);
        }
        if(e.type==='mote'){
          const weave=Math.sin(e.age*5+e.packPhase)*.5+Math.sin(e.age*9+e.phase)*.15;
          tx=nx-nz*weave;tz=nz+nx*weave;
          let cx=0,cz=0,n=0;for(const other of this.grid.query(e.x,e.z,4))if(other!==e&&other.type==='mote'&&other.packId===e.packId){cx+=other.x-e.x;cz+=other.z-e.z;n++;}
          if(n){tx+=cx/n*.08;tz+=cz/n*.08;}
        }
        if (e.type === 'splitter') {
          const surge = .8+Math.max(0,Math.sin(e.age*2.5+e.phase))*.5;
          tx=tx*surge*e.surge-nz*e.swerve*.3;tz=tz*surge*e.surge+nx*e.swerve*.3;
        }
        if (e.type === 'prism' || e.type === 'guard') {
          const toward = e.type==='prism'?(d>20?.7:d<14?-1.3:0):(d>15?.7:d<9?-.35:0);
          tx = nx * toward - nz * (e.type==='prism'?.7:.15); tz = nz * toward + nx * (e.type==='prism'?.7:.15);
          if (e.cd < 0 && e.windup <= 0) { e.windup = 0.7; e.aimX = p.x + p.vx * 0.15; e.aimZ = p.z + p.vz * 0.15; e.cd = e.type === 'guard' ? 2.5 : 1.9; }
          if (e.windup > 0) {
            e.windup -= dt;
            if (e.windup <= 0) {
              const a = Math.atan2(e.aimX - e.x, e.aimZ - e.z);
              const n = e.type === 'guard' ? 7 : 1;
              for (let i = 0; i < n; i++) this.shoot(e.x, e.z, a + (i - (n - 1) / 2) * 0.23, { enemy: true, speed: e.type === 'prism' ? 21 : 12, life: 2.8, color: e.color, radius: 0.26 });
              this.emit('enemyShoot');
            }
          }
        }
        if (e.type === 'dart') {
          if (e.cd < 0 && e.state === 'chase') { e.state = 'windup'; e.windup = 0.8; e.aimX = nx; e.aimZ = nz;this.emit('charge'); }
          if (e.state === 'windup') {
            tx = 0; tz = 0; e.windup -= dt;
            if (e.windup <= 0) { e.state = 'charge'; e.windup = 0.6; }
          } else if (e.state === 'charge') {
            tx = e.aimX * 8; tz = e.aimZ * 8; e.windup -= dt;
            if (e.windup <= 0) { e.state = 'recover'; e.cd = 1.1; }
          } else if (e.state === 'recover') { tx = 0; tz = 0; if (e.cd < 0) { e.state = 'chase'; e.cd = 2.5; } }
        }
        if (e.type === 'boss') {
          e.shielded=e.age%6<(this.level.chapter===0?3:3.6);
          tx = nx * (d > 10 ? 1 : -0.3) - nz * 0.65;
          tz = nz * (d > 10 ? 1 : -0.3) + nx * 0.65;
          if (e.cd < 0) {
            const first=this.level.chapter===0;e.cd = e.hp < e.maxHp * 0.5 ? (first?1.7:1.15) : (first?2.4:1.9);
            const n = (e.hp<e.maxHp*.5?(first?16:22):(first?10:14)) + this.level.chapter;
            for (let i = 0; i < n; i++) this.shoot(e.x, e.z, i * TAU / n + e.age * 0.6, { enemy: true, speed: 7.5 + this.level.chapter * 0.4, life: 3.4, radius: 0.25, color: COLORS.orange });
            this.ring(e.x, e.z, COLORS.orange, 5, 0.55); this.emit('bossAttack');
            if (this.enemies.length < 35) for (let i = 0; i < 3; i++) this.spawnEnemy('diamond', e.x + (this.rand() - 0.5) * 8, e.z + (this.rand() - 0.5) * 8, 0.9);
          }
        }
        if (e.type !== 'boss') for (const other of this.grid.query(e.x, e.z, 2.5)) {
          if (other === e || other.dead) continue;
          const sx = e.x - other.x, sz = e.z - other.z, sd = Math.hypot(sx, sz), min = e.radius + other.radius + 0.3;
          if (sd > 0 && sd < min) { tx += sx / sd * (min - sd) * 1.8; tz += sz / sd * (min - sd) * 1.8; }
        }
        const grip=e.stagger>0?1.1:5.5;
        e.vx = damp(e.vx, tx * speed, grip, dt); e.vz = damp(e.vz, tz * speed, grip, dt);
        if(Math.hypot(e.vx,e.vz)>.25){const a=Math.atan2(e.vx,e.vz);e.angle+=Math.atan2(Math.sin(a-e.angle),Math.cos(a-e.angle))*(1-Math.exp(-dt*8));}
      }
      // Blast impulses preserve momentum before steering recovers.
      if (this.level.modifier === 'gravity' && e.type !== 'boss') {
        const d0 = Math.max(4, Math.hypot(e.x, e.z));
        e.vx -= e.x / d0 * dt * 2; e.vz -= e.z / d0 * dt * 2;
      }
      e.x += e.vx * dt; e.z += e.vz * dt;
      const c = this.curvedWorld ? { x: e.x, z: e.z } : clampToArena(e.x, e.z, this.arena, CONFIG.arenaRadius, CONFIG.arenaScaleZ, e.radius);
      if (c.x !== e.x || c.z !== e.z) { e.vx *= -0.65; e.vz *= -0.65; }
      e.x = c.x; e.z = c.z;
      if(e.type!=='boss')for(const o of this.obstacles)if(!o.broken&&o.warmup<=0){
        const hit=this.obstacleContact(e,o,e.radius);
        if(hit){e.x+=hit.nx*hit.depth;e.z+=hit.nz*hit.depth;e.vx+=hit.nx*4;e.vz+=hit.nz*4;}
      }
      if(e.type!=='anchor'){
        if(this.exitZone){const zone=this.exitZone,dx=e.x-zone.x,dz=e.z-zone.z,d=Math.hypot(dx,dz),r=zone.radius+e.radius+1;if(d<r){e.x=zone.x+dx/Math.max(.001,d)*r;e.z=zone.z+dz/Math.max(.001,d)*r;}}
        const sx=e.x-p.x,sz=e.z-p.z,separation=Math.hypot(sx,sz),contact=e.radius+.6;
        if(separation<contact){
          this.damagePlayer(e.x,e.z);
          const ax=separation>.001?sx/separation:Math.sin(e.phase),az=separation>.001?sz/separation:Math.cos(e.phase);
          e.x=p.x+ax*contact;e.z=p.z+az*contact;
        }
      }
      e.stride+=Math.hypot(e.x-previousX,e.z-previousZ);
      if (e.type !== 'anchor' && p.orbit > 0 && e.orbCD <= 0) {
        for (let i = 0; i < p.orbit; i++) {
          const a = this.time * 2.7 + i * TAU / p.orbit;
          const ox = p.x + Math.cos(a) * 2.5, oz = p.z + Math.sin(a) * 2.5;
          if (Math.hypot(ox - e.x, oz - e.z) < e.radius + 0.4) { this.damageEnemy(e, .9, true); e.orbCD = 0.3; break; }
        }
      }
    }
  }
  explodeProjectile(b){
    if(b.detonated)return;b.detonated=true;b.life=0;
    const radius=b.explosionRadius;
    this.ring(b.x,b.z,b.color,radius,.75);this.ring(b.x,b.z,COLORS.white,radius*.65,.32);
    this.spark(b.x,b.z,b.color,85,2);this.spark(b.x,b.z,COLORS.white,25,1.8);this.trauma=Math.max(this.trauma,.45);
    for(const e of this.enemies)if(!e.dead&&distance(b,e)<radius+e.radius){const d=distance(b,e);this.damageEnemy(e,b.damage*(1-d/(radius+3)));const force=12/Math.max(.3,d);e.vx+=(e.x-b.x)*force;e.vz+=(e.z-b.z)*force;}
    this.emit('explosion',{x:b.x,size:2});
  }
  updateBullets(dt) {
    const p = this.player;
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      b.px = b.x; b.pz = b.z;
      if(b.homing){
        let target=this.enemies.find(e=>e.id===b.targetId&&!e.dead&&e.warmup<=0);
        if(!target){const targets=this.enemies.filter(e=>!e.dead&&e.warmup<=0&&e.type!=='anchor').sort((a,c)=>distance(a,b)-distance(c,b)).slice(0,3);target=targets[b.id%Math.max(1,targets.length)];b.targetId=target?.id;}
        if(target){const angle=Math.atan2(target.x-b.x,target.z-b.z),delta=Math.atan2(Math.sin(angle-b.angle),Math.cos(angle-b.angle)),speed=Math.hypot(b.vx,b.vz);b.angle+=clamp(delta,-b.homing*dt,b.homing*dt);b.vx=Math.sin(b.angle)*speed;b.vz=Math.cos(b.angle)*speed;}
      }
      if (!b.enemy) {
        b.trail ||= []; b.trail.unshift({x:b.x,z:b.z}); if (b.trail.length>5) b.trail.pop();
      }
      if (!b.enemy && b.weapon !== 2 && b.weapon !== 4 && !b.homing&&!b.explosionRadius) {
        b.age = (b.age || 0) + dt;
        const amplitude = b.weapon === 1 ? 0.78 : 0.38;
        const basePhase=b.wavePhase??b.id*.4;
        const phase = b.age * 11 + basePhase;
        const wave = Math.sin(phase) * amplitude;
        const delta = wave - (b.wave ?? Math.sin(basePhase) * amplitude);
        b.x += Math.cos(b.angle) * delta; b.z -= Math.sin(b.angle) * delta; b.wave = wave;
      }
      b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      if(b.life<=0&&b.explosionRadius){this.explodeProjectile(b);continue;}
      if (Math.abs(b.x) > (this.curvedWorld ? 70 : 37) || Math.abs(b.z) > (this.curvedWorld ? 70 : 31)) { b.life = 0; continue; }
      for(const o of this.obstacles)if(!o.broken&&o.warmup<=0&&this.obstacleContact(b,o,b.radius)){
        if(!b.enemy)this.damageObstacle(o,b.damage);
        this.spark(b.x,b.z,Number.isFinite(o.hp)?COLORS.violet:'#5c5d7a',2,.3);b.life=0;break;
      }
      if(b.life<=0)continue;
      if (b.enemy) {
        let blocked = false;
        const support=this.supports[0];
        if(support.type==='shield'&&distance(b,support)<1.6){b.life=0;blocked=true;this.spark(b.x,b.z,support.color,10,.6);}
        for (let i = 0; i < p.orbit; i++) {
          const a = this.time * 2.7 + i * TAU / p.orbit;
          const x = p.x + Math.cos(a) * 2.5, z = p.z + Math.sin(a) * 2.5;
          if (segmentCircle(b.px, b.pz, b.x, b.z, x, z, 0.48)) { b.life = 0; blocked = true; this.spark(x, z, COLORS.gold, 8, 0.5); break; }
        }
        if (!blocked && segmentCircle(b.px, b.pz, b.x, b.z, p.x, p.z, 0.42 + b.radius)) { this.damagePlayer(b.x, b.z); b.life = 0; }
        // Sniper fire can ignite the destructible spirit stones.
        for (const e of this.grid.query(b.x, b.z, 2)) if (e.type === 'anchor' && !e.dead && segmentCircle(b.px, b.pz, b.x, b.z, e.x, e.z, e.radius)) { this.damageEnemy(e, 3); b.life = 0; break; }
      } else {
        for (const e of this.grid.query(b.x, b.z, 4.5)) {
          if (e.dead || e.warmup > 0 || b.hitIds.has(e.id)) continue;
          if (segmentCircle(b.px, b.pz, b.x, b.z, e.x, e.z, e.radius + b.radius)) {
            if(b.explosionRadius){this.explodeProjectile(b);break;}
            b.hitIds.add(e.id);
            this.damageEnemy(e, b.damage);
            e.vx += b.vx * (e.type === 'boss' ? 0.01 : 0.035); e.vz += b.vz * (e.type === 'boss' ? 0.01 : 0.035);
            this.spark(b.x, b.z, b.color, 3, 0.4);
            if ((b.weapon === 2 || b.weapon===4)&&!b.chained){b.chained=true;this.chainLightning(e.x,e.z,b.weapon===4?2:1,b.weapon===4?1.6:.9);}
            if (b.pierce-- <= 0) { b.life = 0; break; }
          }
        }
      }
    }
  }
  updatePickups(dt) {
    const p = this.player;
    const drone=this.supports[0];
    for (const s of this.pickups) {
      s.age += dt;
      const d = distance(s, p);
      const droneDistance=distance(s,drone);
      const radius = CONFIG.pickupRadius + this.upgrades.magnet * 3;
      if(droneDistance<(drone.type==='collector'?12:4.5)&&droneDistance<d){
        s.vx=damp(s.vx,(drone.x-s.x)/Math.max(droneDistance,.1)*27,9,dt);s.vz=damp(s.vz,(drone.z-s.z)/Math.max(droneDistance,.1)*27,9,dt);
      } else if (d < radius) {
        s.vx = damp(s.vx, (p.x - s.x) / Math.max(d, 0.1) * 23, 9, dt);
        s.vz = damp(s.vz, (p.z - s.z) / Math.max(d, 0.1) * 23, 9, dt);
      } else { s.vx *= Math.exp(-3 * dt); s.vz *= Math.exp(-3 * dt); }
      s.x += s.vx * dt; s.z += s.vz * dt;
      if (d < 0.9 || droneDistance < 1.1) {
        s.collected = true; this.souls++;this.credits+=s.type==='blade'?3:1;
        this.score+=Math.round(25*this.combo);
        this.combo = Math.min(50, this.combo + 0.11 + this.upgrades.magnet * 0.06); this.comboTime = 6;
        p.burstCD = Math.max(0, p.burstCD - 0.025);
        if(s.type==='energy'){
          if(p.dash>0)p.dashCD=Math.max(.45,p.dashCD-.15);
          if(p.overdrive<=0&&++p.charge>=CONFIG.overdriveCharge){p.charge=0;p.overdrive=CONFIG.overdriveDuration;p.burstCD=Math.max(0,p.burstCD-1.2);p.shotCD=Math.min(p.shotCD,.08);this.ring(p.x,p.z,COLORS.jade,14,.8);this.emit('overdrive');}
        }
        if (s.type === 'blade') p.orbit = Math.min(10, p.orbit + 1);
        if (s.type === 'heart') p.hp = Math.min(p.maxHp, p.hp + 1);
        this.emit('pickup', { combo: this.combo });
      }
    }
    this.pickups = this.pickups.filter(s => !s.collected && s.age < 20).slice(-250);
  }
  updateSupports(dt) {
    const p = this.player;
    this.supports.forEach((s, i) => {
      const a = this.time * 0.65 + i * Math.PI;
      let gx=p.x+Math.cos(a)*3.6,gz=p.z+Math.sin(a)*2.5-.8,nearest=s.type==='collector'?25:11;
      for(const coin of this.pickups){const d=distance(coin,s);if(d<nearest&&distance(coin,p)<30){nearest=d;gx=coin.x;gz=coin.z;}}
      s.x = damp(s.x, gx, s.type==='collector'?5:3.5, dt);
      s.z = damp(s.z, gz, s.type==='collector'?5:3.5, dt);
      s.cd -= dt;
      const target = this.nearestTarget(s.x, s.z, 16);
      if (target) s.angle = Math.atan2(target.x - s.x, target.z - s.z);
      if (s.cd <= 0 && target) {
        s.cd = s.type === 'attack' ? 0.8 : 1.6;
        const count=s.type==='attack'?2:1;
        for(let j=0;j<count;j++)this.shoot(s.x,s.z,s.angle+(j-(count-1)/2)*.1,{damage:.65+this.level.chapter*.1,color:s.color,speed:36,life:.55,weapon:s.type==='shield'?2:0,pierce:0});
      }
    });
  }
  updateRibbonHits(){
    const p=this.player;
    for(const a of this.attacks)if(a.ribbon&&a.life>0){
      a.x=p.x;a.z=p.z;a.angle=p.aim;
      let previous=ribbonPoint(a,a.angle,a.reach,this.worldTime,0);
      for(let i=1;i<=16;i++){
        const point=ribbonPoint(a,a.angle,a.reach,this.worldTime,i/16);
        for(const e of this.grid.query(p.x,p.z,7))if(!e.dead&&e.warmup<=0&&!a.hitIds.has(e.id)&&segmentCircle(previous.x,previous.z,point.x,point.z,e.x,e.z,e.radius+.26)){
          a.hitIds.add(e.id);this.damageEnemy(e,e.type==='boss'?18:e.type==='pillar'?32:Math.max(55,e.hp));this.spark(e.x,e.z,COLORS.pink,20,.9);
        }
        previous=point;
      }
    }
  }
  updateSisters(dt){
    const p=this.player,reserved=new Set();
    for(const ship of this.sisters){
      ship.life-=dt;ship.cd-=dt;
      if(ship.life<=0){this.ring(ship.x,ship.z,ship.color,1.8,.3);this.spark(ship.x,ship.z,ship.color,10,.4);continue;}
      const gx=p.x+Math.cos(p.angle)*ship.side*3-Math.sin(p.angle)*1.4,gz=p.z-Math.sin(p.angle)*ship.side*3-Math.cos(p.angle)*1.4;
      ship.x=damp(ship.x,gx,7,dt);ship.z=damp(ship.z,gz,7,dt);
      const targets=this.enemies.filter(e=>!e.dead&&e.warmup<=0&&e.type!=='anchor'&&distance(e,ship)<14).sort((a,b)=>distance(a,ship)-distance(b,ship));
      const target=targets.find(e=>!reserved.has(e.id))||targets[0];
      if(target){
        reserved.add(target.id);ship.angle=Math.atan2(target.x-ship.x,target.z-ship.z);
        if(ship.cd<=0){ship.cd=.48;this.shoot(ship.x,ship.z,ship.angle,{owner:'sister',weapon:7,damage:ship.damage,color:ship.color,speed:36,life:.38,pierce:0,radius:.22,targetId:target.id});}
      }else ship.angle=p.angle;
    }
    this.sisters=this.sisters.filter(s=>s.life>0);
  }
  updateEffects(dt) {
    if(this.weaponNotice)this.weaponNotice.life-=dt;
    for(const a of this.attacks)a.life-=dt;
    for(const a of this.stains)a.life-=dt;
    this.attacks=this.attacks.filter(a=>a.life>0);this.stains=this.stains.filter(a=>a.life>0);
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
      p.vx *= Math.exp(-2.3 * dt); p.vz *= Math.exp(-2.3 * dt); p.vy -= 22 * dt;
      if (p.y < 0.08) { p.y = 0.08; p.vy = -p.vy * 0.45; }
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const r of this.rings) r.life -= dt;
    for (const r of this.bolts) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
    this.bolts = this.bolts.filter(r => r.life > 0);
  }
}
