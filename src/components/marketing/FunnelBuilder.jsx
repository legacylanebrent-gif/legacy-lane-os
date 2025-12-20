import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Mail, MessageSquare, FileText, Share2 } from 'lucide-react';

const STEP_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'postcard', label: 'Postcard', icon: FileText },
  { value: 'social', label: 'Social Post', icon: Share2 }
];

export default function FunnelBuilder({ steps, onChange }) {
  const [editingStep, setEditingStep] = useState(null);

  const addStep = () => {
    const newStep = {
      id: `step_${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      type: 'email',
      template_id: '',
      delay_days: 0,
      trigger_condition: ''
    };
    onChange([...steps, newStep]);
    setEditingStep(newStep.id);
  };

  const updateStep = (stepId, updates) => {
    onChange(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const removeStep = (stepId) => {
    onChange(steps.filter(s => s.id !== stepId));
  };

  const getStepIcon = (type) => {
    const stepType = STEP_TYPES.find(t => t.value === type);
    return stepType ? stepType.icon : Mail;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          {steps.length} step{steps.length !== 1 ? 's' : ''} in funnel
        </p>
        <Button onClick={addStep} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No steps yet
          </h3>
          <p className="text-slate-500 mb-6">
            Add steps to create your automated marketing funnel
          </p>
          <Button onClick={addStep} className="bg-gold-600 hover:bg-gold-700">
            <Plus className="w-4 h-4 mr-2" />
            Add First Step
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => {
            const StepIcon = getStepIcon(step.type);
            const isEditing = editingStep === step.id;

            return (
              <Card key={step.id} className={isEditing ? 'border-gold-500' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-sm font-bold text-gold-700">
                        {index + 1}
                      </div>
                      <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                    </div>

                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`name-${step.id}`}>Step Name</Label>
                            <Input
                              id={`name-${step.id}`}
                              value={step.name}
                              onChange={(e) => updateStep(step.id, { name: e.target.value })}
                              placeholder="e.g., Welcome Email"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`type-${step.id}`}>Type</Label>
                              <Select 
                                value={step.type} 
                                onValueChange={(val) => updateStep(step.id, { type: val })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STEP_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor={`delay-${step.id}`}>Delay (days)</Label>
                              <Input
                                id={`delay-${step.id}`}
                                type="number"
                                min="0"
                                value={step.delay_days}
                                onChange={(e) => updateStep(step.id, { delay_days: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingStep(null)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer"
                          onClick={() => setEditingStep(step.id)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <StepIcon className="w-5 h-5 text-gold-600" />
                            <h3 className="font-semibold text-navy-900">{step.name}</h3>
                            <span className="text-sm text-slate-500 capitalize">• {step.type}</span>
                          </div>
                          {step.delay_days > 0 && (
                            <p className="text-sm text-slate-500">
                              Send {step.delay_days} day{step.delay_days !== 1 ? 's' : ''} after previous step
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(step.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}