import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CreditCard, QrCode, ArrowRight } from 'lucide-react';
import { CARD_BRANDS, methodLabel } from './paymentSignData';

// Shown with the Payment Signs. The payment signs read the operator's business
// profile: accepted methods, the Zelle / Venmo QR codes and the card brands.
// Card brands are the one thing chosen here, and they save to the profile.
export default function PaymentSignSetupCard({ payment, cardBrands = [], onToggleBrand }) {
  const methods = payment?.methods || [];
  const brands = cardBrands || [];

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm">Payment sign details</p>
            <p className="text-xs text-slate-600">
              Payment signs print your business profile: accepted methods, your Zelle and Venmo QR codes, and the cards below.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Accepted at this sale</p>
          {methods.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {methods.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">{methodLabel(m)}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-700">
              No payment methods set yet — add them to your business profile.
            </p>
          )}
        </div>

        {payment?.acceptsCards && (
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Cards you accept
            </p>
            <p className="text-[11px] text-slate-500 mb-2">
              Checked cards print under Accepted. The rest print under Not Accepted.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {CARD_BRANDS.map((brand) => (
                <label key={brand.value} className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <Checkbox
                    checked={brands.includes(brand.value)}
                    onCheckedChange={() => onToggleBrand(brand.value)}
                  />
                  {brand.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <QrCode className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="text-slate-600">QR codes and handles come from your business profile.</span>
          <Link to={createPageUrl('MyProfile')} className="inline-flex items-center gap-0.5 text-purple-700 font-semibold hover:underline whitespace-nowrap">
            Edit profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}