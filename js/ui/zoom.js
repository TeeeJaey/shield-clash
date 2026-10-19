/* ---------- zoom view ---------- */
// Full rules for the detail panel: each ability, then its keyword explanation once.
function detailRules(c){
  const v=cardTextView(c);
  const rules=v.rules.length?`<ul class="printed-rules">${v.rules.map(r=>`<li>${esc(r.text)}${r.reminders.map(m=>`<span class="reminder"><b>${esc(m.term)}:</b> ${esc(m.text)}</span>`).join('')}</li>`).join('')}</ul>`
    :'<p class="zmeta">No abilities.</p>';
  return rules+(v.flavor?`<blockquote class="flavor">${esc(v.flavor)}</blockquote>`:'');
}
let ZOOM=null;
function openZoom(c){if(!c)return;ZOOM=c;renderZoom()}
function closeZoom(){ZOOM=null;renderZoom()}
function renderZoom(){
  const el=$('#zoom');
  if(!ZOOM){el.innerHTML='';return}
  setPhase();
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
      <p class="hint">Tap outside or press Esc to close.</p></div>
  </div></div>`;
}
let pressT=null,swallow=false;
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
    if(e.target.closest('[data-zclose]')||e.target.matches('[data-zbg]'))closeZoom();
    e.stopImmediatePropagation();return;
  }
  const d=e.target.closest('[data-def]');
  if(d&&!e.target.closest('[data-act]')){openZoom(DEF[d.dataset.def]);e.stopImmediatePropagation()}
},true);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&ZOOM){closeZoom();return}
  if($('#tutorial')){if(e.key==='ArrowRight')showTutorial(TUT+1);else if(e.key==='ArrowLeft')showTutorial(TUT-1);else if(e.key==='Escape')showStart();return}
  if((e.key==='i'||e.key==='I')&&e.target.matches&&e.target.matches('[data-uid]')){const c=findCard(+e.target.dataset.uid)?.c;if(c)openZoom(c)}
});
