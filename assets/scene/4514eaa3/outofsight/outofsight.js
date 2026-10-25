// outofsight.js: is the room being shown? (Felix, 16 Oct 2026: "losing focus should pause audio", then "Maybe not focus.
// Visibility".) The page already sleeps with document.hidden (another tab, a minimised window). A page can be out of sight
// while the browser still calls it visible, though: a window behind others or on another desktop in a browser that doesn't
// report it, a frame its host has put away (the artifact while its pane is closed), a screen that went dark. What those share
// is that the browser stops giving the page frames, so that is what this watches.
//
// Every `every` ms a timer asks for one animation frame. If the frame asked for at the last tick hasn't come, that is a miss;
// `misses` in a row (about a second) and the page is away. A page that is only busy can't get there: a busy main thread runs
// no timers either, and once it is free the frame comes before the next tick. The first frame after that means it is back.
// While document.hidden nothing is counted (the page's own visibilitychange has that).
//   const sight=createOutOfSight({onChange:away=>{...}});  sight.away  sight.stop()
export function createOutOfSight({onChange,every=400,misses=3}={}){
  let away=false, n=0, asked=false;
  const tell=v=>{ if(v===away) return; away=v; try{ onChange&&onChange(v); }catch(e){ console.warn("outofsight",e); } };
  const frame=()=>{ asked=false; n=0; tell(false); };
  const tick=()=>{
    if(document.hidden){ n=0; }
    else if(asked){ if(++n>=misses) tell(true); }
    if(!asked){ asked=true; requestAnimationFrame(frame); } };
  const timer=setInterval(tick,every); tick();
  return { get away(){ return away; }, stop(){ clearInterval(timer); } };
}
