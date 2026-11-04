'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {heroes,type Hero,type Rarity} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
import HeroCard from '../components/HeroCard';
import HeroLibrary from './HeroLibrary';
const rarityRank={Rare:0,Epic:1,Legendary:2};
const rarityNames={Rare:'Редкие',Epic:'Эпические',Legendary:'Легендарные'};
function OwnedGallery({profile,onSelect,team=[]}:{profile:Profile;onSelect:(hero:Hero)=>void;team?:(string|null)[]}){
 const [page,setPage]=useState(0),[rarities,setRarities]=useState<Rarity[]>([]);
 const [sort,setSort]=useState<'level'|'rarity'>('level'),[isDescending,setDescending]=useState(true);
 const grid=useRef<HTMLDivElement>(null),[columns,setColumns]=useState(3);
 useEffect(()=>{if(!grid.current)return;const observer=new ResizeObserver(([entry])=>setColumns(Math.max(3,Math.floor(entry.contentRect.width/(entry.contentRect.width<600?108:164)))));observer.observe(grid.current);return()=>observer.disconnect();},[]);
 const level=(hero:Hero)=>profile.collection[hero.id]?.level??1;
 const pool=heroes.filter(hero=>profile.collection[hero.id]&&(!rarities.length||rarities.includes(hero.rarity)))
  .sort((a,b)=>((sort==='level'?level(b)-level(a):rarityRank[b.rarity]-rarityRank[a.rarity])||rarityRank[b.rarity]-rarityRank[a.rarity]||level(b)-level(a))*(isDescending?1:-1));
 const pageSize=columns*2,pages=Math.max(1,Math.ceil(pool.length/pageSize)),current=Math.min(page,pages-1);
 function chooseSort(value:typeof sort){setDescending(value===sort?!isDescending:true);setSort(value);setPage(0);}
 return <div className="ab-gallery ab-roster"><div className="ab-gallery-main">
  <div className="ab-roster-tools"><div className="ab-roster-sorting" role="group" aria-label="Сортировка героев">
   {([['level','По уровню'],['rarity','По редкости']] as const).map(([value,label])=><button key={value} aria-pressed={sort===value} onClick={()=>chooseSort(value)}>{label}<span aria-hidden="true">{sort===value?(isDescending?'↓':'↑'):'↕'}</span></button>)}
  </div><div className="ab-rarity-filter" role="group" aria-label="Редкость героя">{(Object.keys(rarityRank) as Rarity[]).map(rarity=><button key={rarity} className={`ab-rarity-orb ab-${rarity}`} aria-label={rarityNames[rarity]} aria-pressed={rarities.includes(rarity)} onClick={()=>{setRarities(rarities.includes(rarity)?rarities.filter(value=>value!==rarity):[...rarities,rarity]);setPage(0);}}><span/></button>)}</div>
  {pages>1&&<div className="ab-pager"><button disabled={!current} onClick={()=>setPage(current-1)} aria-label="Предыдущие герои">‹</button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)} aria-label="Следующие герои">›</button></div>}
  </div>
  <div ref={grid} className="ab-grid" style={{'--roster-columns':columns} as CSSProperties}>{pool.slice(current*pageSize,(current+1)*pageSize).map(hero=><HeroCard key={hero.id} hero={hero} count={profile.collection[hero.id]?.count??0} level={level(hero)} isRoster isSelected={team.includes(hero.id)} onClick={()=>onSelect(hero)}/>)}</div>
  {!pool.length&&<p className="ab-empty-collection">Нет героев с такими условиями</p>}
 </div></div>;
}
export default function HeroGallery(props:Parameters<typeof OwnedGallery>[0]&{isOwnedOnly?:boolean}){
 return props.isOwnedOnly?<OwnedGallery {...props}/>:<HeroLibrary profile={props.profile} onSelect={props.onSelect}/>;
}
