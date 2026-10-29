// Triggers a browser download of an already-generated CSV. The file never sits at a
// public URL: the bytes arrive in the authenticated function response.
export function downloadCsv(fileName, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'export.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}