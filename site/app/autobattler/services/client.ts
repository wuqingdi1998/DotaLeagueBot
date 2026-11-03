import { fetchSiteRequest } from '@/lib/site-request';
import type { Profile } from '@/lib/autobattler/progression';
import type { Battle } from '@/lib/autobattler/simulation';
export interface GameResponse {profile:Profile;isAdmin?:boolean;battle?:Battle;reward?:number;experienceReward?:number;summoned?:string[];
  statistics?:{count:number;seed:number;totals:Record<string,number>};
  history?:{operation_id:string;action:string;created_at:string;result:{battle?:Battle;reward?:number;summoned?:string[]}}[]}
export async function gameRequest(input?:Record<string,unknown>):Promise<GameResponse>{
  const response=await fetchSiteRequest('/api/autobattler',input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operationId:crypto.randomUUID(),...input})}:{cache:'no-store'});
  const data=await response.json();if(!response.ok)throw new Error(data.error??'Не удалось загрузить игру');return data;
}
