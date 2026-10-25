import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/input.js';

class FakeTarget {
  constructor() { this.listeners = {}; this.dataset = {}; }
  addEventListener(name,fn) { this.listeners[name] = fn; }
  setPointerCapture() {}
  focus() {}
  getBoundingClientRect() { return {left:0,top:0,width:400,height:800}; }
}
globalThis.window = new FakeTarget();
let pad = null;
Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[pad]},configurable:true});
const pointer = (id,x,y) => ({pointerType:'touch',pointerId:id,clientX:x,clientY:y,button:0});
test('floating touch sticks do not move on first contact and handle two thumbs independently',()=>{
  const i=new Input(new FakeTarget());
  i.pointerDown(pointer(1,70,600));
  let f=i.getFrame(); assert.equal(f.moveX,0);assert.equal(f.moveZ,0);assert.equal(f.assist,true);
  i.pointerMove(pointer(1,122,548)); i.pointerDown(pointer(2,270,600)); i.pointerMove(pointer(2,310,580));
  f=i.getFrame();assert.ok(Math.abs(f.moveX-Math.SQRT1_2)<1e-9);assert.ok(Math.abs(f.moveZ-Math.SQRT1_2)<1e-9);assert.equal(f.manualAim,true);assert.equal(f.fire,true);assert.ok(f.aimAngle>0);
  i.pointerUp(pointer(1,122,548));assert.equal(i.left,null);assert.ok(i.right);
  i.pointerDown(pointer(3,50,610));f=i.getFrame();assert.equal(f.moveX,0);assert.equal(f.moveZ,0);
});
test('gamepad twin sticks, triggers, weapon bumpers and menu navigation map correctly',()=>{
  const i=new Input(new FakeTarget());
  const buttons=Array.from({length:16},()=>({pressed:false}));pad={axes:[.8,-.6,.7,.2],buttons};
  let f=i.getFrame();assert.equal(f.moveX,.8);assert.equal(f.moveZ,.6);assert.equal(f.fire,true);
  buttons[7].pressed=true;buttons[6].pressed=true;buttons[5].pressed=true;
  f=i.getFrame();assert.equal(f.dash,true);assert.equal(f.fire,true);assert.equal(f.burst,true);assert.equal(f.weapon,-2);
  i.endFrame();f=i.getFrame();assert.equal(f.dash,false);
  buttons[13].pressed=true;i.menu=true;pad.axes=[0,0,0,0];i.getFrame();assert.equal(i.just('ArrowDown'),true);
  i.endFrame();buttons[0].pressed=true;i.getFrame();assert.equal(i.just('Enter'),true);
  pad=null;
});
test('keyboard movement, weapon selection, dash and burst are independent actions',()=>{
  const i=new Input(new FakeTarget());i.keys.add('KeyW');i.keys.add('KeyD');i.pressed.add('Space');i.pressed.add('KeyE');i.pressed.add('Digit3');
  const f=i.getFrame({x:6,z:8});assert.equal(f.moveX,1);assert.equal(f.moveZ,1);assert.equal(f.dash,true);assert.equal(f.burst,true);assert.equal(f.weapon,2);assert.equal(f.aimX,6);
});
test('controller speed starts continuously outside its dead zone and retains fine diagonal steering',()=>{
  const i=new Input(new FakeTarget()),buttons=Array.from({length:16},()=>({pressed:false}));
  pad={axes:[.17,0,0,0],buttons};assert.equal(i.getFrame().moveX,0);
  pad.axes[0]=.1801;assert.ok(i.getFrame().moveX>0&&i.getFrame().moveX<.001);
  pad.axes=[.01,-.6,0,0];const f=i.getFrame();assert.ok(f.moveX>0);assert.ok(f.moveZ>.5&&f.moveZ<.6);pad=null;
});
test('a tap creates a navigation destination while a joystick drag does not',()=>{
  const i=new Input(new FakeTarget());i.pointerDown(pointer(1,180,420));i.pointerUp(pointer(1,180,420));
  assert.ok(i.actions.some(a=>a.type==='navigate'&&a.x===.45&&a.y===.525));
  i.endFrame();i.pointerDown(pointer(2,70,600));i.pointerMove(pointer(2,130,540));i.pointerUp(pointer(2,130,540));
  assert.equal(i.actions.some(a=>a.type==='navigate'),false);
});
test('new ship and ribbon weapons can be selected with the keyboard',()=>{
  const i=new Input(new FakeTarget());i.pressed.add('Digit8');assert.equal(i.getFrame().weapon,7);i.endFrame();i.pressed.add('Digit9');assert.equal(i.getFrame().weapon,8);
});
test('a long dragged touch follows the thumb without exceeding radial speed or becoming a tap',()=>{
  const i=new Input(new FakeTarget());i.pointerDown(pointer(1,45,620));i.pointerMove(pointer(1,230,460));
  const f=i.getFrame();assert.ok(Math.abs(Math.hypot(f.moveX,f.moveZ)-1)<1e-9);assert.ok(i.left.ox>45);
  i.pointerMove(pointer(1,45,620));i.pointerUp(pointer(1,45,620));assert.equal(i.actions.some(a=>a.type==='navigate'),false);
});
test('cancelled touches and secondary mouse clicks never choose a destination or menu item',()=>{
  const i=new Input(new FakeTarget());i.pointerDown(pointer(1,100,400));i.endFrame();i.pointerUp(pointer(1,100,400),true);assert.equal(i.actions.length,0);
  i.pointerDown({pointerType:'mouse',pointerId:2,clientX:100,clientY:400,button:2});assert.equal(i.actions.length,0);assert.equal(i.just('Burst'),true);
});
test('right-stick aim overrides travel-facing direction only on deliberate input and finds a connected pad',()=>{
  const i=new Input(new FakeTarget());pad={axes:[.8,0,.3,-.5],buttons:[]};let f=i.getFrame();assert.equal(f.manualAim,true);assert.ok(f.moveX>0&&f.aimAngle>0);
  pad.axes=[.8,0,.15,.01];f=i.getFrame();assert.equal(f.manualAim,false);pad=null;
});
test('holding the mouse deliberately aims while travelling and a released aim never becomes a navigation tap',()=>{
  const i=new Input(new FakeTarget()),down={pointerType:'mouse',pointerId:1,clientX:250,clientY:250,button:0};
  i.keys.add('KeyS');i.pointerDown(down);i.mouse.press.time-=400;
  const f=i.getFrame({screenAngle:Math.PI/4});assert.equal(f.manualAim,true);assert.equal(f.moveZ,-1);assert.equal(f.aimAngle,Math.PI/4);
  i.endFrame();i.pointerUp(down);assert.equal(i.actions.some(a=>a.type==='navigate'),false);
  assert.equal(i.getFrame({screenAngle:1}).manualAim,false);
});
test('a mouse drag that returns to its starting point still does not become a destination',()=>{
  const i=new Input(new FakeTarget()),p={pointerType:'mouse',pointerId:1,clientX:100,clientY:400,button:0};i.pointerDown(p);
  i.pointerMove({...p,clientX:180});i.pointerMove(p);i.endFrame();i.pointerUp(p);assert.equal(i.actions.length,0);
});
