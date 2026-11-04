'use client';
import {useRef,useState,type CSSProperties} from 'react';
import {heroes,type Hero,type Rarity} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
import {heroBook} from '../model/heroBook';
import HeroCard,{roleNames,roleIcons} from '../components/HeroCard';

const rarities:Record<Rarity,{name:string;rank:number}>={
 Rare:{name:'Редкие',rank:0},Epic:{name:'Эпические',rank:1},Legendary:{name:'Легендарные',rank:2},
};
export default function HeroLibrary({profile,onSelect}:{profile:Profile;onSelect:(hero:Hero)=>void}){
 const [page,setPage]=useState(0),[role,setRole]=useState('Все');
 const [selected,setSelected]=useState<Rarity[]>([]),[isDescending,setDescending]=useState(true);
 const area=useRef<HTMLDivElement>(null),gesture=useRef<{x:number;y:number}|null>(null);
 const pool=heroes.filter(hero=>(role==='Все'||hero.role===role)&&(!selected.length||selected.includes(hero.rarity)))
  .sort((a,b)=>(rarities[b.rarity].rank-rarities[a.rarity].rank)*(isDescending?1:-1));
 const pageSize=heroBook.pageSize,pages=Math.max(1,Math.ceil(pool.length/pageSize)),current=Math.min(page,pages-1);
 const visible=pool.slice(current*pageSize,(current+1)*pageSize);
 function move(direction:number){setPage(Math.max(0,Math.min(pages-1,current+direction)));}
 return <div className="ab-hero-library">
  <nav className="ab-class-rail" aria-label="Класс героя" style={{gridTemplateRows:`repeat(${new Set(heroes.map(hero=>hero.role)).size+1},1fr)`}}>{[['Все','Все','✦'],...Object.entries(roleNames).filter(([id])=>heroes.some(hero=>hero.role===id)).map(([id,name])=>[id,name,roleIcons[id as keyof typeof roleIcons]])].map(([id,name,icon])=><button key={id} aria-pressed={role===id} onClick={()=>{setRole(id);setPage(0);}}><span aria-hidden="true">{icon}</span>{name}</button>)}</nav>
  <div className="ab-library-content">
   <header className="ab-library-header"><div className="ab-library-title"><small>ЗАЛ СОЮЗНИКОВ</small><h2>Герои</h2><span>{Object.keys(profile.collection).length} / {heroes.length} получено</span></div>
    <div className="ab-library-filters"><div className="ab-rarity-filter" role="group" aria-label="Редкость героя">{(Object.keys(rarities) as Rarity[]).map(rarity=><button key={rarity} className={`ab-rarity-orb ab-${rarity}`} aria-label={rarities[rarity].name} title={rarities[rarity].name} aria-pressed={selected.includes(rarity)} onClick={()=>{setSelected(selected.includes(rarity)?selected.filter(value=>value!==rarity):[...selected,rarity]);setPage(0);}}><span/></button>)}</div>
     <button className="ab-rarity-sort" aria-label={isDescending?'Редкость: от высокой к низкой':'Редкость: от низкой к высокой'} onClick={()=>{setDescending(!isDescending);setPage(0);}}><span aria-hidden="true">{isDescending?'↓':'↑'}</span><span>По редкости<small>{isDescending?'Сначала легендарные':'Сначала редкие'}</small></span></button>
    </div>
   </header>
   <div ref={area} className="ab-library-pages" onKeyDown={event=>{if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1);}} onTouchStart={event=>{gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY};}} onTouchEnd={event=>{const start=gesture.current;gesture.current=null;if(!start)return;const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;if((area.current?.querySelector('.ab-library-book-scroll')?.scrollWidth??0)<=(area.current?.querySelector('.ab-library-book-scroll')?.clientWidth??0)&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);}}>
    <button className="ab-library-turn ab-library-prev" disabled={!current} aria-label="Предыдущие герои" onClick={()=>move(-1)}><span aria-hidden="true">‹</span></button>
    <div className="ab-library-book-scroll" aria-label="Лист книги героев"><div className="ab-library-grid" key={`${current}-${role}-${selected.join('-')}-${isDescending}`} style={{'--book-columns':heroBook.columns,'--book-rows':heroBook.rows} as CSSProperties} aria-label={`${heroBook.columns} колонок, ${heroBook.rows} строки`}>{Array.from({length:heroBook.pageSize},(_,index)=>{const hero=visible[index];return <div key={hero?.id??`empty-${index}`} className={`ab-book-slot${hero?'':' is-empty'}`} data-book-slot={index}>{hero?<HeroCard hero={hero} count={profile.collection[hero.id]?.count??0} level={profile.collection[hero.id]?.level??1} onClick={()=>onSelect(hero)}/>:<span aria-hidden="true">◇</span>}</div>;})}</div></div>
    {!pool.length&&<p className="ab-library-empty">Нет героев с такими условиями</p>}
    <button className="ab-library-turn ab-library-next" disabled={current===pages-1} aria-label="Следующие герои" onClick={()=>move(1)}><span aria-hidden="true">›</span></button>
   </div>
   <footer className="ab-library-footer"><span>{pool.length} героев</span><span role="status" aria-live="polite">Лист {current+1} / {pages}</span><span>Выберите героя</span></footer>
  </div>
 </div>;
}
