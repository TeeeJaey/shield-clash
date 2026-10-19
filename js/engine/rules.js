/* ---------- core rules ---------- */
// The rules run the same way for the local player, the AI and an online opponent.
// Decisions go through chooseEffect/pickCard, which ask the right party; legality
// (who may attack, be attacked or block) lives in one place below and is shared by
// the UI, the AI and the engine itself.
function draw(p,n){for(let i=0;i<n;i++){if(!p.deck.length){win(opp(p));return}p.hand.push(p.deck.pop())}}
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
const vortexOK=(p,c)=>!c.vortex||c.vortex.every(r=>p.bz.some(x=>racesOf(x).includes(r)))&&p.bz.filter(x=>c.vortex.some(r=>racesOf(x).includes(r))).length>=2;
const monoMana=(p,civ)=>p.mana.length>0&&p.mana.every(m=>civsOf(m).includes(civ));
const spellAllowed=c=>c.t!=='s'||rulesInPlay('onlySpells').every(([civ])=>civsOf(c).includes(civ));
const canPlay=(p,c)=>c.playable&&canPay(p,c)&&(!c.evo||bases(p,c).length>0)&&vortexOK(p,c)&&spellAllowed(c)&&(!c.needSpell||!!p.castSpell)&&(!c.needMono||monoMana(p,c.needMono))&&(!c.needBehind||opp(p).sh.length>p.sh.length);
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
const canAttackPlayer=(c,p)=>canAttack(c,p)&&!T(c).noP||freeAttack(c,p);
function canAttackCreature(c,p,t){
  const tc=T(c),tt=T(t);
  return canAttack(c,p)&&!tc.noAtkC&&opp(p).bz.includes(t)&&(t.tapped||!!tc.hunts||!!tt.attackable||(tc.huntCivs||[]).some(e=>civsOf(t).includes(e)))
    &&!tt.noBeAtk&&!civsOf(c).some(e=>(tt.noBeAtkBy||[]).includes(e))&&!(tt.noBeAtkDragon&&dragonRace(c));
}
const attackTargets=(c,p)=>opp(p).bz.filter(t=>canAttackCreature(c,p,t));
const canAttackAnything=(c,p)=>canAttackPlayer(c,p)||attackTargets(c,p).length>0;
// Creatures that must attack before their controller may end the turn.
const mustAttackers=p=>p.bz.filter(c=>(T(c).mustAtk||mustAttackAll()||p.mustAtkNext==='now'||rulesInPlay('oppMustAtk').some(([,q])=>q!==p))&&canAttackAnything(c,p));
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
function reset(c){c.tapped=false;c.sick=true;c.boost=0;delete c.tmp;delete c.tmpNext}
// "When this creature leaves the battle zone" triggers on every way out.
function leaveBz(p,c){
  const i=p.bz.indexOf(c);if(i<0)return null;
  const tc=T(c);
  p.bz.splice(i,1);const pile=[c,...c.under];c.under=[];pile.forEach(reset);
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
function queueFx(p,fx,src){if(fxList(fx).length)(G.queue||(G.queue=[])).push({p,fx,src})}
async function flushFx(){
  while(G.queue&&G.queue.length&&!G.over){const t=G.queue.shift();await resolveFx(t.p,t.fx,t.src)}
}
const toMana=(p,cards)=>cards.forEach(c=>{c.tapped=!!c.e2;p.mana.push(c)});
function destroy(p,c){
  if(!p.bz.includes(c))return;
  const tc=T(c),to=p.turnFx&&p.turnFx.destroyToMana?'mana':tc.destroyTo;
  if(tc.noDestroy){log(`${c.n} stays in the battle zone.`);return}
  const pile=leaveBz(p,c);
  if(to==='mana'){toMana(p,pile);log(`${c.n} would be destroyed, but goes to ${whose(p)} mana zone instead.`)}
  else if(to==='hand'){p.hand.push(...pile);log(`${c.n} would be destroyed, but returns to ${whose(p)} hand instead.`)}
  else if(to==='deck'){p.deck.push(...pile);shuffle(p.deck);log(`${c.n} would be destroyed, but is shuffled into ${whose(p)} deck instead.`)}
  else if(to==='shield'){p.sh.push(c);p.gy.push(...pile.slice(1));log(`${c.n} would be destroyed, but becomes a new shield instead.`)}
  else{
    p.gy.push(...pile);log(`${c.n} is destroyed.`);queueFx(p,tc.onDie,c);
    for(const q of G.p)for(const x of q.bz)if(T(x).onAnyDie)queueFx(q,T(x).onAnyDie,x);
    for(const x of p.bz)for(const w of T(x).onOwnDie||[])if((!w.races||w.races.some(r=>hasRace(c,r)))&&(!w.oppTurn||G.p[G.turn]!==p))queueFx(p,w.fx,x);
  }
}
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
  if(all){for(const owner of [p,opp(p)])owner.bz.filter(c=>power(c)<=+all[1]).forEach(c=>destroy(owner,c));return}
  if(f==='draw1')f='draw';
  const o=opp(p),sw=/^sweep(\d+)$/.exec(f);
  if(sw){const hit=o.bz.filter(c=>power(c)<=+sw[1]);if(!hit.length)log(`${src.n} hits nothing.`);hit.forEach(c=>destroy(o,c));return}
  if(f==='draw'||f==='draw2'||f==='draw3'){const n=f==='draw'?1:+f.slice(4);draw(p,n);log(`${V(p,'You draw','Opponent draws')} ${n===1?'a card':n+' cards'}.`)}
  else if(f==='ramp'||f==='ramp2'){const n=f==='ramp'?1:2;for(let i=0;i<n&&p.deck.length;i++){const c=p.deck.pop();c.tapped=!!c.e2;p.mana.push(c);log(`${c.n} goes to ${whose(p)} mana zone.`)}}
  else if(f==='discardAll'){const o=opp(p);o.hand.slice().forEach(c=>discardCard(o,c));log(`${V(o,'You discard','Opponent discards')} the entire hand.`)}
  else if(f==='tapall'){o.bz.forEach(c=>tapBy(p,c));log(`All of ${whose(o)} creatures are tapped.`)}
  else if(f==='discard'||f==='discard2'||f==='discardSelfRandom'){const who=f==='discardSelfRandom'?p:o,n=f==='discard2'?2:1;for(let i=0;i<n&&who.hand.length;i++){const c=aiRandom(who.hand);discardCard(who,c);log(`${V(who,'You discard','Opponent discards')} ${c.n}.`)}}
  else if(f==='shieldadd'||f==='shield2'){const n=f==='shieldadd'?1:2;let k=0;for(;k<n&&p.deck.length;k++)p.sh.push(p.deck.pop());if(k)log(`${V(p,'You add','Opponent adds')} ${k===1?'a shield':k+' shields'}.`)}
  else if(f==='recover'){const c=p.gy.filter(x=>x.t==='c').sort((a,b)=>b.cost-a.cost)[0];if(c){p.gy.splice(p.gy.indexOf(c),1);p.hand.push(c);log(`${c.n} returns from ${whose(p)} graveyard to hand.`)}else log('No creature in the graveyard to return.')}
  else if(f==='manaburn'){if(o.mana.length){const c=o.mana.splice(Math.floor(Math.random()*o.mana.length),1)[0];c.tapped=false;o.gy.push(c);log(`${c.n} is knocked out of ${whose(o)} mana zone.`)}}
  else if(f==='tapSelf'){if(src&&!src.tapped&&ownerOf(src)){src.tapped=true;log(`${src.n} is tapped.`)}}
  else if(f==='destroySelf'){const owner=src&&ownerOf(src);if(owner)destroy(owner,src)}
  else if(f==='bounceSelf'){const owner=src&&ownerOf(src);if(owner)bounce(owner,src)}
  else if(f==='sweepBlockers'){for(const owner of [p,o])owner.bz.filter(c=>T(c).block).forEach(c=>destroy(owner,c))}
  else if(f==='tapBlockers'){o.bz.filter(c=>T(c).block).forEach(c=>tapBy(p,c));log(`All of ${whose(o)} blockers are tapped.`)}
  else if(f==='bounceBlockers'){for(const owner of [p,o])owner.bz.filter(c=>T(c).block).forEach(c=>bounce(owner,c))}
  else if(/^bounceAll\d+$/.test(f)){const n=+f.slice(9);for(const owner of [p,o])owner.bz.filter(c=>power(c)<=n).forEach(c=>bounce(owner,c))}
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
// Choose one card from any zone. Battle-zone cards are picked on the board; cards in
// other zones (mana, shields) are offered as a list. Face-down shields are numbered,
// never named. Returns the card, or null when an optional choice is skipped.
async function pickCard(p,cards,msg,{optional=false,hidden=false,aiPick}={}){
  cards=cards.filter(c=>choosable(p,c));
  if(!cards.length)return null;
  if(p.ai)return aiPick?aiPick(cards):cards[0];
  if(cards.every(c=>G.p.some(q=>q.bz.includes(c)))){
    if(p.remote)return cardBy(await remoteDecide(p,'target',{uids:cards.map(c=>c.uid),msg,required:!optional}));
    return pickTarget(cards,msg,optional?'Skip':null);
  }
  const opts=cards.map((c,i)=>({label:hidden?`Shield ${i+1}`:c.n,val:i}));
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
    move(p,c){p.mana.splice(p.mana.indexOf(c),1);c.tapped=false;p.gy.push(c);log(`${c.n} goes from ${whose(p)} mana zone to the graveyard.`)}},
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
        spec.move(side,c);render();
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
        else if(oc[1]==='oppManaChooseGy'){o.mana.splice(o.mana.indexOf(c),1);c.tapped=false;o.gy.push(c);log(`${c.n} goes from ${whose(o)} mana zone to the graveyard.`)}
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
        o.mana.splice(o.mana.indexOf(c),1);c.tapped=false;o.gy.push(c);log(`${c.n} goes from ${whose(o)} mana zone to the graveyard.`);render();
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
      const b=p.bz.filter(x=>racesOf(x).includes(r)&&!out.includes(x));
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
  p.castSpell=true;
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
  pay(p,c);p.hand.splice(p.hand.indexOf(c),1);
  // "Whenever your opponent summons a creature or casts a spell".
  for(const x of opp(p).bz)if(T(x).onOppPlay)queueFx(opp(p),T(x).onOppPlay,x);
  if(c.t==='s'){
    log(`${V(p,'You cast','Opponent casts')} ${c.n}.`);render();
    await castSpell(p,c);
  }else await enterBattle(p,c,base);
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
  if(dDies)destroy(dp,d);if(aDies)destroy(ap,a);
  // After-battle abilities of creatures still in the battle zone.
  for(const [p,c,won] of [[ap,a,aWins],[dp,d,dWins]]){
    if(!p.bz.includes(c))continue;
    if(T(c).battleDie||(won&&T(c).winDie)||(c===d&&blocked&&T(c).blockDie)){log(`${c.n} is destroyed after the battle.`);destroy(p,c)}
    else if(c===d&&blocked&&T(c).blockUntap){c.tapped=false;log(`${c.n} untaps after blocking.`)}
  }
  await flushFx();
  render();
}
async function chooseBlocker(o,att,blockers,target){
  // A creature that "blocks if able" leaves the defender no choice but which one.
  const forced=blockers.filter(b=>T(b).mustBlock),options=forced.length?forced:blockers,required=forced.length>0;
  let b;
  if(o.ai)b=aiBlock(o,att,options,target,required);
  else if(o.remote)b=cardBy(await remoteDecide(o,'block',{att:att.uid,blockers:options.map(x=>x.uid),target:target==='player'?'player':target.uid,required}));
  else b=await askBlock(att,options,target,required);
  if(!options.includes(b))b=required?options[0]:null;
  return b;
}
async function attack(p,att,target){
  G.attacking=att;
  try{await attackSteps(p,att,target)}finally{G.attacking=null}
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
  if(target!=='player')for(const w of T(att).onAtkC||[])if(power(target)>=w.min)queueFx(p,w.fx,att);
  if(G.queue&&G.queue.length){
    await flushFx();
    if(G.over||!p.bz.includes(att))return;
    if(target!=='player'&&!o.bz.includes(target)){log(`${att.n}'s target is gone.`);return}
  }
  const blockers=o.bz.filter(b=>canBlock(b,att,target,o));
  if(blockers.length){
    const b=await chooseBlocker(o,att,blockers,target);
    if(b){
      b.tapped=true;log(`${b.n} blocks.`);
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
  const broken=[];
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
  G.breaking={p:o,n};render();await sleep(450);G.breaking=null;
  const defenderChooses=o.bz.some(x=>T(x).chooseBroken);
  for(let i=0;i<n;i++){
    const s=defenderChooses?await pickCard(o,o.sh.slice(),'Choose a shield to break.',{hidden:true,aiPick:aiRandom}):o.sh[o.sh.length-1];
    o.sh.splice(o.sh.indexOf(s),1);
    if(T(att).breakToGy)o.gy.push(s);else{o.hand.push(s);broken.push(s)}
  }
  if(n)log(`${['','A shield breaks','Two shields break','Three shields break'][Math.min(n,3)]||n+' shields break'}${T(att).breakToGy?' and goes to the graveyard':''}.`);render();
  for(const s of broken)await shieldTrigger(o,s);
  render();
}
// A broken shield with "shield trigger" may be cast, or summoned if it is a creature,
// for no cost. An evolution still needs a creature of its race to evolve from.
const canTrigger=(o,s)=>s.trig&&o.hand.includes(s)&&(s.t==='s'||!s.evo||bases(o,s).length>0&&vortexOK(o,s))&&triggerAllowed(o,s)&&spellAllowed(s);
// "Players can't use the shield trigger abilities of darkness cards", and creatures that
// stop the opponent's shield triggers.
const triggerAllowed=(o,s)=>rulesInPlay('noTrigCiv').every(([civ])=>!civsOf(s).includes(civ))&&rulesInPlay('noOppTrig').every(([,q])=>q===o);
async function shieldTrigger(o,s){
  if(G.over||!canTrigger(o,s))return;
  const use=o.ai?aiUseTrig(o,s):o.remote?!!(await remoteDecide(o,'trig',{s:s.uid})):await askTrig(s);
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
const canTapAbility=(c,p)=>!!T(c).tapAb&&p.bz.includes(c)&&!c.tapped&&(!c.sick||!!T(c).speed);
async function useTapAbility(p,c,i=0){
  if(!canTapAbility(c,p))return;
  const fx=T(c).tapAb[i];
  c.tapped=true;log(`${c.n} taps to use its ability.`);render();
  await resolveFx(p,fx,c);
  render();
}
function win(p){G.over=true;G.winner=p;G.targeting=null;G.modal=null;log(V(p,'You win!','You lose.'));render();if(G.mp)mpPush(true)}

/* ---------- turns ---------- */
// Start-of-turn bookkeeping: untap, then draw (the first player skips the first draw).
async function beginTurn(p){
  G.turn=G.p.indexOf(p);
  p.charged=false;p.castSpell=false;p.brokeBy=[];
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
    if(T(c).endDieAlone&&p.bz.length===1){log(`${c.n} is alone at the end of the turn.`);destroy(p,c)}
    else if(T(c).endBounce||T(c).endBounceBroke&&(p.brokeBy||[]).includes(c.uid)){bounce(p,c)}
    else if(T(c).onEnd)await resolveFx(p,T(c).onEnd,c);
    else if(T(c).endUntap&&c.tapped){
      const yes=await chooseEffect(p,c.n,`Untap ${c.n}?`,[{label:'Untap it',val:true,main:1},{label:'Leave it tapped',val:false}],true);
      if(yes){c.tapped=false;log(`${c.n} untaps.`)}
    }
    await flushFx();
  }
  // "At the end of the turn, ..." effects set up during the turn.
  for(const t of (G.later||[]).splice(0)){if(G.over)return;await resolveFx(t.p,t.fx,t.src);await flushFx()}
  for(const q of G.p){q.bz.forEach(c=>{c.boost=0;delete c.tmp});delete q.turnFx}
  if(p.mustAtkNext==='now')delete p.mustAtkNext;
  p.brokeBy=[];
  render();
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
    if(!G.over)startTurn(0);
  }
}
