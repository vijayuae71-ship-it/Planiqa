import React, { useState, useMemo } from 'react';
import { Package, Sparkles, Download, Search, RefreshCw, X, DollarSign } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, inp, sel, tbl, th, td, badge, secTitle, empty, uid, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadCSV } from '../utils/export';
import { getCPWDRateReference, getMiddleEastRates } from '../utils/rates';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface BOMItem {
  trade: string;
  item: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  total: number;
  rateSource: string;
  specification: string;
  measurementBasis: string;
  confirmed: boolean;
}

const EXCHANGE_RATES: Record<string, number> = { USD: 1, AED: 3.67, INR: 83.5, SAR: 3.75, GBP: 0.79, EUR: 0.92, QAR: 3.64, OMR: 0.385 };
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', AED: 'د.إ', INR: '₹', SAR: 'ر.س', GBP: '£', EUR: '€', QAR: 'ر.ق', OMR: 'ر.ع' };

export const BillOfMaterials: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<BOMItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [currency, setCurrency] = useState('USD');

  const rate = EXCHANGE_RATES[currency] || 1;
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const conv = (val: number) => val * rate;
  const fmtC = (val: number) => `${sym} ${fmt(conv(val))}`;

  const generate = async () => {
    if (!apiKey) { setError('Configure API key in Settings first'); return; }
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the header first'); return; }
    setLoading(true);
    setError('');
    try {
      const rateTable = getCPWDRateReference('INR');
      const meRates = getMiddleEastRates();
      const systemPrompt = `You are a senior quantity surveyor (RICS/AACE certified, 20+ years experience) preparing Bills of Quantities/Materials for Tier-1 contractors (L&T, Sobha, Danube, Nagarjuna). Your BOQ/BOM output will be used for tendering, procurement, and cost control.

═══ MANDATORY RATE TABLE — YOU MUST USE THESE EXACT RATES ═══
${rateTable}

═══ MIDDLE EAST RATES (use when project is in Gulf region) ═══
${meRates}

RATE USAGE RULES (CRITICAL — VIOLATIONS WILL BE REJECTED):
1. For EVERY item, use the EXACT rate from the rate table above — do NOT modify, round, or create ranges
2. The "rateSource" field MUST cite the DSR reference code from the table (e.g., "CPWD DSR 2024 [DSR 4.2] — ₹5,862/m³")
3. For items NOT in the rate table → mark rateSource as "Market Rate (Estimated)" and provide reasonable justification
4. NEVER invent DSR item numbers not present in the table above
5. ALL rates are in INR (Indian Rupees). Use the rate table as-is. DO NOT CHANGE THE NUMBERS.

EXAMPLE OF CORRECT RATES (use these EXACT numbers):
- Excavation ordinary soil ≤1.5m: ₹398/m³ [DSR 2.1]
- PCC M15 (1:2:4): ₹5,862/m³ [DSR 4.2]
- RCC M25: ₹7,126/m³ [DSR 4.8]
- RCC M30: ₹7,894/m³ [DSR 4.9]
- Fe500 Steel: ₹78.50/kg [DSR 5.1]
- Brick masonry CM 1:6: ₹6,284/m³ [DSR 6.2]
- 12mm plaster CM 1:4: ₹228/m² [DSR 11.1]
- Vitrified tiles 600×600: ₹1,164/m² [DSR 14.32]

QUANTITY MEASUREMENT STANDARDS:
- India: IS 1200 (all parts) — Method of Measurement of Building and Civil Engineering Works
- International: RICS NRM1/NRM2, UAE/GCC: POMI, CESMM4 for civil works

CRITICAL ACCURACY RULES:
- Quantities: ONLY from measurable dimensions in drawings. Show calculation basis (e.g., "2 nos × 3.0m × 0.3m × 0.3m = 0.54 m³")
- Deductions: Apply proper deductions for openings > 0.1 m² per IS 1200
- Wastage: Factor in standard wastage (concrete 2.5%, steel 3%, bricks 5%, tiles 10%)
- DO NOT over-estimate or under-estimate. Be realistic and conservative.
- Units must be standard: m³, m², Rmt, Kg, Nos, LS as per IS 1200

GENERATE 30-80+ LINE ITEMS. Each trade should have major material items with quantity breakdown, associated labor where applicable, testing/QC items per code.

Return JSON array format:
[{"trade":"Concrete Works","item":"PCC M15 Foundation","description":"Providing and laying PCC M15 (1:2:4) for foundation bed including levelling and curing","quantity":45.5,"unit":"m³","unitRate":5862,"total":266721,"rateSource":"CPWD DSR 2024 [DSR 4.2] — ₹5,862/m³","specification":"IS 456:2000, Min cement 270 kg/m³","measurementBasis":"IS 1200 Part 2. Foundation F1-F6: 6 nos × 2.0×2.0×0.15 = 3.6 m³, Strip footing: 45m × 0.6m × 0.15 = 4.05 m³","confirmed":true}]

ALL rates MUST be in INR.`;
      const userMsg = 'Generate a professional, contract-grade Bill of Quantities from these construction drawings. This BOQ will be reviewed by senior QS teams at major construction firms. CRITICAL: Use ONLY the EXACT rates from the CPWD DSR rate table provided in your instructions — do NOT modify or round them. For EVERY item: cite the exact DSR reference code, show measurement basis per IS 1200, reference applicable specification, and mark confirmed vs assumed. Quantities must show calculation breakdowns. Example: Excavation MUST be ₹398/m³ [DSR 2.1]. PCC M15 MUST be ₹5,862/m³ [DSR 4.2]. RCC M30 MUST be ₹7,894/m³ [DSR 4.9]. Steel Fe500 MUST be ₹78.50/kg [DSR 5.1]. Copy these numbers exactly from the table.';
      const result = await callClaude(apiKey, systemPrompt, userMsg, selected);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      const items: BOMItem[] = (Array.isArray(parsed) ? parsed : (parsed.items || [])).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unitRate: Number(item.unitRate) || 0,
        total: Number(item.total) || (Number(item.quantity) || 0) * (Number(item.unitRate) || 0),
        rateSource: item.rateSource || '',
        specification: item.specification || '',
        measurementBasis: item.measurementBasis || '',
        confirmed: item.confirmed !== false
      }));
      setData(items);
      onStatusChange('complete');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const trades = useMemo(() => [...new Set(data.map(d => d.trade))].sort(), [data]);

  const filtered = data.filter(item => {
    const matchSearch = searchTerm === '' ||
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trade.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTrade = tradeFilter === 'all' || item.trade === tradeFilter;
    return matchSearch && matchTrade;
  });

  const tradeSubtotals = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(item => {
      map[item.trade] = (map[item.trade] || 0) + item.total;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const grandTotal = useMemo(() => data.reduce((sum, item) => sum + item.total, 0), [data]);

  const exportCSV = () => {
    const rows = data.map(item => ({
      Trade: item.trade,
      Item: item.item,
      Description: item.description,
      Specification: item.specification || '',
      'Measurement Basis': item.measurementBasis || '',
      Quantity: item.quantity,
      Unit: item.unit,
      'Unit Rate': item.unitRate,
      'Rate Source': item.rateSource || '',
      Total: item.total,
      Status: item.confirmed ? 'Confirmed' : 'Estimated'
    }));
    downloadCSV(rows, 'bill-of-materials.csv');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 3 — Bill of Materials</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>AI-generated quantity takeoff with cost estimates</p>
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
          <Package size={40} color={C.tx3} style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 600, color: C.tx }}>No bill of materials generated yet</p>
          <p style={{ fontSize: 13, color: C.tx3, marginBottom: 16 }}>Select drawings and generate a detailed BOM with cost estimates</p>
          <button onClick={generate} style={btnP}>
            <Sparkles size={14} />
            <span style={{ marginLeft: 6 }}>Generate BOM</span>
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is analyzing drawings and estimating quantities...</p>
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
                placeholder="Search materials..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ ...inp, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <select value={tradeFilter} onChange={e => setTradeFilter(e.target.value)} style={sel}>
              <option value="all">All Trades</option>
              {trades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={sel}>
              {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={generate} style={btnS}>
              <RefreshCw size={14} />
              <span style={{ marginLeft: 4 }}>Regenerate</span>
            </button>
            <button onClick={exportCSV} style={btnS}>
              <Download size={14} />
              <span style={{ marginLeft: 4 }}>Export CSV</span>
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ ...card, flex: 1, minWidth: 130, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{data.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Line Items</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 130, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.purple }}>{trades.length}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Trades</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 130, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.ok }}>{fmtC(grandTotal)}</div>
              <div style={{ fontSize: 12, color: C.tx3 }}>Grand Total</div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Trade</th>
                  <th style={th}>Item</th>
                  <th style={{ ...th, minWidth: 200 }}>Description & Spec</th>
                  <th style={{ ...th, minWidth: 140 }}>Measurement Basis</th>
                  <th style={{ ...th, textAlign: 'right' }}>Qty</th>
                  <th style={th}>Unit</th>
                  <th style={{ ...th, textAlign: 'right' }}>Rate</th>
                  <th style={{ ...th, minWidth: 120 }}>Rate Source</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={i} style={{ background: item.confirmed ? 'transparent' : '#fffbeb' }}>
                    <td style={td}>
                      <span style={badge(C.primary, C.infoBg)}>{item.trade}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 600, fontSize: 12 }}>{item.item}</td>
                    <td style={{ ...td, fontSize: 12, lineHeight: 1.5 }}>
                      <div>{item.description}</div>
                      {item.specification && <div style={{ fontSize: 11, color: C.tx3, marginTop: 2, fontStyle: 'italic' }}>Spec: {item.specification}</div>}
                    </td>
                    <td style={{ ...td, fontSize: 11, color: C.tx3, fontStyle: 'italic' }}>{item.measurementBasis || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.quantity)}</td>
                    <td style={td}>{item.unit}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtC(item.unitRate)}</td>
                    <td style={{ ...td, fontSize: 11, color: C.tx2 }}>{item.rateSource || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{fmtC(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: C.tx3 }}>
            Showing {filtered.length} of {data.length} items • {data.filter(d => d.confirmed).length} confirmed from drawings, {data.filter(d => !d.confirmed).length} estimated
          </div>

          {/* Cost Summary */}
          <div style={{ ...card, marginTop: 20 }}>
            <h3 style={secTitle}>
              <DollarSign size={16} />
              Cost Summary by Trade
            </h3>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Trade</th>
                  <th style={{ ...th, textAlign: 'right' }}>Items</th>
                  <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
                  <th style={{ ...th, textAlign: 'right' }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {tradeSubtotals.map(([trade, subtotal]) => (
                  <tr key={trade}>
                    <td style={{ ...td, fontWeight: 600 }}>{trade}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{data.filter(d => d.trade === trade).length}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtC(subtotal)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{grandTotal > 0 ? ((subtotal / grandTotal) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
                <tr style={{ background: C.bgD }}>
                  <td style={{ ...td, fontWeight: 700 }}>Grand Total</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{data.length}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 15 }}>{fmtC(grandTotal)}</td>
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
