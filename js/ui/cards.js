/* ---------- rendering ---------- */
const imageSources=(full,thumb,width,thumbWidth)=>thumb&&width>thumbWidth?` srcset="${esc(thumb)} ${thumbWidth}w, ${esc(full)} ${width}w"`:'';
const imageSize=cls=>cls.includes('big')?'205px':'(max-width:600px) 71px, 92px';
const artFor=(c,cls)=>c.art?`<img src="${esc(c.artThumb||c.art)}"${imageSources(c.art,c.artThumb,c.artWidth,c.artThumbWidth)} sizes="${imageSize(cls)}" alt="${esc(c.n)} artwork" loading="lazy" decoding="async">`:'<div class="missing-art">Artwork unavailable</div>';
// The face shows operative text only; reminders and lore live in the detail panel,
// even for a vanilla creature, so an empty box means "no abilities".
function cardRules(c){
  return cardTextView(c).face.map(line=>`<p>${esc(line)}</p>`).join('');
}
// Fit rendered text rather than guessing from character counts: wrapping also
// depends on word lengths, reminders, the font, and the displayed card width.
const pendingCardFits=new Set();
const cardTextSizes=new Map();
let cardFitFrame=0;
function fitCardText(card){
  if(!card.isConnected||!card.clientWidth)return;
  for(const selector of ['.txt']){
    const text=card.querySelector(selector);
    if(!text)continue;
    text.style.removeProperty('font-size');
    const style=getComputedStyle(text),maxSize=parseFloat(style.fontSize);
    const key=[selector,text.textContent,text.clientWidth,text.clientHeight,style.font,style.letterSpacing].join('|');
    const cached=cardTextSizes.get(key);
    if(cached!==undefined){
      if(cached!==maxSize)text.style.fontSize=cached+'px';
      continue;
    }
    const fits=()=>text.scrollWidth<=text.clientWidth&&text.scrollHeight<=text.clientHeight;
    if(fits()){cardTextSizes.set(key,maxSize);continue}
    let low=1,high=maxSize;
    // Find the largest font that fits both the available width and height.
    for(let i=0;i<8;i++){
      const mid=(low+high)/2;
      text.style.fontSize=mid+'px';
      if(fits())low=mid;else high=mid;
    }
    text.style.fontSize=low+'px';
    cardTextSizes.set(key,low);
  }
}
function queueCardFit(card){
  pendingCardFits.add(card);
  if(cardFitFrame)return;
  cardFitFrame=requestAnimationFrame(()=>{
    cardFitFrame=0;
    pendingCardFits.forEach(fitCardText);
    pendingCardFits.clear();
  });
}
const cardSizeObserver=new ResizeObserver(entries=>entries.forEach(({target})=>queueCardFit(target)));
const cardsIn=node=>node.nodeType===1?[...(node.matches('.card')?[node]:[]),...node.querySelectorAll('.card')]:[];
new MutationObserver(records=>{
  for(const record of records){
    record.removedNodes.forEach(node=>cardsIn(node).forEach(card=>{cardSizeObserver.unobserve(card);pendingCardFits.delete(card)}));
    record.addedNodes.forEach(node=>cardsIn(node).forEach(card=>{cardSizeObserver.observe(card);queueCardFit(card)}));
  }
}).observe(document.body,{childList:true,subtree:true});
document.fonts.ready.then(()=>{cardTextSizes.clear();document.querySelectorAll('.card').forEach(queueCardFit)});
function cardHTML(c,cls='',plain=false){
  const e=archiveCivilization(c),P=PAL[c.e]||PAL.unknown;
  const pw=c.t==='s'?'Spell':c.boost?String(power(c)):c.printedPower;
  const isBig=cls.includes('big');
  const sub=c.t==='s'?e.n:(c.evo?(isBig?'Evolution ':'Evo '):'')+c.race;
  const tags=[];
  if(c.uid&&c.sick&&G&&G.p.some(p=>p.bz.includes(c)))tags.push('Arriving');
  if(c.under&&c.under.length)tags.push(`+${c.under.length} under`);
  let fxc='',fxd='0ms';
  const f=G&&c.uid&&G.fx&&G.fx[c.uid];
  if(f){const age=now()-f.t0;if(age<600){fxc='fx-'+f.k;fxd=`-${age}ms`}else delete G.fx[c.uid]}
  const attrs=plain?'':c.uid?`data-uid="${c.uid}" tabindex="0"`:`data-def="${c.id}" tabindex="0"`;
  const palette=`--fxd:${fxd};--fr:${P.frame};--lt:${P.light};--dp:${P.deep};--md:${P.mid};--second:${(PAL[c.e2]||P).frame};--dp2:${(PAL[c.e2]||P).deep}`;
  return `<div class="card ${c.e2?'multicolor':''} ${c.t==='s'?'spell':''} ${c.evo?'isevo':''} ${c.br===3?'legend':''} ${c.tapped?'tapped':''} ${fxc} ${cls}" ${attrs} style="${palette}" title="${esc(c.n+': '+c.txt)}" aria-label="${esc(c.n)}, ${e.n}, cost ${c.cost??'unlisted'}${c.t==='c'?', power '+c.p:', spell'}. ${esc(c.txt)}">
    <div class="cbody"><div class="nbar"><span class="cost">${c.cost??'–'}</span><span class="nm">${esc(c.n)}</span></div>
    <div class="art">${artFor(c,cls)}${c.trig?'<span class="trg">Trigger</span>':''}</div>
    <div class="txt">${cardRules(c)}</div>
    <div class="bot"><span class="rc">${esc(sub)}</span>${pw?`<span class="pw">${esc(pw)}</span>`:''}</div></div>
    ${tags.length?`<span class="tag">${tags.join(', ')}</span>`:''}
  </div>`;
}
