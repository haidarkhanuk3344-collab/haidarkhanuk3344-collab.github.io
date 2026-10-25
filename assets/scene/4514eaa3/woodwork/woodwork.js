// woodwork/woodwork.js: the bookshelf's and the nightstand's wood (thread "Floor texture", Felix 20 Oct 2026: "the same could
// be said for the shelf texture (and the little table) ... make it look better without using way more resources"). Both are
// Poly Haven models whose pictures are small (1024 px for a 2 m shelf, 512 px for the nightstand): up close they were a blur.
// Their pictures, their place in the bake and their light stay. What the page adds is drawn in the shader, from one small
// texture this module paints itself (256 px, no download):
//   grain     fibres, growth rings and pores that follow each board (a board's direction comes from where it is in the piece)
//   wear      the shelf: rubbed pale front edges, scratches across the boards, grime towards the back and by the floor
//             the nightstand: brush marks in its paint, and more of the paint chipped off to the wood at its edges and top
//   relief    the fibres and pores as a fine bump, and bare or rubbed wood is duller than the rest
//   posts     the shelf's two front posts are reeded: strips a few millimetres wide, cut in two at y=.917 in the model, and
//             in the bake each strip got a sliver of light under a texel wide: black on one strip, bright on the next, and
//             different above and below the cut, so the post jumped at that height (Felix 20 Oct: "a weird transition in
//             the middle of the picture"). All the reeds now take their light from the post's outer front strip, which
//             runs its whole height; the reeds' own shading is in the model's picture
//   woodwork()  the page's traverse, right after it gives baked materials: for the meshes of these two materials
export const WOOD={
  tile:[2.9,10,.9,2.3],     // repeats in a metre, along and across the grain: the fine fibres, then the rings (34 x 10 cm, 110 x 44 cm)
  rings:38,                 // growth rings across one repeat
  wooden_bookshelf_worn:{
    grain:[.80,.65,.60,.75],   // how much the colour follows fine fibres, broad fibres, rings, pores
    wear:[.80,.80,.45,.00022], // rubbed front edges, scratches, grime; the relief's height in metres
  },
  painted_wooden_nightstand:{
    grain:[.40,.34,.22,.25],   // (under paint: brush marks more than wood)
    wear:[.62,.60,.30,.00016], // chipped paint, scratches, grime; the relief's height
  },
};
const clones=new Map(); let grain=null, warned=false;
const U={ wdTex:{value:null}, wdTile:{value:WOOD.tile}, wdMean:{value:[.5,.5,.5,.1]} };

// one texture, four fields that wrap: R fibres (streaks along u), G growth rings (dark lines along u, wandering), B soft
// blotches (where wear and grime gather), A pores (short dashes along u)
function grainTex(THREE){
  if(grain) return grain;
  const N=256, M=N*N; let s=1987;
  const noise=()=>{ const f=new Float32Array(M); for(let i=0;i<M;i++){ s=s*16807%2147483647; f[i]=s/2147483647; } return f; };
  const box=(a,r,alongX)=>{ if(!r) return a; const o=new Float32Array(M), w=(i,j)=>alongX?j*N+(i&N-1):(i&N-1)*N+j;   // a running box, wrapping
    for(let j=0;j<N;j++){ let t=0; for(let k=-r;k<=r;k++) t+=a[w(k,j)];
      for(let i=0;i<N;i++){ o[w(i,j)]=t/(2*r+1); t+=a[w(i+r+1,j)]-a[w(i-r,j)]; } }
    return o; };
  const blur=(a,rx,ry,n=2)=>{ for(let k=0;k<n;k++) a=box(box(a,rx,true),ry,false); return a; };
  const norm=a=>{ let lo=1e9, hi=-1e9; for(const v of a){ lo=Math.min(lo,v); hi=Math.max(hi,v); } return a.map(v=>(v-lo)/(hi-lo)); };
  const fib=norm(blur(noise(),20,0)), long=norm(blur(noise(),60,1)), lay=norm(blur(noise(),48,9)), blot=norm(blur(noise(),14,14)), fleck=norm(blur(noise(),4,4));
  const pore=norm(blur(noise().map(v=>v>.955?1:0),6,0,1));
  const d=new Uint8Array(M*4), mean=[0,0,0,0];
  for(let i=0;i<M;i++){ const y=i/N|0, ring=Math.pow(.5+.5*Math.sin(6.2832*(y/N*WOOD.rings+lay[i]*3.4)),2.4);
    const v=[.62*fib[i]+.38*long[i], ring*(.55+.45*long[i]), .72*blot[i]+.28*fleck[i], pore[i]];
    for(let c=0;c<4;c++){ d[4*i+c]=Math.round(255*v[c]); mean[c]+=d[4*i+c]/255/M; } }
  U.wdMean.value=mean;
  const t=new THREE.DataTexture(d,N,N); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.NoColorSpace;
  t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter; t.generateMipmaps=true; t.anisotropy=4; t.needsUpdate=true;
  return U.wdTex.value=grain=t;
}

// where a board's grain runs, in the piece's own space (wdQ.x along the grain), and what is worn there (wdWear: bare or rubbed
// wood, wdDirt: grime). Both pieces stand upright in their own space: y up, their fronts at +z.
const LAY={
  // the bookshelf: 1.37 m wide, 2.06 m high, 0.58 m deep; side panels beyond |x| .6, shelves between them, a back panel
  wooden_bookshelf_worn:`
    if(wdN.y>wdN.x&&wdN.y>wdN.z){ wdQ=wdP.xz+wdP.y*vec2(.37,1.3); wdUp=1.; }
    else if(wdN.x>wdN.z) wdQ=wdP.yz+wdP.x*vec2(.37,1.3);
    else wdQ=((abs(wdP.x)>.6||wdP.z<.2)?wdP.yx:wdP.xy)+wdP.z*vec2(.37,1.3);`,
  // the nightstand: half a metre square, .62 m high; legs at the corners, the drawer in front
  painted_wooden_nightstand:`
    if(wdN.y>wdN.x&&wdN.y>wdN.z){ wdQ=wdP.xz+wdP.y*vec2(.37,1.3); wdUp=1.; }
    else if(wdN.x>wdN.z) wdQ=((abs(wdP.z)>.175&&wdP.y<.56)?wdP.yz:wdP.zy)+wdP.x*vec2(.37,1.3);   // legs upright, the top and the rails lying
    else wdQ=((abs(wdP.x)>.175&&wdP.y<.56)?wdP.yx:wdP.xy)+wdP.z*vec2(.37,1.3);`,
};
const WEAR={
  wooden_bookshelf_worn:`
    float wdEdge=smoothstep(.15,.275,wdP.z)*(.35+.65*wdUp);                       // hands and books rub the boards' front edges
    wdWear=wdK.x*smoothstep(.40,.62,wdBlot+.5*wdEdge-.22+.25*wdFib)*step(.001,wdEdge);
    wdDirt=wdK.z*(wdUp*smoothstep(.12,-.24,wdP.z)*smoothstep(.3,.7,wdBlot)+.8*smoothstep(.3,.0,wdP.y)*smoothstep(.25,.75,wdBlot));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.5+vec3(.016,.012,.008),wdWear);`,
  painted_wooden_nightstand:`
    vec3 wdE=smoothstep(vec3(.19,.50,.19),vec3(.25,.61,.25),vec3(abs(wdP.x),wdP.y,abs(wdP.z)));
    float wdEdge=max(max(wdE.x*wdE.z,wdE.x*wdE.y),wdE.z*wdE.y);                    // its edges and corners
    float wdChip=wdBlot*.62+texture2D(wdTex,wdQ*wdTile.zw*3.1+.2).b*.38;
    wdWear=wdK.x*smoothstep(.61,.64,wdChip+.20*wdEdge+.07*wdUp+.10*wdFib);           // paint gone: a sharp edge
    wdDirt=wdK.z*(smoothstep(.35,.0,wdP.y)*smoothstep(.25,.75,wdBlot)+.6*smoothstep(.56,.61,wdChip+.20*wdEdge+.07*wdUp)*(1.-wdWear));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.115,.066,.034)*(1.+2.2*wdFib+1.2*wdBand-.5*wdF.a),wdWear);`,
};

function patch(sh,kind){
  const A="#include <map_fragment>", B="#include <roughnessmap_fragment>", C="#include <normal_fragment_maps>", V="#include <begin_vertex>", f=sh.fragmentShader;
  if(!f.includes(A)||!f.includes(B)||!f.includes(C)||!sh.vertexShader.includes(V)){ if(!warned){ warned=true; console.warn("woodwork: the shader has changed; the shelf and the nightstand keep their old wood"); } return; }
  const P=WOOD[kind];
  Object.assign(sh.uniforms,U,{wdG:{value:P.grain},wdK:{value:P.wear}});
  sh.vertexShader="varying vec3 vWdP,vWdN;\n"+sh.vertexShader.replace(V,V+"\nvWdP=position; vWdN=normal;\n");
  sh.fragmentShader="varying vec3 vWdP,vWdN; uniform sampler2D wdTex; uniform vec4 wdTile,wdMean,wdG,wdK;\n"+f
    .replace(A,A+`
    vec3 wdN=abs(vWdN), wdP=vWdP; vec2 wdQ; float wdUp=0., wdWear=0., wdDirt=0.;${LAY[kind]}
    vec4 wdF=texture2D(wdTex,wdQ*wdTile.xy), wdC=texture2D(wdTex,wdQ*wdTile.zw+vec2(.31,.57));
    float wdFib=wdF.r-wdMean.r, wdBand=wdC.r-wdMean.r, wdBlot=wdC.b;
    float wdScr=smoothstep(.45,.9,texture2D(wdTex,wdQ.yx*wdTile.xy*vec2(.55,1.7)+.4).a)*smoothstep(.35,.6,wdBlot);   // pores read across the grain: scratches
    diffuseColor.rgb*=max(1.+wdG.x*wdFib+wdG.y*wdBand-wdG.z*(wdC.g-wdMean.g)-wdG.w*(wdF.a-wdMean.a),.2);${WEAR[kind]}
    diffuseColor.rgb*=(1.+wdK.y*wdScr)*(1.-wdDirt);
    float wdH=wdK.w*(wdFib-1.5*wdF.a-.6*wdScr+.3*wdBand);
`)
    .replace(B,B+"\nroughnessFactor=clamp(roughnessFactor*(1.+.5*wdFib)+.22*wdWear+.15*wdScr+.3*wdDirt,.05,1.);\n")
    .replace(C,C+`
    { vec3 wdX=dFdx(-vViewPosition), wdY=dFdy(-vViewPosition), wdR1=cross(wdY,normal), wdR2=cross(normal,wdX); float wdD=dot(wdX,wdR1);   // the relief, in metres
      normal=normalize(abs(wdD)*normal-sign(wdD)*(dFdx(wdH)*wdR1+dFdy(wdH)*wdR2)); }
`);
}

// the bookshelf's reeded posts (see the top): every long strip on a post's front takes the baked light (uv1) of the post's
// outer front strip, by height. Once per geometry; a shelf of another size is left alone
function mendPosts(o){
  const g=o.geometry, P=g?.attributes.position, L=g?.attributes.uv1, ix=g?.index;
  if(!P||!L||!ix||g.userData.woodPosts) return; g.userData.woodPosts=true;
  if(!g.boundingBox) g.computeBoundingBox(); const b=g.boundingBox;
  if(Math.abs(b.max.x-.687)>.03||Math.abs(b.min.x+.687)>.03||Math.abs(b.max.y-2.063)>.05||Math.abs(b.max.z-.29)>.03) return;
  const reed=new Uint8Array(P.count), other=new Uint8Array(P.count), src=[[],[]];
  for(let t=0;t<ix.count;t+=3){ const v=[ix.getX(t),ix.getX(t+1),ix.getX(t+2)]; let lo=1e9, hi=-1e9, x0=1e9, x1=-1e9, on=true, front=true;
    for(const i of v){ const ax=Math.abs(P.getX(i)), y=P.getY(i), z=P.getZ(i); lo=Math.min(lo,y); hi=Math.max(hi,y); x0=Math.min(x0,ax); x1=Math.max(x1,ax);
      if(!(z>.266&&z<.275&&y>.06&&y<2.02&&ax>.6045&&ax<.6645)) on=false; if(z<.2725) front=false; }
    const outer=on&&front&&hi-lo>1.9&&x0>.6545&&x1-x0>.004;   // the outer front strip: whole height, 8 mm wide
    if(on&&hi-lo>.5&&x1<.6575&&!outer){ for(const i of v) reed[i]=1; } else { for(const i of v) other[i]=1; if(outer) src[P.getX(v[0])<0?0:1].push(...v); } }
  for(const side of [0,1]){ const S=src[side]; if(S.length<3) continue;
    let y0=1e9, y1=-1e9; for(const i of S){ y0=Math.min(y0,P.getY(i)); y1=Math.max(y1,P.getY(i)); }
    const end=y=>{ let u=0, v=0, n=0; for(const i of S) if(Math.abs(P.getY(i)-y)<.01){ u+=L.getX(i); v+=L.getY(i); n++; } return [u/n,v/n]; }, a=end(y0), c=end(y1);
    for(let i=0;i<P.count;i++){ if(!reed[i]||other[i]||(P.getX(i)<0?0:1)!==side) continue;
      const k=Math.min(1,Math.max(0,(P.getY(i)-y0)/(y1-y0))); L.setXY(i,a[0]+(c[0]-a[0])*k,a[1]+(c[1]-a[1])*k); } }
  L.needsUpdate=true;
}

// (the page's traverse, right after it gives baked materials: for the meshes whose material is one of the two)
export function woodwork(THREE,o,kind){
  const m=o.material;
  if(!WOOD[kind]||!LAY[kind]||!m?.map||!m.onBeforeCompile||m.userData.woodwork) return m;
  if(kind==="wooden_bookshelf_worn") try{ mendPosts(o); }catch(e){ console.warn("woodwork: the shelf's posts stay as they were",e); }
  o.onBeforeRender=()=>{};   // (keeps the mesh out of the page's joined copies: those are in the room's space, and the grain is laid out in the piece's own)
  if(clones.has(m)) return clones.get(m);
  grainTex(THREE);
  const c=m.clone(), obc=m.onBeforeCompile, key=m.customProgramCacheKey;
  c.onBeforeCompile=(sh,r)=>{ obc.call(c,sh,r); patch(sh,kind); };
  c.customProgramCacheKey=()=>key.call(c)+"|wood:"+kind;
  c.userData.woodwork=kind;
  clones.set(m,c); return c;
}
