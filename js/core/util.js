const now=()=>Date.now();
const DECK_SIZE=50,DECK_MIN=50,DECK_MAX=60,MAX_COPY=4;
const legal=n=>n>=DECK_MIN&&n<=DECK_MAX;
const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
