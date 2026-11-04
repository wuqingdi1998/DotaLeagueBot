import {beforeEach,it,expect,vi} from 'vitest';
import {newProfile} from '@/lib/autobattler/progression';
const mocks=vi.hoisted(()=>({user:vi.fn(),mutate:vi.fn(),read:vi.fn(),history:vi.fn()}));
vi.mock('@/lib/autobattler/access',()=>({gameUser:mocks.user}));
vi.mock('@/lib/autobattler/storage',()=>({mutateProfile:mocks.mutate,readProfile:mocks.read,gameHistory:mocks.history}));
import {GET,POST} from './route';
let profile=newProfile();
beforeEach(()=>{vi.clearAllMocks();profile=newProfile();mocks.user.mockResolvedValue({discordId:'owner',isAdmin:false});mocks.read.mockResolvedValue(profile);mocks.history.mockResolvedValue([]);mocks.mutate.mockImplementation((_user,_id,_action,change)=>change(profile));});
const post=(input:Record<string,unknown>)=>POST(new Request('https://dev.lsesports.ru/api/autobattler',{method:'POST',body:JSON.stringify({operationId:'00000000-0000-4000-8000-000000000001',...input})}));
it('requires existing session and denies admin commands to regular users',async()=>{
  expect((await post({action:'admin',command:'all'})).status).toBe(403);expect(mocks.mutate).not.toHaveBeenCalled();
  mocks.user.mockRejectedValue(new Response(null,{status:401}));expect((await GET()).status).toBe(401);
});
it('rejects locked stages and ignores fabricated winner and reward values',async()=>{
  expect((await post({action:'battle',stage:15})).status).toBe(400);
  const response=await post({action:'battle',stage:1,winner:0,reward:1000000});const result=await response.json();
  expect(response.status).toBe(200);expect(result.reward).toBe(result.battle.winner===0?2:0);expect(result.profile.tickets).toBe(10+result.reward);expect(result.battle.frames.length).toBeGreaterThan(20);
});
it('binds every operation to the current account and keeps dev commands self-only',async()=>{
  mocks.user.mockResolvedValue({discordId:'owner',isAdmin:true});
  await post({action:'admin',command:'tickets',value:100,userId:'someone-else'});
  expect(mocks.mutate.mock.calls[0][0]).toBe('owner');expect(profile.tickets).toBe(110);
});
it('ignores fabricated level and experience and charges the authenticated profile',async()=>{
  const result=await (await post({action:'level',hero:'bastion',level:20,experience:999999,userId:'other'})).json();
  expect(result.profile.collection.bastion.level).toBe(2);expect(result.profile.experience).toBe(260);expect(mocks.mutate.mock.calls[0][0]).toBe('owner');
  expect((await post({action:'level',hero:'veya'})).status).toBe(400);
});
