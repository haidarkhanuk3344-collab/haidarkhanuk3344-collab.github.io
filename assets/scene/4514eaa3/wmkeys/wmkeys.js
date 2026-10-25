// The radio cassette player's five keys work (Felix, 21 Oct 18:33Z, once the tape had his voice on it: "oh and if we're doing
// this, we should enable the buttons on the walkman :)"). They are the piano keys along its top: STOP, REW, PLAY, FF, DIR.
// With the Podcasts tape in the player:
//   PLAY  goes down and stays down while the tape runs (also when the tape was started any other way)
//   STOP  stops the tape, or the winding; the card stays up
//   REW, FF  wind the tape: the key stays down, the hubs spin fast, the motor whirrs, and at the tape's end the deck stops by
//         itself and the key jumps back up. PLAY then goes on from there
//   DIR   the other side: a double clunk, the hubs turn the other way, the talk goes on from the same place on the tape
// With no tape in it a key just clicks, and the click opens Podcasts as a click on the player always did.
// And the BAND switch on its right flank slides between FM ST, FM and AM (Felix, 21 Oct 22:54Z, of a close-up of it: "it won't
// do anything but i'd love to let users fiddle with this button on the walkman"): a click moves it on a place (down, then
// back up), a drag slides it, and it clicks into each place. Nothing else changes. With Podcasts open, like the wheels.
// Every key has its click (deckSound, below), and so has the cassette door, shutting and springing open: the module watches
// the door interviews.js moves, and lays its click over that module's own quiet one.
//
// And the two thumbwheels on its left flank turn (Felix, 21 Oct 22:03Z: "Also make the wheels on the side of it work - i think
// one of them should be for volume"): the upper one, printed VOL, is the talk's volume (chatter.level), the lower one, printed
// TUNING, moves the red needle along the dial at the foot of the front (the radio is not on while a tape plays: no sound of
// its own). A drag up or down turns a wheel, a click turns it on by a fifth, as the TV's knobs do. With Podcasts open only.
//
// The keys are part of the player's model, in four of its meshes (key plastic, the aluminium PLAY key, their two prints). Before
// the room joins its meshes for drawing they are cut out of those (what is left is drawn as before) into one small mesh per
// material, with the bake's own materials and light-map UVs, and a pressed key is those vertices moved 2 mm down. Where they
// are comes from the model (walkman/tools/walkman2.py), in the player's own frame, which the tape's hubs give.
//
// createWalkmanKeys(THREE, ctx) returns the controller, or null when the room has no player with hubs:
//   ctx.scene, ctx.root   the room
//   ctx.interviews        the player's controller (interviews/interviews.js): playing, play(on), seat, hubs
//   ctx.chatter()         the talk's controller once it is there (chatter/chatter.js): seek(seconds), flip(); may be null
//   ctx.open()            is Podcasts open (the tape in or on its way in, the card up)
//   ctx.enabled()         may keys be pressed (not on a phone's layout: there a tap on the player is the player)
//   ctx.audio()           {ctx, out} while the room has sound, else null
//   ctx.reduce            prefers-reduced-motion: keys jump, hubs don't spin
// The controller: press(ray) for a click on the player (a THREE.Ray in the world; true if a key took it), tip(ray) the hover
// label or null, frame(dt) once a frame after the player's own, busy, and for tests keyAt(ray), spot(i) (a point on key i's
// top, in the world), depth (mm, per key), wind, side. For the wheels: grab(ray, e) at a press (true if a wheel took it),
// then drag(e) and release(e); wheelAt(ray), wheelSpot(i), wheel (the two values, 0..1), level (what VOL makes of the talk).
// tvQuiet: the deck runs (plays or winds, and for .6 s after), which is when the page holds the TV's sound down.
const NAMES=["STOP","REWIND","PLAY","FAST FORWARD","OTHER SIDE"], STOP=0, REW=1, PLAY=2, FF=3, DIR=4;
// the model, in metres, x to the right, y up from the player's foot, z out of its door: five keys 18 mm apart, each
// 15.5 x 5 x 11.5, their tops 3.6 mm over the case (82); the hubs' line is 53.5 up and 12.8 out
const KX=[-.036,-.018,0,.018,.036], KW=.00775, KY=[.0806,.0856], KZ=[.00025,.01175], TOP=.082, HUB_Y=.0535, HUB_Z=.0128;
const TRAVEL=.002, PULSE=.12, WIND=15, WHUB=[26,21], TAU=Math.PI*2;   // (WIND: seconds of tape a second; WHUB: rad/s)
// the case is 114 x 82 x 31, centred in x and z. The thumbwheels: 4.2 thick, their axles 5.8 inside the left flank, so 3.7
// (VOL, r 9.5, 56 up) and 2.7 (TUNING, r 8.5, 25 up) of each stands out of its slot. The dial's needle runs from x -31 to 36
const HW=.057, HD=.0155, WX=-HW+.0058, WHEELS=[{name:"VOLUME",y:.056,r:.0095,v:.6},{name:"TUNING",y:.025,r:.0085,v:.47}], SX=[-.031,.036];
// the BAND switch: a knob 2.6 x 4.4 x 3.6 on the right flank, 53.5 up and 2 toward the door, in a slot it can go 8.7 down
const BAND={x:HW+.0011,y:.0535,z:.002,step:.00435,names:["FM ST","FM","AM"]};
const WTURN=4.2, VOL=0, TUNE=1;   // (WTURN: radians of wheel from one end to the other)

// ---- the deck's sounds (Felix, 21 Oct 22:34Z: "closing the walkman should come with some satisfying click sounds pls", "same
// for the buttons"). A click that satisfies is three things at once: a hard edge (a few ms of bright noise, at full level from
// its first sample), the part ringing (two short tones, the plastic's), and the weight behind it (a low thump); and then, a
// moment later, the mechanism answering (a smaller, higher click: the latch catching, the key's lock dropping in).
//   key   a piano key pushed down to its lock      up    a key let go by its lock, jumping up
//   end   the deck stopping itself at the tape's end (the mechanism trips, the key jumps)
//   dir   the head turning over                    tick  a thumbwheel's notch       switch  the band switch in a place
//   door  the cassette door pushed home on its catch            open  the door let go by its catch, springing open
export function deckSound(ac,out,kind,nb,t){
  const edge=(dt,amp,hp,dur)=>{ const s=ac.createBufferSource(), fl=ac.createBiquadFilter(), g=ac.createGain(); s.buffer=nb; fl.type="highpass"; fl.frequency.value=hp;
    g.gain.setValueAtTime(amp,t+dt); g.gain.exponentialRampToValueAtTime(.0001,t+dt+dur); s.connect(fl).connect(g).connect(out); s.start(t+dt,Math.random()*.5); s.stop(t+dt+dur+.02); };
  const ring=(dt,f,amp,dur)=>{ const o=ac.createOscillator(), g=ac.createGain(); o.type="triangle"; o.frequency.value=f;
    g.gain.setValueAtTime(amp,t+dt); g.gain.exponentialRampToValueAtTime(.0001,t+dt+dur); o.connect(g).connect(out); o.start(t+dt); o.stop(t+dt+dur+.02); };
  const thump=(dt,f,amp,dur)=>{ const o=ac.createOscillator(), g=ac.createGain(); o.type="sine"; o.frequency.setValueAtTime(f*1.8,t+dt); o.frequency.exponentialRampToValueAtTime(f,t+dt+.03);
    g.gain.setValueAtTime(amp,t+dt); g.gain.exponentialRampToValueAtTime(.0001,t+dt+dur); o.connect(g).connect(out); o.start(t+dt); o.stop(t+dt+dur+.02); };
  if(kind==="key"){ edge(0,.26,2600,.012); ring(0,1380,.1,.03); ring(0,2950,.05,.018); thump(0,150,.28,.09); edge(.04,.12,3800,.008); ring(.04,820,.06,.04); }
  else if(kind==="up"){ edge(0,.3,3200,.01); ring(0,1750,.12,.025); thump(.004,190,.2,.05); }
  else if(kind==="end"){ thump(0,120,.3,.1); edge(0,.24,2200,.014); ring(0,1100,.09,.04); edge(.06,.19,3400,.01); ring(.06,1750,.08,.025); thump(.064,190,.12,.05); }
  else if(kind==="switch"){ edge(0,.17,3400,.007); ring(0,2050,.07,.016); thump(0,250,.1,.035); }
  else if(kind==="tick"){ edge(0,.05,4200,.006); ring(0,3300,.02,.01); }
  else if(kind==="dir"){ edge(0,.22,2500,.012); ring(0,1250,.09,.03); thump(0,150,.22,.08); edge(.09,.22,2000,.014); ring(.09,960,.1,.04); thump(.09,115,.26,.09); }
  else if(kind==="door"){ thump(0,135,.32,.11); edge(0,.28,1900,.016); ring(0,640,.12,.06); ring(0,1520,.07,.035); edge(.045,.22,4200,.007); ring(.045,2400,.06,.02); edge(.085,.05,5200,.006); }
  else if(kind==="open"){ edge(0,.32,3000,.01); ring(0,980,.13,.05); thump(.006,165,.26,.08); ring(.02,410,.05,.12); }
}

export function createWalkmanKeys(THREE, ctx){
  const iv=ctx.interviews, V3=THREE.Vector3; if(!iv?.hubs||iv.hubs.length<2) return null;
  const hubs=iv.hubs, mid=hubs[0].mesh.position.clone().add(hubs[1].mesh.position).multiplyScalar(.5);
  const right=new V3(1,0,0).applyQuaternion(hubs[0].base), up=new V3(0,1,0).applyQuaternion(hubs[0].base), n=new V3(0,0,1).applyQuaternion(hubs[0].base);
  const _d=new V3(), _l=new V3(), _o=new V3(), _v=new V3(), _q=new THREE.Quaternion(), _z=new V3(0,0,1);
  const loc=(p,o)=>{ _d.subVectors(p,mid); return o.set(_d.dot(right),_d.dot(up)+HUB_Y,_d.dot(n)+HUB_Z); };
  const keyOf=l=>{ if(l.y<KY[0]-.0002||l.y>KY[1]+.0003||l.z<KZ[0]-.0002||l.z>KZ[1]+.0002) return -1; for(let i=0;i<5;i++) if(Math.abs(l.x-KX[i])<KW+.0002) return i; return -1; };

  // ---- the keys, out of the player's meshes: a triangle is a key's when all three corners are in that key's box
  const group=new THREE.Group(); group.name="walkman_keys"; ctx.scene.add(group);
  const src=[], meshes=[]; ctx.root.traverse(o=>{ if(o.isMesh&&o.visible&&/^gear_walkman(~\d+)?$/.test(o.name)) src.push(o); });
  ctx.scene.getObjectByName("interviews_body")?.children.forEach(o=>{ if(o.isMesh) src.push(o); });   // (what interviews.js left of the meshes it cut the door from)
  const sub=(s,tris)=>{ const g=new THREE.BufferGeometry(); for(const k in s.attributes){ const at=s.attributes[k], sz=at.itemSize, arr=new at.array.constructor(tris.length*3*sz);
      tris.forEach((t,j)=>arr.set(at.array.subarray(t*sz,(t+3)*sz),j*3*sz)); g.setAttribute(k,new THREE.BufferAttribute(arr,sz,at.normalized)); } return g; };
  for(const o of src){
    const g0=o.geometry; if(!g0?.attributes?.position||Object.values(g0.attributes).some(at=>at.isInterleavedBufferAttribute)) continue;
    o.updateMatrixWorld(true);
    const s=g0.index?g0.toNonIndexed():g0, pa=s.attributes.position, mine=[[],[],[],[],[]], rest=[]; let any=false;
    for(let t=0;t+2<pa.count;t+=3){ let k=-2; for(let c=0;c<3&&k!==-1;c++){ const kc=keyOf(loc(_v.fromBufferAttribute(pa,t+c).applyMatrix4(o.matrixWorld),_l)); k=k===-2||k===kc?kc:-1; }
      if(k>=0){ mine[k].push(t); any=true; } else rest.push(t); }
    if(!any) continue;
    const kg=sub(s,mine.flat()), kp=kg.attributes.position, ranges=[]; let at=0; for(let i=0;i<5;i++){ ranges.push([at,at+mine[i].length*3]); at+=mine[i].length*3; }
    // (positions as plain floats, in the mesh's own frame: a pressed key is these, moved)
    const fl=new Float32Array(kp.count*3); for(let i=0;i<kp.count;i++){ fl[i*3]=kp.getX(i); fl[i*3+1]=kp.getY(i); fl[i*3+2]=kp.getZ(i); }
    const pos=new THREE.BufferAttribute(fl,3); pos.setUsage(THREE.DynamicDrawUsage); kg.setAttribute("position",pos); kg.computeBoundingBox(); kg.computeBoundingSphere();
    const m=new THREE.Mesh(kg,o.material); m.name="walkman_keys_"+(o.userData.mname||o.name); m.userData.mname=o.userData.mname; m.renderOrder=o.renderOrder; m.castShadow=o.castShadow; m.receiveShadow=o.receiveShadow;
    m.layers.mask=o.layers.mask; m.matrixAutoUpdate=false; m.matrix.copy(o.matrixWorld); m.raycast=()=>{}; group.add(m);
    const down=new V3().copy(up).negate().applyMatrix3(new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(o.matrixWorld).invert()));   // "down", in that frame
    meshes.push({m,pos,base:fl.slice(),ranges,down});
    const left=sub(s,rest); left.computeBoundingBox(); left.computeBoundingSphere(); o.geometry=left; }
  group.updateMatrixWorld(true);
  const found=[0,1,2,3,4].map(i=>meshes.reduce((a,k)=>a+(k.ranges[i][1]-k.ranges[i][0])/3,0));
  if(found.some(c=>!c)) console.warn("wmkeys: a key was not found in the model",found);

  // ---- the thumbwheels and the dial's needle, out of the same meshes, each a mesh of its own that is moved as a whole
  const mat=o=>(o.material?.name||"")+" "+(o.userData.mname||"");
  function takeOut(name,inside){ const parts=[];
    for(const o of src){ const g0=o.geometry; if(!g0?.attributes?.position||Object.values(g0.attributes).some(at=>at.isInterleavedBufferAttribute)) continue;
      o.updateMatrixWorld(true); const s=g0.index?g0.toNonIndexed():g0, pa=s.attributes.position, mine=[], rest=[];
      for(let t=0;t+2<pa.count;t+=3){ let all=true; for(let c=0;c<3&&all;c++) all=inside(loc(_v.fromBufferAttribute(pa,t+c).applyMatrix4(o.matrixWorld),_l),o); (all?mine:rest).push(t); }
      if(!mine.length) continue;
      const g=sub(s,mine); g.computeBoundingBox(); g.computeBoundingSphere();
      const m=new THREE.Mesh(g,o.material); m.name=name; m.userData.mname=o.userData.mname; m.renderOrder=o.renderOrder; m.castShadow=o.castShadow; m.receiveShadow=o.receiveShadow;
      m.layers.mask=o.layers.mask; m.matrixAutoUpdate=false; m.matrix.copy(o.matrixWorld); m.raycast=()=>{}; group.add(m); parts.push({m,base:o.matrixWorld.clone(),n:mine.length});
      const left=sub(s,rest); left.computeBoundingBox(); left.computeBoundingSphere(); o.geometry=left; }
    return parts; }
  const at=(x,y,z)=>new V3().copy(mid).addScaledVector(right,x).addScaledVector(up,y-HUB_Y).addScaledVector(n,z-HUB_Z);   // a place in the player's frame, in the world
  const wheels=WHEELS.map((w,i)=>({...w,val:w.v,pivot:at(WX,w.y,0),
    parts:takeOut("walkman_wheel_"+i,(l,o)=>/walkman_key/.test(mat(o))&&Math.hypot(l.x-WX,l.y-w.y)<w.r+.0008&&Math.abs(l.z)<.0035)}));
  const needle=takeOut("walkman_needle",(l,o)=>/walkman_needle/.test(mat(o)));
  const bandParts=takeOut("walkman_band",(l,o)=>/walkman_key/.test(mat(o))&&l.x>HW-.0006&&l.x<HW+.004&&Math.abs(l.y-BAND.y)<.0027&&Math.abs(l.z-BAND.z)<.0024);
  group.updateMatrixWorld(true);
  const wfound=[...wheels.map(w=>w.parts.reduce((a,k)=>a+k.n,0)),needle.reduce((a,k)=>a+k.n,0),bandParts.reduce((a,k)=>a+k.n,0)];
  if(wfound.some(c=>!c)) console.warn("wmkeys: a wheel, the needle or the band switch was not found in the model",wfound);
  const _m=new THREE.Matrix4(), _m2=new THREE.Matrix4();
  function setWheel(i,v){ const w=wheels[i]; v=Math.min(1,Math.max(0,v)); if(v===w.val) return; w.val=v;
    // (turned about its axle, which lies front to back: a wheel pushed up at the flank turns against the player's z)
    _m.makeTranslation(w.pivot.x,w.pivot.y,w.pivot.z).multiply(_m2.makeRotationAxis(n,-(v-w.v)*WTURN)).multiply(_m2.makeTranslation(-w.pivot.x,-w.pivot.y,-w.pivot.z));
    for(const k of w.parts){ k.m.matrix.multiplyMatrices(_m,k.base); k.m.updateMatrixWorld(true); }
    if(i===TUNE){ const dx=(v-w.v)*(SX[1]-SX[0]); _m.makeTranslation(right.x*dx,right.y*dx,right.z*dx); for(const k of needle){ k.m.matrix.multiplyMatrices(_m,k.base); k.m.updateMatrixWorld(true); } } }
  // (VOL as it stands in the model is the level the talk is set at: since Felix's 22:18Z that is what full up was, "the new
  // neutral default". Below it the wheel fades the talk out; above it there is half as much again, short of clipping)
  const level=()=>{ const v=wheels[VOL].val, v0=wheels[VOL].v; return v<=v0?(v/v0)*(v/v0):1+(v-v0)/(1-v0)*.5; };
  // which wheel a ray meets: the part that stands out of the flank, and only from outside (not through the player's body)
  const slab=(lo,hi,o,d)=>{ let t0=0, t1=Infinity; for(let a=0;a<3&&t0<=t1;a++){ if(Math.abs(d[a])<1e-9){ if(o[a]<lo[a]||o[a]>hi[a]) t0=Infinity; continue; } let x=(lo[a]-o[a])/d[a], y=(hi[a]-o[a])/d[a]; if(x>y){ const w=x; x=y; y=w; } t0=Math.max(t0,x); t1=Math.min(t1,y); } return t0<=t1?t0:Infinity; };
  function wheelAt(ray){ if(!ray) return -1; loc(ray.origin,_o); const o=[_o.x,_o.y,_o.z], d=[ray.direction.dot(right),ray.direction.dot(up),ray.direction.dot(n)];
    const body=slab([-HW,0,-HD],[HW,TOP,HD],o,d); let best=-1, bt=Infinity;
    wheels.forEach((w,i)=>{ const t=slab([WX-w.r-.0006,w.y-w.r,-.0036],[-HW,w.y+w.r,.0036],o,d); if(t<bt&&t<=body+1e-5){ bt=t; best=i; } });
    return best; }
  const wheelSpot=i=>at(WX-wheels[i].r+.0004,wheels[i].y,0);
  // the BAND switch: where it stands (0 FM ST, 1 FM, 2 AM; between them while it slides), and where it is going
  let band=0, bandTo=0, bandDir=1;
  function setBand(v){ v=Math.min(2,Math.max(0,v)); if(v===band) return; if(Math.round(v)!==Math.round(band)) sound("switch"); band=v;
    const dy=-v*BAND.step; _m.makeTranslation(up.x*dy,up.y*dy,up.z*dy); for(const k of bandParts){ k.m.matrix.multiplyMatrices(_m,k.base); k.m.updateMatrixWorld(true); } }
  // (its whole slot, a little proud of the flank, and only from outside)
  function bandAt(ray){ if(!ray||!bandParts.length) return false; loc(ray.origin,_o); const o=[_o.x,_o.y,_o.z], d=[ray.direction.dot(right),ray.direction.dot(up),ray.direction.dot(n)];
    const t=slab([HW,BAND.y-2*BAND.step-.0032,BAND.z-.0035],[HW+.003,BAND.y+.0032,BAND.z+.0035],o,d); return t<Infinity&&t<=slab([-HW,0,-HD],[HW,TOP,HD],o,d)+1e-5; }
  const bandSpot=()=>at(HW+.0024,BAND.y-band*BAND.step,BAND.z);

  const depth=[0,0,0,0,0], pulse=[0,0,0,0,0], prev=hubs.map(h=>h.a);
  function setDepth(i,d){ if(d===depth[i]) return; depth[i]=d;
    for(const k of meshes){ const [a,b]=k.ranges[i]; if(a===b) continue; const arr=k.pos.array, x=k.down.x*d, y=k.down.y*d, z=k.down.z*d;
      for(let v=a;v<b;v++){ arr[v*3]=k.base[v*3]+x; arr[v*3+1]=k.base[v*3+1]+y; arr[v*3+2]=k.base[v*3+2]+z; } k.pos.needsUpdate=true; } }

  // ---- which key a ray meets: the part of each that stands over the case, a little wider than the key (they are 18 mm apart)
  function keyAt(ray){ if(!ray) return -1; loc(ray.origin,_o); _l.set(ray.direction.dot(right),ray.direction.dot(up),ray.direction.dot(n)); let best=-1, bt=Infinity;
    for(let i=0;i<5;i++){ const lo=[KX[i]-.009,TOP+.0002,KZ[0]-.0006], hi=[KX[i]+.009,KY[1]+.0004,KZ[1]+.0006], o=[_o.x,_o.y,_o.z], d=[_l.x,_l.y,_l.z]; let t0=0, t1=Infinity;
      for(let a=0;a<3&&t0<=t1;a++){ if(Math.abs(d[a])<1e-9){ if(o[a]<lo[a]||o[a]>hi[a]) t0=Infinity; continue; } let x=(lo[a]-o[a])/d[a], y=(hi[a]-o[a])/d[a]; if(x>y){ const w=x; x=y; y=w; } t0=Math.max(t0,x); t1=Math.min(t1,y); }
      if(t0<=t1&&t0<bt){ bt=t0; best=i; } }
    return best; }
  const spot=i=>new V3().copy(mid).addScaledVector(right,KX[i]).addScaledVector(up,KY[1]-HUB_Y).addScaledVector(n,(KZ[0]+KZ[1])/2-HUB_Z);

  // ---- sounds, with the room's sound on: a key going down, one jumping up, the deck stopping itself, the head turning over,
  // and the motor while it winds
  let noise=null, whirr=null;
  const buf=ac=>{ if(!noise||noise.sampleRate!==ac.sampleRate){ noise=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } return noise; };
  const heard=[];   // (the last sounds asked for, for the tests)
  function sound(kind,dt=0){ heard.push(kind); if(heard.length>24) heard.shift(); const a=ctx.audio?.(); if(!a) return; deckSound(a.ctx,a.out,kind,buf(a.ctx),a.ctx.currentTime+.005+dt); }
  function motor(on){
    if(whirr){ const {g,s,o,ac}=whirr; whirr=null; try{ const t=ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(.0001,t,.05); o.frequency.cancelScheduledValues(t); o.frequency.setTargetAtTime(50,t,.08); s.stop(t+.4); o.stop(t+.4); }catch{} }
    if(!on) return; const a=ctx.audio?.(); if(!a) return; const ac=a.ctx, t=ac.currentTime;
    const s=ac.createBufferSource(), bp=ac.createBiquadFilter(), ng=ac.createGain(), o=ac.createOscillator(), lp=ac.createBiquadFilter(), og=ac.createGain(), g=ac.createGain();
    s.buffer=buf(ac); s.loop=true; bp.type="bandpass"; bp.frequency.value=1500; bp.Q.value=1.1; ng.gain.value=.5; o.type="sawtooth"; o.frequency.setValueAtTime(70,t); o.frequency.exponentialRampToValueAtTime(190,t+.35);
    lp.type="lowpass"; lp.frequency.value=900; og.gain.value=.35; g.gain.setValueAtTime(.0001,t); g.gain.setTargetAtTime(.035,t+.02,.08);
    s.connect(bp).connect(ng).connect(g); o.connect(lp).connect(og).connect(g); g.connect(a.out); s.start(t); o.start(t); whirr={g,s,o,ac}; }

  // ---- the deck
  // the cassette door (interviews.js turns the scene group interviews_door on its hinge): how far open it is, in radians
  const doorG=ctx.scene.getObjectByName("interviews_door"), DSHUT=.002, doorAngle=()=>doorG?2*Math.acos(Math.min(1,Math.abs(doorG.quaternion.w))):0;
  let wasPlaying=!!iv.playing, doorWas=doorAngle();
  let quietT=0;   // the TV makes room while the deck runs: playing or winding (Felix, 22:24Z: "forward and rewind should not increase the tv volume again")
  let wind=0, wr=0, lastWind=1, windT=0, side=0, turn=1;   // (turn: which way the hubs go when the tape plays, as interviews.js turns them)
  function windStop(end,dt=0){ if(!wind) return; wind=0; motor(false); sound(end?"end":"up",dt); }   // (the winding key jumps up)
  function press(ray){
    if(ctx.enabled&&!ctx.enabled()) return false;
    const k=keyAt(ray); if(k<0) return false; pulse[k]=PULSE;
    if(!ctx.open()){ sound("key"); return false; }   // (no tape: the key clicks, and the click opens Podcasts as it did)
    if(k===STOP){ sound("key"); if(wind) windStop(false,.05); else if(iv.playing) iv.play(false); }   // (and the key it lets go jumps up: windStop, or frame's watch on PLAY)
    else if(k===PLAY){ if(wind) windStop(false); if(iv.playing||iv.seat<1) sound("key"); else iv.play(true); }   // (PLAY going down has its click from frame's watch, however the tape starts)
    else if(k===DIR){ sound("dir"); if(iv.seat>=1){ side^=1; ctx.chatter?.()?.flip?.(); } }
    else { const w=k===FF?1:-1; sound("key"); if(iv.seat<1||wind===w) return true;
      if(iv.playing) iv.play(false); if(wind){ motor(false); sound("up",.05); } wind=w; lastWind=w; windT=0; motor(true); }
    return true; }
  function tip(ray){ if((ctx.enabled&&!ctx.enabled())||!ctx.open()) return null; const k=keyAt(ray); if(k>=0) return NAMES[k]; const w=wheelAt(ray); return w>=0?wheels[w].name:bandAt(ray)?"BAND":null; }
  // ---- the wheels: a press on one holds it, a drag turns it (150 px from end to end), a click turns it on by a fifth
  let held=null;
  const notch=(i,v)=>{ const q=Math.round(v*20); if(held&&q===held.q) return; if(held) held.q=q; sound("tick"); };
  function grab(ray,e){ if((ctx.enabled&&!ctx.enabled())||!ctx.open()) return false; const w=wheelAt(ray);
    if(w<0){ if(!bandAt(ray)) return false; held={w:2,band:true,y:e?.clientY||0,v:band,moved:false}; return true; }
    held={w,y:e?.clientY||0,v:wheels[w].val,q:Math.round(wheels[w].val*20),moved:false}; return true; }
  function drag(e){ if(!held||!e) return; if(Math.abs(e.clientY-held.y)>3) held.moved=true; if(!held.moved) return;
    if(held.band){ setBand(held.v+(e.clientY-held.y)/30); bandTo=Math.round(band); return; }   // (30 px a place, down the screen is down the slot)
    setWheel(held.w,held.v+(held.y-e.clientY)/150); notch(held.w,wheels[held.w].val); }
  function release(){ if(!held) return; const h=held; held=null;
    if(h.band){ if(h.moved) bandTo=Math.round(band); else { if(bandTo+bandDir>2||bandTo+bandDir<0) bandDir=-bandDir; bandTo+=bandDir; } return; }   // (let go, it settles in the nearest place; a click moves it on)
    if(!h.moved){ setWheel(h.w,(wheels[h.w].val+.2)%1.05); sound("tick"); } }
  function frame(dt){
    // PLAY goes down with the tape and jumps up when it stops, whoever started or stopped it; and the door on its catch
    if(iv.playing!==wasPlaying){ wasPlaying=iv.playing; sound(wasPlaying?"key":"up",wasPlaying?0:.05); }
    { const a=doorAngle(); if(doorWas>DSHUT&&a<=DSHUT) sound("door"); else if(doorWas<=DSHUT&&a>DSHUT) sound("open"); doorWas=a; }
    if(iv.playing||wind) quietT=.6; else if(quietT>0) quietT-=dt;   // (the TV stays down through winding, and from winding into PLAY)
    if(wind&&(!ctx.open()||iv.seat<1)) windStop(false);   // (Podcasts closed while it wound)
    const want=wind?1:0; wr+=(want-wr)*Math.min(1,dt*(want?9:5)); if(Math.abs(want-wr)<.004) wr=want;
    if(wind){ const r=ctx.chatter?.()?.seek?.(wind*WIND*dt*wr); windT+=dt; if(r===true||(r==null&&windT>3.5)) windStop(true); }   // (r: the tape is at its end; without the talk, 3.5 s of it)
    // the hubs: on side B they turn the other way, and winding spins them fast, forward or back
    hubs.forEach((h,i)=>{ let d=h.a-prev[i]; d=((d+Math.PI)%TAU+TAU)%TAU-Math.PI; if(Math.abs(d)>1e-7) turn=Math.sign(d);
      const add=wr>0&&!ctx.reduce?turn*(side?-1:1)*lastWind*WHUB[i]*wr*dt:0;
      if(side||add){ h.a=((side?prev[i]-d:h.a)+add)%TAU; h.mesh.quaternion.copy(h.base).multiply(_q.setFromAxisAngle(_z,h.a)); }
      prev[i]=h.a; });
    if(!held?.band&&band!==bandTo){ let v=ctx.reduce?bandTo:band+(bandTo-band)*Math.min(1,dt*28); if(Math.abs(bandTo-v)<.02) v=bandTo; setBand(v); }   // the band switch, home
    { const c=ctx.chatter?.(); if(c&&"level" in c){ const l=level(); if(c.level!==l) c.level=l; } }   // VOL
    // the keys: PLAY is down while the tape runs, a winding key while it winds, any key for a moment when it is pressed
    for(let i=0;i<5;i++){ if(pulse[i]>0) pulse[i]-=dt;
      const to=pulse[i]>0||(i===PLAY&&iv.playing)||(i===REW&&wind<0)||(i===FF&&wind>0)?TRAVEL:0;
      let d=depth[i]; if(d!==to){ d=ctx.reduce?to:d+(to-d)*Math.min(1,dt*(to?45:30)); if(Math.abs(to-d)<.00002) d=to; setDepth(i,d); } } }
  return {press,tip,frame,keyAt,spot,names:NAMES,group,found,grab,drag,release,wheelAt,wheelSpot,setWheel,wheelsFound:wfound,bandAt,bandSpot,get band(){ return band; },get bandName(){ return BAND.names[bandTo]; },
    get heard(){ return heard.slice(); },get tvQuiet(){ return iv.playing||!!wind||quietT>0; },get wheel(){ return wheels.map(w=>w.val); },get level(){ return level(); },get held(){ return held?held.w:-1; },
    get busy(){ return !!held||band!==bandTo||!!wind||wr>0||depth.some((d,i)=>pulse[i]>0||(d>0&&!(i===PLAY&&iv.playing&&d===TRAVEL))); },
    get depth(){ return depth.map(d=>+(d*1000).toFixed(3)); },get wind(){ return wind; },get side(){ return side?"B":"A"; }};
}
