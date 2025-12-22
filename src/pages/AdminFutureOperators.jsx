import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Phone, Globe, MapPin, Calendar, Package,
  Facebook, Twitter, Instagram, Youtube, ExternalLink, Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminFutureOperators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('AR');
  const [packageFilter, setPackageFilter] = useState('all');

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      const data = await base44.entities.FutureEstateOperator.list('-created_date', 5000);
      setOperators(data);
    } catch (error) {
      console.error('Error loading operators:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOperators = operators.filter(op => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      op.company_name?.toLowerCase().includes(query) ||
      op.city?.toLowerCase().includes(query) ||
      op.state?.toLowerCase().includes(query) ||
      op.phone?.toLowerCase().includes(query)
    );
    const matchesState = stateFilter === 'all' || op.state === stateFilter;
    const matchesPackage = packageFilter === 'all' || op.package_type === packageFilter;
    
    return matchesSearch && matchesState && matchesPackage;
  });

  const uniqueStates = [...new Set(operators.map(op => op.state).filter(Boolean))].sort();
  const uniquePackages = [...new Set(operators.map(op => op.package_type).filter(Boolean))].sort();

  const getPackageColor = (packageType) => {
    const colors = {
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Silver': 'bg-slate-100 text-slate-700',
      'Bronze': 'bg-orange-100 text-orange-700',
      'Platinum': 'bg-purple-100 text-purple-800'
    };
    return colors[packageType] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">
            Future Estate Operators
          </h1>
          <p className="text-slate-600">
            Scraped estate sale companies for outreach and partnership
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-900">{operators.length}</div>
          <div className="text-sm text-slate-600">Total Companies</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by company, city, state, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="outline" className="text-sm">
                {filteredOperators.length} results
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-600" />
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Packages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  {uniquePackages.map(pkg => (
                    <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(stateFilter !== 'all' || packageFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setStateFilter('all');
                    setPackageFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOperators.map((operator) => (
              <Card key={operator.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {operator.company_name}
                        </h3>
                        {operator.package_type && (
                          <Badge className={getPackageColor(operator.package_type)}>
                            {operator.package_type}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                        {operator.city && operator.state && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-cyan-600" />
                            <span>{operator.city}, {operator.state} {operator.zip_code}</span>
                          </div>
                        )}
                        
                        {operator.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-orange-600" />
                            <a href={`tel:${operator.phone}`} className="hover:underline">
                              {operator.phone}
                            </a>
                          </div>
                        )}
                        
                        {operator.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-green-600" />
                            <a 
                              href={operator.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline truncate"
                            >
                              {operator.website.replace(/https?:\/\/(www\.)?/, '')}
                            </a>
                          </div>
                        )}
                        
                        {operator.member_since && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <span>Member since {operator.member_since}</span>
                          </div>
                        )}
                      </div>

                      {(operator.facebook || operator.twitter || operator.instagram || operator.youtube || operator.pinterest) && (
                        <div className="flex items-center gap-2 mt-3">
                          {operator.facebook && (
                            <a 
                              href={operator.facebook} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Facebook className="w-4 h-4" />
                            </a>
                          )}
                          {operator.twitter && (
                            <a 
                              href={operator.twitter} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sky-500 hover:text-sky-600"
                            >
                              <Twitter className="w-4 h-4" />
                            </a>
                          )}
                          {operator.instagram && (
                            <a 
                              href={operator.instagram} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-pink-600 hover:text-pink-700"
                            >
                              <Instagram className="w-4 h-4" />
                            </a>
                          )}
                          {operator.youtube && (
                            <a 
                              href={operator.youtube} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Youtube className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {operator.source_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={operator.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Profile
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}