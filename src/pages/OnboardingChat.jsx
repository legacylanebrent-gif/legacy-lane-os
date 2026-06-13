import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles, Store, Home, Briefcase, ShoppingBag, Search, MapPin, Heart, Star, Camera, Gift, CheckCircle2, Loader2, Gem, Building2, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_OPTIONS = [
  {
    id: 'consumer',
    label: 'Estate Sale Shopper',
    description: 'I want to find and attend estate sales, save favorites, and earn rewards',
    icon: ShoppingBag,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'estate_sale_operator',
    label: 'Estate Sale Company Owner',
    description: 'I run an estate sale company and want to list sales, manage inventory, and grow my business',
    icon: Store,
    color: 'bg-cyan-100 text-cyan-600',
  },
  {
    id: 'real_estate_agent',
    label: 'Real Estate Agent',
    description: 'I help clients with probate, downsizing, and inherited property sales',
    icon: Home,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'collector_dealer',
    label: 'Collector / Dealer',
    description: 'I buy and sell antiques, art, collectibles, or vintage items and source from estate sales',
    icon: Gem,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'vendor',
    label: 'Service Provider / Vendor',
    description: 'I provide cleanout, moving, staging, or other estate transition services',
    icon: Briefcase,
    color: 'bg-green-100 text-green-600',
  },
];

const CONSUMER_STEPS = [
  { id: 'consumerLocation', label: 'Your Location', icon: MapPin },
  { id: 'consumerISO', label: 'Hunt List', icon: Search },
  { id: 'consumerFavorites', label: 'Favorites', icon: Heart },
  { id: 'consumerCheckins', label: 'Rewards', icon: Gift },
];

export default function OnboardingChat() {
  const navigate = useNavigate();
  const [step, setStep] = useState('welcome');
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Consumer onboarding state
  const [zipCode, setZipCode] = useState('');
  const [geoError, setGeoError] = useState('');
  const [consumerStepIdx, setConsumerStepIdx] = useState(0);
  const [isoItem, setIsoItem] = useState({ title: '', category: '', budget: '' });
  const [isoCreated, setIsoCreated] = useState(false);

  // Operator onboarding state
  const [companyName, setCompanyName] = useState('');
  const [operatorZip, setOperatorZip] = useState('');
  const [operatorCity, setOperatorCity] = useState('');
  const [operatorState, setOperatorState] = useState('');
  const [serviceStates, setServiceStates] = useState([]);
  const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        // If user already completed onboarding, skip
        if (me.onboarding_completed) {
          navigate(createPageUrl('Dashboard'));
          return;
        }
        setStep('role');
      } else {
        setStep('welcome');
      }
    } catch (e) {
      console.error('Auth check failed:', e);
      setStep('welcome');
    } finally {
      setLoading(false);
    }
  };

  // ── Role Selection ──
  const handleRoleSelect = async (roleId) => {
    setSelectedRole(roleId);
    setSaving(true);
    try {
      // Estate Sale Company Owners → guided setup flow
      if (roleId === 'estate_sale_operator') {
        await base44.auth.updateMe({ primary_account_type: roleId });
        setStep('operatorCompany');
        setSaving(false);
        return;
      }

      // Save role
      await base44.auth.updateMe({ primary_account_type: roleId });

      // Consumers → guided onboarding flow
      if (roleId === 'consumer') {
        setStep('consumerLocation');
      } else {
        // Non-consumer, non-operator → mark complete, go to Dashboard
        await base44.auth.updateMe({ onboarding_completed: true });
        setStep('complete');
      }
    } catch (e) {
      console.error('Failed to save role:', e);
      alert('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConsumerComplete = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        primary_account_type: 'consumer',
        onboarding_completed: true,
      });
      navigate(createPageUrl('Dashboard'));
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
      alert('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Operator: Company Name ──
  const handleOperatorCompany = () => {
    if (!companyName.trim()) return;
    setSaving(true);
    base44.auth.updateMe({ company_name: companyName }).then(() => {
      setStep('operatorLocation');
    }).catch((e) => {
      console.error(e);
      alert('Something went wrong. Please try again.');
    }).finally(() => setSaving(false));
  };

  const handleSkipOperatorCompany = () => setStep('operatorLocation');

  // ── Operator: Location ──
  const handleOperatorLocation = async () => {
    if (!operatorZip || operatorZip.length < 5) {
      setGeoError('Please enter a valid ZIP code');
      return;
    }
    setSaving(true);
    setGeoError('');
    try {
      const res = await base44.functions.invoke('geocodeZip', { zip: operatorZip });
      const data = res.data;
      if (data?.lat && data?.lng) {
        await base44.auth.updateMe({
          location: { lat: data.lat, lng: data.lng },
          zip_code: operatorZip,
          city: operatorCity || data.city || '',
          state: operatorState || data.state || '',
        });
        setStep('operatorServices');
      } else {
        setGeoError('Could not find that ZIP code. Please try another.');
      }
    } catch (e) {
      setGeoError('Could not verify location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipOperatorLocation = () => setStep('operatorServices');

  // ── Operator: Service States ──
  const toggleState = (st) => {
    setServiceStates(prev =>
      prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]
    );
  };

  const handleOperatorServices = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ service_states: serviceStates });
      setStep('operatorIntro');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipOperatorServices = () => setStep('operatorIntro');

  // ── Operator: Platform Intro → Packages ──
  const handleOperatorToPackages = async () => {
    navigate(createPageUrl('OperatorPackages'));
  };

  // ── Consumer: Location ──
  const handleLocationSubmit = async () => {
    if (!zipCode || zipCode.length < 5) {
      setGeoError('Please enter a valid ZIP code');
      return;
    }
    setSaving(true);
    setGeoError('');
    try {
      const res = await base44.functions.invoke('geocodeZip', { zip: zipCode });
      const data = res.data;
      if (data?.lat && data?.lng) {
        await base44.auth.updateMe({
          location: { lat: data.lat, lng: data.lng },
          zip_code: zipCode
        });
        setConsumerStepIdx(1);
        setStep('consumerISO');
      } else {
        setGeoError('Could not find that ZIP code. Please try another.');
      }
    } catch (e) {
      setGeoError('Could not verify location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Consumer: ISO Wanted Items ──
  const handleSkipISO = () => {
    setConsumerStepIdx(2);
    setStep('consumerFavorites');
  };

  const handleCreateISO = async () => {
    if (!isoItem.title.trim()) return;
    setSaving(true);
    try {
      await base44.entities.WantedItem.create({
        buyer_id: user.id,
        buyer_name: user.full_name,
        title: isoItem.title,
        category: isoItem.category || '',
        budget_min: isoItem.budget ? parseFloat(isoItem.budget) : null,
        status: 'active',
      });
      setIsoCreated(true);
    } catch (e) {
      console.error('Failed to create wanted item:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleISOContinue = () => {
    setConsumerStepIdx(2);
    setStep('consumerFavorites');
  };

  // ── Consumer: Favorite Companies ──
  const handleFavoritesContinue = () => {
    setConsumerStepIdx(3);
    setStep('consumerCheckins');
  };

  // ── Consumer: Check-ins & Rewards ──
  const handleFinishConsumer = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      navigate(createPageUrl('Dashboard'));
    } catch (e) {
      console.error('Failed to complete:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Step Animations ──
  const fadeIn = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.3 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 text-lg">Loading...</div>
      </div>
    );
  }

  // ── WELCOME (unauthenticated) ──
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Welcome to EstateSalen.com</h1>
              <p className="text-slate-600">
                Discover estate sales near you, find unique treasures, and connect with estate sale professionals nationwide.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base"
              >
                Sign Up or Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-slate-400">
                Create a free account to save sales, earn rewards, and get personalized alerts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── ROLE SELECTION ──
  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 p-6">
        <div className="max-w-2xl mx-auto pt-8 pb-16">
          <motion.div {...fadeIn} className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">
              Hi{user?.full_name ? ` ${user.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-lg text-slate-600">
              How would you like to use EstateSalen.com?
            </p>
          </motion.div>

          <div className="space-y-4">
            {ROLE_OPTIONS.map((role) => (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: ROLE_OPTIONS.indexOf(role) * 0.08 }}
                onClick={() => handleRoleSelect(role.id)}
                disabled={saving}
                className="w-full text-left bg-white rounded-xl border-2 border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all p-5 flex items-start gap-4 disabled:opacity-60"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${role.color}`}>
                  <role.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg">{role.label}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-3" />
              </motion.button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleConsumerComplete}
              disabled={saving}
              className="text-sm text-slate-500 hover:text-orange-600 underline"
            >
              Just browsing — continue as a shopper
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── OPERATOR: Company Name ──
  if (step === 'operatorCompany') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <motion.div {...fadeIn} className="text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-cyan-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">What's your company name?</h1>
              <p className="text-slate-600">
                This is how buyers and clients will find your estate sale business.
              </p>
            </motion.div>
            <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-3">
              <Input
                placeholder="e.g. Smith Estate Sales & Services"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-center text-lg h-12"
              />
              <Button
                onClick={handleOperatorCompany}
                disabled={saving || !companyName.trim()}
                className="w-full bg-cyan-600 hover:bg-cyan-700 h-12 text-base"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button onClick={handleSkipOperatorCompany} className="w-full text-sm text-slate-400 hover:text-slate-600">
                I'll set it up later
              </button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── OPERATOR: Location ──
  if (step === 'operatorLocation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <motion.div {...fadeIn} className="text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-cyan-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Where's your home base?</h1>
              <p className="text-slate-600">
                This helps match you with leads and sales in your area.
              </p>
            </motion.div>
            <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="ZIP code" value={operatorZip} onChange={(e) => { setOperatorZip(e.target.value); setGeoError(''); }} maxLength={5} className="h-12" />
                <Input placeholder="City" value={operatorCity} onChange={(e) => setOperatorCity(e.target.value)} className="h-12" />
              </div>
              <Input placeholder="State (e.g. NJ)" value={operatorState} onChange={(e) => setOperatorState(e.target.value.toUpperCase())} maxLength={2} className="h-12" />
              {geoError && <p className="text-red-500 text-sm text-center">{geoError}</p>}
              <Button
                onClick={handleOperatorLocation}
                disabled={saving || operatorZip.length < 5}
                className="w-full bg-cyan-600 hover:bg-cyan-700 h-12 text-base"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                Set Location
              </Button>
              <button onClick={handleSkipOperatorLocation} className="w-full text-sm text-slate-400 hover:text-slate-600">Skip for now</button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── OPERATOR: Service States ──
  if (step === 'operatorServices') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 p-6">
        <div className="max-w-lg mx-auto pt-8 pb-16">
          <motion.div {...fadeIn} className="text-center mb-6">
            <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Where do you operate?</h1>
            <p className="text-slate-600">Select the states where you run estate sales. This helps us route local leads to you.</p>
          </motion.div>
          <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-4">
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
              {US_STATES.map(st => (
                <button
                  key={st}
                  onClick={() => toggleState(st)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    serviceStates.includes(st) ? 'bg-cyan-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-cyan-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center">
              {serviceStates.length === 0 ? 'Select all that apply' : `${serviceStates.length} state${serviceStates.length > 1 ? 's' : ''} selected`}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleOperatorServices} disabled={saving} className="flex-1 bg-cyan-600 hover:bg-cyan-700 h-12 text-base">
                Save & Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={handleSkipOperatorServices} className="h-12">Skip</Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── OPERATOR: Platform Intro → Packages ──
  if (step === 'operatorIntro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <motion.div {...fadeIn} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">
                {companyName ? `${companyName} is ready to grow` : "You're ready to grow"}
              </h1>
              <p className="text-slate-600 mb-4">Next up: choose a plan that fits your business. Here's what you'll get:</p>
            </motion.div>
            <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Store, label: 'List Your Sales', desc: 'Professional sale pages with photos' },
                  { icon: Search, label: 'Get Found', desc: 'Appear on our marketplace & local search' },
                  { icon: MapPin, label: 'Receive Leads', desc: 'Leads routed from your service area' },
                  { icon: Camera, label: 'Market Your Sales', desc: 'Social ads, emails & buyer alerts' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <item.icon className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                    <p className="font-semibold text-xs text-slate-800">{item.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
              <Button onClick={handleOperatorToPackages} className="w-full bg-cyan-600 hover:bg-cyan-700 h-12 text-base">
                View Plans & Pricing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-slate-400 text-center">
                After picking a plan, we'll ask a few more questions to personalize your experience.
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── CONSUMER: Location ──
  if (step === 'consumerLocation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <motion.div {...fadeIn} className="text-center">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-cyan-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Where are you?</h1>
              <p className="text-slate-600">
                We'll show you estate sales near your area and alert you when new ones pop up nearby.
              </p>
            </motion.div>

            <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-3">
              <Input
                placeholder="Enter your ZIP code"
                value={zipCode}
                onChange={(e) => { setZipCode(e.target.value); setGeoError(''); }}
                className="text-center text-lg h-12"
                maxLength={5}
              />
              {geoError && <p className="text-red-500 text-sm text-center">{geoError}</p>}
              <Button
                onClick={handleLocationSubmit}
                disabled={saving || zipCode.length < 5}
                className="w-full bg-cyan-600 hover:bg-cyan-700 h-12 text-base"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                Set My Location
              </Button>
              <button
                onClick={() => { setConsumerStepIdx(1); setStep('consumerISO'); }}
                className="w-full text-sm text-slate-400 hover:text-slate-600"
              >
                Skip for now
              </button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── CONSUMER: ISO Wanted Items ──
  if (step === 'consumerISO') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <motion.div {...fadeIn} className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Create Your Hunt List</h1>
              <p className="text-slate-600">
                Tell us what you're looking for — vintage furniture, art, jewelry, records — and we'll notify you the moment matching items appear at estate sales near you.
              </p>
            </motion.div>

            {!isoCreated ? (
              <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-3">
                <Input
                  placeholder="What are you hunting for? (e.g. Mid-century dining table)"
                  value={isoItem.title}
                  onChange={(e) => setIsoItem({ ...isoItem, title: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Category (e.g. Furniture, Art, Jewelry)"
                  value={isoItem.category}
                  onChange={(e) => setIsoItem({ ...isoItem, category: e.target.value })}
                />
                <Input
                  placeholder="Budget (optional)"
                  value={isoItem.budget}
                  onChange={(e) => setIsoItem({ ...isoItem, budget: e.target.value })}
                  type="number"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleCreateISO}
                    disabled={saving || !isoItem.title.trim()}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 h-12 text-base"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Add to Hunt List
                  </Button>
                  <Button variant="outline" onClick={handleISOContinue} className="h-12">
                    Next
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div {...fadeIn} className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-slate-700 font-medium">Item added to your hunt list!</p>
                <p className="text-sm text-slate-500">You can add more items anytime from your profile.</p>
                <Button onClick={handleISOContinue} className="bg-orange-600 hover:bg-orange-700">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            <button onClick={handleSkipISO} className="w-full text-sm text-slate-400 hover:text-slate-600">
              Skip for now — I'll set it up later
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── CONSUMER: Favorite Companies ──
  if (step === 'consumerFavorites') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <motion.div {...fadeIn} className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Follow Your Favorites</h1>
              <p className="text-slate-600">
                Follow estate sale companies you love and get notified the moment they post a new sale. Never miss the good ones.
              </p>
            </motion.div>

            <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {['Get sale alerts', 'Early access', 'Company updates', 'Save favorites'].map((benefit) => (
                  <div key={benefit} className="bg-slate-50 rounded-xl p-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-600">{benefit}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link to="/BrowseOperators" className="flex-1">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base">
                    Browse Companies
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleFavoritesContinue} className="h-12">
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── CONSUMER: Check-ins & Rewards ──
  if (step === 'consumerCheckins') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            <motion.div {...fadeIn} className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Earn Rewards</h1>
              <p className="text-slate-600">
                Check in at estate sales and earn rewards. The more sales you visit, the more perks you unlock — early access, discounts, and exclusive finds.
              </p>
            </motion.div>

            <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-amber-50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Scan & Check In</p>
                    <p className="text-xs text-slate-500">Use your camera at any sale</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Climb the Leaderboard</p>
                    <p className="text-xs text-slate-500">Top visitors get featured</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Unlock Perks</p>
                    <p className="text-xs text-slate-500">Early sign-in, VIP access, discounts</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleFinishConsumer}
                disabled={saving}
                className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Finish Setup <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── COMPLETION (non-consumer roles) ──
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">You're all set!</h1>
              <p className="text-slate-600">
                Your account is ready. Start discovering estate sales, saving favorites, and earning rewards.
              </p>
            </div>
            <Button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}