function setPhase(){const el=document.documentElement;if(el&&el.style)el.style.setProperty('--ph',`-${now()%8000}ms`)}
// A mana chip shows the civilizations it can pay for; multicolored mana is split.
const manaChip=m=>{const cs=civsOf(m);return `<span class="mana ${m.tapped?'used':''}" style="--el:${CIV[m.e].c}${m.e2?`;background:linear-gradient(135deg,${CIV[m.e].c} 50%,${CIV[m.e2].c} 50%)`:''}" title="${esc(m.n)}">${cs.map(e=>CIV[e].n[0]).join('')}</span>`};
const civRank=k=>Object.keys(CIV).indexOf(k.split('/')[0]);
// Mana is grouped by what it pays for, each group with its untapped and total count.
function manaHTML(p,side){
  const groups={},free=p.mana.filter(m=>!m.tapped).length;
  for(const m of p.mana){const k=civsOf(m).join('/');(groups[k]||(groups[k]=[])).push(m)}
  const html=Object.keys(groups).sort((a,b)=>civRank(a)-civRank(b)||a.length-b.length).map(k=>{
    const g=groups[k].slice().sort((a,b)=>a.tapped-b.tapped),u=g.filter(m=>!m.tapped).length;
    return `<span class="mgroup" title="${esc(k.split('/').map(e=>CIV[e].n).join(' or '))}: ${u} of ${g.length} untapped">${g.map(manaChip).join('')}<small>${u}/${g.length}</small></span>`;
  }).join('');
  return `<div class="manas"><button class="lbl link" data-act="pile" data-v="mana:${side}" aria-label="Mana zone, ${free} of ${p.mana.length} untapped. Show the cards">Mana ${free}/${p.mana.length}</button>${html}</div>`;
}
// Shields show their letter. They are picked on the board when breaking or choosing one.
function shieldsHTML(p){
  const attacked=G.attackTarget==='player'&&G.attacking&&!p.bz.includes(G.attacking);
  return `<div class="shields ${attacked?'attacked':''}"><span class="lbl">Shields ${p.sh.length}</span>${p.sh.map(s=>{
    const t=G.targeting?.uids.has(s.uid),br=G.breaking&&G.breaking.uids.has(s.uid);
    if(s.faceUp)return `<div class="back shield faceup ${t?'target':''} ${br?'shatter':''}" data-shield="${s.uid}" ${t?'':`data-def="${s.duelId||s.id}"`} tabindex="0" style="--el:${(CIV[s.e]||{c:'#68717d'}).c}" aria-label="Shield ${s.shL}, face up: ${esc(s.n)}" title="${esc(s.n)}"><span>${s.shL}</span></div>`;
    return `<div class="back shield ${t?'target':''} ${br?'shatter':''}" data-shield="${s.uid}" ${t?'tabindex="0" role="button"':''} aria-label="Shield ${s.shL}"><span>${s.shL}</span></div>`;
  }).join('')}</div>`;
}
function cls(c,p,z){
  const k=[],mine=p===G.p[0],free=G.turn===0&&!G.busy&&!G.targeting&&!G.modal&&!G.over;
  if(G.targeting?.uids.has(c.uid))k.push('target');
  if(G.sel?.uid===c.uid)k.push('sel');
  // During an attack the attacker, its target and the blocker stay marked through every prompt.
  if(G.attacking?.uid===c.uid)k.push('attacking');
  if(G.attackTarget&&G.attackTarget.uid===c.uid)k.push('attacked');
  if(G.blocker?.uid===c.uid)k.push('blocking');
  if(free&&mine&&z==='bz'&&canAttackAnything(c,p))k.push('can');
  if(free&&mine&&z==='hand'&&canPlay(p,c))k.push('can');
  if(free&&!mine&&z==='bz'&&G.sel?.zone==='bz'&&canAttackCreature(selCard(),G.p[0],c))k.push('target');
  return k.join(' ');
}
function sideHTML(p){
  const side=p===G.p[0]?0:1;
  const bz=p.bz.length?p.bz.map(c=>cardHTML(c,cls(c,p,'bz'))).join(''):'<div class="empty">No creatures in the battle zone</div>';
  const top=`<div class="info"><b>${side===0?'You':(G.mp?esc(p.name):'Opponent')}</b><span>${esc(p.deckName)}</span><span>Deck ${p.deck.length}</span><button class="link" data-act="pile" data-v="gy:${side}">Graveyard ${p.gy.length}</button>${side?`<span>Hand ${p.hand.length}</span>${sysHTML()}`:''}</div>
    <div class="stack">${shieldsHTML(p)}${manaHTML(p,side)}</div>`;
  if(side)return `<section class="side">${top}<div class="zone bzone">${bz}</div></section>`;
  const hand=p.hand.length?p.hand.map(c=>cardHTML(c,cls(c,p,'hand'))).join(''):'<div class="empty">Your hand is empty</div>';
  return `<section class="side"><div class="zone bzone">${bz}</div>${top}<div class="lbl">Hand</div><div class="zone">${hand}</div></section>`;
}
// Back, Restart and the sound switch sit in the board's top corner, out of the action bar,
// whose buttons change with every step. Back and Restart work when the game can stop for them
// (against the computer, on your own turn with nothing resolving).
const ICON={
  back:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4.5L6.5 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  restart:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 10a5.5 5.5 0 1 1-1.8-4.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.5 2.8v3.6h-3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  full:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 7.5v-4h4M12.5 3.5h4v4M16.5 12.5v4h-4M7.5 16.5h-4v-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  unfull:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 3.5v4h-4M16.5 7.5h-4v-4M12.5 16.5v-4h4M3.5 12.5h4v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
// Full screen, on a computer (phones have their own browser chrome and gestures for it).
const canFull=()=>!!document.fullscreenEnabled&&matchMedia('(hover: hover) and (pointer: fine)').matches;
const fullBtn=icon=>{
  if(!canFull())return '';
  const on=!!document.fullscreenElement,label=on?'Exit full screen':'Full screen';
  return icon?`<button class="icon" data-act="fullscreen" aria-pressed="${on}" aria-label="${label}" title="${label} (F)">${on?ICON.unfull:ICON.full}</button>`
    :`<button data-act="fullscreen" aria-pressed="${on}" title="${label} (F)">${label}</button>`;
};
function toggleFull(){
  if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
  else document.documentElement.requestFullscreen?.().catch(()=>{});
}
document.addEventListener('keydown',e=>{if((e.key==='f'||e.key==='F')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&canFull()&&!e.target.matches('input,textarea,select'))toggleFull()});
document.addEventListener('fullscreenchange',()=>{document.querySelectorAll('[data-act=fullscreen]').forEach(b=>{b.outerHTML=fullBtn(b.classList.contains('icon'))})});
function gameExitOpen(){return !!G&&!G.over&&!G.modal&&!G.targeting&&(G.mp?true:G.turn===0&&!G.busy)}
const sysHTML=()=>{
  const off=gameExitOpen()?'':' disabled';
  return `<span class="sys"><button class="sysbtn" data-act="gback" title="Back to the start page"${off}>${ICON.back}<span>Back</span></button>${G.mp?'':`<button class="sysbtn" data-act="grestart" title="Restart with the same decks"${off}>${ICON.restart}<span>Restart</span></button>`}${fullBtn(true)}${soundBtn(true)}</span>`;
};
const btn=(a,l,main,v)=>`<button data-act="${a}"${v!=null?` data-v="${v}"`:''} class="${main?'main':''}">${l}</button>`;
// The turn steps: charge, then summon and cast, then attack.
const stepOf=p=>p.attacked?'Attack step':p.played||p.charged?'Main step':'Charge step';
// Whose turn it is, as an arrow: down at you (your side of the board is below the bar), up
// at the opponent. When the turn passes it swings round, once: the bar is redrawn often, so a
// redraw mid-swing carries on from where the swing is (a negative animation delay).
let turnSeen=null,swingAt=0;
function turnArrow(mine,label){
  if(turnSeen!==null&&turnSeen!==mine)swingAt=performance.now();
  turnSeen=mine;
  const t=performance.now()-swingAt,swing=swingAt&&t<700;
  return `<span class="turn tarrow ${mine?'me':'them'} ${swing?'swing':''}" ${swing?`style="--t:-${Math.round(t)}ms"`:''} role="img" aria-label="${esc(label)}" title="${esc(label)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5v12M4.8 10.3L10 15.5l5.2-5.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}
// A selected card's prompt and actions come grouped (.acts): inline in the bar on a wide
// screen; on a phone they float just below the bar, so the board never changes height, and
// carry the card's text too (actText), readable where the card itself is small.
const actText=c=>{const t=cardTextView(c).face;return `<b class="actname"><i class="acost">${c.cost}</i>${esc(c.n)}</b>`+(t.length?`<span class="acttxt">${t.map(esc).join('<br>')}</span>`:'')};
// The panel wears the selected card's frame colors, as the cards and deck tiles do.
const actsOpen=c=>`<span class="acts" style="${frameVars(civsOf(c))}">`;
function barHTML(){
  const me=G.p[0];
  const oppName=G.mp?esc(G.p[1].name):'Opponent',lost=G.winner!==G.p[0];
  if(G.mp&&!IN_CLAUDE&&NET.status&&!G.over)return `<span class="turn">Offline</span><span class="prompt">${NET.status}</span>`;
  if(G.over)return `<span class="prompt">${G.left!=null?`${oppName} left the game.`:G.why==='deck'?(lost?'Your deck ran out.':`${oppName}'s deck ran out.`):lost?`${oppName} broke through.`:'You broke through every shield.'}</span>${btn('new',G.mp?'Back to start page':'Play again',1)}`;
  if(G.req&&G.mp&&!G.targeting&&G.req.seat!==VIEW)return `<span class="turn">Waiting</span><span class="prompt">${oppName} is deciding what to do…</span>`;
  if(G.targeting)return `<span class="turn">Choose</span><span class="prompt">${esc(G.targeting.msg)}</span>${G.targeting.required?'':btn('skip',G.targeting.skip||'Skip')}`;
  if(G.turn!==0)return `${turnArrow(false,G.mp?oppName+"'s turn":"Opponent's turn")}<span class="prompt">${G.mp?'Their moves show up here as they play. ':''}Watch for blocks and shield triggers.</span>`;
  if(G.busy)return `${turnArrow(true,'Your turn')}<span class="prompt">Resolving…</span>`;
  const s=selCard();let h=`${turnArrow(true,'Your turn')}<span class="step">${stepOf(me)}</span>`;
  const canCharge=!me.charged&&!me.played&&!me.attacked;
  if(s&&G.sel.zone==='hand'){
    let why='';
    if(me.attacked)why=" You've attacked this turn, so you can't summon or cast any more.";
    else if(!canPay(me,s))why=` Needs ${s.cost} untapped mana, including ${civsOf(s).map(e=>'1 '+CIV[e].n).join(' and ')}${s.e2?' from different cards':''}.`;
    else if(s.evo&&!bases(me,s).length)why=` Needs one of your ${s.evo}s in the battle zone.`;
    else if(s.needSpell&&!me.castSpell)why=' You can summon it only after casting a spell this turn.';
    if(!me.charged&&!canCharge)why+=' Mana is charged before you summon, cast or attack.';
    h+=`${actsOpen(s)}${actText(s)}<span class="prompt"><span class="psel">${s.n} selected.</span>${why?`<span class="pwhy">${why}</span>`:''}</span>`;
    if(canCharge)h+=btn('charge','Charge as mana');
    if(canPlay(me,s))h+=btn('play',s.t==='s'?'Cast':s.evo?'Evolve':'Summon',1);
    h+=btn('view','View card')+btn('cancel','Cancel')+'</span>';
  }else if(s&&G.sel.zone==='bz'){
    const any=attackTargets(s,me).length>0,prey=T(s).hunts?'an enemy creature':'a tapped enemy creature';
    const tapAb=canTapAbility(s,me)?T(s).tapAb.map((fx,i)=>btn('tapab','Tap: '+esc(fxDesc(fx)),0,i)).join(''):'';
    h+=actsOpen(s)+actText(s);
    if(!canAttackAnything(s,me))h+=`<span class="prompt">${s.n} can tap instead of attacking to use its ability.</span>`;
    else if(!canAttackPlayer(s,me))h+=`<span class="prompt">${s.n} can't attack players.${any?` Pick ${prey} to attack.`:' No creatures available to attack.'}</span>`;
    else{
      h+=`<span class="prompt">${G.notice||`${s.n} is ready.`}${any?` Pick ${prey}, or`:''}${me.attacked?'':' Attacking ends your main step.'}</span>`;
      h+=btn('atkp',G.p[1].sh.length?'Attack shields':'Attack directly',1);
    }
    h+=tapAb;
    h+=btn('view','View card')+btn('cancel','Cancel')+'</span>';
  }else{
    h+=`<span class="prompt">${G.notice||(me.attacked?'Attack with ready creatures, or end your turn.':canCharge?'Pick a card to charge as mana, then summon and attack.':'Summon creatures or attack with ready ones.')}</span>`;
  }
  return h+'<button data-act="end" class="endturn">End turn</button>';
}
// The log folds away (closed by default on phones) and stays as the player left it.
let logOpen=!matchMedia('(max-width:600px), (max-height:500px)').matches;
document.addEventListener('toggle',e=>{if(e.target.matches&&e.target.matches('details.log'))logOpen=e.target.open},true);
// Card names in the log open that card. Names are matched once per distinct line.
let logNames=null;
const logCache=new Map();
function logHTML(line){
  let html=logCache.get(line);
  if(html!=null)return html;
  if(!logNames){
    const byName=new Map();
    for(const c of CATALOG)if(c.duelId===c.id&&!byName.has(esc(c.n)))byName.set(esc(c.n),c.id);
    const names=[...byName.keys()].sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    logNames={byName,re:new RegExp(`(?<![\\w-])(${names.join('|')})(?![\\w-])`,'g')};
  }
  html=esc(line).replace(logNames.re,n=>`<span class="cref" data-def="${logNames.byName.get(n)}" tabindex="0">${n}</span>`);
  if(logCache.size>400)logCache.clear();
  logCache.set(line,html);
  return html;
}
// A prompt's answers. Answers that are cards show the cards themselves, to pick by sight
// (resting the mouse on one shows it large, as anywhere else); the rest (Skip, Yes, No)
// stay buttons below them.
function modalOpts(opts){
  const btn=(o,i)=>`<button data-act="ans" data-v="${i}" class="${o.main?'main':''}">${esc(o.label)}</button>`;
  const cards=opts.map((o,i)=>[o,i,o.uid&&findCard(o.uid)?.c]).filter(([,,c])=>c);
  if(!cards.length)return `<div class="opts">${opts.map(btn).join('')}</div>`;
  return `<div class="pickcards">${cards.map(([o,i,c])=>`<button data-act="ans" data-v="${i}" aria-label="${esc(o.label)}">${cardHTML({...c,uid:0,tapped:false},'').replace(' tabindex="0"','')}</button>`).join('')}</div>
    <div class="opts">${opts.map((o,i)=>o.uid&&findCard(o.uid)?'':btn(o,i)).join('')}</div>`;
}
// The log, read by turn: each turn is a section headed by whose turn it was, newest turn on
// top, its lines in the order they happened. A line's rail shows who did it: a line written
// from a player's side starts with that player's seat marker (see V in state.js); the rest are
// card events ("... is destroyed"), shown neutral.
const TURN_LINE=/^\u0001(\d)\u0002[^\u0002]*\u0002[^\u0003]*\u0003 (\d+) begins\.$/;
function logTurnsHTML(){
  const turns=[{seat:-1,lines:[]}];
  for(const raw of [...G.log].reverse()){
    const m=TURN_LINE.exec(raw);
    if(m){turns.push({seat:+m[1],head:viewText(raw).replace(/ begins\.$/,''),lines:[]});continue}
    turns[turns.length-1].lines.push(raw);
  }
  const who=seat=>seat<0?'none':seat===VIEW?'me':'them';
  return turns.filter(t=>t.lines.length||t.seat>=0).reverse().map((t,i)=>`<section class="lturn ${who(t.seat)} ${i?'':'now'}">
    <h4>${t.seat<0?'Before the duel':esc(t.head)}</h4>
    <ol>${t.lines.map(raw=>{const m=/^\u0001(\d)\u0002/.exec(raw);return `<li class="by-${m?who(+m[1]):'none'}">${logHTML(viewText(raw))}</li>`}).join('')}</ol></section>`).join('');
}
function render(){
  if(SIM)return;
  if(!G)return;
  setPhase();
  labelShields();
  // Your own cards (you know your list) and only the opponent's face-up zones: preloading their
  // hand, shields or deck would reveal hidden cards in the browser's network log.
  const [me,them]=G.p;
  warmArt([me.hand,me.bz,me.mana,me.sh,me.deck,me.gy,them.bz,them.mana,them.gy].flat());
  if(G.mp&&MP&&!MP.applying&&G.turn===0&&!G.over)mpPush();
  // Rows swiped sideways (phones) keep their place: redrawing the board would reset them to the start.
  const rowScroll=[...document.querySelectorAll('.duelmain .zone')].map(z=>z.scrollLeft);
  // The log comes first so a wide screen can give it the left column; narrow screens put it last.
  $('#app').innerHTML=`<div class="duel"><details class="log" ${logOpen?'open':''}><summary>Game log<span class="llast">${G.log.length?esc(viewText(G.log[0])):''}</span><span class="lchev" aria-hidden="true"></span></summary><div aria-live="polite">${logTurnsHTML()}</div></details>
    <div class="duelmain">${sideHTML(G.p[1])}<div class="bar">${barHTML()}</div>${sideHTML(G.p[0])}</div></div>`;
  let layer='';
  if(G.modal)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${esc(G.modal.title)}</h2>${G.modal.card?`<div class="dcard">${cardHTML({...G.modal.card,uid:0,tapped:false},'big',true)}</div>`:''}<p>${esc(G.modal.text)}</p>
    ${modalOpts(G.modal.opts)}</div></div>`;
  else if(G.over)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${G.winner!==G.p[0]?'Defeat':'Victory'}</h2>
    <p>${G.left!=null?`${esc(G.p[1].name)} left the game.`:G.why==='deck'?(G.winner!==G.p[0]?'Your deck ran out of cards, and a player with no deck loses.':`${G.mp?esc(G.p[1].name)+"'s":"The opponent's"} deck ran out of cards.`):G.winner!==G.p[0]?`Your last shield fell and ${G.mp?esc(G.p[1].name):'the opponent'} landed the final blow.`:'Every shield is gone and your creature struck the final blow.'}</p>
    <div class="opts">${btn('new',G.mp?'Back to start page':'Play again',1)}</div></div></div>`;
  $('#layer').innerHTML=layer;
  playLogSounds();
  document.querySelectorAll('.duelmain .zone').forEach((z,i)=>{if(rowScroll[i])z.scrollLeft=rowScroll[i];markOverflow(z)});
  fitPrompt();
}
// On a phone the bar's hint is one line; when it's cut off a ▾ shows, and tapping it opens the
// whole text in a panel below the bar. It closes when tapped again or when the hint changes;
// a warning (G.notice) opens by itself.
const PROMPT={text:'',open:false};
// On a phone the open log (a drawer over the board) and the opened hint close on a tap
// anywhere outside them; that tap only closes them, it doesn't also reach the board.
const PHONE=matchMedia('(max-width:600px)');
document.addEventListener('click',e=>{
  if(!PHONE.matches||!G)return;
  const log=document.querySelector('.duel>details.log[open]');
  if(log&&!log.contains(e.target)){log.open=false;logOpen=false;e.preventDefault();e.stopImmediatePropagation();return}
  if(PROMPT.open&&!e.target.closest('.bar>.prompt')&&!e.target.closest('#layer,#zoom')){PROMPT.open=false;render();e.preventDefault();e.stopImmediatePropagation()}
},true);
function fitPrompt(){
  const pr=document.querySelector('.duelmain .bar>.prompt');if(!pr)return;
  const t=pr.textContent;
  if(t!==PROMPT.text){PROMPT.text=t;PROMPT.open=!!(G&&G.notice)}
  pr.dataset.act='pmore';
  pr.classList.toggle('open',PROMPT.open);
  pr.classList.toggle('clip',!PROMPT.open&&pr.scrollWidth>pr.clientWidth+1);
}
// A row of cards wider than the screen (phones swipe them) fades at the right edge while
// more cards wait off-screen.
function markOverflow(z){z.classList.toggle('overflowing',z.scrollWidth-z.clientWidth-z.scrollLeft>4)}
document.addEventListener('scroll',e=>{if(e.target.classList?.contains('zone'))markOverflow(e.target)},{capture:true,passive:true});
