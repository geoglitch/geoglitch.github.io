import { TAU } from './math.js';

// Floor-printed illustrations. Shared units keep every pickup readable at the
// same scale; color describes the effect, while the white rim means equipment.
export function pickupArt(weapon, color) {
  const strokes=[];
  const line=(a,b,width=.1,c=color)=>strokes.push({a,b,width,color:c});
  const path=(points,width=.1,c=color)=>points.slice(1).forEach((b,i)=>line(points[i],b,width,c));
  const arc=(x,z,r,start,end,width=.1,c=color)=>path(Array.from({length:21},(_,i)=>{const a=start+(end-start)*i/20;return[x+Math.sin(a)*r,z+Math.cos(a)*r];}),width,c);
  const ship=(x,z,s)=>path([[x,z+s],[x-s*.62,z-s*.5],[x,z-s*.18],[x+s*.62,z-s*.5],[x,z+s]],.105);
  if(weapon===0||weapon===1||weapon===8){
    path([[-1.25,-1],[-.9,-.65],[-.65,-.9]],.16,'#f1ffff');
    const rainbow=['#ff5de9','#ffb14a','#b7ff48','#54fff1','#48adff','#a28bff'];
    let previous=[-.85,-.65];
    for(let i=1;i<=28;i++){const u=i/28,q=[-.85+u*2,-.5+Math.sin(u*Math.PI*1.3)*1.05];line(previous,q,weapon===8?.23:.15,weapon===8?rainbow[Math.min(5,Math.floor(u*6))]:color);previous=q;}
    if(weapon!==8)arc(.13,.22,.95,-.5,1.65,.045,'#f1ffff');
  }else if(weapon===2){
    arc(0,0,1.05,-.55,4.2,.18);arc(0,0,.66,-.55,4.2,.065,'#f1ffff');
    path([[-.92,-.52],[-1.25,-.75],[-.95,-1.14]],.16);path([[.85,.62],[1.25,.75],[1.16,1.15]],.16);
  }else if(weapon===3){
    path([[-.4,-1.15],[-.4,-.75],[.4,-.75],[.4,-1.15]],.13,'#f1ffff');
    for(let i=-1;i<=1;i++){const x=i*.83;path([[i*.17,-.55],[x,.5],[x-.18,.38],[x,1.15],[x+.18,.38],[x,.5]],.13);}
  }else if(weapon===4){
    for(const side of[-1,1]){path([[side*.48,-1.15],[side*.48,.72],[side*.14,1.3]],.14);for(const z of[-.65,-.25,.15])line([side*.25,z],[side*.6,z],.08,'#f1ffff');}
    line([0,-.8],[0,1.4],.18);path([[-.2,1.05],[0,1.4],[.2,1.05]],.1,'#f1ffff');
  }else if(weapon===5){
    for(let i=-1;i<=1;i++){
      const x=i*.85,z=i===0?.1:-.22;
      path([[x-.19,z-.42],[x-.19,z+.42],[x,z+.85],[x+.19,z+.42],[x+.19,z-.42],[x-.19,z-.42]],.12);
      path([[x-.25,z-.5],[x-.12,z-.95],[x+.1,z-.76]],.05,'#f1ffff');
    }
  }else if(weapon===6){
    arc(0,0,.53,0,TAU,.19);arc(0,0,.88,.2,2.2,.06,'#f1ffff');arc(0,0,.88,3.3,5.3,.06,'#f1ffff');
    for(let i=0;i<8;i++){const a=i*TAU/8;line([Math.sin(a)*1.02,Math.cos(a)*1.02],[Math.sin(a)*1.42,Math.cos(a)*1.42],i%2?.1:.15);}
    line([-.18,0],[.18,0],.12,'#f1ffff');line([0,-.18],[0,.18],.12,'#f1ffff');
  }else if(weapon===7){
    for(const side of[-1,1]){ship(side*.72,.1,.9);line([side*.72,-.55],[side*.72,-1.18],.13);line([side*.98,-.7],[side*.98,-1.05],.055,'#f1ffff');}
    path([[-.25,-.05],[0,.22],[.25,-.05]],.08,'#f1ffff');
  }
  return strokes;
}
