import type {CSSProperties} from 'react';
import {heroVisuals} from '../model/visuals';
import {type Hero} from '@/lib/autobattler/catalog';
export const roleNames={Tank:'Защитник',Fighter:'Воин',Assassin:'Убийца',Mage:'Маг',Marksman:'Стрелок',Support:'Поддержка'};
export const roleIcons={Tank:'⬡',Fighter:'⚔',Assassin:'➶',Mage:'✧',Marksman:'◎',Support:'❋'};
export function HeroPortrait({hero,full=false,combat=false}:{hero:Hero;full?:boolean;combat?:boolean}){
 const visual=heroVisuals[hero.id];
 return <div role="img" aria-label={hero.name} className={`ab-portrait${full||combat?' ab-full-portrait':''}`} style={{backgroundImage:`url("${combat?visual.texture:full?visual.illustration:visual.portrait}")`,'--portrait-x':`${visual.portraitX}%`} as CSSProperties}/>;
}
export default function HeroCard({hero,count,level=1,onClick,onInspect,isSelected=false}:{hero:Hero;count:number;level?:number;onClick:()=>void;onInspect?:()=>void;isSelected?:boolean}){
 const card=<button data-formation-hero={count?hero.id:undefined} className={`ab-card ab-${hero.rarity} ${count?'':'ab-locked'} ${isSelected?'is-in-team':''}`} onClick={onClick}>
 <HeroPortrait hero={hero}/><span className="ab-card-role" title={roleNames[hero.role]}>{roleIcons[hero.role]}</span>{isSelected&&<b className="ab-card-check">✓</b>}<div className="ab-card-caption"><span>{hero.rarity} <em>{count?`Ур. ${level}`:'Не получен'}</em></span><strong>{hero.name}</strong></div>
 </button>;
 return onInspect?<div className="ab-inspectable-card">{card}<button className="ab-card-info" aria-label={`Подробнее: ${hero.name}`} onClick={onInspect}>i</button></div>:card;
}
