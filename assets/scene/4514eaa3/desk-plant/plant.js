// The plant on the desk (Felix, 17 Oct 2026: "other cute interactions for the other items on the desk").
// A click brushes it: the leaves give way from where you stand, swing back and forth a few times and come to rest, with a soft
// rustle. Clicks add up, so a few quick ones shake it properly. It is the leaves as one piece swaying about the top of the pot on
// two springs (a slow one and a quicker one across it), a few degrees at most, so their baked light still fits.
//
// No imports: the page passes THREE in. createPlant(THREE,{scene,root,interact,audio,view,reduce,live}) before the room's pick
// occluders and draw-call join are made. The page calls plant.brush() on a click and plant.frame(dt) every frame. Nothing runs
// while the leaves are still. The pot answers the pointer as one box; the leaves as they are drawn.
export function createPlant(THREE,{scene,root,interact,audio,view,reduce=false,live=()=>{},name="potted_plant_02"}){
  const V3=THREE.Vector3;
  const find=re=>{ const out=[]; root.traverse(o=>{ if(o.isMesh&&re.test(o.name)) out.push(o); }); return out; };
  const leaves=find(new RegExp("^"+name+"_leaves")), pots=find(new RegExp("^"+name+"_pot"));
  if(!leaves.length) throw new Error("plant: no "+name+"_leaves in the scene");
  const info={kind:"plant",label:"PLANT · RUSTLE"};
  for(const o of [...leaves,...pots]) interact.set(o,info);
  scene.updateMatrixWorld(true);

  // ---- the rig: the leaves turn about the middle of the pot's mouth (or their own foot, without a pot)
  const lb=new THREE.Box3(); leaves.forEach(o=>lb.expandByObject(o,true));
  const pb=new THREE.Box3(); pots.forEach(o=>pb.expandByObject(o,true));
  const foot=pots.length?new V3((pb.min.x+pb.max.x)/2,pb.max.y-.01,(pb.min.z+pb.max.z)/2):new V3((lb.min.x+lb.max.x)/2,lb.min.y,(lb.min.z+lb.max.z)/2);
  const rig=new THREE.Group(); rig.name=name+"_rig"; rig.position.copy(foot); scene.add(rig); rig.updateMatrixWorld(true);
  for(const o of leaves) rig.attach(o);
  const crown=lb.getCenter(new V3());   // where the rustle comes from

  // ---- the pot is clicked as one box
  for(const o of pots){ const g=o.geometry; if(!g.boundingBox) g.computeBoundingBox(); const bx=g.boundingBox, ray=new THREE.Ray(), at=new V3(), im=new THREE.Matrix4();
    o.raycast=function(rc,hits){ if(ray.copy(rc.ray).applyMatrix4(im.copy(this.matrixWorld).invert()).intersectBox(bx,at)===null) return;
      const point=at.clone().applyMatrix4(this.matrixWorld), distance=rc.ray.origin.distanceTo(point); if(distance>=rc.near&&distance<=rc.far) hits.push({distance,point,object:this}); }; }

  // ---- two damped springs: along the push (slow) and across it (quicker), each an angle and its speed
  const S=[{a:0,v:0,w:2*Math.PI*1.7,z:.11},{a:0,v:0,w:2*Math.PI*2.5,z:.14}], MAX=.075;
  const push=new V3(0,0,-1), side=new V3(1,0,0), ax=new V3(), q1=new THREE.Quaternion(), q2=new THREE.Quaternion();
  let moving=false, n=0;
  // ---- the rustle: a few short breaths of high noise, uneven, dying away
  let noise=null; const P=new V3();
  function rustle(a,strength){
    const ctx=a.ctx, c=view?.(); let pan=-.4, gain=1;
    if(c){ P.copy(crown).applyMatrix4(c.matrixWorldInverse); const d=Math.max(.05,P.length()); pan=Math.max(-.75,Math.min(.75,P.x/d*.85)); gain=Math.max(.7,Math.min(1.5,Math.sqrt(1.6/d))); }
    if(!noise){ noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const p=ctx.createStereoPanner(); p.pan.value=pan; p.connect(a.out); if(a.verb){ const s=ctx.createGain(); s.gain.value=.25; p.connect(s).connect(a.verb); }
    let t=ctx.currentTime;
    for(let i=0;i<5;i++){ const dur=.07+Math.random()*.09, amp=.085*gain*strength*Math.pow(.72,i)*(.7+Math.random()*.6);
      const s=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), hp=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=noise;
      bp.type="bandpass"; bp.frequency.value=3200+Math.random()*2600; bp.Q.value=.7; hp.type="highpass"; hp.frequency.value=1800;
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(amp,t+dur*.35); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      s.connect(bp).connect(hp).connect(g).connect(p); s.start(t,Math.random()*.8); s.stop(t+dur+.05); t+=dur*(.55+Math.random()*.5); }
  }
  function brush(){
    n++;
    // pushed away from where you stand (level), a little to one side
    const c=view?.(); if(c&&!moving){ push.copy(foot).sub(c.position); push.y=0; if(push.lengthSq()<1e-6) push.set(0,0,-1); push.normalize(); side.set(-push.z,0,push.x); }
    const a=audio?.(); if(a) rustle(a,Math.min(1.3,.8+.15*n));
    if(reduce){ live("The plant's leaves rustle."); return; }
    S[0].v+=.55+Math.random()*.2; S[1].v+=(Math.random()<.5?-1:1)*(.25+Math.random()*.2); moving=true;
    if(n===1) live("The plant's leaves rustle.");
  }
  function frame(dt){
    if(!moving) return;
    let still=true;
    for(const s of S){ for(let h=dt;h>1e-6;h-=.008){ const k=Math.min(.008,h); s.v+=(-s.w*s.w*s.a-2*s.z*s.w*s.v)*k; s.a+=s.v*k; }
      if(s.a>MAX){ s.a=MAX; s.v=Math.min(0,s.v); } else if(s.a<-MAX){ s.a=-MAX; s.v=Math.max(0,s.v); }
      if(Math.abs(s.a)<3e-4&&Math.abs(s.v)<3e-3) s.a=s.v=0; else still=false; }
    // leaning along the push is a turn about the level axis across it, and the other way round
    q1.setFromAxisAngle(side,S[0].a); q2.setFromAxisAngle(ax.copy(push).negate(),S[1].a); rig.quaternion.copy(q1).multiply(q2);
    if(still){ moving=false; n=0; rig.quaternion.identity(); }
  }
  return {brush,frame,rig,leaves,pots,get busy(){ return moving; },get lean(){ return [S[0].a,S[1].a]; },get n(){ return n; }};
}
