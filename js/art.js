/* ---------- card art: original procedural illustrations ---------- */
const PAL={
  fire:{frame:'#A32D2D',light:'#FCEBEB',mid:'#F09595',deep:'#501313',soft:'#F7C1C1'},
  water:{frame:'#185FA5',light:'#E6F1FB',mid:'#85B7EB',deep:'#042C53',soft:'#B5D4F4'},
  nature:{frame:'#3B6D11',light:'#EAF3DE',mid:'#97C459',deep:'#173404',soft:'#C0DD97'},
  light:{frame:'#854F0B',light:'#FAEEDA',mid:'#FAC775',deep:'#412402',soft:'#FCE3B4'},
  darkness:{frame:'#3C3489',light:'#EEEDFE',mid:'#AFA9EC',deep:'#26215C',soft:'#CECBF6'}
};
// Each figure is drawn in a 40x40 box, feet near y=38. 'L' = fill with the light tone (eyes, details).
const FIG={
 Drake:[
  'M15 25 L8 6 L17 15 L19 4 L24 17 Z',
  'M4 36 C3 30 8 25 15 24 C20 23 24 24 27 21 L30 15 L37 13 L39 16 L35 18 L38 21 L32 22 C31 28 27 33 21 35 C15 37 10 37 4 36 Z',
  'M4 36 C1 37 0 33 2 31 C2 34 3 35 5 35 Z',
  'M13 34 L12 39 L15 39 L16 34 Z','M21 33 L21 39 L24 39 L24 32 Z',
  ['L','M33 15.5 a1.2 1.2 0 1 0 0.1 0 Z']],
 Raider:[
  'M15 9 L11 2 L17 6 Z','M25 9 L29 2 L23 6 Z',
  'M20 5 a5 5 0 1 0 0.1 0 Z',
  'M13 15 L27 15 L29 27 L11 27 Z',
  'M13 27 L18 27 L17 38 L12 38 Z','M22 27 L27 27 L28 38 L23 38 Z',
  'M27 16 L33 21 L31 23 L26 19 Z','M31 22 L38 3 L40 4 L34 23 Z',
  'M13 16 L6 19 L7 27 L12 26 Z',
  ['L','M17.5 9 h2 v1.5 h-2 Z M21 9 h2 v1.5 h-2 Z']],
 Firebird:[
  'M19 20 C13 11 6 8 0 9 C4 13 4 15 2 17 C7 17 11 20 15 25 Z',
  'M21 20 C27 11 34 8 40 9 C36 13 36 15 38 17 C33 17 29 20 25 25 Z',
  'M20 14 C24 14 25 20 24 27 C23 31 17 31 16 27 C15 20 16 14 20 14 Z',
  'M20 8 a4 4 0 1 0 0.1 0 Z','M23 11 L27 12.5 L23 14 Z',
  'M17 29 L12 39 L18 34 L20 40 L22 34 L28 39 L23 29 Z',
  ['L','M21 11 a1 1 0 1 0 0.1 0 Z']],
 Tidefolk:[
  'M18 4 a4.5 4.5 0 1 0 0.1 0 Z',
  'M13 13 L23 13 L24 23 L12 23 Z',
  'M12 23 L24 23 C26 29 24 33 19 35 L26 37 L22 40 L15 37 C10 34 9 28 12 23 Z',
  'M23 15 L28 18 L27 19 L22 17 Z',
  'M27 6 L28.5 6 L28.5 34 L27 34 Z','M24 3 L24 9 L31.5 9 L31.5 3 L30.3 3 L30.3 7.8 L28.4 7.8 L28.4 2 L27.1 2 L27.1 7.8 L25.2 7.8 L25.2 3 Z',
  'M12 7 C9 9 9 14 11 17 L13 13 Z',
  ['L','M19 7.5 a0.9 0.9 0 1 0 0.1 0 Z']],
 Serpent:[
  ['S','M3 37 C9 26 17 40 23 30 C28 21 22 15 29 10'],
  'M27 6 C31 4 37 6 39 9 L33 10 L36 13 C33 14 30 13 28 12 Z',
  'M8 30 L9 25 L11 30 Z','M15 33 L17 28 L18 34 Z','M22 24 L26 21 L25 26 Z',
  ['L','M33 7.5 a0.9 0.9 0 1 0 0.1 0 Z']],
 Glyphmind:[
  ['S2','M20 6 a14 14 0 1 0 0.1 0 Z'],
  'M20 11 a9 9 0 1 0 0.1 0 Z',
  ['L','M20 16.5 a3.5 3.5 0 1 0 0.1 0 Z'],
  'M4 18 h4 v4 h-4 Z','M32 18 h4 v4 h-4 Z','M18 2 h4 v4 h-4 Z','M18 34 h4 v4 h-4 Z'],
 Wildkin:[
  'M12 18 L14 13 L16 18 L18 12 L20 18 L22 13 L24 18 Z',
  'M20 18 C29 18 33 21 33 27 C33 32 28 34 20 34 C11 34 6 32 6 26 C6 21 11 18 20 18 Z',
  'M30 21 L37 22 L39 28 L33 31 L30 29 Z','M36 23 L40 16 L38 24 Z','M37 28 L40 26 L38 30 Z',
  'M29 19 L30 15 L33 20 Z',
  'M9 31 h4 v8 h-4 Z','M15 32 h4 v7 h-4 Z','M23 32 h4 v7 h-4 Z','M28 31 h4 v8 h-4 Z',
  ['L','M34 24 a0.9 0.9 0 1 0 0.1 0 Z']],
 Giant:[
  'M20 4 a10 10 0 1 0 0.1 0 Z','M11 10 a6.5 6.5 0 1 0 0.1 0 Z','M29 10 a6.5 6.5 0 1 0 0.1 0 Z',
  'M14 39 L16 19 L24 19 L26 39 L22 39 L20 31 L18 39 Z',
  'M16 22 L5 27 L6 30 L16 26 Z','M24 22 L35 27 L34 30 L24 26 Z',
  'M5 27 L2 25 M5 28 L2 31',
  ['L','M17.5 22 a1.2 1.2 0 1 0 0.1 0 Z M22.5 22 a1.2 1.2 0 1 0 0.1 0 Z']],
 Rootling:[
  'M20 22 C14 14 6 16 7 9 C14 8 19 14 20 22 Z','M20 22 C26 14 34 16 33 9 C26 8 21 14 20 22 Z',
  'M19 18 h2 v6 h-2 Z',
  'M20 23 a8 8 0 1 0 0.1 0 Z',
  'M14 36 L13 39 L17 39 L17 36 Z','M23 36 L23 39 L27 39 L26 36 Z',
  ['L','M17 29 a1.3 1.3 0 1 0 0.1 0 Z M23 29 a1.3 1.3 0 1 0 0.1 0 Z']],
 Sentinel:[
  'M15 3 h10 v10 h-10 Z','M19 0 h2 v4 h-2 Z',
  'M12 14 L28 14 L29 29 L11 29 Z',
  'M12 29 L18 29 L17 39 L12 39 Z','M22 29 L28 29 L28 39 L23 39 Z',
  'M8 2 L9.5 2 L9.5 36 L8 36 Z','M6.5 5 L8.7 0 L11 5 Z',
  'M22 15 L36 15 L36 26 C36 32 29 37 29 37 C29 37 22 32 22 26 Z',
  ['L','M16.5 7 h7 v1.6 h-7 Z M28.2 18 h1.6 v13 h-1.6 Z M24.5 22 h9 v1.6 h-9 Z']],
 Choir:[
  ['S1','M14.5 2.2 C14.5 0.6 25.5 0.6 25.5 2.2 C25.5 3.8 14.5 3.8 14.5 2.2 Z'],
  'M20 6 a3.8 3.8 0 1 0 0.1 0 Z',
  'M16 14 L24 14 L29 39 L11 39 Z',
  'M16 16 C9 8 3 9 0 18 C5 17 6 21 3 24 C8 23 11 24 14 27 Z',
  'M24 16 C31 8 37 9 40 18 C35 17 34 21 37 24 C32 23 29 24 26 27 Z'],
 Starborn:[
  'M20 2 L23 15 L36 10 L26 20 L38 26 L24 25 L20 38 L16 25 L2 26 L14 20 L4 10 L17 15 Z',
  ['L','M20 13 L25 20 L20 27 L15 20 Z'],
  'M5 3 a1.5 1.5 0 1 0 0.1 0 Z','M35 34 a1.5 1.5 0 1 0 0.1 0 Z','M36 3 a1 1 0 1 0 0.1 0 Z'],
 Fiend:[
  'M16 8 L11 0 L18 5 Z','M24 8 L29 0 L22 5 Z',
  'M20 6 a4.5 4.5 0 1 0 0.1 0 Z',
  'M15 15 L1 6 L4 15 L0 19 L6 20 L3 26 L14 24 Z','M25 15 L39 6 L36 15 L40 19 L34 20 L37 26 L26 24 Z',
  'M14 14 L26 14 L28 28 L12 28 Z',
  'M13 28 L18 28 L17 39 L13 39 Z','M22 28 L27 28 L27 39 L23 39 Z',
  ['S','M27 26 C33 30 34 35 38 33'],
  ['L','M17.5 10 L19.5 11 L17.5 11.6 Z M22.5 10 L20.5 11 L22.5 11.6 Z']],
 Crawler:[
  ['S','M14 26 L6 20 L2 26 M14 29 L5 29 L1 35 M15 32 L8 36 L6 40 M26 26 L34 20 L38 26 M26 29 L35 29 L39 35 M25 32 L32 36 L34 40'],
  'M20 20 C27 20 30 24 30 29 C30 34 26 37 20 37 C14 37 10 34 10 29 C10 24 13 20 20 20 Z',
  'M20 13 a5 5 0 1 0 0.1 0 Z',
  'M16 13 L13 9 L17 11 Z','M24 13 L27 9 L23 11 Z',
  ['L','M17.5 17 a1 1 0 1 0 0.1 0 Z M22.5 17 a1 1 0 1 0 0.1 0 Z M20 24 v10']],
 Wraith:[
  'M20 3 C28 3 31 11 30 20 L33 37 L28 33 L25 39 L21 33 L17 39 L14 33 L8 37 L10 20 C9 11 12 3 20 3 Z',
  ['L','M20 9 C24 9 26 13 25 18 C24 22 16 22 15 18 C14 13 16 9 20 9 Z'],
  'M17.6 14.5 a1.3 1.3 0 1 0 0.1 0 Z','M22.4 14.5 a1.3 1.3 0 1 0 0.1 0 Z',
  'M10 22 L3 28 L5 30 L11 25 Z','M30 22 L37 28 L35 30 L29 25 Z']
};
const EMB={
 fire:'M20 3 C26 11 31 16 29 26 C28 33 23 37 20 37 C14 37 9 32 10 25 C11 19 15 17 16 11 C19 15 21 17 22 20 C23 15 22 9 20 3 Z',
 water:'M20 3 C26 13 31 20 31 26 C31 32 26 37 20 37 C14 37 9 32 9 26 C9 20 14 13 20 3 Z',
 nature:'M7 33 C7 16 18 6 35 6 C35 23 24 33 7 33 Z',
 light:'M20 11 a9 9 0 1 0 0.1 0 Z M20 0 L22 7 L18 7 Z M20 40 L22 33 L18 33 Z M0 20 L7 18 L7 22 Z M40 20 L33 18 L33 22 Z M6 6 L11 10 L10 11 Z M34 34 L29 30 L30 29 Z M34 6 L30 11 L29 10 Z M6 34 L10 29 L11 30 Z',
 darkness:'M28 6.1 A16 16 0 1 0 28 33.9 A14 14 0 0 1 28 6.1 Z'
};
function hashStr(s){let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// How each race moves, and which parts of the drawing are wings.
const MOVE={Drake:'hover',Firebird:'hover',Choir:'hover',Fiend:'hover',Raider:'breathe',Sentinel:'breathe',Tidefolk:'breathe',Wildkin:'breathe',
  Serpent:'sway',Giant:'sway',Rootling:'sway',Wraith:'float',Glyphmind:'float',Starborn:'spin',Crawler:'scuttle'};
const WING={Drake:{0:'wu'},Firebird:{0:'wl',1:'wr'},Choir:{3:'wl',4:'wr'},Fiend:{3:'wl',4:'wr'},Glyphmind:{0:'ring'}};
const dl=(r,max)=>`style="animation-delay:calc(var(--ph) - ${(r()*max).toFixed(2)}s)"`;
function scene(e,P,r){
  let s='';
  if(e==='fire'){
    const h=34+r()*8;
    s+=`<path d="M0 60 L0 ${h} L${14+r()*8} ${h-14-r()*8} L${32+r()*6} ${h-4} L${50+r()*10} ${h-20-r()*8} L${72+r()*6} ${h-6} L${86+r()*6} ${h-15} L100 ${h-2} L100 60 Z" fill="${P.frame}" opacity=".55"/>`;
    s+=`<path d="M0 60 L0 54 Q25 49 50 54 T100 52 L100 60 Z" fill="${P.deep}" opacity=".5"/>`;
    for(let i=0;i<8;i++)s+=`<circle class="p-ember" ${dl(r,2)} cx="${(r()*100).toFixed(1)}" cy="${(20+r()*35).toFixed(1)}" r="${(0.6+r()*1.1).toFixed(1)}" fill="${P.light}"/>`;
  }else if(e==='water'){
    for(let i=0;i<4;i++){const y=22+i*11+r()*3,o=r()*20;
      s+=`<path class="p-wave" ${dl(r,4)} d="M-10 ${y} Q${2.5+o/4} ${y-4} 15 ${y} T40 ${y} T65 ${y} T90 ${y} T115 ${y} L115 62 L-10 62 Z" fill="${i%2?P.frame:P.soft}" opacity="${.25+i*.12}"/>`}
    for(let i=0;i<7;i++)s+=`<circle class="p-bubble" ${dl(r,4)} cx="${(r()*100).toFixed(1)}" cy="${(25+r()*30).toFixed(1)}" r="${(0.8+r()*1.6).toFixed(1)}" fill="none" stroke="${P.light}" stroke-width=".7"/>`;
  }else if(e==='nature'){
    s+=`<ellipse cx="${20+r()*20}" cy="62" rx="45" ry="${18+r()*6}" fill="${P.frame}" opacity=".4"/><ellipse cx="${70+r()*20}" cy="64" rx="45" ry="${16+r()*6}" fill="${P.frame}" opacity=".55"/>`;
    for(let i=0;i<5;i++){const x=r()*100,h=10+r()*12,y=50-r()*8;s+=`<path class="p-tree" ${dl(r,4)} d="M${x} ${y-h} L${x+5} ${y} L${x-5} ${y} Z" fill="${P.deep}" opacity=".35"/>`}
    for(let i=0;i<4;i++)s+=`<path class="p-leaf" ${dl(r,4)} d="M${(r()*100).toFixed(1)} ${(r()*20).toFixed(1)} q2 -2 4 0 q-2 2 -4 0 Z" fill="${P.light}"/>`;
  }else if(e==='light'){
    const cx=50+(r()-.5)*30;let rays='';
    for(let i=0;i<9;i++){const a=-Math.PI*(0.08+i*0.105),x1=cx+Math.cos(a-.04)*140,y1=-4+Math.sin(a-.04)*-140,x2=cx+Math.cos(a+.04)*140,y2=-4+Math.sin(a+.04)*-140;
      rays+=`<path d="M${cx} -4 L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${P.light}" opacity=".45"/>`}
    s+=`<g class="p-rays" ${dl(r,4)}>${rays}</g>`;
    for(let i=0;i<6;i++){const x=r()*100,y=r()*50,k=1+r()*1.5;s+=`<path class="p-twinkle" ${dl(r,2)} d="M${x} ${y-k*2} L${x+k*.6} ${y} L${x} ${y+k*2} L${x-k*.6} ${y} Z" fill="${P.light}"/>`}
  }else{
    const mx=15+r()*70,my=10+r()*8;
    s+=`<circle cx="${mx}" cy="${my}" r="8" fill="${P.light}" opacity=".8"/><circle cx="${mx+3.5}" cy="${my-2}" r="7" fill="${P.mid}"/>`;
    for(let i=0;i<3;i++){const y=38+i*8+r()*3;s+=`<path class="p-mist" ${dl(r,8)} d="M-12 ${y} Q30 ${y-5} 55 ${y} T112 ${y-1} L112 62 L-12 62 Z" fill="${P.deep}" opacity="${.2+i*.15}"/>`}
    for(let i=0;i<6;i++)s+=`<circle class="p-twinkle" ${dl(r,2)} cx="${(r()*100).toFixed(1)}" cy="${(r()*28).toFixed(1)}" r=".7" fill="${P.light}"/>`;
  }
  return s;
}
function figSVG(parts,P,race){
  const w=WING[race]||{};
  return parts.map((p,i)=>{
    const c=w[i]?` class="${w[i]}"`:'';
    if(typeof p==='string')return `<path${c} d="${p}" fill="${P.deep}"/>`;
    if(p[0]==='L')return `<path class="eye" d="${p[1]}" fill="${P.light}" stroke="${P.light}" stroke-width=".4"/>`;
    if(p[0]==='S')return `<path${c} d="${p[1]}" fill="none" stroke="${P.deep}" stroke-width="4" stroke-linecap="round"/>`;
    if(p[0]==='S1')return `<path${c} d="${p[1]}" fill="none" stroke="${P.deep}" stroke-width="1.4"/>`;
    if(p[0]==='S2')return `<path${c} d="${p[1]}" fill="none" stroke="${P.deep}" stroke-width="1.6" stroke-dasharray="3 2.5"/>`;
  }).join('');
}
function cardArt(c,compact){
  const P=PAL[c.e],r=mulberry(hashStr(c.id));
  let s=scene(c.e,P,r);
  if(c.t==='s'){
    let rays='';
    for(let i=0;i<12;i++){const a=i*Math.PI/6+r()*.2;rays+=`<path d="M50 30 L${(50+Math.cos(a-.08)*70).toFixed(1)} ${(30+Math.sin(a-.08)*70).toFixed(1)} L${(50+Math.cos(a+.08)*70).toFixed(1)} ${(30+Math.sin(a+.08)*70).toFixed(1)} Z" fill="${P.light}" opacity=".3"/>`}
    s+=`<g class="p-burst">${rays}</g><circle class="p-glow" cx="50" cy="30" r="19" fill="${P.light}" opacity=".55"/>`;
    s+=`<g transform="translate(32 12) scale(.9)"><g class="a-pulse"><path d="${EMB[c.e]}" fill="${P.deep}"/></g></g>`;
  }else{
    // compact = small cards with a short picture window, so the creature is drawn smaller to keep its head in view
    const big=c.cost>=7,j=r()*.12,sc=compact?(big?1.05:0.94)+j/2:(big?1.32:1.12)+j,flip=r()<.35;
    const w=40*sc,x=50-w/2+(r()-.5)*18,y=60-38*sc-1;
    if(big||c.evo)s+=`<circle class="p-glow" cx="${(x+w/2).toFixed(1)}" cy="${(y+20*sc).toFixed(1)}" r="${(21*sc).toFixed(1)}" fill="${P.light}" opacity="${big?.5:.35}"/>`;
    const tf=flip?`translate(${(x+w).toFixed(1)} ${y.toFixed(1)}) scale(${-sc.toFixed(2)} ${sc.toFixed(2)})`:`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(2)})`;
    s+=`<g transform="${tf}"><g class="fig a-${MOVE[c.race]||'breathe'}" ${dl(r,4)}>${figSVG(FIG[c.race]||FIG.Raider,P,c.race)}</g></g>`;
  }
  return `<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect width="100" height="60" fill="${P.mid}"/>${s}</svg>`;
}
