import {describe,it,expect} from 'vitest';
import {newProfile,normalizeProfile,levelUp,grantHero,rewardStage} from './progression';
import {heroStats,heroAbilities,levelRules,stageExperience} from './abilities';
import {heroById,heroes,starter} from './catalog';
import {simulate} from './simulation';
describe('hero levels and three abilities',()=>{
 it('upgrades old saves once without losing collections, stages or tickets',()=>{
  const profile=newProfile();delete profile.experience;delete profile.collection.bastion.level;profile.version=2;profile.cleared=[1,2];profile.unlocked=3;
  const original=structuredClone(profile);normalizeProfile(profile);
  expect(profile.experience).toBe(levelRules.initialExperience+stageExperience(1)+stageExperience(2));
  expect(profile.collection.bastion.level).toBe(1);expect(profile.collection.bastion.count).toBe(original.collection.bastion.count);expect(profile.tickets).toBe(original.tickets);expect(profile.cleared).toEqual([1,2]);
  const once=structuredClone(profile);normalizeProfile(profile);expect(profile).toEqual(once);
 });
 it('spends exact experience, preserves level on duplicates, prevents unowned and capped upgrades',()=>{
  const profile=newProfile();levelUp(profile,'bastion');expect(profile.collection.bastion.level).toBe(2);expect(profile.experience).toBe(260);
  grantHero(profile,'bastion','now');expect(profile.collection.bastion.level).toBe(2);
  expect(()=>levelUp(profile,'veya')).toThrow();expect(()=>levelUp(profile,'__proto__')).toThrow();profile.experience=0;expect(()=>levelUp(profile,'bastion')).toThrow();
  profile.experience=10000;profile.collection.bastion.level=levelRules.max;expect(()=>levelUp(profile,'bastion')).toThrow();expect(profile.experience).toBe(10000);
 });
 it('awards experience only on first victory',()=>{
  const profile=newProfile();rewardStage(profile,1,false);expect(profile.experience).toBe(300);rewardStage(profile,1,true);expect(profile.experience).toBe(740);rewardStage(profile,1,true);expect(profile.experience).toBe(740);
 });
 it('uses server levels for health, attack and defense and keeps replays deterministic',()=>{
  const levels={bastion:5,iskra:3};const battle=simulate(starter,starter,42,1,levels);
  expect(battle).toEqual(simulate(starter,starter,42,1,levels));
  const stats=heroStats(heroById.bastion,5),unit=battle.units[0];expect(unit.maxHp).toBe(stats.hp);expect(unit.attack).toBe(stats.attack);expect(unit.defense).toBe(stats.defense);expect(battle.units[5].level).toBe(1);
 });
 it('runs basics, ultimates and role passives as separate combat mechanics',()=>{
  for(const hero of heroes)expect(heroAbilities(hero).map(item=>item.type)).toEqual(['Базовый навык','Ультимейт',hero.rarity==='Legendary'?'Лидерская пассивка':'Пассивка']);
  const battle=simulate(['bastion','iskra','veya','sokol','mirra'],['bastion','iskra','veya','sokol','mirra'],42);
  expect(battle.events.some(event=>event.kind==='basic')).toBe(true);expect(battle.events.some(event=>event.kind==='skill')).toBe(true);expect(battle.events.some(event=>event.kind==='passive'&&event.actor==='0-3')).toBe(true);
  expect(battle.units[0].defense).toBe(Math.round(heroById.bastion.defense*1.15));
  expect(battle.frames[0].units[4].energy).toBe(20);
  const firstHeal=battle.events.find(event=>event.kind==='heal'&&event.actor==='0-2');expect(firstHeal?.time).toBe(3000);expect(firstHeal?.amount).toBeGreaterThan(0);
 });
});
