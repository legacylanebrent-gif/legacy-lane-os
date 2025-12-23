import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Settings, Plus, Edit, Trash2, Star, Save, ExternalLink } from 'lucide-react';

export default function AdminAmazonProducts() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [productForm, setProductForm] = useState({
    product_name: '',
    description: '',
    category: '',
    amazon_asin: '',
    affiliate_link: '',
    image_url: '',
    price: '',
    is_featured: false,
    sort_order: 0
  });

  const [settingsForm, setSettingsForm] = useState({
    affiliate_tag: '',
    access_key: '',
    secret_key: '',
    associate_id: '',
    marketplace: 'US',
    api_endpoint: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, settingsData] = await Promise.all([
        base44.entities.AmazonProduct.list('-sort_order'),
        base44.entities.AmazonSettings.list()
      ]);
      setProducts(productsData);
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
        setSettingsForm({
          affiliate_tag: settingsData[0].affiliate_tag || '',
          access_key: settingsData[0].access_key || '',
          secret_key: settingsData[0].secret_key || '',
          associate_id: settingsData[0].associate_id || '',
          marketplace: settingsData[0].marketplace || 'US',
          api_endpoint: settingsData[0].api_endpoint || '',
          is_active: settingsData[0].is_active !== false
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    try {
      const data = {
        ...productForm,
        price: productForm.price ? parseFloat(productForm.price) : null,
        sort_order: parseInt(productForm.sort_order) || 0
      };

      if (editingProduct) {
        await base44.entities.AmazonProduct.update(editingProduct.id, data);
      } else {
        await base44.entities.AmazonProduct.create(data);
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        product_name: '',
        description: '',
        category: '',
        amazon_asin: '',
        affiliate_link: '',
        image_url: '',
        price: '',
        is_featured: false,
        sort_order: 0
      });
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      product_name: product.product_name,
      description: product.description || '',
      category: product.category,
      amazon_asin: product.amazon_asin || '',
      affiliate_link: product.affiliate_link || '',
      image_url: product.image_url || '',
      price: product.price || '',
      is_featured: product.is_featured || false,
      sort_order: product.sort_order || 0
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await base44.entities.AmazonProduct.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const data = {
        setting_key: 'amazon_api',
        ...settingsForm
      };

      if (settings) {
        await base44.entities.AmazonSettings.update(settings.id, data);
      } else {
        await base44.entities.AmazonSettings.create(data);
      }

      setShowSettingsModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      pricing_tools: 'Pricing Tools',
      display_supplies: 'Display Supplies',
      signage: 'Signage',
      payment_processing: 'Payment Processing',
      security: 'Security',
      packing_materials: 'Packing Materials',
      cleaning_supplies: 'Cleaning Supplies',
      equipment: 'Equipment',
      other: 'Other'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Amazon Products</h1>
          <p className="text-slate-600">Manage affiliate product recommendations for estate sale operators</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowSettingsModal(true)}
            variant="outline"
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Amazon API Settings
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setProductForm({
                product_name: '',
                description: '',
                category: '',
                amazon_asin: '',
                affiliate_link: '',
                image_url: '',
                price: '',
                is_featured: false,
                sort_order: 0
              });
              setShowProductModal(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Settings Status */}
      {settings && (
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-cyan-50 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-cyan-600" />
                <div>
                  <p className="font-semibold text-slate-900">Amazon Integration Active</p>
                  <p className="text-sm text-slate-600">
                    Affiliate Tag: {settings.affiliate_tag || 'Not set'} • 
                    Marketplace: {settings.marketplace}
                  </p>
                </div>
              </div>
              <Badge className={settings.is_active ? 'bg-green-600' : 'bg-slate-400'}>
                {settings.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <Card key={product.id} className="overflow-hidden">
            {product.image_url && (
              <div className="h-48 bg-slate-100">
                <img
                  src={product.image_url}
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{product.product_name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(product.category)}
                  </Badge>
                </div>
                {product.is_featured && (
                  <Star className="w-5 h-5 text-orange-600 fill-orange-600" />
                )}
              </div>

              {product.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}

              {product.price && (
                <p className="text-lg font-bold text-slate-900 mb-3">
                  ${product.price.toFixed(2)}
                </p>
              )}

              {product.amazon_asin && (
                <div className="text-xs text-slate-500 mb-3">
                  ASIN: {product.amazon_asin}
                </div>
              )}

              {product.affiliate_link && (
                <a
                  href={product.affiliate_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1 mb-3"
                >
                  View on Amazon
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditProduct(product)}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteProduct(product.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">No products added yet</p>
          <Button onClick={() => setShowProductModal(true)} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Product
          </Button>
        </Card>
      )}

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={productForm.product_name}
                onChange={(e) => setProductForm({...productForm, product_name: e.target.value})}
                placeholder="Price Tag Gun"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                placeholder="Describe the product and why it's useful..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={productForm.category} onValueChange={(value) => setProductForm({...productForm, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pricing_tools">Pricing Tools</SelectItem>
                    <SelectItem value="display_supplies">Display Supplies</SelectItem>
                    <SelectItem value="signage">Signage</SelectItem>
                    <SelectItem value="payment_processing">Payment Processing</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="packing_materials">Packing Materials</SelectItem>
                    <SelectItem value="cleaning_supplies">Cleaning Supplies</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  placeholder="29.99"
                />
              </div>
            </div>

            <div>
              <Label>Amazon ASIN</Label>
              <Input
                value={productForm.amazon_asin}
                onChange={(e) => setProductForm({...productForm, amazon_asin: e.target.value})}
                placeholder="B07X1234AB"
              />
            </div>

            <div>
              <Label>Affiliate Link</Label>
              <Input
                value={productForm.affiliate_link}
                onChange={(e) => setProductForm({...productForm, affiliate_link: e.target.value})}
                placeholder="https://amazon.com/dp/B07X1234AB?tag=your-tag-20"
              />
            </div>

            <div>
              <Label>Image URL</Label>
              <Input
                value={productForm.image_url}
                onChange={(e) => setProductForm({...productForm, image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={productForm.sort_order}
                  onChange={(e) => setProductForm({...productForm, sort_order: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={productForm.is_featured}
                  onChange={(e) => setProductForm({...productForm, is_featured: e.target.checked})}
                  className="w-4 h-4 text-cyan-600 border-slate-300 rounded"
                />
                <Label htmlFor="is_featured" className="cursor-pointer">Featured Product</Label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowProductModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProduct}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                disabled={!productForm.product_name || !productForm.category}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Amazon API Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Affiliate Tag / Tracking ID *</Label>
              <Input
                value={settingsForm.affiliate_tag}
                onChange={(e) => setSettingsForm({...settingsForm, affiliate_tag: e.target.value})}
                placeholder="yoursite-20"
              />
              <p className="text-xs text-slate-500 mt-1">Your Amazon Associates tracking ID</p>
            </div>

            <div>
              <Label>Associate ID</Label>
              <Input
                value={settingsForm.associate_id}
                onChange={(e) => setSettingsForm({...settingsForm, associate_id: e.target.value})}
                placeholder="yoursite-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Access Key</Label>
                <Input
                  type="password"
                  value={settingsForm.access_key}
                  onChange={(e) => setSettingsForm({...settingsForm, access_key: e.target.value})}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>

              <div>
                <Label>Secret Key</Label>
                <Input
                  type="password"
                  value={settingsForm.secret_key}
                  onChange={(e) => setSettingsForm({...settingsForm, secret_key: e.target.value})}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </div>
            </div>

            <div>
              <Label>Marketplace</Label>
              <Select value={settingsForm.marketplace} onValueChange={(value) => setSettingsForm({...settingsForm, marketplace: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="IT">Italy</SelectItem>
                  <SelectItem value="ES">Spain</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>API Endpoint</Label>
              <Input
                value={settingsForm.api_endpoint}
                onChange={(e) => setSettingsForm({...settingsForm, api_endpoint: e.target.value})}
                placeholder="https://webservices.amazon.com/paapi5/..."
              />
              <p className="text-xs text-slate-500 mt-1">Product Advertising API endpoint</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={settingsForm.is_active}
                onChange={(e) => setSettingsForm({...settingsForm, is_active: e.target.checked})}
                className="w-4 h-4 text-cyan-600 border-slate-300 rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Integration Active</Label>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowSettingsModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}