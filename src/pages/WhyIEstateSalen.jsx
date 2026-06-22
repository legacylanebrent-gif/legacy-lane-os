import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Clock, 
  TrendingUp, 
  Users, 
  Zap, 
  Target, 
  BarChart3, 
  FileText, 
  Camera,
  Share2,
  ShoppingCart,
  Truck,
  Heart,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function WhyIEstateSalen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
            Exactly Why EstateSalen Exists
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            Let's start with something important.
          </p>
        </div>
      </div>

      {/* Respect Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <p className="text-lg md:text-xl text-slate-700 leading-relaxed mb-6">
            <strong className="text-navy-900">I have tremendous respect for EstateSales.net.</strong>
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            They helped build the estate sale industry online and have connected millions of buyers with estate sale companies over the years.
          </p>
          <p className="text-slate-600 leading-relaxed mb-8">
            In fact, many estate sale companies rely on EstateSales.net every single week.
          </p>

          <div className="border-l-4 border-orange-500 pl-6 py-4 bg-orange-50 rounded-r-lg mb-8">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 mb-4">
              Why am I still spending hours doing work that software should be doing for me?
            </h2>
          </div>

          <p className="text-slate-600 mb-6">Why am I still:</p>
          <ul className="space-y-3 mb-8">
            {[
              'Researching items manually?',
              'Creating descriptions manually?',
              'Building signs manually?',
              'Posting to social media manually?',
              'Tracking expenses manually?',
              'Managing attendance manually?',
              'Coordinating staff manually?',
              'Reconciling reports manually?',
              'Chasing signatures manually?',
              'Finding my next client manually?'
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-slate-700">
                <span className="text-orange-500 mt-1">•</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="bg-navy-50 border border-navy-200 rounded-lg p-6 mb-8">
            <p className="text-lg text-slate-800 leading-relaxed">
              <strong>The truth is simple.</strong>
            </p>
            <p className="text-slate-700 mt-4">
              Most platforms help people <strong className="text-navy-900">find your sale.</strong>
            </p>
            <p className="text-slate-700 mt-2">
              Very few platforms help you <strong className="text-navy-900">run your business.</strong>
            </p>
            <p className="text-slate-700 mt-2">
              And almost none help you <strong className="text-navy-900">find your next client while saving hours every week.</strong>
            </p>
          </div>

          <p className="text-lg text-slate-700 leading-relaxed">
            That's why we built EstateSalen.
          </p>
          <p className="text-slate-600 mt-4">
            Not to replace the platforms that helped grow our industry.
          </p>
          <p className="text-slate-600">
            But to create the operating system we wished existed.
          </p>
        </div>

        {/* Value Proposition */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6">
            Finally... A Platform That Helps You Get More Sales AND Run Them More Efficiently
          </h2>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <span className="bg-orange-100 text-orange-800 px-6 py-3 rounded-full font-semibold">More Leads</span>
            <span className="bg-cyan-100 text-cyan-800 px-6 py-3 rounded-full font-semibold">More Efficiency</span>
            <span className="bg-sage-100 text-sage-800 px-6 py-3 rounded-full font-semibold">More Revenue</span>
            <span className="bg-purple-100 text-purple-800 px-6 py-3 rounded-full font-semibold">Less Work</span>
          </div>
          <p className="text-xl text-slate-700 mb-8 max-w-3xl mx-auto">
            EstateSalen was built specifically for estate sale companies that want to grow without adding more stress, more staff, or more hours to their week.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Clock, title: 'Help You Save Time', color: 'text-orange-600' },
              { icon: Target, title: 'Help You Win More Clients', color: 'text-cyan-600' },
              { icon: ShoppingCart, title: 'Help You Sell More Inventory', color: 'text-sage-600' },
              { icon: Building2, title: 'Help You Operate Like A Larger Company', color: 'text-purple-600' }
            ].map((item, idx) => (
              <Card key={idx} className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 text-center">
                  <item.icon className={`w-12 h-12 ${item.color} mx-auto mb-4`} />
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6">
              AI Is Changing the World ... And We're Growing With It.
            </h2>
          </div>

          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              There was a time when every business relied entirely on people, paperwork, phone calls, filing cabinets, spreadsheets, sticky notes, and long hours.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              For decades, that was simply the way things were done.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              Then came computers.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              Then the internet.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              Then smartphones.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed mb-8">
              And now, we're entering the next major shift in how businesses operate.
            </p>

            <div className="bg-gradient-to-br from-navy-50 to-blue-50 border-2 border-navy-200 rounded-xl p-8 mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Artificial Intelligence.</h3>
              <p className="text-slate-700 mb-4">Whether we embrace it or not, AI is becoming part of everyday life.</p>
              <p className="text-slate-700 mb-6">It's helping people:</p>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  'Find information faster',
                  'Automate repetitive tasks',
                  'Create content',
                  'Organize data',
                  'Improve customer experiences',
                  'Make better decisions',
                  'Save valuable time'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white border border-navy-200 rounded-md px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-lg text-slate-700 leading-relaxed mb-6">
              The estate sale industry is no exception.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 mb-8">
              <p className="text-lg text-slate-800 leading-relaxed mb-4">
                The reality is that most estate sale company owners didn't get into this business because they love paperwork, spreadsheets, social media posting, inventory management, or administrative tasks.
              </p>
              <p className="text-lg text-slate-800 leading-relaxed font-semibold">
                They got into this business because they enjoy helping families, uncovering treasures, serving clients, and creating successful sales.
              </p>
              <p className="text-xl text-navy-900 font-bold mt-6 text-center">
                That's where we believe AI can help.
              </p>
            </div>
          </div>

          {/* AI Isn't Perfect Section */}
          <div className="border-t-2 border-slate-200 pt-12 mt-12">
            <h3 className="text-3xl font-serif font-bold text-slate-900 mb-6">
              AI Isn't Perfect. Neither Are Humans.
            </h3>
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 mb-8">
              <p className="text-lg text-slate-700 mb-4">Let's be transparent.</p>
              <p className="text-slate-700 mb-4">Artificial Intelligence is not perfect.</p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {['Sometimes it gets things wrong', 'Sometimes it needs guidance', 'Sometimes it requires human review and common sense'].map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-md px-4 py-3 text-slate-700 text-center">
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-slate-700 mb-2">But every day it becomes smarter.</p>
              <p className="text-slate-700 mb-2">Every month it becomes more capable.</p>
              <p className="text-slate-700 mb-6">Every year it becomes more useful.</p>
              
              <div className="bg-navy-900 text-white rounded-lg p-6">
                <p className="text-lg font-semibold">
                  The companies that learn how to leverage AI responsibly today will likely have a significant advantage tomorrow.
                </p>
                <p className="text-slate-300 mt-4">
                  Not because AI replaces people.
                </p>
                <p className="text-slate-300 font-semibold">
                  But because AI allows people to focus on higher-value work.
                </p>
              </div>
            </div>
          </div>

          {/* Human + AI Section */}
          <div className="border-t-2 border-slate-200 pt-12 mt-12">
            <h3 className="text-3xl font-serif font-bold text-slate-900 mb-6 text-center">
              We Believe The Future Is Human + AI
            </h3>
            
            <div className="max-w-3xl mx-auto mb-8">
              <p className="text-lg text-slate-700 mb-6 text-center">
                At EstateSalen, we don't believe technology should replace estate sale professionals.
              </p>
              <p className="text-lg text-slate-700 mb-6 text-center">
                We believe it should empower them.
              </p>
              
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-8 mb-8">
                <p className="text-xl text-slate-800 font-bold text-center mb-6">
                  Our goal is simple:
                </p>
                <p className="text-lg text-slate-700 text-center mb-6">
                  Use AI to eliminate repetitive work so you can focus on what matters most.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {['Serving clients', 'Building relationships', 'Managing sales', 'Growing your business', 'Spending more time doing what you enjoy'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-cyan-200 rounded-md px-4 py-3">
                      <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-slate-700 mb-2 text-center">When AI can save you time, we use it.</p>
              <p className="text-slate-700 mb-6 text-center">When human expertise is required, we trust the professionals.</p>
              
              <div className="bg-navy-900 text-white rounded-lg p-8 text-center">
                <p className="text-2xl font-bold mb-4">
                  The future isn't AI versus people.
                </p>
                <p className="text-xl text-slate-300">
                  The future is people using AI to accomplish more than ever before.
                </p>
              </div>
            </div>
          </div>

          {/* Our Commitment Section */}
          <div className="border-t-2 border-slate-200 pt-12 mt-12">
            <h3 className="text-3xl font-serif font-bold text-slate-900 mb-6 text-center">
              Our Commitment
            </h3>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-8 md:p-12">
              <p className="text-lg text-slate-700 mb-6 text-center">
                EstateSalen is committed to continuously improving and evolving alongside the latest advancements in technology.
              </p>
              <p className="text-lg text-slate-700 mb-6 text-center">
                As AI becomes more powerful, more accurate, and more useful, we will continue integrating new tools and capabilities that help estate sale companies operate more efficiently and profitably.
              </p>
              
              <div className="bg-white border border-purple-200 rounded-lg p-8 mb-8">
                <p className="text-xl text-slate-800 font-bold text-center mb-4">
                  We're not building software for yesterday's estate sale company.
                </p>
                <p className="text-2xl text-navy-900 font-bold text-center mb-6">
                  We're building the operating system for tomorrow's.
                </p>
                <p className="text-lg text-slate-700 text-center font-semibold">
                  Because the companies that embrace innovation today will be the companies leading the industry tomorrow.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Generation Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">
            Get Opportunities Delivered Directly To You
          </h2>
          <h3 className="text-2xl font-semibold text-slate-700 mb-8">
            Stop Waiting For The Phone To Ring
          </h3>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
            <p className="text-slate-700 mb-4">Most estate sale companies rely on:</p>
            <div className="grid md:grid-cols-3 gap-4">
              {['Referrals', 'Word of Mouth', 'Facebook Posts', 'Existing Relationships', 'Luck'].map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-md px-4 py-3 text-center text-slate-700">
                  {item}
                </div>
              ))}
            </div>
            <p className="text-slate-700 mt-6">
              <strong>The problem?</strong> Those lead sources are unpredictable.
            </p>
            <p className="text-slate-700 mt-2">
              EstateSalen helps you discover opportunities before your competitors.
            </p>
          </div>

          {/* Lead Types */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="border-l-4 border-blue-500 pl-6">
              <h4 className="text-xl font-bold text-slate-900 mb-3">Probate Leads</h4>
              <p className="text-slate-600">
                Families navigating probate often need assistance liquidating personal property and preparing homes for sale.
              </p>
              <p className="text-slate-600 mt-3">
                Our platform is continuously expanding its probate education and lead generation systems designed to connect families with participating estate sale companies.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-6">
              <h4 className="text-xl font-bold text-slate-900 mb-3">Obituary-Based Opportunities</h4>
              <p className="text-slate-600">
                Families often need guidance after the loss of a loved one.
              </p>
              <p className="text-slate-600 mt-3">
                EstateSalen helps identify opportunities where professional estate sale services may be needed.
              </p>
            </div>

            <div className="border-l-4 border-orange-500 pl-6 md:col-span-2">
              <h4 className="text-xl font-bold text-slate-900 mb-3">Life Transition Leads</h4>
              <p className="text-slate-600 mb-4">
                Many estate sales begin long before someone searches for an estate sale company.
              </p>
              <p className="text-slate-600 mb-4">We help identify opportunities related to:</p>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  'Senior Downsizing',
                  'Assisted Living Moves',
                  'Divorce',
                  'Inherited Property',
                  'Trustee Situations',
                  'Executor Responsibilities',
                  'Relocations',
                  'Foreclosure Situations',
                  'Major Life Changes'
                ].map((item, idx) => (
                  <div key={idx} className="bg-orange-50 border border-orange-200 rounded-md px-4 py-2 text-sm text-orange-800">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-6 md:col-span-2">
              <h4 className="text-xl font-bold text-slate-900 mb-3">Marketing Generated Leads</h4>
              <p className="text-slate-600">
                EstateSalen invests in attracting homeowners, families, executors, trustees, and real estate professionals to the platform.
              </p>
              <p className="text-slate-600 mt-3">
                As opportunities are generated, participating estate sale companies may receive leads based upon service areas and availability.
              </p>
            </div>
          </div>

          {/* MLS Feed */}
          <div className="bg-gradient-to-br from-navy-50 to-blue-50 border-2 border-navy-200 rounded-xl p-8 mb-12">
            <div className="flex items-center gap-4 mb-6">
              <BarChart3 className="w-10 h-10 text-navy-600" />
              <h3 className="text-2xl font-bold text-slate-900">Daily MLS Opportunity Feed</h3>
            </div>
            <h4 className="text-xl font-semibold text-slate-700 mb-4">
              One Of The Most Powerful Lead Sources You've Never Had
            </h4>
            <p className="text-slate-700 mb-6">
              Every day properties hit the market. Behind many of those listings are homeowners who need help:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {['Downsizing', 'Relocating', 'Selling Contents', 'Settling Estates', 'Preparing Homes For Sale'].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white border border-navy-200 rounded-md px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-white border border-navy-200 rounded-lg p-6">
              <h5 className="font-bold text-slate-900 mb-4">Daily MLS Opportunity Alerts Include:</h5>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  'Property Information',
                  'Location Details',
                  'Listing Agent Information',
                  'Contact Information When Available',
                  'Service Area Matching',
                  'Fresh Opportunities Every Day'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-700">
                    <span className="text-green-600 font-bold">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-lg text-slate-800 mt-6 font-semibold">
              Stop hunting for opportunities. Start receiving them.
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center mb-16">
            <Link to="/subscriptions">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all">
                🚀 View Subscription Plans
              </Button>
            </Link>
          </div>
        </div>

        {/* Hidden Cost Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">
            The Hidden Cost Of Every Estate Sale
          </h2>
          <p className="text-lg text-slate-700 mb-8">
            Most owners underestimate how much time is lost every month.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Before The Sale
                </h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  {['Intake', 'Photos', 'Research', 'Pricing', 'Marketing', 'Contracts', 'Team Coordination'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-red-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <h4 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  During The Sale
                </h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  {['Attendance Tracking', 'Customer Questions', 'Checkout', 'Team Management', 'Inventory Tracking'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-yellow-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  After The Sale
                </h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  {['Reporting', 'Reconciliation', 'Donations', 'Cleanouts', 'Buyouts', 'Client Communication'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-blue-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-navy-900 text-white rounded-lg p-8 mb-8">
            <p className="text-xl mb-4">
              Many companies spend <strong className="text-orange-400">10–30+ hours per sale</strong> handling administrative work.
            </p>
            <p className="text-slate-300 mb-4">Hours that could be spent:</p>
            <div className="grid md:grid-cols-2 gap-4">
              {['Booking new clients', 'Growing the company', 'Spending time with family', 'Taking a day off'].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-navy-800 rounded-md px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-12 text-center">
            Everything You Need To Run Your Business
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Camera,
                title: 'AI Generated Item Research',
                description: 'Upload photos and let EstateSalen help generate item titles, descriptions, suggested pricing, categories, and market research.',
                benefits: ['Faster setup', 'Better listings', 'More consistency']
              },
              {
                icon: ShoppingCart,
                title: 'Inventory Management',
                description: 'Track inventory from intake to final disposition. Manage items, categories, pricing, sold and unsold inventory.',
                benefits: ['Everything organized', 'Real-time tracking', 'One central location']
              },
              {
                icon: Target,
                title: 'Buyer Match Technology',
                description: 'Consumers create Wanted Item Alerts. When matching inventory is uploaded, buyers are notified automatically.',
                benefits: ['More visibility', 'More buyers', 'More sales']
              },
              {
                icon: Zap,
                title: 'Marketing Autopilot',
                description: 'Generate Facebook posts, Instagram posts, email campaigns, and marketing content from your inventory automatically.',
                benefits: ['Minutes not hours', 'Consistent posting', 'Automated promotion']
              },
              {
                icon: Share2,
                title: 'Auto Generated Social Media',
                description: 'Create content from your listings and inventory so you remain visible before, during, and after every sale.',
                benefits: ['Stay visible', 'Save time', 'Professional content']
              },
              {
                icon: FileText,
                title: 'Auto Generated Signs',
                description: 'Generate directional signs, parking signs, checkout signs, sale rules, and category signs. Print and go.',
                benefits: ['No rebuilding', 'Professional look', 'Ready to print']
              },
              {
                icon: Users,
                title: 'Digital Early Sign-In Lists',
                description: 'Eliminate the notebook forever. No more lost names, illegible handwriting, arguments, or confusion.',
                benefits: ['Professional experience', 'Organized records', 'Happy buyers']
              },
              {
                icon: Heart,
                title: 'VIP RSVP Events',
                description: 'Create exclusive shopping events for collectors, dealers, repeat customers, and VIP buyers.',
                benefits: ['Generate excitement', 'Move inventory early', 'Reward loyal customers']
              },
              {
                icon: ShoppingCart,
                title: 'Point Of Sale (POS)',
                description: 'Track cash sales, credit sales, discounts, receipts, and transaction history. Everything tied directly to your sale.',
                benefits: ['Accurate tracking', 'Professional receipts', 'Complete history']
              },
              {
                icon: Calendar,
                title: 'Team Task Management',
                description: 'Assign and track setup tasks, pricing tasks, marketing tasks, sale day responsibilities, and cleanup tasks.',
                benefits: ['Stay organized', 'Accountability', 'Better coordination']
              },
              {
                icon: FileText,
                title: 'eSign Contracts',
                description: 'Create and manage client agreements electronically. No printing, no scanning, no chasing paperwork.',
                benefits: ['Save time', 'Professional', 'Legally binding']
              },
              {
                icon: BarChart3,
                title: 'Mileage & Expense Tracking',
                description: 'Know the true profitability of every sale. Track mileage, fuel, labor, advertising, supplies, and miscellaneous expenses.',
                benefits: ['Know your costs', 'Better pricing', 'Tax ready']
              },
              {
                icon: TrendingUp,
                title: 'Professional Client Reports',
                description: 'Generate reports showing gross sales, expenses, commissions, donations, buyouts, and client proceeds.',
                benefits: ['Look professional', 'Build trust', 'Win referrals']
              }
            ].map((feature, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow border-2 hover:border-orange-300">
                <CardContent className="pt-6">
                  <feature.icon className="w-10 h-10 text-orange-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 mb-4">{feature.description}</p>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-16">
          <Link to="/subscriptions">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all">
              📈 Compare Subscription Plans
            </Button>
          </Link>
        </div>

        {/* Post-Sale Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">
            The Sale Doesn't End When The Sale Ends
          </h2>
          <p className="text-lg text-slate-700 mb-8">
            Most companies leave money on the table after the final day. EstateSalen helps you recover it.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <Truck className="w-10 h-10 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Create Buyout Opportunities</h3>
                <p className="text-slate-600 mb-4">
                  Connect remaining inventory with buyers, dealers, and resellers.
                </p>
                <div className="space-y-2">
                  {['Move more inventory', 'Reduce leftovers', 'Increase revenue'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <CardContent className="pt-6">
                <Heart className="w-10 h-10 text-pink-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Create Donation Requests</h3>
                <p className="text-slate-600 mb-4">
                  Automatically notify participating donation providers.
                </p>
                <div className="space-y-2">
                  {['Save time', 'Serve clients better'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
              <CardContent className="pt-6">
                <Building2 className="w-10 h-10 text-cyan-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Create Cleanout Requests</h3>
                <p className="text-slate-600 mb-4">
                  Need the property emptied? Send opportunities directly to participating cleanout vendors.
                </p>
                <div className="space-y-2">
                  {['No searching', 'No phone tag', 'No wasted time'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-navy-50 to-blue-50 border-2 border-navy-200">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">National Marketplace</h3>
              <p className="text-slate-700 mb-4">
                Continue selling inventory beyond the sale weekend. List items into the EstateSalen Marketplace and reach buyers across the country.
              </p>
              <p className="text-slate-700 font-semibold">
                Create additional revenue opportunities from inventory that may otherwise be overlooked.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Why Subscribe Section */}
        <div className="bg-gradient-to-br from-navy-900 to-navy-800 text-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-8">
            Why Estate Sale Companies Subscribe
          </h2>
          <p className="text-xl mb-8">
            Because they don't need another website. They need a better business.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              'More Leads',
              'More Visibility',
              'More Automation',
              'More Organization',
              'More Revenue',
              'Better Reporting',
              'Better Client Experiences',
              'Less Administrative Work',
              'More Time Back In Their Life'
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-navy-800 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time Savings Calculator */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-8 text-center">
            Imagine Saving Just 3 Hours Per Sale
          </h2>
          
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 mb-6">
              <CardContent className="pt-6 text-center">
                <div className="text-5xl font-bold text-orange-600 mb-2">4</div>
                <div className="text-slate-700 font-semibold">Sales Per Month</div>
              </CardContent>
            </Card>

            <div className="text-center mb-6">
              <ArrowRight className="w-8 h-8 text-slate-400 mx-auto" />
            </div>

            <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 mb-6">
              <CardContent className="pt-6 text-center">
                <div className="text-5xl font-bold text-cyan-600 mb-2">3</div>
                <div className="text-slate-700 font-semibold">Hours Saved Per Sale</div>
              </CardContent>
            </Card>

            <div className="text-center mb-6">
              <ArrowRight className="w-8 h-8 text-slate-400 mx-auto" />
            </div>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 mb-6">
              <CardContent className="pt-6 text-center">
                <div className="text-5xl font-bold text-green-600 mb-2">12</div>
                <div className="text-slate-700 font-semibold">Hours Per Month</div>
              </CardContent>
            </Card>

            <div className="text-center mb-6">
              <ArrowRight className="w-8 h-8 text-slate-400 mx-auto" />
            </div>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 mb-6">
              <CardContent className="pt-6 text-center">
                <div className="text-5xl font-bold text-purple-600 mb-2">144</div>
                <div className="text-slate-700 font-semibold">Hours Per Year</div>
              </CardContent>
            </Card>

            <div className="text-center mb-6">
              <ArrowRight className="w-8 h-8 text-slate-400 mx-auto" />
            </div>

            <Card className="bg-gradient-to-br from-navy-50 to-blue-50 border-2 border-navy-200">
              <CardContent className="pt-6 text-center">
                <div className="text-5xl font-bold text-navy-600 mb-2">18</div>
                <div className="text-slate-700 font-semibold">Full Work Days Returned To Your Life</div>
                <p className="text-slate-600 mt-4">
                  Many companies will save significantly more.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Founder Story */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">
            Built By Someone Who Faced The Same Challenges
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            I didn't build EstateSalen because I wanted another software company.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            I built it because I wanted a better estate sale company.
          </p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 mb-8">
            <p className="text-slate-700 mb-4">I wanted:</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Better systems',
                'Better organization',
                'Better marketing',
                'Better reporting',
                'Better lead generation',
                'More time'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-lg text-slate-700">
            And I knew thousands of other estate sale companies wanted the same thing.
          </p>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-8 md:p-12 mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            Stop Managing Chaos. Start Managing Growth.
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            The future of estate sales isn't more paperwork. It isn't more spreadsheets. It isn't more late nights.
          </p>
          <p className="text-xl font-semibold mb-8">
            It's automation, efficiency, visibility, and growth.
          </p>

          <div className="grid md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
            {['Get More Leads', 'Save More Time', 'Run Better Sales', 'Grow Your Business'].map((item, idx) => (
              <div key={idx} className="bg-white/20 backdrop-blur rounded-lg px-4 py-3 font-semibold">
                {item}
              </div>
            ))}
          </div>

          <Link to="/subscriptions">
            <Button className="bg-white text-orange-600 hover:bg-slate-100 px-8 py-6 text-lg font-bold rounded-lg shadow-lg hover:shadow-xl transition-all">
              🚀 Start Your Free Trial
            </Button>
          </Link>
        </div>

        {/* Demo CTA */}
        <div className="bg-slate-100 rounded-xl p-8 md:p-12 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Questions?</h3>
          <p className="text-slate-700 mb-6 max-w-2xl mx-auto">
            Schedule a Demo and see exactly how EstateSalen can help you save time, grow revenue, and create a more efficient estate sale business.
          </p>
          <Link to="/subscriptions">
            <Button variant="outline" className="border-2 border-navy-600 text-navy-600 hover:bg-navy-50 px-8 py-6 text-lg font-semibold">
              📅 Book A Demo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}