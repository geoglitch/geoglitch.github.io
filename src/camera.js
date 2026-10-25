import { Vector3, Matrix, Quaternion } from '../vendor/babylon-core.js';
import { add, mul, dot, unit } from './surface.js';
const v=p=>new Vector3(p.x,p.y,p.z);

// Find a continuous boom length rather than jumping out in six-unit steps.
export function clearanceRadius(surface,origin,direction,up,base,height,clearance) {
  const eye=r=>origin.add(direction.scale(r)).add(up.scale(height));
  if(surface.distance(eye(base))>=clearance)return base;
  let lo=base,hi=base+8;
  while(hi<190&&surface.distance(eye(hi))<clearance){lo=hi;hi+=8;}
  for(let i=0;i<10;i++){const mid=(lo+hi)/2;if(surface.distance(eye(mid))<clearance)lo=mid;else hi=mid;}
  return hi;
}

export class CameraRig {
  reset(){this.rotation=null;this.focus=null;this.radius=null;this.lastPosition=null;this.step=0;this.orbitSpeed=0;this.focusBias=null;}
  constructor(){this.reset();}
  update(surface,width,height,dt){
    const portrait=width/height<.85,view=surface.viewFrame(),normal=view.normal,right=unit(add(surface.right,mul(normal,-dot(surface.right,normal)))),up=Vector3.Cross(v(right),v(normal)).normalize();
    const basis=Matrix.Identity();Matrix.FromXYZAxesToRef(v(right),up,v(mul(normal,-1)),basis);
    const desired=Quaternion.FromRotationMatrix(basis);
    if(this.rotation){const angle=2*Math.acos(Math.min(1,Math.abs(Quaternion.Dot(this.rotation,desired)))),limit=Math.min(4,120/Math.max(37,this.radius||37));this.orbitSpeed+=(Math.min(limit,angle*10)-this.orbitSpeed)*(1-Math.exp(-dt*12));this.rotation=Quaternion.Slerp(this.rotation,desired,Math.min(1,dt*this.orbitSpeed/Math.max(.0001,angle)));}
    else this.rotation=desired;
    this.angleError=2*Math.acos(Math.min(1,Math.abs(Quaternion.Dot(this.rotation,desired))));
    const matrix=Matrix.Identity();this.rotation.toRotationMatrix(matrix);
    const outward=Vector3.TransformNormal(new Vector3(0,0,-1),matrix),screenUp=Vector3.TransformNormal(Vector3.Up(),matrix);
    const desiredBias=portrait?Math.max(-4,Math.min(4,Vector3.Dot(v(view.point).scale(-1),screenUp)*.35)):2;
    this.focusBias=this.focusBias===null?desiredBias:this.focusBias+(desiredBias-this.focusBias)*(1-Math.exp(-dt*3));
    const focusOffset=this.focusBias,boomHeight=(portrait?3:8)-focusOffset;
    const target=v(view.point).add(screenUp.scale(focusOffset));
    this.focus=this.focus?Vector3.Lerp(this.focus,target,1-Math.exp(-dt*8)):target;
    const base=portrait?38:37,safe=clearanceRadius(surface,this.focus,outward,screenUp,base,boomHeight,7),minimum=clearanceRadius(surface,this.focus,outward,screenUp,base,boomHeight,2.5);
    this.radius=Math.max(minimum,this.radius===null?safe:this.radius+(safe-this.radius)*(1-Math.exp(-dt*(safe>this.radius?12:1.8))));
    const position=this.focus.add(outward.scale(this.radius)).add(screenUp.scale(boomHeight));
    this.step=this.lastPosition?Vector3.Distance(position,this.lastPosition):0;this.lastPosition=position;
    return {position,target:this.focus,up:screenUp,fov:portrait?.95:.87};
  }
}
