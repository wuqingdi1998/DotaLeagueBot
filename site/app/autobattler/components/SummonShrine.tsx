export function SummonShrine({phase}:{phase:number}){
 return <svg className="ab-shrine" viewBox="0 0 1200 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
   <radialGradient id="shrine-light"><stop stopColor="#b6ebff" stopOpacity=".8"/><stop offset="1" stopColor="#4c91bd" stopOpacity="0"/></radialGradient>
   <linearGradient id="shrine-crystal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c5f0ff"/><stop offset=".46" stopColor="#547ebc"/><stop offset="1" stopColor="#212a60"/></linearGradient>
  </defs>
  <g className={phase>0&&phase<4?'ab-shrine-focus':undefined}>
   <image href="/autobattler/summon-shrine.webp" width="1200" height="675" y="25"/>
   <ellipse className="ab-shrine-light" cx="600" cy="301" rx="380" ry="205" fill="url(#shrine-light)"/>
   {phase<4&&<g className="ab-shrine-artifact" transform="translate(210 40) scale(.65)">
    <path fill="url(#shrine-crystal)" stroke="#aecce2" strokeWidth="2" d="m600 106 79 116-28 111-51 53-66-61-17-103Z"/>
    <path fill="#293c76" d="m600 106 79 116-28 111-51 53 21-159Z"/>
    <path fill="#b3e8f7" fillOpacity=".56" d="m600 106-83 116 69 23 35-18Z"/>
    <path className="ab-shrine-energy" fill="none" stroke="#defbff" strokeWidth="5" pathLength="100" d="m600 377-14-132 35-18-21-121m-14 139-69-23m104 5 58-5"/>
   </g>}
  </g>
 </svg>;
}
