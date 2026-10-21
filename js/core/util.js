const now=()=>Date.now();
const DECK_SIZE=50,DECK_MIN=50,DECK_MAX=60,MAX_COPY=4;
const legal=n=>n>=DECK_MIN&&n<=DECK_MAX;
const $=s=>document.querySelector(s);
// SIM is above 0 while the computer plays a game out in its head (ai/planner.js): nothing
// waits or draws then, so a simulated turn takes a few milliseconds.
let SIM=0;
const sleep=ms=>SIM?Promise.resolve():new Promise(r=>setTimeout(r,ms));
// Cards flying on screen (ui/board.js) say when they land in ANIM.until. The game waits for them
// before each step of an effect (settle), so changes show one after another instead of all at once.
const ANIM={until:0};
const settle=()=>{const left=Math.min(ANIM.until-now(),1500);return SIM||left<=0?Promise.resolve():new Promise(r=>setTimeout(r,left)).then(settle)};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
