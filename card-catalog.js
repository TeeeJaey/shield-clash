/* Adapt the game's card metadata to the duel engine. Unknown abilities stay
   collection-only; no printed text is replaced by an approximation. */
function makeCardCatalog(rows){
  const clean=text=>text.toLowerCase().replace(/[‘’]/g,"'").replace(/\s*'\s*/g,"'").replace(/\s+/g,' ').replace(/\.$/,'').trim();
  // Races are printed singly ("Ghost") or combined ("Survivor/Guardian").
  const races=[...new Set(rows.flatMap(r=>(r.race||'').split('/').map(s=>s.trim())).filter(Boolean))];
  const civs=['light','water','darkness','fire','nature'];
  const KEYWORDS=['shield trigger','blocker','speed attacker','double breaker','triple breaker','slayer','charger'];
  function keywordRun(printed){
    const parts=printed.split(/(?<=\))\s+(?=[A-Z])/);
    return parts.length>1&&parts.every(p=>KEYWORDS.includes(clean(p.replace(/\([^)]*\)/g,'').trim())))?parts:[printed];
  }
  const add=(t,k,fx)=>{t[k]=[...(t[k]||[]),...[].concat(fx)]};
  // "ghosts", "armored dragon", "chimeras and armorloids" -> printed race names.
  function racesIn(phrase){
    const out=[];
    for(const w of phrase.split(/ and (?:all )?|, | or /)){
      if(/^(?:creatures? )?of that race$|^that race$/.test(w.trim())){out.push('$race');continue}
      const r=races.find(r=>{const n=clean(r);return [n,n+'s',n.replace(/y$/,'ies'),n.replace(/ie$/,'ies')].includes(w.trim())});
      if(!r)return null;
      out.push(r);
    }
    return out;
  }
  /* ---------- one-shot effects ---------- */
  // Card types and civilizations a zone-moving effect may select ("a darkness creature").
  const ITEM=new RegExp('^(?:('+civs.join('|')+') )?(card|creature|spell)s?(?: that costs (\\d+) or more)?$');
  const ZONE={'your graveyard':'gy','your mana zone':'mana','your hand':'hand'},DEST={'your hand':'hand','your mana zone':'mana','your shields face down':'sh'};
  // "X. Then Y" resolves X and then Y; every part must be understood.
  function effect(text){
    text=clean(text).replace(/\.\s*"/g,'".');
    const whole=single(text);
    if(whole)return whole;
    let m;
    if((m=/^(you may .+?)\. if you do,? (.+)$/.exec(text))){const a=single(m[1]),b=effect(m[2]);if(a&&b)return JSON.stringify({k:'ifDo',first:[].concat(a),then:[].concat(b),x:sentence(text)})}
    // "Choose a race. ..." - the rest refers to "that race".
    if((m=/^choose a race\. (.+)$/.exec(text))){const fx=effect(m[1]);if(fx&&/\$race/.test(JSON.stringify(fx)))return JSON.stringify({k:'race',fx:[].concat(fx),x:sentence(text)})}
    const parts=text.split(/\. then |, then /);
    if(parts.length===1)return null;
    const out=parts.map(single);
    return out.every(Boolean)?out.flat():null;
  }
  // "You may ..." makes any effect optional; draws and moves encode it themselves.
  function single(s){
    const fx=effectOf(s);
    return fx&&/^you may /.test(s)&&!/^(optional:|drawUp|move:)/.test(fx)?'optional:'+fx:fx;
  }
  function effectOf(s){
    const optional=/^you may /.test(s),base=s.replace(/^you may /,''),may=optional?'optional:':'';
    let m;
    if((m=/^draw (up to )?(a|1|2|3) cards?$/.exec(base)))return (optional||m[1]?'drawUp':'draw')+(m[2]==='a'?'1':m[2]);
    if(base==='put the top card of your deck into your mana zone')return 'ramp';
    if(base==='put the top 2 cards of your deck into your mana zone')return 'ramp2';
    if(base==="tap all your opponent's creatures in the battle zone")return 'tapall';
    if(/^choose (?:one|1) of your opponent's creatures(?: in the battle zone)? and tap it$/.test(base))return (optional?'optional:':'')+'tapone';
    if((m=/^destroy (?:one|1) of your opponent's creatures that has power (\d+) or less$/.exec(base)))return 'burn'+m[1];
    if(/^destroy (?:one|1) of your opponent's creatures$/.test(base))return 'kill';
    if(/^destroy (?:one|1) of your opponent's untapped creatures$/.test(base))return 'killUntapped';
    if(/^destroy (?:one|1) of your opponent's creatures that has "? ?blocker ?"?$/.test(base))return 'killBlocker';
    if(/^choose (?:a|1) creature in the battle zone and return it to its owner's hand$/.test(base))return (optional?'optional:':'')+'bounceAny';
    if(/^your opponent discards a card at random from his hand$/.test(base))return 'discard';
    if(/^your opponent discards all cards from his hand$/.test(base))return 'discardAll';
    if((m=/^destroy all creatures that have power (\d+) or less$/.exec(base)))return 'sweepAll'+m[1];
    if(/^choose one of your shields without looking and put it into your graveyard\./.test(base))return 'discardShield';
    if(base==='return a card from your mana zone to your hand')return 'manaToHand';
    if((m=/^put (1|2) cards? from your mana zone into your graveyard$/.exec(base)))return 'manaToGy'+(m[1]==='1'?'':m[1]);
    if(base==='choose one of your shields and put it into your graveyard')return 'shieldToGy';
    if(base==="choose one of your opponent's shields and put it into his graveyard")return 'oppShieldToGy';
    if(base==='destroy one of your creatures')return 'destroyOwn';
    if((m=/^destroy one of your creatures that has power (\d+) or less$/.exec(base)))return 'destroyOwnP'+m[1];
    // Moving chosen cards between your own zones, e.g. "return a spell from your mana zone to your hand".
    if((m=/^(?:return|put|add) (a|an|1|2|3|up to (\d+)) (.+?) from (your graveyard|your mana zone|your hand) (?:to|into) (your hand|your mana zone|your shields face down)$/.exec(base))){
      const item=ITEM.exec(m[3]),from=ZONE[m[4]],to=DEST[m[5]];
      if(!item||from===to||(from==='hand'&&to==='hand'))return null;
      const count=m[2]||(/^\d$/.test(m[1])?m[1]:'1'),filter=[item[2],item[1]||'',item[3]||''].join('-');
      return may+`move:${from}>${to}:${filter}:${count}${m[2]?'u':''}`;
    }
    if((m=/^choose (a card|up to 2 cards) in your opponent's mana zone and put (?:it|them) into his graveyard$/.exec(base)))return m[1]==='a card'?'oppManaToGy':'oppManaToGy2u';
    if(/^your opponent chooses one of his creatures(?: in the battle zone)? and destroys it$/.test(base))return 'oppDestroysOwn';
    if(base==="your opponent chooses one of his creatures in the battle zone and puts it into his mana zone")return 'oppOwnToMana';
    if((m=/^your opponent chooses (a card|2 cards) (?:from|in) his mana zone and returns (?:it|them) to his hand$/.exec(base)))return 'oppManaToHand'+(m[1]==='a card'?'':'2');
    if((m=/^your opponent chooses and discards (a card|2 cards) from his hand$/.exec(base)))return 'oppDiscards'+(m[1]==='a card'?'':'2');
    if(base==="destroy all creatures that have \"blocker\""||base==='destroy all creatures that have " blocker "')return 'sweepBlockers';
    if(/^tap all your opponent's creatures in the battle zone that have "\s?blocker\s?"$/.test(base))return 'tapBlockers';
    if(/^return all creatures in the battle zone that have "\s?blocker\s?" to their owners'\s?hands$/.test(base))return 'bounceBlockers';
    if((m=/^return all creatures in the battle zone that have power (\d+) or less to (?:its|their) owners?'s?\s?hands?$/.exec(base)))return 'bounceAll'+m[1];
    if(base==="look at one of your opponent's shields. then put it back where it was")return may+'peekShield';
    // "Each of your creatures in the battle zone gets +3000 power until the end of the turn."
    if((m=/^each of your creatures(?: in the battle zone)? gets (.+) until the end of the turn$/.exec(base))){
      const g=grant(m[1]);
      if(g&&!g.per)return 'grantOwn:'+JSON.stringify(g);
    }
    return general(s,base,optional);
  }
  /* ---------- choosing and affecting creatures ---------- */
  // "up to 2 of your opponent's untapped light or nature creatures in the battle zone
  // that have power 3000 or less" -> how many, and which creatures qualify.
  const NUM={a:1,an:1,one:1,1:1,2:2,3:3,two:2,three:3,another:1};
  function creatures(s){
    let m;const out={n:1},q={side:'any'};
    s=s.replace(/"\s*([^"]*?)\.?\s*"/g,'"$1"');
    if((m=/^(?:all|each) (?:of )?/.exec(s))){out.all=1;s=s.slice(m[0].length)}
    else if((m=/^any number of /.exec(s))){out.any=1;s=s.slice(m[0].length)}
    else if((m=/^up to (\d) (?:of )?/.exec(s))){out.n=+m[1];out.upto=1;s=s.slice(m[0].length)}
    else if((m=/^(a|an|one|1|2|3|two|three|another) (?:of )?/.exec(s))){out.n=NUM[m[1]];if(m[1]==='another')q.other=1;s=s.slice(m[0].length)}
    else if(!/^(?:the )?(?:your|creatures)/.test(s))return null;
    else out.all=1;
    if((m=/^(your opponent's|his|your) /.exec(s))){q.side=m[1]==='your'?'own':'opp';s=s.slice(m[0].length)}
    for(;;){
      if((m=/^other /.exec(s)))q.other=1;
      else if((m=/^(untapped|tapped) /.exec(s)))q.state=m[1];
      else if((m=/^non- ?evolution /.exec(s)))q.evo=-1;
      else if((m=/^evolution /.exec(s)))q.evo=1;
      else if((m=new RegExp('^'+CIVS+'(?:,? (?:or|and) (?:untapped |tapped )?'+CIVS+')? ').exec(s)))q.civs=[m[1],m[2]].filter(Boolean);
      else break;
      s=s.slice(m[0].length);
    }
    if((m=/^(?:creatures? of that race|creatures?(?= |$))/.exec(s))){if(/that race/.test(m[0]))q.races=['$race']}
    else if((m=/^(.+?)(?= in the battle zone| from the battle zone| that |$)/.exec(s))&&racesIn(m[1]))q.races=racesIn(m[1]);
    else return null;
    s=s.slice(m[0].length);
    while(s){
      if((m=/^ (?:in|from) the battle zone/.exec(s)));
      else if((m=/^ of that race/.exec(s)))q.races=['$race'];
      else if((m=/^ that (?:has|have) power (\d+) or (less|more)/.exec(s)))q[m[2]==='less'?'maxP':'minP']=+m[1];
      else if((m=/^ that (?:has|have) "blocker"(?: and power (\d+) or less)?/.exec(s))){q.block=1;if(m[1])q.maxP=+m[1]}
      else if((m=/^ that (?:don't|doesn't) have "blocker"/.exec(s)))q.block=-1;
      else if((m=/^ that (?:has|have) dragon in (?:its|their) race/.exec(s)))q.dragon=1;
      else if((m=/^ that costs? (\d+) or less/.exec(s)))q.maxCost=+m[1];
      else if((m=/^ that (?:has|have) (?:power )?(\d+)(?: power)?(?= |$)/.exec(s)))q.eqP=+m[1];
      else if((m=new RegExp('^ except '+CIVS+' creatures').exec(s)))q.notCivs=[m[1]];
      else return null;
      s=s.slice(m[0].length);
    }
    out.q=q;
    return out;
  }
  // What happens to the chosen creatures.
  const ACTS=[
    [/^tap (?:it|them)$/,'tap'],[/^untap (?:it|them)$/,'untap'],[/^destroy (?:it|them)$/,'destroy'],
    [/^return (?:it|them) to (?:its|their|his) (?:owners?'s?\s?)?hands?$/,'bounce'],
    [/^put (?:it|them) into (?:his|its owner's|their owners'\s?|your opponent's) mana zones?$/,'mana'],
    [/^put (?:it|them) on top of (?:his|its owner's) deck$/,'deckTop'],
    [/^add (?:it|them) to (?:its|their) owners?'s?\s?shields face down$/,'shield']];
  const actOf=s=>(ACTS.find(([re])=>re.test(s))||[])[1];
  const pick=(sel,a,x,extra)=>'{'+JSON.stringify({k:sel.all?'all':'pick',a,q:sel.q,...(sel.all?{}:{n:sel.n,upto:sel.upto,any:sel.any}),...extra,x}).slice(1);
  const sentence=s=>s.charAt(0).toUpperCase()+s.slice(1)+'.';
  // Deck searches: "a nature creature", "a non- nature card", "an armored dragon".
  function deckItem(s){
    let m;
    if((m=new RegExp('^(?:a|an) (?:(non- ?)?'+CIVS+' |(multicolored) )?(card|creature|spell)( that has dragon in its race)?$').exec(s)))
      return {t:m[4]==='card'?'':m[4]==='spell'?'s':'c',civ:m[1]?'':m[2]||'',notCiv:m[1]?m[2]:'',multi:!!m[3],dragon:!!m[5]};
    if((m=/^(?:a|an) (.+)$/.exec(s))&&racesIn(m[1]))return {t:'c',races:racesIn(m[1])};
    if((m=/^(?:a|an) (.+)$/.exec(s))){const r=rows.find(r=>clean(r.name)===m[1]);if(r)return {name:r.name}}
    return null;
  }
  // "a Survivor", "another creature", "all creatures that have Dragon in their race",
  // "all Angel Commands and all Demon Commands", "a water or fire creature", "up to 3 creatures of that race".
  function itemsOf(s){
    let m;const out={n:1};
    if((m=/^(all|any number of|up to (\d)|another|a|an) /.exec(s))){
      if(m[1]==='all')out.all=1;else if(m[1]==='any number of')out.any=1;else if(m[2]){out.n=+m[2];out.upto=1}else if(m[1]==='another')out.other=1;
      s=s.slice(m[0].length);
    }else return null;
    let f;
    if(/^(?:cards?)$/.test(s))f={};
    else if(/^(?:creatures?)$/.test(s))f={t:'c'};
    else if(/^spells?$/.test(s))f={t:'s'};
    else if(/^creatures? that (?:has|have) dragon in (?:its|their) race$/.test(s))f={t:'c',dragon:1};
    else if((m=new RegExp('^'+CIVS+'(?: or '+CIVS+')? (?:creature|card)s?$').exec(s)))f={t:/creature/.test(s)?'c':'',civs:[m[1],m[2]].filter(Boolean)};
    else if(racesIn(s.replace(/ in the battle zone$/,'')))f={t:'c',races:racesIn(s)};
    else{const r=rows.find(r=>clean(r.name)===s);if(r)f={name:r.name}}
    return f?{...out,f}:null;
  }
  // Conditions on one-shot effects: "if your opponent has more shields than you do, ..."
  function ifCondition(s){
    let m;
    if((m=/^your opponent has more (cards in his mana zone than you have in yours|shields than you do)$/.exec(s)))return {more:m[1].startsWith('cards')?'mana':'sh'};
    if((m=/^your opponent has (\d+) or (more|fewer) (creatures in the battle zone|shields)$/.exec(s)))return {count:{side:'opp',zone:m[3]==='shields'?'sh':'bz',[m[2]==='more'?'min':'max']:+m[1]}};
    if((m=/^you have (\d+) or (more|fewer) shields$/.exec(s)))return {count:{side:'own',zone:'sh',[m[2]==='more'?'min':'max']:+m[1]}};
    if((m=/^you have (?:a|an) (.+?) in the battle zone$/.exec(s))&&racesIn(m[1]))return {count:{side:'own',zone:'bz',races:racesIn(m[1]),min:1}};
    return null;
  }
  // Effects described by printed wording rather than a fixed code. They are stored as
  // JSON with the printed sentence (x) for logs and prompts.
  // Tries every "<creatures> <verb> <rest>" split, so "one of your creatures that has
  // "blocker" gets ..." finds the right verb.
  function splitAt(s,verbs){
    const re=new RegExp(' (?:each )?('+verbs+') ','g');let m;
    while((m=re.exec(s))){const sel=creatures(s.slice(0,m.index));if(sel)return {sel,verb:m[1],rest:s.slice(m.index+m[0].length)}}
    return null;
  }
  function general(s,base,optional){
    let m,sel,a,sp;
    const x=sentence(s),json=o=>(optional?'optional:':'')+JSON.stringify({...o,x});
    const opt=optional?'optional:':'';
    // "Until the end of the turn, each of your ..." reads like "... until the end of the turn".
    if((m=/^until the end of the turn, (.+?) (gets|has|is) (.+)$/.exec(base))&&m[2]!=='is'){const fx=general(s,`${m[1]} ${m[2]} ${m[3]} until the end of the turn`,optional);if(fx)return fx}
    // "... until the start of your next turn" lasts through the opponent's turn.
    if((m=/^until the start of your next turn, (.+?) (gets|has) (.+)$/.exec(base))&&(sel=creatures(m[1]))){const g=grant(m[3]);if(g&&!g.per)return pick(sel,'grant',x,{g,dur:'next'})}
    if((m=/^(.+?) (?:gets|has) (.+) until the start of your next turn$/.exec(base))&&(sel=creatures(m[1]))){const g=grant(m[2]);if(g&&!g.per)return pick(sel,'grant',x,{g,dur:'next'})}
    if((m=/^choose (.+?)\. it gets (.+) until the start of your next turn$/.exec(base))&&(sel=creatures(m[1]))){const g=grant(m[2]);if(g&&!g.per)return pick(sel,'grant',x,{g,dur:'next'})}
    if(base==="during your opponent's next turn, each of his creatures attacks if able")return json({k:'oppMustAttack'});
    // Cards returned or put somewhere by race, name or civilization.
    if((m=/^(?:return|put|choose) (.+?) (?:from|in) your (graveyard|mana zone|hand)(?: and your (graveyard|mana zone))? (?:and put (?:it|them) )?(?:to|into) (your hand|the battle zone|your mana zone)$/.exec(base))){
      const it=itemsOf(m[1]),Z={graveyard:'gy','mana zone':'mana',hand:'hand'};
      if(it)return opt+JSON.stringify({k:'gather',...it,from:[Z[m[2]],m[3]&&Z[m[3]]].filter(Boolean),to:{'your hand':'hand','the battle zone':'bz','your mana zone':'mana'}[m[4]],x});
    }
    if((m=/^(?:you may )?untap this creature$/.exec(base)))return opt+JSON.stringify({k:'untapSelf',x});
    if(base==='return all creatures from your mana zone to your hand')return json({k:'manaAll',to:'hand',t:'c'});
    if((m=/^(?:your opponent|he) chooses (?:a card in his mana zone and puts it into his graveyard)$/.exec(base)))return 'oppManaChooseGy';
    if(base==='your opponent chooses one of his creatures in the battle zone and returns it to his hand')return 'oppOwnToHand';
    if((m=/^your opponent chooses one of his creatures in the battle zone or (a card in his mana zone|one of his shields) and puts it into his graveyard$/.exec(base)))return json({k:'oppChoosesGy',z:m[1].startsWith('a card')?'mana':'sh'});
    if((m=/^(?:look at|choose) (?:one of your opponent's shields|a shield and look at it)(?:\. then put it back where it was)?$/.exec(base)))return /a shield/.test(base)?json({k:'peekAny'}):'peekShield';
    if((m=/^destroy the creature that has the (?:lowest|least) power in the battle zone\. if there's a tie, you choose from among the tied creatures$/.exec(base)))return json({k:'lowest'});
    if(/^choose a number less than or equal to 6000\. destroy all creatures that have that power$/.test(base))return json({k:'powerPick'});
    if(/^each player chooses one of his creatures in the battle zone\. tap the rest of the creatures in the battle zone$/.test(base))return json({k:'tapRest'});
    if(/^(?:each player puts|put) all the cards from (?:his|your) mana zone into (?:his|your) hand and, at the same time, puts? all the cards from (?:his|your) hand into (?:his|your) mana zone tapped$/.test(base))
      return /^each/.test(base)?json({k:'each',fx:[JSON.stringify({k:'swapManaHand',x})]}):json({k:'swapManaHand'});
    if(base==='put all the cards from your hand into your mana zone. then put that many cards from your mana zone into your hand')return json({k:'handManaCycle'});
    if((m=/^(?:you may )?choose one of your opponent's evolution creatures in the battle zone and put the top card of that creature into your opponent's (graveyard|mana zone)$/.exec(base)))return opt+pick({n:1,q:{side:'opp',evo:1}},m[1]==='graveyard'?'evoTopGy':'evoTopMana',x);
    if(/^put the top card of each evolution creature from the battle zone into its owner's mana zone$/.test(base))return pick({all:1,q:{side:'any',evo:1}},'evoTopMana',x);
    if((m=/^(?:when this creature attacks, )?reveal the top card of your deck\. if it's (?:a|an) (.+?), put it into (your hand|the battle zone)\. otherwise, put it into your (graveyard|hand)$/.exec(base))){
      const f=m[1]==='non- evolution creature'||m[1]==='non-evolution creature'?{t:'c',noEvo:1}:racesIn(m[1])?{races:racesIn(m[1])}:null;
      if(f)return json({k:'revealTop',f,yes:m[2]==='your hand'?'hand':'bz',no:m[3]==='hand'?'hand':'gy'});
    }
    if((m=/^choose (a creature|up to 2 creatures) in (?:your|his) hand(?: that costs the same as or less than the number of cards in your mana zone)? and puts? (?:it|them) into the battle zone$/.exec(base)))
      return opt+JSON.stringify({k:'handToBz',n:m[1]==='a creature'?1:2,upto:m[1]!=='a creature',maxMana:/costs the same/.test(base),x});
    if((m=/^your opponent (may choose|chooses up to 2) (?:a )?creatures? in his hand and puts? (?:it|them) into the battle zone$/.exec(base)))return json({k:'handToBz',side:'opp',n:m[1]==='may choose'?1:2,upto:true});
    if(/^destroy any number of your opponent's creatures that have total power 8000 or less$/.test(base))return json({k:'totalPower',max:8000});
    if(/^return any number of your creatures from the battle zone to your hand\. then you may choose that many of your opponent's creatures in the battle zone and return them to your opponent's hand$/.test(base))return json({k:'shock'});
    if((m=/^choose a card at random in your opponent's hand\. then, for each (.+?) in each graveyard, you may choose another card at random in your opponent's hand\. your opponent discards all those cards$/.exec(base))&&count(m[1]+' in each graveyard'))return json({k:'discardPer',per:count(m[1]+' in each graveyard'),plus:1});
    if(/^your opponent chooses one of his shields for each shield you have\. he puts the rest of his shields into his hand$/.test(base))return json({k:'meltdown'});
    if(/^your opponent chooses one of your shields\. look at it\. if it's a spell, you may cast it immediately for no cost\. if it's not a spell or if you don't cast it, put it back where it was$/.test(base))return json({k:'darts'});
    if((m=/^choose one of your opponent's untapped creatures in the battle zone\. your creatures can attack it this turn as though it were tapped$/.exec(base)))return pick({n:1,q:{side:'opp',state:'untapped'}},'grant',x,{g:{power:0,traits:{attackable:1}}});
    if(/^each of your creatures in the battle zone that can attack creatures can attack untapped creatures this turn$/.test(base))return pick({all:1,q:{side:'own'}},'grant',x,{g:{power:0,traits:{hunts:1}}});
    if(/^this turn, ignore any effects that would prevent your creatures from attacking your opponent$/.test(base))return json({k:'turnFlag',f:'freeAttack'});
    if(/^choose one of your creatures in the battle zone\. this turn, it can't be blocked and you ignore any effects that would prevent that creature from attacking your opponent$/.test(base))return pick({n:1,q:{side:'own'}},'grant',x,{g:{power:0,traits:{unbl:1,freeAttack:1}}});
    if((m=/^this turn, (.+?) (can attack untapped creatures and can't be blocked while attacking a creature)$/.exec(base))&&(sel=creatures(m[1]))&&sel.all)return pick(sel,'grant',x,{g:{power:0,traits:{hunts:1,unblVsC:1}}});
    if((m=/^(.+?) can't be blocked by creatures that have power (\d+) or less this turn$/.exec(base))&&(sel=creatures(m[1]))&&sel.all)return pick(sel,'grant',x,{g:{power:0,traits:{unblBy:+m[2]}}});
    if((m=/^(.+?) gets \+(\d+) power until the end of the turn for each (.+)$/.exec(base))&&(sel=creatures(m[1]))&&count(m[3]))return pick(sel,'grant',x,{g:{power:+m[2],traits:{}},gPer:count(m[3])});
    if((m=/^(destroy .+?) or (destroy this creature)$/.exec(base))){const a1=general(m[1],m[1],false);if(a1)return json({k:'or',opts:[[a1],['destroySelf']],labels:[sentence(m[1]),sentence(m[2])]})}
    // "Tap all darkness creatures in the battle zone, or tap all fire creatures in the battle zone."
    if((m=/^(.+?), or (.+)$/.exec(base))){const a1=effect(m[1]),a2=effect(m[2]);if(a1&&a2)return json({k:'or',opts:[[].concat(a1),[].concat(a2)],labels:[sentence(m[1]),sentence(m[2])]})}
    // "Choose one of your opponent's water or darkness creatures. Your opponent puts that creature into his mana zone."
    if((m=/^choose (.+?)\. your opponent puts that creature into his mana zone$/.exec(base))&&(sel=creatures(m[1])))return opt+pick(sel,'mana',x);
    // "Choose a creature ... and return it ... If it has Dragon in its race, you may draw a card."
    if((m=/^(.+?)\. if it has dragon in its race, (.+)$/.exec(base))){const first=general(m[1],m[1],false),then=effect(m[2]);if(first&&then&&first.charAt(0)==='{'){const e=JSON.parse(first);return opt+JSON.stringify({...e,ifDragon:[].concat(then),x})}}
    // Cloned cards: "Choose X. Then, for each Cloned Blade in each graveyard, you may choose another ... Destroy all those creatures."
    if((m=/^choose (.+?)\. then, for each (.+?) in each graveyard, you may choose another .+?\. (destroy|tap|return) all those creatures(?: to their owners'\s?hands)?$/.exec(base))&&(sel=creatures(m[1]))&&count(m[2]+' in each graveyard'))
      return pick(sel,{destroy:'destroy',tap:'tap',return:'bounce'}[m[3]],x,{plus:count(m[2]+' in each graveyard')});
    if((m=/^choose (.+?) and (tap|untap|destroy|return|put|add) (.+)$/.exec(base))&&(sel=creatures(m[1]))&&(a=actOf(m[2]+' '+m[3])))return (optional?'optional:':'')+pick(sel,a,x);
    if((m=/^(destroy|tap|untap) (.+)$/.exec(base))&&(sel=creatures(m[2])))return (optional?'optional:':'')+pick(sel,m[1],x);
    if((m=/^return (.+?) (?:from the battle zone )?to (?:its|their|your|his) (?:owners?'s?\s?)?hands?$/.exec(base))&&(sel=creatures(m[1])))return (optional?'optional:':'')+pick(sel,'bounce',x);
    if((m=/^put (.+?) (?:from the battle zone )?into (?:your|his|its owner's) mana zone$/.exec(base))&&(sel=creatures(m[1]))&&!/^(?:the top|a card)/.test(m[1]))return (optional?'optional:':'')+pick(sel,'mana',x);
    // "One of your creatures gets +4000 power until the end of the turn."
    if((m=/^(.+) until the end of the turn$/.exec(base))&&(sp=splitAt(m[1],'gets|has|get'))){const g=grant(sp.rest);if(g&&!g.per)return pick(sp.sel,'grant',x,{g})}
    if((m=/^(?:it|this creature) gets (.+) until the end of the turn$/.exec(base))){const g=grant(m[1]);if(g&&!g.per)return json({k:'grantSelf',g})}
    if((m=/^(?:it|this creature) breaks one of your opponent's shields$/.exec(base)))return json({k:'breakSh',n:1});
    if(/^untap all your creatures(?: in the battle zone)?$/.test(base))return opt+pick({all:1,q:{side:'own'}},'untap',x);
    if((m=/^at the end of (?:the|this) turn, (.+)$/.exec(base))){const fx=effect(m[1]);if(fx)return json({k:'later',fx:[].concat(fx)})}
    if(/^whenever any of your creatures would be destroyed this turn, put it into your mana zone instead$/.test(base))return json({k:'turnFlag',f:'destroyToMana'});
    // Choosing cards in the opponent's mana zone.
    if((m=/^choose (a card|up to 2 cards) in your opponent's mana zone(?: and return it to his hand|\. your opponent puts those cards into his graveyard)$/.exec(base)))
      return opt+JSON.stringify({k:'omana',a:/hand$/.test(base)?'hand':'gy',n:m[1]==='a card'?1:2,upto:m[1]!=='a card',x});
    if((m=/^for each (.+?), you may choose a card in your opponent's mana zone and (return it to his hand|put it into his graveyard)$/.exec(base))&&count(m[1]))
      return JSON.stringify({k:'omana',a:m[2].startsWith('return')?'hand':'gy',per:count(m[1]),upto:true,x});
    if((m=/^each player chooses (a card|2 cards) in his mana zone and puts (?:it|them) into his graveyard$/.exec(base)))return json({k:'each',fx:[m[1]==='a card'?'manaToGy':'manaToGy2']});
    if(/^each player puts a card from his mana zone into his graveyard$/.test(base))return json({k:'each',fx:['manaToGy']});
    if(/^each player discards a card at random from his hand$/.test(base))return json({k:'each',fx:['discardSelfRandom']});
    if((m=/^(?:your opponent|he) discards a card at random from his hand for each (.+)$/.exec(base))&&count(m[1]))return json({k:'discardPer',per:count(m[1])});
    if((m=/^your opponent chooses and discards a card from his hand for each (.+?) he has in the battle zone$/.exec(base))&&count(m[1]+' your opponent has in the battle zone'))return json({k:'oppDiscardsPer',per:count(m[1]+' your opponent has in the battle zone')});
    if((m=/^tap one of your opponent's creatures in the battle zone for each (.+)$/.exec(base))&&count(m[1]))return pick({n:1,q:{side:'opp',state:'untapped'}},'tap',x,{per:count(m[1])});
    // Hands.
    if(base==="look at your opponent's hand and choose a card from it. your opponent discards that card")return json({k:'handPick'});
    if((m=new RegExp("^look at your opponent's hand\\. he discards all "+CIVS+" spells from it$").exec(base)))return json({k:'handDiscard',f:{t:'s',civ:m[1]}});
    if((m=/^(discard any number of cards from your hand|put any number of cards from your mana zone into your graveyard|destroy any number of your creatures)\. then draw that many cards$/.exec(base)))
      return json({k:'cycle',from:m[1].startsWith('discard')?'hand':m[1].startsWith('put')?'mana':'bz'});
    if(/^(?:each player counts the cards in his hand, shuffles those cards into his deck, then draws that many cards|count the cards in your hand, shuffle those cards into your deck, then draw that many cards)$/.test(base))
      return /^each/.test(base)?json({k:'each',fx:[JSON.stringify({k:'reshuffle',x})]}):json({k:'reshuffle'});
    if(/^(?:he|your opponent) discards his hand$/.test(base))return 'discardAll';
    if(/^(?:he|your opponent) discards a card at random from (?:his|their) hand$/.test(base))return 'discard';
    if((m=/^look at your opponent's hand\. he discards all creatures from it that have power (\d+) or less$/.exec(base)))return json({k:'handDiscard',f:{t:'c',maxP:+m[1]}});
    // Shields.
    if((m=/^choose up to (\d) of your opponent's shields and put them into his graveyard$/.exec(base)))return json({k:'oshields',n:+m[1]});
    if(base==='for each card in your mana zone, put a card from the top of your deck into your mana zone tapped')return json({k:'rampPer'});
    // Searches of more than one card, or of the opponent's deck.
    if(/^search your deck\. you may take any number of cards from your deck, show those cards to your opponent, and put them into your hand\. then shuffle your deck$/.test(base))return json({k:'search',f:{},to:'hand',any:1});
    if((m=/^search your opponent's deck\. take up to (\d) cards from his deck and put them into his graveyard\. then your opponent shuffles his deck$/.exec(base)))return json({k:'search',f:{},to:'gy',side:'opp',n:+m[1]});
    // "Choose one of your creatures in the battle zone. It can't be blocked this turn."
    if((m=/^choose (.+?)\. (?:if you do, )?(?:it|they) (can't be blocked|gets .+?) this turn$/.exec(base))&&(sel=creatures(m[1]))){const g=grant(m[2]);if(g)return opt+pick(sel,'grant',x,{g})}
    if((m=/^(.+?) can't be blocked this turn$/.exec(base))&&(sel=creatures(m[1]))&&sel.all)return pick(sel,'grant',x,{g:{power:0,traits:{unbl:1}}});
    // "For each light creature you have in the battle zone, you may choose ... and tap it."
    if((m=/^for each (.+?), you may choose (.+?) and (\w+) (.+)$/.exec(base))&&count(m[1])&&(sel=creatures(m[2]))&&(a=actOf(m[3]+' '+m[4])))
      return pick({...sel,upto:1},a,x,{per:count(m[1])});
    if((m=/^(?:you may )?draw a card for each (.+)$/.exec(base))&&count(m[1]))return json({k:'drawPer',per:count(m[1]),upto:/^you may /.test(base)});
    if((m=/^(?:you may )?draw a number of cards equal to the number of creatures your opponent has in the battle zone$/.exec(base)))return json({k:'drawPer',per:{zone:'bz',side:'opp'},upto:true});
    // Deck searches.
    if((m=/^search your deck\. you may take (.+?) from your deck(?:, show (?:that|it|those) .+? to your opponent,)? and put it (into your hand|into your mana zone|into the battle zone)\. then shuffle your deck$/.exec(base))&&deckItem(m[1]))
      return json({k:'search',f:deckItem(m[1]),to:{'into your hand':'hand','into your mana zone':'mana','into the battle zone':'bz'}[m[2]]});
    // The top cards of your deck.
    if((m=/^(?:you may )?(?:look at|reveal) the top (\d) cards of your deck\. put (one|all) (?:of them|(.+?) cards? from (?:among them|the revealed cards))( that has "\s?blocker\s?")? into your hand,? and (?:put )?the rest (on the bottom of your deck in any order|into your graveyard)$/.exec(base))){
      const civ=m[3]&&new RegExp('^'+CIVS+'(?: and '+CIVS+')?$').exec(m[3]);
      if(m[3]&&!civ)return null;
      return json({k:'look',n:+m[1],take:m[2],f:{civs:civ?[civ[1],civ[2]].filter(Boolean):null,block:!!m[4]},rest:m[5].startsWith('on')?'bottom':'gy',may:/^you may /.test(base)});
    }
    if((m=/^look at the top (\d) cards of your deck\. then put them back in any order$/.exec(base))||/^look at up to 5 cards from the top of your deck and put them back in any order$/.test(base))return json({k:'see',z:'top',n:m?+m[1]:5});
    // Information only: the player sees the cards, nothing moves.
    if((m=/^(?:you may )?look at (your shields|your opponent's hand|your opponent's shields|your opponent's hand and shields|the top card of your opponent's deck|your opponent's hand and at the top card of his deck)(?:\. then put (?:them|the shields) back where they were)?$/.exec(base)))
      return json({k:'see',z:m[1]});
    if((m=/^(?:you may )?look at (?:up to )?(\d) of your opponent's shields\. then put them back where they were$/.exec(base)))return json({k:'see',z:"your opponent's shields",n:+m[1]});
    // "If your opponent has more shields than you do, add the top card ..."
    if((m=/^(?:when you cast this spell, )?if (.+?), (.+)$/.exec(base))&&ifCondition(m[1])){const fx=effect(m[2]);if(fx)return json({k:'if',c:ifCondition(m[1]),fx:[].concat(fx)})}
    // Shields to hand.
    if((m=/^choose (one|any number) of your shields and (?:put|return) (?:it|them) (?:into|to) your hand(\. you can't use the "\s?shield trigger\s?" abilit(?:y|ies) of (?:that shield|those shields))?$/.exec(base)))
      return json({k:'shields',n:m[1]==='one'?1:0,to:'hand',trig:!m[2]});
    if(/^choose any number of your shields and put them into your mana zone$/.test(base))return json({k:'shields',n:0,to:'mana'});
    if(/^put all your shields into your hand$/.test(base))return json({k:'shields',all:1,to:'hand',trig:true});
    if(base==='add the top card of your deck to your shields face down')return 'shieldadd';
    if((m=/^add up to (\d) cards from the top of your deck to your shields face down$/.exec(base)))return json({k:'shieldUp',n:+m[1]});
    if((m=/^this creature breaks (one|2) of your opponent's shields$/.exec(base)))return json({k:'breakSh',n:m[1]==='one'?1:2});
    if(base==='your opponent draws a card')return json({k:'oppDraw'});
    if((m=/^each player (may )?draws? a card$/.exec(base)))return json({k:'each',fx:[m[1]?'optional:draw1':'draw1']});
    if(base==='return all the cards from your mana zone to your hand')return json({k:'manaAll',to:'hand'});
    if(base==='each player returns all cards from his mana zone to his hand')return json({k:'each',fx:[JSON.stringify({k:'manaAll',to:'hand',x})]});
    if(base==='return all tapped cards from your mana zone to your hand')return json({k:'manaAll',to:'hand',tapped:1});
    if((m=/^discard (a card|2 cards) from your hand$/.exec(base)))return json({k:'selfDiscard',n:m[1]==='a card'?1:2});
    if(base==='each player discards his hand')return json({k:'each',fx:['discardSelfAll']});
    if(base==='untap all the cards in your mana zone')return json({k:'untapMana'});
    if((m=/^your opponent discards (\d) cards at random from his hand$/.exec(base)))return json({k:'discardN',n:+m[1]});
    return null;
  }
  /* ---------- continuous abilities ---------- */
  // What a static ability gives: +N power, keywords (each parsed as a clause), and a
  // few printed permissions. Returns {power, traits} or null when anything is unknown.
  function grant(text){
    let rest=text.replace(/"\s*([^"]*?)\s*"/g,'"$1"').replace(/\s+\./g,'.').trim(),power=0,per=null;
    const traits={};
    while(rest){
      let m;
      if((m=/^(?:and )?(?:gets |get )?\+(\d+) power(?: for each (.+?))?(?= and |,|$)/.exec(rest))){
        power+=+m[1];
        if(m[2]){per=count(m[2]);if(!per)return null}
      }
      else if((m=/^(?:and |or )?(?:has |gets )?"([^"]+)"/.exec(rest))){
        const inner=clean(m[1].replace(/\.$/,''));
        if(!clause(inner,traits))return null;
      }
      else if((m=/^(?:and )?can attack untapped creatures/.exec(rest)))traits.hunts=1;
      else if((m=/^(?:and )?can't be blocked by any creature that has power (\d+) or less/.exec(rest)))traits.unblBy=+m[1];
      else if((m=/^(?:and )?can't be blocked/.exec(rest)))traits.unbl=1;
      else if((m=/^(?:and )?can't attack/.exec(rest)))traits.noAtk=1;
      else if((m=/^(?:and )?breaks one more shield/.exec(rest)))traits.brPlus=1;
      else if((m=/^instead of "double breaker\.?"/.exec(rest)));
      else return null;
      rest=rest.slice(m[0].length).replace(/^[\s,.]+/,'');
    }
    return {power,traits,per};
  }
  // "for each X" counts.
  const CIVS='('+civs.join('|')+')';
  function count(s){
    let m;
    s=s.replace(/ in the battle zone$/,' in the battle zone');
    if((m=new RegExp('^(?:of your )?other (?:(untapped|tapped) )?(?:'+CIVS+' )?creatures?(?: you have)?(?: in the battle zone)?$').exec(s)))
      return {zone:'bz',side:'own',other:1,state:m[1]||'',civ:m[2]||''};
    if((m=new RegExp('^(?:'+CIVS+' )?creature (you have|he has|your opponent has) in the battle zone$').exec(s)))return {zone:'bz',side:m[2]==='you have'?'own':'opp',civ:m[1]||''};
    if((m=/^(?:survivor|creature) in the battle zone$/.exec(s)))return {zone:'bz',side:'both',...(s.startsWith('survivor')?{races:['Survivor']}:{})};
    if((m=new RegExp('^other '+CIVS+' creature in the battle zone$').exec(s)))return {zone:'bz',side:'both',other:1,state:'',civ:m[1]};
    if((m=/^other (.+?) in the battle zone$/.exec(s))&&racesIn(m[1]))return {zone:'bz',side:'both',other:1,races:racesIn(m[1])};
    if((m=/^of your other creatures in the battle zone that has dragon in its race$/.exec(s)))return {zone:'bz',side:'own',other:1,dragon:1};
    if((m=new RegExp('^'+CIVS+' creature and '+CIVS+' creature your opponent has in the battle zone$').exec(s)))return {zone:'bz',side:'opp',civs:[m[1],m[2]]};
    if(s==='tapped creature your opponent has in the battle zone')return {zone:'bz',side:'opp',state:'tapped'};
    if(s==='shield you have')return {zone:'sh',side:'own'};
    if(s==='shield you and your opponent have')return {zone:'sh',side:'both'};
    if((m=new RegExp("^(tapped |"+CIVS+" )?card in (your|your opponent's) mana zone$").exec(s)))
      return {zone:'mana',side:m[3]==='your'?'own':'opp',state:m[1]==='tapped '?'tapped':'',civ:m[2]||''};
    if((m=/^card in (your|your opponent's) hand$/.exec(s)))return {zone:'hand',side:m[1]==='your'?'own':'opp'};
    if((m=new RegExp('^(?:'+CIVS+' )?(creature|card) in your graveyard$').exec(s)))return {zone:'gy',side:'own',civ:m[1]||'',type:m[2]};
    if(s==='civilization in your mana zone')return {zone:'mana',side:'own',civilizations:1};
    if((m=/^(.+) in each graveyard$/.exec(s))){const r=rows.find(r=>clean(r.name)===m[1]);if(r)return {zone:'gy',side:'both',name:r.name}}
    if((m=new RegExp('^(?:other )?'+CIVS+' creature you have in the battle zone$').exec(s)))return {zone:'bz',side:'own',civ:m[1]};
    if(s==='card in your mana zone')return {zone:'mana',side:'own'};
    if((m=new RegExp('^untapped '+CIVS+' card in your mana zone$').exec(s)))return {zone:'mana',side:'own',state:'untapped',civ:m[1]};
    return null;
  }
  // "while ..." conditions.
  function condition(s){
    let m;
    if((m=/^this creature has power (\d+) or more$/.exec(s)))return {powerAtLeast:+m[1]};
    if((m=new RegExp('^all the cards in your mana zone are '+CIVS+' cards$').exec(s)))return {monoMana:m[1]};
    if(s==='you have no shields')return {noShields:1};
    if(s==='this creature is tapped')return {selfTapped:1};
    if(s==='attacking')return {attacking:1};
    if((m=new RegExp('^you have (?:a|at least 1|at least one) (other )?(?:'+CIVS+' creature|(.+?)) in the battle zone$').exec(s))&&(m[2]||racesIn(m[3])))
      return {have:{other:!!m[1],civ:m[2]||'',races:m[2]?null:racesIn(m[3])}};
    if((m=new RegExp('^you have no other (?:'+CIVS+' )?creatures in the battle zone$').exec(s)))return {none:{other:true,civ:m[1]||''}};
    if(s==='you have any other untapped creatures in the battle zone')return {have:{other:true,state:'untapped'}};
    if((m=/^you have at least (\d) other creatures in the battle zone$/.exec(s)))return {haveN:+m[1]};
    if(s==='your opponent has more creatures in the battle zone than you do')return {oppMore:1};
    if(s==='you have no cards in your hand')return {emptyHand:1};
    return null;
  }
  // Scope of "each of your other fire creatures", "each demon command", "your cyber lords and hedrians".
  function scope(s){
    let m;
    if((m=/^(.+?)(?: in the battle zone)?$/.exec(s))&&!/^(?:each|your) /.test(s)){
      const cv=new RegExp('^'+CIVS+' and '+CIVS+' creatures$').exec(m[1]);
      if(cv)return {who:'all',civs:[cv[1],cv[2]]};
      const rs=racesIn(m[1]);
      return rs?{who:'all',races:rs}:null;
    }
    // "Each of your creatures in the battle zone that has "silent skill""
    if((m=/^(each of your creatures|your creatures) in the battle zone that (?:has|have) "\s?silent skill\s?"$/.exec(s)))return {who:'own',silent:1};
    if(/^each creature in the battle zone that has dragon in its race$/.test(s))return {who:'all',dragon:true};
    if(/^each of your creatures in the battle zone that has "\s?silent skill\s?"$/.test(s))return {who:'own',silent:1};
    if(!(m=/^(?:each |your )(of your |your )?(other )?(.+?)(?: in the battle zone)?(?: that has dragon in its race)?$/.exec(s)))return null;
    const out={who:m[1]||/^your /.test(s)?'own':'all',other:!!m[2],dragon:/that has dragon in its race$/.test(s)};
    const what=m[3];
    if(/^creatures?$/.test(what))return out;
    const cv=new RegExp('^'+CIVS+' creatures?(?: and '+CIVS+' creatures?)?$').exec(what)||new RegExp('^'+CIVS+' and '+CIVS+' creatures$').exec(what);
    if(cv)return {...out,civs:[cv[1],cv[2]].filter(Boolean)};
    const rs=racesIn(what);
    return rs?{...out,races:rs}:null;
  }
  // Wraps every ability in a fragment: Survivor shares it, Wave striker and Turbo rush
  // switch it on and off, "while ..." makes it conditional.
  function wrapped(t,frag,{who='self',races:rs,cond}={}){
    const {statics,...own}=frag;
    for(const st of statics||[])add(t,'statics',{...st,cond:st.cond&&cond?{...st.cond,...cond}:st.cond||cond,who:who==='self'?st.who:who,races:rs||st.races});
    if(Object.keys(own).length)add(t,'statics',{who,races:rs,cond,traits:own});
  }
  /* ---------- clauses ---------- */
  // Several sentences that must all be understood ("This creature gets +4000 power. When ...").
  function clauses(text,t,raw){
    if(clause(text,t,raw))return true;
    const parts=text.split(/\. (?=[a-z])/);
    if(parts.length<2)return false;
    const f={};
    if(!parts.every(p=>clause(p.replace(/\.$/,''),f,raw)))return false;
    for(const [k,v] of Object.entries(f))if(Array.isArray(v))add(t,k,v);else t[k]=v;
    return true;
  }
  const mergeInto=(t,traits)=>{for(const [k,v] of Object.entries(traits))if(Array.isArray(v))add(t,k,v);else t[k]=v};
  // "<scope> has/gets ..." where the scope may itself contain "has" ("that has dragon in its race").
  function scopedRule(rule){
    const re=/ (?:each )?(has|have|gets|get|can't be blocked)/g;let m;
    while((m=re.exec(rule)))if(scope(rule.slice(0,m.index)))return [null,rule.slice(0,m.index),m[1],rule.slice(m.index+m[0].length)];
    return null;
  }
  // Parses one printed clause into `t` (the card, or a fragment another clause wraps).
  function clause(rule,t,raw){
    let m;
    if(rule==='blocker')t.block=1;
    else if(rule==='speed attacker')t.speed=1;
    else if(rule==='double breaker')t.br=Math.max(t.br||0,2);
    else if(rule==='triple breaker')t.br=3;
    else if(rule==='slayer')t.slayer=1;
    else if(rule==="this creature can't attack players")t.noP=1;
    else if(rule==="this creature can't attack")t.noAtk=1;
    else if(rule==="this creature can't be blocked")t.unbl=1;
    else if(rule==='charger'&&raw&&raw.type==='Spell')t.charger=1;
    else if(rule==='at the end of each of your turns, you may untap this creature')t.endUntap=1;
    else if(rule==='this creature attacks each turn if able')t.mustAtk=1;
    else if(rule==='each creature attacks each turn if able')t.allMustAtk=1;
    else if((m=/^when this creature would be destroyed, (put it into your mana zone|return it to your hand|put it into your hand|shuffle it into your deck|add it to your shields face down) instead$/.exec(rule)))
      t.destroyTo={'put it into your mana zone':'mana','return it to your hand':'hand','put it into your hand':'hand','shuffle it into your deck':'deck','add it to your shields face down':'shield'}[m[1]];
    else if(rule==="this creature can't attack creatures")t.noAtkC=1;
    else if(rule==="this creature can't be attacked")t.noBeAtk=1;
    else if((m=/^this creature can't be attacked by (\w+)(?: or (\w+))? creatures$/.exec(rule))&&civs.includes(m[1])&&(!m[2]||civs.includes(m[2])))t.noBeAtkBy=[m[1],m[2]].filter(Boolean);
    else if(rule==="whenever an opponent's creature attacks, this creature blocks if able")t.mustBlock=1;
    else if(rule==='when this creature wins a battle, destroy it')t.winDie=1;
    else if(rule==='when this creature battles, destroy it after the battle')t.battleDie=1;
    else if(rule==='whenever this creature blocks, untap it after it battles')t.blockUntap=1;
    else if(rule==='at the end of each of your turns, if this is your only creature in the battle zone, destroy it')t.endDieAlone=1;
    else if(rule==='at the end of your turn, return this creature to your hand')t.endBounce=1;
    else if((m=/^this creature can't be blocked by any creature that has power (\d+) or less$/.exec(rule)))t.unblBy=+m[1];
    else if(rule==='you can summon this creature only if you have cast a spell this turn')t.needSpell=1;
    else if((m=/^(\w+) stealth$/.exec(rule))&&civs.includes(m[1]))t.stealth=m[1];
    else if((m=/^(\w+) and (\w+) slayer$/.exec(rule))&&civs.includes(m[1])&&civs.includes(m[2]))t.slayVs=[m[1],m[2]];
    else if(rule==="while your opponent has no shields, this creature can't attack")t.noAtkNoSh=1;
    else if(rule==='whenever this creature becomes blocked, no battle happens')t.noBattleBlocked=1;
    else if(rule==='whenever this creature blocks, no battle happens')t.noBattleBlocks=1;
    else if(rule==="while attacking a creature, this creature can't be blocked")t.unblVsC=1;
    else if((m=/^this creature can't be blocked by (\w+) creatures$/.exec(rule))&&civs.includes(m[1]))t.unblByCiv=[m[1]];
    else if(rule==='when this creature attacks a player, destroy it after the attack')t.atkPlayerDie=1;
    else if(rule==='when you put another creature into the battle zone, destroy this creature')add(t,'onOwnEnter','destroySelf');
    else if(rule==='whenever you put another creature into the battle zone, return this creature to your hand'||rule==='whenever you put another creature into the battle zone, return this creature from the battle zone to your hand')add(t,'onOwnEnter','bounceSelf');
    else if(rule==='whenever another creature is put into the battle zone, tap this creature')add(t,'onAnyEnter','tapSelf');
    else if(rule==='whenever another creature is put into the battle zone, you may draw a card')add(t,'onAnyEnter','optional:draw1');
    else if(rule==='whenever another creature is put into the battle zone, this creature gets +3000 power until the end of the turn')add(t,'onAnyEnter','boost3000');
    else if(rule==='this creature can attack untapped creatures')t.hunts=1;
    else if((m=/^(?:when this creature is put into your graveyard from the battle zone|when this creature is destroyed), (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onDie',fx)}
    else if((m=/^when (?:this creature attacks), (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onAtk',fx)}
    else if((m=/^whenever this creature is attacking your opponent and becomes blocked, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onBlockedP',fx)}
    else if(rule==="whenever this creature becomes blocked, no battle happens. return the blocking creature to its owner's hand"){t.noBattleBlocked=1;add(t,'onBlocked',JSON.stringify({k:'bounceBlocker',x:"Return the blocking creature to its owner's hand."}))}
    else if(rule==='when a player evolves another creature, destroy this creature')add(t,'onAnyEvolve','destroySelf');
    else if((m=/^whenever your opponent casts a spell, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onOppSpell',fx)}
    else if((m=/^whenever your opponent uses the "\s?shield trigger\s?" ability of a shield broken by this creature, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onOppTrigMine',fx)}
    else if((m=/^whenever you draw the card at the start of your turn, you may draw an extra card$/.exec(rule)))add(t,'onStart','drawUp1');
    else if(rule==="creatures that have power 3000 or more can't attack")add(t,'statics',{who:'self',rule:{bigNoAtk:3000}});
    else if(rule==="while this creature is tapped during your opponent's turn, each of his creatures attacks if able")add(t,'statics',{who:'self',cond:{selfTapped:1,oppTurn:1},rule:{oppMustAtk:1}});
    else if(rule==="at the start of each player's turn, that player chooses one of his creatures and destroys it")add(t,'statics',{who:'self',rule:{startDestroy:1}});
    else if(rule==='after you cast a spell by using its "shield trigger" ability, put it into your hand instead of your graveyard'||rule==='after you cast a spell by using its " shield trigger " ability, put it into your hand instead of your graveyard')add(t,'statics',{who:'self',rule:{trigToHand:1}});
    else if(rule==="your creatures and your opponent's creatures each cost up to 1 less to summon. they can't cost less than 1")add(t,'statics',{who:'all',cost:{t:'c',delta:-1,min:1}});
    else if((m=/^each of your other creatures in the battle zone that has power (\d+) or more breaks one more shield$/.exec(rule)))add(t,'statics',{who:'own',other:true,minP:+m[1],traits:{brPlus:1}});
    else if((m=/^whenever one of your creatures is destroyed during your opponent's turn, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onOwnDie',{races:null,oppTurn:1,fx:[].concat(fx)})}
    else if((m=/^this creature (can attack untapped creatures and has .+)$/.exec(rule))){const g=grant(m[1]);if(!g||g.power||g.per)return false;mergeInto(t,g.traits)}
    // "Fire and nature blocker", "Dragon blocker": blocks only those attackers.
    else if((m=/^(\w+)(?: and (\w+))? blocker$/.exec(rule))&&(m[1]==='dragon'&&!m[2]||civs.includes(m[1])&&(!m[2]||civs.includes(m[2])))){t.block=1;t.blockVs=m[1]==='dragon'?{dragon:1}:{civs:[m[1],m[2]].filter(Boolean)}}
    else if(rule==='you can put an evolution creature of any race on this creature')t.evoBaseAny=1;
    else if((m=/^(?:when|whenever) this creature loses a battle against a (\w+) creature, this creature isn't destroyed$/.exec(rule))&&civs.includes(m[1]))add(t,'surviveVs',m[1]);
    else if((m=/^when this creature leaves the battle zone, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onLeave',fx)}
    else if((m=/^whenever this creature attacks or leaves the battle zone, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onAtk',fx);add(t,'onLeave',fx)}
    else if((m=/^whenever this creature attacks a creature(?: that has power (\d+) or more)?, (.+)$/.exec(rule))){const fx=effect(m[2]);if(!fx)return false;add(t,'onAtkC',{min:+m[1]||0,fx:[].concat(fx)})}
    else if((m=/^whenever a player casts a spell, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onAnySpell',fx)}
    else if((m=/^whenever one of your (.+?) blocks, (.+)$/.exec(rule))&&racesIn(m[1])){const fx=effect(m[2]);if(!fx)return false;add(t,'statics',{who:'own',races:racesIn(m[1]),traits:{onBlock:[].concat(fx)}})}
    else if((m=/^whenever any of your (.+?) is attacking your opponent and isn't blocked, (.+)$/.exec(rule))&&racesIn(m[1])){const fx=effect(m[2]);if(!fx)return false;add(t,'statics',{who:'own',races:racesIn(m[1]),traits:{onUnblocked:[].concat(fx)}})}
    else if((m=/^whenever one of your (creatures|.+?) is destroyed, (.+)$/.exec(rule))&&(m[1]==='creatures'||racesIn(m[1]))){const fx=effect(m[2]);if(!fx)return false;add(t,'onOwnDie',{races:m[1]==='creatures'?null:racesIn(m[1]),fx:[].concat(fx)})}
    else if(rule==='at the end of each of your turns, if this creature broke any shields that turn, return it to your hand')t.endBounceBroke=1;
    else if(rule==="whenever your opponent would choose a creature in the battle zone, he can't choose this one")t.noChoose=1;
    else if(rule==="your opponent can't tap this creature")t.noOppTap=1;
    // Replacement effects.
    else if(rule==='when this creature would be put into your graveyard from the battle zone, add it to your shields face down instead')t.destroyTo='shield';
    else if((m=/^whenever another of your (\w+) creatures would be put into your graveyard from the battle zone, put it into your mana zone instead$/.exec(rule))&&civs.includes(m[1]))add(t,'statics',{who:'own',other:true,civs:[m[1]],traits:{destroyTo:'mana'}});
    else if(rule==='whenever one of your creatures that has "silent skill" would be destroyed, put it into your hand instead'||rule==='whenever one of your creatures that has " silent skill " would be destroyed, put it into your hand instead')add(t,'statics',{who:'own',silent:1,traits:{destroyTo:'hand'}});
    else if(/^your creatures that have "\s?silent skill\s?" are put into the battle zone tapped$/.test(rule))add(t,'statics',{who:'own',silent:1,traits:{entersTapped:1}});
    else if(rule==='evolution creatures are put into the battle zone tapped')add(t,'statics',{who:'all',evoOnly:1,traits:{entersTapped:1}});
    else if(rule==='whenever another creature would be destroyed, it stays in the battle zone instead')add(t,'statics',{who:'all',other:true,traits:{noDestroy:1}});
    else if(rule==='whenever this creature would break a shield, your opponent puts that shield into his graveyard instead')t.breakToGy=1;
    else if(rule==="whenever an opponent's creature would break a shield, you choose the shield instead of your opponent")t.chooseBroken=1;
    else if(rule==='when one of your shields would be broken, you may destroy this creature instead')t.shieldSaver='self';
    else if(rule==='whenever one of your shields would be broken, you may discard 2 cards from your hand instead')t.shieldSaver='discard2';
    else if(rule==="when this creature would be discarded from your hand during your opponent's turn, you may put it into the battle zone instead")t.discardToBz='may';
    else if(rule==="during your opponent's turn, if this creature would be discarded from your hand, put it into the battle zone instead")t.discardToBz='must';
    // Rules for both players.
    else if((m=/^players can't cast spells other than (\w+) spells$/.exec(rule))&&civs.includes(m[1]))add(t,'statics',{who:'self',rule:{onlySpells:m[1]}});
    else if((m=/^players can't use the "\s?shield trigger\s?" abilities of (\w+) cards$/.exec(rule))&&civs.includes(m[1]))add(t,'statics',{who:'self',rule:{noTrigCiv:m[1]}});
    else if(/^while this creature is tapped, your opponent can't use the "\s?shield trigger\s?" ability of his shields$/.test(rule))add(t,'statics',{who:'self',cond:{selfTapped:1},rule:{noOppTrig:1}});
    else if(rule==="you can't untap the cards in your mana zone at the start of each of your turns")add(t,'statics',{who:'self',rule:{noManaUntap:1}});
    else if(rule==="creatures in the battle zone don't untap at the start of each player's turn")add(t,'statics',{who:'self',rule:{noCreatureUntap:1}});
    // "While this creature is tapped, each of your other Beast Folk gets +2000 power."
    else if((m=/^while (.+?), ((?:each|your) .+)$/.exec(rule))&&condition(m[1])&&!/^(?:this creature|it) /.test(m[2])){const f={};if(!clause(m[2],f,raw)||Object.keys(f).some(k=>k!=='statics'))return false;wrapped(t,f,{cond:condition(m[1])})}
    else if((m=/^this creature can attack untapped (\w+) creatures$/.exec(rule))&&civs.includes(m[1]))add(t,'huntCivs',m[1]);
    else if((m=/^this creature can't be blocked by creatures that have power (\d+) or more$/.exec(rule)))t.unblByMin=+m[1];
    else if(rule==="this creature can't be attacked by any creature that has dragon in its race")t.noBeAtkDragon=1;
    // "Instead of having this creature attack, you may tap it to use its ability."
    else if((m=/^instead of having this creature attack, you may tap it to use its ability\. (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'tapAb',[[].concat(fx)])}
    else if((m=/^each of your (\w+) creatures may tap instead of attacking to use this creature's ability\. (.+)$/.exec(rule))&&civs.includes(m[1])){
      const fx=effect(m[2]);if(!fx)return false;add(t,'statics',{who:'own',civs:[m[1]],traits:{tapAb:[[].concat(fx)]}});
    }
    // Silent skill: at the start of your turn a tapped creature may stay tapped to use it.
    else if((m=/^silent skill (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'silent',[[].concat(fx)])}
    else if((m=/^at the start of each of your turns, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onStart',fx)}
    else if((m=/^at the end of each of your turns, (.+)$/.exec(rule))&&!/^if /.test(m[1])){const fx=effect(m[1]);if(!fx)return false;add(t,'onEnd',fx)}
    else if((m=/^whenever this creature becomes blocked, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onBlocked',fx)}
    else if((m=/^whenever this creature blocks, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onBlock',fx)}
    else if(rule==='when this creature blocks, destroy it after it battles')t.blockDie=1;
    else if((m=/^whenever this creature is attacking your opponent and isn't blocked, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onUnblocked',fx)}
    else if((m=/^whenever this creature is attacked, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onAttacked',fx)}
    else if((m=/^whenever another creature is destroyed, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onAnyDie',fx)}
    else if((m=/^whenever (?:any|one) of your creatures attacks, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onOwnAtk',fx)}
    else if((m=/^whenever your opponent uses the "\s?shield trigger\s?" ability of one of his shields, (.+)$/.exec(rule))){const fx=effect(m[1]);if(!fx)return false;add(t,'onOppTrig',fx)}
    else if((m=/^whenever your opponent summons a creature or casts a spell, this creature gets (.+) until the end of the turn$/.exec(rule))){
      const g=grant(m[1]);if(!g||g.per)return false;add(t,'onOppPlay',JSON.stringify({k:'grantSelf',g,x:sentence('this creature gets '+m[1].replace(/"\s*([^"]*?)\s*"/g,'"$1"')+' until the end of the turn')}));
    }
    // "Whenever you put a Ghost into the battle zone, ..."
    else if((m=/^whenever you put (?:a|an|another) (.+?) into the battle zone, (.+)$/.exec(rule))){
      const w=m[1],fx=effect(m[2]);let q;
      if(w==='creature that has cyber in its race'||w==='creature that has dragon in its race')q={raceWord:w.split(' ')[3]};
      else if(w==='dragonoid or a creature that has dragon in its race')q={raceWord:'dragon',races:['Dragonoid']};
      else if(racesIn(w))q={races:racesIn(w)};
      if(!q||!fx)return false;
      add(t,'enterWatch',{q:{...q,other:/^another /.test(rule.slice(17))},fx:[].concat(fx)});
    }
    // Cost changes.
    else if((m=/^your (creatures|spells) each cost 1 less to (?:summon|cast)\. they can't cost less than 1$/.exec(rule)))add(t,'statics',{who:'own',cost:{t:m[1]==='spells'?'s':'c',delta:-1,min:1}});
    else if(rule==="your creatures that have dragon in their race each cost 2 less to summon. they can't cost less than 2")add(t,'statics',{who:'own',cost:{t:'c',dragon:1,delta:-2,min:2}});
    else if((m=/^each (\w+) creature costs (\d) more to summon,? and each (\w+) spell costs (\d) more to cast$/.exec(rule))&&civs.includes(m[1])&&m[1]===m[3]&&m[2]===m[4])add(t,'statics',{who:'all',cost:{civ:m[1],delta:+m[2]}});
    // Crew breaker: one more shield for each of your other creatures of a kind.
    else if((m=/^crew breaker\s?—\s?(.+)$/.exec(rule))){
      const w=m[1].trim(),per=w==='dragon'?{zone:'bz',side:'own',other:1,dragon:1}:racesIn(w)&&{zone:'bz',side:'own',other:1,races:racesIn(w)};
      if(!per)return false;add(t,'statics',{who:'self',brPer:per});
    }
    else if((m=/^power attacker \+(\d+)$/.exec(rule)))t.pa=(t.pa||0)+ +m[1];
    else if(rule==='shield trigger')t.trig=1;
    else if(rule.startsWith('when this creature is destroyed, ')){const fx=effect(rule.slice(33));if(!fx)return false;add(t,'onDie',fx)}
    else if(rule.startsWith('when you put this creature into the battle zone, ')){const fx=effect(rule.slice(49));if(!fx)return false;add(t,'onSum',fx)}
    else if(rule.startsWith('whenever this creature attacks, ')){const fx=effect(rule.slice(32));if(!fx)return false;add(t,'onAtk',fx)}
    else if((m=/^during your opponent's turn, (.+)$/.exec(rule))){const f={};if(!clause(m[1],f,raw)||Object.keys(f).some(k=>k!=='statics'))return false;wrapped(t,f,{cond:{oppTurn:1}})}
    // Survivor: "Each of your Survivors has this creature's ability" (the reminder) + the ability.
    else if((m=/^survivor (.+)$/.exec(rule))){const f={};if(!clauses(m[1],f,raw))return false;wrapped(t,f,{who:'own',races:['Survivor']})}
    // Wave striker: on while 2 or more other creatures in the battle zone have wave striker.
    else if((m=/^wave striker (.+)$/.exec(rule))){const f={};if(!clauses(m[1],f,raw))return false;t.waveStriker=1;wrapped(t,f,{cond:{wave:1}})}
    // Turbo rush: on for the turn once another of your creatures has broken shields.
    else if((m=/^turbo rush (.+)$/.exec(rule))){const f={};if(!clauses(m[1],f,raw))return false;wrapped(t,f,{cond:{turbo:1}})}
    // "While ..., this creature has/gets ..."
    else if((m=/^(this creature (?:can't|can|has|gets) .+?) (while|if) (.+)$/.exec(rule))&&condition(m[3]))return clause(`while ${m[3]}, ${m[1]}`,t,raw);
    else if((m=/^while (.+?), (?:this creature|it) (gets .+|has .+|can.+)$/.exec(rule))){
      const cond=condition(m[1]),g=cond&&grant(m[2].replace(/ during its attacks$/,''));
      if(!g||(cond.powerAtLeast&&g.power))return false;
      const attacking=/ during its attacks$/.test(m[2]);
      add(t,'statics',{who:'self',cond:attacking?{...cond,attacking:1}:cond,power:g.power,per:g.per,traits:g.traits});
    }
    else if((m=/^while battling (?:a (\w+) creature|a creature that has dragon in its race), this creature gets \+(\d+) power$/.exec(rule))&&(!m[1]||civs.includes(m[1])))
      add(t,'statics',{who:'self',vs:m[1]?{civ:m[1]}:{dragon:1},power:+m[2]});
    // "This creature gets +N power (for each ...)"
    else if((m=/^this creature gets (\+\d+ power.*)$/.exec(rule))){const g=grant(m[1]);if(!g)return false;add(t,'statics',{who:'self',power:g.power,per:g.per,traits:g.traits})}
    // "Each of your other fire creatures has ...", "Your cyber lords and hedrians can't be blocked"
    else if((m=scopedRule(rule))){
      const g=grant(m[2]==="can't be blocked"?"can't be blocked"+m[3]:m[3].trim().replace(/^/,/^get/.test(m[2])?'gets ':'has '));
      if(!g||/until|this turn/.test(m[3]))return false;
      add(t,'statics',{...scope(m[1]),power:g.power,per:g.per,traits:g.traits});
    }
    else return false;
    return true;
  }
  const catalog=rows.map(raw=>{
    const c={id:'dm-'+raw.id,archiveId:raw.id,n:raw.name,e:raw.civilization.toLowerCase()||'unknown',e2:raw.civilization2.toLowerCase(),
      t:raw.type==='Spell'?'s':'c',cost:raw.mana===''?null:Number(raw.mana),p:parseInt(raw.power,10)||0,race:raw.race,
      txt:raw.abilities,rules:raw.abilities.split(/\s*;\s*/).filter(Boolean),art:raw.art,artThumb:raw.art_thumb,artWidth:raw.art_width,artThumbWidth:raw.art_thumb_width,scan:raw.scan,scanThumb:raw.scan_thumb,scanWidth:raw.scan_width,scanThumbWidth:raw.scan_thumb_width,originalScan:raw.original_scan||raw.scan,
      set:raw.set,setNumber:raw.set_number,setCount:raw.set_count,rarity:raw.rarity,printedType:raw.type,printedPower:raw.power,ocrDescription:raw.ocr_description||'',metadataSources:raw.metadata_sources||{},issues:[]};
    if(c.ocrDescription)c.issues.push('The extracted card text needs review before this card can be used in duels.');
    if(!['light','water','darkness','fire','nature'].includes(c.e)||c.cost===null||!['Creature','Evolution Creature','Spell'].includes(raw.type)||(raw.power===''&&c.t==='c')||(!c.race&&c.t==='c'))c.issues.push('Some card details have not been verified.');
    if(c.e2&&!civs.includes(c.e2))c.issues.push('Some card details have not been verified.');
    for(const printed of c.rules.flatMap(keywordRun)){
      const rule=clean(printed.replace(/\([^)]*\)/g,'').trim()).replace('when you put this creature is put into battle zone','when you put this creature into the battle zone').replace('to use its tap ability','to use its ability');
      if(rule==='')continue; // a reminder such as "(This creature is put into your mana zone tapped.)"
      let known,m;
      if(rule.startsWith('evolution')||rule.startsWith('vortex evolution')){
        // "Put on one of your Chimeras or Armorloids", "... creatures that has Dragon in its race",
        // and vortex evolution: "Put on one of your Fire Birds and one of your Earth Dragons".
        const base=(rule.split('put on one of your ')[1]||'').trim(),vortex=/^vortex/.test(rule);
        if(vortex&&(m=/^(.+?) and one of your (.+)$/.exec(base))&&racesIn(m[1])&&racesIn(m[2])){c.vortex=[racesIn(m[1])[0],racesIn(m[2])[0]];c.evo=c.vortex.join(' and ')}
        else if(!vortex&&/^creatures? that has dragon in its race$/.test(base)){c.evoDragon=1;c.evo='Dragon'}
        else if(!vortex&&(m=/^(.+?) or (.+)$/.exec(base))&&racesIn(m[1])&&racesIn(m[2])){c.evoRaces=[racesIn(m[1])[0],racesIn(m[2])[0]];c.evo=c.evoRaces.join(' or ')}
        else if(!vortex)c.evo=base&&races.find(r=>[clean(r),clean(r)+'s',clean(r).replace(/y$/,'ies')].includes(base));
        known=!!c.evo;
      }else if(c.t==='s'&&rule==='after you cast this spell, put it into your mana zone instead of your graveyard'){c.charger=1;known=true}
      else if(c.t==='s'&&(m=new RegExp('^you can cast this spell only if all the cards in your mana zone are '+CIVS+' cards$').exec(rule))){c.needMono=m[1];known=true}
      else if(c.t==='s'&&rule==='you can cast this spell only if your opponent has more shields than you do'){c.needBehind=1;known=true}
      else if(c.t==='s'&&!/^(shield trigger|charger)$/.test(rule)){
        const fx=effect(rule);if(fx)add(c,'fx',fx);known=!!fx;
      }else known=clause(rule,c,raw);
      if(!known)c.issues.push('This printed ability is not yet available in duels: '+printed);
    }
    if(c.t==='s'&&!c.fx)c.issues.push('This spell effect is not yet available in duels.');
    if(raw.type==='Evolution Creature'&&!c.evo)c.issues.push('The evolution requirement is not supported.');
    // A "+" power changes during play; it needs an ability that says how.
    if(raw.power.includes('+')&&!c.pa&&!(c.statics||[]).some(s=>s.power||s.traits&&s.traits.pa))c.issues.push('This variable power is not yet available in duels.');
    c.playable=c.issues.length===0;
    return c;
  });
  // Reprints share one duel entry, so four copies remain four copies per name.
  const firstPrint=new Map();
  for(const c of catalog){
    if(c.playable&&!firstPrint.has(c.n))firstPrint.set(c.n,c.id);
  }
  for(const c of catalog)c.duelId=firstPrint.get(c.n)||null;
  return catalog;
}
