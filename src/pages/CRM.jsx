import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, Plus, Search, Mail, Phone, Tag, MessageSquare, 
  Star, TrendingUp, Archive, UserPlus, Send, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function CRM() {
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterStatus, filterType, connections]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      const connectionsData = await base44.entities.Connection.filter({
        account_owner_id: userData.id
      }, '-created_date');
      setConnections(connectionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...connections];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.connected_user_name?.toLowerCase().includes(query) ||
        c.connected_user_email?.toLowerCase().includes(query) ||
        c.connected_user_phone?.includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.connection_type === filterType);
    }

    setFilteredConnections(filtered);
  };

  const getConnectionTypeColor = (type) => {
    switch (type) {
      case 'favorite': return 'bg-pink-100 text-pink-700';
      case 'lead': return 'bg-blue-100 text-blue-700';
      case 'client': return 'bg-green-100 text-green-700';
      case 'referral': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getConnectionTypeIcon = (type) => {
    switch (type) {
      case 'favorite': return <Star className="w-4 h-4" />;
      case 'lead': return <TrendingUp className="w-4 h-4" />;
      case 'client': return <Users className="w-4 h-4" />;
      default: return <UserPlus className="w-4 h-4" />;
    }
  };

  const stats = {
    total: connections.length,
    favorites: connections.filter(c => c.connection_type === 'favorite').length,
    leads: connections.filter(c => c.connection_type === 'lead').length,
    clients: connections.filter(c => c.connection_type === 'client').length,
    totalValue: connections.reduce((sum, c) => sum + (c.lifetime_value || 0), 0)
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded w-1/3"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">CRM</h1>
          <p className="text-slate-600 mt-1">Manage your connections and relationships</p>
        </div>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Connection</DialogTitle>
            </DialogHeader>
            <AddConnectionForm
              user={user}
              onSuccess={() => {
                loadData();
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Connections</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Favorites</p>
                <p className="text-2xl font-bold text-slate-900">{stats.favorites}</p>
              </div>
              <Star className="w-8 h-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Leads</p>
                <p className="text-2xl font-bold text-slate-900">{stats.leads}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Clients</p>
                <p className="text-2xl font-bold text-slate-900">{stats.clients}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Lifetime Value</p>
                <p className="text-2xl font-bold text-slate-900">${stats.totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="favorite">Favorites</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="referral">Referrals</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle>Connections ({filteredConnections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredConnections.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p>No connections found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onSelect={() => setSelectedConnection(connection)}
                  getConnectionTypeColor={getConnectionTypeColor}
                  getConnectionTypeIcon={getConnectionTypeIcon}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Detail Modal */}
      {selectedConnection && (
        <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Connection Details</DialogTitle>
            </DialogHeader>
            <ConnectionDetail
              connection={selectedConnection}
              onUpdate={loadData}
              onClose={() => setSelectedConnection(null)}
              getConnectionTypeColor={getConnectionTypeColor}
              getConnectionTypeIcon={getConnectionTypeIcon}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ConnectionCard({ connection, onSelect, getConnectionTypeColor, getConnectionTypeIcon }) {
  return (
    <div
      onClick={onSelect}
      className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-slate-900">{connection.connected_user_name || 'Unnamed'}</h3>
            <Badge className={getConnectionTypeColor(connection.connection_type)}>
              {getConnectionTypeIcon(connection.connection_type)}
              <span className="ml-1">{connection.connection_type}</span>
            </Badge>
            {connection.status === 'pending' && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Pending
              </Badge>
            )}
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            {connection.connected_user_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {connection.connected_user_email}
              </div>
            )}
            {connection.connected_user_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {connection.connected_user_phone}
              </div>
            )}
          </div>
          {connection.tags && connection.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {connection.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="text-right text-sm text-slate-500">
          {connection.lifetime_value > 0 && (
            <p className="font-semibold text-green-600">${connection.lifetime_value.toLocaleString()}</p>
          )}
          {connection.last_interaction && (
            <p className="text-xs mt-1">
              Last: {format(new Date(connection.last_interaction), 'MMM d')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectionDetail({ connection, onUpdate, onClose, getConnectionTypeColor, getConnectionTypeIcon }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    notes: connection.notes || '',
    tags: connection.tags || [],
    lifetime_value: connection.lifetime_value || 0,
    status: connection.status || 'connected'
  });
  const [newTag, setNewTag] = useState('');

  const handleSave = async () => {
    try {
      await base44.entities.Connection.update(connection.id, formData);
      onUpdate();
      setEditing(false);
    } catch (error) {
      console.error('Error updating connection:', error);
      alert('Error updating connection');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({...formData, tags: [...formData.tags, newTag.trim()]});
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({...formData, tags: formData.tags.filter(t => t !== tag)});
  };

  const handleSendMessage = async () => {
    if (!connection.connected_user_id) {
      alert('Cannot send message - user not registered in system');
      return;
    }
    // Create a notification to the connected user
    try {
      await base44.entities.Notification.create({
        user_id: connection.connected_user_id,
        type: 'message',
        title: 'New Connection Request',
        message: 'Someone wants to connect with you in their CRM',
        link: createPageUrl('Messages')
      });
      alert('Invitation sent!');
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Error sending invitation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{connection.connected_user_name || 'Unnamed'}</h2>
            <Badge className={getConnectionTypeColor(connection.connection_type)}>
              {getConnectionTypeIcon(connection.connection_type)}
              <span className="ml-1">{connection.connection_type}</span>
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {connection.status === 'pending' && (
            <Button onClick={handleSendMessage} variant="outline" className="text-orange-600">
              <Send className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          )}
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="outline">Edit</Button>
          ) : (
            <>
              <Button onClick={() => setEditing(false)} variant="outline">Cancel</Button>
              <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">Save</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-slate-600">Email</Label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-slate-400" />
              <p className="text-slate-900">{connection.connected_user_email}</p>
            </div>
          </div>
          {connection.connected_user_phone && (
            <div>
              <Label className="text-slate-600">Phone</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-slate-400" />
                <p className="text-slate-900">{connection.connected_user_phone}</p>
              </div>
            </div>
          )}
          <div>
            <Label className="text-slate-600">Status</Label>
            {editing ? (
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-slate-900 mt-1 capitalize">{connection.status}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-600">Lifetime Value</Label>
            {editing ? (
              <Input
                type="number"
                value={formData.lifetime_value}
                onChange={(e) => setFormData({...formData, lifetime_value: parseFloat(e.target.value) || 0})}
                className="mt-1"
              />
            ) : (
              <p className="text-slate-900 mt-1 text-xl font-semibold text-green-600">
                ${connection.lifetime_value?.toLocaleString() || 0}
              </p>
            )}
          </div>
          <div>
            <Label className="text-slate-600">Total Interactions</Label>
            <p className="text-slate-900 mt-1">{connection.total_interactions || 0}</p>
          </div>
          {connection.last_interaction && (
            <div>
              <Label className="text-slate-600">Last Interaction</Label>
              <p className="text-slate-900 mt-1">{format(new Date(connection.last_interaction), 'PPP')}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="text-slate-600">Tags</Label>
        {editing ? (
          <div className="mt-1 space-y-2">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag} type="button">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                  <Tag className="w-3 h-3 mr-1" />
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mt-1">
            {connection.tags && connection.tags.length > 0 ? (
              connection.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))
            ) : (
              <p className="text-slate-500">No tags</p>
            )}
          </div>
        )}
      </div>

      <div>
        <Label className="text-slate-600">Notes</Label>
        {editing ? (
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows={4}
            className="mt-1"
          />
        ) : (
          <p className="text-slate-900 mt-1 whitespace-pre-wrap">{connection.notes || 'No notes'}</p>
        )}
      </div>

      {connection.source && (
        <div>
          <Label className="text-slate-600">Source</Label>
          <p className="text-slate-900 mt-1">{connection.source}</p>
        </div>
      )}

      <div className="text-xs text-slate-500 pt-4 border-t">
        Created: {format(new Date(connection.created_date), 'PPP')}
      </div>
    </div>
  );
}

function AddConnectionForm({ user, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    connected_user_email: '',
    connected_user_name: '',
    connected_user_phone: '',
    connection_type: 'manual',
    notes: '',
    tags: []
  });
  const [existingUser, setExistingUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(false);

  const handleEmailBlur = async () => {
    if (!formData.connected_user_email.trim()) return;
    
    setCheckingUser(true);
    try {
      const users = await base44.entities.User.filter({ email: formData.connected_user_email.trim() });
      if (users.length > 0) {
        setExistingUser(users[0]);
        setFormData({
          ...formData,
          connected_user_name: users[0].full_name,
          connected_user_phone: users[0].phone || ''
        });
      } else {
        setExistingUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setCheckingUser(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (existingUser) {
      // User exists - send invitation
      try {
        await base44.entities.Connection.create({
          account_owner_id: user.id,
          account_owner_type: user.primary_account_type,
          connected_user_id: existingUser.id,
          ...formData,
          status: 'pending'
        });

        await base44.entities.Notification.create({
          user_id: existingUser.id,
          type: 'message',
          title: 'New Connection Request',
          message: `${user.full_name} wants to connect with you`,
          link: '/messages'
        });

        alert('Connection created and invitation sent!');
        onSuccess();
      } catch (error) {
        console.error('Error creating connection:', error);
        alert('Error creating connection');
      }
    } else {
      // New user - create connection only
      try {
        await base44.entities.Connection.create({
          account_owner_id: user.id,
          account_owner_type: user.primary_account_type,
          ...formData,
          status: 'connected'
        });
        alert('Connection created!');
        onSuccess();
      } catch (error) {
        console.error('Error creating connection:', error);
        alert('Error creating connection');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {existingUser && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-900">User Already Exists</p>
            <p className="text-sm text-orange-700 mt-1">
              {existingUser.full_name} is already registered. An invitation will be sent through the messaging system.
            </p>
          </div>
        </div>
      )}

      <div>
        <Label>Email *</Label>
        <Input
          type="email"
          value={formData.connected_user_email}
          onChange={(e) => setFormData({...formData, connected_user_email: e.target.value})}
          onBlur={handleEmailBlur}
          placeholder="email@example.com"
          required
          disabled={checkingUser}
        />
        {checkingUser && <p className="text-xs text-slate-500 mt-1">Checking if user exists...</p>}
      </div>

      <div>
        <Label>Full Name *</Label>
        <Input
          value={formData.connected_user_name}
          onChange={(e) => setFormData({...formData, connected_user_name: e.target.value})}
          placeholder="John Doe"
          required
          disabled={!!existingUser}
        />
        {existingUser && (
          <p className="text-xs text-slate-500 mt-1">User details are from their profile</p>
        )}
      </div>

      <div>
        <Label>Phone</Label>
        <Input
          type="tel"
          value={formData.connected_user_phone}
          onChange={(e) => setFormData({...formData, connected_user_phone: e.target.value})}
          placeholder="(555) 123-4567"
          disabled={!!existingUser}
        />
      </div>

      <div>
        <Label>Connection Type</Label>
        <Select value={formData.connection_type} onValueChange={(v) => setFormData({...formData, connection_type: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
          placeholder="Add any notes about this connection..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
          {existingUser ? 'Create & Send Invitation' : 'Create Connection'}
        </Button>
      </div>
    </form>
  );
}