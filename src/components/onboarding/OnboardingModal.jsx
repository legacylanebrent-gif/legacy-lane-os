import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ONBOARDING_QUESTIONS } from './OnboardingQuestions';
import {
  ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2,
  Loader2, ExternalLink, Star, Zap, Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PRIORITY_STYLES = {
  'Must-Have': 'bg-red-100 text-red-700 border-red-200',
  'High Value': 'bg-orange-100 text-orange-700 border-orange-200',
  'Nice to Have': 'bg-blue-100 text-blue-700 border-blue-200'
};

const PRIORITY_ICONS = {
  'Must-Have': <Trophy className="w-3 h-3" />,
  'High Value': <Star className="w-3 h-3" />,
  'Nice to Have': <Zap className="w-3 h-3" />
};

export default function OnboardingModal({ user, onClose, onDismissPermanently }) {
  const [step, setStep] = useState(0); // 0 = welcome, 1..N = questions, N+1 = results
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const totalSteps = ONBOARDING_QUESTIONS.length;
  const currentQuestion = step > 0 && step <= totalSteps ? ONBOARDING_QUESTIONS[step - 1] : null;
  const isLastQuestion = step === totalSteps;
  const isResults = step === totalSteps + 1;

  const handleSelect = (questionId, value, type, maxSelect) => {
    if (type === 'single') {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    } else {
      const current = answers[questionId] || [];
      if (current.includes(value)) {
        setAnswers(prev => ({ ...prev, [questionId]: current.filter(v => v !== value) }));
      } else {
        if (maxSelect && current.length >= maxSelect) return;
        setAnswers(prev => ({ ...prev, [questionId]: [...current, value] }));
      }
    }
  };

  const canProceed = () => {
    if (step === 0) return true;
    if (!currentQuestion) return true;
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'single') return !!answer;
    return answer && answer.length > 0;
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      setStep(totalSteps + 1);
      setLoading(true);
      try {
        const formattedAnswers = {};
        ONBOARDING_QUESTIONS.forEach(q => {
          if (answers[q.id]) {
            formattedAnswers[q.question] = answers[q.id];
          }
        });
        const res = await base44.functions.invoke('generateOnboardingRecommendations', { answers: formattedAnswers });
        setResults(res.data);
      } catch (e) {
        console.error('Error generating recommendations:', e);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      const currentCount = user.onboarding_shown_count || 0;
      await base44.auth.updateMe({
        onboarding_completed: true,
        onboarding_shown_count: currentCount + 1,
        onboarding_answers: answers,
        onboarding_completed_date: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error saving onboarding:', e);
    }
    onClose();
  };

  const progress = step === 0 ? 0 : Math.round((step / totalSteps) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Business Setup</h2>
              {step > 0 && !isResults && (
                <p className="text-slate-400 text-xs">Question {step} of {totalSteps}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onDismissPermanently}
              className="text-slate-400 hover:text-slate-200 text-xs underline"
            >
              Don't show again
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {step > 0 && !isResults && (
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Welcome Screen */}
          {step === 0 && (
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-3">
                  Welcome to Legacy Lane OS, {user?.full_name?.split(' ')[0] || 'there'}!
                </h1>
                <p className="text-slate-600 leading-relaxed max-w-lg mx-auto">
                  Let's take 3–4 minutes to learn about your estate sale business. We'll use your answers to recommend the exact features that will make the biggest difference for <em>your</em> specific situation.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                {[
                  { icon: '📋', label: '18 quick questions' },
                  { icon: '🤖', label: 'AI-powered match' },
                  { icon: '🚀', label: 'Personalized roadmap' }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-xs text-slate-600 font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Screen */}
          {currentQuestion && (
            <div className="p-8 space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 leading-snug">
                {currentQuestion.question}
              </h2>
              {currentQuestion.type === 'multi' && (
                <p className="text-sm text-slate-500 -mt-4">
                  {currentQuestion.max_select ? `Select up to ${currentQuestion.max_select}` : 'Select all that apply'}
                </p>
              )}
              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentQuestion.type === 'single'
                    ? answers[currentQuestion.id] === option
                    : (answers[currentQuestion.id] || []).includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => handleSelect(currentQuestion.id, option, currentQuestion.type, currentQuestion.max_select)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-3 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                        isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results Screen */}
          {isResults && (
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-900">Analyzing your business...</p>
                    <p className="text-sm text-slate-500 mt-1">Our AI is matching features to your needs</p>
                  </div>
                </div>
              ) : results ? (
                <>
                  {/* Summary */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-orange-400" />
                      <span className="font-semibold text-orange-400 text-sm uppercase tracking-wide">Your Business Profile</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed mb-4">{results.business_summary}</p>
                    <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-3">
                      <p className="text-xs text-orange-300 font-semibold uppercase tracking-wide mb-1">Biggest Opportunity</p>
                      <p className="text-white text-sm">{results.top_opportunity}</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-4">Your Personalized Feature Roadmap</h3>
                    <div className="space-y-3">
                      {(results.recommendations || []).map((rec, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-orange-200 hover:bg-orange-50/30 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 text-sm">{rec.feature}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES['Nice to Have']}`}>
                                {PRIORITY_ICONS[rec.priority]}
                                {rec.priority}
                              </span>
                            </div>
                            {rec.route && (
                              <Link
                                to={rec.route.startsWith('/') ? rec.route : `/${rec.route}`}
                                onClick={handleSaveAndClose}
                                className="flex-shrink-0 text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1"
                              >
                                Open <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm mb-2">{rec.reason}</p>
                          <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-2">
                            <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-700"><span className="font-medium">First step:</span> {rec.first_step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <p>Something went wrong. Please try again.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          {step > 0 && !isResults ? (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}

          {isResults ? (
            <Button
              onClick={handleSaveAndClose}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Go to My Dashboard
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {step === 0 ? "Let's Get Started" : isLastQuestion ? 'Get My Recommendations' : 'Next'}
              {step !== 0 && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}