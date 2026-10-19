const PRESETS=[
  {n:'Blazing roots',civ:['fire','nature'],d:'Ramp into huge attackers.'},
  {n:'Tidewall',civ:['water','light'],d:'Blockers, card draw, control.'},
  {n:'Ashen night',civ:['darkness','fire'],d:'Removal and fast pressure.'},
  {n:'Deep current',civ:['water','nature'],d:'Big mana, unblockable threats.'},
  {n:'Twilight',civ:['light','darkness'],d:'Hold the line, then strike.'},
  {n:'Wildfire',civ:['fire','water'],d:'Speed attackers and tricks.'},
];
// Presets pick a fresh mix each game: 10 cards per civilization, 2 copies each,
// with a sensible cost curve and evolutions only when their race is in the deck.
function presetIds(civ){
  const ids=[];
  for(const e of civ){
    // A multicolored card joins a preset only when both of its civilizations are in it.
    const cs=shuffle(DEFS.filter(d=>d.e===e&&civsOf(d).every(x=>civ.includes(x)))),pick=[];
    const want=[[c=>c.cost<=2,5],[c=>c.cost>=3&&c.cost<=4,4],[c=>c.cost>=5,3]];
    for(const [f,n] of want){
      let got=0;
      for(const d of cs){
        if(got>=n)break;
        if(!f(d)||pick.includes(d))continue;
        if(d.evo&&!pick.some(x=>!x.evo&&evolvesOn(d,x)))continue;
        pick.push(d);got++;
      }
    }
    for(const d of cs){
      if(pick.length>=12)break;
      if(pick.includes(d)||(d.evo&&!pick.some(x=>!x.evo&&evolvesOn(d,x))))continue;
      pick.push(d);
    }
    pick.forEach(d=>ids.push(d.id,d.id));
    const extra=pick.find(d=>d.cost<=2&&!d.evo)||pick[0];ids.push(extra.id);
  }
  return ids;
}

// Rank the actual cards by cost, power, and supported abilities.
function cardValue(d){
  const v=d.t==='c'?d.p/1000-d.cost*.65:1;
  return v+mechanicValue(d)+Math.random()*2.5;
}
// Builds a strong deck using all five civilizations. Each civilization first gets
// 8 cards along a cost curve (cheap, mid, big) from its highest-rated cards, then the
// last 5 slots go to the best remaining cards, so every color has mana to cast with.
function smartDeck(){
  const civs=Object.keys(CIV),CAP=12;
  for(let attempt=0;attempt<60;attempt++){
    const val={};DEFS.forEach(d=>val[d.id]=cardValue(d));
    const counts={},per={};let spells=0;
    const baseOK=d=>!d.evo||Object.keys(counts).some(id=>!DEF[id].evo&&evolvesOn(d,DEF[id])&&counts[id]>=2);
    const add=(d,n)=>{n=Math.min(n,3-(counts[d.id]||0),CAP-(per[d.e]||0));if(d.t==='s')n=Math.min(n,8-spells);if(n<=0)return 0;
      counts[d.id]=(counts[d.id]||0)+n;per[d.e]=(per[d.e]||0)+n;if(d.t==='s')spells+=n;return n};
    const best=(f)=>DEFS.filter(d=>f(d)&&baseOK(d)&&(counts[d.id]||0)<3).sort((x,y)=>val[y.id]-val[x.id]);
    for(const e of shuffle([...civs])){
      for(const [f,n] of [[d=>d.cost<=2,3],[d=>d.cost>=3&&d.cost<=4,3],[d=>d.cost>=5,2]]){
        let need=n;
        for(const d of best(d=>d.e===e&&f(d))){if(need<=0)break;need-=add(d,need)}
      }
    }
    let tot=()=>Object.values(counts).reduce((a,b)=>a+b,0);
    for(const d of best(d=>d.cost<=4)){if(tot()>=DECK_SIZE)break;add(d,Math.min(2,DECK_SIZE-tot()))}
    for(const d of best(()=>true)){if(tot()>=DECK_SIZE)break;add(d,DECK_SIZE-tot())}
    let trig=0;for(const id in counts)if(DEF[id].trig)trig+=counts[id];
    if(tot()===DECK_SIZE&&civs.every(e=>(per[e]||0)>=8)&&trig>=6){
      const ids=[];for(const id in counts)for(let i=0;i<counts[id];i++)ids.push(id);
      return {n:'Random five-civilization deck',ids,counts};
    }
  }
  const pr=PRESETS[0];return {n:pr.n,ids:presetIds(pr.civ),counts:null};
}
