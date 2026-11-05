import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({query:vi.fn(),transaction:vi.fn(),admin:vi.fn()}));
vi.mock("@/lib/db",()=>({query:mocks.query,transaction:mocks.transaction}));
vi.mock("@/lib/auth",()=>({requireAdmin:mocks.admin,responseFromAuthError:(e:unknown)=>{if(e instanceof Response)return e;throw e;}}));
import { POST, PATCH } from "./route";
let db:PGlite;
const body={tournamentId:1,stage:"Группа",bestOf:3,teamAPlaceholder:"A",teamBPlaceholder:"B",status:"scheduled"};
const request=(data:object,method="POST")=>new Request("https://test.local",{method,headers:{"content-type":"application/json"},body:JSON.stringify(data)});
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`CREATE TABLE tournaments(id int PRIMARY KEY); INSERT INTO tournaments VALUES(1);
 CREATE TABLE tournament_groups(id int,tournament_id int);
 CREATE TABLE tournament_team_applications(id int,tournament_id int);
 CREATE TABLE tournament_matches(id serial PRIMARY KEY,tournament_id int,group_id int,scheduled_at timestamptz NOT NULL,
 stage text,team_a_application_id int,team_b_application_id int,team_a_placeholder text,team_b_placeholder text,
 best_of int,sort_order int,result_type text,bracket_round int,bracket_side text,bracket_slot int,
 team_a_score int,team_b_score int,status text,team_a_result_label text,team_b_result_label text,decision_note text,
 winner_to_match_id int,winner_to_slot text,loser_to_match_id int,loser_to_slot text,eliminated_team_application_id int,updated_at timestamptz);
 CREATE TABLE tournament_audit_log(tournament_id int,actor_discord_id bigint,action text,entity_type text,entity_id text,details jsonb);`);
 await db.exec(readFileSync(new URL("../../../../../bot/database/migrations/0196_match_schedule_tba.sql",import.meta.url),"utf8"));
 const query=async(sql:string,values:unknown[]=[])=>{
  if(sql.includes("pg_advisory_xact_lock"))return {rows:[],rowCount:0};
  const result=await db.query(sql,values);return {...result,rowCount:result.affectedRows||result.rows.length};
 };
 mocks.query.mockImplementation(async(sql,values)=>(await query(sql,values)).rows);
 mocks.admin.mockResolvedValue({actorDiscordId:null});
 mocks.transaction.mockImplementation(async callback=>{
  await db.exec("BEGIN");try{const result=await callback({query});await db.exec("COMMIT");return result;}
  catch(e){await db.exec("ROLLBACK");throw e;}
 });
});
afterAll(async()=>{await db.close();});
it("creates an undated match without a fabricated date and deduplicates retries",async()=>{
 const first=await POST(request({...body,scheduledAt:null}));expect(first.status).toBe(201);
 const retry=await POST(request({...body,scheduledAt:null}));expect(retry.status).toBe(200);
 expect(await retry.json()).toEqual(await first.json());
 expect((await db.query("SELECT scheduled_at FROM tournament_matches")).rows).toEqual([{scheduled_at:null}]);
});
it("edits a dated match to TBA and back without creating another match",async()=>{
 for(const scheduledAt of ["2026-11-30T19:00",null,"2026-12-01T20:00"]){
  expect((await PATCH(request({...body,id:1,scheduledAt},"PATCH"))).status).toBe(200);
  const rows=(await db.query<{scheduled_at:Date|null}>("SELECT scheduled_at FROM tournament_matches")).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].scheduled_at?.toISOString()??null).toBe(scheduledAt===null?null:scheduledAt==="2026-11-30T19:00"?"2026-11-30T16:00:00.000Z":"2026-12-01T17:00:00.000Z");
 }
 expect((await PATCH(request({id:1,status:"scheduled"},"PATCH"))).status).toBe(200);
 expect((await db.query<{scheduled_at:Date}>("SELECT scheduled_at FROM tournament_matches")).rows[0].scheduled_at.toISOString()).toBe("2026-12-01T17:00:00.000Z");
});
it("rejects malformed dates and unauthenticated writes",async()=>{
 expect((await POST(request({...body,scheduledAt:"wrong"}))).status).toBe(400);
 mocks.admin.mockRejectedValueOnce(new Response("",{status:403}));
 expect((await PATCH(request({...body,id:1,scheduledAt:null},"PATCH"))).status).toBe(403);
});
