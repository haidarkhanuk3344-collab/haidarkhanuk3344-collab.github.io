from pathlib import Path
import re,json,shutil
ROOT=Path(__file__).resolve().parents[1]; SITE=ROOT.parents[1]; BASE=SITE/'assets/scene/4514eaa3'; SRC=ROOT.parent/'felix-replica/site'
# Rebuild only our adaptation layer; the downloaded reference is kept separately.
s=(SRC/'assets/scene/4514eaa3/desktop.js').read_text()
s=s.replace('import * as THREE from "three";','import * as THREE from "three";\nimport {createChessRoom,drawChessPoster,drawChessPrint} from "/chess/room.js";\nlet chessRoom=null;')
projects=[('ContextFlow','境流','探索镜头之间的上下文，让下一镜头听懂「承接上一镜头」。图像与视频 API 原型已接入，连贯性与成本收益仍待验证。','#789887'),('Brave Journey','勇者旅途','把喜欢的横版冒险加入自己的想法。已有战斗与装备系统，AI NPC 对话是下一步实验。','#caa06e'),('World Tree','世界树','让个人提示词长在一棵树上，用果实作为整理、查找与复制的入口。','#64794f'),('Hualuobo','花萝卜','桌面上的黑白小猫：从一段动作开始，探索有趣的陪伴。Windows 测试版待继续验证。','#baa98d')]
notes=[('Basketball','篮球','在球场上更自在地表达自己，在疲惫的生活里找到乐趣。'),('Stay Active','保持运动','篮球和健身，是生活里让我保持热情的部分。'),('Curiosity','保持好奇','喜欢研究，也喜欢把好奇心做成可以触碰的东西。'),('Product Notes','产品手记','先想清楚问题、功能和边界，再与 AI 讨论开发需求。'),('With AI','与 AI 共创','由我定义想做什么，与 AI 一起把想法推进到原型。'),('In Progress','持续完善','这个房间与这里的项目都会持续更新。未完成也是创作过程的一部分。'),('Chess','冯恒鑫','AI Product Manager，喜欢研究、动手和运动。')]
tapes=[]
for en,cn,d,c in projects:tapes.append(dict(t=en,y='PROJECT',d=d,bg=c,ink='#fff6df',big=[en.upper()],link=['打开 GitHub','https://github.com/haidarkhanuk3344-collab']))
for en,cn,d in notes:tapes.append(dict(t=en,y='LIFE / NOTES',d=d,bg='#733b3a',ink='#eee5cc',big=[en.upper()]))
s=re.sub(r'const TAPES = \[.*?\n\];', 'const TAPES = '+json.dumps(tapes,ensure_ascii=False)+';',s,count=1,flags=re.S)
s=s.replace('const JOBS=5;', 'const JOBS=4;')
ids=['contextflow','brave','world-tree','hualuobo']+['basketball','fitness','curiosity','product','ai','progress','chess']
s=re.sub(r'const CH_IDS=\[[^;]+;', 'const CH_IDS='+json.dumps(ids)+';',s,count=1)
s=re.sub(r'const CH_SRC=\{[^;]+;', 'const CH_SRC={};',s,count=1)
s=re.sub(r'const NOMUSIC=new Set\([^;]+;', 'const NOMUSIC=new Set();',s,count=1)
s=re.sub(r'const POSTS = .*?;\nconst ONSITE', 'const POSTS = [];\nconst ONSITE',s,count=1,flags=re.S)
s=s.replace('const HOME_PROG="intro"','const HOME_PROG="chess-intro"')
s=s.replace('big:["FELIX","RIESEBERG"],sub:"I BUILD THINGS  ·  CH 00"','big:["CHESS"],sub:"AI PRODUCT MANAGER  ·  CH 00"')
s=s.replace('bg:"#1c2bd4",ink:"#f3f1ff"','bg:"#733b3a",ink:"#eee5cc"')
s=s.replace('title:"At the Edge of the Internet",slot:"CH 00",label:"TAPE · AT THE EDGE OF THE INTERNET"','title:"Chess — Ideas in Progress",slot:"CH 00",label:"欢迎来到 Chess 的房间"')
s=s.replace('const FOV=32;','const FOV=44;').replace('home:{t:[0.04,1.1,0.02],dir:[-0.13,0.1,1],d:1.75}','home:{t:[0,1.02,.04],dir:[-.05,.05,1],d:2.5}')
s=s.replace('const drawPoster=(g,w,h)=>{','const drawPoster=(g,w,h)=>{ return drawChessPoster(g,w,h);\n/* retained reference drawing\n',1).replace('  const tex=canvasTex(1024,1448,drawPoster','*/ };\n  const tex=canvasTex(1024,1448,drawPoster',1)
s=s.replace('map:tex(SCENE_BASE+"tex/print.jpg",true)','map:canvasTex(512,640,drawChessPrint)')
s=s.replace('  fpsRoom();   // closed solids','  chessRoom=createChessRoom({THREE,scene,root,interact,reduce,pcVisit,go,chooseTape,music,setSound,audio:()=>A.on&&A.ctx?{ctx:A.ctx,out:A.master}:null});\n  fpsRoom();   // closed solids',1)
s=s.replace('  const sec=Math.floor(Date.now()/1000);','  chessRoom?.frame(dt,now);\n  const sec=Math.floor(Date.now()/1000);',1)
s=s.replace('  if(info.kind==="btn") tvButton(info.i);','  if(info.kind==="chess"){ info.action?.(); }\n  else if(info.kind==="btn") tvButton(info.i);',1)
s=s.replace('window.__scene={gesture,','window.__scene={get chess(){return chessRoom;},setSound,gesture,',1)
s=s.replace('enterBtn.remove(); sndBtn?.remove();','document.body.classList.add("entered"); window.dispatchEvent(new Event("chess-enter")); enterBtn.remove(); sndBtn?.remove();',1)
s=s.replace('let gateWait=!navigator.webdriver||/[?&]gate=1/.test(location.search);','let gateWait=true;').replace('gateWait=!navigator.webdriver||/[?&]gate=1/.test(location.search)','gateWait=true')
s=s.replace('const GATE=!navigator.webdriver||/[?&]gate=1/.test(location.search)','const GATE=true')
s=s.replace('cta.textContent=`${touchOnly()?"TAP":"CLICK"} TO ENTER`','cta.textContent="推门进来"')
s=s.replace('on?"SOUND ON":"SOUND OFF"','on?"声音 开":"声音 关"')
s=s.replace('const IV_BAKED=[','const IV_BAKED=[',1)
s=re.sub(r'const IV_BAKED=\[.*?\n\];','const IV_BAKED=[["Chess · GitHub","https://github.com/haidarkhanuk3344-collab","持续更新"]];',s,count=1,flags=re.S)
s=s.replace('window.__BM?.interviewsTitle||"Podcasts"','window.__BM?.interviewsTitle||"我的创作空间"')
s=s.replace('if(interviews) import("./chatter/chatter.js")','if(false) import("./chatter/chatter.js")')
s=s.replace('posts(t){ return teletext(t); }','posts(t){ return PAINT.home(t); }')
s=s.replace('COMPANIES','PROJECTS').replace('>PROJECTS</div><ul class="list">${ids.slice(JOBS)','>LIFE & IDEAS</div><ul class="list">${ids.slice(JOBS)')
s=s.replace('"bm-options"','"chess-room-options"').replace('"felixtext.tape"','"chess-reading"')
s=s.replace('BACK TO THE DESK · ESC','返回房间 · ESC').replace('BACK TO THE DESK','返回房间')
s=s.replace('const CREDITS=[','const CREDITS=[\n  ["Room source & interaction design","Felix Rieseberg",null,"https://felixrieseberg.com/?room=1","source"],',1)
s=s.replace('const CC_BY={','const CC_BY={source:"https://felixrieseberg.com/?room=1",',1)
# Add meaningful notes without overloading the TV's ASCII teletext page.
(BASE/'desktop.js').write_text(s)
for f in (ROOT/'custom').glob('chess-*.js'):shutil.copy2(f,SITE/'chess'/f.name)
shutil.copy2(ROOT/'custom/chess-pc.js',BASE/'pc/basic.js');shutil.copy2(ROOT/'custom/chess-content.js',BASE/'pc/chess-content.js')
ch=SITE/'scene-data/4514eaa3/channels'
(ch/'chess-intro.js').write_text('export {default} from "/chess/chess-tv.js";\n')
for i,id in enumerate(ids):
 if i<4:body=f'import {{makeProjectChannel}} from "/chess/chess-tv.js"; export default makeProjectChannel({i});'
 else:
  en,cn,d=notes[i-4];cfg=dict(id=id,title=cn,english=en,number=i+1,lines=[d,'可以慢慢逛，也可以去电脑里看看我的项目。'],length=24)
  body='import {makeNoteChannel} from "/chess/chess-tv.js"; export default makeNoteChannel('+json.dumps(cfg,ensure_ascii=False)+');'
 (ch/(id+'.js')).write_text(body+'\n')
# A small independent entrypoint: no Ghost account, search, stats or original biography.
original=(SRC/'index.html').read_text(); markup=re.search(r'<template id="bm-desktop">(.*?)</template>',original,re.S).group(1)
markup=markup.replace('Felix Rieseberg','Chess / 冯恒鑫').replace('I work on Claude at Anthropic. Electron co-maintainer. Maintainer of too many little open source projects.','AI 产品经理。把好奇心，做成可以触碰的东西。')
markup=markup.replace('A late-90s production monitor on a desk by a rainy Berlin window at night. Its input buttons and the stack of tapes navigate the site.','Chess 的夜间房间：雨窗、复古电脑、项目录像带、篮球和健身器材。')
markup=markup.replace('<a href="#about" data-page="about">ABOUT</a>','<button id="projects-link">项目 / PROJECTS</button><a href="#about" data-page="about">关于 / ABOUT</a>')
markup=markup.replace('<a href="#work" data-page="work">WORK</a>','<a href="#work" data-page="work">录像带 / TAPES</a>').replace('<a href="#posts" data-page="posts">POSTS</a>','')
markup=markup.replace('>ONLINE</a>','>GITHUB</a>').replace('CREDITS</span>','来源</span>').replace('SOUND OFF</span>','声音 开</span>').replace('BACK TO THE DESK · ESC','返回房间 · ESC')
markup=markup.replace('Enter the room','推门进入 Chess 的房间')
markup=re.sub(r'<a class="sound" id="reading".*?</a>','<a class="sound" id="reading" href="/plain.html">简洁版</a>',markup,flags=re.S)
fonts='\n'.join(re.findall(r'<link[^>]*(?:fonts|stylesheet)[^>]*>',original))
# Only local font CSS; scene and personalized CSS are explicit below.
fonts='<link rel="stylesheet" href="/fonts/e1bc683f6f4144cd.css">'
head='''<!doctype html><html lang="zh-CN" class="bm-scene"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="冯恒鑫 / Chess，一个喜欢研究、创作和运动的 AI 产品经理。"><title>Chess / 冯恒鑫 — Ideas in Progress</title><link rel="icon" href="/chess/favicon.svg"><link rel="stylesheet" href="/assets/scene/4514eaa3/desktop.css"><link rel="stylesheet" href="/chess/room.css">'''+fonts+'''<script type="importmap">{"imports":{"three":"/assets/vendor/three-0.169.0/three.module.js","three/addons/":"/assets/vendor/three-0.169.0/addons/"}}</script><script>window.__BM={assetBase:"/scene-data/4514eaa3/",page:"home",interviewsTitle:"我的创作空间",interviewsLabel:"CHESS",pageAt:()=>""};</script></head><body>'''
door='''<div id="door" aria-hidden="true"><div class="door-leaf"><div class="door-plaque"><small>AFTER HOURS · VOL. 01</small><strong>CHESS</strong><span>冯恒鑫的个人空间</span><i>AI Product Manager</i></div><div class="door-knob"></div><div class="door-light"></div></div></div><aside id="chess-note" hidden><button aria-label="收起便签">×</button><small id="note-kicker"></small><h2 id="note-title"></h2><p id="note-copy"></p></aside>'''
(SITE/'index.html').write_text(head+markup+door+'<script src="/assets/scene/4514eaa3/boot.js"></script><script type="module" src="/assets/scene/4514eaa3/desktop.js"></script></body></html>')
print('Personalized scene source, channels and entrypoint.')

for name in ("room.js","room.css","favicon.svg"):
 p=ROOT/"custom"/name
 if p.exists():shutil.copy2(p,SITE/"chess"/name)
p=SITE/'index.html';s=p.read_text().replace('<div id="door"','<a id="entry-lite" href="/plain.html">直接看项目 →</a><div id="door"',1)
s=s.replace('<script src="/assets/scene/4514eaa3/boot.js">','<script>new MutationObserver(()=>{if(!document.querySelector("#err").hidden)document.body.classList.add("scene-error")}).observe(document.querySelector("#err"),{attributes:true,childList:true});</script><script src="/assets/scene/4514eaa3/boot.js">',1)
p.write_text(s)
# Unused original films and company-channel bundles stay in the reference mirror only.
keep={x+".js" for x in ids}|{"chess-intro.js"}
for child in ch.iterdir():
 if child.name not in keep:
  if child.is_dir():shutil.rmtree(child)
  else:child.unlink()
junk=BASE/'pc/pc'
if junk.exists():shutil.rmtree(junk)
