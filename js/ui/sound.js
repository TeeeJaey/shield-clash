/* ---------- sound effects ---------- */
// Every sound is synthesized with Web Audio, so nothing is downloaded. Sounds follow the game
// log: each new line plays the sound for what happened, which works the same for the
// computer's moves and for an online opponent's (their log arrives with the game state).
const SND={on:true,ctx:null,out:null,seen:0,game:null};
(async()=>{try{const r=await window.storage.get('shieldclash-sound',false);if(r&&r.value==='off')SND.on=false}catch(e){}})();
function audio(){
  if(!SND.on)return null;
  if(!SND.ctx){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    const ctx=new AC(),out=ctx.createGain(),comp=ctx.createDynamicsCompressor();
    out.gain.value=.32;out.connect(comp);comp.connect(ctx.destination);
    SND.ctx=ctx;SND.out=out;
  }
  if(SND.ctx.state==='suspended')SND.ctx.resume();
  return SND.ctx;
}
// One oscillator note: frequency (optionally sliding to `to`), quick attack, exponential fade.
function tone(f,{type='sine',at=0,dur=.2,vol=.5,to=null,attack=.008}={}){
  const ctx=audio();if(!ctx)return;
  const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(SND.out);o.start(t);o.stop(t+dur+.05);
}
// Filtered white noise, for whooshes, impacts and breaking glass.
let noiseBuf=null;
function noise({at=0,dur=.3,vol=.4,type='bandpass',f=1000,to=null,q=1}={}){
  const ctx=audio();if(!ctx)return;
  if(!noiseBuf){noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const t=ctx.currentTime+at,s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=noiseBuf;fl.type=type;fl.Q.value=q;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(fl);fl.connect(g);g.connect(SND.out);s.start(t,Math.random()*.5);s.stop(t+dur+.05);
}
const SFX={
  tick(){tone(1400,{dur:.035,vol:.12,type:'triangle'})},
  charge(){tone(523,{dur:.16,vol:.25,type:'triangle'});tone(784,{at:.07,dur:.22,vol:.22,type:'triangle'})},
  summon(){tone(196,{dur:.32,vol:.3,type:'triangle',to:587});tone(880,{at:.24,dur:.3,vol:.18});noise({dur:.3,vol:.12,f:600,to:2400})},
  cast(){[1047,1319,1568,2093].forEach((f,i)=>tone(f,{at:i*.05,dur:.22,vol:.16}));noise({dur:.35,vol:.06,type:'highpass',f:5000})},
  attack(){noise({dur:.28,vol:.32,f:350,to:2600,q:2});tone(150,{dur:.18,vol:.18,type:'sawtooth',to:300})},
  block(){tone(310,{dur:.25,vol:.22,type:'square'});tone(467,{dur:.3,vol:.16,type:'square'});noise({dur:.12,vol:.25,f:2500,q:3})},
  hit(){tone(130,{dur:.22,vol:.5,to:45});noise({dur:.1,vol:.3,type:'lowpass',f:900})},
  destroy(){noise({dur:.45,vol:.38,type:'lowpass',f:1600,to:120});tone(220,{dur:.4,vol:.2,type:'square',to:55})},
  shatter(){
    noise({dur:.4,vol:.4,type:'highpass',f:2500,to:6000});
    for(let i=0;i<5;i++)tone(2000+Math.random()*2600,{at:i*.035+Math.random()*.02,dur:.18,vol:.1,type:'triangle'});
    tone(90,{dur:.25,vol:.3,to:40});
  },
  trigger(){[523,659,784,1047,1319].forEach((f,i)=>tone(f,{at:i*.06,dur:.3,vol:.2,type:'triangle'}))},
  myTurn(){tone(660,{dur:.7,vol:.18});tone(990,{at:.02,dur:.6,vol:.1})},
  theirTurn(){tone(392,{dur:.6,vol:.14});tone(523,{at:.02,dur:.5,vol:.07})},
  win(){[523,659,784].forEach((f,i)=>tone(f,{at:i*.13,dur:.25,vol:.24,type:'triangle'}));tone(1047,{at:.39,dur:.9,vol:.26,type:'triangle'});tone(784,{at:.39,dur:.9,vol:.12})},
  lose(){[392,330,262].forEach((f,i)=>tone(f,{at:i*.2,dur:.35,vol:.22,type:'triangle'}));tone(196,{at:.6,dur:1,vol:.2,type:'triangle',to:150})}
};
// What each log line sounds like; the first rule that matches wins.
const SOUND_RULES=[
  [/^You win!/,'win'],[/^You lose\./,'lose'],
  [/^Shield trigger!/,'trigger'],
  [/shields? [A-Z, and]+ breaks?|lands the final blow|breaks (a shield|\d+ shields)/,'shatter'],
  [/ blocks\.$/,'block'],
  [/ battles /,'hit'],
  [/ is destroyed| are destroyed/,'destroy'],
  [/ attacks /,'attack'],
  [/ casts? /,'cast'],
  [/ summons? |evolves? into|enters the battle zone/,'summon'],
  [/ charges? .* as mana/,'charge'],
  [/^Your turn \d+ begins/,'myTurn'],[/turn \d+ begins/,'theirTurn']
];
function sfx(name){if(SND.on&&SFX[name])try{SFX[name]()}catch(e){}}
// Called on every render: play the sounds for log lines added since the last one, a few at most.
function playLogSounds(){
  if(!G)return;
  const seq=G.logSeq||0;
  if(SND.game!==G.logId){SND.game=G.logId;SND.seen=seq;return}
  const fresh=Math.min(seq-SND.seen,G.log.length);SND.seen=seq;
  if(fresh<=0||!SND.on)return;
  const played=new Set();
  G.log.slice(0,fresh).reverse().forEach(line=>{
    const t=viewText(line),rule=SOUND_RULES.find(([re])=>re.test(t));
    if(!rule||played.has(rule[1])||played.size>=3)return;
    const at=played.size*110;played.add(rule[1]);
    setTimeout(()=>sfx(rule[1]),at);
  });
}
function toggleSound(){
  SND.on=!SND.on;
  try{window.storage.set('shieldclash-sound',SND.on?'on':'off',false)}catch(e){}
  if(SND.on)sfx('charge');
  document.querySelectorAll('[data-act=sound]').forEach(b=>{b.textContent=soundLabel();b.setAttribute('aria-pressed',SND.on)});
}
const soundLabel=()=>SND.on?'Sound on':'Sound off';
const soundBtn=()=>`<button data-act="sound" aria-pressed="${SND.on}" title="Sound effects (M)">${soundLabel()}</button>`;
// Browsers only start audio after a tap or key press; a quiet tick confirms buttons and cards.
document.addEventListener('pointerdown',e=>{
  if(!SND.on)return;
  audio();
  if(e.target.closest&&e.target.closest('button:not([disabled]),[data-uid],[data-shield],[data-def]'))sfx('tick');
},true);
document.addEventListener('keydown',e=>{if((e.key==='m'||e.key==='M')&&!e.target.matches('input,textarea,select'))toggleSound()});
