import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS_BY_TYPE = {
  estate_sale_operator: {
    heading: 'What Operators Are Saying',
    subheading: 'Real estate sale operators share how EstateSalen transformed their business',
    items: [
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
    ]
  },
  vendor: {
    heading: 'What Vendors Are Saying',
    subheading: 'Service providers share how EstateSalen connects them with ready-to-hire clients',
    items: [
      {
        quote: "As a cleanout crew, we used to chase leads cold. Now the jobs come to us through the network — our calendar stays full.",
        author: "David Brooks",
        company: "Brothers Cleanout Co.",
        location: "Charlotte, NC",
        highlight: "Steady Job Pipeline"
      },
      {
        quote: "The platform routes us jobs that actually match our service area and trade. No more wasted drives across the state for a job that wasn't a fit.",
        author: "Lisa Nguyen",
        company: "Nguyen Handy Pros",
        location: "Houston, TX",
        highlight: "Matched, Local Leads"
      },
      {
        quote: "Being listed alongside estate sale operators means we're top of mind the moment a family needs help clearing a home. It's a game changer.",
        author: "Marcus Reed",
        company: "Reed Junk & Removal",
        location: "Columbus, OH",
        highlight: "Early Access to Jobs"
      }
    ]
  },
  consignor: {
    heading: 'What Consignors Are Saying',
    subheading: 'Consignors share how EstateSalen helps them sell smarter and earn more',
    items: [
      {
        quote: "I consigned a few pieces I'd been holding onto for years. The AI pricing helped me set realistic expectations and they sold fast.",
        author: "Patricia Owens",
        company: "Owens Antiques",
        location: "Richmond, VA",
        highlight: "Smarter Pricing"
      },
      {
        quote: "Having my items in front of estate sale shoppers who are already in a buying mindset changed everything for my consignment shop.",
        author: "Greg Sullivan",
        company: "Sullivan Consignments",
        location: "Nashville, TN",
        highlight: "Built-In Buyer Audience"
      },
      {
        quote: "The dashboard makes it easy to track what sold, what's pending, and what I still have on the floor. No more spreadsheets.",
        author: "Diane Carter",
        company: "Carter Curated",
        location: "Portland, OR",
        highlight: "Effortless Tracking"
      }
    ]
  },
  reseller: {
    heading: 'What Resellers Are Saying',
    subheading: 'Resellers share how EstateSalen helps them source inventory and grow their business',
    items: [
      {
        quote: "The buyout alerts mean I hear about cherry-pick opportunities before they hit the public. My flip margin has never been better.",
        author: "Tony Ramirez",
        company: "Ramirez Resale",
        location: "Dallas, TX",
        highlight: "First Dibs on Buyouts"
      },
      {
        quote: "I used to drive hours hoping to find inventory. Now the packup events and sales come to my phone, filtered to my radius.",
        author: "Karen Whitfield",
        company: "Whitfield Picks",
        location: "Kansas City, MO",
        highlight: "Sourcing on Autopilot"
      },
      {
        quote: "Being part of the reseller network got me into exclusive events I never knew existed. It pays for itself on the first sale.",
        author: "Eric Donovan",
        company: "Donovan Deals",
        location: "Denver, CO",
        highlight: "Exclusive Access"
      }
    ]
  },
  real_estate_agent: {
    heading: 'What Agents Are Saying',
    subheading: 'Real estate agents share how EstateSalen fuels their probate and estate listings pipeline',
    items: [
      {
        quote: "My probate listing pipeline filled up within weeks of joining. The leads come pre-qualified with property and situation details.",
        author: "Rachel Kim",
        company: "Kim Realty Group",
        location: "Los Angeles, CA",
        highlight: "Pre-Qualified Probate Leads"
      },
      {
        quote: "Partnering with estate sale operators on the platform brought me listings I'd never have found on my own. The referral system just works.",
        author: "James Foster",
        company: "Foster & Associates",
        location: "Chicago, IL",
        highlight: "Operator Referral Network"
      },
      {
        quote: "The territory tools let me see exactly where demand is concentrated, so I know where to focus my marketing dollars.",
        author: "Sofia Martinez",
        company: "Martinez Properties",
        location: "Miami, FL",
        highlight: "Data-Driven Territory"
      }
    ]
  }
};

export default function OperatorTestimonials({ accountType = 'estate_sale_operator' }) {
  const group = TESTIMONIALS_BY_TYPE[accountType] || TESTIMONIALS_BY_TYPE.estate_sale_operator;

  return (
    <div className="mt-20 mb-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-slate-900 mb-3">
          {group.heading}
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {group.subheading}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {group.items.map((testimonial, idx) => (
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