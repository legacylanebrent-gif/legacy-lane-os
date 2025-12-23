import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Phone, Globe, MapPin, Calendar, Package,
  Facebook, Twitter, Instagram, Youtube, ExternalLink, Filter, Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminFutureOperators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('AR');
  const [packageFilter, setPackageFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState('idle'); // idle, importing, success, error
  const [importResults, setImportResults] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadOperators();
    loadTotalCount();
  }, [stateFilter]);

  const loadTotalCount = async () => {
    try {
      const allData = await base44.entities.FutureEstateOperator.list('-created_date', 50000);
      setTotalCount(allData.length);
    } catch (error) {
      console.error('Error loading total count:', error);
    }
  };

  const loadOperators = async () => {
    setLoading(true);
    try {
      // Filter by state on the server
      const data = await base44.entities.FutureEstateOperator.filter(
        { state: stateFilter },
        '-created_date',
        1000
      );
      setOperators(data);
    } catch (error) {
      console.error('Error loading operators:', error);
    } finally {
      setLoading(false);
    }
  };

  const allStates = ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'];

  const filteredOperators = operators.filter(op => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      op.company_name?.toLowerCase().includes(query) ||
      op.city?.toLowerCase().includes(query) ||
      op.state?.toLowerCase().includes(query) ||
      op.phone?.toLowerCase().includes(query)
    );
    const matchesPackage = packageFilter === 'all' || op.package_type === packageFilter;
    
    return matchesSearch && matchesPackage;
  });

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

  const handleImportCompanies = async () => {

    const functionName = `scrape${stateFilter}Operators`;
    
    setImporting(true);
    setShowImportModal(true);
    setImportStatus('importing');
    setImportResults(null);
    
    try {
      const response = await base44.functions.invoke(functionName, {});
      console.log('Import result:', response.data);
      
      setImportResults(response.data);
      setImportStatus('success');
      
      // Reload operators and total count after import
      await loadOperators();
      await loadTotalCount();
    } catch (error) {
      console.error('Error importing companies:', error);
      setImportStatus('error');
      setImportResults({ error: error.message });
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportStatus('idle');
    setImportResults(null);
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
    <div className="p-6 lg:p-8 pt-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-2">
            Future Estate Operators
          </h1>
          <p className="text-slate-600">
            Scraped estate sale companies for outreach and partnership
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-3xl font-bold text-slate-900">8,533</div>
          <div className="text-sm text-slate-600">Total Records in Database</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by company, city, state, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="outline" className="text-sm w-fit">
                {filteredOperators.length} results
              </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {allStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={packageFilter} onValueChange={setPackageFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="All Packages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packages</SelectItem>
                    {uniquePackages.map(pkg => (
                      <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleImportCompanies}
                disabled={importing}
                className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{importing ? 'Importing...' : 'Import and Update Companies'}</span>
                <span className="sm:hidden">{importing ? 'Importing...' : 'Import'}</span>
              </Button>
              
              {packageFilter !== 'all' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setPackageFilter('all');
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOperators.map((operator) => (
              <Card key={operator.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                            {operator.company_name}
                          </h3>
                          {operator.package_type && (
                            <Badge className={getPackageColor(operator.package_type)}>
                              {operator.package_type}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {operator.source_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-shrink-0"
                        >
                          <a 
                            href={operator.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">View Profile</span>
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                      {operator.city && operator.state && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                          <span className="truncate">{operator.city}, {operator.state} {operator.zip_code}</span>
                        </div>
                      )}
                      
                      {operator.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          <a href={`tel:${operator.phone}`} className="hover:underline truncate">
                            {operator.phone}
                          </a>
                        </div>
                      )}
                      
                      {operator.website && (
                        <div className="flex items-center gap-2 col-span-full">
                          <Globe className="w-4 h-4 text-green-600 flex-shrink-0" />
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
                          <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span className="truncate">Member since {operator.member_since}</span>
                        </div>
                      )}
                    </div>

                    {(operator.facebook || operator.twitter || operator.instagram || operator.youtube || operator.pinterest) && (
                      <div className="flex items-center gap-2 pt-2 border-t">
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
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Status Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importing Companies from {stateFilter}</DialogTitle>
            <DialogDescription>
              {importStatus === 'importing' && 'Please wait while we scrape and import companies...'}
              {importStatus === 'success' && 'Import completed successfully!'}
              {importStatus === 'error' && 'An error occurred during import'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {importStatus === 'importing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-600">
                    Fetching city pages and extracting company data...
                  </p>
                  <p className="text-xs text-slate-500">
                    This may take a few minutes depending on the number of companies
                  </p>
                </div>
              </div>
            )}

            {importStatus === 'success' && importResults && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Complete!</h3>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Companies Scraped:</span>
                    <span className="font-semibold text-slate-900">{importResults.scraped}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total in Database:</span>
                    <span className="font-semibold text-slate-900">{importResults.total_in_db}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Duplicates Removed:</span>
                    <span className="font-semibold text-red-600">{importResults.duplicates_deleted}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">Final Count:</span>
                    <span className="text-xl font-bold text-orange-600">{importResults.final_count}</span>
                  </div>
                </div>

                <Button onClick={closeImportModal} className="w-full bg-orange-600 hover:bg-orange-700">
                  Close
                </Button>
              </div>
            )}

            {importStatus === 'error' && importResults && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Failed</h3>
                  <p className="text-sm text-red-600">{importResults.error}</p>
                </div>

                <Button onClick={closeImportModal} variant="outline" className="w-full">
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}