import { heroById, rules, type Hero } from './catalog';
import {basicSkill,heroStats,levelMultiplier} from './abilities';
export interface Unit { id:string; hero:string; side:number; x:number; y:number; hp:number; maxHp:number;
  level:number; attack:number; defense:number; interval:number; nextBasic:number; attacks:number;
  energy:number; shield:number; shieldUntil:number; stunnedUntil:number; immuneUntil:number; hasteUntil:number; hasteFactor:number;
  weakUntil:number; poisonUntil:number; poisonPower:number; poisonSource:string; nextAttack:number; nextSkill:number;
  damage:number; received:number; healing:number; skills:number }
export interface Battle { waves?:{start:number;end:number}[]; chapter?:number; version:number; seed:number; frames:{time:number; units:Unit[]}[];
  events:{time:number; actor:string; target:string; kind:string; amount:number;delivery?:'attack'|'skill'|'dot';health?:number}[];
  winner:number; duration:number; units:Unit[] }
/** Fixed 100ms authoritative simulation. Rendering never influences combat. */
export function simulate(left:string[],right:string[],seed:number,scale=1,levels:Record<string,number>={},enemyLevels:Record<string,number>={},survivors?:Unit[]):Battle {
  if(left.length!==5 || right.length!==5 || [...left,...right].some(id=>!heroById[id])) throw new Error('Нужны два состава по пять героев');
  let randomState=seed>>>0;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  const units:Unit[]=[left,right].flatMap((team,side)=>team.map((hero,position)=>{
    const level=(side?enemyLevels:levels)[hero]??1,stats=heroStats(heroById[hero],level),factor=side?scale:1;
    return {
    id:`${side}-${position}`,hero,side,x:side===0?(position<2?260:130):(position<2?740:870),
    y:position<2?180+position*150:120+(position-2)*140,hp:Math.round(stats.hp*factor),
    level,attack:stats.attack*factor,defense:stats.defense,interval:stats.interval,nextBasic:3000,attacks:0,
    maxHp:Math.round(stats.hp*factor),energy:heroById[hero].role==='Mage'?20:0,shield:0,shieldUntil:0,stunnedUntil:0,
    immuneUntil:0,hasteUntil:0,hasteFactor:1,weakUntil:0,poisonUntil:0,poisonPower:0,poisonSource:'',nextAttack:500+Math.floor(random()*400),nextSkill:0,
    damage:0,received:0,healing:0,skills:0 };}));
  for(const unit of units){const allies=units.filter(other=>other.side===unit.side);if(allies.some(other=>other.hero==='orion'))unit.defense*=1.05;if(allies.some(other=>other.hero==='selena'))unit.interval/=1.04;}
  if(survivors)for(const unit of units.filter(unit=>unit.side===0)){const previous=survivors.find(other=>other.id===unit.id);if(previous){unit.hp=Math.min(unit.maxHp,previous.hp);unit.energy=previous.energy;unit.damage=previous.damage;unit.received=previous.received;unit.healing=previous.healing;unit.skills=previous.skills;}}
  const battle:Battle={version:rules.version,seed,frames:[],events:[],winner:-1,duration:0,units};
  const record=(time:number,actor:Unit,target:Unit,kind:string,amount:number,delivery?:'attack'|'skill'|'dot')=>battle.events.push({time,actor:actor.id,target:target.id,kind,amount:Math.round(amount),...(delivery?{delivery}:{}),...(['damage','heal'].includes(kind)?{health:target.hp}:{})});
  const heal=(time:number,actor:Unit,target:Unit,amount:number)=>{const restored=Math.min(target.maxHp-target.hp,amount*(heroById[actor.hero].role==='Support'?1.15:1));target.hp+=restored;actor.healing+=restored;record(time,actor,target,'heal',restored);};
  const hit=(time:number,actor:Unit,target:Unit,power:number,delivery:'attack'|'skill'|'dot'='attack')=>{
    const amount=Math.max(1,Math.round(power*100/(100+target.defense)));
    const absorbed=Math.min(target.shield,amount); target.shield-=absorbed;
    const actual=Math.min(target.hp,amount-absorbed);target.hp-=actual;actor.damage+=actual;target.received+=actual;
    target.energy=Math.min(100,target.energy+5);record(time,actor,target,'damage',actual,delivery);return actual;
  };
  for(let time=0;time<=rules.limit;time+=rules.step){
    for(const unit of units){
      if(unit.shieldUntil<=time)unit.shield=0;
      if(unit.hp<=0)continue;
      if(unit.poisonUntil>time && time%1000===0){const source=units.find(other=>other.id===unit.poisonSource);if(source)hit(time,source,unit,unit.poisonPower,'dot');}
    }
    // Both sides choose actions from the same living snapshot; lethal exchanges can draw.
    const living=units.filter(unit=>unit.hp>0);
    const actions:(()=>void)[]=[];
    for(const unit of living){
      if(unit.stunnedUntil>time)continue;
      const hero:Hero=heroById[unit.hero];
      const enemies=living.filter(other=>other.side!==unit.side);
      if(!enemies.length)continue;
      enemies.sort((a,b)=>hero.role==='Assassin'?a.hp-b.hp:Math.hypot(a.x-unit.x,a.y-unit.y)-Math.hypot(b.x-unit.x,b.y-unit.y));
      const target=enemies[0]; const distance=Math.hypot(target.x-unit.x,target.y-unit.y);
      if(distance>hero.range){const travel=Math.min(hero.movement*rules.step/1000,distance-hero.range);unit.x+=((target.x-unit.x)/distance)*travel;unit.y+=((target.y-unit.y)/distance)*travel;}
      const isUltimate=unit.energy>=100 && time>=unit.nextSkill;
      const isBasic=time>=unit.nextBasic&&(hero.role==='Support'||distance<=hero.range+10);
      if(isUltimate||isBasic){
        const skill=isUltimate?hero.skill:basicSkill(hero);const isFriendly=['heal','shield','haste'].includes(skill.effect);
        const targets=(isFriendly?living.filter(other=>other.side===unit.side).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp):enemies).slice(0,skill.targets);
        if(isUltimate){unit.energy=0;unit.nextSkill=time+6000;unit.skills++;}
        else{unit.nextBasic=time+6000;unit.energy=Math.min(100,unit.energy+10);}
        record(time,unit,unit,isUltimate?'skill':'basic',0);
        actions.push(()=>{if(unit.hp<=0)return;for(const other of targets){
          if(other.hp<=0)continue;
          if(skill.effect==='heal')heal(time,unit,other,isUltimate?skill.power*levelMultiplier(unit.level)*(unit.side?scale:1):unit.attack*skill.power);
          else if(skill.effect==='shield'){other.shield=Math.max(other.shield,skill.power*levelMultiplier(unit.level)*(unit.side?scale:1));other.shieldUntil=time+skill.duration;}
          else if(skill.effect==='haste'){other.hasteUntil=time+skill.duration;other.hasteFactor=skill.power;}
          else if(skill.effect==='poison'){other.poisonUntil=time+skill.duration;other.poisonPower=unit.attack*skill.power;other.poisonSource=unit.id;}
          else {const amount=hit(time,unit,other,unit.attack*skill.power*(unit.weakUntil>time?.75:1),'skill');
            if(skill.effect==='drain'&&unit.hp>0)heal(time,unit,unit,amount*.45);
            if(skill.effect==='weaken')other.weakUntil=time+skill.duration;
            if(skill.effect==='stun' && other.immuneUntil<=time){other.stunnedUntil=time+skill.duration;other.immuneUntil=other.stunnedUntil+2500;}
          }
        }});
      }else if(distance<=hero.range+10 && unit.nextAttack<=time){
        unit.nextAttack=time+unit.interval/(unit.hasteUntil>time?unit.hasteFactor:1);unit.energy=Math.min(100,unit.energy+20);unit.attacks++;
        const hasPrecision=hero.role==='Marksman'&&unit.attacks%4===0;
        if(hasPrecision)record(time,unit,unit,'passive',0);
        actions.push(()=>hit(time,unit,target,unit.attack*(unit.weakUntil>time?.75:1)*(hasPrecision?1.4:1)));
      }
    }
    actions.forEach(action=>action());
    for(let index=0;index<units.length;index++)for(let otherIndex=index+1;otherIndex<units.length;otherIndex++){
      const a=units[index],b=units[otherIndex];if(a.hp<=0||b.hp<=0)continue;
      const distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(distance<30){const direction=a.y<=b.y?-1:1;const offset=(30-distance)/2;a.y+=direction*offset;b.y-=direction*offset;}
    }
    for(const unit of units){unit.hp=Math.max(0,Math.min(unit.hp,unit.maxHp));unit.x=Math.max(40,Math.min(960,unit.x));unit.y=Math.max(60,Math.min(450,unit.y));}
    if(time%200===0)battle.frames.push({time,units:structuredClone(units)});
    const alive=[0,1].map(side=>units.some(unit=>unit.side===side && unit.hp>0));
    if(!alive[0]||!alive[1]||time===rules.limit){
      const health=[0,1].map(side=>units.filter(unit=>unit.side===side).reduce((sum,unit)=>sum+unit.hp/unit.maxHp,0));
      battle.winner=alive[0]&&!alive[1]?0:alive[1]&&!alive[0]?1:health[0]===health[1]?-1:health[0]>health[1]?0:1;
      battle.duration=time;break;
    }
  }
  if(battle.frames.at(-1)?.time!==battle.duration)battle.frames.push({time:battle.duration,units:structuredClone(units)});
  return battle;
}
