import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Mic, CircleStop } from 'lucide-react';
import { ALL_NAV_ITEMS } from '@/components/layout/AppSidebar';

// Normalize for matching: lowercase, strip punctuation, collapse spaces
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export default function VoiceCommandButton({ user }) {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState(null); // { text, tone: 'info' | 'error' }
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  const supported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => {
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const showStatus = (text, tone = 'info') => {
    setStatus({ text, tone });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus(null), 6000);
  };

  // Find the best-matching sale from the transcript (address, title, city, zip)
  const matchSale = (t, sales) => {
    let best = null;
    let bestScore = 0;
    for (const sale of sales) {
      const tokens = [
        sale.title,
        sale.property_address?.street,
        sale.property_address?.city,
        sale.property_address?.state,
        sale.property_address?.zip,
      ].map(norm).filter(Boolean);
      const score = tokens.filter(tok => t.includes(tok)).length;
      if (score > bestScore) { bestScore = score; best = sale; }
    }
    return bestScore > 0 ? best : null;
  };

  const resolveCommand = async (transcript) => {
    const t = norm(transcript);

    // 1. Sale-specific command: "add photos to the sale at 123 main middletown"
    const sales = await base44.entities.EstateSale.filter({ operator_id: user.id }, '-created_date', 100)
      .catch(() => []);
    if (sales.length > 0) {
      const sale = matchSale(t, sales);
      if (sale) {
        // Specific sale-area commands first, then default to the sale editor
        const saleActions = [
          { words: ['photo', 'inventory', 'item'], page: 'SaleInventory', param: 'id' },
          { words: ['task', 'checklist'], page: 'SaleTasks', param: 'saleId' },
          { words: ['attendance', 'check in', 'checkin'], page: 'Attendance', param: 'saleId' },
          { words: ['statistic', 'stats', 'recap'], page: 'SaleStatistics', param: 'saleId' },
          { words: ['contract'], page: 'SaleContracts', param: 'saleId' },
        ];
        const action = saleActions.find(a => a.words.some(w => t.includes(w)));
        const page = action ? action.page : 'SaleEditor';
        const param = action ? action.param : 'saleId';
        navigate(createPageUrl(page) + '?' + param + '=' + sale.id);
        showStatus(`Opening ${page === 'SaleEditor' ? '' : page + ' for '}"${sale.title || sale.property_address?.street || 'sale'}"`);
        return;
      }
    }

    // 2. Page / menu navigation: match nav label words, ignoring filler words
    //    like "go to the" — e.g. "go to the sales manager" → "My Sales"
    const fillerWords = new Set(['go', 'to', 'the', 'open', 'show', 'me', 'please',
      'take', 'jump', 'navigate', 'page', 'screen', 'a', 'an', 'and', 'on', 'in', 'at', 'of']);
    const spokenWords = t.split(' ');
    const navMatch = ALL_NAV_ITEMS
      .map(item => {
        const labelWords = norm(item.label).split(' ').filter(w => !fillerWords.has(w));
        const matched = labelWords.filter(w => spokenWords.includes(w));
        return { item, score: matched.length, label: norm(item.label) };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score || a.label.length - b.label.length)[0];
    if (navMatch) {
      navigate(createPageUrl(navMatch.item.page));
      showStatus(`Opening ${navMatch.item.label}`);
      return;
    }

    showStatus(`Couldn't find a match for "${transcript}". Try a page name or a sale address.`, 'error');
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showStatus('Voice commands are not supported in this browser. Try Chrome or Safari.', 'error');
      return;
    }
    try { recognitionRef.current?.abort(); } catch {}

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') {
        showStatus('Microphone access was blocked. Allow mic access in your browser settings.', 'error');
      } else if (e.error !== 'aborted') {
        showStatus("Didn't catch that — tap the mic and try again.", 'error');
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join(' ')
        .trim();
      if (event.results[event.results.length - 1].isFinal && transcript) {
        setListening(false);
        showStatus(`"${transcript}"`);
        resolveCommand(transcript);
      }
    };

    recognition.start();
  };

  if (!user) return null;

  return (
    <>
      {/* Status / transcript bubble */}
      {status && (
        <div className="fixed bottom-[9.5rem] right-6 z-50 lg:hidden max-w-[calc(100%-3rem)] sm:max-w-sm bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl border border-slate-700">
          <p className={status.tone === 'error' ? 'text-amber-300' : 'text-white'}>{status.text}</p>
        </div>
      )}

      {/* Floating voice button (stacked above the AI Coach button) */}
      <button
        onClick={listening ? () => recognitionRef.current?.stop() : startListening}
        className={`fixed bottom-24 right-6 z-50 lg:hidden flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 ${
          listening
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-orange-400'
        }`}
        aria-label={listening ? 'Stop voice command' : 'Start voice command'}
      >
        {listening ? <CircleStop className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
      </button>
    </>
  );
}