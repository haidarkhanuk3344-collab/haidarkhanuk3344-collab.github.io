// The floppy disks on the desk (Felix, 17 Oct 2026: "other cute interactions for the other items on the desk").
// A click fidgets with the top disk, the way everyone did: it comes up off the stack and tips toward you, its metal shutter is
// flicked open and snaps shut on its spring, twice, and it is laid back down. The shutter slides along the disk's top edge, off
// to the side it has room on, as far as the real one travels.
//
// The three disks are one model, a mesh per material. At load the top disk's triangles (everything above the underside of its
// shell) are taken out of those meshes into meshes of their own, with the same materials and the same vertices, on a rig; the
// top disk's shutter gets a mesh to itself so it can slide. Nothing is added to what is drawn while it lies there but those few
// draws, and nothing runs.
//
// No imports: the page passes THREE in. createFloppy(THREE,{scene,root,interact,audio,view,reduce,live}) before the room's pick
// occluders and draw-call join are made. The page calls floppy.fidget() on a click and floppy.frame(dt) every frame. The stack
// answers the pointer as one box.
export function createFloppy(THREE,{scene,root,interact,audio,view,reduce=false,live=()=>{},name="gear_floppies"}){
  const V3=THREE.Vector3, M4=THREE.Matrix4;
  const group=root.getObjectByName(name);
  const parts=[]; group&&group.traverse(o=>{ if(o.isMesh&&o.geometry?.attributes?.position) parts.push(o); });
  const mname=o=>o.userData.mname||(Array.isArray(o.material)?o.material[0]:o.material)?.name||"";
  if(!parts.length) throw new Error("floppy: no "+name+" in the scene");
  scene.updateMatrixWorld(true);
  // the top disk's shell: the highest of the meshes that are a whole shell (the three share nothing but the model)
  const shells=parts.filter(o=>/^gear_floppy_(?!inner|tab)/.test(mname(o))).map(o=>({o,b:new THREE.Box3().setFromObject(o,true)})).sort((a,b)=>b.b.min.y-a.b.min.y);
  const shutters=parts.filter(o=>/shutter/.test(mname(o)));
  if(!shells.length||!shutters.length) throw new Error("floppy: the disks are not the model this was written for");
  const shell=shells[0], cut=shell.b.min.y-.00004, centre=shell.b.getCenter(new V3());

  // ---- the top disk out of the shared meshes
  const rig=new THREE.Group(); rig.name=name+"_top"; rig.position.copy(centre); scene.add(rig); rig.updateMatrixWorld(true);
  const tops=[], v=new V3(); let shut=null;
  for(const o of parts){
    const g=o.geometry, pos=g.attributes.position, ix=g.index, n=ix?ix.count:pos.count, at=i=>ix?ix.getX(i):i;
    const above=new Uint8Array(pos.count); for(let i=0;i<pos.count;i++) above[i]=v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld).y>cut?1:0;
    const up=[], rest=[]; for(let t=0;t+2<n;t+=3){ const a=at(t), b=at(t+1), c=at(t+2); (above[a]&&above[b]&&above[c]?up:rest).push(a,b,c); }
    if(!up.length) continue;
    let top=o;
    if(rest.length){   // some of each: the top disk's triangles go to a mesh of their own, on the same vertices
      const Ix=pos.count>65535?Uint32Array:Uint16Array, share=list=>{ const q=new THREE.BufferGeometry(); for(const k in g.attributes) q.setAttribute(k,g.attributes[k]); q.setIndex(new THREE.BufferAttribute(new Ix(list),1)); return q; };
      top=o.clone(false); top.name=o.name+"_top"; top.geometry=share(up); o.geometry=share(rest);
      // each half's own bounds, in the vertices' own numbers (what is drawn and what the pointer asks)
      for(const [q,list] of [[top.geometry,up],[o.geometry,rest]]){ const bb=new THREE.Box3(); for(const i of list) bb.expandByPoint(v.fromBufferAttribute(pos,i)); q.boundingBox=bb; q.boundingSphere=bb.getBoundingSphere(new THREE.Sphere()); }
      o.parent.add(top); top.updateMatrixWorld(true);
    }
    rig.attach(top); tops.push(top); if(/shutter/.test(mname(top))) shut=top;
  }
  if(!shut) throw new Error("floppy: the top disk has no shutter");
  const all=[...new Set([...parts,...tops])], info={kind:"floppy",label:"FLOPPY · FIDGET"};
  for(const o of all) interact.set(o,info);

  // ---- the stack is clicked as one box (the lower disks never move; the top one is back by the next click)
  { const first=parts.find(o=>!tops.includes(o))||parts[0], inv=new M4().copy(first.matrixWorld).invert(), bx=new THREE.Box3(), b=new THREE.Box3(), m=new M4();
    for(const o of all){ if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bx.union(b.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv,o.matrixWorld))); }
    const ray=new THREE.Ray(), at=new V3(), im=new M4();
    first.raycast=function(rc,hits){ if(ray.copy(rc.ray).applyMatrix4(im.copy(this.matrixWorld).invert()).intersectBox(bx,at)===null) return;
      const point=at.clone().applyMatrix4(this.matrixWorld), distance=rc.ray.origin.distanceTo(point); if(distance>=rc.near&&distance<=rc.far) hits.push({distance,point,object:this}); };
    for(const o of all) if(o!==first) o.raycast=()=>{}; }

  // ---- the shutter's way: along its long side (the disk's top edge), toward the disk's middle and as far past it as it sat
  // from it: the real one's slot ends up over the middle of the disk
  const sp=shut.geometry.attributes.position, si=shut.geometry.index, pts=[]; let cx=0, cz=0;
  for(let i=0;i<si.count;i++){ v.fromBufferAttribute(sp,si.getX(i)).applyMatrix4(shut.matrixWorld); pts.push(v.x,v.z); cx+=v.x; cz+=v.z; } cx/=si.count; cz/=si.count;
  let sxx=0, sxz=0, szz=0; for(let i=0;i<pts.length;i+=2){ const dx=pts[i]-cx, dz=pts[i+1]-cz; sxx+=dx*dx; sxz+=dx*dz; szz+=dz*dz; }
  const th=.5*Math.atan2(2*sxz,sxx-szz), way=new V3(Math.cos(th),0,Math.sin(th));
  let lo=Infinity, hi=-Infinity; for(let i=0;i<pts.length;i+=2){ const d=(pts[i]-centre.x)*way.x+(pts[i+1]-centre.z)*way.z; lo=Math.min(lo,d); hi=Math.max(hi,d); }
  const offc=(lo+hi)/2; if(offc>0) way.negate();
  const TRAVEL=Math.min(.024,Math.max(.014,2*Math.abs(offc)));
  const shutHome=shut.position.clone(), slide=way.clone().multiplyScalar(TRAVEL);   // (the rig stands as the world does while the disk lies: its own frame is the world's)

  // ---- sounds: the shutter's steel sliding and snapping back, the disk off the stack and back on it
  let noise=null; const P=new V3();
  function out(a){ const ctx=a.ctx, c=view?.(); let pan=.45, g=1;
    if(c){ P.copy(centre).applyMatrix4(c.matrixWorldInverse); const d=Math.max(.05,P.length()); pan=Math.max(-.75,Math.min(.75,P.x/d*.85)); g=Math.max(.7,Math.min(1.5,Math.sqrt(1.4/d))); }
    if(!noise){ noise=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const p=ctx.createStereoPanner(), o=ctx.createGain(); p.pan.value=pan; o.gain.value=g; o.connect(p).connect(a.out); if(a.verb){ const s=ctx.createGain(); s.gain.value=.22; p.connect(s).connect(a.verb); } return o; }
  function hit(a,o,t,f,q,amp,dur,att=.0015){ const ctx=a.ctx, s=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=noise; bp.type="bandpass"; bp.frequency.value=f; bp.Q.value=q;
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(amp,t+att); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(bp).connect(g).connect(o); s.start(t,Math.random()*.3); s.stop(t+dur+.05); }
  function thump(a,o,t,f,amp,dur){ const ctx=a.ctx, s=ctx.createOscillator(), g=ctx.createGain(); s.frequency.setValueAtTime(f,t); s.frequency.exponentialRampToValueAtTime(f*.6,t+dur);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(amp,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(g).connect(o); s.start(t); s.stop(t+dur+.05); }

  // ---- a fidget, in seconds from the click: up and toward you, the flicks, back down
  const UP=.24, FL={open:.075,hold:.1,shut:.04,gap:.13}, DOWN=.26, LIFT=.024, TILT=.34;
  const FLICKS=2, F0=UP+.06, FLEN=FL.open+FL.hold+FL.shut, T_DOWN=F0+FLICKS*FLEN+(FLICKS-1)*FL.gap+.1, TOTAL=T_DOWN+DOWN;
  const lean=new V3(1,0,0), q=new THREE.Quaternion(), home=rig.position.clone();
  let anim=null, n=0, now=()=>performance.now();   // (tests put their own clock here)
  const ease=x=>{ x=Math.min(1,Math.max(0,x)); return x*x*(3-2*x); };
  function fidget(){
    if(anim) return;
    n++; const a=audio?.();
    if(reduce){ if(a){ const o=out(a), t=a.ctx.currentTime; hit(a,o,t,5200,3,.1,.05,.02); hit(a,o,t+.14,2900,2.5,.2,.02); } return; }
    // tipped toward where you stand: about the level line across your view
    const c=view?.(); if(c){ c.updateMatrixWorld(); lean.set(1,0,0).transformDirection(c.matrixWorld); lean.y=0; if(lean.lengthSq()<1e-6) lean.set(1,0,0); lean.normalize(); }
    anim={w0:now()};
    if(a){ const o=out(a), t=a.ctx.currentTime;
      hit(a,o,t+.02,1400,1,.06,.12,.05);   // plastic sliding off plastic
      for(let i=0;i<FLICKS;i++){ const f=t+F0+i*(FLEN+FL.gap);
        hit(a,o,f,5200,3,.085,FL.open,FL.open*.5);   // the steel sliding
        hit(a,o,f+FL.open+FL.hold+FL.shut,3000,2.5,.22,.022); hit(a,o,f+FL.open+FL.hold+FL.shut,6800,5,.1,.012); thump(a,o,f+FL.open+FL.hold+FL.shut,420,.1,.03); }   // and snapping shut
      thump(a,o,t+TOTAL-.02,210,.13,.05); hit(a,o,t+TOTAL-.02,1700,2,.11,.03); }   // back on the stack
    if(n===1) live("You pick up the top floppy disk and flick its shutter.");
  }
  function frame(){
    if(!anim) return;
    const t=(now()-anim.w0)/1000;
    if(t>=TOTAL){ anim=null; rig.position.copy(home); rig.quaternion.identity(); shut.position.copy(shutHome); return; }
    const up=t<T_DOWN?ease(t/UP):1-ease((t-T_DOWN)/DOWN);
    rig.position.copy(home); rig.position.y+=LIFT*up; rig.quaternion.copy(q.setFromAxisAngle(lean,TILT*up));
    let s=0; for(let i=0;i<FLICKS;i++){ const x=t-(F0+i*(FLEN+FL.gap)); if(x<0||x>FLEN) continue;
      s=x<FL.open?ease(x/FL.open):x<FL.open+FL.hold?1:1-Math.pow((x-FL.open-FL.hold)/FL.shut,2); }
    shut.position.copy(shutHome).addScaledVector(slide,s);
  }
  return {fidget,frame,rig,shut,tops,parts:all,TOTAL,TRAVEL,way,set clock(f){ now=f; },get busy(){ return !!anim; },get n(){ return n; },
    get open(){ return shut.position.distanceTo(shutHome)/TRAVEL; },get lift(){ return rig.position.y-home.y; }};
}
