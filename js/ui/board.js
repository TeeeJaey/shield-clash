function setPhase(){const el=document.documentElement;if(el&&el.style)el.style.setProperty('--ph',`-${now()%8000}ms`)}
// A mana chip shows the civilizations it can pay for; multicolored mana is split.
const manaChip=m=>{const cs=civsOf(m);return `<span class="mana ${m.tapped?'used':''}" style="--el:${CIV[m.e].c};--elt:${!m.e2&&CIV[m.e].t||'#fff'}${m.e2?`;background:linear-gradient(135deg,${CIV[m.e].c} 50%,${CIV[m.e2].c} 50%)`:''}" title="${esc(m.n)}">${cs.map(e=>CIV[e].n[0]).join('')}</span>`};
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
  // Every shield keeps its slot: a broken one leaves a grey gap, so the letters never shift.
  const byL=new Map(p.sh.map(s=>[s.shL,s])),slots=[];
  for(let n=0;n<=(p.shN??-1);n++){const L=shieldLetter(n);slots.push(byL.get(L)||L)}
  for(const s of p.sh)if(!slots.includes(s))slots.push(s);
  // A breaking shield flies apart in shards over the gap it leaves.
  const shards='<i class="shard"></i>'.repeat(6)+'<i class="flash"></i>';
  return `<div class="shields ${attacked?'attacked':''}"><span class="lbl">Shields ${p.sh.length}</span>${slots.map(s=>{
    if(typeof s==='string')return `<div class="back shield gone" aria-hidden="true"><span>${s}</span></div>`;
    const t=G.targeting?.uids.has(s.uid),br=G.breaking&&G.breaking.uids.has(s.uid);
    if(br)return `<div class="back shield breaking ${s.faceUp?'faceup':''}" ${s.faceUp?`style="--el:${(CIV[s.e]||{c:'#68717d'}).c}"`:''} aria-label="Shield ${s.shL} breaks">${shards}</div>`;
    if(s.faceUp)return `<div class="back shield faceup ${t?'target':''}" data-shield="${s.uid}" ${t?'':`data-def="${s.duelId||s.id}"`} tabindex="0" style="--el:${(CIV[s.e]||{c:'#68717d'}).c}" aria-label="Shield ${s.shL}, face up: ${esc(s.n)}" title="${esc(s.n)}"><span>${s.shL}</span></div>`;
    return `<div class="back shield ${t?'target':''}" data-shield="${s.uid}" ${t?'tabindex="0" role="button"':''} aria-label="Shield ${s.shL}"><span>${s.shL}</span></div>`;
  }).join('')}</div>`;
}
// An empty zone: a dashed card-shaped slot with a line under it, in the middle of the zone.
const emptyZone=t=>`<div class="empty zempty"><span class="eslot" aria-hidden="true"></span><span>${t}</span></div>`;
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
// The civilizations a side plays, most cards first (its deck's colors, which its deck name shows anyway).
function sideCivs(p){
  const n={};for(const z of ['deck','hand','mana','bz','gy','sh'])for(const c of p[z])for(const e of civsOf(c))if(EMB[e])n[e]=(n[e]||0)+1;
  return Object.keys(n).sort((a,b)=>n[b]-n[a]).slice(0,2);
}
function sideHTML(p){
  const side=p===G.p[0]?0:1;
  const bz=p.bz.length?p.bz.map(c=>cardHTML(c,cls(c,p,'bz'))).join(''):emptyZone('No creatures in the battle zone');
  // The battle zone is a play mat with a faint tint of the side's main civilization.
  const mat=`<div class="zone bzone" style="--m1:${(PAL[sideCivs(p)[0]]||PAL.unknown).frame}">${bz}</div>`;
  const top=`<div class="rail"><div class="info"><b>${side===0?'You':(G.mp?esc(p.name):'Opponent')}</b><span>${esc(p.deckName)}</span><span>Deck ${p.deck.length}</span><button class="link" data-act="pile" data-v="gy:${side}">Graveyard ${p.gy.length}</button>${side?`<span>Hand ${p.hand.length}</span>${sysHTML()}`:''}</div>
    ${lastingHTML(side)}<div class="stack">${shieldsHTML(p)}${manaHTML(p,side)}</div></div>`;
  if(side)return `<section class="side">${top}${mat}</section>`;
  const hand=p.hand.length?p.hand.map(c=>cardHTML(c,cls(c,p,'hand'))).join(''):emptyZone('Your hand is empty');
  return `<section class="side">${mat}${top}<div class="lbl hlbl">Hand</div><div class="zone handzone">${hand}</div></section>`;
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
  // A card selected just to look at: its name and text, View card and Cancel, whoever's turn it is.
  const look=G.sel?.zone==='look'&&selCard(),lookBar=c=>`${actsOpen(c)}${actText(c)}<span class="prompt"><span class="psel">${esc(c.n)} selected.</span></span>${btn('view','View card',1)}${btn('cancel','Cancel')}</span>`;
  if(G.turn!==0)return `${turnArrow(false,G.mp?oppName+"'s turn":"Opponent's turn")}${look?lookBar(look):`<span class="prompt">${G.mp?'Their moves show up here as they play. ':''}Watch for blocks and shield triggers.</span>`}`;
  if(G.busy)return `${turnArrow(true,'Your turn')}${look?lookBar(look):'<span class="prompt">Resolving…</span>'}`;
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
    // A short button: what the ability does is on the card, in the tooltip, and in the prompts that follow.
    const abs=canTapAbility(s,me)?T(s).tapAb:[];
    const tapAb=abs.map((fx,i)=>{const d=esc(fxDesc(fx));return `<button data-act="tapab" data-v="${i}" title="${d}" aria-label="Use ability: ${d}">Use ability${abs.length>1?' '+(i+1):''}</button>`}).join('');
    h+=actsOpen(s)+actText(s);
    if(!canAttackAnything(s,me))h+=`<span class="prompt">${s.n} can tap instead of attacking to use its ability.</span>`;
    else if(!canAttackPlayer(s,me))h+=`<span class="prompt">${s.n} can't attack players.${any?` Pick ${prey} to attack.`:' No creatures available to attack.'}</span>`;
    else{
      h+=`<span class="prompt">${G.notice||`${s.n} is ready.`}${any?` Pick ${prey}, or`:''}${me.attacked?'':' Attacking ends your main step.'}</span>`;
      h+=btn('atkp',G.p[1].sh.length?'Attack shields':'Attack directly',1);
    }
    h+=tapAb;
    h+=btn('view','View card')+btn('cancel','Cancel')+'</span>';
  }else if(look){
    h+=lookBar(look);
  }else{
    h+=`<span class="prompt">${G.notice||(me.attacked?'Attack with ready creatures, or end your turn.':canCharge?'Pick a card to charge as mana, then summon and attack.':'Summon creatures or attack with ready ones.')}</span>`;
  }
  return h+'<button data-act="end" class="endturn">End turn</button>';
}
// The log folds away (closed by default on phones) and stays as the player left it.
let logOpen=!matchMedia('(max-width:600px)').matches;
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
// The card a prompt's answer stands for, wherever it is: hand, battle zone, mana, graveyard,
// deck or shields. Answers for face-down cards carry no uid, so those stay letters.
function optCard(o){
  if(!o||!o.uid||!G)return null;
  for(const p of G.p)for(const z of ['hand','bz','mana','gy','deck','sh']){const c=p[z].find(x=>x.uid===o.uid);if(c)return c}
  return null;
}
// A prompt's answers. Answers that are cards show as a row of cards to swipe through (with
// arrows on a computer), each with its own button to choose it; tapping a card opens it in
// the zoom view, which browses the same cards and can choose one too. The rest (Skip, Yes,
// No) stay buttons below.
function modalOpts(opts){
  const btn=(o,i)=>`<button data-act="ans" data-v="${i}" class="${o.main?'main':''}">${esc(o.label)}</button>`;
  const cards=opts.map((o,i)=>[o,i,optCard(o)]).filter(([,,c])=>c);
  if(!cards.length)return `<div class="opts">${opts.map(btn).join('')}</div>`;
  const step=d=>cards.length>1?`<button class="icon pkstep" data-pkstep="${d}" aria-label="${d<0?'Previous cards':'More cards'}">${d<0?'‹':'›'}</button>`:'';
  const rest=opts.map((o,i)=>optCard(o)?'':btn(o,i)).join('');
  return `<div class="pickwrap">${step(-1)}<div class="pickrow" role="list">${cards.map(([o,i,c])=>`<div class="pick" role="listitem">
      ${cardHTML({...c,uid:0,tapped:false},'').replace('data-def="',`data-pick="${i}" data-def="`)}
      ${o.note?`<small>${esc(o.note)}</small>`:''}
      <button data-act="ans" data-v="${i}" class="${cards.length===1||o.main?'main':''}" aria-label="${esc(o.label)}">${esc(o.btn||'Choose')}</button></div>`).join('')}</div>${step(1)}</div>
    ${rest?`<div class="opts">${rest}</div>`:''}`;
}
// Several cards picked together (askPicks): one row of cards, each with its own Pick button, and
// Done once enough are picked. Tapping a card opens it, as anywhere.
function picksHTML(m){
  const s=m.picks,n=s.sel.length,full=n>=s.max;
  const need=s.min===s.max?`Pick ${s.max}.`:s.min?`Pick ${s.min} to ${s.max}.`:s.max>=s.cards.length&&s.max>1?'Pick any number.':`Pick up to ${s.max}.`;
  return `<div class="overlay"><div class="dialog swap" role="dialog" aria-label="${esc(m.title)}"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p>
    <div class="pickwrap"><button class="icon pkstep" data-pkstep="-1" aria-label="Previous cards">‹</button><div class="pickrow" role="list">${s.cards.map((c,i)=>{const on=s.sel.includes(i);
      return `<div class="pick ${on?'on':''}" role="listitem">${cardHTML({...c,uid:0,tapped:false},'')}<button data-act="pkpick" data-v="${i}" class="${on?'main':''}" aria-pressed="${on}" ${on||!full?'':'disabled'}>${on?'✓ Picked':'Pick'}</button></div>`}).join('')}</div><button class="icon pkstep" data-pkstep="1" aria-label="More cards">›</button></div>
    <p class="swsum ${n?'':'muted'}">${n?`${n} picked`:''}${n&&s.max>n?' · ':''}${need}</p>
    <div class="opts"><button data-act="pkdone" class="main" ${n>=s.min?'':'disabled'}>${n?`Done (${n})`:'Pick none'}</button></div></div></div>`;
}
// Two cards trading places (askSwap): a row of cards for each side with a pick in each, and
// the trade spelled out before it happens. Tapping a card opens it, as anywhere.
function swapHTML(m){
  const s=m.swap,a=s.from.cards[s.sel[0]],b=s.to.cards[s.sel[1]],ready=!!a&&(!!b||!s.to.cards.length);
  const row=(side,k)=>`<section class="swrow"><h3><span class="swn">${k+1}</span>${esc(side.label)}</h3>
    ${side.cards.length?`<div class="pickwrap"><button class="icon pkstep" data-pkstep="-1" aria-label="Previous cards">‹</button><div class="pickrow" role="list">${side.cards.map((c,i)=>{const on=s.sel[k]===i;
      return `<div class="pick ${on?'on':''}" role="listitem">${cardHTML({...c,uid:0,tapped:false},'')}<button data-act="swpick" data-v="${k}:${i}" class="${on?'main':''}" aria-pressed="${on}">${on?'✓ Picked':'Pick'}</button></div>`}).join('')}</div><button class="icon pkstep" data-pkstep="1" aria-label="More cards">›</button></div>`
      :`<p class="swempty">${esc(side.empty||'Nothing here.')}</p>`}</section>`;
  const sum=a?`<p class="swsum"><b>${esc(a.n)}</b> goes to ${esc(s.from.dest)}<span class="swarrow" aria-hidden="true">⇄</span>${b?`<b>${esc(b.n)}</b> goes to ${esc(s.to.dest)}`:s.to.cards.length?'<span class="muted">pick a card in row 2</span>':`it comes straight back to ${esc(s.to.dest)}`}</p>`
    :'<p class="swsum muted">Pick a card in each row.</p>';
  return `<div class="overlay"><div class="dialog swap" role="dialog" aria-label="${esc(m.title)}"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p>
    ${row(s.from,0)}${row(s.to,1)}${sum}<div class="opts"><button data-act="swdo" class="main" ${ready?'':'disabled'}>Swap</button>${s.optional?'<button data-act="swskip">Don&#39;t swap</button>':''}</div></div></div>`;
}
// The row's arrows scroll it by most of its width, and hide at either end.
function markPicks(row){
  const wrap=row.parentElement,end=row.scrollWidth-row.clientWidth;
  wrap.classList.toggle('scrolls',end>4);
  wrap.querySelectorAll('[data-pkstep]').forEach(b=>{b.disabled=+b.dataset.pkstep<0?row.scrollLeft<=4:row.scrollLeft>=end-4});
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-pkstep]');if(!b)return;
  const row=b.parentElement.querySelector('.pickrow');
  row.scrollBy({left:+b.dataset.pkstep*row.clientWidth*0.8,behavior:'smooth'});
});
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
  saveGame();
  // Rows swiped sideways (phones) keep their place: redrawing the board would reset them to the start.
  const rowScroll=[...document.querySelectorAll('.duelmain .zone')].map(z=>z.scrollLeft);
  // Where each card and shield on screen was, so a card that changes zone can fly from there.
  const wasAt=new Map([...document.querySelectorAll('.duelmain .card[data-uid],.duelmain [data-shield]')].map(el=>[+(el.dataset.uid||el.dataset.shield),el.getBoundingClientRect()]));
  // A prompt's row of cards keeps its place too, while the same prompt is up.
  const pickScroll=G.modal&&G.modal===PICKROW.modal?[...document.querySelectorAll('#layer .pickrow')].map(r=>r.scrollLeft):[];
  // The log comes first so a wide screen can give it the left column; narrow screens put it last.
  $('#app').innerHTML=`<div class="duel"><div class="dsys">${sysHTML()}</div><details class="log" ${logOpen?'open':''}><summary title="Game log">Game log<span class="llast">${G.log.length?esc(viewText(G.log[0])):''}</span><span class="lchev" aria-hidden="true"></span></summary><div aria-live="polite">${logTurnsHTML()}</div></details>
    <div class="duelmain">${sideHTML(G.p[1])}<div class="bar">${barHTML()}</div>${sideHTML(G.p[0])}</div></div>`;
  let layer='';
  if(G.modal&&G.modal.swap)layer=swapHTML(G.modal);
  else if(G.modal&&G.modal.picks)layer=picksHTML(G.modal);
  else if(G.modal)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${esc(G.modal.title)}</h2>${G.modal.card?`<div class="dcard">${cardHTML({...G.modal.card,uid:0,tapped:false},'')}</div>`:''}<p class="${G.modal.note||G.modal.card?'dq':''}">${esc(G.modal.text)}</p>${G.modal.note?`<p class="dnote">${esc(G.modal.note)}</p>`:''}
    ${(G.modal.show||[]).map(g=>`${g.label?`<h3 class="showlbl">${esc(g.label)} <small>${g.cards.length}</small></h3>`:''}<div class="pickwrap"><div class="pickrow showrow" role="list">${g.cards.map(c=>`<div class="pick" role="listitem">${cardHTML({...c,uid:0,tapped:false},'')}</div>`).join('')}</div></div>`).join('')}
    ${modalOpts(G.modal.opts)}</div></div>`;
  else if(G.over)layer=`<div class="overlay"><div class="dialog" role="dialog"><h2>${G.winner!==G.p[0]?'Defeat':'Victory'}</h2>
    <p>${G.left!=null?`${esc(G.p[1].name)} left the game.`:G.why==='deck'?(G.winner!==G.p[0]?'Your deck ran out of cards, and a player with no deck loses.':`${G.mp?esc(G.p[1].name)+"'s":"The opponent's"} deck ran out of cards.`):G.winner!==G.p[0]?`Your last shield fell and ${G.mp?esc(G.p[1].name):'the opponent'} landed the final blow.`:'Every shield is gone and your creature struck the final blow.'}</p>
    <div class="opts">${btn('new',G.mp?'Back to start page':'Play again',1)}</div></div></div>`;
  $('#layer').innerHTML=layer;
  PICKROW.modal=G.modal;
  document.querySelectorAll('#layer .pickrow').forEach((r,i)=>{r.scrollLeft=pickScroll[i]||0;markPicks(r)});
  // The zoom view opened from a prompt's cards belongs to that prompt: once it's answered or
  // gone, the view closes too, rather than offering choices that no longer exist.
  if(ZOOM&&ZNAV&&ZNAV.modal&&ZNAV.modal!==G.modal)closeZoom();
  playLogSounds();
  document.querySelectorAll('.duelmain .zone').forEach((z,i)=>{if(rowScroll[i])z.scrollLeft=rowScroll[i];markOverflow(z)});
  fitPrompt();
  armAutoEnd();
  renderCast();
  showChanges(wasAt);
}
/* ---------- what changed since the last redraw ---------- */
// Effects move cards between zones, tap them and change their power, often several at once. Each
// change eases in so it can be followed, kept small and short: a card that changed zone flies from
// where it was to where it went (a copy face down when both places are hidden), a card turning
// sideways turns, and a power that changed bumps. The counter or zone it lands in bumps too.
const MOVES={g:null,at:new Map(),look:new Map()};
const MOVE_ZONES=['hand','bz','mana','gy','sh','deck'];
function zoneMap(){
  const m=new Map();
  G.p.forEach((p,seat)=>MOVE_ZONES.forEach(z=>p[z].forEach(c=>m.set(c.uid,{seat,z,c}))));
  return m;
}
// Where a zone is on screen: its counter or label, or the row its cards sit in.
function zoneAnchor(seat,z){
  const side=[...document.querySelectorAll('.duelmain .side')][seat===0?1:0];if(!side)return null;
  const count=re=>[...side.querySelectorAll('.info>span')].find(el=>re.test(el.textContent));
  return z==='mana'?side.querySelector('[data-v^="mana:"]'):z==='gy'?side.querySelector('[data-v^="gy:"]'):z==='deck'?count(/^Deck /)
    :z==='sh'?side.querySelector('.shields'):z==='bz'?side.querySelector('.bzone'):seat===0?side.querySelector('.handzone'):count(/^Hand /);
}
const bumpEl=el=>{if(!el)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')};
const lookMap=()=>new Map([...document.querySelectorAll('.duelmain .card[data-uid]')].map(el=>[+el.dataset.uid,{tapped:el.classList.contains('tapped'),pw:el.querySelector('.pw')?.textContent}]));
function showChanges(wasAt){
  const at=zoneMap(),calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(MOVES.g!==G){MOVES.g=G;MOVES.at=at;MOVES.look=lookMap();return}
  const moved=[];
  for(const [uid,to] of at){
    const from=MOVES.at.get(uid);
    if(!from||from.seat===to.seat&&from.z===to.z)continue;
    // A spell flies from where it was cast (renderCast), a summoned creature arrives in place.
    if(G.landed&&uid===G.landed.uid&&to.z===G.landed.to||from.z==='hand'&&to.z==='bz')continue;
    moved.push([uid,from,to]);
  }
  MOVES.at=at;
  const hidden=({seat,z,c})=>z==='deck'||z==='sh'&&!c.faceUp||z==='hand'&&seat===1;
  moved.slice(0,8).forEach(([uid,from,to],i)=>{
    const dest=to.z==='sh'?document.querySelector(`.duelmain [data-shield="${uid}"]`):to.z==='bz'||to.z==='hand'&&to.seat===0?document.querySelector(`.duelmain .card[data-uid="${uid}"]`):null;
    const land=dest||zoneAnchor(to.seat,to.z),a=wasAt.get(uid)||zoneAnchor(from.seat,from.z)?.getBoundingClientRect();
    const bump=()=>bumpEl(dest?null:land);
    if(!land||!a||calm){bump();return}
    const face=!(hidden(from)&&hidden(to)),b=land.getBoundingClientRect();
    const w=wasAt.has(uid)?a.width:face?56:30;
    const g=document.createElement('div');g.innerHTML=face?cardHTML({...to.c,uid:0,tapped:false},'',true):'<div class="back"></div>';
    const ghost=g.firstElementChild;
    Object.assign(ghost.style,{position:'fixed',left:(a.left+a.width/2-w/2)+'px',top:(a.top+a.height/2-w*.7)+'px',width:w+'px',height:face?'':w*1.4+'px',margin:'0',zIndex:'9',pointerEvents:'none'});
    document.body.appendChild(ghost);
    if(dest)dest.style.visibility='hidden';
    const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-(a.top+a.height/2);
    const end=dest?`translate(${dx}px,${dy}px) scale(${b.width/w})`:`translate(${dx}px,${dy}px) scale(.18) rotate(${dx<0?-10:10}deg)`;
    ghost.animate([{transform:'none',opacity:1},{transform:end,opacity:dest?1:.3}],
      {duration:dest?420:480,delay:i*70,easing:dest?'cubic-bezier(.3,.7,.4,1)':'cubic-bezier(.55,0,.8,.3)',fill:'backwards'})
      .onfinish=()=>{ghost.remove();if(dest)dest.style.visibility='';bump()};
  });
  // Tapped or untapped, or a new power, since the last redraw.
  if(!calm)document.querySelectorAll('.duelmain .card[data-uid]').forEach(el=>{
    const was=MOVES.look.get(+el.dataset.uid);if(!was||/\bfx-/.test(el.className))return;
    const tapped=el.classList.contains('tapped'),pw=el.querySelector('.pw');
    if(was.tapped!==tapped){const cs=getComputedStyle(el);el.animate([{transform:was.tapped?'rotate(9deg)':'none',opacity:was.tapped?.62:1},{transform:cs.transform,opacity:cs.opacity}],{duration:280,easing:'ease-out'})}
    if(pw&&was.pw!==pw.textContent)bumpEl(pw);
  });
  MOVES.look=lookMap();
}
/* ---------- spells: being cast, landing, in effect ---------- */
// While a spell resolves it's shown large over the board, under any prompt it brings up; then
// it flies into its owner's graveyard (a charger into the mana zone). Spells whose effect lasts
// show as chips on their caster's side until it ends; tap one to read it.
const CAST={el:null,card:null,landed:null};
function renderCast(){
  const c=G&&G.casting;
  if(c&&CAST.card!==c.c){
    if(!CAST.el){CAST.el=document.createElement('div');CAST.el.id='cast';CAST.el.setAttribute('aria-live','polite');document.body.appendChild(CAST.el)}
    CAST.card=c.c;
    CAST.el.className='show '+(c.seat===0?'mine':'theirs');
    CAST.el.innerHTML=`<span class="castlbl">${c.seat===0?'You cast':(G.mp?esc(G.p[c.seat].name)+' casts':'Opponent casts')}</span>${cardHTML({...c.c,uid:0,tapped:false},'',true)}`;
  }
  const l=G&&G.landed;
  if(l&&l!==CAST.landed){CAST.landed=l;flyToPile(l)}
  if(!c&&CAST.card){CAST.card=null;CAST.el.classList.remove('show')}
  // While the spell asks something it steps aside: a dialog already names it, and on the board it
  // waits small in the corner so it never covers the creatures to choose from.
  if(CAST.el){CAST.el.classList.toggle('asking',!!(c&&G.modal));CAST.el.classList.toggle('corner',!!(c&&G.targeting&&!G.modal))}
}
function flyToPile(l){
  const target=document.querySelector(`.duelmain [data-act="pile"][data-v="${l.to}:${l.seat}"]`);if(!target)return;
  target.classList.remove('bump');void target.offsetWidth;target.classList.add('bump');
  const from=CAST.card&&CAST.el.querySelector('.card');
  if(!from||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const a=from.getBoundingClientRect(),b=target.getBoundingClientRect(),ghost=from.cloneNode(true);
  Object.assign(ghost.style,{position:'fixed',left:a.left+'px',top:a.top+'px',width:a.width+'px',margin:'0',zIndex:'9',pointerEvents:'none'});
  document.body.appendChild(ghost);
  const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-(a.top+a.height/2);
  ghost.animate([{transform:'none',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.12) rotate(${dx<0?-14:14}deg)`,opacity:.25}],
    {duration:520,easing:'cubic-bezier(.55,0,.8,.3)'}).onfinish=()=>ghost.remove();
}
const lastingHTML=side=>{const l=(G.lasting||[]).filter(x=>x.seat===side);return l.length?`<div class="lastrow" aria-label="Spells in effect">${l.map(x=>`<span class="lasting" data-def="${esc(x.id)}" style="--lc:${(PAL[DEF[x.id]?.e]||PAL.unknown).frame}" tabindex="0" title="${esc(x.n)}: in effect ${x.until==='end'?'this turn':'until its caster’s next turn'}"><span aria-hidden="true">✦</span>${esc(x.n)}<small>${x.until==='end'?'this turn':'until next turn'}</small></span>`).join('')}</div>`:''};
// Nothing left to do this turn: a ring fills around End turn, counting the seconds down, and
// the turn ends by itself when it closes. Any touch, click or key starts the wait again, so it
// never ends a turn while you're looking at something.
const AUTO_END_MS=6000,AUTOEND={timer:0,tick:0,t0:0};
function turnIdle(){
  if(!G||G.over||G.turn!==0||G.busy||G.modal||G.targeting||G.starting||G.sel||ZOOM||(G.mp&&G.req))return false;
  const me=G.p[0];
  if(!me.charged&&!me.played&&!me.attacked&&me.hand.length)return false;
  return !me.hand.some(c=>canPlay(me,c))&&!me.bz.some(c=>canAttackAnything(c,me)||canTapAbility(c,me));
}
function stopAutoEnd(){clearTimeout(AUTOEND.timer);clearInterval(AUTOEND.tick);AUTOEND.timer=AUTOEND.tick=0}
function armAutoEnd(){
  const b=document.querySelector('.duelmain .endturn');
  if(!b||!turnIdle()){stopAutoEnd();return}
  if(!AUTOEND.timer){
    AUTOEND.t0=performance.now();
    AUTOEND.timer=setTimeout(()=>{stopAutoEnd();if(turnIdle())onAct('end')},AUTO_END_MS);
    AUTOEND.tick=setInterval(showAutoEnd,250);
  }
  showAutoEnd();
}
// The button is redrawn with the board, so the ring picks up where it was.
function showAutoEnd(){
  const b=document.querySelector('.duelmain .endturn');if(!b||!AUTOEND.timer)return;
  const gone=performance.now()-AUTOEND.t0,left=Math.max(1,Math.ceil((AUTO_END_MS-gone)/1000));
  if(!b.classList.contains('autoend')){b.classList.add('autoend');b.style.setProperty('--ae',AUTO_END_MS+'ms');b.style.setProperty('--aed',-gone+'ms')}
  b.innerHTML=`End turn <span class="aesec" aria-hidden="true">${left}</span>`;
  b.setAttribute('aria-label',`End turn. Nothing left to do: the turn ends in ${left} seconds`);
}
['pointerdown','keydown'].forEach(n=>addEventListener(n,()=>{
  if(!AUTOEND.timer)return;
  stopAutoEnd();
  const b=document.querySelector('.duelmain .endturn.autoend');
  if(b){b.classList.remove('autoend');b.textContent='End turn';b.removeAttribute('aria-label')}
},true));
['click','keyup'].forEach(n=>addEventListener(n,()=>setTimeout(armAutoEnd,0)));
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
// A selected card's panel closes on a click on empty space, anywhere on the board. A click on
// another card still does what it does (select it, or attack it), and buttons still work.
document.addEventListener('click',e=>{
  if(!G||!G.sel||swallow||!e.target.closest('.duel')||e.target.closest('.bar .acts,.card,[data-shield],[data-act],button,a,summary,details.log'))return;
  G.sel=null;render();
});
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
document.addEventListener('scroll',e=>{if(e.target.classList?.contains('zone'))markOverflow(e.target);else if(e.target.classList?.contains('pickrow'))markPicks(e.target)},{capture:true,passive:true});
const PICKROW={modal:null};
