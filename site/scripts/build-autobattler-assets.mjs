import sharp from 'sharp';
import {readFileSync} from 'node:fs';
const root=new URL('../public/autobattler/',import.meta.url);
const catalog=readFileSync(new URL('../lib/autobattler/catalog.ts',import.meta.url),'utf8');
const ids=[...catalog.matchAll(/^  \['([^']+)','[^']+','(?:Tank|Fighter|Assassin|Mage|Marksman|Support)'/gm)].map(match=>match[1]);
if(ids.length!==24)throw new Error('Expected exactly 24 atlas entries');
for(const [index,id] of ids.entries())await sharp(new URL('heroes-source.png',root).pathname.replace(/^\/(\w:)/,'$1')).extract({left:index%6*256,top:Math.floor(index/6)*256,width:256,height:256}).webp({quality:92}).toFile(new URL(`heroes/${id}.webp`,root).pathname.replace(/^\/(\w:)/,'$1'));
await sharp(new URL('citadel-source.png',root).pathname.replace(/^\/(\w:)/,'$1')).webp({quality:90}).toFile(new URL('citadel.webp',root).pathname.replace(/^\/(\w:)/,'$1'));
console.log('24 original hero textures and environment prepared');

for(const name of ["forest","temple"])await sharp(new URL(`${name}-source.png`,root).pathname.replace(/^\/(\w:)/,"$1")).webp({quality:90}).toFile(new URL(`${name}.webp`,root).pathname.replace(/^\/(\w:)/,"$1"));

await sharp(new URL("bastion-source.png",root).pathname.replace(/^\/(\w:)/,"$1")).resize(768,768,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).webp({quality:94}).toFile(new URL("bastion-portrait.webp",root).pathname.replace(/^\/(\w:)/,"$1"));
await sharp(new URL("bastion-source.png",root).pathname.replace(/^\/(\w:)/,"$1")).resize(256,256,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).webp({quality:94}).toFile(new URL("heroes/bastion.webp",root).pathname.replace(/^\/(\w:)/,"$1"));
