import React from 'react';
import { PIN_LEGEND } from './mapPins';

export default function MapPinLegend({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-6 mt-3 text-xs text-slate-500 flex-wrap ${className}`}>
      {PIN_LEGEND.map((pin) => (
        <div key={pin.label} className="flex items-center gap-1.5">
          <img src={pin.img} alt="" className="w-3.5 h-5 object-contain" />
          <span>{pin.label}</span>
        </div>
      ))}
    </div>
  );
}