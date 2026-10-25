// The pencil on the A4 sheets (Felix, 17 Oct 2026: "other cute interactions for the other items on the desk").
// A click nudges it: it rolls three of its six sides across the paper, each side landing with a tick, slower each time, stops,
// and rolls the same three sides back to where it lay (the sheets aren't quite level). It ends as it began, so its baked light
// fits again, and its contact shadow goes with it.
//
// No imports: the page passes THREE in. createPencil(THREE,{scene,root,interact,audio,view,reduce,live}) after the notepad
// (which lays the pencil on the A4 sheets and gives it its contact shadow) and before the room's pick occluders and draw-call
// join. The page calls pencil.nudge() on a click and pencil.frame(dt) every frame. Nothing runs while it lies still.
export function createPencil(THREE,{scene,root,interact,audio,view,reduce=false,live=()=>{},name="stationery_supplies_pencil_used",sides=3}){
  const V3=THREE.Vector3;
  const obj=root.getObjectByName(name);
  if(!obj||!obj.isMesh) throw new Error("pencil: no "+name+" in the scene");
  const info={kind:"pencil",label:"PENCIL · NUDGE"};
  interact.set(obj,info);
  scene.updateMatrixWorld(true);

  // ---- its axis: the middles of its two ends (its points furthest apart along the way it lies), and how thick it is
  const p=obj.geometry.attributes.position, pts=[], v=new V3(); let c=new V3();
  for(let i=0;i<p.count;i++){ pts.push(v.fromBufferAttribute(p,i).applyMatrix4(obj.matrixWorld).clone()); c.add(v); } c.divideScalar(pts.length);
  let sxx=0, sxz=0, szz=0; for(const q of pts){ const dx=q.x-c.x, dz=q.z-c.z; sxx+=dx*dx; sxz+=dx*dz; szz+=dz*dz; }
  const th=.5*Math.atan2(2*sxz,sxx-szz), lie=new V3(Math.cos(th),0,Math.sin(th)), along=q=>(q.x-c.x)*lie.x+(q.z-c.z)*lie.z;
  const sorted=[...pts].sort((a,b)=>along(a)-along(b)), m=Math.max(3,Math.round(pts.length*.06));
  const endA=new V3(), endB=new V3(); for(let i=0;i<m;i++){ endA.add(sorted[i]); endB.add(sorted[sorted.length-1-i]); } endA.divideScalar(m); endB.divideScalar(m);
  const axis=endB.clone().sub(endA).normalize(), mid=endA.clone().add(endB).multiplyScalar(.5);
  const rad=pts.map(q=>{ const d=q.clone().sub(endA); return d.sub(axis.clone().multiplyScalar(d.dot(axis))).length(); }).sort((a,b)=>a-b);
  const R=Math.min(.0048,Math.max(.003,rad[Math.floor(rad.length*.9)]));   // across its corners, near enough
  // it rolls across itself, level, to the right as seen from the chair (the floppy disks are on its left)
  const roll=new V3(0,1,0).cross(axis); roll.y=0; roll.normalize(); if(roll.x<0) roll.negate();
  const turn=axis.clone(); if(new V3().crossVectors(turn,new V3(0,1,0)).dot(roll)<0) turn.negate();   // (rolling toward `roll` turns it about up x roll)

  const rig=new THREE.Group(); rig.name=name+"_rig"; rig.position.copy(mid); scene.add(rig); rig.updateMatrixWorld(true); rig.attach(obj);
  const home=rig.position.clone(), q=new THREE.Quaternion();
  let shadow=null, shadowHome=null;

  // ---- sound: a side of painted wood landing on paper
  let noise=null; const P=new V3();
  function tick(a,amp){ const ctx=a.ctx, t=ctx.currentTime, cam=view?.(); let pan=.5;
    if(cam){ P.copy(rig.position).applyMatrix4(cam.matrixWorldInverse); pan=Math.max(-.75,Math.min(.75,P.x/Math.max(.05,P.length())*.85)); }
    if(!noise){ noise=ctx.createBuffer(1,ctx.sampleRate*.3,ctx.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const pn=ctx.createStereoPanner(); pn.pan.value=pan; pn.connect(a.out); if(a.verb){ const s=ctx.createGain(); s.gain.value=.2; pn.connect(s).connect(a.verb); }
    const s=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=noise; bp.type="bandpass"; bp.frequency.value=2500+Math.random()*500; bp.Q.value=2.2;
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(amp,t+.0015); g.gain.exponentialRampToValueAtTime(.0001,t+.016); s.connect(bp).connect(g).connect(pn); s.start(t,Math.random()*.2); s.stop(t+.06);
    const o=ctx.createOscillator(), og=ctx.createGain(); o.frequency.setValueAtTime(520,t); o.frequency.exponentialRampToValueAtTime(330,t+.03);
    og.gain.setValueAtTime(.0001,t); og.gain.exponentialRampToValueAtTime(amp*.5,t+.002); og.gain.exponentialRampToValueAtTime(.0001,t+.03); o.connect(og).connect(pn); o.start(t); o.stop(t+.06); }

  // ---- a nudge: `sides` sides out, a breath, the same back. Each side takes longer than the one before (out) or less (back)
  const OUT=[.075,.095,.13,.17,.2,.24].slice(0,sides), PAUSE=.22, BACK=[...OUT].reverse().map(d=>d*1.25);
  const plan=[]; { let t=0; OUT.forEach((d,i)=>{ plan.push({t0:t,d,from:i,to:i+1}); t+=d; }); t+=PAUSE; BACK.forEach((d,i)=>{ plan.push({t0:t,d,from:sides-i,to:sides-i-1}); t+=d; }); }
  const TOTAL=plan.at(-1).t0+plan.at(-1).d;
  let anim=null, n=0, now=()=>performance.now();   // (tests put their own clock here)
  function pose(s){   // s: sides rolled so far (a real number)
    const whole=Math.floor(s), f=s-whole, ang=s*Math.PI/3;
    // over each corner the middle rises and comes down again
    const lift=R*(Math.cos((f-.5)*Math.PI/3)-Math.cos(Math.PI/6));
    rig.position.copy(home).addScaledVector(roll,s*R); rig.position.y+=lift;
    rig.quaternion.copy(q.setFromAxisAngle(turn,ang));
    if(shadow){ shadow.position.copy(shadowHome).addScaledVector(roll,s*R); }
  }
  function nudge(){
    if(anim) return;
    n++; if(reduce){ const a=audio?.(); if(a) tick(a,.1); return; }
    shadow=scene.getObjectByName(name+"_contact")||null; if(shadow&&!shadowHome) shadowHome=shadow.position.clone();
    anim={w0:now(),done:0};
    if(n===1) live("The pencil rolls a little way across the paper and back.");
  }
  function frame(){
    if(!anim) return;
    const t=(now()-anim.w0)/1000;
    let s=0, done=0; for(const st of plan){ if(t<st.t0) break; const x=Math.min(1,(t-st.t0)/st.d); s=st.from+(st.to-st.from)*(x*x*(3-2*x)*.4+x*.6); if(x>=1) done++; }
    if(done>anim.done){ const a=audio?.(); if(a) tick(a,.11*Math.pow(.88,done-1)); anim.done=done; }   // a side has landed
    if(t>=TOTAL){ pose(0); anim=null; return; }
    pose(s);
  }
  return {nudge,frame,rig,obj,R,roll,axis,TOTAL,set clock(f){ now=f; },get busy(){ return !!anim; },get n(){ return n; },
    get offset(){ return rig.position.clone().sub(home).dot(roll); }};
}
