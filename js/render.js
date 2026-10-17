/* ---------- rendering ---------- */
const ARTC={};
const artFor=(c,big)=>{const k=c.id+(big?'+':'');return ARTC[k]||(ARTC[k]=cardArt(c,!big))};
function cardHTML(c,cls='',plain=false){
  const e=CIV[c.e],P=PAL[c.e];
  const pw=c.t==='c'?(c.pa?`${c.p}+`:c.p):'Spell';
  const isBig=cls.includes('big');
  const sub=c.t==='s'?e.n:(c.evo?(isBig?'Evolution ':'Evo '):'')+c.race;
  const tags=[];
  if(c.uid&&c.sick&&G&&G.p.some(p=>p.bz.includes(c)))tags.push('Arriving');
  if(c.under&&c.under.length)tags.push(`+${c.under.length} under`);
  let fxc='',fxd='0ms';
  const f=G&&c.uid&&G.fx&&G.fx[c.uid];
  if(f){const age=now()-f.t0;if(age<600){fxc='fx-'+f.k;fxd=`-${age}ms`}else delete G.fx[c.uid]}
  return `<div class="card ${c.t==='s'?'spell':''} ${c.evo?'isevo':''} ${c.br===3?'legend':''} ${c.tapped?'tapped':''} ${fxc} ${cls}" ${plain?'':c.uid?`data-uid="${c.uid}" tabindex="0"`:`data-def="${c.id}" tabindex="0"`} style="--fxd:${fxd};--fr:${P.frame};--lt:${P.light};--dp:${P.deep};--md:${P.mid}" title="${c.n}: ${c.txt}" aria-label="${c.n}, ${e.n}, cost ${c.cost}${c.t==='c'?', power '+c.p:', spell'}. ${c.txt}">
    <div class="nbar"><span class="cost">${c.cost}</span><span class="nm">${c.n}</span></div>
    <div class="art">${artFor(c,isBig)}${c.trig?'<span class="trg">Trigger</span>':''}</div>
    <div class="txt">${c.txt.replace(' Shield trigger.','')}</div>
    ${tags.length?`<span class="tag">${tags.join(', ')}</span>`:''}
    <div class="bot"><span class="rc">${sub}</span><span class="pw">${pw}</span></div>
  </div>`;
}
function cls(c,p,z){
  const k=[],mine=p===G.p[0],free=G.turn===0&&!G.busy&&!G.targeting&&!G.modal&&!G.over;
  if(G.targeting?.uids.has(c.uid))k.push('target');
  if(G.sel?.uid===c.uid)k.push('sel');
  if(free&&mine&&z==='bz'&&!c.tapped&&!c.sick)k.push('can');
  if(free&&mine&&z==='hand'&&canPlay(p,c))k.push('can');
  if(free&&!mine&&z==='bz'&&c.tapped&&G.sel?.zone==='bz')k.push('target');
  return k.join(' ');
}
function sideHTML(p){
  const free=p.mana.filter(m=>!m.tapped).length;
  const bz=p.bz.length?p.bz.map(c=>cardHTML(c,cls(c,p,'bz'))).join(''):'<div class="empty">No creatures in the battle zone</div>';
  const top=`<div class="info"><b>${p.ai?'Opponent':'You'}</b><span>${p.deckName}</span><span>Deck ${p.deck.length}</span><span>Graveyard ${p.gy.length}</span>${p.ai?`<span>Hand ${p.hand.length}</span>`:''}</div>
    <div class="row"><div class="shields"><span class="lbl">Shields ${p.sh.length}</span>${p.sh.map((_,i)=>`<div class="back ${G.breaking&&G.breaking.p===p&&i>=p.sh.length-G.breaking.n?'shatter':''}"></div>`).join('')}</div>
    <div class="manas"><span class="lbl">Mana ${free}/${p.mana.length}</span>${p.mana.map(m=>`<span class="mana ${m.tapped?'used':''}" style="--el:${CIV[m.e].c}" title="${m.n}">${CIV[m.e].n[0]}</span>`).join('')}</div></div>`;
  if(p.ai)return `<section class="side">${top}<div class="zone bzone">${bz}</div></section>`;
  const hand=p.hand.length?p.hand.map(c=>cardHTML(c,cls(c,p,'hand'))).join(''):'<div class="empty">Your hand is empty</div>';
  return `<section class="side"><div class="zone bzone">${bz}</div>${top}<div class="lbl">Hand</div><div class="zone">${hand}</div></section>`;
}
const btn=(a,l,main)=>`<button data-act="${a}" class="${main?'main':''}">${l}</button>`;
function barHTML(){
  const me=G.p[0];
  if(G.over)return `<span class="prompt">${G.winner.ai?'The opponent broke through.':'You broke through every shield.'}</span>${btn('new','Play again',1)}`;
  if(G.targeting)return `<span class="turn">Choose</span><span class="prompt">${G.targeting.msg}</span>${btn('skip',G.targeting.skip||'Skip')}`;
  if(G.turn!==0)return `<span class="turn">Opponent's turn</span><span class="prompt">Watch for blocks and shield triggers.</span>`;
  if(G.busy)return `<span class="turn">Your turn</span><span class="prompt">Resolving…</span>`;
  const s=selCard();let h='<span class="turn">Your turn</span>';
  if(s&&G.sel.zone==='hand'){
    let why='';
    if(!canPay(me,s))why=` Needs ${s.cost} untapped mana, including 1 ${CIV[s.e].n}.`;
    else if(s.evo&&!bases(me,s).length)why=` Needs one of your ${s.evo}s in the battle zone.`;
    h+=`<span class="prompt">${s.n} selected.${why}</span>`;
    if(!me.charged)h+=btn('charge','Charge as mana');
    if(canPlay(me,s))h+=btn('play',s.t==='s'?'Cast':s.evo?'Evolve':'Summon',1);
    h+=btn('view','View card')+btn('cancel','Cancel');
  }else if(s&&G.sel.zone==='bz'){
    const any=G.p[1].bz.some(c=>c.tapped);
    if(s.noP)h+=`<span class="prompt">${s.n} can't attack players.${any?' Pick a tapped enemy creature to attack.':' No tapped enemy creatures to attack.'}</span>`;
    else{
      h+=`<span class="prompt">${s.n} is ready.${any?' Pick a tapped enemy creature, or':''}</span>`;
      h+=btn('atkp',G.p[1].sh.length?'Attack shields':'Attack directly',1);
    }
    h+=btn('view','View card')+btn('cancel','Cancel');
  }else{
    h+=`<span class="prompt">${me.charged?'Summon creatures or attack with ready ones.':'Pick a card to charge as mana, or summon and attack.'}</span>`;
  }
  return h+btn('end','End turn')+btn('menu','Menu');
}
function render(){
  if(!G)return;
  setPhase();
  $('#app').innerHTML=`${sideHTML(G.p[1])}<div class="bar">${barHTML()}</div>${sideHTML(G.p[0])}
    <div class="log" aria-live="polite">${G.log.slice(0,30).map(l=>`<div>${l}</div>`).join('')}</div>`;
  let layer='';
  if(G.modal)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${G.modal.title}</h2>${G.modal.card?`<div class="dcard">${cardHTML({...G.modal.card,uid:0,tapped:false},'big',true)}</div>`:''}<p>${G.modal.text}</p>
    <div class="opts">${G.modal.opts.map((o,i)=>`<button data-act="ans" data-v="${i}" class="${o.main?'main':''}">${o.label}</button>`).join('')}</div></div></div>`;
  else if(G.over)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${G.winner.ai?'Defeat':'Victory'}</h2>
    <p>${G.winner.ai?'Your last shield fell and the opponent landed the final blow.':'Every shield is gone and your creature struck the final blow.'}</p>
    <div class="opts">${btn('new','Play again',1)}</div></div></div>`;
  $('#layer').innerHTML=layer;
}
