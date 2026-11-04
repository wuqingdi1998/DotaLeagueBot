export type CombatSound='swing'|'sword'|'heavy'|'fire'|'shield'|'heal'|'magic'|'ultimate'|'step'|'boss';

/** Small synthesized layers keep impacts synchronized without downloading audio files. */
export function createCombatAudio(){
 let context:AudioContext|undefined,master:GainNode|undefined,compressor:DynamicsCompressorNode|undefined,noise:AudioBuffer|undefined;
 let isEnabled=true,lastSound=0;
 const voices=new Set<AudioScheduledSourceNode>();
 function initialize(){
  if(context||typeof AudioContext==='undefined')return;
  context=new AudioContext();master=context.createGain();master.gain.value=.22;
  compressor=context.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=5;
  master.connect(compressor);compressor.connect(context.destination);
  noise=context.createBuffer(1,context.sampleRate*.8,context.sampleRate);
  const samples=noise.getChannelData(0);let seed=139;
  for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/4294967296*2-1;}
 }
 async function resume(){try{initialize();if(context?.state==='suspended')await context.resume();}catch{/* Sound remains optional when the browser has no output device. */}}
 function track(source:AudioScheduledSourceNode){voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();};}
 function tone(frequency:number,end:number,length:number,volume:number,type:OscillatorType='sine',delay=0){
  if(!context||!master)return;
  const now=context.currentTime+delay,oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+length);
  gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.007);gain.gain.exponentialRampToValueAtTime(.001,now+length);
  oscillator.connect(gain);gain.connect(master);track(oscillator);oscillator.start(now);oscillator.stop(now+length+.02);
  oscillator.addEventListener('ended',()=>gain.disconnect());
 }
 function rustle(length:number,volume:number,frequency:number){
  if(!context||!master||!noise)return;
  const now=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  source.buffer=noise;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,now);filter.frequency.exponentialRampToValueAtTime(Math.max(80,frequency*.25),now+length);filter.Q.value=.8;
  gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+length);
  source.connect(filter);filter.connect(gain);gain.connect(master);track(source);source.start(now);source.stop(now+length);
  source.addEventListener('ended',()=>{filter.disconnect();gain.disconnect();});
 }
 function play(sound:CombatSound){
  if(!isEnabled||!context||context.state!=='running'||voices.size>24)return;
  const now=context.currentTime;if(sound!=='boss'&&now-lastSound<.045)return;lastSound=now;
  if(sound==='swing'){rustle(.16,.12,1800);}
  if(sound==='step'){rustle(.08,.07,220);tone(90,45,.08,.1);}
  if(sound==='sword'){rustle(.14,.35,3300);tone(1400,420,.14,.12,'triangle');tone(190,65,.09,.24);}
  if(sound==='heavy'){rustle(.22,.35,1300);tone(110,35,.23,.5);tone(680,220,.13,.1,'triangle');}
  if(sound==='fire'){rustle(.45,.5,1700);tone(240,65,.3,.22,'triangle');}
  if(sound==='shield'){tone(740,520,.42,.2,'triangle');tone(1110,1080,.35,.08,'sine',.025);rustle(.1,.12,2400);}
  if(sound==='heal'){[520,650,780].forEach((frequency,index)=>tone(frequency,frequency*1.015,.4,.13,'sine',index*.07));}
  if(sound==='magic'){tone(540,1100,.25,.12,'triangle');rustle(.23,.18,2100);}
  if(sound==='ultimate'){tone(95,40,.55,.5);tone(370,740,.6,.12,'triangle');rustle(.55,.35,1400);}
  if(sound==='boss'){[110,164,220].forEach(frequency=>tone(frequency,frequency*.85,.7,.2,'sawtooth'));rustle(.65,.4,340);}
 }
 function setEnabled(enabled:boolean){if(isEnabled===enabled)return;isEnabled=enabled;if(master&&context)master.gain.setTargetAtTime(enabled?.22:0,context.currentTime,.025);}
 function stop(){for(const voice of voices){try{voice.stop();}catch{/* A scheduled voice can already have ended. */}}voices.clear();}
 function dispose(){stop();if(context)void context.close().catch(()=>{});}
 return {resume,play,setEnabled,stop,dispose};
}
export type CombatAudio=ReturnType<typeof createCombatAudio>;
