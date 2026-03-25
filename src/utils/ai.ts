import { Drawing } from '../types';

// Robust JSON extraction from Claude responses (handles text before/after JSON, truncated responses, code fences)
export function extractJSON(text: string): any {
  // Aggressively strip ALL markdown code fence variations
  let stripped = text
    .replace(/^[\s\S]*?```(?:json|JSON|js|javascript)?\s*\n?/m, '') // Remove opening fence + anything before it
    .replace(/\n?\s*```[\s\S]*$/m, '')  // Remove closing fence + anything after it
    .trim();
  // If no fences found, use original text
  if (stripped === text.trim()) stripped = text.trim();
  try { return JSON.parse(stripped); } catch {}

  // Second try: find JSON array [...] in the text
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(text.slice(arrStart, arrEnd + 1)); } catch {}
  }

  // Third try: find JSON object {...} in the text
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(text.slice(objStart, objEnd + 1)); } catch {}
  }

  // Fourth try: REPAIR truncated JSON arrays
  // This happens when max_tokens cuts off the response mid-JSON
  if (arrStart !== -1) {
    let candidate = text.slice(arrStart);
    // Remove trailing incomplete text after last complete object
    const lastBrace = candidate.lastIndexOf('}');
    if (lastBrace > 0) {
      // Try closing the array after the last complete object
      const repaired = candidate.slice(0, lastBrace + 1) + ']';
      try { return JSON.parse(repaired); } catch {}
      // If that failed, try removing the last (possibly incomplete) object
      const secondLastBrace = candidate.lastIndexOf('},');
      if (secondLastBrace > 0) {
        const repaired2 = candidate.slice(0, secondLastBrace + 1) + ']';
        try { return JSON.parse(repaired2); } catch {}
      }
    }
  }

  // Fifth try: repair truncated JSON objects
  if (objStart !== -1) {
    let candidate = text.slice(objStart);
    const lastBrace = candidate.lastIndexOf('}');
    if (lastBrace > 0) {
      try { return JSON.parse(candidate.slice(0, lastBrace + 1)); } catch {}
    }
  }

  // Final fallback: AI returned plain text or completely unparseable response
  if (text.length > 20) {
    // Don't dump the whole raw response — give a useful error message
    const preview = text.slice(0, 200).replace(/\n/g, ' ');
    return { _aiNote: `AI response could not be parsed. The output may have been truncated. Please try again.\n\nPreview: "${preview}..."` };
  }

  throw new Error('Could not extract JSON from AI response');
}

// Embedded API key — used as fallback if serverless function doesn't have env var
const EMBEDDED_API_KEY = ''; // API key is handled server-side by Netlify function

export function getEmbeddedApiKey(): string {
  return EMBEDDED_API_KEY;
}

// Usage tracking types
export interface UsageRecord {
  id: string;
  timestamp: string;
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  module: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  drawingCount: number;
  model: string;
}

// Pricing per 1M tokens (Claude Sonnet)
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 15.0;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function calcCost(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

// localStorage-based usage tracking for Netlify
const USAGE_KEY = 'planiq_usage_records';

function loadUsageFromStorage(): UsageRecord[] {
  try {
    const data = localStorage.getItem(USAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveUsageToStorage(records: UsageRecord[]) {
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(records)); } catch {}
}

export async function getUsageRecordsAsync(): Promise<UsageRecord[]> {
  return loadUsageFromStorage();
}

export function getUsageRecords(): UsageRecord[] {
  return loadUsageFromStorage();
}

export async function saveUsageRecord(record: UsageRecord) {
  const records = loadUsageFromStorage();
  records.unshift(record);
  saveUsageToStorage(records);
}

export function getUsageByCompany(companyId?: string): UsageRecord[] {
  const all = getUsageRecords();
  return companyId ? all.filter(r => r.companyId === companyId) : all;
}

export async function getUsageByCompanyAsync(companyId?: string): Promise<UsageRecord[]> {
  const all = await getUsageRecordsAsync();
  return companyId ? all.filter(r => r.companyId === companyId) : all;
}

export function getUsageSummary(records: UsageRecord[]) {
  const totalCost = records.reduce((s, r) => s + r.totalCost, 0);
  const totalCalls = records.length;
  const totalInputTokens = records.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = records.reduce((s, r) => s + r.outputTokens, 0);
  const byCompany: Record<string, { name: string; calls: number; cost: number }> = {};
  for (const r of records) {
    if (!byCompany[r.companyId]) byCompany[r.companyId] = { name: r.companyName, calls: 0, cost: 0 };
    byCompany[r.companyId].calls++;
    byCompany[r.companyId].cost += r.totalCost;
  }
  const byModule: Record<string, { calls: number; cost: number }> = {};
  for (const r of records) {
    if (!byModule[r.module]) byModule[r.module] = { calls: 0, cost: 0 };
    byModule[r.module].calls++;
    byModule[r.module].cost += r.totalCost;
  }
  return { totalCost, totalCalls, totalInputTokens, totalOutputTokens, byCompany, byModule };
}

// Detect file category from name/type
function getFileCategory(file: File): { category: 'image' | 'pdf' | 'cad' | 'bim' | 'doc' | 'other'; label: string; color: string } {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'svg'];
  const cadExts = ['dwg', 'dxf', 'dgn', 'dwf', 'dwfx'];
  const bimExts = ['rvt', 'rfa', 'ifc', 'nwd', 'nwc', 'nwf', 'skp', '3dm'];
  const docExts = ['doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'ppt', 'pptx'];
  if (file.type === 'application/pdf' || ext === 'pdf') return { category: 'pdf', label: 'PDF', color: '#dc2626' };
  if (imageExts.includes(ext) || file.type.startsWith('image/')) return { category: 'image', label: ext.toUpperCase(), color: '#2563eb' };
  if (cadExts.includes(ext)) return { category: 'cad', label: ext.toUpperCase(), color: '#f59e0b' };
  if (bimExts.includes(ext)) return { category: 'bim', label: ext.toUpperCase(), color: '#10b981' };
  if (docExts.includes(ext)) return { category: 'doc', label: ext.toUpperCase(), color: '#6366f1' };
  return { category: 'other', label: ext.toUpperCase() || 'FILE', color: '#6b7280' };
}

export { getFileCategory };

export async function compressImage(file: File, maxW = 1500, quality = 0.7): Promise<{ base64: string; mediaType: string }> {
  const { category } = getFileCategory(file);

  // Images: compress via canvas
  if (category === 'image' && !file.name.toLowerCase().endsWith('.svg')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxW) { h = (h * maxW) / w; w = maxW; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
        };
        img.onerror = () => reject(new Error('Failed to load image.'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // All other formats: read as raw base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const mediaType = file.type || 'application/octet-stream';
      resolve({ base64: dataUrl.split(',')[1], mediaType });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function createThumbnail(base64: string, mediaType: string, fileName?: string): Promise<string> {
  const isImage = mediaType.startsWith('image/') && mediaType !== 'image/svg+xml';

  if (isImage) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const s = 120;
        const ratio = Math.min(s / img.width, s / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve(generatePlaceholderThumb('IMG', '#2563eb'));
      img.src = `data:${mediaType};base64,${base64}`;
    });
  }

  const ext = (fileName || '').toLowerCase().split('.').pop() || '';
  const formats: Record<string, { label: string; color: string; sub: string }> = {
    'pdf': { label: 'PDF', color: '#dc2626', sub: 'Document' },
    'dwg': { label: 'DWG', color: '#f59e0b', sub: 'AutoCAD' },
    'dxf': { label: 'DXF', color: '#f59e0b', sub: 'AutoCAD' },
    'dgn': { label: 'DGN', color: '#f59e0b', sub: 'MicroStation' },
    'dwf': { label: 'DWF', color: '#f59e0b', sub: 'Design Web' },
    'rvt': { label: 'RVT', color: '#10b981', sub: 'Revit' },
    'rfa': { label: 'RFA', color: '#10b981', sub: 'Revit Family' },
    'ifc': { label: 'IFC', color: '#10b981', sub: 'BIM Model' },
    'nwd': { label: 'NWD', color: '#10b981', sub: 'Navisworks' },
    'nwc': { label: 'NWC', color: '#10b981', sub: 'Navisworks' },
    'skp': { label: 'SKP', color: '#10b981', sub: 'SketchUp' },
    '3dm': { label: '3DM', color: '#10b981', sub: 'Rhino' },
    'xlsx': { label: 'XLSX', color: '#6366f1', sub: 'Spreadsheet' },
    'xls': { label: 'XLS', color: '#6366f1', sub: 'Spreadsheet' },
    'csv': { label: 'CSV', color: '#6366f1', sub: 'Data' },
    'docx': { label: 'DOCX', color: '#6366f1', sub: 'Document' },
    'doc': { label: 'DOC', color: '#6366f1', sub: 'Document' },
    'svg': { label: 'SVG', color: '#2563eb', sub: 'Vector' },
  };
  const fmt = formats[ext] || { label: ext.toUpperCase() || 'FILE', color: '#6b7280', sub: 'Drawing' };
  return generatePlaceholderThumb(fmt.label, fmt.color, fmt.sub);
}

function generatePlaceholderThumb(label: string, color: string, sub?: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 120; canvas.height = 120;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color + '15';
  ctx.fillRect(0, 0, 120, 120);
  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 118, 118);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(35, 15, 50, 60, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(70, 15);
  ctx.lineTo(85, 30);
  ctx.lineTo(70, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 60, 58);
  if (sub) {
    ctx.fillStyle = color;
    ctx.font = '11px sans-serif';
    ctx.fillText(sub, 60, 100);
  }
  return canvas.toDataURL('image/png');
}

// Context for usage tracking
let _usageContext: {
  companyId: string; companyName: string;
  userId: string; userName: string;
  projectId: string; projectName: string;
  module: string;
} | null = null;

export function setUsageContext(ctx: typeof _usageContext) {
  _usageContext = ctx;
}

export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  drawings: Drawing[] = []
): Promise<string> {
  const activeDrawings = drawings.filter(d => d.base64 && !d.archived);
  const drawingCount = activeDrawings.length;

  // Build message content array with images + text
  const content: any[] = [];

  for (const d of activeDrawings) {
    // Determine the correct media type for the API
    let mediaType = d.mediaType || 'image/jpeg';
    // Claude API only supports these image types
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (mediaType === 'application/pdf') {
      // For PDFs, use document type
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: d.base64,
        },
      });
    } else if (supportedTypes.includes(mediaType)) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: d.base64,
        },
      });
    } else {
      // Convert unsupported image types to JPEG description
      content.push({
        type: 'text',
        text: `[Drawing: ${d.name} — Format: ${mediaType} — Note: This format was sent as reference; analyze based on available visual content]`,
      });
    }
  }

  content.push({ type: 'text', text: userMessage });

  // Enforce raw JSON output — prevents Claude from wrapping in markdown code fences
  const enhancedSystem = systemPrompt + '\n\nCRITICAL OUTPUT FORMAT RULE: Return ONLY raw JSON. Do NOT wrap in markdown code fences (```json```). Do NOT include any text before or after the JSON. The very first character of your response MUST be { or [ and the very last character MUST be } or ]. Any violation will cause a system parsing failure.';

  // Call the Netlify Edge Function with STREAMING (Edge Functions have NO timeout — unlike regular Functions which die at 10s)
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: enhancedSystem,
      messages: [{ role: 'user', content }],
      max_tokens: 16384,
    }),
  });

  if (!response.ok) {
    let errMsg = `API returned status ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData?.error?.message || errData?.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  // Check if response is SSE stream or regular JSON (error case)
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    // Non-streaming response — likely an error from the serverless function
    try {
      const errData = await response.json();
      throw new Error(errData?.error || errData?.details || 'Unexpected non-streaming response');
    } catch (e: any) {
      if (e.message.includes('Unexpected')) throw e;
      throw new Error('Unexpected response format from API proxy');
    }
  }

  // Read SSE stream from Claude (streamed through our serverless function)
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let responseText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let buffer = '';

  // Helper to process SSE lines
  const processLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const data = line.slice(6).trim();
    if (data === '[DONE]') return;
    try {
      const event = JSON.parse(data);
      // Collect text from content blocks
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        responseText += event.delta.text;
      }
      // Capture usage from message_start
      if (event.type === 'message_start' && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens || 0;
      }
      // Capture output tokens from message_delta
      if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens || 0;
      }
      // Capture API errors during streaming
      if (event.type === 'error') {
        throw new Error(`Claude API error: ${event.error?.message || JSON.stringify(event.error)}`);
      }
    } catch (e: any) {
      if (e.message?.startsWith('Claude API error')) throw e;
      // Skip non-JSON SSE lines (comments, pings, etc.)
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        processLine(line);
      }
    }

    // CRITICAL: Process any remaining data in buffer after stream ends
    if (buffer.trim()) {
      processLine(buffer.trim());
    }
    // Flush the decoder
    const remaining = decoder.decode();
    if (remaining.trim()) {
      for (const line of remaining.split('\n')) {
        processLine(line.trim());
      }
    }
  } catch (e: any) {
    // If we got some text before the error, try to use it
    if (responseText.length > 100) {
      console.warn('Stream error after partial response, attempting to use partial data:', e.message);
    } else {
      throw e;
    }
  }

  if (!responseText) throw new Error('Empty API response — the AI returned no content. Please try again.');

  // Fallback token estimation if not provided by API
  if (!inputTokens) inputTokens = estimateTokens(systemPrompt + userMessage);
  if (!outputTokens) outputTokens = estimateTokens(responseText);
  const costs = calcCost(inputTokens, outputTokens);

  if (_usageContext) {
    await saveUsageRecord({
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      companyId: _usageContext.companyId,
      companyName: _usageContext.companyName,
      userId: _usageContext.userId,
      userName: _usageContext.userName,
      projectId: _usageContext.projectId,
      projectName: _usageContext.projectName,
      module: _usageContext.module,
      inputTokens,
      outputTokens,
      ...costs,
      drawingCount,
      model: 'claude-sonnet-4-20250514',
    });
  }

  return responseText;
}

export function getSelectedDrawings(drawings: Drawing[], selectedIds: string[]): Drawing[] {
  return drawings.filter(d => selectedIds.includes(d.id) && !d.archived);
}
