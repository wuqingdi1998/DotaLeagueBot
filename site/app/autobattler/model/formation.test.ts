import {expect,it} from 'vitest';
import {assignPosition} from './formation';
it('assigns heroes to a selected position and preserves vacancies',()=>{
 const team=['bastion',null,'veya','sokol','mirra'];
 expect(assignPosition(team,1,'iskra')).toEqual(['bastion','iskra','veya','sokol','mirra']);
 expect(assignPosition(team,4,'echo')).toEqual(['bastion',null,'veya','sokol','echo']);
 expect(assignPosition(team,1,'veya')).toEqual(['bastion','veya',null,'sokol','mirra']);expect(team[2]).toBe('veya');
});
