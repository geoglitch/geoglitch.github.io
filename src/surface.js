// Implicit 3D manifolds, shared by rendering, camera transport and navigation.
// There is no flat arena: movement parallel-transports along a changing surface.
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const add = (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z);
export const mul = (v, s) => V(v.x * s, v.y * s, v.z * s);
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const unit = p => mul(p, 1 / Math.max(0.00001, Math.hypot(p.x, p.y, p.z)));
const mix = (a, b, t) => a + (b - a) * t;

export function shapeDistance(p, shape, time = 0, floorPhase = 0) {
  let x = p.x, y = p.y, z = p.z;
  if (shape === 0) { // A huge upright ring, stretched for a portrait screen.
    return Math.hypot(Math.hypot(x, y / 1.48) - 12.5, z) - 5.3;
  }
  if (shape === 1) { // Bevelled monolith: genuinely connected faces and edges.
    const qx = Math.abs(x) - 10, qy = Math.abs(y) - 18, qz = Math.abs(z) - 10;
    const body=Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 2.1;
    const lx=Math.abs(x)-12.2,ly=Math.abs(Math.abs(y)-10)-2.2,lz=Math.abs(z)-11.3;
    const ledge=Math.hypot(Math.max(lx,0),Math.max(ly,0),Math.max(lz,0))+Math.min(Math.max(lx,ly,lz),0)-1.1;
    return Math.min(body,ledge);
  }
  if (shape === 2) { // Deep elliptical globe.
    return (Math.hypot(x / 14, y / 22, z / 14) - 1) * 14;
  }
  if (shape === 3) { // A rotating, twisted column.
    const a = y * 0.065 + time * 0.035, c = Math.cos(a), s = Math.sin(a);
    const xx = c * x - s * z, zz = s * x + c * z;
    const qx = Math.abs(xx) - 8.5, qy = Math.abs(y) - 22, qz = Math.abs(zz) - 8.5;
    return (Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 3) * 0.75;
  }
  if (shape === 4) { // Separating/rejoining lobes keep a continuous 7.6-unit bridge.
    const split=Math.sin(time*.19+floorPhase*.35)*.5+.5,sep=8+split*8,radius=13-split*2;
    const a=Math.hypot(x,y-sep,z)-radius,b=Math.hypot(x,y+sep,z)-radius;
    const bridge=Math.hypot(x,Math.max(Math.abs(y)-(sep-3),0),z)-3.8;
    return Math.min(a,b,bridge);
  }
  // A contorted ring; asymmetric mass, passageways and a rotating waist.
  const yy = y / 1.55, bend = Math.sin(yy * 0.16 + time * 0.12) * 3;
  return (Math.hypot(Math.hypot(x + bend, yy) - 11, z * 0.85) - (4.5 + Math.sin(Math.atan2(yy, x) * 3 + time * 0.15) * 1.4)) * 0.7;
}

export class Surface {
  constructor() {
    this.from = 1; this.to = 1; this.mix = 1; this.time = 0; this.level = 1;
    this.anchor = V(2, -12, -13); this.normal = V(0, 0, -1);
    this.right = V(1, 0, 0); this.up = V(0, 1, 0); this.travel = 0;
    this.floorPhase=0;this.floorTarget=0;this.pulseAge=10;this.pulseOrigin={...this.anchor};
    this.worldScale=1.05;this.scaleTarget=1.05;
    this.morphProgress=1;this.blocked=false;this.gateCenters=[];this.landingCenters=[];this.route=[];this.routeAge=10;
  }
  triggerPulse() {this.floorTarget+=Math.PI/2;this.pulseAge=0;this.pulseOrigin={...this.anchor};}
  pulseOffset(p) {
    if(this.pulseAge>2.8)return 0;
    const d=Math.hypot(p.x-this.pulseOrigin.x,p.y-this.pulseOrigin.y,p.z-this.pulseOrigin.z);
    const wave=d-this.pulseAge*15;
    return Math.exp(-wave*wave/8)*Math.cos(wave*.8)*1.8*Math.max(0,1-this.pulseAge/2.8);
  }
  ridgeHeight(p){
    const ridge=Math.max(0,Math.sin(p.y*.35+Math.sin(p.x*.15)*.8+this.floorPhase))**10;
    const gate=Math.min(1,Math.max(0,(Math.abs(Math.sin(p.x*.15+p.z*.16))-.1)/.4));
    if(ridge*gate<.0001)return 0;
    let opening=1;for(let i=0;i<this.gateCenters.length+this.landingCenters.length;i++){const center=i<this.gateCenters.length?this.gateCenters[i]:this.landingCenters[i-this.gateCenters.length],t=Math.max(0,Math.min(1,(Math.hypot(p.x-center.x,p.y-center.y,p.z-center.z)-2.3)/2));opening*=t*t*(3-2*t);}
    return ridge*gate*3.1*opening;
  }
  distance(p) {
    const q=mul(p,1/this.worldScale);
    return (mix(shapeDistance(q,this.from,this.time,this.floorPhase),shapeDistance(q,this.to,this.time,this.floorPhase),this.mix)*this.worldScale-this.ridgeHeight(p)-this.pulseOffset(p))*.8;
  }
  gradient(p) {
    const e = 0.015;
    return V((this.distance(V(p.x + e, p.y, p.z)) - this.distance(V(p.x - e, p.y, p.z))) / (2 * e), (this.distance(V(p.x, p.y + e, p.z)) - this.distance(V(p.x, p.y - e, p.z))) / (2 * e), (this.distance(V(p.x, p.y, p.z + e)) - this.distance(V(p.x, p.y, p.z - e))) / (2 * e));
  }
  project(point, iterations = 5) {
    let p = { ...point };
    for (let i = 0; i < iterations; i++) {
      const d = this.distance(p); if (Math.abs(d) < 0.005) break;
      const g = this.gradient(p), l = dot(g,g);
      if(l<.00001){
        let best=p,error=Math.abs(d);
        for(const direction of[V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1)]){const q=add(p,mul(direction,1)),e=Math.abs(this.distance(q));if(e<error){best=q;error=e;}}
        if(best===p)break;p=best;continue;
      }
      let delta=mul(g,-d/l),length=Math.hypot(delta.x,delta.y,delta.z);
      if(length>3)delta=mul(delta,3/length);
      let next=add(p,delta);
      for(let j=0;j<6&&Math.abs(this.distance(next))>Math.abs(d);j++){delta=mul(delta,.5);next=add(p,delta);}
      if(Math.abs(this.distance(next))>=Math.abs(d))break;
      p=next;
    }
    const remaining=this.distance(p);
    if(Math.abs(remaining)>.02){
      // Blending concave shapes can cancel their gradients. Bracket a nearby
      // zero instead of letting Newton's method jump to a distant face.
      const descent=mul(unit(this.gradient(p)),remaining>0?-1:1),directions=[descent,this.normal,mul(this.normal,-1),V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1)];
      for(const radius of[.25,.5,1,2,4,8,16,32])for(const direction of directions){
        const end=add(p,mul(direction,radius));if(this.distance(end)*remaining>0)continue;
        let lo=0,hi=radius;
        for(let j=0;j<14;j++){const mid=(lo+hi)*.5;if(this.distance(add(p,mul(direction,mid)))*remaining>0)lo=mid;else hi=mid;}
        return add(p,mul(direction,(lo+hi)*.5));
      }
    }
    return p;
  }
  update(dt, level) {
    this.time += dt;
    this.routeAge+=dt;
    this.pulseAge+=dt;this.floorPhase+=(this.floorTarget-this.floorPhase)*(1-Math.exp(-dt*1.1));
    if (level !== this.level&&this.morphProgress>=1) { this.level = level; this.from = this.to; this.to = [1,0,4,2,3,5][(level - 1) % 6]; this.morphProgress=0;this.mix = 0;this.scaleTarget=[1.05,.88,1.18,1.32,1,.92,1.2][(level-1)%7]*(1+Math.min(9,Math.floor((level-1)/5))*.025); }
    this.worldScale+=(this.scaleTarget-this.worldScale)*(1-Math.exp(-dt*.35));
    this.morphProgress=Math.min(1,this.morphProgress+dt/6.5);
    this.mix=this.morphProgress*this.morphProgress*(3-2*this.morphProgress);
    this.advance(0, 0);
  }
  resolveMotion(dx,dz){
    if(Math.hypot(dx,dz)<.00001)return {x:dx,z:dz};
    const current=this.ridgeHeight(this.anchor),limit=Math.max(.72,current+.00001);
    const fraction=(x,z)=>{const steps=Math.min(12,Math.max(1,Math.ceil(Math.hypot(x,z)/.3)));for(let i=1;i<=steps;i++){const q=this.project(add(this.anchor,add(mul(this.right,x*i/steps),mul(this.up,z*i/steps))),6);if(this.ridgeHeight(q)>limit)return (i-1)/steps;}return 1;};
    const full=fraction(dx,dz);this.blocked=full<1;if(full===1)return{x:dx,z:dz};
    const fx=fraction(dx,0),fz=fraction(0,dz),options=[{x:dx*full,z:dz*full},{x:dx*fx,z:0},{x:0,z:dz*fz}];
    return options.sort((a,b)=>(b.x*dx+b.z*dz)-(a.x*dx+a.z*dz))[0];
  }
  steerTowards(goal){
    const d=Math.max(.01,Math.hypot(goal.x,goal.z));
    const changed=!this.routeGoal||Math.hypot(goal.x-this.routeGoal.x,goal.z-this.routeGoal.z)>2;
    if(changed||this.routeAge>.8){this.route=this.findRoute(goal);this.routeAge=0;this.routeGoal={...goal};}
    while(this.route.length&&Math.hypot(this.route[0].x,this.route[0].z)<.85)this.route.shift();
    const waypoint=this.route[0]||goal,a=Math.atan2(waypoint.x,waypoint.z);
    for(const turn of[0,.52,-.52,1.05,-1.05,1.57,-1.57,2.1,-2.1,2.65,-2.65,Math.PI]){const x=Math.sin(a+turn),z=Math.cos(a+turn),step=this.resolveMotion(x*.3,z*.3);if(Math.hypot(step.x,step.z)>.26)return{x:x*Math.min(1,d/1.3),z:z*Math.min(1,d/1.3)};}
    return{x:0,z:0};
  }
  findRoute(goal){
    // Search the local surface chart, then replan as parallel transport changes it.
    // Sampling edge midpoints keeps narrow ridges solid between adjacent cells.
    const spacing=1.35,extent=24,limit=Math.max(.72,this.ridgeHeight(this.anchor)+.00001),cache=new Map();
    const clear=(x,z)=>{const key=`${x},${z}`;if(!cache.has(key))cache.set(key,!(this.routeAvoid||[]).some(g=>Math.hypot(g.x,g.z)>3&&Math.hypot(x-g.x,z-g.z)<2.5)&&this.ridgeHeight(this.map(x,z).point)<=limit);return cache.get(key);};
    const heuristic=(x,z)=>Math.hypot(goal.x-x*spacing,goal.z-z*spacing);
    const start={x:0,z:0,g:0,h:heuristic(0,0),parent:null},open=[start],seen=new Map([['0,0',start]]);let best=start;
    for(let count=0;open.length&&count<1200;count++){
      let index=0;for(let i=1;i<open.length;i++)if(open[i].g+open[i].h<open[index].g+open[index].h)index=i;
      const current=open.splice(index,1)[0];if(current.closed)continue;current.closed=true;
      if(current.h<best.h)best=current;if(current.h<1.35){best=current;break;}
      for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const x=current.x+dx,z=current.z+dz;if(Math.abs(x)>extent||Math.abs(z)>extent)continue;
        if(!clear(x*spacing,z*spacing)||!clear((x+current.x)*spacing*.5,(z+current.z)*spacing*.5))continue;
        const key=`${x},${z}`,g=current.g+Math.hypot(dx,dz)*spacing,old=seen.get(key);if(old&&old.g<=g)continue;
        const node={x,z,g,h:heuristic(x,z),parent:current};seen.set(key,node);open.push(node);
      }
    }
    const route=[];for(let node=best;node.parent;node=node.parent)route.unshift({x:node.x*spacing,z:node.z*spacing});return route;
  }
  advance(dx, dz) {
    this.travel += Math.hypot(dx, dz);
    if(this.routeGoal){this.routeGoal.x-=dx;this.routeGoal.z-=dz;for(const point of this.route){point.x-=dx;point.z-=dz;}}
    this.anchor = this.project(add(this.anchor, add(mul(this.right, dx), mul(this.up, dz))), 8);
    const n = unit(this.gradient(this.anchor));
    const right = unit(add(this.right, mul(n, -dot(this.right, n))));
    this.normal = n; this.right = right; this.up = unit(cross(right, n));
  }
  map(x, z, height = 0) {
    if(Math.abs(x)+Math.abs(z)<.0001)return {point:add(this.anchor,mul(this.normal,height)),normal:this.normal};
    let p = add(this.anchor, add(mul(this.right, x), mul(this.up, z)));
    p = this.project(p, Math.hypot(x,z)>25?12:6);
    const n = unit(this.gradient(p));
    return { point: add(p, mul(n, height)), normal: n };
  }
  local(world) {
    const delta = add(world, mul(this.anchor, -1));
    return { x: dot(delta, this.right), z: dot(delta, this.up) };
  }
  raycast(origin, direction) {
    let t = 0;
    for (let i = 0; i < 120 && t < 150; i++) {
      const p = add(origin, mul(direction, t)), d = this.distance(p);
      if (d < 0.025) return p;
      t += Math.max(0.025, d * 0.6);
    }
    const denom = dot(direction, this.normal);
    if (Math.abs(denom) < 0.001) return this.anchor;
    const tPlane = dot(add(this.anchor, mul(origin, -1)), this.normal) / denom;
    return add(origin, mul(direction, Math.max(0, tPlane)));
  }
}
