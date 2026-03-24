import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2, Users, FolderKanban, Crown, LogOut, Plus, X, MapPin, Calendar,
  DollarSign, FileText, ChevronRight, Shield, Briefcase, BarChart3, Sparkles,
  Clock, CheckCircle2, PauseCircle, Archive, Image as ImageIcon
} from 'lucide-react';
import { Company, SaaSUser, Project, ModuleId, TIER_INFO, ROLE_LABELS } from '../types';
import { C, card, btnP, btnS, btnD, btnSm, inp, sel, badge, secTitle, empty, statusBadge, uid, fmt } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

interface Props {
  company: Company;
  user: SaaSUser;
  onSelectProject: (project: Project) => void;
  onAdminPanel: () => void;
  onUsageBilling: () => void;
  onLogout: () => void;
}

const ALL_MODULES: ModuleId[] = [
  'upload', 'scope', 'bom', 'execution', 'bbs',
  'cost', 'compare', 'mto', 'submittal',
  'diary', 'asbuilt', 'rfi', 'punch'
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'QAR', label: 'QAR - Qatari Riyal' },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  active: { color: C.ok, bg: C.okBg, icon: <CheckCircle2 size={12} />, label: 'Active' },
  'on-hold': { color: C.warn, bg: C.warnBg, icon: <PauseCircle size={12} />, label: 'On Hold' },
  completed: { color: C.info, bg: C.infoBg, icon: <CheckCircle2 size={12} />, label: 'Completed' },
  archived: { color: C.tx3, bg: C.bgD, icon: <Archive size={12} />, label: 'Archived' },
};

const storageKey = (companyId: string) => `planiq_projects_${companyId}`;

export const CompanyDashboard: React.FC<Props> = ({ company, user, onSelectProject, onAdminPanel, onUsageBilling, onLogout }) => {
  const { isMobile } = useResponsive();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', client: '', location: '',
    startDate: '', endDate: '', budget: '', currency: 'USD',
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(company.id));
      if (raw) setProjects(JSON.parse(raw));
    } catch { /* empty */ }
  }, [company.id]);

  const saveProjects = useCallback((updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem(storageKey(company.id), JSON.stringify(updated));
  }, [company.id]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    team: company.users.length,
    tier: company.subscription,
  }), [projects, company]);

  const tierInfo = TIER_INFO[company.subscription];
  const isAdmin = user.role === 'admin' || user.role === 'project-manager';
  const daysUntilExpiry = Math.ceil((new Date(company.subscriptionExpiry).getTime() - Date.now()) / 86400000);

  const handleCreate = useCallback(() => {
    if (!form.name.trim() || !form.client.trim()) return;
    const moduleStatuses: Record<ModuleId, 'not-started' | 'in-progress' | 'complete'> = {} as any;
    ALL_MODULES.forEach(m => { moduleStatuses[m] = 'not-started'; });
    const newProject: Project = {
      id: uid(),
      name: form.name.trim(),
      description: form.description.trim(),
      client: form.client.trim(),
      location: form.location.trim(),
      status: 'active',
      startDate: form.startDate || new Date().toISOString().split('T')[0],
      endDate: form.endDate || '',
      budget: form.budget || '0',
      currency: form.currency,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      drawings: [],
      moduleStatuses,
    };
    saveProjects([...projects, newProject]);
    setForm({ name: '', description: '', client: '', location: '', startDate: '', endDate: '', budget: '', currency: 'USD' });
    setShowNewModal(false);
  }, [form, projects, saveProjects, user.id]);

  const getModuleProgress = useCallback((p: Project) => {
    const completed = ALL_MODULES.filter(m => p.moduleStatuses[m] === 'complete').length;
    return { completed, total: ALL_MODULES.length, pct: Math.round((completed / ALL_MODULES.length) * 100) };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Top Bar */}
      <div style={{
        background: C.bgW, borderBottom: `1px solid ${C.bdr}`,
        padding: isMobile ? '10px 12px' : '12px 24px', display: 'flex', alignItems: 'center',
        flexWrap: 'wrap', gap: isMobile ? 8 : 12, position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* PlanIQ Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: C.grad, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16,
          }}>P</div>
          <span style={{ fontWeight: 800, fontSize: 20, background: C.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PlanIQ
          </span>
        </div>

        {/* Company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: C.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {company.name.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 600, color: C.tx, fontSize: 14 }}>{company.name}</span>
        </div>

        {!isMobile && <div style={{ width: 1, height: 24, background: C.bdr }} />}

        {/* User */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: C.bgD,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 12, color: C.primary,
            }}>
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span style={{ fontWeight: 500, color: C.tx, fontSize: 14 }}>{user.name}</span>
            <span style={{
              ...badge, background: `${C.primary}14`, color: C.primary, fontSize: 11,
            }}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <button onClick={onAdminPanel} style={{
              ...btnSm, background: `${C.purple}10`, color: C.purple, border: `1px solid ${C.purple}30`,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}>
              <Shield size={14} /> {isMobile ? 'Admin' : 'Admin Panel'}
            </button>
          )}
          {isAdmin && (
            <button onClick={onUsageBilling} style={{
              ...btnSm, background: `${C.ok}10`, color: C.ok, border: `1px solid ${C.ok}30`,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}>
              📊 {isMobile ? 'Billing' : 'Usage & Billing'}
            </button>
          )}
          <button onClick={onLogout} style={{
            ...btnSm, background: `${C.err}10`, color: C.err, border: `1px solid ${C.err}30`,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 20px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: C.tx, margin: 0 }}>
            Welcome back, {user.name.split(' ')[0]} 👋
          </h1>
          <p style={{ color: C.tx2, margin: '4px 0 0', fontSize: 14 }}>
            Here's your company overview and projects dashboard.
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Projects', value: stats.total, icon: <FolderKanban size={20} />, color: C.primary, bg: C.infoBg },
            { label: 'Active Projects', value: stats.active, icon: <BarChart3 size={20} />, color: C.ok, bg: C.okBg },
            { label: 'Team Members', value: stats.team, icon: <Users size={20} />, color: C.purple, bg: '#f5f3ff' },
            { label: 'Subscription', value: tierInfo.name, icon: <Crown size={20} />, color: C.warn, bg: C.warnBg, isTier: true },
          ].map((s, i) => (
            <div key={i} style={{
              ...card, flex: '1 1 220px', minWidth: 200, padding: 20,
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.tx3, fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                {(s as any).isTier ? (
                  <span style={{
                    ...badge, background: C.grad, color: '#fff', fontWeight: 700, fontSize: 13, padding: '3px 10px',
                  }}>
                    {s.value}
                  </span>
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.tx }}>{s.value}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Subscription Banner */}
        <div style={{
          ...card, padding: 0, marginBottom: 24, overflow: 'hidden',
          background: C.grad, color: '#fff',
        }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Crown size={22} />
                <span style={{ fontSize: 20, fontWeight: 800 }}>{tierInfo.name} Plan</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>
                {tierInfo.price} • Up to {tierInfo.maxUsers} users • {tierInfo.maxProjects === 999 ? 'Unlimited' : tierInfo.maxProjects} projects • {tierInfo.modules} modules
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {tierInfo.features.slice(0, 4).map((f, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Expires: {fmt(company.subscriptionExpiry)}
              </div>
              {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: '3px 10px', display: 'inline-block', fontWeight: 600 }}>
                  ⚠️ {daysUntilExpiry} days remaining
                </div>
              )}
              {company.subscription !== 'enterprise' && (
                <button style={{
                  ...btnSm, marginTop: 8, background: '#fff', color: C.primary,
                  fontWeight: 700, border: 'none', cursor: 'pointer', padding: '8px 20px',
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Sparkles size={14} /> Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <h2 style={{ ...secTitle, margin: 0 }}>Your Projects</h2>
          {isAdmin && (
            <button onClick={() => setShowNewModal(true)} style={{
              ...btnP, display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', fontWeight: 700,
            }}>
              <Plus size={16} /> New Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div style={{ ...card, ...empty, padding: '60px 20px' }}>
            <FolderKanban size={48} style={{ color: C.tx3, marginBottom: 12 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: C.tx, marginBottom: 6 }}>No Projects Yet</div>
            <div style={{ color: C.tx2, fontSize: 14, marginBottom: 16 }}>
              Create your first project to get started with PlanIQ.
            </div>
            {isAdmin && (
              <button onClick={() => setShowNewModal(true)} style={{
                ...btnP, display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer',
              }}>
                <Plus size={16} /> Create First Project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {projects.map(project => {
              const progress = getModuleProgress(project);
              const stCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
              return (
                <div key={project.id} style={{
                  ...card, flex: isMobile ? '1 1 100%' : '1 1 340px',
                  maxWidth: isMobile ? '100%' : 'calc(33.333% - 11px)',
                  minWidth: isMobile ? 0 : 300, padding: 0, overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}>
                  {/* Card Header Accent */}
                  <div style={{ height: 4, background: C.grad }} />
                  <div style={{ padding: 20 }}>
                    {/* Title & Status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: C.tx, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {project.name}
                        </div>
                        <div style={{ fontSize: 13, color: C.tx2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Briefcase size={12} /> {project.client}
                        </div>
                      </div>
                      <span style={{
                        ...badge, background: stCfg.bg, color: stCfg.color,
                        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                        fontWeight: 600, fontSize: 11,
                      }}>
                        {stCfg.icon} {stCfg.label}
                      </span>
                    </div>

                    {/* Info Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {project.location && (
                        <div style={{ fontSize: 13, color: C.tx2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={13} style={{ color: C.tx3, flexShrink: 0 }} /> {project.location}
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: C.tx2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} style={{ color: C.tx3, flexShrink: 0 }} />
                        {fmt(project.startDate)}{project.endDate ? ` — ${fmt(project.endDate)}` : ' — Ongoing'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 13, color: C.tx2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <DollarSign size={13} style={{ color: C.tx3, flexShrink: 0 }} />
                          {project.currency} {Number(project.budget).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 13, color: C.tx2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ImageIcon size={13} style={{ color: C.tx3, flexShrink: 0 }} />
                          {project.drawings.length} drawing{project.drawings.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Module Progress */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.tx2 }}>Module Progress</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: progress.pct === 100 ? C.ok : C.primary }}>
                          {progress.completed}/{progress.total}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: C.bgD, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, transition: 'width 0.3s',
                          width: `${progress.pct}%`,
                          background: progress.pct === 100 ? C.ok : C.grad,
                        }} />
                      </div>
                    </div>

                    {/* Open Button */}
                    <button
                      onClick={() => onSelectProject(project)}
                      style={{
                        width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8,
                        background: C.grad, color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8, transition: 'opacity 0.15s',
                      }}
                    >
                      Open Project <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setShowNewModal(false)}>
          <div style={{
            ...card, width: '100%', maxWidth: 560, maxHeight: '90vh',
            overflow: 'auto', padding: 0,
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${C.bdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.tx }}>Create New Project</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: C.tx2 }}>Fill in the project details below</p>
              </div>
              <button onClick={() => setShowNewModal(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.bdr}`,
                background: C.bgW, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: C.tx2,
              }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                  Project Name <span style={{ color: C.err }}>*</span>
                </label>
                <input
                  style={inp}
                  placeholder="e.g. Downtown Tower Phase 2"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                  Description
                </label>
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' as const }}
                  placeholder="Brief project description..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                    Client <span style={{ color: C.err }}>*</span>
                  </label>
                  <input
                    style={inp}
                    placeholder="Client name"
                    value={form.client}
                    onChange={e => setForm({ ...form, client: e.target.value })}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                    Location
                  </label>
                  <input
                    style={inp}
                    placeholder="e.g. Dubai, UAE"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    style={inp}
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    style={inp}
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: '2 1 200px' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                    Budget
                  </label>
                  <input
                    type="number"
                    style={inp}
                    placeholder="0"
                    value={form.budget}
                    onChange={e => setForm({ ...form, budget: e.target.value })}
                  />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 6 }}>
                    Currency
                  </label>
                  <select
                    style={sel}
                    value={form.currency}
                    onChange={e => setForm({ ...form, currency: e.target.value })}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: `1px solid ${C.bdr}`,
              display: 'flex', justifyContent: 'flex-end', gap: 12,
            }}>
              <button onClick={() => setShowNewModal(false)} style={{ ...btnS, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || !form.client.trim()}
                style={{
                  ...btnP, cursor: form.name.trim() && form.client.trim() ? 'pointer' : 'not-allowed',
                  opacity: form.name.trim() && form.client.trim() ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Plus size={16} /> Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
