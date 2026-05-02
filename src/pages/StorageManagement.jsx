import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Lightbulb, Package, QrCode, Download } from 'lucide-react';

const BEST_PRACTICES = [
  {
    title: 'Use Consistent Labeling',
    description: 'Create a labeling scheme you can remember. For example: "Garage > Shelf 2 > Bin A" or "Storage Unit > Back Wall > Red Box 3"'
  },
  {
    title: 'Group by Category',
    description: 'Organize items by type in bins (furniture, dishes, artwork, etc.) to make finding specific items faster'
  },
  {
    title: 'Photos & Inventory Lists',
    description: 'Consider taking photos of each bin or section. Update capacity notes as you add/remove items'
  },
  {
    title: 'Start Simple',
    description: 'You don\'t need every level of organization. A room with bins is often enough. Add more structure as needed'
  },
  {
    title: 'Make it Scannable',
    description: 'When you associate items with locations, you\'ll get QR codes for quick location lookup during sales'
  }
];

export default function StorageManagement() {
  const [locations, setLocations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    space_name: '',
    space_description: '',
    section_name: '',
    shelving_name: '',
    shelf_number: '',
    bin_box_label: '',
    capacity_notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const locationsData = await base44.entities.StorageLocation.filter({ operator_id: userData.id });
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLocationPath = (data) => {
    const parts = [data.space_name];
    if (data.section_name) parts.push(data.section_name);
    if (data.shelving_name) parts.push(data.shelving_name);
    if (data.shelf_number) parts.push(`Shelf ${data.shelf_number}`);
    parts.push(data.bin_box_label);
    return parts.join(' > ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const locationPath = generateLocationPath(formData);
    const payload = { ...formData, location_path: locationPath };

    try {
      if (editingLocation) {
        await base44.entities.StorageLocation.update(editingLocation.id, payload);
      } else {
        await base44.entities.StorageLocation.create({
          ...payload,
          operator_id: user.id
        });
      }
      setShowModal(false);
      setEditingLocation(null);
      setFormData({
        space_name: '',
        space_description: '',
        section_name: '',
        shelving_name: '',
        shelf_number: '',
        bin_box_label: '',
        capacity_notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      space_name: location.space_name || '',
      space_description: location.space_description || '',
      section_name: location.section_name || '',
      shelving_name: location.shelving_name || '',
      shelf_number: location.shelf_number || '',
      bin_box_label: location.bin_box_label || '',
      capacity_notes: location.capacity_notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this storage location?')) return;
    try {
      await base44.entities.StorageLocation.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    }
  };

  const generateAndPrintQR = async (location) => {
    try {
      // Generate QR code that links to ViewStorageContents with location ID
      const qrUrl = `${window.location.origin}/ViewStorageContents?location_id=${location.id}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print QR Code - ${location.space_name}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: white;
            }
            .container {
              text-align: center;
              border: 2px solid #333;
              padding: 30px;
              border-radius: 8px;
              background: white;
            }
            h2 {
              margin: 0 0 10px 0;
              font-size: 18px;
            }
            .location-path {
              font-size: 12px;
              color: #666;
              margin-bottom: 20px;
              font-weight: bold;
            }
            img {
              margin: 20px 0;
              border: 1px solid #ddd;
              padding: 10px;
              border-radius: 4px;
            }
            .instructions {
              font-size: 11px;
              color: #666;
              margin-top: 20px;
            }
            @media print {
              body {
                padding: 0;
              }
              .container {
                border: none;
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Location QR Code</h2>
            <div class="location-path">${location.location_path}</div>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="instructions">Scan this code to view items stored in this location</div>
          </div>
          <script>
            window.print();
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code');
    }
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
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Storage Space Management</h1>
          <p className="text-slate-600">Organize your inventory storage locations with flexible labeling</p>
        </div>
        <Button 
          onClick={() => {
            setEditingLocation(null);
            setFormData({
              space_name: '',
              space_description: '',
              section_name: '',
              shelving_name: '',
              shelf_number: '',
              bin_box_label: '',
              capacity_notes: ''
            });
            setShowModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Best Practices */}
      <Card className="bg-cyan-50 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-900">
            <Lightbulb className="w-5 h-5" />
            Labeling Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {BEST_PRACTICES.map((practice, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-cyan-200">
                <h4 className="font-semibold text-cyan-900 mb-1">{practice.title}</h4>
                <p className="text-sm text-cyan-700">{practice.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">No storage locations yet</p>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Location
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
          {locations.map(location => (
            <Card key={location.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-slate-900">{location.space_name}</CardTitle>
                    {location.space_description && (
                      <p className="text-xs text-slate-500 mt-1">{location.space_description}</p>
                    )}
                  </div>
                  {location.is_active && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Location Path */}
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Full Location</p>
                  <p className="text-sm font-medium text-slate-900 break-words">{location.location_path}</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 text-sm">
                  {location.section_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Section:</span>
                      <span className="font-medium text-slate-900">{location.section_name}</span>
                    </div>
                  )}
                  {location.shelving_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Shelving:</span>
                      <span className="font-medium text-slate-900">{location.shelving_name}</span>
                    </div>
                  )}
                  {location.shelf_number && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Shelf:</span>
                      <span className="font-medium text-slate-900">{location.shelf_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bin/Box:</span>
                    <span className="font-medium text-slate-900">{location.bin_box_label}</span>
                  </div>
                </div>

                {/* Capacity Notes */}
                {location.capacity_notes && (
                  <div className="p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700">
                    {location.capacity_notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(location)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-cyan-600 hover:bg-cyan-50"
                    onClick={() => generateAndPrintQR(location)}
                  >
                    <QrCode className="w-3 h-3 mr-1" />
                    QR Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-navy-900">
              {editingLocation ? 'Edit Storage Location' : 'Add Storage Location'}
            </DialogTitle>
            <p className="text-sm text-slate-600 mt-2">
              Fill in only what applies to your space. You can have just a room with bins, or add more organization levels.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {/* Space Name (Required) */}
            <div>
              <Label htmlFor="space_name" className="font-semibold">Space Name *</Label>
              <Input
                id="space_name"
                value={formData.space_name}
                onChange={(e) => setFormData({...formData, space_name: e.target.value})}
                placeholder="e.g., Garage, Basement, Storage Unit, Room 1"
                required
              />
              <p className="text-xs text-slate-500 mt-1">The main area where items are stored</p>
            </div>

            {/* Space Description */}
            <div>
              <Label htmlFor="space_description">Space Description</Label>
              <Input
                id="space_description"
                value={formData.space_description}
                onChange={(e) => setFormData({...formData, space_description: e.target.value})}
                placeholder="e.g., Two-car garage with metal racks"
              />
            </div>

            {/* Optional Tiers */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-4">Optional Organization Levels</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="section_name">Section</Label>
                  <Input
                    id="section_name"
                    value={formData.section_name}
                    onChange={(e) => setFormData({...formData, section_name: e.target.value})}
                    placeholder="e.g., Back Wall, Corner, Left Side"
                  />
                </div>

                <div>
                  <Label htmlFor="shelving_name">Shelving Unit</Label>
                  <Input
                    id="shelving_name"
                    value={formData.shelving_name}
                    onChange={(e) => setFormData({...formData, shelving_name: e.target.value})}
                    placeholder="e.g., Metal Rack A, Cabinet 1"
                  />
                </div>

                <div>
                  <Label htmlFor="shelf_number">Shelf Number</Label>
                  <Input
                    id="shelf_number"
                    value={formData.shelf_number}
                    onChange={(e) => setFormData({...formData, shelf_number: e.target.value})}
                    placeholder="e.g., 1, 2, Top, A, B"
                  />
                </div>
              </div>
            </div>

            {/* Bin/Box Label (Required) */}
            <div>
              <Label htmlFor="bin_box_label" className="font-semibold">Bin/Box Label *</Label>
              <Input
                id="bin_box_label"
                value={formData.bin_box_label}
                onChange={(e) => setFormData({...formData, bin_box_label: e.target.value})}
                placeholder="e.g., A1, Box 1, Red Bin, Plastic Container"
                required
              />
              <p className="text-xs text-slate-500 mt-1">The specific bin, box, or container identifier</p>
            </div>

            {/* Capacity Notes */}
            <div>
              <Label htmlFor="capacity_notes">Capacity Notes</Label>
              <Textarea
                id="capacity_notes"
                value={formData.capacity_notes}
                onChange={(e) => setFormData({...formData, capacity_notes: e.target.value})}
                placeholder="e.g., Holds small items, mostly full, for fragile items only"
                rows={2}
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Location Path Preview</p>
              <p className="text-sm font-medium text-slate-900 break-words">{generateLocationPath(formData) || 'Your location path will appear here'}</p>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
                {editingLocation ? 'Update Location' : 'Add Location'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}