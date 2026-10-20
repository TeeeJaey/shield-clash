/* ---------- saved game ---------- */
// A game against the computer is saved whenever it's your move with nothing resolving, so a
// reload (or a phone dropping the tab) brings it back to that point. Players and cards referred
// to from outside their zone (an "at the end of the turn" effect's player and source) are stored
// as references and linked up again on load, so they stay the same objects.
const GAME_KEY='shieldclash-game',GAME_ZONES=['deck','hand','mana','bz','sh','gy'];
let gameSaved='';
function packGame(){
  const home=new Map();
  G.p.forEach((p,i)=>{home.set(p,[G.p,{$p:i}]);for(const z of GAME_ZONES)for(const c of p[z])home.set(c,[p[z],{$c:c.uid}])});
  return JSON.stringify({v:1,g:{...G,fx:{},sel:null}},function(k,v){const h=v&&typeof v==='object'&&home.get(v);return h&&h[0]!==this?h[1]:v});
}
function unpackGame(txt){
  const d=JSON.parse(txt);if(!d||d.v!==1||!d.g||!Array.isArray(d.g.p))return null;
  const g=d.g,byUid=new Map();
  for(const p of g.p)for(const z of GAME_ZONES)for(const c of p[z])byUid.set(c.uid,c);
  const link=o=>{
    if(!o||typeof o!=='object')return o;
    if('$p' in o)return g.p[o.$p];
    if('$c' in o)return byUid.get(o.$c)||null;
    if(typeof o.uid==='number')usedUids.add(o.uid);
    for(const k of Object.keys(o))o[k]=link(o[k]);
    return o;
  };
  return link(g);
}
// Called on every redraw; writes only at a resting point, and only when something changed.
function saveGame(){
  if(!G||G.mp||SIM)return;
  if(G.over){if(gameSaved)clearGame();return}
  if(G.turn!==0||G.busy||G.starting||G.targeting||G.modal||G.attacking)return;
  let s;try{s=packGame()}catch(e){return}
  if(s===gameSaved)return;
  gameSaved=s;
  Promise.resolve().then(()=>window.storage.set(GAME_KEY,s,false)).catch(()=>{});
}
function clearGame(){gameSaved='';Promise.resolve().then(()=>window.storage.delete(GAME_KEY,false)).catch(()=>{})}
// On load: back into the saved game, if there is one. Resolves to whether it did.
async function resumeGame(){
  let txt=null;
  try{const r=await window.storage.get(GAME_KEY,false);txt=r&&r.value}catch(e){}
  if(!txt)return false;
  let g=null;try{g=unpackGame(txt)}catch(e){}
  if(!g||g.over){clearGame();return false}
  MP=null;VIEW=0;
  navTo('game');
  $('#layer').innerHTML='';
  G=g;gameSaved=txt;
  render();
  return true;
}
