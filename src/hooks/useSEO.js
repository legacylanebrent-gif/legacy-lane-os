import { useEffect } from 'react';

/**
 * Dynamically sets the page <title>, <meta description>, <meta og:title>,
 * <meta og:description>, <meta og:image>, and injects JSON-LD structured data.
 *
 * Call at the top of any page component.
 */
export function useSEO({ title, description, image, jsonLd, canonical } = {}) {
  useEffect(() => {
    if (title) document.title = title;

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'EstateSalen.com');
    if (image) setMeta('property', 'og:image', image);
    if (canonical) setMeta('property', 'og:url', canonical);

    // Twitter Cards
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    if (image) setMeta('name', 'twitter:image', image);

    // Canonical link tag
    if (canonical) {
      let el = document.querySelector('link[rel="canonical"]');
      if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
      el.href = canonical;
    }

    // Inject / replace JSON-LD
    if (jsonLd) {
      let el = document.getElementById('__jsonld__');
      if (!el) {
        el = document.createElement('script');
        el.type = 'application/ld+json';
        el.id = '__jsonld__';
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(jsonLd);
    }

    // No cleanup reset — each page sets its own title on mount.
    // A reset here would race with the incoming page's useSEO call and overwrite it.
  }, [title, description, image, jsonLd]);
}

function setMeta(attr, key, value) {
  if (!value) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}