import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import IsoEntryChooser from './IsoEntryChooser';
import IsoPhotoStep from './IsoPhotoStep';
import IsoQuestionsStep from './IsoQuestionsStep';
import IsoConfirmStep from './IsoConfirmStep';
import { saveIso } from './isoApi';

const STEP_LABEL = {
  choose: 'What are you looking for?',
  photo: 'Show us a photo',
  questions: 'A few quick questions',
  confirm: 'Finish your search',
};

/**
 * The single ISO entry flow. Describe / guided / photo all converge on the same
 * saved record, then on the shared matching engine — so a search created any way
 * behaves identically.
 */
export default function NewIsoDialog({ open, onClose, onSaved, onOpenList, accountPreferences }) {
  const [step, setStep] = useState('choose');
  const [draft, setDraft] = useState({ entry_path: 'describe', exclusions: [], match_mode: 'similar', shipping_ok: true, pickup_ok: true, public_visibility: false });
  const [suggestion, setSuggestion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);

  const reset = () => {
    setStep('choose');
    setDraft({ entry_path: 'describe', exclusions: [], match_mode: 'similar', shipping_ok: true, pickup_ok: true, public_visibility: false });
    setSuggestion(null);
    setSaving(false);
    setError('');
    setDuplicate(null);
  };

  const close = () => { reset(); onClose(); };

  const startQuestions = (base) => {
    setDraft(base);
    setStep('questions');
  };

  const onIdentified = ({ identification, brand, file_uri }) => {
    const focusLabel = identification.focused_object || identification.item_type || '';
    setDraft({
      ...draft,
      entry_path: 'photo',
      title: draft.title || focusLabel,
      description: identification.summary || '',
      original_wording: draft.original_wording || identification.summary || '',
      item_type: identification.item_type || '',
      category: identification.category || '',
      style: identification.style || '',
      material: identification.material || '',
      color: (identification.colors || [])[0] || '',
      brand: brand || '',
      brand_status: brand ? 'confirmed_by_customer' : 'none',
      uncertain_attributes: identification.uncertainties || [],
      identification: { ...identification, confirmed_at: new Date().toISOString() },
      reference_photo_uri: file_uri || '',
    });
    setStep('questions');
  };

  const onQuestionsDone = ({ answers, intent }) => {
    setSuggestion(intent);
    setDraft({
      ...draft,
      clarification_answers: answers,
      intent: draft.intent || intent?.suggestion || 'ongoing',
    });
    setStep('confirm');
  };

  const submit = async (allowDuplicate = false) => {
    setSaving(true);
    setError('');
    try {
      const { status, data } = await saveIso({ ...draft, allow_duplicate: allowDuplicate });
      if (status === 409 || data.duplicate) {
        setDuplicate(data);
        setSaving(false);
        return;
      }
      if (data.error) {
        setError(data.error);
        setSaving(false);
        return;
      }
      reset();
      if (onSaved) onSaved(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'We could not save that search. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif">{STEP_LABEL[step]}</DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <IsoEntryChooser
            onDescribe={(patch) => startQuestions({ ...draft, ...patch, entry_path: 'describe' })}
            onGuided={() => startQuestions({ ...draft, entry_path: 'guided' })}
            onPhoto={() => setStep('photo')}
            onList={() => { reset(); onOpenList(); }}
          />
        )}

        {step === 'photo' && <IsoPhotoStep onIdentified={onIdentified} />}

        {step === 'questions' && (
          <IsoQuestionsStep
            known={{
              title: draft.title,
              description: draft.description,
              brand: draft.brand,
              category: draft.category,
              item_type: draft.item_type,
              style: draft.style,
              material: draft.material,
              color: draft.color,
              budget_max: draft.budget_max,
              shipping_ok: draft.shipping_ok,
              match_mode: draft.match_mode,
            }}
            accountPreferences={accountPreferences}
            onDone={onQuestionsDone}
            onSkip={() => { setDraft({ ...draft, clarification_answers: {} }); setStep('confirm'); }}
          />
        )}

        {step === 'confirm' && (
          <IsoConfirmStep
            draft={draft}
            setDraft={setDraft}
            suggestion={suggestion}
            onSave={() => submit(false)}
            onSaveAnyway={() => submit(true)}
            saving={saving}
            error={error}
            duplicate={duplicate}
          />
        )}

        {step !== 'choose' && (
          <button
            type="button"
            onClick={() => setStep(step === 'confirm' ? 'questions' : 'choose')}
            className="text-xs text-slate-500 hover:text-slate-700 mt-2"
          >
            Back
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}