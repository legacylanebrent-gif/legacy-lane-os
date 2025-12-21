import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Heart, MessageSquare, MoreVertical, Calendar, MapPin, Edit, Trash } from 'lucide-react';
import { format } from 'date-fns';

export default function OperatorSalesTable({ sales, onEdit, onDelete }) {
  const getStatusBadge = (status) => {
    const variants = {
      draft: 'bg-slate-200 text-slate-700',
      upcoming: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-slate-400 text-white',
      cancelled: 'bg-red-100 text-red-700',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {sales.map((sale) => (
        <Card key={sale.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Link
                    to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                    className="text-lg font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                  >
                    {sale.title}
                  </Link>
                  {getStatusBadge(sale.status)}
                  {sale.national_featured && (
                    <Badge className="bg-orange-600">National Featured</Badge>
                  )}
                  {sale.local_featured && (
                    <Badge className="bg-cyan-600">Local Featured</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {sale.property_address?.city}, {sale.property_address?.state}
                  </div>
                  {sale.sale_dates?.[0] && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(sale.sale_dates[0].date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Eye className="w-4 h-4 text-cyan-600" />
                    <span className="font-medium">{sale.views || 0}</span>
                    <span className="text-slate-500">views</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span className="font-medium">{sale.saves || 0}</span>
                    <span className="text-slate-500">saves</span>
                  </div>
                  {sale.estimated_value && (
                    <div className="flex items-center gap-2 text-green-700">
                      <span className="font-semibold">${sale.estimated_value.toLocaleString()}</span>
                      <span className="text-slate-500">est. value</span>
                    </div>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(sale)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Sale
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(sale)}
                    className="text-red-600"
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Sale
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}