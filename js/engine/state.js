function anim(c,k){if(G)(G.fx||(G.fx={}))[c.uid]={k,t0:now()}}
let G=null,BUILD={counts:{},msg:'',filter:'fire'};
// Instance ids are random, so an id never hints at which card it is (decklists are shared
// online and counting ids would otherwise reveal hidden cards).
const usedUids=new Set();
const newUid=()=>{let u;do u=1+Math.floor(Math.random()*2**30);while(usedUids.has(u));usedUids.add(u);return u};
const inst=id=>({...DEF[id],uid:newUid(),tapped:false,sick:true,under:[]});
const opp=p=>G.p[0]===p?G.p[1]:G.p[0];
// Finds a card in a hand or battle zone by instance id.
function findCard(uid){
  if(!G)return null;
  for(const p of G.p)for(const z of ['hand','bz']){const c=p[z].find(x=>x.uid===uid);if(c)return{p,z,c}}
  return null;
}
// logSeq counts every line ever logged (and logId names the game), so the UI can tell which lines are new.
function log(m){G.log.unshift(m);if(G.log.length>60)G.log.pop();G.logSeq=(G.logSeq||0)+1;G.logId=G.logId||Math.random().toString(36).slice(2)}
const shieldBy=uid=>G&&G.p.flatMap(p=>p.sh).find(s=>s.uid===uid)||null;
// Shields carry a letter (A, B, C…) for as long as they stay shields, so both players can
// tell which one was broken or chosen. New shields take the next letter.
const shieldLetter=n=>(n>=26?shieldLetter(Math.floor(n/26)-1):'')+String.fromCharCode(65+n%26);
function labelShields(){
  if(!G)return;
  for(const p of G.p){
    for(const z of ['deck','hand','mana','bz','gy'])for(const c of p[z]){if(c.shL)delete c.shL;if(c.faceUp)delete c.faceUp}
    for(const s of p.sh)if(!s.shL)s.shL=shieldLetter(p.shN=(p.shN??-1)+1);
  }
}

const SHIELDS=8;
// Log lines can name players from either side's view: V(p,'You draw','Opponent draws') shows the first
// text to the player sitting in p's seat and the second to the other player.
let VIEW=0;
const V=(p,you,them)=>`\u0001${p.seat}\u0002${you}\u0002${them}\u0003`;
const seatName=st=>{const p=G&&G.mp&&G.p.find(x=>x.seat===st);return p?p.name:null};
const viewText=t=>String(t).replace(/\u0001(\d)\u0002([^\u0002]*)\u0002([^\u0003]*)\u0003/g,(_,st,a,b)=>{
  if(+st===VIEW)return a;
  const nm=seatName(+st);
  return nm?b.replace(/^Opponent\b/,nm).replace(/^the opponent's$/,nm+"'s").replace(/^the opponent$/,nm):b;
});
function mkPlayer(name,ai,deck,shields=5,seat=0){
  const p={seat,name,ai,deckName:deck.n,deck:shuffle(deck.ids.map(inst)),hand:[],mana:[],bz:[],sh:[],gy:[],charged:false};
  for(let i=0;i<shields;i++)p.sh.push(p.deck.pop());
  for(let i=0;i<5;i++)p.hand.push(p.deck.pop());
  return p;
}
function startGame(mine,theirs){
  if(typeof navTo==='function')navTo('game');
  if(!theirs){const pre=PRESETS[Math.floor(Math.random()*PRESETS.length)];theirs={n:pre.n,ids:presetIds(pre.civ)}}
  $('#layer').innerHTML='';
  const sh=SHIELDS;
  MP=null;VIEW=0;
  G={shields:sh,p:[mkPlayer('You',false,mine,sh,0),mkPlayer('Opponent',true,theirs,sh,1)],turn:0,turnNo:0,log:[],sel:null,busy:false,targeting:null,modal:null,over:false,fx:{},breaking:null,decks:[mine,theirs]};
  log(`You play ${mine.n}. Opponent plays ${theirs.n}. Each side has ${sh} shields. You go first, so you skip your first draw.`);
  startTurn(0);
}
