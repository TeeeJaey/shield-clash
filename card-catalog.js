/* Adapt the game's card metadata to the duel engine. Unknown abilities stay
   collection-only; no printed text is replaced by an approximation. */
function makeCardCatalog(rows){
  const clean=text=>text.toLowerCase().replace(/[\u2018\u2019]/g,"'").replace(/\s*'\s*/g,"'").replace(/\s+/g,' ').replace(/\.$/,'').trim();
  const races=[...new Set(rows.map(r=>r.race).filter(Boolean))];
  function effect(text){
    const s=clean(text),optional=/^you may /.test(s),base=s.replace(/^you may /,'');
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
    return null;
  }
  const catalog=rows.map(raw=>{
    const c={id:'dm-'+raw.id,archiveId:raw.id,n:raw.name,e:raw.civilization.toLowerCase()||'unknown',e2:raw.civilization2.toLowerCase(),
      t:raw.type==='Spell'?'s':'c',cost:raw.mana===''?null:Number(raw.mana),p:parseInt(raw.power,10)||0,race:raw.race,
      txt:raw.abilities,rules:raw.abilities.split(/\s*;\s*/).filter(Boolean),art:raw.art,artThumb:raw.art_thumb,artWidth:raw.art_width,artThumbWidth:raw.art_thumb_width,scan:raw.scan,scanThumb:raw.scan_thumb,scanWidth:raw.scan_width,scanThumbWidth:raw.scan_thumb_width,originalScan:raw.original_scan||raw.scan,
      set:raw.set,setNumber:raw.set_number,setCount:raw.set_count,rarity:raw.rarity,printedType:raw.type,printedPower:raw.power,ocrDescription:raw.ocr_description||'',metadataSources:raw.metadata_sources||{},issues:[]};
    if(c.ocrDescription)c.issues.push('The extracted card text needs review before this card can be used in duels.');
    if(!['light','water','darkness','fire','nature'].includes(c.e)||c.cost===null||!['Creature','Evolution Creature','Spell'].includes(raw.type)||(!c.p&&c.t==='c')||(!c.race&&c.t==='c'))c.issues.push('Some card details have not been verified.');
    if(c.e2)c.issues.push('Multicolored cards are available in the collection.');
    for(const printed of c.rules){
      const rule=clean(printed.replace(/\([^)]*\)/g,'').trim());
      let m,known=true;
      if(rule==='blocker')c.block=1;
      else if(rule==='speed attacker')c.speed=1;
      else if(rule==='double breaker')c.br=2;
      else if(rule==='triple breaker')c.br=3;
      else if(rule==='slayer')c.slayer=1;
      else if(rule==="this creature can't attack players")c.noP=1;
      else if(rule==="this creature can't attack")c.noAtk=1;
      else if(rule==="this creature can't be blocked")c.unbl=1;
      else if(rule==='this creature can attack untapped creatures')c.hunts=1;
      else if((m=/^power attacker \+(\d+)$/.exec(rule)))c.pa=+m[1];
      else if(rule==='shield trigger'){c.trig=1;if(c.t!=='s')known=false}
      else if(rule.startsWith('evolution')){
        const base=rule.split('put on one of your ')[1];
        c.evo=base&&races.find(r=>[clean(r),clean(r)+'s'].includes(base));
        if(!c.evo)known=false;
      }else if(rule.startsWith('when you put this creature into the battle zone, ')){
        const fx=effect(rule.slice('when you put this creature into the battle zone, '.length));
        if(fx)c.onSum=[...(c.onSum||[]),fx];else known=false;
      }else if(rule.startsWith('whenever this creature attacks, ')){
        const fx=effect(rule.slice('whenever this creature attacks, '.length));
        if(fx)c.onAtk=[...(c.onAtk||[]),fx];else known=false;
      }else if(c.t==='s'){
        const fx=effect(rule);if(fx)c.fx=[...(c.fx||[]),fx];else known=false;
      }else known=false;
      if(!known)c.issues.push('This printed ability is not yet available in duels: '+printed);
    }
    if(c.t==='s'&&!c.fx)c.issues.push('This spell effect is not yet available in duels.');
    if(raw.type==='Evolution Creature'&&!c.evo)c.issues.push('The evolution requirement is not supported.');
    if(raw.power.includes('+')&&!c.pa)c.issues.push('This variable power is not yet available in duels.');
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
