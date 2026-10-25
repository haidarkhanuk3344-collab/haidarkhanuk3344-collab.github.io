// Interviews: the radio cassette player on the desk (gear_walkman) plays the tape of them, and the tape's inlay card comes up
// with the track list (Felix, 16 Oct 21:07Z: an "interviews" section, "a link in the navigation as well as a short small
// interaction on the desk (maybe the tape recorder)"). A click on the player, or INTERVIEWS in the menu, starts the tape: the
// play key clunks, the two hubs behind the window turn (the fuller reel slower, as on a real deck), and the inlay card slides up
// from behind the player, unfolds toward you and floats on the right of the picture, like the notepad and the credits card.
// Each line on it is one interview; a click on a line opens it in a new tab. A click anywhere else, Esc, or the player again
// stops the tape and puts the card back.
//
// 17 Oct 18:46Z, Felix: the section moves out of the menu and into Work. "The work section is already a collection of VHS
// cassettes. There, add a small Walkman cassette - and if the user clicks it, put it in the Walkman, pan over to the Walkman,
// and show the existing little pamphlet". So the tape is out of the player until it is asked for: it lies on the shelf's
// right-hand stack of VHS tapes (the pick map's {kind:"ivtape"}), the player's pocket is empty, and lift() first brings the
// cassette over and slides it down into the pocket; lower() sends it home again once the card is on its way back.
//
// createInterviews(THREE, ctx) takes the loaded room and returns the controller (null if the room has no cassette player):
//   ctx.scene, ctx.root   the room (the player is gear_walkman: a mesh per material, plus gear_walkman_glass)
//   ctx.interact          the page's pick map: the player joins it as {kind:"walkman"} (it never moves, so the page may still
//                         draw it joined), the card as {kind:"interviews"}
//   ctx.view()            the camera the room is drawn with, as it is this frame (the card floats in front of it)
//   ctx.content()         [[show, url, when]]: the interviews, in the order the HTML sheet lists them (the show's name and,
//                         if there is one, the month)
//   ctx.label()           what the pen wrote on the spine (the year)
//   ctx.note()            a line or two in the same pen under the list (optional; Felix's own words about the list)
//   ctx.audio()           {ctx, out} while the room has sound, else null
//   ctx.fonts             a promise for the page's web fonts (Caveat for the pen, Archivo for the print)
//   ctx.reduce            prefers-reduced-motion: no flight, no bob, the hubs stand still
//   ctx.anisotropy        renderer.capabilities.getMaxAnisotropy()
// The controller: lift(instant) puts the tape in, starts it and brings the card up, lower(instant) stops it, puts the card back
// and the tape back on the shelf, play(on) the same without the card (a phone's sheet), up, busy (moving, or the tape running:
// the room keeps drawing), moving (the cassette is on its way or settling: the shadows want redrawing), seat (0 on the shelf
// to 1 in the pocket), tape (the cassette's mesh), playing, frame(dt, t) once a frame after the view is final,
// at(x, y) and tip(x, y) for the pointer (client pixels), leave(), focus(i) for the line the keyboard is on (-1 for none),
// playerTip(), width(), toScreen(px, py), regions, canvas, mesh, hubs.
export function createInterviews(THREE, ctx){
  const V3=THREE.Vector3, Q4=THREE.Quaternion, M4=THREE.Matrix4;
  const {scene, root}=ctx;
  // what the section is called (the menu's word): on the flap, in the tips, in pen on the tape. Felix, 17 Oct 17:35Z: "podcasts"
  const NAME=String(ctx.title?.()||"Interviews").trim().slice(0,14), CAPS=NAME.toUpperCase(), SHOW="WALKMAN · SHOW "+CAPS;   // the hover tip on the cassette and on the player (Felix, 17 Oct 22:25Z: not "Play", nothing plays)
  const parts=[]; root.traverse(o=>{ if(o.isMesh&&o.geometry&&/^gear_walkman(~\d+)?$/.test(o.name)) parts.push(o); });
  if(!parts.length) return null;
  const glass=root.getObjectByName("gear_walkman_glass");
  scene.updateMatrixWorld(true);
  const box=new THREE.Box3(); parts.forEach(o=>box.expandByObject(o));
  const mid=box.getCenter(new V3());

  // ---- the two hubs behind the window: their discs and teeth are one mesh (the cassette hub's material). It comes apart into a
  // left and a right hub, each in a frame of its own (origin on its spindle, z out of the door), so each can turn. They keep
  // their light-map UVs: the bake lights them where they stand, and a turning tooth is too small to give that away.
  const hubs=[]; let n=new V3(0,0,1), right=new V3(1,0,0), up=new V3(0,1,0);
  const hubPart=parts.find(o=>o.userData.mname==="gear_cassette_hub");
  if(hubPart){
    const g=hubPart.geometry, pa=g.attributes.position, na=g.attributes.normal, m=hubPart.matrixWorld, nm=new THREE.Matrix3().getNormalMatrix(m);
    const P=[], N=[]; for(let i=0;i<pa.count;i++){ P.push(new V3().fromBufferAttribute(pa,i).applyMatrix4(m)); N.push(new V3().fromBufferAttribute(na,i).applyMatrix3(nm).normalize()); }
    const ix=g.index?Array.from(g.index.array):[...Array(pa.count).keys()];
    // the door's normal: the way the discs' faces look (the biggest share of their area), level with the desk
    const acc=new V3(), e1=new V3(), e2=new V3();
    for(let t=0;t+2<ix.length;t+=3){ const a=P[ix[t]]; e1.subVectors(P[ix[t+1]],a).cross(e2.subVectors(P[ix[t+2]],a)); if(Math.abs(e1.y)<e1.length()*.2&&e1.z>0) acc.add(e1); }
    // then only the flat faces near that way: the walls and the teeth's sides lean it 3 degrees, and a hub turned about a leaning
    // axis wobbles (its face tips to and fro, and its light with it)
    if(acc.lengthSq()>0){ const n0=acc.clone().normalize(); acc.set(0,0,0);
      for(let t=0;t+2<ix.length;t+=3){ const a=P[ix[t]]; e1.subVectors(P[ix[t+1]],a).cross(e2.subVectors(P[ix[t+2]],a)); if(e1.dot(n0)>e1.length()*.95) acc.add(e1); }
      if(acc.lengthSq()===0) acc.copy(n0);   // (no flat faces found: keep the first guess)
      acc.y=0; n.copy(acc).normalize(); }
    right.crossVectors(up,n).normalize();
    const side=v=>e1.subVectors(v,mid).dot(right)<0?0:1, boxes=[new THREE.Box3(),new THREE.Box3()];
    P.forEach(v=>boxes[side(v)].expandByPoint(v));
    for(let s=0;s<2;s++){
      if(boxes[s].isEmpty()) continue;
      const C=boxes[s].getCenter(new V3()), map=new Map(), pos=[], nrm=[], uv=[], uv1=[], idx=[], U=g.attributes.uv, U1=g.attributes.uv1;
      for(let t=0;t+2<ix.length;t+=3){ if(side(P[ix[t]])!==s) continue;
        for(let k=0;k<3;k++){ const i=ix[t+k]; let j=map.get(i);
          if(j==null){ j=pos.length/3; map.set(i,j); const q=e1.subVectors(P[i],C); pos.push(q.dot(right),q.dot(up),q.dot(n)); const w=N[i]; nrm.push(w.dot(right),w.dot(up),w.dot(n));
            if(U) uv.push(U.getX(i),U.getY(i)); if(U1) uv1.push(U1.getX(i),U1.getY(i)); }
          idx.push(j); } }
      const hg=new THREE.BufferGeometry(); hg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3)); hg.setAttribute("normal",new THREE.Float32BufferAttribute(nrm,3));
      if(U) hg.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2)); if(U1) hg.setAttribute("uv1",new THREE.Float32BufferAttribute(uv1,2));
      hg.setIndex(idx); hg.computeBoundingBox(); hg.computeBoundingSphere();
      const hub=new THREE.Mesh(hg,hubPart.material); hub.name="walkman_hub_"+"lr"[s]; hub.userData.mname=hubPart.userData.mname;
      new M4().makeBasis(right,up,n).setPosition(C).decompose(hub.position,hub.quaternion,hub.scale);
      scene.add(hub); hub.updateMatrixWorld(true);
      hubs.push({mesh:hub,base:hub.quaternion.clone(),a:0,r:boxes[s].getSize(new V3()).length()}); }
    if(hubs.length===2){ const e=g.clone(); e.setIndex([]); hubPart.geometry=e; hubPart.visible=false; }
  } else { const acc=new V3(0,0,1); n.copy(acc); right.crossVectors(up,n).normalize(); }
  // the tape's label: the scene's cassette says "night drive" in pen (the only pen on the player). This tape is the interviews,
  // so that writing goes and "interviews" is written in its place, in the same hand as the inlay card
  const inkPart=parts.find(o=>o.userData.mname==="gear_ink_blue");
  let titleDraw=null, titleMesh=null, tapeDraw=null;
  if(inkPart&&inkPart.geometry.attributes.position.count){
    const pa=inkPart.geometry.attributes.position, m=inkPart.matrixWorld, v=new V3(); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,d=0;
    for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i).applyMatrix4(m).sub(mid); const x=v.dot(right), y=v.dot(up); x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); d+=v.dot(n)/pa.count; }
    if(x1-x0<.04&&y1-y0<.008){   // (a word on the label, not something else in pen)
      const TW=512, TH=112, ph=.0062, pw=ph*TW/TH, tc=document.createElement("canvas"); tc.width=TW; tc.height=TH;
      const tt=new THREE.CanvasTexture(tc); tt.colorSpace=THREE.SRGBColorSpace; tt.anisotropy=ctx.anisotropy||8;
      titleDraw=()=>{ const g=tc.getContext("2d"); g.clearRect(0,0,TW,TH); g.font='600 84px Caveat, "Segoe Print", "Bradley Hand", cursive'; g.fillStyle="#fff"; g.textBaseline="alphabetic"; g.fillText(NAME.toLowerCase(),6,78); tt.needsUpdate=true; };
      titleDraw();
      const tm=new THREE.MeshBasicMaterial({map:tt,color:new THREE.Color(.014,.02,.055),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}), t=new THREE.Mesh(new THREE.PlaneGeometry(pw,ph),tm); t.name="walkman_title"; titleMesh=t;
      const c=new V3().copy(mid).addScaledVector(right,x0+pw/2-.0005).addScaledVector(up,(y0+y1)/2+.0006).addScaledVector(n,d+.0002);   // (between the label and the window's pane, .4 mm apart)
      new M4().makeBasis(right,up,n).setPosition(c).decompose(t.position,t.quaternion,t.scale); t.renderOrder=-1; scene.add(t); t.updateMatrixWorld(true);
      const e=inkPart.geometry.clone(); e.setIndex([]); inkPart.geometry=e; inkPart.visible=false; }
  }
  // the tape runs at 4.76 cm/s past the head, so the fuller reel (the left one, 15.8 mm of tape) turns slower than the take-up
  // reel (11.3 mm); both turn anticlockwise, seen from the front
  const SPEED=[.0476/.0158,.0476/.0113];
  for(const o of parts) if(o.visible) ctx.interact.set(o,{kind:"walkman",label:SHOW});
  if(glass) ctx.interact.set(glass,{kind:"walkman",label:SHOW});
  hubs.forEach(h=>ctx.interact.set(h.mesh,{kind:"walkman",label:SHOW}));

  // ---- the inlay card (a cassette's J-card, opened out): 101.6 mm wide, four panels down its length, creased between them:
  // the back flap, the spine, the front panel (side A) and the inner panel (side B). Canvas: 10 px a millimetre.
  const CWm=.1016, PAN=[.020,.013,.073,.053], CHm=PAN.reduce((a,b)=>a+b,0), CW=1016, CH=Math.round(CHm*10000), PX=CH/CHm;
  const Y0=[0]; PAN.forEach(h=>Y0.push(Y0[Y0.length-1]+h*PX));   // each panel's top on the canvas
  const cv=document.createElement("canvas"); cv.width=CW; cv.height=CH;
  const tex=new THREE.CanvasTexture(cv); tex.flipY=false; tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=ctx.anisotropy||8;
  // the creases keep a little of their fold: the spine leans back from the front panel, the flap further, and the inner panel
  // comes forward. The front panel lies in the card's own plane.
  const geo=(()=>{ const pos=[], uv=[], idx=[], deg=THREE.MathUtils.degToRad;
    const strip=(ya,za,yb,zb,va,vb)=>{ const b=pos.length/3; pos.push(-CWm/2,ya,za, CWm/2,ya,za, -CWm/2,yb,zb, CWm/2,yb,zb); uv.push(0,va,1,va,0,vb,1,vb); idx.push(b,b+2,b+1,b+1,b+2,b+3); };
    const top=PAN[2]/2, v=k=>Y0[k]/CH;   // the front panel: from top down to -top... its top edge at y=top
    const yA=PAN[2]*.5, yB=-PAN[2]*.5;
    strip(yA,0,yB,0,v(2),v(3));
    let a=deg(9), y=yA+Math.cos(a)*PAN[1], z=-Math.sin(a)*PAN[1]; strip(y,z,yA,0,v(1),v(2));
    const a2=deg(9+15), y2=y+Math.cos(a2)*PAN[0], z2=z-Math.sin(a2)*PAN[0]; strip(y2,z2,y,z,v(0),v(1));
    const b=deg(7), y3=yB-Math.cos(b)*PAN[3], z3=Math.sin(b)*PAN[3]; strip(yB,0,y3,z3,v(3),v(4));
    const off=(y2+y3)/2; for(let i=1;i<pos.length;i+=3) pos[i]-=off;   // the card's frame: origin at the middle of its height
    const g=new THREE.BufferGeometry(); g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3)); g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx);
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.h=y2-y3; return g; })();
  const HEIGHT=geo.userData.h;

  const rng=seed=>()=>((seed=Math.imul(seed^seed>>>15,seed|1)+0x6D2B79F5|0,((seed^seed>>>7)>>>0)/4294967296));
  const hash=s=>{ let h=2166136261; for(const ch of String(s)) h=Math.imul(h^ch.charCodeAt(0),16777619); return h>>>0; };
  const INK="#20222b", BLUE="#2538c4", PEN="#23307a", RULE="rgba(37,56,196,.30)";
  const PRINT=(px,w=800,st="condensed")=>`${w} ${st} ${px}px Archivo, "Arial Narrow", sans-serif`;
  const HAND=px=>`600 ${px}px Caveat, "Segoe Print", "Bradley Hand", cursive`;
  // the stock: a coated off-white card with a faint tooth, darker in the creases, and the print that every blank inlay has
  const paperCv=(()=>{ const c=document.createElement("canvas"); c.width=CW; c.height=CH; const g=c.getContext("2d"), r=rng(7);
    g.fillStyle="#f1ecdf"; g.fillRect(0,0,CW,CH);
    for(let i=0;i<26;i++){ const x=r()*CW,y=r()*CH,rr=90+r()*240,gr=g.createRadialGradient(x,y,0,x,y,rr);
      gr.addColorStop(0,r()<.5?`rgba(255,253,244,${.05+r()*.05})`:`rgba(160,146,112,${.03+r()*.03})`); gr.addColorStop(1,"rgba(0,0,0,0)"); g.fillStyle=gr; g.fillRect(x-rr,y-rr,rr*2,rr*2); }
    for(let i=0;i<7000;i++){ const x=r()*CW,y=r()*CH,l=r()<.6; g.fillStyle=l?`rgba(255,255,250,${.12+r()*.12})`:`rgba(100,92,74,${.03+r()*.06})`; g.fillRect(x,y,1+r()*2,.8+r()*.9); }
    // the back flap: ink blue, stippled toward its lower edge (the poster on the wall is printed the same way)
    g.fillStyle=BLUE; g.fillRect(0,0,CW,Y0[1]);
    for(let i=0;i<5200;i++){ const y=Math.pow(r(),.55)*Y0[1], x=r()*CW; g.fillStyle=`rgba(241,236,223,${.25+r()*.6})`; g.beginPath(); g.arc(x,y,.9+r()*1.5*(y/Y0[1]),0,7); g.fill(); }
    // the spine: a blue rule along each crease
    g.fillStyle=BLUE; g.fillRect(0,Y0[1],CW,5); g.fillRect(0,Y0[2]-5,CW,5);
    for(const k of [1,2,3]){ const y=Y0[k], gr=g.createLinearGradient(0,y-14,0,y+14); gr.addColorStop(0,"rgba(60,50,30,0)"); gr.addColorStop(.5,"rgba(60,50,30,.16)"); gr.addColorStop(1,"rgba(60,50,30,0)"); g.fillStyle=gr; g.fillRect(0,y-14,CW,28); }
    return c; })();

  // what's written on it: side A and side B, a ruled line an interview (the show's name in pen, nothing else: Felix,
  // 16 Oct: "No description, please - just the title of the podcast"). LEFT/RIGHT are the writing's margins.
  const LEFT=58, RIGHT=CW-54, NUM=LEFT+70, PITCH=98;
  let regions=[], hoverLink=-1, focusLink=-1, drawnKey="", fontsOk=false;
  const fit=(g,text,max,px,min,font)=>{ for(;px>min;px-=1){ g.font=font(px); if(g.measureText(text).width<=max) return px; } g.font=font(min); return min; };
  const clip=(g,text,max)=>{ if(g.measureText(text).width<=max) return text; let t=text; while(t.length>4&&g.measureText(t+"…").width>max) t=t.slice(0,-1).trimEnd(); return t+"…"; };
  function marker(g,xa,xb,y,h,seed){ const r=rng(hash(seed)); g.save(); g.fillStyle="rgba(255,222,64,.55)"; g.beginPath();
    g.moveTo(xa-10+r()*6,y-h+r()*5); g.lineTo(xb+6,y-h-3+r()*5); g.lineTo(xb+14,y-h*.4); g.lineTo(xb+4,y+h*.25+r()*5); g.lineTo(xa-8,y+h*.3-r()*5); g.closePath(); g.fill(); g.restore(); }
  function hand(g,text,x,y,px,color,seed,align="left"){ const r=rng(hash(seed)); g.save(); g.font=HAND(px); g.fillStyle=color; g.textBaseline="alphabetic";
    const w=g.measureText(text).width; let cx=align==="right"?x-w:x; g.translate(cx,y); g.rotate((r()-.5)*.012); g.globalAlpha=.9; g.fillText(text,0,0); g.globalAlpha=.25; g.fillText(text,.6,.5); g.restore(); return w; }
  function draw(){
    const g=cv.getContext("2d"); g.globalAlpha=1; g.drawImage(paperCv,0,0); g.textBaseline="alphabetic"; g.textAlign="left";
    const items=ctx.content()||[], rs=[];
    // the flap
    g.fillStyle="#f6f2e8"; g.font=PRINT(118,900,"expanded"); g.textAlign="left"; const tw=g.measureText(CAPS).width, sx=Math.min(1,(CW-2*LEFT)/tw);
    g.save(); g.translate(LEFT,Y0[1]-52); g.scale(sx,1); g.fillText(CAPS,0,0); g.restore();
    g.font=PRINT(26,700); g.fillText("TYPE I · NORMAL POSITION",LEFT+2,48); g.textAlign="right"; g.fillText("C-90",RIGHT,48); g.textAlign="left";
    // the spine: the year in pen, the length in its box (no name on it: the room says whose it is)
    const sy=(Y0[1]+Y0[2])/2, label=String(ctx.label?.()??"");
    g.strokeStyle=INK; g.fillStyle=INK; g.lineWidth=4; g.strokeRect(RIGHT-92,sy-30,92,60); g.font=PRINT(40,900); g.textAlign="center"; g.fillText("90",RIGHT-46,sy+15);
    g.font=PRINT(22,800); g.textAlign="right"; g.fillText("LOW NOISE · HIGH OUTPUT",RIGHT-116,sy+8); g.textAlign="left";
    if(fontsOk&&label) hand(g,label,LEFT+4,sy+24,76,PEN,"span");
    // one list, all of it side A (Felix, 16 Oct: "can we do just one list (everything is side a)? and adding the month was
    // nice"): the rules run on over the crease onto the inner panel, where a longer list continues
    const head=Y0[2]+74, slots=[];
    for(let y=head+16+PITCH;y<=Y0[3]-26;y+=PITCH) slots.push(y);
    for(let y=Y0[3]+26+PITCH;y<=Y0[4]-70;y+=PITCH) slots.push(y);
    g.fillStyle=BLUE; g.font=PRINT(44,900); g.fillText("SIDE A",LEFT,head);
    g.font=PRINT(22,700); g.textAlign="right"; g.fillText("NR  ☐ ON  ☒ OFF",RIGHT,head-4); g.textAlign="left";
    g.fillStyle=BLUE; g.fillRect(LEFT,head+16,RIGHT-LEFT,3);
    for(const y of slots){ g.fillStyle=RULE; g.fillRect(LEFT,y,RIGHT-LEFT,2); }
    items.slice(0,slots.length).forEach((it,i)=>{
      const y=slots[i]-18, on=i===hoverLink||i===focusLink, when=String(it[2]||"");
      rs.push({i,x0:LEFT-14,x1:RIGHT+14,y0:y-PITCH+24,y1:y+22,url:it[1],text:it[0]});
      if(on) marker(g,LEFT,RIGHT-10,y-16,36,"m1"+i);
      g.fillStyle=BLUE; g.font=PRINT(26,800); g.fillText("A"+(i+1),LEFT,y-4);
      if(!fontsOk) return;
      g.font=HAND(46); const ww=when?g.measureText(when).width+34:0; if(when) hand(g,when,RIGHT-6,y,46,"rgba(35,48,122,.78)","w"+i,"right");
      const px=fit(g,it[0],RIGHT-NUM-8-ww,70,40,HAND); hand(g,it[0],NUM,y,px,PEN,"s"+i);
    });
    // the note: his own line or two under the list, in the same pen, a rule left empty between (Felix, 17 Oct: an
    // "interviews" thing "makes me look really arrogant"; the note says who asked for these and where the smart parts come
    // from). It takes the rules the list left; the biggest hand that fits them, and nothing at all rather than half a note.
    const note=String(ctx.note?.()??"").replace(/\s+/g," ").trim(), free=slots.slice(Math.min(items.length,slots.length)+1);
    if(fontsOk&&note&&free.length){
      const wrap=px=>{ g.font=HAND(px); const out=[]; let line=""; for(const w of note.split(" ")){ const t=line?line+" "+w:w; if(line&&g.measureText(t).width>RIGHT-LEFT-12){ out.push(line); line=w; } else line=t; } if(line) out.push(line); return out; };
      let px=54, lines=wrap(px); while(lines.length>free.length&&px>40){ px-=2; lines=wrap(px); }
      if(lines.length<=free.length) lines.forEach((t,k)=>hand(g,t,LEFT+6,free[k]-18,px,"rgba(35,48,122,.86)","n"+k));
    }
    // the small print along the foot: what a blank tape's card says
    g.fillStyle="rgba(32,34,43,.62)"; g.font=PRINT(21,700); g.textAlign="left"; g.fillText("NORMAL BIAS · 120 µs EQ · 2 × 45 MIN · KEEP AWAY FROM MAGNETIC FIELDS",LEFT,CH-26);
    regions=rs; tex.needsUpdate=true; }
  const key=()=>[hoverLink,focusLink,fontsOk].join("|");
  function redraw(force){ const k=key(); if(!force&&k===drawnKey) return; drawnKey=k; draw(); }
  Promise.resolve(ctx.fonts).then(()=>{ fontsOk=true; redraw(true); titleDraw&&titleDraw(); tapeDraw&&tapeDraw(); });
  setTimeout(()=>{ if(!fontsOk){ fontsOk=true; redraw(true); tapeDraw&&tapeDraw(); } },4000);
  redraw(true);

  // ---- the door: it opens for the cassette (Felix, 17 Oct 19:43Z: "an animation putting the cassette into the player"). The room
  // joins the player's meshes with its own for drawing, so before it does, what is on the door (the door, its window, what is
  // printed on it) is cut out of them: those meshes are hidden (they still answer the pointer) and copies stand in the scene,
  // the door's share on a hinge along its lower front edge. The door tips open, the cassette slides down its inside, and the door
  // takes it in under the keys.
  const door=new THREE.Group(); door.name="interviews_door"; const hinge=new V3(); let doorA=0, DOOR=0;
  { const dp=parts.find(o=>o.userData.mname==="gear_walkman_door");
    if(dp){
      const lo=new V3(1e9,1e9,1e9), hi=new V3(-1e9,-1e9,-1e9), w=new V3(), l=new V3(), toL=v=>l.set(v.dot(right),v.dot(up),v.dot(n));
      const dpa=dp.geometry.attributes.position; for(let i=0;i<dpa.count;i++){ toL(w.fromBufferAttribute(dpa,i).applyMatrix4(dp.matrixWorld)); lo.min(l); hi.max(l); }
      hinge.set(0,0,0).addScaledVector(right,(lo.x+hi.x)/2).addScaledVector(up,lo.y).addScaledVector(n,hi.z);
      door.position.copy(hinge); scene.add(door);
      const still=new THREE.Group(); still.name="interviews_body"; scene.add(still);
      const back=new M4().makeTranslation(-hinge.x,-hinge.y,-hinge.z), a=new V3(), b=new V3(), c=new V3();
      const sub=(s,tris)=>{ const g=new THREE.BufferGeometry(); for(const k in s.attributes){ const at=s.attributes[k], sz=at.itemSize, arr=new at.array.constructor(tris.length*3*sz);
          tris.forEach((t,j)=>arr.set(at.array.subarray(t*sz,(t+3)*sz),j*3*sz)); g.setAttribute(k,new THREE.BufferAttribute(arr,sz,at.normalized)); } return g; };
      const copy=(o,g,m,to)=>{ const q=new THREE.Mesh(g,o.material); q.name=to.name+"_part"; q.userData.mname=o.userData.mname; q.renderOrder=o.renderOrder; q.castShadow=o.castShadow; q.receiveShadow=o.receiveShadow;
        q.layers.mask=o.layers.mask; q.matrixAutoUpdate=false; q.matrix.copy(m); q.raycast=()=>{}; to.add(q); };
      const tris=(o,s,f)=>{ const p=s.attributes.position; for(let t=0;t+2<p.count;t+=3){ a.fromBufferAttribute(p,t).add(b.fromBufferAttribute(p,t+1)).add(c.fromBufferAttribute(p,t+2)).multiplyScalar(1/3).applyMatrix4(o.matrixWorld); toL(a); f(t); } };
      const flat=o=>Object.values(o.geometry.attributes).some(at=>at.isInterleavedBufferAttribute)?null:o.geometry.index?o.geometry.toNonIndexed():o.geometry;
      // what goes with the door, by where it is: the door's mesh is a plate at the front with a lip along the top, as deep as the
      // pocket, and the keys stand on that lip. The keys don't move (Felix, 17 Oct 20:27Z: "the buttons animate with it. That seems
      // wrong"), so the lip stays under them: the door is the plate, and what lies on its front (the window, the lines and names
      // printed there). What is behind the plate is the pocket's, and stays
      const H=hi.y-lo.y, D=hi.z-lo.z, front=()=>l.z>lo.z+.7*D;
      const onDoor=own=>own?l.y<lo.y+.88*H||front():l.x>lo.x-.0005&&l.x<hi.x+.0005&&l.y>lo.y-.0005&&l.y<hi.y+.0005&&l.z<hi.z+.003&&front();
      for(const o of parts.concat(glass?[glass]:[])){ const mn=o.userData.mname||"";
        if(!o.visible||(o!==dp&&o!==glass&&!/^gear_(walkman_(chamfer|print|accent)|print_(dark|light))$/.test(mn))) continue;
        const s=flat(o), inn=[], out=[];
        if(s) tris(o,s,t=>(onDoor(o===dp)?inn:out).push(t));
        else if(o===dp||o===glass) inn.push(0);   // (a geometry that can't be cut: whole, or not at all)
        if(!inn.length) continue;
        o.visible=false; const whole=!out.length;
        copy(o,whole||!s?o.geometry:sub(s,inn),new M4().multiplyMatrices(back,o.matrixWorld),door);
        if(!whole) copy(o,sub(s,out),o.matrixWorld,still);
      }
      door.updateMatrixWorld(true); still.updateMatrixWorld(true); DOOR=.5;
    } }
  function setDoor(a){ if(a===doorA) return; doorA=a; door.quaternion.setFromAxisAngle(right,a); door.updateMatrixWorld(true); }

  // ---- the tape itself, out of the player. In the pocket it is the model's own tape (label, shell, packs, the two hubs, the
  // pen title): those parts are hidden while it's out, from before the room joins its meshes for drawing, so they are never
  // joined and can come and go. Out of the pocket it is a cassette made here, 100.4 x 63.8 x 12 mm, both faces drawn 10 px a
  // millimetre after the model's label (A, the title in pen on a ruled line, 90, the blue stippled band, the window).
  const inPlayer=parts.filter(o=>o.visible&&/^gear_cassette_/.test(o.userData.mname||"")).concat(hubs.map(h=>h.mesh),titleMesh?[titleMesh]:[]);
  const TW=.1004, TH=.0638, TD=.012, TCW=1024, TCH=1344, FW=1004, FH=638, HUB=25.9;   // (HUB: the hubs' line, mm from the top edge)
  const tcv=document.createElement("canvas"); tcv.width=TCW; tcv.height=TCH;
  const ttex=new THREE.CanvasTexture(tcv); ttex.flipY=false; ttex.colorSpace=THREE.SRGBColorSpace; ttex.anisotropy=ctx.anisotropy||8;
  const rr=(g,x,y,w,h,r)=>{ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
  // The face follows the model's label to the tenth of a millimetre (walkman2.py: the label 82.6 x 40.6 round the hubs' line,
  // its stadium window 58 x 17, the band 10.7 to 17.3 below the line, A and 90 beside the window, the two rules and the
  // pen above it), so the moment the door shuts on this cassette and the model's own tape takes over, nothing moves.
  // The hubs' line is HUB mm under the cassette's top edge.
  // Lettering sized by its capitals: the model's text comes out .46 of its nominal size tall (Blender sets type by the fount's
  // full line, not its em), so each word here is set to the height its letters have on the model, measured off the canvas's own fount.
  const caps=(g,font,txt,mm)=>{ g.font=font(100); const a=g.measureText(txt).actualBoundingBoxAscent||70; return font(mm*1000/a); };
  function face(g,oy,side){ const r=rng(side==="A"?11:12), wy=HUB*10, hx=[FW/2-212.5,FW/2+212.5]; g.save(); g.translate(0,oy); g.beginPath(); g.rect(0,0,FW,FH); g.clip();
    // the shell: black, a little scuffed; five screws
    g.fillStyle="#1b1a1d"; g.fillRect(0,0,FW,FH);
    for(let i=0;i<900;i++){ g.fillStyle=`rgba(255,255,255,${.012+r()*.03})`; g.fillRect(r()*FW,r()*FH,1+r()*3,1); }
    g.strokeStyle="rgba(255,255,255,.08)"; g.lineWidth=3; rr(g,5,5,FW-10,FH-10,14); g.stroke();
    for(const [x,y] of [[36,36],[FW-36,36],[36,FH-36],[FW-36,FH-36],[FW/2,FH-66]]){ g.fillStyle="#0b0b0c"; g.beginPath(); g.arc(x,y,12,0,7); g.fill();
      g.strokeStyle="rgba(255,255,255,.14)"; g.lineWidth=2; g.beginPath(); g.moveTo(x-6,y); g.lineTo(x+6,y); g.moveTo(x,y-6); g.lineTo(x,y+6); g.stroke(); }
    // the raised foot, with the holes the deck's pins and capstans go through
    const fy=wy+232; g.fillStyle="#242327"; g.beginPath(); g.moveTo(168,fy); g.lineTo(FW-168,fy); g.lineTo(FW-112,FH); g.lineTo(112,FH); g.closePath(); g.fill(); g.strokeStyle="rgba(255,255,255,.07)"; g.lineWidth=2; g.stroke();
    g.fillStyle="#08080a"; for(const x of [300,FW-300]){ g.beginPath(); g.arc(x,FH-50,19,0,7); g.fill(); } for(const x of [402,FW-402]) g.fillRect(x-13,FH-66,26,30);
    // the label (19.3 mm below the line to 21.3 above it), its blue band stippled cream toward its top edge
    const lx=FW/2-413, lw=826, ly=wy-213, lh=406, by=wy+107, bh=66;
    g.save(); rr(g,lx,ly,lw,lh,8); g.clip();
    g.fillStyle="#eee8d8"; g.fillRect(lx,ly,lw,lh);
    for(let i=0;i<1400;i++){ g.fillStyle=`rgba(120,110,90,${.02+r()*.04})`; g.fillRect(lx+r()*lw,ly+r()*lh,1+r()*2,1+r()*2); }   // (the stock's tooth)
    g.fillStyle=BLUE; g.fillRect(lx,by,lw,bh);
    for(let i=0;i<1700;i++){ const t=Math.pow(r(),1.6), y=by+bh-40-t*(bh-40)+r()*6-3, x=lx+r()*lw; g.fillStyle=`rgba(239,233,218,${.35+r()*.6})`; g.beginPath(); g.arc(x,y,.6+2.6*Math.pow(1-t,1.5)*r(),0,7); g.fill(); }
    g.fillStyle="#f1ecdf"; g.font=caps(g,p=>PRINT(p,700),"T",.74); g.textAlign="left"; g.fillText("TYPE I  ·  NORMAL POSITION  ·  IEC I",FW/2-385,wy+148); g.textAlign="right"; g.font=caps(g,p=>PRINT(p,800),"C",1.56); g.fillText("C-90",FW/2+385,wy+150);
    g.restore();
    // beside the window: the side and the length; above it two ruled lines, the title in pen on the lower one (side A)
    g.fillStyle="#1f2129"; g.textAlign="center"; g.font=caps(g,p=>PRINT(p,900),"A",3.39); g.fillText(side,FW/2-352,wy+26); g.font=caps(g,p=>PRINT(p,900),"9",2.84); g.fillText("90",FW/2+352,wy+21); g.textAlign="left";
    g.fillStyle="rgba(80,100,170,.55)"; g.fillRect(FW/2-280,wy-109,580,2.5); g.fillRect(FW/2-280,wy-171,580,2.5);
    if(side==="A"&&fontsOk){ g.font=HAND(46.5); g.fillStyle=PEN; g.globalAlpha=.92; g.fillText(NAME.toLowerCase(),FW/2-252,wy-119); g.globalAlpha=1; }   // (as the pen title in the pocket: 84 px on its 112 px, 6.2 mm canvas)
    // the window: a blue rule round it, the shell's face in it with both packs of tape (the left one fuller), a hub in each, the
    // clear pane between them
    g.strokeStyle=BLUE; g.lineWidth=3; rr(g,FW/2-306,wy-101,612,202,101); g.stroke();
    g.save(); rr(g,FW/2-290,wy-85,580,170,85); g.clip(); g.fillStyle="#15141a"; g.fillRect(FW/2-290,wy-85,580,170);
    for(let i=0;i<260;i++){ g.fillStyle=`rgba(255,255,255,${.015+r()*.03})`; g.fillRect(FW/2-290+r()*580,wy-85+r()*170,1+r()*3,1); }
    g.save(); rr(g,FW/2-132,wy-54,264,108,12); g.clip(); g.fillStyle="#0d0c0e"; g.fillRect(FW/2-132,wy-54,264,108);   // the clear pane: the packs behind it
    [158,113].forEach((rad,k)=>{ g.fillStyle="#2c2017"; g.beginPath(); g.arc(hx[k],wy,rad,0,7); g.fill(); g.strokeStyle="rgba(255,235,210,.07)"; g.lineWidth=1.5;
      for(let q=70;q<rad;q+=9){ g.beginPath(); g.arc(hx[k],wy,q,0,7); g.stroke(); } });
    g.fillStyle="rgba(190,200,210,.10)"; g.fillRect(FW/2-132,wy-54,264,30); g.restore();
    g.fillStyle="rgba(220,215,200,.5)"; for(let t=0;t<9;t++) g.fillRect(FW/2-108+t*27-1,wy+56,2,t%4?8:13);   // the tick scale under the pane
    hx.forEach((x,k)=>{ g.fillStyle="#0a0a0c"; g.beginPath(); g.arc(x,wy,68,0,7); g.fill(); g.fillStyle="#e6e1d5"; g.beginPath(); g.arc(x,wy,66,0,7); g.fill(); g.fillStyle="#141316"; g.beginPath(); g.arc(x,wy,41,0,7); g.fill();
      g.fillStyle="#e6e1d5"; for(let t=0;t<6;t++){ g.save(); g.translate(x,wy); g.rotate(t*Math.PI/3+k*.4); g.fillRect(28,-5.5,14,11); g.restore(); }
      g.fillStyle="#2b2a2e"; g.beginPath(); g.arc(x,wy,16,0,7); g.fill(); });   // (the deck's spindle shows in the bore)
    g.restore();
    g.restore(); }
  tapeDraw=()=>{ const g=tcv.getContext("2d"); g.fillStyle="#161518"; g.fillRect(0,0,TCW,TCH); face(g,0,"A"); face(g,650,"B"); ttex.needsUpdate=true; };
  tapeDraw();
  const tgeo=new THREE.BoxGeometry(TW,TH,TD);
  { const uv=tgeo.attributes.uv;   // the box's faces come +x, -x, +y, -y, +z (side A), -z (side B), four corners each
    for(let i=0;i<uv.count;i++){ const f=i>>2, u=uv.getX(i), v=uv.getY(i);
      if(f===4) uv.setXY(i,u*FW/TCW,(1-v)*FH/TCH); else if(f===5) uv.setXY(i,u*FW/TCW,(650+(1-v)*FH)/TCH); else uv.setXY(i,(8+u*40)/TCW,(1300+(1-v)*30)/TCH); } }
  const tmat=new THREE.MeshStandardMaterial({map:ttex,roughness:.5,metalness:0}); tmat.envMapIntensity=.6;
  const tape=new THREE.Mesh(tgeo,tmat); tape.name="interviews_tape"; tape.castShadow=true; scene.add(tape);
  ctx.interact.set(tape,{kind:"ivtape",label:SHOW});
  // where it is at home: on the top tape of the stack of VHS tapes nearest the player, lying flat with side A up and its top edge
  // away from the room, a little askew to the tape under it: the way a cassette put down on a pile lies (Felix, 21 Oct 16:17Z,
  // of it stood on its long edge: "the way the cassette is rested on the other tapes doesn't look natural"; nothing on the
  // stack could hold it up, and nothing stands behind the stack for it to lean on). A tape of that
  // stack that leaves or comes back moves under it: it rests on whatever is under it this frame (it rides up on a tape sliding
  // in, and drops when one is pulled out), or on the desk if nothing is.
  const vhs=[]; { const seen=new Set(); for(const [o,i] of ctx.interact){ if(i.kind!=="tape") continue; let g=o; while(g&&!(g.userData&&g.userData.stack)) g=g.parent;
      if(!g||seen.has(g)) continue; seen.add(g); const b=new THREE.Box3().setFromObject(g), sz=b.getSize(new V3()); vhs.push({g,off:b.getCenter(new V3()).sub(g.position),hx:sz.x/2,hy:sz.y/2,hz:sz.z/2}); } }
  const spot=new V3(mid.x-.16,0,mid.z+.02);
  { const near=vhs.slice().sort((a,b)=>a.g.position.distanceToSquared(mid)-b.g.position.distanceToSquared(mid))[0];
    if(near){ const st=near.g.userData.stack, topT=vhs.filter(v=>v.g.userData.stack===st).sort((a,b)=>b.g.position.y-a.g.position.y)[0]; spot.set(topT.g.position.x+topT.off.x+.017,0,topT.g.position.z+topT.off.z+.003); } }   // (right of the tape's middle, its corners inside the tape's front edge)
  const YAW=-.17, STAND=TD/2, q0=new Q4().setFromRotationMatrix(new M4().makeBasis(new V3(Math.cos(YAW),0,-Math.sin(YAW)),new V3(-Math.sin(YAW),0,-Math.cos(YAW)),new V3(0,1,0)));   // (STAND: its middle over what it lies on; YAW about the room's up, its right end toward the room)
  let restY=0, vy=0, resting=true;
  const under=()=>{ let y=box.min.y; for(const v of vhs){ const p=v.g.position, top=p.y+v.off.y+v.hy;
      if(Math.abs(p.x+v.off.x-spot.x)<v.hx+.02&&Math.abs(p.z+v.off.z-spot.z)<v.hz+.012&&top-(restY-STAND)<.045) y=Math.max(y,top); } return y+STAND+.0002; };
  restY=1e3; restY=under();
  // its shadow on what it lies on (the room's light is baked: nothing else would draw one), fading as it leaves
  const bcv=document.createElement("canvas"); bcv.width=128; bcv.height=96; { const g=bcv.getContext("2d"); g.shadowColor="#000"; g.shadowBlur=9; g.shadowOffsetX=300; g.fillRect(16-300,16,96,64); }
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(TW*1.04*128/96,TH*1.06*96/64),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(bcv),color:0,transparent:true,depthWrite:false,opacity:.55,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  blob.name="interviews_tape_shadow"; blob.quaternion.copy(q0); blob.raycast=()=>{}; scene.add(blob);
  // in the pocket: square to the door, side A's face in the plane of the model's label, its hubs on the model's. The cassette is
  // life size and the door's plate 5 mm shorter, so riding the door shut from there its top edge would swing through the lip
  // over the door and the keys' front (Felix, 17 Oct 20:40Z: "as the walkman closes, it clips into the top of the device").
  // It goes in the way a deck takes it instead: it drops DROP deeper into the open door, below the plate's top edge, the door
  // shuts on it clear of everything, and in the shut door the tape comes up those 4.5 mm onto the head as it engages: that last
  // bit is the model's own tape rising into place behind the pane (the two change places the moment the door claps shut,
  // when both stand still and the eye is on the door).
  const qIn=new Q4().setFromRotationMatrix(new M4().makeBasis(right,up,n));
  const pocket=hubs.length===2?hubs[0].mesh.position.clone().add(hubs[1].mesh.position).multiplyScalar(.5):mid.clone();
  { const lab=parts.find(o=>o.userData.mname==="gear_cassette_label"), d=lab?new THREE.Box3().setFromObject(lab).getCenter(new V3()).sub(pocket).dot(n):0;
    pocket.addScaledVector(n,d-TD/2-.0004).addScaledVector(up,HUB/1000-TH/2); }
  const DROP=.0045, low=pocket.clone().addScaledVector(up,-DROP), above=low.clone().addScaledVector(up,.085), tcast=THREE.Mesh.prototype.raycast;
  // In the door the cassette is lit as the model's tape is, by the bake (the label's own irradiance texels), so that when the two
  // change places nothing jumps: lit by the lamps alone, the label came out tan next to the bake's cream. On the stack the
  // lamps light it as before; seatK slides it from the one light to the other on the way over. This borrows the page's baked
  // shader off the label (as the page's ownMaterial does); if that shader isn't the one this was written for, the lamps light
  // it all the way, as they did till now.
  const seatK={value:0};
  { const lab=parts.find(o=>o.userData.mname==="gear_cassette_label"), lm=lab&&lab.material, g=lab&&lab.geometry, u1=g&&g.attributes.uv1;
    const A="reflectedLight.directDiffuse=vec3(0.);", B="reflectedLight.indirectDiffuse=material.diffuseColor*e;";
    let ok=!!(lm&&lm.lightMap&&typeof lm.onBeforeCompile==="function"&&u1&&g.attributes.position);
    if(ok) try{ const pr={uniforms:{},vertexShader:"",fragmentShader:"#include <lights_fragment_begin>\n#include <lights_fragment_end>\n"}; lm.onBeforeCompile(pr,null); ok=pr.fragmentShader.includes(A)&&pr.fragmentShader.includes(B); }catch(e){ ok=false; }
    if(ok){
      // one texel of the label's light for the whole cassette (the bake packs the label's triangles about the atlas one by one, so
      // its light can't be mapped across the face; its top strip lies in the shade of the rim over it, and the plate's back
      // bakes black): the one on the hubs' line where the A is printed, in whichever triangle facing the room holds that spot
      lab.updateWorldMatrix(true,false); const P=g.attributes.position, ix=g.index, nT=(ix?ix.count:P.count)/3, vi=i=>ix?ix.getX(i):i, w=[new V3(),new V3(),new V3()], e1=new V3(), e2=new V3();
      const at=(hubs.length===2?hubs[0].mesh.position.clone().add(hubs[1].mesh.position).multiplyScalar(.5):new THREE.Box3().setFromObject(lab).getCenter(new V3())).addScaledVector(right,-.036).addScaledVector(up,.002), dl=lab?new THREE.Box3().setFromObject(lab).getCenter(new V3()).sub(at).dot(n):0;
      let best=null;
      for(let t=0;t<nT&&!best;t++){ const k=[vi(3*t),vi(3*t+1),vi(3*t+2)]; k.forEach((j,q)=>w[q].fromBufferAttribute(P,j).applyMatrix4(lab.matrixWorld).sub(at));
        if(e1.subVectors(w[1],w[0]).cross(e2.subVectors(w[2],w[0])).dot(n)<=e1.length()*.9||Math.abs((w[0].dot(n)+w[1].dot(n)+w[2].dot(n))/3-dl)>.001) continue;   // its back or an edge, or not the plate at all
        const X=w.map(p=>p.dot(right)), Y=w.map(p=>p.dot(up)), D=(Y[1]-Y[2])*(X[0]-X[2])+(X[2]-X[1])*(Y[0]-Y[2]); if(Math.abs(D)<1e-12) continue;
        const l0=((Y[1]-Y[2])*-X[2]+(X[2]-X[1])*-Y[2])/D, l1=((Y[2]-Y[0])*-X[2]+(X[0]-X[2])*-Y[2])/D, l2=1-l0-l1;
        if(l0<-1e-4||l1<-1e-4||l2<-1e-4) continue;
        best={u:l0*u1.getX(k[0])+l1*u1.getX(k[1])+l2*u1.getX(k[2]),v:l0*u1.getY(k[0])+l1*u1.getY(k[1])+l2*u1.getY(k[2])}; }
      if(best){ const tp=tgeo.attributes.position, uv=new Float32Array(tp.count*2); for(let i=0;i<tp.count;i++){ uv[2*i]=best.u; uv[2*i+1]=best.v; }
      tgeo.setAttribute("uv1",new THREE.BufferAttribute(uv,2));
      const m=lm.clone(); m.map=ttex; m.color.set(0xffffff); m.roughness=.5; m.metalness=0; m.envMapIntensity=.6; m.side=THREE.FrontSide; m.shadowSide=null; if("clearcoat" in m) m.clearcoat=0;
      m.onBeforeCompile=(sh,r)=>{ lm.onBeforeCompile(sh,r); sh.uniforms.seatK=seatK;
        sh.fragmentShader="uniform float seatK;\n"+sh.fragmentShader.replace(A,"reflectedLight.directDiffuse*=1.-seatK;").replace(B,"reflectedLight.indirectDiffuse=mix(reflectedLight.indirectDiffuse,material.diffuseColor*e,seatK);"); };
      m.customProgramCacheKey=()=>"interviews_tape|"+(lm.customProgramCacheKey?lm.customProgramCacheKey():"");
      tape.material=m; tmat.dispose(); } } }
  let seat=0, seatWant=0, after=null, ejectIn=0;   // seat: 0 on the shelf .. 1 in the pocket; after: what waits for it ("card" or "play")
  // the way in, as shares of seat: the door springs open (D0 to D1) while the cassette comes over (till SA); it drops down the
  // door's inside (till SB) and sits; the door shuts with it (C0 to SC); the tape comes up onto the head (till 1). The way out
  // is the same backwards: one pose for each value of seat.
  const SEAT_IN=2.5, SEAT_OUT=1.9, D0=.2, D1=.4, SA=.44, SB=.68, C0=.72, SC=.9;
  const aboveO=new V3(), qInO=new Q4(), tP0=new V3(), tb1=new V3(), tb2=new V3(), tp=new V3(), tq=new Q4(), nO=new V3();
  const swing=(v,a)=>v.sub(hinge).applyAxisAngle(right,a).add(hinge);
  swing(aboveO.copy(above),DOOR); qInO.setFromAxisAngle(right,DOOR).multiply(qIn); nO.copy(n).applyAxisAngle(right,DOOR);
  const shove=t=>t*t*(1.5-.5*t);   // pushed: it gathers speed and stops dead (a door shut, a cassette dropped in); backwards, a spring letting go
  const doorAt=c=>c<C0?win(D0,D1,c):c<SC?1-shove((c-C0)/(SC-C0)):0;
  // the model's tape, the hubs and the pen title ride up the last DROP together: each from where the model has it, less the drop
  const riders=inPlayer.map(o=>({o,p:o.position.clone(),up:up.clone().transformDirection(new M4().copy(o.parent?o.parent.matrixWorld:new M4()).invert()).multiplyScalar(DROP/(o.parent?o.parent.getWorldScale(new V3()).y:1))}));
  let drop=0;
  function setDrop(d){ if(d===drop) return; drop=d; for(const r of riders){ r.o.position.copy(r.p).addScaledVector(r.up,-d); r.o.updateMatrix(); r.o.updateMatrixWorld(true); } }
  function setSeat(){ const inn=seat>=SC; if(seat>=1){ setDoor(0); setDrop(0); } inPlayer.forEach(o=>{ o.visible=inn; }); tape.visible=!inn; tape.raycast=inn?()=>{}:tcast; blob.visible=!inn; }
  function seatPose(){ const c=seat, a=DOOR*doorAt(c); tP0.set(spot.x,restY,spot.z); setDoor(a); seatK.value=win(.08,SA,c);
    if(c>=SC){ setDrop(1-ease(Math.min(1,(c-SC)/(1-SC)))); }
    else { setDrop(c<=0?0:1);
      if(c<=0){ tp.copy(tP0); tq.copy(q0); }
      else if(c<=SA){ tb1.copy(tP0).addScaledVector(up,.1); tb2.copy(aboveO).addScaledVector(up,.04).addScaledVector(nO,.03); bez(tp,tP0,tb1,tb2,aboveO,ease(c/SA)); tq.slerpQuaternions(q0,qInO,win(.06,.88,c/SA)); }
      else { tp.copy(above).lerp(low,c<SB?shove((c-SA)/(SB-SA)):1); swing(tp,a); tq.setFromAxisAngle(right,a).multiply(qIn); }
      tape.position.copy(tp); tape.quaternion.copy(tq); tape.updateMatrixWorld(); }
    const ty=under()-STAND; blob.position.set(spot.x,ty+.0003,spot.z); blob.material.opacity=.55*Math.max(0,1-c/.12)*Math.max(0,1-(restY-STAND-ty)/.02); blob.updateMatrixWorld(); }
  setSeat(); tape.position.set(spot.x,restY,spot.z); tape.quaternion.copy(q0); tape.updateMatrixWorld(); blob.position.set(spot.x,restY-STAND+.0003,spot.z); blob.updateMatrixWorld();

  // ---- the card itself: paper in an even light of its own (it's read with the lamp on or off), drawn over the room while it floats
  // (the room's exposure is 1.8 and its tone curve bleaches bright colours toward white: this comes out as cream paper)
  const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,color:new THREE.Color(.6,.5,.36)});
  const mesh=new THREE.Mesh(geo,mat); mesh.name="interviews_card"; mesh.visible=false; mesh.frustumCulled=false;
  const cast=THREE.Mesh.prototype.raycast; mesh.raycast=()=>{};   // (behind the player it answers nothing)
  scene.add(mesh); ctx.interact.set(mesh,{kind:"interviews",label:CAPS});
  // at rest it stands behind the player, out of sight: just behind its back, its foot on the desk, facing the way the door does
  const restQ=new Q4().setFromRotationMatrix(new M4().makeBasis(right,up,n));
  const restC=new V3(mid.x,box.min.y+HEIGHT/2-.09,mid.z).addScaledVector(n,-.024), top=new V3(mid.x,box.max.y+HEIGHT/2+.012,mid.z).addScaledVector(n,-.024);

  // ---- where it floats: upright in front of the camera, on the right of the picture, big enough to read, leaning back a little
  function size(){ const W=innerWidth, H=innerHeight; let h=Math.min(H-200,860,(W*.42)*CHm/CWm); h=Math.max(h,Math.min(420,H-60));
    const w=h*CWm/CHm; return {w,h,cx:W-70-w/2,cy:H/2-4}; }
  const _n=new V3(), _d=new V3(), _f=new V3(), _u=new V3(), _r=new V3(), _q=new Q4(), _e=new THREE.Euler();
  function floatPose(T,outC,outQ){
    const cam=ctx.view(); cam.updateMatrixWorld();
    const s=size(), W=innerWidth, H=innerHeight, tv=Math.tan(THREE.MathUtils.degToRad(cam.fov/2));
    const d=HEIGHT*H/(2*tv*s.h);
    _n.set(s.cx/W*2-1,-(s.cy/H*2-1),.5).unproject(cam); _d.subVectors(_n,cam.position).normalize();
    _f.set(0,0,-1).applyQuaternion(cam.quaternion); _u.set(0,1,0).applyQuaternion(cam.quaternion); _r.set(1,0,0).applyQuaternion(cam.quaternion);
    outC.copy(cam.position).addScaledVector(_d,d/_d.dot(_f));
    const side=Math.atan2(_d.dot(_r),_d.dot(_f)), bob=ctx.reduce?0:1;
    outC.addScaledVector(_u,Math.sin(T*.8)*.0005*bob).addScaledVector(_r,Math.sin(T*.53+1)*.0003*bob);
    _e.set(THREE.MathUtils.degToRad(-4)+Math.sin(T*.61)*.006*bob,-side*.1,THREE.MathUtils.degToRad(.9)+Math.sin(T*.43+2)*.004*bob,"ZYX");
    outQ.copy(cam.quaternion).multiply(_q.setFromEuler(_e));
  }

  // ---- up from behind the player and back: it slides straight up, clear of the keys, then turns to you as it comes; going back
  // it swings round above the player and slides down behind it
  let mode="down", u=0, slide=0, playing=false, rate=0; const fromC=new V3(), fromQ=new Q4(), fc=new V3(), fq=new Q4(), p1=new V3(), p2=new V3(), cur=new V3();
  const UP=1.1, DOWN=.9;
  const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2, sm=x=>x*x*(3-2*x), win=(a,b,x)=>x<=a?0:x>=b?1:.5-.5*Math.cos(Math.PI*(x-a)/(b-a));
  const bez=(o,a,b,c,d,t)=>{ const s=1-t; return o.set(0,0,0).addScaledVector(a,s*s*s).addScaledVector(b,3*s*s*t).addScaledVector(c,3*s*t*t).addScaledVector(d,t*t*t); };
  function place(c,q){ mesh.position.copy(c); mesh.quaternion.copy(q); mesh.updateMatrixWorld(); }
  let floating=null;
  function setFloat(f){ if(f===floating) return; floating=f; mat.depthFunc=f?THREE.AlwaysDepth:THREE.LessEqualDepth; mesh.renderOrder=f?21:0; }
  function show(v){ mesh.visible=v; mesh.raycast=v?cast:()=>{}; }
  setFloat(false); place(restC,restQ);
  function run(on){ if(on===playing) return; playing=on; sound(on?"play":"stop"); hiss(on); }
  function cardUp(instant){ run(true); if(mode==="up"||mode==="rising") return;
    slide=mode==="down"?.32:0; if(mode==="down") place(restC,restQ); fromC.copy(mesh.position); fromQ.copy(mesh.quaternion); show(true);
    if(instant||ctx.reduce){ mode="up"; u=1; return; } mode="rising"; u=0; sound("pull"); }
  function cardDown(instant){ run(false); if(mode==="down"||mode==="falling") return; fromC.copy(mesh.position); fromQ.copy(mesh.quaternion);
    if(instant||ctx.reduce){ mode="down"; u=1; place(restC,restQ); setFloat(false); show(false); return; } mode="falling"; u=0; sound("back"); }
  // the tape first: what was asked for (the card, or just the tape running) happens once it is in the pocket
  function fetch(what,instant){ ejectIn=0; seatWant=1;
    if(instant||ctx.reduce||seat>=1){ if(seat<1){ seat=1; setSeat(); } after=null; if(what==="card") cardUp(instant); else run(true); return; }
    if(!after&&seat<=0) sound("take"); after=what; }
  function lift(instant){ fetch("card",instant); }
  function play(on){ if(on) fetch("play"); else { after=null; run(false); } }
  function lower(instant){ const had=after; after=null; cardDown(instant);
    if(instant||ctx.reduce){ ejectIn=0; seatWant=0; if(seat>0){ seat=0; setSeat(); restY=under(); vy=0; seatPose(); } }
    else if(seat>0||seatWant) ejectIn=had?.01:.4; }   // (the card gets a head start down behind the player)
  let held=false, pace=1;   // (tests: hold a flight where it is, or hurry it)
  function frame(dt,T){
    dt*=pace;
    // the hubs: up to speed in a third of a second, and they coast a moment when the key comes up
    const want=playing&&!ctx.reduce?1:0; rate+=(want-rate)*Math.min(1,dt*(want?7:4)); if(Math.abs(want-rate)<.002) rate=want;
    if(rate>0) hubs.forEach((h,i)=>{ h.a=(h.a+SPEED[i]*rate*dt)%(Math.PI*2); h.mesh.quaternion.copy(h.base).multiply(_q.setFromAxisAngle(_f.set(0,0,1),h.a)); });
    // the cassette: at home it rests on what is under it; asked for, it comes over and goes in; sent back, it goes home
    if(ejectIn>0&&(ejectIn-=dt)<=0){ ejectIn=0; seatWant=0; }
    if(seat<1){ const ty=under(); if(restY<ty){ restY=Math.min(ty,restY+dt*.6); vy=0; } else if(restY>ty){ vy+=9*dt; restY=Math.max(ty,restY-vy*dt); if(restY===ty){ if(vy>.25&&seat<=0) sound("land"); vy=0; } }
      resting=restY===ty; }
    if(seat!==seatWant){ const was=seat; seat=seatWant>seat?Math.min(1,seat+dt/SEAT_IN):Math.max(0,seat-dt/SEAT_OUT);
      if((was<D0&&seat>=D0)||(was>=SC&&seat<SC)) sound("eject");   // the door springs open
      if((was<SC)!==(seat<SC)) setSeat();   // the cassette and the model's tape change places, the door shut on them
      if(was<SB&&seat>=SB) sound("land");   // the cassette, down in the door
      if((was<SC&&seat>=SC)||(was>D0+.03&&seat<=D0+.03)) sound("shut");   // the door claps to
      if(seat>=1){ setSeat(); resting=true; sound("seat"); const w=after; after=null; if(w==="card") cardUp(); else if(w==="play") run(true); }
      else if(seat<=0){ setSeat(); sound("land"); } }
    if(seat<1) seatPose();
    if(mode==="down") return;
    if(held) dt=0;
    floatPose(T,fc,fq);
    if(mode==="up"){ place(fc,fq); setFloat(true); }
    else if(mode==="rising"){ u=Math.min(1,u+dt/UP);
      if(u<slide){ place(cur.copy(fromC).lerp(top,sm(u/slide)),restQ); setFloat(false); }
      else { const a=slide?top:fromC, e=ease((u-slide)/(1-slide));
        p1.copy(a).addScaledVector(slide?up:_f,slide?.05:-.03); p2.copy(fc).addScaledVector(_f,.07);
        place(bez(cur,a,p1,p2,fc,e),_q.slerpQuaternions(slide?restQ:fromQ,fq,win(slide,.92,u))); setFloat(u>slide+.12); }
      if(u>=1) mode="up"; }
    else if(mode==="falling"){ u=Math.min(1,u+dt/DOWN); const b=.68;
      if(u<b){ const e=ease(u/b); p1.copy(fromC).addScaledVector(_f,.06); p2.copy(top).addScaledVector(up,.05);
        place(bez(cur,fromC,p1,p2,top,e),_q.slerpQuaternions(fromQ,restQ,win(0,.8,u/b))); setFloat(u<b*.6); }
      else { place(cur.copy(top).lerp(restC,sm((u-b)/(1-b))),restQ); setFloat(false); }
      if(u>=1){ mode="down"; place(restC,restQ); setFloat(false); show(false); } }
  }

  // ---- sounds (only with the room's sound on): the play key going down and coming up, the card's paper, and the tape's own hiss
  // under it all while it runs, very low
  let noise=null, hissNode=null;
  const buf=ac=>{ if(!noise||noise.sampleRate!==ac.sampleRate){ noise=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } return noise; };
  function sound(kind){
    const a=ctx.audio&&ctx.audio(); if(!a) return; const ac=a.ctx, t=ac.currentTime+.01, nb=buf(ac);
    const burst=(dt,f,q,amp,att,dur,type="bandpass")=>{ const s=ac.createBufferSource(), fl=ac.createBiquadFilter(), g=ac.createGain();
      s.buffer=nb; fl.type=type; fl.frequency.value=f; fl.Q.value=q; g.gain.setValueAtTime(.0001,t+dt); g.gain.exponentialRampToValueAtTime(amp,t+dt+att); g.gain.exponentialRampToValueAtTime(.0001,t+dt+att+dur);
      s.connect(fl).connect(g).connect(a.out); s.start(t+dt,Math.random()*.5); s.stop(t+dt+att+dur+.05); };
    const thump=(dt,f,amp,dur)=>{ const o=ac.createOscillator(), g=ac.createGain(); o.type="sine"; o.frequency.setValueAtTime(f*1.8,t+dt); o.frequency.exponentialRampToValueAtTime(f,t+dt+.03);
      g.gain.setValueAtTime(amp,t+dt); g.gain.exponentialRampToValueAtTime(.0001,t+dt+dur); o.connect(g).connect(a.out); o.start(t+dt); o.stop(t+dt+dur+.02); };
    if(kind==="play"){ burst(0,2400,2.2,.16,.002,.03); thump(0,150,.16,.07); burst(.045,4200,3,.09,.002,.025); burst(.05,900,1.2,.07,.004,.06,"lowpass"); }
    else if(kind==="stop"){ burst(0,3000,2.5,.12,.002,.025); thump(.01,120,.12,.06); burst(.06,1500,1.5,.06,.003,.05); }
    else if(kind==="pull"){ burst(.25,3600,1.1,.05,.03,.14); burst(.5,1600,.7,.035,.1,.3); }
    else if(kind==="take"){ burst(0,3400,1.4,.05,.004,.05); burst(.05,2100,1.1,.03,.01,.07); }   // the cassette off the shelf, its reels rattling
    else if(kind==="shut"){ thump(0,170,.13,.06); burst(0,2100,1.8,.1,.002,.03); burst(.05,5200,3,.05,.002,.02); }   // the door, home on its catch
    else if(kind==="seat"){ burst(0,3100,2.4,.06,.002,.02); thump(.005,210,.05,.04); }   // the tape up on the head
    else if(kind==="eject"){ burst(0,2600,2,.09,.002,.03); thump(.01,140,.1,.05); }
    else if(kind==="land"){ burst(0,1700,1.2,.06,.003,.05); thump(0,230,.07,.04); }   // back on the VHS tapes
    else if(kind==="back"){ burst(0,2800,.9,.045,.05,.24); burst(.62,2000,2.2,.06,.004,.05); }
  }
  function hiss(on){
    if(hissNode){ const {g,s,ac}=hissNode; hissNode=null; try{ g.gain.cancelScheduledValues(ac.currentTime); g.gain.setTargetAtTime(.0001,ac.currentTime,.08); s.stop(ac.currentTime+.6); }catch{} }
    if(!on) return; const a=ctx.audio&&ctx.audio(); if(!a) return; const ac=a.ctx;
    const s=ac.createBufferSource(), hp=ac.createBiquadFilter(), lp=ac.createBiquadFilter(), g=ac.createGain(); s.buffer=buf(ac); s.loop=true;
    hp.type="highpass"; hp.frequency.value=1800; lp.type="lowpass"; lp.frequency.value=9000; g.gain.setValueAtTime(.0001,ac.currentTime); g.gain.setTargetAtTime(.011,ac.currentTime+.12,.25);
    s.connect(hp).connect(lp).connect(g).connect(a.out); s.start(); hissNode={g,s,ac};
  }

  // ---- the pointer on the floating card: a line (an interview), or just card
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2();
  function at(x,y){
    if(!mesh.visible) return null;
    ptr.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); ray.setFromCamera(ptr,ctx.view());
    const hits=[]; cast.call(mesh,ray,hits); const hit=hits.sort((a,b)=>a.distance-b.distance)[0]; if(!hit) return null;
    if(!hit.uv) return {kind:"card"};
    const px=hit.uv.x*CW, py=hit.uv.y*CH, r=regions.find(r=>px>=r.x0&&px<=r.x1&&py>=r.y0&&py<=r.y1);
    return r?{kind:"link",i:r.i,url:r.url,text:r.text}:{kind:"card"};
  }
  function tip(x,y){
    const upNow=mode==="up", h=upNow?at(x,y):null, lk=h&&h.kind==="link"?h.i:-1;
    if(lk!==hoverLink){ hoverLink=lk; redraw(); }
    if(!upNow) return mode==="rising"?"PUT IT BACK":CAPS;
    return lk>=0?"OPEN "+h.text.toUpperCase()+" ↗":"PUT IT BACK";
  }
  function leave(){ if(hoverLink>=0){ hoverLink=-1; redraw(); } }
  function focus(i){ focusLink=i; redraw(); }
  function toScreen(px,py){ const k=Y0.findIndex((y,j)=>j<4&&py>=y&&py<=Y0[j+1]), pa=geo.attributes.position, b=[2,1,0,3].indexOf(k)*4;   // (the strips were made front, spine, flap, inner)
    const f=(py-Y0[k])/(Y0[k+1]-Y0[k]), v=new V3((px/CW-.5)*CWm,pa.getY(b)+(pa.getY(b+2)-pa.getY(b))*f,pa.getZ(b)+(pa.getZ(b+2)-pa.getZ(b))*f).applyMatrix4(mesh.matrixWorld).project(ctx.view());
    return {x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight}; }

  return {mesh,hubs,box,lift,lower,play,frame,redraw,at,tip,leave,focus,toScreen,size,tape,spot,
    get seat(){ return seat; }, get moving(){ return seat>0&&seat<1||!resting; },
    playerTip(){ return playing?"PUT BACK THE CARD":SHOW; },
    get up(){ return mode==="up"||mode==="rising"||!!after; }, get busy(){ return mode==="rising"||mode==="falling"||playing||rate>0||seat!==seatWant||ejectIn>0||!resting; }, get mode(){ return mode; }, get playing(){ return playing; },
    width(){ return size().w; }, get regions(){ return regions; }, get marked(){ return {hover:hoverLink,focus:focusLink}; }, get progress(){ return u; }, set held(v){ held=!!v; }, set pace(v){ pace=+v||1; }, canvas:cv};
}
