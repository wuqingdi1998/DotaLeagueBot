'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {heroes,type Hero} from '@/lib/autobattler/catalog';
import {heroAbilities,heroStats,levelCost,levelRules} from '@/lib/autobattler/abilities';
import type {Profile} from '@/lib/autobattler/progression';
import {heroVisuals} from '../model/visuals';
import {HeroPortrait,roleNames,roleIcons} from './HeroCard';
import SkillPreview from './SkillPreview';
import AbilityDetails from './AbilityDetails';
export default function HeroProfile({hero,profile,isBusy,onLevel,onClose,onChange}:{hero:Hero;profile:Profile;isBusy:boolean;onLevel:()=>void;onClose:()=>void;onChange:(hero:Hero)=>void}){
 const [ability,setAbility]=useState<number|null>(null),[preview,setPreview]=useState(0);
 const [initialLevel,setInitialLevel]=useState(profile.collection[hero.id]?.level??1);
 const dialog=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>previous?.focus();},[]);
 const index=heroes.findIndex(item=>item.id===hero.id),copy=profile.collection[hero.id],level=copy?.level??1,stats=heroStats(hero,level),cost=levelCost(level);
 function switchHero(direction:number){const next=heroes[(index+heroes.length+direction)%heroes.length];setInitialLevel(profile.collection[next.id]?.level??1);onChange(next);setAbility(null);setPreview(0);}
 return <div className="ab-modal-backdrop"><section ref={dialog} tabIndex={-1} className={`ab-hero-profile ab-${hero.rarity}`} role="dialog" aria-modal="true" aria-label={hero.name} onKeyDown={event=>{
  if(event.key==='Escape'){if(ability!==null)setAbility(null);else onClose();}
  if(event.key==='Tab'){const scope=dialog.current?.querySelector('.ab-ability-dialog')??dialog.current;const controls=Array.from(scope?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
 }} style={{'--hero-color':`#${heroVisuals[hero.id].color.toString(16)}`} as CSSProperties}>
  <div className="ab-profile-illustration" aria-hidden="true"><HeroPortrait hero={hero} full/></div>
  <header className="ab-profile-header"><button onClick={onClose} aria-label="Закрыть героя">‹ <span>Герои</span></button><span>❋ {profile.experience??0} опыта</span></header>
  <div className="ab-hero-info"><small>{hero.rarity}</small><h2>{hero.name}</h2><p className="ab-profile-role">{roleIcons[hero.role]} {roleNames[hero.role]}</p><div className="ab-profile-level">Ур. <strong>{level}</strong><span> / {levelRules.max}</span></div>
   <div className="ab-hero-stats">{[['♡','Здоровье',stats.hp],['⚔','Атака',stats.attack],['⬡','Защита',stats.defense]].map(([icon,name,value])=><p key={name}><span>{icon} {name}</span><strong>{value}</strong></p>)}</div>
   <div className="ab-skill-buttons">{heroAbilities(hero).map((item,i)=><button key={item.type} aria-label={item.type} aria-pressed={ability===i} onClick={()=>setAbility(i)}><span className={`ab-ability-emblem ab-ability-${i}`}>{item.glyph}</span><small>{item.type}</small></button>)}</div>
  </div>
  <div className={`ab-hero-stage ${preview?'ab-skill-preview':''}`} key={`${hero.id}-${preview}`}><div className="ab-pedestal"/>{level>initialLevel&&<div key={`${hero.id}-${level}`} className="ab-level-burst" role="status"><strong>Уровень {level}</strong><span>Здоровье · атака · защита ↑</span></div>}<HeroPortrait hero={hero} combat/>{preview>0&&<SkillPreview id={hero.id}/>}</div>
  <button className="ab-profile-switch ab-profile-prev" aria-label="Предыдущий герой" onClick={()=>switchHero(-1)}>‹</button><button className="ab-profile-switch ab-profile-next" aria-label="Следующий герой" onClick={()=>switchHero(1)}>›</button>
  <footer className="ab-profile-upgrade">{copy?<><small>{level>=levelRules.max?'Максимальный уровень':`Здоровье, атака и защита растут с уровнем · опыт за новые этапы`}</small><button className="ab-primary" disabled={isBusy||level>=levelRules.max||(profile.experience??0)<cost} onClick={onLevel}>{level>=levelRules.max?'Уровень 20':`Повысить уровень · ${cost} опыта`}</button></>:<p>Герой ещё не получен · доступен в призыве</p>}</footer>
  {ability!==null&&<AbilityDetails hero={hero} level={level} index={ability} onClose={()=>setAbility(null)} onPreview={()=>setPreview(preview+1)}/>}
 </section></div>;
}
