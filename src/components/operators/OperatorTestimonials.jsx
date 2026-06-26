import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "EstateSalen makes everything about creating and managing a sale more efficient which finally gives me an extra day off for myself.",
    author: "Sarah Mitchell",
    company: "Heritage Estate Sales",
    location: "Atlanta, GA",
    highlight: "Efficiency & Time Savings"
  },
  {
    quote: "I just got paid my first referral commission from linking up a realtor with my client. I can't believe that over 5 years of referring clients to realtors that now I finally have a way to make money doing so.",
    author: "Michael Torres",
    company: "Coastal Estate Liquidations",
    location: "Tampa, FL",
    highlight: "Referral Commission Income"
  },
  {
    quote: "The use of AI is blowing my mind for titles, descriptions and pricing. Beyond the time savings, I feel like I no longer have to KNOW EVERYTHING. Instead, I lean on the AI and if I disagree at first, at least I have some content now to make my own educated assumptions.",
    author: "Jennifer Walsh",
    company: "Walsh Estate Services",
    location: "Phoenix, AZ",
    highlight: "AI-Powered Listings"
  }
];

export default function OperatorTestimonials() {
  return (
    <div className="mt-20 mb-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-slate-900 mb-3">
          What Operators Are Saying
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Real estate sale operators share how EstateSalen transformed their business
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((testimonial, idx) => (
          <Card key={idx} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <CardContent className="pt-6 flex flex-col h-full">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />
                ))}
              </div>

              <Quote className="w-8 h-8 text-orange-200 mb-3" />

              <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-6">
                "{testimonial.quote}"
              </p>

              <div className="border-t border-slate-100 pt-4 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{testimonial.author}</p>
                    <p className="text-xs text-slate-500 truncate">{testimonial.company}</p>
                    <p className="text-xs text-slate-400 truncate">{testimonial.location}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-block text-xs font-medium bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                    {testimonial.highlight}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}