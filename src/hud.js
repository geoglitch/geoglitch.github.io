import { CONFIG, COLORS, WEAPONS, DRONES } from './config.js';
import { clamp, TAU } from './math.js';
import { layoutWeaponBeacons } from './weapon-beacons.js';

const FONT = '"Space Grotesk", monospace';
const DISPLAY = '"Barlow Condensed", Impact, sans-serif';
const settings = ['SOUND', 'MUSIC', 'REDUCED FX', 'TOUCH AIM', 'FULLSCREEN', 'DRONE'];
const tuning = ['speed', 'acceleration', 'dashSpeed', 'dashCooldown', 'fireInterval', 'bulletSpeed', 'enemySpeed', 'spawnInterval', 'pickupRadius', 'shake', 'bloom', 'volume'];

export class HUD {
  constructor(sim, renderer, input, audio) {
    this.sim = sim; this.renderer = renderer; this.input = input; this.audio = audio;
    this.settingsOpen = false; this.tuningOpen = false; this.tuningRow = 0;
    this.menuRow = 0; this.assistedTouch = true; this.hitAreas = [];
    this.fps = 60; this.debug = false; this.width = 0; this.height = 0;
  }
  text(ctx, text, x, y, size = 12, color = COLORS.white, align = 'left', weight = 400, family = FONT) {
    if (this.light) {
      if (color === COLORS.white) color = '#25263d';
      if (color === COLORS.dim) color = '#68677b';
      if (color === COLORS.jade) color = '#007e79';
      if (color === COLORS.gold) color = '#a36319';
    }
    ctx.font = `${weight} ${size}px ${family}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }
  line(ctx, x1, y1, x2, y2, color, width = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  diamond(ctx, x, y, size, color, fill = true) {
    if (this.light && color === COLORS.jade) color = '#007e79';
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.7, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size * 0.7, y); ctx.closePath();
    fill ? ctx.fill() : ctx.stroke();
  }
  area(id, x, y, w, h) { this.hitAreas.push({ id, x, y, w, h }); }
  hit(nx, ny) { const x = nx * this.width, y = ny * this.height; return [...this.hitAreas].reverse().find(a => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h)?.id; }
  draw(ctx, w, h) {
    this.width = w; this.height = h; this.hitAreas = [];
    const sim = this.sim, p = sim.player, t = sim.worldTime, mobile = w < 760;
    this.light = false;
    const topWash=ctx.createLinearGradient(0,0,0,145);topWash.addColorStop(0,'rgba(13,9,23,.68)');topWash.addColorStop(1,'rgba(13,9,23,0)');ctx.fillStyle=topWash;ctx.fillRect(0,0,w,145);
    const bottomWash=ctx.createLinearGradient(0,h-210,0,h);bottomWash.addColorStop(0,'rgba(13,9,23,0)');bottomWash.addColorStop(1,'rgba(13,9,23,.72)');ctx.fillStyle=bottomWash;ctx.fillRect(0,h-210,w,210);
    const pad = mobile ? 20 : 36;
    // Ink-dark vignette, grain and restrained screen texture are game rendering.
    this.drawWorldMarks(ctx);
    if (sim.mode === 'attract') this.drawAttract(ctx, w, h, mobile);
    else {
      ctx.fillStyle='#092c4c99';ctx.fillRect(pad-13,15,mobile?164:206,98);
      this.line(ctx,pad-13,15,pad+30,15,COLORS.jade,2);this.line(ctx,pad-13,15,pad-13,46,COLORS.jade,2);
      this.text(ctx,'SCORE',pad,28,10,COLORS.jade,'left',600);
      ctx.save();ctx.shadowColor=COLORS.jade;ctx.shadowBlur=15+sim.scorePulse*10;this.text(ctx,String(sim.score).padStart(7,'0'),pad,58,(mobile?33:44)*(1+sim.scorePulse*.035),'#edffff','left',900,DISPLAY);ctx.restore();
      this.text(ctx, `×${sim.combo.toFixed(1)}`, pad, 91, 16, COLORS.jade, 'left', 600);
      this.text(ctx, `◆ ${sim.credits}`, pad+77,91,12,COLORS.gold,'left',600);
      const bar = clamp(sim.comboTime / 6, 0, 1);
      this.line(ctx, pad, 109, pad + 70, 109, '#203c3c', 2);
      this.line(ctx, pad, 109, pad + 70 * bar, 109, COLORS.jade, 2);
      const notice=sim.chainNotice?.life>0?sim.chainNotice:sim.sweepNotice?.life>0?sim.sweepNotice:null;
      if(notice){ctx.save();ctx.globalAlpha=Math.min(1,notice.life*3);this.text(ctx,`${notice===sim.chainNotice?'CHAIN ×'+notice.count:'SWEEP'}  +${notice.bonus}`,pad,129,mobile?10:12,notice===sim.chainNotice?COLORS.gold:COLORS.jade,'left',600);ctx.restore();}
      const minutes=Math.floor(sim.time/60),seconds=Math.floor(sim.time%60);
      this.text(ctx,`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`,mobile?w*.57:w/2,33,mobile?18:22,sim.level.color,'center',600);
      const pressure=Math.min(1,sim.enemies.length/70);for(let i=0;i<12;i++)this.line(ctx,w/2-29+i*5,58,w/2-29+i*5,64,i/12<pressure?sim.level.color:'#31425d',2);
      if(sim.exitZone)this.text(ctx,'RECHARGE',w/2,83,9,'#aaff82','center',600);
      else if(sim.waveWarning?.life>0&&!sim.level.boss){const warning=sim.waveWarning;ctx.save();ctx.globalAlpha=.65+.3*Math.sin(warning.life*10);this.text(ctx,`${warning.pattern==='surge'?'SURGE  ':'››  '}+${warning.count}`,mobile?w*.57:w/2,83,mobile?10:12,warning.color,'center',600);ctx.restore();}
      const maxWidth = mobile ? 66 : 112;
      for (let i = 0; i < p.maxHp; i++) this.diamond(ctx, w - pad - maxWidth + i * (maxWidth / Math.max(p.maxHp - 1, 1)), 36, mobile ? 5 : 7, i < p.hp ? COLORS.jade : '#345052', i < p.hp);
      this.text(ctx, `BEST ${String(Math.max(sim.score, sim.highScore)).padStart(7, '0')}`, w - pad, 64, 9, COLORS.dim, 'right');
      const boss = sim.enemies.find(e => e.type === 'boss' && !e.dead);
      if (boss) {
        const bw = Math.min(360, w * 0.5), bx = w / 2 - bw / 2;
        this.text(ctx, boss.name, w / 2, 99, 11, COLORS.orange, 'center', 600);
        this.line(ctx, bx, 117, bx + bw, 117, '#5a2b2c', 4);
        this.line(ctx, bx, 117, bx + bw * Math.max(0, boss.hp / boss.maxHp), 117, COLORS.orange, 4);
      }
      this.drawWeapons(ctx, w, h, mobile);
      if (this.input.touch) this.drawTouch(ctx, w, h);
      else this.drawAbilities(ctx, w, h, mobile);
      if (sim.time < 12 && sim.mode === 'playing' && !this.input.touch) {
        const padConnected = navigator.getGamepads?.()[0];
        ctx.globalAlpha = clamp((12 - sim.time) / 2, 0, 0.7);
        this.text(ctx, sim.time<6?'TAP TO MOVE   ·   AUTO FIRE':padConnected ? 'L MOVE   R AIM   A BOOST   B FLOOR PULSE' : 'CLICK / WASD MOVE   ·   SPACE BOOST   ·   E FLOOR PULSE', w / 2, h - 23, mobile ? 8 : 10, COLORS.white, 'center');
        ctx.globalAlpha = 1;
      }
      if (sim.mode === 'dead' || sim.mode === 'victory') this.drawResult(ctx, w, h, sim.mode === 'victory');
      if (sim.mode === 'paused' && !this.settingsOpen) this.drawPause(ctx, w, h);
      if (sim.mode === 'upgrade') this.drawUpgrade(ctx, w, h);
    }
    this.drawTopIcons(ctx, w, h);
    if (this.settingsOpen) this.drawSettings(ctx, w, h);
    if (this.tuningOpen) this.drawTuning(ctx, w, h);
    if (this.debug) {
      this.text(ctx, `${this.fps.toFixed(0)} FPS / ${sim.enemies.length} TARGETS / ${sim.bullets.length} SHOTS / ${this.renderer.scene.getActiveMeshes().length} MESHES`, pad, h - 10, 10, COLORS.gold);
    }
    if (sim.flash > 0 && !sim.reduced) {
      ctx.fillStyle = `rgba(125,255,221,${Math.min(0.12, sim.flash * 0.6)})`; ctx.fillRect(0, 0, w, h);
    }
  }
  drawAttract(ctx, w, h, mobile) {
    this.text(ctx, 'GEOMETRY GLITCH', 28, 37, mobile ? 28 : 36, COLORS.white, 'left', 900, DISPLAY);
    ctx.globalAlpha = 0.7 + Math.sin(this.sim.worldTime * 3) * 0.3;
    this.text(ctx, this.input.touch ? 'TOUCH TO LAUNCH' : navigator.getGamepads?.()[0] ? 'A  /  LAUNCH' : 'ENTER  /  LAUNCH', w / 2, h - 59, 14, COLORS.jade, 'center', 600);
    ctx.globalAlpha = 1;
    this.area('start', 0, 80, w, h - 80);
    DRONES.forEach((d,i)=>{
      const x=w/2+(i-1)*Math.min(112,w*.27),y=h-144,selected=this.sim.supportChoice===i;
      ctx.globalAlpha=selected?1:.6;
      this.diamond(ctx,x,y-20,selected?21:16,d.color,false);if(i===0)this.diamond(ctx,x,y-20,8,d.color);if(i===1){this.diamond(ctx,x-14,y-20,4,d.color);this.diamond(ctx,x+14,y-20,4,d.color);}if(i===2){ctx.strokeStyle=d.color;ctx.beginPath();ctx.arc(x,y-20,27,0,TAU);ctx.stroke();}
      this.text(ctx,d.name,x,y+14,11,selected?COLORS.white:COLORS.dim,'center',600);
      if(selected)this.text(ctx,d.role,x,y+32,8,COLORS.dim,'center');
      ctx.globalAlpha=1;this.area(`drone${i}`,x-48,y-42,96,88);
    });
    this.text(ctx, 'TAP TO MOVE   ·   AUTO FIRE   ·   FLOOR PULSE', w / 2, h - 29, 8, COLORS.dim, 'center');
  }
  drawBeacon(ctx,target,name,color,exit=false){
    const w=this.width,h=this.height,pos=this.renderer.screenPoint(target.x,.5,target.z);
    const inside=pos.visible&&pos.x>45&&pos.x<w-45&&pos.y>150&&pos.y<h-170;
    let x=pos.x,y=pos.y;
    if(!inside){const angle=Math.atan2(target.x,target.z);x=w/2+Math.sin(angle)*(w/2-50);y=h/2-Math.cos(angle)*(h/2-160);}
    if(exit){this.diamond(ctx,x,y,10,color,false);this.text(ctx,name,x,y+22,11,color,'center',600);}
    else this.weaponDiagram(ctx,target.weapon,x,y+20,30,color);
    if(!inside)this.text(ctx,'›',x,y-19,18,color,'center',600);
    this.area(exit?'navigateSafe':`navigateWeapon${target.id}`,x-26,y-24,52,75);
  }
  drawWeaponBeacons(ctx) {
    const w=this.width,h=this.height,t=this.sim.worldTime,focus=this.renderer.navigationEntity;
    const entries=this.sim.weaponDrops.map(drop=>{
      const pos=this.renderer.screenPoint(drop.x,.45,drop.z),inside=pos.visible&&pos.x>40&&pos.x<w-40&&pos.y>160&&pos.y<h-170;
      const d=Math.max(1,Math.hypot(drop.x,drop.z)),near=this.renderer.screenPoint(drop.x/d*3,.85,drop.z/d*3),center=this.renderer.screenPoint(0,.85,0),angle=Math.atan2(near.x-center.x,center.y-near.y);
      return {...drop,inside,anchor:pos,angle,selected:focus?.type==='weapon'&&focus.id===drop.id,x:inside?pos.x:w/2+Math.sin(angle)*(w/2-36),y:inside?pos.y-46:h/2-Math.cos(angle)*(h/2-170)};
    });
    const obstacles=this.hitAreas.map(a=>({x:a.x+a.w/2,y:a.y+a.h/2,size:Math.max(a.w,a.h)}));
    for(const mark of layoutWeaponBeacons(entries,w,h,obstacles,this.renderer.screenPoint(0,.85,0))){
      const {x,y,size,inside,selected,weapon}=mark,color=WEAPONS[weapon].color,r=size/2,cut=10;
      ctx.save();
      if(inside){ctx.globalAlpha=.65;this.line(ctx,x,y+r,mark.anchor.x,mark.anchor.y,color,1);this.diamond(ctx,mark.anchor.x,mark.anchor.y,4,color,false);}
      ctx.globalAlpha=inside||selected?1:.82;
      ctx.beginPath();ctx.moveTo(x-r+cut,y-r);ctx.lineTo(x+r,y-r);ctx.lineTo(x+r,y+r-cut);ctx.lineTo(x+r-cut,y+r);ctx.lineTo(x-r,y+r);ctx.lineTo(x-r,y-r+cut);ctx.closePath();
      ctx.fillStyle='#071526ee';ctx.fill();ctx.strokeStyle=selected?'#efffff':color;ctx.lineWidth=selected?2.5:1.5;ctx.shadowColor=color;ctx.shadowBlur=selected?17:8;ctx.stroke();ctx.shadowBlur=0;
      const wash=ctx.createLinearGradient(x,y-r,x,y+r);wash.addColorStop(0,color+'38');wash.addColorStop(1,color+'04');ctx.fillStyle=wash;ctx.fill();
      this.weaponDiagram(ctx,weapon,x,y,inside?46:33,color,t);
      // Pickup-only corner tabs and a plus distinguish equipment from enemy shapes.
      this.line(ctx,x-r+cut,y-r,x-r+cut+14,y-r,'#f0ffff',2);
      this.line(ctx,x+r-8,y+r-9,x+r-8,y+r-3,color,1.5);this.line(ctx,x+r-11,y+r-6,x+r-5,y+r-6,color,1.5);
      if(selected){const phase=(t*.5)%1;ctx.strokeStyle='#eaffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+6,-Math.PI/2,-Math.PI/2+TAU*(.3+phase*.35));ctx.stroke();}
      if(!inside){ctx.translate(x,y);ctx.rotate(mark.angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-r-8);ctx.lineTo(-4,-r-3);ctx.lineTo(4,-r-3);ctx.closePath();ctx.fill();}
      ctx.restore();this.area(`navigateWeapon${mark.id}`,x-r,y-r,size,size);
    }
  }
  drawWorldMarks(ctx) {
    const sim = this.sim;
    const project = (x, y, z) => this.renderer.screenPoint(x, y, z);
    for(const gate of sim.gates){
      const pos=project(gate.x,1.8,gate.z),inside=pos.visible&&pos.x>35&&pos.x<this.width-35&&pos.y>150&&pos.y<this.height-170,a=Math.atan2(gate.x,gate.z),x=inside?pos.x:this.width/2+Math.sin(a)*(this.width/2-32),y=inside?pos.y:this.height/2-Math.cos(a)*(this.height/2-170);
      ctx.strokeStyle=gate.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,10,15,0,0,TAU);ctx.stroke();this.line(ctx,x-6,y,x+6,y,gate.color,2);this.line(ctx,x+2,y-4,x+6,y,gate.color,2);this.line(ctx,x+2,y+4,x+6,y,gate.color,2);this.area(`navigateGate${gate.id}`,x-25,y-25,50,50);
    }
    for(const reactor of sim.enemies.filter(e=>e.type==='anchor'&&!e.dead&&Math.hypot(e.x,e.z)<28)){
      const pos=project(reactor.x,2.5,reactor.z);if(!pos.visible||pos.x<30||pos.x>this.width-30||pos.y<150||pos.y>this.height-150)continue;
      this.diamond(ctx,pos.x,pos.y,7,COLORS.gold,false);this.area(`navigateBoss${reactor.id}`,pos.x-20,pos.y-20,40,40);
    }
    for(const boss of sim.enemies.filter(e=>(e.type==='boss'||e.type==='pillar')&&!e.dead)){
      const pos=project(boss.x,1,boss.z),inside=pos.visible&&pos.x>45&&pos.x<this.width-45&&pos.y>160&&pos.y<this.height-170,angle=Math.atan2(boss.x,boss.z),x=inside?pos.x:this.width/2+Math.sin(angle)*(this.width/2-50),y=inside?pos.y:this.height/2-Math.cos(angle)*(this.height/2-160);
      ctx.save();ctx.strokeStyle=boss.type==='pillar'?'#74ffd5':'#ff75c7';ctx.lineWidth=2;
      if(boss.type==='pillar'){for(let i=0;i<3;i++)ctx.strokeRect(x-9,y-19+i*12,18,9);}
      else{ctx.beginPath();for(let i=0;i<=6;i++){const a=i*TAU/6;i?ctx.lineTo(x+Math.cos(a)*15,y+Math.sin(a)*15):ctx.moveTo(x+Math.cos(a)*15,y+Math.sin(a)*15);}ctx.stroke();this.diamond(ctx,x,y,6,'#ff75c7',false);}
      ctx.restore();this.area(`navigateBoss${boss.id}`,x-28,y-28,56,56);
    }
    if(sim.exitZone)this.drawBeacon(ctx,sim.exitZone,'SAFE ZONE','#aaff82',true);
    this.drawWeaponBeacons(ctx);
    for (const e of sim.enemies) {
      if (e.warmup > 0) {
        const pos = project(e.x, 0.1, e.z);
        ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y, 11 + Math.sin(e.age * 12) * 2, 5, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (e.windup > 0 && (e.type === 'prism' || e.type === 'guard' || e.state === 'windup')) {
        const pos = project(e.x, 0.7, e.z);
        const target = e.type === 'dart' ? project(e.x + e.aimX * 17, 0.1, e.z + e.aimZ * 17) : project(e.aimX, 0.1, e.aimZ);
        ctx.save(); ctx.setLineDash([4, 7]); this.line(ctx, pos.x, pos.y, target.x, target.y, `${e.color}99`, 1); ctx.restore();
        ctx.strokeStyle = e.color; ctx.beginPath(); ctx.arc(target.x, target.y, 9, 0, TAU); ctx.stroke();
      }
      if((e.elite||e.type==='pillar')&&e.warmup<=0){const pos=project(e.x,2,e.z);if(pos.visible){this.line(ctx,pos.x-12,pos.y-11,pos.x+12,pos.y-11,'#172844',4);this.line(ctx,pos.x-12,pos.y-11,pos.x-12+24*Math.max(0,e.hp/e.maxHp),pos.y-11,e.color,2);}}
    }
    // A small, stable warning survives the horizon and never hides the ship.
    const threats=sim.enemies.filter(e=>!e.dead&&e.warmup<=0&&e.type!=='anchor'&&Math.hypot(e.x,e.z)<14).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
    let warnings=0;
    for(const e of threats){
      const pos=project(e.x,.8,e.z);if(pos.visible&&pos.x>30&&pos.x<this.width-30&&pos.y>125&&pos.y<this.height-130)continue;
      if(warnings++>=4)break;
      const d=Math.max(1,Math.hypot(e.x,e.z)),near=project(e.x/d*3,.8,e.z/d*3),center=project(0,.8,0),angle=Math.atan2(near.x-center.x,center.y-near.y),x=this.width/2+Math.sin(angle)*(this.width/2-26),y=this.height/2-Math.cos(angle)*(this.height/2-135);
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#ff638d';ctx.shadowColor='#ff638d';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-5,4);ctx.lineTo(5,4);ctx.closePath();ctx.fill();ctx.restore();
    }
    if (sim.mode === 'playing' && !this.input.touch && this.input.mouse.active) {
      const x = this.input.mouse.x * this.width, y = this.input.mouse.y * this.height;
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = WEAPONS[sim.player.weapon].color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4; this.line(ctx, x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a) * 16, y + Math.sin(a) * 16, WEAPONS[sim.player.weapon].color);
      }
      ctx.globalAlpha = 1;
    }
    if (sim.mode === 'playing') {
      const pos = project(sim.player.x, 0.1, sim.player.z);
      if(sim.player.hp>0){
        const points=this.renderer.shipScreenPoints();
        ctx.save();ctx.beginPath();points.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fillStyle='#102d46cc';ctx.fill();ctx.strokeStyle='#071a30';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#efffff';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
      }
      if(sim.player.charge>0||sim.player.overdrive>0){ctx.save();ctx.strokeStyle=sim.player.overdrive>0?'#efffff':'#70ffcb';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pos.x,pos.y,28,-Math.PI/2,-Math.PI/2+TAU*(sim.player.overdrive>0?sim.player.overdrive/CONFIG.overdriveDuration:sim.player.charge/CONFIG.overdriveCharge));ctx.stroke();ctx.restore();}
      if (sim.player.invuln > 0 && sim.time > 3) {
        for (let i = 0; i < sim.player.maxHp; i++) this.diamond(ctx, pos.x - (sim.player.maxHp - 1) * 4 + i * 8, pos.y + 35, 2.5, i < sim.player.hp ? COLORS.jade : '#3f4f58');
      }
    }
  }
  drawTopIcons(ctx, w, h) {
    const x = w - 28, y = this.sim.mode === 'attract' ? 31 : 96;
    this.area('settings', x - 20, y - 20, 40, 40);
    for (let i = 0; i < 3; i++) {
      this.line(ctx, x - 8, y - 6 + i * 6, x + 8, y - 6 + i * 6, COLORS.dim);
      ctx.fillStyle = COLORS.dim; ctx.fillRect(x + (i % 2 ? 3 : -4) - 1, y - 8 + i * 6, 2, 5);
    }
    const mx = x - 44;
    this.area('mute', mx - 18, y - 18, 36, 36);
    ctx.strokeStyle = this.audio.muted ? COLORS.orange : COLORS.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx - 6, y - 3); ctx.lineTo(mx - 2, y - 3); ctx.lineTo(mx + 3, y - 7); ctx.lineTo(mx + 3, y + 7); ctx.lineTo(mx - 2, y + 3); ctx.lineTo(mx - 6, y + 3); ctx.closePath(); ctx.stroke();
    if (!this.audio.muted) { ctx.beginPath(); ctx.arc(mx + 3, y, 9, -0.7, 0.7); ctx.stroke(); }
    else this.line(ctx, mx - 8, y - 10, mx + 9, y + 10, COLORS.orange);
    if (this.sim.mode === 'playing') {
      this.area('pause', x - 101, y - 18, 36, 36);
      ctx.fillStyle = COLORS.dim; ctx.fillRect(x - 89, y - 6, 2, 12); ctx.fillRect(x - 83, y - 6, 2, 12);
    }
  }
  drawWeapons(ctx,w,h,mobile){
    const x=mobile?14:36,y=h-(this.input.touch?30:69),p=this.sim.player,current=WEAPONS[p.weapon],top=mobile?y-88:y;
    this.weaponDiagram(ctx,p.weapon,x+17,top-45,32,current.color);
    if(current.ranged)this.text(ctx,String(p.ammo[p.weapon]),x+44,top-44,14,current.color,'left',600);
    this.line(ctx,x,top-21,x+90,top-21,'#35465f',2);this.line(ctx,x,top-21,x+90*(1-clamp(p.shotCD/(CONFIG.fireInterval*current.interval),0,1)),top-21,current.color,2);
    for(let i=0;i<WEAPONS.length;i++){
      const owned=p.ownedWeapons.includes(i)&&(!WEAPONS[i].ranged||p.ammo[i]>0),active=i===p.weapon,xx=x+(mobile?i%3*44:i*58),yy=mobile?top+Math.floor(i/3)*44:y;
      ctx.globalAlpha=i===7&&p.sisterCD>0?.4:1;
      if(owned)this.weaponDiagram(ctx,i,xx+16,yy,active?25:19,active?WEAPONS[i].color:'#8da5be');
      else this.diamond(ctx,xx+16,yy,2,'#50617d',false);
      ctx.globalAlpha=1;
      if(!mobile)this.text(ctx,String(i+1),xx+32,yy+3,8,owned?WEAPONS[i].color:'#50617d');
      if(active)this.line(ctx,xx+5,yy+17,xx+27,yy+17,current.color,2);
      if(i===7&&owned){this.text(ctx,String(p.ammo[7]),xx+29,yy-14,8,WEAPONS[7].color);if(p.sisterCD>0)this.line(ctx,xx+5,yy+17,xx+5+22*(1-p.sisterCD/WEAPONS[7].cooldown),yy+17,WEAPONS[7].color,2);}
      if(owned)this.area(`weapon${i}`,xx-5,yy-21,mobile?44:56,42);
    }
    if(this.sim.weaponNotice?.life>0){const n=this.sim.weaponNotice,c=WEAPONS[n.weapon].color,fade=Math.min(1,n.life*2),arrival=Math.max(0,n.life-1.8)/.6;ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#071526cc';ctx.fillRect(w/2-43,h*.67-39,86,78);this.line(ctx,w/2-43,h*.67-39,w/2+43,h*.67-39,c,2);this.weaponDiagram(ctx,n.weapon,w/2,h*.67,56+arrival*20,c);ctx.restore();}
  }
  weaponDiagram(ctx,weapon,x,y,size,color,time=null){
    ctx.save();ctx.translate(x,y);ctx.scale(size/36,size/36);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=6;
    const line=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();};
    const circle=(a,b,r)=>{ctx.beginPath();ctx.arc(a,b,r,0,TAU);ctx.stroke();};
    const head=(a,b)=>{ctx.beginPath();ctx.moveTo(a,b-4);ctx.lineTo(a-3,b+2);ctx.lineTo(a+3,b+2);ctx.closePath();ctx.fill();};
    if(time!==null){const phase=time*.7%1;ctx.globalAlpha*=.85+.15*Math.sin(time*2);if(weapon===2)ctx.rotate(time*.45);if(weapon===3||weapon===4||weapon===5){ctx.translate(0,2-phase*4);}if(weapon===6){ctx.scale(.92+Math.sin(time*2)*.08,.92+Math.sin(time*2)*.08);}}
    if(weapon===0){ctx.beginPath();ctx.moveTo(-14,12);ctx.bezierCurveTo(-16,-12,11,-15,11,0);ctx.bezierCurveTo(11,12,-4,12,-3,0);ctx.stroke();line(2,-11,6,-17);line(10,-8,15,-14);}
    if(weapon===1){ctx.beginPath();ctx.moveTo(-15,15);ctx.bezierCurveTo(16,12,-17,-6,2,-9);ctx.bezierCurveTo(21,-12,11,-20,8,-17);ctx.stroke();circle(-15,15,2);}
    if(weapon===2){circle(0,0,12);for(const a of[0,Math.PI]){ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(7,-10);ctx.lineTo(-3,-9);ctx.closePath();ctx.fill();ctx.restore();}}
    if(weapon===3){for(let i=-2;i<=2;i++){line(i*2,12,i*7,-11+Math.abs(i)*2);head(i*7,-13+Math.abs(i)*2);}}
    if(weapon===4){line(0,15,0,-15);head(0,-15);circle(0,-4,4);circle(0,8,4);}
    if(weapon===5){for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*11,14);ctx.quadraticCurveTo(i*18,-1,i*7,-12);ctx.stroke();head(i*7,-12);}circle(0,-12,3);}
    if(weapon===6){circle(0,0,7);circle(0,0,15);for(let i=0;i<8;i++){const a=i*TAU/8;line(Math.cos(a)*10,Math.sin(a)*10,Math.cos(a)*18,Math.sin(a)*18);}}
    if(weapon===7){for(const x of[-10,10]){ctx.beginPath();ctx.moveTo(x,-16);ctx.lineTo(x-6,1);ctx.lineTo(x,-3);ctx.lineTo(x+6,1);ctx.closePath();ctx.stroke();line(x,5,x,13);}circle(0,14,3);line(-3,12,-10,6);line(3,12,10,6);}
    if(weapon===8){const colors=['#ff5de9','#ffb14a','#b7ff48','#54fff1','#48adff','#a28bff'];for(let i=0;i<24;i++){const f=i/24,g=(i+1)/24;ctx.strokeStyle=colors[Math.floor(f*6)];ctx.lineWidth=4;line(-13+f*26,Math.sin(f*TAU)*10,-13+g*26,Math.sin(g*TAU)*10);}}
    ctx.restore();
  }
  ability(ctx, x, y, radius, progress, color, symbol, caption, key, id) {
    ctx.strokeStyle = '#294143'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + TAU * progress); ctx.stroke();
    ctx.globalAlpha = progress < 1 ? 0.4 : 1;
    this.text(ctx, symbol, x, y - 1, radius * 1.1, color, 'center', 400, 'serif');
    ctx.globalAlpha = 1;
    if (caption) this.text(ctx, caption, x, y + radius + 16, 8, color, 'center', 600);
    if (key) this.text(ctx, key, x, y - radius - 15, 9, '#7c9b95', 'center');
    this.area(id, x - Math.max(36, radius), y - Math.max(36, radius), Math.max(72, radius * 2), Math.max(72, radius * 2));
  }
  drawAbilities(ctx, w, h, mobile) {
    const p = this.sim.player, r = mobile ? 20 : 24;
    this.ability(ctx, w - 142, h - 75, r, 1 - clamp(p.dashCD / CONFIG.dashCooldown, 0, 1), COLORS.jade, '»', '', 'SPACE', 'dash');
    this.ability(ctx, w - 62, h - 75, r, 1 - clamp(p.burstCD / CONFIG.burstCooldown, 0, 1), COLORS.jade, '◎', 'FLOOR PULSE', 'E', 'burst');
  }
  drawTouch(ctx, w, h) {
    const p = this.sim.player;
    for (const [stick, x, y] of [[this.input.left, w * 0.17, h * 0.77], [this.input.right, w * 0.72, h * 0.77]]) {
      const ox = stick?.ox ?? x, oy = stick?.oy ?? y;
      ctx.globalAlpha = stick ? 0.65 : 0.16;
      ctx.strokeStyle = COLORS.jade; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, 45, 0, TAU); ctx.stroke();
      const dx = (stick?.x ?? x) - ox, dy = (stick?.y ?? y) - oy, d = Math.max(1, Math.hypot(dx, dy) / 35);
      ctx.fillStyle = '#77ffe035'; ctx.beginPath(); ctx.arc(ox + dx / d, oy + dy / d, 17, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    this.ability(ctx, w - 135, h - 65, 32, 1 - clamp(p.dashCD / CONFIG.dashCooldown, 0, 1), COLORS.jade, '»', '', '', 'dash');
    this.ability(ctx, w - 52, h - 65, 32, 1 - clamp(p.burstCD / CONFIG.burstCooldown, 0, 1), COLORS.jade, '◎', 'PULSE', '', 'burst');
    this.area('touchPause', w / 2 - 30, 0, 60, 65);
  }
  scrim(ctx, w, h, opacity = 0.8) { ctx.fillStyle = `rgba(3,8,14,${opacity})`; ctx.fillRect(0, 0, w, h); }
  drawPause(ctx, w, h) {
    this.scrim(ctx, w, h, 0.78);
    this.text(ctx, 'PAUSED', w / 2, h * 0.35, Math.min(76, w * 0.16), COLORS.white, 'center', 900, DISPLAY);
    const items = ['RESUME', 'SETTINGS', 'RESTART'];
    items.forEach((s, i) => {
      const y = h * 0.51 + i * 45;
      this.text(ctx, `${this.menuRow === i ? '› ' : ''}${s}`, w / 2, y, 13, this.menuRow === i ? COLORS.jade : COLORS.dim, 'center', 600);
      this.area(['resume', 'settings', 'restart'][i], w / 2 - 140, y - 20, 280, 40);
    });
  }
  drawResult(ctx, w, h, win) {
    this.scrim(ctx, w, h, 0.76);
    this.text(ctx, win ? '✦' : '×', w / 2, h * 0.23, 70, win ? COLORS.gold : COLORS.orange, 'center', 400, FONT);
    this.text(ctx, win ? 'RUN COMPLETE' : 'SHIP LOST', w / 2, h * 0.4, Math.min(74, w * 0.105), COLORS.white, 'center', 900, DISPLAY);
    this.text(ctx, String(this.sim.score).padStart(7, '0'), w / 2, h * 0.54, 44, COLORS.jade, 'center', 900, DISPLAY);
    this.text(ctx, `${Math.floor(this.sim.time/60)}:${String(Math.floor(this.sim.time%60)).padStart(2,'0')}     ·     ${this.sim.kills} TARGETS CLEARED`, w / 2, h * 0.63, Math.min(11, w * 0.025), COLORS.dim, 'center');
    this.text(ctx,`${this.sim.wavesCleared} SWEEPS   ·   BEST CHAIN ×${this.sim.bestReactorChain}`,w/2,h*.68,10,COLORS.gold,'center',600);
    this.text(ctx, 'ENTER / TOUCH TO RETURN', w / 2, h * 0.78, 12, COLORS.jade, 'center', 600);
    this.area('restart', 0, h * 0.65, w, h * 0.35);
  }
  drawUpgrade(ctx, w, h) {
    this.scrim(ctx, w, h, 0.88);
    this.text(ctx, 'CHOOSE A MODULE', w / 2, h * 0.2, Math.min(55, w * 0.1), COLORS.white, 'center', 900, DISPLAY);
    const portrait = w < 600;
    this.sim.upgradeChoices.forEach((u, i) => {
      const x = portrait ? w * 0.25 : w * (0.22 + i * 0.28);
      const y = portrait ? h * (0.36 + i * 0.18) : h * 0.47;
      this.text(ctx, u.glyph, x, y, portrait ? 44 : 78, u.color, 'center', 400, 'serif');
      const tx = portrait ? w * 0.42 : x;
      this.text(ctx, `${i + 1}  ${u.name}`, tx, y + (portrait ? -8 : 78), portrait ? 11 : 12, u.color, portrait ? 'left' : 'center', 600);
      this.text(ctx, u.detail, tx, y + (portrait ? 17 : 105), portrait ? 9 : 10, COLORS.dim, portrait ? 'left' : 'center');
      if (i === this.menuRow) this.line(ctx, portrait ? x - 25 : x - 65, y + (portrait ? 36 : 137), portrait ? w * 0.82 : x + 65, y + (portrait ? 36 : 137), u.color, 2);
      this.area(`upgrade${i}`, portrait ? w * 0.1 : x - w * 0.12, y - 55, portrait ? w * 0.8 : w * 0.24, portrait ? 100 : 220);
    });
  }
  drawSettings(ctx, w, h) {
    this.scrim(ctx, w, h, 0.94);
    this.text(ctx, 'SYSTEM', w / 2, h * 0.19, 52, COLORS.white, 'center', 900, DISPLAY);
    const values = [this.audio.muted ? 'OFF' : 'ON', this.audio.music ? 'ON' : 'OFF', this.sim.reduced ? 'ON' : 'OFF', this.assistedTouch ? 'ASSISTED' : 'TWIN STICK', document.fullscreenElement ? 'EXIT' : 'ENTER', DRONES[this.sim.supportChoice].name];
    settings.forEach((s, i) => {
      const x = w / 2 - Math.min(150, w * 0.33), y = h * 0.34 + i * 46;
      this.text(ctx, s, x, y, 11, i === this.menuRow ? COLORS.white : COLORS.dim, 'left', 600);
      this.text(ctx, values[i], w - x, y, 12, i === this.menuRow ? COLORS.jade : '#6d8f88', 'right', 600);
      this.area(`setting${i}`, x - 20, y - 20, w - x * 2 + 40, 42);
    });
    this.text(ctx, 'ESC / RETURN', w / 2, h * 0.84, 11, COLORS.jade, 'center');
    this.area('closeSettings', w / 2 - 100, h * 0.84 - 25, 200, 50);
  }
  drawTuning(ctx, w, h) {
    const bw = Math.min(w - 20, 310), x = 20;
    ctx.fillStyle = '#040b12ee'; ctx.fillRect(x, 135, bw, Math.min(h - 145, 412));
    this.text(ctx, 'LIVE TUNING  /  ` TO CLOSE', x + 12, 155, 11, COLORS.gold);
    tuning.forEach((key, i) => {
      const y = 185 + i * 26;
      this.text(ctx, `${this.tuningRow === i ? '›' : ' '} ${key}`, x + 12, y, 10, i === this.tuningRow ? COLORS.jade : COLORS.dim);
      this.text(ctx, CONFIG[key].toFixed(3).replace(/0+$/, '').replace(/\.$/, ''), x + bw - 15, y, 11, COLORS.white, 'right');
      this.area(`tune${i}`, x, y - 12, bw, 25);
    });
    this.text(ctx, '↑ ↓ SELECT · ← → ADJUST · C COPY', x + 12, 513, 9, COLORS.dim);
  }
  adjustTuning(dir) {
    const key = tuning[this.tuningRow], current = CONFIG[key];
    CONFIG[key] = Math.max(0.001, current + dir * (current < 1 ? 0.01 : current < 5 ? 0.1 : 1));
    if (key === 'volume' && this.audio.ctx) this.audio.master.gain.setTargetAtTime(this.audio.muted ? 0 : Math.min(1, CONFIG.volume), this.audio.ctx.currentTime, 0.03);
  }
}
