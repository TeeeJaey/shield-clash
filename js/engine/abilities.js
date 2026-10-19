/* ---------- continuous abilities ---------- */
// A creature's effective abilities are its printed ones plus whatever creatures in
// play currently grant it ("Each of your Ghosts has slayer", Survivor, Wave striker,
// "while you have no shields ...") plus "until the end of the turn" grants (c.tmp).
// Rules code reads abilities through T(c) and power through power(c); the printed
// card fields are never modified.
// Printed races plus any a card gains in play: "is an Armored Dragon in addition to its other
// races" until the end of the turn, or "each of your creatures is a Survivor".
function racesAll(c){
  const out=(c.race||'').split('/').map(s=>s.trim()).filter(Boolean);
  if(c.tmp&&c.tmp.addRaces)out.push(...c.tmp.addRaces);
  const p=G&&ownerOf(c);
  if(p)for(const [st,src,q] of staticsInPlay())if(st.addRace&&inScope(st,src,q,c,p))out.push(st.addRace);
  return out;
}
const hasRace=(c,r)=>racesAll(c).includes(r);
const dragonRace=c=>racesAll(c).some(r=>/\bDragon\b/.test(r));
function inScope(st,src,srcOwner,c,owner){
  if(st.who==='self')return c===src;
  // Petrova: "each creature of that race" - the race chosen when it entered.
  if(st.chosen&&!(src.chosenRace&&hasRace(c,src.chosenRace)))return false;
  if(st.who==='own'&&owner!==srcOwner)return false;
  if(st.other&&c===src)return false;
  if(st.civs&&!civsOf(c).some(e=>st.civs.includes(e)))return false;
  if(st.races&&!st.races.some(r=>hasRace(c,r)))return false;
  if(st.dragon&&!dragonRace(c))return false;
  if(st.silent&&!c.silent||st.evoOnly&&!c.evo)return false;
  if(st.minP&&!st.power&&power(c)<st.minP)return false;
  return true;
}
function condHolds(cond,src,p){
  if(!cond)return true;
  if(cond.attacking&&G.attacking!==src)return false;
  if(cond.powerAtLeast&&power(src)<cond.powerAtLeast)return false;
  if(cond.monoMana&&!(p.mana.length&&p.mana.every(m=>civsOf(m).includes(cond.monoMana))))return false;
  if(cond.noShields&&p.sh.length)return false;
  if(cond.selfTapped&&!src.tapped)return false;
  const like=(x,h)=>(!h.other||x!==src)&&(!h.civ||civsOf(x).includes(h.civ))&&(!h.races||h.races.some(r=>hasRace(x,r)))&&(!h.state||(h.state==='tapped')===!!x.tapped);
  if(cond.have&&!p.bz.some(x=>like(x,cond.have)))return false;
  if(cond.none&&p.bz.some(x=>like(x,cond.none)))return false;
  // Wave striker: 2 or more other creatures in the battle zone have wave striker.
  if(cond.wave&&G.p.reduce((n,q)=>n+q.bz.filter(x=>x!==src&&x.waveStriker).length,0)<2)return false;
  // Turbo rush: another of your creatures broke a shield this turn.
  if(cond.turbo&&!(p.brokeBy||[]).some(uid=>uid!==src.uid))return false;
  if(cond.haveN&&p.bz.filter(x=>x!==src).length<cond.haveN)return false;
  if(cond.oppMore&&opp(p).bz.length<=p.bz.length)return false;
  if(cond.emptyHand&&p.hand.length)return false;
  if(cond.oppTurn&&G.p[G.turn]===p)return false;
  return true;
}
// "for each ..." counts, seen from the ability's controller p.
function countFor(per,src,p){
  const o=opp(p),sides=per.side==='own'?[p]:per.side==='opp'?[o]:[p,o];
  const cards=sides.flatMap(q=>q[per.zone]);
  if(per.civilizations)return new Set(cards.flatMap(civsOf)).size;
  return cards.filter(x=>(!per.other||x!==src)&&(!per.state||(per.state==='tapped')===!!x.tapped)
    &&(!per.civ||civsOf(x).includes(per.civ))&&(!per.civs||civsOf(x).some(e=>per.civs.includes(e)))
    &&(!per.races||per.races.some(r=>hasRace(x,r)))&&(!per.dragon||dragonRace(x))&&(!per.type||per.type==='card'||x.t==='c')).length;
}
// Every static ability currently in play, with its controller.
function* staticsInPlay(){
  // Printed abilities, plus abilities granted for a while ("until the end of the turn, each of
  // your creatures gets 'While attacking, ...'").
  for(const q of G?G.p:[])for(const src of q.bz)for(const st of [...(src.statics||[]),...(src.tmp&&src.tmp.statics||[]),...(src.tmpNext&&src.tmpNext.statics||[])])yield [st,src,q];
}
// Combines granted abilities with printed ones. Lists add up, breakers take the best,
// power attacker bonuses stack.
function mergeTraits(a,t){
  for(const [k,v] of Object.entries(t)){
    if(Array.isArray(v))a[k]=[...(a[k]||[]),...v];
    else if(k==='br'||k==='unblBy')a[k]=Math.max(a[k]||0,v);
    else if(k==='pa'||k==='brPlus')a[k]=(a[k]||0)+v;
    else if(!a[k])a[k]=v;
  }
  return a;
}
function T(c){
  const p=c&&G&&ownerOf(c);
  if(!p)return c;
  let out=null;
  for(const [st,src,q] of staticsInPlay()){
    if(!st.traits||!inScope(st,src,q,c,p)||!condHolds(st.cond,src,q))continue;
    out=mergeTraits(out||{...c},st.traits);
  }
  if(c.tmp)out=mergeTraits(out||{...c},c.tmp);
  if(c.tmpNext)out=mergeTraits(out||{...c},c.tmpNext);
  return out||c;
}
// Printed power, "until the end of the turn" boosts and static power bonuses.
function power(c){
  let v=c.p+(c.boost||0);
  const p=G&&ownerOf(c);
  if(p)for(const [st,src,q] of staticsInPlay()){
    if(!st.power||st.vs||!inScope(st,src,q,c,p)||!condHolds(st.cond,src,q))continue;
    v+=st.power*(st.per?countFor(st.per,src,q):1);
  }
  return v;
}
// Power while attacking (power attacker), and against a particular opponent in battle.
const atkPow=c=>power(c)+(T(c).pa||0);
function battlePower(c,other,attacking){
  let v=attacking?atkPow(c):power(c);
  for(const st of c.statics||[])if(st.vs&&(st.vs.dragon?dragonRace(other):civsOf(other).includes(st.vs.civ)))v+=st.power;
  return v;
}
// Rules for both players ("players can't cast spells other than light spells").
function rulesInPlay(key){
  const out=[];
  for(const [st,src,q] of staticsInPlay())if(st.rule&&st.rule[key]!=null&&condHolds(st.cond,src,q))out.push([st.rule[key],q]);
  return out;
}
// Crew breaker adds one shield for each matching creature.
function breaks(c){
  const t=T(c),p=ownerOf(c);
  let n=(t.br||1)+(t.brPlus||0);
  if(p)for(const st of c.statics||[])if(st.brPer)n+=countFor(st.brPer,c,p);
  return n;
}
// Cost after "cost 1 less" and "cost 2 more" abilities in play. Reductions stop at the
// printed minimum ("can't cost less than 1"), or the card's own cost if lower.
function costOf(c,p){
  let d=0,min=1;
  for(const [st,,q] of staticsInPlay()){
    const k=st.cost;
    if(!k||st.who==='own'&&q!==p)continue;
    if(k.t&&c.t!==k.t||k.civ&&!civsOf(c).includes(k.civ)||k.dragon&&!dragonRace(c))continue;
    d+=k.delta;if(k.min)min=Math.max(min,k.min);
  }
  const v=c.cost+d;
  return d<0?Math.max(v,Math.min(c.cost,min)):v;
}
