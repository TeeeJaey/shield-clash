/* ---------- civilizations and card list ---------- */
const CIV={
  fire:{n:'Fire',c:'#A32D2D'},water:{n:'Water',c:'#185FA5'},nature:{n:'Nature',c:'#3B6D11'},
  light:{n:'Light',c:'#854F0B'},darkness:{n:'Dark',c:'#3C3489'}
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
  manaburn:"Put a random card from your opponent's mana zone into their graveyard."
};
const fxList=f=>f?(Array.isArray(f)?f:[f]):[];
function fxText(f){
  const m=/^(burn|sweep)(\d+)$/.exec(f);
  if(m)return m[1]==='burn'?`Destroy an enemy creature with ${m[2]} power or less.`:`Destroy all enemy creatures with ${m[2]} power or less.`;
  return FXT[f];
}
const fxDesc=f=>fxList(f).map(fxText).join(' ');
const DEFS=[];
const C=(id,n,e,cost,p,race,a={})=>DEFS.push({id,n,e,t:'c',cost,p,race,...a});
const S=(id,n,e,cost,fx,trig)=>DEFS.push({id,n,e,t:'s',cost,fx,trig});
const E=(id,n,e,cost,p,race,a={})=>C(id,n,e,cost,p,race,{evo:race,...a});

/* ===== FIRE ===== */
C('spark','Spark Goblin','fire',1,1000,'Raider',{speed:1});
C('wisp','Kindle Wisp','fire',1,1000,'Firebird',{pa:1000});
C('sprite','Ember Sprite','fire',1,1000,'Firebird',{speed:1,pa:1000});
C('scrap','Ash Scrapper','fire',2,2000,'Raider',{pa:1000});
C('bpup','Blaze Pup','fire',2,2000,'Raider',{speed:1});
C('lancer','Scorch Lancer','fire',2,1000,'Raider',{pa:3000});
C('chick','Flamewing Chick','fire',2,2000,'Firebird',{onDie:'draw'});
C('raider','Cinder Raider','fire',3,3000,'Raider',{speed:1});
C('hatch','Ember Hatchling','fire',3,3000,'Drake',{pa:1000});
C('smolder','Smoldering Brute','fire',3,4000,'Raider');
E('chief','Blaze Raider Chief','fire',3,5000,'Raider',{pa:2000});
C('drakeling','Ember Drakeling','fire',4,4000,'Drake',{pa:2000});
C('harrier','Ashwing Harrier','fire',4,2000,'Firebird',{speed:1,onAtk:'burn2000'});
C('pyroclast','Pyroclast Raider','fire',4,4000,'Raider',{speed:1});
C('cinderclaw','Cinderclaw Drake','fire',4,5000,'Drake');
C('golem','Lava Golem','fire',4,3000,'Raider',{pa:3000});
E('ascend','Firebird Ascendant','fire',4,6000,'Firebird',{br:2});
C('knuckle','Lava Knuckle','fire',5,5000,'Raider',{pa:3000,speed:1});
C('baron','Molten Fist Baron','fire',5,5000,'Raider',{onSum:'burn2000'});
C('phoenix','Phoenix Herald','fire',5,4000,'Firebird',{onDie:'shieldadd'});
C('blastwyv','Blastfire Wyvern','fire',5,6000,'Drake',{pa:2000});
E('pyrelord','Pyre Drake Lord','fire',5,8000,'Drake',{br:2,pa:2000});
C('wyrm','Magma Wyrm','fire',6,6000,'Drake',{br:2,speed:1});
C('ravager','Volcanic Ravager','fire',6,7000,'Drake',{br:2});
C('warlord','Searing Warlord','fire',6,6000,'Raider',{br:2,speed:1,pa:1000});
C('ashcapt','Ashen Wing Captain','fire',6,6000,'Firebird',{onSum:'burn4000'});
E('magmaheart','Magmaheart Dragon','fire',6,11000,'Drake',{br:3});
C('sovereign','Inferno Sovereign','fire',7,9000,'Drake',{br:3});
C('furnace','Furnace Colossus','fire',7,10000,'Drake',{br:2});
C('marauder','Inferno Marauder','fire',7,9000,'Raider',{br:2,speed:1});
C('ragna','Crimson Ragnadrake, Lord of Embers','fire',8,12000,'Drake',{br:3,speed:1});
C('solarking','Solar Flare Dragonking','fire',9,15000,'Drake',{br:3,onSum:'sweep3000'});
S('fireball','Fireball Toss','fire',1,'burn2000',0);
S('flare','Flare Burst','fire',2,'burn3000',1);
S('magma','Magma Geyser','fire',3,'burn4000',1);
S('gale','Blazing Gale','fire',3,'killTapped',1);
S('rain','Searing Rain','fire',4,'sweep2000',0);
S('scorch','Scorch the Earth','fire',4,'manaburn',1);
S('eruption','Volcanic Eruption','fire',5,'sweep3000',0);
S('roar','Dragonfire Roar','fire',5,'burn6000',1);

/* ===== WATER ===== */
C('droplet','Droplet Sprite','water',1,1000,'Tidefolk',{block:1,noP:1});
C('ink','Ink Squid','water',1,1000,'Serpent',{onDie:'draw'});
C('scout','Bubble Scout','water',2,1000,'Tidefolk',{onSum:'draw'});
C('eel','Surge Eel','water',2,2000,'Serpent',{block:1,noP:1});
C('scribe','Ripple Scribe','water',2,2000,'Glyphmind',{onAtk:'draw'});
C('kelp','Kelp Lurker','water',2,1000,'Serpent',{unbl:1});
C('pearl','Pearl Diver','water',2,2000,'Tidefolk');
C('reef','Reef Guard','water',3,3000,'Tidefolk',{block:1,noP:1});
C('courier','Mist Courier','water',3,2000,'Tidefolk',{unbl:1});
C('seeker','Glyph Seeker','water',3,2000,'Glyphmind',{onSum:'draw'});
C('shoal','Shoal Defender','water',3,4000,'Tidefolk',{block:1,noP:1});
C('coralk','Coral Knight','water',3,3000,'Tidefolk',{block:1});
E('archivist','Glyphmind Archivist','water',3,5000,'Glyphmind',{onAtk:'draw'});
C('undereel','Undercurrent Eel','water',4,3000,'Serpent',{unbl:1});
C('mirror','Mirror Tide Mage','water',4,3000,'Glyphmind',{onSum:'bounce'});
C('riptide','Riptide Warden','water',4,4000,'Tidefolk',{block:1});
C('angler','Abyssal Angler','water',4,4000,'Serpent',{onAtk:'draw'});
C('foam','Foamcrest Wanderer','water',4,5000,'Tidefolk');
E('prime','Tidecaller Prime','water',4,6000,'Tidefolk',{br:2});
E('commodore','Tidefolk Commodore','water',4,7000,'Tidefolk',{block:1,br:2});
C('sage','Coral Sage','water',5,3000,'Tidefolk',{onSum:'draw2'});
C('wraith','Tidal Wraith','water',5,5000,'Serpent',{unbl:1});
C('vortex','Vortex Strategist','water',5,5000,'Glyphmind',{onSum:'tapone',onAtk:'draw'});
E('serpemp','Serpent Emperor','water',5,9000,'Serpent',{br:2,unbl:1});
C('oracle','Fathom Oracle','water',6,4000,'Glyphmind',{onSum:'draw3'});
C('maelstrom','Maelstrom Serpent','water',6,7000,'Serpent',{unbl:1});
C('brine','Brine Colossus','water',6,7000,'Serpent',{br:2,block:1});
C('rider','Current Rider','water',6,5000,'Tidefolk',{speed:1,unbl:1});
C('lev','Deep Leviathan','water',7,8000,'Serpent',{br:2,onSum:'bounce'});
C('admiral','Wavebreaker Admiral','water',7,9000,'Tidefolk',{br:2,onAtk:'bounce'});
C('tempest','Tempest Glyphlord','water',7,8000,'Glyphmind',{br:2,onSum:'draw2'});
C('endless','Leviathan of the Endless Deep','water',9,12000,'Serpent',{br:3,unbl:1});
S('veil','Mist Veil','water',1,'tapone',0);
S('whirl','Whirlpool Snare','water',2,['tapone','draw'],1);
S('undertow','Undertow','water',3,'bounce',1);
S('insight','Insight Current','water',3,'draw2',1);
S('memory','Memory Drain','water',3,['draw','discard'],0);
S('deep','Deep Insight','water',4,'draw3',0);
S('rewind','Tidal Rewind','water',5,['bounce','bounce'],1);
S('crush','Crushing Tide','water',6,['bounce','tapall'],1);

/* ===== NATURE ===== */
C('mole','Burrow Mole','nature',1,1000,'Wildkin');
C('seedling','Seedling Sprite','nature',1,2000,'Rootling');
C('beetle','Moss Beetle','nature',2,3000,'Wildkin');
C('fern','Fern Hopper','nature',2,1000,'Wildkin',{onSum:'ramp'});
C('moth','Leafwing Moth','nature',2,1000,'Rootling',{onDie:'ramp'});
C('sprout','Sproutling','nature',3,2000,'Wildkin',{onSum:'ramp'});
C('badger','Bramble Badger','nature',3,4000,'Wildkin');
C('shaman','Rootling Shaman','nature',3,2000,'Rootling',{onSum:'ramp',onDie:'ramp'});
C('canopy','Canopy Stalker','nature',3,3000,'Wildkin',{speed:1});
C('ram','Hornback Ram','nature',3,3000,'Wildkin',{pa:2000});
E('rootelder','Rootling Elder','nature',3,6000,'Rootling',{onSum:'ramp'});
C('boar','Thornback Boar','nature',4,5000,'Wildkin',{pa:1000});
C('bear','Barkhide Bear','nature',4,6000,'Wildkin');
C('thicket','Thicket Guardian','nature',4,5000,'Rootling',{block:1});
C('keeper','Ancient Grove Keeper','nature',4,4000,'Rootling',{onSum:'recover'});
E('alpha','Alpha Hornbeast','nature',4,8000,'Wildkin',{br:2});
C('rhino','Stampede Rhino','nature',5,6000,'Wildkin',{speed:1});
C('tusker','Wild Tusker','nature',5,7000,'Wildkin',{pa:1000});
C('matriarch','Grove Matriarch','nature',5,5000,'Rootling',{onSum:'ramp2'});
C('tortoise','Mossback Tortoise','nature',5,6000,'Giant',{block:1});
E('packlord','Fangclaw Packlord','nature',5,10000,'Wildkin',{br:2,pa:2000});
C('oak','Elder Oak','nature',6,8000,'Giant',{br:2});
C('charger','Thunderhoof Charger','nature',6,8000,'Wildkin',{speed:1});
C('hydra','Swamp Hydra','nature',6,7000,'Giant',{br:2,onDie:'recover'});
C('elderwood','Elderwood Sentinel','nature',6,6000,'Rootling',{block:1,onSum:'ramp'});
E('wildking','Giant King of the Wilds','nature',6,14000,'Giant',{br:3});
C('ironbark','Ironbark Giant','nature',7,11000,'Giant',{br:2});
C('behemoth','Verdant Behemoth','nature',7,9000,'Giant',{br:2,onSum:'recover'});
C('colossus','Mountain Colossus','nature',8,13000,'Giant',{br:3});
C('greatfang','Primeval Greatfang','nature',8,13000,'Wildkin',{br:3,pa:2000});
C('mammoth','Raging Mammoth','nature',8,10000,'Wildkin',{br:2,speed:1});
C('titan','Worldroot Titan','nature',9,17000,'Giant',{br:3,onSum:'ramp'});
S('seed','Seed Toss','nature',1,'ramp',0);
S('growth','Wild Growth','nature',2,'ramp',1);
S('regrow','Regrowth Call','nature',2,'recover',1);
S('harvest','Bountiful Harvest','nature',3,'ramp2',0);
S('rebirth','Natural Rebirth','nature',3,['recover','ramp'],1);
S('surge','Primal Surge','nature',4,['ramp','draw'],1);
S('roots','Crushing Roots','nature',4,'killTapped',1);
S('bloom','Lifebloom','nature',5,['ramp2','recover'],0);

/* ===== LIGHT ===== */
C('glimmer','Glimmer Page','light',1,1000,'Choir',{block:1,noP:1});
C('acolyte','Spark Acolyte','light',1,2000,'Starborn',{block:1,noP:1});
C('prismspr','Prism Sprite','light',1,1000,'Starborn',{onDie:'shieldadd'});
C('halo','Halo Sentry','light',2,2500,'Sentinel',{block:1,noP:1});
C('drone','Beacon Drone','light',2,2000,'Starborn',{onSum:'tapone'});
C('aurora','Aurora Scout','light',2,2000,'Choir',{block:1});
C('archer','Lumen Archer','light',3,3000,'Choir',{onSum:'tapone'});
C('gleam','Gleam Paladin','light',3,3000,'Sentinel',{block:1,noP:1});
C('hlancer','Halo Lancer','light',3,3000,'Starborn',{pa:1000});
C('squire','Dawnguard Squire','light',3,3000,'Sentinel',{block:1});
C('dawn','Dawn Knight','light',4,4500,'Sentinel',{block:1});
C('cleric','Solace Cleric','light',4,2000,'Choir',{onSum:'shieldadd'});
C('bastion','Lumen Bastion','light',4,6000,'Sentinel',{block:1,noP:1});
C('starfall','Starfall Archer','light',4,4000,'Starborn',{onAtk:'tapone'});
C('twiherald','Twilight Herald','light',4,4000,'Choir',{onDie:'draw'});
E('aegis','Aegis Archon','light',4,7000,'Sentinel',{block:1,br:2});
E('overseer','Starborn Overseer','light',4,7000,'Starborn',{onAtk:'tapone',br:2});
C('herald','Radiant Herald','light',5,5500,'Choir',{onSum:'shieldadd'});
C('templar','Radiant Templar','light',5,6000,'Sentinel',{block:1});
C('vanguard','Shining Vanguard','light',5,5000,'Sentinel',{onAtk:'shieldadd'});
C('lsage','Luminous Sage','light',5,4000,'Starborn',{onSum:['draw','tapone']});
E('exalted','Choir Exalted','light',5,9000,'Choir',{block:1,br:2});
C('prism','Prism Warden','light',6,7500,'Sentinel',{block:1,br:2});
C('dawnsong','Choir of Dawnsong','light',6,5000,'Choir',{onSum:'tapall'});
C('arbiter','Celestial Arbiter','light',6,7000,'Starborn',{br:2,onSum:'tapone'});
C('vigil','Vigil Keeper','light',6,6000,'Sentinel',{block:1,onSum:'shieldadd'});
C('sunforged','Sunforged Colossus','light',7,10000,'Sentinel',{br:2,block:1});
C('lightseraph','Lightbringer Seraph','light',7,9000,'Choir',{br:2,onSum:'shieldadd'});
E('paragon','Sentinel Paragon','light',7,13000,'Sentinel',{block:1,br:3});
C('seraph','Seraph of the Ninth Sky','light',8,12000,'Choir',{br:3});
C('citadel','Sky Citadel Warden','light',8,11000,'Sentinel',{br:3,block:1});
C('archangel','Archangel of the Last Light','light',9,15000,'Choir',{br:3,block:1});
S('ray','Blinding Ray','light',1,'tapone',0);
S('ward','Sanctuary Ward','light',2,'shieldadd',1);
S('guide','Guiding Star','light',2,'draw',1);
S('blessing',"Dawn's Blessing",'light',3,['shieldadd','tapone'],1);
S('snare','Holy Snare','light',4,'tapall',1);
S('barrier','Holy Barrier','light',4,'shield2',1);
S('purify','Purifying Light','light',4,'killTapped',1);
S('judgement','Judgement Beam','light',5,['tapall','draw'],1);

/* ===== DARKNESS ===== */
C('imp','Gloom Imp','darkness',1,1000,'Crawler',{onDie:'draw'});
C('leech','Shadow Leech','darkness',1,2000,'Crawler');
C('rat','Bone Rat','darkness',2,2000,'Crawler',{pa:1000});
C('maggot','Grave Maggot','darkness',2,1000,'Crawler',{block:1,slayer:1,noP:1});
C('gnawer','Skull Gnawer','darkness',2,2000,'Crawler',{pa:2000});
C('bat','Carrion Bat','darkness',2,2000,'Wraith',{speed:1});
C('stalker','Night Stalker','darkness',3,2000,'Fiend',{slayer:1});
C('whisper','Crypt Whisperer','darkness',3,2000,'Wraith',{onSum:'discard'});
C('hollow','Hollow Wraith','darkness',3,3000,'Wraith',{onDie:'draw'});
E('queen','Crawler Queen','darkness',3,6000,'Crawler',{slayer:1});
C('marquis','Hollow Marquis','darkness',4,4000,'Fiend',{onSum:'recover'});
C('venom','Venom Fiend','darkness',4,3000,'Fiend',{slayer:1});
C('plague','Plague Crawler','darkness',4,4000,'Crawler',{onSum:'burn2000'});
C('gravek','Gravebound Knight','darkness',4,5000,'Crawler',{block:1,noP:1});
C('bloodmoon','Bloodmoon Stalker','darkness',4,4000,'Fiend',{pa:2000});
C('banshee','Wailing Banshee','darkness',4,3000,'Wraith',{onAtk:'discard'});
C('siphon','Shade Siphon','darkness',4,2000,'Wraith',{onSum:'manaburn'});
E('wraithlord','Wraith Lord','darkness',4,7000,'Wraith',{onAtk:'discard',br:2});
C('ghoul','Wailing Ghoul','darkness',5,5000,'Crawler',{onSum:'discard'});
C('reaper','Soul Reaper','darkness',5,5000,'Wraith',{onAtk:'discard'});
C('duke','Necro Duke','darkness',5,6000,'Fiend',{onDie:'recover'});
C('ghoulbrute','Ghoul Brute','darkness',5,7000,'Crawler');
E('prince','Dread Fiend Prince','darkness',5,9000,'Fiend',{br:2});
C('tyrant','Bone Tyrant','darkness',6,7000,'Fiend',{br:2});
C('assassin','Midnight Assassin','darkness',6,5000,'Wraith',{slayer:1,onSum:'killTapped'});
C('harbinger','Doom Harbinger','darkness',6,8000,'Fiend',{br:2});
C('blight','Blight Mother','darkness',6,6000,'Crawler',{onSum:'sweep2000'});
C('lich','Lich of the Black Mire','darkness',7,9000,'Wraith',{br:2,onSum:'discard2'});
E('ruinking','Fiend King of Ruin','darkness',7,14000,'Fiend',{br:3,onSum:'kill'});
C('overlord','Abyssal Overlord','darkness',8,12000,'Fiend',{br:3});
C('nightmare','Nightmare Colossus','darkness',8,12000,'Fiend',{br:3,slayer:1});
C('devourer','Abyss Devourer','darkness',9,16000,'Fiend',{br:3,onSum:'kill'});
S('bargain','Dark Bargain','darkness',2,'discard',1);
S('hex','Hex Blast','darkness',2,'burn2000',1);
S('gravecall','Grave Call','darkness',2,'recover',0);
S('deathtouch','Death Touch','darkness',3,'killTapped',1);
S('mindrot','Mind Rot','darkness',3,'discard2',0);
S('rend','Soul Rend','darkness',4,'kill',1);
S('voidh','Void Harvest','darkness',5,['kill','recover'],0);
S('purge','Shadow Purge','darkness',6,['kill','discard'],1);

const DEF={};
DEFS.forEach(d=>{
  if(DEF[d.id])console.warn('duplicate id',d.id);
  const a=[];
  if(d.evo)a.push(`Evolution: put on one of your ${d.evo}s.`);
  if(d.speed)a.push('Speed attacker.');
  if(d.block)a.push('Blocker.');
  if(d.noP)a.push("Can't attack players.");
  if(d.pa)a.push(`Power attacker +${d.pa}.`);
  if(d.br===2)a.push('Double breaker.');
  if(d.br===3)a.push('Triple breaker.');
  if(d.unbl)a.push("Can't be blocked.");
  if(d.slayer)a.push('Slayer.');
  if(d.onSum)a.push('On summon: '+fxDesc(d.onSum));
  if(d.onAtk)a.push('When it attacks: '+fxDesc(d.onAtk));
  if(d.onDie)a.push('When destroyed: '+fxDesc(d.onDie));
  if(d.fx)a.push(fxDesc(d.fx));
  if(d.trig)a.push('Shield trigger.');
  d.txt=a.join(' ');DEF[d.id]=d;
});
