/* ---------- how to play ---------- */
let TUT=0;
const tutorialCard=id=>({ragna:DEF['dm-7'],harrier:DEF['dm-152'],drakeling:DEF['dm-7'],courier:DEF['dm-4'],oak:DEF['dm-10'],dawn:DEF['dm-1'],stalker:DEF['dm-5'],
  sprout:DEFS.find(c=>c.n==='Faerie Life'),boar:DEF['dm-9'],raider:DEFS.find(c=>c.e==='fire'&&c.cost===3&&c.t==='c'),
  beetle:DEF['dm-9'],canopy:DEFS.find(c=>c.speed),cinderclaw:DEFS.find(c=>c.p===5000&&!c.pa),badger:DEFS.find(c=>c.p===4000&&!c.pa),
  reef:DEF['dm-41'],flare:DEF['dm-98'],chief:DEF['dm-121'],evoBase:DEF['dm-19'],alpha:DEF['dm-10'],seraph:DEF['dm-1'],titan:DEF['dm-10'],devourer:DEF['dm-5']}[id]||DEF[id]||DEFS[0]);
const mini=(id,extra={})=>cardHTML({...tutorialCard(id),...extra},'',true);
const backs=(n,gone=0)=>`<div class="tshields">${Array.from({length:n},(_,i)=>`<div class="back ${i>=n-gone?'gone':''}"></div>`).join('')}</div>`;
const chip=(e,used)=>`<span class="mana ${used?'used':''}" style="--el:${CIV[e].c}">${CIV[e].n[0]}</span>`;
const TPAGES=[
 {t:'The goal',
  v:()=>`<div class="tcol">${backs(8)}<span class="tcap">Your opponent's 8 shields</span></div><span class="arrow">→</span><div class="tcol">${mini('ragna')}<span class="tcap">One more hit wins</span></div>`,
  x:`<p>Each player starts with 8 face-down shields. Break all of your opponent's shields, then attack them once more to win.</p><p>You also lose if you need to draw a card and your deck is empty, so long games have a clock.</p>`},
 {t:'Reading a card',
  v:()=>`<div class="tcard">${cardHTML(tutorialCard('harrier'),'big',true)}
    <span class="mk" style="left:-7%;top:8.5%">1</span><span class="mk" style="left:107%;top:8.5%">2</span>
    <span class="mk" style="left:107%;top:34%">3</span><span class="mk" style="left:107%;top:71%">4</span>
    <span class="mk" style="left:-7%;top:94.5%">5</span><span class="mk" style="left:107%;top:94.5%">6</span></div>`,
  x:`<div class="tkey">
    <div><span class="mk">1</span><span><b>Cost.</b> How much mana it takes to play.</span></div>
    <div><span class="mk">2</span><span><b>Name.</b></span></div>
    <div><span class="mk">3</span><span><b>Picture.</b> The frame color shows its civilization.</span></div>
    <div><span class="mk">4</span><span><b>Abilities.</b> What makes the card special.</span></div>
    <div><span class="mk">5</span><span><b>Race.</b> Matters for evolution creatures.</span></div>
    <div><span class="mk">6</span><span><b>Power.</b> Higher power wins battles. A + means it gets stronger while attacking.</span></div></div>`},
 {t:'Five civilizations',
  v:()=>['drakeling','courier','oak','dawn','stalker'].map(id=>`<div class="tcol">${mini(id)}</div>`).join(''),
  x:`<p><b>Fire</b> is fast: speed attackers and burn spells.</p><p><b>Water</b> draws cards, sends creatures back to hand, and slips past blockers.</p><p><b>Nature</b> grows extra mana and plays huge creatures.</p><p><b>Light</b> blocks, taps enemies, and adds shields.</p><p><b>Dark</b> destroys creatures, slays, and makes your opponent discard.</p>`},
 {t:'Your turn',
  v:()=>`<div class="tcol">${mini('sprout')}<span class="tcap">Charge one card as mana</span></div><span class="arrow">→</span><div class="tcol">${mini('boar')}<span class="tcap">Summon and attack</span></div>`,
  x:`<ol><li><b>Start.</b> Your mana and creatures untap, and you draw a card. Whoever goes first skips the draw on their first turn.</li>
    <li><b>Charge mana.</b> Once per turn, put any card from your hand into your mana zone.</li>
    <li><b>Play cards.</b> Summon creatures and cast spells as long as you have the mana.</li>
    <li><b>Attack.</b> Send in creatures that are ready.</li>
    <li><b>End turn.</b></li></ol>`},
 {t:'Paying with mana',
  v:()=>`<div class="tcol">${mini('raider')}<span class="tcap">Costs 3, and it's Fire</span></div><span class="arrow">=</span><div class="tcol"><div style="display:flex;gap:4px">${chip('fire')}${chip('nature')}${chip('nature')}</div><span class="tcap">3 untapped mana, at least 1 Fire</span></div>`,
  x:`<p>Every card in your mana zone counts as 1 mana of its civilization. To play a card, tap mana equal to its cost, and at least one must match the card's civilization.</p><p>Tapped mana comes back at the start of your next turn.</p><p class="tnote">Tip: early on, charge expensive cards you can't play for a while. Keep some of each civilization in your deck's mana.</p>`},
 {t:'Creatures and attacking',
  v:()=>`<div class="tcol">${mini('beetle')}<span class="tcap">Arrives this turn</span></div><span class="arrow">→</span><div class="tcol">${mini('canopy')}<span class="tcap">Speed attacker: can attack now</span></div>`,
  x:`<p>A new creature needs a turn to settle in, shown by the Arriving tag. Next turn it can attack. Speed attackers skip the wait.</p><p>An attack goes at your opponent's shields, or at one of their <b>tapped</b> creatures. Untapped creatures are safe.</p><p>Attacking taps your creature, which means your opponent can attack it on their turn.</p>`},
 {t:'Battles',
  v:()=>`<div class="tcol">${mini('cinderclaw')}<span class="tcap">Attacker, 5000</span></div><span class="arrow">vs</span><div class="tcol">${mini('badger',{tapped:true})}<span class="tcap">Tapped, 4000. Destroyed</span></div>`,
  x:`<p>When two creatures battle, the one with higher power wins and the loser is destroyed. If power is equal, both are destroyed.</p><p><b>Power attacker</b> adds power only while attacking. <b>Slayer</b> destroys whatever it battles, even if it loses.</p>`},
 {t:'Blockers',
  v:()=>`<div class="tcol">${mini('raider')}<span class="tcap">Attacks your shields</span></div><span class="arrow">→</span><div class="tcol">${mini('reef')}<span class="tcap">Blocker steps in</span></div>`,
  x:`<p>When an enemy creature attacks, you can tap an untapped <b>Blocker</b> to battle it instead. Your shields stay safe.</p><p>Many blockers can't attack players, so they're for defense. Creatures that <b>can't be blocked</b> ignore blockers completely.</p>`},
 {t:'Shields and triggers',
  v:()=>`<div class="tcol">${backs(8,2)}<span class="tcap">2 shields broken</span></div><span class="arrow">→</span><div class="tcol">${mini('flare')}<span class="tcap">Goes to the hand. Trigger: free!</span></div>`,
  x:`<p>A broken shield isn't lost. It goes into its owner's hand, so every hit gives your opponent another card.</p><p>If that card is a <b>shield trigger</b>, its owner can cast it for free right away. That's how a losing player can turn the game around.</p><p><b>Double</b> and <b>triple breakers</b> break 2 or 3 shields with one attack.</p>`},
 {t:'Evolution',
  v:()=>`<div class="tcol">${mini('evoBase')}<span class="tcap">A Guardian in play</span></div><span class="arrow">+</span><div class="tcol">${mini('chief')}<span class="tcap">Goes on top</span></div>`,
  x:`<p>Evolution creatures are played on top of one of your creatures of the matching race. They're cheap for their power and can attack right away.</p><p>The creature underneath becomes part of it. If the evolution is destroyed or sent back to hand, the cards underneath go with it.</p>`},
 {t:'Controls',
  v:()=>`<div class="tcol">${cardHTML(tutorialCard('alpha'),'can',true)}<span class="tcap">Blue outline: ready to use</span></div><div class="tcol">${mini('oak',{tapped:true})}<span class="tcap">Tilted: tapped</span></div>`,
  x:`<p><b>Tap a card in your hand</b> to charge it as mana or play it. Cards you can afford have a blue outline.</p><p><b>Tap a ready creature</b>, then press Attack shields, or tap a tapped enemy creature with a red outline.</p><p><b>To read a card up close</b>, long-press it or right-click it.</p><p>Press <b>End turn</b> when you're done. The game log at the bottom shows what happened.</p>`},
 {t:"You're ready",
  v:()=>`<div class="tcol">${mini('seraph')}</div><div class="tcol">${mini('titan')}</div><div class="tcol">${mini('devourer')}</div>`,
  x:`<p>Start with a preset deck or a random optimal deck. Once you know the cards, build your own in the deck builder.</p><div class="opts"><button class="main" data-act="random">Play a random deck</button><button data-act="tclose">Pick a deck</button></div>`},
];
function showTutorial(i){
  TUT=Math.max(0,Math.min(TPAGES.length-1,i));setPhase();
  const pg=TPAGES[TUT],last=TUT===TPAGES.length-1;
  $('#layer').innerHTML=`<div class="overlay" id="tutorial"><div class="dialog tut" role="dialog" aria-label="How to play">
    <div class="thead"><span class="tstep">How to play, ${TUT+1} of ${TPAGES.length}</span><button class="tclose" data-act="tclose" aria-label="Close how to play">×</button></div>
    <h2>${pg.t}</h2>
    <div class="tbody"><div class="tvis bzone">${pg.v()}</div><div class="ttxt">${pg.x}</div></div>
    <div class="tnav"><button data-act="tprev" ${TUT?'':'disabled'}>Back</button>
      <div class="tdots">${TPAGES.map((p,k)=>`<button class="${k===TUT?'on':''}" data-act="tgo" data-v="${k}" aria-label="Page ${k+1}: ${p.t}"></button>`).join('')}</div>
      ${last?`<button class="main" data-act="tclose">Done</button>`:`<button class="main" data-act="tnext">Next</button>`}</div>
  </div></div>`;
}
