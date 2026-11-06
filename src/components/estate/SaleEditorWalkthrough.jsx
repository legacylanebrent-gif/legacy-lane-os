import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { SALE_EDITOR_TABS } from './SaleEditorTabs';

// Animated first-visit walkthrough for the sale editor. Dims the page, keeps the tab
// bar bright and highlighted (see SaleEditorTabs' `raised`/`highlightValue`), and
// advances through the real sections. The X ends and permanently dismisses the tour.
export default function SaleEditorWalkthrough({ open, step, onNext, onPrev, onExit }) {
  const tab = SALE_EDITOR_TABS[step];
  if (!tab) return null;
  const isLast = step === SALE_EDITOR_TABS.length - 1;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="tour-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-[1px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="tour-card"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
          >
            <div className="relative rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-white text-xs font-bold uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" /> Page tour
                  <span className="font-normal normal-case text-orange-50">
                    {step + 1} of {SALE_EDITOR_TABS.length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={onExit}
                  aria-label="Exit tour"
                  className="flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 px-2 py-1 text-white text-[11px] font-semibold transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Exit
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab.value}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22 }}
                  className="px-4 pt-3 pb-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {step + 1}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">{tab.label}</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{tab.tour}</p>

                  <div className="flex items-center gap-1.5">
                    {SALE_EDITOR_TABS.map((t, i) => (
                      <motion.span
                        key={t.value}
                        animate={{ width: i === step ? 20 : 6, opacity: i === step ? 1 : 0.4 }}
                        transition={{ duration: 0.2 }}
                        className={`h-1.5 rounded-full ${i === step ? 'bg-orange-600' : 'bg-slate-300'}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onPrev}
                      disabled={step === 0}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={isLast ? onExit : onNext}
                      className="flex-[2] inline-flex items-center justify-center gap-1 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
                    >
                      {isLast ? (
                        'Got it — start working'
                      ) : (
                        <>
                          Next <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}