import React, { useState } from 'react';
import { ClipboardCheck, Plus, Edit2, Trash2, Download, Filter, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, btnD, inp, sel, tbl, th, td, badge, statusBadge, secTitle, empty, uid, fmt } from '../utils/theme';
import { downloadCSV } from '../utils/export';
import { generatePDF, PDFSection } from '../utils/pdf';

interface ModuleProps {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface PunchItem {
  id: string;
  number: string;
  location: string;
  description: string;
  trade: string;
  severity: string;
  status: string;
  assignedTo: string;
  dateIdentified: string;
  dateResolved: string;
}

const TRADES = ['Structural', 'Architectural', 'Mechanical', 'Electrical', 'Plumbing', 'Civil', 'Fire Protection', 'Finishing'];
const SEVERITIES = ['critical', 'major', 'minor'];
const STATUSES = ['open', 'in-progress', 'resolved', 'verified'];

const defaultForm = (nextNum: string): Omit<PunchItem, 'id'> => ({
  number: nextNum,
  location: '',
  description: '',
  trade: 'Structural',
  severity: 'minor',
  status: 'open',
  assignedTo: '',
  dateIdentified: new Date().toISOString().split('T')[0],
  dateResolved: '',
});

const severityBadge = (severity: string): React.CSSProperties => {
  switch (severity) {
    case 'critical': return badge('#fff', C.err);
    case 'major': return badge('#fff', C.warn);
    case 'minor': return badge(C.info, C.infoBg);
    default: return badge(C.tx2, C.bgD);
  }
};

const severityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <AlertTriangle size={12} />;
    case 'major': return <AlertCircle size={12} />;
    case 'minor': return <Info size={12} />;
    default: return null;
  }
};

export const PunchList: React.FC<ModuleProps> = ({ onStatusChange }) => {
  const [items, setItems] = useState<PunchItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm('PL-001'));
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrade, setFilterTrade] = useState('all');
  const [search, setSearch] = useState('');

  const nextNumber = () => {
    const nums = items.map(i => parseInt(i.number.replace('PL-', ''), 10)).filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `PL-${String(next).padStart(3, '0')}`;
  };

  const openAdd = () => { setForm(defaultForm(nextNumber())); setEditId(null); setShowModal(true); };
  const openEdit = (item: PunchItem) => {
    setForm({ number: item.number, location: item.location, description: item.description, trade: item.trade, severity: item.severity, status: item.status, assignedTo: item.assignedTo, dateIdentified: item.dateIdentified, dateResolved: item.dateResolved });
    setEditId(item.id);
    setShowModal(true);
  };

  const save = () => {
    if (!form.location || !form.description) return;
    if (editId) {
      setItems(prev => prev.map(it => it.id === editId ? { ...it, ...form } : it));
    } else {
      const newItem: PunchItem = { ...form, id: uid() };
      setItems(prev => {
        const next = [...prev, newItem];
        if (prev.length === 0) onStatusChange('in-progress');
        return next;
      });
    }
    setShowModal(false);
    setEditId(null);
  };

  const remove = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const filtered = items.filter(it => {
    if (filterSeverity !== 'all' && it.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && it.status !== filterStatus) return false;
    if (filterTrade !== 'all' && it.trade !== filterTrade) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!it.number.toLowerCase().includes(s) && !it.location.toLowerCase().includes(s) && !it.description.toLowerCase().includes(s) && !it.assignedTo.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const openCount = items.filter(i => i.status === 'open').length;
  const resolvedCount = items.filter(i => i.status === 'resolved').length;
  const verifiedCount = items.filter(i => i.status === 'verified').length;
  const completionPct = items.length > 0 ? Math.round(((resolvedCount + verifiedCount) / items.length) * 100) : 0;

  const criticalCount = items.filter(i => i.severity === 'critical').length;
  const majorCount = items.filter(i => i.severity === 'major').length;
  const minorCount = items.filter(i => i.severity === 'minor').length;

  const exportCSV = () => {
    const rows = items.map(i => ({ Number: i.number, Location: i.location, Description: i.description, Trade: i.trade, Severity: i.severity, Status: i.status, 'Assigned To': i.assignedTo, Identified: i.dateIdentified, Resolved: i.dateResolved }));
    downloadCSV(rows, 'punch-list');
  };

  const exportPDF = () => {
    const sections: PDFSection[] = [];
    sections.push({
      type: 'keyvalue',
      title: 'Summary',
      items: [
        { label: 'Total Items', value: String(items.length) },
        { label: 'Open', value: String(openCount) },
        { label: 'Resolved', value: String(resolvedCount) },
        { label: 'Verified', value: String(verifiedCount) },
        { label: 'Completion', value: `${completionPct}%` },
      ],
    });
    sections.push({
      type: 'keyvalue',
      title: 'Severity Breakdown',
      items: [
        { label: 'Critical', value: String(criticalCount) },
        { label: 'Major', value: String(majorCount) },
        { label: 'Minor', value: String(minorCount) },
      ],
    });
    sections.push({
      type: 'table',
      title: 'Punch List Items',
      headers: ['Number', 'Location', 'Description', 'Trade', 'Severity', 'Status', 'Assigned To', 'Identified', 'Resolved'],
      rows: items.map(i => [
        String(i.number ?? ''),
        String(i.location ?? ''),
        String(i.description ?? ''),
        String(i.trade ?? ''),
        String(i.severity ?? ''),
        String(i.status ?? ''),
        String(i.assignedTo ?? ''),
        String(i.dateIdentified ?? ''),
        String(i.dateResolved ?? ''),
      ]),
      summary: [
        { label: 'Total', value: String(items.length) },
        { label: 'Open', value: String(openCount) },
        { label: 'Completion', value: `${completionPct}%` },
      ],
    });
    generatePDF({
      title: 'Punch List Report',
      module: 'Module 13: Punch List',
      sections,
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 13: Punch List</h2>
            <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Track punch list items, deficiencies, and completion</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportPDF} style={{ ...btnS, background: '#dc2626', color: '#fff', borderRadius: 6 }}>📄 PDF</button>
          <button style={btnS} onClick={exportCSV}><Download size={14} /> Export CSV</button>
          <button style={btnP} onClick={openAdd}><Plus size={14} /> Add Item</button>
        </div>
      </div>

      {/* Completion Tracking */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.tx }}>Punch List Completion</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>{completionPct}%</span>
        </div>
        <div style={{ width: '100%', height: 12, background: C.bgD, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${completionPct}%`, height: '100%', background: C.grad, borderRadius: 6, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: C.tx3, marginTop: 6 }}>
          {resolvedCount + verifiedCount} of {items.length} items resolved or verified
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Items', value: items.length, color: C.primary, bg: C.infoBg },
          { label: 'Open', value: openCount, color: C.warn, bg: C.warnBg },
          { label: 'Resolved', value: resolvedCount, color: C.ok, bg: C.okBg },
          { label: 'Verified', value: verifiedCount, color: C.primary, bg: C.infoBg },
        ].map((c, i) => (
          <div key={i} style={{ ...card, textAlign: 'center' as const, background: c.bg }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: C.tx3, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Severity Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Critical', value: criticalCount, color: C.err, bg: C.errBg, icon: <AlertTriangle size={16} color={C.err} /> },
          { label: 'Major', value: majorCount, color: C.warn, bg: C.warnBg, icon: <AlertCircle size={16} color={C.warn} /> },
          { label: 'Minor', value: minorCount, color: C.info, bg: C.infoBg, icon: <Info size={16} color={C.info} /> },
        ].map((c, i) => (
          <div key={i} style={{ ...card, background: c.bg, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: C.tx3 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
        <div style={{ position: 'relative' as const, display: 'flex', alignItems: 'center' }}>
          <Filter size={14} style={{ position: 'absolute' as const, left: 10, color: C.tx3 }} />
          <input style={{ ...inp, paddingLeft: 32, minWidth: 200 }} placeholder="Search punch items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={sel} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="all">All Severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select style={sel} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select style={sel} value={filterTrade} onChange={e => setFilterTrade(e.target.value)}>
          <option value="all">All Trades</option>
          {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={empty}>
          <ClipboardCheck size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>No punch list items yet. Click "Add Item" to start tracking.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' as const }}>
          <table style={tbl}>
            <thead>
              <tr>
                <th style={th}>Number</th>
                <th style={th}>Location</th>
                <th style={th}>Description</th>
                <th style={th}>Trade</th>
                <th style={th}>Severity</th>
                <th style={th}>Status</th>
                <th style={th}>Assigned To</th>
                <th style={th}>Identified</th>
                <th style={th}>Resolved</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td style={{ ...td, fontWeight: 600, color: C.primary }}>{item.number}</td>
                  <td style={td}>{item.location}</td>
                  <td style={{ ...td, maxWidth: 200, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }} title={item.description}>{item.description}</td>
                  <td style={td}><span style={badge(C.purple, C.purple + '18')}>{item.trade}</span></td>
                  <td style={td}>
                    <span style={{ ...severityBadge(item.severity), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {severityIcon(item.severity)} {item.severity}
                    </span>
                  </td>
                  <td style={td}><span style={statusBadge(item.status)}>{item.status}</span></td>
                  <td style={td}>{item.assignedTo || '—'}</td>
                  <td style={{ ...td, fontSize: 12, color: C.tx3 }}>{item.dateIdentified}</td>
                  <td style={{ ...td, fontSize: 12, color: C.tx3 }}>{item.dateResolved || '—'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ ...btnSm, padding: '4px 8px' }} onClick={() => openEdit(item)}><Edit2 size={13} /></button>
                      <button style={{ ...btnD, padding: '4px 8px', fontSize: 12 }} onClick={() => remove(item.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...card, width: 560, maxHeight: '90vh', overflowY: 'auto' as const, position: 'relative' as const }}>
            <button style={{ position: 'absolute' as const, top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: C.tx3 }} onClick={() => { setShowModal(false); setEditId(null); }}><X size={18} /></button>
            <h3 style={{ ...secTitle, marginTop: 0 }}>{editId ? 'Edit Punch Item' : 'Add New Punch Item'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Item Number</label>
                <input style={{ ...inp, background: C.bgD }} value={form.number} readOnly />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Location *</label>
                <input style={inp} placeholder="e.g., Floor 3, Room 301" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Description *</label>
                <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' as const }} placeholder="Describe the deficiency or item..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Trade</label>
                <select style={sel} value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })}>
                  {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Severity</label>
                <select style={sel} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Status</label>
                <select style={sel} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Assigned To</label>
                <input style={inp} placeholder="Person responsible" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Date Identified</label>
                <input style={inp} type="date" value={form.dateIdentified} onChange={e => setForm({ ...form, dateIdentified: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Date Resolved</label>
                <input style={inp} type="date" value={form.dateResolved} onChange={e => setForm({ ...form, dateResolved: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button style={btnS} onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</button>
              <button style={btnP} onClick={save}>{editId ? 'Update' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
