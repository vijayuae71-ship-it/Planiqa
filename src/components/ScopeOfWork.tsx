import React, { useState } from 'react';
import { ClipboardList, Sparkles, Download, Search, Filter, RefreshCw, X } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, inp, sel, tbl, th, td, badge, secTitle, empty, uid, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadTXT } from '../utils/export';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface ScopeItem {
  division: string;
  divisionName: string;
  trade: string;
  description: string;
  specification: string;
  measurementBasis: string;
  notes: string;
  confirmed: boolean;
}

interface ScopeGap {
  priority: string;
  description: string;
  discipline: string;
  actionRequired: string;
}

interface ScopeClarification {
  question: string;
  directedTo: string;
  reason: string;
}

interface ScopeResult {
  items: ScopeItem[];
  gaps: ScopeGap[];
  clarifications: ScopeClarification[];
  drawingSummary: string;
}

export const ScopeOfWork: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ScopeItem[]>([]);
  const [gaps, setGaps] = useState<ScopeGap[]>([]);
  const [clarifications, setClarifications] = useState<ScopeClarification[]>([]);
  const [drawingSummary, setDrawingSummary] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'scope' | 'gaps' | 'clarifications'>('scope');

  const generate = async () => {
    // API key handled by serverless function
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the header first'); return; }
    setLoading(true);
    setError('');
    try {
      const systemPrompt = `You are a senior construction scope of work specialist and pre-contract QS at a Tier-1 EPC contractor. You prepare scope documents that are submitted to clients like L&T Construction, Sobha Realty, Danube Properties, and Nagarjuna Construction. Your scope documents MUST be accurate, comprehensive, and suitable for tender/contract inclusion.

SCOPE DEVELOPMENT METHODOLOGY:
1. First IDENTIFY the drawing type and discipline (Architectural/Structural/MEP/Civil)
2. INVENTORY every element visible in the drawing with labels, dimensions, specifications
3. MAP each element to CSI MasterFormat 2020 divisions (01-35)
4. For each scope item, define: WHAT is to be done, WHERE, HOW (specification/standard), and MEASUREMENT BASIS
5. SEPARATE confirmed items (visible in drawing) from assumed items (standard practice)
6. IDENTIFY gaps — what's missing from the drawings that is needed for a complete scope
7. GENERATE clarification questions for the design team

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

Return JSON object format:
{"drawingSummary":"Brief description of what the drawing shows and its scope implications","items":[{"division":"03","divisionName":"Concrete","trade":"Concrete Contractor","description":"Supply, place, finish and cure Grade C30/37 (M30) ready-mix concrete to isolated pad foundations F1-F6 as per structural layout. Includes formwork, curing compound, and concrete testing per IS 456:2000 / ACI 318-19.","specification":"IS 456:2000 Cl.8 / ACI 318-19. Mix design to be approved. Minimum cement content 320 kg/m³.","measurementBasis":"Measured in m³ as placed per IS 1200 Part 2. Formwork measured separately in m².","notes":"Foundation sizes from structural drawing. Concrete grade assumed M30 — verify with structural consultant.","confirmed":true}],"gaps":[{"priority":"Critical","description":"No structural drawing provided — foundation sizes, beam depths, and reinforcement details cannot be confirmed","discipline":"Structural","actionRequired":"Request structural GA and foundation layout from structural consultant before finalizing scope"},{"priority":"High","description":"Door and window schedule not provided — sizes estimated from plan dimensions","discipline":"Architectural","actionRequired":"Request door/window schedule from architect with hardware specifications"}],"clarifications":[{"question":"What is the specified concrete grade for foundations and superstructure? Drawing shows M30 notation but structural specification is needed for mix design approval.","directedTo":"Structural Engineer","reason":"Required for concrete procurement and mix design submission"},{"question":"Are the partition walls in the lobby area load-bearing or non-load-bearing? This affects the construction sequence and structural temporary works.","directedTo":"Architect / Structural Engineer","reason":"Impacts scope of temporary propping and construction methodology"}]}`;
      const userMsg = 'Analyze these construction drawings and generate a comprehensive, contract-grade scope of work. This will be reviewed by project directors at major construction firms. For each item: specify the work clearly enough for subcontractor pricing, reference applicable standards, and state measurement basis. Identify ALL gaps in the drawings that prevent complete scoping, prioritized as Critical/High/Medium/Low. Generate specific clarification questions for the architect, structural engineer, MEP consultant, and QS.';
      const result = await callClaude(apiKey, systemPrompt, userMsg, selected);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      if (Array.isArray(parsed)) {
        setData(parsed);
        setGaps([]);
        setClarifications([]);
        setDrawingSummary('');
      } else {
        setData(parsed.items || []);
        setGaps(parsed.gaps || []);
        setClarifications(parsed.clarifications || []);
        setDrawingSummary(parsed.drawingSummary || '');
      }
      onStatusChange('complete');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const divisions = [...new Set(data.map(d => d.division))].sort();

  const filtered = data.filter(item => {
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
    text += `Total Divisions: ${divisions.length} | Total Items: ${data.length}\n`;
    text += `Confirmed Items: ${data.filter(d => d.confirmed).length} | Assumptions: ${data.filter(d => !d.confirmed).length}\n`;
    if (drawingSummary) text += `\nDrawing Summary: ${drawingSummary}\n`;
    text += '\n' + '─'.repeat(60) + '\n';
    text += 'SECTION 1: SCOPE ITEMS BY CSI DIVISION\n';
    text += '─'.repeat(60) + '\n';
    const grouped: Record<string, ScopeItem[]> = {};
    data.forEach(item => {
      const key = `Division ${item.division} — ${item.divisionName}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([div, items]) => {
      text += `\n${div}\n${'─'.repeat(40)}\n`;
      items.forEach((item, i) => {
        text += `\n  ${i + 1}. [${item.confirmed ? 'CONFIRMED' : 'ASSUMED'}] Trade: ${item.trade}\n`;
        text += `     Description: ${item.description}\n`;
        if (item.specification) text += `     Specification: ${item.specification}\n`;
        if (item.measurementBasis) text += `     Measurement: ${item.measurementBasis}\n`;
        if (item.notes) text += `     Notes: ${item.notes}\n`;
      });
    });
    if (gaps.length > 0) {
      text += '\n\n' + '─'.repeat(60) + '\n';
      text += 'SECTION 2: INFORMATION GAPS (PRIORITY ORDER)\n';
      text += '─'.repeat(60) + '\n\n';
      const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
      priorityOrder.forEach(p => {
        const pGaps = gaps.filter(g => g.priority === p);
        if (pGaps.length > 0) {
          text += `  [${p.toUpperCase()}]\n`;
          pGaps.forEach((g, i) => {
            text += `  ${i + 1}. ${g.description}\n`;
            text += `     Discipline: ${g.discipline}\n`;
            text += `     Action: ${g.actionRequired}\n\n`;
          });
        }
      });
    }
    if (clarifications.length > 0) {
      text += '\n' + '─'.repeat(60) + '\n';
      text += 'SECTION 3: CLARIFICATIONS REQUIRED\n';
      text += '─'.repeat(60) + '\n\n';
      clarifications.forEach((c, i) => {
        text += `  ${i + 1}. TO: ${c.directedTo}\n`;
        text += `     Q: ${c.question}\n`;
        text += `     Reason: ${c.reason}\n\n`;
      });
    }
    text += '\n' + '═'.repeat(60) + '\n';
    text += 'END OF SCOPE OF WORK REPORT\n';
    text += '═'.repeat(60) + '\n';
    downloadTXT(text, 'scope-of-work.txt');
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

      {data.length === 0 && !loading && (
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

      {data.length > 0 && !loading && (
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
                const item = data.find(i => i.division === d);
                return <option key={d} value={d}>Div {d} — {item?.divisionName}</option>;
              })}
            </select>
            <button onClick={generate} style={btnS}>
              <RefreshCw size={14} />
              <span style={{ marginLeft: 4 }}>Regenerate</span>
            </button>
            <button onClick={exportTXT} style={btnS}>
              <Download size={14} />
              <span style={{ marginLeft: 4 }}>Export TXT</span>
            </button>
          </div>

          {/* Drawing Summary */}
          {drawingSummary && (
            <div style={{ ...card, marginBottom: 16, padding: '12px 16px', background: C.infoBg, border: `1px solid ${C.primary}20` }}>
              <div style={{ fontSize: 13, color: C.tx2, lineHeight: 1.5 }}>
                <strong style={{ color: C.primary }}>📋 Drawing Summary:</strong> {drawingSummary}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{divisions.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Divisions</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.purple }}>{data.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Scope Items</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.ok }}>{data.filter(d => d.confirmed).length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Confirmed</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{gaps.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Gaps Found</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 100, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{clarifications.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>RFIs Needed</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `2px solid ${C.bdr}`, paddingBottom: 0 }}>
            {[
              { key: 'scope' as const, label: `📋 Scope Items (${data.length})` },
              { key: 'gaps' as const, label: `⚠️ Gaps (${gaps.length})` },
              { key: 'clarifications' as const, label: `❓ Clarifications (${clarifications.length})` },
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
                      <tr key={i} style={{ background: item.confirmed ? 'transparent' : '#fffbeb' }}>
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
                        <td style={{ ...td, fontSize: 12, color: C.tx3 }}>{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: C.tx3 }}>
                Showing {filtered.length} of {data.length} items • {data.filter(d => d.confirmed).length} confirmed, {data.filter(d => !d.confirmed).length} assumed
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
                  {['Critical', 'High', 'Medium', 'Low'].map(priority => {
                    const pGaps = gaps.filter(g => g.priority === priority);
                    if (pGaps.length === 0) return null;
                    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                      Critical: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '🔴' },
                      High: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', icon: '🟠' },
                      Medium: { bg: '#fefce8', border: '#fef08a', text: '#ca8a04', icon: '🟡' },
                      Low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '🟢' },
                    };
                    const c = colors[priority] || colors.Medium;
                    return (
                      <div key={priority}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: '8px 0' }}>{c.icon} {priority} Priority ({pGaps.length})</h4>
                        {pGaps.map((gap, i) => (
                          <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>{gap.description}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              <strong>Discipline:</strong> {gap.discipline} &nbsp;|&nbsp; <strong>Action:</strong> {gap.actionRequired}
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

          {/* Clarifications Tab */}
          {activeTab === 'clarifications' && (
            <div>
              {clarifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.tx3 }}>No clarifications needed</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {clarifications.map((c, i) => (
                    <div key={i} style={{ ...card, padding: '14px 16px', borderLeft: `4px solid ${C.primary}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                        <span style={badge(C.primary, C.infoBg)}>→ {c.directedTo}</span>
                        <span style={{ fontSize: 11, color: C.tx3 }}>RFI #{i + 1}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4, lineHeight: 1.5 }}>{c.question}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Reason: {c.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
