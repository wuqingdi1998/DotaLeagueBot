import type {Rarity} from './catalog';
export const shardRules={
 blue:{name:'Синий',rare:.89,epic:.10,legendary:.01},
 gold:{name:'Золотой',rare:0,epic:.80,legendary:.20},
};
export type Shard=keyof typeof shardRules;
export function shardRarity(shard:Shard,roll:number):Rarity{
 const chances=shardRules[shard];
 return roll<chances.rare?'Rare':roll<chances.rare+chances.epic?'Epic':'Legendary';
}
export function shardDescription(shard:Shard){
 const chances=shardRules[shard];
 return [chances.rare?`Редкий ${Math.round(chances.rare*100)}%`:null,`Эпический ${Math.round(chances.epic*100)}%`,`Легендарный ${Math.round(chances.legendary*100)}%`].filter(Boolean).join(' · ');
}
