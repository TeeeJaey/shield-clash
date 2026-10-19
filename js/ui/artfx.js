/* ---------- animated card art ---------- */
// The art window of a previewed or zoomed card comes alive in its civilization's way: fire
// shimmers with heat and embers, water ripples with caustics and bubbles, nature sways in
// dappled light with drifting leaves, light radiates rays and stars, darkness swirls and
// pulses under falling ash. Only the art moves; the frame and text stay still.
// One shared WebGL context renders each target into its own small canvas laid over the
// artwork, and it only runs while something is hovered or zoomed. It stays off for reduced
// motion, without WebGL, or when the art can't be read (a page opened from disk).
const ARTFX={gl:null,cv:null,loc:null,tex:new Map(),targets:new Set(),raf:0,broken:false};
const FX_MODE={fire:0,water:1,nature:2,light:3,darkness:4};
const FX_VS='attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
const FX_FS=`precision mediump float;
varying vec2 v;
uniform sampler2D tex;
uniform vec4 box;
uniform vec2 res;
uniform float time,amp,seed;
uniform int mode,mode2;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.1+3.7;a*=.5;}return s;}
// Glowing specks on a drifting grid: speed > 0 rises, < 0 falls.
float motes(vec2 p,float cells,float speed,float chance,float size,float sd){
  vec2 g=p*cells;g.y-=time*speed;g.x+=sin(g.y*.7+sd*5.+time*.5)*.3;
  vec2 id=floor(g),f=fract(g)-.5;
  if(h(id+sd)>chance)return 0.;
  vec2 o=vec2(h(id+sd+1.3),h(id+sd+2.9))-.5;
  float tw=.6+.4*sin(time*(2.+3.*h(id))+h(id+7.)*30.);
  return smoothstep(size,0.,length(f-o*.6))*tw;
}
// Rising bubbles: a thin ring with a highlight.
float bubbles(vec2 p,float cells,float speed,float sd){
  vec2 g=p*cells;g.y-=time*speed;g.x+=sin(g.y*1.2+sd*3.+time)*.15;
  vec2 id=floor(g),f=fract(g)-.5;
  if(h(id+sd)>.2)return 0.;
  vec2 o=(vec2(h(id+sd+1.1),h(id+sd+2.3))-.5)*.5;
  float r=.08+.1*h(id+sd+4.),d=length(f-o);
  return smoothstep(.03,0.,abs(d-r))*.8+smoothstep(r*.45,0.,length(f-o-vec2(-r,r)*.35))*.8;
}
// Falling, tumbling leaves.
float leaves(vec2 p,out float tone){
  vec2 g=p*vec2(5.,4.5);g.y+=time*.3;g.x+=sin(g.y*.9+time*.7)*.4;
  vec2 id=floor(g),f=fract(g)-.5;
  tone=h(id+5.5);
  if(h(id+11.1)>.22)return 0.;
  vec2 q=f-(vec2(h(id+1.7),h(id+2.9))-.5)*.5;
  float a=time*(.7+h(id)*1.5)+h(id+4.4)*6.28;
  q=vec2(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y);
  return smoothstep(.1,.075,length(q*vec2(1.,2.5)));
}
// How each civilization moves the art.
vec2 warp(int m,vec2 p,float t){
  if(m==0)return(vec2(fb(vec2(p.x*5.,p.y*3.-t*1.5)),fb(vec2(p.x*5.+9.,p.y*3.-t*1.7)))-.5)*.012*(1.-p.y*.6);
  if(m==1)return vec2(sin(p.y*18.+t*1.3+sin(p.x*6.+t*.5)),cos(p.x*15.+t*1.1))*.0024+(vec2(fb(p*3.+t*.1),fb(p*3.+4.-t*.1))-.5)*.008;
  if(m==2)return vec2(sin(p.y*4.+t*1.2+fb(p*2.+t*.1)*3.)*.003*(.3+.7*p.y),(fb(p*3.-t*.08)-.5)*.004);
  if(m==3)return(vec2(n(p*14.+t*.6),n(p*14.+5.-t*.6))-.5)*.002;
  vec2 r=p-.5;float a=(fb(p*2.3+vec2(t*.05,-t*.04))-.5)*.1;
  return vec2(cos(a)*r.x-sin(a)*r.y,sin(a)*r.x+cos(a)*r.y)-r;
}
// What each civilization adds to (or does to) the art's colors.
vec3 look(int m,vec3 col,vec2 p,vec2 q,vec2 hc,float hd,float t){
  float lum=dot(col,vec3(.3,.59,.11));
  vec3 add=vec3(0.);
  if(m==0){
    float warm=clamp((col.r-col.b)*1.5,0.,1.)*smoothstep(.3,.9,lum);
    add+=vec3(1.,.45,.1)*warm*(.08+.32*fb(vec2(p.x*3.,p.y*2.-t*1.3)));
    float em=motes(q,8.,.8,.35,.12,1.)+.7*motes(q,14.,1.3,.3,.09,2.)+.5*motes(q,22.,1.9,.25,.08,3.);
    add+=vec3(1.,.6,.2)*em*.9*(1.-smoothstep(.75,1.,p.y));
    add+=vec3(1.,.3,.05)*pow(1.-p.y,3.)*(.12+.05*sin(t*2.3));
  }else if(m==1){
    float k=pow(1.-abs(sin((fb(q*3.+vec2(t*.1,t*.07))+fb(q*4.-vec2(t*.08,-t*.05)+3.))*8.)),9.);
    add+=vec3(.55,.9,1.)*k*.22*(.4+.6*p.y);
    add+=vec3(.7,.95,1.)*pow(.5+.5*sin(p.x*14.+p.y*3.+sin(t*.3)*2.),12.)*smoothstep(.3,1.,p.y)*.07;
    add+=vec3(.85,.97,1.)*(bubbles(q,6.,.35,1.)+.7*bubbles(q,11.,.55,2.))*.45;
  }else if(m==2){
    add+=vec3(1.,.95,.55)*smoothstep(.52,.8,fb(q*2.2+vec2(t*.05,-t*.03)))*.1*(.4+.6*p.y);
    float green=clamp((col.g-max(col.r,col.b))*3.,0.,1.)*smoothstep(.3,.8,lum);
    add+=vec3(.5,1.,.4)*green*(.05+.06*sin(t*1.3+p.x*3.));
    add+=vec3(1.,.95,.6)*motes(q,11.,.12,.3,.08,8.)*.55;
    float tone,leaf=leaves(q,tone);
    col=mix(col,vec3(.3,.58,.16)+vec3(.2,.2,.05)*tone,leaf*.85*amp);
  }else if(m==3){
    float r=sqrt(hd),an=atan(hc.y,hc.x);
    float ray=pow(.5+.5*sin(an*10.+t*.35),8.)+.7*pow(.5+.5*sin(an*7.-t*.25+1.3),10.);
    add+=vec3(1.,.95,.75)*ray*exp(-r*2.3)*.3;
    add+=vec3(1.,1.,.9)*exp(-hd*70.)*(.25+.2*sin(t*2.));
    vec2 g=q*12.,id=floor(g),f=fract(g)-.5;
    vec2 o=(vec2(h(id+1.1),h(id+2.2))-.5)*.6,s=abs(f-o);
    float star=(smoothstep(.06,0.,length(f-o))+smoothstep(.012,0.,s.x)*smoothstep(.25,0.,s.y)+smoothstep(.012,0.,s.y)*smoothstep(.25,0.,s.x))*.8;
    add+=vec3(1.,.97,.85)*star*step(h(id+3.3),.18)*pow(.5+.5*sin(t*(1.5+h(id)*3.)+h(id+9.)*30.),6.);
    add+=vec3(1.,.85,.45)*motes(q,10.,.18,.3,.08,6.)*.5;
  }else{
    float s=fb(q*2.2+vec2(t*.05,t*.035)),edge=smoothstep(.2,.7,length((p-.5)*vec2(1.,1.1)));
    col=mix(col,col*vec3(.5,.42,.62),smoothstep(.42,.78,s)*edge*.6*amp);
    add+=vec3(.45,.12,.6)*smoothstep(.58,.88,fb(q*4.-vec2(t*.07,-t*.02)+4.))*edge*.22;
    float ph=fract(t*.75+seed),beat=exp(-pow(ph*6.-1.,2.)*5.)+.6*exp(-pow(ph*6.-2.1,2.)*5.);
    add+=vec3(1.,.35,.85)*exp(-hd*50.)*(.15+.5*beat);
    float ash=motes(q,9.,-.25,.28,.1,4.)+.7*motes(q,16.,-.4,.22,.08,5.);
    col=mix(col,vec3(.07,.02,.1),clamp(ash,0.,1.)*.5*amp);
    add+=vec3(.6,.2,.8)*ash*.12;
  }
  return clamp(col+add*amp,0.,1.);
}
void main(){
  vec2 p=v;float t=time,asp=res.x/res.y;vec2 q=vec2(p.x*asp,p.y);
  vec2 hc=(p-vec2(.5,.62))*vec2(asp,1.);float hd=dot(hc,hc);
  // A two-civilization card splits like its frame: the first civilization's effect at the
  // top left, the second's at the bottom right, meeting in a soft diagonal band that sways.
  float w=mode2<0?0.:smoothstep(.36,.64,(p.x+1.-p.y)*.5+.05*sin(t*.5+p.y*3.)+.03*sin(t*.31));
  vec2 d=warp(mode,p,t);
  if(mode2>=0)d=mix(d,warp(mode2,p,t),w);
  vec2 c=(p-.5)/1.05+.5+d*amp;
  vec3 col=texture2D(tex,mix(box.xy,box.zw,clamp(c,.002,.998))).rgb;
  vec3 a=look(mode,col,p,q,hc,hd,t);
  if(mode2>=0)a=mix(a,look(mode2,col,p,q,hc,hd,t),w);
  gl_FragColor=vec4(a,1.);
}`;
function artfxOK(){
  if(ARTFX.broken)return false;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
  if(ARTFX.gl)return true;
  try{
    const cv=document.createElement('canvas'),gl=cv.getContext('webgl',{premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
    if(!gl)throw 0;
    const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,FX_VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FX_FS));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw gl.getProgramInfoLog(pr);
    gl.useProgram(pr);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    ARTFX.loc=Object.fromEntries(['tex','box','res','time','amp','seed','mode','mode2'].map(k=>[k,gl.getUniformLocation(pr,k)]));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    ARTFX.gl=gl;ARTFX.cv=cv;
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();ARTFX.broken=true;[...ARTFX.targets].forEach(artfxDetach)});
    return true;
  }catch(e){ARTFX.broken=true;return false}
}
function artfxTexture(img){
  const gl=ARTFX.gl,key=img.currentSrc||img.src;
  let t=ARTFX.tex.get(key);
  if(!t){
    t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    // Throws for art the page may not read (opened from disk); then the effect stays off.
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(ARTFX.tex.size>24){const [k,old]=ARTFX.tex.entries().next().value;gl.deleteTexture(old);ARTFX.tex.delete(k)}
    ARTFX.tex.set(key,t);
  }
  return t;
}
// Start the effect on a card's art image, in its civilization's way (both, for a two-civilization card).
function artfxAttach(img,civ,civ2){
  if(!img||!(civ in FX_MODE)||!artfxOK())return null;
  for(const t of ARTFX.targets)if(t.img===img){t.leaving=0;return t}
  if(!img.complete||!img.naturalWidth){img.addEventListener('load',()=>artfxAttach(img,civ,civ2),{once:true});return null}
  const cv=document.createElement('canvas');cv.className='artfx';cv.setAttribute('aria-hidden','true');
  const t={img,cv,ctx:cv.getContext('2d'),mode:FX_MODE[civ],mode2:civ2 in FX_MODE&&civ2!==civ?FX_MODE[civ2]:-1,t0:performance.now(),seed:Math.random(),leaving:0};
  try{artfxTexture(img)}catch(e){ARTFX.broken=true;return null}
  img.after(cv);ARTFX.targets.add(t);
  if(!ARTFX.raf)ARTFX.raf=requestAnimationFrame(artfxFrame);
  return t;
}
// Fade the effect out, then remove its canvas.
function artfxRelease(t){if(t&&!t.leaving)t.leaving=performance.now()}
function artfxDetach(t){if(!t)return;t.cv.remove();ARTFX.targets.delete(t)}
function artfxFrame(now){
  ARTFX.raf=0;
  const gl=ARTFX.gl;if(!gl)return;
  for(const t of [...ARTFX.targets]){
    if(!t.img.isConnected){artfxDetach(t);continue}
    const amp=Math.min(1,(now-t.t0)/350)*(t.leaving?Math.max(0,1-(now-t.leaving)/250):1);
    if(t.leaving&&amp<=0){artfxDetach(t);continue}
    const r=t.img.getBoundingClientRect(),W=t.img.clientWidth,H=t.img.clientHeight;
    if(!W||!H||r.bottom<0||r.top>innerHeight)continue;
    const dpr=Math.min(2,devicePixelRatio||1),pw=Math.round(W*dpr),ph=Math.round(H*dpr);
    if(t.cv.width!==pw||t.cv.height!==ph){t.cv.width=pw;t.cv.height=ph}
    if(ARTFX.cv.width!==pw||ARTFX.cv.height!==ph){ARTFX.cv.width=pw;ARTFX.cv.height=ph}
    // The part of the image object-fit: cover shows, in texture coordinates (y up).
    const iw=t.img.naturalWidth,ih=t.img.naturalHeight,s=Math.max(W/iw,H/ih),fx=W/(iw*s),fy=H/(ih*s);
    let tex;try{tex=artfxTexture(t.img)}catch(e){artfxDetach(t);continue}
    gl.viewport(0,0,pw,ph);gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.uniform1i(ARTFX.loc.tex,0);gl.uniform4f(ARTFX.loc.box,(1-fx)/2,(1-fy)/2,(1+fx)/2,(1+fy)/2);
    gl.uniform2f(ARTFX.loc.res,pw,ph);gl.uniform1f(ARTFX.loc.time,(now-t.t0)/1000+t.seed*40);
    gl.uniform1f(ARTFX.loc.amp,amp);gl.uniform1f(ARTFX.loc.seed,t.seed);gl.uniform1i(ARTFX.loc.mode,t.mode);gl.uniform1i(ARTFX.loc.mode2,t.mode2);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    t.ctx.clearRect(0,0,pw,ph);t.ctx.drawImage(ARTFX.cv,0,0);
  }
  if(ARTFX.targets.size&&!document.hidden)ARTFX.raf=requestAnimationFrame(artfxFrame);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ARTFX.targets.size&&!ARTFX.raf)ARTFX.raf=requestAnimationFrame(artfxFrame)});
