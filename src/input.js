import { WEAPONS } from './config.js';

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
    canvas.addEventListener('pointercancel', e => this.pointerUp(e));
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
    this.actions.push({ type: 'tap', x: p.nx, y: p.ny, button: e.button });
    if (e.pointerType === 'touch') {
      this.touch = true;
      const t = { id: e.pointerId, x: p.x, y: p.y, ox: p.x, oy: p.y, nx: p.nx, ny: p.ny };
      this.touches.set(e.pointerId, t);
      const action=this.onTouchButton?.(p.nx,p.ny);
      if(action){t.button=true;t.attack=action==='strike';return;}
      if (p.nx < 0.5 && !this.left) this.left = t;
      else if (!this.right) this.right = t;
    } else {
      this.mouse.x = p.nx; this.mouse.y = p.ny; this.mouse.active = true;
      this.mouse.press={x:p.x,y:p.y,button:e.button};
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) this.pressed.add('Burst');
    }
  }
  pointerMove(e) {
    const p = this.pos(e);
    if (e.pointerType === 'touch') {
      const t = this.touches.get(e.pointerId);
      if (t) { t.x = p.x; t.y = p.y; t.nx = p.nx; t.ny = p.ny; }
    } else { this.mouse.x = p.nx; this.mouse.y = p.ny; this.mouse.active = true; }
  }
  pointerUp(e) {
    const p=this.pos(e);
    if (e.pointerType === 'touch') {
      const t=this.touches.get(e.pointerId);
      if(t&&!t.button&&Math.hypot(t.x-t.ox,t.y-t.oy)<12)this.actions.push({type:'navigate',x:p.nx,y:p.ny});
      if (this.left?.id === e.pointerId) this.left = null;
      if (this.right?.id === e.pointerId) this.right = null;
      this.touches.delete(e.pointerId);
    } else if (e.button === 0){
      if(this.mouse.press?.button===0&&Math.hypot(p.x-this.mouse.press.x,p.y-this.mouse.press.y)<12)this.actions.push({type:'navigate',x:p.nx,y:p.ny});
      this.mouse.down=false;this.mouse.press=null;
    }
  }
  clear() { this.keys.clear(); this.pressed.clear(); this.mouse.down = false;this.mouse.press=null; this.left = null; this.right = null; this.touches.clear(); }
  just(code) { return this.pressed.has(code); }
  down(...codes) { return codes.some(c => this.keys.has(c)); }
  getFrame(worldPoint) {
    let moveX = Number(this.down('KeyD', 'ArrowRight')) - Number(this.down('KeyA', 'ArrowLeft'));
    let moveZ = Number(this.down('KeyW', 'ArrowUp')) - Number(this.down('KeyS', 'ArrowDown'));
    let aimX = worldPoint?.x, aimZ = worldPoint?.z, aimAngle=worldPoint?.screenAngle;
    let fire = this.mouse.down || this.down('KeyJ') || this.just('Strike') || [...this.touches.values()].some(t=>t.attack), assist = this.down('KeyJ')&&!this.mouse.active;
    if (this.left) {
      moveX = Math.max(-1, Math.min(1, (this.left.x - this.left.ox) / 52));
      moveZ = Math.max(-1, Math.min(1, (this.left.oy - this.left.y) / 52));
      aimX = undefined; aimZ = undefined; assist = true;
    }
    if (this.right) {
      const dx = this.right.x - this.right.ox, dy = -(this.right.y - this.right.oy);
      if (Math.hypot(dx, dy) > 9) { aimAngle = Math.atan2(dx, dy); fire = true; assist = false; }
      aimX = undefined; aimZ = undefined;
    }
    let dash = this.just('Space') || this.just('ShiftLeft') || this.just('Dash');
    let burst = this.just('KeyE') || this.just('Burst');
    let weapon = WEAPONS.map((_,i)=>i).find(i => this.just(`Digit${i + 1}`));
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const dead = v => Math.abs(v) < 0.18 ? 0 : v;
      const lx = dead(pad.axes[0] || 0), ly = dead(-(pad.axes[1] || 0));
      if (Math.hypot(lx, ly) > 0) { moveX = lx; moveZ = ly; aimX = undefined; aimZ = undefined;aimAngle=undefined; assist = true; }
      const rx = dead(pad.axes[2] || 0), ry = dead(-(pad.axes[3] || 0));
      if (Math.hypot(rx, ry) > 0.2) { aimAngle = Math.atan2(rx, ry); aimX = undefined; aimZ = undefined; fire = true; assist = false; }
      const just = i => pad.buttons[i]?.pressed && !this.padButtons[i];
      dash ||= just(0); burst ||= just(1) || just(6);
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
    return { moveX, moveZ, aimX, aimZ, aimAngle, fire, assist, dash, burst, weapon };
  }
  endFrame() { this.pressed.clear(); this.actions.length = 0; }
}
