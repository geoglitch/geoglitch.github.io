// Canvas coordinates stay in CSS pixels, independent of Retina render scaling.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function gameLayout(width,height,insets={},segments=[]){
  const edge=key=>clamp(Number(insets[key])||0,0,(key==='left'||key==='right'?width:height)*.2);
  const x=edge('left'),y=edge('top'),w=Math.max(240,width-x-edge('right')),h=Math.max(240,height-y-edge('bottom'));
  const safe={x,y,width:w,height:h},right=x+w,bottom=y+h;
  const short=h<520&&w>h,compact=w<650&&!short;
  const stickRadius=short?44:52,side=clamp(w*.14,72,110),rest=compact?220:short?85:120;
  const left={x:x+side,y:Math.max(y+160,bottom-rest)},aim={x:right-side,y:Math.max(y+160,bottom-rest)};
  const abilityY=bottom-(compact?70:short?190:242);
  const abilities=[{id:'dash',x:right-(compact?144:short?136:160),y:abilityY},{id:'burst',x:right-(compact?60:short?56:76),y:abilityY}];
  const valid=segments.filter(s=>s.width>100&&s.height>100).map(s=>({x:Math.max(x,s.x??s.left),y:Math.max(y,s.y??s.top),right:Math.min(right,s.right??(s.x+s.width)),bottom:Math.min(bottom,s.bottom??(s.y+s.height))}));
  const protect=(point,pad)=>{
    if(valid.length<2)return point;
    const rect=valid.reduce((best,s)=>{const d=Math.hypot(point.x-clamp(point.x,s.x+pad,s.right-pad),point.y-clamp(point.y,s.y+pad,s.bottom-pad));return !best||d<best.d?{...s,d}:best;},null);
    return{x:clamp(point.x,rect.x+pad,rect.right-pad),y:clamp(point.y,rect.y+pad,rect.bottom-pad)};
  };
  const columns=compact?3:short?5:9,rows=Math.ceil(9/columns),cell=compact&&w<360?44:48,startX=compact?x+(w<360?4:12):x+(w-columns*cell)/2,slots=[];
  for(let i=0;i<9;i++)slots.push({x:startX+(i%columns)*cell+22,y:bottom-28-(rows-1-Math.floor(i/columns))*cell});
  // Where a browser reports two side-by-side fold segments, keep every equipment
  // target wholly on a panel instead of placing the middle icon on the fold.
  if(valid.length===2&&Math.abs(valid[0].y-valid[1].y)<20){
    const panels=[...valid].sort((a,b)=>a.x-b.x);
    panels.forEach((p,index)=>{const count=index===0?5:4,cols=Math.min(count,Math.max(1,Math.floor((p.right-p.x-24)/48))),offset=index===0?0:5;for(let i=0;i<count;i++)slots[offset+i]={x:(p.x+p.right-cols*48)/2+24+(i%cols)*48,y:p.bottom-28-(Math.ceil(count/cols)-1-Math.floor(i/cols))*48};});
  }
  return{safe,short,compact,slotSize:cell,stickRadius,left:protect(left,stickRadius+6),right:protect(aim,stickRadius+6),abilities:abilities.map(a=>({...a,...protect(a,38)})),slots:slots.map(p=>protect(p,cell/2)),hudCenter:w/2};
}

export function installLayout(canvas,input,onResize){
  const probe=document.createElement('div');probe.id='safe-area-probe';probe.setAttribute('aria-hidden','true');document.body.append(probe);
  let queued=false;
  const update=()=>{queued=false;const css=getComputedStyle(probe),r=canvas.getBoundingClientRect();let segments=[];try{segments=Array.from(window.viewport?.segments||[]);}catch{/* Experimental fold APIs may be unavailable in an embed. */}input.clear();input.layout=gameLayout(r.width,r.height,{top:parseFloat(css.paddingTop),right:parseFloat(css.paddingRight),bottom:parseFloat(css.paddingBottom),left:parseFloat(css.paddingLeft)},segments);onResize?.();};
  const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);navigator.devicePosture?.addEventListener('change',schedule);
  update();return update;
}
