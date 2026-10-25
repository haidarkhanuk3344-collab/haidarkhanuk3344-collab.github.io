// heater/heater.js: the heater under the window (thread "Heater textures", Felix 20 Oct 2026: "Can we improve the textures of
// the heater below the window?"). The radiator is a model of its own now (gl/ht.json, atlas "ht": README.md), loaded through
// the page's OWN list; this module holds what the page adds to it:
//   HEATER_OLD      the old radiator's 50 objects, which the new one replaces
//   heaterPaint()   the enamel on its baked materials: fine brush marks along each part and a little orange peel (a bump), and
//                   no direct highlights from the lamps. The heater stands in the desk's shadow: both lamps are hidden from
//                   it, but baked surfaces take no shadows, so each lamp put a gleam on every rib. The room's reflection
//                   stays (the page dims it where the bake is dark).
export const HEATER_OLD=["radiator_top","radiator_bot","radiator_pipe","radiator_valve","radiator_foot","radiator_foot001",
  ...Array.from({length:44},(_,i)=>"radiator_col"+(i?String(i).padStart(3,"0"):""))];

export const PAINT={
  tile:[.045,.11],          // metres round a part, along it: one repeat of the brush texture
  ht_paint:{bump:.07,roughness:.38},
  ht_plastic:{bump:0,roughness:.56},
  ht_nickel:{bump:0,roughness:.3},
};
const clones=new Map(); let brush=null, warned=false;

function patch(sh){
  const A="#include <lights_fragment_end>";
  if(!sh.fragmentShader.includes(A)){ if(!warned){ warned=true; console.warn("heater: the bake's shader has changed; the heater keeps the lamps' highlights"); } return; }
  sh.fragmentShader=sh.fragmentShader.replace(A,A+"\nreflectedLight.directSpecular=vec3(0.);\n#ifdef USE_CLEARCOAT\nclearcoatSpecularDirect=vec3(0.);\n#endif\n");
}
// brush marks: ridges under a millimetre apart that run a few centimetres along the part and fade, over a soft orange peel
function brushTex(THREE){
  if(brush) return brush;
  const N=256, f=new Float32Array(N*N); let s=1995;
  for(let i=0;i<N*N;i++){ s=s*16807%2147483647; f[i]=s/2147483647; }
  const box=(a,r,alongX)=>{ const o=new Float32Array(N*N), w=(i,j)=>alongX?j*N+(i&N-1):(i&N-1)*N+j;   // a running box, wrapping
    if(!r) return a;
    for(let j=0;j<N;j++){ let t=0; for(let k=-r;k<=r;k++) t+=a[w(k,j)];
      for(let i=0;i<N;i++){ o[w(i,j)]=t/(2*r+1); t+=a[w(i+r+1,j)]-a[w(i-r,j)]; } }
    return o; };
  const blur=(a,rx,ry)=>box(box(a,rx,true),ry,false), norm=a=>{ let lo=1e9, hi=-1e9; for(const v of a){ lo=Math.min(lo,v); hi=Math.max(hi,v); } return a.map(v=>(v-lo)/(hi-lo)); };
  const strokes=norm(blur(blur(f,1,26),1,26)), peel=norm(blur(blur(f,5,5),5,5)), sag=norm(blur(blur(f,22,40),22,40));
  const d=new Uint8Array(N*N*4);
  for(let i=0;i<N*N;i++){ d[4*i]=Math.round(255*(.5*strokes[i]+.3*peel[i]+.2*sag[i])); d[4*i+1]=d[4*i+2]=0; d[4*i+3]=255; }
  const t=new THREE.DataTexture(d,N,N); t.channel=0; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1/PAINT.tile[0],1/PAINT.tile[1]);
  t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter; t.generateMipmaps=true; t.anisotropy=4; t.needsUpdate=true;
  return brush=t;
}
// (the page's traverse, right after it gives baked materials: for the meshes whose material is ht_paint, ht_plastic or ht_nickel)
export function heaterPaint(THREE,m,kind){
  if(clones.has(m)) return clones.get(m);
  const P=PAINT[kind];
  if(!P||!m?.lightMap||!m.onBeforeCompile||m.userData.heater) return m;
  const c=m.clone(), obc=m.onBeforeCompile, key=m.customProgramCacheKey;
  c.onBeforeCompile=(sh,r)=>{ obc.call(c,sh,r); patch(sh); };
  c.customProgramCacheKey=()=>key.call(c)+"|heater";
  c.userData.heater=kind; c.roughness=P.roughness;
  if(P.bump){ c.bumpMap=brushTex(THREE); c.bumpScale=P.bump; }
  clones.set(m,c); return c;
}
