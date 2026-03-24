import React, { useState } from 'react';
import { FileCheck, Plus, Edit2, Trash2, Download, Filter, BarChart3, X } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, btnD, inp, sel, tbl, th, td, badge, statusBadge, secTitle, empty, uid, fmt } from '../utils/theme';
import { downloadCSV } from '../utils/export';

interface ModuleProps {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface AsBuiltItem {
  id: string;
  drawingNumber: string;
  title: string;
  discipline: string;
  revision: string;
  status: string;
  verifiedBy: string;
  date: string;
  completion: number;
  revisionHistory: string[];
}

const DISCIPLINES = ['Structural', 'Architectural', 'Mechanical', 'Electrical', 'Plumbing', 'Civil', 'Fire Protection', 'Landscaping'];
const STATUSES = ['pending', 'in-progress', 'submitted', 'verified'];

const defaultForm = (): Omit<AsBuiltItem, 'id' | 'revisionHistory'> => ({
  drawingNumber: '',
  title: '',
  discipline: 'Structural',
  revision: 'Rev A',
  status: 'pending',
  verifiedBy: '',
  date: new Date().toISOString().split('T')[0],
  completion: 0,
});

export const AsBuiltTracker: React.FC<ModuleProps> = ({ onStatusChange }) => {
  const [items, setItems] = useState<AsBuiltItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [filterDiscipline, setFilterDiscipline] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const openAdd = () => { setForm(defaultForm()); setEditId(null); setShowModal(true); };
  const openEdit = (item: AsBuiltItem) => {
    setForm({ drawingNumber: item.drawingNumber, title: item.title, discipline: item.discipline, revision: item.revision, status: item.status, verifiedBy: item.verifiedBy, date: item.date, completion: item.completion });
    setEditId(item.id);
    setShowModal(true);
  };

  const save = () => {
    if (!form.drawingNumber || !form.title) return;
    if (editId) {
      setItems(prev => prev.map(it => {
        if (it.id !== editId) return it;
        const revHistory = it.revision !== form.revision ? [...it.revisionHistory, form.revision] : it.revisionHistory;
        return { ...it, ...form, revisionHistory: revHistory };
      }));
    } else {
      const newItem: AsBuiltItem = { ...form, id: uid(), revisionHistory: [form.revision] };
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
    if (filterDiscipline !== 'all' && it.discipline !== filterDiscipline) return false;
    if (filterStatus !== 'all' && it.status !== filterStatus) return false;
    if (search && !it.drawingNumber.toLowerCase().includes(search.toLowerCase()) && !it.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const avgCompletion = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.completion, 0) / items.length) : 0;
  const totalVerified = items.filter(i => i.status === 'verified').length;
  const totalInProgress = items.filter(i => i.status === 'in-progress').length;
  const totalPending = items.filter(i => i.status === 'pending').length;

  const exportCSV = () => {
    const rows = items.map(i => ({ 'Drawing No.': i.drawingNumber, Title: i.title, Discipline: i.discipline, Revision: i.revision, Status: i.status, 'Verified By': i.verifiedBy, Date: i.date, 'Completion %': i.completion, 'Revision History': i.revisionHistory.join(' → ') }));
    downloadCSV(rows, 'as-built-tracker');
  };

  const completionBarColor = (pct: number) => pct >= 80 ? C.ok : pct >= 50 ? C.warn : pct >= 20 ? '#f59e0b' : C.err;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 11: As-Built Tracker</h2>
            <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Track as-built drawing submissions, revisions, and verification</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnS} onClick={exportCSV}><Download size={14} /> Export CSV</button>
          <button style={btnP} onClick={openAdd}><Plus size={14} /> Add Drawing</button>
        </div>
      </div>

      {/* Overall Completion */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.tx }}>Overall Project Completion</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>{avgCompletion}%</span>
        </div>
        <div style={{ width: '100%', height: 12, background: C.bgD, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${avgCompletion}%`, height: '100%', background: C.grad, borderRadius: 6, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Drawings', value: items.length, color: C.primary, bg: C.infoBg },
          { label: 'Verified', value: totalVerified, color: C.ok, bg: C.okBg },
          { label: 'In Progress', value: totalInProgress, color: C.warn, bg: C.warnBg },
          { label: 'Pending', value: totalPending, color: C.tx3, bg: C.bgD },
        ].map((c, i) => (
          <div key={i} style={{ ...card, textAlign: 'center' as const, background: c.bg }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: C.tx3, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
        <div style={{ position: 'relative' as const, display: 'flex', alignItems: 'center' }}>
          <Filter size={14} style={{ position: 'absolute' as const, left: 10, color: C.tx3 }} />
          <input style={{ ...inp, paddingLeft: 32, minWidth: 200 }} placeholder="Search drawings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={sel} value={filterDiscipline} onChange={e => setFilterDiscipline(e.target.value)}>
          <option value="all">All Disciplines</option>
          {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={sel} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={empty}>
          <FileCheck size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>No as-built drawings yet. Click "Add Drawing" to start tracking.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' as const }}>
          <table style={tbl}>
            <thead>
              <tr>
                <th style={th}>Drawing No.</th>
                <th style={th}>Title</th>
                <th style={th}>Discipline</th>
                <th style={th}>Revision</th>
                <th style={th}>Status</th>
                <th style={th}>Verified By</th>
                <th style={th}>Date</th>
                <th style={th}>Completion</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td style={{ ...td, fontWeight: 600, color: C.primary }}>{item.drawingNumber}</td>
                  <td style={td}>{item.title}</td>
                  <td style={td}><span style={badge(C.purple, C.purple + '18')}>{item.discipline}</span></td>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: C.tx2 }}>
                      {item.revisionHistory.length > 1 ? item.revisionHistory.join(' → ') : item.revision}
                    </span>
                  </td>
                  <td style={td}><span style={statusBadge(item.status)}>{item.status}</span></td>
                  <td style={td}>{item.verifiedBy || '—'}</td>
                  <td style={{ ...td, fontSize: 12, color: C.tx3 }}>{item.date}</td>
                  <td style={{ ...td, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: C.bgD, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${item.completion}%`, height: '100%', background: completionBarColor(item.completion), borderRadius: 4, transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.tx2, minWidth: 32, textAlign: 'right' as const }}>{item.completion}%</span>
                    </div>
                  </td>
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
          <div style={{ ...card, width: 520, maxHeight: '90vh', overflowY: 'auto' as const, position: 'relative' as const }}>
            <button style={{ position: 'absolute' as const, top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: C.tx3 }} onClick={() => { setShowModal(false); setEditId(null); }}><X size={18} /></button>
            <h3 style={{ ...secTitle, marginTop: 0 }}>{editId ? 'Edit Drawing' : 'Add New Drawing'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Drawing Number *</label>
                <input style={inp} placeholder="e.g., STR-001" value={form.drawingNumber} onChange={e => setForm({ ...form, drawingNumber: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Title *</label>
                <input style={inp} placeholder="Drawing title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Discipline</label>
                <select style={sel} value={form.discipline} onChange={e => setForm({ ...form, discipline: e.target.value })}>
                  {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Revision</label>
                <input style={inp} placeholder="e.g., Rev A" value={form.revision} onChange={e => setForm({ ...form, revision: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Status</label>
                <select style={sel} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Verified By</label>
                <input style={inp} placeholder="Inspector name" value={form.verifiedBy} onChange={e => setForm({ ...form, verifiedBy: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Date</label>
                <input style={inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Completion: {form.completion}%</label>
                <input type="range" min={0} max={100} value={form.completion} onChange={e => setForm({ ...form, completion: Number(e.target.value) })} style={{ width: '100%', accentColor: C.primary }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button style={btnS} onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</button>
              <button style={btnP} onClick={save}>{editId ? 'Update' : 'Add Drawing'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
