import {expect,it} from 'vitest';
import {assignPosition} from './formation';
it('keeps vacant positions and never silently moves another hero',()=>{
 const team=['bastion',null,'veya','sokol','mirra'];
 expect(assignPosition(team,1,'iskra')).toEqual(['bastion','iskra','veya','sokol','mirra']);
 expect(assignPosition(team,4,'echo')).toEqual(['bastion',null,'veya','sokol','echo']);
 expect(()=>assignPosition(team,1,'veya')).toThrow();expect(team[2]).toBe('veya');
});
