import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { Effect } from '@babylonjs/core/Materials/effect.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js';
import { Layer } from '@babylonjs/core/Layers/layer.js';
import '@babylonjs/core/Meshes/thinInstanceMesh.js';
import '@babylonjs/core/Culling/ray.js';
import '@babylonjs/core/Shaders/default.vertex.js';
import '@babylonjs/core/Shaders/default.fragment.js';
import '@babylonjs/core/Shaders/glowMapGeneration.vertex.js';
import '@babylonjs/core/Shaders/glowMapGeneration.fragment.js';
import '@babylonjs/core/Shaders/glowMapMerge.vertex.js';
import '@babylonjs/core/Shaders/glowMapMerge.fragment.js';
import '@babylonjs/core/Shaders/glowBlurPostProcess.fragment.js';
import '@babylonjs/core/Shaders/kernelBlur.vertex.js';
import '@babylonjs/core/Shaders/kernelBlur.fragment.js';
import '@babylonjs/core/Shaders/color.vertex.js';
import '@babylonjs/core/Shaders/color.fragment.js';
import '@babylonjs/core/Shaders/layer.vertex.js';
import '@babylonjs/core/Shaders/layer.fragment.js';
import { CONFIG, COLORS, WEAPONS } from './config.js';
import { SOLIDS } from './geometry.js';
import { TAU, rng, tangentAimAngle, ribbonPoint } from './math.js';
import { Surface, add, mul, dot, cross, unit } from './surface.js';
const v=p=>new Vector3(p.x,p.y,p.z),col=s=>Color3.FromHexString(s);

class Instances {
  constructor(owner,name,solid,max,color=null,dim=false){
    this.count=0;this.max=max;this.mesh=new Mesh(name,owner.scene);
    const data=new VertexData();data.positions=[];data.indices=[];data.colors=[];data.normals=[];
    for(const [fi,face]of solid.faces.entries()){
      const start=data.positions.length/3,shade=dim?.18+(fi%3)*.08:1;
      for(const i of face){data.positions.push(...solid.vertices[i]);data.colors.push(shade,shade,shade,1);}
      for(let i=1;i<face.length-1;i++)data.indices.push(start,start+i,start+i+1);
    }
    VertexData.ComputeNormals(data.positions,data.indices,data.normals);data.applyToMesh(this.mesh);
    const m=new StandardMaterial(name+'-material',owner.scene);m.disableLighting=true;m.diffuseColor=Color3.Black();m.emissiveColor=color?col(color):Color3.White();m.backFaceCulling=false;this.mesh.material=m;
    this.mesh.isPickable=false;this.mesh.alwaysSelectAsActiveMesh=true;
    this.matrices=new Float32Array(max*16);this.colors=new Float32Array(max*4);this.matrix=Matrix.Identity();
    this.mesh.thinInstanceSetBuffer('matrix',this.matrices,16,false);this.mesh.thinInstanceSetBuffer('color',this.colors,4,false);this.mesh.thinInstanceCount=0;
    if(dim)owner.glow.addExcludedMesh(this.mesh);
  }
  add(point,rotation,scale,color='#ffffff'){
    if(this.count>=this.max)return;
    Matrix.ComposeToRef(scale,rotation,point,this.matrix);this.matrix.copyToArray(this.matrices,this.count*16);
    const c=col(color),i=this.count*4;this.colors.set([c.r,c.g,c.b,1],i);this.count++;
  }
  begin(){this.count=0;}
  end(){this.mesh.thinInstanceCount=this.count;this.mesh.setEnabled(this.count>0);if(this.count){this.mesh.thinInstanceBufferUpdated('matrix');this.mesh.thinInstanceBufferUpdated('color');}}
}
class NeonLines {
  constructor(owner){this.owner=owner;this.batches=new Map();}
  begin(){for(const b of this.batches.values())b.begin();}
  line(a,b,width,color){
    const d=b.subtract(a),length=d.length();if(length<.0001)return;
    let batch=this.batches.get(color);if(!batch){batch=new Instances(this.owner,'neon-'+color,SOLIDS.cube,10000,color);this.batches.set(color,batch);}
    const forward=d.scale(1/length),reference=Math.abs(forward.y)>.95?Vector3.Right():Vector3.Up(),right=Vector3.Cross(reference,forward).normalize(),up=Vector3.Cross(forward,right).normalize();
    const matrix=Matrix.Identity();Matrix.FromXYZAxesToRef(right,up,forward,matrix);
    batch.add(a.add(b).scale(.5),Quaternion.FromRotationMatrix(matrix),new Vector3(width,width,length));
  }
  end(){for(const b of this.batches.values())b.end();}
}
export class GameRenderer {
  constructor(canvas,sim){
    this.canvas=canvas;this.sim=sim;this.surface=new Surface();this.pulseSerial=0;
    this.engine=new Engine(canvas,true,{stencil:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.engine.setHardwareScalingLevel(1);
    this.scene=new Scene(this.engine);this.scene.clearColor=Color4.FromHexString('#030611ff');this.scene.skipPointerMovePicking=true;
    this.camera=new FreeCamera('orbit-camera',new Vector3(0,0,-48),this.scene);this.camera.minZ=.1;this.camera.maxZ=250;this.scene.activeCamera=this.camera;
    this.glow=new GlowLayer('neon-bloom',this.scene,{mainTextureRatio:.55,blurKernelSize:24});this.glow.intensity=.85;
    this.lines=new NeonLines(this);this.solids=new Map(Object.entries(SOLIDS).map(([k,d])=>[k,new Instances(this,k,d,700,null,true)]));
    this.createBackground();this.createWorld();
    this.hudTexture=new DynamicTexture('game-hud',{width:800,height:1200},this.scene,false);this.hudTexture.hasAlpha=true;
    this.hudLayer=new Layer('hud',null,this.scene,false);this.hudLayer.texture=this.hudTexture;this.hudLayer.alphaBlendingMode=Engine.ALPHA_COMBINE;
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  createBackground(){
    const texture=new DynamicTexture('deep-space',{width:768,height:1024},this.scene,false),ctx=texture.getContext(),random=rng(329);
    const gradient=ctx.createLinearGradient(0,0,768,1024);gradient.addColorStop(0,'#141b36');gradient.addColorStop(.55,'#202344');gradient.addColorStop(1,'#111b32');ctx.fillStyle=gradient;ctx.fillRect(0,0,768,1024);
    for(let i=0;i<110;i++){ctx.fillStyle=i%3?'#6f9ec32b':'#bdcbff55';ctx.fillRect(random()*768,random()*1024,i%9?1:2,1);}
    texture.update();new Layer('space',null,this.scene,true).texture=texture;
  }
  createWorld() {
    Effect.ShadersStore.manifoldVertexShader = `
      precision highp float; attribute vec3 position; uniform mat4 worldViewProjection;
      varying vec3 vWorld; void main(){vWorld=position;gl_Position=worldViewProjection*vec4(position,1.);}
    `;
    Effect.ShadersStore.manifoldFragmentShader = `
      precision highp float; varying vec3 vWorld;
      uniform vec3 eye; uniform mat4 vp; uniform float time, shapeA,shapeB,morph;
      uniform vec3 accent,playerWorld,pulseOrigin,gateAWorld,gateBWorld,landings[3]; uniform float pulseAge,floorPhase,worldScale,gateCount,landingCount;
      float baseShape(vec3 p,float id){
        if(id<.5)return length(vec2(length(vec2(p.x,p.y/1.48))-12.5,p.z))-5.3;
        if(id<1.5){vec3 q=abs(p)-vec3(10.,18.,10.);float body=length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-2.1;vec3 l=vec3(abs(p.x)-12.2,abs(abs(p.y)-10.)-2.2,abs(p.z)-11.3);float ledge=length(max(l,0.))+min(max(l.x,max(l.y,l.z)),0.)-1.1;return min(body,ledge);}
        if(id<2.5)return (length(p/vec3(14.,22.,14.))-1.)*14.;
        if(id<3.5){float a=p.y*.065+time*.035; p.xz=mat2(cos(a),sin(a),-sin(a),cos(a))*p.xz;vec3 q=abs(p)-vec3(8.5,22.,8.5);return (length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-3.)*.75;}
        if(id<4.5){float split=sin(time*.19+floorPhase*.35)*.5+.5;float sep=8.+split*8.;float radius=13.-split*2.;float a=length(p-vec3(0.,sep,0.))-radius;float b=length(p+vec3(0.,sep,0.))-radius;vec3 q=vec3(p.x,max(abs(p.y)-(sep-3.),0.),p.z);float bridge=length(q)-3.8;return min(min(a,b),bridge);}
        float yy=p.y/1.55;float bend=sin(yy*.16+time*.12)*3.;return (length(vec2(length(vec2(p.x+bend,yy))-11.,p.z*.85))-(4.5+sin(atan(yy,p.x)*3.+time*.15)*1.4))*.7;
      }
      float shape(vec3 p,float id){return baseShape(p/worldScale,id)*worldScale;}
      float pulse(vec3 p){float wave=length(p-pulseOrigin)-pulseAge*15.;return exp(-wave*wave/8.)*cos(wave*.8)*1.8*max(0.,1.-pulseAge/2.8);}
      float sdf(vec3 p){float ridge=pow(max(0.,sin(p.y*.35+sin(p.x*.15)*.8+floorPhase)),10.);float gate=clamp((abs(sin(p.x*.15+p.z*.16))-.1)/.4,0.,1.);float raised=ridge*gate*3.1;if(raised>.00031){float opening=1.;if(gateCount>.5)opening*=smoothstep(2.3,4.3,length(p-gateAWorld));if(gateCount>1.5)opening*=smoothstep(2.3,4.3,length(p-gateBWorld));for(int i=0;i<3;i++){if(float(i)<landingCount)opening*=smoothstep(2.3,4.3,length(p-landings[i]));}raised*=opening;}else raised=0.;return (mix(shape(p,shapeA),shape(p,shapeB),morph)-raised-pulse(p))*.8;}
      vec3 normal(vec3 p){vec2 e=vec2(.035,0.);return normalize(vec3(sdf(p+e.xyy)-sdf(p-e.xyy),sdf(p+e.yxy)-sdf(p-e.yxy),sdf(p+e.yyx)-sdf(p-e.yyx)));}
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      void main(){
        vec3 rd=normalize(vWorld-eye);vec3 bounds=vec3(24.,32.,20.)*worldScale+vec3(6.);
        vec3 safeRd=mix(vec3(-1.),vec3(1.),step(vec3(0.),rd))*max(abs(rd),vec3(.00001));vec3 t0=(-bounds-eye)/safeRd,t1=(bounds-eye)/safeRd;
        vec3 nearT=min(t0,t1),farT=max(t0,t1);float travel=max(0.,max(nearT.x,max(nearT.y,nearT.z))),end=min(160.,min(farT.x,min(farT.y,farT.z)));
        if(travel>end)discard;vec3 p;bool hit=false;
        for(int i=0;i<110;i++){p=eye+rd*travel;float d=sdf(p);if(d<.028){hit=true;break;}travel+=max(.025,d*.62);if(travel>end)break;}
        if(!hit)discard;
        vec3 n=normal(p);float light=max(dot(n,normalize(vec3(-.5,.8,-.9))),0.);
        float ao=clamp(sdf(p+n*2.)*.5,.2,1.);
        vec3 uv=p*.38;
        vec3 g=abs(fract(uv-.5)-.5)/max(fwidth(uv),vec3(.001));
        vec3 weight=abs(n);float grid=1.-min(min(mix(g.x,80.,pow(weight.x,7.)),mix(g.y,80.,pow(weight.y,7.))),mix(g.z,80.,pow(weight.z,7.)));
        grid=clamp(grid,0.,1.);
        vec3 biguv=p*.095;vec3 big=abs(fract(biguv-.5)-.5)/max(fwidth(biguv),vec3(.001));
        float major=1.-clamp(min(min(mix(big.x,80.,pow(weight.x,7.)),mix(big.y,80.,pow(weight.y,7.))),mix(big.z,80.,pow(weight.z,7.))),0.,1.);
        vec3 base=mix(vec3(.17,.24,.32),vec3(.36,.48,.59),light)*(.9+ao*.1);
        vec3 lineColor=mix(vec3(.16,.53,.66),accent*.6,.25);
        vec3 color=base+lineColor*(grid*.32+major*.32);
        // Sparse surface-locked pixel fragments: a little signal noise, not a new texture.
        vec2 face=abs(n.z)>max(abs(n.x),abs(n.y))?p.xy:abs(n.y)>abs(n.x)?p.xz:p.zy;
        vec2 cell=floor(face*.31),pixel=fract(face*.31);float seed=hash(vec3(cell,17.));
        float sparse=step(.975,seed),flicker=.45+.55*smoothstep(-.5,.7,sin(time*1.6+seed*83.));
        float dash=(1.-smoothstep(.17,.2,abs(pixel.x-.45)))*(1.-smoothstep(.009,.019,abs(pixel.y-.38)));
        vec2 bit=abs(pixel-vec2(.72,.54));float chip=1.-smoothstep(.025,.042,max(bit.x,bit.y));
        color+=sparse*flicker*(dash*vec3(.06,.23,.25)+chip*vec3(.2,.055,.18));
        float rim=pow(1.-abs(dot(n,-rd)),3.);color+=mix(vec3(.03,.13,.2),accent*.25,.3)*rim;
        float wave=abs(length(p-pulseOrigin)-pulseAge*15.);color+=vec3(.15,.8,.85)*exp(-wave*wave/1.5)*max(0.,1.-pulseAge/2.8);
        gl_FragColor=vec4(color,1.);
        vec4 clip=vp*vec4(p,1.);gl_FragDepth=clip.z/clip.w*.5+.5;
      }
    `;
    this.worldMat = new ShaderMaterial('living-3d-world', this.scene, { vertex: 'manifold', fragment: 'manifold' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'vp', 'eye', 'time', 'shapeA', 'shapeB', 'morph', 'accent', 'playerWorld', 'pulseOrigin', 'pulseAge', 'floorPhase', 'worldScale','gateAWorld','gateBWorld','gateCount','landings','landingCount'] });
    this.worldMat.backFaceCulling = false;
    this.worldMesh = MeshBuilder.CreateBox('true-3d-manifold', { width: 90, height: 100, depth: 90 }, this.scene);
    this.worldMesh.material = this.worldMat; this.worldMesh.isPickable = false; this.worldMesh.alwaysSelectAsActiveMesh = true;
    this.glow.addExcludedMesh(this.worldMesh);
  }
  resize(){this.engine.resize();this.width=this.canvas.clientWidth;this.height=this.canvas.clientHeight;this.uiPixel=Math.min(devicePixelRatio||1,1.25);this.hudTexture.scaleTo(Math.round(this.width*this.uiPixel),Math.round(this.height*this.uiPixel));}
  adaptResolution(fps){
    const current=this.engine.getHardwareScalingLevel();
    if(fps<49){this.fastFrames=0;if(current<1.5)this.engine.setHardwareScalingLevel(Math.min(1.5,current+.1));}
    else if(fps>58){this.fastFrames=(this.fastFrames||0)+1;if(this.fastFrames>=8&&current>1){this.fastFrames=0;this.engine.setHardwareScalingLevel(Math.max(1,current-.05));}}
  }
  frame(x,z,height=0,angle=0){
    const s=this.surface,{point,normal}=s.map(x,z,height),heading=add(mul(s.right,Math.sin(angle)),mul(s.up,Math.cos(angle))),forward=unit(add(heading,mul(normal,-dot(heading,normal)))),right=unit(cross(normal,forward));
    const matrix=Matrix.Identity();Matrix.FromXYZAxesToRef(v(right),v(normal),v(forward),matrix);
    return{point:v(point),normal:v(normal),right:v(right),forward:v(forward),rotation:Quaternion.FromRotationMatrix(matrix)};
  }
  solid(kind,frame,size,color,spin=0){
    const definition=SOLIDS[kind],scale=typeof size==='number'?new Vector3(size,size,size):size,rotation=frame.rotation.multiply(Quaternion.RotationYawPitchRoll(spin,spin*.37,spin*.21));
    this.solids.get(kind).add(frame.point,rotation,scale,color);
    const matrix=Matrix.Compose(scale,rotation,frame.point),points=definition.vertices.map(q=>Vector3.TransformCoordinates(new Vector3(...q),matrix));
    for(const[a,b]of definition.edges)this.lines.line(points[a],points[b],Math.min(.11,.034+scale.x*.015),color);
  }
  ring(x,z,r,height,color,width=.055,count=48){
    let previous;for(let i=0;i<=count;i++){const a=i*TAU/count,point=v(this.surface.map(x+Math.sin(a)*r,z+Math.cos(a)*r,height).point);if(previous)this.lines.line(previous,point,width,color);previous=point;}
  }
  string(a,b,width,color,white=true){this.lines.line(a,b,width,color);if(white)this.lines.line(a,b,width*.2,'#e6ffff');}
  worldPoint(nx,ny){const center=this.screenPoint(0,.85,0),dx=nx*this.width-center.x,dy=center.y-ny*this.height;return{screenAngle:Math.hypot(dx,dy)<8?undefined:Math.atan2(dx,dy)};}
  navigationPoint(nx,ny){const ray=this.scene.createPickingRay(nx*this.engine.getRenderWidth(),ny*this.engine.getRenderHeight(),Matrix.Identity(),this.camera,false);return this.surface.raycast(ray.origin,ray.direction);}
  navigationLocal(){
    if(this.navigationEntity){const {type,id}=this.navigationEntity;return type==='weapon'?this.sim.weaponDrops.find(d=>d.id===id):type==='gate'?this.sim.gates.find(g=>g.id===id):type==='boss'?this.sim.enemies.find(e=>e.id===id&&!e.dead):this.sim.exitZone;}
    if(!this.navigationTarget)return null;
    this.navigationTarget=this.surface.project(this.navigationTarget,8);return this.surface.local(this.navigationTarget);
  }
  surfaceAimAngle(angle){
    const f=this.frame(0,0,.85),project=point=>Vector3.Project(point,Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.width,this.height));
    const center=project(f.point),right=project(f.point.add(v(this.surface.right))).subtract(center),up=project(f.point.add(v(this.surface.up))).subtract(center);
    return tangentAimAngle(angle,right,up);
  }
  navigationSteering(goal){
    this.surface.routeAvoid=this.sim.gates.includes(goal)?[]:this.sim.gates;
    return this.surface.steerTowards(goal);
  }
  screenPoint(x,y,z){const mapped=this.surface.map(x,z,y),point=Vector3.Project(v(mapped.point),Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.width,this.height));return{x:point.x,y:point.y,visible:Vector3.Dot(v(mapped.normal),this.camera.position.subtract(v(mapped.point)))>0&&point.z>0&&point.z<1};}
  shipScreenPoints(){
    const f=this.frame(0,0,.85,this.sim.player.angle),viewport=this.camera.viewport.toGlobal(this.width,this.height);
    return SOLIDS.ship.vertices.slice(0,4).map(([x,y,z])=>Vector3.Project(f.point.add(f.right.scale(x*1.4)).add(f.normal.scale(y*1.4)).add(f.forward.scale(z*1.4)),Matrix.Identity(),this.scene.getTransformMatrix(),viewport));
  }
  update(dt){
    const sim=this.sim,s=this.surface,p=sim.player,t=sim.worldTime;
    if(sim.terrainPulse!==this.pulseSerial){this.pulseSerial=sim.terrainPulse;s.triggerPulse();}
    s.update(['playing','attract'].includes(sim.mode)?dt:0,sim.level.number);
    s.gateCenters=sim.gates.map(g=>s.map(g.x,g.z).point);
    const nearbyLandings=sim.weaponDrops.filter(d=>Math.hypot(d.x,d.z)<16).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z)).slice(0,2);
    if(sim.exitZone&&Math.hypot(sim.exitZone.x,sim.exitZone.z)<18)nearbyLandings.push(sim.exitZone);
    s.landingCenters=nearbyLandings.map(d=>s.map(d.x,d.z).point);
    const landingData=new Float32Array(9);s.landingCenters.forEach((p,i)=>landingData.set([p.x,p.y,p.z],i*3));this.worldMat.setArray3('landings',landingData);this.worldMat.setFloat('landingCount',s.landingCenters.length);
    this.worldMat.setFloat('gateCount',s.gateCenters.length);this.worldMat.setVector3('gateAWorld',v(s.gateCenters[0]||s.anchor));this.worldMat.setVector3('gateBWorld',v(s.gateCenters[1]||s.anchor));
    const portrait=this.width/this.height<.85,basis=Matrix.Identity();Matrix.FromXYZAxesToRef(v(s.right),v(s.up),v(mul(s.normal,-1)),basis);
    const desired=Quaternion.FromRotationMatrix(basis);
    if(this.orbitRotation){
      const angle=2*Math.acos(Math.min(1,Math.abs(Quaternion.Dot(this.orbitRotation,desired))));
      const blend=Math.min(1-Math.exp(-dt*1.25),dt*1.35/Math.max(.0001,angle));
      this.orbitRotation=Quaternion.Slerp(this.orbitRotation,desired,blend);
    }else this.orbitRotation=desired;
    const orbitMatrix=Matrix.Identity();this.orbitRotation.toRotationMatrix(orbitMatrix);
    const orbitNormal=Vector3.TransformNormal(new Vector3(0,0,-1),orbitMatrix),orbitUp=Vector3.TransformNormal(Vector3.Up(),orbitMatrix),target=v(s.anchor).add(orbitUp.scale(portrait?5:2));
    let radius=portrait?38:37,eye=v(s.anchor).add(orbitNormal.scale(radius)).add(orbitUp.scale(portrait?3:8));
    for(let i=0;i<8&&s.distance(eye)<5;i++){radius+=6;eye=v(s.anchor).add(orbitNormal.scale(radius)).add(orbitUp.scale(portrait?3:8));}
    this.camera.position=Vector3.Lerp(this.camera.position,eye,1-Math.exp(-dt*2.4));
    if(s.distance(this.camera.position)<3){const direction=this.camera.position.subtract(v(s.anchor)).normalize();let r=this.camera.position.subtract(v(s.anchor)).length();for(let i=0;i<12&&s.distance(this.camera.position)<3;i++){r+=3;this.camera.position=v(s.anchor).add(direction.scale(r));}}
    this.cameraFocus=this.cameraFocus?Vector3.Lerp(this.cameraFocus,target,1-Math.exp(-dt*3.2)):target;
    this.camera.upVector=orbitUp;this.camera.setTarget(this.cameraFocus);this.camera.fov=portrait?.95:.87;
    this.scene.updateTransformMatrix(true);
    this.worldMat.setVector3('eye',this.camera.position);this.worldMat.setMatrix('vp',this.scene.getTransformMatrix());
    for(const[key,value]of Object.entries({time:s.time,shapeA:s.from,shapeB:s.to,morph:s.mix,pulseAge:s.pulseAge,floorPhase:s.floorPhase,worldScale:s.worldScale}))this.worldMat.setFloat(key,value);
    this.worldMat.setColor3('accent',col(sim.level.color));this.worldMat.setVector3('playerWorld',v(s.anchor));this.worldMat.setVector3('pulseOrigin',v(s.pulseOrigin));this.glow.intensity=sim.reduced?.35:CONFIG.bloom*.85;
    this.lines.begin();for(const batch of this.solids.values())batch.begin();
    for(const gate of sim.gates){
      if(!gate.placed){let found=false;for(const dx of[0,2,-2,4,-4,6,-6]){for(const z of[0,2,-2,4,-4,7,-7,10,-10]){const point=s.map(gate.x+dx,z).point;if(s.ridgeHeight(point)<.35){gate.x+=dx;gate.z=z;found=true;break;}}if(found)break;}gate.placed=true;}
      const f=this.frame(gate.x,gate.z,.15);this.ring(gate.x,gate.z,1.8,.13,gate.color,.07,32);
      let previous;for(let i=0;i<=32;i++){const a=i*TAU/32,point=f.point.add(f.right.scale(Math.sin(a)*1.3)).add(f.normal.scale(1.7+Math.cos(a)*1.7));if(previous)this.string(previous,point,.1,gate.color);previous=point;}
    }
    if(p.hp>0){
      const frame=this.frame(0,0,.85,p.angle);this.solid('ship',frame,1.4,p.invuln>0&&Math.sin(t*18)>0?'#e6ffff':'#54fff1');
      this.lines.line(frame.point.add(frame.forward.scale(-.2)),frame.point.add(frame.forward.scale(1.08)),.075,'#efffff');
      for(const side of[-1,1]){const a=frame.point.add(frame.right.scale(side*.37)).add(frame.forward.scale(-.7)),b=a.add(frame.forward.scale(-(.3+Math.min(.9,Math.hypot(p.vx,p.vz)*.065))));this.string(a,b,.09,'#36aaff');}
      if(p.overdrive>0)this.ring(0,0,1.8+Math.sin(t*9)*.12,.4,'#b1fff6',.1,32);
    }
    for(const support of sim.supports){const f=this.frame(support.x,support.z,.9,support.angle);this.solid('diamond',f,.68,support.color,t*.9);}
    for(const ship of sim.sisters){const f=this.frame(ship.x,ship.z,.9,ship.angle);this.solid('ship',f,1.05,ship.life<.7&&Math.sin(t*25)>0?'#efffff':ship.color);this.string(f.point.add(f.forward.scale(-.45)),f.point.add(f.forward.scale(-1.3)),.08,ship.color);}
    for(const e of sim.enemies){
      if(e.dead||Math.hypot(e.x,e.z)>45)continue;
      if(e.type==='pillar'){
        const fall=Math.max(0,3-e.age)*10,sections=Math.ceil(Math.max(0,e.hp/e.maxHp)*3);
        for(let i=0;i<sections;i++){const f=this.frame(e.x,e.z,3+i*5.4+fall);this.solid('cube',f,new Vector3(3.3,5.1,3.3),e.hit>0?'#efffff':e.color);}
        this.ring(e.x,e.z,3,.14,e.color,e.warmup>0?.12:.05,40);continue;
      }
      const warm=e.warmup>0?Math.max(.04,1-e.warmup/(e.type==='boss'?2:1.15)):1,kind=({diamond:'diamond',cube:'cube',spinner:'cross',mote:'dart',dart:'dart',prism:'prism',guard:'cube',splitter:'cube',anchor:'cube',boss:'cube'})[e.type];
      const size=(e.type==='boss'?5:e.type==='splitter'?3:e.type==='guard'?2:e.type==='anchor'?2.1:1.25)*e.size*warm,frame=this.frame(e.x,e.z,.55+size*.23,e.angle),color=e.hit>0?'#efffff':e.type==='boss'?(e.shielded?'#ff53c9':'#67ffff'):e.color;
      if(Vector3.Dot(frame.normal,this.camera.position.subtract(frame.point))<=.1)continue;
      const spin=e.type==='dart'||e.type==='mote'||e.type==='prism'?0:e.age*(e.type==='spinner'?2.1:.45)+e.phase;
      this.solid(kind,frame,size,color,spin);
      if(e.type==='anchor'){this.ring(e.x,e.z,2.1,.15,'#ffe56b',.075,32);this.ring(e.x,e.z,2.6,.15,'#ffe56b',.025,32);this.solid('diamond',frame,size*.45,'#fff2bc',-spin);}
      if(e.type==='guard'||e.type==='boss'){
        const n=e.type==='boss'?6:3,r=e.type==='boss'?3.5:1.45;
        for(let i=0;i<n;i++){const a=t*.8+i*TAU/n,orb={...frame,point:frame.point.add(frame.right.scale(Math.sin(a)*r)).add(frame.forward.scale(Math.cos(a)*r)).add(frame.normal.scale(Math.sin(a*2+t*.6)*.6))};this.solid(e.type==='boss'?'cube':'diamond',orb,e.type==='boss'?.8:.4,color,-spin);}
      }
    }
    for(const drop of sim.weaponDrops){
      const w=WEAPONS[drop.weapon],f=this.frame(drop.x,drop.z,1.4,0);this.ring(drop.x,drop.z,1.65,.14,w.color,.075,32);this.ring(drop.x,drop.z,2.2,.12,w.color,.025,24);
      if(w.summon)for(const side of[-1,1])this.solid('ship',{...f,point:f.point.add(f.right.scale(side*.85))},.75,w.color);
      else this.solid(drop.weapon%2?'diamond':'cube',f,1.1,w.color,t*.9);
      this.lines.line(f.point.add(f.normal.scale(-1)),f.point.add(f.normal.scale(4)),.035,w.color);
      if(drop.weapon>=5&&!w.summon)for(let i=0;i<3;i++){const a=t+i*TAU/3;this.solid('dart',{...f,point:f.point.add(f.right.scale(Math.sin(a))).add(f.forward.scale(Math.cos(a)))},.35,w.color,t);}
    }
    if(sim.exitZone){const z=sim.exitZone;for(let i=0;i<3;i++)this.ring(z.x,z.z,z.radius+i*.36,.2+i*.2,'#91ff79',.1-i*.025,48);const f=this.frame(z.x,z.z,1.6);this.solid('diamond',f,1.1,'#c1ff99',t);this.lines.line(f.point,f.point.add(f.normal.scale(7)),.065,'#91ff79');}
    if(this.navigationTarget||this.navigationEntity){const goal=this.navigationLocal();if(goal)this.ring(goal.x,goal.z,.65+Math.sin(t*6)*.08,.25,'#e4ffff',.055,24);}
    const groups=new Map();
    for(const b of sim.bullets){
      if(Math.hypot(b.x,b.z)>42)continue;
      const f=this.frame(b.x,b.z,.7,b.angle),length=b.enemy?.9:b.weapon===6?1.8:b.homing?1.7:b.weapon===4?5.5:3.8,width=(b.enemy?.18:b.weapon===6?.75:b.weapon===4?.38:.25)*(b.amplified?1.35:1);
      if(Vector3.Dot(f.normal,this.camera.position.subtract(f.point))<=.1)continue;
      this.string(f.point.add(f.forward.scale(-length*.5)),f.point.add(f.forward.scale(length*.5)),width,b.enemy?'#ff4c77':b.color,!b.enemy);
      if(b.trail&&!b.enemy){let prev=f.point;for(const q of b.trail.slice(0,b.homing?5:3)){const point=v(s.map(q.x,q.z,.65).point);this.lines.line(prev,point,width*.6,b.color);prev=point;}}
      if(b.explosionRadius)this.ring(b.x,b.z,1.3+Math.sin(t*12)*.2,.7,b.color,.065,24);
      if(b.homing)this.solid('dart',f,.48,b.color);
      if(b.strokeGroup&&!b.enemy){if(!groups.has(b.strokeGroup))groups.set(b.strokeGroup,[]);groups.get(b.strokeGroup).push(b);}
    }
    for(const group of groups.values())for(let i=1;i<group.length;i++){
      const a=group[i-1],b=group[i];if(Math.hypot(a.x-b.x,a.z-b.z)>=9||a.weapon===5)continue;
      let previous;for(let j=0;j<=3;j++){const f=j/3,bend=Math.sin(f*Math.PI)*.6,point=v(s.map(a.x+(b.x-a.x)*f+Math.sin(a.angle)*bend,a.z+(b.z-a.z)*f+Math.cos(a.angle)*bend,.7).point);if(previous)this.string(previous,point,.13,a.color);previous=point;}
    }
    for(const attack of sim.attacks){
      const progress=1-attack.life/attack.maxLife;let previous;
      const n=36;
      for(let i=0;i<=n;i++){
        const f=i/n;let x,z;
        if(attack.ribbon){const q=ribbonPoint(attack,attack.angle,attack.reach,t,f);x=q.x;z=q.z;}
        else if(attack.weapon===1){const r=attack.reach*Math.sin(Math.min(1,progress*1.5)*Math.PI/2)*f,side=Math.sin(f*8-progress*12)*1.4*f;x=attack.x+Math.sin(attack.angle)*r+Math.cos(attack.angle)*side;z=attack.z+Math.cos(attack.angle)*r-Math.sin(attack.angle)*side;}
        else{const angle=attack.angle-attack.arc*.5+attack.arc*(f*.65+progress*.35),r=attack.reach*(.55+Math.sin(f*Math.PI)*.35);x=attack.x+Math.sin(angle)*r;z=attack.z+Math.cos(angle)*r;}
        const ribbonColors=['#ff5de9','#ffb14a','#b7ff48','#54fff1','#48adff','#a28bff'],color=attack.ribbon?ribbonColors[Math.min(5,Math.floor(f*6))]:attack.color;
        const point=v(s.map(x,z,.85).point);if(previous)this.string(previous,point,attack.ribbon?.36:(attack.heavy?.38:.28)*(1-progress*.6),color);previous=point;
      }
    }
    const particleStep=Math.max(1,Math.ceil(sim.particles.length/(sim.reduced?100:320)));
    for(let i=0;i<sim.particles.length;i+=particleStep){const particle=sim.particles[i];if(Math.hypot(particle.x,particle.z)>34)continue;
      const life=particle.life/particle.maxLife,f=this.frame(particle.x,particle.z,Math.max(.2,particle.y*.4),Math.atan2(particle.vx,particle.vz));
      const length=(.18+particle.size*8)*life;this.lines.line(f.point,f.point.add(f.forward.scale(length)),Math.max(.025,particle.size*1.4*life),particle.color);
    }
    for(const r of sim.rings.slice(-24)){if(Math.hypot(r.x,r.z)>38)continue;const progress=1-r.life/r.maxLife;this.ring(r.x,r.z,r.radius*(1-(1-progress)**2),.22,r.color,Math.max(.015,.14*(1-progress)),32);}
    for(const bolt of sim.bolts){let previous;for(let i=0;i<=10;i++){const f=i/10,point=v(s.map(bolt.x+(bolt.tx-bolt.x)*f+Math.sin(i*3+t*24)*.25,bolt.z+(bolt.tz-bolt.z)*f,.9).point);if(previous)this.string(previous,point,.16,bolt.color);previous=point;}}
    for(const drop of sim.pickups){if(Math.hypot(drop.x,drop.z)>38)continue;const f=this.frame(drop.x,drop.z,.45,drop.age);if(Vector3.Dot(f.normal,this.camera.position.subtract(f.point))>.1)this.solid('cube',f,drop.type==='heart'?.55:.24,drop.type==='heart'?'#ff73c3':'#aaff74',0);}
    for(let i=0;i<p.orbit;i++){const a=sim.time*2.7+i*TAU/p.orbit;this.solid('dart',this.frame(Math.cos(a)*2.5,Math.sin(a)*2.5,.7,-a),.5,'#ffe56b',a);}
    for(let i=1;i<p.tail.length;i++){const a=p.tail[i-1],b=p.tail[i];this.lines.line(v(s.map(a.x,a.z,.3).point),v(s.map(b.x,b.z,.3).point),.18*(1-i/p.tail.length),'#197eb0');}
    this.lines.end();for(const batch of this.solids.values())batch.end();
  }
  render(hud){const ctx=this.hudTexture.getContext();ctx.save();ctx.setTransform(this.uiPixel,0,0,this.uiPixel,0,0);ctx.clearRect(0,0,this.width,this.height);hud.draw(ctx,this.width,this.height);ctx.restore();this.hudTexture.update(true);this.scene.render();}
}
