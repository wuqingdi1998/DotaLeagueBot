import {clamp,smooth,combatTiming} from './combatPresentation';

/** Knees buckle before the torso falls; the landed body rests before fading. */
export function deathMotion(age:number){
 const progress=clamp(age/combatTiming.death),collapse=smooth((progress-.04)/.48),fall=smooth((progress-.2)/.65);
 const landing=clamp((progress-.8)/.2);
 return {collapse,fall,vertical:-fall*9-Math.sin(landing*Math.PI)*3,
  alpha:1-smooth((age-1400)/800),dust:age>=820&&age<1250?Math.sin((age-820)/430*Math.PI):0};
}
