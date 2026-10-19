const LOGO=`<svg class="emblem" viewBox="0 0 100 110" aria-hidden="true">
  <defs>
    <clipPath id="sc-shield"><path d="M50 5 L91 18 L87 61 C83 83 68 97 50 105 C32 97 17 83 13 61 L9 18 Z"/></clipPath>
  </defs>
  <g clip-path="url(#sc-shield)">
    <rect width="100" height="110" fill="#185FA5"/>
    <path d="M0 0 L50 0 L44 30 L57 46 L42 64 L55 80 L47 110 L0 110 Z" fill="#A32D2D"/>
    <path d="M0 0 L50 0 L44 30 L20 40 L0 34 Z" fill="#C8463F" opacity=".55"/>
    <path d="M100 0 L50 0 L57 46 L82 50 L100 40 Z" fill="#2E78C0" opacity=".55"/>
  </g>
  <path d="M50 14 L82 24 L79 60 C76 77 65 88 50 95 C35 88 24 77 21 60 L18 24 Z" fill="none" stroke="#FCEBEB" stroke-opacity=".55" stroke-width="2"/>
  <path d="M50 6 L44 30 L57 46 L42 64 L55 80 L48 104" fill="none" stroke="#FAC775" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M50 6 L44 30 L57 46 L42 64 L55 80 L48 104" fill="none" stroke="#FFF6E0" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M50 46 L54 41 L56 47 L63 46 L58 51 L62 57 L55 55 L52 62 L49 55 L42 57 L46 51 L41 46 L48 47 Z" fill="#FAC775" stroke="#FFF6E0" stroke-width="1"/>
  <path d="M50 5 L91 18 L87 61 C83 83 68 97 50 105 C32 97 17 83 13 61 L9 18 Z" fill="none" stroke="#1a2128" stroke-width="4" stroke-linejoin="round"/>
</svg>`;
let MP=null;
let PLAYMODE='cpu';
(async()=>{try{const r=await window.storage.get('shieldclash-mode',false);if(r&&r.value==='friend'){PLAYMODE='friend';renderModeSw()}}catch(e){}})();
function renderModeSw(){
  const el=document.getElementById('modesw');if(!el)return;
  el.innerHTML=`<span><b>Play against</b></span><div class="seg" role="group" aria-label="Play against">
    <button data-act="setmode" data-v="cpu" class="${PLAYMODE==='cpu'?'main':''}" aria-pressed="${PLAYMODE==='cpu'}">Computer</button>
    <button data-act="setmode" data-v="friend" class="${PLAYMODE==='friend'?'main':''}" aria-pressed="${PLAYMODE==='friend'}">Friend</button></div>
    <span class="hint">${PLAYMODE==='friend'?'Pick your deck below, then create a room or join one with a code.':'Pick a deck below to start a duel.'}</span>`;
  const st=document.getElementById('start');if(st)st.classList.toggle('friendmode',PLAYMODE==='friend');
}
// Starting with a deck either begins a duel against the computer or opens the room screen
function playWith(deckVal,deck){if(PLAYMODE==='friend')showOnline(null,deckVal);else startGame(deck())}
function renderMyDecks(){
  const el=document.getElementById('mydecks');if(!el||!MYDECKS)return;
  if(!MYDECKS.length){el.innerHTML='';return}
  el.innerHTML=`<p><b>Your decks</b></p><div class="decks">${[...MYDECKS].sort((a,b)=>(b.updated||0)-(a.updated||0)).map(d=>{
    const tot=deckTotal(d.counts),civs=[...new Set(Object.keys(d.counts).filter(k=>DEF[k]).flatMap(k=>civsOf(DEF[k])))];
    const ready=legal(tot);
    const btns=PENDING_DEL===d.id
      ?`<span class="hint">Delete this deck?</span><button data-act="ddelyes" data-v="${d.id}">Delete</button><button data-act="ddelno" data-v="${d.id}">Keep</button>`
      :`${ready?`<button class="main" data-act="dplay" data-v="${d.id}">Play</button>`:''}<button data-act="dedit" data-v="${d.id}">Edit</button><button data-act="ddel" data-v="${d.id}" aria-label="Delete ${esc(d.name)}">Delete</button>`;
    return `<div class="mydeck"><span class="dots">${civs.map(e=>`<span style="--el:${CIV[e].c}"></span>`).join('')}</span>
      <b>${esc(d.name)}</b><small>${ready?`${tot} cards, ready to play.`:`${tot} cards. Needs at least ${DECK_MIN} to play.`}${civs.length?` ${civs.map(e=>CIV[e].n).join(', ')}.`:''}</small>
      <div class="mdb">${btns}</div></div>`}).join('')}</div>`;
}
function showStart(){
  G=null;$('#app').innerHTML='';
  $('#layer').innerHTML=`<div class="overlay" id="start"><div class="dialog">
    <div class="logo">${LOGO}<h1>Shield Clash</h1></div>
    <div class="howto"><button class="main" data-act="tut">How to play</button>${soundBtn()}<span class="hint">${DEFS.length} cards available for duels</span></div>
    <div class="howto modesw" id="modesw"></div>

    <div id="mydecks"></div>
    <p><b class="pickh">Pick a deck</b></p>
    <div class="decks">${PRESETS.map((d,i)=>`<button class="deck" data-act="preset" data-v="${i}">
      <span class="dots">${d.civ.map(e=>`<span style="--el:${CIV[e].c}"></span>`).join('')}</span>
      <b>${d.n}</b><small>${CIV[d.civ[0]].n} and ${CIV[d.civ[1]].n}. ${d.d}</small></button>`).join('')}
      <button class="deck" data-act="random"><span class="dots"><span style="--el:#A32D2D"></span><span style="--el:#185FA5"></span><span style="--el:#3B6D11"></span><span style="--el:#854F0B"></span><span style="--el:#3C3489"></span></span><b>Random optimal deck</b><small>A strong mix of all five civilizations, built fresh every time.</small></button>
      <button class="deck" data-act="builder"><b>Build a new deck</b><small>Choose 50 to 60 cards. It saves automatically and shows up here.</small></button></div>
    <p class="credit">Made by Tejas Jadhav and Claude Opus 5.5</p>
  </div></div>`;
  PENDING_DEL=null;
  renderModeSw();
  loadDecks().then(renderMyDecks);
}
