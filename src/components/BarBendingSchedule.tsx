import React, { useState, useMemo } from 'react';
import { Construction, Sparkles, Download, Plus, RefreshCw, X, Edit3, Check, Trash2, Info } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, btnD, inp, sel, tbl, th, td, badge, secTitle, empty, uid, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadCSV } from '../utils/export';
import { generatePDF, PDFSection } from '../utils/pdf';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface BBSItem {
  id: string;
  member: string;
  barMark: string;
  type: string;
  diameter: number;
  shapeCode: string;
  a: number;
  b: number;
  c: number;
  r: number;
  length: number;
  quantity: number;
  lengthBasis: string;
  confirmed: boolean;
}

const STANDARDS = [
  { value: 'IS 2502', label: 'IS 2502 (Indian Standard)' },
  { value: 'BS 8666', label: 'BS 8666 (British Standard)' },
  { value: 'ACI 315', label: 'ACI 315 (American Standard)' },
];

const SHAPE_CODES: Record<string, string> = {
  '00': 'Straight bar',
  '11': 'Bent bar (single bend)',
  '21': 'U-shape (180° bend)',
  '31': 'L-shape (90° bend)',
  '41': 'Z-shape (cranked)',
  '51': 'Hook both ends',
};

const calcTotalLength = (length: number, quantity: number) => length * quantity;
const calcWeight = (totalLength: number, diameter: number) => (totalLength * (diameter * diameter * 0.00617)) / 1000;

export const BarBendingSchedule: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<BBSItem[]>([]);
  const [standard, setStandard] = useState('IS 2502');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<BBSItem>>({});
  const [showShapeCodes, setShowShapeCodes] = useState(false);

  const generate = async () => {
    if (!apiKey) { setError('Configure API key in Settings first'); return; }
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the header first'); return; }
    setLoading(true);
    setError('');
    try {
      const systemPrompt = `You are a senior structural engineer / rebar detailer (20+ years experience, ISE/IStructE level) preparing a bar bending schedule for Tier-1 contractors per ${standard}.

DRAWING ANALYSIS:
First, carefully identify every structural member visible:
- Foundations: Isolated, combined, strip, raft — note sizes, depths
- Columns: Note grid references, sizes, heights
- Beams: Note span, depth, width, support conditions
- Slabs: Note type (one-way/two-way), span, thickness
- Walls: Retaining, shear, boundary — note thickness, height
- Stairs: Note waist thickness, riser/tread dimensions
- Any reinforcement details, sections, or schedules shown

REINFORCEMENT STANDARDS:
- IS 2502:2017 / SP 34:1987 — for Indian projects (shape codes per SP 34 Table 1)
- BS 8666:2020 — for UK/International (shape codes per Table 2)
- ACI 315-18 — for US/International
- Development lengths per IS 456:2000 Table 26 / ACI 318 Table 25.4
- Lap lengths: 40d (tension), 24d (compression) per IS 456:2000 Cl. 26.2.5
- Minimum bend radius: 4d for ≤20mm, 5d for >20mm per IS 2502

LENGTH CALCULATION RULES (CRITICAL):
- Cutting length = Actual member dimension + development lengths - concrete cover on both sides + hook/bend allowances
- Hook allowance (standard 90° hook): 9d per IS 2502
- Bend deduction: For 90° bend deduct 2d, for 135° deduct 3d
- Stirrup length = 2(B-2c+D-2c) + 2×hook allowance (10d or 75mm min)
- Show calculation basis for EVERY bar: e.g., "3000mm span + 2×40d dev length (2×640) - 2×40mm cover = 4160mm"
- Cover: 40mm for foundations, 30mm for columns/beams, 25mm for slabs (IS 456 Table 16)

QUANTITY ESTIMATION:
- For identified members without detailed rebar information:
  • Footings: 0.7-1.0% steel ratio, both ways, min 12mm @150mm c/c
  • Columns: 1-4% of gross area, min 4-12mm bars, ties @150mm or 300mm
  • Beams: Ast from 0.5-1.5% bd, min 2-12mm top, 2-16mm bottom, stirrups 8mm@150/200mm
  • Slabs: 0.3-0.5% of bd, main bars + distribution bars, min 8mm@200mm
- Mark ALL estimated items with "(est.)" in member field

GENERATE 30-60+ BAR ENTRIES for a typical floor/structure. Include:
- Main bars (top + bottom) for every beam/slab
- Stirrups/links for every beam and column
- Extra top bars at supports
- Starter bars and dowels
- Lapping bars (separate entry for laps)
- Distribution steel for slabs

Return JSON array format:
[{"member":"Foundation F1","barMark":"A1","type":"Deformed","diameter":16,"shapeCode":"00","a":4160,"b":0,"c":0,"r":0,"length":4160,"quantity":12,"lengthBasis":"3000mm clear span + 2×40d dev (1280) - 2×40mm cover = 4160mm","confirmed":true}]`;
      const userMsg = `Generate a detailed, professional bar bending schedule per ${standard} from these construction drawings. This BBS will be used for rebar procurement by a Tier-1 contractor. For EVERY bar: show the cutting length calculation basis (span + development - cover + hooks), use correct shape codes, and mark confirmed vs estimated items. Generate at least 30 entries covering all identifiable structural members.`;
      const result = await callClaude(apiKey, systemPrompt, userMsg, selected);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      const newItems: BBSItem[] = (Array.isArray(parsed) ? parsed : (parsed.items || [])).map((item: any) => ({
        id: uid(),
        member: item.member || '',
        barMark: item.barMark || '',
        type: item.type || 'Deformed',
        diameter: Number(item.diameter) || 12,
        shapeCode: item.shapeCode || '00',
        a: Number(item.a) || 0,
        b: Number(item.b) || 0,
        c: Number(item.c) || 0,
        r: Number(item.r) || 0,
        length: Number(item.length) || 0,
        quantity: Number(item.quantity) || 0,
        lengthBasis: item.lengthBasis || '',
        confirmed: item.confirmed !== false,
      }));
      setItems(newItems);
      onStatusChange('complete');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addManualEntry = () => {
    const newItem: BBSItem = {
      id: uid(),
      member: 'New Member',
      barMark: `M${items.length + 1}`,
      type: 'Deformed',
      diameter: 12,
      shapeCode: '00',
      a: 1000,
      b: 0,
      c: 0,
      r: 0,
      length: 1000,
      quantity: 1,
      lengthBasis: '',
      confirmed: true,
    };
    setItems([...items, newItem]);
    setEditingId(newItem.id);
    setEditValues(newItem);
    if (items.length === 0) onStatusChange('in-progress');
  };

  const startEdit = (item: BBSItem) => {
    setEditingId(item.id);
    setEditValues({ ...item });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setItems(items.map(item =>
      item.id === editingId ? { ...item, ...editValues } as BBSItem : item
    ));
    setEditingId(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => {
      const tl = calcTotalLength(item.length, item.quantity);
      return sum + calcWeight(tl, item.diameter);
    }, 0);
  }, [items]);

  const weightByDiameter = useMemo(() => {
    const map: Record<number, number> = {};
    items.forEach(item => {
      const tl = calcTotalLength(item.length, item.quantity);
      const w = calcWeight(tl, item.diameter);
      map[item.diameter] = (map[item.diameter] || 0) + w;
    });
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b));
  }, [items]);

  const exportPDF = () => {
    const sections: PDFSection[] = [];
    sections.push({
      type: 'keyvalue',
      title: 'Schedule Information',
      items: [
        { label: 'Standard', value: standard },
        { label: 'Total Entries', value: String(items.length) },
        { label: 'Total Weight (kg)', value: totalWeight.toFixed(2) },
        { label: 'Total Weight (tonnes)', value: (totalWeight / 1000).toFixed(3) }
      ]
    });
    sections.push({
      type: 'table',
      title: 'Bar Bending Schedule',
      headers: ['Member', 'Bar Mark', 'Type', 'Dia(mm)', 'Shape', 'Length(mm)', 'No. Bars', 'Total Len(mm)', 'Weight(kg)', 'Status'],
      rows: items.map(item => {
        const tl = calcTotalLength(item.length, item.quantity);
        const wt = calcWeight(tl, item.diameter);
        return [
          String(item.member ?? ''),
          String(item.barMark ?? ''),
          String(item.type ?? ''),
          String(item.diameter),
          String(item.shapeCode ?? ''),
          String(fmt(item.length)),
          String(item.quantity),
          String(fmt(tl)),
          wt.toFixed(2),
          item.confirmed ? 'Confirmed' : 'Estimated'
        ];
      }),
      summary: [
        { label: 'Total Entries', value: String(items.length) },
        { label: 'Total Weight', value: `${totalWeight.toFixed(2)} kg` }
      ]
    });
    if (weightByDiameter.length > 0) {
      sections.push({
        type: 'table',
        title: 'Weight Summary by Diameter',
        headers: ['Diameter (mm)', 'Entries', 'Total Bars', 'Weight (kg)', '% of Total'],
        rows: weightByDiameter.map(([dia, wt]) => {
          const diaItems = items.filter(i => i.diameter === Number(dia));
          const totalBars = diaItems.reduce((s, i) => s + i.quantity, 0);
          return [
            `Ø${dia}`,
            String(diaItems.length),
            String(totalBars),
            wt.toFixed(2),
            totalWeight > 0 ? `${((wt / totalWeight) * 100).toFixed(1)}%` : '0%'
          ];
        }),
        summary: [
          { label: 'Grand Total Weight', value: `${totalWeight.toFixed(2)} kg` }
        ]
      });
    }
    generatePDF({
      title: 'Bar Bending Schedule',
      module: 'Bar Bending Schedule',
      sections
    });
  };

  const exportCSV = () => {
    const rows = items.map(item => {
      const tl = calcTotalLength(item.length, item.quantity);
      return {
        Member: item.member,
        'Bar Mark': item.barMark,
        Type: item.type,
        'Dia (mm)': item.diameter,
        'Shape Code': item.shapeCode,
        'A (mm)': item.a,
        'B (mm)': item.b,
        'C (mm)': item.c,
        'R (mm)': item.r,
        'Length (mm)': item.length,
        'Length Basis': item.lengthBasis || '',
        'No. of Bars': item.quantity,
        'Total Length (mm)': tl,
        'Weight (kg)': calcWeight(tl, item.diameter).toFixed(2),
        Status: item.confirmed ? 'Confirmed' : 'Estimated',
      };
    });
    downloadCSV(rows, 'bar-bending-schedule.csv');
  };

  const editField = (field: keyof BBSItem, value: string) => {
    const numFields = ['diameter', 'a', 'b', 'c', 'r', 'length', 'quantity'];
    setEditValues(prev => ({
      ...prev,
      [field]: numFields.includes(field) ? (Number(value) || 0) : value
    }));
  };

  const cellInput = (field: keyof BBSItem, width: number = 60) => (
    <input
      value={editValues[field] ?? ''}
      onChange={e => editField(field, e.target.value)}
      style={{ ...inp, width, padding: '4px 6px', fontSize: 12, textAlign: typeof editValues[field] === 'number' ? 'right' : 'left' }}
    />
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Construction size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 5 — Bar Bending Schedule</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Reinforcement detailing and weight calculation</p>
        </div>
      </div>

      {error && (
        <div style={{ background: C.errBg, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.err, fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <X size={14} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}

      {/* Standard Selector & Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={standard} onChange={e => setStandard(e.target.value)} style={sel}>
          {STANDARDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={generate} disabled={loading} style={{ ...btnP, opacity: loading ? 0.5 : 1 }}>
          {loading ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
          <span style={{ marginLeft: 6 }}>Generate from Drawings</span>
        </button>
        <button onClick={addManualEntry} style={btnS}>
          <Plus size={14} />
          <span style={{ marginLeft: 4 }}>Add Manual Entry</span>
        </button>
        {items.length > 0 && (
          <>
            <button onClick={exportPDF} style={{ ...btnS, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>📄 PDF</button>
            <button onClick={exportCSV} style={btnS}>
              <Download size={14} />
              <span style={{ marginLeft: 4 }}>Export CSV</span>
            </button>
            <button onClick={() => setShowShapeCodes(!showShapeCodes)} style={btnSm}>
              <Info size={14} />
              <span style={{ marginLeft: 4 }}>Shape Codes</span>
            </button>
          </>
        )}
      </div>

      {/* Standard Info */}
      <div style={{ background: C.infoBg, border: `1px solid ${C.primary}22`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 13, color: C.primary }}>
        Standard: <strong>{standard}</strong> — {STANDARDS.find(s => s.value === standard)?.label}
      </div>

      {/* Shape Code Reference */}
      {showShapeCodes && (
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={secTitle}>
            <Info size={16} />
            Shape Code Reference
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {Object.entries(SHAPE_CODES).map(([code, desc]) => (
              <div key={code} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: C.bgD, borderRadius: 8 }}>
                <span style={{ ...badge(C.primary, C.infoBg), fontFamily: 'monospace', fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{code}</span>
                <span style={{ fontSize: 13, color: C.tx2 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is analyzing drawings for rebar details...</p>
        </div>
      )}

      {items.length === 0 && !loading && (
        <div style={empty}>
          <Construction size={40} color={C.tx3} style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 600, color: C.tx }}>No bar bending schedule yet</p>
          <p style={{ fontSize: 13, color: C.tx3 }}>Generate from drawings or add entries manually</p>
        </div>
      )}

      {items.length > 0 && !loading && (
        <>
          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Member</th>
                  <th style={th}>Bar Mark</th>
                  <th style={th}>Type</th>
                  <th style={{ ...th, textAlign: 'right' }}>Dia(mm)</th>
                  <th style={th}>Shape</th>
                  <th style={{ ...th, textAlign: 'right' }}>A</th>
                  <th style={{ ...th, textAlign: 'right' }}>B</th>
                  <th style={{ ...th, textAlign: 'right' }}>C</th>
                  <th style={{ ...th, textAlign: 'right' }}>R</th>
                  <th style={{ ...th, textAlign: 'right' }}>Length(mm)</th>
                  <th style={{ ...th, textAlign: 'right' }}>No. Bars</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total Len(mm)</th>
                  <th style={{ ...th, textAlign: 'right' }}>Weight(kg)</th>
                  <th style={{ ...th, width: 70 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isEditing = editingId === item.id;
                  const tl = calcTotalLength(item.length, item.quantity);
                  const wt = calcWeight(tl, item.diameter);

                  if (isEditing) {
                    const eTl = calcTotalLength(Number(editValues.length) || 0, Number(editValues.quantity) || 0);
                    const eWt = calcWeight(eTl, Number(editValues.diameter) || 0);
                    return (
                      <tr key={item.id} style={{ background: C.infoBg }}>
                        <td style={td}>{cellInput('member', 100)}</td>
                        <td style={td}>{cellInput('barMark', 50)}</td>
                        <td style={td}>
                          <select value={editValues.type || 'Deformed'} onChange={e => editField('type', e.target.value)} style={{ ...sel, padding: '4px 6px', fontSize: 12 }}>
                            <option value="Deformed">Deformed</option>
                            <option value="Plain">Plain</option>
                          </select>
                        </td>
                        <td style={td}>{cellInput('diameter', 50)}</td>
                        <td style={td}>
                          <select value={editValues.shapeCode || '00'} onChange={e => editField('shapeCode', e.target.value)} style={{ ...sel, padding: '4px 6px', fontSize: 12 }}>
                            {Object.keys(SHAPE_CODES).map(code => <option key={code} value={code}>{code}</option>)}
                          </select>
                        </td>
                        <td style={td}>{cellInput('a', 55)}</td>
                        <td style={td}>{cellInput('b', 55)}</td>
                        <td style={td}>{cellInput('c', 55)}</td>
                        <td style={td}>{cellInput('r', 55)}</td>
                        <td style={td}>{cellInput('length', 65)}</td>
                        <td style={td}>{cellInput('quantity', 50)}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(eTl)}</td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{eWt.toFixed(2)}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={saveEdit} style={{ ...btnSm, padding: '2px 6px', background: C.okBg, color: C.ok, border: 'none' }}>
                              <Check size={12} />
                            </button>
                            <button onClick={cancelEdit} style={{ ...btnSm, padding: '2px 6px' }}>
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} style={{ cursor: 'pointer', background: item.confirmed ? 'transparent' : '#fffbeb' }} onDoubleClick={() => startEdit(item)}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {item.member}
                        {item.lengthBasis && <div style={{ fontSize: 10, color: C.tx3, fontWeight: 400, fontStyle: 'italic', marginTop: 2 }}>{item.lengthBasis}</div>}
                      </td>
                      <td style={td}>
                        <span style={badge(C.primary, C.infoBg)}>{item.barMark}</span>
                      </td>
                      <td style={{ ...td, fontSize: 12 }}>{item.type}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{item.diameter}</td>
                      <td style={td}>
                        <span style={{ ...badge(C.purple, '#f3f0ff'), fontFamily: 'monospace' }} title={SHAPE_CODES[item.shapeCode] || ''}>{item.shapeCode}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(item.a)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(item.b)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(item.c)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(item.r)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.length)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(tl)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{wt.toFixed(2)}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => startEdit(item)} style={{ ...btnSm, padding: '2px 6px' }}>
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => deleteItem(item.id)} style={{ ...btnSm, padding: '2px 6px', color: C.err }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: C.tx3 }}>
            Double-click a row to edit • {items.length} entries • {items.filter(i => i.confirmed).length} confirmed, {items.filter(i => !i.confirmed).length} estimated
          </div>

          {/* Weight Summary */}
          <div style={{ ...card, marginTop: 20 }}>
            <h3 style={secTitle}>
              <Construction size={16} />
              Weight Summary
            </h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ ...card, flex: 1, minWidth: 130, padding: '12px 16px', textAlign: 'center', background: C.gradSubtle }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{totalWeight.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: C.tx3 }}>Total Weight (kg)</div>
              </div>
              <div style={{ ...card, flex: 1, minWidth: 130, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.purple }}>{(totalWeight / 1000).toFixed(3)}</div>
                <div style={{ fontSize: 12, color: C.tx3 }}>Total Weight (tonnes)</div>
              </div>
              <div style={{ ...card, flex: 1, minWidth: 130, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.ok }}>{items.length}</div>
                <div style={{ fontSize: 12, color: C.tx3 }}>Total Entries</div>
              </div>
            </div>

            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Diameter (mm)</th>
                  <th style={{ ...th, textAlign: 'right' }}>Entries</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total Bars</th>
                  <th style={{ ...th, textAlign: 'right' }}>Weight (kg)</th>
                  <th style={{ ...th, textAlign: 'right' }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {weightByDiameter.map(([dia, wt]) => {
                  const diaItems = items.filter(i => i.diameter === Number(dia));
                  const totalBars = diaItems.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr key={dia}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        <span style={badge(C.primary, C.infoBg)}>Ø{dia}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>{diaItems.length}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{totalBars}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{wt.toFixed(2)}</td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{totalWeight > 0 ? ((wt / totalWeight) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  );
                })}
                <tr style={{ background: C.bgD }}>
                  <td style={{ ...td, fontWeight: 700 }}>Total</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{items.length}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 15 }}>{totalWeight.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
