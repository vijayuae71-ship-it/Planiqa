import React, { useState, useMemo } from 'react';
import { FileCheck, Plus, Download, Edit3, Trash2, Search, X } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, btnD, inp, sel, tbl, th, td, statusBadge, secTitle, empty, uid, fmt } from '../utils/theme';
import { downloadCSV } from '../utils/export';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface Submittal {
  id: string;
  number: string;
  title: string;
  trade: string;
  type: string;
  status: string;
  submittedDate: string;
  requiredDate: string;
  reviewer: string;
  notes: string;
}

const TYPES = ['Shop Drawing', 'Product Data', 'Sample', 'Mock-up', 'Test Report'];
const STATUSES = ['pending', 'submitted', 'reviewed', 'approved', 'rejected'];
const WORKFLOW_STEPS = ['Pending', 'Submitted', 'Reviewed', 'Approved'];

const initialForm = (): Omit<Submittal, 'id' | 'number'> => ({
  title: '',
  trade: '',
  type: 'Shop Drawing',
  status: 'pending',
  submittedDate: new Date().toISOString().split('T')[0],
  requiredDate: '',
  reviewer: '',
  notes: '',
});

export const SubmittalLog: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [items, setItems] = useState<Submittal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [nextNum, setNextNum] = useState(1);

  const padNum = (n: number) => `SUB-${String(n).padStart(3, '0')}`;

  const openAdd = () => {
    setEditId(null);
    setForm(initialForm());
    setShowModal(true);
  };

  const openEdit = (item: Submittal) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      trade: item.trade,
      type: item.type,
      status: item.status,
      submittedDate: item.submittedDate,
      requiredDate: item.requiredDate,
      reviewer: item.reviewer,
      notes: item.notes,
    });
    setShowModal(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (editId) {
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...form } : i));
    } else {
      const newItem: Submittal = {
        id: uid(),
        number: padNum(nextNum),
        ...form,
      };
      setItems(prev => [...prev, newItem]);
      setNextNum(n => n + 1);
      if (items.length === 0) onStatusChange('in-progress');
    }
    setShowModal(false);
  };

  const remove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== 'All') list = list.filter(i => i.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        i.number.toLowerCase().includes(s) ||
        i.title.toLowerCase().includes(s) ||
        i.trade.toLowerCase().includes(s) ||
        i.reviewer.toLowerCase().includes(s)
      );
    }
    return list;
  }, [items, statusFilter, search]);

  const today = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
    overdue: items.filter(i => i.requiredDate && i.requiredDate < today && i.status !== 'approved' && i.status !== 'rejected').length,
  }), [items, today]);

  const getWorkflowStep = (status: string) => {
    const map: Record<string, number> = { pending: 0, submitted: 1, reviewed: 2, approved: 3, rejected: -1 };
    return map[status] ?? 0;
  };

  const exportCSV = () => {
    const rows = items.map(i => ({
      Number: i.number,
      Title: i.title,
      Trade: i.trade,
      Type: i.type,
      Status: i.status,
      'Submitted Date': i.submittedDate,
      'Required Date': i.requiredDate,
      Reviewer: i.reviewer,
      Notes: i.notes,
    }));
    downloadCSV(rows, 'submittal-log');
  };

  const setField = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };
  const modalBox: React.CSSProperties = {
    background: C.bgW, borderRadius: 12, padding: 24, width: '100%', maxWidth: 560,
    maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };
  const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 };
  const fieldWrap: React.CSSProperties = { marginBottom: 14 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileCheck size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 9: Submittal Log</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Track and manage project submittals</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, color: C.primary },
          { label: 'Pending', value: stats.pending, color: C.warn },
          { label: 'Approved', value: stats.approved, color: C.ok },
          { label: 'Overdue', value: stats.overdue, color: C.err },
        ].map((s, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.tx3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <button style={btnP} onClick={openAdd}><Plus size={15} /> Add Submittal</button>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.tx3 }} />
            <input style={{ ...inp, paddingLeft: 32 }} placeholder="Search submittals..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <select style={sel} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          {items.length > 0 && <button style={btnSm} onClick={exportCSV}><Download size={14} /> CSV</button>}
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Title</th>
                  <th style={th}>Trade</th>
                  <th style={th}>Type</th>
                  <th style={th}>Status</th>
                  <th style={th}>Workflow</th>
                  <th style={th}>Submitted</th>
                  <th style={th}>Required</th>
                  <th style={th}>Reviewer</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const step = getWorkflowStep(item.status);
                  const isOverdue = item.requiredDate && item.requiredDate < today && item.status !== 'approved' && item.status !== 'rejected';
                  return (
                    <tr key={item.id}>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{item.number}</td>
                      <td style={{ ...td, fontWeight: 500, maxWidth: 200 }}>{item.title}</td>
                      <td style={td}>{item.trade}</td>
                      <td style={{ ...td, fontSize: 12 }}>{item.type}</td>
                      <td style={td}><span style={statusBadge(item.status)}>{item.status}</span></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                          {item.status === 'rejected' ? (
                            <span style={{ fontSize: 11, color: C.err, fontWeight: 600 }}>✕ Rejected</span>
                          ) : (
                            WORKFLOW_STEPS.map((ws, wi) => (
                              <React.Fragment key={ws}>
                                <div style={{
                                  width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 700,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: wi <= step ? C.primary : C.bgD,
                                  color: wi <= step ? '#fff' : C.tx3,
                                }} title={ws}>
                                  {wi <= step ? '✓' : wi + 1}
                                </div>
                                {wi < WORKFLOW_STEPS.length - 1 && (
                                  <div style={{ width: 12, height: 2, background: wi < step ? C.primary : C.bdr }} />
                                )}
                              </React.Fragment>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, fontSize: 12 }}>{item.submittedDate}</td>
                      <td style={{ ...td, fontSize: 12, color: isOverdue ? C.err : C.tx, fontWeight: isOverdue ? 600 : 400 }}>
                        {item.requiredDate}{isOverdue && ' ⚠️'}
                      </td>
                      <td style={td}>{item.reviewer}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...btnSm, padding: '4px 8px' }} onClick={() => openEdit(item)} title="Edit"><Edit3 size={13} /></button>
                          <button style={{ ...btnD, padding: '4px 8px', fontSize: 12 }} onClick={() => remove(item.id)} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : items.length > 0 ? (
        <div style={{ ...card, ...empty }}>
          <p style={{ color: C.tx3 }}>No submittals match the current filter</p>
        </div>
      ) : (
        <div style={empty}>
          <FileCheck size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>No submittals yet. Click "Add Submittal" to get started.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.tx }}>{editId ? 'Edit Submittal' : 'New Submittal'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.tx3 }}><X size={20} /></button>
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Title *</label>
              <input style={inp} placeholder="Submittal title" value={form.title} onChange={e => setField('title', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Trade</label>
                <input style={inp} placeholder="e.g. Structural" value={form.trade} onChange={e => setField('trade', e.target.value)} />
              </div>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Type</label>
                <select style={sel} value={form.type} onChange={e => setField('type', e.target.value)}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Status</label>
              <select style={sel} value={form.status} onChange={e => setField('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Submitted Date</label>
                <input style={inp} type="date" value={form.submittedDate} onChange={e => setField('submittedDate', e.target.value)} />
              </div>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Required Date</label>
                <input style={inp} type="date" value={form.requiredDate} onChange={e => setField('requiredDate', e.target.value)} />
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Reviewer</label>
              <input style={inp} placeholder="Reviewer name" value={form.reviewer} onChange={e => setField('reviewer', e.target.value)} />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Notes</label>
              <textarea
                style={{ ...inp, minHeight: 60, resize: 'vertical' as const }}
                placeholder="Additional notes..."
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={btnS} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={btnP} onClick={save}>{editId ? 'Update' : 'Add'} Submittal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmittalLog;
