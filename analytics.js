/* Brainfarts Analytics · local-only play history. No network or identifiers.
   Older personal bests and Wordle stats are read, never fabricated as events. */
(() => {
  'use strict';
  const PREFIX='brainfarts.v2.', JOURNAL_KEY=PREFIX+'analytics.v1';
  const GAMES=[
    {key:'sudoku',name:'Sudoku',accent:'#5279d0',difficulties:['easy','medium','hard']},
    {key:'mines',name:'Minesweeper',accent:'#d2a850',difficulties:['beginner','intermediate','expert']},
    {key:'wordle',name:'Wordle',accent:'#48a58c'},
    {key:'2048',name:'2048',accent:'#db925e'},
    {key:'nonogram',name:'Nonogram',accent:'#9172d7',difficulties:['easy','medium','hard']},
    {key:'lights',name:'Lights Out',accent:'#6a91c5',difficulties:['easy','medium','hard']},
    {key:'hanoi',name:'Tower of Hanoi',accent:'#61aa9c'},
    {key:'crossword',name:'Crossword',accent:'#7c9cdb'},
    {key:'wordsearch',name:'Word Search',accent:'#cd957d'}
  ];
  const KEYS=new Set(GAMES.map(g=>g.key));
  const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const safeInt=n=>Number.isSafeInteger(n)&&n>=0?n:0;
  const storage=(k,def=null)=>{
    try{const v=localStorage.getItem(PREFIX+k);return v===null?def:JSON.parse(v);}
    catch{return def;}
  };
  const clean=str=>String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title=str=>String(str??'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const shortTime=seconds=>{
    const n=safeInt(seconds),m=Math.floor(n/60),h=Math.floor(m/60);
    return h>0?h+'h '+String(m%60).padStart(2,'0')+'m':m>0?m+'m '+String(n%60).padStart(2,'0')+'s':n+'s';
  };
  const dateLabel=stamp=>{
    if(!Number.isFinite(stamp))return '—';
    try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(stamp));}
    catch{return '—';}
  };
  function empty(){return {version:1,createdAt:Date.now(),totals:{},recent:[]};}
  function read(){
    const saved=storage('analytics.v1');
    if(!isObject(saved)||saved.version!==1)return empty();
    return {version:1,createdAt:safeInt(saved.createdAt)||Date.now(),totals:isObject(saved.totals)?saved.totals:{},
      recent:Array.isArray(saved.recent)?saved.recent.filter(x=>isObject(x)&&KEYS.has(x.game)&&Number.isFinite(x.at)).slice(0,150):[]};
  }
  function write(x){try{localStorage.setItem(JOURNAL_KEY,JSON.stringify(x));}catch{}}
  const terminal=s=>s==='won'||s==='lost'||s==='over';
  const levelOf=(game,s)=>{
    if(!isObject(s))return '';
    let level=game==='hanoi'?s.n:game==='crossword'?(Array.isArray(s.letters)?Math.sqrt(s.letters.length)+'×'+Math.sqrt(s.letters.length):''):game==='2048'?'':game==='wordsearch'?s.level:s.difficulty;
    return typeof level==='number'?Number.isFinite(level)?String(level)+' disks':'':typeof level==='string'&&/^[\w× -]{1,28}$/.test(level)?title(level):'';
  };
  function details(game,s){
    if(!isObject(s))return '';
    if(game==='2048')return safeInt(s.score)+' points';
    if(game==='hanoi')return safeInt(s.moves)+' moves';
    if(game==='lights')return safeInt(s.moves)+' moves';
    if(game==='wordle')return safeInt(s.guesses?.length)+'/6 guesses';
    if(game==='wordsearch')return safeInt(s.words?.filter(w=>w?.found).length)+' words';
    if(game==='crossword')return safeInt(s.letters?.filter(Boolean).length)+' letters';
    return Number.isSafeInteger(s.elapsed)?shortTime(s.elapsed):'';
  };
  const activated=(game,s)=>{
    if(!isObject(s))return false;
    if(terminal(s.status))return true;
    switch(game){
      case 'sudoku':return safeInt(s.moves)>0||safeInt(s.mistakes)>0||safeInt(s.elapsed)>0;
      case 'mines':return safeInt(s.revealed)>0||s.cells?.some(c=>c?.flagged)||safeInt(s.elapsed)>0;
      case 'nonogram':return safeInt(s.moves)>0;
      case 'wordle':return s.guesses?.length>0||s.current?.length>0;
      case 'lights':return safeInt(s.moves)>0;
      case '2048':return safeInt(s.moves)>0;
      case 'hanoi':return safeInt(s.moves)>0;
      case 'crossword':return s.letters?.some(Boolean);
      case 'wordsearch':return s.words?.some(w=>w?.found)||safeInt(s.elapsed)>0;
      default:return false;
    }
  };
  function observe(game,previous,state) {
    if(!KEYS.has(game)||!isObject(state)||!['ready','playing','won','lost','over','paused'].includes(state.status))return;
    const active=activated(game,state),prior=activated(game,previous),now=Date.now(),journal=read();
    const t=isObject(journal.totals[game])?journal.totals[game]:{played:0,wins:0,losses:0,solvedSeconds:0,lastAt:0};
    const start=active&&!prior;
    const finished=terminal(state.status)&&(!isObject(previous)||!terminal(previous.status)||previous.status!==state.status);
    if(!start&&!finished&&!active)return;
    if(!start&&!finished&&now-safeInt(t.lastAt)<45000)return;
    if(start){t.played=safeInt(t.played)+1;journal.recent.unshift({game,at:now,kind:'started',level:levelOf(game,state),detail:details(game,state)});}
    if(finished){
      // A terminal game restored from pre-analytics storage must not invent an old result.
      // Reached here only after a new state transition.
      if(!start&&!prior)t.played=safeInt(t.played)+1;
      if(state.status==='won'){t.wins=safeInt(t.wins)+1;t.solvedSeconds=safeInt(t.solvedSeconds)+safeInt(state.elapsed);}
      else t.losses=safeInt(t.losses)+1;
      journal.recent.unshift({game,at:now,kind:state.status==='won'?'won':'lost',level:levelOf(game,state),detail:details(game,state)});
    }
    t.lastAt=now;
    journal.totals[game]=t;journal.recent=journal.recent.slice(0,150);
    write(journal);
  }
  function bestOf(game){
    if(game==='wordle'){
      const s=storage('wordle.stats');
      return s&&safeInt(s.streak)?safeInt(s.streak)+' current streak':'—';
    }
    if(game==='2048'){
      const points=storage('best.2048');
      return safeInt(points)?safeInt(points).toLocaleString()+' pts':'—';
    }
    if(game==='hanoi'){
      for(let n=3;n<=7;n++){const b=storage('best.hanoi.'+n);if(b&&Number.isFinite(b.moves))return b.moves+' moves ('+n+' disks)';}
      return '—';
    }
    if(game==='crossword'){
      const bests=[];
      for(let i=0;i<40;i++){const seconds=storage('crossword.best.'+i);if(Number.isFinite(seconds)&&seconds>=0)bests.push({i,seconds});}
      if(!bests.length)return '—';
      bests.sort((a,b)=>a.seconds-b.seconds);return shortTime(bests[0].seconds)+' ('+(bests[0].i+1)+'st puzzle)';
    }
    if(game==='wordsearch'){
      for(const level of ['hard','medium','easy']){
        const seconds=storage('wordsearch.best.'+level);
        if(Number.isFinite(seconds)&&seconds>=0)return shortTime(seconds)+' · '+title(level);
      }
      return '—';
    }
    const config=GAMES.find(x=>x.key===game);
    const found=[];
    for(const level of config?.difficulties||[]){
      const value=storage('best.'+game+'.'+level);
      if(Number.isFinite(value)&&value>=0)found.push({level,value});
    }
    if(!found.length)return '—';
    // Lights Out bests are move counts; other bests are times.
    found.sort((a,b)=>a.value-b.value);
    const best=found[0];
    return (game==='lights'?best.value+' moves':shortTime(best.value))+' · '+title(best.level);
  }
  const progress=(game,state)=>{
    if(!isObject(state))return {value:0,label:'Not started',status:'new'};
    if(state.status==='won')return {value:100,label:'Solved',status:'won'};
    if(state.status==='lost'||state.status==='over')return {value:100,label:'Finished',status:'lost'};
    let done=0,total=1,label='';
    switch(game){
      case 'sudoku':{
        const given=state.puzzle?.filter(Boolean).length||0;
        total=Math.max(1,81-given);
        done=state.entries?.reduce((n,v,i)=>n+(v&&!state.puzzle?.[i]?1:0),0)||0;
        label=done+'/'+total+' cells';break;
      }
      case 'mines':{
        total=Math.max(1,(state.rows||0)*(state.cols||0)-safeInt(state.mineCount));
        done=safeInt(state.revealed);label=done+'/'+total+' safe';break;
      }
      case 'nonogram':{
        total=state.cells?.length||1;done=state.cells?.filter(Boolean).length||0;
        label=done+'/'+total+' marked';break;
      }
      case 'wordle':{
        total=6;done=state.guesses?.length||0;label=done+' / 6 guesses';break;
      }
      case 'lights':{
        total=state.cells?.length||1;done=state.cells?.filter(v=>!v).length||0;
        label=done+'/'+total+' lights off';break;
      }
      case '2048':{
        total=2048;done=Math.min(2048,Math.max(0,...(state.cells||[0])));label='Top tile '+done;break;
      }
      case 'hanoi':{
        total=state.n||1;done=state.pegs?.[2]?.length||0;label=done+'/'+total+' disks moved';break;
      }
      case 'crossword':{
        const n=state.letters?.length||0;
        let open=n;
        try{
          if(typeof CROSSWORD_DATA!=='undefined')open=CROSSWORD_DATA[state.id]?.open||open;
        }catch{}
        total=Math.max(1,open);done=state.letters?.filter(Boolean).length||0;
        label=done+'/'+total+' letters';break;
      }
      case 'wordsearch':{
        total=state.words?.length||1;done=state.words?.filter(x=>x.found).length||0;
        label=done+'/'+total+' words';break;
      }
    }
    const started=activated(game,state);
    return {value:Math.min(100,Math.max(0,Math.round(done/total*100))),label:started?label:'Ready to play',status:started?'playing':'new'};
  };
  const labelStatus={started:'Played',won:'Solved',lost:'Finished'};
  function snapshot(filter='all'){
    const j=read(),meta=GAMES.filter(g=>filter==='all'||g.key===filter);
    const cards=meta.map(game=>{
      const stats=isObject(j.totals[game.key])?j.totals[game.key]:{};
      const state=storage(game.key),p=progress(game.key,state);
      const legacy=game.key==='wordle'?storage('wordle.stats'):{};
      return {key:game.key,name:game.name,color:game.accent,progress:p,played:Math.max(safeInt(stats.played),safeInt(legacy?.played)),
        wins:Math.max(safeInt(stats.wins),safeInt(legacy?.wins)),losses:safeInt(stats.losses),lastAt:safeInt(stats.lastAt),
        best:bestOf(game.key)};
    });
    const all=GAMES.map(g=>{
      const stats=isObject(j.totals[g.key])?j.totals[g.key]:{},legacy=g.key==='wordle'?storage('wordle.stats'):{};
      return {played:Math.max(safeInt(stats.played),safeInt(legacy?.played)),wins:Math.max(safeInt(stats.wins),safeInt(legacy?.wins)),seconds:safeInt(stats.solvedSeconds)};
    });
    return {cards,recent:j.recent.filter(e=>filter==='all'||e.game===filter).slice(0,24),played:all.reduce((s,x)=>s+x.played,0),
      won:all.reduce((s,x)=>s+x.wins,0),solvedSeconds:all.reduce((s,x)=>s+x.seconds,0),since:j.createdAt};
  }
  function render(filter='all') {
    const view=document.getElementById('analytics-content');
    if(!view)return;
    const data=snapshot(KEYS.has(filter)?filter:'all');
    const statCards=[['Games played',data.played],['Puzzles solved',data.won],['Solved time',shortTime(data.solvedSeconds)]];
    const statusNames={new:'Ready',playing:'In progress',won:'Solved',lost:'Finished'};
    const kpis=statCards.map(([title,value])=>'<div class="analytics-kpi"><span>'+title+'</span><strong>'+value+'</strong></div>').join('');
    const games=data.cards.map(g=>
      '<article class="analytics-game" style="--a-color:'+g.color+'">'+
        '<div class="analytics-game-main"><span class="analytics-game-mark" aria-hidden="true"></span><div class="analytics-game-name"><strong>'+g.name+'</strong><small>'+clean(g.progress.label)+'</small></div>'+
        '<span class="analytics-game-status '+g.progress.status+'">'+statusNames[g.progress.status]+'</span></div>'+
        '<div class="analytics-progress-track" role="progressbar" aria-label="'+g.name+' progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+g.progress.value+'"><span style="width:'+g.progress.value+'%"></span></div>'+
        '<div class="analytics-game-meta"><span><strong>'+g.played+'</strong> played</span><span><strong>'+g.wins+'</strong> wins</span><span>Best: <strong>'+clean(g.best)+'</strong></span></div>'+
      '</article>'
    ).join('');
    const recent=data.recent.map(e=>{
      const g=GAMES.find(x=>x.key===e.game);
      return '<li class="analytics-recent-row"><span class="analytics-recent-dot" style="background:'+g.accent+'"></span><span class="analytics-recent-copy"><strong>'+g.name+'</strong><small>'+labelStatus[e.kind]+' · '+clean(e.level)+(e.level?' · ':'')+clean(e.detail)+'</small></span><time datetime="'+new Date(e.at).toISOString()+'">'+dateLabel(e.at)+'</time></li>';
    }).join('');
    view.innerHTML='<div class="analytics-kpis">'+kpis+'</div>'+
      '<div class="analytics-subhead"><h2>Game progress</h2><span>Saved on this device</span></div>'+
      '<div class="analytics-game-grid">'+games+'</div>'+
      '<div class="analytics-subhead"><h2>Recent activity</h2><span>Newest first</span></div>'+
      (recent?'<ol class="analytics-recent">'+recent+'</ol>':'<p class="analytics-empty">Your recent games will appear here as you play. Previous personal bests are shown above where available.</p>')+
      '<p class="analytics-footnote">This dashboard stays on your device. Detailed activity is recorded from this update onward; older play history cannot be recovered.</p>';
    const picker=document.getElementById('analytics-filter');
    if(picker&&picker.value!==filter)picker.value=filter;
  }
  window.BrainfartsAnalytics=Object.freeze({observe,render,snapshot,games:GAMES.map(g=>({key:g.key,name:g.name}))});
})();