// Chess's own room additions. The underlying room implementation is credited separately.
export function drawChessPoster(g,w,h){
 g.save();g.scale(w/600,h/850);g.fillStyle='#723a36';g.fillRect(0,0,600,850);g.fillStyle='#eadcb8';g.font='bold 98px Georgia';g.fillText('STAY',40,118);g.fillText('IN PLAY.',40,214);
 g.strokeStyle='#dbc395';g.lineWidth=3;g.strokeRect(35,257,530,407);g.beginPath();g.arc(300,460,138,0,7);g.moveTo(162,460);g.lineTo(438,460);g.moveTo(300,322);g.lineTo(300,598);g.stroke();g.beginPath();g.ellipse(300,460,60,138,0,0,7);g.stroke();
 g.font='26px "PingFang SC",sans-serif';g.fillStyle='#eadcb8';g.fillText('保持好奇，也保持运动。',40,734);g.font='20px monospace';g.fillText('CHESS / AFTER HOURS',40,791);
 let seed=840;g.fillStyle='#e7d4a9';g.globalAlpha=.09;for(let i=0;i<10000;i++){seed=(seed*16807)%2147483647;let x=seed%600;seed=(seed*16807)%2147483647;g.fillRect(x,seed%850,1,1);}g.restore();
}
export function drawChessPrint(g,w,h){g.fillStyle='#ded0a8';g.fillRect(0,0,w,h);g.strokeStyle='#7b3d39';g.lineWidth=12;g.strokeRect(26,26,w-52,h-52);g.fillStyle='#473d2e';g.textAlign='center';g.font='bold 80px Georgia';g.fillText('CHESS',w/2,195);g.font='38px "PingFang SC",sans-serif';g.fillText('保持好奇',w/2,310);g.fillText('继续动手',w/2,380);g.font='22px monospace';g.fillText('IDEAS IN PROGRESS',w/2,490);g.textAlign='left';}
export function createChessRoom({THREE,scene,root,interact,reduce,pcVisit,go,chooseTape,music,setSound,audio}){
 const group=new THREE.Group();group.name='chess-personal-room';scene.add(group);
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.76,...extra});
 const mesh=(geo,material,pos)=>{const m=new THREE.Mesh(geo,material);if(pos)m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;return m;};
 const texture=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
 const note=document.querySelector('#chess-note');let noteTimer=0,discovered=new Set();
 function show(title,copy,kicker='A LITTLE ABOUT ME'){clearTimeout(noteTimer);note.querySelector('#note-title').textContent=title;note.querySelector('#note-copy').textContent=copy;note.querySelector('#note-kicker').textContent=kicker;note.hidden=false;noteTimer=setTimeout(()=>note.hidden=true,11000);}
 note.querySelector('button').onclick=()=>note.hidden=true;
 const clickable=(object,label,action)=>{object.traverse(o=>{if(o.isMesh)interact.set(o,{kind:'chess',label,action:()=>{discovered.add(label);action();}});});};
 function sound(f=100,type='sine',duration=.16,volume=.13){const a=audio();if(!a)return;const t=a.ctx.currentTime,o=a.ctx.createOscillator(),gain=a.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.35,t+duration);gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(gain).connect(a.out);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();gain.disconnect();};}
 // A real leather-textured ball, with separate inset black seams.
 const leather=texture(512,256,(g,w,h)=>{g.fillStyle='#b65e27';g.fillRect(0,0,w,h);let z=994;for(let i=0;i<26000;i++){z=z*16807%2147483647;const x=z%w;z=z*16807%2147483647;g.fillStyle=i%2?'#9d4c2380':'#eb9a4c70';g.beginPath();g.arc(x,z%h,.65,0,7);g.fill();}});
 const ball=new THREE.Group();ball.name='chess-basketball';const box=root.getObjectByName('cardboard_box_01');const boxBounds=box?new THREE.Box3().setFromObject(box):null;const sportsY=boxBounds?.max.y||.40;ball.position.set(.99,sportsY+.124,.18);group.add(ball);
 ball.add(mesh(new THREE.SphereGeometry(.122,48,32),mat('#ffffff',{map:leather,bumpMap:leather,bumpScale:.0013})));
 const seamMat=mat('#241a13');for(let k=0;k<4;k++){const seam=mesh(new THREE.TorusGeometry(.1223,.0015,6,96),seamMat);if(k===0)seam.rotation.x=Math.PI/2;else seam.rotation.y=(k-1)*Math.PI/3;ball.add(seam);}
 let bounceAt=-1e9,bounces=0,lastBounce=-1;
 clickable(ball,'篮球 · 拍两下',()=>{bounceAt=performance.now();bounces++;lastBounce=-1;sound(112);show('球场上的我','篮球让我更自在地表达自己，也让我在疲惫的生活里找到乐趣。'+(bounces>=3?'\n彩蛋：今天的热身完成。':'') ,'OFF THE SCREEN / '+String(bounces).padStart(2,'0'));});
 const rubber=mat('#292b29'),steel=mat('#9b9a8c',{metalness:.65,roughness:.36});const bells=[];
 for(let i=0;i<2;i++){const b=new THREE.Group();b.name='chess-dumbbell-'+i;b.position.set(1.25,sportsY+.085,.07+i*.23);b.rotation.y=1.4+i*.08;
 const bar=mesh(new THREE.CylinderGeometry(.021,.021,.30,16),steel);bar.rotation.z=Math.PI/2;b.add(bar);
 for(const x of [-.13,.13]){const plate=mesh(new THREE.CylinderGeometry(.077,.077,.072,6),rubber,[x,0,0]);plate.rotation.z=Math.PI/2;b.add(plate);const cap=mesh(new THREE.CylinderGeometry(.038,.038,.074,24),steel,[x,0,0]);cap.rotation.z=Math.PI/2;b.add(cap);}
 group.add(b);bells.push(b);clickable(b,'健身 · 保持高精力',()=>{b.userData.lift=performance.now();sound(175,'triangle',.10,.045);show('动起来，换一种状态','我喜欢研究和创作，也喜欢运动。篮球与健身，让生活里始终有热情可以投入。','STAY ACTIVE');});}
 // Worn court mat anchors the sports objects to the floor.
 const rugTex=texture(1024,768,(g,w,h)=>{g.fillStyle='#52634d';g.fillRect(0,0,w,h);g.strokeStyle='#c6b58b';g.lineWidth=6;g.strokeRect(44,44,w-88,h-88);g.beginPath();g.arc(w/2,h/2,190,0,7);g.moveTo(w/2,44);g.lineTo(w/2,h-44);g.stroke();g.font='28px Georgia';g.fillStyle='#d4c09b';g.fillText('AFTER HOURS ATHLETIC CLUB',90,h-75);});
 const rug=mesh(new THREE.PlaneGeometry(1.03,.84),mat('#ffffff',{map:rugTex}),[.99,.006,1.04]);rug.rotation.x=-Math.PI/2;group.add(rug);
 // Product notes are actual pieces of paper on the wall, in the room's perspective.
 const boardTex=texture(1024,760,(g,w,h)=>{g.fillStyle='#8b6746';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=7){g.fillStyle=y%2?'#8f6c4870':'#765a3e44';g.fillRect(0,y,w,2);}const cards=[['01 / OBSERVE','从自己的经历发现问题'],['02 / DEFINE','定义功能与产品边界'],['03 / BUILD','和 AI 一起把想法做出来']];cards.forEach(([en,cn],i)=>{g.save();g.translate(70+i*18,60+i*215);g.rotate((i%2?.02:-.025));g.fillStyle=['#ded1a3','#c1c8ae','#dab79b'][i];g.fillRect(0,0,820,180);g.fillStyle='#514c3b';g.font='27px monospace';g.fillText(en,35,52);g.font='42px "PingFang SC",sans-serif';g.fillText(cn,35,123);g.fillStyle='#7d342c';g.beginPath();g.arc(410,12,8,0,7);g.fill();g.restore();});});
 const board=mesh(new THREE.BoxGeometry(.50,.37,.024),mat('#ffffff',{map:boardTex}),[-1.17,1.65,-.385]);group.add(board);clickable(board,'便签 · 我怎样做产品',()=>show('先想清楚，再动手','从自己的使用经历里发现问题，制定产品边界与功能，再与 AI 讨论开发需求，让想法变成能够验证的原型。','PRODUCT THINKING'));
 // A new sticker covers the original monitor's small maker label.
 const brandTex=texture(512,80,(g,w,h)=>{g.fillStyle='#24241f';g.fillRect(0,0,w,h);g.fillStyle='#d4c6a6';g.font='bold 45px Georgia';g.fillText('CHESS STUDIO',10,57);});
 const brand=mesh(new THREE.PlaneGeometry(.135,.019),mat('#fff',{map:brandTex}),[-.105,1.1796,.186]);group.add(brand);
 document.querySelector('#projects-link').onclick=()=>{note.hidden=true;pcVisit();};
 document.querySelector('#reading').href='/plain.html';
 const nativeHint=document.querySelector('#hint');nativeHint.textContent='拖动环顾 · 点击物件探索 · C 使用电脑';
 // Source hint updates on navigation; a short Chinese guide stays in the title instead of covering the room.
 document.querySelector('#gl').title='拖动环顾四周，点击电脑、篮球、健身器材或桌面物件。Esc 返回。';
 addEventListener('chess-enter',()=>{sound(165,'triangle',.32,.06);setTimeout(()=>show('欢迎来我的房间','我是冯恒鑫，也可以叫我 Chess。点电脑看项目，拖动画面四处逛逛。','AI PRODUCT MANAGER'),1700);},{once:true});
 // Accessible source link remains on a separate readable credits page as well as the original in-room credits card.
 return {ball,bells,board,group,discovered,show,frame(dt,now){const t=(now-bounceAt)/1000;let moving=t<2.25;if(t<2.2){const cycle=Math.floor(t/.55),p=(t% .55)/.55,amp=.34*Math.pow(.58,cycle);ball.position.y=sportsY+.124+(reduce?0:Math.sin(p*Math.PI)*amp);ball.rotation.y=t*.9;if(cycle!==lastBounce){lastBounce=cycle;sound(105,'sine',.13,.12*Math.pow(.65,cycle));}}else ball.position.y=sportsY+.124;
 for(const b of bells){const t=(now-(b.userData.lift??-1e9))/1000;moving ||= t<1.35;b.position.y=sportsY+.085+(!reduce&&t<1.3?Math.sin(t/1.3*Math.PI)*.14:0);}return moving; }, get state(){return{bounceCount:bounces,discovered:[...discovered]};}};
}
