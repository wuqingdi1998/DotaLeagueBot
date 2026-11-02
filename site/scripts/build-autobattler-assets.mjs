import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../public/autobattler/',import.meta.url);
const path=name=>fileURLToPath(new URL(name,root));
const catalog=readFileSync(new URL('../lib/autobattler/catalog.ts',import.meta.url),'utf8');
const ids=[...catalog.matchAll(/^  \['([^']+)','[^']+','(?:Tank|Fighter|Assassin|Mage|Marksman|Support)'/gm)].map(match=>match[1]);
if(!ids.length||new Set(ids).size!==ids.length)throw new Error('Invalid hero IDs');
const transparent={r:0,g:0,b:0,alpha:0};
for(const directory of ['heroes','portraits','environments'])mkdirSync(path(directory),{recursive:true});
async function save(name,pipeline,quality=92){writeFileSync(path(name),await pipeline.webp({quality,effort:6,alphaQuality:100}).toBuffer());}
for(const id of ids){
 const source=path(`sources/${id}.webp`);const meta=await sharp(source).metadata();
 if(!meta.hasAlpha||!meta.width||!meta.height)throw new Error(`Expected transparent full-body art for ${id}`);
 await save(`heroes/${id}.webp`,sharp(source).resize(512,512,{fit:'contain',background:transparent}),94);
 const side=Math.min(meta.width,meta.height);
 await save(`portraits/${id}.webp`,sharp(source).extract({left:Math.floor((meta.width-side)/2),top:0,width:side,height:side}).resize(512,512),94);
}
for(const name of ['citadel','forest','temple'])await save(`${name}.webp`,sharp(path(`environments/${name}-source.webp`)).resize({width:1600,withoutEnlargement:true}),90);
await save('altar.webp',sharp(path('environments/shrine-source.webp')).resize({width:1100,withoutEnlargement:true}),92);
writeFileSync(path('bastion-portrait.webp'),readFileSync(path('portraits/bastion.webp')));
const total=ids.reduce((sum,id)=>sum+statSync(path(`heroes/${id}.webp`)).size+statSync(path(`portraits/${id}.webp`)).size,0);
console.log(`${ids.length} original hero portraits/full-body images, three environments and altar prepared (${Math.round(total/1024/1024)} MB)`);
