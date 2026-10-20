/* ---------- browser history ---------- */
// The browser's Back button moves back through the app instead of leaving it. The start page
// is the bottom. A screen opened from it (deck builder, tutorial, a game, a friend's room) is
// one entry above it, and an overlay on top (the zoom view, the builder's filters or menu) one
// more. Back closes the overlay first, then returns to the start page. A game in progress asks
// first, as its own Back button does.
// The app's own Back and close buttons move the history the same way, so the two always agree.
const NAV={screen:null,depth:0,ignore:0,popping:false};
history.replaceState({sc:'start'},'');
// A screen is being shown.
function navTo(sc){
  const prev=NAV.screen;NAV.screen=sc;
  if(NAV.popping||prev===sc)return;
  if(sc==='start'){if(NAV.depth>0){NAV.ignore++;history.go(-NAV.depth);NAV.depth=0}return}
  if(!prev||prev==='start'){history.pushState({sc},'');NAV.depth=1}
  else history.replaceState({sc},'');
}
// An overlay opened, or closed by the app itself.
function navOpen(ov){if(NAV.popping)return;history.pushState({sc:NAV.screen,ov},'');NAV.depth++}
function navClose(ov){
  if(NAV.popping||!history.state||history.state.ov!==ov)return;
  NAV.ignore++;NAV.depth--;history.back();
}
window.addEventListener('popstate',()=>{
  if(NAV.ignore>0){NAV.ignore--;return}
  NAV.depth=Math.max(0,NAV.depth-1);
  NAV.popping=true;
  try{
    if(SHARE){SHARE=null;renderShare();return}
    if(ZOOM){closeZoom();return}
    if(BUILD.sheet||BUILD.menu){BUILD.sheet=false;BUILD.menu=false;renderBuilder();return}
    if(G&&!G.over){
      // Stay in the game, and ask whether to leave it.
      history.pushState({sc:'game'},'');NAV.depth++;
      NAV.popping=false;onAct('gback');
      return;
    }
    if(NAV.screen==='online'){NAV.popping=false;NAV.screen='start';onAct('mpcancel');return}
    if(NAV.screen&&NAV.screen!=='start')showStart();
  }finally{NAV.popping=false}
});
