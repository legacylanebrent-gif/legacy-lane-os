import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Home, TrendingUp, ShoppingBag, GraduationCap, Users, Building2, Package, Hammer, UserCheck } from 'lucide-react';

const ROLE_CATEGORIES = {
  internal: {
    title: 'Legacy Lane Team',
    subtitle: 'Internal operations & management',
    roles: [
      { value: 'super_admin', label: 'Super Admin', icon: UserCheck, description: 'Full system access' },
      { value: 'platform_ops', label: 'Platform Operations', icon: Building2, description: 'Approvals & compliance' },
      { value: 'growth_team', label: 'Growth Team', icon: TrendingUp, description: 'Marketing & analytics' },
      { value: 'partnerships', label: 'Partnerships', icon: Users, description: 'Vendor relations' },
      { value: 'education_admin', label: 'Education Admin', icon: GraduationCap, description: 'Course management' },
      { value: 'finance_admin', label: 'Finance Admin', icon: Briefcase, description: 'Revenue & payouts' }
    ]
  },
  professional: {
    title: 'Professional Services',
    subtitle: 'Revenue-driving professionals',
    roles: [
      { value: 'estate_sale_operator', label: 'Estate Sale Operator', icon: Home, description: 'Run estate sales' },
      { value: 'real_estate_agent', label: 'Real Estate Agent', icon: Building2, description: 'Property sales' },
      { value: 'investor', label: 'Investor / Flipper', icon: TrendingUp, description: 'Property investment' },
      { value: 'consignor', label: 'Consignor', icon: Package, description: 'Sell items on consignment' },
      { value: 'vendor', label: 'Service Vendor', icon: Hammer, description: 'Provide services' },
      { value: 'coach', label: 'Coach / Trainer', icon: GraduationCap, description: 'Teach courses' }
    ]
  },
  consumer: {
    title: 'Consumer Services',
    subtitle: 'Find, buy, and sell',
    roles: [
      { value: 'executor', label: 'Executor / Family', icon: Users, description: 'Estate help' },
      { value: 'home_seller', label: 'Home Seller', icon: Home, description: 'Sell property' },
      { value: 'buyer', label: 'Buyer', icon: ShoppingBag, description: 'Browse & purchase' },
      { value: 'downsizer', label: 'Downsizer', icon: Package, description: 'Simplify & sell' },
      { value: 'diy_seller', label: 'DIY Seller', icon: Briefcase, description: 'List your items' }
    ]
  }
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [primaryRole, setPrimaryRole] = useState(null);
  const [profileData, setProfileData] = useState({
    phone: '',
    company_name: '',
    service_areas: []
  });
  const [loading, setLoading] = useState(false);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setStep(2);
  };

  const toggleRole = (role) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
      if (primaryRole === role) setPrimaryRole(null);
    } else {
      setSelectedRoles([...selectedRoles, role]);
      if (!primaryRole) setPrimaryRole(role);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Determine divisions access based on roles
      const divisions = [];
      if (selectedRoles.some(r => ['estate_sale_operator', 'executor', 'consignor'].includes(r))) {
        divisions.push('estate_services');
      }
      if (selectedRoles.some(r => ['real_estate_agent', 'home_seller', 'buyer'].includes(r))) {
        divisions.push('real_estate');
      }
      if (selectedRoles.includes('investor')) {
        divisions.push('investment');
      }
      if (selectedRoles.some(r => ['buyer', 'diy_seller', 'downsizer', 'consignor'].includes(r))) {
        divisions.push('marketplace');
      }
      if (selectedRoles.some(r => ['estate_sale_operator', 'real_estate_agent', 'investor'].includes(r))) {
        divisions.push('marketing');
      }
      if (selectedRoles.includes('coach') || divisions.length > 0) {
        divisions.push('education');
      }

      await base44.auth.updateMe({
        roles: selectedRoles,
        primary_role: primaryRole,
        phone: profileData.phone,
        company_name: profileData.company_name,
        service_areas: profileData.service_areas,
        onboarding_completed: true,
        divisions_access: [...new Set(divisions)]
      });

      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif font-bold text-navy-900 mb-3">Welcome to Legacy Lane OS</h1>
          <p className="text-lg text-slate-600">Let's set up your account in just a few steps</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center text-navy-800 mb-8">Choose Your Category</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(ROLE_CATEGORIES).map(([key, category]) => (
                <Card 
                  key={key}
                  className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-gold-400"
                  onClick={() => handleCategorySelect(key)}
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-serif text-navy-900">{category.title}</CardTitle>
                    <CardDescription>{category.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.roles.slice(0, 3).map(role => (
                        <div key={role.value} className="flex items-center gap-2 text-sm text-slate-600">
                          <role.icon className="w-4 h-4 text-gold-600" />
                          <span>{role.label}</span>
                        </div>
                      ))}
                      {category.roles.length > 3 && (
                        <p className="text-xs text-slate-500 mt-2">+{category.roles.length - 3} more</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedCategory && (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-navy-900">
                Select Your Roles
              </CardTitle>
              <CardDescription>
                You can select multiple roles. Choose your primary role first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {ROLE_CATEGORIES[selectedCategory].roles.map(role => {
                  const isSelected = selectedRoles.includes(role.value);
                  const isPrimary = primaryRole === role.value;
                  return (
                    <div
                      key={role.value}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? isPrimary 
                            ? 'border-gold-500 bg-gold-50' 
                            : 'border-sage-400 bg-sage-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => toggleRole(role.value)}
                    >
                      <div className="flex items-start gap-3">
                        <role.icon className={`w-6 h-6 mt-1 ${isSelected ? 'text-gold-700' : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-navy-900">{role.label}</h3>
                          <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                          {isPrimary && (
                            <Badge className="mt-2 bg-gold-600">Primary</Badge>
                          )}
                          {isSelected && !isPrimary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrimaryRole(role.value);
                              }}
                            >
                              Make Primary
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  disabled={selectedRoles.length === 0}
                  className="bg-navy-900 hover:bg-navy-800"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-navy-900">
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                Help us personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {['estate_sale_operator', 'real_estate_agent', 'vendor', 'coach'].some(r => selectedRoles.includes(r)) && (
                  <div>
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      placeholder="Your company or business name"
                      value={profileData.company_name}
                      onChange={(e) => setProfileData({...profileData, company_name: e.target.value})}
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>

                {['estate_sale_operator', 'real_estate_agent', 'vendor'].some(r => selectedRoles.includes(r)) && (
                  <div>
                    <Label htmlFor="areas">Service Areas (optional)</Label>
                    <Input
                      id="areas"
                      placeholder="e.g., Los Angeles, Orange County, San Diego"
                      onChange={(e) => setProfileData({
                        ...profileData, 
                        service_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-gold-600 hover:bg-gold-700"
                >
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}