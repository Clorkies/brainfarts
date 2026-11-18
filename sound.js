/* Brainfarts Sound Design · offline synthesis, no external assets.
   A shared AudioContext schedules short, quiet envelopes; iOS unlocks on user input.
   The host's sound preference gates all calls (see sfx() in index.html). */
(() => {
  'use strict';
  let ctx = null, master = null, noiseBuffer = null;
  let lastEvent = '', lastTime = -1;
  const AC = () => window.AudioContext || window.webkitAudioContext;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function ready() {
    if (!AC()) return null;
    if (!ctx || ctx.state === 'closed') {
      ctx = new (AC())();
      master = ctx.createGain();
      master.gain.value = .56;
      master.connect(ctx.destination);
      noiseBuffer = null;
    }
    if (ctx.state === 'suspended') {
      const promise = ctx.resume();
      promise?.catch?.(() => {});
    }
    return ctx;
  }
  function note(freq = 440, duration = .085, opts = {}) {
    const audio = ctx;
    if (!audio) return;
    const at = audio.currentTime + (opts.delay || 0) + .007;
    const length = clamp(duration, .016, .7);
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = opts.shape || 'sine';
    oscillator.frequency.setValueAtTime(clamp(freq, 65, 2500), at);
    if (opts.to) oscillator.frequency.exponentialRampToValueAtTime(clamp(opts.to, 65, 2500), at + length * .85);
    const volume = clamp(opts.volume ?? .038, .001, .09);
    const attack = Math.min(.011, length * .2);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    oscillator.connect(envelope); envelope.connect(master);
    oscillator.start(at); oscillator.stop(at + length + .004);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  function noise(duration = .055, opts = {}) {
    if (!ctx) return;
    const audio=ctx,at=audio.currentTime+(opts.delay||0)+.007;
    if (!noiseBuffer) {
      noiseBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.25),audio.sampleRate);
      const data=noiseBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    const length=clamp(duration,.015,.22),source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=opts.cutoff||1350;
    const volume=clamp(opts.volume||.016,.001,.04);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.006);
    gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    source.connect(filter);filter.connect(gain);gain.connect(master);
    source.start(at);source.stop(at+length+.003);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  function chord(sequence) { for(const [f,t,d,v,shape] of sequence)note(f,d,{delay:t,volume:v,shape:shape||'sine'}); }
  const win = () => chord([[523,0,.17,.035],[659,.1,.2,.034],[784,.21,.23,.038],[1047,.34,.38,.034]]);
  const error = () => { note(195,.14,{to:132,shape:'triangle',volume:.024});noise(.055,{cutoff:600,volume:.011}); };
  function play(name, options={}) {
    try {
      const now=performance.now();
      // A finger may produce both click and pointer handlers; avoid stacking identical bursts.
      if(name===lastEvent && now-lastTime<24)return;
      lastEvent=name;lastTime=now;
      if(!ready())return;
      switch(name){
        case 'ui.on':chord([[580,0,.08,.028],[780,.075,.12,.03]]);break;
        case 'ui.tap':note(530,.048,{to:420,volume:.02});break;
        case 'sudoku.place':note(490,.072,{to:340,shape:'triangle',volume:.033});noise(.028,{cutoff:1200,volume:.009});break;
        case 'sudoku.note':note(760,.038,{shape:'sine',volume:.022});break;
        case 'sudoku.hint':chord([[620,0,.11,.03],[930,.08,.17,.027]]);break;
        case 'sudoku.error':error();break;
        case 'mines.reveal':noise(.042,{cutoff:2200,volume:.022});note(380,.052,{to:280,volume:.019});break;
        case 'mines.flag':noise(.035,{cutoff:1600,volume:.015});note(740,.065,{to:515,shape:'triangle',volume:.029});break;
        case 'mines.explode':noise(.2,{cutoff:540,volume:.036});note(160,.24,{to:70,shape:'sawtooth',volume:.024});break;
        case 'nonogram.fill':note(690,.055,{to:475,shape:'triangle',volume:.026});break;
        case 'nonogram.mark':note(390,.046,{to:295,volume:.019});break;
        case 'wordle.type':note(620,.033,{to:415,shape:'triangle',volume:.018});break;
        case 'wordle.erase':note(320,.04,{to:250,volume:.015});break;
        case 'wordle.submit':chord([[490,0,.07,.025],[580,.068,.10,.027]]);break;
        case 'wordle.invalid':error();break;
        case 'lights.toggle':note(760,.086,{to:300,shape:'square',volume:.012});note(350,.075,{to:510,volume:.014});break;
        case 'merge.slide':note(295,.055,{to:245,shape:'triangle',volume:.018});break;
        case 'merge.combine':chord([[415,0,.075,.032],[623,.052,.12,.03]]);break;
        case 'merge.big':chord([[520,0,.1,.03],[780,.09,.13,.033],[1040,.18,.17,.03]]);break;
        case 'hanoi.move':note(320+(Number(options.disk)||1)*54,.095,{to:260+(Number(options.disk)||1)*42,shape:'triangle',volume:.03});noise(.029,{cutoff:950,volume:.011});break;
        case 'hanoi.invalid':error();break;
        case 'crossword.type':note(660,.055,{to:520,shape:'triangle',volume:.023});break;
        case 'crossword.erase':note(370,.05,{to:290,volume:.019});break;
        case 'crossword.select':note(515,.032,{volume:.013});break;
        case 'crossword.check':chord([[550,0,.075,.025],[830,.075,.12,.026]]);break;
        case 'crossword.hint':chord([[650,0,.085,.025],[960,.06,.14,.025]]);break;
        case 'wordsearch.select':note(430,.045,{to:340,volume:.015});break;
        case 'wordsearch.found':chord([[470,0,.095,.028],[630,.075,.105,.028],[860,.16,.17,.03]]);break;
        case 'wordsearch.hint':chord([[575,0,.07,.023],[765,.073,.12,.025]]);break;
        case 'win':win();break;
        case 'loss':error();break;
        default: note(470,.055,{volume:.02});
      }
    } catch { /* Unsupported audio must never break a puzzle. */ }
  }
  function legacy(freq=440,duration=.08,type='sine') {
    try {
      if(!ready())return;
      note(freq,duration,{shape:['sine','square','triangle','sawtooth'].includes(type)?type:'sine',volume:.024});
    }catch{}
  }
  window.BrainfartsSFX = Object.freeze({play,legacy});
})();
