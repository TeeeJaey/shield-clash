/* ---------- hover preview ---------- */
// On a computer, resting the mouse on a card shows the card itself, large, instead of a
// tooltip, right beside the card it belongs to. Its art moves in
// the card's civilization's way. Touch screens keep tap and long-press to zoom.
const PEEK={el:null,card:null,timer:0,fx:null};
const peekable=matchMedia('(hover: hover) and (pointer: fine)');
const PEEK_W=250;
function peekOf(el){return el.dataset.uid?(findCard(+el.dataset.uid)?.c||null):DEF[el.dataset.def]||null}
function showPeek(cardEl){
  const c=peekOf(cardEl);
  if(!c||ZOOM||!cardEl.isConnected)return;
  if(!PEEK.el){PEEK.el=document.createElement('div');PEEK.el.id='peek';PEEK.el.setAttribute('aria-hidden','true');document.body.appendChild(PEEK.el)}
  const el=PEEK.el;
  el.innerHTML=cardHTML({...c,uid:0,tapped:false},'big',true);
  // Right beside the card: to its right when there's room, else to its left.
  const r=cardEl.getBoundingClientRect(),gap=14,H=el.offsetHeight||400;
  const left=r.right+gap+PEEK_W<=innerWidth-gap?r.right+gap:Math.max(gap,r.left-gap-PEEK_W);
  const top=Math.min(Math.max(gap,r.top+r.height/2-H/2),Math.max(gap,innerHeight-H-gap));
  el.style.left=left+'px';el.style.top=top+'px';el.classList.add('show');
  artfxRelease(PEEK.fx);
  PEEK.fx=artfxAttach(el.querySelector('.art img'),c.e,c.e2);
}
function hidePeek(){
  clearTimeout(PEEK.timer);PEEK.card=null;
  if(PEEK.el)PEEK.el.classList.remove('show');
  artfxRelease(PEEK.fx);PEEK.fx=null;
}
document.addEventListener('pointerover',e=>{
  if(!peekable.matches||e.pointerType!=='mouse')return;
  const card=e.target.closest&&e.target.closest('.card[data-uid],.card[data-def]');
  if(!card||card.closest('#zoom,#peek')||card===PEEK.card)return;
  hidePeek();PEEK.card=card;
  PEEK.timer=setTimeout(()=>showPeek(card),140);
});
document.addEventListener('pointerout',e=>{if(PEEK.card&&!PEEK.card.contains(e.relatedTarget))hidePeek()});
['pointerdown','keydown','scroll'].forEach(n=>addEventListener(n,hidePeek,{capture:true,passive:true}));
