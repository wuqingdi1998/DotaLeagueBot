import type {CSSProperties} from 'react';
import {heroVisuals} from '../model/visuals';
import { type Hero } from '@/lib/autobattler/catalog';
export const roleNames={Tank:'Защитник',Fighter:'Воин',Assassin:'Убийца',Mage:'Маг',Marksman:'Стрелок',Support:'Поддержка'};
export function HeroPortrait({hero,full=false}:{hero:Hero;full?:boolean}){
  const visual=heroVisuals[hero.id];
  return <div role="img" aria-label={hero.name} className={`ab-portrait${full?' ab-full-portrait':''}`} style={{backgroundImage:`url("${full?visual.texture:visual.portrait}")`,'--portrait-x':`${visual.portraitX}%`} as CSSProperties}/>;
}

export default function HeroCard({hero,count,onClick}:{hero:Hero;count:number;onClick:()=>void}){
  return <button className={`ab-card ab-${hero.rarity} ${count?'':'ab-locked'}`} onClick={onClick}>
    <span>{hero.rarity} · {roleNames[hero.role]}</span><HeroPortrait hero={hero}/><strong>{hero.name}</strong><span>{count?`Копий: ${count}`:'Не получен'}</span>
  </button>;
}
