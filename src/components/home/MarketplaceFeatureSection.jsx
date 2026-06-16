import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, ShoppingBag, Building2, TrendingUp, Package, Gem } from 'lucide-react';

const cards = [
  {
    href: '/CompareEstateSales',
    color: 'from-orange-600 to-orange-700',
    bg: '#d9531f',
    icon: Home,
    title: 'Estate Sale Company',
    desc: 'Compare platforms, pick the right one',
  },
  {
    href: createPageUrl('DIYSaleSignup'),
    color: 'from-purple-600 to-purple-700',
    bg: '#8a2be2',
    icon: ShoppingBag,
    title: 'Sell Your Items',
    desc: 'Sell on marketplace or host your own sale',
  },
  {
    href: createPageUrl('AgentSignup'),
    color: 'from-blue-600 to-blue-700',
    bg: '#1a5ad5',
    icon: Building2,
    title: 'Real Estate Agent',
    desc: 'Get seller leads instantly',
  },
  {
    href: createPageUrl('VendorSignup'),
    color: 'from-emerald-600 to-emerald-700',
    bg: '#1e8449',
    icon: TrendingUp,
    title: 'Vendor Network',
    desc: 'Join our network and grow your business',
  },
  {
    href: '/reseller-network',
    color: 'from-teal-600 to-teal-700',
    bg: '#0f766e',
    icon: Package,
    title: 'Resellers',
    desc: 'Find inventory and grow your resale business',
  },
  {
    href: createPageUrl('CollectorDealerDashboard'),
    color: 'from-rose-600 to-rose-700',
    bg: '#c71536',
    icon: Gem,
    title: 'Dealers',
    desc: 'Source inventory for your store or gallery',
  },
];

export default function MarketplaceFeatureSection() {
  return (
    <section className="py-20 px-4 bg-[#f8f9fa]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[32px] md:text-[36px] font-bold text-[#1a202c] mb-2">
            Marketplace Features
          </h2>
          <p className="text-lg text-[#4a5568]">
            Everything you need to grow your estate sale business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, idx) => {
            const IconComponent = card.icon;
            return (
              <Link key={idx} to={card.href}>
                <div
                  className={`bg-gradient-to-r ${card.color} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {card.title}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}