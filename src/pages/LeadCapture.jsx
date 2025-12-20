import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Calculator, Scale, TrendingDown, ShoppingBag, GraduationCap } from 'lucide-react';
import HomeValueTool from '@/components/leads/HomeValueTool';
import ProbateLeadForm from '@/components/leads/ProbateLeadForm';
import DownsizingTool from '@/components/leads/DownsizingTool';

const LEAD_SOURCES = [
  { value: 'home_value', label: 'Home Value Tool', icon: Calculator, description: 'Instant property valuation' },
  { value: 'probate', label: 'Probate Assistance', icon: Scale, description: 'Probate property help' },
  { value: 'downsizing', label: 'Downsizing Tool', icon: TrendingDown, description: 'Downsizing guidance' },
  { value: 'estate_finder', label: 'Estate Sale Search', icon: Home, description: 'Find estate sales' },
  { value: 'marketplace', label: 'Marketplace Activity', icon: ShoppingBag, description: 'Track buyer interest' },
  { value: 'education', label: 'Course Enrollment', icon: GraduationCap, description: 'Education leads' }
];

export default function LeadCapture() {
  const [activeTab, setActiveTab] = useState('home_value');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Lead Capture Tools
          </h1>
          <p className="text-slate-600">Multiple entry points to capture high-quality leads</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          {LEAD_SOURCES.map(source => {
            const Icon = source.icon;
            return (
              <Card 
                key={source.value}
                className={`cursor-pointer transition-all ${
                  activeTab === source.value ? 'ring-2 ring-gold-500' : 'hover:shadow-lg'
                }`}
                onClick={() => setActiveTab(source.value)}
              >
                <CardContent className="p-6 text-center">
                  <Icon className={`w-10 h-10 mx-auto mb-3 ${
                    activeTab === source.value ? 'text-gold-600' : 'text-slate-400'
                  }`} />
                  <h3 className="font-semibold text-navy-900 mb-1">{source.label}</h3>
                  <p className="text-xs text-slate-500">{source.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-navy-900">
              {LEAD_SOURCES.find(s => s.value === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'home_value' && <HomeValueTool />}
            {activeTab === 'probate' && <ProbateLeadForm />}
            {activeTab === 'downsizing' && <DownsizingTool />}
            {['estate_finder', 'marketplace', 'education'].includes(activeTab) && (
              <div className="text-center py-12 text-slate-500">
                This lead source is automatically captured from platform activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}