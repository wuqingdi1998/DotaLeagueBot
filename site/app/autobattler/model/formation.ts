export type Formation=(string|null)[];
export function assignPosition(team:Formation,position:number,hero:string):Formation{
  if(position<0||position>4)throw new Error('Неизвестная позиция');
  if(team.some((id,index)=>id===hero&&index!==position))throw new Error('Герой уже занимает другую позицию. Сначала освободите её.');
  return Array.from({length:5},(_,index)=>index===position?hero:team[index]??null);
}
