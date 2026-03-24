import React, { useState, useMemo } from 'react';
import { Package, Play, Download, Edit3, Check } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnSm, sel, tbl, th, td, secTitle, empty, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadCSV } from '../utils/export';
import { generatePDF, PDFSection } from '../utils/pdf';
import { getCPWDRateReference, getMiddleEastRates } from '../utils/rates';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface MTOItem {
  id: string;
  category: string;
  item: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  unitRate: number;
  rateSource: string;
  measurementBasis: string;
  confirmed: boolean;
}

interface MTOData {
  drawingAnalysis?: {
    drawingType: string;
    buildingType: string;
    visibleElements: string[];
    readableDimensions: string[];
    specsOnDrawing: string[];
    scale: string;
  };
  items: MTOItem[];
  gaps?: { priority: string; description: string }[];
  consultantQuestions?: { to: string; question: string; priority: string; impactArea: string }[];
}

function buildMTOPrompt(): string {
  const rateTable = getCPWDRateReference('INR');
  const meRates = getMiddleEastRates();
  return `You are a senior quantity surveyor (RICS/AACE certified, 20+ years experience) performing a material take-off for Tier-1 contractors (L&T, Sobha, Danube, Nagarjuna). This MTO will be used for procurement planning and vendor quotation.

MANDATORY ANALYSIS PROTOCOL — FOLLOW THESE STEPS IN ORDER:

STEP 1 — DRAWING INTERPRETATION (DO THIS FIRST):
Carefully examine the uploaded drawing(s)/document(s). Before generating ANY module data, analyze and report:
- What type of drawing is this? (floor plan, section, elevation, structural detail, schedule, site plan, MEP layout)
- What building/structure type? (residential villa, commercial office, auditorium, warehouse, hospital, etc.)
- List every visible element: walls, columns, beams, slabs, openings (doors/windows), stairs, ramps, services, annotations, room labels, dimensions
- List all readable dimensions with locations (e.g., "Overall building: 45m × 30m", "Column grid: 6m c/c both ways", "Room R1: 5m × 4m")
- Note any specifications, material callouts, or standards referenced on the drawing
- Note the scale if shown

STEP 2 — CONFIRMED vs ASSUMED:
For EVERY item you generate:
- "confirmed": true → This item has explicit dimensions/specs/quantities readable from the drawing. Cite the source: "As shown on drawing: 12m × 8m stage area"
- "confirmed": false → This item is professionally assumed based on standard practice for this building type, but NOT explicitly shown. State your assumption: "Assumed: Standard 230mm brick wall as per common practice for auditoriums"

STEP 3 — MATERIAL TAKE-OFF DATA:
Generate MTO data based on what is VISIBLE in the drawings. Extrapolate only where standard practice allows.

═══ MANDATORY RATE TABLE — YOU MUST USE THESE EXACT RATES ═══
${rateTable}

═══ MIDDLE EAST RATES (use when project is in Gulf region) ═══
${meRates}

RATE USAGE RULES (CRITICAL — VIOLATIONS WILL BE REJECTED):
1. For EVERY item, use the EXACT rate from the rate table above — do NOT modify, round, or create ranges
2. The "rateSource" field MUST cite the DSR reference code from the table (e.g., "CPWD DSR 2024 [DSR 4.2] — ₹5,862/m³")
3. For items NOT in the rate table → mark rateSource as "Market Rate (Estimated)" with justification
4. NEVER invent DSR item numbers not present in the table
5. ALL rates are in INR. Copy numbers EXACTLY from the table.

EXAMPLE OF CORRECT RATES (use these EXACT numbers):
- Excavation ordinary soil ≤1.5m: ₹398/m³ [DSR 2.1]
- PCC M15: ₹5,862/m³ [DSR 4.2]
- RCC M25: ₹7,126/m³ [DSR 4.8]
- RCC M30: ₹7,894/m³ [DSR 4.9]
- Fe500 Steel: ₹78.50/kg [DSR 5.1]
- Brick masonry CM 1:6: ₹6,284/m³ [DSR 6.2]
- 12mm plaster CM 1:4: ₹228/m² [DSR 11.1]

QUANTITY MEASUREMENT:
- IS 1200 (all parts) — Indian measurement standards
- Measure net quantities from drawings, show calculation basis
- Example: "External wall 230mm: (2×15.0m + 2×12.0m) × 3.0m height - 8 windows (1.2×1.5) = 147.6 m² net"

WASTE FACTORS (per industry standards):
- Concrete: 2.5%, Steel: 5%, Bricks: 5%, Cement: 2%, Sand: 5%, Tiles: 10%, Paint: 5%, Waterproofing: 10%, MEP: 10-15%

CATEGORIES: Excavation & Earthwork, Concrete, Reinforcement Steel, Formwork, Masonry, Plastering, Waterproofing, Doors & Windows, Flooring, Wall Finishes, Ceiling, Painting, Plumbing, Electrical, HVAC, Fire Protection, External Works

GENERATE 40-80+ LINE ITEMS. Include specification (IS code), quantity with calculation basis, proper unit per IS 1200.

STEP 4 — GAPS & MISSING INFORMATION:
Identify what information is NOT in the drawing but NEEDED for this module. Categorize by priority:
- HIGH: Critical — will significantly impact scope, cost, or schedule if not clarified
- MEDIUM: Important — needed for detailed design/execution
- LOW: Desirable — for optimization or best practice

STEP 5 — STAKEHOLDER QUESTIONS:
Generate professional RFI-style questions directed at specific consultants:
- Architect: Design intent, finishes, aesthetic requirements
- Structural Engineer: Loading, reinforcement, foundation design
- MEP Consultant: Services capacity, routing, equipment specifications
- QS/Cost Consultant: Budget, procurement, value engineering
Each question: {"to":"Architect", "question":"What is the specified floor finish for the auditorium seating area? Drawing shows only outline without finish schedule.", "priority":"HIGH", "impactArea":"Finishes cost and material procurement"}

Return JSON object format:
{"drawingAnalysis":{"drawingType":"Floor Plan - Ground Floor","buildingType":"Commercial - Auditorium","visibleElements":["walls","columns","beams"],"readableDimensions":["Overall: 45m × 30m"],"specsOnDrawing":["M25 concrete noted"],"scale":"1:100"},"items":[{"category":"Concrete","item":"PCC M15 Foundation Bed","description":"PCC M15 (1:2:4) for foundation bed","specification":"IS 456:2000, Min cement 270 kg/m³","quantity":45.5,"unit":"m³","wasteFactor":3,"unitRate":5862,"rateSource":"CPWD DSR 2024 [DSR 4.2] — ₹5,862/m³","measurementBasis":"IS 1200 Part 2. Strip footing: 45m × 0.6m × 0.15 = 4.05 m³","confirmed":true}],"gaps":[{"priority":"HIGH","description":"Foundation design not shown — need structural engineer's foundation layout drawing"}],"consultantQuestions":[{"to":"Structural Engineer","question":"What is the foundation type for the column grid?","priority":"HIGH","impactArea":"Substructure scope and cost"}]}

ALL rates MUST be in INR.`;
}

let idCounter = 0;
const nextId = () => `mto-${++idCounter}`;

const EXCHANGE_RATES: Record<string, number> = { USD: 1, AED: 3.67, INR: 83.5, SAR: 3.75, GBP: 0.79, EUR: 0.92, QAR: 3.64, OMR: 0.385 };
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', AED: 'د.إ', INR: '₹', SAR: 'ر.س', GBP: '£', EUR: '€', QAR: 'ر.ق', OMR: 'ر.ع' };

export const MaterialTakeOff: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MTOData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingWaste, setEditingWaste] = useState<string | null>(null);
  const [editWasteVal, setEditWasteVal] = useState('');
  const [currency, setCurrency] = useState('USD');

  const rate = EXCHANGE_RATES[currency] || 1;
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const conv = (val: number) => val / (EXCHANGE_RATES['INR'] || 83.5) * (EXCHANGE_RATES[currency] || 1);
  const fmtC = (val: number) => `${sym} ${fmt(conv(val))}`;

  const items = data?.items || [];

  const updateItems = (updater: (prev: MTOItem[]) => MTOItem[]) => {
    setData(prev => prev ? { ...prev, items: updater(prev.items) } : null);
  };

  const badgeStyle = (bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
    background: bg, color, ...extra
  });

  const generate = async () => {
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the header first'); return; }
    setLoading(true); setError('');
    try {
      const userMsg = 'Analyze these construction drawings and create a comprehensive material take-off. CRITICAL: Use the EXACT rates from the CPWD DSR rate table in your instructions — Excavation MUST be ₹398/m³ [DSR 2.1], PCC M15 MUST be ₹5,862/m³ [DSR 4.2], RCC M30 MUST be ₹7,894/m³ [DSR 4.9], Steel Fe500 MUST be ₹78.50/kg [DSR 5.1]. Copy numbers exactly from the table. Do NOT modify, round, or fabricate rates. Return a JSON OBJECT (not array) with drawingAnalysis, items, gaps, and consultantQuestions fields.';
      const result = await callClaude(apiKey, buildMTOPrompt(), userMsg, selected);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      const arr = Array.isArray(parsed) ? parsed : parsed.items || [];
      const mapped: MTOItem[] = arr.map((r: any) => ({
        id: nextId(),
        category: r.category || 'General',
        item: r.item || '',
        description: r.description || '',
        specification: r.specification || '',
        quantity: Number(r.quantity) || 0,
        unit: r.unit || '',
        wasteFactor: Number(r.wasteFactor) || 0,
        unitRate: Number(r.unitRate) || 0,
        rateSource: r.rateSource || '',
        measurementBasis: r.measurementBasis || '',
        confirmed: r.confirmed !== false,
      }));
      setData({
        drawingAnalysis: parsed.drawingAnalysis || undefined,
        items: mapped,
        gaps: parsed.gaps || [],
        consultantQuestions: parsed.consultantQuestions || [],
      });
      onStatusChange('complete');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category)));
    cats.sort();
    return ['All', ...cats];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'All') return items;
    return items.filter(i => i.category === categoryFilter);
  }, [items, categoryFilter]);

  const adjustedQty = (i: MTOItem) => i.quantity * (1 + i.wasteFactor / 100);
  const lineTotal = (i: MTOItem) => adjustedQty(i) * i.unitRate;

  const grandTotal = useMemo(() => filteredItems.reduce((s, i) => s + lineTotal(i), 0), [filteredItems]);

  const categorySubtotals = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      map[i.category] = (map[i.category] || 0) + lineTotal(i);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const startEditWaste = (id: string, current: number) => {
    setEditingWaste(id);
    setEditWasteVal(String(current));
  };

  const saveWaste = (id: string) => {
    const val = parseFloat(editWasteVal);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      updateItems(prev => prev.map(i => i.id === id ? { ...i, wasteFactor: val } : i));
    }
    setEditingWaste(null);
  };

  const exportCSV = () => {
    const rows = filteredItems.map(i => ({
      Category: i.category,
      Item: i.item,
      Description: i.description,
      Specification: i.specification || '',
      'Measurement Basis': i.measurementBasis || '',
      Quantity: i.quantity,
      Unit: i.unit,
      'Waste %': i.wasteFactor,
      'Adjusted Qty': adjustedQty(i).toFixed(2),
      'Unit Rate': i.unitRate,
      'Rate Source': i.rateSource || '',
      Total: lineTotal(i).toFixed(2),
      Status: i.confirmed ? 'Confirmed' : 'Estimated',
    }));
    downloadCSV(rows, 'material-takeoff');
  };

  const exportPDF = () => {
    if (items.length === 0) return;
    const sections: PDFSection[] = [];

    // Drawing analysis
    if (data?.drawingAnalysis) {
      sections.push({
        type: 'keyvalue',
        title: 'Drawing Analysis',
        items: [
          { label: 'Drawing Type', value: data.drawingAnalysis.drawingType || '' },
          { label: 'Building Type', value: data.drawingAnalysis.buildingType || '' },
          { label: 'Scale', value: data.drawingAnalysis.scale || 'Not indicated' },
          ...(data.drawingAnalysis.visibleElements?.length ? [{ label: 'Visible Elements', value: data.drawingAnalysis.visibleElements.join(', ') }] : []),
          ...(data.drawingAnalysis.readableDimensions?.length ? [{ label: 'Readable Dimensions', value: data.drawingAnalysis.readableDimensions.join('; ') }] : []),
        ],
      });
    }

    // Category summary
    if (categorySubtotals.length > 0) {
      sections.push({
        type: 'keyvalue',
        title: 'Category Summary',
        items: [
          ...categorySubtotals.map(([cat, total]) => ({
            label: cat,
            value: fmtC(total),
          })),
          { label: 'Grand Total', value: fmtC(items.reduce((s, i) => s + lineTotal(i), 0)) },
          { label: 'Total Items', value: String(items.length) },
          { label: 'Currency', value: currency },
        ],
      });
    }

    // MTO Items table
    const exportItems = categoryFilter === 'All' ? items : filteredItems;
    sections.push({
      type: 'table',
      title: `Material Take-Off Details${categoryFilter !== 'All' ? ` — ${categoryFilter}` : ''}`,
      headers: ['Category', 'Item', 'Description', 'Specification', 'Qty', 'Unit', 'Waste %', 'Adj. Qty', 'Unit Rate', 'Rate Source', 'Total', 'Status'],
      rows: exportItems.map(i => [
        String(i.category ?? ''),
        String(i.item ?? ''),
        String(i.description ?? ''),
        String(i.specification ?? ''),
        String(fmt(i.quantity)),
        String(i.unit ?? ''),
        `${i.wasteFactor}%`,
        String(fmt(adjustedQty(i))),
        fmtC(i.unitRate),
        String(i.rateSource ?? ''),
        fmtC(lineTotal(i)),
        i.confirmed ? 'Confirmed' : 'Estimated',
      ]),
      summary: [
        { label: categoryFilter !== 'All' ? `${categoryFilter} Subtotal` : 'Grand Total', value: fmtC(grandTotal) },
        { label: 'Confirmed', value: String(exportItems.filter(i => i.confirmed).length) },
        { label: 'Estimated', value: String(exportItems.filter(i => !i.confirmed).length) },
      ],
    });

    // Gaps
    if (data?.gaps && data.gaps.length > 0) {
      sections.push({
        type: 'table',
        title: 'Gaps & Missing Information',
        headers: ['Priority', 'Description'],
        rows: data.gaps.map(g => [String(g.priority ?? ''), String(g.description ?? '')]),
      });
    }

    generatePDF({
      title: 'Material Take-Off Report',
      module: 'Module 8: Material Take-Off',
      sections,
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 8: Material Take-Off</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>AI-powered material quantification from drawings</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <button style={btnP} onClick={generate} disabled={loading}>
            <Play size={15} /> Generate MTO
          </button>
          {items.length > 0 && (
            <>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>Filter by Category</label>
                <select style={sel} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>Currency</label>
                <select style={sel} value={currency} onChange={e => setCurrency(e.target.value)}>
                  {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={exportPDF} style={{ ...btnSm, background: '#dc2626', color: '#fff', borderRadius: 6 }}>📄 PDF</button>
              <button style={btnSm} onClick={exportCSV}><Download size={14} /> Export CSV</button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is analyzing drawings for material take-off...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: C.errBg, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.err, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {items.length > 0 && !loading && (
        <>
          {/* Drawing Analysis Card */}
          {data?.drawingAnalysis && (
            <div style={{...card, border:'2px solid #2563eb', background:'linear-gradient(135deg,#eff6ff,#f0f7ff)', marginBottom: 16}}>
              <h3 style={{...secTitle, color:'#2563eb'}}>📐 Drawing Analysis</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <p style={{margin:0}}><strong>Drawing Type:</strong> {data.drawingAnalysis.drawingType}</p>
                <p style={{margin:0}}><strong>Building Type:</strong> {data.drawingAnalysis.buildingType}</p>
              </div>
              {data.drawingAnalysis.visibleElements?.length > 0 && (
                <div style={{marginTop:'8px'}}><strong>Visible Elements:</strong>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'4px'}}>
                    {data.drawingAnalysis.visibleElements.map((e:string,i:number) => (
                      <span key={i} style={badgeStyle('#dbeafe','#1e40af')}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.drawingAnalysis.readableDimensions?.length > 0 && (
                <div style={{marginTop:'8px'}}><strong>Readable Dimensions:</strong>
                  <ul style={{margin:'4px 0 0 16px',padding:0}}>
                    {data.drawingAnalysis.readableDimensions.map((d:string,i:number) => <li key={i} style={{fontSize:'13px'}}>{d}</li>)}
                  </ul>
                </div>
              )}
              {data.drawingAnalysis.specsOnDrawing?.length > 0 && (
                <div style={{marginTop:'8px'}}><strong>Specifications on Drawing:</strong>
                  <ul style={{margin:'4px 0 0 16px',padding:0}}>
                    {data.drawingAnalysis.specsOnDrawing.map((s:string,i:number) => <li key={i} style={{fontSize:'13px'}}>{s}</li>)}
                  </ul>
                </div>
              )}
              {data.drawingAnalysis.scale && <p style={{marginTop:'4px',marginBottom:0}}><strong>Scale:</strong> {data.drawingAnalysis.scale}</p>}
            </div>
          )}

          {/* Gaps Section */}
          {data?.gaps && data.gaps.length > 0 && (
            <div style={{...card, border:'2px solid #f59e0b', background:'#fffbeb', marginBottom: 16}}>
              <h3 style={{...secTitle, color:'#d97706'}}>⚠️ Gaps & Missing Information ({data.gaps.length})</h3>
              {data.gaps.map((g:any,i:number) => (
                <div key={i} style={{padding:'8px 0',borderBottom:i<(data.gaps?.length||0)-1?'1px solid #fde68a':'none',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                  <span style={badgeStyle(g.priority==='HIGH'?'#ef4444':g.priority==='MEDIUM'?'#f59e0b':'#3b82f6','#fff',{flexShrink:0,minWidth:'55px',textAlign:'center'})}>{g.priority}</span>
                  <span style={{fontSize:'13px'}}>{g.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Consultant Questions Section */}
          {data?.consultantQuestions && data.consultantQuestions.length > 0 && (
            <div style={{...card, border:'2px solid #7c3aed', background:'#f5f3ff', marginBottom: 16}}>
              <h3 style={{...secTitle, color:'#7c3aed'}}>💬 Stakeholder Questions ({data.consultantQuestions.length})</h3>
              {['Architect','Structural Engineer','MEP Consultant','QS/Cost Consultant'].map(role => {
                const qs = (data.consultantQuestions || []).filter((q:any) => q.to === role);
                return qs.length > 0 ? (
                  <div key={role} style={{marginBottom:'12px'}}>
                    <h4 style={{fontWeight:600,color:'#4c1d95',margin:'8px 0 4px',fontSize:'14px'}}>{role}</h4>
                    {qs.map((q:any,i:number) => (
                      <div key={i} style={{padding:'6px 8px',borderBottom:'1px solid #e9e5f5',display:'flex',gap:'6px',alignItems:'flex-start'}}>
                        <span style={badgeStyle(q.priority==='HIGH'?'#ef4444':'#f59e0b','#fff',{flexShrink:0})}>{q.priority}</span>
                        <div><span style={{fontSize:'13px'}}>{q.question}</span>
                          {q.impactArea && <span style={{fontSize:'11px',color:'#6b7280',marginLeft:'8px'}}>→ {q.impactArea}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Category Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
            {categorySubtotals.slice(0, 5).map(([cat, total], i) => {
              const colors = [C.primary, C.purple, C.ok, C.warn, C.info];
              return (
                <div key={cat} style={{ ...card, borderLeft: `4px solid ${colors[i % colors.length]}`, cursor: 'pointer' }} onClick={() => setCategoryFilter(cat)}>
                  <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>{cat}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: colors[i % colors.length] }}>{fmtC(total)}</div>
                  <div style={{ fontSize: 11, color: C.tx3 }}>
                    {items.filter(it => it.category === cat).length} items
                  </div>
                </div>
              );
            })}
            <div style={{ ...card, borderLeft: `4px solid ${C.ok}`, background: C.okBg }}>
              <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>💰 Grand Total</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.ok }}>
                {fmtC(items.reduce((s, i) => s + lineTotal(i), 0))}
              </div>
              <div style={{ fontSize: 11, color: C.tx3 }}>{items.length} total items</div>
            </div>
          </div>

          {/* MTO Table */}
          <div style={{ ...card, marginBottom: 24 }}>
            <h3 style={secTitle}><Package size={16} style={{ marginRight: 6 }} />Material Take-Off Details {categoryFilter !== 'All' && `— ${categoryFilter}`}</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Category</th>
                    <th style={th}>Item</th>
                    <th style={{ ...th, minWidth: 180 }}>Description & Spec</th>
                    <th style={{ ...th, minWidth: 130 }}>Measurement Basis</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Unit</th>
                    <th style={th}>Waste %</th>
                    <th style={th}>Adj. Qty</th>
                    <th style={th}>Rate</th>
                    <th style={{ ...th, minWidth: 110 }}>Rate Source</th>
                    <th style={th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} style={{ background: item.confirmed === false ? '#fef9c3' : 'transparent' }}>
                      <td style={{ ...td, fontSize: 12 }}>
                        <span style={{ background: C.infoBg, color: C.info, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{item.category}</span>
                      </td>
                      <td style={{ ...td, fontWeight: 500, fontSize: 12 }}>{item.item}</td>
                      <td style={{ ...td, fontSize: 12, color: C.tx2, maxWidth: 220 }}>
                        <div>{item.description}</div>
                        {item.specification && <div style={{ fontSize: 10, color: C.tx3, marginTop: 2, fontStyle: 'italic' }}>Spec: {item.specification}</div>}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: C.tx3, fontStyle: 'italic' }}>{item.measurementBasis || '—'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmt(item.quantity)}</td>
                      <td style={td}>{item.unit}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {editingWaste === item.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              style={{ ...({} as any), width: 50, padding: '2px 4px', border: `1px solid ${C.primary}`, borderRadius: 4, fontSize: 12, textAlign: 'center' as const }}
                              value={editWasteVal}
                              onChange={e => setEditWasteVal(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveWaste(item.id)}
                              autoFocus
                            />
                            <button onClick={() => saveWaste(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: C.ok }}>
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, color: C.warn, fontWeight: 500 }}
                            onClick={() => startEditWaste(item.id, item.wasteFactor)}
                            title="Click to edit"
                          >
                            {item.wasteFactor}% <Edit3 size={11} />
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>{fmt(adjustedQty(item))}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtC(item.unitRate)}</td>
                      <td style={{ ...td, fontSize: 11, color: C.tx2 }}>{item.rateSource || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtC(lineTotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={10} style={{ ...td, fontWeight: 700, textAlign: 'right', borderTop: `2px solid ${C.bdr}` }}>
                      {categoryFilter !== 'All' ? `${categoryFilter} Subtotal` : 'Grand Total'} ({filteredItems.filter(i => i.confirmed).length} confirmed, {filteredItems.filter(i => !i.confirmed).length} estimated)
                    </td>
                    <td style={{ ...td, fontWeight: 700, textAlign: 'right', color: C.primary, fontSize: 15, borderTop: `2px solid ${C.bdr}` }}>
                      {fmtC(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {items.length === 0 && !loading && !error && (
        <div style={empty}>
          <Package size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>Select drawings and click Generate MTO to create a material take-off</p>
        </div>
      )}
    </div>
  );
};

export default MaterialTakeOff;
