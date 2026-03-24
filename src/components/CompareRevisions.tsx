import React, { useState, useMemo } from 'react';
import { GitCompare, Play, Download, AlertCircle, Layers } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnSm, sel, tbl, th, td, badge, secTitle, empty, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadTXT } from '../utils/export';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface Change {
  area: string;
  type: string;
  description: string;
  trade: string;
  impact: string;
  actionRequired: string;
  costImplication: string;
}

interface TradeImpact {
  trade: string;
  changes: number;
  severity: string;
  costImpact: string;
}

interface ChangeOrder {
  estimated: number;
  confidence: string;
  notes: string;
}

interface CompareData {
  changes: Change[];
  tradeImpact: TradeImpact[];
  changeOrderMagnitude: ChangeOrder;
  rfisRequired: { question: string; directedTo: string; priority: string }[];
  assumptions: string[];
  scheduleImpact: string;
}

const SYSTEM_PROMPT = `You are a senior construction document controller and claims specialist (20+ years, FIDIC/NEC certified) performing revision comparison for Tier-1 contractors. Your report will be used for change order management, cost impact assessment, and dispute resolution.

ANALYSIS METHODOLOGY:
1. Systematically scan EVERY element in both revisions: structural grid, dimensions, room layouts, openings, annotations, notes, specifications
2. Compare element-by-element: foundations, columns, beams, slabs, walls, openings, MEP routes, finishes
3. For each change: describe EXACTLY what changed (old value → new value) with measurements
4. Classify impact: structural changes get "High", cost/schedule get "Medium", cosmetic get "Low"

CHANGE TYPES:
- Added: New element not present in Revision A
- Modified: Element exists in both but has changed (dimension, position, specification, detail)
- Deleted: Element from Revision A removed in Revision B

FOR EACH CHANGE, SPECIFY:
- Exact area/location (grid reference if visible)
- What changed (old → new) with specific dimensions/values
- Which trade is affected
- Impact level with reasoning
- Action required (redesign, re-price, procure, no action, seek clarification)
- Cost implication (increase/decrease/neutral with estimate)

GENERATE 15-40+ CHANGES for a typical revision. Be thorough. Check:
- Column grid changes, column sizes, positions
- Beam depths, spans, support conditions
- Slab thickness, opening changes
- Wall additions/removals, partition changes
- Door/window schedule changes
- Dimension changes, level changes
- Material specification changes
- Any notes or annotation changes

RFIs: List 5-15 questions that need answers from the design team to properly assess changes.

Return JSON:
{"changes":[{"area":"Grid B-3, Foundation F3","type":"Modified","description":"Pad footing size increased from 2.0×2.0×0.5m to 2.5×2.5×0.6m deep — additional concrete 2.25m³, additional excavation 1.75m³","trade":"Structural","impact":"High","actionRequired":"Re-price substructure package, verify soil bearing capacity adequacy for increased load","costImplication":"Increase ~₹45,000 (concrete + excavation + rebar)"}],"tradeImpact":[{"trade":"Structural","changes":5,"severity":"High","costImpact":"Increase ~12-15% on substructure package"}],"changeOrderMagnitude":{"estimated":250000,"confidence":"Medium","notes":"Based on visible structural changes. MEP impact not quantifiable without services drawings."},"rfisRequired":[{"question":"Please confirm revised foundation loading schedule for modified pad footings at Grid B-3 and C-4","directedTo":"Structural Engineer","priority":"Critical"}],"assumptions":["Existing soil conditions remain unchanged","MEP routing not significantly affected by structural changes"],"scheduleImpact":"Estimated 2-3 weeks additional time for revised foundation work. Critical path may be affected if substructure is on-going."}`;


export const CompareRevisions: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<CompareData | null>(null);
  const [revA, setRevA] = useState('');
  const [revB, setRevB] = useState('');

  const allDrawings = drawings;

  const compare = async () => {
    if (!apiKey) { setError('Configure API key in Settings first'); return; }
    if (!revA || !revB) { setError('Select both Revision A and Revision B'); return; }
    if (revA === revB) { setError('Please select two different drawings to compare'); return; }

    const drawingA = allDrawings.find(d => d.id === revA);
    const drawingB = allDrawings.find(d => d.id === revB);
    if (!drawingA || !drawingB) { setError('Selected drawings not found'); return; }

    setLoading(true); setError('');
    try {
      const userMsg = `Compare these two drawing revisions and identify all changes between them. Revision A: "${drawingA.name}" and Revision B: "${drawingB.name}". Analyze carefully and list every difference.`;
      const result = await callClaude(apiKey, SYSTEM_PROMPT, userMsg, [drawingA, drawingB]);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      setData({
        changes: (parsed.changes || []).map((c: any) => ({
          ...c,
          actionRequired: c.actionRequired || '',
          costImplication: c.costImplication || '',
        })),
        tradeImpact: parsed.tradeImpact || [],
        changeOrderMagnitude: parsed.changeOrderMagnitude || { estimated: 0, confidence: 'Low', notes: '' },
        rfisRequired: parsed.rfisRequired || [],
        assumptions: parsed.assumptions || [],
        scheduleImpact: parsed.scheduleImpact || '',
      });
      onStatusChange('complete');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const changeSummary = useMemo(() => {
    if (!data) return { added: 0, modified: 0, deleted: 0 };
    return {
      added: data.changes.filter(c => c.type === 'Added').length,
      modified: data.changes.filter(c => c.type === 'Modified').length,
      deleted: data.changes.filter(c => c.type === 'Deleted').length,
    };
  }, [data]);

  const typeColor = (type: string) => {
    if (type === 'Added') return { c: C.ok, bg: C.okBg };
    if (type === 'Deleted') return { c: C.err, bg: C.errBg };
    return { c: C.warn, bg: C.warnBg };
  };

  const impactColor = (impact: string) => {
    if (impact === 'High') return { c: C.err, bg: C.errBg };
    if (impact === 'Medium') return { c: C.warn, bg: C.warnBg };
    return { c: C.ok, bg: C.okBg };
  };

  const severityColor = (sev: string) => impactColor(sev);

  const exportTXT = () => {
    if (!data) return;
    let txt = 'DRAWING REVISION COMPARISON REPORT\n';
    txt += '='.repeat(50) + '\n\n';
    const dA = allDrawings.find(d => d.id === revA);
    const dB = allDrawings.find(d => d.id === revB);
    txt += `Revision A: ${dA?.name || revA}\n`;
    txt += `Revision B: ${dB?.name || revB}\n\n`;
    txt += `Summary: ${changeSummary.added} Added, ${changeSummary.modified} Modified, ${changeSummary.deleted} Deleted\n\n`;
    txt += 'CHANGES\n' + '-'.repeat(40) + '\n';
    data.changes.forEach((c, i) => {
      txt += `\n${i + 1}. [${c.type}] ${c.area}\n`;
      txt += `   Trade: ${c.trade} | Impact: ${c.impact}\n`;
      txt += `   ${c.description}\n`;
    });
    txt += '\n\nTRADE IMPACT ANALYSIS\n' + '-'.repeat(40) + '\n';
    data.tradeImpact.forEach(t => {
      txt += `${t.trade}: ${t.changes} changes, Severity: ${t.severity}, Cost: ${t.costImpact}\n`;
    });
    if (data.changeOrderMagnitude) {
      txt += '\n\nCHANGE ORDER MAGNITUDE\n' + '-'.repeat(40) + '\n';
      txt += `Estimated: $${fmt(data.changeOrderMagnitude.estimated)}\n`;
      txt += `Confidence: ${data.changeOrderMagnitude.confidence}\n`;
      txt += `Notes: ${data.changeOrderMagnitude.notes}\n`;
    }
    downloadTXT(txt, 'revision-comparison');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GitCompare size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 7: Compare Revisions</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>AI-powered drawing revision comparison</p>
        </div>
      </div>

      {/* Selectors */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>Revision A</label>
            <select style={sel} value={revA} onChange={e => setRevA(e.target.value)}>
              <option value="">Select drawing...</option>
              {allDrawings.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 4, color: C.tx3, fontWeight: 700, fontSize: 18 }}>↔</div>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>Revision B</label>
            <select style={sel} value={revB} onChange={e => setRevB(e.target.value)}>
              <option value="">Select drawing...</option>
              {allDrawings.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button style={btnP} onClick={compare} disabled={loading}>
            <Play size={15} /> Compare Revisions
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is comparing drawing revisions...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: C.errBg, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.err, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {data && !loading && (
        <>
          {/* Change Detection Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Added', count: changeSummary.added, color: C.ok, bg: C.okBg, icon: '+' },
              { label: 'Modified', count: changeSummary.modified, color: C.warn, bg: C.warnBg, icon: '~' },
              { label: 'Deleted', count: changeSummary.deleted, color: C.err, bg: C.errBg, icon: '−' },
              { label: 'Total Changes', count: data.changes.length, color: C.primary, bg: C.infoBg, icon: '∑' },
            ].map((s, i) => (
              <div key={i} style={{ ...card, borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 12, color: C.tx3 }}>{s.icon} {s.label}</div>
              </div>
            ))}
          </div>

          {/* Changes Table */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={secTitle}><AlertCircle size={16} style={{ marginRight: 6 }} />Detected Changes</h3>
              <button style={btnSm} onClick={exportTXT}><Download size={14} /> Export TXT</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Area</th>
                    <th style={th}>Type</th>
                    <th style={{ ...th, minWidth: 220 }}>Description</th>
                    <th style={th}>Trade</th>
                    <th style={th}>Impact</th>
                    <th style={{ ...th, minWidth: 140 }}>Action Required</th>
                    <th style={{ ...th, minWidth: 120 }}>Cost Implication</th>
                  </tr>
                </thead>
                <tbody>
                  {data.changes.map((c, i) => {
                    const tc = typeColor(c.type);
                    const ic = impactColor(c.impact);
                    return (
                      <tr key={i}>
                        <td style={{ ...td, color: C.tx3, fontSize: 12 }}>{i + 1}</td>
                        <td style={{ ...td, fontWeight: 500, fontSize: 12 }}>{c.area}</td>
                        <td style={td}><span style={badge(tc.c, tc.bg)}>{c.type}</span></td>
                        <td style={{ ...td, fontSize: 12, maxWidth: 280 }}>{c.description}</td>
                        <td style={td}>{c.trade}</td>
                        <td style={td}><span style={badge(ic.c, ic.bg)}>{c.impact}</span></td>
                        <td style={{ ...td, fontSize: 12, color: C.tx2 }}>{c.actionRequired || '—'}</td>
                        <td style={{ ...td, fontSize: 12, fontWeight: 500, color: c.costImplication?.includes('Increase') ? C.err : c.costImplication?.includes('Decrease') ? C.ok : C.tx2 }}>{c.costImplication || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade Impact Analysis */}
          {data.tradeImpact && data.tradeImpact.length > 0 && (
            <div style={{ ...card, marginBottom: 24 }}>
              <h3 style={secTitle}><Layers size={16} style={{ marginRight: 6 }} />Trade Impact Analysis</h3>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Trade</th>
                    <th style={th}># Changes</th>
                    <th style={th}>Severity</th>
                    <th style={th}>Cost Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tradeImpact.map((t, i) => {
                    const sc = severityColor(t.severity);
                    return (
                      <tr key={i}>
                        <td style={{ ...td, fontWeight: 600 }}>{t.trade}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{t.changes}</td>
                        <td style={td}><span style={badge(sc.c, sc.bg)}>{t.severity}</span></td>
                        <td style={{ ...td, fontWeight: 500 }}>{t.costImpact}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Change Order Magnitude */}
          {data.changeOrderMagnitude && (
            <div style={{ ...card, borderLeft: `4px solid ${C.purple}` }}>
              <h3 style={secTitle}>💰 Change Order Magnitude</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>Estimated Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>${fmt(data.changeOrderMagnitude.estimated)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>Confidence Level</div>
                  <div>
                    <span style={badge(
                      data.changeOrderMagnitude.confidence === 'High' ? C.ok : data.changeOrderMagnitude.confidence === 'Medium' ? C.warn : C.err,
                      data.changeOrderMagnitude.confidence === 'High' ? C.okBg : data.changeOrderMagnitude.confidence === 'Medium' ? C.warnBg : C.errBg
                    )}>{data.changeOrderMagnitude.confidence}</span>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: C.tx3, marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 14, color: C.tx }}>{data.changeOrderMagnitude.notes}</div>
                </div>
              </div>
            </div>
          )}
          {/* Schedule Impact */}
          {data.scheduleImpact && (
            <div style={{ ...card, marginBottom: 24, borderLeft: `4px solid ${C.warn}` }}>
              <h3 style={secTitle}>⏱️ Schedule Impact Assessment</h3>
              <p style={{ fontSize: 14, color: C.tx, lineHeight: 1.8, margin: 0 }}>{data.scheduleImpact}</p>
            </div>
          )}

          {/* RFIs Required */}
          {data.rfisRequired && data.rfisRequired.length > 0 && (
            <div style={{ ...card, marginBottom: 24, borderLeft: `4px solid ${C.primary}` }}>
              <h3 style={secTitle}>❓ RFIs Required ({data.rfisRequired.length})</h3>
              <div style={{ background: '#fef3c7', border: '1px solid #fbbf2433', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
                ⚠️ These RFIs must be raised immediately to avoid delays in change order processing.
              </div>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Priority</th>
                    <th style={th}>Directed To</th>
                    <th style={{ ...th, minWidth: 280 }}>Question</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rfisRequired.map((r: any, i: number) => {
                    const pColor = r.priority === 'Critical' ? C.err : r.priority === 'High' ? '#ea580c' : C.warn;
                    const pBg = r.priority === 'Critical' ? C.errBg : r.priority === 'High' ? '#fff7ed' : C.warnBg;
                    return (
                      <tr key={i}>
                        <td style={{ ...td, color: C.tx3 }}>{i + 1}</td>
                        <td style={td}><span style={badge(pColor, pBg)}>{r.priority}</span></td>
                        <td style={{ ...td, fontWeight: 600, fontSize: 12 }}>{r.directedTo}</td>
                        <td style={{ ...td, fontSize: 13 }}>{r.question}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Assumptions */}
          {data.assumptions && data.assumptions.length > 0 && (
            <div style={{ ...card, marginBottom: 24, borderLeft: `4px solid ${C.warn}` }}>
              <h3 style={secTitle}>⚠️ Assumptions</h3>
              {data.assumptions.map((a: string, i: number) => (
                <div key={i} style={{ fontSize: 13, color: C.tx2, lineHeight: 1.8, paddingLeft: 8 }}>
                  {i + 1}. {a}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!data && !loading && !error && (
        <div style={empty}>
          <GitCompare size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>Select two drawing revisions to compare</p>
        </div>
      )}
    </div>
  );
};

export default CompareRevisions;
