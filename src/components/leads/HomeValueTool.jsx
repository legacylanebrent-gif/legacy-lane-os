import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Home, TrendingUp, CheckCircle } from 'lucide-react';

export default function HomeValueTool() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    email: '',
    phone: '',
    timeline: 'exploring'
  });
  const [estimatedValue, setEstimatedValue] = useState(null);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate valuation calculation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock valuation based on sqft
    const baseValue = parseInt(formData.sqft) * 200;
    const value = baseValue + (Math.random() * 50000 - 25000);
    setEstimatedValue(Math.round(value));
    
    setLoading(false);
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Create lead
      await base44.entities.Lead.create({
        source: 'home_value_tool',
        intent: 'sell_home',
        property_address: formData.address,
        estimated_value: estimatedValue,
        timeline: formData.timeline,
        score: 75
      });

      // Create contact
      await base44.entities.Contact.create({
        first_name: 'Home Value',
        last_name: 'Lead',
        email: formData.email,
        phone: formData.phone,
        lead_source: 'home_value_tool',
        address: { street: formData.address },
        estimated_value: estimatedValue
      });

      setStep(3);
    } catch (error) {
      console.error('Error creating lead:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
        <h3 className="text-2xl font-serif font-bold text-navy-900 mb-2">
          Thank You!
        </h3>
        <p className="text-slate-600 mb-6">
          A Legacy Lane specialist will contact you shortly to discuss your property.
        </p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-gold-500">
          <CardContent className="p-8 text-center">
            <Home className="w-16 h-16 mx-auto text-gold-600 mb-4" />
            <h3 className="text-xl font-semibold text-navy-900 mb-2">
              Estimated Home Value
            </h3>
            <p className="text-5xl font-bold text-gold-600 mb-6">
              ${estimatedValue?.toLocaleString()}
            </p>
            <p className="text-slate-600 mb-8">
              This is an estimate based on the information provided. Contact us for a detailed analysis.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(555) 555-5555"
                />
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={!formData.email || loading}
                className="w-full bg-gold-600 hover:bg-gold-700"
              >
                {loading ? 'Submitting...' : 'Get Full Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleCalculate} className="max-w-2xl mx-auto space-y-6">
      <div>
        <Label htmlFor="address">Property Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          placeholder="123 Main St, City, State ZIP"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            value={formData.bedrooms}
            onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
            placeholder="3"
          />
        </div>

        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            step="0.5"
            value={formData.bathrooms}
            onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
            placeholder="2"
          />
        </div>

        <div>
          <Label htmlFor="sqft">Sq Ft *</Label>
          <Input
            id="sqft"
            type="number"
            value={formData.sqft}
            onChange={(e) => setFormData({...formData, sqft: e.target.value})}
            placeholder="2000"
            required
          />
        </div>
      </div>

      <Button 
        type="submit"
        disabled={loading}
        className="w-full bg-gold-600 hover:bg-gold-700 h-12 text-lg"
      >
        {loading ? 'Calculating...' : 'Get Instant Valuation'}
      </Button>
    </form>
  );
}