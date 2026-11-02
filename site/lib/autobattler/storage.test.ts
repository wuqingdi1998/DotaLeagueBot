import {afterAll,beforeAll,describe,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import type {PoolClient} from 'pg';
import {newProfile,summon,rewardStage} from './progression';
const runtime=vi.hoisted(()=>({client:null as unknown as PoolClient,queue:Promise.resolve()}));
vi.mock('@/lib/db',()=>({transaction:<T>(callback:(client:PoolClient)=>Promise<T>)=>{
  const result=runtime.queue.then(async()=>{await runtime.client.query('BEGIN');try{const result=await callback(runtime.client);await runtime.client.query('COMMIT');return result;}catch(error){await runtime.client.query('ROLLBACK');throw error;}});
  runtime.queue=result.then(()=>{},()=>{});return result;
}}));
import {mutateProfile,readProfile} from './storage';
const database=new PGlite();
beforeAll(async()=>{
  const migration=readFileSync('../bot/database/migrations/development/0194_autobattler.sql','utf8');
  await database.exec(migration);
  expect((await database.query("SELECT tablename FROM pg_tables WHERE tablename LIKE 'autobattler_%'")).rows).toHaveLength(0);
  // Embedded test PostgreSQL uses a fixed database name; only the guard expression is substituted.
  await database.exec(migration.replace("current_database() = 'linkens_development'","true"));
  runtime.client={query:async(text:string,values?:unknown[])=>database.query(text,values)} as unknown as PoolClient;
});
afterAll(()=>database.close());
describe('isolated PostgreSQL game storage',()=>{
  it('initializes once, replays operations, persists state and serializes concurrent spending',async()=>{
    expect((await readProfile('player')).tickets).toBe(10);expect((await readProfile('player')).tickets).toBe(10);
    const spend=()=>mutateProfile('player','00000000-0000-4000-8000-000000000001','summon',profile=>({summoned:summon(profile,10,()=>0),profile}));
    const [one,two]=await Promise.all([spend(),spend()]);expect(two).toEqual(one);expect((await readProfile('player')).tickets).toBe(0);
    await expect(mutateProfile('player','00000000-0000-4000-8000-000000000002','summon',profile=>summon(profile,1,()=>0))).rejects.toThrow();
    expect((await readProfile('player')).tickets).toBe(0);
    const reward=(id:string)=>mutateProfile('player',id,'battle',profile=>rewardStage(profile,1,true));
    expect(await Promise.all([reward('00000000-0000-4000-8000-000000000003'),reward('00000000-0000-4000-8000-000000000004')])).toEqual([2,0]);
    expect((await readProfile('player')).tickets).toBe(2);expect((await readProfile('other')).tickets).toBe(newProfile().tickets);
  });
});
