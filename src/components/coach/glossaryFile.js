// A saved coaching entry turned into a plain markdown file the operator can keep,
// email to a teammate, or print — the same content that lives in the glossary.
export function entryToMarkdown(entry) {
  const lines = [
    `# ${entry.title || 'Coaching session'}`,
    '',
    `Saved: ${entry.saved_at ? new Date(entry.saved_at).toLocaleString() : new Date().toLocaleString()}`,
    entry.category ? `Category: ${entry.category.replace(/_/g, ' ')}` : '',
    entry.mode_label ? `Coach specialist: ${entry.mode_label}` : '',
    (entry.tags || []).length ? `Tags: ${(entry.tags || []).join(', ')}` : '',
    '',
    '---',
    '',
    entry.content || '',
  ].filter(l => l !== null && l !== undefined);
  return lines.join('\n');
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadEntry(entry) {
  const safe = String(entry.title || 'coaching').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60);
  downloadTextFile(`${safe || 'coaching'}.md`, entryToMarkdown(entry));
}