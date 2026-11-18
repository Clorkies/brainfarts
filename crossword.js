/* Brainfarts mini crosswords: 8 original puzzles, fully offline. */
const CROSSWORD_PACKS=[["Fresh Start",["COG##","AIR##","PLANT","##SIR","##SPY"],["A tooth on a gear","What we breathe","A green thing with roots","Polite title for a gentleman","Undercover agent"],["Hat with a brim","Motor lubricant","What covers a lawn","Quick small bite","Give it a shot"]],["Daydream",["CAB##","OIL##","DREAM","##SPA","##SET"],["A city taxi","It makes a pan less sticky","A story you have while asleep","Place for relaxing treatments","Collection of matching things"],["Fish served with chips","What fills a balloon","Give good wishes to","Primate without a tail","Doormat, for example"]],["Outdoors",["DAB##","OIL##","GRAPE","##SEA","##TAR"],["Apply a tiny amount","Lubricant in engines","Small fruit in a bunch","Saltwater expanse","Sticky road material"],["Pet that barks","What fills a sail","Sudden powerful burst","Small green vegetable","Part of the body for hearing"]],["Camp Out",["COB##","ARE##","TENTS","##COP","##HEY"],["Corn on the ___","Plural form of 'is'","Camping shelters","Police officer, casually","Casual greeting"],["Pet that purrs","Rock mined for metal","Long park seat","Digit at the end of a foot","Secret agent"]],["Tiny Things",["HEM##","AGO##","MOUSE","##TEA","##HAT"],["Folded edge of a shirt","Years ___","Small rodent or PC controller","Steeped drink","Headwear"],["Meat from a pig","Sense of self","Where you chew","Large saltwater body","Have a meal"]],["In Tune",["HAM##","AGO##","TENOR","##ERA","##YET"],["Meat for a sandwich","Days ___","High male singing voice","Historical period","So far, as of now"],["Headwear","How old you are","Cash and coins together","Mineral-rich rock","Long-tailed rodent"]],["Brain Break",["CAP##","OIL##","BRAIN","##TOO","##END"],["Bottle top","Hinge lubricant","Organ used for thinking","Also","The finish"],["Core of an ear of corn","What we breathe","Flat dinner dish","Electrically charged atom","Head gesture meaning yes"]],["All Aboard",["CAB##","OIL##","TRAIN","##ZOO","##END"],["A taxi","Liquid from underground","Vehicle traveling on tracks","Place with giraffes and lions","Opposite of beginning"],["Small portable bed","What fills your lungs","Large roaring fire","Charged atom","Head gesture meaning yes"]]];
function crosswordDefinition(id){
 const [title,rows,ac,dc]=CROSSWORD_PACKS[id],answer=rows.join('').split('');
 const across=[],down=[],numbers=Array(25).fill(0);let num=0;
 for(let i=0;i<25;i++){
  if(answer[i]==='#')continue;
  const row=Math.floor(i/5),col=i%5,a=col===0||answer[i-1]==='#',d=row===0||answer[i-5]==='#';
  if(!a&&!d)continue;
  numbers[i]=++num;
  if(a){const cells=[];for(let k=i;k<(row+1)*5&&answer[k]!=='#';k++)cells.push(k);if(cells.length>1)across.push({id:'a'+num,number:num,dir:'across',cells,clue:ac[across.length]});}
  if(d){const cells=[];for(let k=i;k<25&&answer[k]!=='#';k+=5)cells.push(k);if(cells.length>1)down.push({id:'d'+num,number:num,dir:'down',cells,clue:dc[down.length]});}
 }
 const used=new Set([...across,...down].flatMap(w=>w.cells));
 if(across.length!==5||down.length!==5||used.size!==17||[...across,...down].some(w=>!w.clue))throw Error('Invalid crossword '+id);
 return {id,title,answer,across,down,entries:[...across,...down],numbers,open:used.size};
}
const CROSSWORD_DATA=CROSSWORD_PACKS.map((_,i)=>crosswordDefinition(i));
let crossword=null;
function crosswordPuzzle(){return CROSSWORD_DATA[crossword.id];}
function crosswordInitial(id){return {id,letters:Array(25).fill(''),selected:0,direction:'across',elapsed:0,status:'ready',revealed:[],wrong:[]};}
function validCrossword(p){
 return !!(p&&Number.isInteger(p.id)&&CROSSWORD_DATA[p.id]&&Array.isArray(p.letters)&&p.letters.length===25
  &&p.letters.every(c=>typeof c==='string'&&/^[A-Z]?$/.test(c))&&Number.isSafeInteger(p.elapsed)&&p.elapsed>=0
  &&Number.isInteger(p.selected)&&p.selected>=0&&p.selected<25&&CROSSWORD_DATA[p.id].answer[p.selected]!=='#'
  &&['across','down'].includes(p.direction)&&['ready','playing','won'].includes(p.status)&&Array.isArray(p.revealed)&&Array.isArray(p.wrong));
}
function restoreCrossword(){
 const old=load('crossword');crossword=validCrossword(old)?old:crosswordInitial(0);crossword.wrong=[];save('crossword',crossword);
}
function newCrossword(id){crossword=crosswordInitial(id%CROSSWORD_DATA.length);save('crossword',crossword);renderCrossword();}
function startCrossword(){
 const n=Number(load('crossword.next',0)),id=Number.isInteger(n)&&n>=0?n%CROSSWORD_DATA.length:0;
 newCrossword(id);save('crossword.next',(id+1)%CROSSWORD_DATA.length);
}
function crosswordWord(){
 if(!crossword)return null;
 const p=crosswordPuzzle();
 return p.entries.find(w=>w.dir===crossword.direction&&w.cells.includes(crossword.selected))
  ||p.entries.find(w=>w.cells.includes(crossword.selected))||p.across[0];
}
function crosswordPickWord(id){
 if(!crossword||crossword.status==='won')return;
 const w=crosswordPuzzle().entries.find(w=>w.id===id);if(!w)return;
 crossword.direction=w.dir;crossword.selected=w.cells.find(i=>!crossword.letters[i])??w.cells[0];save('crossword',crossword);renderCrossword();
}
function crosswordPickCell(i){
 if(!crossword||crossword.status==='won'||!Number.isInteger(i)||i<0||i>=25||crosswordPuzzle().answer[i]==='#')return;
 const p=crosswordPuzzle();
 if(crossword.selected===i){
  const other=crossword.direction==='across'?'down':'across';
  if(p.entries.some(w=>w.dir===other&&w.cells.includes(i)))crossword.direction=other;
 }else if(!p.entries.some(w=>w.dir===crossword.direction&&w.cells.includes(i)))crossword.direction=crossword.direction==='across'?'down':'across';
 crossword.selected=i;save('crossword',crossword);renderCrossword();
}
function crosswordStepClue(delta){
 if(!crossword||crossword.status==='won')return;
 const words=crosswordPuzzle()[crossword.direction],current=crosswordWord();
 const at=words.findIndex(w=>w.id===current.id);
 crosswordPickWord(words[(at+delta+words.length)%words.length].id);
}
function crosswordToggleDirection(){
 if(!crossword||crossword.status==='won')return;
 const other=crossword.direction==='across'?'down':'across';
 crosswordPickWord((crosswordPuzzle()[other].find(w=>w.cells.includes(crossword.selected))||crosswordPuzzle()[other][0]).id);
}
function crosswordArrow(key){
 if(!crossword||crossword.status==='won')return;
 const delta={ArrowUp:-5,ArrowDown:5,ArrowLeft:-1,ArrowRight:1}[key];if(!delta)return;
 const row=Math.floor(crossword.selected/5),col=crossword.selected%5;
 crossword.direction=Math.abs(delta)===1?'across':'down';
 for(let i=crossword.selected+delta;i>=0&&i<25;i+=delta){
  if(Math.abs(delta)===1&&Math.floor(i/5)!==row || Math.abs(delta)===5&&i%5!==col)break;
  if(crosswordPuzzle().answer[i]!=='#'){crossword.selected=i;save('crossword',crossword);break;}
 }
 renderCrossword();
}
function crosswordFinished(){
 const p=crosswordPuzzle();
 if(p.answer.some((c,i)=>c!=='#'&&crossword.letters[i]!==c))return false;
 crossword.status='won';save('crossword',crossword);
 const key='crossword.best.'+crossword.id,best=load(key);
 if(best==null||crossword.elapsed<best)save(key,crossword.elapsed);
 renderCrossword();clickSound(700,.2);confetti();
 dialog('<svg class="brand-symbol dialog-brand" aria-hidden="true"><use href="#i-brand"/></svg><div class="dialog-kicker">CROSSWORD COMPLETE</div><h2 id="dialog-title">Words well played.</h2><p>Every crossing clicked into place.</p><div class="result-stats"><div class="result-stat"><strong>10</strong><small>CLUES</small></div><div class="result-stat"><strong>'+formatTime(crossword.elapsed)+'</strong><small>TIME</small></div><div class="result-stat"><strong>'+crossword.revealed.length+'</strong><small>HINTS</small></div></div><div class="dialog-actions"><button class="secondary-button" data-dialog-action="home">All games</button><button class="primary-button" data-dialog-action="crossword-next">Next puzzle '+icon('arrow')+'</button></div>');
 return true;
}
function crosswordInput(v){
 if(!crossword||crossword.status==='won')return;
 const w=crosswordWord(),at=w.cells.indexOf(crossword.selected);
 if(v==='Backspace'){
  if(crossword.letters[crossword.selected])crossword.letters[crossword.selected]='';
  else if(at>0){crossword.selected=w.cells[at-1];crossword.letters[crossword.selected]='';}
 }else if(/^[A-Z]$/.test(v)){
  crossword.letters[crossword.selected]=v;if(crossword.status==='ready')crossword.status='playing';
  const next=w.cells.slice(at+1).find(i=>!crossword.letters[i])??w.cells.slice(0,at).find(i=>!crossword.letters[i]);
  if(next!==undefined)crossword.selected=next;
  else{
   const words=crosswordPuzzle()[crossword.direction],index=words.findIndex(x=>x.id===w.id),after=words[(index+1)%words.length];
   crossword.selected=after.cells.find(i=>!crossword.letters[i])??after.cells[0];
  }
 }else return;
 crossword.wrong=[];save('crossword',crossword);
 if(!crosswordFinished())renderCrossword();
}
function crosswordCheck(){
 if(!crossword)return;
 const p=crosswordPuzzle();crossword.wrong=[];let blanks=0;
 for(let i=0;i<25;i++)if(p.answer[i]!=='#'){
  if(!crossword.letters[i])blanks++;
  else if(crossword.letters[i]!==p.answer[i])crossword.wrong.push(i);
 }
 renderCrossword();
 notify(crossword.wrong.length?crossword.wrong.length+' letter(s) to rethink':blanks?'Correct so far · '+blanks+' blanks left':'All correct!');
}
function crosswordReveal(){
 if(!crossword||crossword.status==='won')return;
 const p=crosswordPuzzle();let i=crossword.selected;
 if(crossword.letters[i]===p.answer[i])i=crosswordWord().cells.find(k=>crossword.letters[k]!==p.answer[k])??i;
 if(crossword.letters[i]===p.answer[i]){closeSettings();notify('That letter is already correct');return;}
 crossword.letters[i]=p.answer[i];if(!crossword.revealed.includes(i))crossword.revealed.push(i);
 crossword.wrong=[];crossword.selected=i;if(crossword.status==='ready')crossword.status='playing';
 save('crossword',crossword);closeSettings();if(!crosswordFinished())renderCrossword();
}
function renderCrossword(){
 if(!crossword)return;
 const p=crosswordPuzzle(),w=crosswordWord(),word=new Set(w.cells);
 $('#crossword-title').textContent=p.title+' · '+(crossword.id+1)+' / '+CROSSWORD_DATA.length;
 $('#crossword-time').textContent=formatTime(crossword.elapsed);
 $('#crossword-filled').textContent=crossword.letters.filter(Boolean).length+' / '+p.open;
 $('#crossword-clue-label').textContent=w.number+' '+w.dir.toUpperCase();
 $('#crossword-clue-text').textContent=w.clue;
 $('#crossword-direction').textContent=crossword.direction==='across'?'Across':'Down';
 $('#crossword-board').innerHTML=p.answer.map((c,i)=>{
  if(c==='#')return '<span class="crossword-cell blocked" aria-hidden="true"></span>';
  const cls=['crossword-cell',word.has(i)?'is-word':'',i===crossword.selected?'is-selected':'',crossword.wrong.includes(i)?'is-wrong':'',crossword.revealed.includes(i)?'is-revealed':''].filter(Boolean).join(' ');
  return '<button type="button" class="'+cls+'" data-crossword-cell="'+i+'" aria-label="Row '+(Math.floor(i/5)+1)+', column '+(i%5+1)+(p.numbers[i]?', number '+p.numbers[i]:'')+(crossword.letters[i]?', '+crossword.letters[i]:'')+'"><span class="crossword-number">'+(p.numbers[i]||'')+'</span><span class="crossword-letter">'+(crossword.letters[i]||'')+'</span></button>';
 }).join('');
}
function updateCrosswordTools(){
 if(!crossword)return;
 const p=crosswordPuzzle();
 $('#crossword-settings-filled').textContent=crossword.letters.filter(Boolean).length+' / '+p.open;
 $('#crossword-hints-used').textContent=crossword.revealed.length;
 const best=load('crossword.best.'+crossword.id);
 $('#crossword-best-time').textContent=best==null?'—':formatTime(best);
 $('#crossword-reveal').disabled=crossword.status==='won';
}
function crosswordShowClues(){
 if(!crossword)return;
 closeSettings();const p=crosswordPuzzle();
 const list=dir=>'<h3>'+dir.toUpperCase()+'</h3>'+p[dir].map(w=>'<button data-dialog-action="crossword-pick" data-crossword-word="'+w.id+'"><strong>'+w.number+'.</strong> '+w.clue+'</button>').join('');
 dialog('<div class="dialog-kicker">MINI CROSSWORD · ALL CLUES</div><h2 id="dialog-title">'+p.title+'</h2><div class="crossword-clue-list">'+list('across')+list('down')+'</div><div class="dialog-actions"><button class="secondary-button" data-dialog-action="close">Close</button></div>');
}
document.addEventListener('DOMContentLoaded',()=>{
 $('#crossword-board').addEventListener('click',e=>{const b=e.target.closest('[data-crossword-cell]');if(b)crosswordPickCell(Number(b.dataset.crosswordCell));});
 $('#crossword-prev').addEventListener('click',()=>crosswordStepClue(-1));
 $('#crossword-next').addEventListener('click',()=>crosswordStepClue(1));
 $('#crossword-toggle').addEventListener('click',crosswordToggleDirection);
 $('#crossword-check').addEventListener('click',crosswordCheck);
 $('#crossword-erase').addEventListener('click',()=>crosswordInput('Backspace'));
 $('#crossword-keyboard').innerHTML=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map((row,i)=>'<div class="crossword-key-row">'+[...row].map(c=>'<button class="crossword-key" data-crossword-key="'+c+'">'+c+'</button>').join('')+(i===2?'<button class="crossword-key delete" data-crossword-key="Backspace" aria-label="Delete letter">DEL</button>':'')+'</div>').join('');
 $('#crossword-keyboard').addEventListener('click',e=>{const b=e.target.closest('[data-crossword-key]');if(b)crosswordInput(b.dataset.crosswordKey);});
 $('#crossword-reveal').addEventListener('click',crosswordReveal);
 $('#crossword-reset').addEventListener('click',()=>{closeSettings();newCrossword(crossword.id);});
 $('#crossword-new').addEventListener('click',()=>{closeSettings();startCrossword();navigate('crossword');});
 $('#crossword-clues').addEventListener('click',crosswordShowClues);
});
