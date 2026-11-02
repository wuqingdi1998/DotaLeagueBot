import sharp from 'sharp';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../public/autobattler/',import.meta.url);
const path=name=>fileURLToPath(new URL(name,root));
const catalog=readFileSync(new URL('../lib/autobattler/catalog.ts',import.meta.url),'utf8');
const ids=[...catalog.matchAll(/^  \['([^']+)','[^']+','(?:Tank|Fighter|Assassin|Mage|Marksman|Support)'/gm)].map(match=>match[1]);
const manifest=JSON.parse(readFileSync(path('hero-visuals.json'),'utf8'));
if(!ids.length||new Set(ids).size!==ids.length)throw new Error('Invalid hero IDs');
mkdirSync(path('portraits'),{recursive:true});
async function save(name,pipeline,quality=94){writeFileSync(path(name),await pipeline.webp({quality}).toBuffer());}
const transparent={r:0,g:0,b:0,alpha:0};
for(const id of ids){
 const original=existsSync(path(`sources/${id}.png`))?path(`sources/${id}.png`):id==='bastion'?path('bastion-source.png'):undefined;
 const frame=manifest[id]?.frame;
 if(!original&&(!Number.isInteger(frame)||frame<0||frame>=24))throw new Error(`Missing original artwork for ${id}`);
 const buffer=original?readFileSync(original):await sharp(path('heroes-source.png')).extract({left:frame%6*256,top:Math.floor(frame/6)*256,width:256,height:256}).png().toBuffer();
 const size=await sharp(buffer).metadata();const portraitSize=Math.min(768,Math.max(size.width,size.height));
 await save(`heroes/${id}.webp`,sharp(buffer).resize(256,256,{fit:'contain',background:transparent}));
 await save(`portraits/${id}.webp`,sharp(buffer).resize(portraitSize,portraitSize,{fit:'contain',background:transparent}));
}
for(const name of ['citadel','forest','temple'])await save(`${name}.webp`,sharp(path(`${name}-source.png`)),90);
// Keep the published first-version URL valid for already open browsers.
writeFileSync(path('bastion-portrait.webp'),readFileSync(path('portraits/bastion.webp')));
await save('altar.webp',sharp(path('altar-source.png')).resize({width:768}));
console.log(`${ids.length} hero portraits and combat textures, three environments and altar prepared`);
