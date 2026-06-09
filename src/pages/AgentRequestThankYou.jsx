import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Users, Mail, Phone } from 'lucide-react';

export default function AgentRequestThankYou() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img
            src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png"
            alt="EstateSalen"
            className="h-9 w-9 object-contain"
          />
          <span className="font-serif font-bold text-slate-800 text-xl">EstateSalen.com</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              Your Listing Has Been Submitted
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Thank you. Your listing has been added to the EstateSalen operator opportunity pool.
              If estate sale companies service the area and believe they may be able to help,
              they may contact you using your preferred contact method.
            </p>
          </div>

          {/* What happens next */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-left space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">What Happens Next</h2>
            {[
              { step: '1', text: 'EstateSalen matches your listing to local operators in the service area.' },
              { step: '2', text: 'Operators review the opportunity and decide if they can help.' },
              { step: '3', text: 'Interested operators may contact you directly using your preferred contact method.' },
              { step: '4', text: 'You decide whether the service is a fit for your seller. No obligation.' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-orange-600">{step}</span>
                </div>
                <p className="text-slate-600 pt-1">{text}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Return to EstateSalen.com <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/agent-referral-program"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <Users className="w-4 h-4" />
              Learn About Agent Referral Partner Program
            </a>
          </div>

          <p className="text-xs text-slate-400">
            Questions? Contact us at <a href="mailto:support@estatesalen.com" className="underline">support@estatesalen.com</a>
          </p>
        </div>
      </main>
    </div>
  );
}