/* ---------- opponent AI ---------- */
function aiCharge(p){
  if(!p.hand.length||p.charged)return;
  if(p.mana.length>=8&&p.hand.length<4)return;
  const have=new Set(p.mana.flatMap(civsOf));
  const missing=p.hand.filter(c=>civsOf(c).some(e=>!have.has(e))).sort((a,b)=>b.cost-a.cost);
  const byCost=[...p.hand].sort((a,b)=>p.mana.length<4?b.cost-a.cost:a.cost-b.cost);
  const pick=(p.mana.length<4&&missing[0])||byCost[0];
  p.hand.splice(p.hand.indexOf(pick),1);toMana(p,[pick]);p.charged=true;
  log(`Opponent charges ${pick.n} as mana.`);
}
function fxUseful(p,f){
  if(f.startsWith('optional:'))f=f.slice(9);
  if(isJsonFx(f))return jsonUseful(p,jfx(f),null);
  const o=opp(p),tg=targetsFor(f,p);
  if(tg)return tg.length>0;
  const sw=/^sweep(\d+)$/.exec(f);
  if(sw)return o.bz.some(x=>power(x)<=+sw[1]);
  if(f.startsWith('ramp'))return p.mana.length<8&&p.deck.length>6;
  if(f==='tapall')return o.bz.filter(x=>!x.tapped).length>=1;
  if(f==='recover')return p.gy.some(x=>x.t==='c');
  if(f.startsWith('discard'))return o.hand.length>0;
  if(f==='manaburn')return o.mana.length>0;
  if(f==='oppShieldToGy')return o.sh.length>0;
  const mv=MOVE.exec(f);
  if(mv){
    const n=moveCandidates(p,f).length;
    if(mv[1]==='hand')return n>1&&(mv[2]!=='mana'||p.mana.length<8);
    if(mv[1]==='mana')return n>0&&(mv[2]==='sh'||p.mana.length>=6);
    return n>0;
  }
  if(f==='oppDestroysOwn'||f==='oppOwnToMana'||f==='oppOwnToHand')return o.bz.length>0;
  if(f==='oppManaChooseGy')return o.mana.length>0;
  if(/^oppMana/.test(f))return o.mana.length>0;
  if(/^oppDiscards/.test(f))return o.hand.length>0;
  if(f==='sweepBlockers'||f==='bounceBlockers')return o.bz.filter(c=>T(c).block).length>p.bz.filter(c=>T(c).block).length;
  if(f==='tapBlockers')return o.bz.some(c=>T(c).block&&!c.tapped);
  if(/^bounceAll\d+$/.test(f)){const n=+f.slice(9);return o.bz.filter(c=>power(c)<=n).length>p.bz.filter(c=>power(c)<=n).length}
  if(f==='peekShield')return false;
  // Costs printed on a card are never the reason to play it.
  if(/^(manaToGy|shieldToGy|destroyOwn|manaToHand)/.test(f))return false;
  if(f.startsWith('shield'))return p.deck.length>6;
  return p.deck.length>4;
}
function aiWants(p,c){
  if(c.t!=='s')return true;
  return fxList(c.fx).some(f=>fxUseful(p,f));
}
function aiBlock(o,att,blockers,target,required){
  const pa=atkPow(att),sorted=blockers.slice().sort((a,b)=>power(a)-power(b));
  const winner=sorted.find(b=>power(b)>pa||slays(b,att));
  if(winner)return winner;
  if(required||(target==='player'&&o.sh.length<=breaks(att)))return sorted[0];
  return null;
}
function aiUseTrig(o,s){return s.t==='c'||fxList(s.fx).some(f=>fxUseful(o,f))}
// The computer's turn. The strategist plans it by simulation (planner.js); inside a
// simulation, and as a fallback, both seats play the quick rule-based turn below.
async function aiTurn(p){
  if(AI_PLANS&&!SIM&&!p.rulesOnly&&typeof planTurn==='function'){
    try{return await planTurn(p)}catch(e){if(e===PLAN_GONE)return;console.error('planner',e)}
  }
  await ruleTurn(p);
}
async function ruleTurn(p){
  await sleep(600);
  aiCharge(p);render();
  await aiMain(p);
  await aiTapAbilities(p);
  await aiAttacks(p);
  await sleep(500);
}
async function aiMain(p){
  for(let guard=0;guard<10&&!G.over;guard++){
    const opts=p.hand.filter(c=>canPlay(p,c)&&aiWants(p,c)).sort((a,b)=>(b.cost+(b.evo?1:0))-(a.cost+(a.evo?1:0)));
    if(!opts.length)break;
    await sleep(700);await playCard(p,opts[0]);
  }
}
// Tap abilities are used by creatures that can't attack well.
async function aiTapAbilities(p){
  for(const c of [...p.bz]){
    if(G.over)return;
    if(!canTapAbility(c,p))continue;
    const fx=T(c).tapAb[0],weak=!canAttackAnything(c,p)||atkPow(c)<=3000||T(c).noP;
    if(fxList(fx).some(f=>fxUseful(p,f))&&(weak||Math.random()<0.3)){await sleep(700);await useTapAbility(p,c,0)}
  }
}
async function aiAttacks(p){
  const me=opp(p);
  const strike=async(c,t)=>{await sleep(800);await attack(p,c,t)};
  for(const c of [...p.bz]){
    if(G.over)return;
    if(!canAttackAnything(c,p))continue;
    const pa=atkPow(c);
    const prey=attackTargets(c,p).filter(x=>slays(c,x)||pa>power(x)).sort((a,b)=>power(b)-power(a))[0];
    if(!canAttackPlayer(c,p)){if(prey)await strike(c,prey);continue}
    const blockers=me.bz.filter(x=>canBlock(x,c,'player',me));
    const top=Math.max(0,...blockers.map(power));
    const safe=!blockers.length||pa>top||T(c).slayer;
    if(prey&&(power(prey)>=4000||me.sh.length>2)){await strike(c,prey);continue}
    if(safe||me.sh.length===0||Math.random()<0.3){await strike(c,'player');continue}
    if(prey)await strike(c,prey);
  }
  await aiForcedAttacks(p);
}
// Creatures that attack each turn if able attack even when the attack is poor.
async function aiForcedAttacks(p){
  for(const c of mustAttackers(p)){
    if(G.over)return;
    if(!mustAttackers(p).includes(c))continue;
    await sleep(800);await attack(p,c,canAttackPlayer(c,p)?'player':attackTargets(c,p).sort((a,b)=>power(a)-power(b))[0]);
  }
}
