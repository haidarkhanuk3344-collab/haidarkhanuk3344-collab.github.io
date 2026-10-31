import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {profile,projects} from '../custom/chess-content.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const site=fs.existsSync(path.join(root,'site'))?path.join(root,'site'):path.resolve(root,'../..');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const link=(url,label,primary=false)=>`<a href="${esc(url)}" target="_blank" rel="noopener"${primary?' class="primary"':''}>${esc(label)}</a>`;
const sections=rows=>rows.map(([t,c])=>`<div><h3>${esc(t)}</h3><p>${esc(c)}</p></div>`).join('');
const html=projects.map(p=>{
 const image=`<img ${p.id==='hualuobo'?'class="character" ':''}src="${esc(p.image)}" alt="${esc(p.title+' · '+p.mediaNote)}" loading="lazy">`;
 const media=p.video?`<video controls playsinline preload="metadata" poster="${esc(p.image)}" src="${esc(p.video)}" aria-label="${esc(p.title)}运行演示"><a href="${esc(p.video)}">打开演示视频</a></video>`:`<a href="${esc(p.image)}" target="_blank" rel="noopener" aria-label="查看${esc(p.title)}演示大图">${image}</a>`;
 return `<article class="project" id="${esc(p.id)}" aria-labelledby="title-${esc(p.id)}"><div class="eyebrow">PROJECT ${esc(p.year)} / ${esc(p.kind)}</div><div class="project-head"><h2 id="title-${esc(p.id)}">${esc(p.title)}<span class="english">${esc(p.english)}</span></h2><span class="status">${esc(p.status)}</span></div><p class="lead">${esc(p.lead)}</p><p class="description">${esc(p.description)}</p><div class="actions">${p.demo?link(p.demo,p.demoLabel||'打开演示 ↗',true):''}${p.repo?link(p.repo,'GitHub · 源码与运行说明 ↗',!p.demo):''}${p.download?link(p.download,'查看测试版 ↗'):''}</div><p class="availability">${esc(p.availability)}</p><figure>${media}<figcaption>${esc(p.mediaNote)}</figcaption></figure><div class="thoughts">${sections(p.sections.slice(0,2))}</div>${p.sections.length>2?`<details><summary>继续阅读 · 设计取舍、进展与边界</summary>${sections(p.sections.slice(2))}</details>`:''}<div class="project-tail"><span>${esc(p.english)} / ${esc(p.kind)}</span><a href="#project-index">回到项目目录 ↑</a></div></article>`;
}).join('\n');
const template=fs.readFileSync(path.join(root,'custom/plain.html'),'utf8');
const values={GITHUB:esc(profile.github),BIO:esc(profile.bio),COUNT:String(projects.length).padStart(2,'0'),INDEX:projects.map(p=>`<a href="#${esc(p.id)}"><span class="number">${esc(p.year)}</span>${esc(p.title)}</a>`).join(''),PROJECTS:html};
fs.writeFileSync(path.join(site,'plain.html'),template.replace(/\{\{(\w+)\}\}/g,(_,key)=>values[key]));
console.log(`Rendered readable HTML for ${projects.length} projects.`);
