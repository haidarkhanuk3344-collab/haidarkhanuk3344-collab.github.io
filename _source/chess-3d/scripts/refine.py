from pathlib import Path
R=Path(__file__).resolve().parents[1];B=R.parents[1]/'assets/scene/4514eaa3'
p=B/'desktop.js';s=p.read_text();s=s.replace('PC_W=720, PC_H=400, PC_TW=800, PC_TH=600','PC_W=1440, PC_H=800, PC_TW=1600, PC_TH=1200')
s=s.replace('wide:"visit"','wide:"off"').replace('sz.y/2/(tv*.66)','sz.y/2/(tv*.82)').replace('emissiveIntensity:1.2}),PC.glint,.3','emissiveIntensity:.72}),PC.glint,.10')
s=s.replace('canvasTex(512,640,drawChessPrint)','canvasTex(512,640,drawChessPrint,{flip:true})')
s=s.replace('const HINT0=$("#hint").innerHTML','const HINT0="拖动环顾 · 点击物件探索 · C 使用电脑"')
s=s.replace('"CC BY "+v','v==="source"?"参考源码":"CC BY "+v')
# Literal shell labels from the original remain attributed in credits only.
p.write_text(s)
p=B/'credits/credits.js';s=p.read_text().replace('L2("CC BY "+v,c.ccBy&&c.ccBy[v])','L2(v==="source"?"source reference":"CC BY "+v,c.ccBy&&c.ccBy[v])');p.write_text(s)
# Final readable camera, sound timing, dynamic shadow and fallback fixes.
p=B/'desktop.js';s=p.read_text();s=s.replace('c.y-=Math.min(.03,Math.max(0,sz.y/2+.035-d*tv*(1-240/innerHeight)));','c.y+=.018;')
s=s.replace('window.dispatchEvent(new Event("chess-enter")); ','')
s=s.replace('if(gateSound) gesture(); else quiet(); stillOut();','if(gateSound) gesture(); else quiet(); window.dispatchEvent(new Event("chess-enter")); stillOut();')
s=s.replace('  chessRoom?.frame(dt,now);\n','')
s=s.replace('  if(shadowsDirty>0&&!phoneShadowSkip())','  if(chessRoom?.frame(dt,now)) shadowsDirty=2;\n  if(shadowsDirty>0&&!phoneShadowSkip())',1)
s=s.replace('#reading,#lite"','#reading,#lite,#entry-lite"')
p.write_text(s)
# Only keep the original loading indicator; the ordinary HTML link needs no legacy routing.
p=B/'boot.js';s=p.read_text();s=s.split('// LITE (Felix,')[0];p.write_text(s)
p=B/'notepad/notepad.js';s=p.read_text().replace('section("Companies",0,c.jobs)','section("Projects",0,c.jobs)').replace('section("Projects",c.jobs,c.tapes.length)','section("Life & ideas",c.jobs,c.tapes.length)');p.write_text(s)
# Chinese descriptions wrap at characters; Latin words still remain whole.
p=B/'notepad/notepad.js';s=p.read_text().replace('for(const word of text.split(/\\s+/)){ const t=line?line+" "+word:word;', 'for(const word of (text.match(/[\\u2e80-\\u9fff]|[^\\u2e80-\\u9fff\\s]+|\\s+/g)||[])){ const t=line+word;');p.write_text(s)
p=B/'desktop.js';s=p.read_text().replace("Couldn't load the scene.","房间暂时没有加载成功，可以先直接查看项目。").replace("This scene needs WebGL, which isn't available in this browser.","这个浏览器暂时无法显示 3D 房间，可以先直接查看项目。");p.write_text(s)
p=B/'notepad/notepad.js';s=p.read_text().replace('num:60,body:76','num:60,body:52').replace('g.strokeText(text,0,0);','if(!/[\\u2e80-\\u9fff]/.test(text)) g.strokeText(text,0,0);').replace('hand(g,"Work",LEFT-6','hand(g,"Notebook",LEFT-6');p.write_text(s)
