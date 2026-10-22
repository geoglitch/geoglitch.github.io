import { CONFIG } from './config.js';

// Physical attack sounds over a gradually layered, filtered EDM arrangement.
// All audio is procedural: no chiptune square bleeps or external audio downloads.
export class AudioEngine {
  constructor(){this.ctx=null;this.muted=false;this.music=true;this.beat=0;this.nextBeat=0;this.lastKill=0;this.lastPickup=0;}
  unlock(){
    if(!this.ctx){
      this.ctx=new(window.AudioContext||window.webkitAudioContext)();const c=this.ctx;
      this.master=c.createGain();this.master.gain.value=this.muted?0:CONFIG.volume;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-15;limiter.ratio.value=8;limiter.attack.value=.002;limiter.release.value=.16;
      this.master.connect(limiter);limiter.connect(c.destination);
      this.musicGain=c.createGain();this.musicGain.gain.value=.78;this.musicGain.connect(this.master);
      this.drumsGain=c.createGain();this.drumsGain.gain.value=.9;this.drumsGain.connect(this.master);
      const send=c.createGain(),delay=c.createDelay(1),feedback=c.createGain(),filter=c.createBiquadFilter(),pan=c.createStereoPanner();
      send.gain.value=.16;delay.delayTime.value=.336;feedback.gain.value=.28;filter.type='lowpass';filter.frequency.value=2800;pan.pan.value=.35;
      this.musicGain.connect(send);send.connect(delay);delay.connect(filter);filter.connect(pan);pan.connect(this.master);filter.connect(feedback);feedback.connect(delay);
      this.noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=this.noiseBuffer.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      this.nextBeat=c.currentTime+.05;
    }
    if(this.ctx.state==='suspended')this.ctx.resume();
  }
  setMute(value=!this.muted){this.muted=value;if(this.ctx)this.master.gain.setTargetAtTime(value?0:CONFIG.volume,this.ctx.currentTime,.04);}
  tone(frequency,duration,type='sine',volume=.1,endFrequency=frequency,delay=0,pan=0,cutoff=1800){
    if(!this.ctx||this.muted)return;
    const c=this.ctx,t=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter(),stereo=c.createStereoPanner();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(18,endFrequency),t+duration);
    filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,t);filter.frequency.exponentialRampToValueAtTime(Math.max(100,cutoff*.35),t+duration);filter.Q.value=.7;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    stereo.pan.value=Math.max(-.8,Math.min(.8,pan));osc.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.musicMode==='synth'?this.musicGain:this.musicMode==='drums'?this.drumsGain:this.master);osc.start(t);osc.stop(t+duration+.02);
  }
  noise(duration,volume=.1,frequency=2200,delay=0,pan=0,kind='bandpass'){
    if(!this.ctx||this.muted)return;
    const c=this.ctx,t=c.currentTime+delay,source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter(),stereo=c.createStereoPanner();
    source.buffer=this.noiseBuffer;filter.type=kind;filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(Math.max(90,frequency*.35),t+duration);filter.Q.value=.55;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    stereo.pan.value=pan;source.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.musicMode==='synth'?this.musicGain:this.musicMode==='drums'?this.drumsGain:this.master);source.start(t,Math.random());source.stop(t+duration+.02);
  }
  impact(size=1,pan=0){
    const detune=.88+Math.random()*.24;
    this.tone(100*detune,.18*size,'sine',.23,28,0,pan,600);
    this.tone(173*detune,.08,'triangle',.08,75,0,pan,950);
    this.noise(.12*size,.22,1700+Math.random()*1800,0,pan,'bandpass');
    this.noise(.035,.12,6500,.008,pan,'highpass');
    if(size>1.6){this.noise(.5,.17,550,.025,pan,'lowpass');this.tone(49,.7,'sine',.26,24,0,pan,200);}
  }
  event(e){
    if(!this.ctx||this.muted)return;const now=this.ctx.currentTime,pan=Math.max(-.7,Math.min(.7,(e.x||0)/35));
    switch(e.type){
      case'swing':this.noise(e.weapon===1?.22:.13,e.heavy?.2:.12,e.weapon===1?3400:2100);break;
      case'meleeHit':this.impact(e.size||1);this.noise(.12,.16,1100);break;
      case'weaponPickup':this.noise(.16,.12,4100);[196,294,392].forEach((f,i)=>this.tone(f,.24,'triangle',.08,f,i*.05,0,1600));break;
      case'shoot':{
        if(e.weapon===2){this.noise(.085,.13,3900);this.tone(130,.12,'triangle',.07,45,0,0,700);}
        else{this.noise(e.weapon===1?.15:.065,e.weapon===1?.16:.085,2500+Math.random()*1500);this.tone(e.weapon===1?95:165,e.weapon===1?.17:.07,'sine',e.weapon===1?.2:.11,45,0,0,700);}
        break;
      }
      case'kill':case'shatter':if(now-this.lastKill>.03){this.lastKill=now;this.impact(Math.max(.6,e.size||1),pan);}break;
      case'explosion':this.impact(e.size||2,pan);break;
      case'zone':this.noise(.4,.1,2400);[196,294,392].forEach((f,i)=>this.tone(f,.6,'triangle',.07,f,i*.08,0,1800));break;
      case'bossKill':case'death':this.impact(3);this.noise(.9,.2,650,0,0,'lowpass');break;
      case'burst':this.impact(3);this.noise(.7,.26,1600);this.tone(65,1,'sine',.3,22,0,0,180);break;
      case'dash':this.noise(.19,.19,3400);this.noise(.09,.08,650,0,0,'lowpass');break;
      case'hurt':this.impact(1.25);this.noise(.2,.14,750);break;
      case'pickup':if(now-this.lastPickup>.07){this.lastPickup=now;this.noise(.015,.045,6000,0,pan,'highpass');this.tone(1500+Math.random()*300,.05,'sine',.018,1200,0,pan,3000);}break;
      case'warning':case'boss':this.tone(72,.6,'sine',.15,58,0,0,300);this.noise(.45,.08,520,0,0,'lowpass');break;
      case'start':case'shift':case'upgrade':this.noise(.3,.12,1800);[63,97,141].forEach((f,i)=>this.tone(f,.6,'sine',.065,f*.96,i*.04,0,600));break;
      case'enemyShoot':this.noise(.09,.07,1900);break;
      case'charge':this.noise(.22,.08,700,0,pan,'lowpass');this.tone(520,.28,'sine',.065,260,0,pan,1800);break;
      case'overdrive':this.impact(1.8);[220,330,440,660].forEach((f,i)=>this.tone(f,.35,'sawtooth',.035,f,i*.045,0,2400));break;
      case'sisterDeploy':[220,330,440].forEach((f,i)=>this.tone(f,.22,'triangle',.055,f,i*.045,(i-1)*.4,2600));this.noise(.2,.08,3200);break;
      case'wave':this.noise(e.surge?.9:.45,e.surge?.09:.055,2000);this.tone(180,e.surge?.8:.35,'sine',.035,e.surge?620:320,0,0,900);break;
      case'waveClear':[220,261.63,329.63].forEach((f,i)=>this.tone(f,.22,'sawtooth',.035,f,i*.055,(i-1)*.2,2400));this.noise(.1,.05,4500);break;
      case'reactorChain':this.tone(65,.3,'sine',.16,28);this.noise(.18,.13,1800);this.tone(330*Math.min(3,e.count),.2,'triangle',.045,660,0,0,3000);break;
      case'warp':this.noise(.35,.12,2800);this.tone(180,.4,'triangle',.08,720,0,0,2400);break;
      case'bossAttack':this.impact(1.3);break;
      case'victory':[130.81,155.56,196,261.63].forEach((f,i)=>this.tone(f,2,'triangle',.08,f,i*.2,0,1000));break;
    }
  }
  update(sim){
    this.musicMode=false;
    if(!this.ctx||this.muted||!this.music||sim.mode!=='playing'){this.scheduled=false;return;}
    const c=this.ctx,bpm=134+Math.min(8,sim.level.chapter),step=60/bpm/4;
    if(!this.scheduled||this.tempo!==bpm||this.nextBeat<c.currentTime-.3||sim.musicBeat<this.lastMusicBeat){
      const tick=sim.musicBeat*4;this.beat=Math.ceil(tick);this.nextBeat=c.currentTime+(this.beat-tick)*step;this.scheduled=true;this.tempo=bpm;
    }
    this.lastMusicBeat=sim.musicBeat;
    const energy=Math.min(1,sim.time/25),pressure=Math.min(1,sim.enemies.length/55);
    while(this.nextBeat<c.currentTime+.1){
      const at=this.nextBeat,delay=Math.max(0,at-c.currentTime),absolute=this.beat++,b=absolute%16,bar=Math.floor(absolute/16)%8;
      const breakdown=bar===6&&sim.time>20,root=[0,0,-3,-3,5,5,-5,-5][bar],bass=55*2**(root/12),cutoff=450+energy*2400;
      this.musicMode='drums';
      if(sim.time>1.2&&b%4===0&&!breakdown){
        this.tone(165,.21,'sine',.33,40,delay,0,650);this.noise(.019,.055,5500,delay,0,'highpass');
        this.musicGain.gain.setValueAtTime(.25,at);this.musicGain.gain.exponentialRampToValueAtTime(.78,at+.2);
      }
      if(sim.time>3&&b%8===4){this.noise(.13,.12,2700,delay);this.noise(.05,.065,6100,delay+.022,0,'highpass');}
      if(sim.time>2.5&&b%2===0)this.noise(.035,b%4===2?.055:.028,9000,delay,(b%4?1:-1)*.22,'highpass');
      if(sim.time>10&&b%4===2&&!breakdown)this.noise(.12,.035,7800,delay,.2,'highpass');
      if(bar===7&&sim.time>18&&b>11)this.noise(.05,.035+(b-12)*.015,3200+(b-12)*900,delay,(b%2-.5)*.4);
      this.musicMode='synth';
      if(b===0){
        for(const[i,n]of[0,3,7].entries())this.tone(bass*4*2**(n/12),breakdown?2.2:.75,'sawtooth',breakdown?.03:.02,bass*4*2**(n/12),delay+i*.012,(i-1)*.4,breakdown?650:1200+energy*1800);
      }
      if(sim.time>4.5&&[2,3,6,8,10,11,14].includes(b)&&!breakdown){
        const n=[0,0,7,0,0,3,7][[2,3,6,8,10,11,14].indexOf(b)],f=bass*2**(n/12);
        this.tone(f,.16,'sawtooth',.085,f*.998,delay,0,cutoff);this.tone(f*.5,.18,'sine',.065,f*.5,delay,0,160);
      }
      if(sim.time>8.5&&b%2===1){
        const motif=[0,7,10,12,7,3,10,7],note=motif[Math.floor(b/2)]+(bar%2===1&&b>11?12:0),f=bass*8*2**(note/12);
        this.tone(f,.18,'sawtooth',.027+pressure*.01,f*.999,delay,Math.sin(b)*.25,1000+energy*3300);
        this.tone(f*1.004,.2,'triangle',.021,f,delay+.006,-Math.sin(b)*.25,3000);
      }
      if(sim.time>16&&b%4===0&&!breakdown){
        for(const n of[0,3,7])this.tone(bass*8*2**(n/12),.12,'sawtooth',.016,bass*8*2**(n/12),delay,0,2900);
      }
      this.nextBeat+=step;
    }
    this.musicMode=false;
  }
}
