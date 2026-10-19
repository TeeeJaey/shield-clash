/* Supported mechanics as the deck builder and deck generator see them. Each entry
   recognises a card by the engine fields card-catalog.js sets, so a new mechanic
   added to the engine only needs a line here to become filterable and rated.
   value: how the deck generator rates it (negative for drawbacks). */
const EVENTS=['onSum','onAtk','fx','onDie','onAnyEnter','onOwnEnter','onBlocked','onBlock','onUnblocked','onAttacked','onAnyDie','onOwnAtk','onOppTrig','onOppPlay','onStart','onEnd','onLeave','onAnySpell','onBlockedP','onAnyEvolve','onOppSpell','onOppTrigMine'];
const effectsOf=d=>[...EVENTS.flatMap(k=>fxList(d[k])),...(d.tapAb||[]).flat(),...(d.silent||[]).flat(),...(d.enterWatch||[]).flatMap(w=>w.fx),...(d.onAtkC||[]).flatMap(w=>w.fx),...(d.onOwnDie||[]).flatMap(w=>w.fx)].map(f=>f.replace(/^optional:/,''));
// Printed-wording effects are JSON; this turns them into a short tag ("pick:destroy:opp",
// "all:bounce:any", "search") so the filters below can read them like the fixed codes.
const fxTag=f=>{if(f.charAt(0)!=='{')return f;const e=JSON.parse(f);return e.q?`${e.k}:${e.a}:${e.q.side}`:e.k};
const hasFx=(d,re)=>effectsOf(d).some(f=>re.test(fxTag(f)));
const MECHANICS=[
  {key:'trig',label:'Shield trigger',has:d=>d.trig,value:2},
  {key:'multi',label:'Multicolored',has:d=>d.e2,value:-.3},
  {key:'survivor',label:'Survivor',has:d=>(d.statics||[]).some(st=>(st.races||[]).includes('Survivor')&&st.who==='own'),value:1},
  {key:'wave',label:'Wave striker',has:d=>d.waveStriker,value:.5},
  {key:'turbo',label:'Turbo rush',has:d=>(d.statics||[]).some(st=>st.cond&&st.cond.turbo),value:.5},
  {key:'grows',label:'Variable or conditional power',has:d=>(d.statics||[]).some(st=>st.who==='self'&&st.power),value:.8},
  {key:'lord',label:'Boosts other creatures',has:d=>(d.statics||[]).some(st=>st.who!=='self'&&!(st.races||[]).includes('Survivor')),value:1.2},
  {key:'pump',label:'Team boost until end of turn',has:d=>hasFx(d,/^grantOwn:/),value:.6},
  {key:'block',label:'Blocker',has:d=>d.block||d.blockVs,value:d=>d.blockVs?.5:1},
  {key:'speed',label:'Speed attacker',has:d=>d.speed,value:2},
  {key:'breaker',label:'Double, triple or crew breaker',has:d=>d.br>1||d.breakToGy||(d.statics||[]).some(st=>st.brPer),value:d=>d.br>1?d.br-1:1},
  {key:'pa',label:'Power attacker',has:d=>d.pa,value:d=>d.pa/2000},
  {key:'slayer',label:'Slayer',has:d=>d.slayer||d.slayVs,value:d=>d.slayer?1.5:.8},
  {key:'evo',label:'Evolution',has:d=>d.evo||d.vortex||d.evoBaseAny,value:d=>d.evo?-1:.3},
  {key:'evade',label:"Hard to block",has:d=>d.unbl||d.stealth||d.unblBy||d.unblByCiv||d.unblVsC||d.unblByMin,value:d=>d.unbl?1.5:.7},
  {key:'hunts',label:'Attacks untapped creatures',has:d=>d.hunts||d.huntCivs,value:d=>d.hunts?1:.5},
  {key:'safe',label:"Can't be attacked",has:d=>d.noBeAtk||d.noBeAtkBy||d.noBeAtkDragon,value:d=>d.noBeAtk?.6:.3},
  {key:'survive',label:'Survives destruction',has:d=>d.destroyTo||d.surviveVs||d.noChoose||d.noOppTap,value:1},
  {key:'protect',label:'Protects shields or creatures',has:d=>d.shieldSaver||d.chooseBroken||(d.statics||[]).some(st=>st.traits&&(st.traits.noDestroy||st.traits.destroyTo)),value:.6},
  {key:'rules',label:'Changes the rules for both players',has:d=>(d.statics||[]).some(st=>st.rule),value:0},
  {key:'discard',label:'Enters when discarded',has:d=>d.discardToBz,value:.3},
  {key:'charger',label:'Charger',has:d=>d.charger,value:1},
  {key:'summon',label:'When summoned',has:d=>fxList(d.onSum).length,value:1},
  {key:'attack',label:'When attacking',has:d=>fxList(d.onAtk).length,value:.8},
  {key:'dies',label:'When destroyed',has:d=>fxList(d.onDie).length,value:.6},
  {key:'enters',label:'Reacts to new creatures',has:d=>d.onAnyEnter||(d.onOwnEnter||[]).length||d.enterWatch,value:d=>d.enterWatch?.6:0},
  {key:'tapAb',label:'Taps for an ability',has:d=>d.tapAb||(d.statics||[]).some(st=>st.traits&&st.traits.tapAb),value:.8},
  {key:'silent',label:'Silent skill',has:d=>d.silent,value:.6},
  {key:'startturn',label:'Start of turn',has:d=>d.onStart,value:.5},
  {key:'endturn',label:'End of turn',has:d=>d.endUntap||d.endBounce||d.endDieAlone||d.onEnd||d.endBounceBroke,value:d=>d.endUntap||d.onEnd?.6:d.endDieAlone?-1:0},
  {key:'battle',label:'Battle rules',has:d=>d.winDie||d.battleDie||d.blockUntap||d.noBattleBlocked||d.noBattleBlocks||d.atkPlayerDie||d.blockDie,value:d=>d.blockUntap?.5:d.winDie||d.battleDie||d.atkPlayerDie||d.blockDie?-1:0},
  {key:'reacts',label:'Blocking, attack and trigger reactions',has:d=>d.onBlocked||d.onBlock||d.onUnblocked||d.onAttacked||d.onAnyDie||d.onOwnAtk||d.onOppTrig||d.onOppPlay||d.onLeave||d.onAtkC||d.onAnySpell||d.onOwnDie||d.onBlockedP||d.onAnyEvolve||d.onOppSpell||d.onOppTrigMine,value:.6},
  {key:'removal',label:'Removal',has:d=>hasFx(d,/^(kill|burn|sweep|bounce|tapone|tapall|oppDestroysOwn|oppOwnToMana|sweepBlockers|tapBlockers|bounceBlockers|(pick|all):(destroy|bounce|tap|mana|deckTop|shield):(opp|any))/),value:1},
  {key:'search',label:'Deck search and card selection',has:d=>hasFx(d,/^(search|look)$/),value:.8},
  {key:'costs',label:'Changes costs',has:d=>(d.statics||[]).some(st=>st.cost),value:d=>(d.statics||[]).some(st=>st.cost&&st.cost.delta<0)?1:0},
  {key:'draw',label:'Card draw and recovery',has:d=>hasFx(d,/^(draw|recover|move:gy>hand|move:mana>hand|drawPer)/),value:.8},
  {key:'mana',label:'Mana',has:d=>hasFx(d,/^(ramp|move:\w+>mana|manaburn|oppManaTo)/),value:.6},
  {key:'shields',label:'Shields',has:d=>hasFx(d,/(shield|Shield|>sh:)/),value:0},
  {key:'must',label:'Must attack or block',has:d=>d.mustAtk||d.allMustAtk||d.mustBlock,value:-.4},
  {key:'limits',label:'Attack limits',has:d=>d.noAtk||d.noP||d.noAtkC||d.noAtkNoSh,value:d=>d.noAtk?-1.5:-.4},
  {key:'needSpell',label:'Needs a spell first',has:d=>d.needSpell||d.needMono||d.needBehind,value:-.6},
  {key:'cost',label:'Costs you a card',has:d=>hasFx(d,/^(manaToGy|shieldToGy|destroyOwn|destroySelf|discardShield)/),value:-1}
];
const mechanicValue=d=>MECHANICS.reduce((v,m)=>m.has(d)?v+(typeof m.value==='function'?m.value(d):m.value):v,0);
// Deck rules the builder checks: things the engine enforces during a duel that make
// a card dead or weak in this particular deck.
function deckWarnings(counts){
  const ids=Object.keys(counts).filter(id=>counts[id]>0&&DEF[id]),cards=ids.map(id=>DEF[id]);
  const out=[];
  for(const d of cards){
    if(d.evo&&!cards.some(b=>!b.evo&&evolvesOn(d,b)))out.push(`${d.n} evolves from a ${d.evo}, but this deck has none.`);
  }
  const spells=cards.filter(d=>d.t==='s').length;
  for(const d of cards)if(d.needSpell&&!spells)out.push(`${d.n} can only be summoned after casting a spell, and this deck has no spells.`);
  const creatures=cards.filter(d=>d.t==='c').reduce((n,d)=>n+counts[d.id],0);
  for(const d of cards)if(d.endDieAlone&&creatures<20)out.push(`${d.n} is destroyed when it is your only creature. Add more creatures.`);
  const civs=new Set(cards.flatMap(civsOf));
  for(const e of civs){
    const n=cards.filter(d=>civsOf(d).includes(e)).reduce((t,d)=>t+counts[d.id],0);
    if(n<6)out.push(`Only ${n} ${CIV[e].n} card${n===1?'':'s'}: you will often lack ${CIV[e].n} mana to cast them.`);
  }
  return out;
}
