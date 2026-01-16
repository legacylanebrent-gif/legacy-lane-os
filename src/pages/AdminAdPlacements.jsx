import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import AdPlacementModal from '@/components/admin/AdPlacementModal';

export default function AdminAdPlacements() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);

  useEffect(() => {
    loadPlacements();
  }, []);

  const loadPlacements = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AdPlacement.list();
      setPlacements(data || []);
    } catch (error) {
      console.error('Error loading placements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (placement = null) => {
    setSelectedPlacement(placement);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    loadPlacements();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this placement?')) return;

    try {
      await base44.entities.AdPlacement.delete(id);
      loadPlacements();
    } catch (error) {
      console.error('Error deleting placement:', error);
      alert('Failed to delete placement');
    }
  };

  const nationalCount = placements.filter(p => p.placement_type === 'national' && p.is_active).length;
  const localCount = placements.filter(p => p.placement_type === 'local' && p.is_active).length;

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
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Ad Placements</h1>
          <p className="text-slate-600">Manage national and local advertising placements</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Placement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Active</p>
                <p className="text-3xl font-bold">{placements.filter(p => p.is_active).length}</p>
              </div>
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">National Placements</p>
              <p className="text-3xl font-bold text-purple-600">{nationalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Local Placements</p>
              <p className="text-3xl font-bold text-cyan-600">{localCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">National Placements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {placements.filter(p => p.placement_type === 'national').map(placement => (
            <Card key={placement.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{placement.company_name}</CardTitle>
                    {placement.description && <p className="text-sm text-slate-600 mt-1">{placement.description}</p>}
                  </div>
                  <Badge className={placement.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                    {placement.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {placement.logo_url && (
                  <img src={placement.logo_url} alt={placement.company_name} className="h-12 object-contain mb-4" />
                )}
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  {placement.start_date && <p>Start: {new Date(placement.start_date).toLocaleDateString()}</p>}
                  {placement.end_date && <p>End: {new Date(placement.end_date).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenModal(placement)}>
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(placement.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {placements.filter(p => p.placement_type === 'national').length === 0 && (
          <p className="text-slate-500">No national placements yet</p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Local Placements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {placements.filter(p => p.placement_type === 'local').map(placement => (
            <Card key={placement.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{placement.company_name}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Zip: {placement.zip_code} • {placement.radius_miles} miles
                    </p>
                  </div>
                  <Badge className={placement.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                    {placement.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {placement.logo_url && (
                  <img src={placement.logo_url} alt={placement.company_name} className="h-12 object-contain mb-4" />
                )}
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  {placement.start_date && <p>Start: {new Date(placement.start_date).toLocaleDateString()}</p>}
                  {placement.end_date && <p>End: {new Date(placement.end_date).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenModal(placement)}>
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(placement.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {placements.filter(p => p.placement_type === 'local').length === 0 && (
          <p className="text-slate-500">No local placements yet</p>
        )}
      </div>

      <AdPlacementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} placement={selectedPlacement} />
    </div>
  );
}