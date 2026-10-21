/* ---------- deck builder ---------- */
const total=()=>Object.values(BUILD.counts).reduce((a,b)=>a+b,0);
function fillDeck(){
  let civs=[...new Set(Object.keys(BUILD.counts).filter(id=>BUILD.counts[id]>0).flatMap(id=>civsOf(DEF[id])))];
  if(!civs.length)civs=shuffle(Object.keys(CIV)).slice(0,2);
  const pool=DEFS.filter(d=>civsOf(d).every(e=>civs.includes(e)));
  let guard=0;
  while(total()<DECK_SIZE&&guard++<500){
    const have=f=>Object.keys(BUILD.counts).some(id=>BUILD.counts[id]>0&&f(DEF[id]));
    const open=pool.filter(d=>(BUILD.counts[d.id]||0)<MAX_COPY&&(!d.evo||have(b=>!b.evo&&evolvesOn(d,b)))&&(!d.needSpell||have(b=>b.t==='s')));
    if(!open.length)break;
    // favour cheaper cards so the deck has early plays
    const w=open.map(d=>Math.max(1,9-d.cost));
    let r=Math.random()*w.reduce((a,b)=>a+b,0),pick=open[0];
    for(let i=0;i<open.length;i++){r-=w[i];if(r<=0){pick=open[i];break}}
    BUILD.counts[pick.id]=(BUILD.counts[pick.id]||0)+1;
  }
  BUILD.msg=total()<DECK_SIZE?`Not enough cards in these civilizations to reach ${DECK_SIZE}. Add another civilization.`:'';
}
async function showBuilder(id){
  navTo('builder');
  G=null;$('#layer').innerHTML='';
  await loadDecks();
  const d=id&&MYDECKS.find(x=>x.id===id);
  BUILD=d?{counts:validCounts(d.counts),msg:Object.keys(d.counts).some(id=>!DEF[id]?.playable)?'This deck uses cards from the previous card set. Add archive cards to update it.':'',filter:BUILD.filter||'fire',id:d.id,name:d.name,saved:'Saved'}
         :{counts:{},msg:'',filter:'all',id:null,name:`My deck ${MYDECKS.length+1}`,saved:''};
  renderBuilder();window.scrollTo(0,0);
}
// Rounded down: the header is often a fraction of a pixel taller than a whole number, and what
// sticks under it (the phone's search bar) must overlap it, or cards show through a thin line.
const setBhh=el=>document.documentElement.style.setProperty('--bhh',Math.floor(el.getBoundingClientRect().height)+'px');
const BH_SIZE=new ResizeObserver(([e])=>setBhh(e.target));
// Search ignores accents, capitals and symbols: "pangaeas song" finds Pangaea's Song, "great horn"
// and "greathorn" find Roaring Great-Horn, and "u" finds Ü.
const searchKey=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/['‘’`]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const SEARCH_KEYS=new Map();
function searchFits(d,q,qs){
  let k=SEARCH_KEYS.get(d.id);
  if(!k){const t=[d.n,d.race,d.txt].map(searchKey).join(' | ');k={t,s:t.replace(/ /g,'')};SEARCH_KEYS.set(d.id,k)}
  return k.t.includes(q)||k.s.includes(qs);
}
function renderBuilder(){
  setPhase();
  const tot=total();
  // Redrawing the builder (a + or −, a name change) keeps the page where it was: the new grid
  // starts at the old one's height, so the page never shrinks and the browser never scrolls to the top.
  const oldGrid=$('#bgrid'),keepH=oldGrid&&oldGrid.style.height,keepY=oldGrid?scrollY:null,cartY=$('.clist')?.scrollTop||0;
  let h=`<header class="bh"><h2>Deck builder</h2><input id="dname" class="dname" aria-label="Deck name" maxlength="30" value="${esc(BUILD.name||'')}"><button class="cnt ${legal(tot)?'ok':''}" data-act="bcart" aria-expanded="${!!BUILD.cart}" title="Show your deck">${tot} cards <small class="bsaved">${tot<DECK_MIN?`${DECK_MIN-tot} more to play`:tot===DECK_MAX?'Maximum reached':`Up to ${DECK_MAX}`}</small> <small id="bsaved" class="bsaved">${BUILD.saved||''}</small>${warnBadge()}<span class="ccaret" aria-hidden="true">›</span></button>
    <button class="bmore-btn icon" data-act="bmenu" aria-expanded="${!!BUILD.menu}" aria-label="More deck actions" title="More">⋯</button>
    <span class="bacts ${BUILD.menu?'open':''}">${btn('brandom','Random optimal deck')}${btn('bfill',`Fill to ${DECK_SIZE}`)}${btn('bclear','Clear')}${btn('bexport','Export deck')}${btn('bimport','Import deck')}</span><button data-act="back" class="sysbtn bback" title="Back to the start page" aria-label="Back to the start page">${ICON.back}<span>Back</span></button>
    <button data-act="bstart" class="main" ${legal(tot)?'':'disabled'}>Start duel</button>
    <span class="bmsg ${BUILD.msg?'note':''}">${BUILD.msg||'Decks hold 50 to 60 cards, with up to 4 copies of each. Your deck saves automatically. Tap a card to zoom in. Two civilizations is the classic setup; more is risky for mana.'}</span></header>`;
  // On a phone the search, a Filters button and the civilization tabs stay at the top while the
  // cards scroll (.bfind); the other filters open in a sheet (.bsheet). A wide screen shows it
  // all inline, as before.
  const civs=['all',...Object.keys(CIV)];
  h+=`<div class="bfind"><nav class="tabs">${civs.map(e=>{const pool=e==='all'?DEFS:DEFS.filter(d=>civsOf(d).includes(e)),n=pool.reduce((t,d)=>t+(BUILD.counts[d.id]||0),0);
    return `<button data-act="bfilter" data-v="${e}" class="${BUILD.filter===e?'main':''} ${e==='all'?'all':''}" style="--el:${e==='all'?'currentColor':CIV[e].c};--tab:${e==='all'?'var(--ink)':CIV[e].c}"><span class="tdot"></span>${e==='all'?'All':CIV[e].n}${n?` (${n})`:''}</button>`}).join('')}</nav>`;
  const f=BUILD.find||(BUILD.find={q:'',mech:'all',type:'all',sort:'cost',mine:false});
  const set=(f.mech!=='all')+(f.type!=='all')+(f.sort!=='cost')+(!!f.mine);
  const select=(key,label,options)=>`<div class="fld"><span>${label}</span>${ddHTML(key,options,f[key],{label})}</div>`;
  h+=`<div class="collection-tools build-tools"><label class="fld"><span>Search</span><input id="build-search" type="search" placeholder="Name, race, or ability" value="${esc(f.q)}"></label>
    <button class="bfiltbtn" data-act="bsheet" aria-expanded="${!!BUILD.sheet}">Filters${set?` <b>${set}</b>`:''}</button>
    ${BUILD.sheet?'<div class="bscrim" data-act="bsheet" aria-hidden="true"></div>':''}
    <div class="bsheet ${BUILD.sheet?'open':''}" role="dialog" aria-label="Filters"><div class="bsheet-head"><b>Filters</b><button class="main" data-act="bsheet">Done</button></div>
    ${select('mech','Ability',[['all','Any ability'],...MECHANICS.filter(m=>DEFS.some(m.has)).map(m=>[m.key,m.label])])}
    ${select('type','Type',[['all','All types'],['c','Creatures'],['evo','Evolution creatures'],['s','Spells']])}
    ${select('sort','Sort by',[['cost','Cost'],['power','Power'],['name','Name']])}
    <label class="check"><input type="checkbox" class="switch" role="switch" data-build="mine" ${f.mine?'checked':''}> In deck only</label></div></div></div>`;
  h+=deckSummaryHTML();
  const q=searchKey(f.q),qs=q.replace(/ /g,''),mech=MECHANICS.find(m=>m.key===f.mech);
  const shown=DEFS.filter(d=>(BUILD.filter==='all'||civsOf(d).includes(BUILD.filter))&&(!q||searchFits(d,q,qs))
    &&(!mech||mech.has(d))&&(f.type==='all'||(f.type==='evo'?!!d.evo:d.t===f.type&&!(f.type==='c'&&d.evo)))&&(!f.mine||BUILD.counts[d.id]>0))
    .sort(f.sort==='name'?(a,b)=>a.n.localeCompare(b.n):f.sort==='power'?(a,b)=>(b.p-a.p)||a.cost-b.cost:(a,b)=>(a.cost-b.cost)||a.n.localeCompare(b.n));
  const title=BUILD.filter==='all'?'All civilizations':CIV[BUILD.filter].n;
  h+=`<section class="civ" style="--el:${BUILD.filter==='all'?'var(--ink)':CIV[BUILD.filter].c}"><h3>${title} <small class="bsaved">${shown.length} card${shown.length===1?'':'s'}</small></h3><div class="bgrid" id="bgrid"${keepH?` style="height:${keepH}"`:''}></div>`;
  if(!shown.length)h+='<p class="empty">No cards match these filters.</p>';
  h+='</section>';
  h+=cartHTML();
  BUILD.shown=shown;
  $('#app').innerHTML=h;
  if(keepY!=null&&scrollY!==keepY)window.scrollTo(0,keepY);
  const cl=$('.clist');if(cl)cl.scrollTop=cartY;
  // The page (and on phones the filter bar) starts just below the header, whatever height it wraps to.
  const bh=$('.bh');if(bh){setBhh(bh);BH_SIZE.disconnect();BH_SIZE.observe(bh)}
  markBuilderScroll();renderBuilderGrid();
}
// The grid is virtualized: only rows near the viewport are in the DOM, and each card's
// element is built once and reused, so scrolling, +/- and filtering never rebuild,
// re-fit or reload the art of the whole collection.
const BUILD_ITEMS=new Map(),BUILD_GAP=12;
let buildSize=null,buildFrame=0;
function buildItem(d,tot){
  let el=BUILD_ITEMS.get(d.id);
  if(!el){
    el=document.createElement('div');el.className='bitem';
    el.innerHTML=`${cardHTML(d,'')}<div class="bc"></div>`;
    el.querySelector('.art')?.insertAdjacentHTML('beforeend','<span class="qb" aria-hidden="true"></span>');
    BUILD_ITEMS.set(d.id,el);
  }
  const n=BUILD.counts[d.id]||0;
  const bc=`<button data-act="bminus" data-v="${d.id}" aria-label="Remove ${esc(d.n)}" ${n?'':'disabled'}>−</button><span>${n}</span>
      <button data-act="bplus" data-v="${d.id}" aria-label="Add ${esc(d.n)}" ${n<MAX_COPY&&tot<DECK_MAX?'':'disabled'}>+</button>`;
  if(el._bc!==bc){el.lastElementChild.innerHTML=bc;el._bc=bc}
  // Cards already in the deck wear a ring and a copy badge.
  el.classList.toggle('indeck',n>0);const qb=el.querySelector('.qb');if(qb)qb.textContent='×'+n;
  return el;
}
function renderBuilderGrid(){
  const grid=$('#bgrid');if(!grid)return;
  const shown=BUILD.shown||[],tot=total();
  if(!shown.length){grid.replaceChildren();grid.style.height=grid.style.paddingTop='';return}
  if(!buildSize){
    const r=(grid.firstElementChild||grid.appendChild(buildItem(shown[0],tot))).getBoundingClientRect();
    buildSize={w:r.width,h:r.height+BUILD_GAP};
  }
  const cols=Math.max(1,Math.floor((grid.clientWidth+BUILD_GAP)/(buildSize.w+BUILD_GAP))),rows=Math.ceil(shown.length/cols);
  // Render one extra screen above and below so fast scrolling rarely shows a gap.
  const top=grid.getBoundingClientRect().top;
  const first=Math.min(rows,Math.max(0,Math.floor((-top-innerHeight)/buildSize.h)));
  const last=Math.min(rows,Math.max(first,Math.ceil((2*innerHeight-top)/buildSize.h)));
  grid.style.height=`${rows*buildSize.h-BUILD_GAP}px`;grid.style.paddingTop=`${first*buildSize.h}px`;
  const els=shown.slice(first*cols,last*cols).map(d=>buildItem(d,tot)),keep=new Set(els);
  [...grid.children].forEach(el=>keep.has(el)||el.remove());
  let ref=grid.firstElementChild;
  for(const el of els){if(el===ref)ref=ref.nextElementSibling;else grid.insertBefore(el,ref)}
}
// After browsing in the zoom view, scroll the grid to the last card viewed and mark it briefly.
function revealBuilderCard(id,flash=true){
  const grid=$('#bgrid'),i=(BUILD.shown||[]).findIndex(d=>d.id===id);
  if(!grid||i<0||!buildSize)return;
  const cols=Math.max(1,Math.floor((grid.clientWidth+BUILD_GAP)/(buildSize.w+BUILD_GAP)));
  const y=grid.getBoundingClientRect().top+scrollY+Math.floor(i/cols)*buildSize.h,head=($('.bh')||{offsetHeight:0}).offsetHeight;
  if(y<scrollY+head||y+buildSize.h>scrollY+innerHeight)scrollTo({top:y-head-12});
  renderBuilderGrid();
  const card=BUILD_ITEMS.get(id)?.querySelector('.card');
  if(card&&flash){card.classList.remove('flash');void card.offsetWidth;card.classList.add('flash')}
}
const queueBuilderGrid=()=>{if(!buildFrame)buildFrame=requestAnimationFrame(()=>{buildFrame=0;renderBuilderGrid()})};
addEventListener('scroll',queueBuilderGrid,{passive:true});
// The header's fade shows only while cards are scrolled under it.
const markBuilderScroll=()=>document.documentElement.classList.toggle('bscrolled',scrollY>2);
addEventListener('scroll',markBuilderScroll,{passive:true});
addEventListener('resize',()=>{buildSize=null;queueBuilderGrid()});
// The deck as a shopping cart (computers): beside the collection, always in view, with its count
// toward 50, its summary and its cards as rows (cost, name, copies, − and +). Phones keep the summary
// above the grid and the "In deck only" switch.
function cartHTML(){
  const tot=total(),ids=Object.keys(BUILD.counts).filter(id=>BUILD.counts[id]>0&&DEF[id])
    .sort((a,b)=>DEF[a].cost-DEF[b].cost||DEF[a].n.localeCompare(DEF[b].n));
  const rows=ids.map(id=>{const d=DEF[id],n=BUILD.counts[id],P=PAL[d.e]||PAL.unknown;
    return `<li class="crow" data-row="${id}" style="--el:${P.frame};--of:${P.onFrame||P.light}">
      <span class="ccost">${d.cost??'–'}</span><button class="cname" data-def="${id}" title="Show ${esc(d.n)}">${esc(d.n)}</button><span class="cqty">×${n}</span>
      <button class="cbtn" data-act="bminus" data-v="${id}" aria-label="Remove one ${esc(d.n)}">−</button><button class="cbtn" data-act="bplus" data-v="${id}" aria-label="Add one ${esc(d.n)}" ${n<MAX_COPY&&tot<DECK_MAX?'':'disabled'}>+</button></li>`}).join('');
  const pct=Math.min(100,Math.round(tot/DECK_MIN*100));
  // Where there's no room for it beside the cards (phones, short windows), the count in the header
  // opens it as a sheet from the bottom, so the deck can be checked without touching the filters.
  return `${BUILD.cart?'<div class="cscrim" data-act="bcart" aria-hidden="true"></div>':''}<aside class="cart ${BUILD.cart?'open':''}" aria-label="Your deck">
    <div class="carthead"><b>Your deck</b><span class="ccount ${legal(tot)?'ok':''}">${tot}<small> / ${DECK_MIN}</small></span><button class="cclose main" data-act="bcart">Done</button></div>
    <div class="cbar ${legal(tot)?'ok':''}" role="progressbar" aria-valuemin="0" aria-valuemax="${DECK_MIN}" aria-valuenow="${tot}"><i style="width:${pct}%"></i></div>
    <small class="cnote">${tot<DECK_MIN?`${DECK_MIN-tot} more to play`:tot===DECK_MAX?'Maximum reached':`Ready · up to ${DECK_MAX}`}</small>
    ${tot?deckSummaryHTML():''}
    ${ids.length?`<ol class="clist">${rows}</ol>`:`<div class="cempty"><div class="eslots" aria-hidden="true"><span class="eslot"></span><span class="eslot"></span><span class="eslot"></span></div><p>Your deck is empty.<br>Press <b>+</b> on a card to add it.</p></div>`}
    <div class="cfoot"><button data-act="bstart" class="main" ${legal(tot)?'':'disabled'}>Start duel</button></div>
  </aside>`;
}
// On the deck button: how many warnings and tips the deck has (red when a card can't work).
function warnBadge(){
  const w=deckWarnings(BUILD.counts);if(!w.length)return '';
  return `<i class="cbadge ${w.some(x=>!x.tip)?'bad':''}" title="${w.length} note${w.length===1?'':'s'} about this deck">${w.length}</i>`;
}
// A card added to the deck: its row in the cart comes into view and lights up briefly.
function cartLand(id){
  const row=document.querySelector(`.cart [data-row="${id}"]`);if(!row)return;
  row.scrollIntoView({block:'nearest'});
  row.classList.remove('bump');void row.offsetWidth;row.classList.add('bump');
}
// Cost curve, civilizations, card types and the deck rules the new mechanics bring.
function deckSummaryHTML(){
  const tot=total();
  if(!tot)return '';
  const ids=Object.keys(BUILD.counts).filter(id=>BUILD.counts[id]>0&&DEF[id]),n=f=>ids.reduce((t,id)=>t+(f(DEF[id])?BUILD.counts[id]:0),0);
  const curve=[1,2,3,4,5,6,7].map(k=>n(d=>k===7?d.cost>=7:d.cost===k)),top=Math.max(1,...curve);
  const civs=Object.keys(CIV).filter(e=>n(d=>civsOf(d).includes(e))).map(e=>`<span class="pill" style="--el:${CIV[e].c}"><span class="tdot"></span>${CIV[e].n} ${n(d=>civsOf(d).includes(e))}</span>`).join('');
  const warn=deckWarnings(BUILD.counts);
  return `<section class="deck-summary" aria-label="Deck summary">
    <div class="curve" aria-label="Cost curve">${curve.map((c,i)=>`<div title="${c} card${c===1?'':'s'} costing ${i===6?'7 or more':i+1}"><b>${c||''}</b><span style="height:${Math.round(c/top*100)}%"></span><small>${i===6?'7+':i+1}</small></div>`).join('')}</div>
    <div class="dstats">${civs}<span class="pill">Creatures ${n(d=>d.t==='c')}</span><span class="pill">Spells ${n(d=>d.t==='s')}</span>
      <span class="pill">Shield triggers ${n(d=>d.trig)}</span><span class="pill">Blockers ${n(d=>d.block)}</span></div>
    ${warn.length?`<ul class="dwarn">${warn.map(w=>`<li class="${w.tip?'tip':''}">${esc(w.text)}</li>`).join('')}</ul>`:''}
  </section>`;
}
document.addEventListener('input',e=>{
  if(e.target.id!=='build-search'||!BUILD.find)return;
  const at=e.target.selectionStart;BUILD.find.q=e.target.value;renderBuilder();window.scrollTo(0,0);
  const el=$('#build-search');el.focus();el.setSelectionRange(at,at);
});
document.addEventListener('ddchange',e=>{
  if(!BUILD.find||!$('#bgrid')||!(e.detail.key in BUILD.find))return;
  BUILD.find[e.detail.key]=e.detail.value;renderBuilder();window.scrollTo(0,0);
  document.querySelector(`.dd[data-dd="${e.detail.key}"] .ddbtn`)?.focus();
});
document.addEventListener('change',e=>{
  const key=e.target.dataset&&e.target.dataset.build;
  if(!key||!BUILD.find)return;
  BUILD.find[key]=key==='mine'?e.target.checked:e.target.value;renderBuilder();window.scrollTo(0,0);
});
// Phone menus: a tap outside the "⋯" menu closes it (and only closes it; on the window, so
// it runs before the page's own click handlers); Esc closes the menu or the filters sheet.
window.addEventListener('click',e=>{
  if(!BUILD.menu||!$('.bh')||e.target.closest('.bacts,.bmore-btn'))return;
  BUILD.menu=false;navClose('menu');renderBuilder();e.preventDefault();e.stopImmediatePropagation();
},true);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!$('.bh')||!(BUILD.menu||BUILD.sheet||BUILD.cart)||ZOOM)return;
  if(BUILD.menu)navClose('menu');if(BUILD.sheet)navClose('sheet');if(BUILD.cart)navClose('cart');
  BUILD.menu=false;BUILD.sheet=false;BUILD.cart=false;renderBuilder();
});
