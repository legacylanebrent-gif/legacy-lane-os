import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const US_STATES_LIST = [
  { name: 'Alabama', abbr: 'AL' }, { name: 'Alaska', abbr: 'AK' }, { name: 'Arizona', abbr: 'AZ' },
  { name: 'Arkansas', abbr: 'AR' }, { name: 'California', abbr: 'CA' }, { name: 'Colorado', abbr: 'CO' },
  { name: 'Connecticut', abbr: 'CT' }, { name: 'Delaware', abbr: 'DE' }, { name: 'Florida', abbr: 'FL' },
  { name: 'Georgia', abbr: 'GA' }, { name: 'Hawaii', abbr: 'HI' }, { name: 'Idaho', abbr: 'ID' },
  { name: 'Illinois', abbr: 'IL' }, { name: 'Indiana', abbr: 'IN' }, { name: 'Iowa', abbr: 'IA' },
  { name: 'Kansas', abbr: 'KS' }, { name: 'Kentucky', abbr: 'KY' }, { name: 'Louisiana', abbr: 'LA' },
  { name: 'Maine', abbr: 'ME' }, { name: 'Maryland', abbr: 'MD' }, { name: 'Massachusetts', abbr: 'MA' },
  { name: 'Michigan', abbr: 'MI' }, { name: 'Minnesota', abbr: 'MN' }, { name: 'Mississippi', abbr: 'MS' },
  { name: 'Missouri', abbr: 'MO' }, { name: 'Montana', abbr: 'MT' }, { name: 'Nebraska', abbr: 'NE' },
  { name: 'Nevada', abbr: 'NV' }, { name: 'New Hampshire', abbr: 'NH' }, { name: 'New Jersey', abbr: 'NJ' },
  { name: 'New Mexico', abbr: 'NM' }, { name: 'New York', abbr: 'NY' }, { name: 'North Carolina', abbr: 'NC' },
  { name: 'North Dakota', abbr: 'ND' }, { name: 'Ohio', abbr: 'OH' }, { name: 'Oklahoma', abbr: 'OK' },
  { name: 'Oregon', abbr: 'OR' }, { name: 'Pennsylvania', abbr: 'PA' }, { name: 'Rhode Island', abbr: 'RI' },
  { name: 'South Carolina', abbr: 'SC' }, { name: 'South Dakota', abbr: 'SD' }, { name: 'Tennessee', abbr: 'TN' },
  { name: 'Texas', abbr: 'TX' }, { name: 'Utah', abbr: 'UT' }, { name: 'Vermont', abbr: 'VT' },
  { name: 'Virginia', abbr: 'VA' }, { name: 'Washington', abbr: 'WA' }, { name: 'West Virginia', abbr: 'WV' },
  { name: 'Wisconsin', abbr: 'WI' }, { name: 'Wyoming', abbr: 'WY' }
];

export default function SEStateSelector({ baseSlug, title = 'Find Your State Guide', desc = 'Select your state for local resources, court information, and provider referrals.' }) {
  const [search, setSearch] = useState('');
  const filtered = US_STATES_LIST.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-600 mb-5 text-sm">{desc}</p>
      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input className="pl-9 h-9" placeholder="Search states..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {filtered.map(({ name, abbr }) => {
          const stateSlug = name.toLowerCase().replace(/\s+/g, '-');
          return (
            <Link key={abbr} to={`/${baseSlug}/${stateSlug}`}>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer">
                <span className="text-sm font-bold text-slate-700 block">{abbr}</span>
                <span className="text-xs text-slate-500 leading-tight block">{name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}