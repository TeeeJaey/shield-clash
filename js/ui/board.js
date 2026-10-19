function setPhase(){const el=document.documentElement;if(el&&el.style)el.style.setProperty('--ph',`-${now()%8000}ms`)}
// A mana chip shows the civilizations it can pay for; multicolored mana is split.
const manaChip=m=>{const cs=civsOf(m);return `<span class="mana ${m.tapped?'used':''}" style="--el:${CIV[m.e].c}${m.e2?`;background:linear-gradient(135deg,${CIV[m.e].c} 50%,${CIV[m.e2].c} 50%)`:''}" title="${esc(m.n)}">${cs.map(e=>CIV[e].n[0]).join('')}</span>`};
function cls(c,p,z){
  const k=[],mine=p===G.p[0],free=G.turn===0&&!G.busy&&!G.targeting&&!G.modal&&!G.over;
  if(G.targeting?.uids.has(c.uid))k.push('target');
  if(G.sel?.uid===c.uid)k.push('sel');
  if(free&&mine&&z==='bz'&&canAttackAnything(c,p))k.push('can');
  if(free&&mine&&z==='hand'&&canPlay(p,c))k.push('can');
  if(free&&!mine&&z==='bz'&&G.sel?.zone==='bz'&&canAttackCreature(selCard(),G.p[0],c))k.push('target');
  return k.join(' ');
}
function sideHTML(p){
  const free=p.mana.filter(m=>!m.tapped).length;
  const bz=p.bz.length?p.bz.map(c=>cardHTML(c,cls(c,p,'bz'))).join(''):'<div class="empty">No creatures in the battle zone</div>';
  const top=`<div class="info"><b>${p===G.p[0]?'You':(G.mp?esc(p.name):'Opponent')}</b><span>${p.deckName}</span><span>Deck ${p.deck.length}</span><span>Graveyard ${p.gy.length}</span>${p!==G.p[0]?`<span>Hand ${p.hand.length}</span>`:''}</div>
    <div class="stack"><div class="shields"><span class="lbl">Shields ${p.sh.length}</span>${p.sh.map((_,i)=>`<div class="back ${G.breaking&&G.breaking.p===p&&i>=p.sh.length-G.breaking.n?'shatter':''}"></div>`).join('')}</div>
    <div class="manas"><span class="lbl">Mana ${free}/${p.mana.length}</span>${p.mana.map(manaChip).join('')}</div></div>`;
  if(p!==G.p[0])return `<section class="side">${top}<div class="zone bzone">${bz}</div></section>`;
  const hand=p.hand.length?p.hand.map(c=>cardHTML(c,cls(c,p,'hand'))).join(''):'<div class="empty">Your hand is empty</div>';
  return `<section class="side"><div class="zone bzone">${bz}</div>${top}<div class="lbl">Hand</div><div class="zone">${hand}</div></section>`;
}
const btn=(a,l,main,v)=>`<button data-act="${a}"${v!=null?` data-v="${v}"`:''} class="${main?'main':''}">${l}</button>`;
function barHTML(){
  const me=G.p[0];
  const oppName=G.mp?esc(G.p[1].name):'Opponent',lost=G.winner!==G.p[0];
  if(G.mp&&!IN_CLAUDE&&NET.status&&!G.over)return `<span class="turn">Offline</span><span class="prompt">${NET.status}</span>${btn('menu','Menu')}`;
  if(G.over)return `<span class="prompt">${G.left!=null?`${oppName} left the game.`:lost?`${oppName} broke through.`:'You broke through every shield.'}</span>${btn('new',G.mp?'Back to start page':'Play again',1)}`;
  if(G.req&&G.mp&&!G.targeting&&G.req.seat!==VIEW)return `<span class="turn">Waiting</span><span class="prompt">${oppName} is deciding what to do…</span>`;
  if(G.targeting)return `<span class="turn">Choose</span><span class="prompt">${G.targeting.msg}</span>${G.targeting.required?'':btn('skip',G.targeting.skip||'Skip')}`;
  if(G.turn!==0)return `<span class="turn">${G.mp?oppName+"'s":"Opponent's"} turn</span><span class="prompt">${G.mp?'Their moves show up here as they play. ':''}Watch for blocks and shield triggers.</span>${G.mp?btn('menu','Menu'):''}`;
  if(G.busy)return `<span class="turn">Your turn</span><span class="prompt">Resolving…</span>`;
  const s=selCard();let h='<span class="turn">Your turn</span>';
  if(s&&G.sel.zone==='hand'){
    let why='';
    if(!canPay(me,s))why=` Needs ${s.cost} untapped mana, including ${civsOf(s).map(e=>'1 '+CIV[e].n).join(' and ')}${s.e2?' from different cards':''}.`;
    else if(s.evo&&!bases(me,s).length)why=` Needs one of your ${s.evo}s in the battle zone.`;
    else if(s.needSpell&&!me.castSpell)why=' You can summon it only after casting a spell this turn.';
    h+=`<span class="prompt">${s.n} selected.${why}</span>`;
    if(!me.charged)h+=btn('charge','Charge as mana');
    if(canPlay(me,s))h+=btn('play',s.t==='s'?'Cast':s.evo?'Evolve':'Summon',1);
    h+=btn('view','View card')+btn('cancel','Cancel');
  }else if(s&&G.sel.zone==='bz'){
    const any=attackTargets(s,me).length>0,prey=T(s).hunts?'an enemy creature':'a tapped enemy creature';
    const tapAb=canTapAbility(s,me)?T(s).tapAb.map((fx,i)=>btn('tapab','Tap: '+esc(fxDesc(fx)),0,i)).join(''):'';
    if(!canAttackAnything(s,me))h+=`<span class="prompt">${s.n} can tap instead of attacking to use its ability.</span>`;
    else if(!canAttackPlayer(s,me))h+=`<span class="prompt">${s.n} can't attack players.${any?` Pick ${prey} to attack.`:' No creatures available to attack.'}</span>`;
    else{
      h+=`<span class="prompt">${G.notice||`${s.n} is ready.`}${any?` Pick ${prey}, or`:''}</span>`;
      h+=btn('atkp',G.p[1].sh.length?'Attack shields':'Attack directly',1);
    }
    h+=tapAb;
    h+=btn('view','View card')+btn('cancel','Cancel');
  }else{
    h+=`<span class="prompt">${G.notice||(me.charged?'Summon creatures or attack with ready ones.':'Pick a card to charge as mana, or summon and attack.')}</span>`;
  }
  return h+btn('end','End turn')+btn('menu','Menu');
}
function render(){
  if(!G)return;
  setPhase();
  warmArt(G.p.flatMap(p=>[p.hand,p.bz,p.mana,p.sh,p.deck,p.gy].flat()));
  if(G.mp&&MP&&!MP.applying&&G.turn===0&&!G.over)mpPush();
  $('#app').innerHTML=`${sideHTML(G.p[1])}<div class="bar">${barHTML()}</div>${sideHTML(G.p[0])}
    <div class="log" aria-live="polite">${G.log.slice(0,30).map(l=>`<div>${viewText(l)}</div>`).join('')}</div>`;
  let layer='';
  if(G.modal)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${G.modal.title}</h2>${G.modal.card?`<div class="dcard">${cardHTML({...G.modal.card,uid:0,tapped:false},'big',true)}</div>`:''}<p>${G.modal.text}</p>
    <div class="opts">${G.modal.opts.map((o,i)=>`<button data-act="ans" data-v="${i}" class="${o.main?'main':''}">${o.label}</button>`).join('')}</div></div></div>`;
  else if(G.over)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${G.winner!==G.p[0]?'Defeat':'Victory'}</h2>
    <p>${G.left!=null?`${esc(G.p[1].name)} left the game.`:G.winner!==G.p[0]?`Your last shield fell and ${G.mp?esc(G.p[1].name):'the opponent'} landed the final blow.`:'Every shield is gone and your creature struck the final blow.'}</p>
    <div class="opts">${btn('new',G.mp?'Back to start page':'Play again',1)}</div></div></div>`;
  $('#layer').innerHTML=layer;
}
