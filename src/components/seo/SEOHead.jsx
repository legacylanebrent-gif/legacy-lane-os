import { useEffect } from 'react';

/**
 * Full SEO head injector — title, meta, OG, Twitter, canonical, JSON-LD.
 * Drop into any public page.
 */
export default function SEOHead({ title, description, image, canonical, jsonLd }) {
  useEffect(() => {
    if (title) document.title = title;
    set('name', 'description', description);
    set('property', 'og:title', title);
    set('property', 'og:description', description);
    set('property', 'og:type', 'website');
    set('property', 'og:site_name', 'EstateSalen.com');
    if (image) set('property', 'og:image', image);
    if (canonical) set('property', 'og:url', canonical);
    set('name', 'twitter:card', 'summary_large_image');
    set('name', 'twitter:title', title);
    set('name', 'twitter:description', description);
    if (image) set('name', 'twitter:image', image);

    // Canonical
    if (canonical) {
      let el = document.querySelector('link[rel="canonical"]');
      if (!el) {
        el = document.createElement('link');
        el.rel = 'canonical';
        document.head.appendChild(el);
      }
      el.href = canonical;
    }

    // JSON-LD
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
  }, [title, description, image, canonical, jsonLd]);

  return null;
}

function set(attr, key, value) {
  if (!value) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}