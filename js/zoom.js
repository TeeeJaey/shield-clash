/* ---------- zoom view ---------- */
const GLOSS=[
 [d=>d.evo,d=>'Evolution',d=>`Play it on top of one of your ${d.evo}s in the battle zone. It can attack right away, and the cards underneath stay with it.`],
 [d=>d.speed,()=>'Speed attacker',()=>'Can attack the same turn you summon it.'],
 [d=>d.block,()=>'Blocker',()=>"When an enemy creature attacks, you can tap this creature to make the attacker battle it instead."],
 [d=>d.noP,()=>"Can't attack players",()=>'It can still attack tapped enemy creatures.'],
 [d=>d.pa,d=>`Power attacker +${d.pa}`,d=>`Has ${d.p+d.pa} power while it attacks.`],
 [d=>d.br===2,()=>'Double breaker',()=>'Breaks 2 shields when it hits.'],
 [d=>d.br===3,()=>'Triple breaker',()=>'Breaks 3 shields when it hits.'],
 [d=>d.unbl,()=>"Can't be blocked",()=>"Blockers can't stop this creature."],
 [d=>d.slayer,()=>'Slayer',()=>'Whenever it battles, the other creature is destroyed too, even if the Slayer loses.'],
 [d=>d.trig,()=>'Shield trigger',()=>'If this card comes out of one of your broken shields, you can cast it for free right away.'],
];
let ZOOM=null;
function openZoom(c){ZOOM=c;renderZoom()}
function closeZoom(){ZOOM=null;renderZoom()}
function renderZoom(){
  const el=$('#zoom');
  if(!ZOOM){el.innerHTML='';return}
  setPhase();
  const c=ZOOM,e=CIV[c.e];
  const kind=c.t==='s'?`${e.n} spell`:`${e.n} ${c.evo?'evolution ':''}creature, ${c.race}`;
  const stats=c.t==='s'?`Cost ${c.cost}`:`Cost ${c.cost}, power ${c.p}`;
  const kws=GLOSS.filter(g=>g[0](c)).map(g=>`<div><b>${g[1](c)}</b>${g[2](c)}</div>`).join('');
  const eff=[c.onSum?`<div><b>When summoned</b>${fxDesc(c.onSum)}</div>`:'',c.onAtk?`<div><b>When it attacks</b>${fxDesc(c.onAtk)}</div>`:'',
    c.onDie?`<div><b>When destroyed</b>${fxDesc(c.onDie)}</div>`:'',c.fx?`<div><b>Effect</b>${fxDesc(c.fx)}</div>`:''].join('');
  const st=[];
  if(c.uid&&G){
    if(G.p.some(p=>p.bz.includes(c))){st.push(c.tapped?'Tapped.':'Untapped.');if(c.sick)st.push("Arrived this turn, so it can't attack yet.")}
    if(c.under&&c.under.length)st.push(`Evolved on top of ${c.under.map(u=>u.n).join(', ')}.`);
  }
  el.innerHTML=`<div class="overlay" data-zbg="1"><div class="zbox zoomwrap" role="dialog" aria-label="${c.n}">
    <button class="zclose" data-zclose="1" aria-label="Close">×</button>
    ${cardHTML({...c,uid:0,tapped:false},'big',true)}
    <div class="zinfo"><h2>${c.n}</h2><p class="zmeta">${kind}. ${stats}.</p>
      ${st.length?`<p>${st.join(' ')}</p>`:''}
      <div class="kw">${eff}${kws}</div>
      <p class="hint">Tap outside or press Esc to close.</p></div>
  </div></div>`;
}
let pressT=null,swallow=false;
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
