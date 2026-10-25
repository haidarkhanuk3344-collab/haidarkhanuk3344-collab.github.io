// Chatter: while the tape in the radio cassette player runs, you hear that somebody is talking on it (Felix, 21 Oct 16:19Z:
// "when the walkman is running, we should add some 'blablabla' sound in the background that gives an audible signal that
// something is playing"). Since 18:22Z it is Felix himself: a minute of him on a podcast, "starting in the middle", made to
// "sound like it's coming out of a tiny, terrible speaker, at low volume" ("making it hard to understand would be almost
// preferrable"). The speaker is in the file (talk/make.py: talk.mp3, its take 1 "tiny", 16 kHz, 242 KB, a loop with half a second of run-in and
// run-out); it is fetched when the cassette is on its way in, decoded at its own 16 kHz (3.9 MB, not the 11.6 MB a 48 kHz
// context would make of it) and one looping source plays it. The tape runs up to speed when the play key goes down, runs
// down when it comes up, and goes on from where it stopped the next time.
// Without the file (or with ?chatter=a) the talk is the first version's: two made-up voices without words, synthesized here
// (script, render), small and thin as from headphones lying next to the player.
//
// createChatter(ctx) returns the controller:
//   ctx.audio()    {ctx, out} while the room has sound, else null (the room's own rule: nothing before the first click,
//                  nothing with the sound off; a page out of sight suspends the context and the talk with it)
//   ctx.playing()  is the tape running (interviews.playing)
//   ctx.soon()     optional: the tape is on its way into the player, so the talk is fetched ahead of the play key
//   ctx.take       "tape" Felix's clip (the default); synthesized: "a" two voices from the headphones, "b" the same from
//                  the player's own little speaker, "c" one voice; "0" or "off" for none
//   ctx.url        the clip, if not talk.mp3 next to this file; ctx.load() instead: a promise for the file's ArrayBuffer
//   ctx.level      a factor on the level (1)
// The controller: frame() once a frame (it only compares two flags unless the tape starts or stops), on (the talk is
// sounding), ready (the loop is there), take, source ("tape", or "synth" when the talk was made here), pos, seek(d) and
// flip() for the player's keys, and render(take) for the tests and the takes page: a promise for a synthesized AudioBuffer.
// the clip: where the loop lies in the file (talk/talk.json), the rate it is decoded at, and its level (the file's talk is
// at -20 dBFS; the room heard it at -41: Felix, 18:33Z, of the takes page, where 100% was -32: "go with tiny speaker at 35%
// volume pls"; then 22:03Z, in the room: "On the walkman, double the volume", so -35; then 22:18Z, with the VOL wheel there: "i like the walkman at
// 'max volume' the most (and then also how quiet the tv in the background is), make that the new neutral default": 2.78
// times that again, -26 now). QUIET: the made-up talk, standing
// in for a clip that did not load, goes with it. The player's VOL wheel (wmkeys/) sets level, times this
const TALK={file:"./talk.mp3",lead:.5,body:59.4,rate:16000,gain:.486}, QUIET=1.94;
const RATE=22050, LEN=36;   // the loop: 36 s at 22 kHz, one channel (3.2 MB; nothing in it is above 7 kHz)
const TAKES={
  a:{voices:2,gain:.745,hp:1100,pk:[3200,7,1.2],lp:6500},   // headphones on the desk: no body at all, mostly consonants
  b:{voices:2,gain:.276,hp:380,pk:[1800,5,1],lp:3800},      // a 3 cm speaker in a plastic case
  c:{voices:1,gain:1.03,hp:1100,pk:[3200,7,1.2],lp:6500}};
// the voices: pitch, how far the formants sit above a man's, syllables a second, level
const VOICE=[{f0:108,k:1,rate:5.4,amp:.9},{f0:186,k:1.16,rate:4.9,amp:1}];
// vowels (F1, F2, F3 of a man's voice, Hz) and how often each comes: mostly open ones, as in "bla"
const VOWEL=[[730,1090,2440,5],[500,1500,2500,4],[530,1840,2480,3],[660,1720,2410,3],[390,1990,2550,2],[570,840,2410,2],[270,2290,3010,1],[300,870,2240,1]];
// what a syllable starts with: [kind, weight]. v: nothing; l n m: voiced, through the mouth half shut; b d g: a stop, then
// the vowel from the stop's own place; p t k: a stop, a burst of air; s S f: air alone
const ONSET=[["v",2],["l",4],["b",4],["m",3],["n",3],["d",3],["g",1],["t",2],["k",2],["p",1],["s",3],["S",1],["f",1]];
const SHAPE={l:[360,1300,2700],m:[250,1050,2300],n:[250,1500,2500]}, LOCUS={b:900,p:900,d:1700,t:1700,g:2300,k:2300}, AIR={s:[5600,3,.34],S:[2900,2.2,.36],f:[4200,.8,.16],t:[4600,2,.3],k:[2100,2.5,.3],p:[1200,1,.2]};
const rng=seed=>{ let a=seed>>>0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
const pick=(r,list)=>{ let n=0; for(const it of list) n+=it[it.length-1]; n*=r(); for(const it of list){ n-=it[it.length-1]; if(n<0) return it; } return list[0]; };

// what is said: a list of syllables {v, ts, tv, te, on, vow, f, fe, a} (voice, start, vowel's start, end, onset, vowel,
// pitch, the pitch it ends on, level). One speaker holds the floor for a phrase or three; the other says "mhm" now and then
export function script(voices=2, seed=1990){
  const r=rng(seed), out=[]; let t=.3, who=0;
  const phrase=(v,t0,n,ask,soft)=>{ const V=VOICE[v], top=V.f0*(1.08+.12*r()), low=V.f0*(.8+.06*r()), stress=1+(r()*3|0); let t=t0;
    for(let i=0;i<n;i++){ const last=i===n-1, strong=i%3===stress%3||last, on=soft?"m":pick(r,ONSET)[0], vow=soft?VOWEL[1]:pick(r,VOWEL);
      const lead=on==="v"?0:"lmn".includes(on)?.05+.02*r():"bdg".includes(on)?.045:"ptk".includes(on)?.07:.08+.04*r();
      const dur=(strong?1.25:.8)*(last?1.5:1)*(.62+.2*r())/V.rate, x=n>1?i/(n-1):1, f=(top+(low-top)*x)*(strong?1.07:1)*(.97+.06*r());
      out.push({v,ts:t,tv:t+lead,te:t+lead+dur,on,vow,f,fe:last?(ask?f*1.3:f*.86):f*.98,a:(soft?.45:strong?1:.7)*V.amp});
      t+=lead+dur+(r()<.12?.05:0); }
    return t; };
  const room=n=>t+n/4+.3<LEN-.7;   // (a phrase only if it is over well before the loop's end: the loop joins in a pause)
  while(room(4)){
    const turns=voices<2?1+(r()*2|0):who?2+(r()*2|0):1+(r()*2|0);   // the guest talks longer than the host asks
    for(let i=0;i<turns&&room(4);i++){ let n=4+(r()*8|0); while(!room(n)&&n>4) n--;
      t=phrase(who,t,n,voices>1&&!who&&i===turns-1&&r()<.6);
      const gap=voices<2?.32+.5*r():.2+.3*r();
      if(voices>1&&i<turns-1&&r()<.35) phrase(1-who,t+.04,2,false,true);   // "mhm", in the speaker's breath
      t+=gap; }
    t+=.12+.3*r(); if(voices>1) who=1-who; }
  return out;
}

// the talk as sound: each voice is a sawtooth (the vocal cords) with a little breath in it, shaped by three resonances that
// glide from one mouth shape to the next, plus filtered noise for s, f, t and k; then what the headphones or the little
// speaker leave of it. A promise for one AudioBuffer of LEN seconds
export function render(take="a"){
  const K=TAKES[take]||TAKES.a, n=RATE*LEN, OAC=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
  if(!OAC) return Promise.reject(new Error("no OfflineAudioContext"));
  const ac=new OAC(1,n,RATE), r=rng(7), nb=ac.createBuffer(1,RATE,RATE), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=r()*2-1;
  const bq=(type,f,q,g)=>{ const b=ac.createBiquadFilter(); b.type=type; b.frequency.value=f; if(q!=null) b.Q.value=q; if(g!=null) b.gain.value=g; return b; };
  const gain=v=>{ const g=ac.createGain(); g.gain.value=v; return g; };
  const noise=()=>{ const s=ac.createBufferSource(); s.buffer=nb; s.loop=true; s.start(0,r()*.9); return s; };
  const bus=gain(K.gain), said=script(K.voices);
  bus.connect(bq("highpass",K.hp,.7)).connect(bq("highpass",K.hp,.7)).connect(bq("peaking",K.pk[0],K.pk[2],K.pk[1])).connect(bq("lowpass",K.lp,.7)).connect(ac.destination);
  for(let v=0;v<K.voices;v++){ const V=VOICE[v], k=V.k;
    const osc=ac.createOscillator(), amp=gain(0), breath=gain(.03), air=gain(0), airF=bq("bandpass",4000,2), F=[bq("bandpass",500*k,5),bq("bandpass",1500*k,9),bq("bandpass",2500*k,11)], FG=[1,.55,.3];
    osc.type="sawtooth"; osc.frequency.value=V.f0; osc.connect(bq("lowpass",1200,.5)).connect(amp); noise().connect(breath).connect(amp);   // (a voice's own roll-off: a bare sawtooth buzzes)
    F.forEach((f,i)=>{ const g=gain(FG[i]); amp.connect(f).connect(g).connect(bus); });
    noise().connect(airF).connect(air).connect(bus); osc.start(0);
    // a slow waver on the pitch, so no note is held like an organ's
    const lfo=ac.createOscillator(), lg=gain(V.f0*.012); lfo.frequency.value=4.3+v; lfo.connect(lg).connect(osc.frequency); lfo.start(0);
    const shape=(s,t,tc)=>F.forEach((f,i)=>f.frequency.setTargetAtTime(Math.min(s[i]*k,RATE*.45),t,tc));
    const mine=said.filter(s=>s.v===v);
    mine.forEach((s,j)=>{ const {ts,tv,te,on,vow,a}=s, next=mine[j+1];
      if(SHAPE[on]){ shape(SHAPE[on],ts,.018); amp.gain.setTargetAtTime(a*.3,ts,.015); }
      else if(on!=="v"){ amp.gain.setTargetAtTime(0,ts,.01);
        if(LOCUS[on]) shape([300,LOCUS[on],2500],ts+.01,.012);
        if(AIR[on]){ const [f,q,lv]=AIR[on], stop="ptk".includes(on), t0=stop?tv-.03:ts+.01; airF.frequency.setValueAtTime(f,t0); airF.Q.setValueAtTime(q,t0);
          air.gain.setTargetAtTime(lv*a*.5,t0,stop?.003:.02); air.gain.setTargetAtTime(0,stop?tv-.012:tv-.02,stop?.012:.015); } }
      shape(vow,tv-.005,on==="v"?.035:.022); amp.gain.setTargetAtTime(a,tv,"bdg".includes(on)?.006:.014);
      osc.frequency.setTargetAtTime(s.f,tv-.02,.03); osc.frequency.setTargetAtTime(s.fe,tv+(te-tv)*.45,.07);
      amp.gain.setTargetAtTime(a*.18,te-.035,.022); if(!next||next.ts-te>.04) amp.gain.setTargetAtTime(0,te+.03,.03); }); }   // (a breath, or straight on into the next syllable)
  return new Promise((ok,no)=>{ ac.oncomplete=e=>ok(e.renderedBuffer); try{ ac.startRendering()?.catch?.(no); }catch(e){ no(e); } });   // (old WebKit: no promise, only the event)
}

export function createChatter(ctx){
  const want=String(ctx.take??"tape").toLowerCase(), off=want==="0"||want==="off", take=TAKES[want]?want:"tape", LEVEL=(+ctx.level||1);
  let buf=null, loop=null, source=null, asked=false, failed=false, node=null, pos=0, was=false;
  const synth=t=>render(t).then(b=>{ buf=b; loop=[0,LEN]; source="synth"; });
  // the clip, decoded at its own rate (an offline context of that rate does it; old WebKit takes callbacks, not a promise)
  const clip=()=>Promise.resolve(ctx.load?ctx.load():fetch(ctx.url||new URL(TALK.file,import.meta.url).href).then(r=>{ if(!r.ok) throw new Error("talk.mp3 "+r.status); return r.arrayBuffer(); }))
    .then(ab=>{ const OAC=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext, oc=new OAC(1,1,TALK.rate); return new Promise((ok,no)=>{ const p=oc.decodeAudioData(ab,ok,no); p?.catch?.(no); }); })
    .then(b=>{ if(b.duration<TALK.lead+TALK.body) throw new Error("talk.mp3 is short: "+b.duration); buf=b; loop=[TALK.lead,TALK.lead+TALK.body]; source="tape"; });
  function make(){ if(asked) return; asked=true;
    (take==="tape"?clip().catch(e=>{ console.warn("chatter: no clip, the made-up talk instead",e); return synth("a"); }):synth(take)).catch(e=>{ failed=true; console.warn("chatter",e); }); }
  const at=()=>{ const n=loop[1]-loop[0]; return node?(node.from+Math.max(0,node.ac.currentTime-node.t))%n:pos%n; };
  let vol=1;   // the player's VOL wheel (wmkeys/): times the level the talk is set at
  function start(a){ const ac=a.ctx, t=ac.currentTime+.12;   // (just after the play key's clunk)
    const s=ac.createBufferSource(), g=ac.createGain(), v=ac.createGain(), lfo=ac.createOscillator(), lg=ac.createGain(), lv=LEVEL*(source==="tape"?TALK.gain:take==="tape"?QUIET:1);
    s.buffer=buf; s.loop=true; s.loopStart=loop[0]; s.loopEnd=loop[1]; g.gain.value=0; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(lv,t+.3);
    s.playbackRate.value=.55; s.playbackRate.setValueAtTime(.55,t); s.playbackRate.linearRampToValueAtTime(1,t+.32);   // the tape, up to speed with the hubs
    lfo.frequency.value=.6; lg.gain.value=source==="tape"?.006:.003; lfo.connect(lg).connect(s.playbackRate);   // and never quite steady
    v.gain.value=vol; s.connect(g).connect(v).connect(a.out); s.start(t,loop[0]+at()); lfo.start(t); node={s,g,v,lfo,ac,t,from:at()}; }   // (v: the player's VOL wheel)
  const hold=(p,now)=>{ if(p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else p.cancelScheduledValues(now); };
  function stop(){ if(!node) return; const {s,g,lfo,ac}=node, now=ac.currentTime; pos=at(); node=null;   // where the tape stopped: it goes on from here
    try{ hold(g.gain,now); g.gain.setTargetAtTime(0,now,.05); hold(s.playbackRate,now); s.playbackRate.setTargetAtTime(.5,now,.09);   // the tape runs down
      s.stop(now+.4); lfo.stop(now+.4); }catch{} }
  function frame(){
    if(off||failed) return;
    const on=!!ctx.playing();
    if(!on){ if(was){ was=false; stop(); } if(!asked&&ctx.soon?.()&&ctx.audio()) make(); return; }
    if(node&&was) return;
    const a=ctx.audio(); was=true;
    if(!a) return;   // (the tape started with the sound off: the first frame with sound picks it up)
    if(!buf) return make();
    if(!node) start(a); }
  // for the player's keys (wmkeys/): seek(d) winds the stopped tape d seconds on or back and says true at either end (null
  // while there is no tape to wind); flip() turns the tape over: the same place on it is as far from the other side's end
  function seek(d){ if(!loop) return null; if(node) return false; const n=loop[1]-loop[0], p=pos%n+d; pos=Math.min(n-.05,Math.max(0,p)); return p<=0||p>=n-.05; }
  function flip(){ if(!loop) return; const n=loop[1]-loop[0]; if(node){ stop(); was=false; } pos=(n-pos%n)%n; }   // (running, it runs down and up again on the other side)
  return {frame,render,take,seek,flip,get level(){ return vol; },set level(x){ vol=Math.min(4,Math.max(0,+x||0)); if(node) try{ node.v.gain.setTargetAtTime(vol,node.ac.currentTime,.03); }catch{} },get source(){ return source; },get on(){ return !!node; },get ready(){ return !!buf; },get pos(){ return loop?at():0; }};
}
