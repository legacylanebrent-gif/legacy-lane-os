import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OnboardingQuestions from '@/components/onboarding/OnboardingQuestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles, Store, Home, Briefcase, ShoppingBag } from 'lucide-react';

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
    id: 'vendor',
    label: 'Service Provider / Vendor',
    description: 'I provide cleanout, moving, staging, or other estate transition services',
    icon: Briefcase,
    color: 'bg-green-100 text-green-600',
  },
];

export default function OnboardingChat() {
  const navigate = useNavigate();
  const [step, setStep] = useState('welcome'); // welcome | role | classify | complete
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        // If user already has a non-consumer role, skip onboarding
        if (me.primary_account_type && me.primary_account_type !== 'consumer') {
          navigate(createPageUrl('Dashboard'));
          return;
        }
        // If user has already completed onboarding, skip
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

  const handleRoleSelect = async (roleId) => {
    setSelectedRole(roleId);
    setSaving(true);
    try {
      if (roleId === 'estate_sale_operator') {
        await base44.auth.updateMe({
          primary_account_type: roleId,
          onboarding_completed: true,
        });
        navigate(createPageUrl('OperatorPackages'));
        return;
      }

      await base44.auth.updateMe({
        primary_account_type: roleId,
        onboarding_completed: true,
      });
      setStep('complete');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 text-lg">Loading...</div>
      </div>
    );
  }

  // Welcome screen — not authenticated
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

  // Role selection screen
  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 p-6">
        <div className="max-w-2xl mx-auto pt-8 pb-16">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">
              Hi{user?.full_name ? ` ${user.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-lg text-slate-600">
              How would you like to use EstateSalen.com?
            </p>
          </div>

          <div className="space-y-4">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.id}
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
              </button>
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

  // Completion screen
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