import React, { useState } from 'react';
import { ClipboardList, Sparkles, Download, Search, Filter, RefreshCw, X } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, inp, sel, tbl, th, td, badge, secTitle, empty, uid, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadTXT } from '../utils/export';
import { generatePDF, PDFSection } from '../utils/pdf';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface ScopeItem {
  division: string;
  divisionName: string;
  code?: string;
  trade: string;
  title?: string;
  description: string;
  specification: string;
  measurementBasis: string;
  notes: string;
  confirmed: boolean;
  assumptionBasis?: string;
}

interface ScopeData {
  drawingAnalysis?: {
    drawingType: string;
    buildingType: string;
    visibleElements: string[];
    readableDimensions: string[];
    specsOnDrawing: string[];
    scale: string;
  };
  items: ScopeItem[];
  gaps: { priority: string; description: string; discipline?: string; actionRequired?: string }[];
  consultantQuestions: { to: string; question: string; priority: string; impactArea?: string }[];
  drawingSummary?: string;
}

export const ScopeOfWork: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ScopeData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'scope' | 'gaps' | 'questions'>('scope');

  const items = data?.items || [];
  const gaps = data?.gaps || [];
  const consultantQuestions = data?.consultantQuestions || [];
  const drawingAnalysis = data?.drawingAnalysis;

  const generate = async () => {
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the header first'); return; }
    setLoading(true);
    setError('');
    try {
      const systemPrompt = `You are a senior construction scope of work specialist and pre-contract QS at a Tier-1 EPC contractor. You prepare scope documents submitted to clients like L&T Construction, Sobha Realty, Danube Properties, and Nagarjuna Construction. Your scope documents MUST be accurate, comprehensive, and suitable for tender/contract inclusion.

MANDATORY ANALYSIS PROTOCOL — FOLLOW THESE STEPS IN ORDER:

STEP 1 — DRAWING INTERPRETATION (DO THIS FIRST):
Carefully examine the uploaded drawing(s)/document(s). Before generating ANY scope data, analyze and report:
- What type of drawing is this? (floor plan, section, elevation, structural detail, schedule, site plan, MEP layout)
- What building/structure type? (residential villa, commercial office, auditorium, warehouse, hospital, etc.)
- List every visible element: walls, columns, beams, slabs, openings (doors/windows), stairs, ramps, services, annotations, room labels, dimensions
- List all readable dimensions with locations (e.g., "Overall building: 45m × 30m", "Column grid: 6m c/c both ways", "Room R1: 5m × 4m")
- Note any specifications, material callouts, or standards referenced on the drawing
- Note the scale if shown

STEP 2 — CONFIRMED vs ASSUMED:
For EVERY scope item you generate:
- "confirmed": true → This item has explicit dimensions/specs/quantities readable from the drawing. Cite the source in notes: "As shown on drawing: 12m × 8m stage area"
- "confirmed": false → This item is professionally assumed based on standard practice for this building type. State your assumption in assumptionBasis: "Assumed: Standard 230mm brick wall as per common practice for auditoriums"

STEP 3 — SCOPE ITEM GENERATION (CSI MasterFormat Divisions 01-35):
Generate scope items for CSI Divisions 01-35. Only include items evidenced by the drawing or standard practice for the identified building type.

SCOPE DEVELOPMENT METHODOLOGY:
1. INVENTORY every element visible in the drawing with labels, dimensions, specifications
2. MAP each element to CSI MasterFormat 2020 divisions (01-35)
3. For each scope item, define: WHAT is to be done, WHERE, HOW (specification/standard), and MEASUREMENT BASIS
4. SEPARATE confirmed items (visible in drawing) from assumed items (standard practice)

CRITICAL ACCURACY RULES:
- Quantities and dimensions: ONLY from what is measurable in the drawings
- Specifications: ONLY reference standards/grades visible in the drawing. If not visible, state "Specification TBD — verify with consultant"
- Measurement basis must follow IS 1200 (India), POMI/RICS NRM (International), or CESMM4 as appropriate
- Each item must be specific enough for a subcontractor to price
- Mark confirmed: true ONLY for items clearly shown in drawings, false for standard practice assumptions

IMPORTANT — GENERATE 30-60+ SCOPE ITEMS for a typical drawing. Be thorough. Cover:
- Preliminaries (site setup, temporary works, testing, insurance)
- All visible structural elements with specific member marks
- All visible architectural elements (each door type, window type, wall type separately)
- MEP provisions visible (conduit routes, outlet positions, equipment pads)
- External works visible (paving, landscaping, drainage)
- Applicable testing and commissioning

STEP 4 — GAPS & MISSING INFORMATION:
Identify what information is NOT in the drawing but NEEDED for a complete scope. Categorize by priority:
- HIGH: Critical — will significantly impact scope, cost, or schedule if not clarified
- MEDIUM: Important — needed for detailed design/execution
- LOW: Desirable — for optimization or best practice
For each gap include: priority, description, discipline (Structural/Architectural/MEP/Civil), actionRequired

STEP 5 — STAKEHOLDER QUESTIONS:
Generate professional RFI-style questions directed at specific consultants:
- Architect: Design intent, finishes, aesthetic requirements
- Structural Engineer: Loading, reinforcement, foundation design
- MEP Consultant: Services capacity, routing, equipment specifications
- QS/Cost Consultant: Budget, procurement, value engineering
Each question: {"to":"Architect", "question":"...", "priority":"HIGH", "impactArea":"Finishes cost and material procurement"}

Return JSON object format:
{"drawingAnalysis":{"drawingType":"Floor Plan - Ground Floor","buildingType":"Commercial - Auditorium","visibleElements":["walls","columns","beams"],"readableDimensions":["Overall: 45m x 30m"],"specsOnDrawing":["M30 concrete noted"],"scale":"1:100"},"drawingSummary":"Brief description of what the drawing shows and its scope implications","items":[{"division":"03","divisionName":"Concrete","code":"03 30 00","trade":"Concrete Contractor","title":"Cast-in-Place Concrete","description":"Supply, place, finish and cure Grade C30/37 (M30) ready-mix concrete to isolated pad foundations F1-F6 as per structural layout.","specification":"IS 456:2000 Cl.8 / ACI 318-19. Mix design to be approved.","measurementBasis":"Measured in m³ as placed per IS 1200 Part 2.","notes":"Foundation sizes from structural drawing.","confirmed":true,"assumptionBasis":""}],"gaps":[{"priority":"HIGH","description":"No structural drawing provided — foundation sizes cannot be confirmed","discipline":"Structural","actionRequired":"Request structural GA from structural consultant"}],"consultantQuestions":[{"to":"Structural Engineer","question":"What is the foundation type for the column grid?","priority":"HIGH","impactArea":"Substructure scope and cost"}]}`;
      const userMsg = 'Analyze these construction drawings and generate a comprehensive, contract-grade scope of work. This will be reviewed by project directors at major construction firms. For each item: specify the work clearly enough for subcontractor pricing, reference applicable standards, and state measurement basis. Identify ALL gaps in the drawings that prevent complete scoping. Generate specific RFI questions for the architect, structural engineer, MEP consultant, and QS.';
      const result = await callClaude(apiKey, systemPrompt, userMsg, selected);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      if (Array.isArray(parsed)) {
        setData({ items: parsed, gaps: [], consultantQuestions: [] });
      } else {
        setData({
          drawingAnalysis: parsed.drawingAnalysis || undefined,
          items: parsed.items || [],
          gaps: parsed.gaps || [],
          consultantQuestions: parsed.consultantQuestions || [],
          drawingSummary: parsed.drawingSummary || ''
        });
      }
      onStatusChange('complete');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const divisions = [...new Set(items.map(d => d.division))].sort();

  const filtered = items.filter(item => {
    const matchSearch = searchTerm === '' ||
      item.divisionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDiv = divisionFilter === 'all' || item.division === divisionFilter;
    return matchSearch && matchDiv;
  });

  const exportTXT = () => {
    let text = '═══════════════════════════════════════════════════════════════\n';
    text += '                    SCOPE OF WORK REPORT\n';
    text += '                    PlanIQ — AI Drawing Intelligence\n';
    text += '═══════════════════════════════════════════════════════════════\n\n';
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `Total Divisions: ${divisions.length} | Total Items: ${items.length}\n`;
    text += `Confirmed Items: ${items.filter(d => d.confirmed).length} | Assumptions: ${items.filter(d => !d.confirmed).length}\n`;
    if (data?.drawingSummary) text += `\nDrawing Summary: ${data.drawingSummary}\n`;
    if (drawingAnalysis) {
      text += `\nDRAWING ANALYSIS:\n`;
      text += `  Drawing Type: ${drawingAnalysis.drawingType}\n`;
      text += `  Building Type: ${drawingAnalysis.buildingType}\n`;
      if (drawingAnalysis.scale) text += `  Scale: ${drawingAnalysis.scale}\n`;
      if (drawingAnalysis.visibleElements?.length) text += `  Visible Elements: ${drawingAnalysis.visibleElements.join(', ')}\n`;
      if (drawingAnalysis.readableDimensions?.length) {
        text += `  Readable Dimensions:\n`;
        drawingAnalysis.readableDimensions.forEach(d => { text += `    • ${d}\n`; });
      }
    }
    text += '\n' + '─'.repeat(60) + '\n';
    text += 'SECTION 1: SCOPE ITEMS BY CSI DIVISION\n';
    text += '─'.repeat(60) + '\n';
    const grouped: Record<string, ScopeItem[]> = {};
    items.forEach(item => {
      const key = `Division ${item.division} — ${item.divisionName}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([div, ditems]) => {
      text += `\n${div}\n${'─'.repeat(40)}\n`;
      ditems.forEach((item, i) => {
        text += `\n  ${i + 1}. [${item.confirmed ? 'CONFIRMED' : 'ASSUMED'}] Trade: ${item.trade}\n`;
        text += `     Description: ${item.description}\n`;
        if (item.specification) text += `     Specification: ${item.specification}\n`;
        if (item.measurementBasis) text += `     Measurement: ${item.measurementBasis}\n`;
        if (item.notes) text += `     Notes: ${item.notes}\n`;
        if (item.assumptionBasis) text += `     Assumption Basis: ${item.assumptionBasis}\n`;
      });
    });
    if (gaps.length > 0) {
      text += '\n\n' + '─'.repeat(60) + '\n';
      text += 'SECTION 2: INFORMATION GAPS (PRIORITY ORDER)\n';
      text += '─'.repeat(60) + '\n\n';
      ['HIGH', 'MEDIUM', 'LOW'].forEach(p => {
        const pGaps = gaps.filter(g => g.priority === p);
        if (pGaps.length > 0) {
          text += `  [${p}]\n`;
          pGaps.forEach((g, i) => {
            text += `  ${i + 1}. ${g.description}\n`;
            if (g.discipline) text += `     Discipline: ${g.discipline}\n`;
            if (g.actionRequired) text += `     Action: ${g.actionRequired}\n\n`;
          });
        }
      });
    }
    if (consultantQuestions.length > 0) {
      text += '\n' + '─'.repeat(60) + '\n';
      text += 'SECTION 3: STAKEHOLDER QUESTIONS / RFIs\n';
      text += '─'.repeat(60) + '\n\n';
      ['Architect', 'Structural Engineer', 'MEP Consultant', 'QS/Cost Consultant'].forEach(role => {
        const qs = consultantQuestions.filter(q => q.to === role);
        if (qs.length > 0) {
          text += `  TO: ${role}\n`;
          qs.forEach((q, i) => {
            text += `  ${i + 1}. [${q.priority}] ${q.question}\n`;
            if (q.impactArea) text += `     Impact: ${q.impactArea}\n`;
            text += '\n';
          });
        }
      });
    }
    text += '\n' + '═'.repeat(60) + '\n';
    text += 'END OF SCOPE OF WORK REPORT\n';
    text += '═'.repeat(60) + '\n';
    downloadTXT(text, 'scope-of-work.txt');
  };

  const exportPDF = () => {
    const sections: PDFSection[] = [];
    if (drawingAnalysis) {
      let daText = `Drawing Type: ${drawingAnalysis.drawingType}\nBuilding Type: ${drawingAnalysis.buildingType}\n`;
      if (drawingAnalysis.scale) daText += `Scale: ${drawingAnalysis.scale}\n`;
      if (drawingAnalysis.visibleElements?.length) daText += `Visible Elements: ${drawingAnalysis.visibleElements.join(', ')}\n`;
      if (drawingAnalysis.readableDimensions?.length) daText += `Dimensions: ${drawingAnalysis.readableDimensions.join('; ')}\n`;
      sections.push({ type: 'text', title: 'Drawing Analysis', content: daText });
    }
    if (data?.drawingSummary) {
      sections.push({ type: 'text', title: 'Drawing Summary', content: data.drawingSummary });
    }
    sections.push({
      type: 'table',
      title: 'Scope Items',
      headers: ['Div', 'Division', 'Trade', 'Description', 'Specification', 'Measurement', 'Status'],
      rows: items.map(item => [
        String(item.division ?? ''),
        String(item.divisionName ?? ''),
        String(item.trade ?? ''),
        String(item.description ?? ''),
        String(item.specification ?? ''),
        String(item.measurementBasis ?? ''),
        item.confirmed ? 'Confirmed' : 'Assumed'
      ]),
      summary: [
        { label: 'Total Items', value: String(items.length) },
        { label: 'Confirmed', value: String(items.filter(d => d.confirmed).length) },
        { label: 'Assumed', value: String(items.filter(d => !d.confirmed).length) }
      ]
    });
    if (gaps.length > 0) {
      sections.push({
        type: 'table',
        title: 'Information Gaps',
        headers: ['Priority', 'Description', 'Discipline', 'Action Required'],
        rows: gaps.map(g => [
          String(g.priority ?? ''),
          String(g.description ?? ''),
          String(g.discipline ?? ''),
          String(g.actionRequired ?? '')
        ])
      });
    }
    if (consultantQuestions.length > 0) {
      sections.push({
        type: 'table',
        title: 'Stakeholder Questions / RFIs',
        headers: ['Directed To', 'Question', 'Priority', 'Impact Area'],
        rows: consultantQuestions.map(q => [
          String(q.to ?? ''),
          String(q.question ?? ''),
          String(q.priority ?? ''),
          String(q.impactArea ?? '')
        ])
      });
    }
    generatePDF({
      title: 'Scope of Work Report',
      module: 'Scope of Work',
      sections
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardList size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 2 — Scope of Work</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>AI-generated scope organized by CSI MasterFormat divisions</p>
        </div>
      </div>

      {error && (
        <div style={{ background: C.errBg, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.err, fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <X size={14} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}

      {!data && !loading && (
        <div style={empty}>
          <ClipboardList size={40} color={C.tx3} style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 600, color: C.tx }}>No scope of work generated yet</p>
          <p style={{ fontSize: 13, color: C.tx3, marginBottom: 16 }}>Select drawings and generate a comprehensive scope of work</p>
          <button onClick={generate} style={btnP}>
            <Sparkles size={14} />
            <span style={{ marginLeft: 6 }}>Generate Scope of Work</span>
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is analyzing drawings and generating scope...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.tx3 }} />
              <input
                type="text"
                placeholder="Search scope items..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ ...inp, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)} style={sel}>
              <option value="all">All Divisions</option>
              {divisions.map(d => {
                const item = items.find(i => i.division === d);
                return <option key={d} value={d}>Div {d} — {item?.divisionName}</option>;
              })}
            </select>
            <button onClick={generate} style={btnS}>
              <RefreshCw size={14} />
              <span style={{ marginLeft: 4 }}>Regenerate</span>
            </button>
            <button onClick={exportPDF} style={{ ...btnS, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>📄 PDF</button>
            <button onClick={exportTXT} style={btnS}>
              <Download size={14} />
              <span style={{ marginLeft: 4 }}>Export TXT</span>
            </button>
          </div>

          {/* Drawing Analysis Card */}
          {drawingAnalysis && (
            <div style={{ ...card, border: '2px solid #2563eb', background: 'linear-gradient(135deg,#eff6ff,#f0f7ff)', marginBottom: 16 }}>
              <h3 style={{ ...secTitle, color: '#2563eb' }}>📐 Drawing Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <p style={{ margin: 0 }}><strong>Drawing Type:</strong> {drawingAnalysis.drawingType}</p>
                <p style={{ margin: 0 }}><strong>Building Type:</strong> {drawingAnalysis.buildingType}</p>
              </div>
              {drawingAnalysis.visibleElements?.length > 0 && (
                <div style={{ marginTop: '8px' }}><strong>Visible Elements:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {drawingAnalysis.visibleElements.map((e: string, i: number) => (
                      <span key={i} style={badge('#1e40af', '#dbeafe')}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
              {drawingAnalysis.readableDimensions?.length > 0 && (
                <div style={{ marginTop: '8px' }}><strong>Readable Dimensions:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {drawingAnalysis.readableDimensions.map((d: string, i: number) => <li key={i} style={{ fontSize: '13px' }}>{d}</li>)}
                  </ul>
                </div>
              )}
              {drawingAnalysis.specsOnDrawing?.length > 0 && (
                <div style={{ marginTop: '8px' }}><strong>Specifications on Drawing:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {drawingAnalysis.specsOnDrawing.map((s: string, i: number) => <li key={i} style={{ fontSize: '13px' }}>{s}</li>)}
                  </ul>
                </div>
              )}
              {drawingAnalysis.scale && <p style={{ marginTop: '4px', marginBottom: 0 }}><strong>Scale:</strong> {drawingAnalysis.scale}</p>}
            </div>
          )}

          {/* Drawing Summary */}
          {data.drawingSummary && (
            <div style={{ ...card, marginBottom: 16, padding: '12px 16px', background: C.infoBg, border: `1px solid ${C.primary}20` }}>
              <div style={{ fontSize: 13, color: C.tx2, lineHeight: 1.5 }}>
                <strong style={{ color: C.primary }}>📋 Drawing Summary:</strong> {data.drawingSummary}
              </div>
            </div>
          )}

          {/* Gaps Section (overview) */}
          {gaps.length > 0 && (
            <div style={{ ...card, border: '2px solid #f59e0b', background: '#fffbeb', marginBottom: 16 }}>
              <h3 style={{ ...secTitle, color: '#d97706' }}>⚠️ Gaps & Missing Information ({gaps.length})</h3>
              {gaps.map((g: any, i: number) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < gaps.length - 1 ? '1px solid #fde68a' : 'none', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ ...badge('#fff', g.priority === 'HIGH' ? '#ef4444' : g.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6'), flexShrink: 0, fontSize: '10px', minWidth: '55px', textAlign: 'center' as const }}>{g.priority}</span>
                  <span style={{ fontSize: '13px' }}>{g.description}{g.discipline ? ` (${g.discipline})` : ''}</span>
                </div>
              ))}
            </div>
          )}

          {/* Consultant Questions Section (overview) */}
          {consultantQuestions.length > 0 && (
            <div style={{ ...card, border: '2px solid #7c3aed', background: '#f5f3ff', marginBottom: 16 }}>
              <h3 style={{ ...secTitle, color: '#7c3aed' }}>💬 Stakeholder Questions ({consultantQuestions.length})</h3>
              {['Architect', 'Structural Engineer', 'MEP Consultant', 'QS/Cost Consultant'].map(role => {
                const qs = consultantQuestions.filter((q: any) => q.to === role);
                return qs.length > 0 ? (
                  <div key={role} style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontWeight: 600, color: '#4c1d95', margin: '8px 0 4px', fontSize: '14px' }}>{role}</h4>
                    {qs.map((q: any, i: number) => (
                      <div key={i} style={{ padding: '6px 8px', borderBottom: '1px solid #e9e5f5', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ ...badge('#fff', q.priority === 'HIGH' ? '#ef4444' : '#f59e0b'), fontSize: '10px', flexShrink: 0 }}>{q.priority}</span>
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
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{divisions.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Divisions</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.purple }}>{items.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Scope Items</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.ok }}>{items.filter(d => d.confirmed).length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Confirmed</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{gaps.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Gaps Found</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{consultantQuestions.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>RFIs Needed</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `2px solid ${C.bdr}`, paddingBottom: 0 }}>
            {[
              { key: 'scope' as const, label: `📋 Scope Items (${items.length})` },
              { key: 'gaps' as const, label: `⚠️ Gaps (${gaps.length})` },
              { key: 'questions' as const, label: `💬 RFIs (${consultantQuestions.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? C.primary : C.tx3, background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${C.primary}` : '2px solid transparent',
                cursor: 'pointer', marginBottom: -2
              }}>{tab.label}</button>
            ))}
          </div>

          {/* Scope Items Tab */}
          {activeTab === 'scope' && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={th}>Div</th>
                      <th style={th}>Trade</th>
                      <th style={{ ...th, minWidth: 280 }}>Description</th>
                      <th style={{ ...th, minWidth: 160 }}>Specification</th>
                      <th style={{ ...th, minWidth: 140 }}>Measurement</th>
                      <th style={th}>Status</th>
                      <th style={th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={i} style={{ background: item.confirmed === false ? '#fef9c3' : 'transparent' }}>
                        <td style={td}>
                          <span style={badge(C.primary, C.infoBg)}>{item.division}</span>
                          <div style={{ fontSize: 10, color: C.tx3, marginTop: 2 }}>{item.divisionName}</div>
                        </td>
                        <td style={{ ...td, fontWeight: 600, fontSize: 12 }}>{item.trade}</td>
                        <td style={{ ...td, fontSize: 13, lineHeight: 1.5 }}>{item.description}</td>
                        <td style={{ ...td, fontSize: 12, color: C.tx2 }}>{item.specification || '—'}</td>
                        <td style={{ ...td, fontSize: 12, color: C.tx3, fontStyle: 'italic' }}>{item.measurementBasis || '—'}</td>
                        <td style={td}>
                          <span style={badge(item.confirmed ? '#16a34a' : '#f59e0b', item.confirmed ? '#dcfce7' : '#fef3c7')}>
                            {item.confirmed ? '✓ Confirmed' : '⚠ Assumed'}
                          </span>
                        </td>
                        <td style={{ ...td, fontSize: 12, color: C.tx3 }}>{item.assumptionBasis || item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: C.tx3 }}>
                Showing {filtered.length} of {items.length} items • {items.filter(d => d.confirmed).length} confirmed, {items.filter(d => !d.confirmed).length} assumed
              </div>
            </>
          )}

          {/* Gaps Tab */}
          {activeTab === 'gaps' && (
            <div>
              {gaps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.tx3 }}>No gaps identified</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['HIGH', 'MEDIUM', 'LOW'].map(priority => {
                    const pGaps = gaps.filter(g => g.priority === priority);
                    if (pGaps.length === 0) return null;
                    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                      HIGH: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '🔴' },
                      MEDIUM: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', icon: '🟠' },
                      LOW: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '🟢' },
                    };
                    const c = colors[priority] || colors.MEDIUM;
                    return (
                      <div key={priority}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: '8px 0' }}>{c.icon} {priority} Priority ({pGaps.length})</h4>
                        {pGaps.map((gap, i) => (
                          <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>{gap.description}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              {gap.discipline && <><strong>Discipline:</strong> {gap.discipline}</>}
                              {gap.discipline && gap.actionRequired && <> &nbsp;|&nbsp; </>}
                              {gap.actionRequired && <><strong>Action:</strong> {gap.actionRequired}</>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Consultant Questions Tab */}
          {activeTab === 'questions' && (
            <div>
              {consultantQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.tx3 }}>No stakeholder questions generated</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Architect', 'Structural Engineer', 'MEP Consultant', 'QS/Cost Consultant'].map(role => {
                    const qs = consultantQuestions.filter(q => q.to === role);
                    if (qs.length === 0) return null;
                    return (
                      <div key={role}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#4c1d95', margin: '8px 0' }}>{role} ({qs.length})</h4>
                        {qs.map((q, i) => (
                          <div key={i} style={{ ...card, padding: '14px 16px', borderLeft: `4px solid ${q.priority === 'HIGH' ? '#ef4444' : q.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6'}`, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                              <span style={badge('#fff', q.priority === 'HIGH' ? '#ef4444' : q.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6')}>{q.priority}</span>
                              <span style={{ fontSize: 11, color: C.tx3 }}>RFI</span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4, lineHeight: 1.5 }}>{q.question}</div>
                            {q.impactArea && <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Impact: {q.impactArea}</div>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
