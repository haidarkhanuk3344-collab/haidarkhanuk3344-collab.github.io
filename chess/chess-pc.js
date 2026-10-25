/** Chess OS: original canvas desktop for the 3D monitor's channel interface. */
import { profile, projects } from './chess-content.js';

const SIZE = { w: 720, h: 400 };
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
const MONO = '"Courier New", monospace';
const C = { ink:'#24382e', paper:'#e9e9d9', dark:'#29483a', green:'#657d6e', pale:'#d7dec9', line:'#adb9a2', white:'#f4f1df', gold:'#d8bf81' };
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();

export function mount({canvas,ctx,width=720,height=400,audio,open,start,settings,focused=false}={}) {
  if (!canvas || !ctx) throw new TypeError('Chess OS requires a canvas and 2D context.');
  const S={view:'desktop',project:null,selected:0,scroll:0,maxScroll:0,focused:!!focused,dirty:true,dead:false,hover:'',minute:'',toast:'',toastUntil:0,lastIcon:'',lastClick:-1e9,down:null,lastRelease:null,scrollDrag:null};
  const images=new Map(), videos=new Map(), cleanups=[];
  let hits=[], body={x:110,y:100,w:570,h:240}, contentY=0, mediaY=0, detailsY=0, linksY=0, optionRows=[];
  const icons=[...projects.map((p,i)=>({id:p.id,label:p.title,sub:p.english,mark:String(i+1).padStart(2,'0')})),{id:'about',label:'关于我.txt',sub:'READ ME',mark:'≡'},{id:'options',label:'房间设置',sub:'PREFERENCES',mark:'✳'}];
  const win={x:92,y:37,w:610,h:333};
  function dirty(){S.dirty=true;}
  function font(size=14,weight=400,family=FONT){ctx.font=`${weight} ${size}px ${family}`;ctx.textBaseline='top';}
  function text(t,x,y,size=14,color=C.ink,weight=400,family=FONT){font(size,weight,family);ctx.fillStyle=color;ctx.fillText(String(t),x,y);}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function line(x1,y1,x2,y2,color=C.line){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);ctx.stroke();}
  function bevel(x,y,w,h,fill=C.paper,pressed=false){rect(x,y,w,h,fill);const a=pressed?'#7a8976':'#fbf9e9',b=pressed?'#fbf9e9':'#788670';line(x,y,x+w,y,a);line(x,y,x,y+h,a);line(x+w,y,x+w,y+h,b);line(x,y+h,x+w,y+h,b);}
  function hotspot(id,x,y,w,h,act,clip=null){if(clip){const top=Math.max(y,clip.y),bottom=Math.min(y+h,clip.y+clip.h);if(bottom<=top)return;hits.push({id,x,y:top,w,h:bottom-top,act});}else hits.push({id,x,y,w,h,act});}
  function button(id,label,x,y,w,h,act,{dark=false,clip=null}={}){bevel(x,y,w,h,dark?C.dark:S.hover===id?'#f7f3df':C.paper);font(12,500);const tw=ctx.measureText(label).width;text(label,x+(w-tw)/2,y+(h-13)/2,12,dark?C.white:C.ink,500);hotspot(id,x,y,w,h,act,clip);}
  function wrapped(value,x,y,maxW,{size=14,color=C.ink,lineHeight=23,weight=400}={}){font(size,weight);let str='',yy=y;for(const ch of String(value)){if(ch==='\n'){text(str,x,yy,size,color,weight);str='';yy+=lineHeight;continue;}if(ctx.measureText(str+ch).width>maxW&&str){text(str,x,yy,size,color,weight);str=ch;yy+=lineHeight;}else str+=ch;}if(str)text(str,x,yy,size,color,weight);return yy+lineHeight;}
  function ding(){if(!audio?.ctx||!audio.out||audio.ctx.state!=='running')return;try{const o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),t=audio.ctx.currentTime;o.frequency.value=720;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.016,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+.055);o.connect(g).connect(audio.out);o.start(t);o.stop(t+.06);o.onended=()=>{o.disconnect();g.disconnect();};}catch{}}
  function message(t){S.toast=t;S.toastUntil=now()+3000;dirty();}
  function stopVideos(){for(const v of videos.values())v.pause();}
  function closeWindow(){stopVideos();S.view='desktop';S.project=null;S.scroll=0;S.hover='';dirty();ding();}
  function show(what){stopVideos();S.scroll=0;S.hover='';S.lastIcon='';const p=projects.find(p=>p.id===what||`project:${p.id}`===what);if(p){S.view='project';S.project=p;}else if(['about','online','options'].includes(what)){S.view=what;S.project=null;}else{S.view='desktop';S.project=null;}dirty();return true;}
  function link(url){if(!/^https:\/\//.test(url))return;ding();if(typeof open==='function'){open(url,{kind:'link',text:url});return;}const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.click();}
  function image(url){if(!images.has(url)){const im=new Image();im.onload=dirty;im.onerror=()=>{im.failed=true;dirty();};im.src=url;images.set(url,im);}return images.get(url);}
  function video(p){if(!p.video)return null;if(!videos.has(p.id)){const v=document.createElement('video');v.src=p.video;v.preload='metadata';v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');for(const k of ['loadeddata','loadedmetadata','pause','play','ended','error'])v.addEventListener(k,dirty);videos.set(p.id,v);}return videos.get(p.id);}
  function toggleVideo(p){const v=video(p);if(!v)return;if(v.error){message('演示视频暂时无法加载，请稍后重试。');return;}if(v.paused){if(v.ended)v.currentTime=0;v.play().then(dirty).catch(()=>message('请再点一次播放，启动演示。'));}else v.pause();dirty();}
  function fitImage(im,x,y,w,h){const iw=im.videoWidth||im.naturalWidth,ih=im.videoHeight||im.naturalHeight;if(!(iw&&ih))return false;const pixelAspect=.7663,s=Math.min(w/iw,h/(ih*pixelAspect)),dh=ih*s*pixelAspect;ctx.drawImage(im,x+(w-iw*s)/2,y+(h-dh)/2,iw*s,dh);return true;}
  function contentText(t,x,y,maxW,opts){return wrapped(t,x,y,maxW,opts);}
  function openIcon(index,force=false){S.selected=index;const it=icons[index],t=now();if(force||(S.lastIcon===it.id&&t-S.lastClick<440)){show(it.id);ding();S.lastIcon='';}else{S.lastIcon=it.id;S.lastClick=t;dirty();}}
  function desktop(){
    rect(0,0,720,400,C.green);
    // Quiet woven green wallpaper, not an image or a captured screen.
    ctx.globalAlpha=.05;for(let y=28;y<376;y+=4)line(0,y,720,y,'#e9f3d3');ctx.globalAlpha=1;
    bevel(0,0,719,26,C.paper);text('✳',12,4,18,C.dark,600);text('Chess OS',41,6,13,C.ink,700,MONO);text('个人工作台',142,7,12,'#64745c');text('VOL. 01',590,8,10,'#66765e',400,MONO);text(S.minute,660,7,11,C.ink,400,MONO);
    text('chess',342,204,95,'#85998a',400,'Georgia, serif');text('Ideas in progress.',360,299,19,'#c6d0bc',400,'Georgia, serif');
    for(let i=0;i<icons.length;i++){const it=icons[i],x=14+Math.floor(i/3)*104,y=45+(i%3)*103;if(i===S.selected&&S.view==='desktop'){rect(x,y,94,90,'#819789');ctx.setLineDash([2,3]);ctx.strokeStyle='#dce7cd';ctx.strokeRect(x+.5,y+.5,94,90);ctx.setLineDash([]);}if(i<4){rect(x+25,y+9,22,8,'#d9c58d');bevel(x+21,y+15,51,34,C.gold);text(it.mark,x+45,y+26,13,'#776647',400,MONO);}else if(i===4){bevel(x+34,y+8,29,43,C.white);for(let z=0;z<4;z++)line(x+40,y+18+z*6,x+57,y+18+z*6,'#85927e');}else{text('✳',x+28,y+8,39,'#dce3cf');}font(13,500);const tw=ctx.measureText(it.label).width;text(it.label,x+(94-tw)/2,y+59,13,C.white,500);font(9,400,MONO);text(it.sub,x+(94-ctx.measureText(it.sub).width)/2,y+78,9,'#d0dac7',400,MONO);hotspot(`icon:${i}`,x,y,94,90,()=>openIcon(i));}
    ctx.save();ctx.translate(465,63);ctx.rotate(.035);rect(3,4,214,117,'#31493a55');rect(0,0,214,117,'#e5d69f');rect(77,-5,57,12,'#e5e5cba0');text('给来访者的一张便签',18,20,12,'#727050');text('把好奇心，',18,46,17,'#424e36',500);text('做成可以触碰的东西。',18,71,17,'#424e36',500);text('双击文件夹 · Enter 打开',18,98,10,'#7a795c');ctx.restore();
    bevel(0,375,719,24,C.paper);button('about-menu','✳ 关于 Chess',5,379,112,16,()=>show('about'));text('4 个项目 · 持续更新中',134,382,10,'#68775d');button('settings-menu','设置',653,379,58,16,()=>show('options'));
  }
  function beginWindow(){
    const title=S.view==='project'?`${S.project.title} / ${S.project.english}`:S.view==='about'?'关于我.txt':S.view==='online'?'在 GitHub 找到我':'房间设置';
    rect(win.x+6,win.y+7,win.w,win.h,'#20372b66');bevel(win.x,win.y,win.w,win.h,C.paper);rect(win.x+3,win.y+3,win.w-6,25,C.dark);rect(win.x+10,win.y+10,12,10,C.gold);text(title,win.x+30,win.y+9,13,C.white,500);button('close','×',win.x+win.w-27,win.y+6,20,19,closeWindow);
    rect(win.x+3,win.y+29,win.w-6,30,'#dce1d1');button('desktop-back','← 桌面',win.x+10,win.y+34,70,20,closeWindow);
    if(S.view==='project'){button('jump-intro','介绍',win.x+90,win.y+34,49,20,()=>{S.scroll=0;dirty();});button('jump-media','演示',win.x+144,win.y+34,49,20,()=>{S.scroll=clamp(mediaY,0,S.maxScroll);dirty();});button('jump-thoughts','思考',win.x+198,win.y+34,49,20,()=>{S.scroll=clamp(detailsY,0,S.maxScroll);dirty();});button('jump-links','体验与源码',win.x+252,win.y+34,88,20,()=>{S.scroll=clamp(linksY,0,S.maxScroll);dirty();});}
    else text('CHESS / PERSONAL',win.x+93,win.y+40,10,'#728167',400,MONO);
    body={x:win.x+3,y:win.y+61,w:win.w-21,h:win.h-81};
    rect(body.x,body.y,body.w,body.h,C.paper);
    ctx.save();ctx.beginPath();ctx.rect(body.x,body.y,body.w,body.h);ctx.clip();
    const x=body.x+20,y=body.y-S.scroll;
    return {x,y,w:body.w-40};
  }
  function endWindow(bottom){
    ctx.restore();S.maxScroll=Math.max(0,bottom-(body.y-S.scroll)-body.h+18);S.scroll=clamp(S.scroll,0,S.maxScroll);
    const x=win.x+win.w-15,y=body.y,h=body.h;rect(x,y,12,h,'#c9d1bd');
    const th=Math.max(28,h*h/(h+S.maxScroll)),ty=y+(h-th)*(S.maxScroll?S.scroll/S.maxScroll:0);
    if(S.maxScroll){bevel(x+1,ty,10,th,'#9caf98');hotspot('scroll-thumb',x,ty,12,th,()=>{});hotspot('scroll-track',x,y,12,h,point=>{S.scroll=clamp((point.y-y-th/2)/(h-th)*S.maxScroll,0,S.maxScroll);dirty();});}
    rect(win.x+3,win.y+win.h-18,win.w-6,15,'#dce1d1');line(win.x+3,win.y+win.h-19,win.x+win.w-3,win.y+win.h-19);text(S.view==='project'?S.project.status:'冯恒鑫 · AI Product Manager',win.x+11,win.y+win.h-14,9,'#718065');text(S.maxScroll?'滚轮 / ↑↓ 阅读':'KEEP EXPLORING',win.x+win.w-132,win.y+win.h-14,9,'#718065',400,S.maxScroll?FONT:MONO);
  }
  function projectBody(){const p=S.project,{x,y:y0,w}=beginWindow();let y=y0+20;
    text(`PROJECT ${p.year} / ${p.kind}`,x,y,10,'#7c886e',400,MONO);y+=24;text(p.title,x,y,25,C.ink,600);text(p.english,x+ctx.measureText(p.title).width+16,y+9,13,'#718267',400,'Georgia, serif');y+=40;
    y=contentText(p.lead,x,y,w,{size:16,lineHeight:25,weight:500})+12;
    y=contentText(p.description,x,y,w,{size:13,color:'#65735b',lineHeight:22})+20;
    mediaY=y-y0-8;
    const h=p.id==='hualuobo'?160:205;rect(x,y,w,h,p.id==='hualuobo'?'#d7cfb9':'#263c31');const im=image(p.image),v=p.video?video(p):null;
    if(v&&v.readyState>=2&&!v.paused)fitImage(v,x,y,w,h);else if(!fitImage(im,x,y,w,h))text(im.failed?'图片暂时无法加载':'正在打开演示画面…',x+18,y+h/2,13,'#e8e9d6');
    if(v){const label=v.error?'重新加载':v.paused?'▶ 播放真实演示':'Ⅱ 暂停演示';button('video-play',label,x+12,y+h-35,138,25,()=>{if(v.error){v.load();dirty();}else toggleVideo(p);},{dark:true,clip:body});if(!v.paused||v.currentTime>0){const duration=Number.isFinite(v.duration)?v.duration:0;text(`${Math.floor(v.currentTime)} / ${Math.ceil(duration)} s`,x+w-92,y+h-28,11,'#fff9e5',400,MONO);hotspot('video-restart',x+w-100,y+h-40,100,40,()=>{v.currentTime=0;dirty();},body);}}
    y+=h+9;y=contentText(p.mediaNote,x,y,w,{size:11,color:'#7a866d',lineHeight:18})+19;detailsY=y-y0-8;
    for(const [title,copy] of p.sections){line(x,y,x+w,y,'#c8d0bb');y+=17;text(title,x,y,14,C.ink,600);y+=27;y=contentText(copy,x,y,w,{size:13,color:'#55684f',lineHeight:23})+22;}
    linksY=y-y0-8;text('体验与源码',x,y,16,C.ink,600);y+=31;
    if(p.repo){button('repo','GitHub · 项目与运行说明 ↗',x,y,252,31,()=>link(p.repo),{dark:true,clip:body});y+=44;}
    if(p.download){button('download','查看测试版与安装说明 ↗',x,y,252,31,()=>link(p.download),{clip:body});y+=44;}
    y=contentText(p.availability,x,y,w,{size:12,color:'#758468',lineHeight:22})+10;endWindow(y);
  }
  function aboutBody(){const {x,y:y0,w}=beginWindow();let y=y0+22;text('A NOTE FROM CHESS',x,y,10,'#78866b',400,MONO);y+=24;text('Chess',x,y,38,C.ink,400,'Georgia, serif');text('冯恒鑫',x+122,y+13,18,C.ink,500);y+=51;text('AI PRODUCT MANAGER',x,y,12,'#78866b',600,MONO);y+=31;y=contentText(profile.bio,x,y,w,{size:14,lineHeight:25})+24;
    for(const [title,copy] of [['我怎样做东西','先想清楚为谁解决什么问题，划定产品边界与功能，再和 AI 讨论需求、推进开发。原型会不断改变，最初的好奇心会留下来。'],['离开电脑之后','篮球、健身，出一身汗。在球场上更自由地表达自己，也在疲惫的生活里重新找到乐趣。'],['这个房间','研究一点，动手做点，始终保持热情。这里会不断加入新的项目、想法和小彩蛋。']]){line(x,y,x+w,y);y+=17;text(title,x,y,15,C.ink,600);y+=29;y=contentText(copy,x,y,w,{size:14,color:'#586b52',lineHeight:25})+23;}
    button('about-github','在 GitHub 找到我 ↗',x,y,220,31,()=>link(profile.github),{dark:true,clip:body});y+=48;endWindow(y);
  }
  function onlineBody(){const {x,y:y0,w}=beginWindow();let y=y0+24;text('LET’S KEEP IN TOUCH',x,y,11,'#7c896d',400,MONO);y+=30;text('在 GitHub 找到我',x,y,25,C.ink,600);y+=45;y=contentText('我做的东西、持续迭代的实验，都放在这里。你可以通过项目仓库了解它们的进展。',x,y,w,{size:14,lineHeight:25})+24;button('profile-github','GitHub · Chess ↗',x,y,220,34,()=>link(profile.github),{dark:true,clip:body});y+=52;y=contentText('haidarkhanuk3344-collab',x,y,w,{size:13,color:'#768469',lineHeight:22});endWindow(y+30);}
  function optionsBody(){const {x,y:y0,w}=beginWindow();let y=y0+19;text('让房间更适合你。',x,y,21,C.ink,500);y+=34;y=contentText('这些设置会改变房间的真实显示与声音效果。',x,y,w,{size:13,color:'#738169',lineHeight:22})+14;
    try{optionRows=settings?.list?.()||[];}catch{optionRows=[];}
    if(!optionRows.length)y=contentText('当前房间没有可调整的选项。右上角声音按钮仍可控制声音。',x,y,w,{size:14,lineHeight:24})+10;
    for(const item of optionRows){const choices=item.choices||[],i=Math.max(0,choices.findIndex(c=>c[0]===item.value)),label=choices[i]?.[1]||String(item.value);line(x,y,x+w,y);y+=12;y=contentText(item.label,x,y,w-112,{size:13,lineHeight:22,weight:500});text(label,x,y+3,12,'#6d7f61');const by=y-18;button(`option:${item.id}:prev`,'‹',x+w-88,by,34,28,()=>changeOption(item,-1),{clip:body});button(`option:${item.id}:next`,'›',x+w-45,by,34,28,()=>changeOption(item,1),{clip:body});y+=33;}endWindow(y+10);
  }
  function changeOption(item,d){const choices=item.choices||[];if(!choices.length)return;const i=Math.max(0,choices.findIndex(c=>c[0]===item.value)),value=choices[(i+d+choices.length)%choices.length][0];try{const result=settings?.set?.(item.id,value);if(result==='reload')message('设置已保存，刷新后生效。');else if(result===false)message('这项设置暂时不能更改。');else ding();}catch{message('设置暂时未能更改。');}dirty();}
  function paint(){if(S.dead)return;hits=[];ctx.save();ctx.setTransform(width/SIZE.w,0,0,height/SIZE.h,0,0);ctx.imageSmoothingEnabled=true;desktop();if(S.view==='project')projectBody();else if(S.view==='about')aboutBody();else if(S.view==='online')onlineBody();else if(S.view==='options')optionsBody();
    if(S.toast){font(12);const w=Math.min(650,ctx.measureText(S.toast).width+30);rect((720-w)/2,341,w,27,'#213d30');text(S.toast,(720-w)/2+15,348,12,C.white);}
    ctx.restore();S.dirty=false;
  }
  function point(ev){let x=ev.x,y=ev.y;if(ev.u!=null&&ev.v!=null){x=ev.u*720;y=ev.v*400;}else if(x!=null&&y!=null){x=x/width*720;y=y/height*400;}if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=720||y>=400)return null;return{x,y};}
  function hitAt(p){if(!p)return null;const candidates=hits.filter(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);if(S.view!=='desktop'){const current=candidates.filter(h=>!h.id.startsWith('icon:')&&!['about-menu','settings-menu'].includes(h.id));return current.find(h=>h.id==='scroll-thumb')||current.at(-1)||null;}return candidates.at(-1)||null;}
  function clickAt(p){const h=hitAt(p);if(!h){if(S.view==='desktop'){S.lastIcon='';dirty();}return true;}h.act(p);return true;}
  function keyIn(ev){const key=ev.key||ev.code;if(ev.ctrlKey||ev.metaKey||ev.altKey)return false;if(key==='Escape')return false; // host owns Esc: leave the 3D close-up
    if(key==='Backspace'){if(S.view!=='desktop')closeWindow();return true;}if(key==='Enter'||key===' '){if(ev.repeat)return true;if(S.view==='desktop')openIcon(S.selected,true);else if(S.view==='project'&&key===' '&&S.project.video)toggleVideo(S.project);return true;}
    if(key==='Tab'){if(ev.shiftKey)return false;if(S.view==='desktop')S.selected=(S.selected+1)%icons.length;else S.scroll=clamp(S.scroll+body.h*.75,0,S.maxScroll);dirty();return true;}
    if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(key)){if(S.view==='desktop'){const d={ArrowDown:1,ArrowUp:-1,ArrowRight:3,ArrowLeft:-3}[key];S.selected=clamp(S.selected+d,0,icons.length-1);}else S.scroll=clamp(S.scroll+(key==='ArrowUp'||key==='ArrowLeft'?-38:38),0,S.maxScroll);dirty();return true;}
    if(['PageDown','PageUp','Home','End'].includes(key)){if(S.view==='desktop')return false;S.scroll=key==='Home'?0:key==='End'?S.maxScroll:clamp(S.scroll+(key==='PageDown'?1:-1)*body.h*.85,0,S.maxScroll);dirty();return true;}return false;}
  function input(ev){if(S.dead||!ev)return false;if(ev.type==='open')return show(ev.what);if(ev.type==='focus'){S.focused=true;dirty();return true;}if(ev.type==='blur'){S.focused=false;S.down=null;S.scrollDrag=null;stopVideos();dirty();return true;}if(ev.type==='redraw'){dirty();return true;}if(ev.type==='keydown'||ev.type==='key')return keyIn(ev);
    if(ev.type==='wheel'){if(S.view==='desktop')return false;let d=Number(ev.deltaY)||0;if(ev.deltaMode===1)d*=16;if(ev.deltaMode===2)d*=body.h;S.scroll=clamp(S.scroll+clamp(d,-160,160),0,S.maxScroll);dirty();return true;}
    if(ev.type==='pointerleave'||ev.type==='mouseleave'){S.hover='';dirty();return false;}
    const p=point(ev);
    if(ev.type==='pointermove'||ev.type==='mousemove'){if(S.scrollDrag&&p){const th=Math.max(28,body.h*body.h/(body.h+S.maxScroll));S.scroll=clamp(S.scrollDrag.scroll+(p.y-S.scrollDrag.y)/(body.h-th)*S.maxScroll,0,S.maxScroll);dirty();return true;}const h=hitAt(p),id=h?.id||'';if(id!==S.hover){S.hover=id;dirty();}return !!h;}
    if(ev.type==='pointerdown'||ev.type==='mousedown'){if(!p||ev.button>0)return false;S.down={...p,id:hitAt(p)?.id};if(S.down.id==='scroll-thumb')S.scrollDrag={y:p.y,scroll:S.scroll};return true;}
    if(ev.type==='pointerup'||ev.type==='mouseup'){if(!S.down)return false;const down=S.down;S.down=null;const wasDrag=!!S.scrollDrag;S.scrollDrag=null;if(p&&!wasDrag&&Math.hypot(p.x-down.x,p.y-down.y)<7){clickAt(p);S.lastRelease={...p,t:now()};}return true;}
    if(ev.type==='pointercancel'){S.down=null;S.scrollDrag=null;return true;}
    if(ev.type==='click'||ev.type==='tap'){if(!p)return false;if(S.lastRelease&&now()-S.lastRelease.t<90&&Math.hypot(p.x-S.lastRelease.x,p.y-S.lastRelease.y)<7)return true;return clickAt(p);}return false;
  }
  function attachKeyboard(el,{tab=true}={}){const onKey=e=>{if(e.isComposing||e.key==='Process'||e.key==='Unidentified')return;if(e.key==='Tab'&&(!tab||e.shiftKey))return;if(input({type:'keydown',key:e.key,ctrlKey:e.ctrlKey,metaKey:e.metaKey,altKey:e.altKey,shiftKey:e.shiftKey,repeat:e.repeat})){e.preventDefault();e.stopPropagation();el.value='';}};const onFocus=()=>input({type:'focus'});const onBlur=()=>input({type:'blur'});el.addEventListener('keydown',onKey);el.addEventListener('focus',onFocus);el.addEventListener('blur',onBlur);let done=false;const remove=()=>{if(done)return;done=true;el.removeEventListener('keydown',onKey);el.removeEventListener('focus',onFocus);el.removeEventListener('blur',onBlur);};cleanups.push(remove);return remove;}
  const onHidden=()=>{if(document.hidden){stopVideos();dirty();}};document.addEventListener('visibilitychange',onHidden);cleanups.push(()=>document.removeEventListener('visibilitychange',onHidden));
  function frame(){if(S.dead)return false;const minute=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});if(minute!==S.minute){S.minute=minute;dirty();}if(S.toast&&now()>S.toastUntil){S.toast='';dirty();}if(S.view==='project'){const v=videos.get(S.project.id);if(v&&!v.paused&&v.readyState>=2)dirty();}if(!S.dirty)return false;paint();return true;}
  function stop(){if(S.dead)return;S.dead=true;stopVideos();for(const v of videos.values()){v.removeAttribute('src');v.load();}for(const clean of cleanups)clean();images.clear();videos.clear();}
  function screenText(){if(S.view==='project'){const p=S.project;return [p.title,p.english,p.status,p.lead,p.description,p.mediaNote,...p.sections.flat(),p.availability,p.repo||''].join('\n');}if(S.view==='about')return `${profile.alias} / ${profile.name}\n${profile.role}\n${profile.bio}\n篮球、健身，保持好奇，持续动手。\n${profile.github}`;if(S.view==='online')return `在 GitHub 找到 Chess\n${profile.github}`;if(S.view==='options')return '房间设置\n'+optionRows.map(i=>`${i.label}: ${i.value}`).join('\n');return `Chess OS\n冯恒鑫 · AI Product Manager\n${icons.map(i=>i.label).join('\n')}\n双击文件夹或按 Enter 打开，Backspace 回桌面。`;}
  if(start&&start!=='ready')show(start);frame();
  return {frame,input,attachKeyboard,stop,text:screenText,run:show,get state(){return{mode:'desktop',power:'on',saver:false,focused:S.focused,view:S.view,project:S.project?.id||null,selected:S.selected,scroll:S.scroll,maxScroll:S.maxScroll};}};
}
export default {id:'chess-desktop',title:'Chess OS',kind:'pc',interface:1,mount};
