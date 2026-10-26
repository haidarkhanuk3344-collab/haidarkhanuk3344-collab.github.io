import fs from 'node:fs';import path from 'node:path';import{execFileSync}from'node:child_process';import{fileURLToPath}from'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),site=path.resolve(root,'../..');
for(const name of ['chess/room.js','chess/chess-pc.js','chess/chess-content.js','chess/chess-tv.js','assets/scene/4514eaa3/desktop.js','assets/scene/4514eaa3/pc/basic.js'])execFileSync(process.execPath,['--check',path.join(site,name)]);
const{projects}=await import(path.join(site,'chess/chess-content.js'));for(const p of projects)for(const key of ['image','video'])if(p[key]&&!fs.existsSync(path.join(site,p[key])))throw new Error('Missing media: '+p[key]);
const entry=fs.readFileSync(path.join(site,'index.html'),'utf8');if(/ghost\.io|ghost\/portal|sodo-search|I work on Claude/.test(entry))throw new Error('Unexpected original page content');
if(!entry.includes('/plain.html')||!entry.includes('entry-lite'))throw new Error('Missing readable fallback');
console.log('Syntax, project media, entrypoint identity and fallback checks passed. Serve site/ over HTTP.');
