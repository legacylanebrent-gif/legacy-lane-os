import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Wrench, PackageCheck } from 'lucide-react';
import AssetModal from '@/components/equipment/AssetModal';
import KitEditor from '@/components/equipment/KitEditor';
import { asList } from '@/components/equipment/equipmentModel';

const STATUS_STYLES = {
  AVAILABLE: 'bg-green-100 text-green-700',
  AT_SALE: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
  RETIRED: 'bg-slate-200 text-slate-600',
};

// Chapter 8 P1 — operator-level EQUIPMENT & KIT: reusable company EquipmentAssets
// plus the standard Sale Kit. Private business information (operator/admin only by RLS).
export default function EquipmentManager() {
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      setAssets(asList(await base44.entities.EquipmentAsset.filter({ operator_id: me.id }, { sort: 'category' })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const removeAsset = async (asset) => {
    if (!window.confirm(`Delete "${asset.name}" from company equipment? Assignment history keeps its own record.`)) return;
    try {
      await base44.entities.EquipmentAsset.delete(asset.id);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div><div className="h-64 bg-slate-200 rounded"></div></div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <Wrench className="w-7 h-7 text-orange-600" />Equipment & Sale Kit
        </h1>
        <p className="text-slate-600 mt-1">Reusable company equipment and what your team normally takes to a sale.</p>
      </div>

      <Tabs defaultValue="assets">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="assets">Equipment Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="kit">Standard Sale Kit</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-1" />Add Equipment
            </Button>
          </div>
          {assets.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-500">
              <PackageCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>No company equipment recorded yet. Add tables, racks, checkout devices, signs and cords.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {assets.map(a => (
                <Card key={a.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900 break-words">{a.name}</span>
                      <Badge className={STATUS_STYLES[a.status] || ''}>{a.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{a.category}</Badge>
                      {a.condition && <Badge variant="outline">{a.condition}</Badge>}
                    </div>
                    {(a.purchase_cost || a.purchase_date) && (
                      <p className="text-xs text-slate-500">
                        {a.purchase_cost ? `Cost: $${a.purchase_cost}` : ''}{a.purchase_cost && a.purchase_date ? ' · ' : ''}{a.purchase_date ? `Purchased: ${a.purchase_date}` : ''}
                        {a.replacement_target ? ` · Replace by: ${a.replacement_target}` : ''}
                      </p>
                    )}
                    {a.notes && <p className="text-xs text-slate-500">{a.notes}</p>}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(a); setModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => removeAsset(a)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kit" className="mt-4">
          <KitEditor operatorId={user?.id} assets={assets} />
        </TabsContent>
      </Tabs>

      <AssetModal
        open={modalOpen}
        asset={editing}
        operatorId={user?.id}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}