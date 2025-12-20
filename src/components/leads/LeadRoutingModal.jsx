import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Award, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function LeadRoutingModal({ lead, onClose, onSuccess }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const allUsers = await base44.asServiceRole.entities.User.list();
      
      // Filter to professional users (agents, operators, etc.)
      const professionals = allUsers.filter(u => 
        u.primary_role && ['real_estate_agent', 'estate_sale_operator', 'investor'].includes(u.primary_role)
      );

      // Score each agent based on routing criteria
      const scoredAgents = professionals.map(agent => {
        let score = 0;
        const criteria = {};

        // Geography match (if lead has location data)
        if (lead.property_address && agent.service_areas?.length > 0) {
          criteria.geography = agent.service_areas.some(area => 
            lead.property_address?.toLowerCase().includes(area.toLowerCase())
          );
          if (criteria.geography) score += 40;
        }

        // Certification match
        if (lead.situation && agent.certifications?.includes(lead.situation)) {
          criteria.certification = true;
          score += 30;
        }

        // Performance (mock - would use real metrics)
        criteria.performance = Math.floor(Math.random() * 100);
        score += (criteria.performance / 100) * 20;

        // Availability (mock)
        criteria.availability = Math.random() > 0.3;
        if (criteria.availability) score += 10;

        return {
          ...agent,
          matchScore: score,
          criteria
        };
      });

      // Sort by match score
      scoredAgents.sort((a, b) => b.matchScore - a.matchScore);
      setAgents(scoredAgents);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoute = async () => {
    if (!selectedAgent) return;

    try {
      setRouting(true);
      await base44.entities.Lead.update(lead.id, {
        routed_to: selectedAgent.id,
        routing_criteria: selectedAgent.criteria
      });

      // Create a Contact from the lead
      await base44.entities.Contact.create({
        first_name: 'Lead',
        last_name: `#${lead.id.slice(0, 8)}`,
        situation: lead.situation,
        lead_source: lead.source,
        assigned_to: selectedAgent.id,
        score: lead.score
      });

      onSuccess();
    } catch (error) {
      console.error('Error routing lead:', error);
    } finally {
      setRouting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-navy-900">
            Smart Lead Routing
          </DialogTitle>
          <p className="text-slate-600">
            Matched {agents.length} professionals based on geography, certification, and performance
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {agents.slice(0, 5).map(agent => (
            <Card 
              key={agent.id}
              className={`cursor-pointer transition-all ${
                selectedAgent?.id === agent.id ? 'ring-2 ring-gold-500' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedAgent(agent)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-navy-900">{agent.full_name}</h3>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center">
                          <span className="text-lg font-bold text-gold-700">{Math.round(agent.matchScore)}</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="outline" className="mb-3 capitalize">
                      {agent.primary_role?.replace(/_/g, ' ')}
                    </Badge>

                    <div className="flex flex-wrap gap-3 text-sm">
                      {agent.criteria.geography && (
                        <div className="flex items-center gap-1 text-green-600">
                          <MapPin className="w-4 h-4" />
                          <span>Geography Match</span>
                        </div>
                      )}
                      {agent.criteria.certification && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Award className="w-4 h-4" />
                          <span>Certified</span>
                        </div>
                      )}
                      {agent.criteria.performance >= 70 && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <TrendingUp className="w-4 h-4" />
                          <span>Top Performer</span>
                        </div>
                      )}
                      {agent.criteria.availability && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <Clock className="w-4 h-4" />
                          <span>Available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedAgent?.id === agent.id && (
                    <CheckCircle className="w-6 h-6 text-gold-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleRoute}
            disabled={!selectedAgent || routing}
            className="bg-gold-600 hover:bg-gold-700"
          >
            {routing ? 'Routing...' : 'Assign Lead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}