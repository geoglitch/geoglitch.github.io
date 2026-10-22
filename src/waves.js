import { TAU } from './math.js';

// Formations live in the same local surface chart as combat and navigation.
export function wavePosition(pattern,index,count,angle,chapter=0,swarm=false){
  const side=pattern==='pincer'?index%2:pattern==='ritual'?index%3:0;
  const sector=angle+(pattern==='pincer'?side*Math.PI:pattern==='ritual'?side*TAU/3:0);
  const n=pattern==='pincer'?Math.floor(index/2):pattern==='ritual'?Math.floor(index/3):index;
  const spacing=swarm?.78:1.55,groups=pattern==='pincer'?2:pattern==='ritual'?3:1;
  const columns=Math.ceil(Math.sqrt(count/groups)),across=(n%columns-(columns-1)/2)*spacing;
  let lateral=across,radius=18+Math.min(5,chapter*.45)+Math.floor(n/columns)*spacing,a=sector;
  if(pattern==='hunt'){
    const row=Math.floor(n/3),wing=n%3-1;
    lateral=wing*(1.4+row*.65);radius=18+row*1.25;
  }else if(pattern==='flood'){
    const width=Math.ceil(Math.sqrt(count)*1.65);
    lateral=(n%width-(width-1)/2)*1.65;radius=21+Math.floor(n/width)*1.5;
  }else if(pattern==='spiral'){
    const f=index/Math.max(1,count-1);a=angle+f*Math.PI*1.55;radius=19+f*8;
    return{x:Math.cos(a)*radius,z:Math.sin(a)*radius,side,sector:a};
  }else if(pattern==='surge'){
    // A 100-degree opening stays centered on the ship's current travel heading.
    const gap=Math.PI*100/180,columns=Math.ceil(count/2),f=Math.floor(index/2)/Math.max(1,columns-1);
    a=angle+gap*.5+f*(TAU-gap);radius=22+(index%2)*2.2;
    return{x:Math.cos(a)*radius,z:Math.sin(a)*radius,side,sector:a};
  }
  return{x:Math.cos(a)*radius-Math.sin(a)*lateral,z:Math.sin(a)*radius+Math.cos(a)*lateral,side,sector:a};
}
