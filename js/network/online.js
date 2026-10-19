/* ---------- online play: two devices share one game through shared storage ---------- */
// The player whose turn it is runs the rules on their device and saves the game after
// every move. The other device checks every 1.4 seconds and shows the new state.
// Choices the waiting player must make (blocks, shield triggers, targets) are sent as
// a request; their device asks them and writes back the answer.
const RK=(code,part)=>`scroom:${code}:${part}`;
const hasStore=()=>true;
// ---- relay link (used outside Claude) ----
// Both devices connect to a free public MQTT relay server over a normal secure web
// connection (the same kind web pages use), so it works on almost any network.
// Each key is saved as a "retained" message on the room's topic, so the relay
// remembers the latest value and both devices see the same data.
const NET={map:{},client:null,code:null,status:'',url:null};
const BROKERS=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt'];
const MQ_SRC=['https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js','https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js','https://unpkg.com/mqtt@4.3.7/dist/mqtt.min.js'];
const TOP='shieldclash/v1/';
const keyTopic=k=>TOP+k.split(':').join('/');
const topicKey=t=>t.slice(TOP.length).split('/').join(':');
let mqLib=null;
function loadMQTT(){
  if(window.mqtt&&window.mqtt.connect)return Promise.resolve(window.mqtt);
  if(mqLib)return mqLib;
  mqLib=new Promise((res,rej)=>{
    let i=0;
    const next=()=>{
      if(i>=MQ_SRC.length){mqLib=null;rej(new Error('lib'));return}
      const sc=document.createElement('script');sc.src=MQ_SRC[i++];sc.async=true;
      sc.onload=()=>window.mqtt&&window.mqtt.connect?res(window.mqtt):next();sc.onerror=()=>{sc.remove();next()};
      document.head.appendChild(sc);
    };
    next();
  });
  return mqLib;
}
function netStatus(t){if(NET.status===t)return;NET.status=t;if(G&&G.mp)render()}
function mqConnect(url,code){
  return new Promise((res,rej)=>{
    let c;
    try{c=window.mqtt.connect(url,{clientId:'sc_'+Math.random().toString(36).slice(2,12),clean:true,connectTimeout:8000,reconnectPeriod:2000,keepalive:30})}catch(e){rej(e);return}
    const t=setTimeout(()=>{try{c.end(true)}catch(e){}rej(new Error('timeout'))},9000);
    attachClient(c); // listen before subscribing so saved room data that arrives right away isn't missed
    c.once('connect',()=>{
      clearTimeout(t);
      c.subscribe(TOP+'scroom/'+code+'/#',{qos:1},err=>err?rej(err):res(c));
    });
    c.on('error',()=>{});
  });
}
function attachClient(c){
  NET.client=c;
  c.on('message',(topic,payload)=>{
    if(NET.client!==c)return;
    const k=topicKey(topic),txt=payload&&payload.length?new TextDecoder().decode(payload):'';
    if(!txt)delete NET.map[k];else{try{NET.map[k]=JSON.parse(txt)}catch(e){}}
  });
  c.on('offline',()=>{if(MP)netStatus('Connection lost. Reconnecting…')});
  c.on('reconnect',()=>{if(MP)netStatus('Connection lost. Reconnecting…')});
  c.on('connect',()=>netStatus(''));
}
const waitFor=(f,ms)=>new Promise(r=>{const t0=Date.now();const k=()=>{if(f())r(true);else if(Date.now()-t0>ms)r(false);else setTimeout(k,100)};k()});
function netClose(){try{NET.client&&NET.client.end(true)}catch(e){}NET.client=null;NET.map={};NET.status=''}
// Host: connect to the first relay that answers, and make sure the room code is free there.
async function netHost(code){
  try{await loadMQTT()}catch(e){throw Object.assign(new Error('lib'),{why:'lib'})}
  netClose();NET.code=code;
  for(const url of BROKERS){
    let c;try{c=await mqConnect(url,code)}catch(e){continue}
    NET.url=url;
    await sleep(1200); // let the relay send any old data saved under this code
    const old=NET.map[RK(code,'lobby')];
    if(old&&!old.ended&&Date.now()-(old.t||0)<6*3600e3){netClose();throw Object.assign(new Error('taken'),{taken:true})}
    for(const part of ['state','left','lobby'])await sdel(RK(code,part));
    NET.map={};
    return true;
  }
  throw Object.assign(new Error('server'),{why:'server'});
}
// Guest: try each relay in the same order and use the one where the room exists.
async function netJoin(code){
  try{await loadMQTT()}catch(e){throw Object.assign(new Error('lib'),{why:'lib'})}
  netClose();NET.code=code;
  let reached=false;
  for(const url of BROKERS){
    let c;try{c=await mqConnect(url,code)}catch(e){continue}
    reached=true;NET.url=url;
    if(await waitFor(()=>NET.map[RK(code,'lobby')],3000))return true;
    netClose();
  }
  throw Object.assign(new Error(reached?'none':'server'),{why:reached?'none':'server'});
}
async function sget(k){
  if(!IN_CLAUDE)return k in NET.map?JSON.parse(JSON.stringify(NET.map[k])):null;
  try{const r=await window.storage.get(k,true);return r&&r.value?JSON.parse(r.value):null}catch(e){return null}
}
async function sset(k,v){
  if(!IN_CLAUDE){
    NET.map[k]=v;
    if(!NET.client)return false;
    return new Promise(res=>{try{NET.client.publish(keyTopic(k),JSON.stringify(v),{qos:1,retain:true},err=>res(!err))}catch(e){res(false)}});
  }
  try{return !!(await window.storage.set(k,JSON.stringify(v),true))}catch(e){return false}
}
async function sdel(k){
  if(!IN_CLAUDE){
    delete NET.map[k];
    if(NET.client)await new Promise(res=>{try{NET.client.publish(keyTopic(k),'',{qos:1,retain:true},()=>res())}catch(e){res()}});
    return;
  }
  try{await window.storage.delete(k,true)}catch(e){}
}

const cardBy=uid=>uid==null?null:(findCard(uid)?.c||null);
const ZONES=['deck','hand','mana','bz','sh','gy'];
const packCard=c=>{const o={i:c.id,u:c.uid};if(c.tapped)o.t=1;if(c.sick)o.s=1;if(c.boost)o.b=c.boost;if(c.tmp)o.m=c.tmp;if(c.tmpNext){o.n=c.tmpNext;o.ns=c.tmpNextSeat}if(c.under&&c.under.length)o.d=c.under.map(packCard);return o};
const unpackCard=o=>({...DEF[o.i],uid:o.u,tapped:!!o.t,sick:!!o.s,boost:o.b||0,...(o.m?{tmp:o.m}:{}),...(o.n?{tmpNext:o.n,tmpNextSeat:o.ns}:{}),under:(o.d||[]).map(unpackCard)});
function packPlayer(p){const q={seat:p.seat,name:p.name,deckName:p.deckName,charged:!!p.charged,castSpell:!!p.castSpell,brokeBy:p.brokeBy||[],mustAtkNext:p.mustAtkNext||null};ZONES.forEach(z=>q[z]=p[z].map(packCard));return q}
function unpackPlayer(q){const p={seat:q.seat,name:q.name,deckName:q.deckName,charged:!!q.charged,castSpell:!!q.castSpell,brokeBy:q.brokeBy||[],...(q.mustAtkNext?{mustAtkNext:q.mustAtkNext}:{})};ZONES.forEach(z=>p[z]=(q[z]||[]).map(unpackCard));return p}
function toWire(){
  const canon=G.p[0].seat===0?[G.p[0],G.p[1]]:[G.p[1],G.p[0]];
  return {seq:MP.seq,players:canon.map(packPlayer),turnSeat:G.p[G.turn].seat,turnNo:G.turnNo,
    log:G.log.slice(0,40),over:G.over,winnerSeat:G.over&&G.winner?G.winner.seat:null,req:G.req||null,needStart:!!G.needStart,left:G.left??null};
}
function fromWire(w){
  const pl=w.players.map(q=>({...unpackPlayer(q),remote:q.seat!==MP.seat,ai:false}));
  const keep=G&&G.mp?{modal:G.modal,targeting:G.targeting}:{modal:null,targeting:null};
  G={mp:true,shields:SHIELDS,p:[pl[MP.seat],pl[1-MP.seat]],turn:w.turnSeat===MP.seat?0:1,turnNo:w.turnNo,log:w.log,over:w.over,
    winner:w.winnerSeat==null?null:pl[w.winnerSeat],req:w.req,needStart:w.needStart,left:w.left,busy:false,fx:{},breaking:null,sel:null,...keep};
}
let pushT=null;
function mpPush(now){
  if(!MP||!G||!G.mp)return Promise.resolve();
  clearTimeout(pushT);
  if(now)return doPush();
  pushT=setTimeout(doPush,350);return Promise.resolve();
}
async function doPush(){
  clearTimeout(pushT);if(!MP)return;
  MP.seq++;MP.lastSeq=MP.seq;
  const ok=await sset(RK(MP.code,'state'),toWire());
  if(!ok&&MP){MP.retry=(MP.retry||0)+1;if(MP.retry<6)setTimeout(()=>mpPush(true),1500)}else if(MP)MP.retry=0;
}
async function remoteDecide(p,kind,payload){
  const id=Math.random().toString(36).slice(2,10);
  G.req={id,seat:p.seat,kind,payload};MP.waiting=true;render();await mpPush(true);
  try{
    for(let i=0;i<600&&MP&&G&&!G.over;i++){
      await sleep(1200);
      const a=await sget(RK(MP.code,'ans:'+id));
      if(a){await sdel(RK(MP.code,'ans:'+id));return a.v}
    }
    return null;
  }finally{if(G)G.req=null;if(MP)MP.waiting=false;if(G)render()}
}
async function mpRespond(req){
  MP.responding=true;let val=null;
  try{
    const pl=req.payload;
    if(req.kind==='block'){const b=await askBlock(cardBy(pl.att),pl.blockers.map(cardBy).filter(Boolean),pl.target==='player'?'player':cardBy(pl.target),!!pl.required);val=b?b.uid:null}
    else if(req.kind==='trig'){val=!!(await askTrig(cardBy(pl.s)))}
    else if(req.kind==='target'){const t=await pickTarget(pl.uids.map(cardBy).filter(Boolean),pl.msg,pl.required?null:'Skip');val=t?t.uid:null}
    else if(req.kind==='choice'){val=await ask(pl.title,pl.text,pl.opts)}
    if(MP)await sset(RK(MP.code,'ans:'+req.id),{v:val});
    if(MP)MP.answered=req.id;
  }finally{if(MP)MP.responding=false;if(G)render()}
}
async function mpPoll(){
  if(!MP)return;
  try{
    if(G&&G.mp&&!G.over){
      const lf=await sget(RK(MP.code,'left'));
      if(lf!=null&&lf!==MP.seat){G.over=true;G.left=lf;G.winner=G.p[0];G.modal=null;G.targeting=null;render();return}
    }
    if(MP.responding||MP.waiting)return;
    if(G&&G.mp&&G.turn===0&&!G.over&&!G.needStart)return;
    const w=await sget(RK(MP.code,'state'));
    if(!w||w.seq<=MP.lastSeq)return;
    MP.lastSeq=w.seq;MP.seq=Math.max(MP.seq,w.seq);
    if(!G||!G.mp)$('#layer').innerHTML='';
    MP.applying=true;fromWire(w);render();MP.applying=false;
    if(G.req&&G.req.seat===MP.seat&&MP.answered!==G.req.id&&!G.over)mpRespond(G.req);
    else if(G.turn===0&&G.needStart&&!G.over)startTurn(0);
  }finally{if(MP){clearTimeout(MP.timer);MP.timer=setTimeout(mpPoll,1400)}}
}
async function mpLeave(quiet){
  if(MP){
    clearTimeout(MP.timer);clearTimeout(MP.lobbyT);
    const code=MP.code,seat=MP.seat,inGame=G&&G.mp&&!G.over;
    MP=null;
    if(inGame)await sset(RK(code,'left'),seat);
    if(!IN_CLAUDE){if(seat===0)await sset(RK(code,'lobby'),{ended:true,t:Date.now()});setTimeout(netClose,600)}
  }
  G=null;VIEW=0;showStart();
}
function deckOptions(){
  const o=[`<option value="random">Random optimal deck</option>`];
  PRESETS.forEach((p,i)=>o.push(`<option value="p${i}">${p.n} (${p.civ.map(e=>CIV[e].n).join(', ')})</option>`));
  (MYDECKS||[]).filter(d=>legal(deckTotal(d.counts))).forEach(d=>o.push(`<option value="d${esc(d.id)}">${esc(d.name)} (your deck)</option>`));
  return o.join('');
}
function pickedDeck(v){
  if(v[0]==='p'){const pr=PRESETS[+v.slice(1)];return {n:pr.n,ids:presetIds(pr.civ)}}
  if(v[0]==='d'){const d=MYDECKS.find(x=>x.id===v.slice(1));if(d)return {n:d.name,ids:expand(d.counts)}}
  const d=smartDeck();return {n:d.n,ids:d.ids};
}
async function showOnline(msg,deckVal){
  G=null;$('#app').innerHTML='';
  await loadDecks();
  const nm=(window._mpName||'');
  $('#layer').innerHTML=`<div class="overlay" id="online"><div class="dialog">
    <h2>Play with a friend</h2>
    <p class="rules">You and your friend both open this game on your own devices. One of you creates a room and shares the 4-letter code. The other joins with it.</p>
    <label class="fld"><span>Your name</span><input id="mpname" maxlength="16" value="${esc(nm)}" placeholder="e.g. TJ"></label>
    <label class="fld"><span>Your deck</span><select id="mpdeck">${deckOptions()}</select></label>
    <div class="opts"><button class="main" data-act="mphost" ${hasStore()?'':'disabled'}>Create a room</button></div>
    <div class="joinrow"><label class="fld"><span>Or join a room</span><input id="mpcode" maxlength="4" placeholder="CODE" autocapitalize="characters" autocomplete="off"></label><button data-act="mpjoin" ${hasStore()?'':'disabled'}>Join</button></div>
    ${msg?`<p class="err">${msg}</p>`:''}
    <p class="hint">${IN_CLAUDE?"Room data, including names, decks, and moves, goes into shared storage that other users of this game could read. Don't use anything private as your name."
      :'Moves are passed between your devices through a free public relay server. Anyone who knew your room code could watch the game, so keep names simple.'}</p>
    <div class="opts"><button data-act="back">Back</button></div>
  </div></div>`;
  const sel=document.getElementById('mpdeck');
  if(sel){const want=deckVal||window._mpDeck;if(want&&[...sel.options].some(o=>o.value===want))sel.value=want}
}
function joinError(e,code){
  const why=e&&e.why;
  if(why==='none')return `No room found with the code ${code}. Check the code with your friend. If they closed the room screen, they'll need to create a new room.`;
  if(why==='server')return "Couldn't reach any of the free relay servers. Check your internet connection and try again in a minute.";
  if(why==='lib')return "Couldn't load the connection library. Check your internet connection, or turn off any content blocker for this site.";
  return "Couldn't connect to that room. Try again.";
}
function readForm(){
  const name=(document.getElementById('mpname').value||'').trim().slice(0,16)||'Player';
  window._mpName=name;window._mpDeck=document.getElementById('mpdeck').value;
  return {name,deck:pickedDeck(document.getElementById('mpdeck').value)};
}
function lobbyScreen(title,body){
  $('#layer').innerHTML=`<div class="overlay" id="online"><div class="dialog"><h2>${title}</h2>${body}<div class="opts"><button data-act="mpcancel">Cancel</button></div></div></div>`;
}
async function mpHost(){
  const {name,deck}=readForm();
  const L='ABCDEFGHJKMNPQRSTUVWXYZ';
  let code=Array.from({length:4},()=>L[Math.floor(Math.random()*L.length)]).join('');
  if(!IN_CLAUDE){
    lobbyScreen('Creating room…','<p class="hint">Setting up the connection.</p>');
    let ok=false;
    for(let t=0;t<4&&!ok;t++){
      try{await netHost(code);ok=true}catch(e){if(e&&e.taken)code=Array.from({length:4},()=>L[Math.floor(Math.random()*L.length)]).join('');else break}
    }
    if(!ok){netClose();showOnline("Couldn't reach any of the free relay servers. Check your internet connection and try again in a minute.");return}
  }
  const ok=await sset(RK(code,'lobby'),{host:{name,deck},guest:null,t:Date.now()});
  if(!ok){showOnline('Could not create a room. Check your connection and try again.');return}
  MP={code,seat:0,seq:0,lastSeq:0};VIEW=0;
  lobbyScreen('Room created',`<p>Send this code to your friend:</p><p class="code">${code}</p><p class="hint">Waiting for them to join… You'll go first.</p>${IN_CLAUDE?'':'<p class="hint">Keep this screen open until they join.</p>'}`);
  const wait=async()=>{
    if(!MP||MP.code!==code)return;
    const lob=await sget(RK(code,'lobby'));
    if(lob&&lob.guest){
      $('#layer').innerHTML='';
      const me=mkPlayer(name,false,deck,SHIELDS,0),them=mkPlayer(lob.guest.name,false,lob.guest.deck,SHIELDS,1);
      them.remote=true;
      G={mp:true,shields:SHIELDS,p:[me,them],turn:0,turnNo:0,log:[],sel:null,busy:false,targeting:null,modal:null,over:false,fx:{},breaking:null,req:null};
      log(`${esc(name)} (${esc(deck.n)}) vs ${esc(lob.guest.name)} (${esc(lob.guest.deck.n)}). Each side has ${SHIELDS} shields. ${esc(name)} goes first and skips the first draw.`);
      await sset(RK(code,'lobby'),{...lob,started:true});
      startTurn(0);
      MP.timer=setTimeout(mpPoll,1400);
      return;
    }
    MP.lobbyT=setTimeout(wait,1500);
  };
  wait();
}
async function mpJoin(){
  const code=(document.getElementById('mpcode').value||'').trim().toUpperCase();
  if(!/^[A-Z]{4}$/.test(code)){showOnline('Enter the 4-letter room code.');return}
  const {name,deck}=readForm();
  if(!IN_CLAUDE){
    lobbyScreen(`Joining ${code}…`,'<p class="hint">Connecting to your friend\'s device.</p>');
    try{await netJoin(code)}catch(e){netClose();showOnline(joinError(e,code));return}
  }
  const lob=await sget(RK(code,'lobby'));
  if(!lob){netClose();showOnline(`No room found with the code ${code}.`);return}
  if(lob.guest){netClose();showOnline('That room already has two players.');return}
  const ok=await sset(RK(code,'lobby'),{...lob,guest:{name,deck}});
  if(!ok){showOnline('Could not join the room. Check your connection and try again.');return}
  MP={code,seat:1,seq:0,lastSeq:0};VIEW=1;
  lobbyScreen(`Joined room ${code}`,`<p>You're playing against ${esc(lob.host.name)}.</p><p class="hint">Waiting for the game to start…</p>`);
  MP.timer=setTimeout(mpPoll,1000);
}
