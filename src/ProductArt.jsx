import React, { useId } from 'react';

export default function ProductArt({ type = 'laptop', hero = false }) {
  const id = useId().replaceAll(':', '');
  const ref = name => `url(#${id}-${name})`;
  return <svg className={`product-art art-${type} ${hero ? 'hero-art' : ''}`} viewBox="0 0 600 430" fill="none" role="img" aria-label={`${type} product illustration`}>
    <defs>
      <linearGradient id={`${id}-metal`} x1="100" y1="100" x2="460" y2="360" gradientUnits="userSpaceOnUse"><stop stopColor="#eef1ee"/><stop offset=".35" stopColor="#aab1b0"/><stop offset=".65" stopColor="#d7dddb"/><stop offset="1" stopColor="#727d7b"/></linearGradient>
      <linearGradient id={`${id}-screen`} x1="200" y1="100" x2="460" y2="310" gradientUnits="userSpaceOnUse"><stop stopColor="#071f28"/><stop offset=".5" stopColor="#153d38"/><stop offset="1" stopColor="#060c16"/></linearGradient>
      <linearGradient id={`${id}-ribbon`} x1="200" y1="100" x2="420" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#ddf6a1"/><stop offset=".35" stopColor="#96c88a"/><stop offset=".75" stopColor="#3d8b74"/><stop offset="1" stopColor="#122e2d"/></linearGradient>
      <linearGradient id={`${id}-dark`} x1="200" y1="100" x2="410" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#636c6a"/><stop offset=".4" stopColor="#363e3c"/><stop offset="1" stopColor="#171d1c"/></linearGradient>
      <linearGradient id={`${id}-white`} x1="120" y1="130" x2="420" y2="320" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#b7babb"/></linearGradient>
      <filter id={`${id}-shadow`} x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="15"/></filter>
      <clipPath id={`${id}-clip`}><rect x="151" y="71" width="330" height="216" rx="5"/></clipPath>
    </defs>
    <ellipse cx="310" cy="354" rx={type === 'mouse' ? 95 : 200} ry="18" fill="#16251d" opacity=".15" filter={ref('shadow')}/>
    {type === 'laptop' && <g transform="translate(-15 16) rotate(-8 310 220)">
      <rect x="138" y="57" width="356" height="247" rx="12" fill={ref('metal')} stroke="#7b8581" strokeWidth="2"/>
      <rect x="144" y="63" width="344" height="234" rx="8" fill="#151b1c"/>
      <rect x="151" y="71" width="330" height="216" rx="5" fill={ref('screen')}/>
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M140 310C170 105 281 76 385 88C515 104 470 220 352 205C211 187 234 322 510 308" stroke={ref('ribbon')} strokeWidth="61"/>
        <path d="M140 310C170 105 281 76 385 88C515 104 470 220 352 205C211 187 234 322 510 308" stroke="#d9fbb3" strokeOpacity=".4" strokeWidth="1.5"/>
      </g>
      <circle cx="316" cy="66" r="2" fill="#6b7772"/>
      <path d="M138 304H494L550 344Q552 350 539 352H83Q68 350 75 344Z" fill={ref('metal')} stroke="#7c8582" strokeWidth="1.5"/>
      <path d="M138 307H493L523 332H103Z" fill="#a6afab"/>
      <g opacity=".8">{Array.from({length:4},(_,row)=>Array.from({length:15},(_,col)=><rect key={`${row}-${col}`} x={145+col*22.5-row*5} y={309+row*5} width="17" height="3" rx=".9" fill="#38413d"/>))}</g>
      <path d="M261 332H365L374 343H251Z" fill="#bac2bf" stroke="#8b9590"/>
      <path d="M76 346H548L538 352H86Z" fill="#89938f"/>
      <path d="M274 346H359L353 349H280Z" fill="#626e67"/>
    </g>}
    {type === 'mouse' && <g transform="rotate(-24 300 215)">
      <path d="M219 185C219 117 251 87 300 87C350 87 383 120 383 185V260C383 311 346 340 300 340C253 340 219 310 219 260Z" fill={ref('dark')} stroke="#252e29" strokeWidth="2"/>
      <path d="M223 195C221 125 253 92 300 92C348 92 379 124 379 195H223Z" fill="#59625e"/>
      <path d="M300 94V183M223 194Q300 209 379 194" stroke="#202a24" strokeWidth="2"/>
      <rect x="292" y="130" width="16" height="43" rx="8" fill="#19231e" stroke="#768179"/>
      {Array.from({length:7},(_,i)=><path key={i} d={`M295 ${137+i*4}h10`} stroke="#616c64"/>)}
      <path d="M233 214V260C233 291 249 311 266 318" stroke="#a1aca2" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round"/>
      <path d="M291 289h18" stroke="#a5b1a7" strokeWidth="3" strokeLinecap="round"/>
    </g>}
    {type === 'keyboard' && <g transform="translate(18 20) rotate(-12 280 220)">
      <path d="M81 151H495Q511 151 511 168V278Q511 296 494 297H81Q65 297 65 278V168Q65 151 81 151Z" fill="#b9bebc" stroke="#a0a6a1" strokeWidth="2"/>
      <rect x="65" y="142" width="446" height="146" rx="13" fill={ref('white')} stroke="#e6e9e7" strokeWidth="2"/>
      {Array.from({length:5},(_,r)=>Array.from({length:r===4?10:14},(_,c)=>{
        const x=78+c*30; const y=154+r*24;
        if(r===4&&c>3&&c<9)return null;
        return <g key={`${r}-${c}`}><rect x={x} y={y+2} width={r===4&&c===3?176:25} height="19" rx="3" fill="#c2c9c4"/><rect x={x} y={y} width={r===4&&c===3?176:25} height="18" rx="3" fill={c===0&&r===0?'#b8d799':'#f9faf8'} stroke="#d7dcd6"/><path d={`M${x+9} ${y+7}h5`} stroke="#8b938d" strokeWidth="1"/></g>;
      }))}
      <circle cx="490" cy="268" r="2" fill="#96b077"/>
    </g>}
    {type === 'monitor' && <g transform="translate(0 -6)">
      <path d="M281 281H320L330 351H269Z" fill={ref('metal')}/>
      <path d="M251 347H347L374 361Q376 366 367 367H228Q220 365 226 361Z" fill={ref('metal')} stroke="#a1aaa5"/>
      <rect x="87" y="66" width="426" height="251" rx="10" fill={ref('metal')} stroke="#abb2ae" strokeWidth="2"/>
      <rect x="91" y="70" width="418" height="230" rx="7" fill="#18231d"/>
      <rect x="98" y="77" width="404" height="216" rx="3" fill={ref('screen')}/>
      <path d="M99 239C180 89 240 117 299 175C360 237 399 269 502 135V293H99Z" fill="#6b9f85"/>
      <path d="M99 273C164 146 230 184 284 230C350 287 418 254 502 204V293H99Z" fill="#afcea2"/>
      <path d="M99 292C174 227 202 260 244 278C311 308 445 229 502 263V293H99Z" fill="#d4e5b9"/>
      <circle cx="300" cy="308" r="2.5" fill="#839087"/>
    </g>}
  </svg>;
}
