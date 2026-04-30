import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Search, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function PropstreamLeadImport() {
  const [searchType, setSearchType] = useState('absentee');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState('');
  const [limit, setLimit] = useState('50');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [assignOperatorId, setAssignOperatorId] = useState('');
  const [operators, setOperators] = useState([]);
  const [autoRoute, setAutoRoute] = useState(false);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      const opData = await base44.entities.User.filter({ primary_account_type: 'estate_sale_operator' });
      setOperators(opData || []);
    } catch (error) {
      console.error('Error loading operators:', error);
    }
  };

  const handleSearch = async () => {
    if (!state && !city && !county && !zipCode) {
      alert('Please enter at least one search criteria');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('propstreamLeadSearch', {
        searchType,
        state: state || undefined,
        city: city || undefined,
        county: county || undefined,
        zipCode: zipCode || undefined,
        radius: radius ? parseInt(radius) : undefined,
        limit: parseInt(limit)
      });

      if (response.data.leads) {
        setResults(response.data.leads);
        setSelectedLeads(new Set());
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search Propstream');
    } finally {
      setLoading(false);
    }
  };

  const toggleLeadSelection = (idx) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(idx)) {
      newSelection.delete(idx);
    } else {
      newSelection.add(idx);
    }
    setSelectedLeads(newSelection);
  };

  const toggleAllLeads = () => {
    if (selectedLeads.size === results.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(results.map((_, idx) => idx)));
    }
  };

  const handleImport = async () => {
    if (selectedLeads.size === 0) {
      alert('Select at least one lead to import');
      return;
    }

    const leadsToImport = Array.from(selectedLeads).map(idx => results[idx]);

    setImporting(true);
    try {
      const response = await base44.functions.invoke('importPropstreamLeads', {
        leads: leadsToImport,
        assignToOperatorId: assignOperatorId || null,
        autoRoute: autoRoute && !assignOperatorId
      });

      alert(`Successfully imported ${response.data.imported} leads`);
      setResults([]);
      setSelectedLeads(new Set());
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Download className="w-8 h-8" />
        Propstream Lead Import
      </h1>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Search Propstream Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Lead Type</label>
            <select 
              value={searchType} 
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              <option value="absentee">Absentee Owners</option>
              <option value="inherited">Inherited Properties</option>
              <option value="distressed">Distressed Properties</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <select 
                value={state} 
                onChange={(e) => setState(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                <option value="">Select State</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input 
                placeholder="City name"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">County</label>
              <Input 
                placeholder="County name"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ZIP Code</label>
              <Input 
                placeholder="ZIP code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Radius (miles)</label>
              <Input 
                type="number"
                placeholder="Optional radius"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Results Limit</label>
              <Input 
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {loading ? 'Searching...' : 'Search Properties'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Found {results.length} Properties</CardTitle>
            <Checkbox 
              checked={selectedLeads.size === results.length}
              onChange={toggleAllLeads}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((lead, idx) => (
              <div key={idx} className="border rounded-lg p-4 flex items-start gap-3 hover:bg-slate-50">
                <Checkbox 
                  checked={selectedLeads.has(idx)}
                  onChange={() => toggleLeadSelection(idx)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">{lead.contact_name}</div>
                  <div className="text-sm text-slate-600">{lead.property_address}</div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Badge className="bg-green-100 text-green-700">
                      ${lead.estimated_value?.toLocaleString() || 'TBD'}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700">
                      Score: {lead.score}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Import Options */}
      {selectedLeads.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Options ({selectedLeads.size} selected)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Assign to Operator</label>
              <select 
                value={assignOperatorId} 
                onChange={(e) => setAssignOperatorId(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                <option value="">Manual Assignment</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.full_name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                checked={autoRoute}
                onChange={(e) => setAutoRoute(e.target.checked)}
                disabled={!!assignOperatorId}
              />
              <label className="text-sm">Auto-route to best operator (by territory)</label>
            </div>

            <Button 
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {importing ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {importing ? 'Importing...' : `Import ${selectedLeads.size} Leads`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}