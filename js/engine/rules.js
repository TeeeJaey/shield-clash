/* ---------- core rules ---------- */
// The rules run the same way for the local player, the AI and an online opponent.
// Decisions go through chooseEffect/pickCard, which ask the right party; legality
// (who may attack, be attacked or block) lives in one place below and is shared by
// the UI, the AI and the engine itself.
function draw(p,n){for(let i=0;i<n&&p.deck.length;i++){p.hand.push(p.deck.pop());p.drawn=(p.drawn||0)+1}deckOut()}
// A player whose deck runs out loses straight away (checked after every step that can empty a deck).
function deckOut(){
  if(!G||G.over)return;
  const out=G.p.find(q=>!q.deck.length);
  if(out){log(`${V(out,'Your',"The opponent's")} deck is empty.`);G.why='deck';win(opp(out))}
}
function canPay(p,c){const u=p.mana.filter(m=>!m.tapped);return u.length>=costOf(c,p)&&manaCovers(signatures(u),civsOf(c))}
// Mana is grouped by what it can pay for: "fire", or "fire/nature" for a multicolored
// card, which pays for either civilization but never both at once.
function signatures(cards){const n={};for(const m of cards){const k=civsOf(m).join('/');n[k]=(n[k]||0)+1}return n}
// Can distinct mana cards supply one of each civilization in `need`?
function manaCovers(counts,need){
  if(!need.length)return true;
  const [e,...rest]=need;
  return Object.keys(counts).some(k=>{
    if(!counts[k]||!k.split('/').includes(e))return false;
    counts[k]--;const ok=manaCovers(counts,rest);counts[k]++;return ok;
  });
}
const bases=(p,c)=>c.evo?p.bz.filter(x=>evolvesOn(c,x)):[];
// Vortex evolution needs one creature of each of two races.
const vortexOK=(p,c)=>!c.vortex||p.bz.some(x=>racesOf(x).includes(c.vortex[0])&&p.bz.some(y=>y!==x&&racesOf(y).includes(c.vortex[1])));
const monoMana=(p,civ)=>p.mana.length>0&&p.mana.every(m=>civsOf(m).includes(civ));
const spellAllowed=c=>c.t!=='s'||rulesInPlay('onlySpells').every(([civ])=>civsOf(c).includes(civ));
// Turn steps: charge, then summon and cast, then attack. Once a creature has attacked (or tapped
// for its ability instead), the main step is over for the turn.
const canPlay=(p,c)=>c.playable&&!p.attacked&&canPay(p,c)&&(!c.evo||bases(p,c).length>0)&&vortexOK(p,c)&&spellAllowed(c)&&(!c.needSpell||!!p.castSpell)&&(!c.needMono||monoMana(p,c.needMono))&&(!c.needBehind||opp(p).sh.length>p.sh.length);
// Pays for a card while keeping the most useful mana untapped. It tries every way of
// splitting the cost across the kinds of mana available and picks the one that
// leaves the most other cards in hand still payable, then the most civilizations open.
function pay(p,c){
  const u=p.mana.filter(m=>!m.tapped),avail=signatures(u),kinds=Object.keys(avail),need=civsOf(c);
  const others=p.hand.filter(h=>h!==c);
  let best=null,bestScore=-1;
  const tap={};
  (function go(i,left){
    if(i===kinds.length){
      if(left||!manaCovers({...tap},need))return;
      const rem={};let total=0;kinds.forEach(k=>{rem[k]=avail[k]-tap[k];total+=rem[k]});
      const civs=Object.keys(CIV),open=civs.filter(e=>kinds.some(k=>rem[k]&&k.split('/').includes(e)));
      const playable=others.filter(h=>h.cost<=total&&manaCovers({...rem},civsOf(h))).length;
      const wanted=open.filter(e=>others.some(h=>civsOf(h).includes(e))).length;
      const score=playable*1000+wanted*100+open.length*10+Math.min(...kinds.map(k=>rem[k]));
      if(score>bestScore){bestScore=score;best={...tap}}
      return;
    }
    const k=kinds[i];
    for(let n=Math.min(avail[k],left);n>=0;n--){tap[k]=n;go(i+1,left-n)}
  })(0,costOf(c,p));
  for(const k of kinds){let n=best[k];for(const m of u){if(n<=0)break;if(civsOf(m).join('/')===k&&!m.tapped){m.tapped=true;n--}}}
}

/* ---------- power, attacking and blocking ---------- */
const ownerOf=c=>G.p.find(p=>p.bz.includes(c))||null;
const mustAttackAll=()=>G.p.some(p=>p.bz.some(c=>T(c).allMustAtk));
function canAttack(c,p){
  return !!c&&p.bz.includes(c)&&!c.tapped&&(!c.sick||!!T(c).speed)&&!T(c).noAtk&&!(T(c).noAtkNoSh&&!opp(p).sh.length)
    &&!rulesInPlay('bigNoAtk').some(([n])=>power(c)>=n);
}
const freeAttack=(c,p)=>!!c&&p.bz.includes(c)&&!c.tapped&&(!!T(c).freeAttack||!!(p.turnFx&&p.turnFx.freeAttack));
// "Creatures of that civilization can't attack you" (Miraculous Truce) protects the caster.
const truced=(c,p)=>{const t=opp(p).truce;return !!t&&civsOf(c).includes(t)};
const canAttackPlayer=(c,p)=>(canAttack(c,p)&&!T(c).noP||freeAttack(c,p))&&!truced(c,p)&&!lureFor(c,p).length;
function canAttackCreature0(c,p,t){
  const tc=T(c),tt=T(t);
  return canAttack(c,p)&&!tc.noAtkC&&opp(p).bz.includes(t)&&(t.tapped||!!tc.hunts||!!tt.attackable||(tc.huntCivs||[]).some(e=>civsOf(t).includes(e)))
    &&!tt.noBeAtk&&!civsOf(c).some(e=>(tt.noBeAtkBy||[]).includes(e))&&!(tt.noBeAtkDragon&&dragonRace(c))&&(!tc.atkOnlyBlk||!!tt.block);
}
// Creatures an attacker must attack if it can: Mystery Totems while Forbidding Totem is out,
// and a tapped Bodacious Giant during its controller's opponent's turn until it's attacked.
function lureFor(c,p){
  const o=opp(p),totems=o.bz.some(x=>T(x).lureTotems);
  return o.bz.filter(x=>(totems&&hasRace(x,'Mystery Totem')||T(x).taunt&&x.tapped&&G.p[G.turn]===p&&x.attackedOn!==G.turnNo)&&canAttackCreature0(c,p,x));
}
function canAttackCreature(c,p,t){
  if(!canAttackCreature0(c,p,t))return false;
  const lure=lureFor(c,p);
  return !lure.length||lure.includes(t);
}
const attackTargets=(c,p)=>opp(p).bz.filter(t=>canAttackCreature(c,p,t));
const canAttackAnything=(c,p)=>canAttackPlayer(c,p)||attackTargets(c,p).length>0;
// Creatures that must attack before their controller may end the turn.
const mustAttackers=p=>p.bz.filter(c=>(T(c).mustAtk||mustAttackAll()||p.mustAtkNext==='now'||rulesInPlay('oppMustAtk').some(([,q])=>q!==p)||lureFor(c,p).some(x=>T(x).taunt))&&canAttackAnything(c,p));
function canBlock(b,att,target,defender){
  if(!T(b).block||b.tapped||T(att).unbl)return false;
  const vs=T(b).blockVs;
  if(vs&&!(vs.dragon?dragonRace(att):civsOf(att).some(e=>vs.civs.includes(e))))return false;
  if(T(att).unblVsC&&target!=='player')return false;
  if(T(att).stealth&&defender.mana.some(m=>m.e===T(att).stealth||m.e2===T(att).stealth))return false;
  if(T(att).unblBy&&power(b)<=T(att).unblBy)return false;
  if(T(att).unblByMin&&power(b)>=T(att).unblByMin)return false;
  if(civsOf(b).some(e=>(T(att).unblByCiv||[]).includes(e)))return false;
  return true;
}

/* ---------- moving cards and pending triggers ---------- */
function reset(c){c.tapped=false;c.sick=true;c.boost=0;delete c.tmp;delete c.tmpNext;delete c.chosenRace;delete c.faceUp}
// "When this creature leaves the battle zone" triggers on every way out.
function leaveBz(p,c){
  const i=p.bz.indexOf(c);if(i<0)return null;
  const tc=T(c);
  p.bz.splice(i,1);
  if(tc.soulPhoenix&&c.under.length){
    const rest=c.under;c.under=[];
    rest.forEach(b=>{b.under=[];b.tapped=c.tapped;b.sick=false});p.bz.splice(i,0,...rest);
    log(`Only ${c.n} leaves; ${rest.map(b=>b.n).join(' and ')} stay${rest.length>1?'':'s'} in the battle zone.`);
    reset(c);if(tc.onLeave)queueFx(p,tc.onLeave,c);
    return [c];
  }
  const pile=[c,...c.under];c.under=[];pile.forEach(reset);
  if(tc.onLeave)queueFx(p,tc.onLeave,c);
  return pile;
}
// Discarded cards go to the graveyard; some may enter the battle zone instead during
// the opponent's turn.
function discardCard(p,c){
  const i=p.hand.indexOf(c);if(i<0)return;
  p.hand.splice(i,1);p.gy.push(c);
  if(c.discardToBz&&G.p[G.turn]!==p&&c.t==='c')queueFx(p,JSON.stringify({k:'fromGy',uid:c.uid,may:c.discardToBz==='may',x:`Put ${c.n} into the battle zone instead of discarding it?`}),c);
}
// Abilities that trigger while something else is happening (a creature is destroyed in
// the middle of a battle) wait in G.queue and resolve once the current step is done.
// The turn player's waiting abilities resolve first, then the other player's; a player with
// several waiting chooses their order. Anything triggered meanwhile joins the wait.
function queueFx(p,fx,src){if(fxList(fx).length)(G.queue||(G.queue=[])).push({p,fx,src})}
async function flushFx(){
  while(G.queue&&G.queue.length&&!G.over){
    const tp=G.p[G.turn]||G.p[0],mine=G.queue.filter(t=>t.p===tp),pool=mine.length?mine:G.queue;
    const t=pool.length>1?await chooseOrder(pool):pool[0];
    G.queue.splice(G.queue.indexOf(t),1);
    await resolveFx(t.p,t.fx,t.src);
  }
  deckOut();
}
async function chooseOrder(pool){
  const label=t=>`${t.src.n}: ${fxDesc(t.fx)}`;
  if(new Set(pool.map(label)).size===1)return pool[0];
  const i=await chooseEffect(pool[0].p,'Choose the order','These abilities trigger at the same time. Choose the one that resolves first; the others follow.',
    pool.map((t,i)=>({label:label(t),val:i,main:i===0})),0);
  return pool[Number.isInteger(i)&&pool[i]?i:0];
}
const toMana=(p,cards)=>cards.forEach(c=>{c.tapped=!!c.e2;p.mana.push(c)});
// Puts a card from owner's mana zone into their graveyard; cause is the player whose effect did it.
function manaToGy(owner,c,cause){
  const i=owner.mana.indexOf(c);if(i<0)return;
  owner.mana.splice(i,1);c.tapped=false;
  const saver=cause&&cause!==owner&&owner.bz.find(x=>T(x).manaSaver);
  if(saver){toMana(owner,[c]);log(`${c.n} would go to ${whose(owner)} graveyard, but ${saver.n} returns it to the mana zone.`);return}
  owner.gy.push(c);log(`${c.n} goes from ${whose(owner)} mana zone to the graveyard.`);
}
// The player who controls an effect's source (a creature in play, or a spell being cast).
const causeOf=src=>src&&(ownerOf(src)||src.caster)||null;
function destroy(p,c){
  if(!p.bz.includes(c))return;
  const tc=T(c);
  if(tc.noDestroy){log(`${c.n} stays in the battle zone.`);return}
  // "When one of your Armored Dragons would be destroyed, you may destroy this creature instead."
  const saver=p.bz.find(x=>x!==c&&T(x).dragonSaver&&hasRace(c,T(x).dragonSaver));
  if(saver){log(`${saver.n} is destroyed instead of ${c.n}.`);destroy(p,saver);return}
  let to=p.turnFx&&p.turnFx.destroyToMana?'mana':tc.destroyTo;
  if((p.turnFx&&p.turnFx.hokira||[]).some(r=>hasRace(c,r)))to='hand';
  if(to==='kalute')to=G.p.some(q=>q.bz.some(x=>x!==c&&x.n===c.n))?'hand':null;
  if(to==='dracodance')to=p.mana.some(m=>m.t==='c'&&dragonRace(m))?'dracodance':null;
  const pile=leaveBz(p,c);
  if(to==='dracodance'){
    toMana(p,pile);log(`${c.n} goes to ${whose(p)} mana zone instead of being destroyed.`);
    queueFx(p,JSON.stringify({k:'gather',n:1,f:{t:'c',dragon:1},from:['mana'],to:'hand',x:'Return a creature that has Dragon in its race from your mana zone to your hand.'}),c);
    return;
  }
  // "Return it to your hand instead. If you do, discard a card from your hand."
  if(to==='hand'&&tc.destroyCost==='discard')queueFx(p,JSON.stringify({k:'selfDiscard',n:1,x:'Discard a card from your hand.'}),c);
  if(to==='mana'){toMana(p,pile);log(`${c.n} would be destroyed, but goes to ${whose(p)} mana zone instead.`)}
  else if(to==='hand'){p.hand.push(...pile);log(`${c.n} would be destroyed, but returns to ${whose(p)} hand instead.`)}
  else if(to==='deck'){p.deck.push(...pile);shuffle(p.deck);log(`${c.n} would be destroyed, but is shuffled into ${whose(p)} deck instead.`)}
  else if(to==='shield'){p.sh.push(c);p.gy.push(...pile.slice(1));log(`${c.n} would be destroyed, but becomes a new shield instead.`)}
  else{
    p.gy.push(...pile);log(`${c.n} is destroyed.`);queueFx(p,tc.onDie,c);
    // Slash and Burn: whenever one of the caster's opponent's creatures is destroyed this turn.
    if(opp(p).turnFx&&opp(p).turnFx.slashBurn)queueFx(p,['manaToGy','shieldToGy'],{n:'Slash and Burn',caster:opp(p)});
    for(const [q,x,t] of G.lookBack||watchers())if(x!==c&&t.onAnyDie)queueFx(q,t.onAnyDie,x);
    for(const [q,x,t] of G.lookBack||watchers())if(q===p&&x!==c)for(const w of t.onOwnDie||[])if((!w.races||w.races.some(r=>hasRace(c,r)))&&(!w.oppTurn||G.p[G.turn]!==p))queueFx(p,w.fx,x);
  }
}
const watchers=()=>G.p.flatMap(q=>q.bz.map(x=>[q,x,T(x)]));
// Creatures destroyed at the same time ([owner, creature] pairs, chosen before any leaves) all
// see each other go: "whenever another creature is destroyed" looks back at the moment before.
function destroyAll(list){
  G.lookBack=watchers();
  try{for(const [q,c] of list)destroy(q,c)}finally{G.lookBack=null}
}
const allBz=f=>G.p.flatMap(q=>q.bz.filter(c=>f(c,q)).map(c=>[q,c]));
function bounce(p,c){const pile=leaveBz(p,c);if(pile){p.hand.push(...pile);log(`${c.n} returns to ${whose(p)} hand.`)}}
const whose=o=>V(o,'your',"the opponent's");

/* ---------- effects ---------- */
function targetsFor(f,p){
  if(f.startsWith('optional:'))return targetsFor(f.slice(9),p);
  const o=opp(p),m=/^burn(\d+)$/.exec(f);
  if(m)return o.bz.filter(c=>power(c)<=+m[1]);
  if(f==='bounce'||f==='kill')return o.bz.slice();
  if(f==='killTapped')return o.bz.filter(c=>c.tapped);
  if(f==='tapone')return o.bz.filter(c=>!c.tapped);
  if(f==='bounceAny')return [...o.bz,...p.bz];
  if(f==='killUntapped')return o.bz.filter(c=>!c.tapped);
  if(f==='killBlocker')return o.bz.filter(c=>T(c).block);
  return null;
}
function simpleFx(p,f,src){
  const all=/^sweepAll(\d+)$/.exec(f);
  if(all){destroyAll(allBz(c=>power(c)<=+all[1]));return}
  if(f==='draw1')f='draw';
  const o=opp(p),sw=/^sweep(\d+)$/.exec(f);
  if(sw){const hit=allBz((c,q)=>q===o&&power(c)<=+sw[1]);if(!hit.length)log(`${src.n} hits nothing.`);destroyAll(hit);return}
  if(f==='draw'||f==='draw2'||f==='draw3'){const n=f==='draw'?1:+f.slice(4);draw(p,n);log(`${V(p,'You draw','Opponent draws')} ${n===1?'a card':n+' cards'}.`)}
  else if(f==='ramp'||f==='ramp2'){const n=f==='ramp'?1:2;for(let i=0;i<n&&p.deck.length;i++){const c=p.deck.pop();c.tapped=!!c.e2;p.mana.push(c);log(`${c.n} goes to ${whose(p)} mana zone.`)}}
  else if(f==='discardAll'){const o=opp(p);o.hand.slice().forEach(c=>discardCard(o,c));log(`${V(o,'You discard','Opponent discards')} the entire hand.`)}
  else if(f==='tapall'){o.bz.forEach(c=>tapBy(p,c));log(`All of ${whose(o)} creatures are tapped.`)}
  else if(f==='discard'||f==='discard2'||f==='discardSelfRandom'){const who=f==='discardSelfRandom'?p:o,n=f==='discard2'?2:1;for(let i=0;i<n&&who.hand.length;i++){const c=aiRandom(who.hand);discardCard(who,c);log(`${V(who,'You discard','Opponent discards')} ${c.n}.`)}}
  else if(f==='shieldadd'||f==='shield2'){const n=f==='shieldadd'?1:2;let k=0;for(;k<n&&p.deck.length;k++)p.sh.push(p.deck.pop());if(k)log(`${V(p,'You add','Opponent adds')} ${k===1?'a shield':k+' shields'}.`)}
  else if(f==='recover'){const c=p.gy.filter(x=>x.t==='c').sort((a,b)=>b.cost-a.cost)[0];if(c){p.gy.splice(p.gy.indexOf(c),1);p.hand.push(c);log(`${c.n} returns from ${whose(p)} graveyard to hand.`)}else log('No creature in the graveyard to return.')}
  else if(f==='manaburn'){if(o.mana.length){const c=o.mana[Math.floor(Math.random()*o.mana.length)];log(`${c.n} is knocked out of ${whose(o)} mana zone.`);manaToGy(o,c,p)}}
  else if(f==='tapSelf'){if(src&&!src.tapped&&ownerOf(src)){src.tapped=true;log(`${src.n} is tapped.`)}}
  else if(f==='destroySelf'){const owner=src&&ownerOf(src);if(owner)destroy(owner,src)}
  else if(f==='bounceSelf'){const owner=src&&ownerOf(src);if(owner)bounce(owner,src)}
  else if(f==='sweepBlockers'){destroyAll(allBz(c=>T(c).block))}
  else if(f==='tapBlockers'){o.bz.filter(c=>T(c).block).forEach(c=>tapBy(p,c));log(`All of ${whose(o)} blockers are tapped.`)}
  else if(f==='bounceBlockers'){allBz(c=>T(c).block).forEach(([q,c])=>bounce(q,c))}
  else if(/^bounceAll\d+$/.test(f)){const n=+f.slice(9);allBz(c=>power(c)<=n).forEach(([q,c])=>bounce(q,c))}
  else if(f.startsWith('grantOwn:')){
    const g=JSON.parse(f.slice(9));
    for(const c of p.bz){c.boost=(c.boost||0)+g.power;if(Object.keys(g.traits).length)c.tmp=mergeTraits(c.tmp||{},g.traits)}
    log(`${V(p,'Your','Opponent\'s')} creatures get ${grantText(g)} until the end of the turn.`);
  }
  else if(f==='discardSelfAll'){const n=p.hand.length;p.hand.slice().forEach(c=>discardCard(p,c));log(`${V(p,'You discard','Opponent discards')} ${n} card${n===1?'':'s'}.`)}
  else if(f==='boost3000'){if(src&&ownerOf(src)){src.boost=(src.boost||0)+3000;log(`${src.n} gets +3000 power until the end of the turn.`)}}
}
// "Whenever your opponent would choose a creature in the battle zone, he can't choose this one."
const choosable=(p,c)=>{const o=G.p.find(q=>q.bz.includes(c));return !o||o===p||!T(c).noChoose};
// "Your opponent can't tap this creature."
function tapBy(p,c,say){
  if(T(c).noOppTap&&ownerOf(c)!==p){log(`${c.n} can't be tapped by the opponent.`);return}
  c.tapped=true;if(say)log(`${c.n} is tapped.`);
}
async function chooseEffect(p,title,text,opts,aiValue){
  if(p.ai)return aiValue;
  if(p.remote)return remoteDecide(p,'choice',{title,text,opts});
  return ask(title,text,opts);
}
// Choose one card from any zone. Battle-zone cards and shields are picked on the board;
// cards in other zones (mana, hand) are offered as a list. Face-down shields go by their
// letter, never their name. Returns the card, or null when an optional choice is skipped.
async function pickCard(p,cards,msg,{optional=false,hidden=false,aiPick}={}){
  cards=cards.filter(c=>choosable(p,c));
  if(!cards.length)return null;
  const shOwner=G.p.find(q=>cards.every(c=>q.sh.includes(c)));
  if(shOwner&&shOwner!==p&&[p,shOwner].some(q=>q.bz.some(x=>T(x).meloppe))){log(`${V(shOwner,'You choose','The opponent chooses')} the shield instead (Meloppe).`);p=shOwner}
  if(p.ai)return aiPick?aiPick(cards):cards[0];
  if(cards.every(c=>G.p.some(q=>q.bz.includes(c)||q.sh.includes(c)))){
    if(p.remote)return cardBy(await remoteDecide(p,'target',{uids:cards.map(c=>c.uid),msg,required:!optional}));
    return pickTarget(cards,msg,optional?'Skip':null);
  }
  const opts=cards.map((c,i)=>({label:hidden?`Shield ${c.shL||i+1}`:c.n,val:i}));
  if(optional)opts.push({label:'Skip',val:-1});
  const i=await chooseEffect(p,'Choose a card',msg,opts,0);
  if(Number.isInteger(i)&&i>=0&&i<cards.length)return cards[i];
  return optional?null:cards[0];
}
// AI preferences for the cards it must give up or choose.
const aiCheapest=cards=>cards.slice().sort((a,b)=>(a.t==='c'?power(a):0)-(b.t==='c'?power(b):0)||a.cost-b.cost)[0];
const aiDearest=cards=>cards.slice().sort((a,b)=>b.cost-a.cost)[0];
const aiRandom=cards=>cards[Math.floor(Math.random()*cards.length)];
// Effects that move one chosen card between zones.
const ZONE_MOVES={
  manaToHand:{from:'mana',msg:'Return a card from your mana zone to your hand.',ai:aiDearest,
    move(p,c){p.mana.splice(p.mana.indexOf(c),1);c.tapped=false;p.hand.push(c);log(`${c.n} returns from ${whose(p)} mana zone to hand.`)}},
  manaToGy:{from:'mana',msg:'Put a card from your mana zone into your graveyard.',ai:aiCheapest,
    move(p,c,cause){manaToGy(p,c,cause)}},
  shieldToGy:{from:'sh',hidden:true,msg:'Choose one of your shields and put it into your graveyard.',ai:aiRandom,
    move(p,c){p.sh.splice(p.sh.indexOf(c),1);p.gy.push(c);log(`One of ${whose(p)} shields goes to the graveyard.`)}},
  oppShieldToGy:{from:'sh',side:'opp',hidden:true,msg:"Choose one of your opponent's shields and put it into their graveyard.",ai:aiRandom,
    move(o,c){o.sh.splice(o.sh.indexOf(c),1);o.gy.push(c);log(`One of ${whose(o)} shields goes to the graveyard.`)}}
};
// "move:gy>hand:creature-darkness-:1" -> from, to, card type, civilization, minimum
// cost, count, and "u" when the printed text says "up to".
const MOVE=/^move:(gy|mana|hand)>(hand|mana|sh):(card|creature|spell)-(\w*)-(\d*):(\d)(u?)$/;
const ZONE_NAME={gy:'graveyard',mana:'mana zone',hand:'hand',sh:'shields'};
function moveCandidates(p,f){
  const [,from,,type,civ,min]=MOVE.exec(f);
  return p[from].filter(c=>(type==='card'||c.t===(type==='spell'?'s':'c'))&&(!civ||c.e===civ||c.e2===civ)&&(!min||c.cost>=+min));
}
function moveCard(p,c,from,to){
  p[from].splice(p[from].indexOf(c),1);
  if(to==='mana')toMana(p,[c]);else{c.tapped=false;p[to].push(c)}
  // Cards leaving a hand or entering the shields stay unnamed for the other player.
  const named=from!=='hand'&&to!=='sh'?c.n:'A card';
  log(`${named} goes from ${whose(p)} ${ZONE_NAME[from]} to ${V(p,'your','their')} ${ZONE_NAME[to]}.`);
}
// What the AI picks when it moves its own cards: cheap cards out of hand, the best back.
const aiMovePick=from=>from==='hand'?aiCheapest:aiDearest;
async function resolveFx(p,fx,src){
  for(const printedFx of fxList(fx)){
    if(G.over)return;
    const optional=printedFx.startsWith('optional:'),f=optional?printedFx.slice(9):printedFx;
    if(isJsonFx(f)){
      const e=jfx(f);
      // Choices and searches carry their own "skip"; other optional effects ask first.
      if(optional&&!['pick','search'].includes(e.k)&&!(await chooseEffect(p,src.n,e.x.replace(/\.$/,'?'),[{label:'Yes',val:true,main:1},{label:'No',val:false}],jsonUseful(p,e,src)))){log(`${src.n}: effect skipped.`);continue}
      await jsonFx(p,e,src,optional);
      await flushFx();render();continue;
    }
    const up=/^drawUp(\d+)$/.exec(f);
    if(up){
      const max=+up[1],opts=Array.from({length:max+1},(_,n)=>({label:`Draw ${n} card${n===1?'':'s'}`,val:n}));
      const n=await chooseEffect(p,src.n,fxText(f),opts,Math.min(max,p.deck.length));
      if(Number.isInteger(n)&&n>=0&&n<=max)draw(p,n);
      render();continue;
    }
    if(f==='discardShield'){
      if(p.sh.length){
        const opts=p.sh.map((_,i)=>({label:`Shield ${i+1}`,val:i}));
        const index=await chooseEffect(p,src.n,fxText(f),opts,Math.floor(Math.random()*p.sh.length));
        const i=Number.isInteger(index)&&index>=0&&index<p.sh.length?index:0;
        p.gy.push(p.sh.splice(i,1)[0]);log(`${src.n} puts one of ${whose(p)} shields into the graveyard.`);
      }
      render();continue;
    }
    const zm=/^(manaToHand|manaToGy|shieldToGy|oppShieldToGy)(\d*)$/.exec(f);
    if(zm){
      const spec=ZONE_MOVES[zm[1]],side=spec.side==='opp'?opp(p):p;
      for(let k=0;k<(+zm[2]||1);k++){
        const c=await pickCard(p,side[spec.from].slice(),`${src.n}: ${spec.msg}`,{optional,hidden:spec.hidden,aiPick:spec.ai});
        if(!c){if(!side[spec.from].length)log(`${src.n}: nothing to choose.`);break}
        spec.move(side,c,causeOf(src));render();
      }
      continue;
    }
    const mv=MOVE.exec(f);
    if(mv){
      const [,from,to,,,,count,upto]=mv;
      for(let k=0;k<+count;k++){
        const cands=moveCandidates(p,f);
        if(!cands.length){if(!k)log(`${src.n}: nothing to move.`);break}
        const c=await pickCard(p,cands,`${src.n}: ${fxText(f)}`,{optional:optional||!!upto,aiPick:aiMovePick(from)});
        if(!c)break;
        moveCard(p,c,from,to);render();
      }
      continue;
    }
    // The opponent makes these choices among their own cards.
    const oc=/^(oppDestroysOwn|oppOwnToMana|oppManaToHand|oppDiscards|oppOwnToHand|oppManaChooseGy)(2?)$/.exec(f);
    if(oc){
      const o=opp(p),zone={oppDestroysOwn:'bz',oppOwnToMana:'bz',oppManaToHand:'mana',oppDiscards:'hand',oppOwnToHand:'bz',oppManaChooseGy:'mana'}[oc[1]];
      for(let k=0;k<(+oc[2]||1);k++){
        if(!o[zone].length){if(!k)log(`${src.n}: nothing to choose.`);break}
        const c=await pickCard(o,o[zone].slice(),`${src.n}: ${fxText(f)}`,{aiPick:zone==='mana'&&oc[1]!=='oppManaChooseGy'?aiDearest:aiCheapest});
        if(oc[1]==='oppDestroysOwn'){anim(c,'die');render();await sleep(450);destroy(o,c)}
        else if(oc[1]==='oppOwnToMana'){const pile=leaveBz(o,c);toMana(o,pile);log(`${c.n} goes to ${whose(o)} mana zone.`)}
        else if(oc[1]==='oppOwnToHand')bounce(o,c);
        else if(oc[1]==='oppManaChooseGy')manaToGy(o,c,p);
        else if(oc[1]==='oppManaToHand'){o.mana.splice(o.mana.indexOf(c),1);c.tapped=false;o.hand.push(c);log(`${c.n} returns from ${whose(o)} mana zone to hand.`)}
        else{discardCard(o,c);log(`${V(o,'You discard','Opponent discards')} ${c.n}.`)}
        await flushFx();render();
      }
      continue;
    }
    // You choose cards in the opponent's mana zone (face up) to put into their graveyard.
    const om=/^oppManaToGy(2u)?$/.exec(f);
    if(om){
      const o=opp(p);
      for(let k=0;k<(om[1]?2:1);k++){
        if(!o.mana.length)break;
        const c=await pickCard(p,o.mana.slice(),`${src.n}: ${fxText(f)}`,{optional:optional||(!!om[1]&&k>0),aiPick:aiDearest});
        if(!c)break;
        manaToGy(o,c,p);render();
      }
      continue;
    }
    // Looking at a face-down shield shows it only to the player who looks.
    if(f==='peekShield'){
      const o=opp(p);
      if(!o.sh.length||p.ai)continue;
      if(optional&&!(await chooseEffect(p,src.n,"Look at one of your opponent's shields?",[{label:'Look',val:true,main:1},{label:'No',val:false}],false)))continue;
      const s=await pickCard(p,o.sh.slice(),`${src.n}: Choose a shield to look at.`,{hidden:true});
      if(s)await chooseEffect(p,src.n,`That shield is ${s.n}. It goes back where it was.`,[{label:'OK',val:true,main:1}],true);
      log(`${V(p,'You look','Opponent looks')} at one of ${whose(o)} shields.`);
      continue;
    }
    // "Destroy one of your creatures" may choose the source itself.
    const own=/^destroyOwn(?:P(\d+))?$/.exec(f);
    if(own){
      const tg=p.bz.filter(c=>!own[1]||power(c)<=+own[1]);
      const t=await pickCard(p,tg,`${src.n}: Destroy one of your creatures.`,{optional,aiPick:cards=>aiCheapest(cards.filter(c=>c!==src).length?cards.filter(c=>c!==src):cards)});
      if(!t){log(`${src.n}: no creature to destroy.`);continue}
      anim(t,'die');render();await sleep(450);destroy(p,t);await flushFx();render();continue;
    }
    const o=opp(p),tg=targetsFor(f,p)?.filter(c=>choosable(p,c));
    if(tg){
      if(!tg.length){log(`${src.n}: no target.`);continue}
      const msg=`${src.n}: ${fxText(f)}`;
      const t=p.ai?tg.slice().sort((a,b)=>(o.bz.includes(b)-o.bz.includes(a))||(power(b)-power(a)))[0]:p.remote?cardBy(await remoteDecide(p,'target',{uids:tg.map(c=>c.uid),msg,required:!optional})):await pickTarget(tg,msg,optional?'Skip':null);
      if(!t){log(`${src.n}: effect skipped.`);continue}
      const owner=p.bz.includes(t)?p:o;
      if(f==='bounce'||f==='bounceAny')bounce(owner,t);
      else if(f==='tapone')tapBy(p,t,true);
      else{anim(t,'die');render();await sleep(450);destroy(owner,t)}
    }else if(optional&&!(await chooseEffect(p,src.n,fxText(f)+'?',[{label:'Yes',val:true,main:1},{label:'No',val:false}],true))){log(`${src.n}: effect skipped.`);continue}
    else simpleFx(p,f,src);
    await flushFx();
    render();
  }
}

/* ---------- playing cards ---------- */
// Puts a creature into the battle zone (summoned, evolved, or from a shield) and runs
// everything that triggers on it entering.
async function enterBattle(p,c,base){
  if(base){
    const all=[].concat(base),i=p.bz.indexOf(all[0]);
    c.under=all.flatMap(b=>[b,...b.under]);all.forEach(b=>{b.under=[]});
    c.tapped=all[0].tapped;c.sick=false;p.bz.splice(i,1,c);
    for(const b of all.slice(1))p.bz.splice(p.bz.indexOf(b),1);
    anim(c,'enter');
    log(`${all.map(b=>b.n).join(' and ')} evolve${all.length>1?'':'s'} into ${c.n}!`);
    for(const q of G.p)for(const x of q.bz)if(x!==c&&T(x).onAnyEvolve)queueFx(q,T(x).onAnyEvolve,x);
  }else{
    c.tapped=false;c.sick=!c.speed;p.bz.push(c);anim(c,'enter');
    log(`${V(p,'You summon','Opponent summons')} ${c.n}.`);
  }
  if(T(c).entersTapped){c.tapped=true;log(`${c.n} enters the battle zone tapped.`)}
  render();
  // Creatures already in play react first, then the newcomer's own summon ability.
  for(const q of [p,opp(p)])for(const x of q.bz.slice()){
    if(x===c)continue;
    if(T(x).onAnyEnter)queueFx(q,T(x).onAnyEnter,x);
    if(q===p&&T(x).onOwnEnter)queueFx(q,T(x).onOwnEnter,x);
  }
  // "Whenever you put a Ghost into the battle zone" ("another" excludes the creature itself).
  for(const x of p.bz)for(const w of T(x).enterWatch||[]){
    if(w.q.other&&x===c)continue;
    const word=w.q.raceWord;
    const fits=(w.q.races||[]).some(r=>hasRace(c,r))||word==='dragon'&&dragonRace(c)||!!word&&word!=='dragon'&&new RegExp('\\b'+word+'\\b','i').test(c.race||'');
    if(fits)queueFx(p,w.fx,x);
  }
  await flushFx();
  if(T(c).onSum&&p.bz.includes(c))await resolveFx(p,T(c).onSum,c);
  await flushFx();
}
async function chooseBase(p,c,cancel){
  if(c.vortex){
    const out=[];
    for(const r of c.vortex){
      const b=p.bz.filter(x=>racesOf(x).includes(r)&&!out.includes(x)&&(out.length||p.bz.some(y=>y!==x&&racesOf(y).includes(c.vortex[1]))));
      const pickOne=p.ai?b.sort((x,y)=>x.p-y.p)[0]:await pickCard(p,b,`Choose the ${r} for ${c.n}.`,{optional:cancel});
      if(!pickOne)return null;out.push(pickOne);
    }
    return out;
  }
  const b=bases(p,c);
  if(b.length<=1)return b[0]||null;
  return p.ai?b.sort((x,y)=>(y.sick-x.sick)||(x.p-y.p))[0]:pickCard(p,b,`Choose which ${c.evo} becomes ${c.n}.`,{optional:cancel});
}
async function castSpell(p,c){
  p.castSpell=true;c.caster=p;
  await resolveFx(p,c.fx,c);
  // "Whenever a player casts a spell" resolves after the spell does.
  for(const q of G.p)for(const x of q.bz)if(T(x).onAnySpell)queueFx(q,T(x).onAnySpell,x);
  for(const x of opp(p).bz)if(T(x).onOppSpell)queueFx(opp(p),T(x).onOppSpell,x);
  await flushFx();
  if(c.charger){c.tapped=!!c.e2;p.mana.push(c);log(`${c.n} goes to ${whose(p)} mana zone (Charger).`)}
  else p.gy.push(c);
}
async function playCard(p,c){
  if(!canPlay(p,c))return;
  let base=null;
  if(c.evo){base=await chooseBase(p,c,true);if(!base)return}
  pay(p,c);p.hand.splice(p.hand.indexOf(c),1);p.played=true;
  // "Whenever your opponent summons a creature or casts a spell".
  for(const x of opp(p).bz)if(T(x).onOppPlay)queueFx(opp(p),T(x).onOppPlay,x);
  if(c.t==='s'){
    log(`${V(p,'You cast','Opponent casts')} ${c.n}.`);render();
    await castSpell(p,c);
  }else{
    await enterBattle(p,c,base);
    // Live and Breathe: another creature with the same name may follow from the deck.
    if(p.turnFx&&p.turnFx.liveBreathe&&!G.over)await SPECIALS.liveBreathe(p,{n:c.n},c);
  }
  render();
}

/* ---------- battles and attacks ---------- */
// slayVs lists civilizations a conditional slayer ("Nature and light slayer") destroys.
const slays=(a,b)=>T(a).slayer||(T(a).slayVs||[]).includes(b.e)||(T(a).slayVs||[]).includes(b.e2);
async function battle(ap,a,dp,d,{blocked=false}={}){
  const pa=battlePower(a,d,true),pd=battlePower(d,a,false);
  log(`${a.n} (${pa}) battles ${d.n} (${pd}).`);
  let aDies=pa<=pd,dDies=pd<=pa;
  if(slays(a,d))dDies=true;if(slays(d,a))aDies=true;
  // "When this creature loses a battle against a darkness creature, it isn't destroyed."
  const survives=(x,y)=>(T(x).surviveVs||[]).some(e=>civsOf(y).includes(e));
  if(aDies&&!slays(d,a)&&survives(a,d)){aDies=false;log(`${a.n} survives the battle.`)}
  if(dDies&&!slays(a,d)&&survives(d,a)){dDies=false;log(`${d.n} survives the battle.`)}
  const aWins=pa>pd,dWins=pd>pa;
  anim(d,'hit');render();await sleep(380);
  if(dDies)anim(d,'die');if(aDies)anim(a,'die');
  if(dDies||aDies){render();await sleep(450)}
  destroyAll([...(dDies?[[dp,d]]:[]),...(aDies?[[ap,a]]:[])]);
  // After-battle abilities of creatures still in the battle zone.
  for(const [p,c,won] of [[ap,a,aWins],[dp,d,dWins]]){
    if(!p.bz.includes(c))continue;
    if(T(c).battleDie||(won&&T(c).winDie)||(c===d&&blocked&&T(c).blockDie)){log(`${c.n} is destroyed after the battle.`);destroy(p,c)}
    else if(c===d&&blocked&&T(c).blockUntap){c.tapped=false;log(`${c.n} untaps after blocking.`)}
    else if(won&&T(c).winUntap&&c.tapped){c.tapped=false;log(`${c.n} wins the battle and untaps.`)}
  }
  for(const uid of (G.postBattle||[]).splice(0)){const f=findCard(uid);if(f&&f.z==='bz'&&f.c.tapped){f.c.tapped=false;log(`${f.c.n} untaps after the battle.`)}}
  await flushFx();
  render();
}
async function chooseBlocker(o,att,blockers,target,lured){
  // A creature that "blocks if able" leaves the defender no choice but which one.
  const forced=lured?blockers:blockers.filter(b=>T(b).mustBlock),options=forced.length?forced:blockers,required=forced.length>0;
  let b;
  if(o.ai)b=aiBlock(o,att,options,target,required);
  else if(o.remote)b=cardBy(await remoteDecide(o,'block',{att:att.uid,blockers:options.map(x=>x.uid),target:target==='player'?'player':target.uid,required}));
  else b=await askBlock(att,options,target,required);
  if(!options.includes(b))b=required?options[0]:null;
  return b;
}
async function attack(p,att,target){
  p.attacked=true;G.attacking=att;G.attackTarget=target;
  if(target!=='player')target.attackedOn=G.turnNo;
  try{await attackSteps(p,att,target)}finally{G.attacking=null;G.attackTarget=null}
  // "When this creature attacks a player, destroy it after the attack."
  if(target==='player'&&T(att).atkPlayerDie&&!G.over&&p.bz.includes(att)){log(`${att.n} is destroyed after the attack.`);destroy(p,att);await flushFx();render()}
}
async function attackSteps(p,att,target){
  const o=opp(p);att.tapped=true;
  anim(att,p===G.p[0]?'up':'down');
  const what=target==='player'?(o.sh.length?`${whose(o)} shields`:V(o,'you','the opponent')+' directly'):target.n;
  log(`${att.n} attacks ${what}.`);render();await sleep(450);
  // "Whenever this creature attacks", "whenever any of your creatures attacks" and
  // "whenever this creature is attacked" resolve before blockers are declared.
  if(T(att).onAtk)queueFx(p,T(att).onAtk,att);
  for(const x of p.bz)if(T(x).onOwnAtk)queueFx(p,T(x).onOwnAtk,x);
  if(target!=='player'&&T(target).onAttacked)queueFx(o,T(target).onAttacked,target);
  // Bubble Scarab: "whenever one of your creatures is attacked".
  if(target!=='player')for(const x of o.bz)if(T(x).bubbleScarab)queueFx(o,JSON.stringify({k:'x',f:'bubble',uid:target.uid,x:'You may discard a card. If you do, that creature gets +3000 power until the end of the turn.'}),x);
  if(target!=='player')for(const w of T(att).onAtkC||[])if(power(target)>=w.min)queueFx(p,w.fx,att);
  if(G.queue&&G.queue.length){
    await flushFx();
    if(G.over||!p.bz.includes(att))return;
    if(target!=='player'&&!o.bz.includes(target)){log(`${att.n}'s target is gone.`);return}
  }
  // Storm Wrangler: the chosen blocker blocks if able, and no other creature can.
  const lure=T(att).lureBlocker,blockers=o.bz.filter(b=>canBlock(b,att,target,o)&&(!lure||b.uid===lure));
  if(blockers.length){
    const b=await chooseBlocker(o,att,blockers,target,!!lure);
    if(b){
      b.tapped=true;log(`${b.n} blocks.`);
      if(p.turnFx&&p.turnFx.blockedSlayer){att.tmp=mergeTraits(att.tmp||{},{slayer:1});log(`${att.n} gets "slayer" until the end of the turn.`)}
      if(p.turnFx&&p.turnFx.natureBlockedBreak&&target==='player'&&civsOf(att).includes('nature'))queueFx(p,JSON.stringify({k:'breakSh',n:1,x:'It breaks one of his shields.'}),att);
      queueFx(p,T(att).onBlocked,att);queueFx(o,T(b).onBlock,b);
      if(target==='player')queueFx(p,T(att).onBlockedP,att);
      G.blocker=b;
      try{await flushFx()}finally{G.blocker=null}
      if(G.over||!p.bz.includes(att))return;
      if(!o.bz.includes(b)){log(`${b.n} is gone; no battle happens.`);render();return}
      if(T(att).noBattleBlocked||T(b).noBattleBlocks){log('No battle happens.');render();return}
      await battle(p,att,o,b,{blocked:true});return;
    }
  }
  if(target!=='player'){await battle(p,att,o,target);return}
  if(T(att).onUnblocked){
    await resolveFx(p,T(att).onUnblocked,att);
    if(G.over||!p.bz.includes(att))return;
  }
  if(!o.sh.length){log(`${att.n} lands the final blow.`);win(p);return}
  let n=Math.min(breaks(att),o.sh.length);
  (p.brokeBy||(p.brokeBy=[])).push(att.uid);
  // "When one of your shields would be broken, you may destroy this creature instead."
  for(let k=n;k>0;k--){
    const saver=o.bz.find(x=>T(x).shieldSaver==='self')||(o.hand.length>=2&&o.bz.find(x=>T(x).shieldSaver==='discard2'));
    if(!saver)break;
    const self=T(saver).shieldSaver==='self';
    const yes=await chooseEffect(o,saver.n,self?`Destroy ${saver.n} instead of losing a shield?`:'Discard 2 cards instead of losing a shield?',[{label:'Yes',val:true,main:1},{label:'No',val:false}],o.sh.length<=2);
    if(!yes)break;
    if(self){destroy(o,saver)}
    else for(let j=0;j<2;j++){const c=await pickCard(o,o.hand.slice(),`${saver.n}: Discard a card.`,{aiPick:aiCheapest});discardCard(o,c)}
    log(`A shield is saved.`);n--;
  }
  await flushFx();
  if(G.over)return;
  // The attacker chooses which shields break, unless a creature lets the defender choose.
  const chosen=await chooseShields(o.bz.some(x=>T(x).chooseBroken)?o:p,o,n,att.n);
  await breakShields(o,chosen,{toGy:!!T(att).breakToGy,by:att});
  // Miracle Quest: "you may draw 2 cards for each shield it broke".
  if(p.turnFx&&p.turnFx.miracleQuest&&chosen.length&&!G.over&&p.deck.length){
    const k=2*chosen.length;
    if(await chooseEffect(p,'Miracle Quest',`${att.n} broke ${chosen.length===1?'a shield':chosen.length+' shields'}. Draw ${k} cards?`,[{label:`Draw ${k}`,val:true,main:1},{label:'No',val:false}],p.deck.length>k+4)){draw(p,k);log(`${V(p,'You draw','Opponent draws')} ${k} cards.`)}
  }
}
// Choose n of o's shields to break, one at a time on the board ("shield 2 of 3").
async function chooseShields(chooser,o,n,by){
  labelShields();
  const out=[];
  if(n>=o.sh.length)return o.sh.slice();
  for(let i=0;i<n;i++){
    const left=o.sh.filter(s=>!out.includes(s));
    const s=await pickCard(chooser,left,`${by} breaks ${n===1?'a shield':n+' shields'}. Choose ${n===1?'which shield':`shield ${i+1} of ${n}`} to break.`,{hidden:true,aiPick:aiRandom});
    out.push(left.includes(s)?s:left[0]);
  }
  return out;
}
// Broken shields go to hand all at once; then the defender uses any shield triggers among
// them, in the order they choose.
async function breakShields(o,list,{toGy=false,by=null}={}){
  if(!list.length)return;
  labelShields();
  const names=list.map(s=>s.shL).join(list.length===2?' and ':', ');
  G.breaking={p:o,uids:new Set(list.map(s=>s.uid))};render();await sleep(450);G.breaking=null;
  const p=opp(o);if(by)p.brokeShields=(p.brokeShields||0)+list.length;
  if(by&&T(by).bluum){
    for(const s of list){
      o.sh.splice(o.sh.indexOf(s),1);delete s.faceUp;
      log(`Shield ${s.shL} is shown: ${s.n}.`);
      if(s.t==='s'&&s.trig&&s.playable&&spellAllowed(s)){log(`${by.n} casts ${s.n} for no cost.`);await castSpell(p,s);const i=p.gy.lastIndexOf(s);if(i>=0)p.gy.splice(i,1);if(!o.gy.includes(s)&&!p.mana.includes(s))o.gy.push(s)}
      else o.hand.push(s);
    }
    render();return;
  }
  for(const s of list){o.sh.splice(o.sh.indexOf(s),1);delete s.faceUp;(toGy?o.gy:o.hand).push(s)}
  log(`${V(o,'Your',"The opponent's")} shield${list.length===1?'':'s'} ${names} break${list.length===1?'s':''}${toGy?' and go to the graveyard':''}.`);render();
  if(!toGy)await useTriggers(o,list);
  render();
}
// Online, the defender always confirms a break, so waiting for them never reveals whether a
// shield held a trigger.
async function useTriggers(o,broken){
  const confirm=!!(G.mp&&o.remote);
  for(let first=true;!G.over;first=false){
    const left=broken.filter(s=>o.hand.includes(s)),usable=left.filter(s=>canTrigger(o,s));
    if(!usable.length){
      if(confirm&&first)await chooseEffect(o,'Shields broken',`From your shields: ${left.map(s=>s.n).join(', ')}. No shield triggers to use.`,[{label:'OK',val:true,main:1}],true);
      return;
    }
    if(usable.length===1){await shieldTrigger(o,usable[0]);return}
    const i=await chooseEffect(o,'Shield triggers',`From your shields: ${left.map(s=>s.n).join(', ')}. Choose a shield trigger to use next.`,
      [...usable.map((s,i)=>({label:`Use ${s.n}`,val:i,main:i===0})),{label:'Use no more',val:-1}],usable.findIndex(s=>aiUseTrig(o,s)));
    if(!Number.isInteger(i)||!usable[i])return;
    await shieldTrigger(o,usable[i],true);
  }
}
// A broken shield with "shield trigger" may be cast, or summoned if it is a creature,
// for no cost. An evolution still needs a creature of its race to evolve from.
const canTrigger=(o,s)=>s.trig&&o.hand.includes(s)&&(s.t==='s'||!s.evo||bases(o,s).length>0&&vortexOK(o,s))&&triggerAllowed(o,s)&&spellAllowed(s);
// "Players can't use the shield trigger abilities of darkness cards", and creatures that
// stop the opponent's shield triggers.
const triggerAllowed=(o,s)=>rulesInPlay('noTrigCiv').every(([civ])=>!civsOf(s).includes(civ))&&rulesInPlay('noOppTrig').every(([,q])=>q===o);
async function shieldTrigger(o,s,chosen=false){
  if(G.over||!canTrigger(o,s))return;
  const use=chosen||(o.ai?aiUseTrig(o,s):o.remote?!!(await remoteDecide(o,'trig',{s:s.uid})):await askTrig(s));
  if(!use)return;
  if(s.t==='s'){
    o.hand.splice(o.hand.indexOf(s),1);
    log(`Shield trigger! ${V(o,'You cast','Opponent casts')} ${s.n}.`);render();
    await castSpell(o,s);
    if(rulesInPlay('trigToHand').some(([,q])=>q===o)&&o.gy.includes(s)){o.gy.splice(o.gy.indexOf(s),1);o.hand.push(s);log(`${s.n} returns to ${whose(o)} hand.`)}
    await oppTriggered(o);
  }else{
    const base=s.evo?await chooseBase(o,s,false):null;
    if(s.evo&&!base)return;
    o.hand.splice(o.hand.indexOf(s),1);
    log(`Shield trigger! ${V(o,'You summon','Opponent summons')} ${s.n} for no cost.`);
    await enterBattle(o,s,base);
    await oppTriggered(o);
  }
}
// "Whenever your opponent uses the shield trigger ability of one of his shields".
async function oppTriggered(o){
  const p=opp(o);
  for(const x of p.bz)if(T(x).onOppTrig)queueFx(p,T(x).onOppTrig,x);
  if(G.attacking&&p.bz.includes(G.attacking)&&T(G.attacking).onOppTrigMine)queueFx(p,T(G.attacking).onOppTrigMine,G.attacking);
  await flushFx();
}
// "Instead of having this creature attack, you may tap it to use its ability."
const canTapAbility=(c,p)=>!!T(c).tapAb&&p.bz.includes(c)&&!c.tapped&&(!c.sick||!!T(c).speed)&&!rulesInPlay('noTapAb').length;
async function useTapAbility(p,c,i=0){
  if(!canTapAbility(c,p))return;
  const fx=T(c).tapAb[i];
  c.tapped=true;p.attacked=true;log(`${c.n} taps to use its ability.`);render();
  await resolveFx(p,fx,c);
  render();
}
function win(p){G.over=true;G.winner=p;G.targeting=null;G.modal=null;log(V(p,'You win!','You lose.'));render();if(G.mp)mpPush(true)}

/* ---------- turns ---------- */
// Start-of-turn bookkeeping: untap, then draw (the first player skips the first draw).
async function beginTurn(p){
  G.turn=G.p.indexOf(p);
  p.charged=false;p.played=false;p.attacked=false;p.castSpell=false;p.brokeBy=[];p.brokeShields=0;
  delete p.truce;for(const q of G.p)q.drawn=0;
  if(p.mustAtkNext)p.mustAtkNext='now';
  // Silent skill: a tapped creature may stay tapped to use its ability.
  const silent=[];
  for(const c of p.bz.filter(c=>c.tapped&&T(c).silent)){
    const fx=T(c).silent[0];
    const use=await chooseEffect(p,c.n,`Silent skill: keep ${c.n} tapped and use its ability? ${fxDesc(fx)}`,[{label:'Use it',val:true,main:1},{label:'Untap normally',val:false}],fxList(fx).some(f=>fxUseful(p,f)));
    if(use)silent.push([c,fx]);
  }
  // "Until the start of your next turn" effects end now.
  for(const q of G.p)for(const c of q.bz)if(c.tmpNextSeat===p.seat){delete c.tmpNext;delete c.tmpNextSeat}
  if(!rulesInPlay('noManaUntap').some(([,q])=>q===p))p.mana.forEach(m=>m.tapped=false);
  const frozen=rulesInPlay('noCreatureUntap').length>0;
  p.bz.forEach(c=>{if(!frozen&&!silent.some(([s])=>s===c))c.tapped=false;c.sick=false});
  if(frozen&&G.p.some(q=>q.bz.some(x=>T(x).warped)))await SPECIALS.warped(p,{},{n:'Warped Lunatron'});
  for(const [c,fx] of silent){
    if(G.over||!p.bz.includes(c))continue;
    log(`${c.n} uses its silent skill.`);
    await resolveFx(p,fx,c);
  }
  if(G.over)return;
  if(G.turnNo>0){
    if(!p.deck.length){log(`${V(p,'You have','Opponent has')} no cards left to draw.`);win(opp(p));return}
    draw(p,1);
  }
  G.turnNo++;
  log(`${V(p,'Your turn',"Opponent's turn")} ${Math.ceil(G.turnNo/2)} begins.`);
  G.needStart=false;
  for(const c of p.bz.slice())if(T(c).onStart&&p.bz.includes(c)&&!G.over)await resolveFx(p,T(c).onStart,c);
  for(const c of opp(p).bz.slice())if(T(c).onOppStart&&!G.over)await resolveFx(opp(p),T(c).onOppStart,c);
  for(let k=rulesInPlay('startDestroy').length;k>0&&p.bz.length&&!G.over;k--){
    const c=await pickCard(p,p.bz.slice(),'Choose one of your creatures to destroy.',{aiPick:aiCheapest});
    if(c){destroy(p,c);await flushFx()}
  }
}
// End-of-turn abilities of the active player's creatures, then "until the end of the
// turn" effects wear off for everyone.
async function endTurn(p){
  for(const c of p.bz.slice()){
    if(G.over)return;
    if(!p.bz.includes(c))continue;
    // A creature can have several end-of-turn abilities; each one happens while it's still here.
    if(T(c).onEnd)await resolveFx(p,T(c).onEnd,c);
    if(p.bz.includes(c)&&T(c).endUntap&&c.tapped){
      const yes=await chooseEffect(p,c.n,`Untap ${c.n}?`,[{label:'Untap it',val:true,main:1},{label:'Leave it tapped',val:false}],true);
      if(yes){c.tapped=false;log(`${c.n} untaps.`)}
    }
    if(p.bz.includes(c)&&(T(c).endBounce||T(c).endBounceBroke&&(p.brokeBy||[]).includes(c.uid)))bounce(p,c);
    if(p.bz.includes(c)&&T(c).endDieAlone&&p.bz.length===1){log(`${c.n} is alone at the end of the turn.`);destroy(p,c)}
    await flushFx();
  }
  // Lunar Charger: the chosen creatures may untap at the end of the turn.
  for(const c of p.bz)if(T(c).lunarUntap&&c.tapped){c.tapped=false;log(`${c.n} untaps.`)}
  // "At the end of the turn, ..." effects set up during the turn.
  for(const t of (G.later||[]).splice(0)){if(G.over)return;await resolveFx(t.p,t.fx,t.src);await flushFx()}
  // Gigavrand: "at the end of each turn, if your opponent drew 2 or more cards that turn, he discards his hand".
  for(const q of G.p)if(q.bz.some(x=>T(x).gigavrand)&&(opp(q).drawn||0)>=2&&opp(q).hand.length){const o=opp(q);log(`${V(o,'You drew','The opponent drew')} ${o.drawn} cards this turn and discards the hand.`);o.hand.slice().forEach(c=>discardCard(o,c));await flushFx()}
  if(p.loseAtEndOf===G.turnNo&&!G.over){log(`${V(p,'Your','The opponent\'s')} extra turn ends.`);win(opp(p));return}
  for(const q of G.p){q.bz.forEach(c=>{c.boost=0;delete c.tmp});delete q.turnFx}
  if(p.mustAtkNext==='now')delete p.mustAtkNext;
  p.brokeBy=[];
  render();
}
// Who plays next: the same player again when they have an extra turn.
function nextPlayer(p){
  if(p.extraTurns>0){p.extraTurns--;log(`${V(p,'You take','The opponent takes')} an extra turn.`);return G.p.indexOf(p)}
  return G.p.indexOf(opp(p));
}
async function startTurn(i){
  if(G.over)return;
  if(G.p[i].remote){G.turn=i;G.needStart=true;G.sel=null;render();await mpPush(true);return}
  const p=G.p[i];
  await beginTurn(p);
  if(G.over)return;
  render();
  if(G.mp)mpPush(true);
  if(p.ai){
    G.busy=true;render();
    await aiTurn(p);
    if(!G.over)await endTurn(p);
    G.busy=false;
    if(!G.over)startTurn(nextPlayer(p));
  }
}
