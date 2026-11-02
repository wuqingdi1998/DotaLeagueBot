export type Formation=(string|null)[];
export function assignPosition(team:Formation,position:number,hero:string):Formation{
  if(position<0||position>4)throw new Error('Неизвестная позиция');
  const next=Array.from({length:5},(_,index)=>team[index]??null);
  const previous=next.findIndex((id,index)=>id===hero&&index!==position);
  if(previous>=0)next[previous]=next[position];
  next[position]=hero;
  return next;
}
