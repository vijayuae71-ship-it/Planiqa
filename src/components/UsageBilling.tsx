import React, { useState, useMemo, useEffect } from 'react';
import { C } from '../utils/theme';
import { useResponsive } from '../utils/responsive';
import { getUsageRecords, getUsageRecordsAsync, getUsageSummary } from '../utils/ai';
import { downloadCSV, downloadTXT } from '../utils/export';

interface CompanySummary { name: string; calls: number; cost: number; }
interface ModuleSummary { calls: number; cost: number; }

interface Props {
  companyId?: string;
  companyName?: string;
  isOwner?: boolean; // owner sees all companies
}

export const UsageBilling: React.FC<Props> = ({ companyId, companyName, isOwner }) => {
  const { isMobile } = useResponsive();
  const [tab, setTab] = useState<'overview' | 'details' | 'invoices' | 'settings'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [markupPct, setMarkupPct] = useState(40);

  const [allRecords, setAllRecords] = useState(getUsageRecords());
  useEffect(() => {
    getUsageRecordsAsync().then(r => setAllRecords(r)).catch(() => {});
  }, []);

  const filteredRecords = useMemo(() => {
    let recs = isOwner ? allRecords : allRecords.filter(r => r.companyId === companyId);
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      recs = recs.filter(r => r.timestamp >= cutoff);
    }
    return recs;
  }, [allRecords, companyId, isOwner, dateRange]);

  const summary = useMemo(() => getUsageSummary(filteredRecords), [filteredRecords]);

  const billedCost = summary.totalCost * (1 + markupPct / 100);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: isMobile ? '8px 12px' : '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: isMobile ? 12 : 13,
    borderBottom: active ? `3px solid ${C.primary}` : '3px solid transparent',
    color: active ? C.primary : C.tx2, background: 'none', border: 'none',
    transition: 'all 0.2s',
  });

  const card = (title: string, value: string, sub: string, color: string): React.ReactNode => (
    <div style={{
      background: C.bgW, borderRadius: 12, padding: isMobile ? 14 : 20, border: `1px solid ${C.bdr}`,
      flex: isMobile ? '1 1 45%' : '1 1 200px', minWidth: isMobile ? 140 : 180,
    }}>
      <div style={{ fontSize: 12, color: C.tx3, marginBottom: 6, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.tx3, marginTop: 4 }}>{sub}</div>
    </div>
  );

  const exportUsageCSV = () => {
    const rows: Record<string, any>[] = filteredRecords.map(r => ({
      Date: new Date(r.timestamp).toLocaleString(),
      Company: r.companyName,
      User: r.userName,
      Project: r.projectName,
      Module: r.module,
      'Input Tokens': r.inputTokens,
      'Output Tokens': r.outputTokens,
      'API Cost ($)': r.totalCost.toFixed(4),
      'Billed Cost ($)': (r.totalCost * (1 + markupPct / 100)).toFixed(4),
      Drawings: r.drawingCount,
      Model: r.model,
    }));
    downloadCSV(rows, 'planiq-usage-report');
  };

  const generateInvoice = (compId: string) => {
    const compRecords = filteredRecords.filter(r => r.companyId === compId);
    const compSummary = getUsageSummary(compRecords);
    const billed = compSummary.totalCost * (1 + markupPct / 100);
    const lines = [
      '═══════════════════════════════════════════════════',
      '              PLANIQ — AI DRAWING INTELLIGENCE',
      '                    USAGE INVOICE',
      '═══════════════════════════════════════════════════',
      '',
      `Invoice Date: ${new Date().toLocaleDateString()}`,
      `Bill To: ${compRecords[0]?.companyName || compId}`,
      `Period: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange.replace('d', ' days')}`}`,
      '',
      '───────────────────────────────────────────────────',
      'USAGE SUMMARY',
      '───────────────────────────────────────────────────',
      `Total API Calls:        ${compSummary.totalCalls}`,
      `Total Input Tokens:     ${compSummary.totalInputTokens.toLocaleString()}`,
      `Total Output Tokens:    ${compSummary.totalOutputTokens.toLocaleString()}`,
      '',
      '───────────────────────────────────────────────────',
      'BREAKDOWN BY MODULE',
      '───────────────────────────────────────────────────',
    ];
    for (const [mod, data] of Object.entries(compSummary.byModule) as [string, ModuleSummary][]) {
      lines.push(`  ${mod.padEnd(25)} ${data.calls} calls    $${(data.cost * (1 + markupPct / 100)).toFixed(2)}`);
    }
    lines.push('', '───────────────────────────────────────────────────');
    lines.push(`API Cost:                       $${compSummary.totalCost.toFixed(2)}`);
    lines.push(`Service Markup (${markupPct}%):          $${(billed - compSummary.totalCost).toFixed(2)}`);
    lines.push(`TOTAL DUE:                      $${billed.toFixed(2)}`);
    lines.push('', '═══════════════════════════════════════════════════');
    lines.push('Powered by PlanIQ | AI Drawing Intelligence');
    lines.push('Contact: vijayuae71@gmail.com');
    downloadTXT(`invoice-${compRecords[0]?.companyName || compId}`, lines.join('\n'));
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.tx }}>
            📊 Usage & Billing {isOwner ? '(All Companies)' : `— ${companyName}`}
          </h2>
          <div style={{ fontSize: 13, color: C.tx3, marginTop: 4 }}>Track API usage, costs, and generate invoices</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['7d', '30d', '90d', 'all'] as const).map(r => (
            <button key={r} onClick={() => setDateRange(r)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${dateRange === r ? C.primary : C.bdr}`,
              background: dateRange === r ? C.infoBg : C.bgW,
              color: dateRange === r ? C.primary : C.tx2,
            }}>
              {r === 'all' ? 'All Time' : r.replace('d', ' Days')}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.bdr}`, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'overview' as const, label: '📈 Overview' },
          { id: 'details' as const, label: '📋 Detailed Log' },
          { id: 'invoices' as const, label: '🧾 Invoices' },
          { id: 'settings' as const, label: '⚙️ Billing Settings' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            {card('Total API Calls', summary.totalCalls.toLocaleString(), `${filteredRecords.length} requests tracked`, C.primary)}
            {card('API Cost', `$${summary.totalCost.toFixed(2)}`, `Raw Anthropic cost`, '#059669')}
            {card('Billed Amount', `$${billedCost.toFixed(2)}`, `With ${markupPct}% markup`, '#7c3aed')}
            {card('Profit', `$${(billedCost - summary.totalCost).toFixed(2)}`, `${markupPct}% margin`, '#ea580c')}
          </div>

          {/* Token Usage */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            {card('Input Tokens', summary.totalInputTokens.toLocaleString(), `$${(summary.totalInputTokens / 1_000_000 * 3).toFixed(4)} cost`, C.info)}
            {card('Output Tokens', summary.totalOutputTokens.toLocaleString(), `$${(summary.totalOutputTokens / 1_000_000 * 15).toFixed(4)} cost`, '#d946ef')}
          </div>

          {/* By Company */}
          {isOwner && Object.keys(summary.byCompany).length > 0 && (
            <div style={{ background: C.bgW, borderRadius: 12, border: `1px solid ${C.bdr}`, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.tx }}>Usage by Company</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.bdr}` }}>
                    {['Company', 'API Calls', 'API Cost', 'Billed', 'Profit'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: C.tx3, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(summary.byCompany) as [string, CompanySummary][]).map(([id, data]) => {
                    const billed = data.cost * (1 + markupPct / 100);
                    return (
                      <tr key={id} style={{ borderBottom: `1px solid ${C.bdr}` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, color: C.tx }}>{data.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.tx2 }}>{data.calls}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#059669', fontWeight: 600 }}>${data.cost.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>${billed.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#ea580c', fontWeight: 600 }}>${(billed - data.cost).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* By Module */}
          {Object.keys(summary.byModule).length > 0 && (
            <div style={{ background: C.bgW, borderRadius: 12, border: `1px solid ${C.bdr}`, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.tx }}>Usage by Module</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {(Object.entries(summary.byModule) as [string, ModuleSummary][]).sort((a, b) => b[1].cost - a[1].cost).map(([mod, data]) => (
                  <div key={mod} style={{
                    background: C.bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.bdr}`,
                    minWidth: 160, flex: '1 1 160px',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, marginBottom: 4, textTransform: 'capitalize' }}>{mod}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{data.calls} <span style={{ fontSize: 11, color: C.tx3 }}>calls</span></div>
                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>${data.cost.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.totalCalls === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: C.tx3 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No usage data yet</div>
              <div style={{ fontSize: 13 }}>Start using AI modules to see usage tracking here</div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Log Tab */}
      {tab === 'details' && (
        <div style={{ background: C.bgW, borderRadius: 12, border: `1px solid ${C.bdr}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: C.tx }}>{filteredRecords.length} API calls</span>
            <button onClick={exportUsageCSV} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: C.grad, color: '#fff', border: 'none', cursor: 'pointer',
            }}>📥 Export CSV</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Time', 'Company', 'User', 'Project', 'Module', 'In Tokens', 'Out Tokens', 'Cost', 'Billed'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: C.tx3, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.slice().reverse().slice(0, 200).map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.bdr}` }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.tx2, whiteSpace: 'nowrap' }}>{new Date(r.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.tx, fontWeight: 500 }}>{r.companyName}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.tx2 }}>{r.userName}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.tx2 }}>{r.projectName}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.primary, fontWeight: 600, textTransform: 'capitalize' }}>{r.module}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.tx2 }}>{r.inputTokens.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.tx2 }}>{r.outputTokens.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#059669', fontWeight: 600 }}>${r.totalCost.toFixed(4)}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>${(r.totalCost * (1 + markupPct / 100)).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRecords.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: C.tx3, fontSize: 13 }}>No usage records found for this period</div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <div>
          <div style={{ background: C.bgW, borderRadius: 12, border: `1px solid ${C.bdr}`, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.tx }}>🧾 Generate Invoices</h3>
            <p style={{ fontSize: 13, color: C.tx3, marginBottom: 16 }}>Generate TXT invoices per company for the selected period with your markup applied.</p>
            {Object.keys(summary.byCompany).length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: C.tx3 }}>No usage data to invoice</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(Object.entries(summary.byCompany) as [string, CompanySummary][]).map(([id, data]) => {
                  const billed = data.cost * (1 + markupPct / 100);
                  return (
                    <div key={id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: 10, border: `1px solid ${C.bdr}`, background: C.bg,
                      flexWrap: 'wrap', gap: 12,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: C.tx }}>{data.name}</div>
                        <div style={{ fontSize: 12, color: C.tx3 }}>{data.calls} API calls</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: C.tx3 }}>Billed Amount</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>${billed.toFixed(2)}</div>
                        </div>
                        <button onClick={() => generateInvoice(id)} style={{
                          padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: C.grad, color: '#fff', border: 'none', cursor: 'pointer',
                        }}>📄 Download Invoice</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Batch Invoice */}
          {Object.keys(summary.byCompany).length > 1 && (
            <button onClick={() => {
              Object.keys(summary.byCompany).forEach(id => generateInvoice(id));
            }} style={{
              padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: C.grad, color: '#fff', border: 'none', cursor: 'pointer',
              width: '100%',
            }}>
              📦 Download All Invoices
            </button>
          )}
        </div>
      )}

      {/* Billing Settings Tab */}
      {tab === 'settings' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ background: C.bgW, borderRadius: 12, border: `1px solid ${C.bdr}`, padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: C.tx }}>💰 Markup Settings</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 8 }}>
                Service Markup Percentage
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range" min={0} max={200} value={markupPct}
                  onChange={e => setMarkupPct(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{
                  width: 60, padding: '8px 12px', textAlign: 'center', borderRadius: 8,
                  border: `1px solid ${C.bdr}`, fontWeight: 700, fontSize: 16, color: C.primary,
                }}>
                  {markupPct}%
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.tx3, marginTop: 8 }}>
                API cost × {(1 + markupPct / 100).toFixed(2)} = billed amount
              </div>
            </div>

            <div style={{ background: C.bg, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 10 }}>Pricing Preview</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: C.tx3 }}>Example: $10 API cost</span>
                <span style={{ fontWeight: 700, color: '#7c3aed' }}>${(10 * (1 + markupPct / 100)).toFixed(2)} billed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: C.tx3 }}>Your profit:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>${(10 * markupPct / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ background: C.bgW, borderRadius: 12, border: `1px solid ${C.bdr}`, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.tx }}>📊 API Pricing Reference</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.bdr}` }}>
                  {['Item', 'Cost per 1M tokens'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: C.tx3, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: C.tx }}>Claude Sonnet Input</td>
                  <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#059669' }}>$3.00</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: C.tx }}>Claude Sonnet Output</td>
                  <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#059669' }}>$15.00</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: C.tx }}>Image Processing</td>
                  <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#059669' }}>~$0.002/image</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: C.tx3 }}>
        PlanIQ Usage Tracking • Powered by Vijay
      </div>
    </div>
  );
};
