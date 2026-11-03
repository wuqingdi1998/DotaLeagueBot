import {type Hero, type Role} from './catalog';

export const levelRules={max:20,initialExperience:300,growth:.06,cost:40};
export const levelCost=(level:number)=>level*levelRules.cost;
export const stageExperience=(stage:number)=>400+stage*40;
export const levelMultiplier=(level=1)=>1+(Math.max(1,Math.min(levelRules.max,level))-1)*levelRules.growth;
const basicNames:Record<string,string>={bastion:'Удар щитом',iskra:'Искры стали',veya:'Росток жизни',sokol:'Прицельный выстрел',mirra:'Ледяная игла',ten:'Скрытый выпад',kremen:'Тяжёлый молот',ruta:'Лесное дыхание',bor:'Раскол',lira:'Острый болт',morok:'Тёмный сгусток',zefir:'Порыв ветра',yantar:'Удар рассвета',azur:'Синий импульс',astra:'Звёздная искра',granit:'Каменный кулак',nox:'Коготь ворона',sol:'Искра солнца',taiga:'Меткий болт',rion:'Алый клинок',flor:'Цветение',echo:'Отзвук',orion:'Небесный удар',selena:'Лунный серп'};
const passives:Record<Role,{name:string;description:string;glyph:string}>={
 Tank:{name:'Несокрушимость',description:'Один раз за волну, получив урон и оставшись ниже 30% здоровья, получает щит на 10% максимального здоровья на 3 секунды.',glyph:'⬡'},
 Fighter:{name:'Боевой дух',description:'Удары по оглушённым врагам наносят на 20% больше урона.',glyph:'⚔'},
 Assassin:{name:'Лёгкий шаг',description:'Обычная атака по отравленному врагу восстанавливает 20% нанесённого урона.',glyph:'➶'},
 Mage:{name:'Внутренний источник',description:'Обычный удар по ослабленному врагу восстанавливает 8 дополнительной энергии.',glyph:'✧'},
 Marksman:{name:'Точный ритм',description:'Каждая четвёртая обычная атака наносит дополнительно 40% урона.',glyph:'◎'},
 Support:{name:'Дар жизни',description:'Лечение даёт цели щит на 20% реально восстановленного здоровья на 3 секунды.',glyph:'❋'},
};
export function basicSkill(hero:Hero):Hero['skill']{
 const isHealer=hero.role==='Support';
 return {name:basicNames[hero.id],description:isHealer?'Каждые 6 сек. лечит самого раненого союзника на 140% атаки.':'Каждые 6 сек. наносит ближайшей цели 150% атаки. Убийцы выбирают противника с наименьшим здоровьем.',effect:isHealer?'heal':'damage',power:isHealer?1.4:1.5,targets:1,duration:0};
}
export function heroStats(hero:Hero,level=1){
 const factor=levelMultiplier(level);
 return {hp:Math.round(hero.hp*factor),attack:Math.round(hero.attack*factor*(hero.rarity!=='Legendary'&&hero.role==='Fighter'?1.1:1)),defense:Math.round(hero.defense*factor*(hero.rarity!=='Legendary'&&hero.role==='Tank'?1.15:1)),interval:hero.interval/(hero.rarity!=='Legendary'&&hero.role==='Assassin'?1.12:1)};
}
export function heroAbilities(hero:Hero,level=1){
 const basic=basicSkill(hero),ultimate=hero.skill,passive=passives[hero.role];
 const power=['heal','shield'].includes(ultimate.effect)?`${Math.round(ultimate.power*levelMultiplier(level)*(ultimate.effect==='heal'&&hero.role==='Support'?1.15:1))} ${ultimate.effect==='heal'?'здоровья':'щита'}`:ultimate.effect==='haste'?`+${Math.round((ultimate.power-1)*100)}% скорости`:`${Math.round(ultimate.power*100)}% атаки`;
 return [
  {type:'Базовый навык',name:basic.name,description:basic.description,glyph:hero.role==='Support'?'❋':'⚔',tag:hero.role==='Support'?'Лечение':'Урон',detail:'Первое применение через 3 сек. · затем каждые 6 сек.'},
  {type:'Ультимейт',name:ultimate.name,description:ultimate.description,glyph:'✦',tag:{damage:'Урон',heal:'Лечение',shield:'Защита',stun:'Контроль',poison:'Яд',haste:'Ускорение',drain:'Поглощение',weaken:'Ослабление'}[ultimate.effect],detail:`100 энергии · ${power} · целей: ${ultimate.targets}${ultimate.duration?` · ${ultimate.duration/1000} сек.`:''}`},
  hero.rarity==='Legendary'?{type:'Лидерская пассивка',name:hero.role==='Tank'?'Небесное покровительство':'Лунный марш',description:hero.role==='Tank'?'Союзники под щитом наносят на 12% больше урона обычными атаками.':'Союзники наносят на 10% больше урона обычными атаками по отравленным целям.',glyph:'♛',tag:'Весь отряд',detail:'Действует, пока лидер жив. Одинаковые усиления не складываются.'}:{type:'Пассивка',...passive,tag:'Усиление',detail:'Срабатывает автоматически при выполнении условия.'},
 ];
}
