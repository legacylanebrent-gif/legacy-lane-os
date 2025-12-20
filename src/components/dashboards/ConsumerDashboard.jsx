import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ShoppingBag, Home, GraduationCap, Users, Package } from 'lucide-react';

export default function ConsumerDashboard({ user }) {
  const quickActions = [
    {
      title: 'Find Estate Sales',
      description: 'Discover estate sales in your area',
      icon: MapPin,
      link: 'EstateSaleFinder',
      color: 'blue'
    },
    {
      title: 'Browse Marketplace',
      description: 'Shop unique items from sellers',
      icon: ShoppingBag,
      link: 'BrowseItems',
      color: 'green'
    },
    {
      title: 'My Listings',
      description: 'Manage items you are selling',
      icon: Package,
      link: 'MyListings',
      color: 'purple'
    },
    {
      title: 'Take Courses',
      description: 'Learn from industry experts',
      icon: GraduationCap,
      link: 'Courses',
      color: 'amber'
    }
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200' }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
          Welcome, {user.full_name}
        </h1>
        <p className="text-slate-600">Explore Legacy Lane services</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => {
          const colors = colorMap[action.color];
          return (
            <Link key={index} to={createPageUrl(action.link)}>
              <Card className={`cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 ${colors.border} hover:${colors.border}`}>
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Featured Estate Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Nearby estate sales will appear here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Popular Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Recommended courses will appear here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}