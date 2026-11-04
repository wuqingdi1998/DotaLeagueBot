import {SummonShrine} from './SummonShrine';
import {heroById} from '@/lib/autobattler/catalog';
import {HeroPortrait,roleIcons,roleNames} from './HeroCard';
import {summonTiming} from '../model/summonSequence';
import type {CSSProperties} from 'react';
import type {Profile} from '@/lib/autobattler/progression';

const rarityNames={Rare:'Редкий',Epic:'Эпический',Legendary:'Легендарный'};

export function SummonResults({results,revealed,profile,shouldAnimate,shard,onInspect}:{results:string[];revealed:number;profile:Profile;shouldAnimate:boolean;shard:'blue'|'gold';onInspect:(index:number)=>void}){
 return <ol className="ab-summon-board" aria-label="Результаты призыва">
  {results.map((id,index)=>{
   const hero=heroById[id];
   const isOpen=index<revealed,isOpening=index===revealed&&shouldAnimate;
   const rarity=isOpen||isOpening?hero.rarity:undefined;
   const style=isOpening?{'--opening-time':`${summonTiming[hero.rarity]}ms`} as CSSProperties:undefined;
   return <li key={index} className={`ab-summon-slot ${rarity?`ab-result-${rarity}`:''} ${isOpening?'is-opening':''}`} style={style}>
    {isOpen?<button className="ab-summon-card ab-card" aria-label={`${hero.name} · ${roleNames[hero.role]}`} onClick={event=>{if(!shouldAnimate){event.stopPropagation();onInspect(index);}}}>
     <HeroPortrait hero={hero}/><span className="ab-result-role" title={roleNames[hero.role]}>{roleIcons[hero.role]}</span>
     <div className="ab-result-caption"><span>{rarityNames[hero.rarity]} · Ур. {profile.collection[id]?.level??1}</span><strong>{hero.name}</strong></div>
    </button>:<div className="ab-summon-seal" aria-label={isOpening?'Открывается':'Ожидает раскрытия'}>
     {isOpening?<SummonShrine key={index} phase="opening" shard={shard} rarity={hero.rarity} compact/>:<span className="ab-seal-emblem" aria-hidden="true">✧</span>}<span className="ab-seal-number">{String(index+1).padStart(2,'0')}</span>
    </div>}
   </li>;
  })}
 </ol>;
}
