/* ---------- core rules ---------- */
function draw(p,n){for(let i=0;i<n;i++)if(p.deck.length)p.hand.push(p.deck.pop())}
function canPay(p,c){const u=p.mana.filter(m=>!m.tapped);return u.length>=c.cost&&u.some(m=>m.e===c.e)}
const bases=(p,c)=>c.evo?p.bz.filter(x=>x.race===c.evo):[];
const canPlay=(p,c)=>canPay(p,c)&&(!c.evo||bases(p,c).length>0);
function pay(p,c){
  const u=p.mana.filter(m=>!m.tapped);
  u.find(m=>m.e===c.e).tapped=true;
  let need=c.cost-1;
  for(const m of u.filter(m=>!m.tapped&&m.e!==c.e)){if(need<=0)break;m.tapped=true;need--}
  for(const m of u.filter(m=>!m.tapped)){if(need<=0)break;m.tapped=true;need--}
}
function reset(c){c.tapped=false;c.sick=true}
function leaveBz(p,c){const i=p.bz.indexOf(c);if(i<0)return null;p.bz.splice(i,1);const pile=[c,...c.under];c.under=[];pile.forEach(reset);return pile}
function destroy(p,c){
  const pile=leaveBz(p,c);if(!pile)return;
  p.gy.push(...pile);log(`${c.n} is destroyed.`);
  for(const f of fxList(c.onDie))if(!targetsFor(f,p))simpleFx(p,f,c);
}
function targetsFor(f,p){
  const o=opp(p),m=/^burn(\d+)$/.exec(f);
  if(m)return o.bz.filter(c=>c.p<=+m[1]);
  if(f==='bounce'||f==='kill')return o.bz.slice();
  if(f==='killTapped')return o.bz.filter(c=>c.tapped);
  if(f==='tapone')return o.bz.filter(c=>!c.tapped);
  return null;
}
const whose=o=>o.ai?"the opponent's":'your';
function simpleFx(p,f,src){
  const o=opp(p),sw=/^sweep(\d+)$/.exec(f);
  if(sw){const hit=o.bz.filter(c=>c.p<=+sw[1]);if(!hit.length)log(`${src.n} hits nothing.`);hit.forEach(c=>destroy(o,c));return}
  if(f==='draw'||f==='draw2'||f==='draw3'){const n=f==='draw'?1:+f.slice(4);draw(p,n);log(`${p.ai?'Opponent draws':'You draw'} ${n===1?'a card':n+' cards'}.`)}
  else if(f==='ramp'||f==='ramp2'){const n=f==='ramp'?1:2;for(let i=0;i<n&&p.deck.length;i++){const c=p.deck.pop();c.tapped=true;p.mana.push(c);log(`${c.n} goes to ${whose(p)} mana zone.`)}}
  else if(f==='tapall'){o.bz.forEach(c=>c.tapped=true);log(`All of ${whose(o)} creatures are tapped.`)}
  else if(f==='discard'||f==='discard2'){const n=f==='discard'?1:2;for(let i=0;i<n&&o.hand.length;i++){const c=o.hand.splice(Math.floor(Math.random()*o.hand.length),1)[0];o.gy.push(c);log(`${o.ai?'Opponent discards':'You discard'} ${c.n}.`)}}
  else if(f==='shieldadd'||f==='shield2'){const n=f==='shieldadd'?1:2;let k=0;for(;k<n&&p.deck.length;k++)p.sh.push(p.deck.pop());if(k)log(`${p.ai?'Opponent adds':'You add'} ${k===1?'a shield':k+' shields'}.`)}
  else if(f==='recover'){const c=p.gy.filter(x=>x.t==='c').sort((a,b)=>b.cost-a.cost)[0];if(c){p.gy.splice(p.gy.indexOf(c),1);p.hand.push(c);log(`${c.n} returns from ${whose(p)} graveyard to hand.`)}else log('No creature in the graveyard to return.')}
  else if(f==='manaburn'){if(o.mana.length){const c=o.mana.splice(Math.floor(Math.random()*o.mana.length),1)[0];c.tapped=false;o.gy.push(c);log(`${c.n} is knocked out of ${whose(o)} mana zone.`)}}
}
async function resolveFx(p,fx,src){
  for(const f of fxList(fx)){
    if(G.over)return;
    const o=opp(p),tg=targetsFor(f,p);
    if(tg){
      if(!tg.length){log(`${src.n}: no target.`);continue}
      const t=p.ai?tg.sort((a,b)=>b.p-a.p)[0]:await pickTarget(tg,`${src.n}: choose an enemy creature. ${fxText(f)}`,'Skip');
      if(!t){log(`${src.n}: effect skipped.`);continue}
      if(f==='bounce'){const pile=leaveBz(o,t);o.hand.push(...pile);log(`${t.n} returns to ${whose(o)} hand.`)}
      else if(f==='tapone'){t.tapped=true;log(`${t.n} is tapped.`)}
      else{anim(t,'die');render();await sleep(450);destroy(o,t)}
    }else simpleFx(p,f,src);
    render();
  }
}
async function playCard(p,c){
  if(!canPlay(p,c))return;
  let base=null;
  if(c.evo){
    const b=bases(p,c);
    base=b.length===1?b[0]:p.ai?b.sort((x,y)=>(y.sick-x.sick)||(x.p-y.p))[0]:await pickTarget(b,`Choose which ${c.evo} becomes ${c.n}.`,'Cancel');
    if(!base)return;
  }
  pay(p,c);p.hand.splice(p.hand.indexOf(c),1);
  if(c.t==='s'){
    log(`${p.ai?'Opponent casts':'You cast'} ${c.n}.`);render();
    await resolveFx(p,c.fx,c);p.gy.push(c);
  }else if(base){
    const i=p.bz.indexOf(base);
    c.under=[base,...base.under];base.under=[];
    c.tapped=base.tapped;c.sick=false;p.bz.splice(i,1,c);anim(c,'enter');
    log(`${base.n} evolves into ${c.n}!`);render();
    if(c.onSum)await resolveFx(p,c.onSum,c);
  }else{
    c.tapped=false;c.sick=!c.speed;p.bz.push(c);anim(c,'enter');
    log(`${p.ai?'Opponent summons':'You summon'} ${c.n}.`);render();
    if(c.onSum)await resolveFx(p,c.onSum,c);
  }
  render();
}
async function battle(ap,a,dp,d){
  const pa=atkPow(a);
  log(`${a.n} (${pa}) battles ${d.n} (${d.p}).`);
  let aDies=pa<=d.p,dDies=d.p<=pa;
  if(a.slayer)dDies=true;if(d.slayer)aDies=true;
  anim(d,'hit');render();await sleep(380);
  if(dDies)anim(d,'die');if(aDies)anim(a,'die');
  if(dDies||aDies){render();await sleep(450)}
  if(dDies)destroy(dp,d);if(aDies)destroy(ap,a);
  render();
}
async function attack(p,att,target){
  const o=opp(p);att.tapped=true;
  anim(att,p.ai?'down':'up');
  const what=target==='player'?(o.sh.length?`${whose(o)} shields`:(o.ai?'the opponent':'you')+' directly'):target.n;
  log(`${att.n} attacks ${what}.`);render();await sleep(450);
  if(att.onAtk){
    await resolveFx(p,att.onAtk,att);
    if(G.over||!p.bz.includes(att))return;
    if(target!=='player'&&!o.bz.includes(target)){log(`${att.n}'s target is gone.`);return}
  }
  if(!att.unbl){
    const blockers=o.bz.filter(c=>c.block&&!c.tapped);
    if(blockers.length){
      const b=o.ai?aiBlock(o,att,blockers,target):await askBlock(att,blockers,target);
      if(b){b.tapped=true;log(`${b.n} blocks.`);await battle(p,att,o,b);return}
    }
  }
  if(target!=='player'){await battle(p,att,o,target);return}
  if(!o.sh.length){log(`${att.n} lands the final blow.`);win(p);return}
  const n=Math.min(att.br||1,o.sh.length),broken=[];
  G.breaking={p:o,n};render();await sleep(450);G.breaking=null;
  for(let i=0;i<n;i++){const s=o.sh.pop();o.hand.push(s);broken.push(s)}
  log(`${['','A shield breaks','Two shields break','Three shields break'][n]}.`);render();
  for(const s of broken){
    if(!s.trig||G.over)continue;
    const use=o.ai?aiUseTrig(o,s):await askTrig(s);
    if(use){
      o.hand.splice(o.hand.indexOf(s),1);
      log(`Shield trigger! ${o.ai?'Opponent casts':'You cast'} ${s.n}.`);render();
      await resolveFx(o,s.fx,s);o.gy.push(s);
    }
  }
  render();
}
function win(p){G.over=true;G.winner=p;G.targeting=null;G.modal=null;log(p.ai?'You lose.':'You win!');render()}

async function startTurn(i){
  if(G.over)return;
  G.turn=i;const p=G.p[i];
  p.mana.forEach(m=>m.tapped=false);
  p.bz.forEach(c=>{c.tapped=false;c.sick=false});
  p.charged=false;
  if(G.turnNo>0){
    if(!p.deck.length){log(`${p.ai?'Opponent has':'You have'} no cards left to draw.`);win(opp(p));return}
    draw(p,1);
  }
  G.turnNo++;
  log(`${p.ai?'Opponent':'Your'} turn ${Math.ceil(G.turnNo/2)} begins.`);
  render();
  if(p.ai){
    G.busy=true;render();
    await aiTurn(p);
    G.busy=false;
    if(!G.over)startTurn(0);
  }
}
