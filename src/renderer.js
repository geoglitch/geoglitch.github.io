import { Engine, Scene, FreeCamera, Vector3, Matrix, Quaternion, Color3, Color4, Mesh, VertexData, MeshBuilder, StandardMaterial, ShaderMaterial, Effect, DynamicTexture, HemisphericLight, GlowLayer, Layer } from '../vendor/babylon-core.js';
import { CONFIG, COLORS, WEAPONS } from './config.js';
import { SOLIDS } from './geometry.js';
import { TAU, rng, tangentAimAngle, ribbonPoint } from './math.js';
import { Surface, add, mul, dot, cross, unit } from './surface.js';
import { CameraRig } from './camera.js';
import { bossPorts } from './boss.js';
import { riftEnds } from './rifts.js';
import { FRACTURE_STAGES } from './fractures.js';
import { pickupArt } from './pickup-art.js';
const v=p=>new Vector3(p.x,p.y,p.z),col=s=>Color3.FromHexString(s);

export function drawableSegment(a,b,eye,view){
  if(!Number.isFinite(a.x+a.y+a.z+b.x+b.y+b.z)||Vector3.DistanceSquared(a,b)>100)return false;
  if(!eye||!view)return true;
  const depth=p=>(p.x-eye.x)*view.x+(p.y-eye.y)*view.y+(p.z-eye.z)*view.z;
  return depth(a)>2&&depth(b)>2;
}

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
  end(){this.mesh.thinInstanceCount=this.count;this.mesh.setEnabled(this.count>0);if(this.count){this.mesh.thinInstancePartialBufferUpdate('matrix',this.matrices.subarray(0,this.count*16),0);this.mesh.thinInstancePartialBufferUpdate('color',this.colors.subarray(0,this.count*4),0);}}
}
class NeonLines {
  constructor(owner){this.owner=owner;this.batches=new Map();}
  begin(){for(const b of this.batches.values())b.begin();}
  line(a,b,width,color){
    if(!drawableSegment(a,b,this.owner.camera?.position,this.owner.viewForward))return;
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
    this.canvas=canvas;this.sim=sim;this.surface=new Surface();this.cameraRig=new CameraRig();this.mapCache=new Map();this.pulseSerial=0;
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
      uniform vec3 eye; uniform mat4 vp; uniform float time, shapeA,shapeB,morph,terrainStrength;
      uniform vec3 accent,playerWorld,pulseOrigin,gateAWorld,gateBWorld,landings[3]; uniform float pulseAge,floorPhase,worldScale,gateCount,landingCount;
      float baseShape(vec3 p,float id){
        if(id<.5)return length(vec2(length(vec2(p.x,p.y/1.48))-12.5,p.z))-5.3;
        if(id<1.5){vec3 q=abs(p)-vec3(10.,18.,10.);return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-5.5;}
        if(id<2.5)return (length(p/vec3(14.,22.,14.))-1.)*14.;
        if(id<3.5){float a=p.y*.065+time*.035; p.xz=mat2(cos(a),sin(a),-sin(a),cos(a))*p.xz;vec3 q=abs(p)-vec3(8.5,22.,8.5);return (length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-3.)*.75;}
        if(id<4.5){float split=sin(time*.19+floorPhase*.35)*.5+.5;float sep=8.+split*8.;float radius=13.-split*2.;float a=length(p-vec3(0.,sep,0.))-radius;float b=length(p+vec3(0.,sep,0.))-radius;vec3 q=vec3(p.x,max(abs(p.y)-(sep-3.),0.),p.z);float bridge=length(q)-3.8;return min(min(a,b),bridge);}
        float yy=p.y/1.55;float bend=sin(yy*.16+time*.12)*3.;return (length(vec2(length(vec2(p.x+bend,yy))-11.,p.z*.85))-(4.5+sin(atan(yy,p.x)*3.+time*.15)*1.4))*.7;
      }
      float shape(vec3 p,float id){return baseShape(p/worldScale,id)*worldScale;}
      float pulse(vec3 p){if(pulseAge>=2.8)return 0.;float wave=length(p-pulseOrigin)-pulseAge*15.;return exp(-wave*wave/8.)*cos(wave*.8)*1.8*(1.-pulseAge/2.8);}
      float sdf(vec3 p){float ridge=pow(max(0.,sin(p.y*.35+sin(p.x*.15)*.8+floorPhase)),10.);float gate=clamp((abs(sin(p.x*.15+p.z*.16))-.1)/.4,0.,1.);float raised=ridge*gate*3.1*terrainStrength;if(raised>.00031){float opening=1.;if(gateCount>.5)opening*=smoothstep(2.3,4.3,length(p-gateAWorld));if(gateCount>1.5)opening*=smoothstep(2.3,4.3,length(p-gateBWorld));for(int i=0;i<3;i++){if(float(i)<landingCount)opening*=smoothstep(2.3,4.3,length(p-landings[i]));}raised*=opening;}else raised=0.;float base;if(morph>=1.)base=shape(p,shapeB);else if(morph<=0.)base=shape(p,shapeA);else base=mix(shape(p,shapeA),shape(p,shapeB),morph);return (base-raised-pulse(p))*.8;}
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
        float drift=sin(p.y*.038+p.x*.023)*.5+.5;
        float wash=smoothstep(-.8,.9,sin(p.z*.055+p.x*.028));
        vec3 deep=mix(vec3(.12,.23,.34),vec3(.22,.20,.36),drift);
        vec3 pearl=mix(vec3(.37,.53,.61),vec3(.43,.47,.65),wash);
        vec3 base=mix(deep,pearl,smoothstep(-.15,1.05,light))*(.9+ao*.1);
        base+=vec3(.025,.055,.065)*smoothstep(-.7,.8,sin(p.x*.09+p.y*.045));
        vec3 lineColor=mix(vec3(.16,.53,.66),accent*.6,.25);
        vec3 color=base+lineColor*(grid*.23+major*.26);
        // A flat ink patch gives floor weapon symbols contrast without adding
        // floating cards, pillars or another layer of animated scenery.
        for(int i=0;i<3;i++){if(float(i)<landingCount)color*=mix(.4,1.,smoothstep(1.5,2.2,length(p-landings[i])));}
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
    this.worldMat = new ShaderMaterial('living-3d-world', this.scene, { vertex: 'manifold', fragment: 'manifold' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'vp', 'eye', 'time', 'shapeA', 'shapeB', 'morph', 'accent', 'playerWorld', 'pulseOrigin', 'pulseAge', 'floorPhase', 'worldScale','terrainStrength','gateAWorld','gateBWorld','gateCount','landings','landingCount'] });
    // The far bounding faces cover every ray, even with the camera inside the
    // bounds. Drawing both sides raymarches the same floor pixel twice.
    this.worldMat.backFaceCulling = true;this.worldMat.cullBackFaces=false;
    this.worldMesh = MeshBuilder.CreateBox('true-3d-manifold', { width: 140, height: 160, depth: 140 }, this.scene);
    this.worldMesh.material = this.worldMat; this.worldMesh.isPickable = false; this.worldMesh.alwaysSelectAsActiveMesh = true;
    this.glow.addExcludedMesh(this.worldMesh);
  }
  resize(){this.engine.resize();this.width=this.canvas.clientWidth;this.height=this.canvas.clientHeight;this.uiPixel=Math.min(devicePixelRatio||1,1.25);this.hudTexture.scaleTo(Math.round(this.width*this.uiPixel),Math.round(this.height*this.uiPixel));}
  adaptResolution(fps){
    const current=this.engine.getHardwareScalingLevel();
    if(fps<49){this.fastFrames=0;if(current<1.5)this.engine.setHardwareScalingLevel(Math.min(1.5,current+.1));}
    else if(fps>58){this.fastFrames=(this.fastFrames||0)+1;if(this.fastFrames>=8&&current>1){this.fastFrames=0;this.engine.setHardwareScalingLevel(Math.max(1,current-.05));}}
  }
  map(x,z,height=0){
    if(this.mappedSurface!==this.surface){this.mapCache.clear();this.mappedSurface=this.surface;}
    const key=`${x},${z}`;let mapped=this.mapCache.get(key);
    if(!mapped){mapped=this.surface.map(x,z);this.mapCache.set(key,mapped);}
    return {point:add(mapped.point,mul(mapped.normal,height)),normal:mapped.normal};
  }
  frame(x,z,height=0,angle=0){
    const s=this.surface,{point,normal}=this.map(x,z,height),heading=add(mul(s.right,Math.sin(angle)),mul(s.up,Math.cos(angle))),forward=unit(add(heading,mul(normal,-dot(heading,normal)))),right=unit(cross(normal,forward));
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
    let previous;for(let i=0;i<=count;i++){const a=i*TAU/count,point=v(this.map(x+Math.sin(a)*r,z+Math.cos(a)*r,height).point);if(previous)this.lines.line(previous,point,width,color);previous=point;}
  }
  string(a,b,width,color,white=true){this.lines.line(a,b,width,color);if(white)this.lines.line(a,b,width*.2,'#e6ffff');}
  weaponMuzzle(p){
    const w=WEAPONS[p.weapon],f=this.frame(0,0,.9,p.angle),flash=Math.min(1,p.attackTime/.15);
    const point=(x,z)=>f.point.add(f.right.scale(x)).add(f.forward.scale(z));
    const line=(x,z,tx,tz,width=.09)=>this.string(point(x,z),point(tx,tz),width,w.color);
    // A small weapon-specific emitter belongs to the ship, never a floating HUD object.
    if(p.weapon===3)for(let i=-2;i<=2;i++)line(i*.15,.65,i*(.35+flash*.12),1.15+flash*.55,.08+flash*.06);
    else if(p.weapon===4)for(const side of[-1,1])line(side*.38,.4,side*.24,1.5+flash*.7,.11+flash*.09);
    else if(p.weapon===5)for(const side of[-1,1]){line(side*.6,-.2,side*.75,.65);line(side*.75,.65,side*.45,1.1);}
    else if(p.weapon===6){
      const charge=1-Math.min(1,p.shotCD/(CONFIG.fireInterval*w.interval)),r=.45+charge*.4;
      for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+.65)*TAU/12;line(Math.sin(a)*r,1+Math.cos(a)*r,Math.sin(b)*r,1+Math.cos(b)*r,.08+charge*.07);}
    }else if(p.weapon===1||p.weapon===8){for(const side of[-1,1])line(side*.42,.15,side*.85,.75,.1);}
    else if(p.weapon===2)for(const side of[-1,1]){line(side*.5,-.3,side*.85,.2);line(side*.85,.2,side*.5,.65);}
    if(flash>.1)line(0,1,0,1.2+flash*.85,.11*flash);
  }
  projectile(b,t){
    const f=this.frame(b.x,b.z,.7,b.angle);
    if(Vector3.Dot(f.normal,this.camera.position.subtract(f.point))<=.1)return;
    const length=b.enemy?.9:b.weapon===6?1.8:b.homing?1.7:b.weapon===4?5.5:3.8,width=(b.enemy?.25:b.weapon===6?.75:b.weapon===4?.48:.3)*(b.amplified?1.35:1);
    this.string(f.point.add(f.forward.scale(-length*.5)),f.point.add(f.forward.scale(length*.5)),width,b.enemy?'#ff4c77':b.color,true);
    if(b.trail&&!b.enemy){let prev=f.point;for(const q of b.trail.slice(0,b.homing?5:3)){const point=v(this.map(q.x,q.z,.65).point);this.lines.line(prev,point,width*.6,b.color);prev=point;}}
    if(b.weapon===4&&!b.enemy)for(const side of[-1,1]){
      const root=f.point.add(f.right.scale(side*.48));this.lines.line(root.add(f.forward.scale(-1.8)),root.add(f.forward.scale(1.8)),.07,b.color);
      this.string(root,root.add(f.forward.scale(.6)).add(f.right.scale(side*.55)),.1,b.color);
    }
    if(b.explosionRadius){
      this.ring(b.x,b.z,1.25+Math.sin(t*12)*.12,.7,b.color,.09,24);
      for(let i=0;i<3;i++){const a=t*4+i*TAU/3,offset=f.right.scale(Math.sin(a)*.95).add(f.forward.scale(Math.cos(a)*.95));this.lines.line(f.point.add(offset),f.point.add(offset.scale(1.45)),.12,'#bcf5ff');}
    }
    if(b.homing){this.solid('dart',f,.62,b.color);for(const side of[-1,1]){const root=f.point.add(f.right.scale(side*.22));this.lines.line(root,root.add(f.forward.scale(-1.4)),.1,'#ffad42');}}
    if(b.weapon===3&&!b.enemy){
      const tip=f.point.add(f.forward.scale(1.7));for(const side of[-1,1])this.lines.line(tip,tip.add(f.forward.scale(-.65)).add(f.right.scale(side*.35)),.11,b.color);
    }
  }
  weaponPickup(drop) {
    const screen=this.screenPoint(drop.x,.15,drop.z);
    if(!screen.visible||screen.x< -40||screen.x>this.width+40||screen.y< -40||screen.y>this.height+40)return;
    const color=WEAPONS[drop.weapon].color,f=this.frame(drop.x,drop.z,.19),selected=this.navigationEntity?.type==='weapon'&&this.navigationEntity.id===drop.id;
    const point=(x,z)=>f.point.add(f.right.scale(x)).add(f.forward.scale(z));
    const line=(a,b,c,width)=>{const lift=c==='#101e33'?f.normal.scale(-.14):Vector3.Zero();this.lines.line(point(...a).add(lift),point(...b).add(lift),width,c);};
    // White equipment seals and dark backing distinguish pickups from the solid
    // colored enemy polyhedra. Everything remains printed on one tangent plane.
    for(let i=0;i<40;i++){
      const a=i*TAU/40,b=(i+1)*TAU/40,r=1.94;
      const from=[Math.sin(a)*r,Math.cos(a)*r],to=[Math.sin(b)*r,Math.cos(b)*r];
      line(from,to,'#101e33',.3);
      if(i%10<8)line(from,to,selected?'#ffffff':'#dcefff',.07);
    }
    for(const stroke of pickupArt(drop.weapon,color)){
      line(stroke.a,stroke.b,'#101e33',stroke.width+.16);
      line(stroke.a,stroke.b,stroke.color,stroke.width);
    }
    // The small "take" chevron is shared by equipment, never by threats.
    line([-.3,-1.6],[0,-1.8],'#ffffff',.095);line([0,-1.8],[.3,-1.6],'#ffffff',.095);
    if(selected)for(let i=0;i<32;i++){const a=i*TAU/32,b=(i+1)*TAU/32;line([Math.sin(a)*2.2,Math.cos(a)*2.2],[Math.sin(b)*2.2,Math.cos(b)*2.2],color,.055);}
  }
  gatePortal(gate,t,player) {
    const f=this.frame(gate.x,gate.z,.15),near=Math.max(0,1-Math.hypot(gate.x-player.x,gate.z-player.z)/9),warp=gate.warpTime||0;
    const phase=t*(this.sim.reduced?.32:.7)+(gate.id%2)*Math.PI,center=f.point.add(f.normal.scale(2));
    const point=(a,r,depth=0)=>center.add(f.right.scale(Math.sin(a)*r)).add(f.normal.scale(Math.cos(a)*r*1.18)).add(f.forward.scale(depth));
    this.ring(gate.x,gate.z,2.15,.13,gate.color,.07,32);
    for(const side of[-1,1])for(let i=0;i<36;i++){
      if(i%6===5)continue;
      const a=i*TAU/36+phase*side,r=1.55+(side+1)*.17;
      this.string(point(a,r,side*.15),point(a+TAU/36*.85,r,side*.15),.09+near*.04,gate.color);
    }
    for(let i=0;i<5;i++){
      const a=phase+i*TAU/5,r=1.4-near*.28;
      this.string(point(a,r),point(a+.3,r*.72),.075,gate.color);
      this.string(point(a+.3,r*.72),point(a+.49,r*.92),.045,'#dbf8ff');
    }
    // Slow helical packets enter the aperture; a warp blows the iris outward.
    for(let i=0;i<(this.sim.reduced?3:6);i++){
      const u=(t*.32+i/6)%1,a=phase+i*TAU/6,r=(1-u)*1.2;
      this.string(point(a,r,(u-.5)*1.1),point(a+.18,r+.16,(u-.5)*1.1),.05+near*.03,gate.color);
    }
    if(warp>0)for(let k=0;k<3;k++){
      const u=Math.max(0,Math.min(1,(1.1-warp-k*.12)/.7));if(u<=0||u>=1)continue;
      let previous;for(let i=0;i<=32;i++){const q=point(i*TAU/32,1.6+u*2.5,(u-.5)*2);if(previous)this.string(previous,q,.15*(1-u),k?'#dffaff':gate.color);previous=q;}
    }
  }
  worldPoint(nx,ny){const center=this.screenPoint(0,.85,0),dx=nx*this.width-center.x,dy=center.y-ny*this.height;return{screenAngle:Math.hypot(dx,dy)<8?undefined:Math.atan2(dx,dy)};}
  navigationPoint(nx,ny){const ray=this.scene.createPickingRay(nx*this.engine.getRenderWidth(),ny*this.engine.getRenderHeight(),Matrix.Identity(),this.camera,false);return this.surface.raycast(ray.origin,ray.direction);}
  navigationLocal(){
    if(this.navigationEntity){
      const {type,id}=this.navigationEntity;
      if(type==='boss'){
        const boss=this.sim.enemies.find(e=>e.id===id&&!e.dead);if(!boss)return;
        const ports=bossPorts(boss).filter(p=>p.hp>0);
        if(ports.length){const port=ports.find(p=>p.index===this.navigationEntity.portIndex)||ports.sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];this.navigationEntity.portIndex=port.index;const reach=WEAPONS[this.sim.player.weapon].reach||5,standOff=Math.min(10,Math.max(boss.radius+1.5,reach*.7+boss.radius*.7));return{x:boss.x+Math.sin(port.angle)*standOff,z:boss.z+Math.cos(port.angle)*standOff,aimX:boss.x,aimZ:boss.z,approach:1.1};}
        return boss;
      }
      return type==='weapon'?this.sim.weaponDrops.find(d=>d.id===id):type==='gate'?this.sim.gates.find(g=>g.id===id):this.sim.exitZone;
    }
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
  screenPoint(x,y,z){const mapped=this.map(x,z,y),point=Vector3.Project(v(mapped.point),Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.width,this.height));return{x:point.x,y:point.y,visible:Vector3.Dot(v(mapped.normal),this.camera.position.subtract(v(mapped.point)))>0&&point.z>0&&point.z<1};}
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
    const pose=this.cameraRig.update(s,this.width,this.height,dt);
    this.camera.position=pose.position;this.camera.upVector=pose.up;this.camera.setTarget(pose.target);this.camera.fov=pose.fov;
    this.viewForward=pose.target.subtract(pose.position).normalize();
    this.mapCache.clear();this.mappedSurface=s;
    this.scene.updateTransformMatrix(true);
    this.worldMat.setVector3('eye',this.camera.position);this.worldMat.setMatrix('vp',this.scene.getTransformMatrix());
    for(const[key,value]of Object.entries({time:s.time,shapeA:s.from,shapeB:s.to,morph:s.mix,pulseAge:s.pulseAge,floorPhase:s.floorPhase,worldScale:s.worldScale,terrainStrength:s.terrainStrength}))this.worldMat.setFloat(key,value);
    this.worldMat.setColor3('accent',col(sim.level.color));this.worldMat.setVector3('playerWorld',v(s.anchor));this.worldMat.setVector3('pulseOrigin',v(s.pulseOrigin));this.glow.intensity=sim.reduced?.35:CONFIG.bloom*.85;
    this.lines.begin();for(const batch of this.solids.values())batch.begin();
    for(const gate of sim.gates){
      if(!gate.placed){let found=false;for(const dx of[0,2,-2,4,-4,6,-6]){for(const z of[0,2,-2,4,-4,7,-7,10,-10]){const point=this.map(gate.x+dx,z).point;if(s.ridgeHeight(point)<.35){gate.x+=dx;gate.z=z;found=true;break;}}if(found)break;}gate.placed=true;}
      this.gatePortal(gate,t,p);
    }
    if(p.hp>0){
      const frame=this.frame(0,0,.85,p.angle);this.solid('ship',frame,1.4,p.invuln>0&&Math.sin(t*18)>0?'#e6ffff':'#54fff1');
      this.lines.line(frame.point.add(frame.forward.scale(-.2)),frame.point.add(frame.forward.scale(1.08)),.075,'#efffff');
      for(const side of[-1,1]){const a=frame.point.add(frame.right.scale(side*.37)).add(frame.forward.scale(-.7)),b=a.add(frame.forward.scale(-(.3+Math.min(.9,Math.hypot(p.vx,p.vz)*.065))));this.string(a,b,.09,'#36aaff');}
      this.weaponMuzzle(p);
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
      if(e.type==='fracture'){
        const stage=e.fractureStage,width=FRACTURE_STAGES[stage].width,warm=e.warmup>0?Math.max(.08,1-e.warmup/Math.max(.01,e.spawnWarmup)):1;
        const f=this.frame(e.x,e.z,.18+width*.48*warm,e.angle),color=e.hit>0?'#fff2f0':e.color,damage=1-e.hp/e.maxHp;
        if(Vector3.Dot(f.normal,this.camera.position.subtract(f.point))<=.1)continue;
        if(stage>=2){
          const offset=width*(.245+damage*.018)*warm,cell=width*.465*warm;
          for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1]){
            const part={...f,point:f.point.add(f.right.scale(x*offset)).add(f.normal.scale(y*offset)).add(f.forward.scale(z*offset))};
            this.solid('cube',part,cell,color);
          }
          // Glowing fault seams run across the top, previewing the next split.
          for(const side of[-1,1])this.string(f.point.add(f.normal.scale(width*.49*warm)).add(f.right.scale(side*width*.45*warm)),f.point.add(f.normal.scale(width*.49*warm)),.06+damage*.08,color);
        }else this.solid('cube',f,width*warm,color);
        if(e.warmup>0)this.ring(e.x,e.z,e.radius+.4,.15,color,.08,24);
        continue;
      }
      const warm=e.warmup>0?Math.max(.04,1-e.warmup/Math.max(.01,e.spawnWarmup)):1,kind=({diamond:'diamond',cube:'cube',spinner:'cross',mote:'dart',dart:'dart',prism:'prism',weaver:'hex',guard:'cube',splitter:'cube',anchor:'cube',boss:'cube'})[e.type];
      const size=(e.type==='boss'?5:e.type==='splitter'?3:e.type==='guard'?2:e.type==='anchor'?2.1:1.25)*e.size*warm,frame=this.frame(e.x,e.z,.55+size*.23,e.angle),color=e.hit>0?'#efffff':e.type==='boss'?(e.shielded?'#ff53c9':'#67ffff'):e.color;
      if(Vector3.Dot(frame.normal,this.camera.position.subtract(frame.point))<=.1)continue;
      const spin=e.type==='dart'||e.type==='mote'||e.type==='prism'?0:e.age*(e.type==='spinner'?2.1:.45)+e.phase;
      this.solid(kind,frame,size,color,spin);
      if(e.type==='dart'&&(e.state==='windup'||e.state==='charge')){
        const length=e.state==='charge'?2.8:.9;
        this.string(frame.point,frame.point.add(frame.forward.scale(length)),e.state==='charge'?.18:.07,'#ffd29c');
      }
      if(e.type==='weaver'){this.ring(e.x,e.z,1.25,.18,e.color,e.windup>0?.12:.04,16);for(const side of[-1,1])this.string(frame.point.add(frame.right.scale(side*.8)),frame.point.add(frame.right.scale(side*1.2)).add(frame.forward.scale(.6)),.08,e.color);}
      if(e.type==='anchor'){this.ring(e.x,e.z,2.1,.15,'#ffe56b',.075,32);this.ring(e.x,e.z,2.6,.15,'#ffe56b',.025,32);this.solid('diamond',frame,size*.45,'#fff2bc',-spin);}
      if(e.type==='boss'){
        for(const port of bossPorts(e)){
          const r=port.hp>0?3.65:3.1,angle=port.angle,mark=this.frame(e.x+Math.sin(angle)*r,e.z+Math.cos(angle)*r,1.4,angle),c=port.hp>0?'#72fff0':'#334b69';
          if(port.hp>0){this.solid('diamond',mark,.95,c,-spin);this.string(frame.point,mark.point,.11,c);}
          for(let i=-4;i<4;i++){const a=angle+i*.13,b=angle+(i+1)*.13;
            const from=v(this.map(e.x+Math.sin(a)*4.3,e.z+Math.cos(a)*4.3,.25).point),to=v(this.map(e.x+Math.sin(b)*4.3,e.z+Math.cos(b)*4.3,.25).point);this.string(from,to,port.hp>0?.16:.04,c);
          }
        }
        if(e.armorHit>0)this.ring(e.x,e.z,3.1,.7,'#ff5a99',.12,32);
      }
      if(e.type==='guard'){
        const n=3,r=1.45;
        for(let i=0;i<n;i++){const a=t*.8+i*TAU/n,orb={...frame,point:frame.point.add(frame.right.scale(Math.sin(a)*r)).add(frame.forward.scale(Math.cos(a)*r)).add(frame.normal.scale(Math.sin(a*2+t*.6)*.6))};this.solid(e.type==='boss'?'cube':'diamond',orb,e.type==='boss'?.8:.4,color,-spin);}
      }
    }
    const reactors=sim.enemies.filter(e=>e.type==='anchor'&&!e.dead);
    for(let i=0;i<reactors.length;i++)for(let j=i+1;j<reactors.length;j++){
      const a=reactors[i],b=reactors[j];if(Math.hypot(a.x-b.x,a.z-b.z)>6.5)continue;
      let previous;for(let k=0;k<=4;k++){const f=k/4,point=v(this.map(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,.32+Math.sin(f*Math.PI)*.35).point);if(previous)this.lines.line(previous,point,.035,'#ffe56b');previous=point;}
    }
    for(const rift of sim.rifts){
      if(rift.cancelled)continue;const active=rift.age>=rift.warning,e=riftEnds(rift);let previous;
      for(let i=0;i<=24;i++){const u=i/24,point=v(this.map(e.ax+(e.bx-e.ax)*u,e.az+(e.bz-e.az)*u,active?.5:.16).point);if(previous&&(active||i%3!==0))this.string(previous,point,active?.4:.07,rift.color,active);previous=point;}
      for(const[x,z]of[[e.ax,e.az],[e.bx,e.bz]])this.ring(x,z,active?.65:.35,.25,rift.color,.06,12);
    }
    for(const drop of sim.weaponDrops)this.weaponPickup(drop,t);
    if(sim.exitZone){const z=sim.exitZone;for(let i=0;i<3;i++)this.ring(z.x,z.z,z.radius+i*.36,.2+i*.2,'#91ff79',.1-i*.025,48);const f=this.frame(z.x,z.z,1.6);this.solid('diamond',f,1.1,'#c1ff99',t);this.lines.line(f.point,f.point.add(f.normal.scale(7)),.065,'#91ff79');}
    if(this.navigationTarget||this.navigationEntity){const goal=this.navigationLocal();if(goal)this.ring(goal.x,goal.z,.65+Math.sin(t*6)*.08,.25,'#e4ffff',.055,24);}
    const groups=new Map();
    for(const b of sim.bullets){
      if(Math.hypot(b.x,b.z)>42)continue;
      this.projectile(b,t);
      if(b.strokeGroup&&!b.enemy){if(!groups.has(b.strokeGroup))groups.set(b.strokeGroup,[]);groups.get(b.strokeGroup).push(b);}
    }
    for(const group of groups.values())for(let i=1;i<group.length;i++){
      const a=group[i-1],b=group[i];if(Math.hypot(a.x-b.x,a.z-b.z)>=9||a.weapon===5)continue;
      let previous;for(let j=0;j<=3;j++){const f=j/3,bend=Math.sin(f*Math.PI)*.6,point=v(this.map(a.x+(b.x-a.x)*f+Math.sin(a.angle)*bend,a.z+(b.z-a.z)*f+Math.cos(a.angle)*bend,.7).point);if(previous)this.string(previous,point,.13,a.color);previous=point;}
    }
    for(const attack of sim.attacks){
      const progress=1-attack.life/attack.maxLife;let previous,edgeA,edgeB;
      const n=24;
      for(let i=0;i<=n;i++){
        const f=i/n;let x,z;
        if(attack.ribbon){const q=ribbonPoint(attack,attack.angle,attack.reach,t,f);x=q.x;z=q.z;}
        else if(attack.weapon===1){const r=attack.reach*Math.sin(Math.min(1,progress*1.5)*Math.PI/2)*f,side=Math.sin(f*8-progress*12)*1.4*f;x=attack.x+Math.sin(attack.angle)*r+Math.cos(attack.angle)*side;z=attack.z+Math.cos(attack.angle)*r-Math.sin(attack.angle)*side;}
        else{const angle=attack.angle-attack.arc*.5+attack.arc*(f*.65+progress*.35),r=attack.reach*(.55+Math.sin(f*Math.PI)*.35);x=attack.x+Math.sin(angle)*r;z=attack.z+Math.cos(angle)*r;}
        const ribbonColors=['#ff5de9','#ffb14a','#b7ff48','#54fff1','#48adff','#a28bff'],color=attack.ribbon?ribbonColors[Math.min(5,Math.floor(f*6))]:attack.color;
        const point=v(this.map(x,z,.85).point);if(previous)this.string(previous,point,attack.ribbon?.36:(attack.heavy?.34:attack.weapon===0?.19:.28)*(1-progress*.6),color,attack.weapon!==0||attack.heavy);previous=point;
        if(attack.ribbon){
          const side=.18*Math.sin(f*Math.PI),right=this.frame(x,z,.85).right;
          const a=point.add(right.scale(side)),b=point.add(right.scale(-side));
          if(edgeA)this.lines.line(edgeA,a,.08,'#eaffff');if(edgeB)this.lines.line(edgeB,b,.08,color);edgeA=a;edgeB=b;
        }
        if(attack.weapon===1&&i===n)this.ring(x,z,.28+progress*.3,.85,'#fff2fc',.1,12);
      }
    }
    const particleStep=Math.max(1,Math.ceil(sim.particles.length/(sim.reduced?100:220)));
    for(const fragment of sim.fragments.slice(-(sim.reduced?12:32))){if(Math.hypot(fragment.x,fragment.z)>30)continue;this.solid('cube',this.frame(fragment.x,fragment.z,fragment.y,fragment.spin),fragment.size*Math.min(1,fragment.life*3),fragment.color,fragment.spin+t*5);}
    for(let i=0;i<sim.particles.length;i+=particleStep){const particle=sim.particles[i];if(Math.hypot(particle.x,particle.z)>34)continue;
      const life=particle.life/particle.maxLife,f=this.frame(particle.x,particle.z,Math.max(.2,particle.y*.4),Math.atan2(particle.vx,particle.vz));
      const length=(.18+particle.size*8)*life;this.lines.line(f.point,f.point.add(f.forward.scale(length)),Math.max(.025,particle.size*1.4*life),particle.color);
    }
    for(const r of sim.rings.slice(-16)){if(Math.hypot(r.x,r.z)>38)continue;const progress=1-r.life/r.maxLife;this.ring(r.x,r.z,r.radius*(1-(1-progress)**2),.22,r.color,Math.max(.015,.14*(1-progress)),24);}
    for(const bolt of sim.bolts){let previous;for(let i=0;i<=10;i++){const f=i/10,point=v(this.map(bolt.x+(bolt.tx-bolt.x)*f+Math.sin(i*3+t*24)*.25,bolt.z+(bolt.tz-bolt.z)*f,.9).point);if(previous)this.string(previous,point,.16,bolt.color);previous=point;}}
    for(const drop of sim.pickups){if(Math.hypot(drop.x,drop.z)>38)continue;const f=this.frame(drop.x,drop.z,.45,drop.age);if(Vector3.Dot(f.normal,this.camera.position.subtract(f.point))>.1)this.solid('cube',f,drop.type==='heart'?.55:.24,drop.type==='heart'?'#ff73c3':'#aaff74',0);}
    for(let i=0;i<p.orbit;i++){const a=sim.time*2.7+i*TAU/p.orbit;this.solid('dart',this.frame(Math.cos(a)*2.5,Math.sin(a)*2.5,.7,-a),.5,'#ffe56b',a);}
    for(let i=1;i<p.tail.length;i++){const a=p.tail[i-1],b=p.tail[i];this.lines.line(v(this.map(a.x,a.z,.3).point),v(this.map(b.x,b.z,.3).point),.18*(1-i/p.tail.length),'#197eb0');}
    this.lines.end();for(const batch of this.solids.values())batch.end();
  }
  render(hud){const ctx=this.hudTexture.getContext();ctx.save();ctx.setTransform(this.uiPixel,0,0,this.uiPixel,0,0);ctx.clearRect(0,0,this.width,this.height);hud.draw(ctx,this.width,this.height);ctx.restore();this.hudTexture.update(true);this.scene.render();}
}
