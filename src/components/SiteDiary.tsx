import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Download, Edit3, Trash2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, btnD, inp, sel, secTitle, empty, uid, fmt } from '../utils/theme';
import { downloadCSV } from '../utils/export';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface DiaryEntry {
  id: string;
  date: string;
  weather: string;
  temperature: string;
  workforceCount: number;
  activities: string;
  equipment: string;
  materialsReceived: string;
  delays: string;
  notes: string;
}

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Stormy', 'Hot', 'Cold'];
const WEATHER_EMOJI: Record<string, string> = {
  Sunny: '☀️', Cloudy: '☁️', Rainy: '🌧️', Windy: '💨', Stormy: '⛈️', Hot: '🌡️', Cold: '❄️',
};

const initialForm = (): Omit<DiaryEntry, 'id'> => ({
  date: new Date().toISOString().split('T')[0],
  weather: 'Sunny',
  temperature: '',
  workforceCount: 0,
  activities: '',
  equipment: '',
  materialsReceived: '',
  delays: '',
  notes: '',
});

export const SiteDiary: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm());
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openAdd = () => {
    setEditId(null);
    setForm(initialForm());
    setShowModal(true);
  };

  const openEdit = (entry: DiaryEntry) => {
    setEditId(entry.id);
    setForm({
      date: entry.date,
      weather: entry.weather,
      temperature: entry.temperature,
      workforceCount: entry.workforceCount,
      activities: entry.activities,
      equipment: entry.equipment,
      materialsReceived: entry.materialsReceived,
      delays: entry.delays,
      notes: entry.notes,
    });
    setShowModal(true);
  };

  const save = () => {
    if (!form.date) return;
    if (editId) {
      setEntries(prev => prev.map(e => e.id === editId ? { ...e, ...form } : e));
    } else {
      const newEntry: DiaryEntry = { id: uid(), ...form };
      setEntries(prev => [...prev, newEntry]);
      if (entries.length === 0) onStatusChange('in-progress');
    }
    setShowModal(false);
  };

  const remove = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filtered = useMemo(() => {
    let list = [...entries];
    // Date filter
    const now = new Date();
    if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const cutoff = weekAgo.toISOString().split('T')[0];
      list = list.filter(e => e.date >= cutoff);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const cutoff = monthAgo.toISOString().split('T')[0];
      list = list.filter(e => e.date >= cutoff);
    }
    // Search
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.date.includes(s) || e.weather.toLowerCase().includes(s) ||
        e.activities.toLowerCase().includes(s) || e.equipment.toLowerCase().includes(s) ||
        e.materialsReceived.toLowerCase().includes(s) || e.delays.toLowerCase().includes(s) ||
        e.notes.toLowerCase().includes(s)
      );
    }
    // Sort by date descending
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [entries, dateFilter, search]);

  const stats = useMemo(() => {
    const totalWorkforce = entries.reduce((s, e) => s + e.workforceCount, 0);
    const avgWorkforce = entries.length > 0 ? Math.round(totalWorkforce / entries.length) : 0;
    const delayDays = entries.filter(e => e.delays.trim().length > 0).length;
    return { totalEntries: entries.length, avgWorkforce, totalWorkforce, delayDays };
  }, [entries]);

  const exportCSV = () => {
    const rows = entries.map(e => ({
      Date: e.date,
      Weather: e.weather,
      Temperature: e.temperature,
      'Workforce Count': e.workforceCount,
      Activities: e.activities,
      Equipment: e.equipment,
      'Materials Received': e.materialsReceived,
      Delays: e.delays,
      Notes: e.notes,
    }));
    downloadCSV(rows, 'site-diary');
  };

  const setField = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };
  const modalBox: React.CSSProperties = {
    background: C.bgW, borderRadius: 12, padding: 24, width: '100%', maxWidth: 600,
    maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };
  const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: C.tx2, marginBottom: 4 };
  const fieldWrap: React.CSSProperties = { marginBottom: 14 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 10: Site Diary</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Daily site activities, weather, and workforce tracking</p>
        </div>
      </div>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Entries', value: stats.totalEntries, color: C.primary, icon: '📋' },
          { label: 'Avg Workforce', value: stats.avgWorkforce, color: C.purple, icon: '👷' },
          { label: 'Total Man-Days', value: stats.totalWorkforce, color: C.ok, icon: '📊' },
          { label: 'Delay Days', value: stats.delayDays, color: C.err, icon: '⚠️' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.tx3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <button style={btnP} onClick={openAdd}><Plus size={15} /> Add Entry</button>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.tx3 }} />
            <input style={{ ...inp, paddingLeft: 32 }} placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <select style={sel} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option value="all">All Entries</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          {entries.length > 0 && <button style={btnSm} onClick={exportCSV}><Download size={14} /> CSV</button>}
        </div>
      </div>

      {/* Entries */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {filtered.map(entry => {
            const isExpanded = expandedId === entry.id;
            const emoji = WEATHER_EMOJI[entry.weather] || '🌤️';
            return (
              <div key={entry.id} style={{ ...card, transition: 'all 0.2s' }}>
                {/* Card Header */}
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => toggleExpand(entry.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, background: C.gradSubtle,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>
                      {emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.tx }}>{formatDate(entry.date)}</div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: C.tx2 }}>{emoji} {entry.weather}</span>
                        {entry.temperature && <span style={{ fontSize: 12, color: C.tx2 }}>🌡️ {entry.temperature}</span>}
                        <span style={{ fontSize: 12, color: C.tx2 }}>👷 {entry.workforceCount} workers</span>
                        {entry.delays.trim() && <span style={{ fontSize: 12, color: C.err, fontWeight: 500 }}>⚠️ Delays noted</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      style={{ ...btnSm, padding: '4px 8px' }}
                      onClick={e => { e.stopPropagation(); openEdit(entry); }}
                      title="Edit"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      style={{ ...btnD, padding: '4px 8px', fontSize: 12 }}
                      onClick={e => { e.stopPropagation(); remove(entry.id); }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                    {isExpanded ? <ChevronUp size={18} color={C.tx3} /> : <ChevronDown size={18} color={C.tx3} />}
                  </div>
                </div>

                {/* Activities preview when collapsed */}
                {!isExpanded && entry.activities && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.bdrL}`, fontSize: 13, color: C.tx2, lineHeight: 1.5 }}>
                    {entry.activities.length > 150 ? entry.activities.substring(0, 150) + '...' : entry.activities}
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.bdrL}` }}>
                    {[
                      { label: '📋 Activities', value: entry.activities },
                      { label: '🏗️ Equipment', value: entry.equipment },
                      { label: '📦 Materials Received', value: entry.materialsReceived },
                      { label: '⚠️ Delays', value: entry.delays, isDelay: true },
                      { label: '📝 Notes', value: entry.notes },
                    ].filter(f => f.value?.trim()).map((field, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: field.isDelay ? C.err : C.tx2, marginBottom: 4 }}>{field.label}</div>
                        <div style={{
                          fontSize: 13, color: C.tx, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                          background: field.isDelay ? C.errBg : C.bg, padding: '8px 12px', borderRadius: 6,
                          border: field.isDelay ? `1px solid #fecaca` : `1px solid ${C.bdrL}`,
                        }}>
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : entries.length > 0 ? (
        <div style={{ ...card, ...empty }}>
          <p style={{ color: C.tx3 }}>No entries match the current filter</p>
        </div>
      ) : (
        <div style={empty}>
          <BookOpen size={40} style={{ color: C.tx3, marginBottom: 8 }} />
          <p style={{ color: C.tx3, margin: 0 }}>No diary entries yet. Click "Add Entry" to start recording.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.tx }}>{editId ? 'Edit Entry' : 'New Diary Entry'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.tx3 }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Date *</label>
                <input style={inp} type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
              </div>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Weather</label>
                <select style={sel} value={form.weather} onChange={e => setField('weather', e.target.value)}>
                  {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{WEATHER_EMOJI[w]} {w}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Temperature</label>
                <input style={inp} placeholder="e.g. 32°C" value={form.temperature} onChange={e => setField('temperature', e.target.value)} />
              </div>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Workforce Count</label>
                <input style={inp} type="number" min={0} value={form.workforceCount} onChange={e => setField('workforceCount', parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Activities</label>
              <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' as const }} placeholder="Describe today's activities..." value={form.activities} onChange={e => setField('activities', e.target.value)} />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Equipment</label>
              <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' as const }} placeholder="Equipment used on site..." value={form.equipment} onChange={e => setField('equipment', e.target.value)} />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Materials Received</label>
              <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' as const }} placeholder="Materials delivered today..." value={form.materialsReceived} onChange={e => setField('materialsReceived', e.target.value)} />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Delays</label>
              <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' as const }} placeholder="Any delays encountered..." value={form.delays} onChange={e => setField('delays', e.target.value)} />
            </div>

            <div style={fieldWrap}>
              <label style={fieldLabel}>Notes</label>
              <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' as const }} placeholder="Additional notes..." value={form.notes} onChange={e => setField('notes', e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={btnS} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={btnP} onClick={save}>{editId ? 'Update' : 'Add'} Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDiary;
