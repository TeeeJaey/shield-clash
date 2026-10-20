let MYDECKS=null,saveT=null,PENDING_DEL=null;
const validCounts=counts=>Object.fromEntries(Object.entries(counts).filter(([id])=>DEF[id]?.playable&&DEF[id].duelId===id).map(([id,n])=>[id,Math.min(MAX_COPY,Math.max(0,Math.floor(Number(n)||0)))]));
const expand=counts=>{const ids=[];for(const [id,n] of Object.entries(validCounts(counts)))for(let i=0;i<n;i++)ids.push(id);return ids};
const deckTotal=counts=>Object.values(validCounts(counts)).reduce((a,b)=>a+b,0);
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
async function saveDeck(){
  clearTimeout(saveT);
  if(!total()){setSaved(BUILD.id?'Empty decks are not saved':'');return}
  await loadDecks();
  const counts={};for(const k in BUILD.counts)if(BUILD.counts[k]>0)counts[k]=BUILD.counts[k];
  let d=BUILD.id&&MYDECKS.find(x=>x.id===BUILD.id);
  if(!d){d={id:'d'+Date.now()+Math.floor(Math.random()*1000)};BUILD.id=d.id;MYDECKS.unshift(d)}
  d.name=(BUILD.name||'').trim().slice(0,30)||'My deck';d.counts=counts;d.updated=Date.now();
  const ok=await storeDecks();
  setSaved(ok?'Saved':'Saving is not available here');
}
