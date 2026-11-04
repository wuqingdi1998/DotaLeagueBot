import {it,expect} from 'vitest';
import {heroes,starter,stages} from './catalog';
import {newProfile,normalizeProfile,validateTeam} from './progression';
it('limits all playable content to the selected five heroes',()=>{
 expect(heroes.map(hero=>hero.id)).toEqual(['bastion','iskra','ruta','orion','selena']);
 expect(heroes.find(hero=>hero.id==='ruta')?.rarity).toBe('Epic');
 for(const stage of stages)expect([...stage.team].sort()).toEqual([...starter].sort());
});
it('converts old squads once and preserves surviving upgrades, currency and campaign',()=>{
 const profile=newProfile();profile.version=5;profile.collection.bastion.level=12;
 profile.collection.veya={count:8,level:9,first:'old',last:'old'};profile.team=['bastion','iskra','veya','mirra','sokol'];
 const tickets=profile.tickets;normalizeProfile(profile);
 expect(Object.keys(profile.collection).sort()).toEqual([...starter].sort());
 expect(profile.collection.bastion.level).toBe(12);expect(profile.tickets).toBe(tickets);
 expect(()=>validateTeam(profile,profile.team)).not.toThrow();
 const once=structuredClone(profile);normalizeProfile(profile);expect(profile).toEqual(once);
});
