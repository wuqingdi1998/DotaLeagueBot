'use client';
import {useState} from 'react';
import {heroes,rules} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
export default function DeveloperPanel({profile,act}:{profile:Profile;act:(input:Record<string,unknown>)=>void}){
  const [value,setValue]=useState(10);const [hero,setHero]=useState(heroes[0].id);const [confirmation,setConfirmation]=useState('');
  const [enemies,setEnemies]=useState(heroes.slice(0,5).map(hero=>hero.id));
  const send=(command:string)=>act({action:'admin',command,value,hero,confirmation});
  return <section className="ab-panel"><h2>Лаборатория владельца</h2><p>Изменяется только ваш игровой профиль. Все действия сохраняются в истории операций.</p>
    <label>Количество / номер этапа <input type="number" min="1" max="100000" value={value} onChange={event=>setValue(Number(event.target.value))}/></label>
    <div className="ab-toolbar">{[1,10,100].map(amount=><button key={amount} onClick={()=>act({action:'admin',command:'tickets',value:amount})}>+{amount} билетов</button>)}<button onClick={()=>send('tickets')}>Начислить количество</button><button onClick={()=>send('zero')}>Обнулить билеты</button></div>
    <select aria-label="Герой для управления" value={hero} onChange={event=>setHero(event.target.value)}>{heroes.map(hero=><option key={hero.id} value={hero.id}>{hero.name} · {hero.rarity}</option>)}</select>
    <div className="ab-toolbar"><button onClick={()=>send('hero')}>Выдать героя</button><button onClick={()=>send('all')}>Выдать всех</button><button onClick={()=>send('remove')}>Удалить героя</button><button onClick={()=>send('copies')}>Установить копии</button><button onClick={()=>send('collection')}>Стартовая коллекция</button></div>
    <div className="ab-toolbar"><button onClick={()=>act({action:'admin',command:'unlock',value:rules.stageCount})}>Открыть все этапы</button><button onClick={()=>send('unlock')}>Открыть до этапа</button><button onClick={()=>send('clear')}>Отметить этап пройденным</button><button onClick={()=>send('campaign')}>Сбросить кампанию</button><button onClick={()=>send('rewards')}>Сбросить награды</button><button onClick={()=>send('pity')}>Сбросить гарантии</button></div>
    <p>После последнего Epic+: {profile.epic} · После Legendary: {profile.legendary}</p>
    <button onClick={()=>act({action:'test',stage:1,mirror:true})}>Зеркальный бой без наград</button>
    <h3>Противники для тестового боя</h3><div className="ab-toolbar">{enemies.map((id,index)=><select key={index} aria-label={`Противник ${index+1}`} value={id} onChange={event=>setEnemies(enemies.map((previous,position)=>position===index?event.target.value:previous))}>{heroes.map(hero=><option key={hero.id} value={hero.id}>{hero.name}</option>)}</select>)}</div><button onClick={()=>act({action:'test',stage:1,enemies})}>Тестовый бой без наград</button>
    <details><summary>История призывов ({profile.summons.length})</summary>{profile.summons.slice(-100).reverse().map((entry,index)=><p key={index}>{entry.at} · {heroes.find(hero=>hero.id===entry.hero)?.name}</p>)}</details>
    <label>Для полного сброса введите СБРОСИТЬ <input value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></label><button disabled={confirmation!=='СБРОСИТЬ'} onClick={()=>send('reset')}>Полный сброс моего игрового профиля</button>
  </section>;
}
