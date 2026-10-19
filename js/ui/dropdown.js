/* ---------- dropdowns ---------- */
// A styled replacement for <select>: a pill button that opens a list of options below it.
// ddHTML renders one; choosing an option updates data-value on the wrapper and fires a
// bubbling "ddchange" event ({key, value}) that the owning screen listens for.
// Keyboard: Enter, Space or the arrow keys open it; arrows, Home and End move; Enter or
// Space chooses; Escape closes; typing a letter jumps to the next option starting with it.
function ddHTML(key,options,value,{id='',label=''}={}){
  const cur=options.find(([v])=>v===value)||options[0];
  return `<div class="dd" data-dd="${esc(key)}" data-value="${esc(cur[0])}"${id?` id="${esc(id)}"`:''}>
    <button type="button" class="ddbtn" aria-haspopup="listbox" aria-expanded="false"${label?` aria-label="${esc(label)}: ${esc(cur[1])}"`:''}><span>${esc(cur[1])}</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="ddlist" role="listbox" hidden>${options.map(([v,t])=>`<div class="ddopt" role="option" tabindex="-1" data-v="${esc(v)}" aria-selected="${v===cur[0]}">${esc(t)}</div>`).join('')}</div>
  </div>`;
}
const ddValue=id=>{const el=document.getElementById(id);return el?el.dataset.value:null};
function ddOpen(dd,focusSel=true){
  ddCloseAll(dd);
  const btn=dd.querySelector('.ddbtn'),list=dd.querySelector('.ddlist');
  list.hidden=false;btn.setAttribute('aria-expanded','true');
  // Open upward when there's no room below.
  const r=btn.getBoundingClientRect();
  dd.classList.toggle('up',innerHeight-r.bottom<Math.min(list.scrollHeight,300)+12&&r.top>innerHeight-r.bottom);
  const sel=list.querySelector('[aria-selected="true"]')||list.firstElementChild;
  if(focusSel&&sel){sel.focus();sel.scrollIntoView({block:'nearest'})}
}
function ddClose(dd,refocus){
  const list=dd.querySelector('.ddlist');if(list.hidden)return;
  list.hidden=true;dd.querySelector('.ddbtn').setAttribute('aria-expanded','false');
  if(refocus)dd.querySelector('.ddbtn').focus();
}
function ddCloseAll(except){document.querySelectorAll('.dd').forEach(d=>{if(d!==except)ddClose(d)})}
function ddChoose(dd,opt){
  dd.dataset.value=opt.dataset.v;
  dd.querySelectorAll('.ddopt').forEach(o=>o.setAttribute('aria-selected',o===opt));
  dd.querySelector('.ddbtn span').textContent=opt.textContent;
  ddClose(dd,true);
  dd.dispatchEvent(new CustomEvent('ddchange',{bubbles:true,detail:{key:dd.dataset.dd,value:opt.dataset.v}}));
}
document.addEventListener('click',e=>{
  const dd=e.target.closest&&e.target.closest('.dd');
  if(!dd){ddCloseAll();return}
  const opt=e.target.closest('.ddopt');
  if(opt){ddChoose(dd,opt);return}
  if(e.target.closest('.ddbtn')){dd.querySelector('.ddlist').hidden?ddOpen(dd,false):ddClose(dd)}
});
document.addEventListener('keydown',e=>{
  const dd=e.target.closest&&e.target.closest('.dd');if(!dd)return;
  const list=dd.querySelector('.ddlist'),opts=[...list.children],i=opts.indexOf(document.activeElement);
  if(list.hidden){
    if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)&&e.target.closest('.ddbtn')){e.preventDefault();ddOpen(dd)}
    return;
  }
  const go=k=>{e.preventDefault();const o=opts[Math.max(0,Math.min(opts.length-1,k))];if(o){o.focus();o.scrollIntoView({block:'nearest'})}};
  if(e.key==='ArrowDown')go(i+1);
  else if(e.key==='ArrowUp')go(i<0?opts.length-1:i-1);
  else if(e.key==='Home')go(0);
  else if(e.key==='End')go(opts.length-1);
  else if((e.key==='Enter'||e.key===' ')&&i>=0){e.preventDefault();ddChoose(dd,opts[i])}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ddClose(dd,true)}
  else if(e.key==='Tab')ddClose(dd);
  else if(e.key.length===1&&/\S/.test(e.key)){
    const k=e.key.toLowerCase(),order=[...opts.slice(i+1),...opts.slice(0,i+1)];
    const hit=order.find(o=>o.textContent.trim().toLowerCase().startsWith(k));
    if(hit)go(opts.indexOf(hit));
  }
},true);
