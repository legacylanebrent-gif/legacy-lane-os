import React from 'react';
import { COMPARE_ROWS } from './content';

export default function OwnershipCompare() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left">
        <thead>
          <tr>
            <th className="w-1/4 p-3 text-xs font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200" />
            <th className="w-[37.5%] p-3 text-sm font-black uppercase tracking-tight text-slate-900 border-b-2 border-slate-200">
              Full Buy-In Operator
            </th>
            <th className="w-[37.5%] p-3 text-sm font-black uppercase tracking-tight text-amber-700 border-b-2 border-slate-200">
              Joint Build Partner
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row) => (
            <tr key={row.label} className="align-top">
              <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                {row.label}
              </th>
              <td className="p-3 text-sm text-slate-700 leading-relaxed border-b border-slate-200">{row.full}</td>
              <td className="p-3 text-sm text-slate-700 leading-relaxed border-b border-slate-200">{row.joint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}