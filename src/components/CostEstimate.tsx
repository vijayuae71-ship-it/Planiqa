import React, { useState, useMemo } from 'react';
import { DollarSign, Download, Play, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, inp, sel, tbl, th, td, badge, secTitle, empty, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadCSV } from '../utils/export';
import { generatePDF, PDFSection } from '../utils/pdf';
import { getCPWDRateReference, getMiddleEastRates, validateAndCorrectRates } from '../utils/rates';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface CostItem {
  csiCode: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  materialRate: number;
  laborRate: number;
  equipmentRate: number;
  total: number;
  rateSource: string;
  measurementBasis: string;
  confirmed: boolean;
}

interface VEOpportunity {
  item: string;
  saving: number;
  risk: string;
}

interface CashFlowItem {
  month: string;
  planned: number;
  cumulative: number;
}

interface CostData {
  drawingAnalysis?: any;
  items: CostItem[];
  veOpportunities: VEOpportunity[];
  cashFlow: CashFlowItem[];
  clarificationsNeeded: { question: string; impactArea: string; priority: string }[];
  assumptions: string[];
  exclusions: string[];
  gaps?: any[];
  consultantQuestions?: any[];
}

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  AED: 3.67,
  INR: 83.5,
  SAR: 3.75,
  GBP: 0.79,
  EUR: 0.92,
  QAR: 3.64,
  OMR: 0.385,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  AED: 'د.إ',
  INR: '₹',
  SAR: 'ر.س',
  GBP: '£',
  EUR: '€',
  QAR: 'ر.ق',
  OMR: 'ر.ع',
};

const REGIONS = ['UAE', 'Saudi Arabia', 'India', 'UK', 'USA', 'Qatar', 'Oman'];

function buildCostEstimatePrompt(): string {
  const rateTable = getCPWDRateReference('INR');
  const meRates = getMiddleEastRates();
  return `MANDATORY ANALYSIS PROTOCOL — FOLLOW THESE STEPS IN ORDER:

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

STEP 3 — COST ESTIMATION DATA:
You are a senior cost estimator (AACE CCP / RICS QS, 25+ years experience) preparing detailed cost estimates for Tier-1 contractors (L&T, Sobha, Danube, Nagarjuna). Your estimate will be used for tendering and contract negotiations.

═══ MANDATORY RATE TABLE — YOU MUST USE THESE EXACT RATES ═══
${rateTable}

═══ MIDDLE EAST RATES (use when project is in Gulf region) ═══
${meRates}

RATE USAGE RULES (CRITICAL — VIOLATIONS WILL BE REJECTED):
1. For EVERY item, use the EXACT rate from the rate table above — do NOT modify, round, or create ranges
2. The "rateSource" field MUST cite the DSR reference code from the table (e.g., "CPWD DSR 2024 [DSR 4.2] — ₹5,862/m³")
3. For items NOT in the rate table → mark rateSource as "Market Rate (Estimated)" with justification
4. NEVER invent DSR item numbers not present in the table above
5. Split the EXACT total rate into Material + Labor + Equipment components (Material ~55-60%, Labor ~30-35%, Equipment ~5-15%)

EXAMPLE OF CORRECT RATES (use these EXACT numbers — copy from the table):
- Excavation ordinary soil ≤1.5m: ₹398/m³ total [DSR 2.1] → Material ₹159, Labor ₹199, Equipment ₹40
- PCC M15 (1:2:4): ₹5,862/m³ total [DSR 4.2] → Material ₹3,517, Labor ₹1,759, Equipment ₹586
- RCC M25 slabs: ₹7,126/m³ total [DSR 4.8]
- RCC M30 columns: ₹7,894/m³ total [DSR 4.9]
- Fe500 TMT steel: ₹78.50/kg total [DSR 5.1]
- Brick masonry CM 1:6: ₹6,284/m³ total [DSR 6.2]
- 12mm plaster CM 1:4: ₹228/m² total [DSR 11.1]
- Vitrified tiles 600×600: ₹1,164/m² total [DSR 14.32]

CSI MASTERFORMAT 2020 CODES:
- 02 00 00: Existing Conditions | 03 00 00: Concrete | 04 00 00: Masonry
- 05 00 00: Metals | 06 00 00: Wood/Plastics | 07 00 00: Thermal & Moisture
- 08 00 00: Openings | 09 00 00: Finishes | 10-14: Specialties/Equipment
- 21-28: MEP | 31-33: Sitework

COST STRUCTURE (for EACH item):
- Material Rate: Raw material cost per unit (cite DSR reference)
- Labor Rate: Per unit labor cost (typically 25-40% of material rate for most items)
- Equipment Rate: Plant & equipment per unit (typically 5-15% of material rate)
- Total = Quantity × (Material + Labor + Equipment)

GENERATE 40-80+ LINE ITEMS. Include: Preliminaries (5-8%), all structural items, all finishes, MEP provisions (25-35%), external works, testing, contingency (5-10%).

VE OPPORTUNITIES: 5-10 realistic alternatives with specific savings in INR.
CASH FLOW: Monthly planned expenditure with S-curve.
CLARIFICATIONS: Items needing consultant input.
ASSUMPTIONS & EXCLUSIONS: List all clearly.

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

Return JSON:
{"drawingAnalysis":{"drawingType":"Floor Plan - Ground Floor","buildingType":"Commercial - Office Building","visibleElements":["columns","beams","walls","doors","windows"],"readableDimensions":["Overall: 45m × 30m","Column grid: 6m c/c"],"specsOnDrawing":["M25 concrete","Fe500 steel"],"scale":"1:100"},"items":[{"csiCode":"03 30 00","description":"RCC M30 concrete for columns","specification":"IS 456:2000, M30 grade","quantity":28,"unit":"m³","materialRate":4342,"laborRate":2763,"equipmentRate":789,"total":221032,"rateSource":"CPWD DSR 2024 [DSR 4.9] — ₹7,894/m³ total","measurementBasis":"IS 1200 Part 2. Columns C1-C8: 8nos × 0.4×0.4×4.2","confirmed":true}],"veOpportunities":[{"item":"Use GGBS blended cement in foundations","saving":85000,"risk":"Low"}],"cashFlow":[{"month":"Month 1","planned":500000,"cumulative":500000}],"clarificationsNeeded":[{"question":"MEP design drawings required","impactArea":"Divisions 21-28","priority":"Critical"}],"assumptions":["Soil bearing capacity adequate for isolated footings"],"exclusions":["Interior fit-out","External utilities beyond site boundary"],"gaps":[{"priority":"HIGH","description":"Foundation design not shown — need structural engineer's foundation layout drawing"}],"consultantQuestions":[{"to":"Structural Engineer","question":"What is the foundation type for the column grid?","priority":"HIGH","impactArea":"Substructure scope and cost"}]}`;
}

export const CostEstimate: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<CostData | null>(null);
  const [costBasis, setCostBasis] = useState('RSMeans');
  const [region, setRegion] = useState('UAE');
  const [currency, setCurrency] = useState('USD');

  const rate = EXCHANGE_RATES[currency] || 1;
  const sym = CURRENCY_SYMBOLS[currency] || currency;

  const convert = (val: number) => val / (EXCHANGE_RATES['INR'] || 83.5) * (EXCHANGE_RATES[currency] || 1);
  const fmtC = (val: number) => `${sym} ${fmt(convert(val))}`;

  const generate = async () => {
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the header first'); return; }
    setLoading(true); setError('');
    try {
      const userMsg = `Analyze these construction drawings and generate a detailed cost estimate using ${costBasis} cost basis for the ${region} region. ALL rates must be in INR from the CPWD DSR rate table provided. CRITICAL: Use the EXACT rates from the table — Excavation MUST be ₹398/m³ [DSR 2.1], PCC M15 MUST be ₹5,862/m³ [DSR 4.2], RCC M30 MUST be ₹7,894/m³ [DSR 4.9], Steel Fe500 MUST be ₹78.50/kg [DSR 5.1]. Copy numbers exactly from the table. Do NOT modify, round, or fabricate rates. Follow the MANDATORY ANALYSIS PROTOCOL — analyze the drawing FIRST, then generate cost data.`;
      const result = await callClaude(apiKey, buildCostEstimatePrompt(), userMsg, selected);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      // Validate rates: add a synthetic 'unitRate' for validation, then redistribute
      const rawCEItems = (parsed.items || []).map((i: any) => ({
        ...i,
        unitRate: (Number(i.materialRate) || 0) + (Number(i.laborRate) || 0) + (Number(i.equipmentRate) || 0),
        rateSource: i.rateSource || '',
      }));
      const validatedCE = validateAndCorrectRates(rawCEItems, 'unitRate', 'rateSource');
      const items = validatedCE.map((i: any) => {
        const origTotal = (Number(i.materialRate) || 0) + (Number(i.laborRate) || 0) + (Number(i.equipmentRate) || 0);
        const correctedTotal = Number(i.unitRate) || origTotal;
        // Redistribute: if rate was corrected, scale material/labor/equipment proportionally
        const scale = origTotal > 0 ? correctedTotal / origTotal : 1;
        return {
        ...i,
        quantity: Number(i.quantity) || 0,
        materialRate: Math.round((Number(i.materialRate) || 0) * scale * 100) / 100,
        laborRate: Math.round((Number(i.laborRate) || 0) * scale * 100) / 100,
        equipmentRate: Math.round((Number(i.equipmentRate) || 0) * scale * 100) / 100,
        total: Number(i.quantity) || 0 > 0 ? (Number(i.quantity) || 0) * correctedTotal : Number(i.total) || 0,
        rateSource: i.rateSource || '',
        specification: i.specification || '',
        measurementBasis: i.measurementBasis || '',
        confirmed: i.confirmed !== false,
      }; });
      setData({
        drawingAnalysis: parsed.drawingAnalysis || null,
        items,
        veOpportunities: parsed.veOpportunities || [],
        cashFlow: parsed.cashFlow || [],
        clarificationsNeeded: parsed.clarificationsNeeded || [],
        assumptions: parsed.assumptions || [],
        exclusions: parsed.exclusions || [],
        gaps: parsed.gaps || [],
        consultantQuestions: parsed.consultantQuestions || [],
      });
      onStatusChange('complete');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    if (!data) return { material: 0, labor: 0, equipment: 0, grand: 0 };
    const material = data.items.reduce((s, i) => s + i.quantity * i.materialRate, 0);
    const labor = data.items.reduce((s, i) => s + i.quantity * i.laborRate, 0);
    const equipment = data.items.reduce((s, i) => s + i.quantity * i.equipmentRate, 0);
    return { material, labor, equipment, grand: material + labor + equipment };
  }, [data]);

  const maxCashFlow = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.cashFlow.map(c => c.cumulative), 1);
  }, [data]);

  const exportCSV = () => {
    if (!data) return;
    const rows = data.items.map(i => ({
      'CSI Code': i.csiCode,
      Description: i.description,
      Specification: i.specification || '',
      'Measurement Basis': i.measurementBasis || '',
      Quantity: i.quantity,
      Unit: i.unit,
      'Material Rate': convert(i.materialRate).toFixed(2),
      'Labor Rate': convert(i.laborRate).toFixed(2),
      'Equipment Rate': convert(i.equipmentRate).toFixed(2),
      'Rate Source': i.rateSource || '',
      Total: convert(i.total).toFixed(2),
      Currency: currency,
      Status: i.confirmed ? 'Confirmed' : 'Estimated',
    }));
    downloadCSV(rows, 'cost-estimate');
  };

  const exportPDF = () => {
    if (!data) return;
    const sections: PDFSection[] = [];

    // Cost summary
    sections.push({
      type: 'keyvalue',
      title: 'Cost Summary',
      items: [
        { label: 'Total Material', value: fmtC(totals.material) },
        { label: 'Total Labor', value: fmtC(totals.labor) },
        { label: 'Total Equipment', value: fmtC(totals.equipment) },
        { label: 'Grand Total', value: fmtC(totals.grand) },
        { label: 'Currency', value: currency },
        { label: 'Cost Basis', value: costBasis },
        { label: 'Region', value: region },
      ],
    });

    // Cost items table
    sections.push({
      type: 'table',
      title: 'Cost Breakdown',
      headers: ['CSI Code', 'Description', 'Specification', 'Qty', 'Unit', 'Material Rate', 'Labor Rate', 'Equip. Rate', 'Rate Source', 'Total'],
      rows: data.items.map(i => [
        String(i.csiCode ?? ''),
        String(i.description ?? ''),
        String(i.specification ?? ''),
        String(fmt(i.quantity)),
        String(i.unit ?? ''),
        fmtC(i.materialRate),
        fmtC(i.laborRate),
        fmtC(i.equipmentRate),
        String(i.rateSource ?? ''),
        fmtC(i.total),
      ]),
      summary: [
        { label: 'Material Total', value: fmtC(totals.material) },
        { label: 'Labor Total', value: fmtC(totals.labor) },
        { label: 'Equipment Total', value: fmtC(totals.equipment) },
        { label: 'Grand Total', value: fmtC(totals.grand) },
      ],
    });

    // VE Opportunities
    if (data.veOpportunities && data.veOpportunities.length > 0) {
      sections.push({
        type: 'table',
        title: 'Value Engineering Opportunities',
        headers: ['Opportunity', 'Potential Saving', 'Risk Level'],
        rows: data.veOpportunities.map(ve => [
          String(ve.item ?? ''),
          fmtC(ve.saving),
          String(ve.risk ?? ''),
        ]),
        summary: [{ label: 'Total Potential Savings', value: fmtC(data.veOpportunities.reduce((s, v) => s + v.saving, 0)) }],
      });
    }

    // Cash Flow
    if (data.cashFlow && data.cashFlow.length > 0) {
      sections.push({
        type: 'table',
        title: 'Cash Flow Projection',
        headers: ['Month', 'Planned', 'Cumulative'],
        rows: data.cashFlow.map(cf => [
          String(cf.month ?? ''),
          fmtC(cf.planned),
          fmtC(cf.cumulative),
        ]),
      });
    }

    // Clarifications
    if (data.clarificationsNeeded && data.clarificationsNeeded.length > 0) {
      sections.push({
        type: 'table',
        title: 'Clarifications Needed',
        headers: ['#', 'Priority', 'Impact Area', 'Question'],
        rows: data.clarificationsNeeded.map((c, i) => [
          String(i + 1),
          String(c.priority ?? ''),
          String(c.impactArea ?? ''),
          String(c.question ?? ''),
        ]),
      });
    }

    // Assumptions
    if (data.assumptions && data.assumptions.length > 0) {
      sections.push({
        type: 'list',
        title: 'Assumptions',
        items: data.assumptions,
        ordered: true,
      });
    }

    // Exclusions
    if (data.exclusions && data.exclusions.length > 0) {
      sections.push({
        type: 'list',
        title: 'Exclusions',
        items: data.exclusions,
        ordered: true,
      });
    }

    generatePDF({
      title: 'Cost Estimate Report',
      module: 'Module 6: Cost Estimate',
      sections,
    });
  };

  const summaryCards = [
    { label: 'Total Material', value: totals.material, color: C.primary, icon: '🧱' },
    { label: 'Total Labor', value: totals.labor, color: C.purple, icon: '👷' },
    { label: 'Total Equipment', value: totals.equipment, color: C.warn, icon: '🏗️' },
    { label: 'Grand Total', value: totals.grand, color: C.ok, icon: '💰' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 6: Cost Estimate</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>AI-powered cost estimation with VE opportunities</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>Cost Basis</label>
            <select style={sel} value={costBasis} onChange={e => setCostBasis(e.target.value)}>
              <option value="RSMeans">RSMeans</option>
              <option value="Spon's">Spon's</option>
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>Region</label>
            <select style={sel} value={region} onChange={e => setRegion(e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>Currency</label>
            <select style={sel} value={currency} onChange={e => setCurrency(e.target.value)}>
              {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button style={btnP} onClick={generate} disabled={loading}>
            <Play size={15} /> Generate Cost Estimate
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is analyzing drawings and estimating costs...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: C.errBg, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.err, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* 📐 Drawing Analysis Card */}
          {data.drawingAnalysis && (
            <div style={{ ...card, border: '2px solid #2563eb', background: 'linear-gradient(135deg,#eff6ff,#f0f7ff)', marginBottom: 16 }}>
              <h3 style={{ ...secTitle, color: '#2563eb' }}>📐 Drawing Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <p style={{ margin: 0 }}><strong>Drawing Type:</strong> {data.drawingAnalysis.drawingType}</p>
                <p style={{ margin: 0 }}><strong>Building Type:</strong> {data.drawingAnalysis.buildingType}</p>
              </div>
              {data.drawingAnalysis.visibleElements?.length > 0 && (
                <div style={{ marginTop: '8px' }}><strong>Visible Elements:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {data.drawingAnalysis.visibleElements.map((e: string, i: number) => (
                      <span key={i} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.drawingAnalysis.readableDimensions?.length > 0 && (
                <div style={{ marginTop: '8px' }}><strong>Readable Dimensions:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {data.drawingAnalysis.readableDimensions.map((d: string, i: number) => <li key={i} style={{ fontSize: '13px' }}>{d}</li>)}
                  </ul>
                </div>
              )}
              {data.drawingAnalysis.specsOnDrawing?.length > 0 && (
                <div style={{ marginTop: '8px' }}><strong>Specifications on Drawing:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {data.drawingAnalysis.specsOnDrawing.map((s: string, i: number) => <li key={i} style={{ fontSize: '13px' }}>{s}</li>)}
                  </ul>
                </div>
              )}
              {data.drawingAnalysis.scale && <p style={{ marginTop: '4px', marginBottom: 0 }}><strong>Scale:</strong> {data.drawingAnalysis.scale}</p>}
            </div>
          )}

          {/* ⚠️ Gaps & Missing Information */}
          {data.gaps && data.gaps.length > 0 && (
            <div style={{ ...card, border: '2px solid #f59e0b', background: '#fffbeb', marginBottom: 16 }}>
              <h3 style={{ ...secTitle, color: '#d97706' }}>⚠️ Gaps & Missing Information ({data.gaps.length})</h3>
              {data.gaps.map((g: any, i: number) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < data.gaps!.length - 1 ? '1px solid #fde68a' : 'none', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, background: g.priority === 'HIGH' ? '#ef4444' : g.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6', color: '#fff', flexShrink: 0, minWidth: '55px', textAlign: 'center' }}>{g.priority}</span>
                  <span style={{ fontSize: '13px' }}>{g.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* 💬 Stakeholder Questions */}
          {data.consultantQuestions && data.consultantQuestions.length > 0 && (
            <div style={{ ...card, border: '2px solid #7c3aed', background: '#f5f3ff', marginBottom: 16 }}>
              <h3 style={{ ...secTitle, color: '#7c3aed' }}>💬 Stakeholder Questions ({data.consultantQuestions.length})</h3>
              {['Architect', 'Structural Engineer', 'MEP Consultant', 'QS/Cost Consultant'].map(role => {
                const qs = data.consultantQuestions!.filter((q: any) => q.to === role);
                return qs.length > 0 ? (
                  <div key={role} style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontWeight: 600, color: '#4c1d95', margin: '8px 0 4px', fontSize: '14px' }}>{role}</h4>
                    {qs.map((q: any, i: number) => (
                      <div key={i} style={{ padding: '6px 8px', borderBottom: '1px solid #e9e5f5', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, background: q.priority === 'HIGH' ? '#ef4444' : '#f59e0b', color: '#fff', flexShrink: 0 }}>{q.priority}</span>
                        <div><span style={{ fontSize: '13px' }}>{q.question}</span>
                          {q.impactArea && <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>→ {q.impactArea}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
            {summaryCards.map((c, i) => (
              <div key={i} style={{ ...card, borderLeft: `4px solid ${c.color}` }}>
                <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>{c.icon} {c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{fmtC(c.value)}</div>
                {currency !== 'USD' && (
                  <div style={{ fontSize: 11, color: C.tx3, marginTop: 2 }}>USD {fmt(c.value)}</div>
                )}
              </div>
            ))}
          </div>

          {/* Cost Items Table */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={secTitle}><BarChart3 size={16} style={{ marginRight: 6 }} />Cost Breakdown</h3>
              <button onClick={exportPDF} style={{ ...btnSm, background: '#dc2626', color: '#fff', borderRadius: 6 }}>📄 PDF</button>
              <button style={btnSm} onClick={exportCSV}><Download size={14} /> Export CSV</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>CSI Code</th>
                    <th style={{ ...th, minWidth: 200 }}>Description & Spec</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Unit</th>
                    <th style={th}>Material</th>
                    <th style={th}>Labor</th>
                    <th style={th}>Equip.</th>
                    <th style={{ ...th, minWidth: 120 }}>Rate Source</th>
                    <th style={th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, i) => (
                    <tr key={i} style={{ background: item.confirmed === false ? '#fef9c3' : 'transparent' }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{item.csiCode}</td>
                      <td style={td}>
                        <div style={{ fontSize: 13 }}>{item.description}</div>
                        {item.specification && <div style={{ fontSize: 11, color: C.tx3, marginTop: 2, fontStyle: 'italic' }}>Spec: {item.specification}</div>}
                        {item.measurementBasis && <div style={{ fontSize: 11, color: C.primary, marginTop: 1 }}>📐 {item.measurementBasis}</div>}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmt(item.quantity)}</td>
                      <td style={td}>{item.unit}</td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 12 }}>{fmtC(item.materialRate)}</td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 12 }}>{fmtC(item.laborRate)}</td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 12 }}>{fmtC(item.equipmentRate)}</td>
                      <td style={{ ...td, fontSize: 11, color: C.tx2 }}>{item.rateSource || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtC(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8} style={{ ...td, fontWeight: 700, textAlign: 'right', borderTop: `2px solid ${C.bdr}` }}>Grand Total</td>
                    <td style={{ ...td, fontWeight: 700, textAlign: 'right', color: C.primary, fontSize: 15, borderTop: `2px solid ${C.bdr}` }}>{fmtC(totals.grand)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* VE Opportunities */}
          {data.veOpportunities && data.veOpportunities.length > 0 && (
            <div style={{ ...card, marginBottom: 24 }}>
              <h3 style={secTitle}><TrendingUp size={16} style={{ marginRight: 6 }} />Value Engineering Opportunities</h3>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Opportunity</th>
                    <th style={th}>Potential Saving</th>
                    <th style={th}>Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {data.veOpportunities.map((ve, i) => {
                    const riskColor = ve.risk === 'High' ? C.err : ve.risk === 'Medium' ? C.warn : C.ok;
                    const riskBg = ve.risk === 'High' ? C.errBg : ve.risk === 'Medium' ? C.warnBg : C.okBg;
                    return (
                      <tr key={i}>
                        <td style={td}>{ve.item}</td>
                        <td style={{ ...td, fontWeight: 600, color: C.ok }}>{fmtC(ve.saving)}</td>
                        <td style={td}><span style={badge(riskColor, riskBg)}>{ve.risk}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ ...td, fontWeight: 700, borderTop: `2px solid ${C.bdr}` }}>Total Potential Savings</td>
                    <td style={{ ...td, fontWeight: 700, color: C.ok, borderTop: `2px solid ${C.bdr}` }}>
                      {fmtC(data.veOpportunities.reduce((s, v) => s + v.saving, 0))}
                    </td>
                    <td style={{ ...td, borderTop: `2px solid ${C.bdr}` }} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Cash Flow */}
          {data.cashFlow && data.cashFlow.length > 0 && (
            <div style={{ ...card, marginBottom: 24 }}>
              <h3 style={secTitle}><AlertTriangle size={16} style={{ marginRight: 6 }} />Cash Flow Projection</h3>
              <table style={{ ...tbl, marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th style={th}>Month</th>
                    <th style={th}>Planned</th>
                    <th style={th}>Cumulative</th>
                    <th style={{ ...th, width: '30%' }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cashFlow.map((cf, i) => {
                    const pct = maxCashFlow > 0 ? (cf.cumulative / maxCashFlow) * 100 : 0;
                    return (
                      <tr key={i}>
                        <td style={{ ...td, fontWeight: 500 }}>{cf.month}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{fmtC(cf.planned)}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtC(cf.cumulative)}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 18, background: C.bgD, borderRadius: 9, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: C.grad, borderRadius: 9, transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 11, color: C.tx3, minWidth: 36, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Assumptions & Exclusions */}
          {(data.assumptions?.length > 0 || data.exclusions?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 24 }}>
              {data.assumptions?.length > 0 && (
                <div style={{ ...card, borderLeft: `4px solid ${C.warn}` }}>
                  <h3 style={secTitle}>⚠️ Assumptions</h3>
                  {data.assumptions.map((a: string, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: C.tx2, lineHeight: 1.8, paddingLeft: 8, borderLeft: `2px solid ${C.warn}33` }}>
                      {i + 1}. {a}
                    </div>
                  ))}
                </div>
              )}
              {data.exclusions?.length > 0 && (
                <div style={{ ...card, borderLeft: `4px solid ${C.err}` }}>
                  <h3 style={secTitle}>🚫 Exclusions</h3>
                  {data.exclusions.map((e: string, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: C.tx2, lineHeight: 1.8, paddingLeft: 8, borderLeft: `2px solid ${C.err}33` }}>
                      {i + 1}. {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clarifications Needed */}
          {data.clarificationsNeeded?.length > 0 && (
            <div style={{ ...card, marginBottom: 24, borderLeft: `4px solid ${C.primary}` }}>
              <h3 style={secTitle}>❓ Clarifications Needed from Consultants ({data.clarificationsNeeded.length})</h3>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Priority</th>
                    <th style={{ ...th, minWidth: 120 }}>Impact Area</th>
                    <th style={{ ...th, minWidth: 250 }}>Question</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clarificationsNeeded.map((c: any, i: number) => {
                    const pColor = c.priority === 'Critical' ? C.err : c.priority === 'High' ? '#ea580c' : C.warn;
                    const pBg = c.priority === 'Critical' ? C.errBg : c.priority === 'High' ? '#fff7ed' : C.warnBg;
                    return (
                      <tr key={i}>
                        <td style={{ ...td, color: C.tx3 }}>{i + 1}</td>
                        <td style={td}><span style={badge(pColor, pBg)}>{c.priority}</span></td>
                        <td style={{ ...td, fontWeight: 500, fontSize: 12 }}>{c.impactArea}</td>
                        <td style={{ ...td, fontSize: 13 }}>{c.question}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!data && !loading && !error && (
        <div style={empty}>
          <DollarSign size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>Select drawings and configure options, then click Generate Cost Estimate</p>
        </div>
      )}
    </div>
  );
};

export default CostEstimate;
