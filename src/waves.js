import { TAU } from './math.js';

const fract=x=>x-Math.floor(x);
// A low-discrepancy field: waves still arrive together, but never as tight blocks.
export function wavePosition(pattern,index,count,angle,chapter=0,swarm=false){
  const groups=pattern==='pincer'?2:pattern==='ritual'?3:1,side=index%groups,n=Math.floor(index/groups);
  const population=Math.ceil(count/groups),u=(n+.5)/population,v=fract(n*.61803398875+.31);
  const spread=22+Math.min(4,chapter*.3),depth=10+(swarm?3:0);
  let a=angle+side*TAU/groups,r=spread+v*depth;
  if(pattern==='surge'){
    // Keep a generous, readable 100-degree escape opening in the travel direction.
    a+=Math.PI*50/180+u*Math.PI*260/180;
  }else if(pattern==='pincer'||pattern==='ritual'){
    a+=(u-.5)*(pattern==='pincer'?2.35:1.65);
  }else if(pattern==='flood'){
    // A loose advancing front, spread across the full visible width rather than a grid.
    const lateral=(u-.5)*64,forward=21+v*9;
    return{x:Math.cos(a)*forward-Math.sin(a)*lateral,z:Math.sin(a)*forward+Math.cos(a)*lateral,side,sector:Math.atan2(Math.sin(a)*forward+Math.cos(a)*lateral,Math.cos(a)*forward-Math.sin(a)*lateral)};
  }else if(pattern==='spiral'){
    a+=u*Math.PI*1.85;r=21+u*8+v*10;
  }else if(pattern==='hunt'){
    a+=(u-.5)*Math.PI*1.6;
  }else a+=u*TAU;
  return{x:Math.cos(a)*r,z:Math.sin(a)*r,side,sector:a};
}
