// The glasses on the desk (Felix, 17 Oct 2026: "other cute interactions for the other items on the desk").
// A click tries them on: they come up off the paper and sit in front of your eyes, and what you see through their two lenses
// goes soft and swims a little, because they are somebody else's prescription. Around the lenses the room stays sharp, and the
// frame you see is the real one (Felix, 17 Oct 21:22Z: no drawn ovals before the glasses are there, and only the part behind
// the glasses blurred). They stay on while you look around and use the room: a click goes through the lenses to whatever is
// behind them, and only a click on the frame takes them off again, back to where they lay (Felix, 21 Oct 22:04Z: "would be
// cool if i could look around the room with them. Clicking on the glasses removes them, otherwise i should be able to
// interact with the room as usual").
//
// The blur is the lenses' own (Felix, 21 Oct: "can we maybe use shaders here?"): while the glasses are up, the glass is drawn
// with a shader that reads the picture behind it soft, so the soft part ends exactly at the rim. Should that ever fail, two
// elements over the room's canvas with a backdrop filter stand in, as before. Nothing at all runs while they lie on the desk.
// With reduced motion they are simply on or off, and nothing swims.
//
// No imports: the page passes THREE in. createGlasses(THREE,{scene,root,interact,canvas,view,audio,reduce,live}) after the
// notepad (which lays them on the A4 sheets and gives them a contact shadow) and before the room's pick occluders and draw-call
// join. The page calls glasses.toggle() on a click and glasses.frame(dt) every frame; while glasses.on their own tip (and
// their label in the pick map) reads TIP_OFF.
export const TIP_ON="GLASSES · TRY ON", TIP_OFF="TAKE OFF THE GLASSES";
export function createGlasses(THREE,{scene,root,interact,canvas,view,audio,reduce=false,live=()=>{},wear=0}){   // wear: seconds until they come off by themselves (0: never)
  const V3=THREE.Vector3, Q4=THREE.Quaternion, M4=THREE.Matrix4;
  const obj=root.getObjectByName("round_spectacles");
  const parts=[]; obj&&obj.traverse(o=>{ if(o.isMesh) parts.push(o); });
  if(!parts.length) throw new Error("glasses: no round_spectacles in the scene");
  const info={kind:"glasses",label:TIP_ON};
  for(const o of parts) interact.set(o,info);
  scene.updateMatrixWorld(true);

  // ---- the rig: the glasses about their middle, in world terms
  const box=new THREE.Box3().setFromObject(obj,true), mid=box.getCenter(new V3());
  const rig=new THREE.Group(); rig.name="round_spectacles_rig"; rig.position.copy(mid); scene.add(rig); rig.updateMatrixWorld(true); rig.attach(obj);
  const restP=rig.position.clone(), restQ=rig.quaternion.clone();

  // ---- clicked as a whole: one box for the pointer instead of their 11,800 triangles
  { const first=parts[0], inv=new M4().copy(first.matrixWorld).invert(), bx=new THREE.Box3(), b=new THREE.Box3(), m=new M4();
    for(const o of parts){ if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bx.union(b.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv,o.matrixWorld))); }
    const ray=new THREE.Ray(), at=new V3(), im=new M4();
    first.raycast=function(rc,hits){ if(!rig.visible) return;
      if(on&&!anim){ const distance=framed(rc); if(distance>0&&distance>=rc.near&&distance<=rc.far) hits.push({distance,point:rc.ray.at(distance,new V3()),object:this}); return; }   // worn: only where the frame is
      if(ray.copy(rc.ray).applyMatrix4(im.copy(this.matrixWorld).invert()).intersectBox(bx,at)===null) return;
      const point=at.clone().applyMatrix4(this.matrixWorld), distance=rc.ray.origin.distanceTo(point); if(distance>=rc.near&&distance<=rc.far) hits.push({distance,point,object:this}); };
    for(const o of parts) if(o!==first) o.raycast=()=>{}; }

  // ---- the two lenses, measured from the model. The glass comes in pieces, one to a lens: each piece's flat gives the way the
  // lens faces, its outline the lens's middle and size, and the frame's points just inside that size are the rim's inner wall:
  // how deep the opening is, and how wide at each end (z0 r0, z1 r1)
  const glass=parts.find(o=>/glass/.test(o.userData.mname||o.material?.name||""))||parts[parts.length-1];
  const LENS=[]; let pads=null;
  { rig.updateMatrixWorld(true);
    const inv=new M4().copy(rig.matrixWorld).invert();
    const local=o=>{ const m=new M4().multiplyMatrices(inv,o.matrixWorld), a=o.geometry.attributes.position, out=[]; for(let i=0;i<a.count;i++) out.push(new V3().fromBufferAttribute(a,i).applyMatrix4(m)); return out; };
    const G=local(glass), F=[]; for(const o of parts) if(o!==glass) F.push(...local(o));
    // the glass's pieces: points welded by place, joined by its triangles
    const ids=new Map(), par=[], find=a=>{ while(par[a]!==a) a=par[a]=par[par[a]]; return a; };
    const vid=G.map(v=>{ const k=Math.round(v.x*2e4)+","+Math.round(v.y*2e4)+","+Math.round(v.z*2e4); if(!ids.has(k)){ ids.set(k,par.length); par.push(par.length); } return ids.get(k); });
    const ix=glass.geometry.index, n3=ix?ix.count:G.length, at=i=>vid[ix?ix.getX(i):i];
    for(let i=0;i+2<n3;i+=3){ const a=find(at(i)); par[find(at(i+1))]=a; par[find(at(i+2))]=a; }
    const pieces=new Map(); G.forEach((v,i)=>{ const r=find(vid[i]); if(!pieces.has(r)) pieces.set(r,[]); pieces.get(r).push(v); });
    // the nose pads are glass too, and come in the same mesh: they get a mesh of their own (same points, their own triangles,
    // the glass's own material), so the lens shader is the lenses' alone (Felix, 21 Oct 22:25Z: "The noseclips are also
    // shadered. They shouldn't be")
    { const big=[...pieces.entries()].sort((a,b)=>b[1].length-a[1].length), lensRoot=new Set(big.slice(0,2).map(e=>e[0]));
      if(big.length>2){ const li=[], pi=[]; for(let i=0;i+2<n3;i+=3){ const to=lensRoot.has(find(at(i)))?li:pi; to.push(ix?ix.getX(i):i,ix?ix.getX(i+1):i+1,ix?ix.getX(i+2):i+2); }
        const cut=idx=>{ const g=new THREE.BufferGeometry(); for(const k in glass.geometry.attributes) g.setAttribute(k,glass.geometry.attributes[k]); g.setIndex(idx); g.boundingBox=glass.geometry.boundingBox; g.boundingSphere=glass.geometry.boundingSphere; return g; };
        if(!glass.geometry.boundingBox) glass.geometry.computeBoundingBox(); if(!glass.geometry.boundingSphere) glass.geometry.computeBoundingSphere();
        pads=new THREE.Mesh(cut(pi),glass.material); pads.name="round_spectacles_pads"; pads.userData.mname=glass.userData.mname;
        pads.position.copy(glass.position); pads.quaternion.copy(glass.quaternion); pads.scale.copy(glass.scale); glass.parent.add(pads); pads.updateMatrixWorld(true);
        glass.geometry=cut(li); } }
    for(const P of [...pieces.values()].sort((a,b)=>b.length-a.length).slice(0,2)){ if(P.length<12) continue;
      const c=new V3(); for(const v of P) c.add(v); c.divideScalar(P.length);
      // the way it faces: the direction its points spread least in
      const C=[0,0,0,0,0,0]; for(const v of P){ const x=v.x-c.x, y=v.y-c.y, z=v.z-c.z; C[0]+=x*x; C[1]+=x*y; C[2]+=x*z; C[3]+=y*y; C[4]+=y*z; C[5]+=z*z; }
      const tr=C[0]+C[3]+C[5], n=new V3(.31,.52,.8).normalize();
      for(let i=0;i<120;i++) n.set((tr-C[0])*n.x-C[1]*n.y-C[2]*n.z,-C[1]*n.x+(tr-C[3])*n.y-C[4]*n.z,-C[2]*n.x-C[4]*n.y+(tr-C[5])*n.z).normalize();
      const u=new V3(0,1,0).cross(n); if(u.lengthSq()<1e-6) u.set(1,0,0); u.normalize(); const w=new V3().crossVectors(n,u), d=new V3();
      let a0=1e9, a1=-1e9, b0=1e9, b1=-1e9; for(const v of P){ d.copy(v).sub(c); const x=d.dot(u), y=d.dot(w); a0=Math.min(a0,x); a1=Math.max(a1,x); b0=Math.min(b0,y); b1=Math.max(b1,y); }
      c.addScaledVector(u,(a0+a1)/2).addScaledVector(w,(b0+b1)/2);
      let R=0; for(const v of P){ d.copy(v).sub(c); R=Math.max(R,Math.hypot(d.dot(u),d.dot(w))); }
      const wall=[]; let z0=0, z1=0; for(const v of F){ d.copy(v).sub(c); const z=d.dot(n), r=Math.hypot(d.dot(u),d.dot(w)); if(r<R*1.03&&Math.abs(z)<.012){ wall.push([r,z]); z0=Math.min(z0,z); z1=Math.max(z1,z); } }
      // an end's width: the wall's radius there, a stray point or two inside it aside (a twentieth of them)
      const wide=at=>{ const rs=wall.filter(p=>Math.abs(p[1]-at)<.001).map(p=>p[0]).sort((a,b)=>a-b); return rs.length>8?rs[Math.floor(rs.length*.05)]:R; };
      LENS.push({c,n,u,w,R,z0,z1,r0:wide(z0),r1:wide(z1)}); }
    if(pads){ parts.push(pads); interact.set(pads,info); pads.raycast=()=>{}; } }

  // ---- which way they face as they lie: the lenses are at the front, the arms run back. The lenses themselves say it (the
  // way they face, the line from one to the other); without two of them, the glass's middle against the whole frame's
  const front=new THREE.Box3().setFromObject(glass,true).getCenter(new V3()).sub(mid); front.y=0;
  if(front.lengthSq()<1e-8) front.set(0,0,1); front.normalize();
  const up0=new V3(0,1,0), right0=new V3().crossVectors(up0,front).normalize(), M0=front.clone().multiplyScalar(.07);
  let HALF=.056, RY=.022;
  if(LENS.length===2){ const [a,b]=LENS;
    for(const l of LENS) if(l.n.dot(front)<0){ l.n.negate(); l.w.negate(); [l.z0,l.z1,l.r0,l.r1]=[-l.z1,-l.z0,l.r1,l.r0]; }
    const f=a.n.clone().add(b.n).normalize(), r=b.c.clone().sub(a.c); r.addScaledVector(f,-r.dot(f)).normalize(); if(r.dot(right0)<0) r.negate();
    front.copy(f); right0.copy(r); up0.crossVectors(front,right0).normalize();
    M0.copy(a.c).add(b.c).multiplyScalar(.5); HALF=a.c.distanceTo(b.c)/2+Math.max(a.R,b.R); RY=Math.max(a.R,b.R); }
  const B0inv=new M4().makeBasis(right0,up0,front).invert();
  // worn: the lenses look where you look, square to the view, the arms running back past your eyes. Close, as glasses are
  // (Felix, 21 Oct 22:18Z: "the glasses should be closer to the camera", worn): the frame is WIDE times as wide as the picture,
  // so the outer rims sit at its edges and the arms are out of sight, and never taller than TALL of it; the point between
  // the lenses a little under the picture's middle (wherever the page has shifted the picture to)
  const WIDE=1.12, TALL=.96;
  const fwd=new V3(), upc=new V3(), rightc=new V3(), Bt=new M4(), wornQ=new Q4(), wornP=new V3(), tv=new V3();
  function worn(){ const c=view(); c.updateMatrixWorld(); fwd.set(0,0,-1).transformDirection(c.matrixWorld); upc.set(0,1,0).transformDirection(c.matrixWorld); rightc.crossVectors(upc,fwd).normalize();
    wornQ.setFromRotationMatrix(Bt.makeBasis(rightc,upc,fwd).multiply(B0inv)).multiply(restQ);
    const pe=c.projectionMatrix.elements, d=wornD=Math.max(c.near*1.6,(HALF+.009)*pe[0]/WIDE,(RY+.009)*pe[5]/TALL);
    wornP.copy(c.position).addScaledVector(fwd,d).addScaledVector(rightc,-pe[8]*d/pe[0]).addScaledVector(upc,(pe[9]-.05)*d/pe[5]).sub(tv.copy(M0).applyQuaternion(wornQ)); }

  // ---- worn, they are in the pointer's way only where the frame is: through the lenses, and past the frame, a click or a
  // hover goes on to the room. Worn they sit still in the picture, so where the frame is drawn is a map of the window (CELL
  // px to a cell): the frame's triangles as the view draws them, made on the first pick and again when the window or the
  // lens of the view changes. One look-up a pick; the glass (the lenses, the nose pads) is not in it
  const CELL=3, one=new V3(1,1,1), mvp=new M4(), rm=new M4(), sv=new V3();
  let mask=null, maskKey="", wornD=.1;
  function frameMask(c){
    const pe=c.projectionMatrix.elements, W=innerWidth, H=innerHeight, key=[W,H,pe[0],pe[5],pe[8],pe[9]].join();
    if(mask&&key===maskKey) return mask; maskKey=key;
    const nx=Math.ceil(W/CELL), ny=Math.ceil(H/CELL), bits=new Uint8Array(nx*ny);
    worn(); rm.compose(wornP,wornQ,one); rig.updateMatrixWorld(true); const inv=new M4().copy(rig.matrixWorld).invert();
    c.updateMatrixWorld();
    for(const o of parts){ if(o===glass) continue;
      const e=mvp.multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse).multiply(rm).multiply(inv).multiply(o.matrixWorld).elements;
      const a=o.geometry.attributes.position, ix=o.geometry.index, n=ix?ix.count:a.count, S=new Float32Array(a.count*2);
      for(let i=0;i<a.count;i++){ const x=a.getX(i), y=a.getY(i), z=a.getZ(i), w=e[3]*x+e[7]*y+e[11]*z+e[15];
        if(w<c.near){ S[i*2]=NaN; continue; }   // (an arm's end, beside or behind the eye)
        S[i*2]=((e[0]*x+e[4]*y+e[8]*z+e[12])/w+1)/2*W/CELL; S[i*2+1]=(1-(e[1]*x+e[5]*y+e[9]*z+e[13])/w)/2*H/CELL; }
      for(let i=0;i+2<n;i+=3){ const A=(ix?ix.getX(i):i)*2, B=(ix?ix.getX(i+1):i+1)*2, C=(ix?ix.getX(i+2):i+2)*2;
        const ax=S[A], ay=S[A+1], bx=S[B], by=S[B+1], cx=S[C], cy=S[C+1]; if(!(ax+bx+cx===ax+bx+cx)) continue;
        const i0=Math.max(0,Math.floor(Math.min(ax,bx,cx))), i1=Math.min(nx-1,Math.floor(Math.max(ax,bx,cx))), j0=Math.max(0,Math.floor(Math.min(ay,by,cy))), j1=Math.min(ny-1,Math.floor(Math.max(ay,by,cy)));
        if(i1<i0||j1<j0) continue;
        const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
        if(Math.abs(den)<1e-6||(i1-i0<1&&j1-j0<1)){ for(let j=j0;j<=j1;j++) for(let q=i0;q<=i1;q++) bits[j*nx+q]=1; continue; }
        for(let j=j0;j<=j1;j++) for(let q=i0;q<=i1;q++){ const px=q+.5-cx, py=j+.5-cy, w0=((by-cy)*px+(cx-bx)*py)/den, w1=((cy-ay)*px+(ax-cx)*py)/den;
          if(w0>=-.2&&w1>=-.2&&w0+w1<=1.2) bits[j*nx+q]=1; } } }
    return mask={bits,nx,ny}; }
  // is the frame at this place in the window (worn)?
  function frameAt(x,y){ if(!on||anim) return false; const M=frameMask(view()), i=Math.floor(x/CELL), j=Math.floor(y/CELL); return i>=0&&j>=0&&i<M.nx&&j<M.ny&&M.bits[j*M.nx+i]===1; }
  // the pointer's ray (one that starts at the eye) against the worn frame: how far off the frame is there, or 0
  function framed(rc){ const c=view(); if(rc.ray.origin.distanceToSquared(c.position)>1e-8) return 0;
    sv.copy(rc.ray.origin).add(rc.ray.direction).project(c);
    return frameAt((sv.x+1)/2*innerWidth,(1-sv.y)/2*innerHeight)?wornD:0; }
  // and they are nearer than anything: worn, frame and lenses are drawn into the nearest sliver of the picture's depth, so a
  // card held up to the view, a tape on its way or a wall behind the view never cuts through them (among themselves they
  // keep their order: the rim still hides the lens's edge)
  let ahead=false;
  const NEAR=r=>{ if(ahead) r.getContext().depthRange(0,.02); }, FAR=r=>{ if(ahead) r.getContext().depthRange(0,1); };
  for(const o of parts){ o.onBeforeRender=NEAR; o.onAfterRender=FAR; }

  // ---- what you see through them, drawn by the lenses themselves. While the glasses are up, the glass is drawn last and with
  // its own shader: just before it, the picture as drawn so far (the room, the frame included) is copied aside, and each pixel
  // of a lens reads that copy the way a strong lens shows things (the shader says how). The lens is
  // the model's own glass, tested for depth against the model's own rim, so the soft part ends exactly where the rim begins,
  // from any side and at any size: there is no outline to keep in step (Felix, 21 Oct: the element's cut was "still a little
  // offset" at the left and right rims). On the desk the glass has its own material back and none of this exists: the copy
  // is freed when they land
  const BLUR=4.2, MAG=.125;   // MAG: how much smaller the lens's middle shows things (Felix, 21 Oct 21:34Z: "i like the distortion, lean into that. a little more")
  const own={material:glass.material,renderOrder:glass.renderOrder,group:obj.renderOrder};   // (the pads, nearer the eye than the lenses, are drawn after them while the lens shader is on)
  const grabs=new Map(), sz=new THREE.Vector2(), cen=LENS.map(()=>[0,0,0,0]);   // cen: a lens's middle and a point on its edge, in the picture (-1..1)
  let shader=true, checked=false, unit=0, mag=0, amt=0, paint=0;   // shader: false once it has failed (then the elements further down)
  const lensMat=new THREE.ShaderMaterial({name:"glasses_lens",transparent:true,blending:THREE.NoBlending,side:THREE.DoubleSide,
    uniforms:{tScene:{value:null},uRes:{value:new THREE.Vector2(1,1)},uUnit:{value:0},uMag:{value:0},uK:{value:0},uPaint:{value:0},uC:{value:[new V3(),new V3()]}},
    vertexShader:"void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    // uC: each lens's middle and radius in pixels. uUnit: the blur's step in pixels, read from the copy's smaller sizes (13 reads
    // make a soft spot at any strength). No read leaves the lens, so the dark rim does not creep into the soft part.
    // Like real glass, not one even blur (Felix, 21 Oct 21:25Z: "less uniform, more like real glasses"):
    // - softest at the rim, clearest (never clear) at a spot a little towards the nose; and stretched one way, a different way
    //   in each lens, as a lens for somebody else's astigmatism does it: lights become short strokes
    // - the picture pulled small in the middle and squeezed at the bevel just inside the rim; red and blue part ways towards
    //   the rim, so bright edges get a colour fringe there
    // - a faint green ghost of the lamps, mirrored, as a coated lens throws back; a thumb's smudge on each lens that goes milky
    //   where light is behind it; and the glass a little darker where it is thickest, at the rim
    fragmentShader:`uniform sampler2D tScene; uniform vec2 uRes; uniform float uUnit, uMag, uK, uPaint; uniform vec3 uC[2];
      vec3 c;
      vec2 keep(vec2 p){ vec2 d=p-c.xy; float l=length(d), r=max(c.z-1.5,1.); return l>r?c.xy+d*(r/l):p; }
      vec3 at(vec2 p,float lod){ return textureLod(tScene,keep(p)/uRes,lod).rgb; }
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y); }
      vec3 soft(vec2 p,float u,mat2 ax){ float lod=log2(max(u*1.25,1.)); vec3 s=at(p,lod);
        for(int i=0;i<6;i++){ float a=float(i)*1.0471976;
          s+=at(p+ax*vec2(cos(a),sin(a))*u*1.2,lod)*.62+at(p+ax*vec2(cos(a+.5235988),sin(a+.5235988))*u*2.3,lod)*.2; }
        return s/5.92; }
      void main(){
        float side=distance(gl_FragCoord.xy,uC[0].xy)<distance(gl_FragCoord.xy,uC[1].xy)?0.:1.;
        c=side<.5?uC[0]:uC[1];
        float R=max(c.z,1.), nose=sign(.5*(uC[0].x+uC[1].x)-c.x);
        vec2 d=gl_FragCoord.xy-c.xy, n=d/R; float q=min(length(n),1.), q2=q*q;
        // the picture through the lens: small about a point a little towards the nose, squeezed at the bevel; at the rim it
        // meets the room outside again
        vec2 o=c.xy+vec2(nose*.16,.06)*R*(1.-q2);
        vec2 p=o+(gl_FragCoord.xy-o)*(1.+uMag*(1.-q2)-.05*uK*smoothstep(.78,1.,q));
        // how soft: from the clear spot outwards; and which way it smears
        float far=min(length(n-vec2(nose*.22,.08))/1.1,1.), u=uUnit*mix(.5,1.55,far*far);
        float th=side<.5?.45:-.7, cs=cos(th), sn=sin(th); mat2 rot=mat2(cs,sn,-sn,cs), ax=rot*mat2(1.34,0.,0.,.72)*mat2(cs,-sn,sn,cs);
        vec2 fr=d*.009*q2*uK;
        vec3 s=vec3(soft(p+fr,u,ax).r,soft(p,u,ax).g,soft(p-fr,u,ax).b);
        // the smudge: milky, and more so with light behind it
        vec2 m=n*mat2(.8,.6,-.6,.8)+side*7.3;
        float sm=smoothstep(.5,.78,noise(m*1.7)*.65+noise(m*4.3+3.1)*.35)*uK;
        vec3 wide=at(p,log2(max(u,1.))+2.5);
        s=mix(s,wide,sm*.42)+wide*sm*.06;
        // the coating's ghost of what is bright, mirrored about the lens
        vec3 gh=at(c.xy+vec2(-d.x,d.y*.9)*.82+vec2(nose*R*.12,R*.06),4.5);
        s+=min(max(gh-.55,0.),1.)*vec3(.3,.85,.5)*.16*uK*(.35+.65*q2);
        s*=vec3(1.,.995,.98)*(1.-.16*uK*smoothstep(.84,1.,q));
        gl_FragColor=vec4(mix(s,vec3(1.,0.,1.),uPaint),1.);
      }`});
  // just before the glass is drawn: copy the picture so far (also out of an anti-aliased target, which a shader cannot read
  // directly) and make its smaller sizes. The page's own state is left as three.js has it
  function grab(renderer){
    NEAR(renderer); if(!shader) return;
    try{
      const g=renderer.getContext(), cur=renderer.getRenderTarget(); if(cur&&(cur.isWebGLCubeRenderTarget||cur.depth>1)) return;
      if(!cur) renderer.getDrawingBufferSize(sz);
      const w=Math.floor(cur?cur.width:sz.x), h=Math.floor(cur?cur.height:sz.y), type=cur?cur.texture.type:THREE.UnsignedByteType, key=w+"x"+h+"x"+type;
      let t=grabs.get(key);
      if(!t){ if(grabs.size>1){ for(const x of grabs.values()) x.dispose(); grabs.clear(); }
        t=new THREE.WebGLRenderTarget(w,h,{type,depthBuffer:false,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,colorSpace:cur?cur.texture.colorSpace:THREE.NoColorSpace});
        t.texture.name="glasses_behind"; grabs.set(key,t);
        if(renderer.initRenderTarget) renderer.initRenderTarget(t); else { renderer.setRenderTarget(t); renderer.setRenderTarget(cur); } }
      const P=renderer.properties, S=renderer.state, src=cur?((cur.samples>0&&P.get(cur).__webglMultisampledFramebuffer)||P.get(cur).__webglFramebuffer):null;
      if(!checked) g.getError();
      const cut=cur?cur.scissorTest:renderer.getScissorTest(); if(cut) S.setScissorTest(false);
      S.buffers.color.setMask(true);
      g.bindFramebuffer(g.READ_FRAMEBUFFER,src); g.bindFramebuffer(g.DRAW_FRAMEBUFFER,P.get(t).__webglFramebuffer);
      g.blitFramebuffer(0,0,w,h,0,0,w,h,g.COLOR_BUFFER_BIT,g.NEAREST);
      g.bindFramebuffer(g.FRAMEBUFFER,src);
      if(cut) S.setScissorTest(true);
      S.bindTexture(g.TEXTURE_2D,P.get(t.texture).__webglTexture); g.generateMipmap(g.TEXTURE_2D); S.unbindTexture();
      if(!checked){ checked=true; if(g.getError()!==g.NO_ERROR) throw new Error("the copy was refused"); }
      const U=lensMat.uniforms; U.tScene.value=t.texture; U.uRes.value.set(w,h); U.uUnit.value=unit*h; U.uMag.value=mag; U.uK.value=amt; U.uPaint.value=paint;
      for(let i=0;i<2;i++){ const a=cen[Math.min(i,cen.length-1)]||[0,0,0,0]; U.uC.value[i].set((a[0]+1)/2*w,(a[1]+1)/2*h,Math.hypot((a[2]-a[0])/2*w,(a[3]-a[1])/2*h)); }
      lensMat.uniformsNeedUpdate=true;
    }catch(e){ shader=false; console.warn("glasses: the lens shader is off, the overlay stands in",e); }
  }
  function lens(v){
    if(v&&shader){ glass.material=lensMat; glass.renderOrder=obj.renderOrder=1e4; if(pads) pads.renderOrder=2e4; glass.onBeforeRender=grab; return; }
    if(glass.material!==lensMat) return;
    glass.material=own.material; glass.renderOrder=own.renderOrder; obj.renderOrder=own.group; if(pads) pads.renderOrder=own.renderOrder; glass.onBeforeRender=NEAR;
    for(const t of grabs.values()) t.dispose(); grabs.clear(); lensMat.uniforms.tScene.value=null;
  }
  const pv=new V3(), pa=new V3(), pb=new V3();
  function soft(k,T){   // k: 0 off .. 1 on
    const c=view(), swim=reduce?0:Math.sin(T*.9)*.5+Math.sin(T*2.3+1)*.25;
    unit=(BLUR+swim)*k*.9/innerHeight; mag=(MAG+swim*.02)*k; amt=k;
    c.updateMatrixWorld(); rig.updateMatrixWorld(true);
    LENS.forEach((l,i)=>{ const a=cen[i]; pv.copy(l.c).applyMatrix4(rig.matrixWorld).project(c); a[0]=pv.x; a[1]=pv.y;
      pv.copy(l.c).addScaledVector(l.w,l.R*.992).applyMatrix4(rig.matrixWorld).project(c); a[2]=pv.x; a[3]=pv.y; });
  }

  // ---- the stand-in, when the shader cannot run: the room behind each lens blurred by an element cut to the lens's opening.
  // The opening on screen is the ring at the end of the rim's inner wall that is nearer to you: all you see inside that ring
  // is the view through the lens or the wall's own inside, and both go soft (Felix, 21 Oct: with the cut kept to what shows
  // through both ends, and a hair narrow, a sliver of sharp view was left between the blur and the rim). The cut then goes
  // OVER px past the ring, onto the rim: a soft pixel of rim is not seen, a sharp sliver of room is
  const OVER=1.5, N=64, CS=[], SN=[]; for(let i=0;i<N;i++){ CS.push(Math.cos(i/N*Math.PI*2)); SN.push(Math.sin(i/N*Math.PI*2)); }
  let lenses=null;
  function overlay(){
    if(lenses) return lenses;
    const wrap=document.createElement("div"); wrap.id="glasses-lenses"; wrap.setAttribute("aria-hidden","true");
    wrap.style.cssText="position:fixed;inset:0;pointer-events:none;overflow:hidden";
    lenses=LENS.map(()=>{ const d=document.createElement("div"); d.style.cssText="position:absolute;left:0;top:0;display:none"; wrap.appendChild(d); return d; });
    canvas.insertAdjacentElement("afterend",wrap); return lenses;
  }
  function ring(l,z,r,c,W,H){ const out=[]; let mx=0, my=0;
    for(let i=0;i<N;i++){ pv.copy(l.c).addScaledVector(l.n,z).addScaledVector(l.u,r*CS[i]).addScaledVector(l.w,r*SN[i]).applyMatrix4(rig.matrixWorld).project(c);
      if(!(pv.z>-1&&pv.z<1)) return null; const x=(pv.x+1)/2*W, y=(1-pv.y)/2*H; out.push(x,y); mx+=x/N; my+=y/N; }
    for(let i=0;i<out.length;i+=2){ const dx=out[i]-mx, dy=out[i+1]-my, len=Math.hypot(dx,dy)||1; out[i]+=dx/len*OVER; out[i+1]+=dy/len*OVER; }
    return out; }
  let lastKey="";
  function look(k,T){   // k: 0 off .. 1 on
    if(k<=0){ if(lenses) for(const d of lenses) d.style.display="none"; lastKey=""; return; }
    const els=overlay(), c=view(), W=innerWidth, H=innerHeight;
    const swim=reduce?0:Math.sin(T*.9)*.5+Math.sin(T*2.3+1)*.25, f=`blur(${((BLUR+swim)*k).toFixed(2)}px) saturate(${(1+.06*k).toFixed(3)})`;
    for(const d of els) d.style.backdropFilter=d.style.webkitBackdropFilter=f;
    // worn and still, the lenses stay where they are on screen: the outlines are made again only when the picture changes
    const pe=c.projectionMatrix.elements, key=anim?"":[W,H,pe[0],pe[5],pe[8],pe[9]].join();
    if(key&&key===lastKey) return; lastKey=key;
    c.updateMatrixWorld(); rig.updateMatrixWorld(true);
    LENS.forEach((l,i)=>{ const d=els[i];
      const near=pa.copy(l.c).addScaledVector(l.n,l.z0).applyMatrix4(rig.matrixWorld).distanceToSquared(c.position)<=pb.copy(l.c).addScaledVector(l.n,l.z1).applyMatrix4(rig.matrixWorld).distanceToSquared(c.position);
      const poly=ring(l,near?l.z0:l.z1,near?l.r0:l.r1,c,W,H);
      if(!poly){ d.style.display="none"; return; }
      let x0=1e9, y0=1e9, x1=-1e9, y1=-1e9; for(let j=0;j<poly.length;j+=2){ x0=Math.min(x0,poly[j]); x1=Math.max(x1,poly[j]); y0=Math.min(y0,poly[j+1]); y1=Math.max(y1,poly[j+1]); }
      x0=Math.floor(x0); y0=Math.floor(y0); let path=""; for(let j=0;j<poly.length;j+=2) path+=(j?",":"")+(poly[j]-x0).toFixed(1)+"px "+(poly[j+1]-y0).toFixed(1)+"px";
      d.style.display="block"; d.style.width=Math.ceil(x1-x0)+"px"; d.style.height=Math.ceil(y1-y0)+"px"; d.style.transform=`translate(${x0}px,${y0}px)`;
      d.style.clipPath=d.style.webkitClipPath=`polygon(${path})`; });
  }

  // ---- sound: the arms opening, a soft tick each; and the frame set back down on the paper
  let noise=null;
  function tick(a,dt,f,amp,dur){ const ctx=a.ctx, t=ctx.currentTime+dt; if(!noise){ noise=ctx.createBuffer(1,ctx.sampleRate*.3,ctx.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const s=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=noise; bp.type="bandpass"; bp.frequency.value=f; bp.Q.value=3;
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(amp,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(bp).connect(g).connect(a.out); if(a.verb){ const w=ctx.createGain(); w.gain.value=.2; g.connect(w).connect(a.verb); } s.start(t,Math.random()*.2); s.stop(t+dur+.05); }

  // ---- on and off. The flight up takes UP seconds, the way back DOWN; in between they stay in front of your eyes
  const UP=reduce?.01:.5, DOWN=reduce?.01:.42;
  let on=false, k=0, anim=null, T=0, offAt=0;
  const shadow=()=>scene.getObjectByName("round_spectacles_contact");
  const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  function put(){ on=true; anim={dir:1,t:0}; rig.visible=true; lens(true); info.label=TIP_OFF; offAt=performance.now()+wear*1000; const a=audio?.(); if(a){ tick(a,.02,3400,.07,.03); tick(a,.11,3900,.06,.03); } live("You try the glasses on. Not your prescription. A click on their frame takes them off."); }
  function take(){ if(!on) return; on=false; anim={dir:-1,t:0}; rig.visible=true; info.label=TIP_ON; const a=audio?.(); if(a) tick(a,DOWN-.03,1500,.1,.05); live("The glasses are back on the desk."); }
  const toggle=()=>on?take():put();
  // while they are on nothing else changes: presses, keys and page changes are the room's as ever (the page asks the pick, and
  // the pick meets the glasses only on their frame)
  function frame(dt){
    if(!anim&&!on) return;
    T+=dt;
    if(anim){ anim.t+=dt/(anim.dir>0?UP:DOWN); const x=Math.min(1,anim.t), e=ease(anim.dir>0?x:1-x);
      worn(); rig.position.lerpVectors(restP,wornP,e); rig.quaternion.slerpQuaternions(restQ,wornQ,Math.min(1,e*1.25));
      const sh=shadow(); if(sh) sh.material.opacity=(sh.userData.dark??=sh.material.opacity)*Math.max(0,1-e*5);
      k=Math.max(0,(e-.55)/.45); ahead=e>.6;
      if(x>=1){ if(anim.dir<0){ rig.position.copy(restP); rig.quaternion.copy(restQ); k=0; lens(false); } anim=null; } }
    else { worn(); rig.position.copy(wornP); rig.quaternion.copy(wornQ); }   // (on: they stay with the view as it drifts)
    if(shader) soft(k,T); else { lens(false); look(k,T); }
    if(wear>0&&on&&!anim&&performance.now()>offAt) take();
  }
  return {toggle,put,take,frame,frameAt,rig,parts,glass,pads,lensMat,LENS,get ahead(){ return ahead; },get lenses(){ return lenses; },get shader(){ return shader; },set shader(v){ shader=!!v; },set paint(v){ paint=+v; },
    tip:()=>on?TIP_OFF:TIP_ON,
    get on(){ return on; },get busy(){ return !!anim||(on&&!reduce); },get k(){ return k; },get anim(){ return anim&&{...anim}; }};
}
