import type {CSSProperties} from 'react';
import {heroVisuals,skillGlyphs} from '../model/visuals';
export default function SkillPreview({id}:{id:string}){
 const visual=heroVisuals[id];
 return <div className={`ab-preview-effect ab-effect-${visual.effect}`}><strong>{skillGlyphs[visual.index]}</strong>{Array.from({length:4+visual.index%5},(_,index)=><span key={index} className={`ab-ray ab-ray-${visual.index%4}`} style={{'--ray-angle':`${index*360/(4+visual.index%5)}deg`,'--ray-delay':`${index*.035}s`} as CSSProperties}/>)}</div>;
}
