import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import GuideAIBot from './GuideAIBot';

const GUIDE_PREFIXES = [
  '/probate',
  '/pre-probate',
  '/inherited-property',
  '/senior-downsizing',
  '/assisted-living-transition',
  '/divorce-property-sale',
  '/foreclosure-cleanout',
  '/estate-cleanout',
  '/executor-guide',
  '/trustee-guide',
  '/heir-guide',
  '/moving-sale',
  '/items',
  '/learn',
  '/estate-checklist',
  '/probate-checklist',
  '/estate-settlement-planner',
  '/estate-sale-companies',
  '/probate-realtors',
];

export default function GuideAIBotGlobal() {
  const location = useLocation();
  const [guideContext, setGuideContext] = useState(null);

  useEffect(() => {
    const path = location.pathname;
    const isGuide = GUIDE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + '/')
    );

    if (!isGuide) {
      setGuideContext(null);
      return;
    }

    // Delay to allow page content (including dynamically loaded data) to render
    const timer = setTimeout(() => {
      const h1 = document.querySelector('h1');
      const title =
        h1?.textContent?.trim() ||
        document.title.replace(/\s*[-|]\s*EstateSalen.*$/i, '').trim() ||
        'this guide';

      let intro = '';
      if (h1) {
        const section = h1.closest('section');
        const paragraphs = section?.querySelectorAll('p');
        if (paragraphs && paragraphs.length > 0) {
          intro = paragraphs[0].textContent.trim();
        }
      }

      setGuideContext({ title, subtitle: '', intro });
    }, 600);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!guideContext) return null;

  return <GuideAIBot guideContext={guideContext} />;
}