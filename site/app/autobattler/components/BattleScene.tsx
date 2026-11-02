'use client';
import { useEffect,useRef,useState } from 'react';
import type { Battle } from '@/lib/autobattler/simulation';
import {createArena} from './createArena';
export default function BattleScene({battle,onFinish}:{battle:Battle;onFinish:()=>void}){
  const host=useRef<HTMLDivElement>(null);const control=useRef({isPaused:false,speed:1});
  const [isPaused,setPaused]=useState(false);const [speed,setSpeed]=useState(1);const [error,setError]=useState('');
  useEffect(()=>{control.current={isPaused,speed};},[isPaused,speed]);
  useEffect(()=>{
    let isDisposed=false;let game:import('phaser').Game|undefined;
    import('phaser').then(({default:Phaser})=>{
      if(isDisposed||!host.current)return;
      const Arena=createArena(Phaser,battle,control,onFinish);
      game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:1000,height:500,backgroundColor:'#101e34',
        scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Arena,audio:{noAudio:true},render:{antialias:true}});
    }).catch(()=>setError('Не удалось загрузить арену. Обновите страницу.'));
    return()=>{isDisposed=true;game?.destroy(true);};
  },[battle,onFinish]);
  return <section><div className="ab-toolbar"><button onClick={()=>setPaused(!isPaused)}>{isPaused?'Продолжить':'Пауза'}</button><button onClick={()=>setSpeed(speed===1?2:1)}>Скорость ×{speed}</button><span>Способности применяются автоматически · Звука нет</span></div><p className="ab-rotate">Для более крупного поля поверните телефон горизонтально.</p><div ref={host} className="ab-arena"/>{error&&<p role="alert">{error}</p>}<p>Лимит – 90 секунд. При лимите побеждает команда с большей суммой долей здоровья; равенство – ничья.</p></section>;
}
