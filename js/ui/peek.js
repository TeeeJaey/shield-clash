/* ---------- hover preview ---------- */
// On a computer, resting the mouse on a card shows the card itself, large, instead of a
// tooltip, right beside the card it belongs to. Its art moves in
// the card's civilization's way. Touch screens keep tap and long-press to zoom.
const PEEK={el:null,card:null,timer:0,fx:null,warm:0,x:0,y:0,t:0};
// The preview waits for the mouse to settle on a card, so sweeping across the hand or the
// board shows nothing. Once one is up, the next card's follows almost at once, the way
// tooltips stay "warm", so reading along a row never feels slow.
const PEEK_SETTLE=180,PEEK_WARM=50,PEEK_WARM_FOR=600,PEEK_FAST=0.45;
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
  artfxRelease(PEEK.fx);PEEK.fx=null;
  // The full image may still be arriving (its thumbnail shows meanwhile); start the motion
  // once it's here, if this preview is still up, so hiding can always stop it.
  const img=el.querySelector('.art img');
  const start=()=>{if(el.classList.contains('show')&&el.contains(img))PEEK.fx=artfxAttach(img,c.e,c.e2)};
  if(img&&!(img.complete&&img.naturalWidth))img.addEventListener('load',start,{once:true});else start();
}
function hidePeek(){
  clearTimeout(PEEK.timer);PEEK.card=null;
  if(PEEK.el&&PEEK.el.classList.contains('show'))PEEK.warm=performance.now()+PEEK_WARM_FOR;
  if(PEEK.el)PEEK.el.classList.remove('show');
  artfxRelease(PEEK.fx);PEEK.fx=null;
}
document.addEventListener('pointerover',e=>{
  if(!peekable.matches||e.pointerType!=='mouse')return;
  const card=e.target.closest&&e.target.closest('.card[data-uid],.card[data-def]');
  if(!card||card.closest('#zoom,#peek')||card===PEEK.card)return;
  hidePeek();PEEK.card=card;
  schedulePeek(card);
});
const peekShown=()=>!!PEEK.el&&PEEK.el.classList.contains('show');
function schedulePeek(card){
  clearTimeout(PEEK.timer);
  PEEK.timer=setTimeout(()=>{if(PEEK.card===card)showPeek(card)},performance.now()<PEEK.warm?PEEK_WARM:PEEK_SETTLE);
}
// Still moving fast over a card: start the wait again.
document.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse')return;
  const t=performance.now(),dt=t-PEEK.t,speed=dt>0?Math.hypot(e.clientX-PEEK.x,e.clientY-PEEK.y)/dt:0;
  PEEK.x=e.clientX;PEEK.y=e.clientY;PEEK.t=t;
  if(PEEK.card&&!peekShown()&&speed>PEEK_FAST&&dt<100)schedulePeek(PEEK.card);
},{passive:true});
document.addEventListener('pointerout',e=>{if(PEEK.card&&!PEEK.card.contains(e.relatedTarget))hidePeek()});
['pointerdown','keydown','scroll'].forEach(n=>addEventListener(n,hidePeek,{capture:true,passive:true}));

/* ---------- touch peek ---------- */
// On a touch screen, holding a card on the board shows it large with its rules, for as long
// as the finger stays down. Sliding the finger along a row shows each card it passes, so a
// whole battle zone can be read in one hold; lifting the finger closes it, and the tap that
// ends the hold doesn't also select the card. A quick tap still selects, as before.
const TPEEK={el:null,card:null,timer:0,id:null,x:0,y:0};
const TPEEK_HOLD=260;
const tpeekTarget=t=>t&&t.closest&&t.closest('.duel .card[data-uid],.duel .card[data-def],#layer .card[data-def]');
function showTouchPeek(cardEl,y){
  const c=peekOf(cardEl);if(!c)return;
  if(!TPEEK.el){TPEEK.el=document.createElement('div');TPEEK.el.id='tpeek';TPEEK.el.setAttribute('aria-hidden','true');document.body.appendChild(TPEEK.el)}
  const st=[];
  // Only state worth knowing: untapped and printed power are the usual case.
  if(c.uid&&G&&G.p.some(p=>p.bz.includes(c))){if(c.tapped)st.push('Tapped');if(c.sick)st.push("Can't attack yet");if(power(c)!==c.p)st.push(`${power(c)} power now`)}
  // The card, as large as the screen allows; below it only what the card doesn't say itself:
  // its state in play and what its keywords mean.
  const notes=[...new Map(cardTextView(c).rules.flatMap(r=>r.reminders).map(m=>[m.term,m])).values()];
  const info=st.length||notes.length?`<div class="tpinfo">${st.length?`<p class="zstate">${esc(st.join(' · '))}.</p>`:''}${notes.map(m=>`<p><b>${esc(m.term)}:</b> ${esc(m.text)}</p>`).join('')}</div>`:'';
  TPEEK.el.innerHTML=`<div class="tpcard">${cardHTML({...c,uid:0,tapped:false},'big',true)}</div>${info}`;
  // Keep clear of the finger: above it when it's low on the screen, below it when high.
  TPEEK.el.classList.toggle('low',y<innerHeight*0.45);
  TPEEK.el.classList.add('show');
  if(TPEEK.card!==cardEl)navigator.vibrate?.(6);
  TPEEK.card=cardEl;
}
function endTouchPeek(){
  clearTimeout(TPEEK.timer);TPEEK.timer=0;
  if(TPEEK.card){TPEEK.card=null;TPEEK.el.classList.remove('show');swallow=true;setTimeout(()=>{swallow=false},350)}
  TPEEK.id=null;
}
document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'||ZOOM)return;
  const card=tpeekTarget(e.target);if(!card)return;
  TPEEK.id=e.pointerId;TPEEK.x=e.clientX;TPEEK.y=e.clientY;
  clearTimeout(TPEEK.timer);TPEEK.timer=setTimeout(()=>{TPEEK.timer=0;showTouchPeek(card,TPEEK.y)},TPEEK_HOLD);
},true);
document.addEventListener('pointermove',e=>{
  if(e.pointerId!==TPEEK.id)return;
  if(TPEEK.card){const card=tpeekTarget(document.elementFromPoint(e.clientX,e.clientY));if(card&&card!==TPEEK.card)showTouchPeek(card,e.clientY);return}
  // Moving before the hold ends is a swipe along the row, not a peek.
  if(TPEEK.timer&&Math.hypot(e.clientX-TPEEK.x,e.clientY-TPEEK.y)>9){clearTimeout(TPEEK.timer);TPEEK.timer=0}
},true);
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,e=>{if(e.pointerId===TPEEK.id)endTouchPeek()},true));
// While peeking the finger slides from card to card, so the row mustn't scroll under it.
document.addEventListener('touchmove',e=>{if(TPEEK.card)e.preventDefault()},{passive:false});
