import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import StageCard from '@/components/landing/StageCard';
import ConsultationModal from '@/components/landing/ConsultationModal';
import ReferralIncomeSection from '@/components/landing/ReferralIncomeSection';

const SALE_FLOW = [
  'A new lead comes in.',
  'You schedule an appointment.',
  'Meet with the family.',
  'Create a proposal.',
  'Sign the contract.',
  'Coordinate staff.',
  'Order supplies.',
  'Take photos.',
  'Research values.',
  'Price items.',
  'Write descriptions.',
  'Create signs.',
  'Build social media posts.',
  'Send marketing emails.',
  'Answer customer questions.',
  'SALE DAY 1 — Manage offers.',
  'Handle checkout.',
  'Coordinate deliveries, movers, donations and vendors.',
  'Prepare reports.',
  'Calculate and enter all expenses.',
  'Pay staff.',
  'Calculate and deliver payouts.',
  'Final follow up with the client.',
  'Then do it all over again next week.',
];

const SALE_DAY_MARKETING = [
  '25% Off Day',
  '50% Off Day',
  'Liquidation Sale',
  'Final Day Discounts',
  'Last Chance Offers',
  'Everything Must Go',
];

const WHAT_IF = [
  'Your leads were automatically organized?',
  'Your contracts were generated from information already entered?',
  'Your staff knew exactly what tasks to complete?',
  'Your pricing research happened faster?',
  'Your descriptions were written for you?',
  'Your signs could be printed with a click?',
  'Your social media posts were created automatically?',
  'Your marketing emails were scheduled automatically?',
  'Your customers could scan QR codes for item details and pricing?',
  'Your checkout system tracked every transaction?',
  'Your reports and payouts practically built themselves?',
];

const SMALL_TASKS = [
  { time: 'A few minutes here.', detail: 'A client call.' },
  { time: 'Twenty minutes there.', detail: 'A staff member text.' },
  { time: 'A half hour.', detail: 'Answering buyer questions.' },
  { time: 'An hour.', detail: 'Building social media posts.' },
  { time: 'Another hour.', detail: 'Entering expenses.' },
  { time: 'Another hour.', detail: 'Preparing owner payouts.' },
];

export default function LandingPageOneDay() {
  const [showConsultation, setShowConsultation] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex items-center">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-orange-400 font-serif font-bold text-2xl tracking-tight">Estate<span className="text-white">Salen</span></span>
        </Link>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold px-4 py-1.5 rounded-full">
            For operators
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            How I Got One Full Day Per Week Back
          </h1>
          <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto">
            And Why Other operators Wanted Access to What I Created
          </p>
          <p className="text-lg text-orange-400 font-semibold">
            Save 8–10+ Hours Per Sale. Stay Organized. Market More Consistently. Grow Without Working More.
          </p>

        </div>
      </section>

      {/* Section 1: The Story */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-8 text-slate-700 text-lg leading-relaxed">

          {/* Full-width title */}
          <h2 className="text-3xl font-serif font-bold text-slate-900">The Story Behind EstateSalen.com</h2>

          {/* Two-column: intro text left, photo right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
            <div className="space-y-5">
              <p>As an estate sale company owner for nearly 10 years, I found myself working 7 days a week.</p>
              <p>Sales were profitable.</p>
              <p>I enjoyed helping families.</p>
              <p className="font-semibold text-slate-900">But every sale seemed to create hundreds of small tasks that consumed my time and left me without a break. I needed to figure out how to rescue 8-10 hours a week so I could have a day off for mental health, my daughter, and all the errands that need dedicated time.</p>
            </div>
            <div className="flex-shrink-0">
              <img
                src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/2e562cb02_616832457_2334872967012314_7243935763789800949_n.jpg"
                alt="EstateSalen Founder"
                className="rounded-2xl shadow-xl w-56 h-auto"
              />
            </div>
          </div>

          {/* Full-width rest of story */}
          <p className="font-serif text-orange-600">Here's what tied up my time and knew where a well built tool could solve my time off dilemma</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'A client would call.',
              'A staff member would text.',
              'A buyer would ask a question.',
              'A realtor would want an update.',
              'All items need accurate pricing and descriptions.',
              'A sign needed to be printed.',
              'A social media post needed to be written.',
              'A payout needed to be calculated.',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <p>None of these tasks were difficult.</p>
          <p className="font-semibold text-slate-900">But together they, and so many other tasks, stole hours from my life.</p>
          <p>I didn't need more business. I didn't need another employee.</p>
          <p className="text-2xl font-serif font-bold text-slate-900 border-l-4 border-orange-500 pl-5 py-2">
            I needed more time.
          </p>
          <p>I wanted one full day off every week — and needed to find a way to keep profitability high while growing my marketing presence and improving organization.</p>
          <p className="font-semibold text-slate-900">So I built a tool for myself.</p>
          <p>Not because I wanted to start a software company. Because I wanted to stop working every day of the week.</p>
          <p>A few months later, after showing it to several local estate sale company owners who got together for an informal dinner, they all wanted to use it too. What surprised me most wasn't that they liked the tool — it was that they were dealing with many of the <strong><em>exact same frustrations</em></strong> I was.</p>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 space-y-3">
            <p className="text-slate-900 font-bold text-xl">That's how EstateSalen.com was born.</p>
            <p className="text-slate-600">Today the platform helps save approximately <strong className="text-orange-600">8–10+ hours per sale</strong> while helping owners stay organized, market more effectively, and create additional revenue opportunities.</p>
          </div>
        </div>
      </section>

      {/* Section 2: Built For Owners Not Tech People */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">EstateSalen.com Was Built For operators, Not Tech People</h2>
          <p className="text-lg text-slate-600">Let's be honest. We didn't get into this business because we love all the business sides of things.</p>
          <p className="text-slate-600">You got into this business because you enjoy helping families, organizing sales, pricing merchandise, and creating successful events.</p>
          <p className="text-slate-600">The problem is that every year there seems to be another app, another social media platform, another marketing system, and another piece of technology you're expected to learn.</p>
          <p className="text-slate-700 font-medium">I felt exactly the same way. That's why EstateSalen.com was built around a simple rule:</p>

          <div className="bg-slate-900 text-white rounded-2xl px-8 py-8 text-center space-y-3">
            <p className="text-2xl md:text-3xl font-serif font-bold leading-snug">
              "If It Doesn't Save Time, It Doesn't Belong In The Platform."
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'You don\'t need to become a marketer.', icon: '📣' },
              { label: 'You don\'t need to become a software expert.', icon: '💻' },
              { label: 'You don\'t need to become a tech wizard.', icon: '🧙' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-2">
                <div className="text-3xl">{item.icon}</div>
                <p className="text-slate-700 font-medium text-sm">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xl font-serif font-bold text-slate-900">You simply need a button to press that does all the work for you.</p>
        </div>
      </section>

      {/* Section 3: Typical Sale Flow */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900">Is This Your Typical Sale Flow?</h2>
            <p className="text-slate-500 text-lg italic">It was mine.</p>
          </div>

          <div className="space-y-2">
            {SALE_FLOW.slice(0, 15).map((step, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${step.startsWith('SALE DAY') ? 'bg-orange-100 border border-orange-300 font-bold text-orange-900' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>{step.replace('SALE DAY 1 — ', '')}</span>
              </div>
            ))}
            <div className="bg-orange-500 text-white rounded-xl px-5 py-4 font-bold text-center text-base">
              ⚡ Actual Start of Sale Day 1
            </div>
            {SALE_FLOW.slice(15, 16).map((step, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>{step.replace('SALE DAY 1 — ', '')}</span>
              </div>
            ))}
            {/* Sale day marketing */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600 space-y-2">
              <div className="flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Promote additional sale days with updated marketing campaigns:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-7">
                {SALE_DAY_MARKETING.map(item => (
                  <span key={item} className="bg-orange-50 border border-orange-200 rounded px-3 py-1 text-xs text-orange-700 font-medium text-center">{item}</span>
                ))}
              </div>
            </div>
            {SALE_FLOW.slice(17).map((step, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${step.includes('do it all over') ? 'bg-red-50 border border-red-200 text-red-700 font-semibold' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: The Real Problem */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold">The Problem Isn't One Big Task</h2>
          <p className="text-slate-300 text-lg">The problem is not that any one task is difficult. The problem is that every sale creates dozens of endless, time-consuming tasks.</p>

          <div className="space-y-3">
            {SMALL_TASKS.map((item, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <div className="text-left min-w-[160px]">
                  <span className="text-orange-400 font-bold text-sm">{item.time}</span>
                </div>
                <div className="h-4 w-px bg-white/20 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{item.detail}</span>
              </div>
            ))}
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 space-y-3">
            <p className="text-white font-bold text-xl">Before you know it, an entire day has disappeared.</p>
            <p className="text-slate-300">The goal wasn't to eliminate the work. The goal was to <strong className="text-orange-400">eliminate the repetition</strong> — to stop spending hours every week doing things that could be automated, organized, simplified, or delegated to technology.</p>
          </div>
        </div>
      </section>

      {/* Section 5: What If */}
      <section className="py-16 px-6 bg-orange-50">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900">What If You Could Get One Full Day Back Per Week?</h2>
            <p className="text-slate-500 text-lg">What if...</p>
          </div>

          <div className="space-y-3">
            {WHAT_IF.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-orange-200 rounded-xl px-5 py-4 shadow-sm">
                <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium">{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 text-white rounded-2xl px-8 py-8 space-y-4 text-center">
            <p className="text-xl font-serif font-bold">That's exactly what I set out to create.</p>
            <p className="text-slate-300">And the result is a system that helps save approximately <strong className="text-orange-400">8–10+ hours every sale</strong> without requiring you to become a technology expert.</p>
            <p className="text-slate-300 pt-4">Yes ... there is a price for the platform ... but there's also a way <strong className="text-yellow-300">you can have it ALL for FREE</strong> by tapping into one income source you never knew was available to you. Keep reading the page and pay close attention to the <strong className="text-green-400">GREEN Section on Referral Income</strong>.</p>
            <Button
              asChild
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30 mt-2"
            >
              <Link to="/OperatorPackages">
                See How EstateSalen Works <ArrowRight className="w-5 h-5 ml-2 inline" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 6: Walk Through Coming Next */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold px-4 py-1.5 rounded-full">
            <Clock className="w-4 h-4" /> Coming Up Next
          </div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Here's How I Use EstateSalen.com Throughout The Life Of A Sale</h2>
          <p className="text-slate-500 text-lg">We'll walk through every stage of a typical estate sale and show exactly where the time savings come from.</p>
          <div className="grid sm:grid-cols-3 gap-4 text-left mt-4">
            {[
              { stage: 'Before The Sale', desc: 'Lead intake, contracts, staff coordination, and sale setup.' },
              { stage: 'During The Sale', desc: 'Checkout, offers, QR scanning, and sale-day marketing.' },
              { stage: 'After The Sale', desc: 'Reports, payouts, vendors, cleanouts, and client follow-up.' },
            ].map(item => (
              <div key={item.stage} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <p className="font-bold text-slate-900 text-sm">{item.stage}</p>
                </div>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stage-by-Stage Section */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900">Stage-by-Stage: How I Save 8–10+ Hours Per Sale</h2>
            <p className="text-slate-500 text-lg">Here's exactly where the time savings happen at each phase of an estate sale.</p>
          </div>

          <div className="space-y-3">
            <StageCard
              number="1"
              title="A New Lead Comes In"
              problem="Leads come from everywhere — phone calls, texts, Facebook messages, emails, website inquiries, referrals. The information gets scattered quickly."
              solution={[
                <>Estate sale leads are delivered directly to you through EstateSalen.com. We generate 100's of leads per year in your local area via multiple channels of paid lead sources and advertising. — and the leads are <strong>completely free</strong>.</>,
                'All lead information is organized automatically in a single CRM.',
                'No more sticky notes, notebooks, or lost pieces of paper.',
                'Everything is accessible from your computer, phone, or tablet.'
              ]}
              timeSaved="30–60 minutes"
              bonus="A CRM is simply an online place to store and manage all your clients, customers, prospects, notes, appointments, and communications — everything in one place."
            />

            <StageCard
              number="2"
              title="Schedule The Appointment"
              problem="Appointment details often end up scattered across texts, notebooks, calendars, and memory."
              solution={[
                'Appointment details remain attached to the lead record.',
                'Addresses, dates, times, client information, and notes all stay organized from the beginning.',
                'Everything accessible in one place.'
              ]}
              timeSaved="10–15 minutes"
            />

            <StageCard
              number="3"
              title="Meet With The Family"
              problem="Important information comes quickly — family dynamics, property access, valuable items, cleanout concerns, timeline requirements, special requests."
              solution={[
                'Store notes, photos, concerns, next steps, and important details directly within the sale record.',
                'Nothing gets forgotten later.',
                'Everything stays attached to the client for reference.'
              ]}
              timeSaved="15–30 minutes"
            />

            <StageCard
              number="4"
              title="Create The Proposal"
              problem="Every proposal requires the same information to be entered repeatedly."
              solution={[
                'Because information has already been collected in earlier stages, proposal creation becomes much faster and more accurate.',
                'Client information, property information, sale details, commission structure, timeline — everything is already there.'
              ]}
              timeSaved="20–30 minutes"
            />

            <StageCard
              number="5"
              title="Sign The Contract"
              problem="Contracts become an administrative task — information needs to be re-entered, documents created, signatures collected, files stored."
              solution={[
                'EstateSalen.com includes a library of estate sale contract templates that automatically populate using information already collected.',
                'Contracts can be printed and signed in person, sent electronically for eSignature, or stored directly in the CRM.',
                'If signed in person, simply scan or photograph and upload to the client record.'
              ]}
              timeSaved="10–15 minutes"
            />

            <StageCard
              number="6"
              title="Coordinate Staff"
              problem="Staff coordination gets managed through texts, phone calls, memory, and sticky notes. Difficult to manage labor costs, time cards, responsibilities, and accountability."
              solution={[
                'Every sale includes Automated Team Task Assignments.',
                'Instead of simply assigning a person, the platform creates task checklists: Setup Tasks, Pricing Tasks, Room Assignments, Sign Placement, Checkout Duties, Breakdown Tasks, Cleanout Responsibilities.',
                'Each staff member receives their checklist and marks items complete as they work.',
                'Completed tasks are automatically reported back to you.',
                'Includes generic task templates and custom task creation for specific sales.'
              ]}
              timeSaved="1–2 hours"
              bonus="The biggest benefit isn't just time savings — it's peace of mind."
            />

            <StageCard
              number="7"
              title="Order Supplies"
              problem="Signs, tags, labels, receipt paper, tape, markers — something always seems to run out at the wrong time."
              solution={[
                'Track supplies as part of the sale preparation process.',
                'Assign ordering responsibilities to staff.',
                'Never run out of critical supplies again.'
              ]}
              timeSaved="15–30 minutes"
            />

            <StageCard
              number="8"
              title="Take Photos"
              problem="Photos quickly become disorganized and difficult to find later."
              solution={[
                'Photos remain attached to the sale record.',
                'Can be reused for descriptions, marketing, social posts, featured items, and email campaigns.',
                'Everything organized in one place.',
                'You and your staff can all take photos and they post to the sale record without having to email, text, or try to compile from multiple sources.'
              ]}
              timeSaved="30–60 minutes"
            />

            <StageCard
              number="9"
              title="Research Values, Price Items & Write Descriptions"
              problem="This is one of the largest, if not the largest, time drains — researching values, pricing items, writing descriptions, creating marketing copy, then repeating hundreds of times. I used to spend at least 5-6 hours doing this. Now I'm amazed at how quickly the process goes — and can be shifted to staff as well."
              solution={[
                'The AI assistant helps identify items, research values, suggest pricing, generate descriptions, and create marketing highlights.',
                'You remain in control — the platform simply removes repetitive work.',
                'You have complete veto control over the final price, this just makes the process go way faster and smoother.'
              ]}
              timeSaved="2–3 hours"
              bonus="Smart QR Pricing: Generate printable price tags with QR codes. Customers scan to view description, details, photos, and price. Automate pricing changes as the sale progresses (Day 1 = Full Price, Day 2 = 25% Off, Final = 50% Off, Last Hours = Liquidation). No replacing hundreds of tags. No confusion. Dramatically improves final-day sell-through."
            />

            <StageCard
              number="10"
              title="Create Signs"
              problem="Every sale requires lots of signs, and most estate sale company owners create the same signs repeatedly."
              solution={[
                'EstateSalen.com includes a gallery of pre-built estate sale sign templates.',
                'Your company logo automatically appears on every sign.',
                'Includes Directional Signs, Street Signs, Checkout Signs, Pickup Instructions, Sale Policies, Discount Day Signs, Liquidation Signs, Sold Item Signs.',
                'Simply select, print, and go — or assign to a team member as an automated task.'
              ]}
              timeSaved="30–60 minutes"
            />

            <StageCard
              number="11"
              title="Build Social Media Posts"
              problem="We are not professional marketers — and shouldn't have to be."
              solution={[
                'The AI generates Facebook Posts, Instagram Posts, Featured Item Promotions, Countdown Posts, Opening Day Campaigns, Discount Day Campaigns, Liquidation Posts, Final Day Marketing.',
                'Connect your social media accounts directly to the platform.',
                'The AI writes the content, the platform publishes the content.',
                'With a few clicks, your sale is promoted across multiple social channels automatically.',
                'Promote sales in 3x more places with far more consistency because the work is already done.'
              ]}
              timeSaved="2 hours"
            />

            <StageCard
              number="12"
              title="Send Marketing Emails"
              problem="We build buyer lists but rarely use them consistently."
              solution={[
                "The AI creates the email content for you.",
                "The AI also helps schedule the campaign.",
                "With a click, the campaign is pushed directly into your connected email marketing provider and scheduled to launch automatically.",
                "No copying, pasting, or rebuilding campaigns.",
                "The CRM automatically updates your email marketing system with new and existing customers.",
                "Track Open Rates, Click Rates, Campaign Performance, and Buyer Engagement.",
                "If you've never used email marketing before, this makes it much easier to test the waters."
              ]}
              timeSaved="1–2 hours"
            />
            <StageCard
              number="13"
              title="Answer Customer Questions"
              problem={`Every sale generates the same questions — "Is it still available?", "What are the dimensions?", "Will you take an offer?", "Do you deliver?", "Can I buy it before the sale?" Answering the same questions repeatedly consumes valuable time.`}
              solution={[
                "Customer communications stay attached to the sale and item records.",
                "Staff members can access information quickly.",
                "QR-enabled item pages can answer many customer questions before they even ask.",
                "Customers get faster answers. Staff spend less time repeating information."
              ]}
              timeSaved="30 minutes"
            />

            <StageCard
              number="14"
              title="Actual Start of Sale & Checkouts"
              problem="Once the doors open, everything moves quickly — staff questions, customer questions, checkout lines, offers, discount requests, large item pickups. Without a proper system, information gets lost, mistakes happen, and checkout becomes chaotic."
              solution={[
                "The sale dashboard keeps everything organized — Customer Purchases, Item Offers, Staff Activity, Daily Sales Totals, Discounts, Transactions, Payment Methods, Large Item Pickups.",
                "EstateSalen includes one of the first checkout (POS) systems built specifically for estate sale companies.",
                "All items become searchable during checkout via QR Code Scanning, Item Search, Description Search, and Category Search.",
                "Supports Single Item, Multi-Item, Bundled Purchases, Custom Discounts, and auto-updating Discount Day / Final Day Pricing.",
                "Every transaction is automatically logged and connected to the sale."
              ]}
              timeSaved="1–2 hours"
              bonus="End-To-End Financial Tracking: Every checkout compiles into Owner Settlement Reports, Internal Reporting, Accounting Records, and Tax Preparation — automatically, because it was captured throughout the process. Faster Checkout. Fewer Errors. Better Records. More Professional Owner Reports."
            />

            <StageCard
              number="15"
              title="Promote Additional Sale Days"
              problem="We market heavily before the sale and then stop — but Day 2 and Day 3 require entirely different messaging."
              solution={[
                "The AI can automatically generate: 25% Off Day Promotions, 50% Off Day Promotions, Final Day Promotions, Liquidation Campaigns, Last Chance Alerts, Everything Must Go Messaging.",
                "Social media and email campaigns can be regenerated and published in minutes."
              ]}
              timeSaved="30–60 minutes"
            />

            <StageCard
              number="16"
              title="Coordinate Deliveries, Movers, Donations & Vendors"
              problem="After purchases are made, somebody still has to coordinate deliveries, movers, donation pickups, junk removal, and cleanout companies. The communication never stops."
              solution={[
                "Vendor information stays attached to the sale.",
                "Appointments, notes, tasks, and follow-up requirements remain organized and easy to find."
              ]}
              timeSaved="30–60 minutes"
            />

            <StageCard
              number="17"
              title="Prepare Reports"
              problem="After the sale comes the paperwork — and most owners wait until the sale is over before they begin creating reports."
              solution={[
                "Because every transaction, expense, task, customer, and communication has already been captured, reporting becomes dramatically easier.",
                "Generate Owner Reports, Staff Reports, Sales Reports, Item Reports, and Marketing Activity and Social Media Reports."
              ]}
              timeSaved="30–60 minutes"
            />

            <StageCard
              number="18"
              title="Calculate and Enter All Expenses"
              problem="Receipts pile up. Expenses get forgotten. Advertising costs get missed. Labor expenses get estimated. Mistakes become expensive."
              solution={[
                "Track expenses as they occur.",
                "Attach them directly to the sale.",
                "Store receipts digitally.",
                "Keep everything organized throughout the process."
              ]}
              timeSaved="30 minutes"
            />

            <StageCard
              number="19"
              title="Pay Staff"
              problem="Calculating payroll after every sale can become tedious — hours, tasks, setup days, sale days, and breakdown days all need to be verified."
              solution={[
                "Because staff assignments and task completion are already tracked inside the platform, payroll becomes easier to verify and calculate."
              ]}
              timeSaved="15–30 minutes"
            />

            <StageCard
              number="20"
              title="Calculate and Deliver Payouts"
              problem="This is one of the most important moments in the entire client relationship. Mistakes create distrust. Confusing reports create questions."
              solution={[
                "EstateSalen organizes Gross Sales, Expenses, Commission Calculations, Net Proceeds, Owner Statements, and Payment History.",
                "Create professional reports that help owners clearly understand the results of their sale."
              ]}
              timeSaved="30–60 minutes"
            />

            <StageCard
              number="21"
              title="Coordinate Cleanout & Other Vendors"
              problem="The sale may be over, but the work isn't. There may still be donations, cleanouts, removals, and service providers to coordinate."
              solution={[
                "Vendor follow-ups stay attached to the sale until every remaining task has been completed."
              ]}
              timeSaved="30 minutes"
            />

            <StageCard
              number="22"
              title="Break Down Tables and Move to the Next Sale"
              problem="Most software companies stop talking once the sale ends. Estate sale company owners know better — tables need to be packed, supplies organized, equipment moved, and the next sale is already waiting."
              solution={[
                "Assign breakdown responsibilities to staff.",
                "Track completion.",
                "Make sure nothing gets forgotten before moving to the next location."
              ]}
              timeSaved="15–30 minutes"
            />

            <StageCard
              number="23"
              title="Final Follow Up With the Client"
              problem="Many owners move immediately to the next sale and forget the importance of the final touch — where referrals, reviews, testimonials, and future opportunities are created."
              solution={[
                "The platform helps track final follow-ups and reminders so every client receives a professional closing experience."
              ]}
              timeSaved="15–30 minutes"
            />
          </div>
        </div>
      </section>

      {/* AI Agent Bonus Section */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-3xl">🤖</div>
            <div>
              <div className="inline-block bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold px-3 py-1 rounded-full mb-2">Special Bonus</div>
              <h2 className="text-3xl font-serif font-bold">Your 24/7 AI Business Advisor</h2>
            </div>
          </div>

          <p className="text-slate-300 text-lg leading-relaxed">We don't have a coach, consultant, or advisor available around the clock. With EstateSalen.com, you do.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: '🕐',
                title: 'Available 24 Hours a Day, 7 Days a Week',
                desc: 'Whether it\'s 6am before a setup day or 11pm after a long sale, your AI advisor is there when you need it — no appointments, no waiting, no scheduling required.'
              },
              {
                icon: '📋',
                title: 'Build Your Sale From Scratch',
                desc: 'Tell the AI about your upcoming sale and it will help you build a complete action plan — tasks, timelines, marketing ideas, pricing strategies, and staff assignments.'
              },
              {
                icon: '💡',
                title: 'Business Strategy & Consulting',
                desc: 'Ask questions you\'d normally save for a $300/hour consultant. How should I price my commission? How do I handle a difficult client? How can I grow my buyer list faster?'
              },
              {
                icon: '✍️',
                title: 'Write Anything. Instantly.',
                desc: 'Emails to clients. Proposals. Social posts. Item descriptions. Sale announcements. Contracts. Marketing copy. The AI drafts it and you approve it — in seconds, not hours.'
              },
              {
                icon: '📊',
                title: 'Analyze Your Business Performance',
                desc: 'Ask the AI to review your sale data, identify patterns, highlight what\'s working, and suggest where you can improve sell-through, marketing, or operations.'
              },
              {
                icon: '🎯',
                title: 'Personalized to Your Business',
                desc: 'The AI learns your company name, commission structure, service area, and preferences — so every response is tailored to your specific business, not generic advice.'
              },
              {
                icon: '📦',
                title: 'Item Research & Pricing Support',
                desc: 'Stuck on an item? Describe it to the AI and get instant research, comparable sales data, pricing suggestions, and a ready-to-use description — all in one message.'
              },
              {
                icon: '🚀',
                title: 'Sale Launch Checklists On Demand',
                desc: 'Ask the AI to generate a complete pre-sale checklist for any upcoming event. Every task, every deadline, every responsibility — organized and ready to assign.'
              },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-5 py-5 space-y-2 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <h4 className="font-bold text-white text-sm">{item.title}</h4>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed pl-9">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl px-8 py-8 space-y-4">
            <p className="text-white font-bold text-xl font-serif">"It's like having a business partner who never sleeps."</p>
            <p className="text-slate-300 leading-relaxed">We are running their business solo — making every decision, solving every problem, writing every email, and figuring out every challenge by themselves. The EstateSalen AI advisor changes that. It won't replace your judgment. But it will make sure you're never stuck, never alone, and never starting from a blank page again.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {['Ask anything. Anytime.', 'No extra charge.', 'Included with your plan.'].map((tag, i) => (
                <span key={i} className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold px-4 py-1.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bonus Revenue Section */}
      <ReferralIncomeSection />

      {/* Time Savings Summary */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Where the 8–10+ Hours Actually Come From</h2>
          <div className="grid gap-2">
            {[
              ["Lead Intake & CRM", "30–60 minutes"],
              ["Appointments & Consultation", "30–45 minutes"],
              ["Proposal & Contracts", "30–45 minutes"],
              ["Staff Coordination", "1–2 hours"],
              ["Photos & Organization", "30–60 minutes"],
              ["Pricing & Descriptions", "2–3 hours"],
              ["Sign Creation", "30–60 minutes"],
              ["Social Media Marketing", "2 hours"],
              ["Email Marketing", "1–2 hours"],
              ["Customer Questions", "30 minutes"],
              ["Sale Day & POS", "1–2 hours"],
              ["Additional Sale Promotions", "30–60 minutes"],
              ["Vendor Coordination", "30–60 minutes"],
              ["Reporting", "30–60 minutes"],
              ["Expenses & Payroll", "45–60 minutes"],
              ["Owner Payouts", "30–60 minutes"],
              ["Cleanout Coordination", "30 minutes"],
              ["Final Follow-Up", "15–30 minutes"],
            ].map(([label, time], i, arr) => (
              <React.Fragment key={i}>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-700 font-medium">{label}</span>
                  <span className="text-orange-600 font-bold text-sm">{time}</span>
                </div>
                {i === arr.length - 1 && (
                  <div className="flex items-center justify-between py-3 border-t-2 border-slate-300 mt-2 font-bold">
                    <span className="text-slate-900">Total Hours Per Sale</span>
                    <span className="text-orange-700 text-lg">14–23 hours</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* The Bottom Line */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">The Bottom Line</h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>EstateSalen.com wasn't built by software developers trying to understand the estate sale business.</p>
            <p>It was built by an estate sale company owner trying to solve his own problems.</p>
            <p>The goal was never to build software. The goal was simple: <span className="text-white font-bold">get one full day of my life back every week.</span></p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {[
              "Stay Organized",
              "Save Time",
              "Market More Consistently",
              "Improve Sell-Through",
              "Create Better Client Experiences",
              "Generate Additional Revenue Opportunities",
              "Reclaim One Full Day Per Week",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-slate-200">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-400 pt-2">Without becoming marketers. Without becoming accountants. Without becoming software experts. Without becoming tech wizards. <span className="text-white">Just by using better systems.</span></p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl font-serif font-bold">Ready To See How It Works?</h2>
          <p className="text-orange-100 text-xl">Schedule a quick walkthrough and I'll show you exactly how EstateSalen.com can help simplify your next sale.</p>
          <div className="space-y-2 pt-2">
            <p className="font-bold text-lg">Save 8–10+ Hours Per Sale</p>
            <p className="font-bold text-lg">Reclaim One Full Day Every Week</p>
            <p className="font-bold text-lg">Grow Without Working More</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              asChild
              className="bg-orange-700 hover:bg-orange-800 text-white text-xl font-bold px-10 py-7 rounded-xl shadow-xl border border-orange-400"
            >
              <Link to="/OperatorPackages">View Pricing &amp; Packages</Link>
            </Button>
          </div>
        </div>
      </section>

      <ConsultationModal open={showConsultation} onClose={() => setShowConsultation(false)} />

    </div>
  );
}