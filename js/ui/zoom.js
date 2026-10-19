/* ---------- zoom view ---------- */
// Full rules for the detail panel: each ability, then its keyword explanation once.
function detailRules(c){
  const v=cardTextView(c);
  const rules=v.rules.length?`<ul class="printed-rules">${v.rules.map(r=>`<li>${esc(r.text)}${r.reminders.map(m=>`<span class="reminder"><b>${esc(m.term)}:</b> ${esc(m.text)}</span>`).join('')}</li>`).join('')}</ul>`
    :'<p class="zmeta">No abilities.</p>';
  return rules+(v.flavor?`<blockquote class="flavor">${esc(v.flavor)}</blockquote>`:'');
}
let ZOOM=null,ZNAV=null;
// nav: browse a list from the zoom view ({list}, a snapshot so it stays put), and for the
// deck builder ({build:true}) change how many copies are in the deck without closing it.
function openZoom(c,nav){if(!c)return;ZOOM=c;ZNAV=nav&&nav.list.includes(c)?{...nav,list:nav.list.slice()}:null;renderZoom()}
function closeZoom(){
  const back=ZNAV&&ZNAV.build&&ZOOM&&ZOOM.id;
  ZOOM=null;ZNAV=null;renderZoom();
  if(back)revealBuilderCard(back);
}
function stepZoom(d){
  if(!ZNAV||!ZOOM)return;
  const i=ZNAV.list.indexOf(ZOOM),next=ZNAV.list[i+d];
  if(next){ZOOM=next;renderZoom()}
}
// Copies in the deck, changed from the zoom view with the builder's own rules.
function zoomCopies(to){
  if(!ZNAV||!ZNAV.build||!ZOOM)return;
  const id=ZOOM.id;
  for(let n=BUILD.counts[id]||0,k=0;n!==to&&k<8;n=BUILD.counts[id]||0,k++){
    const before=n;onAct(to>n?'bplus':'bminus',id);
    if((BUILD.counts[id]||0)===before)break;
  }
  renderZoom();
}
function zoomNavHTML(){
  if(!ZNAV)return '';
  const i=ZNAV.list.indexOf(ZOOM),n=ZNAV.list.length;
  let h=`<div class="znav"><button class="icon" data-znav="-1" aria-label="Previous card" ${i>0?'':'disabled'}>‹</button><span>${i+1} of ${n}</span><button class="icon" data-znav="1" aria-label="Next card" ${i<n-1?'':'disabled'}>›</button></div>`;
  if(ZNAV.build){
    const c=BUILD.counts[ZOOM.id]||0,tot=total();
    const can=ZOOM.playable&&ZOOM.duelId===ZOOM.id;
    h+=`<div class="zqty" aria-label="Copies in your deck"><button data-zq="-1" aria-label="Remove a copy" ${c?'':'disabled'}>−</button><b aria-live="polite">${c}</b><button data-zq="1" aria-label="Add a copy" ${can&&c<MAX_COPY&&tot<DECK_MAX?'':'disabled'}>+</button>
      <span>in deck<br><small class="${legal(tot)?'ok':''}">${tot} / ${DECK_MIN}${tot>DECK_MIN?'+':''} cards</small></span></div>`;
  }
  return h;
}
// A face-up pile (graveyard or mana zone); tapping a card in it shows that card.
function openPile(title,cards){ZOOM={pile:{title,cards:cards.slice().reverse()}};renderZoom()}
function renderZoom(){
  const el=$('#zoom');
  if(!ZOOM){el.innerHTML='';return}
  setPhase();
  if(ZOOM.pile){
    const {title,cards}=ZOOM.pile;
    el.innerHTML=`<div class="overlay" data-zbg="1"><div class="zbox pilebox" role="dialog" aria-label="${esc(title)}">
      <button class="zclose" data-zclose="1" aria-label="Close">×</button><h2>${esc(title)}</h2>
      ${cards.length?`<div class="pile">${cards.map((c,i)=>`<div class="pitem" data-pile="${i}">${cardHTML({...c,uid:0,tapped:false},'',true)}${c.tapped?'<small>Tapped</small>':''}</div>`).join('')}</div>`:'<p class="zmeta">No cards.</p>'}
      <p class="hint">Newest first. Tap a card to read it.</p></div></div>`;
    return;
  }
  const c=ZOOM,e=archiveCivilization(c);
  const kind=[e.n,c.e2?CIV[c.e2].n:'',c.printedType,c.race].filter(Boolean).join(' · ');
  const stats=`Cost ${c.cost??'unlisted'}${c.printedPower?', power '+c.printedPower:''}`;
  const st=[];
  if(c.uid&&G){
    if(G.p.some(p=>p.bz.includes(c))){st.push(c.tapped?'Tapped.':'Untapped.');if(c.sick)st.push("Arrived this turn, so it can't attack yet.")}
    if(c.under&&c.under.length)st.push(`Evolved on top of ${c.under.map(u=>u.n).join(', ')}.`);
    if(c.boost)st.push(`+${c.boost} power until the end of the turn.`);
  }
  el.innerHTML=`<div class="overlay" data-zbg="1"><div class="zbox zoomwrap" role="dialog" aria-label="${c.n}">
    <button class="zclose" data-zclose="1" aria-label="Close">×</button>
    ${cardHTML({...c,uid:0,tapped:false},'big',true)}
    <div class="zinfo"><h2>${esc(c.n)}</h2><p class="zmeta">${esc(kind)}. ${stats}.</p>
      <p class="zmeta">${esc(c.set)} · ${esc(c.setNumber)}/${esc(c.setCount)}${c.rarity?' · '+esc(c.rarity):''}</p>
      ${st.length?`<p>${st.join(' ')}</p>`:''}
      ${detailRules(c)}
      ${c.playable?'':`<p class="collection-note">${esc(c.issues[0]||'This card is not yet available for duels.')}</p>`}
      ${zoomNavHTML()}
      <p class="hint">${ZNAV?(ZNAV.build?'Arrow keys or swipe to browse, + and − (or 0 to 4) to change the count. ':'Arrow keys or swipe to browse. '):''}Tap outside or press Esc to close.</p></div>
  </div></div>`;
}
let pressT=null,swallow=false,swipeX=null;
document.addEventListener('pointerdown',e=>{swipeX=ZNAV&&e.target.closest('#zoom')&&e.pointerType!=='mouse'?e.clientX:null},true);
document.addEventListener('pointerup',e=>{
  if(swipeX==null)return;
  const dx=e.clientX-swipeX;swipeX=null;
  if(Math.abs(dx)>60){stepZoom(dx<0?1:-1);swallow=true;setTimeout(()=>{swallow=false},350)}
},true);
document.addEventListener('input',e=>{if(e.target.id==='dname'){BUILD.name=e.target.value;if(total())autoSave()}});
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest('[data-uid],[data-def]');if(!t||e.target.closest('#zoom'))return;
  clearTimeout(pressT);
  pressT=setTimeout(()=>{swallow=true;const c=t.dataset.uid?findCard(+t.dataset.uid)?.c:DEF[t.dataset.def];if(c)openZoom(c)},450);
});
['pointerup','pointercancel','pointerleave'].forEach(n=>document.addEventListener(n,()=>clearTimeout(pressT),true));
document.addEventListener('pointermove',e=>{if(Math.abs(e.movementX)+Math.abs(e.movementY)>6)clearTimeout(pressT)});
document.addEventListener('contextmenu',e=>{
  const t=e.target.closest('[data-uid],[data-def]');if(!t)return;
  e.preventDefault();clearTimeout(pressT);
  const c=t.dataset.uid?findCard(+t.dataset.uid)?.c:DEF[t.dataset.def];if(c)openZoom(c);
});
document.addEventListener('click',e=>{
  if(swallow){swallow=false;e.stopImmediatePropagation();e.preventDefault();return}
  if(e.target.closest('#zoom')){
    const pi=e.target.closest('[data-pile]'),nv=e.target.closest('[data-znav]'),q=e.target.closest('[data-zq]');
    if(pi&&ZOOM&&ZOOM.pile){const cards=ZOOM.pile.cards;openZoom(cards[+pi.dataset.pile],{list:cards})}
    else if(nv)stepZoom(+nv.dataset.znav);
    else if(q&&ZOOM)zoomCopies((BUILD.counts[ZOOM.id]||0)+(+q.dataset.zq));
    else if(e.target.closest('[data-zclose]')||e.target.matches('[data-zbg]'))closeZoom();
    e.stopImmediatePropagation();return;
  }
  const d=e.target.closest('[data-def]');
  if(d&&!e.target.closest('[data-act]')){const c=DEF[d.dataset.def];openZoom(c,d.closest('#bgrid')?{list:BUILD.shown||[],build:true}:null);e.stopImmediatePropagation()}
},true);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&ZOOM){closeZoom();return}
  if(ZOOM&&ZNAV&&!(e.target.matches&&e.target.matches('input,textarea,select'))){
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stepZoom(e.key==='ArrowLeft'?-1:1);return}
    if(ZNAV.build){
      const n=BUILD.counts[ZOOM.id]||0;
      if(e.key==='+'||e.key==='='){zoomCopies(n+1);return}
      if(e.key==='-'||e.key==='_'){zoomCopies(n-1);return}
      if(/^[0-4]$/.test(e.key)){zoomCopies(+e.key);return}
    }
  }
  if($('#tutorial')){if(e.key==='ArrowRight')showTutorial(TUT+1);else if(e.key==='ArrowLeft')showTutorial(TUT-1);else if(e.key==='Escape')showStart();return}
  if((e.key==='i'||e.key==='I')&&e.target.matches&&e.target.matches('[data-uid]')){const c=findCard(+e.target.dataset.uid)?.c;if(c)openZoom(c)}
});
