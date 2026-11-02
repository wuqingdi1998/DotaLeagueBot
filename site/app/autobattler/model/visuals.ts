import {heroes} from '@/lib/autobattler/catalog';
const rhythms=[.8,1.2,.55,.9,.65,1.6,.7,.6,.5,1.1,.4,1.8,.75,.7,.5,.35,1.5,.85,1.1,1.2,.9,.45,.6,1.4];
export const skillGlyphs=['⬡','✹','❀','➶','❄','☽','⬢','❧','⚒','✺','♆','〰','☀','♒','✧','◈','⋖','✴','➹','❯','❋','◎','⋈','☾'];
const colors=[0x78dabb,0xff7b35,0xafffc0,0xded395,0x9defff,0xcaa3fd,0xbcb8a4,0xa3d97d,0xffbc66,0x92ec45,0xb689ff,0xa8e9ff,0xffde7b,0x40d7e7,0xf7d8ff,0x76b8ed,0x8796c9,0xffefc4,0xc4dbea,0xe87478,0xf5aee2,0xf7d082,0xffe3a8,0xc9acff];
const portraitFocus=[68,65,55,50,65,85,40,40,55,65,55,80,50,50,55,65,60,60,45,50,50,65,60,75];
export const heroVisuals=Object.fromEntries(heroes.map((hero,index)=>[hero.id,{
  texture:`/autobattler/heroes/${hero.id}.webp`,portrait:hero.id==='bastion'?'/autobattler/bastion-portrait.webp':`/autobattler/heroes/${hero.id}.webp`,stride:rhythms[index],phase:index*.71,
  effect:['ward','flame','blossom','feather','frost','crescent','stone','vines','hammer','venom','spirits','wind','sun','tide','stars','quake','ravens','nova','arrows','blood','petals','sound','wings','moon'][index],
  color:colors[index],portraitX:portraitFocus[index],index,
}]));
export const sceneBackground='/autobattler/citadel.webp';
