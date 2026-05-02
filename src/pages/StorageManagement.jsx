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
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    space_name: '',
    space_description: ''
  });
  const [wizardStep, setWizardStep] = useState('shelving_choice');
  const [wizardData, setWizardData] = useState({
    hasShelving: null,
    shelvingUnits: [],
    currentUnit: 0,
    currentWall: '',
    shelvesPerUnit: 1,
    bins: []
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
    
    try {
      if (editingLocation) {
        await base44.entities.StorageLocation.update(editingLocation.id, formData);
      } else {
        await base44.entities.StorageLocation.create({
          ...formData,
          operator_id: user.id
        });
      }
      setShowModal(false);
      setEditingLocation(null);
      setFormData({
        space_name: '',
        space_description: ''
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
      space_description: location.space_description || ''
    });
    setShowModal(true);
  };

  const handleCustomize = (location) => {
    setEditingLocation(location);
    setWizardStep('shelving_choice');
    setWizardData({
      hasShelving: null,
      shelvingUnits: [],
      currentUnit: 0,
      currentWall: '',
      shelvesPerUnit: 1,
      bins: []
    });
    setShowCustomizeModal(true);
  };

  const handleWizardNext = () => {
    if (wizardStep === 'shelving_choice') {
      if (wizardData.hasShelving) {
        setWizardStep('shelving_count');
      } else {
        setWizardStep('bins');
      }
    } else if (wizardStep === 'shelving_count') {
      const units = Array.from({ length: wizardData.shelvingUnits.length }, (_, i) => ({
        id: i,
        name: `Shelving Unit ${i + 1}`,
        wall: '',
        shelves: 1
      }));
      setWizardData(prev => ({ ...prev, shelvingUnits: units, currentUnit: 0 }));
      setWizardStep('wall_selection');
    } else if (wizardStep === 'wall_selection') {
      if (wizardData.currentUnit < wizardData.shelvingUnits.length - 1) {
        setWizardData(prev => ({ ...prev, currentUnit: prev.currentUnit + 1 }));
      } else {
        setWizardStep('shelf_count');
        setWizardData(prev => ({ ...prev, currentUnit: 0 }));
      }
    } else if (wizardStep === 'shelf_count') {
      if (wizardData.currentUnit < wizardData.shelvingUnits.length - 1) {
        setWizardData(prev => ({ ...prev, currentUnit: prev.currentUnit + 1 }));
      } else {
        setWizardStep('bins');
      }
    }
  };

  const handleWizardComplete = async () => {
    try {
      const baseData = {
        space_name: editingLocation.space_name,
        space_description: editingLocation.space_description
      };

      if (wizardData.hasShelving) {
        // Create entries for each unit > wall > shelf > bin combination
        for (const unit of wizardData.shelvingUnits) {
          for (let shelfNum = 1; shelfNum <= unit.shelves; shelfNum++) {
            for (let binNum = 1; binNum <= 3; binNum++) { // Default 3 bins per shelf
              const binLabel = `${unit.name} - Shelf ${shelfNum} - Bin ${binNum}`;
              const locationPath = `${baseData.space_name} > ${unit.name} > ${unit.wall} > Shelf ${shelfNum} > Bin ${binNum}`;
              
              await base44.entities.StorageLocation.create({
                ...baseData,
                operator_id: user.id,
                shelving_name: unit.name,
                shelf_number: shelfNum,
                section_name: unit.wall,
                bin_box_label: binLabel,
                location_path: locationPath,
                is_active: true
              });
            }
          }
        }
      } else {
        // Create simple bins without shelving
        for (let i = 1; i <= 5; i++) {
          const binLabel = `Bin ${i}`;
          const locationPath = `${baseData.space_name} > ${binLabel}`;
          
          await base44.entities.StorageLocation.create({
            ...baseData,
            operator_id: user.id,
            bin_box_label: binLabel,
            location_path: locationPath,
            is_active: true
          });
        }
      }

      // Delete the original placeholder location if it has no bin_box_label
      if (!editingLocation.bin_box_label) {
        await base44.entities.StorageLocation.delete(editingLocation.id);
      }

      setShowCustomizeModal(false);
      loadData();
    } catch (error) {
      console.error('Error completing wizard:', error);
      alert('Failed to create storage structure');
    }
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
              space_description: ''
            });
            setShowModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Space
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
            Create Your First Space
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
                    Edit Space
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-purple-600 hover:bg-purple-50"
                    onClick={() => handleCustomize(location)}
                  >
                    <Lightbulb className="w-3 h-3 mr-1" />
                    Customize
                  </Button>
                  {location.bin_box_label && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-cyan-600 hover:bg-cyan-50"
                      onClick={() => generateAndPrintQR(location)}
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      QR Code
                    </Button>
                  )}
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

      {/* Create/Edit Space Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-2xl font-serif text-navy-900">
              {editingLocation ? 'Edit Space' : 'Create New Space'}
            </DialogTitle>
            <p className="text-sm text-slate-600 mt-2">
              Start by naming your storage space. You can customize the organization structure next.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 flex-1">
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

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
                {editingLocation ? 'Update Space' : 'Create Space'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customize Space Wizard Modal */}
      <Dialog open={showCustomizeModal} onOpenChange={setShowCustomizeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-2xl font-serif text-navy-900">
              Organize {editingLocation?.space_name}
            </DialogTitle>
            <p className="text-sm text-slate-600 mt-2">
              Let's set up your storage structure step by step.
            </p>
          </DialogHeader>

          <div className="overflow-y-auto pr-2 flex-1 space-y-6">
            {/* Step 1: Shelving Choice */}
            {wizardStep === 'shelving_choice' && (
              <div className="space-y-4 border-t pt-4">
                <p className="font-semibold text-slate-700">Does this space have shelving units?</p>
                <div className="flex gap-3">
                  <Button
                    variant={wizardData.hasShelving === true ? 'default' : 'outline'}
                    onClick={() => setWizardData({...wizardData, hasShelving: true})}
                    className="flex-1"
                  >
                    Yes, it has shelving
                  </Button>
                  <Button
                    variant={wizardData.hasShelving === false ? 'default' : 'outline'}
                    onClick={() => setWizardData({...wizardData, hasShelving: false})}
                    className="flex-1"
                  >
                    No, just loose bins
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Shelving Count */}
            {wizardStep === 'shelving_count' && (
              <div className="space-y-4 border-t pt-4">
                <p className="font-semibold text-slate-700">How many shelving units do you have?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <Button
                      key={num}
                      variant={wizardData.shelvingUnits.length === num ? 'default' : 'outline'}
                      onClick={() => setWizardData({...wizardData, shelvingUnits: Array(num).fill(null)})}
                      className="flex-1"
                    >
                      {num}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setWizardData({...wizardData, shelvingUnits: Array(6).fill(null)})}
                    className="flex-1"
                  >
                    6+
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Wall Selection */}
            {wizardStep === 'wall_selection' && (
              <div className="space-y-4 border-t pt-4">
                <p className="font-semibold text-slate-700">
                  Which wall is "Shelving Unit {wizardData.currentUnit + 1}" on?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Back Wall', 'Left Wall', 'Right Wall', 'Front Wall', 'Corner'].map(wall => (
                    <Button
                      key={wall}
                      variant={wizardData.shelvingUnits[wizardData.currentUnit]?.wall === wall ? 'default' : 'outline'}
                      onClick={() => {
                        const units = [...wizardData.shelvingUnits];
                        units[wizardData.currentUnit] = {...units[wizardData.currentUnit], wall};
                        setWizardData({...wizardData, shelvingUnits: units});
                      }}
                    >
                      {wall}
                    </Button>
                  ))}
                </div>
                <div>
                  <Label htmlFor="custom_wall">Or type custom wall name:</Label>
                  <Input
                    id="custom_wall"
                    placeholder="e.g., Section A"
                    value={wizardData.shelvingUnits[wizardData.currentUnit]?.wall || ''}
                    onChange={(e) => {
                      const units = [...wizardData.shelvingUnits];
                      units[wizardData.currentUnit] = {...units[wizardData.currentUnit], wall: e.target.value};
                      setWizardData({...wizardData, shelvingUnits: units});
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Shelf Count per Unit */}
            {wizardStep === 'shelf_count' && (
              <div className="space-y-4 border-t pt-4">
                <p className="font-semibold text-slate-700">
                  How many shelves in "Shelving Unit {wizardData.currentUnit + 1}"?
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <Button
                      key={num}
                      variant={wizardData.shelvingUnits[wizardData.currentUnit]?.shelves === num ? 'default' : 'outline'}
                      onClick={() => {
                        const units = [...wizardData.shelvingUnits];
                        units[wizardData.currentUnit] = {...units[wizardData.currentUnit], shelves: num};
                        setWizardData({...wizardData, shelvingUnits: units});
                      }}
                      className="flex-1"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Bins Overview */}
            {wizardStep === 'bins' && (
              <div className="space-y-4 border-t pt-4">
                <p className="font-semibold text-slate-700">Storage Structure Summary</p>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-sm"><strong>Space:</strong> {editingLocation?.space_name}</p>
                  {wizardData.hasShelving ? (
                    <>
                      <p className="text-sm"><strong>Shelving Units:</strong> {wizardData.shelvingUnits.length}</p>
                      {wizardData.shelvingUnits.map((unit, idx) => (
                        <p key={idx} className="text-xs text-slate-600 ml-4">
                          Unit {idx + 1}: {unit.wall} ({unit.shelves} shelves, ~{unit.shelves * 3} bins)
                        </p>
                      ))}
                      <p className="text-sm text-orange-600 font-semibold mt-2">
                        Total: ~{wizardData.shelvingUnits.reduce((sum, u) => sum + (u.shelves * 3), 0)} storage locations
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">5 loose bins will be created</p>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  Click "Create Structure" to generate all storage locations. You can add more manually afterward.
                </p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (wizardStep === 'shelving_choice') {
                  setShowCustomizeModal(false);
                } else if (wizardStep === 'shelving_count') {
                  setWizardStep('shelving_choice');
                } else if (wizardStep === 'wall_selection') {
                  setWizardStep('shelving_count');
                } else if (wizardStep === 'shelf_count') {
                  setWizardStep('wall_selection');
                } else {
                  setWizardStep('shelf_count');
                }
              }}
            >
              Back
            </Button>
            {wizardStep !== 'bins' ? (
              <Button 
                type="button"
                onClick={handleWizardNext}
                disabled={
                  (wizardStep === 'shelving_choice' && wizardData.hasShelving === null) ||
                  (wizardStep === 'shelving_count' && wizardData.shelvingUnits.length === 0) ||
                  (wizardStep === 'wall_selection' && !wizardData.shelvingUnits[wizardData.currentUnit]?.wall)
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={handleWizardComplete}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Create Structure
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}