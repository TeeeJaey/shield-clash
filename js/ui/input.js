/* ---------- input ---------- */
const selCard=()=>G&&G.sel?findCard(G.sel.uid)?.c:null;
async function act(fn){G.busy=true;G.sel=null;render();try{await fn()}finally{G.busy=false;render()}}
function onCard(uid){
  if(!G||G.over||G.modal)return;
  if(G.targeting){
    if(G.targeting.uids.has(uid)){const r=G.targeting.resolve;const t=findCard(uid)?.c||shieldBy(uid);G.targeting=null;r(t)}
    return;
  }
  const f=findCard(uid);if(!f)return;
  // Every card answers a tap the same way: it's selected, and the bar shows what it can do,
  // always including View card. A card with nothing to do now is selected just to look at.
  // (Holding a card shows it large; a swipe up opens it, peek.js.)
  const look=()=>{G.sel=G.sel?.uid===uid?null:{zone:'look',uid};render()};
  if(G.turn!==0||G.busy){look();return}
  const me=G.p[0];
  G.notice='';
  if(f.p===me&&f.z==='hand')G.sel=G.sel?.uid===uid?null:{zone:'hand',uid};
  else if(f.p===me&&f.z==='bz'&&(canAttackAnything(f.c,me)||canTapAbility(f.c,me)))G.sel=G.sel?.uid===uid?null:{zone:'bz',uid};
  else if(f.p!==me&&f.z==='bz'&&G.sel?.zone==='bz'&&canAttackCreature(selCard(),me,f.c)){const a=selCard();act(()=>attack(me,a,f.c));return}
  else{look();return}
  render();
}
function onAct(a,v){
  // menus and deck builder
  if(a==='sound'){toggleSound();return}
  if(a==='fullscreen'){toggleFull();return}
  if(a==='pmore'){PROMPT.open=!PROMPT.open;render();return}
  if(a==='setmode'){PLAYMODE=v==='friend'?'friend':'cpu';renderModeSw();try{window.storage.set('shieldclash-mode',PLAYMODE,false)}catch(e){}return}
  if(a==='setai'){AI_PLANS=v!=='classic';renderModeSw();try{window.storage.set('shieldclash-ai',AI_PLANS?'plan':'classic',false)}catch(e){}return}
  if(a==='preset'){const pr=PRESETS[+v];playWith('p'+v,()=>({n:pr.n,ids:presetIds(pr.civ)}));return}
  if(a==='builder'){withLoader('Opening the deck builder',()=>showBuilder());return}
  if(a==='dedit'){withLoader('Opening the deck builder',()=>showBuilder(v));return}
  if(a==='dplay'){const d=MYDECKS&&MYDECKS.find(x=>x.id===v);if(d&&legal(deckTotal(d.counts)))playWith('d'+d.id,()=>({n:d.name,ids:expand(d.counts)}));return}
  if(a==='ddel'){PENDING_DEL=v;renderMyDecks();return}
  if(a==='ddelno'){PENDING_DEL=null;renderMyDecks();return}
  if(a==='ddelyes'){MYDECKS=MYDECKS.filter(x=>x.id!==v);PENDING_DEL=null;storeDecks().then(renderMyDecks);return}
  if(a==='tut'){showTutorial(0);return}
  if(a==='tnext'){showTutorial(TUT+1);return}
  if(a==='tprev'){showTutorial(TUT-1);return}
  if(a==='tgo'){showTutorial(+v);return}
  if(a==='tclose'){showStart();return}
  if(a==='random'){playWith('random',smartDeck);return}
  if(a==='bmenu'){BUILD.menu=!BUILD.menu;BUILD.menu?navOpen('menu'):navClose('menu');renderBuilder();return}
  // The filters and the deck are bottom drawers, one at a time: opening one replaces the other,
  // in the browser's history too, so Back still closes whichever is open.
  if(a==='bsheet'||a==='bcart'){
    const key=a==='bsheet'?'sheet':'cart',other=key==='sheet'?'cart':'sheet';
    if(BUILD[key]){BUILD[key]=false;navClose(key)}
    else if(BUILD[other]&&history.state?.ov===other){BUILD[other]=false;BUILD[key]=true;history.replaceState({sc:NAV.screen,ov:key},'')}
    else{BUILD[other]=false;BUILD[key]=true;navOpen(key)}
    renderBuilder();return}
  if(['brandom','bfill','bclear'].includes(a)&&BUILD.menu){BUILD.menu=false;navClose('menu')}
  // Export and import take over the menu's place in the history (see openShare).
  if((a==='bexport'||a==='bimport')&&BUILD.menu){BUILD.menu=false;renderBuilder()}
  if(a==='bexport'){if(total())openShare('export',BUILD.name,BUILD.counts);else{BUILD.msg='Add some cards before exporting.';renderBuilder()}return}
  if(a==='bimport'||a==='dimport'){openShare('import');return}
  if(a==='dexport'){const d=MYDECKS&&MYDECKS.find(x=>x.id===v);if(d)openShare('export',d.name,validCounts(d.counts));return}
  if(a==='brandom'){const d=smartDeck();if(d.counts){BUILD.counts={...d.counts};BUILD.msg=`${d.n}: a fresh mixed deck. Tweak it or start the duel.`}renderBuilder();autoSave();return}
  if(a==='new'||a==='back'){if(MP)mpLeave(true);else showStart();return}
  if(a==='online'){showOnline();return}
  if(a==='mphost'){mpHost();return}
  if(a==='mpjoin'){mpJoin();return}
  if(a==='mpcancel'){mpLeave(true);if(!IN_CLAUDE)netClose();return}
  // Back and Restart, from the board's corner. Both confirm first, since the game is lost.
  if(a==='gback'&&gameExitOpen()){
    G.sel=null;
    if(G.mp)ask('Leave the game?',`Leaving ends the game for both of you, and ${G.p[1].name} wins.`,
      [{label:'Keep playing',val:null,main:1},{label:'Leave game',val:'leave'}]).then(v=>{if(v==='leave')mpLeave()});
    else ask('Back to the start page?','Your current game will be lost.',
      [{label:'Keep playing',val:null,main:1},{label:'Back to start page',val:'start'}]).then(v=>{if(v==='start')showStart()});
    return}
  if(a==='grestart'&&gameExitOpen()&&!G.mp){
    G.sel=null;
    ask('Restart this game?','You get a fresh game with the same two decks. Your current game will be lost.',
      [{label:'Keep playing',val:null,main:1},{label:'Restart',val:'restart'}]).then(v=>{if(v==='restart')withLoader('Setting up the duel',()=>startGame(...G.decks))});
    return}
  if(a==='bplus'){const before=BUILD.counts[v]||0;if(DEF[v]?.playable&&DEF[v].duelId===v&&total()<DECK_MAX&&(BUILD.counts[v]||0)<MAX_COPY)BUILD.counts[v]=(BUILD.counts[v]||0)+1;BUILD.msg='';renderBuilder();if((BUILD.counts[v]||0)>before)cartLand(v);autoSave();return}
  if(a==='bminus'){if(BUILD.counts[v])BUILD.counts[v]--;BUILD.msg='';renderBuilder();autoSave();return}
  if(a==='bfilter'){BUILD.filter=v;renderBuilder();window.scrollTo(0,0);return}
  if(a==='bclear'){BUILD.counts={};BUILD.msg='';renderBuilder();autoSave();return}
  if(a==='bfill'){fillDeck();renderBuilder();autoSave();return}
  if(a==='bstart'&&legal(total())){const ids=expand(BUILD.counts),n=(BUILD.name||'').trim()||'Your deck';saveDeck().then(()=>{if(PLAYMODE==='friend'&&BUILD.id)showOnline(null,'d'+BUILD.id);else withLoader('Setting up the duel',()=>startGame({n,ids}))});return}
  if(!G)return;
  // in game
  if(a==='pile'){const [z,side]=String(v).split(':'),p=G.p[+side];if(p&&(z==='gy'||z==='mana'))openPile(`${side==='0'?'Your':G.mp?p.name+"'s":"Opponent's"} ${z==='gy'?'graveyard':'mana zone'}`,p[z]);return}
  // The multi-pick view: Pick toggles a card, Done answers with the cards picked.
  if(G.modal?.picks&&(a==='pkpick'||a==='pkdone')){
    const m=G.modal,s=m.picks;
    if(a==='pkpick'){const i=+v,at=s.sel.indexOf(i);if(at>=0)s.sel.splice(at,1);else if(s.sel.length<s.max)s.sel.push(i);render();return}
    if(s.sel.length<s.min)return;
    G.modal=null;render();m.resolve(s.sel.map(i=>s.cards[i]));return;
  }
  // The swap view: a pick in each row, then Swap (or Don't swap).
  if(G.modal?.swap&&(a==='swpick'||a==='swdo'||a==='swskip')){
    const m=G.modal,s=m.swap;
    if(a==='swpick'){const [k,i]=String(v).split(':').map(Number);s.sel[k]=s.sel[k]===i?null:i;render();return}
    const from=s.from.cards[s.sel[0]],to=s.to.cards[s.sel[1]];
    if(a==='swdo'&&!(from&&(to||!s.to.cards.length)))return;
    G.modal=null;render();m.resolve(a==='swdo'?[from,to||from]:null);return;
  }
  if(a==='ans'&&G.modal){const m=G.modal;G.modal=null;render();m.resolve(m.opts[+v].val);return}
  if(a==='skip'&&G.targeting&&!G.targeting.required){const r=G.targeting.resolve;G.targeting=null;r(null);return}
  // A card selected just to look at can be opened or put down at any time, even mid-turn.
  if(G.sel?.zone==='look'&&(a==='view'||a==='cancel')){const c=a==='view'&&selCard();if(c)openZoom(c,zoneNav(findCard(c.uid)));else{G.sel=null;render()}return}
  if(G.turn!==0||G.busy||G.over)return;
  const me=G.p[0],s=selCard();
  if(a==='charge'&&s&&!me.charged&&!me.played&&!me.attacked){me.hand.splice(me.hand.indexOf(s),1);toMana(me,[s]);me.charged=true;G.sel=null;log(`${V(me,'You charge','Opponent charges')} ${s.n} as mana.`);render()}
  else if(a==='play'&&s)act(()=>playCard(me,s));
  else if(a==='atkp'&&s&&canAttackPlayer(s,me))act(()=>attack(me,s,'player'));
  else if(a==='tapab'&&s&&canTapAbility(s,me))act(()=>useTapAbility(me,s,+v||0));
  else if(a==='cancel'){G.sel=null;render()}
  else if(a==='view'&&s)openZoom(s,zoneNav(findCard(s.uid)));
  else if(a==='end'){
    // "Attacks each turn if able" must be honoured before the turn can end.
    const must=mustAttackers(me);
    if(must.length){G.notice=`${must.map(c=>c.n).join(', ')} must attack this turn if able.`;G.sel={zone:'bz',uid:must[0].uid};render();return}
    G.sel=null;G.notice='';G.busy=true;render();
    endTurn(me).then(()=>{G.busy=false;if(!G.over)startTurn(nextPlayer(me));else render()});
  }
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(b){if(!b.disabled)onAct(b.dataset.act,b.dataset.v);return}
  const c=e.target.closest('[data-uid],[data-shield]');if(c)onCard(+(c.dataset.uid||c.dataset.shield));
});
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-uid],[data-shield]')){e.preventDefault();onCard(+(e.target.dataset.uid||e.target.dataset.shield))}
  else if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-def]')){e.preventDefault();zoomFrom(e.target)}
});
