import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Heart, Share2, MapPin, Calendar, Tag, Package,
  Image as ImageIcon, ShoppingBag, Phone, Mail, ExternalLink, Edit, Save, X, MessageSquare
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import MessageModal from '@/components/messaging/MessageModal';
import { format } from 'date-fns';

export default function ItemDetail() {
  const [item, setItem] = useState(null);
  const [sale, setSale] = useState(null);
  const [operator, setOperator] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedItems, setRelatedItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', price: 0 });
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const itemId = params.get('itemId');
      
      console.log('ItemDetail - Loading item:', itemId);
      
      if (!itemId) {
        console.error('ItemDetail - No item ID provided');
        setLoading(false);
        return;
      }

      // Load current user
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        console.log('ItemDetail - User loaded:', user?.id);
      } catch (error) {
        console.log('ItemDetail - User not logged in');
      }

      console.log('ItemDetail - Fetching item data...');
      const itemData = await base44.entities.Item.filter({ id: itemId });
      console.log('ItemDetail - Item data received:', itemData);
      
      if (itemData.length === 0) {
        console.error('ItemDetail - Item not found');
        setLoading(false);
        return;
      }

      const itemRecord = itemData[0];
      setItem(itemRecord);
      setEditForm({
        title: itemRecord.title || '',
        description: itemRecord.description || '',
        price: itemRecord.price || 0
      });

      // Increment view count
      try {
        await base44.entities.Item.update(itemId, {
          views: (itemRecord.views || 0) + 1
        });
      } catch (error) {
        console.log('ItemDetail - Could not update view count:', error);
      }

      // Load sale details
      if (itemRecord.estate_sale_id) {
        console.log('ItemDetail - Loading sale:', itemRecord.estate_sale_id);
        const saleData = await base44.entities.EstateSale.filter({ 
          id: itemRecord.estate_sale_id 
        });
        if (saleData.length > 0) {
          setSale(saleData[0]);
          
          // Load operator
          if (saleData[0].operator_id) {
            try {
              const operatorData = await base44.entities.User.filter({ 
                id: saleData[0].operator_id 
              });
              if (operatorData.length > 0) {
                setOperator(operatorData[0]);
              }
            } catch (error) {
              console.log('ItemDetail - Could not load operator:', error);
            }
          }

          // Load related items from same sale
          try {
            const allItems = await base44.entities.Item.filter({
              estate_sale_id: itemRecord.estate_sale_id,
              status: ['available', 'pending', 'reserved']
            }, '-created_date', 8);
            
            setRelatedItems(allItems.filter(i => i.id !== itemId).slice(0, 4));
          } catch (error) {
            console.log('ItemDetail - Could not load related items:', error);
          }
        }
      }
      
      console.log('ItemDetail - Data loading complete');
    } catch (error) {
      console.error('ItemDetail - Error loading data:', error);
      alert('Error loading item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: `Check out ${item.title} - $${item.price}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await base44.entities.Item.update(item.id, {
        title: editForm.title,
        description: editForm.description,
        price: parseFloat(editForm.price)
      });
      setItem({ ...item, ...editForm, price: parseFloat(editForm.price) });
      setIsEditing(false);
      alert('Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const isOperator = currentUser && sale && currentUser.id === sale.operator_id;

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      reserved: 'bg-blue-100 text-blue-700',
      sold: 'bg-slate-100 text-slate-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded w-1/3"></div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-96 bg-slate-200 rounded"></div>
              <div className="h-96 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-8">
        <Card className="p-12 text-center">
          <p className="text-slate-600 text-lg mb-4">Item not found</p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-orange-600 hover:bg-orange-700">
              Browse All Sales
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to={sale ? createPageUrl('SaleLanding') + '?saleId=' + sale.id : createPageUrl('Home')} 
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {sale ? 'Sale Items' : 'Home'}
            </Link>
            
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative h-96 md:h-[500px] bg-slate-100">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[selectedImageIndex]}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-24 h-24 text-slate-300" />
                  </div>
                )}
                <Badge className={`absolute top-4 left-4 ${getStatusColor(item.status)}`}>
                  {item.status}
                </Badge>
              </div>
            </Card>
            
            {/* Thumbnail Gallery */}
            {item.images && item.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx 
                        ? 'border-orange-600 ring-2 ring-orange-200' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${item.title} ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {isOperator && (
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-slate-700">You're the operator</span>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} size="sm" className="bg-orange-600 hover:bg-orange-700">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Item
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div>
              {isEditing ? (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label>Item Title *</Label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Item title"
                      />
                    </div>
                    <div>
                      <Label>Price *</Label>
                      <Input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Item description"
                        rows={6}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4">
                    {item.title}
                  </h1>
                  
                  <div className="flex items-center gap-4 mb-6">
                    {item.category && (
                      <Badge variant="outline" className="text-sm">
                        <Tag className="w-3 h-3 mr-1" />
                        {item.category}
                      </Badge>
                    )}
                    {item.condition && (
                      <Badge variant="outline" className="text-sm">
                        <Package className="w-3 h-3 mr-1" />
                        {item.condition}
                      </Badge>
                    )}
                  </div>

                  <div className="text-5xl font-bold text-cyan-600 mb-6">
                    ${item.price?.toLocaleString()}
                  </div>
                </>
              )}
            </div>

            {!isEditing && item.description && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Description</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sale Information */}
            {sale && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Estate Sale Information</h3>
                  
                  <div className="space-y-3">
                    <Link 
                      to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                      className="flex items-start gap-3 text-cyan-600 hover:text-cyan-700 group"
                    >
                      <ShoppingBag className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold group-hover:underline">{sale.title}</div>
                        <div className="text-sm text-slate-600">View full sale details</div>
                      </div>
                    </Link>

                    {sale.property_address && (
                      <div className="flex items-start gap-3 text-slate-700">
                        <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Location</div>
                          <div className="text-sm text-slate-600">
                            {sale.property_address.street && `${sale.property_address.street}, `}
                            {sale.property_address.city}, {sale.property_address.state} {sale.property_address.zip}
                          </div>
                        </div>
                      </div>
                    )}

                    {sale.sale_dates && sale.sale_dates.length > 0 && (
                      <div className="flex items-start gap-3 text-slate-700">
                        <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Sale Dates</div>
                          <div className="text-sm text-slate-600">
                            {format(new Date(sale.sale_dates[0].date), 'MMMM d, yyyy')}
                            {sale.sale_dates[0].start_time && 
                              <> • {sale.sale_dates[0].start_time} - {sale.sale_dates[0].end_time}</>
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Seller */}
            {operator && (
              <Card className="bg-gradient-to-br from-orange-50 to-cyan-50 border-2 border-orange-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Interested in this item?</h3>
                  
                  <div className="space-y-3">
                    {currentUser ? (
                      <Button
                        onClick={() => setMessageModalOpen(true)}
                        className="w-full bg-orange-600 hover:bg-orange-700 h-12 gap-2"
                      >
                        <MessageSquare className="w-5 h-5" />
                        Message Seller
                      </Button>
                    ) : (
                      <Button
                        onClick={() => base44.auth.redirectToLogin(window.location.href)}
                        className="w-full bg-orange-600 hover:bg-orange-700 h-12"
                      >
                        Sign In to Message
                      </Button>
                    )}

                    {operator.phone && (
                      <Button variant="outline" className="w-full justify-start h-12" asChild>
                        <a href={`tel:${operator.phone}`}>
                          <Phone className="w-4 h-4 mr-2" />
                          {operator.phone}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Related Items */}
        {relatedItems.length > 0 && (
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-6">
              More from this Sale
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedItems.map(relatedItem => (
                <Link
                  key={relatedItem.id}
                  to={createPageUrl('ItemDetail') + '?itemId=' + relatedItem.id}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      {relatedItem.images && relatedItem.images.length > 0 ? (
                        <img
                          src={relatedItem.images[0]}
                          alt={relatedItem.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {relatedItem.title}
                      </h3>
                      <div className="text-xl font-bold text-cyan-600">
                        ${relatedItem.price?.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {currentUser && operator && (
        <MessageModal
          open={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          recipient={operator}
          relatedEntity={{ type: 'Item', id: item.id, title: item.title }}
        />
      )}
    </div>
  );
}