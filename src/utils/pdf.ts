// PlanIQ — Professional PDF Report Generator
// Opens a beautifully styled print-ready page in a new tab
// User clicks "Save as PDF" or uses Ctrl+P to save

export interface PDFTableSection {
  type: 'table';
  title: string;
  headers: string[];
  rows: string[][];
  summary?: { label: string; value: string }[];
}

export interface PDFTextSection {
  type: 'text';
  title: string;
  content: string;
}

export interface PDFListSection {
  type: 'list';
  title: string;
  items: string[];
  ordered?: boolean;
}

export interface PDFKeyValueSection {
  type: 'keyvalue';
  title: string;
  items: { label: string; value: string }[];
}

export type PDFSection = PDFTableSection | PDFTextSection | PDFListSection | PDFKeyValueSection;

export interface PDFOptions {
  title: string;
  module: string;
  company?: string;
  project?: string;
  date?: string;
  sections: PDFSection[];
}

function escHtml(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generatePDF(options: PDFOptions): void {
  const { title, module, company, project, sections } = options;
  const date = options.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  let sectionsHtml = '';
  for (const s of sections) {
    switch (s.type) {
      case 'table': {
        sectionsHtml += `<h2 class="section-title">${escHtml(s.title)}</h2>`;
        if (s.rows.length === 0) {
          sectionsHtml += `<p class="empty">No data available</p>`;
          break;
        }
        sectionsHtml += `<table><thead><tr>${s.headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead><tbody>`;
        for (const r of s.rows) {
          sectionsHtml += `<tr>${r.map(c => `<td>${escHtml(c)}</td>`).join('')}</tr>`;
        }
        sectionsHtml += '</tbody></table>';
        if (s.summary && s.summary.length > 0) {
          sectionsHtml += `<div class="summary-bar">${s.summary.map(i => `<div class="summary-item"><span class="s-label">${escHtml(i.label)}</span><span class="s-value">${escHtml(i.value)}</span></div>`).join('')}</div>`;
        }
        break;
      }
      case 'text':
        sectionsHtml += `<h2 class="section-title">${escHtml(s.title)}</h2><div class="text-block">${s.content.replace(/\n/g, '<br>')}</div>`;
        break;
      case 'list': {
        const tag = s.ordered ? 'ol' : 'ul';
        sectionsHtml += `<h2 class="section-title">${escHtml(s.title)}</h2><${tag}>${s.items.map(i => `<li>${escHtml(i)}</li>`).join('')}</${tag}>`;
        break;
      }
      case 'keyvalue':
        sectionsHtml += `<h2 class="section-title">${escHtml(s.title)}</h2><div class="kv-grid">${s.items.map(i =>
          `<div class="kv-item"><span class="kv-label">${escHtml(i.label)}</span><span class="kv-value">${escHtml(i.value)}</span></div>`
        ).join('')}</div>`;
        break;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)} — PlanIQ Report</title>
<style>
  @page { margin: 15mm; size: A4; }
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .no-print { display: none !important; }
    .header { break-after: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; color: #1e293b; line-height: 1.55; background: #fff; }
  
  /* Print Button */
  .print-btn-bar { position: fixed; top: 0; left: 0; right: 0; background: #fff; border-bottom: 1px solid #e2e8f0; padding: 12px 24px; display: flex; gap: 12px; align-items: center; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .print-btn { background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .print-btn:hover { opacity: 0.9; }
  .print-hint { color: #64748b; font-size: 12px; }
  .page-spacer { height: 56px; }
  
  /* Header */
  .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 32px 36px 28px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .header h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header .module-name { font-size: 14px; opacity: 0.9; font-weight: 500; }
  .header .brand { text-align: right; }
  .header .brand-name { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
  .header .brand-tag { font-size: 10px; opacity: 0.75; letter-spacing: 0.5px; }
  
  /* Meta Bar */
  .meta-bar { display: flex; flex-wrap: wrap; gap: 28px; padding: 16px 36px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
  .meta-item .label { font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.8px; }
  .meta-item .value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  
  /* Content */
  .content { padding: 20px 36px 40px; }
  .section-title { color: #2563eb; font-size: 16px; font-weight: 700; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #dbeafe; letter-spacing: -0.3px; }
  .section-title:first-child { margin-top: 8px; }
  
  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #f1f5f9; color: #334155; padding: 9px 10px; text-align: left; border: 1px solid #cbd5e1; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; line-height: 1.4; }
  tr:nth-child(even) { background: #f8fafc; }
  
  /* Summary Bar */
  .summary-bar { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; padding: 12px 16px; background: linear-gradient(135deg, #eff6ff, #f5f3ff); border: 1px solid #bfdbfe; border-radius: 8px; }
  .summary-item { display: flex; flex-direction: column; }
  .s-label { font-size: 9px; text-transform: uppercase; color: #6366f1; font-weight: 700; letter-spacing: 0.4px; }
  .s-value { font-size: 14px; font-weight: 700; color: #1e293b; }
  
  /* Text Blocks */
  .text-block { font-size: 12px; white-space: pre-wrap; background: #f8fafc; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.6; }
  
  /* Lists */
  ul, ol { font-size: 12px; padding-left: 22px; margin-bottom: 12px; }
  li { margin-bottom: 5px; line-height: 1.5; }
  
  /* Key-Value Grid */
  .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .kv-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
  .kv-label { font-size: 11px; color: #64748b; }
  .kv-value { font-size: 12px; font-weight: 700; color: #1e293b; }
  
  .empty { color: #94a3b8; font-style: italic; font-size: 12px; padding: 12px; }
  
  /* Footer */
  .footer { text-align: center; padding: 20px 36px; border-top: 2px solid #e2e8f0; margin-top: 32px; }
  .footer p { color: #94a3b8; font-size: 9px; margin-bottom: 3px; }
  .footer .powered { color: #7c3aed; font-weight: 600; }
  .footer .disclaimer { color: #cbd5e1; font-size: 8px; margin-top: 6px; }
</style>
</head>
<body>
<div class="print-btn-bar no-print">
  <button class="print-btn" onclick="window.print()">📄 Save as PDF</button>
  <span class="print-hint">Click above or press Ctrl+P / Cmd+P to save as PDF</span>
</div>
<div class="page-spacer no-print"></div>

<div class="header">
  <div class="header-top">
    <div>
      <h1>${escHtml(title)}</h1>
      <div class="module-name">${escHtml(module)}</div>
    </div>
    <div class="brand">
      <div class="brand-name">PlanIQ</div>
      <div class="brand-tag">AI Drawing Intelligence</div>
    </div>
  </div>
</div>

<div class="meta-bar">
  ${company ? `<div class="meta-item"><div class="label">Company</div><div class="value">${escHtml(company)}</div></div>` : ''}
  ${project ? `<div class="meta-item"><div class="label">Project</div><div class="value">${escHtml(project)}</div></div>` : ''}
  <div class="meta-item"><div class="label">Report Date</div><div class="value">${escHtml(date)}</div></div>
  <div class="meta-item"><div class="label">Module</div><div class="value">${escHtml(module)}</div></div>
</div>

<div class="content">
  ${sectionsHtml}
</div>

<div class="footer">
  <p class="powered">Powered by Vijay</p>
  <p>PlanIQ — AI Drawing Intelligence Platform</p>
  <p class="disclaimer">This is a computer-generated report. All quantities, rates, and measurements should be verified by qualified professionals before use in official documents or tenders.</p>
</div>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
