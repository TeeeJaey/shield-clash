/* ---------- deck builder ---------- */
const total=()=>Object.values(BUILD.counts).reduce((a,b)=>a+b,0);
function fillDeck(){
  let civs=[...new Set(Object.keys(BUILD.counts).filter(id=>BUILD.counts[id]>0).map(id=>DEF[id].e))];
  if(!civs.length)civs=shuffle(Object.keys(CIV)).slice(0,2);
  const pool=DEFS.filter(d=>civs.includes(d.e));
  let guard=0;
  while(total()<DECK_SIZE&&guard++<500){
    const open=pool.filter(d=>(BUILD.counts[d.id]||0)<MAX_COPY);
    if(!open.length)break;
    // favour cheaper cards so the deck has early plays
    const w=open.map(d=>Math.max(1,9-d.cost));
    let r=Math.random()*w.reduce((a,b)=>a+b,0),pick=open[0];
    for(let i=0;i<open.length;i++){r-=w[i];if(r<=0){pick=open[i];break}}
    BUILD.counts[pick.id]=(BUILD.counts[pick.id]||0)+1;
  }
  BUILD.msg=total()<DECK_SIZE?'Not enough cards in these civilizations to reach 40. Add another civilization.':'';
}
let MYDECKS=null,saveT=null,PENDING_DEL=null;
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const expand=counts=>{const ids=[];for(const id in counts)if(DEF[id])for(let i=0;i<counts[id];i++)ids.push(id);return ids};
const deckTotal=counts=>Object.values(counts).reduce((a,b)=>a+b,0);
async function storeDecks(){try{return !!(await window.storage.set('shieldclash-decks',JSON.stringify(MYDECKS),false))}catch(e){return false}}
async function loadDecks(){
  if(MYDECKS)return MYDECKS;
  let list=[];
  try{const r=await window.storage.get('shieldclash-decks',false);if(r&&r.value)list=JSON.parse(r.value)}catch(e){}
  if(!list.length){ // bring over a deck saved by the older single-deck version
    try{const r=await window.storage.get('shieldclash-deck',false);if(r&&r.value){const c=JSON.parse(r.value);if(deckTotal(c))list.push({id:'d'+Date.now(),name:'My deck',counts:c,updated:Date.now()})}}catch(e){}
  }
  MYDECKS=list;
  return MYDECKS;
}
function setSaved(t){BUILD.saved=t;const el=document.getElementById('bsaved');if(el)el.textContent=t}
function autoSave(){clearTimeout(saveT);setSaved('Saving…');saveT=setTimeout(()=>saveDeck(),400)}
async function saveDeck(manual){
  clearTimeout(saveT);
  if(!total()){setSaved(BUILD.id?'Empty decks are not saved':'');if(manual){BUILD.msg='Add some cards before saving.';renderBuilder()}return}
  await loadDecks();
  const counts={};for(const k in BUILD.counts)if(BUILD.counts[k]>0)counts[k]=BUILD.counts[k];
  let d=BUILD.id&&MYDECKS.find(x=>x.id===BUILD.id);
  if(!d){d={id:'d'+Date.now()+Math.floor(Math.random()*1000)};BUILD.id=d.id;MYDECKS.unshift(d)}
  d.name=(BUILD.name||'').trim().slice(0,30)||'My deck';d.counts=counts;d.updated=Date.now();
  const ok=await storeDecks();
  setSaved(ok?'Saved':'Saving is not available here');
  if(manual){BUILD.msg=ok?'Deck saved. It shows on the start page.':'Saving is not available here.';renderBuilder()}
}
async function showBuilder(id){
  G=null;$('#layer').innerHTML='';
  await loadDecks();
  const d=id&&MYDECKS.find(x=>x.id===id);
  BUILD=d?{counts:{...d.counts},msg:'',filter:BUILD.filter||'fire',id:d.id,name:d.name,saved:'Saved'}
         :{counts:{},msg:'',filter:'fire',id:null,name:`My deck ${MYDECKS.length+1}`,saved:''};
  renderBuilder();window.scrollTo(0,0);
}
function renderBuilder(){
  setPhase();
  const tot=total();
  let h=`<header class="bh"><h2>Deck builder</h2><input id="dname" class="dname" aria-label="Deck name" maxlength="30" value="${esc(BUILD.name||'')}"><span class="cnt ${legal(tot)?'ok':''}">${tot} cards <small class="bsaved">${tot<DECK_MIN?`${DECK_MIN-tot} more to play`:tot===DECK_MAX?'Maximum reached':`Up to ${DECK_MAX}`}</small> <small id="bsaved" class="bsaved">${BUILD.saved||''}</small></span>
    ${btn('brandom','Random optimal deck')}${btn('bfill','Fill to 40')}${btn('bclear','Clear')}${btn('bsave','Save deck')}${btn('back','Back')}
    <button data-act="bstart" class="main" ${legal(tot)?'':'disabled'}>Start duel</button>
    <span class="bmsg">${BUILD.msg||'Decks hold 40 to 60 cards, with up to 4 copies of each. Your deck saves automatically. Tap a card to zoom in. Two civilizations is the classic setup; more is risky for mana.'}</span></header>`;
  h+=`<nav class="tabs">${Object.keys(CIV).map(e=>{const n=DEFS.filter(d=>d.e===e).reduce((t,d)=>t+(BUILD.counts[d.id]||0),0);
    return `<button data-act="bfilter" data-v="${e}" class="${BUILD.filter===e?'main':''}" style="--el:${CIV[e].c}"><span class="tdot"></span>${CIV[e].n}${n?` (${n})`:''}</button>`}).join('')}</nav>`;
  for(const e in CIV){
    if(e!==BUILD.filter)continue;
    h+=`<section class="civ" style="--el:${CIV[e].c}"><h3>${CIV[e].n}</h3><div class="bgrid">`;
    for(const d of DEFS.filter(d=>d.e===e)){
      const n=BUILD.counts[d.id]||0;
      h+=`<div class="bitem">${cardHTML(d,'')}<div class="bc">
        <button data-act="bminus" data-v="${d.id}" aria-label="Remove ${d.n}" ${n?'':'disabled'}>−</button><span>${n}</span>
        <button data-act="bplus" data-v="${d.id}" aria-label="Add ${d.n}" ${n<MAX_COPY&&tot<DECK_MAX?'':'disabled'}>+</button></div></div>`;
    }
    h+='</div></section>';
  }
  $('#app').innerHTML=h;
}

// keep the deck name in sync as the player types
document.addEventListener('input',e=>{if(e.target.id==='dname'){BUILD.name=e.target.value;if(total())autoSave()}});
