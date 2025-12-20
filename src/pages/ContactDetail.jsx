import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Phone, Mail, MapPin, Calendar, Edit, Plus } from 'lucide-react';
import ActivityTimeline from '@/components/crm/ActivityTimeline';

export default function ContactDetail() {
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [deals, setDeals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContact();
  }, []);

  const loadContact = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const contactId = params.get('id');

      const allContacts = await base44.entities.Contact.list();
      const contactData = allContacts.find(c => c.id === contactId);
      
      if (!contactData) {
        navigate(createPageUrl('CRM'));
        return;
      }

      setContact(contactData);

      const [dealData, activityData, propertyData] = await Promise.all([
        base44.entities.Deal.filter({ contact_id: contactId }),
        base44.entities.Activity.filter({ contact_id: contactId }, '-created_date'),
        contactData.properties ? Promise.all(
          contactData.properties.map(async (propId) => {
            const allProps = await base44.entities.Property.list();
            return allProps.find(p => p.id === propId);
          })
        ) : Promise.resolve([])
      ]);

      setDeals(dealData);
      setActivities(activityData);
      setProperties(propertyData.filter(p => p));
    } catch (error) {
      console.error('Error loading contact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !contact) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('CRM'))}
          className="mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to CRM
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-navy-900 mb-1">
                      {contact.first_name} {contact.last_name}
                    </h1>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contact.roles?.map(role => (
                        <Badge key={role} variant="outline" className="capitalize">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  
                  {contact.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}

                  {contact.address?.city && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        {contact.address.city}, {contact.address.state}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                  <div>
                    <p className="text-sm text-slate-500">Lead Score</p>
                    <p className="text-2xl font-bold text-navy-900">{contact.score || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Lifetime Value</p>
                    <p className="text-2xl font-bold text-navy-900">
                      ${contact.lifetime_value?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                {contact.situation && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm text-slate-500 mb-1">Situation</p>
                    <Badge className="capitalize bg-amber-100 text-amber-800">
                      {contact.situation}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="activity">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="deals">Deals ({activeDeals.length})</TabsTrigger>
                <TabsTrigger value="properties">Properties ({properties.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Activity Timeline</CardTitle>
                      <Button size="sm" className="bg-gold-600 hover:bg-gold-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Log Activity
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ActivityTimeline activities={activities} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deals" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Deals</CardTitle>
                      <Button size="sm" className="bg-gold-600 hover:bg-gold-700">
                        <Plus className="w-4 h-4 mr-2" />
                        New Deal
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {deals.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No deals yet</p>
                    ) : (
                      <div className="space-y-4">
                        {deals.map(deal => (
                          <div key={deal.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold text-navy-900">{deal.name}</h3>
                              <p className="text-sm text-slate-500 capitalize">{deal.deal_type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gold-600">
                                ${deal.value?.toLocaleString() || 0}
                              </p>
                              <Badge className="capitalize">{deal.stage}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="properties" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {properties.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No properties linked</p>
                    ) : (
                      <div className="space-y-4">
                        {properties.map(property => (
                          <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold text-navy-900">
                                {property.address?.formatted_address || property.address?.street}
                              </h3>
                              <Badge className="capitalize mt-1">{property.status}</Badge>
                            </div>
                            {property.estimated_value && (
                              <p className="text-lg font-bold text-navy-900">
                                ${property.estimated_value.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}