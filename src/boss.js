import { TAU } from './math.js';

export function bossPorts(boss){
  return (boss.ports||[]).map((hp,index)=>{const angle=boss.portAngle+index*TAU/3;return{index,hp,angle,x:boss.x+Math.sin(angle)*3.6,z:boss.z+Math.cos(angle)*3.6};});
}
// Three rotating armor locks: break one from its side, then reposition for the others.
export function strikeBoss(boss,damage,source){
  if(!boss.ports?.some(hp=>hp>0))return{damage,index:-1,broken:false};
  const angle=Math.atan2(source.x-boss.x,source.z-boss.z);
  const port=bossPorts(boss).find(p=>p.hp>0&&Math.abs(Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle)))<.63);
  if(!port)return{damage:0,index:-1,broken:false};
  const applied=Math.min(damage,port.hp);boss.ports[port.index]=Math.max(0,port.hp-damage);
  return{damage:applied,index:port.index,broken:boss.ports[port.index]===0};
}
