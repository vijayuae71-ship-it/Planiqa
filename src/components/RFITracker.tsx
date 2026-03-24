import React, { useState } from 'react';
import { MessageSquare, Plus, Edit2, Trash2, Download, Filter, ChevronDown, ChevronUp, Clock, X } from 'lucide-react';
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

interface RFIItem {
  id: string;
  number: string;
  subject: string;
  from: string;
  to: string;
  priority: string;
  status: string;
  dateSubmitted: string;
  dateRequired: string;
  dateResponded: string;
  response: string;
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'responded', 'closed'];

const defaultForm = (nextNum: string): Omit<RFIItem, 'id'> => ({
  number: nextNum,
  subject: '',
  from: '',
  to: '',
  priority: 'medium',
  status: 'open',
  dateSubmitted: new Date().toISOString().split('T')[0],
  dateRequired: '',
  dateResponded: '',
  response: '',
});

const priorityBadge = (priority: string): React.CSSProperties => {
  switch (priority) {
    case 'critical': return badge('#fff', C.err);
    case 'high': return badge('#fff', C.warn);
    case 'medium': return badge('#92400e', C.warnBg);
    case 'low': return badge('#fff', C.ok);
    default: return badge(C.tx2, C.bgD);
  }
};

export const RFITracker: React.FC<ModuleProps> = ({ onStatusChange }) => {
  const [items, setItems] = useState<RFIItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm('RFI-001'));
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nextNumber = () => {
    const nums = items.map(i => parseInt(i.number.replace('RFI-', ''), 10)).filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `RFI-${String(next).padStart(3, '0')}`;
  };

  const openAdd = () => { setForm(defaultForm(nextNumber())); setEditId(null); setShowModal(true); };
  const openEdit = (item: RFIItem) => {
    setForm({ number: item.number, subject: item.subject, from: item.from, to: item.to, priority: item.priority, status: item.status, dateSubmitted: item.dateSubmitted, dateRequired: item.dateRequired, dateResponded: item.dateResponded, response: item.response });
    setEditId(item.id);
    setShowModal(true);
  };

  const save = () => {
    if (!form.subject || !form.from || !form.to) return;
    if (editId) {
      setItems(prev => prev.map(it => it.id === editId ? { ...it, ...form } : it));
    } else {
      const newItem: RFIItem = { ...form, id: uid() };
      setItems(prev => {
        const next = [...prev, newItem];
        if (prev.length === 0) onStatusChange('in-progress');
        return next;
      });
    }
    setShowModal(false);
    setEditId(null);
  };

  const remove = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdue = items.filter(i => i.dateRequired && i.dateRequired < today && i.status !== 'closed').length;
  const openCount = items.filter(i => i.status === 'open').length;
  const respondedCount = items.filter(i => i.status === 'responded').length;

  const avgResponseTime = (() => {
    const responded = items.filter(i => i.dateResponded && i.dateSubmitted);
    if (responded.length === 0) return '—';
    const totalDays = responded.reduce((sum, i) => {
      const sub = new Date(i.dateSubmitted).getTime();
      const res = new Date(i.dateResponded).getTime();
      return sum + Math.max(0, Math.round((res - sub) / (1000 * 60 * 60 * 24)));
    }, 0);
    const avg = Math.round(totalDays / responded.length);
    return `${avg} day${avg !== 1 ? 's' : ''}`;
  })();

  const filtered = items.filter(it => {
    if (filterPriority !== 'all' && it.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && it.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!it.number.toLowerCase().includes(s) && !it.subject.toLowerCase().includes(s) && !it.from.toLowerCase().includes(s) && !it.to.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const rows = items.map(i => ({ Number: i.number, Subject: i.subject, From: i.from, To: i.to, Priority: i.priority, Status: i.status, Submitted: i.dateSubmitted, Required: i.dateRequired, Responded: i.dateResponded, Response: i.response }));
    downloadCSV(rows, 'rfi-tracker');
  };

  const exportPDF = () => {
    const sections: PDFSection[] = [];
    sections.push({
      type: 'keyvalue',
      title: 'Summary',
      items: [
        { label: 'Total RFIs', value: String(items.length) },
        { label: 'Open', value: String(openCount) },
        { label: 'Responded', value: String(respondedCount) },
        { label: 'Overdue', value: String(overdue) },
        { label: 'Avg Response Time', value: String(avgResponseTime) },
      ],
    });
    sections.push({
      type: 'table',
      title: 'RFI Log',
      headers: ['Number', 'Subject', 'From', 'To', 'Priority', 'Status', 'Submitted', 'Required', 'Responded', 'Response'],
      rows: items.map(i => [
        String(i.number ?? ''),
        String(i.subject ?? ''),
        String(i.from ?? ''),
        String(i.to ?? ''),
        String(i.priority ?? ''),
        String(i.status ?? ''),
        String(i.dateSubmitted ?? ''),
        String(i.dateRequired ?? ''),
        String(i.dateResponded ?? ''),
        String(i.response ?? ''),
      ]),
      summary: [
        { label: 'Total', value: String(items.length) },
        { label: 'Open', value: String(openCount) },
        { label: 'Overdue', value: String(overdue) },
      ],
    });
    generatePDF({
      title: 'RFI Tracker Report',
      module: 'Module 12: RFI Tracker',
      sections,
    });
  };

  const isOverdue = (item: RFIItem) => item.dateRequired && item.dateRequired < today && item.status !== 'closed';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 12: RFI Tracker</h2>
            <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Track Requests for Information, responses, and timelines</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportPDF} style={{ ...btnS, background: '#dc2626', color: '#fff', borderRadius: 6 }}>📄 PDF</button>
          <button style={btnS} onClick={exportCSV}><Download size={14} /> Export CSV</button>
          <button style={btnP} onClick={openAdd}><Plus size={14} /> Add RFI</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total RFIs', value: items.length, color: C.primary, bg: C.infoBg },
          { label: 'Open', value: openCount, color: C.warn, bg: C.warnBg },
          { label: 'Responded', value: respondedCount, color: C.ok, bg: C.okBg },
          { label: 'Overdue', value: overdue, color: C.err, bg: C.errBg },
          { label: 'Avg Response', value: avgResponseTime, color: C.primary, bg: C.infoBg, isText: true },
        ].map((c, i) => (
          <div key={i} style={{ ...card, textAlign: 'center' as const, background: c.bg }}>
            <div style={{ fontSize: (c as any).isText ? 16 : 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: C.tx3, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
        <div style={{ position: 'relative' as const, display: 'flex', alignItems: 'center' }}>
          <Filter size={14} style={{ position: 'absolute' as const, left: 10, color: C.tx3 }} />
          <input style={{ ...inp, paddingLeft: 32, minWidth: 200 }} placeholder="Search RFIs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={sel} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select style={sel} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={empty}>
          <MessageSquare size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>No RFIs yet. Click "Add RFI" to start tracking.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' as const }}>
          <table style={tbl}>
            <thead>
              <tr>
                <th style={th}></th>
                <th style={th}>Number</th>
                <th style={th}>Subject</th>
                <th style={th}>From</th>
                <th style={th}>To</th>
                <th style={th}>Priority</th>
                <th style={th}>Status</th>
                <th style={th}>Submitted</th>
                <th style={th}>Required</th>
                <th style={th}>Responded</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <React.Fragment key={item.id}>
                  <tr style={{ cursor: 'pointer', background: isOverdue(item) ? C.errBg : undefined }} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                    <td style={{ ...td, width: 30 }}>
                      {expandedId === item.id ? <ChevronUp size={14} color={C.tx3} /> : <ChevronDown size={14} color={C.tx3} />}
                    </td>
                    <td style={{ ...td, fontWeight: 600, color: C.primary }}>{item.number}</td>
                    <td style={{ ...td, maxWidth: 200, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{item.subject}</td>
                    <td style={td}>{item.from}</td>
                    <td style={td}>{item.to}</td>
                    <td style={td}><span style={priorityBadge(item.priority)}>{item.priority}</span></td>
                    <td style={td}>
                      <span style={statusBadge(item.status)}>{item.status}</span>
                      {isOverdue(item) && <span style={{ ...badge('#fff', C.err), marginLeft: 4, fontSize: 10 }}>OVERDUE</span>}
                    </td>
                    <td style={{ ...td, fontSize: 12, color: C.tx3 }}>{item.dateSubmitted}</td>
                    <td style={{ ...td, fontSize: 12, color: isOverdue(item) ? C.err : C.tx3, fontWeight: isOverdue(item) ? 600 : 400 }}>{item.dateRequired || '—'}</td>
                    <td style={{ ...td, fontSize: 12, color: C.tx3 }}>{item.dateResponded || '—'}</td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button style={{ ...btnSm, padding: '4px 8px' }} onClick={() => openEdit(item)}><Edit2 size={13} /></button>
                        <button style={{ ...btnD, padding: '4px 8px', fontSize: 12 }} onClick={() => remove(item.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr>
                      <td colSpan={11} style={{ padding: '12px 20px', background: C.bgD, borderBottom: `1px solid ${C.bdrL}` }}>
                        <div style={{ display: 'flex', gap: 20 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 6 }}>Response</div>
                            {item.response ? (
                              <p style={{ fontSize: 13, color: C.tx, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{item.response}</p>
                            ) : (
                              <p style={{ fontSize: 13, color: C.tx3, margin: 0, fontStyle: 'italic' }}>No response recorded yet. Edit this RFI to add a response.</p>
                            )}
                          </div>
                          <div style={{ minWidth: 160 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 6 }}>Timeline</div>
                            <div style={{ fontSize: 12, color: C.tx3 }}>
                              <div style={{ marginBottom: 4 }}>📤 Submitted: {item.dateSubmitted}</div>
                              <div style={{ marginBottom: 4 }}>📅 Required: {item.dateRequired || '—'}</div>
                              <div>✅ Responded: {item.dateResponded || '—'}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
            <h3 style={{ ...secTitle, marginTop: 0 }}>{editId ? 'Edit RFI' : 'Add New RFI'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>RFI Number</label>
                <input style={{ ...inp, background: C.bgD }} value={form.number} readOnly />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Subject *</label>
                <input style={inp} placeholder="RFI subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>From *</label>
                <input style={inp} placeholder="Requesting party" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>To *</label>
                <input style={inp} placeholder="Responding party" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Priority</label>
                <select style={sel} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Status</label>
                <select style={sel} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Date Submitted</label>
                <input style={inp} type="date" value={form.dateSubmitted} onChange={e => setForm({ ...form, dateSubmitted: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Date Required</label>
                <input style={inp} type="date" value={form.dateRequired} onChange={e => setForm({ ...form, dateRequired: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Date Responded</label>
                <input style={inp} type="date" value={form.dateResponded} onChange={e => setForm({ ...form, dateResponded: e.target.value })} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4, display: 'block' }}>Response</label>
              <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' as const }} placeholder="Enter response details..." value={form.response} onChange={e => setForm({ ...form, response: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button style={btnS} onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</button>
              <button style={btnP} onClick={save}>{editId ? 'Update' : 'Add RFI'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
