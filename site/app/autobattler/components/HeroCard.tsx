import type {CSSProperties} from 'react';
import {heroVisuals} from '../model/visuals';
import {type Hero} from '@/lib/autobattler/catalog';
export const roleNames={Tank:'Защитник',Fighter:'Воин',Assassin:'Убийца',Mage:'Маг',Marksman:'Стрелок',Support:'Поддержка'};
export const roleIcons={Tank:'⬡',Fighter:'⚔',Assassin:'➶',Mage:'✧',Marksman:'◎',Support:'❋'};
export function HeroPortrait({hero,full=false,combat=false,headshot=false}:{hero:Hero;full?:boolean;combat?:boolean;headshot?:boolean}){
 const visual=heroVisuals[hero.id];
 return <div role="img" aria-label={hero.name} className={`ab-portrait${full||combat?' ab-full-portrait':''}`} style={{backgroundImage:`url("${combat?visual.texture:full?visual.illustration:headshot?visual.headshot:visual.portrait}")`,'--portrait-x':`${visual.portraitX}%`} as CSSProperties}/>;
}
export default function HeroCard({hero,count,level=1,onClick,isRoster=false,isSelected=false}:{hero:Hero;count:number;level?:number;onClick:()=>void;isRoster?:boolean;isSelected?:boolean}){
 return <button data-formation-hero={count?hero.id:undefined} aria-label={`${hero.name}, уровень ${level}${isRoster?', удерживайте для подробностей':''}`} className={`ab-card ab-${hero.rarity} ${count?'':'ab-locked'} ${isSelected?'is-in-team':''}`} onClick={onClick}>
 <HeroPortrait hero={hero} headshot={isRoster}/>{isRoster&&<span className="ab-roster-level">Ур. {level}</span>}<span className="ab-card-role" title={roleNames[hero.role]}>{roleIcons[hero.role]}</span>{isSelected&&<b className="ab-card-check">✓</b>}<div className="ab-card-caption"><span>{hero.rarity} <em>{count?`Ур. ${level}`:'Не получен'}</em></span><strong>{hero.name}</strong></div>
 </button>;
}
