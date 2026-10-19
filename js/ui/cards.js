/* ---------- rendering ---------- */
const imageSources=(full,thumb,width,thumbWidth)=>thumb&&width>thumbWidth?` srcset="${esc(thumb)} ${thumbWidth}w, ${esc(full)} ${width}w"`:'';
const imageSize=cls=>cls.includes('big')?'205px':'(max-width:600px) 71px, 92px';
// Fetch a duel's artwork in the background, once per image and at low priority, so drawn and
// played cards show their art at once instead of popping in. The off-page image uses the same
// srcset and sizes as the board, so the browser picks (and caches) the same file it will show.
const warmedArt=new Set();
function warmArt(cards){
  for(const c of cards){
    if(!c||!c.art||warmedArt.has(c.art))continue;
    warmedArt.add(c.art);
    const img=new Image();
    img.fetchPriority='low';img.decoding='async';img.sizes=imageSize('');
    if(c.artThumb&&c.artWidth>c.artThumbWidth)img.srcset=`${c.artThumb} ${c.artThumbWidth}w, ${c.art} ${c.artWidth}w`;
    img.src=c.artThumb||c.art;
  }
}
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
let cardFitFrame=0,cardFitGen=0;
function fitCardText(card){
  if(!card.isConnected||!card.clientWidth)return;
  // A reused element (deck builder) that was already fitted at this width needs no work.
  const done=`${cardFitGen}|${card.clientWidth}`;
  if(card._fit===done)return;
  card._fit=done;
  for(const selector of ['.txt']){
    const text=card.querySelector(selector);
    if(!text)continue;
    text.style.removeProperty('font-size');text.classList.remove('clipped');
    const style=getComputedStyle(text),maxSize=parseFloat(style.fontSize);
    const key=[selector,text.textContent,text.clientWidth,text.clientHeight,style.font,style.letterSpacing].join('|');
    const cached=cardTextSizes.get(key);
    if(cached!==undefined){
      if(cached.size!==maxSize)text.style.fontSize=cached.size+'px';
      if(cached.clip)text.classList.add('clipped');
      continue;
    }
    const fits=()=>text.scrollWidth<=text.clientWidth&&text.scrollHeight<=text.clientHeight;
    if(fits()){cardTextSizes.set(key,{size:maxSize});continue}
    // Text never shrinks below a readable size; what still doesn't fit fades out (tap to read).
    const floor=Math.min(maxSize,Math.max(6,maxSize*.55));
    text.style.fontSize=floor+'px';
    if(!fits()){text.classList.add('clipped');cardTextSizes.set(key,{size:floor,clip:true});continue}
    let low=floor,high=maxSize;
    // Find the largest font that fits both the available width and height.
    for(let i=0;i<6;i++){
      const mid=(low+high)/2;
      text.style.fontSize=mid+'px';
      if(fits())low=mid;else high=mid;
    }
    text.style.fontSize=low+'px';
    cardTextSizes.set(key,{size:low});
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
document.fonts.ready.then(()=>{cardTextSizes.clear();cardFitGen++;document.querySelectorAll('.card').forEach(queueCardFit)});
function cardHTML(c,cls='',plain=false){
  const e=archiveCivilization(c),P=PAL[c.e]||PAL.unknown;
  const pw=c.t==='s'?'Spell':c.boost?String(power(c)):c.printedPower;
  const isBig=cls.includes('big');
  const sub=c.t==='s'?e.n:(c.evo?(isBig?'Evolution ':'Evo '):'')+c.race;
  // Status pills sit along the bottom of the art: Arriving on the left, evolution stack on the right.
  // Arriving shows only while summoning sickness actually stops an attack (not for speed attackers).
  const arriving=!!(c.uid&&c.sick&&G&&G.p.some(p=>p.bz.includes(c))&&!T(c).speed);
  const tags=(arriving?'<span class="tag">Arriving</span>':'')+(c.under&&c.under.length?`<span class="tag under">+${c.under.length} under</span>`:'');
  let fxc='',fxd='0ms';
  const f=G&&c.uid&&G.fx&&G.fx[c.uid];
  if(f){const age=now()-f.t0;if(age<600){fxc='fx-'+f.k;fxd=`-${age}ms`}else delete G.fx[c.uid]}
  const attrs=plain?'':c.uid?`data-uid="${c.uid}" tabindex="0"`:`data-def="${c.id}" tabindex="0"`;
  const palette=`--fxd:${fxd};--fr:${P.frame};--lt:${P.light};--dp:${P.deep};--md:${P.mid};--second:${(PAL[c.e2]||P).frame};--dp2:${(PAL[c.e2]||P).deep}`;
  return `<div class="card ${c.e2?'multicolor':''} ${c.t==='s'?'spell':''} ${c.evo?'isevo':''} ${c.br===3?'legend':''} ${c.tapped?'tapped':''} ${fxc} ${cls}" ${attrs} style="${palette}" title="${esc(c.n+': '+c.txt)}" aria-label="${esc(c.n)}, ${e.n}, cost ${c.cost??'unlisted'}${c.t==='c'?', power '+c.p:', spell'}${arriving?". Arrived this turn, can't attack yet":''}. ${esc(c.txt)}">
    <div class="cbody"><div class="nbar"><span class="cost">${c.cost??'–'}</span><span class="nm">${esc(c.n)}</span></div>
    <div class="art">${artFor(c,cls)}${c.trig?'<span class="trg">Trigger</span>':''}${tags}</div>
    <div class="txt">${cardRules(c)}</div>
    <div class="bot"><span class="rc">${esc(sub)}</span>${pw?`<span class="pw">${esc(pw)}</span>`:''}</div></div>
  </div>`;
}
