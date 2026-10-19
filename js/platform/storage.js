// Inside the Claude app, window.storage is provided (personal + shared data).
// Anywhere else (GitHub Pages, a downloaded file) we keep decks in localStorage
// and connect two devices through a public MQTT relay for online play.
const IN_CLAUDE=!!(window.storage&&typeof window.storage.get==='function');
if(!IN_CLAUDE){
  const LS=(()=>{try{const t='__sc';localStorage.setItem(t,'1');localStorage.removeItem(t);return localStorage}catch(e){return null}})();
  const mem={};
  const g=k=>LS?LS.getItem('sc:'+k):(k in mem?mem[k]:null),st=(k,v)=>{if(LS)LS.setItem('sc:'+k,v);else mem[k]=v},rm=k=>{if(LS)LS.removeItem('sc:'+k);else delete mem[k]};
  window.storage={
    async get(k){const v=g(k);if(v==null)throw new Error('Key not found');return {key:k,value:v,shared:false}},
    async set(k,v){st(k,v);return {key:k,value:v,shared:false}},
    async delete(k){rm(k);return {key:k,deleted:true,shared:false}},
    async list(prefix=''){const keys=[];if(LS){for(let i=0;i<LS.length;i++){const k=LS.key(i);if(k.startsWith('sc:'+prefix))keys.push(k.slice(3))}}return {keys,prefix,shared:false}}
  };
}
