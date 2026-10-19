/* ---------- zoom view ---------- */
// Full rules for the detail panel: each ability, then its keyword explanation once.
function detailRules(c){
  const v=cardTextView(c);
  const rules=v.rules.length?`<ul class="printed-rules">${v.rules.map(r=>`<li>${esc(r.text)}${r.reminders.map(m=>`<span class="reminder"><b>${esc(m.term)}:</b> ${esc(m.text)}</span>`).join('')}</li>`).join('')}</ul>`
    :'<p class="zmeta">No abilities.</p>';
  return rules+(v.flavor?`<blockquote class="flavor">${esc(v.flavor)}</blockquote>`:'');
}
let ZOOM=null,ZNAV=null;
const TOUCHY=matchMedia('(pointer: coarse)');
// nav: browse a list from the zoom view ({list}, a snapshot so it stays put), and for the
// deck builder ({build:true}) change how many copies are in the deck without closing it.
function openZoom(c,nav){if(!c)return;if(!ZOOM)navOpen('zoom');ZOOM=c;ZNAV=nav&&nav.list.includes(c)?{...nav,list:nav.list.slice()}:null;renderZoom()}
function closeZoom(){
  if(ZOOM)navClose('zoom');
  const back=ZNAV&&ZNAV.build&&ZOOM&&ZOOM.id;
  ZOOM=null;ZNAV=null;renderZoom();
  if(back)revealBuilderCard(back);
}
let ZSLIDE=0;
function stepZoom(d){
  if(!ZNAV||!ZOOM)return false;
  const i=ZNAV.list.indexOf(ZOOM),next=ZNAV.list[i+d];
  if(!next)return false;
  ZOOM=next;ZSLIDE=d;renderZoom();ZSLIDE=0;return true;
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
  // Touch screens swipe between cards, so the place shows without arrow buttons: dots for a
  // short list (a zone), a count for a long one (the deck builder's cards).
  let h=TOUCHY.matches?(n<=14?`<div class="zdots" aria-label="Card ${i+1} of ${n}">${ZNAV.list.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div>`
      :`<span class="zcount" aria-label="Card ${i+1} of ${n}"><b style="min-width:${String(n).length}ch">${i+1}</b> / ${n}</span>`)
    :`<div class="znav"><button class="icon" data-znav="-1" aria-label="Previous card" ${i>0?'':'disabled'}>‹</button><span class="zpos"><b style="min-width:${String(n).length}ch">${i+1}</b> of ${n}</span><button class="icon" data-znav="1" aria-label="Next card" ${i<n-1?'':'disabled'}>›</button></div>`;
  if(ZNAV.build){
    const c=BUILD.counts[ZOOM.id]||0,tot=total();
    const can=ZOOM.playable&&ZOOM.duelId===ZOOM.id;
    h+=`<div class="zqty" aria-label="Copies in your deck"><button data-zq="-1" aria-label="Remove a copy" ${c?'':'disabled'}>−</button><b aria-live="polite">${c}</b><button data-zq="1" aria-label="Add a copy" ${can&&c<MAX_COPY&&tot<DECK_MAX?'':'disabled'}>+</button>
      <span>in deck<br><small class="${legal(tot)?'ok':''}">${tot} / ${DECK_MIN}${tot>DECK_MIN?'+':''} cards</small></span></div>`;
  }
  return h;
}
// A face-up pile (graveyard or mana zone); tapping a card in it shows that card.
function openPile(title,cards){if(!ZOOM)navOpen('zoom');ZOOM={pile:{title,cards:cards.slice().reverse()}};renderZoom()}
function renderZoom(){
  const el=$('#zoom');
  if(!ZOOM){el.innerHTML='';return}
  setPhase();
  if(ZOOM.pile){
    const {title,cards}=ZOOM.pile;
    el.innerHTML=`<div class="overlay" data-zbg="1"><div class="zbox pilebox" role="dialog" aria-label="${esc(title)}">
      <button class="zclose" data-zclose="1" aria-label="Close">×</button><h2>${esc(title)}${cards.length?`<small>${cards.length} card${cards.length===1?'':'s'}</small>`:''}</h2>
      ${cards.length?`<div class="pile">${cards.map((c,i)=>`<div class="pitem" data-pile="${i}">${cardHTML({...c,uid:0,tapped:false},'',true)}${c.tapped?'<small>Tapped</small>':''}</div>`).join('')}</div>`:`<p class="zmeta">Nothing here yet.</p>`}
      ${cards.length?'<p class="hint">Newest first. Tap a card to read it.</p>':''}</div></div>`;
    return;
  }
  const c=ZOOM,e=archiveCivilization(c);
  // The card's facts as chips (civilizations, type, race) and two stat tiles (cost, power).
  const civChips=[c.e,c.e2].filter(Boolean).map(k=>{const v=CIV[k]||e;return `<span class="zchip" style="--el:${v.c}"><span class="tdot"></span>${esc(v.n)}</span>`}).join('');
  // On a phone the card itself is right above, so what it already prints (.zdup) is left out.
  const facts=`<div class="zfacts">${civChips}<span class="zchip zdup">${esc(c.printedType||(c.t==='s'?'Spell':'Creature'))}</span>${c.race?`<span class="zchip zdup">${esc(c.race.split('/').join(' / '))}</span>`:''}</div>
    <div class="zstats"><div class="zdup"><small>Cost</small><b>${c.cost??'–'}</b></div>${c.printedPower?`<div class="zdup"><small>Power</small><b>${esc(c.printedPower)}</b></div>`:''}
      <p class="zset">${esc(c.set)} · ${esc(c.setNumber)}/${esc(c.setCount)}${c.rarity?`<br>${esc(c.rarity)}`:''}</p></div>`;
  const st=[];
  if(c.uid&&G){
    if(G.p.some(p=>p.bz.includes(c))){st.push(c.tapped?'Tapped.':'Untapped.');if(c.sick)st.push("Arrived this turn, so it can't attack yet.")}
    if(c.under&&c.under.length)st.push(`Evolved on top of ${c.under.map(u=>u.n).join(', ')}.`);
    if(c.boost)st.push(`+${c.boost} power until the end of the turn.`);
  }
  el.innerHTML=`<div class="overlay" data-zbg="1"><div class="zstack"><div class="zbox zoomwrap ${ZSLIDE>0?'from-right':ZSLIDE<0?'from-left':''}" role="dialog" aria-label="${esc(c.n)}">
    <button class="zclose" data-zclose="1" aria-label="Close">×</button>
    ${zoomCardHTML(c)}
    <div class="zinfo"><header><h2 class="zdup">${esc(c.n)}</h2>${facts}</header>
      <div class="zbody">
        ${st.length?`<p class="zstate">${st.join(' ')}</p>`:''}
        ${detailRules(c)}
        ${c.playable?'':`<p class="collection-note">${esc(c.issues[0]||'This card is not yet available for duels.')}</p>`}
      </div>
      ${ZNAV?'':`<p class="hint">${TOUCHY.matches?'Swipe down or tap outside to close.':'Tap outside or press Esc to close.'}</p>`}</div>
  </div>${ZNAV?`<div class="zbar">${zoomNavHTML()}<p class="hint">${TOUCHY.matches?'Swipe sideways to browse · down to close':`${ZNAV.build?'← → browse · + − or 0–4 set copies':'← → browse'} · Esc closes`}</p></div>`:''}</div></div>`;
  // The zoomed card's art comes alive in its civilization's way.
  artfxAttach(el.querySelector('.card.big .art img'),c.e,c.e2);
}
// The zoomed card. On a touch screen with cards either side, slim chevrons beside it say it
// can be swiped (and work as buttons too); at either end of the list that side's goes away.
function zoomCardHTML(c){
  const card=cardHTML({...c,uid:0,tapped:false},'big',true);
  if(!ZNAV||!TOUCHY.matches)return card;
  const i=ZNAV.list.indexOf(c),side=(d,ok,label)=>`<button class="zside" data-znav="${d}" aria-label="${label}" ${ok?'':'hidden'}><svg viewBox="0 0 12 24" aria-hidden="true"><path d="${d<0?'M9 3L3 12l6 9':'M3 3l6 9-6 9'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  return `<div class="zcardnav">${side(-1,i>0,'Previous card')}${card}${side(1,i<ZNAV.list.length-1,'Next card')}</div>`;
}
// Every way of opening a card (click, right-click, long-press, keyboard) shows the same view:
// in the deck builder that's the browser with copy controls.
function zoomFrom(el){
  const f=el.dataset.uid?findCard(+el.dataset.uid):null,c=f?f.c:DEF[el.dataset.def];
  if(c)openZoom(c,el.closest('#bgrid')?{list:BUILD.shown||[],build:true}:zoneNav(f));
}
// A card opened from the board browses the zone it's in (a battle zone, your hand).
const zoneNav=f=>f&&f.c&&f.p[f.z]?{list:f.p[f.z]}:null;
// Touch gestures on the zoom view: swipe sideways to browse, swipe down to close (unless the
// text inside is scrolled, when a downward drag scrolls it back instead).
let pressT=null,swallow=false,swipe=null;
// `swallow` eats the click that ends a hold or a swipe; a new touch is a new gesture.
document.addEventListener('pointerdown',()=>{swallow=false},true);
document.addEventListener('pointerdown',e=>{
  const z=e.target.closest('#zoom');
  swipe=z&&e.pointerType!=='mouse'?{x:e.clientX,y:e.clientY,scrolled:(e.target.closest('.zbody,.pile')?.scrollTop||0)>0}:null;
},true);
document.addEventListener('pointermove',e=>{
  if(!swipe)return;
  const box=document.querySelector('#zoom .zbox');if(!box)return;
  const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;
  if(ZNAV&&Math.abs(dx)>Math.abs(dy))box.style.transform=`translateX(${dx*0.55}px) rotate(${dx*0.012}deg)`;
  else if(dy>0&&!swipe.scrolled)box.style.transform=`translateY(${dy*0.6}px)`;
},true);
document.addEventListener('pointerup',e=>{
  if(!swipe)return;
  const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y,s=swipe;swipe=null;
  const eat=()=>{swallow=true;setTimeout(()=>{swallow=false},350)};
  const back=()=>{const b=document.querySelector('#zoom .zbox');if(b){b.style.transition='transform .18s';b.style.transform='';setTimeout(()=>{b.style.transition=''},200)}};
  if(ZNAV&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.3){if(!stepZoom(dx<0?1:-1))back();eat()}
  else if(dy>90&&dy>Math.abs(dx)*1.5&&!s.scrolled){closeZoom();eat()}
  else back();
},true);
document.addEventListener('pointercancel',()=>{if(!swipe)return;swipe=null;const b=document.querySelector('#zoom .zbox');if(b)b.style.transform=''},true);
document.addEventListener('input',e=>{if(e.target.id==='dname'){BUILD.name=e.target.value;if(total())autoSave()}});
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest('[data-uid],[data-def]');if(!t||e.target.closest('#zoom'))return;
  // On the board, a held finger peeks at the card instead (peek.js).
  if(e.pointerType!=='mouse'&&t.closest('.duel,#layer'))return;
  clearTimeout(pressT);
  pressT=setTimeout(()=>{swallow=true;zoomFrom(t)},450);
});
['pointerup','pointercancel','pointerleave'].forEach(n=>document.addEventListener(n,()=>clearTimeout(pressT),true));
document.addEventListener('pointermove',e=>{if(Math.abs(e.movementX)+Math.abs(e.movementY)>6)clearTimeout(pressT)});
// Phones also fire contextmenu for a long press, during the hold or as the finger lifts.
// On the board a held finger already peeks (peek.js), so that one opens nothing more; a
// mouse's right-click still opens the zoom view.
let lastPointer='mouse';
document.addEventListener('pointerdown',e=>{lastPointer=e.pointerType},true);
document.addEventListener('contextmenu',e=>{
  const t=e.target.closest('[data-uid],[data-def]');if(!t)return;
  e.preventDefault();clearTimeout(pressT);
  if(lastPointer!=='mouse'&&t.closest('.duel,#layer'))return;
  zoomFrom(t);
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
  if(d&&!e.target.closest('[data-act]')){zoomFrom(d);e.stopImmediatePropagation()}
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
