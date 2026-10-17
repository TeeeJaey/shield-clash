/* ---------- player prompts ---------- */
function pickTarget(tg,msg,skip){
  return new Promise(res=>{G.targeting={uids:new Set(tg.map(c=>c.uid)),resolve:res,msg,skip};render()});
}
function ask(title,text,opts,card){
  return new Promise(res=>{G.modal={title,text,opts,resolve:res,card};render()});
}
function askBlock(att,blockers,target){
  const what=target==='player'?(G.p[0].sh.length?'your shields':'you directly'):target.n;
  const extra=[att.pa?`power ${atkPow(att)} while attacking`:'',att.br?['','','double breaker','triple breaker'][att.br]:''].filter(Boolean).join(', ');
  return ask('Block?',`${att.n} (${att.p}${extra?', '+extra:''}) is attacking ${what}.`,
    [...blockers.map(b=>({label:`Block with ${b.n} (${b.p})`,val:b})),{label:"Don't block",val:null}],att);
}
function askTrig(s){
  return ask('Shield trigger!',`${s.n} came from your shield. ${fxDesc(s.fx)}`,
    [{label:'Cast it for free',val:true,main:1},{label:'Keep it in hand',val:false}],s);
}

/* ---------- input ---------- */
function findCard(uid){
  if(!G)return null;
  for(const p of G.p)for(const z of ['hand','bz']){const c=p[z].find(x=>x.uid===uid);if(c)return{p,z,c}}
  return null;
}
const selCard=()=>G&&G.sel?findCard(G.sel.uid)?.c:null;
async function act(fn){G.busy=true;G.sel=null;render();try{await fn()}finally{G.busy=false;render()}}
function onCard(uid){
  if(!G||G.over||G.modal)return;
  if(G.targeting){
    if(G.targeting.uids.has(uid)){const r=G.targeting.resolve;const t=findCard(uid).c;G.targeting=null;r(t)}
    return;
  }
  const f=findCard(uid);if(!f)return;
  if(G.turn!==0||G.busy){openZoom(f.c);return}
  const me=G.p[0];
  if(f.p===me&&f.z==='hand')G.sel=G.sel?.uid===uid?null:{zone:'hand',uid};
  else if(f.p===me&&f.z==='bz'&&!f.c.tapped&&!f.c.sick)G.sel=G.sel?.uid===uid?null:{zone:'bz',uid};
  else if(f.p!==me&&f.z==='bz'&&f.c.tapped&&G.sel?.zone==='bz'){const a=selCard();act(()=>attack(me,a,f.c));return}
  else{G.sel=null;openZoom(f.c)}
  render();
}
function onAct(a,v){
  // menus and deck builder
  if(a==='preset'){const pr=PRESETS[+v];startGame({n:pr.n,ids:presetIds(pr.civ)});return}
  if(a==='builder'){showBuilder();return}
  if(a==='dedit'){showBuilder(v);return}
  if(a==='dplay'){const d=MYDECKS&&MYDECKS.find(x=>x.id===v);if(d&&legal(deckTotal(d.counts)))startGame({n:d.name,ids:expand(d.counts)});return}
  if(a==='ddel'){PENDING_DEL=v;renderMyDecks();return}
  if(a==='ddelno'){PENDING_DEL=null;renderMyDecks();return}
  if(a==='ddelyes'){MYDECKS=MYDECKS.filter(x=>x.id!==v);PENDING_DEL=null;storeDecks().then(renderMyDecks);return}
  if(a==='tut'){showTutorial(0);return}
  if(a==='tnext'){showTutorial(TUT+1);return}
  if(a==='tprev'){showTutorial(TUT-1);return}
  if(a==='tgo'){showTutorial(+v);return}
  if(a==='tclose'){showStart();return}
  if(a==='random'){startGame(smartDeck());return}
  if(a==='brandom'){const d=smartDeck();if(d.counts){BUILD.counts={...d.counts};BUILD.msg=`${d.n}: a fresh mixed deck. Tweak it or start the duel.`}renderBuilder();autoSave();return}
  if(a==='new'||a==='back'){showStart();return}
  if(a==='menu'&&G&&!G.over&&G.turn===0&&!G.busy&&!G.modal&&!G.targeting){
    G.sel=null;
    ask('Game menu','Restarting deals a fresh game with the same two decks. Your current game will be lost.',
      [{label:'Keep playing',val:null,main:1},{label:'Restart this game',val:'restart'},{label:'Back to start page',val:'start'}])
    .then(v=>{if(v==='restart')startGame(...G.decks);else if(v==='start')showStart()});
    return}
  if(a==='bplus'){if(total()<DECK_MAX&&(BUILD.counts[v]||0)<MAX_COPY)BUILD.counts[v]=(BUILD.counts[v]||0)+1;BUILD.msg='';renderBuilder();autoSave();return}
  if(a==='bminus'){if(BUILD.counts[v])BUILD.counts[v]--;BUILD.msg='';renderBuilder();autoSave();return}
  if(a==='bfilter'){BUILD.filter=v;renderBuilder();window.scrollTo(0,0);return}
  if(a==='bclear'){BUILD.counts={};BUILD.msg='';renderBuilder();autoSave();return}
  if(a==='bfill'){fillDeck();renderBuilder();autoSave();return}
  if(a==='bsave'){saveDeck(true);return}
  if(a==='bstart'&&legal(total())){const ids=expand(BUILD.counts),n=(BUILD.name||'').trim()||'Your deck';saveDeck().then(()=>startGame({n,ids}));return}
  if(!G)return;
  // in game
  if(a==='ans'&&G.modal){const m=G.modal;G.modal=null;render();m.resolve(m.opts[+v].val);return}
  if(a==='skip'&&G.targeting){const r=G.targeting.resolve;G.targeting=null;r(null);return}
  if(G.turn!==0||G.busy||G.over)return;
  const me=G.p[0],s=selCard();
  if(a==='charge'&&s&&!me.charged){me.hand.splice(me.hand.indexOf(s),1);s.tapped=false;me.mana.push(s);me.charged=true;G.sel=null;log(`You charge ${s.n} as mana.`);render()}
  else if(a==='play'&&s)act(()=>playCard(me,s));
  else if(a==='atkp'&&s&&!s.noP)act(()=>attack(me,s,'player'));
  else if(a==='cancel'){G.sel=null;render()}
  else if(a==='view'&&s)openZoom(s);
  else if(a==='end'){G.sel=null;startTurn(1)}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(b){if(!b.disabled)onAct(b.dataset.act,b.dataset.v);return}
  const c=e.target.closest('[data-uid]');if(c)onCard(+c.dataset.uid);
});
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-uid]')){e.preventDefault();onCard(+e.target.dataset.uid)}
  else if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-def]')){e.preventDefault();openZoom(DEF[e.target.dataset.def])}
});
