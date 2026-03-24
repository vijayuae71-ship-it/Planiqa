export function downloadCSV(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.map(esc).join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(','))
  ].join('\n');
  const fn = filename.endsWith('.csv') ? filename : filename + '.csv';
  triggerDownload(fn, csv, 'text/csv');
}

export function downloadTXT(filename: string, content: string) {
  const fn = filename.endsWith('.txt') ? filename : filename + '.txt';
  triggerDownload(fn, content, 'text/plain');
}

function triggerDownload(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
