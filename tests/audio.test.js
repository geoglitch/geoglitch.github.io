import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio.js';
import { musicStep } from '../src/music.js';
const bars=(from,count)=>Array.from({length:count*16},(_,i)=>musicStep(from*16+i));

test('the original score builds into drops and makes space in its breakdown',()=>{
  assert.equal(musicStep(0).section,'intro');assert.equal(musicStep(32).section,'build');assert.equal(musicStep(64).section,'drop');assert.equal(musicStep(192).section,'breakdown');assert.equal(musicStep(224).section,'build');assert.equal(musicStep(256).section,'drop');
  const drop=bars(4,2),breakdown=bars(12,2);assert.equal(drop.filter(p=>p.kick).length,8);assert.equal(breakdown.filter(p=>p.kick).length,0);
  assert.ok(drop.flatMap(p=>p.events).length>breakdown.flatMap(p=>p.events).length*2);
  assert.notDeepEqual(drop.slice(0,16),drop.slice(16));
});
test('music notes, envelopes and stereo values remain finite over a long run',()=>{
  for(let tick=0;tick<2048;tick++)for(const e of musicStep(tick,9,1).events){
    assert.ok(Number.isFinite(e.f+e.d+e.v+e.delay+e.pan));assert.ok(e.f>=20&&e.f<10000);assert.ok(e.d>0&&e.d<=2);assert.ok(e.v>0&&e.v<=.35);assert.ok(Math.abs(e.pan)<=.8);
    if(e.kind==='tone'){assert.ok(e.end>0);assert.ok(e.attack>0&&e.attack<e.d);}
  }
});
test('kill showers and energy collection are throttled while important feedback remains available',()=>{
  const a=new AudioEngine();let kills=0,pickups=0;
  for(let n=0;n<100;n++){const time=n/100;if(a.admit(n%2?'kill':'shatter',time))kills++;if(a.admit('pickup',time))pickups++;}
  assert.ok(kills<=9);assert.ok(pickups<=7);
  const b=new AudioEngine();for(const e of['kill','shoot','swing','pickup'])assert.ok(b.admit(e,1));assert.equal(b.admit('wave',1),false);assert.equal(b.admit('hurt',1),true);
});
test('energy pickups are unpitched and weapon textures differ without identical notification chords',()=>{
  const a=new AudioEngine(),calls=[];a.ctx={currentTime:1};a.tone=(...args)=>calls.push(['tone',...args]);a.noise=(...args)=>calls.push(['noise',...args]);
  a.event({type:'pickup'});assert.equal(calls.length,1);assert.equal(calls[0][0],'noise');
  const signatures=[];for(const weapon of[3,4,5,6]){calls.length=0;a.ctx.currentTime++;a.event({type:'shoot',weapon});signatures.push(calls.map(c=>[c[0],c[1],c[2]]));}
  assert.equal(new Set(signatures.map(JSON.stringify)).size,4);
});
test('music scheduling follows the gameplay beat, pauses cleanly and routes effects separately',()=>{
  const a=new AudioEngine(),routes=[],gain={setValueAtTime(){},exponentialRampToValueAtTime(){}};a.ctx={currentTime:12};a.musicGain={gain};a.tone=()=>routes.push(a.musicMode);a.noise=()=>routes.push(a.musicMode);
  const sim={mode:'playing',musicBeat:16,time:8,level:{chapter:0},enemies:[]};a.update(sim);assert.equal(a.section,'drop');assert.ok(routes.includes('synth')&&routes.includes('drums'));assert.equal(a.musicMode,false);
  const beat=a.beat;sim.mode='paused';a.ctx.currentTime+=5;a.update(sim);assert.equal(a.beat,beat);
  sim.mode='playing';a.update(sim);assert.ok(a.beat<=beat+1);a.music=false;a.event({type:'hurt'});assert.equal(routes.at(-1),false);
});
test('Web Audio mixes combat through a quieter bus independent of music and drum ducking',()=>{
  const nodes=[],param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
  const node=kind=>{const n={kind,connections:[],connect(to){this.connections.push(to);},gain:param(),frequency:param(),Q:param(),pan:param(),delayTime:param(),threshold:param(),ratio:param(),attack:param(),release:param(),start(){},stop(){}};nodes.push(n);return n;};
  class Context{constructor(){this.currentTime=0;this.sampleRate=100;this.destination=node('destination');this.state='running';}createGain(){return node('gain');}createDynamicsCompressor(){return node('limiter');}createDelay(){return node('delay');}createBiquadFilter(){return node('filter');}createStereoPanner(){return node('pan');}createOscillator(){return node('osc');}createBufferSource(){return node('noise');}createBuffer(){return{getChannelData:()=>new Float32Array(200)};}}
  globalThis.window={AudioContext:Context};const a=new AudioEngine();a.unlock();assert.equal(a.fxGain.gain.value,.58);assert.ok(a.fxGain.connections.includes(a.master));
  a.tone(220,.1);assert.ok(nodes.filter(n=>n.kind==='pan').at(-1).connections.includes(a.fxGain));
  a.musicMode='synth';a.tone(220,.1);assert.ok(nodes.filter(n=>n.kind==='pan').at(-1).connections.includes(a.musicGain));
  a.event({type:'dash'});assert.ok(nodes.filter(n=>n.kind==='pan').at(-1).connections.includes(a.fxGain));
});
