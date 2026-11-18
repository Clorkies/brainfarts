/* Larger original Brainfarts crossword layouts: 7x7, 9x9, 11x11. */
const CROSSWORD_LARGE_PACKS=[{"title":"Garden Paths","difficulty":"medium","grid":["####P#E","CAMPING","A#I#C#G","MINUTE#","E#D#U##","R###R##","ANSWER#"]},{"title":"Sunny Puzzle","difficulty":"medium","grid":["#F###R#","JOURNAL","#R###N#","SECOND#","#S#A#O#","STAR#M#","#######"]},{"title":"Story Time","difficulty":"medium","grid":["#M###C#","JOURNAL","#B###M#","MINUTE#","#L###R#","#E#STAR","#######"]},{"title":"Big Ideas","difficulty":"hard","grid":["####TOP#B","#BLUE###U","#A##LIGHT","#L##E#R#T","LANDSCAPE","#N##C#P#R","#CHOOSE#F","#E##P###L","###MEMORY"]},{"title":"Fresh Discoveries","difficulty":"hard","grid":["C#I#F#P#B","I#N#O#I#U","RIVER#NET","C#E#E#E#T","LANDSCAPE","E#T#T#P#R","#DOG##P#F","##R###L#L","DISCOVERY"]},{"title":"Sunny Trails","difficulty":"hard","grid":["##Q#CUP#S","BLUE##I#U","##E###N#N","##S#D#E#F","WATERFALL","##I#U#P#O","STORM#P#W","U#N#SOLVE","N#S###E#R"]},{"title":"Curious Minds","difficulty":"expert","grid":["#NOTEBOOK#I","####X#P###M","##M#P#E###A","CHALLENGE#G","H#R#O#####I","OBSERVATION","O###A##A##A","S#PATTERN#T","E###I##G##I","####O##E##O","#CONNECTION"]},{"title":"Spark of Genius","difficulty":"expert","grid":["##TELESCOPE","#####A#O##G","#C#SPRING#G","#H#####C#C#","#A#E#P#E#A#","PLAYFULNESS","#L#E#Z#T#T#","BEE##Z#R#L#","#N#VILLAGE#","#G###E#T###","PERSISTENCE"]},{"title":"Bright Connections","difficulty":"expert","grid":["####M##C#P#","MICROSCOPE#","####O##N#R#","FRIEND#C#S#","#######E#I#","PLAYFULNESS","##N#O##T#T#","DISCOVERIES","##W#D##A#N#","##E####T#C#","CIRCLE#EYE#"]}];
const CROSSWORD_LARGE_CLUES={"PICTURE":"An image or photograph","CAMPING":"Sleeping outdoors in a tent","CAMERA":"Tool used to take a photograph","MIND":"What you use to think","ANSWER":"Response to a question","EGG":"Food laid by hens","MINUTE":"Unit of sixty seconds","FOREST":"Large wooded area","JOURNAL":"Diary of events","SECOND":"Unit of time after the minute","RANDOM":"Without a predictable pattern","STAR":"Bright object in the night sky","OAR":"Tool used to row a boat","MOBILE":"Portable or able to move","TOP":"Opposite of bottom","BLUE":"The color of a clear sky","LIGHT":"What lets us see things","LANDSCAPE":"Scenery of a place","CHOOSE":"Select from options","MEMORY":"Ability to recall things","BUTTERFLY":"Colorful winged insect","TELESCOPE":"Tool for viewing distant objects","GRAPE":"Small fruit on a vine","BALANCE":"A state of steadiness","CIRCLE":"Round shape with no corners","INVENTORS":"People who make new devices","PINEAPPLE":"Spiky tropical fruit","DISCOVERY":"Finding something new","RIVER":"A natural flowing waterway","NET":"Mesh used to catch things","DOG":"Pet that barks","SUNFLOWER":"Tall flower with yellow petals","WATERFALL":"Water pouring over a cliff","QUESTIONS":"Things you ask when curious","CUP":"Container for a drink","STORM":"Severe weather","SOLVE":"Find the answer","DRUMS":"Percussion instruments","SUN":"The star Earth orbits","OBSERVATION":"Careful watching","EXPLORATION":"Traveling to discover places","CONNECTION":"Link between two things","IMAGINATION":"Ability to create ideas mentally","TARGET":"Something to aim for","PATTERN":"Repeated arrangement","CHALLENGE":"A task requiring effort","MARS":"The red planet","NOTEBOOK":"Bound paper for writing","OPEN":"Not closed","PLAYFULNESS":"Quality of being fun-loving","CONCENTRATE":"Focus your attention","PERSISTENCE":"Refusal to give up","PUZZLES":"Logic games or brain teasers","VILLAGE":"A small rural community","CASTLE":"Old fortified residence","SPRING":"Season of blooming flowers","EAR":"Part of the body for hearing","BEE":"Honey-making insect","EYE":"Part of the body for seeing","MICROSCOPE":"Tool for viewing tiny objects","DISCOVERIES":"Things newly found","FRIEND":"Someone you like and trust","FOOD":"Things people eat","MOON":"Earth's natural satellite"};
function crosswordLargeDefinition(p,id){
 const size=p.grid.length;
 if(![7,9,11].includes(size)||p.grid.some(row=>row.length!==size||!/^[A-Z#]+$/.test(row)))throw Error('Bad crossword layout '+id);
 const answer=p.grid.join('').split(''),across=[],down=[],numbers=Array(size*size).fill(0);let num=0;
 for(let i=0;i<answer.length;i++){
  if(answer[i]==='#')continue;
  const row=Math.floor(i/size),col=i%size,startA=col===0||answer[i-1]==='#',startD=row===0||answer[i-size]==='#';
  const a=[],d=[];
  if(startA)for(let j=i;j<(row+1)*size&&answer[j]!=='#';j++)a.push(j);
  if(startD)for(let j=i;j<answer.length&&answer[j]!=='#';j+=size)d.push(j);
  if(a.length<2&&d.length<2)continue;
  numbers[i]=++num;
  for(const [cells,list,dir] of [[a,across,'across'],[d,down,'down']]){
   if(cells.length<2)continue;
   const word=cells.map(j=>answer[j]).join(''),clue=CROSSWORD_LARGE_CLUES[word];
   if(!clue)throw Error('Missing clue for '+word+' in '+p.title);
   list.push({id:(dir==='across'?'a':'d')+num,number:num,dir,cells,clue});
  }
 }
 const used=new Set([...across,...down].flatMap(w=>w.cells));
 const open=answer.filter(c=>c!=='#').length;
 if(!across.length||!down.length||used.size!==open)throw Error('Unclued crossword cell '+p.title);
 return {id,title:p.title,difficulty:p.difficulty,size,answer,across,down,entries:[...across,...down],numbers,open};
}
