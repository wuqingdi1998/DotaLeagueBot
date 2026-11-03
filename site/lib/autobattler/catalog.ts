export type Rarity = 'Rare' | 'Epic' | 'Legendary';
export type Role = 'Tank' | 'Fighter' | 'Assassin' | 'Mage' | 'Marksman' | 'Support';
export type Effect = 'damage' | 'heal' | 'shield' | 'stun' | 'poison' | 'haste' | 'drain' | 'weaken';
export interface Hero {
  id: string; name: string; rarity: Rarity; role: Role; color: number;
  hp: number; attack: number; defense: number; interval: number; range: number; movement: number;
  skill: { name: string; description: string; effect: Effect; power: number; targets: number; duration: number };
}
export const rules = { version: 5, step: 100, limit: 90000, initialTickets: 10, reward: 2,
  stageCount: 15 };
const roles: Record<Role, [number, number, number, number, number, number, number]> = {
  Tank: [2200, 90, 65, 1400, 65, 85, 0x59d2c5],
  Fighter: [1650, 145, 35, 1100, 70, 100, 0xe7a65b],
  Assassin: [1150, 125, 20, 750, 60, 140, 0xd78be9],
  Mage: [1100, 150, 20, 1500, 300, 70, 0x829bff],
  Marksman: [1250, 130, 25, 1000, 330, 80, 0x9edc6a],
  Support: [1350, 80, 30, 1400, 280, 75, 0xf28faa],
};
type Entry = [string, string, Role, string, Effect, number, number, number, Rarity?];
const entries: Entry[] = [
  ['bastion','Бастион','Tank','Каменный обет','shield',600,2,5000],
  ['iskra','Искра','Fighter','Огненная дуга','damage',2.2,2,0],
  ['veya','Вея','Support','Живой источник','heal',440,2,0],
  ['sokol','Сокол','Marksman','Двойная стрела','damage',2.5,1,0],
  ['mirra','Мирра','Mage','Ледяной звон','stun',1.1,2,1400],
  ['ten','Тень','Assassin','Похищение жизни','drain',2.4,1,0],
  ['kremen','Кремень','Tank','Железный круг','shield',380,3,4000],
  ['ruta','Рута','Support','Лесной покров','heal',300,3,0],
  ['bor','Бор','Fighter','Горный удар','stun',1.8,1,1800],
  ['lira','Лира','Marksman','Ядовитое перо','poison',.4,2,5000],
  ['morok','Морок','Mage','Увядание','weaken',1.4,3,4000],
  ['zefir','Зефир','Assassin','Ветер клинков','haste',1.5,2,4000],
  ['yantar','Янтарь','Fighter','Солнечная сталь','drain',1.7,2,0],
  ['azur','Азур','Mage','Синий разлом','damage',1.5,3,0],
  ['astra','Астра','Support','Звёздный покров','shield',280,5,3500,'Epic'],
  ['granit','Гранит','Tank','Сотрясение','stun',1.3,3,1000,'Epic'],
  ['nox','Нокс','Assassin','Сумеречная метка','poison',.65,1,6000,'Epic'],
  ['sol','Соль','Mage','Белое пламя','damage',1.15,5,0,'Epic'],
  ['taiga','Тайга','Marksman','Охотничий залп','damage',1.7,3,0,'Epic'],
  ['rion','Рион','Fighter','Алый прилив','drain',1.3,3,0,'Epic'],
  ['flor','Флор','Support','Сад рассвета','heal',220,5,0,'Epic'],
  ['echo','Эхо','Mage','Тишина','weaken',1.1,5,3500,'Epic'],
  ['orion','Орион','Tank','Небесный заслон','shield',240,5,5000,'Legendary'],
  ['selena','Селена','Assassin','Лунная жатва','drain',1.1,4,0,'Legendary'],
];
const descriptions: Record<Effect,string> = {
  damage:'Наносит урон выбранным противникам.', heal:'Лечит союзников с наименьшей долей здоровья.',
  shield:'Накладывает временный щит на раненых союзников. Щиты не складываются.',
  stun:'Наносит урон и ненадолго оглушает. После оглушения действует защита от повторного контроля.',
  poison:'Наносит периодический урон раз в секунду.', haste:'Временно ускоряет атаки союзников.',
  drain:'Наносит урон и восстанавливает себе 45% нанесённого урона.',
  weaken:'Наносит урон и временно снижает атаку противников на 25%.',
};
export const heroes: Hero[] = entries.map(([id,name,role,skill,effect,power,targets,duration,rarity='Rare']) => {
  const [hp,attack,defense,interval,range,movement,color] = roles[role];
  return {id,name,role,rarity,hp,attack,defense,interval,range,movement,color,
    skill:{name:skill,description:effect==='haste'?`Ускоряет атаки союзников на ${Math.round((power-1)*100)}%.`:descriptions[effect],effect,power,targets,duration}};
});
export const heroById = Object.fromEntries(heroes.map(hero=>[hero.id,hero]));
export const starter = heroes.slice(0,5).map(hero=>hero.id);
const lineups = [starter, ['kremen','bor','ruta','lira','azur'], ['bastion','yantar','veya','morok','sokol'],
  ['granit','iskra','astra','taiga','mirra'], ['orion','rion','flor','echo','selena']];
export const stages = Array.from({length:rules.stageCount},(_,i)=>({id:i+1,chapter:Math.floor(i/5)+1,
  name:['Лесная тропа','Сумрачная чаща','Заброшенная деревня'][Math.floor(i/5)],
  team:lineups[Math.floor(i/3)], scale:.65+i*.025}));
