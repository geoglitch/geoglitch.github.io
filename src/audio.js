import { CONFIG } from './config.js';
import { musicStep } from './music.js';

// Physical attack sounds over a gradually layered, filtered EDM arrangement.
// All audio is procedural: no chiptune square bleeps or external audio downloads.
export class AudioEngine {
  constructor(){this.ctx=null;this.muted=false;this.music=true;this.beat=0;this.nextBeat=0;this.lastEvents=new Map();this.fxWindow=0;this.fxVoices=0;}
  unlock(){
    if(!this.ctx){
      this.ctx=new(window.AudioContext||window.webkitAudioContext)();const c=this.ctx;
      this.master=c.createGain();this.master.gain.value=this.muted?0:CONFIG.volume;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-15;limiter.ratio.value=8;limiter.attack.value=.002;limiter.release.value=.16;
      this.master.connect(limiter);limiter.connect(c.destination);
      this.fxGain=c.createGain();this.fxGain.gain.value=.58;this.fxGain.connect(this.master);
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
  tone(frequency,duration,type='sine',volume=.1,endFrequency=frequency,delay=0,pan=0,cutoff=1800,attack=.006){
    if(!this.ctx||this.muted)return;
    const c=this.ctx,t=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter(),stereo=c.createStereoPanner();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(18,endFrequency),t+duration);
    filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,t);filter.frequency.exponentialRampToValueAtTime(Math.max(100,cutoff*.35),t+duration);filter.Q.value=.7;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+Math.min(attack,duration*.4));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    stereo.pan.value=Math.max(-.8,Math.min(.8,pan));osc.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.musicMode==='synth'?this.musicGain:this.musicMode==='drums'?this.drumsGain:this.fxGain);osc.start(t);osc.stop(t+duration+.02);
  }
  noise(duration,volume=.1,frequency=2200,delay=0,pan=0,kind='bandpass'){
    if(!this.ctx||this.muted)return;
    const c=this.ctx,t=c.currentTime+delay,source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter(),stereo=c.createStereoPanner();
    source.buffer=this.noiseBuffer;filter.type=kind;filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(Math.max(90,frequency*.35),t+duration);filter.Q.value=.55;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    stereo.pan.value=pan;source.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.musicMode==='synth'?this.musicGain:this.musicMode==='drums'?this.drumsGain:this.fxGain);source.start(t,Math.random());source.stop(t+duration+.02);
  }
  impact(size=1,pan=0){
    const detune=.86+Math.random()*.28,weight=Math.min(2.5,size);
    this.tone(92*detune,.12*weight,'sine',.13,34,0,pan,500);
    this.noise(.065*weight,.10,1300+Math.random()*1800,0,pan);
    if(size>1.6)this.noise(.24,.08,470,.015,pan,'lowpass');
  }
  admit(type,now){
    const family=type==='shatter'?'kill':type,limits={kill:.12,meleeHit:.13,pickup:.16,shoot:.09,swing:.13,enemyShoot:.22,charge:.35,wave:.5,explosion:.18};
    if(now-(this.lastEvents.get(family)??-Infinity)<(limits[family]??.08))return false;
    if(now-this.fxWindow>=.1){this.fxWindow=now;this.fxVoices=0;}
    const important=['hurt','death','bossKill','burst','weaponPickup'].includes(type);
    if(this.fxVoices>=4&&!important)return false;
    this.fxVoices++;this.lastEvents.set(family,now);return true;
  }
  event(e){
    if(!this.ctx||this.muted||!this.admit(e.type,this.ctx.currentTime))return;
    this.musicMode=false;
    const pan=Math.max(-.7,Math.min(.7,(e.x||0)/35)),variant=.9+Math.random()*.2;
    switch(e.type){
      case'swing':{
        if(e.weapon===8){this.noise(.14,.075,2800*variant,0,-.25);this.noise(.09,.045,3900*variant,.035,.25);}
        else if(e.weapon===1){this.noise(.18,.09,1800*variant,0,pan);this.tone(190*variant,.10,'triangle',.035,110,0,pan,1400);}
        else if(e.weapon===2){this.noise(.19,.08,900*variant,0,-.35);this.noise(.13,.055,2300,.035,.35);}
        else this.noise(.065,e.heavy?.07:.045,2100*variant,0,pan);
        break;
      }
      case'meleeHit':this.impact(e.size||1,pan);break;
      case'shoot':{
        if(e.weapon===3){this.noise(.075,.075,3300*variant,0,-.2);this.noise(.045,.035,4700*variant,.02,.2);}
        else if(e.weapon===4){this.noise(.035,.11,4600*variant);this.tone(110*variant,.14,'triangle',.085,48,0,0,950);}
        else if(e.weapon===5){for(const side of[-1,1])this.noise(.12,.055,1100*variant,Math.abs(side+1)*.018,side*.3);}
        else if(e.weapon===6){this.tone(57,.3,'sine',.14,37,0,0,230);this.noise(.24,.08,680*variant,0,0,'lowpass');}
        else this.noise(.05,.045,2400*variant);
        break;
      }
      case'kill':case'shatter':this.impact(Math.max(.55,e.size||1),pan);break;
      case'explosion':this.impact(e.size||2,pan);break;
      // Pickups are soft grains, without a pitched notification for every square.
      case'pickup':this.noise(.027,.033,3300*variant,0,pan,'highpass');break;
      case'weaponPickup':this.noise(.2,.065,3200*variant);this.tone(220,.3,'triangle',.045,220,0,-.25,1700);this.tone(330,.35,'triangle',.035,330,.07,.25,2000);break;
      case'zone':case'waveClear':this.noise(.22,.045,2400*variant);this.tone(220,.32,'triangle',.025,220,0,pan,1300);break;
      case'bossKill':case'death':this.impact(2.5);this.noise(.65,.11,500,0,0,'lowpass');break;
      case'burst':this.impact(2.2);this.noise(.45,.12,1300*variant);break;
      case'dash':this.noise(.13,.075,3100*variant,0,pan);break;
      case'hurt':this.impact(1.4);this.noise(.13,.10,650);break;
      case'warning':case'boss':this.noise(.32,.055,520*variant,0,0,'lowpass');break;
      case'start':case'shift':case'upgrade':this.noise(.26,.055,1800*variant);break;
      case'enemyShoot':this.noise(.055,.025,1700*variant,0,pan);break;
      case'charge':this.noise(.20,.055,850*variant,0,pan,'bandpass');break;
      case'overdrive':this.impact(1.7);this.noise(.32,.07,2400);break;
      case'sisterDeploy':this.noise(.19,.065,2700,0,-.35);this.noise(.19,.065,3400,.05,.35);break;
      case'wave':this.noise(e.surge?.45:.24,e.surge?.045:.025,1100*variant,0,pan,'lowpass');break;
      case'reactorChain':this.impact(1.6,pan);this.noise(.17,.065,2000*variant);break;
      case'warp':this.noise(.28,.07,2500*variant,0,pan);break;
      case'bossAttack':this.impact(1.2);break;
      case'victory':[220,261.63,329.63].forEach((f,i)=>this.tone(f,1.4,'triangle',.04,f,i*.12,(i-1)*.3,1700,.08));break;
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
    const pressure=Math.min(1,sim.enemies.length/80);
    while(this.nextBeat<c.currentTime+.1){
      const at=this.nextBeat,delay=Math.max(0,at-c.currentTime),absolute=this.beat++,plan=musicStep(absolute,sim.level.chapter,pressure);
      this.section=plan.section;
      for(const sound of plan.events){
        this.musicMode=sound.kind==='noise'||sound.kind==='tone'&&sound.end!==sound.f?'drums':'synth';
        // Bass slides belong to the melodic bus, kick and snare to percussion.
        if(sound.kind==='tone'&&sound.type==='sawtooth')this.musicMode='synth';
        if(sound.kind==='noise')this.noise(sound.d,sound.v,sound.f,delay+sound.delay,sound.pan,sound.filter);
        else this.tone(sound.f,sound.d,sound.type,sound.v,sound.end,delay+sound.delay,sound.pan,sound.cutoff,sound.attack);
      }
      if(plan.kick){this.musicGain.gain.setValueAtTime(.3,at);this.musicGain.gain.exponentialRampToValueAtTime(.78,at+.17);}
      this.nextBeat+=step;
    }
    this.musicMode=false;
  }
}
