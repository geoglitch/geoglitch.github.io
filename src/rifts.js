import { segmentCircle } from './math.js';
export const RIFT_WARNING=1.65,RIFT_LIVE=.8;
export function riftEnds(rift){const dx=Math.sin(rift.angle)*rift.length/2,dz=Math.cos(rift.angle)*rift.length/2;return{ax:rift.x-dx,az:rift.z-dz,bx:rift.x+dx,bz:rift.z+dz};}
export function riftTouches(rift,actor,extra=0){const e=riftEnds(rift);return segmentCircle(e.ax,e.az,e.bx,e.bz,actor.x,actor.z,(actor.radius||.65)+rift.width+extra);}
export function riftDistance(rift,point){const e=riftEnds(rift),dx=e.bx-e.ax,dz=e.bz-e.az,t=Math.max(0,Math.min(1,((point.x-e.ax)*dx+(point.z-e.az)*dz)/(dx*dx+dz*dz)));return Math.hypot(point.x-e.ax-dx*t,point.z-e.az-dz*t);}
