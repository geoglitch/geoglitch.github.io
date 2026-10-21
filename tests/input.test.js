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
  f=i.getFrame();assert.equal(f.moveX,1);assert.equal(f.moveZ,1);assert.equal(f.fire,true);assert.ok(f.aimAngle>0);
  i.pointerUp(pointer(1,122,548));assert.equal(i.left,null);assert.ok(i.right);
  i.pointerDown(pointer(3,50,610));f=i.getFrame();assert.equal(f.moveX,0);assert.equal(f.moveZ,0);
});
test('gamepad twin sticks, triggers, weapon bumpers and menu navigation map correctly',()=>{
  const i=new Input(new FakeTarget());
  const buttons=Array.from({length:16},()=>({pressed:false}));pad={axes:[.8,-.6,.7,.2],buttons};
  let f=i.getFrame();assert.equal(f.moveX,.8);assert.equal(f.moveZ,.6);assert.equal(f.fire,true);
  buttons[7].pressed=true;buttons[6].pressed=true;buttons[5].pressed=true;
  f=i.getFrame();assert.equal(f.dash,false);assert.equal(f.fire,true);assert.equal(f.burst,true);assert.equal(f.weapon,-2);
  i.endFrame();f=i.getFrame();assert.equal(f.dash,false);
  buttons[13].pressed=true;i.menu=true;pad.axes=[0,0,0,0];i.getFrame();assert.equal(i.just('ArrowDown'),true);
  i.endFrame();buttons[0].pressed=true;i.getFrame();assert.equal(i.just('Enter'),true);
  pad=null;
});
test('keyboard movement, weapon selection, dash and burst are independent actions',()=>{
  const i=new Input(new FakeTarget());i.keys.add('KeyW');i.keys.add('KeyD');i.pressed.add('Space');i.pressed.add('KeyE');i.pressed.add('Digit3');
  const f=i.getFrame({x:6,z:8});assert.equal(f.moveX,1);assert.equal(f.moveZ,1);assert.equal(f.dash,true);assert.equal(f.burst,true);assert.equal(f.weapon,2);assert.equal(f.aimX,6);
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
