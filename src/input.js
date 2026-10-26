import { WEAPONS } from './config.js';

export const radialStick=(x,z,deadzone=.18)=>{const length=Math.hypot(x,z),amount=Math.min(1,Math.max(0,(length-deadzone)/(1-deadzone)));return length>deadzone?{x:x/length*amount,z:z/length*amount}:{x:0,z:0};};

// Render frames can be faster than the fixed simulation. Keep edges until one
// simulation step consumes them, without replaying them during catch-up steps.
export class GameplayInputBuffer {
  constructor() { this.clear(); }
  clear() { this.dash=false;this.burst=false;this.weapon=undefined; }
  capture(frame, active=true) {
    if(!active){this.clear();return;}
    this.dash ||= frame.dash;this.burst ||= frame.burst;
    if(Number.isInteger(frame.weapon))this.weapon=frame.weapon;
  }
  consume(frame) {
    const result={...frame,dash:this.dash,burst:this.burst,weapon:this.weapon};
    this.clear();return result;
  }
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set();
    this.mouse = { x: 0.5, y: 0.5, down: false, active: false };
    this.touches = new Map(); this.touch = false; this.actions = [];
    this.left = null; this.right = null; this.padButtons = []; this.menu = false; this.padNav = 0;
    for(const event of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(event,e=>e.preventDefault());
    window.addEventListener('keydown', e => {
      canvas.dataset.lastKey = `${e.code}/${e.key}`;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    canvas.addEventListener('pointerdown', e => {e.preventDefault();this.pointerDown(e);},{passive:false});
    canvas.addEventListener('pointermove', e => this.pointerMove(e));
    canvas.addEventListener('pointerup', e => this.pointerUp(e));
    canvas.addEventListener('pointercancel', e => this.pointerUp(e,true));
    canvas.addEventListener('lostpointercapture', e => this.cancelPointer(e.pointerId));
    window.addEventListener('gamepaddisconnected', () => { this.padButtons = []; });
  }
  pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  }
  pointerDown(e) {
    this.canvas.dataset.lastPointer = `${e.pointerType}/${e.clientX}/${e.clientY}`;
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.pos(e);
    if ((e.pointerType === 'touch'||e.pointerType === 'pen')) {
      this.touch = true;
      const t = { id: e.pointerId, x: p.x, y: p.y, ox: p.x, oy: p.y, sx:p.x,sy:p.y,dragged:false,nx: p.nx, ny: p.ny,role:null };
      this.touches.set(e.pointerId, t);
      if(this.touches.size>1)for(const contact of this.touches.values())contact.multi=true;
      const safe=this.layout?.safe;
      if(safe&&(p.x<safe.x||p.x>safe.x+safe.width||p.y<safe.y||p.y>safe.y+safe.height)){t.button=true;return;}
      const action=this.onTouchButton?.(p.nx,p.ny);
      if(action){t.button=true;t.attack=action==='strike';return;}
      const midpoint=safe?safe.x+safe.width/2:this.canvas.getBoundingClientRect().width/2;
      if (p.x < midpoint && !this.left) {this.left = t;t.role='move';}
      else if (p.x >= midpoint && !this.right) {this.right = t;t.role='aim';}
    } else {
      this.touch = false;
      this.mouse.x = p.nx; this.mouse.y = p.ny; this.mouse.active = true;
      this.mouse.press={id:e.pointerId,x:p.x,y:p.y,button:e.button,time:performance.now(),dragged:false};
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) this.pressed.add('Burst');
    }
  }
  pointerMove(e) {
    const p = this.pos(e);
    if ((e.pointerType === 'touch'||e.pointerType === 'pen')) {
      const t = this.touches.get(e.pointerId);
      if(t){
        t.x=p.x;t.y=p.y;t.nx=p.nx;t.ny=p.ny;
        t.dragged ||= Math.hypot(t.x-t.sx,t.y-t.sy)>=12;
        const radius=this.layout?.stickRadius||52;
        if(!t.button){const dx=t.x-t.ox,dy=t.y-t.oy,length=Math.hypot(dx,dy);if(length>radius){t.ox=t.x-dx/length*radius;t.oy=t.y-dy/length*radius;}}
      }
    } else { this.mouse.x = p.nx; this.mouse.y = p.ny; this.mouse.active = true;if(this.mouse.press)this.mouse.press.dragged ||= Math.hypot(p.x-this.mouse.press.x,p.y-this.mouse.press.y)>=12; }
  }
  pointerUp(e,cancelled=false) {
    const p=this.pos(e);
    if ((e.pointerType === 'touch'||e.pointerType === 'pen')) {
      const t=this.touches.get(e.pointerId);
      if(t&&!cancelled&&!t.button&&!t.dragged&&!t.multi&&Math.hypot(p.x-t.sx,p.y-t.sy)<12)this.actions.push({type:'navigate',x:p.nx,y:p.ny});
      if (this.left?.id === e.pointerId) this.left = null;
      if (this.right?.id === e.pointerId) this.right = null;
      this.touches.delete(e.pointerId);
    } else if (e.button === 0){
      if(!cancelled&&this.mouse.press?.button===0&&!this.mouse.press.dragged&&performance.now()-this.mouse.press.time<280&&Math.hypot(p.x-this.mouse.press.x,p.y-this.mouse.press.y)<12)this.actions.push({type:'navigate',x:p.nx,y:p.ny});
      this.mouse.down=false;this.mouse.press=null;
    }
  }
  cancelPointer(id) {
    if(this.left?.id===id)this.left=null;
    if(this.right?.id===id)this.right=null;
    this.touches.delete(id);
    if(this.mouse.press?.id===id){this.mouse.down=false;this.mouse.press=null;}
  }
  clear() { this.keys.clear(); this.pressed.clear();this.actions.length=0; this.mouse.down = false;this.mouse.active=false;this.mouse.press=null; this.left = null; this.right = null; this.touches.clear();this.onClear?.(); }
  just(code) { return this.pressed.has(code); }
  down(...codes) { return codes.some(c => this.keys.has(c)); }
  getFrame(worldPoint) {
    let moveX = Number(this.down('KeyD', 'ArrowRight')) - Number(this.down('KeyA', 'ArrowLeft'));
    let moveZ = Number(this.down('KeyW', 'ArrowUp')) - Number(this.down('KeyS', 'ArrowDown'));
    let aimX = worldPoint?.x, aimZ = worldPoint?.z, aimAngle=worldPoint?.screenAngle,manualAim=this.mouse.down&&this.mouse.active&&!this.touch&&Number.isFinite(worldPoint?.screenAngle);
    let fire = this.mouse.down || this.down('KeyJ') || this.just('Strike') || [...this.touches.values()].some(t=>t.attack), assist = this.down('KeyJ')&&!this.mouse.active;
    if (this.left) {
      const radius=this.layout?.stickRadius||52,move=radialStick((this.left.x-this.left.ox)/radius,(this.left.oy-this.left.y)/radius,.10);moveX=move.x;moveZ=move.z;
      aimX = undefined; aimZ = undefined; assist = true;
    }
    if (this.right) {
      const dx = this.right.x - this.right.ox, dy = -(this.right.y - this.right.oy);
      if (Math.hypot(dx, dy) > 9) { aimAngle = Math.atan2(dx, dy);manualAim=true; fire = true; assist = false; }
      aimX = undefined; aimZ = undefined;
    }
    let dash = this.just('Space') || this.just('ShiftLeft') || this.just('Dash');
    let burst = this.just('KeyE') || this.just('Burst');
    let weapon = WEAPONS.map((_,i)=>i).find(i => this.just(`Digit${i + 1}`));
    const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p&&p.connected!==false);
    if (pad) {
      const left=radialStick(pad.axes[0]||0,-(pad.axes[1]||0)),lx=left.x,ly=left.z;
      if (Math.hypot(lx, ly) > 0) { moveX = lx; moveZ = ly; aimX = undefined; aimZ = undefined;aimAngle=undefined; assist = true; }
      const right=radialStick(pad.axes[2]||0,-(pad.axes[3]||0)),rx=right.x,ry=right.z;
      if (Math.hypot(rx, ry) > .05) { aimAngle = Math.atan2(rx, ry);manualAim=true; aimX = undefined; aimZ = undefined; fire = true; assist = false; }
      const just = i => pad.buttons[i]?.pressed && !this.padButtons[i];
      dash ||= just(0)||just(7); burst ||= just(1) || just(6);
      fire ||= !!pad.buttons[7]?.pressed || !!pad.buttons[2]?.pressed;
      if (just(4)) weapon = -1; if (just(5)) weapon = -2;
      if (just(9)) this.pressed.add('Escape');
      if (just(0)) this.pressed.add('Enter');
      if (this.menu && just(1)) this.pressed.add('Escape');
      for (const [button, code] of [[12, 'ArrowUp'], [13, 'ArrowDown'], [14, 'ArrowLeft'], [15, 'ArrowRight']]) if (just(button)) this.pressed.add(code);
      const nav = Math.abs(lx) > 0.6 ? Math.sign(lx) : Math.abs(ly) > 0.6 ? -Math.sign(ly) * 2 : 0;
      if (this.menu && nav && nav !== this.padNav) this.pressed.add(({ '-2': 'ArrowUp', '2': 'ArrowDown', '-1': 'ArrowLeft', '1': 'ArrowRight' })[nav]);
      this.padNav = nav;
      this.padButtons = pad.buttons.map(b => b.pressed);
    }
    return { moveX, moveZ, aimX, aimZ, aimAngle, manualAim, fire, assist, dash, burst, weapon };
  }
  endFrame() { this.pressed.clear(); this.actions.length = 0; }
}
