/* ---------- strategist: the computer plans its turn by simulation ---------- */
// At each choice of its turn (what to charge, what to summon or cast, which attack to make,
// or to stop), the computer tries every option in its head and keeps the one that leaves it
// best off. It can't see the hidden cards, so it imagines several "worlds": the opponent's
// hand, shields and deck dealt at random from the cards it can't see, and its own shields
// and deck shuffled. In each world it makes the option, finishes its turn the quick
// rule-based way (opponent.js), plays the opponent's whole reply the same way, then scores
// the board (evalBoard). Options are compared on the same worlds, and the averages decide.
//
// This is ensemble determinization with a heuristic evaluation, the approach that held up
// best for card games with hidden cards: Cowling, Ward & Powley 2012 (Magic: The Gathering),
// Kowalski et al. 2026 (arXiv 2607.13007, 5-10 worlds), and the flat "own turn and the
// opponent's reply" search of the Strategy Card Game AI Competition bots (arXiv 2305.11814).
// Simulations swap the global G for a copy and set SIM, so nothing waits or draws; between
// worlds the real game is put back and the page gets a moment to breathe.
let AI_PLANS=true;
const PLAN={worlds:8,minWorlds:3,ms:450,simErrors:0,lastError:null};
const PLAN_GONE={};

// Board value for player me, as a win chance from 0 to 1: a weighted sum of what each side
// has (shields count for more when few are left), squashed by a logistic curve. The weights
// are hand-set, then tuned by self-play (dev/ai/tune.mjs).
const EVAL={shields:[0,4,7,9.5,11.5,13,14.3,15.4,16.4,17.2,18,18.7,19.4],
  body:1,power:1/1500,breaker:1.6,blocker:1.2,tappedBlocker:0.4,slayer:1,unblockable:1,noPlayer:-1.2,ready:0.3,tapAbility:0.6,
  mana:0.55,manaOver:0.1,hand:0.45,thinDeck:0.8,lethal:4,lethalExtra:1,scale:7};
function creatureWorth(c,W){
  const t=T(c);
  let v=W.body+power(c)*W.power+(breaks(c)-1)*W.breaker;
  if(t.block)v+=c.tapped?W.tappedBlocker:W.blocker;
  if(t.slayer)v+=W.slayer;
  if(t.unbl)v+=W.unblockable;
  if(t.noP)v+=W.noPlayer;
  if(t.speed||!c.sick)v+=W.ready;
  if(t.tapAb)v+=W.tapAbility;
  return Math.max(0.3,v);
}
function sideWorth(q,W){
  const o=opp(q);
  let v=W.shields[Math.min(q.sh.length,W.shields.length-1)];
  v+=q.bz.reduce((a,c)=>a+creatureWorth(c,W),0);
  v+=Math.min(q.mana.length,10)*W.mana+Math.max(0,q.mana.length-10)*W.manaOver;
  v+=Math.min(q.hand.length,8)*W.hand;
  if(q.deck.length<6)v-=(6-q.deck.length)*W.thinDeck;
  // Pressure: more breaks ready next turn than the opponent has shields and blockers.
  const hits=q.bz.filter(c=>!T(c).noP).reduce((a,c)=>a+breaks(c),0)-o.bz.filter(c=>T(c).block).length;
  if(hits>o.sh.length)v+=W.lethal+Math.min(4,hits-o.sh.length)*W.lethalExtra;
  return v;
}
function evalBoard(me,W=EVAL){
  if(G.over)return G.winner===me?1:0;
  const d=sideWorth(me,W)-sideWorth(opp(me),W);
  return 1/(1+Math.exp(-d/W.scale));
}

// A copy of the game as player me imagines it: every card it can't see is redealt.
function imagine(me){
  const g=structuredClone({...G,targeting:null,modal:null,mp:null,fx:{},log:[],breaking:null,sel:null,decks:null,notice:''});
  const m=g.p[me.seat],o=g.p[1-me.seat];
  for(const q of g.p){q.ai=true;q.remote=false}
  // Shuffle the cards in these slots among them; a shield keeps its letter.
  const redeal=slots=>{
    const pool=shuffle(slots.map(([z,i])=>z[i]));
    slots.forEach(([z,i],k)=>{pool[k].shL=z[i].shL;z[i]=pool[k]});
  };
  const hidden=(q,withHand)=>[
    ...(withHand?q.hand.map((_,i)=>[q.hand,i]):[]),
    ...q.sh.map((s,i)=>[q.sh,i]).filter(([,i])=>!q.sh[i].faceUp),
    ...q.deck.map((_,i)=>[q.deck,i])];
  redeal(hidden(o,true));
  redeal(hidden(m,false));
  for(const q of g.p)for(const c of [...q.hand,...q.deck])delete c.shL;
  return g;
}

// The options at one choice, as plain data so they can be made in any copy of the game.
function planOptions(p,phase){
  const o=opp(p),seen=new Set(),opts=[];
  const once=(key,a)=>{if(!seen.has(key)){seen.add(key);opts.push(a)}};
  if(phase==='charge'){
    if(p.charged||!p.hand.length)return [];
    opts.push({k:'skip'});
    for(const c of p.hand)once(c.n,{k:'charge',uid:c.uid,n:c.n});
  }else if(phase==='main'){
    opts.push({k:'skip'});
    for(const c of p.hand)if(canPlay(p,c))once(c.n,{k:'play',uid:c.uid,n:c.n});
  }else{
    if(!mustAttackers(p).length)opts.push({k:'skip'});
    for(const c of p.bz){
      if(canAttackPlayer(c,p))opts.push({k:'attack',uid:c.uid,t:'player',n:c.n});
      for(const t of attackTargets(c,p))opts.push({k:'attack',uid:c.uid,t:t.uid,n:c.n,tn:t.n});
      if(canTapAbility(c,p)&&fxList(T(c).tapAb[0]).some(f=>fxUseful(p,f)))once('tap'+c.n,{k:'tap',uid:c.uid,n:c.n});
    }
  }
  return opts;
}
async function makeOption(p,a){
  const c=a.uid&&findCard(a.uid)?.c;
  if(a.k==='charge'&&c&&p.hand.includes(c)){p.hand.splice(p.hand.indexOf(c),1);toMana(p,[c]);p.charged=true;log(`${V(p,'You charge','Opponent charges')} ${c.n} as mana.`)}
  else if(a.k==='play'&&c&&p.hand.includes(c)&&canPlay(p,c))await playCard(p,c);
  else if(a.k==='tap'&&c&&canTapAbility(c,p))await useTapAbility(p,c,0);
  else if(a.k==='attack'&&c&&p.bz.includes(c)){
    const t=a.t==='player'?'player':findCard(a.t)?.c;
    if(t==='player'?canAttackPlayer(c,p):t&&canAttackCreature(c,p,t))await attack(p,c,t);
  }
}
// The rest of the turn after an option, the quick way, then the opponent's reply.
async function playOut(me,phase,a){
  await makeOption(me,a);
  if(G.over)return;
  if(phase==='charge'||(phase==='main'&&a.k!=='skip'))await aiMain(me);
  if(G.over)return;
  if(!(phase==='attack'&&a.k==='skip')){await aiTapAbilities(me);if(!G.over)await aiAttacks(me)}
  else await aiForcedAttacks(me);
  if(G.over)return;
  await endTurn(me);
  if(G.over||nextPlayer(me)===me.seat)return;
  const o=opp(me);
  await beginTurn(o);if(G.over)return;
  await ruleTurn(o);if(G.over)return;
  await endTurn(o);
}
// Average score of each option over imagined worlds, within the time budget.
async function judge(p,phase,opts){
  const real=G,seat=p.seat,score=opts.map(()=>0),t0=now();
  let n=0;
  for(;n<PLAN.worlds;n++){
    if(n>=PLAN.minWorlds&&now()-t0>PLAN.ms)break;
    const world=imagine(p);
    for(let i=0;i<opts.length;i++){
      G=structuredClone(world);SIM++;
      try{const me=G.p[seat];await playOut(me,phase,opts[i]);score[i]+=evalBoard(me,p.evalW||EVAL)}
      catch(e){score[i]-=1;PLAN.simErrors++;PLAN.lastError=e}
      finally{SIM--;G=real}
    }
    await new Promise(r=>setTimeout(r,0));
    if(G!==real)throw PLAN_GONE;
  }
  return score.map(s=>s/Math.max(1,n));
}
async function choose(p,phase){
  const opts=planOptions(p,phase);
  if(!opts.length)return null;
  if(opts.length===1)return opts[0];
  const s=await judge(p,phase,opts);
  let best=0;for(let i=1;i<opts.length;i++)if(s[i]>s[best]+1e-9)best=i;
  return opts[best];
}
async function planTurn(p){
  const real=G;
  const live=()=>{if(G!==real||G.over)throw PLAN_GONE};
  await sleep(500);live();
  const ch=await choose(p,'charge');live();
  if(ch&&ch.k!=='skip'){await makeOption(p,ch);render()}
  for(let guard=0;guard<12;guard++){
    const a=await choose(p,'main');live();
    if(!a||a.k==='skip')break;
    await sleep(600);live();await makeOption(p,a);live();render();
  }
  for(let guard=0;guard<16;guard++){
    const a=await choose(p,'attack');live();
    if(!a||a.k==='skip')break;
    await sleep(700);live();await makeOption(p,a);live();render();
  }
  await aiForcedAttacks(p);
  await sleep(400);
}
