import {it,expect} from 'vitest';
import {deathMotion} from './deathMotion';
it('buckles first, falls next and keeps the corpse visible after landing',()=>{
 expect(deathMotion(250).collapse).toBeGreaterThan(deathMotion(250).fall);
 expect(deathMotion(1050).fall).toBe(1);
 expect(deathMotion(1300).alpha).toBe(1);
 expect(deathMotion(2200).alpha).toBe(0);
 expect(deathMotion(1050).vertical).toBeCloseTo(-9);
});
