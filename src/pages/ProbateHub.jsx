import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import ProbateLeadForm from '@/components/probate/ProbateLeadForm';
import ProbateDisclaimer from '@/components/probate/ProbateDisclaimer';
import { MapPin, FileText, Home, Users, Scale, Phone, ChevronRight, Search, Globe } from 'lucide-react';

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

export default function ProbateHub() {
  const [publishedStates, setPublishedStates] = useState([]);
  const [stateSearch, setStateSearch] = useState('');

  useEffect(() => {
    base44.entities.ProbateState.filter({ status: 'published' }).then(setPublishedStates);
  }, []);

  const publishedSlugs = new Set(publishedStates.map(s => s.slug));

  const filteredStates = US_STATES_LIST.filter(s =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 px-4 text-center">
        <Badge className="mb-4 bg-amber-500/20 text-amber-300 border-amber-500/30">Probate & Estate Settlement Guide</Badge>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
          Probate & Estate Settlement<br />
          <span className="text-amber-400">Guide for All 50 States</span>
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
          Free educational guides on probate, estate sales, cleanouts, and inherited home sales. Find state-specific resources, understand the process, and connect with local experts.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#find-your-state">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-8">
              Find Your State Guide
            </Button>
          </a>
          <a href="#get-help">
            <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8">
              Get Free Help
            </Button>
          </a>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-10">How EstateSalen Helps Families Through Probate</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, color: 'bg-blue-100 text-blue-700', title: 'State Guides', desc: 'Free educational guides on the probate process in every state' },
              { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Estate Sales', desc: 'Connect with licensed estate sale companies in your area' },
              { icon: Users, color: 'bg-green-100 text-green-700', title: 'Realtors & Investors', desc: 'Find probate-friendly agents and cash buyers near you' },
              { icon: Scale, color: 'bg-purple-100 text-purple-700', title: 'Attorney Resources', desc: 'Understand when to involve a probate attorney' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <Card key={title} className="text-center p-6">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* State Selector */}
      <section id="find-your-state" className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-3">Find Your State Guide</h2>
          <p className="text-slate-600 text-center mb-8">Select your state to view probate steps, court information, and local estate sale resources.</p>

          <div className="relative max-w-sm mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              className="pl-9"
              placeholder="Search states..."
              value={stateSearch}
              onChange={e => setStateSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredStates.map(({ name, abbr }) => {
              const slug = name.toLowerCase().replace(/\s+/g, '-');
              const isPublished = publishedSlugs.has(slug);
              return (
                <Link key={abbr} to={`/probate/${slug}`}>
                  <div className={`rounded-xl border p-3 text-center hover:shadow-md transition-all cursor-pointer group ${isPublished ? 'border-amber-300 bg-amber-50 hover:bg-amber-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                    <span className="text-lg font-bold text-slate-700 block">{abbr}</span>
                    <span className="text-xs text-slate-600">{name}</span>
                    {isPublished && <Badge className="mt-1 text-xs bg-amber-500 text-white">Guide Live</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Probate Checklist CTA */}
      <section className="py-12 px-4 bg-slate-800 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif font-bold mb-3">Free Probate & Estate Checklist</h2>
          <p className="text-slate-300 mb-6">Download our 12-step checklist covering everything from death certificates to closing the estate.</p>
          <Link to="/probate-checklist">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-10">
              Get the Free Checklist
            </Button>
          </Link>
        </div>
      </section>

      {/* Lead Capture */}
      <section id="get-help" className="py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-2">Get Connected with Local Experts</h2>
          <p className="text-slate-600 text-center mb-6">Tell us about your situation and we'll connect you with estate sale companies, realtors, and other professionals in your area — for free.</p>
          <div className="mb-6"><ProbateDisclaimer /></div>
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <ProbateLeadForm sourcePage="/probate" />
            </CardContent>
          </Card>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}