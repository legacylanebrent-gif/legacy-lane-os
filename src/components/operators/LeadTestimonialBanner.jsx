import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Quote, Star } from 'lucide-react';

export default function LeadTestimonialBanner() {
  return (
    <div className="mb-12">
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-cyan-50 shadow-md">
        <CardContent className="pt-8 pb-8 px-8 md:px-12">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0 hidden md:block">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
                DR
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />
                ))}
                <span className="ml-2 text-sm font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  Daily Lead Pipeline
                </span>
              </div>

              <Quote className="w-8 h-8 text-orange-200 mb-3" />

              <p className="text-slate-700 text-base md:text-lg leading-relaxed mb-5 font-serif italic">
                "My favorite part about EstateSalen so far is that every morning I go to my Leads section and see that all the new real estate listings in my area are right there waiting for me with the address, price and agent information. After looking at the listings, I make a simple contact to the agent to see if the client may need a sale. So far I've cherry picked the sales I've wanted and that's invaluable to me. No more waiting around for the phone to ring. I go after the ones I want and I'm making tons of great agent connections for referrals in the future."
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm md:hidden">
                  DR
                </div>
                <div>
                  <p className="font-semibold text-slate-900">David Reynolds</p>
                  <p className="text-sm text-slate-500">Premier Estate Liquidators &middot; Dallas, TX</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}