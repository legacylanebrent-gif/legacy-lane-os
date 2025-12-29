import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Heart } from 'lucide-react';

export default function ConsumerDashboard({ user }) {
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

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
          Welcome, {user.full_name}
        </h1>
        <p className="text-slate-600">Manage your profile and favorites</p>
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
}