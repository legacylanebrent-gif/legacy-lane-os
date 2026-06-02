import { useEffect } from 'react';

/**
 * Injects a JSON-LD <script> into <head> for the current page.
 * Cleans up when the component unmounts or schemaJson changes.
 *
 * @param {object|null} schemaJson - The schema_json object from an SEOPage record (must include @context and @graph)
 * @param {string} [id] - Optional unique ID so multiple schemas don't conflict (default: 'page-schema')
 */
export function useSchemaJson(schemaJson, id = 'page-schema') {
  useEffect(() => {
    if (!schemaJson) return;

    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(schemaJson);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [schemaJson, id]);
}