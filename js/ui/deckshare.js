/* ---------- deck export and import ---------- */
// A deck travels as plain text, one card per line, so it can be pasted into a chat, saved as a
// file, or typed by hand:
//   Shield Clash deck: Dawn Wall
//   4 Laveil, Seeker of Catastrophe
// Import also reads "4x Name" and "Name x4", ignores blank lines and #comments, and matches
// names without caring about case or curly quotes. An imported deck becomes a new saved deck.
const SHARE_HEAD='Shield Clash deck:';
let SHARE=null;
const normName=s=>String(s).toLowerCase().replace(/[‘’`]/g,"'").replace(/\s+/g,' ').trim();
let duelByName=null;
function deckText(name,counts){
  const ids=Object.keys(counts).filter(id=>counts[id]>0&&DEF[id]).sort((a,b)=>DEF[a].cost-DEF[b].cost||DEF[a].n.localeCompare(DEF[b].n));
  return [`${SHARE_HEAD} ${(name||'My deck').trim()}`,...ids.map(id=>`${counts[id]} ${DEF[id].n}`)].join('\n');
}
function parseDeckText(text){
  if(!duelByName)duelByName=new Map(DEFS.map(d=>[normName(d.n),d.id]));
  const counts={},unknown=[];let name='';
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#')||line.startsWith('//'))continue;
    const head=line.match(/^shield clash deck:\s*(.*)$/i);
    if(head){name=head[1].trim().slice(0,30);continue}
    let n=1,nm=line;
    const pre=line.match(/^(\d+)\s*[x×]?\s+(.+)$/i),post=line.match(/^(.+?)\s+[x×]\s*(\d+)$/i);
    if(pre){n=+pre[1];nm=pre[2]}else if(post){nm=post[1];n=+post[2]}
    const id=duelByName.get(normName(nm));
    if(!id){unknown.push(line);continue}
    counts[id]=(counts[id]||0)+n;
  }
  const over=Object.keys(counts).filter(id=>counts[id]>MAX_COPY).map(id=>DEF[id].n);
  for(const id in counts)counts[id]=Math.min(MAX_COPY,counts[id]);
  return {name,counts,unknown,over,total:Object.values(counts).reduce((a,b)=>a+b,0)};
}
function shareHTML(){
  if(SHARE.mode==='export')return `<h2>Export deck</h2>
    <p>Copy this text to share or keep <b>${esc(SHARE.name)}</b>. Anyone can paste it into <b>Import deck</b>.</p>
    <textarea id="sharetext" class="sharetext" readonly rows="12" spellcheck="false">${esc(SHARE.text)}</textarea>
    <div class="opts"><button class="main" data-share="copy">${SHARE.copied?'Copied':'Copy'}</button><button data-share="download">Download .txt</button><button data-share="close">Done</button></div>`;
  const r=SHARE.result;
  const note=r?`<div class="sharenote ${r.total&&!r.unknown.length&&!r.over.length?'':'warn'}">${r.total?`Found ${r.total} card${r.total===1?'':'s'}.`:'No cards found yet.'}
      ${r.unknown.length?`<br>Not recognized (${r.unknown.length}): ${r.unknown.slice(0,6).map(esc).join('; ')}${r.unknown.length>6?'…':''}`:''}
      ${r.over.length?`<br>Cut to ${MAX_COPY} copies: ${r.over.slice(0,4).map(esc).join(', ')}`:''}
      ${r.total>DECK_MAX?`<br>That's more than ${DECK_MAX} cards; remove some in the builder before playing.`:''}</div>`:'';
  return `<h2>Import deck</h2>
    <p>Paste a deck exported from Shield Clash, or type one card per line, like <b>4 Laveil, Seeker of Catastrophe</b>. It's saved as a new deck.</p>
    <textarea id="sharetext" class="sharetext" rows="12" spellcheck="false" placeholder="${SHARE_HEAD} My deck&#10;4 Laveil, Seeker of Catastrophe&#10;4 Gran Gure, Space Guardian">${esc(SHARE.text||'')}</textarea>
    ${note}
    <div class="opts"><button class="main" data-share="import" ${r&&r.total?'':'disabled'}>Import${r&&r.total?` ${r.total} cards`:''}</button><label class="filebtn"><input type="file" accept=".txt,text/plain" data-share="file">Open a file</label><button data-share="close">Cancel</button></div>`;
}
function renderShare(){
  let el=document.getElementById('share');
  if(!SHARE){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='share';el.className='overlay';document.body.appendChild(el)}
  el.innerHTML=`<div class="dialog sharebox" role="dialog" aria-modal="true" aria-label="${SHARE.mode==='export'?'Export deck':'Import deck'}">${shareHTML()}</div>`;
}
function openShare(mode,name,counts){
  SHARE=mode==='export'?{mode,name:name||'My deck',text:deckText(name,counts)}:{mode,text:'',result:null};
  // Opened from the builder's menu, the dialog takes over the menu's history entry: closing the
  // menu (a step back) and opening the dialog (a step forward) at once would race.
  if(history.state&&history.state.ov==='menu')history.replaceState({sc:NAV.screen,ov:'share'},'');
  else navOpen('share');
  renderShare();
  const ta=document.getElementById('sharetext');
  if(mode==='export'){ta.focus();ta.select()}else ta.focus();
}
function closeShare(){if(!SHARE)return;SHARE=null;navClose('share');renderShare()}
async function copyShare(){
  const ta=document.getElementById('sharetext');let ok=false;
  try{await navigator.clipboard.writeText(SHARE.text);ok=true}catch(e){}
  if(!ok){ta.focus();ta.select();try{ok=document.execCommand('copy')}catch(e){}}
  SHARE.copied=ok;renderShare();
  if(!ok){const t=document.getElementById('sharetext');t.focus();t.select()}
}
function downloadShare(){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([SHARE.text+'\n'],{type:'text/plain'}));
  a.download=`${SHARE.name.replace(/[^\w -]+/g,'').trim()||'deck'}.txt`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function importShare(){
  const r=SHARE&&SHARE.result;if(!r||!r.total)return;
  await loadDecks();
  const taken=new Set(MYDECKS.map(d=>d.name));
  let name=r.name||'Imported deck';
  for(let k=2;taken.has(name);k++)name=`${(r.name||'Imported deck').slice(0,24)} (${k})`;
  const d={id:'d'+Date.now()+Math.floor(Math.random()*1000),name,counts:r.counts,updated:Date.now()};
  MYDECKS.unshift(d);await storeDecks();
  SHARE=null;navClose('share');renderShare();
  await withLoader('Opening the deck builder',()=>showBuilder(d.id));
  BUILD.msg=`Imported ${r.total} cards as “${name}”.${r.unknown.length?` ${r.unknown.length} line${r.unknown.length===1?' was':'s were'} not recognized.`:''}${legal(r.total)?'':` Decks need ${DECK_MIN} to ${DECK_MAX} cards to play.`}`;
  renderBuilder();
}
document.addEventListener('input',e=>{
  if(!SHARE||SHARE.mode!=='import'||e.target.id!=='sharetext')return;
  SHARE.text=e.target.value;SHARE.result=SHARE.text.trim()?parseDeckText(SHARE.text):null;
  const at=e.target.selectionStart;renderShare();
  const ta=document.getElementById('sharetext');ta.focus();ta.setSelectionRange(at,at);
});
document.addEventListener('change',e=>{
  if(!SHARE||e.target.dataset.share!=='file'||!e.target.files[0])return;
  e.target.files[0].text().then(t=>{SHARE.text=t;SHARE.result=parseDeckText(t);renderShare()});
});
document.addEventListener('click',e=>{
  if(!SHARE)return;
  const el=document.getElementById('share');
  if(e.target===el){closeShare();return}
  const b=e.target.closest('[data-share]');if(!b||b.tagName==='INPUT')return;
  const a=b.dataset.share;
  if(a==='close')closeShare();
  else if(a==='copy')copyShare();
  else if(a==='download')downloadShare();
  else if(a==='import')importShare();
});
document.addEventListener('keydown',e=>{if(SHARE&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeShare()}},true);
