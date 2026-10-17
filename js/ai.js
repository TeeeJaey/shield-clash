/* ---------- opponent AI ---------- */
function aiCharge(p){
  if(!p.hand.length)return;
  if(p.mana.length>=8&&p.hand.length<4)return;
  const have=new Set(p.mana.map(m=>m.e));
  const missing=p.hand.filter(c=>!have.has(c.e)).sort((a,b)=>b.cost-a.cost);
  const byCost=[...p.hand].sort((a,b)=>p.mana.length<4?b.cost-a.cost:a.cost-b.cost);
  const pick=(p.mana.length<4&&missing[0])||byCost[0];
  p.hand.splice(p.hand.indexOf(pick),1);pick.tapped=false;p.mana.push(pick);p.charged=true;
  log(`Opponent charges ${pick.n} as mana.`);
}
function fxUseful(p,f){
  const o=opp(p),tg=targetsFor(f,p);
  if(tg)return tg.length>0;
  const sw=/^sweep(\d+)$/.exec(f);
  if(sw)return o.bz.some(x=>x.p<=+sw[1]);
  if(f.startsWith('ramp'))return p.mana.length<8&&p.deck.length>6;
  if(f==='tapall')return o.bz.filter(x=>!x.tapped).length>=1;
  if(f==='recover')return p.gy.some(x=>x.t==='c');
  if(f.startsWith('discard'))return o.hand.length>0;
  if(f==='manaburn')return o.mana.length>0;
  if(f.startsWith('shield'))return p.deck.length>6;
  return p.deck.length>4;
}
function aiWants(p,c){
  if(c.t!=='s')return true;
  return fxList(c.fx).some(f=>fxUseful(p,f));
}
function aiBlock(o,att,blockers,target){
  const pa=atkPow(att),sorted=blockers.sort((a,b)=>a.p-b.p);
  const winner=sorted.find(b=>b.p>pa||b.slayer);
  if(winner)return winner;
  if(target==='player'&&o.sh.length<=(att.br||1))return sorted[0];
  return null;
}
function aiUseTrig(o,s){return fxList(s.fx).some(f=>fxUseful(o,f))}
async function aiTurn(p){
  await sleep(600);
  aiCharge(p);render();
  for(let guard=0;guard<10&&!G.over;guard++){
    const opts=p.hand.filter(c=>canPlay(p,c)&&aiWants(p,c)).sort((a,b)=>(b.cost+(b.evo?1:0))-(a.cost+(a.evo?1:0)));
    if(!opts.length)break;
    await sleep(700);await playCard(p,opts[0]);
  }
  const me=G.p[0];
  for(const c of [...p.bz]){
    if(G.over)return;
    if(!p.bz.includes(c)||c.tapped||c.sick)continue;
    const pa=atkPow(c);
    const prey=me.bz.filter(x=>x.tapped&&(c.slayer||pa>x.p)).sort((a,b)=>b.p-a.p)[0];
    if(c.noP){if(prey){await sleep(800);await attack(p,c,prey)}continue}
    const blockers=me.bz.filter(x=>x.block&&!x.tapped);
    const top=Math.max(0,...blockers.map(b=>b.p));
    const safe=c.unbl||!blockers.length||pa>top||c.slayer;
    if(prey&&(prey.p>=4000||me.sh.length>2)){await sleep(800);await attack(p,c,prey);continue}
    if(safe||me.sh.length===0||Math.random()<0.3){await sleep(800);await attack(p,c,'player');continue}
    if(prey){await sleep(800);await attack(p,c,prey)}
  }
  await sleep(500);
}
