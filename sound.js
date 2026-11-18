/* Brainfarts Sound Design v3
   Self-contained synthesized SFX, no network, no samples. Deliberately gentle:
   soft plucks + transient detail + pitched chimes, not sustained oscillator beeps.
   Effects are scheduled from user interactions, never from background timers. */
(() => {
  'use strict';
  let audio=null, bus=null, noiseBuffer=null;
  let volume=.72;
  const last=new Map();
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:a));
  const clock=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
  const AC=()=>window.AudioContext||window.webkitAudioContext;
  const scale=[392,440,493.88,587.33,659.26,783.99,880,987.77,1174.66];
  function context(){
    const Context=AC();
    if(!Context)return null;
    if(!audio||audio.state==='closed'){
      audio=new Context();
      const compressor=audio.createDynamicsCompressor?.();
      bus=audio.createGain();
      bus.gain.value=.5*volume;
      if(compressor){
        compressor.threshold.value=-22;
        compressor.knee.value=12;
        compressor.ratio.value=3;
        compressor.attack.value=.004;
        compressor.release.value=.14;
        bus.connect(compressor);compressor.connect(audio.destination);
      }else bus.connect(audio.destination);
      noiseBuffer=null;
    }
    if(audio.state==='suspended'){
      try{audio.resume()?.catch?.(()=>{});}catch{}
    }
    return audio;
  }
  function setVolume(v){
    volume=clamp(v,0,1);
    if(bus) {
      if(typeof bus.gain.setTargetAtTime==='function') bus.gain.setTargetAtTime(.5*volume,audio.currentTime,.018);
      else bus.gain.value=.5*volume;
    }
  }
  function tone(freq,{at=0,duration=.08,gain=.025,shape='sine',end=0,attack=.003,pan=0}={}){
    if(!audio||!bus)return;
    const t=audio.currentTime+.007+at,len=clamp(duration,.016,1.2),o=audio.createOscillator(),g=audio.createGain();
    o.type=shape;
    o.frequency.setValueAtTime(clamp(freq,70,2800),t);
    if(end)o.frequency.exponentialRampToValueAtTime(clamp(end,70,2800),t+len*.88);
    const a=clamp(attack,.002,Math.min(.045,len*.25)),level=clamp(gain,.0001,.09);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(level,t+a);
    g.gain.exponentialRampToValueAtTime(level*.36,t+Math.max(a+.004,len*.33));
    g.gain.exponentialRampToValueAtTime(.0001,t+len);
    o.connect(g);
    if(audio.createStereoPanner&&pan){
      const p=audio.createStereoPanner();p.pan.value=clamp(pan,-.65,.65);
      g.connect(p);p.connect(bus);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};
    }else {g.connect(bus);o.onended=()=>{o.disconnect();g.disconnect();};}
    o.start(t);o.stop(t+len+.005);
  }
  // Harmonic sparkle: two low-amplitude partials with a fast transient and long decay.
  function bell(f,at=0,{gain=.034,decay=.2,pan=0}={}){
    tone(f,{at,duration:decay,gain,shape:'sine',pan});
    tone(f*2.01,{at,duration:decay*.54,gain:gain*.19,shape:'sine',pan});
  }
  // Short filtered noise is the "touch" texture, not a loud click track.
  function tap({at=0,duration=.027,gain=.011,cutoff=2100,highpass=false}={}){
    if(!audio||!bus)return;
    if(!noiseBuffer){
      noiseBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.18),audio.sampleRate);
      const data=noiseBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    const t=audio.currentTime+.007+at,len=clamp(duration,.012,.15),
      src=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();
    src.buffer=noiseBuffer;
    f.type=highpass?'highpass':'lowpass';f.frequency.value=cutoff;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(clamp(gain,.001,.03),t+.003);
    g.gain.exponentialRampToValueAtTime(.0001,t+len);
    src.connect(f);f.connect(g);g.connect(bus);
    src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};
    src.start(t);src.stop(t+len+.004);
  }
  function pluck(f,at=0,{gain=.03,end=0,soft=false,pan=0}={}){
    tone(f,{at,duration:soft?.046:.088,gain,shape:'triangle',end:end||f*.81,pan});
    if(!soft)tap({at,duration:.02,gain:.006,cutoff:2600});
  }
  // Dampened physical button click: a low-passed felt tap and short, low wood body.
  // Avoids sharp upper harmonics and long ringing on repeated presses.
  function thwop({at=0,weight=1,pitch=285}={}){
    const strength=clamp(weight,.35,1.4);
    tap({at,duration:.037,gain:.012*strength,cutoff:710});
    tone(pitch,{at:at+.006,duration:.064,gain:.013*strength,shape:'triangle',end:pitch*.77,attack:.006});
  }
  function flourish(root=523.25,{at=0,big=false}={}){
    const notes=big?[1,5/4,3/2,2,5/2]:[1,5/4,3/2,2];
    notes.forEach((ratio,i)=>bell(root*ratio,at+i*(big?.087:.066),{gain:i===notes.length-1?.041:.024,decay:i===notes.length-1?.45:.16,pan:(i-(notes.length-1)/2)*.13}));
    if(big){bell(root*.5,at+.20,{gain:.02,decay:.42});tap({at:at+.29,duration:.08,gain:.01,cutoff:3300});}
  }
  function softFail(){tone(300,{duration:.12,gain:.021,shape:'triangle',end:229});tone(225,{at:.078,duration:.12,gain:.016,end:186});}
  function reward({root=587.33,count=1,final=false}={}){
    // Gently rising two-note answer; longer phrases earn a brighter landing.
    const shift=Math.min(4,Math.max(0,count-1));
    bell(root,0,{gain:.03,decay:.15});
    bell(root*1.26,.078,{gain:.031,decay:.19});
    bell(root*1.5,.16,{gain:.031,decay:.22});
    if(count>1)bell(root*(1.69+shift*.055),.23,{gain:.027,decay:.29});
    if(final)flourish(523.25,{at:.32,big:true});
  }
  const known=new Set([
    'ui.on','ui.tap','ui.preview',
    'sudoku.place','sudoku.erase','sudoku.note','sudoku.unit','sudoku.hint','sudoku.error','sudoku.win',
    'mines.reveal','mines.cascade','mines.flag','mines.explode','mines.win',
    'nonogram.fill','nonogram.mark','nonogram.win',
    'wordle.type','wordle.erase','wordle.submit','wordle.invalid','wordle.win','wordle.loss',
    'lights.toggle','lights.win',
    'merge.slide','merge.combine','merge.big','merge.win','merge.loss',
    'hanoi.pick','hanoi.move','hanoi.invalid','hanoi.win',
    'crossword.type','crossword.erase','crossword.select','crossword.word','crossword.check','crossword.invalid','crossword.hint','crossword.win',
    'wordsearch.select','wordsearch.trace','wordsearch.miss','wordsearch.found','wordsearch.hint','wordsearch.win',
    'win','loss'
  ]);
  function play(name,options={}){
    try{
      if(volume<=0||!known.has(name))return;
      const now=clock();
      const cooldown=name==='wordsearch.trace'?43:
        name==='crossword.type'||name==='wordle.type'?18:
        name==='sudoku.place'||name==='nonogram.fill'?26:22;
      const seen=last.get(name);
      if(seen!==undefined&&now-seen<cooldown)return;
      last.set(name,now);
      if(!context())return;
      const count=clamp(Number(options.count)||1,1,30);
      switch(name){
        case 'ui.on':case 'ui.preview':
          flourish(493.88,{big:false});break;
        case 'ui.tap':thwop({weight:.85,pitch:280});break;
        case 'sudoku.place':pluck(460+clamp(Number(options.digit)||0,0,9)*16,0,{gain:.028});break;
        case 'sudoku.erase':pluck(325,0,{gain:.017,soft:true});break;
        case 'sudoku.note':tap({gain:.009,cutoff:2800});bell(783.99,.005,{gain:.016,decay:.085});break;
        case 'sudoku.unit':bell(659.26,0,{gain:.025,decay:.14});bell(880,.095,{gain:.028,decay:.2});break;
        case 'sudoku.hint':reward({root:523.25});break;
        case 'sudoku.error':softFail();break;
        case 'sudoku.win':flourish(523.25,{big:true});break;
        case 'mines.reveal':thwop({weight:.88,pitch:245});break;
        case 'mines.cascade':
          thwop({weight:1.05,pitch:240});
          // Short cushioned tile roll on large clears, not a high-pitched chime.
          [270,245,230].forEach((f,i)=>tone(f,{at:.035+i*.046,duration:.055,gain:.013,shape:'triangle',end:f*.8}));break;
        case 'mines.flag':thwop({weight:1.15,pitch:345});break;
        case 'mines.explode':tap({duration:.15,gain:.028,cutoff:700});tone(170,{duration:.28,gain:.026,shape:'triangle',end:85});break;
        case 'mines.win':flourish(587.33,{big:true});break;
        case 'nonogram.fill':tap({gain:.009,cutoff:1500});pluck(523.25,0,{gain:.026,soft:true});break;
        case 'nonogram.mark':pluck(310,0,{gain:.018,soft:true});break;
        case 'nonogram.win':flourish(440,{big:true});break;
        case 'wordle.type':tap({gain:.008,cutoff:2600});pluck(493.88,0,{gain:.015,soft:true});break;
        case 'wordle.erase':pluck(360,0,{gain:.016,soft:true});break;
        case 'wordle.submit':
          // Match the 100ms stagger in the five Wordle flip animations.
          [440,493.88,523.25,587.33,659.26].forEach((f,i)=>{
            tap({at:.08+i*.1,gain:.006,cutoff:2400});
            pluck(f,.08+i*.1,{gain:.019,soft:true});
          });break;
        case 'wordle.invalid':softFail();break;
        case 'wordle.win':flourish(659.26,{big:true});break;
        case 'wordle.loss':softFail();break;
        case 'lights.toggle':
          // A damped two-stage switch: tactile down-click, then soft latch.
          thwop({weight:1.07,pitch:230});
          tap({at:.046,duration:.028,gain:.009,cutoff:560});break;
        case 'lights.win':flourish(587.33,{big:true});break;
        case 'merge.slide':tap({duration:.035,gain:.012,cutoff:1150});pluck(285,0,{gain:.022,soft:true});break;
        case 'merge.combine':
          tap({gain:.012,cutoff:2200});bell(523.25,0,{gain:.028,decay:.14});bell(659.26,.075,{gain:.029,decay:.18});break;
        case 'merge.big':
          tap({gain:.013,cutoff:3200});
          reward({root:523.25,count:4});bell(260,.08,{gain:.016,decay:.23});break;
        case 'merge.win':flourish(659.26,{big:true});break;
        case 'merge.loss':softFail();break;
        case 'hanoi.pick':break; // Original Hanoi had no pickup sound.
        case 'hanoi.move':{
          // Restored from the pre-v3 sound design: single descending triangle + soft tap.
          const disk=clamp(Number(options.disk)||1,1,7);
          tone(320+disk*54,{duration:.095,shape:'triangle',gain:.03,end:260+disk*42});
          tap({duration:.029,cutoff:950,gain:.011});break;
        }
        case 'hanoi.invalid':softFail();break;
        case 'hanoi.win':flourish(493.88,{big:true});break;
        case 'crossword.type':thwop({weight:.76,pitch:305});break;
        case 'crossword.erase':thwop({weight:.56,pitch:245});break;
        case 'crossword.select':thwop({weight:.52,pitch:270});break;
        case 'crossword.word':reward({root:493.88,count});break;
        case 'crossword.check':bell(550,0,{gain:.024,decay:.12});bell(740,.07,{gain:.025,decay:.18});break;
        case 'crossword.invalid':softFail();break;
        case 'crossword.hint':reward({root:523.25});break;
        case 'crossword.win':flourish(523.25,{big:true});break;
        case 'wordsearch.select':pluck(392,0,{gain:.018,soft:true});break;
        case 'wordsearch.trace':{
          // One low-volume "letter bead" per new cell, up a pentatonic scale.
          const step=clamp(Number(options.index)||1,1,24);
          const f=scale[(step-1)%scale.length];
          pluck(f,0,{gain:.014+Math.min(step,7)*.00045,soft:true,pan:((step%5)-2)*.07});
          break;
        }
        case 'wordsearch.miss':tone(345,{duration:.10,gain:.012,end:310,shape:'sine'});break;
        case 'wordsearch.found':
          thwop({weight:.94,pitch:330});
          reward({root:587.33,count});break;
        case 'wordsearch.hint':bell(493.88,0,{gain:.022,decay:.11});bell(740,.072,{gain:.025,decay:.2});break;
        case 'wordsearch.win':flourish(587.33,{big:true});break;
        case 'win':flourish(523.25,{big:true});break;
        case 'loss':softFail();break;
      }
    }catch{ /* Sound must never interrupt a puzzle. */ }
  }
  function legacy(f=440,d=.08,shape='sine'){
    try{
      if(volume<=0||!context())return;
      tone(f,{duration:d,gain:.015,shape:['sine','triangle','square','sawtooth'].includes(shape)?shape:'sine'});
    }catch{}
  }
  window.BrainfartsSFX=Object.freeze({play,legacy,setVolume,events:[...known]});
})();