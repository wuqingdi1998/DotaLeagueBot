import { type Hero } from '@/lib/autobattler/catalog';
export const roleNames={Tank:'Защитник',Fighter:'Воин',Assassin:'Убийца',Mage:'Маг',Marksman:'Стрелок',Support:'Поддержка'};
export function HeroPortrait({hero}:{hero:Hero}){
  const color=`#${hero.color.toString(16).padStart(6,'0')}`;
  return <svg viewBox="0 0 120 140" role="img" aria-label={hero.name}>
    <circle cx="60" cy="64" r="48" fill={color} opacity=".12"/>
    <path d="M28 126 L38 66 L60 52 L82 66 L96 126 Z" fill={color}/>
    <path d="M40 70 L60 96 L80 70 L74 122 L46 122Z" fill="#18243d"/>
    <circle cx="60" cy="43" r="18" fill="#eed1b4"/>
    <path d="M40 40 L45 18 L60 26 L76 18 L80 40 L60 34Z" fill={color}/>
    <path d={hero.role==='Marksman'?'M94 42 Q120 82 94 122 M94 42 L94 122':hero.role==='Mage'||hero.role==='Support'?'M100 125 L100 38 M89 34 L100 19 L111 34 L100 49Z':'M96 124 L96 38 L104 24 L110 38 L103 124Z'} stroke={color} fill="#c6e8ff" strokeWidth="4"/>
    <path d="M53 44h4m7 0h4" stroke="#18243d" strokeWidth="3"/>
  </svg>;
}
export default function HeroCard({hero,count,onClick}:{hero:Hero;count:number;onClick:()=>void}){
  return <button className={`ab-card ab-${hero.rarity} ${count?'':'ab-locked'}`} onClick={onClick}>
    <span>{hero.rarity} · {roleNames[hero.role]}</span><HeroPortrait hero={hero}/><strong>{hero.name}</strong><span>{count?`Копий: ${count}`:'Не получен'}</span>
  </button>;
}
