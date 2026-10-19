/* ---------- loading panel ---------- */
// Opening a screen can take a moment on a first visit: the work itself, then the card art
// that screen shows. The panel says so, counting the art on screen as it arrives. It
// fades in after a short delay (on the compositor, so it still shows while the work
// blocks), which keeps fast machines from seeing a flash.
let LOADING=0;
const ART_WAIT=6000;
function loaderHTML(label){
  return `<div class="ldpanel" role="status" aria-live="polite"><b class="ldlabel">${esc(label)}</b>
    <div class="ldbar"><i></i></div><span class="ldcount"></span></div>`;
}
function setLoader(el,label,done,total){
  el.querySelector('.ldlabel').textContent=label;
  el.querySelector('.ldcount').innerHTML=total?`<b>${done}</b> of <b>${total}</b>`:'';
  el.querySelector('.ldbar i').style.width=total?`${Math.round(done/total*100)}%`:'';
  el.classList.toggle('ldsteady',!total);
}
const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r)));
// The art on screen that hasn't arrived yet (lazy images below the fold don't count).
function pendingArt(){
  const h=innerHeight;
  return [...document.querySelectorAll('#app img')].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<h&&r.width>0});
}
async function withLoader(label,work){
  const id=++LOADING,el=document.getElementById('busy');
  el.innerHTML=loaderHTML(label);setLoader(el,label,0,0);el.hidden=false;
  try{
    await nextPaint();
    await work();
    await nextPaint();
    const imgs=pendingArt(),total=imgs.length;
    const done=()=>imgs.filter(i=>i.complete).length;
    if(total&&done()<total){
      await new Promise(resolve=>{
        const tick=()=>{if(LOADING!==id)return resolve();const n=done();setLoader(el,'Loading card art',n,total);if(n>=total)resolve()};
        imgs.forEach(i=>{if(!i.complete){i.addEventListener('load',tick,{once:true});i.addEventListener('error',tick,{once:true})}});
        tick();setTimeout(resolve,ART_WAIT);
      });
    }
  }finally{if(LOADING===id){el.hidden=true;el.innerHTML=''}}
}
