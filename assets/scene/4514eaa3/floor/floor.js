// floor/floor.js: the room's floorboards (thread "Floor texture", Felix 20 Oct 2026: "Please improve the texture on the
// floor"). The floor kept its place in the room's bake (atlas "floor": the light on it is the same); what changed is its wood.
// It was a 1024 px picture shared with the light's layout, 6 mm a texel and no mipmaps; now it has two pictures of its own,
// laid over the whole top face (README.md, tools/gen_floor.py):
//   floor/boards.jpg   the colour, 4.3 mm a texel along a board and 1.5 mm across it (boards_s.jpg, half size, on phones)
//   floor/relief.jpg   R,G the surface's slope along x and z, B how glossy the varnish still is (relief_s.jpg on phones)
//   floorMaps()    asks for the two pictures (the page waits for them next to the scene's JSON; without them the old floor stays)
//   floorBoards()  the page's traverse, for the mesh whose material is "floorboards": its uv becomes the top face's own, and
//                  its baked material gets the pictures: each board tilts and crowns a little, so a lamp's reflection breaks
//                  from board to board; worn lanes are matter, the varnish by the walls still shines
export const BOARDS={
  x0:-1.6, z0:-.42, w:4.4, d:3.02,   // the top face in the room (metres): u runs along x, v along z
  smax:.25,                          // the slope R,G = 0 or 1 stand for (gen_floor.py's SMAX)
  U:{ floorRelief:{value:null},
      floorRough:{value:[.76,.40]},  // roughness where the varnish is gone, and where it is whole
      floorCoat:{value:[.12,.30]},   // the clear coat that is left where it is worn (a share), and how much rougher it is there
      floorSlope:{value:[1.6,1.0]} },// relief on the wood, and on the varnish over it
  timeout:12000,
};
let maps=null, warned=false;

// (a promise that never rejects: {boards,relief}, or null and the old floor stays)
export function floorMaps(THREE,{small=false,anisotropy=8,base="./floor/"}={}){
  const L=new THREE.TextureLoader(), s=small?"_s":"";
  const one=(file,srgb)=>new Promise(res=>{ L.load(base+file,t=>{   // (the colour is filtered 8 ways at a slant, the relief 4; half that on phones)
      t.channel=0; t.flipY=false; t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace; t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
      t.generateMipmaps=true; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter; t.anisotropy=Math.max(1,Math.min((small?4:8)/(srgb?1:2),anisotropy)); t.needsUpdate=true; res(t);
    },undefined,()=>res(null)); });
  const late=new Promise(res=>setTimeout(res,BOARDS.timeout,null));
  return Promise.race([Promise.all([one(`boards${s}.jpg`,true),one(`relief${s}.jpg`,false)]),late]).then(a=>{
    if(!a||!a[0]||!a[1]){ console.warn("floor: its pictures didn't come; the old floorboards stay"); a?.forEach(t=>t?.dispose()); return maps=null; }
    BOARDS.U.floorRelief.value=a[1]; return maps={boards:a[0],relief:a[1]}; });
}

function patch(sh){
  const A="#include <roughnessmap_fragment>", B="#include <clearcoat_normal_fragment_begin>", C="#include <lights_physical_fragment>", f=sh.fragmentShader;
  if(!f.includes(A)||!f.includes(B)||!f.includes(C)){ if(!warned){ warned=true; console.warn("floor: the bake's shader has changed; the floorboards stay flat"); } return; }
  Object.assign(sh.uniforms,BOARDS.U);
  sh.fragmentShader="uniform sampler2D floorRelief; uniform vec2 floorRough,floorCoat,floorSlope;\n"+f
    .replace(A,A+"\nvec3 flR=texture2D(floorRelief,vMapUv).rgb; roughnessFactor=mix(floorRough.x,floorRough.y,flR.b);\n")
    .replace(B,B+`
    { vec2 flS=(flR.rg-.5)*${(2*BOARDS.smax).toFixed(3)};   // the floor lies flat: its normal is the room's up, leaned by the relief's slope
      normal=normalize((viewMatrix*vec4(-flS.x*floorSlope.x,1.,-flS.y*floorSlope.x,0.)).xyz);
      #ifdef USE_CLEARCOAT
      clearcoatNormal=normalize((viewMatrix*vec4(-flS.x*floorSlope.y,1.,-flS.y*floorSlope.y,0.)).xyz);
      #endif
    }`)
    .replace(C,C+`
    #ifdef USE_CLEARCOAT
    material.clearcoat*=mix(floorCoat.x,1.,flR.b); material.clearcoatRoughness=min(material.clearcoatRoughness+floorCoat.y*(1.-flR.b),1.);
    #endif
`);
}

// (the page's traverse, right after it gives baked materials)
export function floorBoards(THREE,o){
  const m=o.material;
  if(!maps||!m?.lightMap||!m.onBeforeCompile||m.userData.floor||!o.geometry?.attributes.position) return m;
  // the top face's own uv (channel 0, which the floor never used: its old colour and its light are on uv1)
  const p=o.geometry.attributes.position, uv=new Float32Array(p.count*2), v=new THREE.Vector3(); o.updateWorldMatrix(true,false);
  for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); uv[2*i]=(v.x-BOARDS.x0)/BOARDS.w; uv[2*i+1]=(v.z-BOARDS.z0)/BOARDS.d; }
  o.geometry.setAttribute("uv",new THREE.BufferAttribute(uv,2));
  const c=m.clone(), obc=m.onBeforeCompile, key=m.customProgramCacheKey;
  c.onBeforeCompile=(sh,r)=>{ obc.call(c,sh,r); patch(sh); };
  c.customProgramCacheKey=()=>key.call(c)+"|floor";
  c.map=maps.boards; c.userData.floor=true;
  return c;
}
