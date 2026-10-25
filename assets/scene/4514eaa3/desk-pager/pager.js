// The pager on the desk (Felix, 17 Oct 2026: "other cute interactions for the other items on the desk").
// A click is a page coming in: it buzzes twice on the wood and creeps a millimetre or two with each buzz, the way a pager on
// vibrate walks across a table, and its backlight comes on for a few seconds. The display keeps the number the scene printed
// on it: it shows no messages (Felix, 17 Oct 21:40Z: "the pager shouldn't actually show messages"; the first version put a
// number code on the display with each page and said in the tip what it meant). It never wanders more than half a centimetre
// from where it lay (its shadow in the desk's bake stays put).
//
// No imports: the page passes THREE in. createPager(THREE,{scene,root,interact,audio,view,reduce,live,anisotropy}) before the
// room's pick occluders and draw-call join are made (its parts are in the pick map, so the join leaves them alone). The page
// calls pager.page() on a click, pager.frame(dt) every frame, and shows pager.tip() over it. Nothing runs while it lies still.
// what the display shows: the number the scene printed on it (never in a tip or read out: it may be somebody's real number)
const REST="030 2481 07";
export function createPager(THREE,{scene,root,interact,audio,view,reduce=false,live=()=>{},anisotropy=1}){
  const V3=THREE.Vector3;
  const group=root.getObjectByName("gear_pager");
  const parts=[]; group&&group.traverse(o=>{ if(o.isMesh) parts.push(o); });
  if(!parts.length) throw new Error("pager: no gear_pager in the scene");
  const mname=o=>o.userData.mname||(Array.isArray(o.material)?o.material[0]:o.material)?.name||"";
  const lcd=parts.find(o=>mname(o).startsWith("gear_lcd")&&!mname(o).includes("segments")), digits=parts.find(o=>mname(o).includes("lcd_segments"));
  const LABEL="PAGER · BUZZ", info={kind:"pager",label:LABEL};
  for(const o of parts) interact.set(o,info);

  // ---- the rig: the pager as one thing, about the middle of its underside
  scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(group,true), mid=box.getCenter(new V3());
  const rig=new THREE.Group(); rig.name="gear_pager_rig"; rig.position.set(mid.x,box.min.y,mid.z); scene.add(rig); rig.updateMatrixWorld(true);
  rig.attach(group);
  const home=rig.position.clone();

  // ---- clicked as a whole: one box for the pointer instead of its 1,800 triangles (the page's pick is script, and slow with the JIT off)
  { const first=parts[0], inv=new THREE.Matrix4().copy(first.matrixWorld).invert(), bx=new THREE.Box3(), b=new THREE.Box3(), m=new THREE.Matrix4();
    for(const o of parts){ if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bx.union(b.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv,o.matrixWorld))); }
    const ray=new THREE.Ray(), at=new V3(), im=new THREE.Matrix4();
    first.raycast=function(rc,hits){ if(ray.copy(rc.ray).applyMatrix4(im.copy(this.matrixWorld).invert()).intersectBox(bx,at)===null) return;
      const point=at.clone().applyMatrix4(this.matrixWorld), distance=rc.ray.origin.distanceTo(point); if(distance>=rc.near&&distance<=rc.far) hits.push({distance,point,object:this}); };
    for(const o of parts) if(o!==first) o.raycast=()=>{}; }

  // ---- the display: the scene's printed digits give way to a sheet of segments over the glass (ink that only darkens what is
  // under it, so it keeps to the room's light), and a backlight under the ink
  let ink=null, glow=null, cv=null, tex=null, shown="";
  const SEG={"0":"abcdef","1":"bc","2":"abged","3":"abgcd","4":"fgbc","5":"afgcd","6":"afgedc","7":"abc","8":"abcdefg","9":"abcdfg","-":"g"," ":""};
  function draw(text){
    shown=text; if(!cv) return;
    const g=cv.getContext("2d"), W=cv.width, H=cv.height; g.setTransform(1,0,0,1,0,0); g.fillStyle="#fff"; g.fillRect(0,0,W,H);
    const cw=W/12.6, ch=H*.56, t=ch*.13, x0=W*.045, y0=H*.2; g.fillStyle="rgb(58,66,50)"; g.transform(1,0,-.09,1,H*.045,0);
    const hz=(x,y,w)=>{ g.beginPath(); g.moveTo(x+t*.65,y); g.lineTo(x+w-t*.65,y); g.lineTo(x+w-t*.15,y+t*.5); g.lineTo(x+w-t*.65,y+t); g.lineTo(x+t*.65,y+t); g.lineTo(x+t*.15,y+t*.5); g.closePath(); g.fill(); };
    const vt=(x,y,l)=>{ g.beginPath(); g.moveTo(x,y+t*.65); g.lineTo(x+t*.5,y+t*.15); g.lineTo(x+t,y+t*.65); g.lineTo(x+t,y+l-t*.65); g.lineTo(x+t*.5,y+l-t*.15); g.lineTo(x,y+l-t*.65); g.closePath(); g.fill(); };
    [...text].slice(0,12).forEach((c,i)=>{ const on=SEG[c]??"", x=x0+i*cw, w=cw*.74, m=(ch-t)/2;
      if(on.includes("a")) hz(x,y0,w); if(on.includes("g")) hz(x,y0+m,w); if(on.includes("d")) hz(x,y0+ch-t,w);
      if(on.includes("f")) vt(x,y0,m+t); if(on.includes("b")) vt(x+w-t,y0,m+t); if(on.includes("e")) vt(x,y0+m,m+t); if(on.includes("c")) vt(x+w-t,y0+m,m+t); });
    tex.needsUpdate=true;
  }
  if(lcd){
    // the glass's top face, in world terms: its middle, the way its long side runs (reading left to right from the chair)
    const p=lcd.geometry.attributes.position, v=new V3(), pts=[]; let cx=0, cz=0, top=-Infinity;
    for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i).applyMatrix4(lcd.matrixWorld); pts.push(v.x,v.z); cx+=v.x; cz+=v.z; top=Math.max(top,v.y); }
    cx/=p.count; cz/=p.count; let sxx=0, sxz=0, szz=0;
    for(let i=0;i<pts.length;i+=2){ const dx=pts[i]-cx, dz=pts[i+1]-cz; sxx+=dx*dx; sxz+=dx*dz; szz+=dz*dz; }
    const th=.5*Math.atan2(2*sxz,sxx-szz), u=new V3(Math.cos(th),0,Math.sin(th)); if(u.x<0) u.negate();
    const w=new V3(0,1,0).cross(u), n=new V3(0,1,0); let hu=0, hw=0;
    for(let i=0;i<pts.length;i+=2){ const dx=pts[i]-cx, dz=pts[i+1]-cz; hu=Math.max(hu,Math.abs(dx*u.x+dz*u.z)); hw=Math.max(hw,Math.abs(dx*w.x+dz*w.z)); }
    cv=document.createElement("canvas"); cv.width=512; cv.height=Math.max(64,Math.round(512*hw/hu));
    tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=anisotropy;
    const geo=new THREE.PlaneGeometry(hu*2,hw*2), M=new THREE.Matrix4().makeBasis(u,w,n).setPosition(cx,top+.00012,cz);
    const off={depthWrite:false,toneMapped:false,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2};
    glow=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:"#7dffb4",blending:THREE.AdditiveBlending,opacity:0,...off}));
    ink=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,blending:THREE.MultiplyBlending,premultipliedAlpha:true,...off}));
    for(const [o,name,order] of [[glow,"gear_pager_light",3],[ink,"gear_pager_ink",4]]){ o.name=name; o.renderOrder=order; o.raycast=()=>{}; o.castShadow=o.receiveShadow=false;
      scene.add(o); o.applyMatrix4(M); o.updateMatrixWorld(true); rig.attach(o); }
    glow.visible=false;
    if(digits) digits.visible=false;
    draw(REST);
  }

  // ---- sound: the motor's buzz, and the case chattering on the desk at the motor's rate
  const P=new V3(); let noise=null;
  function where(){ const c=view?.(); if(!c) return {pan:.1,g:1};
    P.copy(rig.position).applyMatrix4(c.matrixWorldInverse); const d=Math.max(.05,P.length());
    return {pan:Math.max(-.75,Math.min(.75,P.x/d*.85)),g:Math.max(.7,Math.min(1.5,Math.sqrt(1.3/d)))}; }
  function buzz(a,t0,bursts){
    const ctx=a.ctx, w=where(), pan=ctx.createStereoPanner(), bus=ctx.createGain(); pan.pan.value=w.pan; bus.gain.value=w.g*.55; bus.connect(pan).connect(a.out);
    if(a.verb){ const s=ctx.createGain(); s.gain.value=.12; pan.connect(s).connect(a.verb); }
    if(!noise){ noise=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    for(const [s,e] of bursts){ const t=Math.max(ctx.currentTime,t0+s), d=e-s;
      const env=g=>{ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(1,t+.035); g.gain.setValueAtTime(1,t+d-.05); g.gain.exponentialRampToValueAtTime(.0001,t+d); return g; };
      const f=p=>{ p.setValueAtTime(128,t); p.linearRampToValueAtTime(168,t+.07); p.setValueAtTime(168,t+d-.06); p.linearRampToValueAtTime(118,t+d); };
      const o=ctx.createOscillator(), lp=ctx.createBiquadFilter(), og=ctx.createGain(), e1=env(ctx.createGain()); o.type="sawtooth"; f(o.frequency); lp.type="lowpass"; lp.frequency.value=620; og.gain.value=.2;
      o.connect(lp).connect(og).connect(e1).connect(bus); o.start(t); o.stop(t+d+.05);
      const n=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), ng=ctx.createGain(), m=ctx.createOscillator(), md=ctx.createGain(), e2=env(ctx.createGain());
      n.buffer=noise; n.loop=true; bp.type="bandpass"; bp.frequency.value=2300; bp.Q.value=1.1; ng.gain.value=.05; m.type="square"; f(m.frequency); md.gain.value=.05;
      m.connect(md).connect(ng.gain); n.connect(bp).connect(ng).connect(e2).connect(bus); n.start(t,Math.random()*.3); n.stop(t+d+.05); m.start(t); m.stop(t+d+.05); }
  }

  // ---- a page: two buzzes, the light, the message. The picture runs on the time since the click, as the sound does
  const BURSTS=reduce?[]:[[0,.38],[.56,.94]], LIT=5, FADE=.7, STEP=.0011, REACH=.005;
  let now=()=>performance.now();   // (tests put their own clock here)
  let k=-1, anim=null, queued=0, off=new V3(), yaw=0, from=new V3(), to=new V3(), yaw0=0, yaw1=0, lit=0;
  const animT=()=>anim?(now()-anim.w0)/1000:0;
  function start(){
    k=(k+1)%5;
    const a=audio?.(); if(a&&BURSTS.length) buzz(a,a.ctx.currentTime,BURSTS);
    // where this page's two buzzes walk it: a new way each time, and back toward its place once it has strayed
    const far=Math.hypot(off.x,off.z)>REACH*.6, ang=far?Math.atan2(-off.z,-off.x)+(Math.random()-.5)*.6:k*2.4+Math.random();
    from.copy(off); to.set(off.x+Math.cos(ang)*STEP*2,0,off.z+Math.sin(ang)*STEP*2); yaw0=yaw; yaw1=yaw+(k%2?-1:1)*(.02+Math.random()*.02); if(Math.abs(yaw1)>.12) yaw1=yaw0*.6;
    anim={w0:now(),t:0}; if(glow) glow.visible=true;
    live("The pager buzzes.");
  }
  function page(){ if(anim&&animT()<(BURSTS.at(-1)?.[1]??.15)){ queued=Math.min(2,queued+1); return; } start(); }
  const tip=()=>LABEL;
  function frame(){
    if(!anim) return;
    const t=anim.t=animT(), end=BURSTS.at(-1)?.[1]??0;
    // how far along its walk: it moves only while the motor runs
    let done=0, on=false; for(const [s,e] of BURSTS){ done+=Math.min(1,Math.max(0,(t-s)/(e-s)))/BURSTS.length; if(t>=s&&t<e) on=true; }
    if(BURSTS.length){ off.lerpVectors(from,to,done); yaw=yaw0+(yaw1-yaw0)*done;
      const j=on?1:0; rig.position.set(home.x+off.x+j*.00022*Math.sin(t*232),home.y+j*.00012*Math.abs(Math.sin(t*405)),home.z+off.z+j*.00022*Math.sin(t*333+1));
      rig.rotation.set(j*.006*Math.sin(t*287),yaw+j*.004*Math.sin(t*258),j*.006*Math.sin(t*311+2)); }
    if(glow){ const f=t<.08?t/.08:t<LIT?1:Math.max(0,1-(t-LIT)/FADE); glow.material.opacity=lit=.34*f*(on?.9+.1*Math.sin(t*90):1); }
    if(t>=end&&queued){ queued--; start(); }
    else if(t>=LIT+FADE){ anim=null; if(glow){ glow.visible=false; glow.material.opacity=lit=0; } }
  }
  return {page,frame,tip,rig,parts,set clock(f){ now=f; },
    get busy(){ const t=animT(); return !!anim&&(t<(BURSTS.at(-1)?.[1]??0)+.1||t>LIT-.1); },   // (full frame rate for the buzz and the light's fade, not the seconds between)
    get shown(){ return shown; },get lit(){ return lit; },get n(){ return k+1; },get anim(){ return anim&&{t:animT()}; },
    get offset(){ return {x:rig.position.x-home.x,z:rig.position.z-home.z,yaw}; }};
}
