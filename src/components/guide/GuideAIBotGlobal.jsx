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

const SLUG_LABELS = {
  'probate': 'Probate',
  'pre-probate': 'Pre-Probate Planning',
  'inherited-property': 'Inherited Property',
  'senior-downsizing': 'Senior Downsizing',
  'assisted-living-transition': 'Assisted Living Transition',
  'divorce-property-sale': 'Divorce Property Sale',
  'foreclosure-cleanout': 'Foreclosure Cleanout',
  'estate-cleanout': 'Estate Cleanout',
  'executor-guide': 'Executor Guide',
  'trustee-guide': 'Trustee Guide',
  'heir-guide': 'Heir Guide',
  'moving-sale': 'Moving Sale',
  'items': 'Antique & Collectible Items',
  'learn': 'Estate Sale Learning Hub',
  'estate-checklist': 'Estate Checklist',
  'probate-checklist': 'Probate Checklist',
  'estate-settlement-planner': 'Estate Settlement Planner',
  'estate-sale-companies': 'Estate Sale Companies',
  'probate-realtors': 'Probate Realtors',
};

function prettyName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function deriveTopicFromPath(path) {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const baseLabel = SLUG_LABELS[segments[0]];
  if (!baseLabel) return null;
  const stateSlug = segments[1];
  const countySlug = segments[2];
  if (stateSlug && countySlug) {
    return `${baseLabel} in ${prettyName(countySlug)}, ${prettyName(stateSlug)}`;
  }
  if (stateSlug) {
    return `${baseLabel} in ${prettyName(stateSlug)}`;
  }
  return baseLabel;
}

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
      const pathTopic = deriveTopicFromPath(path);
      const title =
        h1?.textContent?.trim() ||
        pathTopic ||
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