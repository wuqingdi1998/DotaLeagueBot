'use client';
import {useState} from 'react';
import {heroes,heroById,type Hero} from '@/lib/autobattler/catalog';
const metrics:{name:string;value:(hero:Hero)=>number}[]=[
  {name:'Здоровье',value:hero=>hero.hp}, {name:'Атака',value:hero=>hero.attack},
  {name:'Защита',value:hero=>hero.defense}, {name:'Атак/сек',value:hero=>Number((1000/hero.interval).toFixed(2))},
  {name:'Дальность',value:hero=>hero.range}, {name:'Движение',value:hero=>hero.movement},
];
export default function HeroComparison(){
  const [left,setLeft]=useState(heroes[0].id);const [right,setRight]=useState(heroes[1].id);
  return <details className="ab-panel ab-comparison"><summary>Сравнить характеристики героев</summary>
    <div className="ab-toolbar">{[{value:left,set:setLeft,label:'Первый герой'},{value:right,set:setRight,label:'Второй герой'}].map(choice=><label key={choice.label}>{choice.label}<select aria-label={choice.label} value={choice.value} onChange={event=>choice.set(event.target.value)}>{heroes.map(hero=><option key={hero.id} value={hero.id}>{hero.name}</option>)}</select></label>)}</div>
    <table><thead><tr><th>Показатель</th><th>{heroById[left].name}</th><th>{heroById[right].name}</th></tr></thead><tbody>{metrics.map(metric=>{
      const values=[metric.value(heroById[left]),metric.value(heroById[right])];
      return <tr key={metric.name}><th>{metric.name}</th>{values.map((value,index)=><td key={index}><strong>{value}</strong><div className="ab-stat-track"><div style={{width:`${100*value/Math.max(...values,1)}%`}}/></div></td>)}</tr>;
    })}</tbody></table><p>Большие значения не заменяют синергию способностей. Редкость не увеличивает базовые характеристики класса.</p>
  </details>;
}
