import React from 'react';

export default function ProductArt({ type, hero = false }) {
  return <div className={`product-art ${type} ${hero ? 'hero-art' : ''}`} aria-hidden="true">
    {(type === 'laptop' || type === 'monitor') && <><div className="device-screen"><div className="wallpaper"><i/><i/><i/></div></div><div className="device-base"/>{type === 'monitor' && <div className="monitor-foot"/>}</>}
    {type === 'mouse' && <div className="mouse-body"><i/><span/></div>}
    {type === 'keyboard' && <div className="keyboard-body">{Array.from({length: 65}, (_, i) => <i key={i}/>)}</div>}
  </div>;
}
