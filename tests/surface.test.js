import test from 'node:test';
import assert from 'node:assert/strict';
import { Surface, dot } from '../src/surface.js';
import { Simulation } from '../src/simulation.js';
import { CONFIG } from '../src/config.js';

test('navigation stays on all six 3D surfaces and maintains an orthonormal control frame', () => {
  for (let shape = 0; shape < 6; shape++) {
    const s = new Surface(); s.from = shape; s.to = shape; s.advance(0, 0);
    for (let i = 0; i < 900; i++) {
      s.time += 1 / 60; s.advance(Math.sin(i * 0.01) * 0.11, 0.12);
      assert.ok(Math.abs(s.distance(s.anchor)) < 0.03, `shape ${shape} left its surface`);
      assert.ok(Math.abs(dot(s.right, s.normal)) < 0.002);
      assert.ok(Math.abs(dot(s.up, s.normal)) < 0.002);
      assert.ok(Math.abs(dot(s.right, s.up)) < 0.002);
      assert.ok(Number.isFinite(s.anchor.y));
    }
    assert.ok(s.travel > 100);
  }
});
test('all fifty level transitions support moving while the world changes shape', () => {
  const s = new Surface();
  for (let level = 1; level <= 50; level++) for (let i = 0; i < 260; i++) {
    s.update(1 / 60, level); s.advance(0.05, 0.07);
    assert.ok(Number.isFinite(s.anchor.x + s.anchor.y + s.anchor.z));
    assert.ok(Math.abs(s.distance(s.anchor)) < 0.15);
  }
});
test('surface ray picking targets real solid geometry and holes remain open', () => {
  const s = new Surface();
  const hit = s.raycast({x:10,y:0,z:-60},{x:0,y:0,z:1});
  assert.ok(Math.abs(s.distance(hit)) < 0.05);
  assert.ok(hit.z < 0);
});
test('projection escapes a cancelled gradient and the ship origin remains on its anchor',()=>{
  const s=new Surface();s.from=4;s.to=4;s.mix=1;s.floorPhase=0;
  const root=s.project({x:0,y:0,z:0},8);assert.ok(Math.abs(s.distance(root))<.01);
  s.anchor=root;s.normal={x:1,y:0,z:0};const mapped=s.map(0,0,.85);
  assert.deepEqual(mapped.point,{x:root.x+.85,y:root.y,z:root.z});assert.deepEqual(mapped.normal,s.normal);
});
test('recentring preserves collision distances and smoothly transfers travel to the 3D surface', () => {
  const sim = new Simulation(1); sim.start(); sim.curvedWorld = true;
  const surface = new Surface(); const before = {...surface.anchor};
  for (let i=0;i<120;i++) {
    sim.update(CONFIG.step,{moveX:1,moveZ:0,fire:true});
    const relative = sim.enemies[0].x - sim.player.x;
    const {dx,dz}=sim.recenter(); surface.advance(dx,dz);
    assert.ok(Math.abs(sim.enemies[0].x-relative)<0.00001);
    assert.equal(sim.player.x,0);
    sim.events.length=0;
  }
  assert.ok(surface.travel>20);assert.ok(Math.hypot(surface.anchor.x-before.x,surface.anchor.y-before.y,surface.anchor.z-before.z)>.1);
});
