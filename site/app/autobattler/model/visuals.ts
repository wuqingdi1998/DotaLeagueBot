import {heroById,heroes} from '@/lib/autobattler/catalog';
import manifest from '@/public/autobattler/hero-visuals.json';
interface VisualPreset {frame?:number;stride:number;phase:number;effect:string;color:number;glyph:string;portraitX:number}
const presets:Record<string,VisualPreset>=manifest;
const currentArt=new Set(heroes.map(hero=>hero.id));
export const heroVisuals=Object.fromEntries(Object.values(heroById).map((hero,index)=>{
 const preset=presets[hero.id]??{stride:1,phase:0,effect:'arcane',color:hero.color,glyph:'✧',portraitX:50};
 const artRoot=currentArt.has(hero.id)?'/autobattler/selena-style':'/autobattler';
 return [hero.id,{...preset,portraitX:currentArt.has(hero.id)?50:preset.portraitX,index:preset.frame??index,texture:`/autobattler/combat/${hero.id}.webp`,illustration:hero.id==='selena'?'/autobattler/heroes/selena.webp':`${artRoot}/heroes/${hero.id}.webp`,portrait:`${artRoot}/portraits/${hero.id}.webp`,headshot:`${artRoot}/headshots/${hero.id}.webp`}];
}));
export const sceneBackground='/autobattler/chapter-1.webp';
