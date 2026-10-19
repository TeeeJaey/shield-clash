const CIV={
  fire:{n:'Fire',c:'#A32D2D'},water:{n:'Water',c:'#185FA5'},nature:{n:'Nature',c:'#3B6D11'},
  light:{n:'Light',c:'#854F0B'},darkness:{n:'Dark',c:'#3C3489'}
};
/* ---------- card palette and civilization emblems ---------- */
const PAL={
  fire:{frame:'#A32D2D',light:'#FCEBEB',mid:'#F09595',deep:'#501313',soft:'#F7C1C1'},
  water:{frame:'#185FA5',light:'#E6F1FB',mid:'#85B7EB',deep:'#042C53',soft:'#B5D4F4'},
  nature:{frame:'#3B6D11',light:'#EAF3DE',mid:'#97C459',deep:'#173404',soft:'#C0DD97'},
  light:{frame:'#854F0B',light:'#FAEEDA',mid:'#FAC775',deep:'#412402',soft:'#FCE3B4'},
  darkness:{frame:'#3C3489',light:'#EEEDFE',mid:'#AFA9EC',deep:'#26215C',soft:'#CECBF6'},
  unknown:{frame:'#68717d',light:'#edf0f3',mid:'#bbc3cc',deep:'#29323d',soft:'#d5dbe1'}
};
const EMB={
 fire:'M20 3 C26 11 31 16 29 26 C28 33 23 37 20 37 C14 37 9 32 10 25 C11 19 15 17 16 11 C19 15 21 17 22 20 C23 15 22 9 20 3 Z',
 water:'M20 3 C26 13 31 20 31 26 C31 32 26 37 20 37 C14 37 9 32 9 26 C9 20 14 13 20 3 Z',
 nature:'M7 33 C7 16 18 6 35 6 C35 23 24 33 7 33 Z',
 light:'M20 11 a9 9 0 1 0 0.1 0 Z M20 0 L22 7 L18 7 Z M20 40 L22 33 L18 33 Z M0 20 L7 18 L7 22 Z M40 20 L33 18 L33 22 Z M6 6 L11 10 L10 11 Z M34 34 L29 30 L30 29 Z M34 6 L30 11 L29 10 Z M6 34 L10 29 L11 30 Z',
 darkness:'M28 6.1 A16 16 0 1 0 28 33.9 A14 14 0 0 1 28 6.1 Z'
};
const FXT={
  bounce:"Return an enemy creature to its owner's hand.",kill:'Destroy an enemy creature.',
  killTapped:'Destroy a tapped enemy creature.',
  ramp:'Put the top card of your deck into your mana zone.',ramp2:'Put the top 2 cards of your deck into your mana zone.',
  tapall:"Tap all your opponent's creatures.",tapone:'Tap an enemy creature.',
  draw:'Draw a card.',draw2:'Draw 2 cards.',draw3:'Draw 3 cards.',
  discard:'Your opponent discards a random card.',discard2:'Your opponent discards 2 random cards.',
  shieldadd:'Add the top card of your deck to your shields.',shield2:'Add the top 2 cards of your deck to your shields.',
  recover:'Return your best creature from your graveyard to your hand.',
  manaburn:"Put a random card from your opponent's mana zone into their graveyard.",
  manaToHand:'Return a card from your mana zone to your hand.',manaToGy:'Put a card from your mana zone into your graveyard.',
  manaToGy2:'Put 2 cards from your mana zone into your graveyard.',shieldToGy:'Put one of your shields into your graveyard.',
  oppShieldToGy:"Put one of your opponent's shields into their graveyard.",destroyOwn:'Destroy one of your creatures.',
  tapSelf:'Tap this creature.',destroySelf:'Destroy this creature.',bounceSelf:'Return this creature to your hand.',
  boost3000:'This creature gets +3000 power until the end of the turn.',
  oppDestroysOwn:'Your opponent chooses one of their creatures and destroys it.',oppOwnToMana:'Your opponent puts one of their creatures into their mana zone.',
  oppManaToHand:'Your opponent returns a card from their mana zone to their hand.',oppManaToHand2:'Your opponent returns 2 cards from their mana zone to their hand.',
  oppDiscards:'Your opponent chooses and discards a card.',oppDiscards2:'Your opponent chooses and discards 2 cards.',
  oppManaToGy:"Put a card from your opponent's mana zone into their graveyard.",oppManaToGy2u:"Put up to 2 cards from your opponent's mana zone into their graveyard.",
  sweepBlockers:'Destroy all creatures that have blocker.',tapBlockers:"Tap all your opponent's blockers.",bounceBlockers:"Return all blockers to their owners' hands.",
  discardSelfAll:'Discard your hand.',oppOwnToHand:'Your opponent returns one of their creatures to their hand.',oppManaChooseGy:'Your opponent puts a card from their mana zone into their graveyard.',discardSelfRandom:'Discard a card at random.',bounceAll2000:"Return all creatures that have 2000 power or less to their owners' hands.",peekShield:"Look at one of your opponent's shields."
};
const fxList=f=>f?(Array.isArray(f)?f:[f]):[];
// A card's civilizations: one, or two for a multicolored card.
const civsOf=c=>c.e2?[c.e,c.e2]:[c.e];
// Can evolution d go on creature x? Races are printed singly or combined ("Survivor/Guardian").
const racesOf=c=>(c.race||'').split('/').map(s=>s.trim()).filter(Boolean);
function evolvesOn(d,x){
  if(x.evoBaseAny)return true;
  const rs=racesOf(x);
  if(d.evoDragon)return rs.some(r=>/\bDragon\b/.test(r));
  return (d.vortex||d.evoRaces||[d.evo]).some(r=>rs.includes(r));
}
function fxText(f){
  if(f.startsWith('optional:'))return 'You may '+fxText(f.slice(9)).replace(/^./,s=>s.toLowerCase()).replace(/^you may /,'');
  if(f.charAt(0)==='{')return JSON.parse(f).x;
  const up=/^drawUp(\d+)$/.exec(f);if(up)return `Draw up to ${up[1]} card${up[1]==='1'?'':'s'}.`;
  if(f==='draw1')return 'Draw a card.';
  if(f==='bounceAny')return "Return a creature to its owner's hand.";
  if(f==='killUntapped')return 'Destroy an untapped enemy creature.';
  if(f==='killBlocker')return 'Destroy an enemy blocker.';
  if(f==='discardAll')return 'Your opponent discards their hand.';
  if(f==='discardShield')return 'Put one of your shields into your graveyard without using its shield trigger.';
  if(f.startsWith('grantOwn:'))return `Each of your creatures gets ${grantText(JSON.parse(f.slice(9)))} until the end of the turn.`;
  const own=/^destroyOwnP(\d+)$/.exec(f);if(own)return `Destroy one of your creatures with ${own[1]} power or less.`;
  const mv=/^move:(gy|mana|hand)>(hand|mana|sh):(card|creature|spell)-(\w*)-(\d*):(\d)(u?)$/.exec(f);
  if(mv){
    const Z={gy:'graveyard',mana:'mana zone',hand:'hand',sh:'shields face down'},n=+mv[6];
    const what=[mv[4],mv[3]+(n>1?'s':'')].filter(Boolean).join(' ')+(mv[5]?` that cost${n>1?'':'s'} ${mv[5]} or more`:'');
    const verb=mv[2]==='sh'?'Add':mv[2]==='hand'?'Return':'Put';
    return `${verb} ${mv[7]?'up to '+n:n>1?n:'a'} ${what} from your ${Z[mv[1]]} ${mv[2]==='hand'?'to':'into'} your ${Z[mv[2]]}.`;
  }
  const all=/^sweepAll(\d+)$/.exec(f);if(all)return `Destroy all creatures with ${all[1]} power or less.`;
  const m=/^(burn|sweep)(\d+)$/.exec(f);
  if(m)return m[1]==='burn'?`Destroy an enemy creature with ${m[2]} power or less.`:`Destroy all enemy creatures with ${m[2]} power or less.`;
  return FXT[f];
}
const fxDesc=f=>fxList(f).map(fxText).join(' ');
// "+3000 power and double breaker"
const TRAIT_NAMES={block:'blocker',speed:'speed attacker',slayer:'slayer',unbl:"can't be blocked",hunts:'can attack untapped creatures'};
function grantText(g){
  const t=g.traits||{},parts=g.power?[`+${g.power} power`]:[];
  if(t.pa)parts.push(`power attacker +${t.pa}`);
  if(t.br)parts.push(t.br===3?'triple breaker':'double breaker');
  for(const [k,n] of Object.entries(TRAIT_NAMES))if(t[k])parts.push(n);
  return parts.join(' and ')||'a bonus';
}
