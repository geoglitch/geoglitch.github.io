import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRenderer } from '../src/renderer.js';
import { Vector3, Quaternion } from '../vendor/babylon-core.js';

test('every equipment preview stays compact at a terrain seam, independent of neighboring projections',()=>{
  const origin=new Vector3(7,-12,19),rotation=Quaternion.RotationYawPitchRoll(.7,.5,-.4);
  const right=Vector3.Right().applyRotationQuaternion(rotation),normal=Vector3.Up().applyRotationQuaternion(rotation),forward=Vector3.Forward().applyRotationQuaternion(rotation);
  for(let weapon=0;weapon<9;weapon++)for(const time of[0,1.7,13.2]){
    const points=[];
    const renderer={width:390,height:844,navigationEntity:{type:'weapon',id:7},screenPoint:()=>({visible:true,x:195,y:400}),frame:()=>({point:origin,normal,right,forward,rotation}),
      lines:{line:(a,b)=>points.push(a,b)},solid:(kind,frame)=>points.push(frame.point),string:(a,b)=>points.push(a,b),ring:()=>{throw new Error('resampling a decal across a seam can create long streaks');}};
    GameRenderer.prototype.weaponPickup.call(renderer,{weapon,id:7,x:14,z:14},time);
    assert.ok(points.length>50);
    for(const point of points){assert.ok(Number.isFinite(point.x+point.y+point.z));assert.ok(Vector3.Distance(point,origin)<4,`weapon ${weapon} escaped its display`);}
  }
});
