/* Word Search: seeded offline boards, draggable and tappable word selection. */
const WORDSEARCH_LEVELS={easy:{size:10,count:8,max:7},medium:{size:14,count:12,max:10},hard:{size:18,count:16,max:14}};
const WORDSEARCH_THEMES=[
 ['Summer Days','SUNSHINE BEACH SUMMER VACATION SANDCASTLE SWIM OCEAN SUNSCREEN PICNIC WATER WAVES ICECREAM TOWEL SUNSET BREEZE HOLIDAY SANDALS SEASHELL LEMONADE SURFBOARD'],
 ['Wild Nature','RIVER FOREST CLOUD FLOWER RAINBOW OCEAN LEAF MOUNTAIN BREEZE TREE SUNRISE EARTH WATERFALL ANIMAL GARDEN BUTTERFLY RAINFOREST JUNGLE MEADOW SUNFLOWER'],
 ['Outer Space','PLANET ORBIT ROCKET GALAXY NEBULA COMET METEOR LUNAR SOLAR ASTEROID SATURN VENUS TELESCOPE COSMOS STARDUST GRAVITY ECLIPSE ASTRONAUT MISSION UNIVERSE'],
 ['Tasty Treats','MANGO PINEAPPLE GRAPE APPLE BANANA WATERMELON PASTA COOKIE CARROT STRAWBERRY LEMON CHEESE CHOCOLATE CUPCAKE BURGER SANDWICH POPCORN COCONUT PANCAKE WAFFLE'],
 ['Digital World','PIXEL ROBOT CODING KEYBOARD SCREEN NETWORK DATABASE SOFTWARE HARDWARE SENSOR ALGORITHM PROGRAM CIRCUIT MEMORY INTERNET BROWSER TABLET MOUSE CURSOR COMPUTER'],
 ['Fun & Games','PUZZLE RIDDLE SUDOKU CROSSWORD MAZE CHESS CHECKERS WORDSEARCH DOMINO ARCADE LEVEL VICTORY PLAYER GAMES TOKENS SCORE WINNER STRATEGY LOGIC MATCH']
].map(([title,words])=>({title,words:words.split(' ')}));
let wordsearch=null,wsGesture=null,wsAnchor=null;
function wsRng(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function wsShuffle(array,rng){const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function wsBuild(level,theme,seed){
 const spec=WORDSEARCH_LEVELS[level];if(!spec)throw Error('Unknown level');
 const size=spec.size,category=WORDSEARCH_THEMES[theme%WORDSEARCH_THEMES.length],dirs=[[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
 for(let attempt=0;attempt<24;attempt++){
  const rng=wsRng((seed+attempt*7919)>>>0);
  const pool=wsShuffle(category.words.filter(w=>w.length<=spec.max),rng);
  if(pool.length<spec.count)throw Error('Not enough words');
  const words=pool.slice(0,spec.count).sort((a,b)=>b.length-a.length);
  const board=Array(size*size).fill(''),entries=[];let failed=false;
  for(const text of words){
   let winner=null,score=-Infinity;
   for(let tryIndex=0;tryIndex<450;tryIndex++){
    const [dr,dc]=dirs[Math.floor(rng()*dirs.length)],r=Math.floor(rng()*size),c=Math.floor(rng()*size);
    const rr=r+(text.length-1)*dr,cc=c+(text.length-1)*dc;
    if(rr<0||rr>=size||cc<0||cc>=size)continue;
    const cells=[];let intersections=0,valid=true;
    for(let j=0;j<text.length;j++){
     const i=(r+j*dr)*size+c+j*dc;
     if(board[i]&&board[i]!==text[j]){valid=false;break;}
     if(board[i])intersections++;
     cells.push(i);
    }
    if(valid){
     const candidate=intersections*9+rng()*4;
     if(candidate>score){score=candidate;winner={text,cells,found:false};}
    }
   }
   if(!winner){failed=true;break;}
   for(let k=0;k<text.length;k++)board[winner.cells[k]]=text[k];
   entries.push(winner);
  }
  if(failed)continue;
  const letters='EEEEEEAAAAAIIIIIOOOOONNNNRRRRTTTTSSSSLLLLCDUPMHGBFYWKZXJVQ';
  for(let i=0;i<board.length;i++)if(!board[i])board[i]=letters[Math.floor(rng()*letters.length)];
  return {level,size,theme:theme%WORDSEARCH_THEMES.length,seed:(seed+attempt*7919)>>>0,board,words:entries,elapsed:0,status:'ready',hints:0};
 }
 throw Error('Could not build a complete Word Search board');
}
function wsValid(s){
 const level=WORDSEARCH_LEVELS[s?.level],n=level?.size;
 return !!(n&&s.size===n&&Number.isInteger(s.theme)&&s.theme>=0&&s.theme<WORDSEARCH_THEMES.length
 &&Number.isInteger(s.seed)&&Array.isArray(s.board)&&s.board.length===n*n&&s.board.every(c=>typeof c==='string'&&/^[A-Z]$/.test(c))
 &&Array.isArray(s.words)&&s.words.length===level.count&&s.words.every(w=>typeof w.text==='string'&&/^[A-Z]+$/.test(w.text)&&typeof w.found==='boolean'
 &&Array.isArray(w.cells)&&w.cells.length===w.text.length&&w.cells.every((i,k)=>Number.isInteger(i)&&i>=0&&i<n*n&&s.board[i]===w.text[k]))
 &&Number.isSafeInteger(s.elapsed)&&s.elapsed>=0&&['ready','playing','won'].includes(s.status));
}
function restoreWordsearch(){
 const old=load('wordsearch');wordsearch=wsValid(old)?old:wsBuild('easy',0,20261118);
 wsAnchor=null;save('wordsearch',wordsearch);
}
function newWordsearch(level='easy'){
 const count=Number(load('wordsearch.next',0)),theme=Number.isInteger(count)&&count>=0?count%WORDSEARCH_THEMES.length:0;
 try{
  wordsearch=wsBuild(level,theme,(Date.now()^(Math.random()*2147483647))>>>0);
  wsAnchor=null;save('wordsearch.next',theme+1);save('wordsearch',wordsearch);renderWordsearch();
 }catch{notify('Please try generating the puzzle again.');}
}
function wsPath(start,end,size){
 const ar=Math.floor(start/size),ac=start%size,br=Math.floor(end/size),bc=end%size,dr=br-ar,dc=bc-ac;
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<0||start>=size*size||end>=size*size)return [];
 if(dr&&dc&&Math.abs(dr)!==Math.abs(dc))return [];
 const n=Math.max(Math.abs(dr),Math.abs(dc));return Array.from({length:n+1},(_,i)=>(ar+i*Math.sign(dr))*size+ac+i*Math.sign(dc));
}
function wsSnap(start,end,size){
 const dr=Math.floor(end/size)-Math.floor(start/size),dc=end%size-start%size;
 if(!dr||!dc)return end;
 if(Math.abs(dc)>1.65*Math.abs(dr))return Math.floor(start/size)*size+end%size;
 if(Math.abs(dr)>1.65*Math.abs(dc))return Math.floor(end/size)*size+start%size;
 const length=Math.min(Math.abs(dr),Math.abs(dc));
 return (Math.floor(start/size)+Math.sign(dr)*length)*size+start%size+Math.sign(dc)*length;
}
function wsPreview(cells){
 const list=new Set(cells);
 $$('#wordsearch-board [data-ws-cell]').forEach(b=>b.classList.toggle('preview',list.has(Number(b.dataset.wsCell))));
}
function wsComplete(start,end){
 if(!wordsearch||wordsearch.status==='won')return false;
 const selected=wsPath(start,wsSnap(start,end,wordsearch.size),wordsearch.size),path=selected.join(',');
 const found=wordsearch.words.find(w=>!w.found&&(w.cells.join(',')===path||[...w.cells].reverse().join(',')===path));
 wsAnchor=null;
 if(!found){if(selected.length>=3)sfx('wordsearch.miss');renderWordsearch();return false;}
 found.found=true;wordsearch.status=wordsearch.words.every(w=>w.found)?'won':'playing';
 save('wordsearch',wordsearch);
 const count=wordsearch.words.filter(w=>w.found).length;
 sfx(wordsearch.status==='won'?'wordsearch.win':'wordsearch.found',{count,total:wordsearch.words.length});
 renderWordsearch();
 if(wordsearch.status==='won'){
  const key='wordsearch.best.'+wordsearch.level,best=load(key);
  if(best==null||wordsearch.elapsed<best)save(key,wordsearch.elapsed);
  confetti();
  dialog('<svg class="brand-symbol dialog-brand" aria-hidden="true"><use href="#i-brand"/></svg><div class="dialog-kicker">WORD SEARCH COMPLETE</div><h2 id="dialog-title">Found them all!</h2><p>Every hidden word, discovered.</p><div class="result-stats"><div class="result-stat"><strong>'+wordsearch.words.length+'</strong><small>WORDS</small></div><div class="result-stat"><strong>'+formatTime(wordsearch.elapsed)+'</strong><small>YOUR TIME</small></div><div class="result-stat"><strong>'+wordsearch.size+'×'+wordsearch.size+'</strong><small>GRID</small></div></div><div class="dialog-actions"><button class="secondary-button" data-dialog-action="home">All games</button><button class="primary-button" data-dialog-action="wordsearch-next">Next puzzle '+icon('arrow')+'</button></div>');
 }
 return true;
}
function wsSelect(start,end,drag,viaPointer=false){
 if(!wordsearch||wordsearch.status==='won')return;
 if(drag){wsComplete(start,end);return;}
 if(wsAnchor===null){wsAnchor=start;wsPreview([start]);if(!viaPointer)sfx('wordsearch.select');return;}
 if(wsAnchor===end){wsAnchor=null;wsPreview([]);return;}
 if(!wsComplete(wsAnchor,end)){wsAnchor=end;wsPreview([end]);}
}
function wsCellAt(x,y){
 const b=$('#wordsearch-board').getBoundingClientRect(),n=wordsearch?.size;
 if(!n||x<b.left||x>b.right||y<b.top||y>b.bottom)return null;
 const col=Math.min(n-1,Math.max(0,Math.floor((x-b.left)/b.width*n))),row=Math.min(n-1,Math.max(0,Math.floor((y-b.top)/b.height*n)));
 return row*n+col;
}
function renderWordsearch(){
 if(!wordsearch)return;
 const {size,board,words}=wordsearch,found=new Set(words.filter(w=>w.found).flatMap(w=>w.cells));
 $('#wordsearch-title').textContent=WORDSEARCH_THEMES[wordsearch.theme].title;
 $('#wordsearch-count').textContent=words.filter(w=>w.found).length+' / '+words.length;
 $('#wordsearch-time').textContent=formatTime(wordsearch.elapsed);
 const grid=$('#wordsearch-board');grid.style.setProperty('--ws-size',size);grid.style.setProperty('--ws-font',Math.max(10,Math.round(330/size))+'px');
 grid.innerHTML=board.map((c,i)=>'<button type="button" class="ws-cell'+(found.has(i)?' found':'')+'" data-ws-cell="'+i+'" aria-label="Row '+(Math.floor(i/size)+1)+', column '+(i%size+1)+', '+c+'">'+c+'</button>').join('');
 $('#wordsearch-words').innerHTML=words.map(w=>'<span class="ws-word'+(w.found?' found':'')+'">'+w.text+'</span>').join('');
 $('#wordsearch-instructions').textContent=wordsearch.status==='won'?'All found!':wsAnchor!==null?'Now tap the last letter of your word.':'Drag over a word, or tap its first and last letters.';
 if(wsAnchor!==null)wsPreview([wsAnchor]);
}
function wsHint(){
 if(!wordsearch||wordsearch.status==='won')return;
 const w=wordsearch.words.find(w=>!w.found);if(!w)return;
 wordsearch.hints=(wordsearch.hints||0)+1;save('wordsearch',wordsearch);closeSettings();
 const start=w.cells[0],n=wordsearch.size;
 sfx('wordsearch.hint');notify(w.text+' starts at row '+(Math.floor(start/n)+1)+', column '+(start%n+1));
}
function updateWordsearchTools(){
 if(!wordsearch)return;
 $('#wordsearch-settings-count').textContent=wordsearch.words.filter(w=>w.found).length+' / '+wordsearch.words.length;
 $('#wordsearch-settings-hints').textContent=wordsearch.hints||0;
 const best=load('wordsearch.best.'+wordsearch.level);$('#wordsearch-best-time').textContent=best==null?'—':formatTime(best);
}
document.addEventListener('DOMContentLoaded',()=>{
 const board=$('#wordsearch-board');
 board.addEventListener('pointerdown',e=>{
  if(!wordsearch||wordsearch.status==='won'||e.button!==0)return;
  const index=wsCellAt(e.clientX,e.clientY);if(index===null)return;
  wsGesture={id:e.pointerId,start:index,end:index,moved:false,x:e.clientX,y:e.clientY,lastSoundCell:index};
  board.setPointerCapture?.(e.pointerId);if(wordsearch.status==='ready')wordsearch.status='playing';
  // Initialize Web Audio on pointerdown; Safari may reject context resume during pointermove.
  sfx('wordsearch.select');
  wsPreview([index]);e.preventDefault();
 });
 board.addEventListener('pointermove',e=>{
  const g=wsGesture;if(!g||e.pointerId!==g.id)return;
  const end=wsCellAt(e.clientX,e.clientY);if(end===null)return;
  if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>7)g.moved=true;
  if(end===g.end)return;
  g.end=end;
  const path=wsPath(g.start,wsSnap(g.start,end,wordsearch.size),wordsearch.size);
  const lastCell=path.at(-1);
  if(g.moved&&path.length>1&&lastCell!==g.lastSoundCell){
   g.lastSoundCell=lastCell;
   sfx('wordsearch.trace',{index:path.length-1});
  }
  wsPreview(path);e.preventDefault();
 });
 board.addEventListener('pointerup',e=>{
  const g=wsGesture;if(!g||e.pointerId!==g.id)return;
  const end=wsCellAt(e.clientX,e.clientY)??g.end;wsGesture=null;wsSelect(g.start,end,g.moved,true);
  if(!g.moved)renderWordsearch();e.preventDefault();
 });
 board.addEventListener('pointercancel',()=>{wsGesture=null;wsPreview([]);});
 board.addEventListener('click',e=>{
  if(e.detail!==0)return;const cell=e.target.closest('[data-ws-cell]');
  if(cell){const i=Number(cell.dataset.wsCell);wsSelect(i,i,false);renderWordsearch();}
 });
 $('#wordsearch-hint').addEventListener('click',wsHint);
 $('#wordsearch-new').addEventListener('click',()=>{const level=wordsearch?.level||'easy';closeSettings();newWordsearch(level);navigate('wordsearch');});
});
