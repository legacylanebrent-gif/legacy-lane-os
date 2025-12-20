import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueChart({ events, timeframe }) {
  const groupEventsByTime = () => {
    const grouped = {};
    
    events.forEach(event => {
      const date = new Date(event.transaction_date || event.created_date);
      let key;

      switch (timeframe) {
        case 'week':
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'month':
          key = date.toLocaleDateString('en-US', { day: 'numeric' });
          break;
        case 'quarter':
        case 'year':
          key = date.toLocaleDateString('en-US', { month: 'short' });
          break;
        default:
          key = date.toLocaleDateString();
      }

      if (!grouped[key]) {
        grouped[key] = 0;
      }
      grouped[key] += event.net_amount || 0;
    });

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      revenue: value
    }));
  };

  const data = groupEventsByTime();

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No revenue data available for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip 
          formatter={(value) => `$${value.toLocaleString()}`}
          contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="revenue" fill="#c9a227" />
      </BarChart>
    </ResponsiveContainer>
  );
}