import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Heart, AlertCircle } from 'lucide-react';

export default function ConsumerDashboard({ user }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (!user) {
        setError('No user data available');
      }
    } catch (e) {
      setError(e.message);
    }
  }, [user]);
  const quickActions = [
    {
      title: 'My Profile',
      description: 'Edit your profile and settings',
      icon: User,
      link: 'MyProfile',
      color: 'blue'
    },
    {
      title: 'My Favorites',
      description: 'View your saved estate sales',
      icon: Heart,
      link: 'Favorites',
      color: 'red'
    }
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200' },
    red: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-200' }
  };

  try {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <p className="font-semibold">Error: {error}</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div>
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Welcome, {user?.full_name || 'User'}
          </h1>
          <p className="text-slate-600">Manage your profile and favorites</p>
          <p className="text-xs text-slate-400 mt-2">Account Type: {user?.primary_account_type || 'Not Set'}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
          {quickActions.map((action, index) => {
            const colors = colorMap[action.color];
            return (
              <Link key={index} to={createPageUrl(action.link)}>
                <Card className={`cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 ${colors.border}`}>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${colors.bg} bg-opacity-20 flex items-center justify-center mb-3`}>
                      <action.icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <CardTitle className="text-lg font-serif text-navy-900">
                      {action.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    );
  } catch (renderError) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <h2 className="font-bold text-xl">ConsumerDashboard Render Error</h2>
            </div>
            <p className="text-red-700 mb-2">Error: {renderError.message}</p>
            <pre className="mt-4 p-4 bg-white rounded text-xs overflow-auto">
              {renderError.stack}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }
}