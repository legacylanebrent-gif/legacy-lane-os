import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { US_STATES } from '@/components/data/USStates';
import { MapPin, Building2, BookOpen, Briefcase, MessageSquare, Quote } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah M.",
    location: "Miami, FL",
    text: "Thanks for your website and help getting someone to handle my mother's estate sale. The company I found was professional and exceeded expectations!",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop"
  },
  {
    name: "Robert T.",
    location: "Austin, TX",
    text: "I secured a great company through Legacy Lane. Thanks for all your help! You guys are fantastic and made the process so easy.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop"
  },
  {
    name: "Jennifer L.",
    location: "Chicago, IL",
    text: "Hired one of your companies! I'm very pleased with their professionalism and the results they delivered for our estate sale.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop"
  }
];

export default function Operators() {
  const [selectedState, setSelectedState] = useState('');

  const handleStateSearch = () => {
    if (selectedState) {
      window.location.href = createPageUrl('StateCities') + `?state=${selectedState}`;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-white">Legacy Lane</h1>
                <p className="text-xs text-orange-400">Estate Sale Companies</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="text-white hover:text-orange-400">Find Sales</Button>
              </Link>
              <Link to={createPageUrl('BrowseItems')}>
                <Button variant="ghost" className="text-white hover:text-orange-400">Shop Items</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-serif font-bold mb-8">
            Find Estate Sale Companies
          </h1>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
              <Link to={createPageUrl('SearchByState')} className="flex-1 w-full md:w-auto">
                <Button 
                  size="lg" 
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-14 text-lg"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  Search by State
                </Button>
              </Link>
              
              <span className="text-white font-semibold">Or</span>
              
              <div className="flex-1 w-full md:w-auto">
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="h-14 bg-white text-slate-900 text-lg border-0">
                    <SelectValue placeholder="Select Your State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedState && (
              <Button 
                onClick={handleStateSearch}
                className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto"
              >
                Find Companies in {US_STATES.find(s => s.code === selectedState)?.name}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Request Help Section */}
      <section className="bg-gradient-to-r from-orange-50 to-amber-50 py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MessageSquare className="w-16 h-16 text-orange-600 mx-auto mb-6" />
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
            Need help finding a company? We've made it easy.
          </h2>
          <p className="text-xl text-slate-600 mb-6">
            We'll contact the companies for you!
          </p>
          <Link to={createPageUrl('Messages')}>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-lg px-8">
              Submit a Sale Request
            </Button>
          </Link>
        </div>
      </section>

      {/* Info Cards */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Tips Card */}
            <Card className="border-2 border-slate-200 hover:border-cyan-500 transition-all hover:shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-10 h-10 text-cyan-600" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 mb-4">
                  Tips For Choosing a Company
                </h3>
                <p className="text-slate-600 mb-6">
                  Make a list of questions to ask each company. That way you're comparing apples to apples. For more tips about choosing a liquidator, click "Learn More" below!
                </p>
                <Button variant="outline" className="border-cyan-600 text-cyan-600 hover:bg-cyan-50">
                  Learn More
                </Button>
              </CardContent>
            </Card>

            {/* List Company Card */}
            <Card className="border-2 border-slate-200 hover:border-orange-500 transition-all hover:shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 mb-4">
                  List Your Company
                </h3>
                <p className="text-slate-600 mb-6">
                  Legacy Lane has provided a way for estate sale companies nationwide to grow beyond their expectations. List your company today!
                </p>
                <Link to={createPageUrl('Onboarding')}>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    List Your Company
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-br from-slate-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-12">
            What People Are Saying About Companies Listed on Legacy Lane
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="border-2 border-slate-200 hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-orange-400 mb-4" />
                  <p className="text-slate-700 mb-6 italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{testimonial.name}</p>
                      <p className="text-sm text-slate-500">{testimonial.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm">
            © 2024 Legacy Lane. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}