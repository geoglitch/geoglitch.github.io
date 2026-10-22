import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutWeaponBeacons } from '../src/weapon-beacons.js';

for (const [width, height] of [[1280,720],[390,844],[320,568],[844,390]]) {
  test(`six overlapping pickup projections remain distinct and tappable at ${width}×${height}`, () => {
    const entries = Array.from({length:6},(_,id)=>({id,x:width/2,y:height/2,inside:true,weapon:id}));
    const marks = layoutWeaponBeacons(entries,width,height);
    assert.equal(marks.length,6);
    for (const mark of marks) {
      assert.ok(mark.size>=44);
      assert.ok(mark.x-mark.size/2>=8 && mark.x+mark.size/2<=width-8);
      assert.ok(mark.y-mark.size/2>=height*.24);
      assert.ok(mark.y+mark.size/2<=height-Math.min(180,height*.28));
      for (const other of marks.filter(m=>m.id!==mark.id)) assert.ok(Math.abs(mark.x-other.x)>=(mark.size+other.size)/2+6 || Math.abs(mark.y-other.y)>=(mark.size+other.size)/2+6);
    }
    assert.deepEqual(layoutWeaponBeacons([...entries].reverse(),width,height),marks);
  });
}
test('selected equipment has first choice while markers avoid gate and boss controls', () => {
  const entries=[{id:9,x:50,y:220,inside:false},{id:2,x:50,y:220,inside:false,selected:true},{id:3,x:-500,y:5000,inside:true}];
  const obstacles=[{x:50,y:220,size:50}];
  const marks=layoutWeaponBeacons(entries,390,844,obstacles);
  assert.equal(marks[0].id,2);
  assert.equal(marks.find(m=>m.id===9).id,9);
  for(const mark of marks)assert.ok(Math.abs(mark.x-50)>=(mark.size+50)/2+2 || Math.abs(mark.y-220)>=(mark.size+50)/2+2);
});
test('markers protect the projected ship position when camera framing puts it below screen center',()=>{
  const ship={x:195,y:440},marks=layoutWeaponBeacons([{id:1,x:ship.x,y:ship.y,inside:true}],390,690,[],ship);
  const mark=marks[0];assert.ok(Math.abs(mark.x-ship.x)>=mark.size/2+42 || Math.abs(mark.y-ship.y)>=mark.size/2+42);
});
