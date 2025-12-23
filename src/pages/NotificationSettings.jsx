import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, Save, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const NOTIFICATION_CATEGORIES = [
  {
    key: 'new_lead',
    label: 'New Leads',
    description: 'Get notified when you receive new leads',
    icon: AlertCircle,
    color: 'text-orange-600'
  },
  {
    key: 'sale_update',
    label: 'Sale Updates',
    description: 'Updates about your estate sales',
    icon: Bell,
    color: 'text-cyan-600'
  },
  {
    key: 'contract_expiration',
    label: 'Contract Expirations',
    description: 'Reminders about expiring contracts',
    icon: AlertCircle,
    color: 'text-red-600'
  },
  {
    key: 'message',
    label: 'Messages',
    description: 'New messages from users',
    icon: MessageSquare,
    color: 'text-blue-600'
  },
  {
    key: 'system',
    label: 'System Messages',
    description: 'Important system announcements',
    icon: Bell,
    color: 'text-purple-600'
  },
  {
    key: 'marketing',
    label: 'Marketing Updates',
    description: 'New features and platform updates',
    icon: Mail,
    color: 'text-green-600'
  },
  {
    key: 'reward',
    label: 'Rewards & Achievements',
    description: 'Points, badges, and rewards earned',
    icon: Bell,
    color: 'text-yellow-600'
  }
];

export default function NotificationSettings() {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const prefs = await base44.entities.NotificationPreference.filter({ 
        user_id: userData.id 
      });

      if (prefs.length > 0) {
        setPreferences(prefs[0]);
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: userData.id,
          new_lead_in_app: true,
          new_lead_email: true,
          new_lead_sms: false,
          sale_update_in_app: true,
          sale_update_email: true,
          sale_update_sms: false,
          contract_expiration_in_app: true,
          contract_expiration_email: true,
          contract_expiration_sms: false,
          message_in_app: true,
          message_email: true,
          message_sms: false,
          system_in_app: true,
          system_email: true,
          system_sms: false,
          marketing_in_app: true,
          marketing_email: false,
          marketing_sms: false,
          reward_in_app: true,
          reward_email: false,
          reward_sms: false
        };
        const created = await base44.entities.NotificationPreference.create(defaultPrefs);
        setPreferences(created);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.NotificationPreference.update(preferences.id, preferences);
      alert('Notification preferences saved!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Notification Settings</h1>
          <p className="text-slate-600">Control how and when you receive notifications</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-cyan-50 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Bell className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Stay Connected</h3>
              <p className="text-sm text-slate-700">
                Choose how you want to be notified about important events. In-app notifications appear in your dashboard,
                email notifications are sent to <strong>{user?.email}</strong>, and SMS notifications require a verified phone number.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <div className="space-y-4">
        {NOTIFICATION_CATEGORIES.map(category => {
          const Icon = category.icon;
          return (
            <Card key={category.key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-slate-100 rounded-lg ${category.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.label}</CardTitle>
                    <p className="text-sm text-slate-600">{category.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* In-App */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-slate-600" />
                      <div>
                        <div className="font-medium text-sm">In-App</div>
                        <div className="text-xs text-slate-500">Dashboard notifications</div>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[`${category.key}_in_app`]}
                      onCheckedChange={() => handleToggle(`${category.key}_in_app`)}
                    />
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-600" />
                      <div>
                        <div className="font-medium text-sm">Email</div>
                        <div className="text-xs text-slate-500">Email alerts</div>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[`${category.key}_email`]}
                      onCheckedChange={() => handleToggle(`${category.key}_email`)}
                    />
                  </div>

                  {/* SMS */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-slate-600" />
                      <div>
                        <div className="font-medium text-sm">SMS</div>
                        <div className="text-xs text-slate-500">Text messages</div>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[`${category.key}_sms`]}
                      onCheckedChange={() => handleToggle(`${category.key}_sms`)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}