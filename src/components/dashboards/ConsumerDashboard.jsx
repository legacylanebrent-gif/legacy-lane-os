import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Heart, AlertCircle, MapPin, ShoppingBag, Star, Users, MessageSquare, Bell, Ticket, HandCoins } from 'lucide-react';

export default function ConsumerDashboard({ user }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('ConsumerDashboard mounted with user:', user);
    try {
      if (!user) {
        console.error('No user data in ConsumerDashboard');
        setError('No user data available');
      }
    } catch (e) {
      console.error('Error in ConsumerDashboard useEffect:', e);
      setError(e.message);
    }
  }, [user]);

  console.log('ConsumerDashboard rendering, error state:', error);

  if (!user) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="w-8 h-8" />
              <h2 className="font-bold text-2xl">No User Data</h2>
            </div>
            <p className="text-red-700 text-lg">Consumer dashboard cannot load without user data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const quickActions = [
    {
      title: 'Find Estate Sales',
      description: 'Browse upcoming estate sales near you',
      icon: MapPin,
      link: 'EstateSaleFinder',
      color: 'orange'
    },
    {
      title: 'My Favorites',
      description: 'View your saved estate sales',
      icon: Heart,
      link: 'Favorites',
      color: 'red'
    },
    {
      title: 'Marketplace',
      description: 'Shop items from estate sales',
      icon: ShoppingBag,
      link: 'BrowseItems',
      color: 'cyan'
    },
    {
      title: 'Check-ins & Rewards',
      description: 'Check in at sales and earn rewards',
      icon: MapPin,
      link: 'RewardsCheckins',
      color: 'green'
    },
    {
      title: 'My Rewards',
      description: 'View your points and reward history',
      icon: Star,
      link: 'MyRewards',
      color: 'yellow'
    },
    {
      title: 'My Referrals',
      description: 'Invite friends and earn bonuses',
      icon: Users,
      link: 'MyReferrals',
      color: 'purple'
    },
    {
      title: 'Buyouts',
      description: 'Request a full estate buyout',
      icon: HandCoins,
      link: 'Buyouts',
      color: 'amber'
    },
    {
      title: 'Support',
      description: 'Get help with your account',
      icon: MessageSquare,
      link: 'MyTickets',
      color: 'slate'
    },
    {
      title: 'Notifications',
      description: 'View your recent notifications',
      icon: Bell,
      link: 'Notifications',
      color: 'indigo'
    },
    {
      title: 'My Profile',
      description: 'Edit your profile and settings',
      icon: User,
      link: 'MyProfile',
      color: 'blue'
    },
  ];

  const colorMap = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    red:    { bg: 'bg-red-100',    text: 'text-red-600',    border: 'border-red-200' },
    cyan:   { bg: 'bg-cyan-100',   text: 'text-cyan-600',   border: 'border-cyan-200' },
    green:  { bg: 'bg-green-100',  text: 'text-green-600',  border: 'border-green-200' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    amber:  { bg: 'bg-amber-100',  text: 'text-amber-600',  border: 'border-amber-200' },
    slate:  { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-600',   border: 'border-blue-200' },
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
            Welcome, {user?.full_name || 'User'}!
          </h1>
          <p className="text-slate-600">Everything you need, all in one place.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const colors = colorMap[action.color];
            return (
              <Link key={index} to={createPageUrl(action.link)}>
                <Card className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border ${colors.border} h-full`}>
                  <CardContent className="p-5">
                    <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                      <action.icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-slate-500">{action.description}</p>
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