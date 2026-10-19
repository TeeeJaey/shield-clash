/* ---------- effects described by printed wording ---------- */
// The adapter stores these as JSON: {k:kind, x:printed sentence, ...}. "pick" chooses
// creatures and "all" affects every matching creature; q says which creatures qualify:
// side (own/opp/any, from the controller's point of view), other, civs, notCivs, state,
// power bounds, blocker, evolution, Dragon and races.
const isJsonFx=f=>f.charAt(0)==='{';
const jfx=f=>JSON.parse(f);
function matchQ(q,c,p,src){
  const owner=ownerOf(c);
  if(!owner)return false;
  if(q.side==='own'&&owner!==p||q.side==='opp'&&owner===p)return false;
  if(q.other&&c===src)return false;
  if(q.civs&&!civsOf(c).some(e=>q.civs.includes(e)))return false;
  if(q.notCivs&&civsOf(c).some(e=>q.notCivs.includes(e)))return false;
  if(q.state&&(q.state==='tapped')!==!!c.tapped)return false;
  if(q.maxP!=null&&power(c)>q.maxP||q.minP!=null&&power(c)<q.minP||q.eqP!=null&&power(c)!==q.eqP)return false;
  if(q.block===1&&!T(c).block||q.block===-1&&T(c).block)return false;
  if(q.evo===-1&&c.evo||q.evo===1&&!c.evo)return false;
  if(q.dragon&&!dragonRace(c))return false;
  if(q.races&&!q.races.some(r=>hasRace(c,r)))return false;
  if(q.maxCost!=null&&c.cost>q.maxCost)return false;
  return true;
}
const matching=(q,p,src)=>G.p.flatMap(o=>o.bz).filter(c=>matchQ(q,c,p,src));
// Things done to a chosen creature. Harmful ones are aimed at the opponent by the AI.
const HARMFUL=new Set(['destroy','bounce','tap','mana','deckTop','shield']);
function doAct(a,c,e,p){
  const owner=ownerOf(c);if(!owner)return;
  if(a==='destroy')destroy(owner,c);
  else if(a==='bounce')bounce(owner,c);
  else if(a==='tap')tapBy(p||owner,c,true);
  else if(a==='untap'){c.tapped=false;log(`${c.n} untaps.`)}
  else if(a==='mana'){toMana(owner,leaveBz(owner,c));log(`${c.n} goes to ${whose(owner)} mana zone.`)}
  else if(a==='evoTopMana'||a==='evoTopGy'){
    // The top card of an evolution creature leaves; the card below stays as the creature.
    if(!c.under.length)return;
    const [next,...rest]=c.under,i=owner.bz.indexOf(c);
    next.under=rest;next.tapped=c.tapped;next.sick=c.sick;c.under=[];
    owner.bz.splice(i,1,next);reset(c);
    if(a==='evoTopMana')toMana(owner,[c]);else owner.gy.push(c);
    log(`${c.n} is separated; ${next.n} stays in the battle zone.`);
  }
  else if(a==='deckTop'){owner.deck.push(...leaveBz(owner,c).reverse());log(`${c.n} goes on top of ${whose(owner)} deck.`)}
  else if(a==='shield'){owner.sh.push(...leaveBz(owner,c));log(`${c.n} becomes one of ${whose(owner)} shields.`)}
  else if(a==='grant'){
    const g=e.g;
    // Until the end of the turn, or until the start of the caster's next turn.
    if(e.dur==='next'){c.tmpNext=mergeTraits(c.tmpNext||{},g.traits||{});c.tmpNextSeat=p.seat;log(`${c.n} gets ${grantText(g)} until the start of ${whose(p)} next turn.`);return}
    c.boost=(c.boost||0)+(g.power||0)*(e.gPer?countFor(e.gPer,null,p):1);
    if(Object.keys(g.traits||{}).length)c.tmp=mergeTraits(c.tmp||{},g.traits);
    log(`${c.n} gets ${grantText(g)} until the end of the turn.`);
  }
}
// The AI's choice: harmful effects hit the strongest enemy, helpful ones go to the
// strongest of its own creatures (ready attackers first).
function aiPickFor(e,p){
  const o=opp(p);
  return cards=>{
    if(HARMFUL.has(e.a)){
      const foes=cards.filter(c=>o.bz.includes(c));
      return (foes.length?foes:cards).slice().sort((a,b)=>power(b)-power(a))[0];
    }
    const mine=cards.filter(c=>p.bz.includes(c));
    return (mine.length?mine:cards).slice().sort((a,b)=>(canAttack(b,p)-canAttack(a,p))||(power(b)-power(a)))[0];
  };
}
const aiSkipsPick=(e,p,c)=>HARMFUL.has(e.a)?p.bz.includes(c):opp(p).bz.includes(c);
async function pickFx(p,e,src,optional){
  const max=e.any?99:(e.per?countFor(e.per,src,p):e.n)+(e.plus?countFor(e.plus,src,p):0),chosen=[];
  for(let k=0;k<max;k++){
    const cands=matching(e.q,p,src).filter(c=>!chosen.includes(c));
    if(!cands.length)break;
    const mayStop=optional||e.any||e.upto||!!e.per||k>=(e.n||1);
    const c=await pickCard(p,cands,`${src.n}: ${e.x}`,{optional:mayStop,aiPick:aiPickFor(e,p)});
    if(!c||p.ai&&mayStop&&aiSkipsPick(e,p,c))break;
    chosen.push(c);
  }
  if(!chosen.length){log(`${src.n}: nothing chosen.`);return}
  for(const c of chosen){
    if(e.a==='destroy'){anim(c,'die');render();await sleep(300)}
    const dragon=dragonRace(c);
    doAct(e.a,c,e,p);
    if(e.ifDragon&&dragon){await flushFx();await resolveFx(p,e.ifDragon,src)}
  }
}
async function allFx(p,e,src){
  const hit=matching(e.q,p,src);
  if(!hit.length){log(`${src.n} affects no creatures.`);return}
  if(e.a==='destroy'){hit.forEach(c=>anim(c,'die'));render();await sleep(450)}
  for(const c of hit)doAct(e.a,c,e,p);
}
// Searching a deck shows the player their own deck; the deck is shuffled afterwards.
function deckMatch(f,c){
  if(f.name)return c.n===f.name;
  if(f.t&&c.t!==f.t)return false;
  if(f.civ&&!civsOf(c).includes(f.civ)||f.notCiv&&civsOf(c).includes(f.notCiv))return false;
  if(f.multi&&!c.e2||f.dragon&&!dragonRace(c))return false;
  if(f.races&&!f.races.some(r=>hasRace(c,r)))return false;
  if(f.civs&&!civsOf(c).some(e=>f.civs.includes(e)))return false;
  if(f.maxP!=null&&(c.t!=='c'||c.p>f.maxP)||f.noEvo&&c.evo)return false;
  return true;
}
// Races to offer for "choose a race": every race in play and in the chooser's hand and graveyard.
function raceOptions(p){
  const seen=new Map();
  for(const c of [...G.p.flatMap(q=>q.bz),...p.hand,...p.gy])for(const r of racesOf(c))seen.set(r,(seen.get(r)||0)+(p.bz.includes(c)||p.hand.includes(c)||p.gy.includes(c)?1:0));
  return [...seen].sort((a,b)=>b[1]-a[1]).map(([r])=>r);
}
// Something visible changed (used for "If you do").
const snapshot=()=>JSON.stringify(G.p.map(q=>['bz','hand','mana','sh','gy','deck'].map(z=>q[z].length+':'+q[z].filter(c=>c.tapped).length)));
async function searchFx(p,e,src){
  // Several cards, or cards from the opponent's deck put into their graveyard.
  if(e.any||e.side==='opp'){
    const q=e.side==='opp'?opp(p):p,taken=[];
    for(let k=0;k<(e.n||99);k++){
      const c=await pickCard(p,q.deck.filter(c=>!taken.includes(c)),`${src.n}: ${e.x}`,{optional:true,aiPick:aiDearest});
      if(!c||p.ai&&e.any&&taken.length>=2)break;
      taken.push(c);
    }
    for(const c of taken){q.deck.splice(q.deck.indexOf(c),1);(e.to==='gy'?q.gy:q.hand).push(c)}
    log(`${taken.length} card${taken.length===1?'':'s'} taken from ${whose(q)} deck.`);
    shuffle(q.deck);return;
  }
  const cands=p.deck.filter(c=>deckMatch(e.f,c));
  const c=await pickCard(p,cands,`${src.n}: ${e.x}`,{optional:true,aiPick:aiDearest});
  if(c){
    p.deck.splice(p.deck.indexOf(c),1);
    if(e.to==='hand'){p.hand.push(c);log(`${V(p,'You take','Opponent takes')} ${c.n} from the deck.`)}
    else if(e.to==='mana'){toMana(p,[c]);log(`${c.n} goes from ${whose(p)} deck to the mana zone.`)}
    else if(e.to==='bz'&&c.t==='c'&&!c.evo){shuffle(p.deck);await enterBattle(p,c,null);return}
  }else log(`${V(p,'You find','Opponent finds')} nothing to take.`);
  shuffle(p.deck);
}
// The top of the deck is the end of the array (draws pop).
async function lookFx(p,e,src){
  const top=p.deck.splice(-Math.min(e.n,p.deck.length)).reverse();
  if(!top.length)return;
  const ok=c=>(!e.f.civs||civsOf(c).some(x=>e.f.civs.includes(x)))&&(!e.f.block||c.block);
  let take=[];
  if(e.take==='all')take=top.filter(ok);
  else{const c=await pickCard(p,top.filter(ok),`${src.n}: ${e.x}`,{aiPick:aiDearest});if(c)take=[c]}
  const rest=top.filter(c=>!take.includes(c));
  p.hand.push(...take);
  if(e.rest==='gy')p.gy.push(...rest);else p.deck.unshift(...rest);
  log(`${V(p,'You reveal','Opponent reveals')} ${top.map(c=>c.n).join(', ')}. ${take.length?take.map(c=>c.n).join(', ')+' goes':'Nothing goes'} to ${whose(p)} hand.`);
}
// Information only: shows the cards to the player who looks.
async function seeFx(p,e,src){
  const o=opp(p),z=e.z;
  let cards=[];
  if(z==='top')cards=p.deck.slice(-e.n).reverse();
  if(z==='your shields')cards=p.sh;
  if(/opponent's hand/.test(z))cards=cards.concat(o.hand);
  if(/opponent's (?:hand and )?shields/.test(z))cards=cards.concat(o.sh.slice(0,e.n||o.sh.length));
  if(/top card of (?:his|your opponent's) deck/.test(z))cards=cards.concat(o.deck.slice(-1));
  log(`${V(p,'You look','Opponent looks')} at ${z.replace(/^your /,V(p,'your ','their ')).replace(/opponent's/,V(p,"the opponent's",'your'))}.`);
  if(p.ai||!cards.length)return;
  await chooseEffect(p,src.n,`${cards.map(c=>c.n).join(', ')}.`,[{label:'OK',val:true,main:1}],true);
}
function ifHolds(c,p){
  const o=opp(p);
  if(c.more)return o[c.more].length>p[c.more].length;
  if(c.count){
    const q=c.count.side==='own'?p:o,cards=q[c.count.zone].filter(x=>!c.count.races||c.count.races.some(r=>hasRace(x,r)));
    return (c.count.min==null||cards.length>=c.count.min)&&(c.count.max==null||cards.length<=c.count.max);
  }
  return false;
}
async function shieldsFx(p,e,src){
  const taken=[];
  if(e.all)taken.push(...p.sh);
  else for(let k=0;k<(e.n||99)&&taken.length<p.sh.length;k++){
    const left=p.sh.filter(s=>!taken.includes(s));
    const s=await pickCard(p,left,`${src.n}: ${e.x}`,{hidden:true,optional:!e.n,aiPick:aiRandom});
    if(!s||p.ai&&!e.n)break;
    taken.push(s);
  }
  for(const s of taken){
    p.sh.splice(p.sh.indexOf(s),1);
    if(e.to==='mana')toMana(p,[s]);else p.hand.push(s);
  }
  if(taken.length)log(`${V(p,'You put','Opponent puts')} ${taken.length===1?'a shield':taken.length+' shields'} into ${V(p,'your','their')} ${e.to==='mana'?'mana zone':'hand'}.`);
  if(e.to==='hand'&&e.trig)for(const s of taken)await shieldTrigger(p,s);
}
async function jsonFx(p,e,src,optional){
  const o=opp(p);
  if(e.k==='pick')return pickFx(p,e,src,optional);
  if(e.k==='all')return allFx(p,e,src);
  if(e.k==='search')return searchFx(p,e,src);
  if(e.k==='look')return lookFx(p,e,src);
  if(e.k==='see')return seeFx(p,e,src);
  if(e.k==='shields')return shieldsFx(p,e,src);
  if(e.k==='if'){if(ifHolds(e.c,p))await resolveFx(p,e.fx,src);else log(`${src.n}: the condition isn't met.`);return}
  if(e.k==='each'){for(const q of [p,o])await resolveFx(q,e.fx,src);return}
  if(e.k==='drawPer'){const n=countFor(e.per,src,p);draw(p,n);log(`${V(p,'You draw','Opponent draws')} ${n} card${n===1?'':'s'}.`);return}
  if(e.k==='oppDraw'){draw(o,1);log(`${V(o,'You draw','Opponent draws')} a card.`);return}
  if(e.k==='shieldUp'){
    const max=Math.min(e.n,p.deck.length),opts=Array.from({length:max+1},(_,n)=>({label:`Add ${n}`,val:n}));
    const n=await chooseEffect(p,src.n,e.x,opts,max);
    for(let i=0;i<(Number.isInteger(n)?Math.min(n,max):0);i++)p.sh.push(p.deck.pop());
    log(`${V(p,'You add','Opponent adds')} shields from the deck.`);return;
  }
  if(e.k==='manaAll'){
    const back=p.mana.filter(m=>!e.tapped||m.tapped);
    p.mana=p.mana.filter(m=>!back.includes(m));back.forEach(m=>m.tapped=false);p.hand.push(...back);
    log(`${back.length} card${back.length===1?'':'s'} return from ${whose(p)} mana zone to hand.`);return;
  }
  if(e.k==='untapMana'){p.mana.forEach(m=>m.tapped=false);log(`${V(p,'Your','The opponent\'s')} mana untaps.`);return}
  if(e.k==='selfDiscard'){
    for(let k=0;k<e.n&&p.hand.length;k++){
      const c=await pickCard(p,p.hand.slice(),`${src.n}: Discard a card from your hand.`,{aiPick:aiCheapest});
      discardCard(p,c);log(`${V(p,'You discard','Opponent discards')} ${c.n}.`);
    }
    return;
  }
  if(e.k==='discardN'){simpleFx(p,'discard',src);for(let i=1;i<e.n;i++)simpleFx(p,'discard',src);return}
  if(e.k==='grantSelf'){if(src&&ownerOf(src))doAct('grant',src,e,p);return}
  if(e.k==='or'){
    const i=await chooseEffect(p,src.n,'Choose one.',e.labels.map((l,i)=>({label:l,val:i,main:i===0})),e.opts.findIndex(fx=>fxList(fx).some(f=>fxUseful(p,f)))>0?1:0);
    return resolveFx(p,e.opts[i===1?1:0],src);
  }
  if(e.k==='ifDo'){
    const before=snapshot();
    await resolveFx(p,e.first,src);
    if(snapshot()!==before)await resolveFx(p,e.then,src);
    return;
  }
  if(e.k==='race'){
    const opts=raceOptions(p);
    if(!opts.length){log(`${src.n}: no race to choose.`);return}
    const r=await chooseEffect(p,src.n,'Choose a race.',opts.slice(0,12).map((r,i)=>({label:r,val:r,main:i===0})),opts[0]);
    const race=opts.includes(r)?r:opts[0];
    log(`${V(p,'You choose','Opponent chooses')} ${race}.`);
    return resolveFx(p,e.fx.map(f=>f.replace(/\$race/g,race)),src);
  }
  if(e.k==='untapSelf'){if(src&&ownerOf(src)&&src.tapped){src.tapped=false;log(`${src.n} untaps.`)}return}
  if(e.k==='bounceBlocker'){const b=G.blocker,q=b&&ownerOf(b);if(q)bounce(q,b);return}
  if(e.k==='gather'){
    const cands=()=>e.from.flatMap(z=>p[z].filter(c=>c!==src&&deckMatch(e.f,c)&&!(e.other&&c===src)&&!(e.to==='bz'&&(c.t!=='c'||c.evo))));
    const taken=[];
    if(e.all)taken.push(...cands());
    else for(let k=0;k<(e.any?99:e.n);k++){
      const c=await pickCard(p,cands().filter(c=>!taken.includes(c)),`${src.n}: ${e.x}`,{optional:optional||!!e.upto||!!e.any||k>0,aiPick:e.to==='mana'?aiCheapest:aiDearest});
      if(!c||p.ai&&e.any&&e.to==='mana'&&taken.length>=1)break;
      taken.push(c);
    }
    for(const c of taken){
      const z=e.from.find(z=>p[z].includes(c));p[z].splice(p[z].indexOf(c),1);c.tapped=false;
      if(e.to==='hand'){p.hand.push(c);log(`${z==='hand'?'A card':c.n} goes to ${whose(p)} hand.`)}
      else if(e.to==='mana'){toMana(p,[c]);log(`${c.n} goes to ${whose(p)} mana zone.`)}
      else await enterBattle(p,c,null);
    }
    if(!taken.length)log(`${src.n}: nothing to take.`);
    return;
  }
  if(e.k==='oppChoosesGy'){
    const cands=[...o.bz,...(e.z==='mana'?o.mana:o.sh)];
    const c=await pickCard(o,cands,`${src.n}: ${e.x}`,{hidden:e.z==='sh'&&!o.bz.length,aiPick:cs=>aiCheapest(cs.filter(x=>!o.bz.includes(x)).length?cs.filter(x=>!o.bz.includes(x)):cs)});
    if(!c)return;
    if(o.bz.includes(c)){anim(c,'die');destroy(o,c);return}
    const z=o.mana.includes(c)?'mana':'sh';o[z].splice(o[z].indexOf(c),1);c.tapped=false;o.gy.push(c);
    log(`${z==='sh'?'A shield':c.n} goes to ${whose(o)} graveyard.`);return;
  }
  if(e.k==='peekAny'){
    const all=[...o.sh,...p.sh];if(!all.length||p.ai)return;
    const s=await pickCard(p,all,`${src.n}: Choose a shield to look at.`,{hidden:true});
    if(s)await chooseEffect(p,src.n,`That shield is ${s.n}. It goes back where it was.`,[{label:'OK',val:true,main:1}],true);
    log(`${V(p,'You look','Opponent looks')} at a shield.`);return;
  }
  if(e.k==='lowest'){
    const all=G.p.flatMap(q=>q.bz);if(!all.length)return;
    const min=Math.min(...all.map(power)),tied=all.filter(c=>power(c)===min);
    const c=tied.length===1?tied[0]:await pickCard(p,tied,`${src.n}: Destroy one of the creatures with the lowest power.`,{aiPick:aiPickFor({a:'destroy'},p)});
    if(c){anim(c,'die');destroy(ownerOf(c),c)}
    return;
  }
  if(e.k==='powerPick'){
    const values=[...new Set(G.p.flatMap(q=>q.bz).map(power).filter(v=>v<=6000))].sort((a,b)=>b-a);
    if(!values.length){log(`${src.n}: no creature has 6000 power or less.`);return}
    const score=v=>o.bz.filter(c=>power(c)===v).length-p.bz.filter(c=>power(c)===v).length;
    const n=await chooseEffect(p,src.n,'Choose a number.',values.map(v=>({label:String(v),val:v})),values.slice().sort((a,b)=>score(b)-score(a))[0]);
    const v=values.includes(n)?n:values[0];log(`${V(p,'You choose','Opponent chooses')} ${v}.`);
    for(const q of G.p)q.bz.filter(c=>power(c)===v).forEach(c=>destroy(q,c));
    return;
  }
  if(e.k==='tapRest'){
    const keep=[];
    for(const q of [p,o])if(q.bz.length){const c=await pickCard(q,q.bz.slice(),`${src.n}: Choose a creature to keep untapped.`,{aiPick:cs=>cs.slice().sort((a,b)=>power(b)-power(a))[0]});if(c)keep.push(c)}
    for(const q of G.p)q.bz.forEach(c=>{if(!keep.includes(c))tapBy(p,c)});
    log('All other creatures are tapped.');return;
  }
  if(e.k==='swapManaHand'){
    const mana=p.mana.splice(0),hand=p.hand.splice(0);
    mana.forEach(c=>c.tapped=false);p.hand.push(...mana);hand.forEach(c=>{c.tapped=true;p.mana.push(c)});
    log(`${V(p,'You swap','Opponent swaps')} hand and mana zone.`);return;
  }
  if(e.k==='handManaCycle'){
    const n=p.hand.length;toMana(p,p.hand.splice(0));
    for(let k=0;k<n&&p.mana.length;k++){const c=await pickCard(p,p.mana.slice(),`${src.n}: Return a card from your mana zone to your hand (${n-k} left).`,{aiPick:aiDearest});p.mana.splice(p.mana.indexOf(c),1);c.tapped=false;p.hand.push(c)}
    log(`${n} card${n===1?'':'s'} go to ${whose(p)} mana zone and back.`);return;
  }
  if(e.k==='revealTop'){
    const c=p.deck.pop();if(!c)return;
    const hit=deckMatch(e.f,c);log(`${V(p,'You reveal','Opponent reveals')} ${c.n}.`);
    const to=hit?e.yes:e.no;
    if(to==='bz'&&c.t==='c'&&!c.evo)await enterBattle(p,c,null);
    else if(to==='gy')p.gy.push(c);else p.hand.push(c);
    return;
  }
  if(e.k==='handToBz'){
    const q=e.side==='opp'?o:p,limit=e.maxMana?p.mana.length:99;
    for(let k=0;k<e.n;k++){
      const cands=q.hand.filter(c=>c.t==='c'&&!c.evo&&c.cost<=limit);
      const c=await pickCard(q,cands,`${src.n}: Put a creature from your hand into the battle zone.`,{optional:!!e.upto||optional,aiPick:aiDearest});
      if(!c)break;
      q.hand.splice(q.hand.indexOf(c),1);await enterBattle(q,c,null);
    }
    return;
  }
  if(e.k==='totalPower'){
    let left=e.max;const chosen=[];
    for(;;){
      const cands=o.bz.filter(c=>!chosen.includes(c)&&power(c)<=left&&choosable(p,c));
      const c=await pickCard(p,cands,`${src.n}: Destroy creatures with total power ${e.max} or less (${left} left).`,{optional:true,aiPick:cs=>cs.slice().sort((a,b)=>power(b)-power(a))[0]});
      if(!c)break;chosen.push(c);left-=power(c);
    }
    for(const c of chosen){anim(c,'die');destroy(o,c)}
    return;
  }
  if(e.k==='shock'){
    let n=0;
    for(;;){
      const c=await pickCard(p,p.bz.slice(),`${src.n}: Return one of your creatures to your hand (${n} so far).`,{optional:true,aiPick:aiCheapest});
      if(!c||p.ai&&n>=Math.min(o.bz.length,1))break;bounce(p,c);n++;
    }
    for(let k=0;k<n&&o.bz.length;k++){const c=await pickCard(p,o.bz.slice(),`${src.n}: Return an opponent's creature.`,{optional:true,aiPick:aiPickFor({a:'bounce'},p)});if(!c)break;bounce(o,c)}
    return;
  }
  if(e.k==='meltdown'){
    const keep=[];
    for(let k=0;k<p.sh.length&&keep.length<o.sh.length;k++){const s=await pickCard(o,o.sh.filter(s=>!keep.includes(s)),`${src.n}: Choose a shield to keep.`,{hidden:true,aiPick:aiRandom});keep.push(s)}
    const rest=o.sh.filter(s=>!keep.includes(s));o.sh=keep;o.hand.push(...rest);
    log(`${rest.length} of ${whose(o)} shields go to hand.`);render();
    for(const s of rest)await shieldTrigger(o,s);
    return;
  }
  if(e.k==='darts'){
    if(!p.sh.length)return;
    const s=await pickCard(o,p.sh.slice(),`${src.n}: Choose one of your opponent's shields.`,{hidden:true,aiPick:aiRandom});
    if(!s)return;
    const castable=s.t==='s'&&s.playable&&spellAllowed(s);
    if(castable&&await chooseEffect(p,src.n,`The shield is ${s.n}. Cast it for no cost?`,[{label:'Cast it',val:true,main:1},{label:'Put it back',val:false}],fxList(s.fx).some(f=>fxUseful(p,f)))){
      p.sh.splice(p.sh.indexOf(s),1);log(`${V(p,'You cast','Opponent casts')} ${s.n} from a shield.`);await castSpell(p,s);
    }else log(`${V(p,'You look','Opponent looks')} at a shield and puts it back.`);
    return;
  }
  if(e.k==='later'){(G.later||(G.later=[])).push({p,fx:e.fx,src});return}
  if(e.k==='turnFlag'){p.turnFx={...p.turnFx,[e.f]:1};log(`${src.n}: ${e.x}`);return}
  if(e.k==='oppMustAttack'){o.mustAtkNext=true;log(`${V(o,'Your','The opponent\'s')} creatures must attack next turn if able.`);return}
  if(e.k==='fromGy'){
    const c=p.gy.find(x=>x.uid===e.uid);
    if(!c||e.may&&!(await chooseEffect(p,c.n,e.x,[{label:'Yes',val:true,main:1},{label:'No',val:false}],true)))return;
    p.gy.splice(p.gy.indexOf(c),1);log(`${c.n} enters the battle zone instead of being discarded.`);
    if(!c.evo)await enterBattle(p,c,null);else p.gy.push(c);
    return;
  }
  if(e.k==='omana'){
    const max=e.per?countFor(e.per,src,p):e.n;
    for(let k=0;k<max&&o.mana.length;k++){
      const c=await pickCard(p,o.mana.slice(),`${src.n}: ${e.x}`,{optional:!!e.upto||optional,aiPick:aiDearest});
      if(!c)break;
      o.mana.splice(o.mana.indexOf(c),1);c.tapped=false;(e.a==='hand'?o.hand:o.gy).push(c);
      log(`${c.n} goes from ${whose(o)} mana zone to ${e.a==='hand'?'hand':'the graveyard'}.`);render();
    }
    return;
  }
  if(e.k==='discardPer'){const n=countFor(e.per,src,p)+(e.plus||0);for(let i=0;i<n;i++)simpleFx(p,'discard',src);return}
  if(e.k==='oppDiscardsPer'){
    const n=countFor(e.per,src,p);
    for(let i=0;i<n&&o.hand.length;i++){const c=await pickCard(o,o.hand.slice(),`${src.n}: Discard a card.`,{aiPick:aiCheapest});discardCard(o,c);log(`${V(o,'You discard','Opponent discards')} ${c.n}.`)}
    return;
  }
  if(e.k==='handPick'){
    const c=await pickCard(p,o.hand.slice(),`${src.n}: Choose a card for your opponent to discard.`,{aiPick:aiDearest});
    if(c){discardCard(o,c);log(`${V(o,'You discard','Opponent discards')} ${c.n}.`)}
    return;
  }
  if(e.k==='handDiscard'){
    const hit=o.hand.filter(c=>deckMatch(e.f,c));hit.forEach(c=>discardCard(o,c));
    log(`${V(o,'You discard','Opponent discards')} ${hit.length?hit.map(c=>c.n).join(', '):'nothing'}.`);return;
  }
  if(e.k==='cycle'){
    // "Discard / put / destroy any number ... Then draw that many cards."
    let n=0;
    const zone=e.from==='bz'?p.bz:e.from==='mana'?p.mana:p.hand;
    for(;;){
      const c=await pickCard(p,zone.slice(),`${src.n}: ${e.x} (${n} so far)`,{optional:true,aiPick:aiCheapest});
      if(!c||p.ai&&(e.from!=='hand'||n>=1))break;
      if(e.from==='hand')discardCard(p,c);else if(e.from==='mana'){p.mana.splice(p.mana.indexOf(c),1);c.tapped=false;p.gy.push(c)}else destroy(p,c);
      n++;render();
    }
    await flushFx();draw(p,n);log(`${V(p,'You draw','Opponent draws')} ${n} card${n===1?'':'s'}.`);return;
  }
  if(e.k==='reshuffle'){const n=p.hand.length;p.deck.push(...p.hand.splice(0));shuffle(p.deck);draw(p,n);log(`${V(p,'You shuffle','Opponent shuffles')} ${n} card${n===1?'':'s'} into the deck and draws again.`);return}
  if(e.k==='oshields'){
    for(let k=0;k<e.n&&o.sh.length;k++){
      const s=await pickCard(p,o.sh.slice(),`${src.n}: ${e.x}`,{hidden:true,optional:true,aiPick:aiRandom});
      if(!s)break;o.sh.splice(o.sh.indexOf(s),1);o.gy.push(s);log(`One of ${whose(o)} shields goes to the graveyard.`);render();
    }
    return;
  }
  if(e.k==='rampPer'){const n=p.mana.length;for(let i=0;i<n&&p.deck.length;i++){const c=p.deck.pop();c.tapped=true;p.mana.push(c)}log(`${n} cards go from ${whose(p)} deck to the mana zone tapped.`);return}
  if(e.k==='breakSh'){
    const n=Math.min(e.n,o.sh.length),broken=o.sh.splice(o.sh.length-n);
    o.hand.push(...broken);log(`${src.n} breaks ${n===1?'a shield':n+' shields'}.`);render();
    for(const s of broken)await shieldTrigger(o,s);
    return;
  }
}
// Whether resolving an effect would help its controller right now (used by the AI).
function jsonUseful(p,e,src){
  const o=opp(p);
  if(e.k==='pick'||e.k==='all'){
    const hit=matching(e.q,p,src);
    if(e.k==='pick')return HARMFUL.has(e.a)?hit.some(c=>o.bz.includes(c)):hit.some(c=>p.bz.includes(c));
    const theirs=hit.filter(c=>o.bz.includes(c)).length,mine=hit.length-theirs;
    return HARMFUL.has(e.a)?theirs>mine:mine>0;
  }
  if(e.k==='search')return p.deck.some(c=>deckMatch(e.f,c));
  if(e.k==='if')return ifHolds(e.c,p);
  if(e.k==='drawPer')return p.deck.length>4;
  if(e.k==='or')return e.opts.some(fx=>fxList(fx).some(f=>fxUseful(p,f)));
  if(e.k==='ifDo')return e.then.some(f=>fxUseful(p,f));
  if(e.k==='gather')return e.to==='mana'?false:e.from.some(z=>p[z].some(c=>deckMatch(e.f,c)));
  if(e.k==='lowest'){const all=G.p.flatMap(q=>q.bz);if(!all.length)return false;const min=Math.min(...all.map(power));return all.filter(c=>power(c)===min).some(c=>o.bz.includes(c))}
  if(e.k==='swapManaHand'||e.k==='handManaCycle'||e.k==='tapRest'||e.k==='shock')return false;
  if(e.k==='totalPower')return o.bz.some(c=>power(c)<=e.max);
  if(e.k==='meltdown')return o.sh.length>p.sh.length;
  if(e.k==='omana'||e.k==='oshields')return (e.k==='omana'?o.mana:o.sh).length>0;
  if(e.k==='handPick'||e.k==='handDiscard'||e.k==='discardPer'||e.k==='oppDiscardsPer')return o.hand.length>0;
  if(e.k==='cycle'||e.k==='reshuffle')return p.hand.length<3&&p.deck.length>6;
  if(e.k==='shields')return e.to==='mana'?false:p.sh.length>3;
  if(e.k==='manaAll'||e.k==='selfDiscard'||e.k==='oppDraw'||e.k==='see')return false;
  return true;
}
