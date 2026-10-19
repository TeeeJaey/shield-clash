/* ---------- player prompts ---------- */
function pickTarget(tg,msg,skip){
  return new Promise(res=>{G.targeting={uids:new Set(tg.map(c=>c.uid)),resolve:res,msg,skip,required:skip===null};render()});
}
function ask(title,text,opts,card){
  return new Promise(res=>{G.modal={title,text,opts,resolve:res,card};render()});
}
function askBlock(att,blockers,target,required){
  const what=target==='player'?(G.p[0].sh.length?'your shields':'you directly'):target.n;
  const extra=[T(att).pa?`power ${atkPow(att)} while attacking`:'',breaks(att)>1?`breaks ${breaks(att)} shields`:''].filter(Boolean).join(', ');
  return ask(required?'You must block':'Block?',`${att.n} (${power(att)}${extra?', '+extra:''}) is attacking ${what}.${required?' Your creature blocks if able.':''}`,
    [...blockers.map(b=>({label:`Block with ${b.n} (${power(b)})`,val:b})),...(required?[]:[{label:"Don't block",val:null}])],att);
}
function askTrig(s){
  const creature=s.t==='c';
  return ask('Shield trigger!',`${s.n} came from your shield. ${creature?'You may summon it for no cost.':fxDesc(s.fx)}`,
    [{label:creature?'Summon it for free':'Cast it for free',val:true,main:1},{label:'Keep it in hand',val:false}],s);
}
