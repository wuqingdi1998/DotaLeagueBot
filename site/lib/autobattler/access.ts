import { getSession } from '@/lib/auth';
import { isDevelopmentSite } from '@/lib/development/environment';
import { one } from '@/lib/db';
/** Fail closed before any game read/write, including against a misconfigured database. */
export async function gameUser(){
  if(!isDevelopmentSite())throw new Response(null,{status:404});
  const database=await one<{name:string}>('SELECT current_database() AS name');
  if(database?.name!=='linkens_development')throw new Response('Игра требует отдельную тестовую базу',{status:503});
  const user=await getSession();
  if(!user)throw new Response('Войдите на сайт',{status:401});
  return user;
}
