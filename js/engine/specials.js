/* ---------- abilities implemented by name ---------- */
// Printed abilities too particular to describe in general wording. The adapter records them
// as {k:'x', f:name} (card-catalog.js, cardFixes); each runs with its controller p, the effect
// e and the source card. Choices go through pickCard/chooseEffect, so they work the same for
// the player on this device, the computer and an online opponent.
const yesNo=(p,title,text,ai)=>chooseEffect(p,title,text,[{label:'Yes',val:true,main:1},{label:'No',val:false}],ai);
const strongest=cards=>cards.slice().sort((a,b)=>power(b)-power(a))[0];
const weakest=cards=>cards.slice().sort((a,b)=>power(a)-power(b))[0];
// Choose up to n cards one at a time ("up to 2", "any number"); stops when the chooser skips.
async function pickUpTo(p,cards,n,msg,{hidden=false,aiPick,aiCount=n}={}){
  const out=[];
  for(let k=0;k<n;k++){
    const left=cards.filter(c=>!out.includes(c));
    if(!left.length||p.ai&&k>=aiCount)break;
    const c=await pickCard(p,left,`${msg} (${k} chosen)`,{optional:true,hidden,aiPick});
    if(!c)break;out.push(c);
  }
  return out;
}
const SPECIALS={
  // Armored Warrior Quelos
  async quelos(p,e,src){
    const o=opp(p),nonFire=q=>q.mana.filter(m=>!civsOf(m).includes('fire'));
    const mine=await pickCard(p,nonFire(p),`${src.n}: Put a non-fire card from your mana zone into your graveyard.`,{aiPick:aiCheapest});
    if(mine)manaToGy(p,mine,p);
    const theirs=await pickCard(o,nonFire(o),`${src.n}: Put a non-fire card from your mana zone into your graveyard.`,{aiPick:aiCheapest});
    if(theirs)manaToGy(o,theirs,p);
  },
  // Mega Detonator
  async megaDetonator(p,e,src){
    const ready=p.bz.filter(c=>canAttackAnything(c,p)).length;
    const gone=await pickUpTo(p,p.hand.slice(),p.hand.length,`${src.n}: Discard any number of cards`,{aiPick:aiCheapest,aiCount:Math.min(ready,Math.max(0,p.hand.length-2))});
    gone.forEach(c=>{discardCard(p,c);log(`${V(p,'You discard','Opponent discards')} ${c.n}.`)});
    const own=p.bz.slice(),n=Math.min(gone.length,own.length);
    const chosen=n>=own.length?own:[];
    while(chosen.length<n){const c=await pickCard(p,own.filter(x=>!chosen.includes(x)),`${src.n}: Choose a creature to get "double breaker" (${chosen.length+1} of ${n}).`,{aiPick:strongest});if(!c)break;chosen.push(c)}
    for(const c of chosen){c.tmp=mergeTraits(c.tmp||{},{br:2});log(`${c.n} gets "double breaker" until the end of the turn.`)}
    await flushFx();
  },
  // Brutal Charge: at the end of the turn, a creature for each shield your creatures broke.
  async brutalCharge(p,e,src){
    const n=p.brokeShields||0;
    if(!n){log(`${src.n}: no shields were broken this turn.`);return}
    const taken=await pickUpTo(p,p.deck.filter(c=>c.t==='c'),n,`${src.n}: Take a creature from your deck`,{aiPick:aiDearest});
    for(const c of taken){p.deck.splice(p.deck.indexOf(c),1);p.hand.push(c)}
    log(taken.length?`${V(p,'You take','Opponent takes')} ${taken.map(c=>c.n).join(', ')} from the deck.`:`${src.n}: nothing taken.`);
    shuffle(p.deck);
  },
  // Battleship Mutant
  async battleship(p,e,src){
    for(const c of p.bz)if(civsOf(c).includes('darkness')){c.boost=(c.boost||0)+4000;c.tmp=mergeTraits(c.tmp||{},{br:2,battleDie:1})}
    log(`${V(p,'Your','The opponent\'s')} darkness creatures get +4000 power and "double breaker", and are destroyed after any battle this turn.`);
  },
  // Trenchdive Shark
  async trenchdive(p,e,src){
    const added=await pickUpTo(p,p.hand.slice(),2,`${src.n}: You may add cards from your hand to your shields`,{aiCount:0});
    if(!added.length){log(`${src.n}: no cards added.`);return}
    for(const c of added){p.hand.splice(p.hand.indexOf(c),1);p.sh.push(c)}
    labelShields();
    const back=[];
    while(back.length<added.length&&p.sh.length>back.length){
      const s=await pickCard(p,p.sh.filter(x=>!back.includes(x)),`${src.n}: Choose a shield to put into your hand (${back.length+1} of ${added.length}).`,{hidden:true,aiPick:aiRandom});
      if(!s)break;back.push(s);
    }
    for(const s of back){p.sh.splice(p.sh.indexOf(s),1);delete s.faceUp;p.hand.push(s)}
    log(`${V(p,'You swap','Opponent swaps')} ${added.length===1?'a card':added.length+' cards'} between hand and shields.`);
  },
  // Kachua, Keeper of the Icegate
  async kachua(p,e,src){
    const c=await pickCard(p,p.deck.filter(x=>x.t==='c'&&!x.evo&&dragonRace(x)),`${src.n}: You may put a creature that has Dragon in its race from your deck into the battle zone.`,{optional:true,aiPick:aiDearest});
    if(c){p.deck.splice(p.deck.indexOf(c),1);shuffle(p.deck);c.tmp=mergeTraits(c.tmp||{},{speed:1});await enterBattle(p,c,null);
      (G.later||(G.later=[])).push({p,fx:[JSON.stringify({k:'x',f:'destroyUid',uid:c.uid,x:`Destroy ${c.n}.`})],src});
      log(`${c.n} has "speed attacker" and is destroyed at the end of the turn.`)}
    else{shuffle(p.deck);log(`${V(p,'You find','Opponent finds')} nothing to take.`)}
  },
  async destroyUid(p,e,src){const c=p.bz.find(x=>x.uid===e.uid);if(c){anim(c,'die');render();await sleep(300);destroy(p,c)}},
  // Solar Grass
  async untapExceptName(p,e,src){p.bz.forEach(c=>{if(c.n!==src.n)c.tapped=false});log(`${V(p,'Your','The opponent\'s')} creatures except ${src.n}s untap.`)},
  // Furious Onslaught
  async onslaught(p,e,src){
    const hit=p.bz.filter(c=>hasRace(c,'Dragonoid'));
    for(const c of hit){c.boost=(c.boost||0)+4000;c.tmp=mergeTraits(c.tmp||{},{br:2,addRaces:['Armored Dragon']})}
    log(hit.length?`${hit.map(c=>c.n).join(', ')} become${hit.length===1?'s':''} Armored Dragons with +4000 power and "double breaker" until the end of the turn.`:`${src.n} affects no creatures.`);
  },
  // Petrova, Channeler of Suns
  async petrova(p,e,src){
    const opts=raceOptions(p).filter(r=>r!=='Mecha Del Sol');
    if(!opts.length){log(`${src.n}: no race to choose.`);return}
    const r=await chooseEffect(p,src.n,'Choose a race other than Mecha Del Sol. Each creature of that race gets +4000 power.',opts.slice(0,12).map((r,i)=>({label:r,val:r,main:i===0})),opts[0]);
    src.chosenRace=opts.includes(r)?r:opts[0];
    log(`${V(p,'You choose','Opponent chooses')} ${src.chosenRace}. Each ${src.chosenRace} gets +4000 power.`);
  },
  // Aqua Master: a face-up shield stays face up while it's in the shield zone.
  async faceUpOne(p,e,src){
    const o=opp(p);labelShields();
    const s=await pickCard(p,o.sh.filter(x=>!x.faceUp),`${src.n}: Choose one of your opponent's shields to turn face up.`,{hidden:true,aiPick:aiRandom});
    if(s){s.faceUp=true;log(`Shield ${s.shL} is turned face up: ${s.n}.`)}
  },
  // Balesk Baj
  async extraTurn(p,e,src){p.extraTurns=(p.extraTurns||0)+1;log(`${V(p,'You','The opponent')} will take an extra turn after this one.`)},
  // Hokira: "whenever one of your creatures of that race would be destroyed this turn, return it to your hand instead".
  async hokira(p,e,src){p.turnFx={...p.turnFx,hokira:[...((p.turnFx&&p.turnFx.hokira)||[]),e.race]};log(`This turn, ${V(p,'your','the opponent\'s')} ${e.race}s return to hand instead of being destroyed.`)},
  // Slash Charger
  async slashCharger(p,e,src){
    const o=opp(p);
    const side=await chooseEffect(p,src.n,"Search whose deck?",[{label:"Your opponent's deck",val:1,main:1},{label:'Your deck',val:0}],1);
    const q=side===0?p:o;
    const c=await pickCard(p,q.deck.slice(),`${src.n}: You may put a card from that deck into its owner's graveyard.`,{optional:true,aiPick:aiDearest});
    if(c){q.deck.splice(q.deck.indexOf(c),1);q.gy.push(c);log(`${c.n} goes from ${whose(q)} deck to the graveyard.`)}
    shuffle(q.deck);
  },
  // Storm Wrangler: the chosen blocker blocks it if able; no other creature can.
  async stormLure(p,e,src){
    const o=opp(p),cands=o.bz.filter(b=>!b.tapped&&T(b).block);
    if(!cands.length)return;
    const b=await pickCard(p,cands,`${src.n}: You may choose an untapped blocker. It blocks ${src.n} if able, and no other creature can.`,{optional:true,aiPick:cs=>{const w=weakest(cs);return power(w)<atkPow(src)+3000?w:null}});
    if(b&&o.bz.includes(b)){src.tmp=mergeTraits(src.tmp||{},{lureBlocker:b.uid});log(`${b.n} must block ${src.n} if able.`)}
  },
  // Tanzanyte, the Awakener
  async tanzanyte(p,e,src){
    const c=await pickCard(p,p.gy.filter(x=>x.t==='c'),`${src.n}: Choose a creature in your graveyard. All creatures with that name return to your hand.`,{aiPick:cs=>{const n=x=>cs.filter(y=>y.n===x.n).length;return cs.slice().sort((a,b)=>n(b)-n(a)||b.cost-a.cost)[0]}});
    if(!c)return;
    const all=p.gy.filter(x=>x.t==='c'&&x.n===c.n);all.forEach(x=>{p.gy.splice(p.gy.indexOf(x),1);p.hand.push(x)});
    log(`${all.length} ${c.n}${all.length===1?'':'s'} return${all.length===1?'s':''} to ${whose(p)} hand.`);
  },
  // Bombazar, Dragon of Destiny
  async bombazar(p,e,src){
    const hit=allBz(c=>c!==src&&power(c)===6000);
    if(hit.length){hit.forEach(([,c])=>anim(c,'die'));render();await sleep(450);destroyAll(hit)}
    p.extraTurns=(p.extraTurns||0)+1;p.loseAtEndOf=G.turnNo+1;
    log(`${V(p,'You take','The opponent takes')} an extra turn after this one, and loses at the end of it.`);
  },
  // Ikaz, the Spydroid
  async ikaz(p,e,src){
    const c=await pickCard(p,p.bz.slice(),`${src.n}: Choose one of your creatures. It untaps after the battle.`,{aiPick:cs=>strongest(cs.filter(x=>x.tapped).length?cs.filter(x=>x.tapped):cs)});
    if(c)(G.postBattle||(G.postBattle=[])).push(c.uid);
  },
  // Pinpoint Lunatron: a creature in the battle zone or a card in either mana zone returns to its owner's hand.
  async pinpoint(p,e,src){
    const o=opp(p),opts=[...G.p.flatMap(q=>q.bz.map(c=>[c,q,'bz'])),...G.p.flatMap(q=>q.mana.map(c=>[c,q,'mana']))];
    if(!opts.length)return;
    const label=([c,q,z])=>`${c.n} (${q===p?'your':"opponent's"} ${z==='bz'?'battle zone':'mana zone'})`;
    const ai=opts.findIndex(([c,q,z])=>q===o&&z==='bz'&&c===strongest(o.bz))>=0?opts.findIndex(([c,q,z])=>q===o&&z==='bz'&&c===strongest(o.bz)):opts.findIndex(([,q])=>q===o);
    const i=await chooseEffect(p,src.n,'Choose a creature in the battle zone or a card in a mana zone to return to its owner\'s hand.',opts.map(([c,q,z],i)=>({label:label([c,q,z]),val:i,uid:c.uid,note:`${q===p?'Your':"Opponent's"} ${z==='bz'?'battle zone':'mana zone'}`})),Math.max(0,ai));
    const [c,q,z]=opts[Number.isInteger(i)&&opts[i]?i:0];
    if(z==='bz')bounce(q,c);else{q.mana.splice(q.mana.indexOf(c),1);c.tapped=false;q.hand.push(c);log(`${c.n} returns from ${whose(q)} mana zone to hand.`)}
  },
  // Transmogrify
  async transmogrify(p,e,src){
    const all=G.p.flatMap(q=>q.bz);if(!all.length)return;
    const c=await pickCard(p,all,`${src.n}: Destroy a creature. Its owner reveals cards until a non-evolution creature and puts it into the battle zone.`,{aiPick:cs=>strongest(cs.filter(x=>opp(p).bz.includes(x)))||cs[0]});
    if(!c)return;
    const q=ownerOf(c);anim(c,'die');render();await sleep(300);destroy(q,c);await flushFx();
    if(!q.gy.includes(c)||G.over)return;
    const shown=[];
    while(q.deck.length){
      const top=q.deck.pop();shown.push(top.n);
      if(top.t==='c'&&!top.evo){log(`${V(q,'You reveal','Opponent reveals')} ${shown.join(', ')}.`);await enterBattle(q,top,null);return}
      q.gy.push(top);
    }
    log(`${V(q,'You reveal','Opponent reveals')} ${shown.join(', ')||'nothing'}; no creature to put into the battle zone.`);
    deckOut();
  },
  // Zaltan: discard up to 2; for each, return a creature to its owner's hand.
  async zaltan(p,e,src){
    const o=opp(p),gone=await pickUpTo(p,p.hand.slice(),2,`${src.n}: You may discard up to 2 cards`,{aiPick:aiCheapest,aiCount:Math.min(o.bz.length,p.hand.length>3?2:p.hand.length>1?1:0)});
    gone.forEach(c=>{discardCard(p,c);log(`${V(p,'You discard','Opponent discards')} ${c.n}.`)});
    for(let k=0;k<gone.length;k++){
      const c=await pickCard(p,G.p.flatMap(q=>q.bz),`${src.n}: Choose a creature to return to its owner's hand (${k+1} of ${gone.length}).`,{aiPick:cs=>strongest(cs.filter(x=>o.bz.includes(x)))||cs[0]});
      if(c)bounce(ownerOf(c),c);
    }
    await flushFx();
  },
  // Gigandura
  async gigandura(p,e,src){
    const o=opp(p);
    if(!o.hand.length){log(`${src.n}: your opponent's hand is empty.`);return}
    // A player at this screen picks both cards in one swap view; the computer and a remote player
    // pick in turn. The card just put into the mana zone isn't offered back, as that undoes the swap,
    // unless it's the only card there.
    let c,m;
    if(!p.ai&&!p.remote){
      const r=await askSwap({title:src.n,text:"You see your opponent's hand. You may swap one card from it with one card from their mana zone.",
        from:{label:'From their hand, to their mana zone',dest:'their mana zone',cards:o.hand.slice()},
        to:{label:'From their mana zone, to their hand',dest:'their hand',cards:o.mana.slice(),empty:'Their mana zone is empty, so the card you put there comes straight back.'},card:src});
      if(!r||!o.hand.includes(r[0]))return;
      [c,m]=r;
    }else{
      c=await pickCard(p,o.hand.slice(),`${src.n}: You see your opponent's hand. You may choose a card to put into his mana zone.`,{optional:true,aiPick:aiDearest});
      if(!c)return;
    }
    o.hand.splice(o.hand.indexOf(c),1);toMana(o,[c]);log(`${c.n} goes from ${whose(o)} hand to the mana zone.`);
    if(!m||!o.mana.includes(m)){const others=o.mana.filter(x=>x!==c);m=p.ai||p.remote?await pickCard(p,others.length?others:[c],`${src.n}: Choose a card in his mana zone to put into his hand.`,{aiPick:aiCheapest}):c}
    if(m){o.mana.splice(o.mana.indexOf(m),1);m.tapped=false;o.hand.push(m);log(`${m.n} returns from ${whose(o)} mana zone to hand.`)}
  },
  // Spinal Parasite: at the start of the opponent's turn, he chooses a creature that attacks if able.
  async spinal(p,e,src){
    const o=opp(p),cands=o.bz.filter(c=>canAttackAnything(c,o));
    if(!cands.length)return;
    const c=await pickCard(o,cands,`${src.n}: Choose one of your creatures. It attacks this turn if able.`,{aiPick:weakest});
    if(c){c.tmp=mergeTraits(c.tmp||{},{mustAtk:1});log(`${c.n} attacks this turn if able.`)}
  },
  // Bubble Scarab
  async bubble(p,e,src){
    const t=p.bz.find(x=>x.uid===e.uid);
    if(!t||!p.hand.length)return;
    const att=G.attacking,helps=!!att&&power(t)<=atkPow(att)&&power(t)+3000>atkPow(att);
    if(!(await yesNo(p,src.n,`Discard a card so ${t.n} gets +3000 power until the end of the turn?`,helps&&p.hand.length>1)))return;
    const c=await pickCard(p,p.hand.slice(),`${src.n}: Discard a card.`,{aiPick:aiCheapest});
    if(!c)return;
    discardCard(p,c);t.boost=(t.boost||0)+3000;log(`${V(p,'You discard','Opponent discards')} ${c.n}; ${t.n} gets +3000 power.`);
  },
  // Soulswap
  async soulswap(p,e,src){
    const all=G.p.flatMap(q=>q.bz);if(!all.length)return;
    const c=await pickCard(p,all,`${src.n}: Choose a creature to put into its owner's mana zone.`,{aiPick:cs=>strongest(cs.filter(x=>opp(p).bz.includes(x)))||cs[0]});
    if(!c)return;
    const q=ownerOf(c);toMana(q,leaveBz(q,c));log(`${c.n} goes to ${whose(q)} mana zone.`);
    const cands=q.mana.filter(m=>m.t==='c'&&!m.evo&&m.cost<=q.mana.length);
    if(!cands.length){log(`${src.n}: no creature in that mana zone can come out.`);return}
    const m=await pickCard(p,cands,`${src.n}: Choose a creature in that mana zone to put into the battle zone.`,{aiPick:q===p?aiDearest:weakest});
    if(m){q.mana.splice(q.mana.indexOf(m),1);m.tapped=false;await enterBattle(q,m,null)}
  },
  // Klujadras
  async klujadras(p,e,src){
    for(const q of [p,opp(p)]){const n=q.bz.filter(x=>x.waveStriker).length;if(n){draw(q,n);log(`${V(q,'You draw','Opponent draws')} ${n} card${n===1?'':'s'}.`)}}
  },
  // Miraculous Plague: the opponent keeps one of each pair.
  async miraculousPlague(p,e,src){
    const o=opp(p);
    const keepOne=async(cards,what,lose)=>{
      if(!cards.length)return;
      const keep=cards.length===1?cards[0]:await pickCard(o,cards,`${src.n}: Choose the ${what} to return to your hand. The other ${lose}.`,{aiPick:aiDearest});
      for(const c of cards)if(c===keep){if(o.bz.includes(c))bounce(o,c);else{o.mana.splice(o.mana.indexOf(c),1);c.tapped=false;o.hand.push(c);log(`${c.n} returns from ${whose(o)} mana zone to hand.`)}}
      else if(o.bz.includes(c)){anim(c,'die');destroy(o,c)}else manaToGy(o,c,p);
    };
    const bz=o.bz.length<=2?o.bz.slice():[];
    while(bz.length<2){const c=await pickCard(p,o.bz.filter(x=>!bz.includes(x)),`${src.n}: Choose 2 of your opponent's creatures (${bz.length+1} of 2).`,{aiPick:strongest});if(!c)break;bz.push(c)}
    await keepOne(bz,'creature','is destroyed');await flushFx();
    const mana=o.mana.length<=2?o.mana.slice():[];
    while(mana.length<2){const c=await pickCard(p,o.mana.filter(x=>!mana.includes(x)),`${src.n}: Choose 2 cards in your opponent's mana zone (${mana.length+1} of 2).`,{aiPick:aiDearest});if(!c)break;mana.push(c)}
    await keepOne(mana,'card','goes to your graveyard');
  },
  // Miraculous Rebirth
  async miraculousRebirth(p,e,src){
    const o=opp(p),t=await pickCard(p,o.bz.filter(c=>power(c)<=5000),`${src.n}: Destroy one of your opponent's creatures that has power 5000 or less.`,{aiPick:strongest});
    if(!t){log(`${src.n}: no target.`);return}
    anim(t,'die');render();await sleep(300);destroy(o,t);await flushFx();
    if(!o.gy.includes(t))return;
    const c=await pickCard(p,p.deck.filter(x=>x.t==='c'&&!x.evo&&x.cost===t.cost),`${src.n}: You may put a creature that costs ${t.cost} from your deck into the battle zone.`,{optional:true,aiPick:aiDearest});
    if(c){p.deck.splice(p.deck.indexOf(c),1);shuffle(p.deck);await enterBattle(p,c,null)}else shuffle(p.deck);
  },
  // Heavyweight Dragon
  async heavyweight(p,e,src){
    const o=opp(p),max=power(src);
    const chosen=await pickUpTo(p,o.bz.filter(c=>c.tapped),2,`${src.n}: Choose up to 2 of your opponent's tapped creatures`,{aiPick:cs=>{const left=max-1-0;return strongest(cs.filter(c=>power(c)<left))||null}});
    const sum=chosen.reduce((s,c)=>s+power(c),0);
    if(!chosen.length)return;
    if(sum<max){chosen.forEach(c=>anim(c,'die'));render();await sleep(300);destroyAll(chosen.map(c=>[o,c]))}
    else log(`${src.n}: their total power (${sum}) isn't less than ${max}; nothing happens.`);
  },
  // Miraculous Truce
  async truce(p,e,src){
    const o=opp(p),civs=Object.keys(CIV),count=e=>o.bz.filter(c=>civsOf(c).includes(e)).length+o.mana.filter(c=>civsOf(c).includes(e)).length;
    const best=civs.slice().sort((a,b)=>count(b)-count(a))[0];
    const civ=await chooseEffect(p,src.n,"Choose a civilization. Until the start of your next turn, creatures of that civilization can't attack you.",civs.map(e=>({label:CIV[e].n,val:e,main:e===best})),best);
    p.truce=civs.includes(civ)?civ:best;
    log(`Until the start of ${V(p,'your','the opponent\'s')} next turn, ${CIV[p.truce].n} creatures can't attack ${V(p,'you','the opponent')}.`);
  },
  // Roulette of Ruin
  async roulette(p,e,src){
    const nums=[...Array(11).keys()],mine=n=>p.hand.filter(c=>c.cost===n).length;
    const pick=nums.slice(1).sort((a,b)=>mine(a)-mine(b)||Math.abs(a-4)-Math.abs(b-4))[0];
    const n=await chooseEffect(p,src.n,'Choose a number. Each player discards every card in his hand that costs that much.',nums.map(v=>({label:String(v),val:v,main:v===pick})),pick);
    const v=nums.includes(n)?n:pick;
    log(`${V(p,'You choose','Opponent chooses')} ${v}.`);
    for(const q of [p,opp(p)]){
      const hit=q.hand.filter(c=>c.cost===v);
      log(`${V(q,'You show','Opponent shows')} the hand and discards ${hit.length?hit.map(c=>c.n).join(', '):'nothing'}.`);
      hit.forEach(c=>discardCard(q,c));
    }
    await flushFx();
  },
  // Ularus, Punishment Elemental
  async ularus(p,e,src){
    const n=p.bz.length;labelShields();
    for(let k=0;k<n;k++){
      const cands=G.p.flatMap(q=>q.sh.filter(s=>!s.faceUp));
      if(!cands.length)break;
      const s=await pickCard(p,cands,`${src.n}: You may turn a shield face up (${k+1} of ${n}).`,{optional:true,hidden:true,aiPick:cs=>aiRandom(cs.filter(x=>opp(p).sh.includes(x)).length?cs.filter(x=>opp(p).sh.includes(x)):cs)});
      if(!s)break;
      s.faceUp=true;log(`${V(G.p.find(q=>q.sh.includes(s)),'Your','The opponent\'s')} shield ${s.shL} is turned face up: ${s.n}.`);
    }
  },
  // Wingeye Moth
  async wingeye(p,e,src){
    const o=opp(p);
    if(!p.bz.some(c=>o.bz.every(x=>power(c)>power(x)))||!p.deck.length)return;
    if(await yesNo(p,src.n,'One of your creatures is stronger than each of your opponent\'s. Draw an extra card?',p.deck.length>5)){draw(p,1);log(`${V(p,'You draw','Opponent draws')} an extra card.`)}
  },
  // Super Dragon Machine Dolzark: "whenever one of your other creatures that has Dragon in its race attacks".
  async dolzark(p,e,src){
    const att=G.attacking,o=opp(p);
    if(!att||att===src||!dragonRace(att)||!p.bz.includes(att))return;
    const c=await pickCard(p,o.bz.filter(x=>power(x)<=5000),`${src.n}: You may put one of your opponent's creatures that has power 5000 or less into his mana zone.`,{optional:true,aiPick:strongest});
    if(c){toMana(o,leaveBz(o,c));log(`${c.n} goes to ${whose(o)} mana zone.`)}
  },
  // Neve, the Leveler
  async neve(p,e,src){
    const o=opp(p),extra=o.bz.length-p.bz.length;
    if(extra<=0){log(`${src.n}: the condition isn't met.`);return}
    const taken=await pickUpTo(p,p.deck.filter(c=>c.t==='c'),extra,`${src.n}: Take a creature from your deck`,{aiPick:aiDearest});
    for(const c of taken){p.deck.splice(p.deck.indexOf(c),1);p.hand.push(c)}
    log(taken.length?`${V(p,'You take','Opponent takes')} ${taken.map(c=>c.n).join(', ')} from the deck.`:`${src.n}: nothing taken.`);
    shuffle(p.deck);
  },
  // Live and Breathe (from playCard): a creature with the same name may follow from the deck.
  async liveBreathe(p,e,src){
    const cands=p.deck.filter(c=>c.n===e.n&&c.t==='c'&&!c.evo);
    if(!cands.length)return;
    const c=await pickCard(p,cands,`Live and Breathe: You may put another ${e.n} from your deck into the battle zone.`,{optional:true,aiPick:cs=>cs[0]});
    shuffle(p.deck);
    if(c){p.deck.splice(p.deck.indexOf(c),1);await enterBattle(p,c,null)}
  },
  // Warped Lunatron (from beginTurn): tap 2 mana to untap one creature, as many times as wanted.
  async warped(p,e,src){
    const free=p.mana.filter(m=>!m.tapped),tapped=p.bz.filter(c=>c.tapped),max=Math.min(Math.floor(free.length/2),tapped.length);
    if(!max)return;
    const n=await chooseEffect(p,'Warped Lunatron','Creatures don\'t untap. You may tap 2 cards in your mana zone for each creature you untap.',Array.from({length:max+1},(_,k)=>({label:k?`Untap ${k} (tap ${2*k} mana)`:'Untap none',val:k,main:k===0})),Math.min(max,1));
    const k=Number.isInteger(n)?Math.max(0,Math.min(max,n)):0;
    for(let i=0;i<k;i++){
      const c=await pickCard(p,p.bz.filter(x=>x.tapped),`Warped Lunatron: Choose a creature to untap (${i+1} of ${k}).`,{aiPick:strongest});
      if(!c)break;c.tapped=false;
      p.mana.filter(m=>!m.tapped).slice(0,2).forEach(m=>m.tapped=true);
      log(`${c.n} untaps.`);
    }
  }
};
// Whether resolving an ability by name would help its controller now (used by the AI).
const SPECIAL_USEFUL={
  megaDetonator:p=>p.hand.length>1&&p.bz.some(c=>canAttackPlayer(c,p)),
  trenchdive:()=>false,
  transmogrify:p=>opp(p).bz.some(c=>power(c)>=6000),
  soulswap:p=>opp(p).bz.some(c=>power(c)>=5000),
  miraculousRebirth:p=>opp(p).bz.some(c=>power(c)<=5000),
  miraculousPlague:p=>opp(p).bz.length>=1,
  heavyweight:p=>opp(p).bz.some(c=>c.tapped&&power(c)<9000),
  slashCharger:p=>opp(p).deck.length>0,
  roulette:p=>opp(p).hand.length>1,
  truce:p=>opp(p).bz.length>0,
  battleship:p=>p.bz.filter(c=>civsOf(c).includes('darkness')&&canAttackPlayer(c,p)).length>=2,
  onslaught:p=>p.bz.some(c=>hasRace(c,'Dragonoid')),
  bombazar:()=>false,
  tanzanyte:p=>p.gy.some(c=>c.t==='c'),
  kachua:p=>p.deck.some(c=>c.t==='c'&&dragonRace(c)),
  pinpoint:p=>opp(p).bz.length>0
};
