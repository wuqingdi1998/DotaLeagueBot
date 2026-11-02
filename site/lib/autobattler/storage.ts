import { transaction } from '@/lib/db';
import { query } from '@/lib/db';
import { newProfile, type Profile } from './progression';
export async function gameHistory(userId:string){
  const history=await query<{operation_id:string;action:string;created_at:string;result:Record<string,unknown>}>(
    `SELECT operation_id,action,created_at,result - 'profile' AS result FROM autobattler_operations
     WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,[userId]);
  return history;
}
export async function readProfile(userId:string){
  return transaction(async client=>{
    await client.query('INSERT INTO autobattler_profiles(user_id,state) VALUES($1,$2) ON CONFLICT DO NOTHING',[userId,JSON.stringify(newProfile())]);
    const result=await client.query<{state:Profile}>('SELECT state FROM autobattler_profiles WHERE user_id=$1',[userId]);
    return result.rows[0].state;
  });
}
/** Per-profile row lock serializes spending, initialization and reward claims. */
export async function mutateProfile<T>(userId:string,operationId:string,action:string,change:(profile:Profile)=>T){
  return transaction(async client=>{
    await client.query('INSERT INTO autobattler_profiles(user_id,state) VALUES($1,$2) ON CONFLICT DO NOTHING',[userId,JSON.stringify(newProfile())]);
    const locked=await client.query<{state:Profile}>('SELECT state FROM autobattler_profiles WHERE user_id=$1 FOR UPDATE',[userId]);
    const previous=await client.query<{action:string;result:T}>('SELECT action,result FROM autobattler_operations WHERE user_id=$1 AND operation_id=$2',[userId,operationId]);
    if(previous.rows[0]){
      if(previous.rows[0].action!==action)throw new Error('Этот номер операции уже использован');
      return previous.rows[0].result;
    }
    const profile=locked.rows[0].state;const result=change(profile);
    await client.query('UPDATE autobattler_profiles SET state=$2,updated_at=NOW() WHERE user_id=$1',[userId,JSON.stringify(profile)]);
    await client.query('INSERT INTO autobattler_operations(user_id,operation_id,action,result) VALUES($1,$2,$3,$4)',[userId,operationId,action,JSON.stringify(result)]);
    return result;
  });
}
