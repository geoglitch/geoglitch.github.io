// Original sixteen-bar electro arrangement. Notes are semitones above A1.
const BASS=[0,null,0,12,null,0,7,null,0,null,12,0,null,7,10,null];
const HOOK=[12,null,19,15,null,19,null,22,19,null,15,null,12,10,null,7,
  12,null,15,19,null,24,22,null,19,15,null,19,15,null,10,null];
const ROOTS=[0,0,-4,-4,3,3,-2,-2];
export function musicStep(tick,chapter=0,pressure=0){
  const bar=Math.floor(tick/16),b=tick%16,phrase=bar%16;
  const section=bar<2?'intro':bar<4||phrase>=14?'build':phrase>=12?'breakdown':'drop';
  const root=ROOTS[Math.floor(bar/2)%8],bass=55*2**(root/12),events=[];
  const tone=(f,d,v,type='sine',end=f,pan=0,cutoff=2000,attack=.004,delay=0)=>events.push({kind:'tone',f,d,v,type,end,pan,cutoff,attack,delay});
  const noise=(d,v,f,pan=0,delay=0,filter='bandpass')=>events.push({kind:'noise',d,v,f,pan,delay,filter});
  const drop=section==='drop',build=section==='build',broken=section==='breakdown',swing=b%2?.008:0;
  // A dry, low kick and a small transient rather than an arcade boom.
  const kick=!broken&&b%4===0;
  if(kick){tone(142,.19,.31,'sine',43,0,580);noise(.012,.027,4700,0,0,'highpass');}
  if(!broken&&b%8===4){
    noise(.105,.105,2300,-.1);noise(.055,.045,5200,.14,.012,'highpass');tone(175,.065,.035,'triangle',130,0,900);
  }
  if(!broken&&b%2===0)noise(b%4===2?.075:.023,b%4===2?.043:.022,7400,b%4===2?.25:-.2,0,'highpass');
  if(drop&&[3,7,11,15].includes(b))noise(.018,.021,4200,Math.sin(b)*.5,.008);
  if((drop||build)&&b===14&&bar%4===3)noise(.045,.04,2200,-.3);
  if((drop||build)&&b===15&&bar%4===3)noise(.035,.055,3100,.3,.008);
  // Syncopated octave bass with a two-bar answer and a slowly opening resonant timbre.
  if(!broken&&section!=='intro'){
    const note=BASS[(b+(bar%2?2:0))%16];
    if(note!==null){const f=bass*2**(note/12),accent=b%4===0;
      tone(f,.13,accent?.095:.072,'sawtooth',f*.997,-.08,drop?1100+Math.min(1,pressure)*900:550, .004,swing);
      tone(f*.5,.15,.075,'sine',f*.5,0,180,.006,swing);
    }
  }
  // Warm chord movement; the long attack keeps pads out of the drum transients.
  if(b===0){
    const chord=root!==0?[0,4,7]:[0,3,7];
    for(const[i,n]of chord.entries())tone(bass*4*2**(n/12),broken?1.6:.65,broken?.021:.011,'triangle',bass*4*2**(n/12),(i-1)*.5,broken?1400:950,.09);
  }
  const note=HOOK[(bar%2)*16+b];
  if(note!==null&&(drop||broken||build&&b%4===0)){
    const melodicNote=root!==0&&note%12===3?note+1:note,f=bass*2**(melodicNote/12),v=drop?.057:broken?.029:.025,pan=Math.sin(tick*.8)*.32;
    tone(f,broken?.38:.14,v,'triangle',f,pan,drop?3400:1900,.006,swing);
    if(drop)tone(f*1.006,.11,.018,'sawtooth',f,-pan,2400,.004,swing+.006);
    // Sparse dotted-eighth echoes leave room for the next phrase.
    if(b%4===2)tone(f,.18,v*.24,'triangle',f,-pan,1600,.008,.336);
  }
  if(build&&b%2===0)noise(.035,.019+(phrase%2)*.01,1700+b*110,(b%4?1:-1)*.3);
  return{section,events,kick,bpm:134+Math.min(8,chapter)};
}
