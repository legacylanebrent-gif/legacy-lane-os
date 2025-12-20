import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, MapPin, TrendingUp } from 'lucide-react';

export default function ContactCard({ contact }) {
  const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gold-100 text-gold-700 font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-navy-900 mb-1">
              {contact.first_name} {contact.last_name}
            </h3>

            <div className="flex flex-wrap gap-1 mb-3">
              {contact.roles?.slice(0, 2).map(role => (
                <Badge key={role} variant="outline" className="text-xs capitalize">
                  {role}
                </Badge>
              ))}
              {contact.roles?.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{contact.roles.length - 2}
                </Badge>
              )}
            </div>

            <div className="space-y-1 text-sm text-slate-600">
              {contact.email && (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}

              {contact.address?.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{contact.address.city}, {contact.address.state}</span>
                </div>
              )}
            </div>

            {contact.score > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <TrendingUp className="w-4 h-4 text-gold-600" />
                <span className="text-sm font-semibold text-navy-900">Score: {contact.score}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}