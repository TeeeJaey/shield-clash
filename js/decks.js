/* ---------- preset and random decks ---------- */
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
    const cs=shuffle(DEFS.filter(d=>d.e===e)),pick=[];
    const want=[[c=>c.cost<=2,4],[c=>c.cost>=3&&c.cost<=4,3],[c=>c.cost>=5,3]];
    for(const [f,n] of want){
      let got=0;
      for(const d of cs){
        if(got>=n)break;
        if(!f(d)||pick.includes(d))continue;
        if(d.evo&&!pick.some(x=>!x.evo&&x.race===d.evo))continue;
        pick.push(d);got++;
      }
    }
    pick.forEach(d=>ids.push(d.id,d.id));
  }
  return ids;
}

// Builds a strong mixed-civilization deck: rates every card, then fills a
// classic cost curve with 3-4 copies of the best cards in each cost range.
// Ratings come from 8,000 simulated duels: how much more often decks with
// each card won. Higher means the card pulls its weight.
const RATING={"spark":3.6,"wisp":1.4,"sprite":4.3,"scrap":1.1,"bpup":3.7,"lancer":2.2,"chick":4.2,"raider":4.0,"hatch":4.8,"smolder":2.8,"chief":2.9,"drakeling":1.6,"harrier":4.5,"pyroclast":3.9,"cinderclaw":1.6,"golem":3.5,"ascend":0.4,"knuckle":3.0,"baron":4.4,"phoenix":4.6,"blastwyv":4.2,"pyrelord":-1.3,"wyrm":4.1,"ravager":3.3,"warlord":4.4,"ashcapt":1.8,"magmaheart":0.9,"sovereign":3.3,"furnace":1.9,"marauder":2.8,"ragna":-1.1,"solarking":1.7,"fireball":0.9,"flare":2.2,"magma":1.3,"gale":2.4,"rain":3.4,"scorch":-0.4,"eruption":1.2,"roar":4.2,"droplet":-0.7,"ink":0.4,"scout":-0.7,"eel":-2.0,"scribe":-1.0,"kelp":-1.2,"pearl":0.1,"reef":-0.6,"courier":-1.5,"seeker":0.1,"shoal":0.4,"coralk":-0.1,"archivist":-4.9,"undereel":-1.5,"mirror":1.5,"riptide":0.0,"angler":-1.1,"foam":-0.7,"prime":-0.3,"commodore":-2.9,"sage":-2.3,"wraith":-1.8,"vortex":-1.7,"serpemp":-1.7,"oracle":-3.2,"maelstrom":-1.2,"brine":-0.1,"rider":-1.0,"lev":-1.1,"admiral":1.5,"tempest":-2.6,"endless":-4.2,"veil":-2.1,"whirl":-3.6,"undertow":-2.0,"insight":-2.4,"memory":-3.2,"deep":-3.3,"rewind":1.0,"crush":1.6,"mole":-0.2,"seedling":0.7,"beetle":1.1,"fern":0.5,"moth":-0.6,"sprout":-2.3,"badger":-2.0,"shaman":0.6,"canopy":1.0,"ram":1.5,"rootelder":-0.4,"boar":-0.9,"bear":-1.4,"thicket":0.7,"keeper":0.2,"alpha":-0.2,"rhino":0.6,"tusker":0.6,"matriarch":0.7,"tortoise":2.1,"packlord":-1.9,"oak":-0.7,"charger":-0.8,"hydra":-0.1,"elderwood":0.6,"wildking":-1.3,"ironbark":0.0,"behemoth":-1.1,"colossus":-3.0,"greatfang":2.5,"mammoth":-3.5,"titan":-2.3,"seed":-2.4,"growth":-0.5,"regrow":-2.2,"harvest":-0.9,"rebirth":0.9,"surge":-1.6,"roots":-2.1,"bloom":-0.8,"glimmer":0.2,"acolyte":-0.8,"prismspr":2.1,"halo":1.1,"drone":0.5,"aurora":-0.3,"archer":0.6,"gleam":2.0,"hlancer":1.6,"squire":-1.3,"dawn":-0.5,"cleric":0.7,"bastion":1.7,"starfall":-2.1,"twiherald":-0.6,"aegis":-2.5,"overseer":-2.0,"herald":2.4,"templar":1.3,"vanguard":1.0,"lsage":-0.5,"exalted":-2.2,"prism":1.0,"dawnsong":-1.5,"arbiter":-2.5,"vigil":1.2,"sunforged":-0.2,"lightseraph":0.5,"paragon":-2.2,"seraph":-0.6,"citadel":1.8,"archangel":1.0,"ray":-1.7,"ward":0.6,"guide":-0.5,"blessing":0.7,"snare":-2.8,"barrier":5.1,"purify":-0.2,"judgement":1.2,"imp":-0.1,"leech":-0.4,"rat":-1.7,"maggot":-1.0,"gnawer":-1.6,"bat":-0.6,"stalker":-3.0,"whisper":-0.5,"hollow":-1.3,"queen":-1.5,"marquis":-2.9,"venom":-1.5,"plague":-1.0,"gravek":2.1,"bloodmoon":-4.1,"banshee":-0.3,"siphon":-1.3,"wraithlord":-0.9,"ghoul":-0.4,"reaper":0.8,"duke":-0.4,"ghoulbrute":-2.9,"prince":-4.5,"tyrant":-2.3,"assassin":-0.4,"harbinger":0.2,"blight":-0.5,"lich":-2.2,"ruinking":-3.3,"overlord":-1.6,"nightmare":-2.3,"devourer":-1.7,"bargain":-1.5,"hex":-1.3,"gravecall":-1.6,"deathtouch":-0.9,"mindrot":-1.6,"rend":2.2,"voidh":-0.3,"purge":2.9};
function cardValue(d){
  let v=RATING[d.id]||0;
  if(d.evo)v-=1;
  return v+Math.random()*2.5;
}
// Builds a strong deck using all five civilizations. Each civilization first gets
// 7 cards along a cost curve (cheap, mid, big) from its best-rated cards, then the
// last 5 slots go to the best remaining cards, so every color has mana to cast with.
function smartDeck(){
  const civs=Object.keys(CIV),CAP=9;
  for(let attempt=0;attempt<60;attempt++){
    const val={};DEFS.forEach(d=>val[d.id]=cardValue(d));
    const counts={},per={};let spells=0;
    const baseOK=d=>!d.evo||Object.keys(counts).some(id=>!DEF[id].evo&&DEF[id].race===d.evo&&counts[id]>=2);
    const add=(d,n)=>{n=Math.min(n,3-(counts[d.id]||0),CAP-(per[d.e]||0));if(d.t==='s')n=Math.min(n,8-spells);if(n<=0)return 0;
      counts[d.id]=(counts[d.id]||0)+n;per[d.e]=(per[d.e]||0)+n;if(d.t==='s')spells+=n;return n};
    const best=(f)=>DEFS.filter(d=>f(d)&&baseOK(d)&&(counts[d.id]||0)<3).sort((x,y)=>val[y.id]-val[x.id]);
    for(const e of shuffle([...civs])){
      for(const [f,n] of [[d=>d.cost<=2,3],[d=>d.cost>=3&&d.cost<=4,2],[d=>d.cost>=5,2]]){
        let need=n;
        for(const d of best(d=>d.e===e&&f(d))){if(need<=0)break;need-=add(d,need)}
      }
    }
    let tot=()=>Object.values(counts).reduce((a,b)=>a+b,0);
    for(const d of best(d=>d.cost<=4)){if(tot()>=DECK_SIZE)break;add(d,Math.min(2,DECK_SIZE-tot()))}
    for(const d of best(()=>true)){if(tot()>=DECK_SIZE)break;add(d,DECK_SIZE-tot())}
    let trig=0;for(const id in counts)if(DEF[id].trig)trig+=counts[id];
    if(tot()===DECK_SIZE&&civs.every(e=>(per[e]||0)>=7)&&trig>=5){
      const ids=[];for(const id in counts)for(let i=0;i<counts[id];i++)ids.push(id);
      return {n:'Random five-civilization deck',ids,counts};
    }
  }
  const pr=PRESETS[0];return {n:pr.n,ids:presetIds(pr.civ),counts:null};
}
