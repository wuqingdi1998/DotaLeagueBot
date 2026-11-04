import {heroById} from '@/lib/autobattler/catalog';
import manifest from '@/public/autobattler/hero-visuals.json';
interface VisualPreset {frame?:number;stride:number;phase:number;effect:string;color:number;glyph:string;portraitX:number}
const presets:Record<string,VisualPreset>=manifest;
export const heroVisuals=Object.fromEntries(Object.values(heroById).map((hero,index)=>{
 const preset=presets[hero.id]??{stride:1,phase:0,effect:'arcane',color:hero.color,glyph:'✧',portraitX:50};
 return [hero.id,{...preset,index:preset.frame??index,texture:`/autobattler/combat/${hero.id}.webp`,illustration:`/autobattler/heroes/${hero.id}.webp`,portrait:`/autobattler/portraits/${hero.id}.webp`}];
}));
export const sceneBackground='/autobattler/chapter-1.webp';
