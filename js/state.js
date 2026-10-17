/* ---------- game state and setup ---------- */
const now=()=>Date.now();
function setPhase(){const el=document.documentElement;if(el&&el.style)el.style.setProperty('--ph',`-${now()%8000}ms`)}
function anim(c,k){if(G)(G.fx||(G.fx={}))[c.uid]={k,t0:now()}}
let G=null,UID=0,BUILD={counts:{},msg:'',filter:'fire'};
const DECK_SIZE=40,DECK_MIN=40,DECK_MAX=60,MAX_COPY=4;
const legal=n=>n>=DECK_MIN&&n<=DECK_MAX;
const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const inst=id=>({...DEF[id],uid:++UID,tapped:false,sick:true,under:[]});
const opp=p=>G.p[0]===p?G.p[1]:G.p[0];
const atkPow=c=>c.p+(c.pa||0);
function log(m){G.log.unshift(m);if(G.log.length>60)G.log.pop()}

function mkPlayer(name,ai,deck){
  const p={name,ai,deckName:deck.n,deck:shuffle(deck.ids.map(inst)),hand:[],mana:[],bz:[],sh:[],gy:[],charged:false};
  for(let i=0;i<5;i++)p.sh.push(p.deck.pop());
  for(let i=0;i<5;i++)p.hand.push(p.deck.pop());
  return p;
}
function startGame(mine,theirs){
  if(!theirs){const pre=PRESETS[Math.floor(Math.random()*PRESETS.length)];theirs={n:pre.n,ids:presetIds(pre.civ)}}
  $('#layer').innerHTML='';
  G={p:[mkPlayer('You',false,mine),mkPlayer('Opponent',true,theirs)],turn:0,turnNo:0,log:[],sel:null,busy:false,targeting:null,modal:null,over:false,fx:{},breaking:null,decks:[mine,theirs]};
  log(`You play ${mine.n}. Opponent plays ${theirs.n}. You go first, so you skip your first draw.`);
  startTurn(0);
}
