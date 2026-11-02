import type {CSSProperties} from 'react';
import {heroVisuals} from '../model/visuals';
export default function SkillPreview({id}:{id:string}){
 const visual=heroVisuals[id];
 return <div className={`ab-preview-effect ab-effect-${visual.effect}`}><strong>{visual.glyph}</strong>{Array.from({length:4+visual.index%5},(_,index)=><span key={index} className={`ab-ray ab-ray-${visual.index%4}`} style={{'--ray-angle':`${index*360/(4+visual.index%5)}deg`,'--ray-delay':`${index*.035}s`} as CSSProperties}/>)}</div>;
}
