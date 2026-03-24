import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Users, CreditCard, Building2, ClipboardList,
  Plus, Edit2, Trash2, Check, X, Shield, Crown, Star,
  ChevronRight, Clock, AlertTriangle, UserCheck, UserX,
  Save, RefreshCw, Search
} from 'lucide-react';
import type { Company, SaaSUser, UserRole, SubscriptionTier, AuditLog } from '../types';
import { ROLE_LABELS, TIER_INFO, STARTER_MODULES } from '../types';
import { C, card, btnP, btnS, btnD, btnSm, inp, sel, tbl, th, td, badge, secTitle, empty, statusBadge, uid, fmt } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

type TabId = 'team' | 'subscription' | 'company' | 'audit';

interface Props {
  company: Company;
  user: SaaSUser;
  onCompanyUpdate: (company: Company) => void;
  onBack: () => void;
}

const ROLE_COLORS: Record<UserRole, { bg: string; color: string }> = {
  'admin': { bg: '#ede9fe', color: '#7c3aed' },
  'project-manager': { bg: '#dbeafe', color: '#2563eb' },
  'engineer': { bg: '#ecfdf5', color: '#10b981' },
  'qs': { bg: '#fff7ed', color: '#f97316' },
  'site-manager': { bg: '#fef3c7', color: '#d97706' },
  'viewer': { bg: '#f1f5f9', color: '#64748b' },
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  'create': { bg: C.okBg, color: C.ok },
  'update': { bg: C.infoBg, color: C.info },
  'delete': { bg: C.errBg, color: C.err },
  'login': { bg: '#f3e8ff', color: C.purple },
  'logout': { bg: C.warnBg, color: C.warn },
};

const getActionColor = (action: string) => {
  const lower = action.toLowerCase();
  for (const key of Object.keys(ACTION_COLORS)) {
    if (lower.includes(key)) return ACTION_COLORS[key];
  }
  return { bg: C.infoBg, color: C.info };
};

const addAuditLog = (companyId: string, userId: string, userName: string, action: string, detail: string) => {
  const key = `planiq_audit_${companyId}`;
  const existing: AuditLog[] = JSON.parse(localStorage.getItem(key) || '[]');
  const entry: AuditLog = { id: uid(), userId, userName, action, detail, timestamp: new Date().toISOString() };
  existing.unshift(entry);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 200)));
};

const saveCompany = (company: Company) => {
  const companies: Company[] = JSON.parse(localStorage.getItem('planiq_companies') || '[]');
  const idx = companies.findIndex(c => c.id === company.id);
  if (idx >= 0) companies[idx] = company;
  else companies.push(company);
  localStorage.setItem('planiq_companies', JSON.stringify(companies));
};

export const AdminPanel: React.FC<Props> = ({ company, user, onCompanyUpdate, onBack }) => {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState<TabId>('team');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'viewer' as UserRole });
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>('viewer');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: company.name, industry: company.industry, country: company.country });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [companySaved, setCompanySaved] = useState(false);

  useEffect(() => {
    const key = `planiq_audit_${company.id}`;
    const logs: AuditLog[] = JSON.parse(localStorage.getItem(key) || '[]');
    setAuditLogs(logs.slice(0, 50));
  }, [company.id, activeTab]);

  useEffect(() => {
    setCompanyForm({ name: company.name, industry: company.industry, country: company.country });
  }, [company]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = useMemo(() => [
    { id: 'team', label: 'Team Management', icon: <Users size={16} />, count: company.users.length },
    { id: 'subscription', label: 'Subscription', icon: <CreditCard size={16} /> },
    { id: 'company', label: 'Company Settings', icon: <Building2 size={16} /> },
    { id: 'audit', label: 'Audit Trail', icon: <ClipboardList size={16} />, count: auditLogs.length },
  ], [company.users.length, auditLogs.length]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return company.users;
    const lower = searchTerm.toLowerCase();
    return company.users.filter(u =>
      u.name.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower) ||
      ROLE_LABELS[u.role].toLowerCase().includes(lower)
    );
  }, [company.users, searchTerm]);

  const handleAddUser = useCallback(() => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) return;
    if (company.users.length >= company.maxUsers) return;
    const u: SaaSUser = {
      id: uid(), name: newUser.name.trim(), email: newUser.email.trim(),
      password: newUser.password, role: newUser.role, avatar: '',
      createdAt: new Date().toISOString(), lastLogin: '', active: true,
    };
    const updated = { ...company, users: [...company.users, u] };
    saveCompany(updated);
    addAuditLog(company.id, user.id, user.name, 'create', `Added user ${u.name} (${ROLE_LABELS[u.role]})`);
    onCompanyUpdate(updated);
    setNewUser({ name: '', email: '', password: '', role: 'viewer' });
    setShowAddUser(false);
  }, [newUser, company, user, onCompanyUpdate]);

  const handleRoleChange = useCallback((userId: string, newRole: UserRole) => {
    const updated = {
      ...company,
      users: company.users.map(u => u.id === userId ? { ...u, role: newRole } : u),
    };
    const target = company.users.find(u => u.id === userId);
    saveCompany(updated);
    addAuditLog(company.id, user.id, user.name, 'update', `Changed ${target?.name}'s role to ${ROLE_LABELS[newRole]}`);
    onCompanyUpdate(updated);
    setEditingRoleId(null);
  }, [company, user, onCompanyUpdate]);

  const handleToggleActive = useCallback((userId: string) => {
    const target = company.users.find(u => u.id === userId);
    if (!target || userId === user.id) return;
    const updated = {
      ...company,
      users: company.users.map(u => u.id === userId ? { ...u, active: !u.active } : u),
    };
    saveCompany(updated);
    addAuditLog(company.id, user.id, user.name, 'update', `${target.active ? 'Deactivated' : 'Activated'} user ${target.name}`);
    onCompanyUpdate(updated);
  }, [company, user, onCompanyUpdate]);

  const handleDeleteUser = useCallback((userId: string) => {
    if (userId === user.id) return;
    const target = company.users.find(u => u.id === userId);
    const updated = { ...company, users: company.users.filter(u => u.id !== userId) };
    saveCompany(updated);
    addAuditLog(company.id, user.id, user.name, 'delete', `Removed user ${target?.name}`);
    onCompanyUpdate(updated);
    setDeleteConfirm(null);
  }, [company, user, onCompanyUpdate]);

  const handleTierChange = useCallback((tier: SubscriptionTier) => {
    const info = TIER_INFO[tier];
    const updated = {
      ...company,
      subscription: tier,
      maxUsers: info.maxUsers,
      maxProjects: info.maxProjects,
    };
    saveCompany(updated);
    addAuditLog(company.id, user.id, user.name, 'update', `Changed subscription to ${info.name}`);
    onCompanyUpdate(updated);
  }, [company, user, onCompanyUpdate]);

  const handleCompanySave = useCallback(() => {
    if (!companyForm.name.trim()) return;
    const updated = { ...company, name: companyForm.name.trim(), industry: companyForm.industry.trim(), country: companyForm.country.trim() };
    saveCompany(updated);
    addAuditLog(company.id, user.id, user.name, 'update', 'Updated company settings');
    onCompanyUpdate(updated);
    setCompanySaved(true);
    setTimeout(() => setCompanySaved(false), 2000);
  }, [companyForm, company, user, onCompanyUpdate]);

  const handleClearAudit = useCallback(() => {
    const key = `planiq_audit_${company.id}`;
    localStorage.setItem(key, '[]');
    addAuditLog(company.id, user.id, user.name, 'delete', 'Cleared audit log');
    setAuditLogs([]);
  }, [company.id, user]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const seatsUsed = company.users.length;
  const seatsMax = company.maxUsers;
  const seatPct = Math.round((seatsUsed / seatsMax) * 100);

  // ──────── TEAM TAB ────────
  const renderTeamTab = () => (
    <div>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: C.tx2, marginBottom: 4 }}>Seats Used</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 120, height: 8, background: C.bgD, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${seatPct}%`, height: '100%', background: seatPct >= 90 ? C.err : C.grad, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: seatPct >= 90 ? C.err : C.tx }}>
              {seatsUsed} of {seatsMax}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.tx3 }} />
            <input
              style={{ ...inp(), paddingLeft: 32, minWidth: 200 }}
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            style={{ ...btnP(), opacity: seatsUsed >= seatsMax ? 0.5 : 1, cursor: seatsUsed >= seatsMax ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => seatsUsed < seatsMax && setShowAddUser(!showAddUser)}
          >
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {seatsUsed >= seatsMax && (
        <div style={{ background: C.warnBg, border: `1px solid ${C.warn}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
          <AlertTriangle size={14} />
          All seats are filled. Upgrade your plan to add more users.
        </div>
      )}

      {/* Add User Form */}
      {showAddUser && (
        <div style={{ ...card, marginBottom: 20, border: `1px solid ${C.primary}22` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 14 }}>New Team Member</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              style={{ ...inp(), flex: 1, minWidth: 160 }}
              placeholder="Full name"
              value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
            />
            <input
              style={{ ...inp(), flex: 1, minWidth: 180 }}
              placeholder="Email address"
              type="email"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            />
            <input
              style={{ ...inp(), flex: 1, minWidth: 140 }}
              placeholder="Password"
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
            />
            <select
              style={{ ...sel(), minWidth: 150 }}
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ ...btnP(), ...btnSm() }} onClick={handleAddUser}>
                <Check size={14} />
              </button>
              <button style={{ ...btnS(), ...btnSm() }} onClick={() => { setShowAddUser(false); setNewUser({ name: '', email: '', password: '', role: 'viewer' }); }}>
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10 }}>
        <table style={tbl()}>
          <thead>
            <tr>
              <th style={th()}>User</th>
              <th style={th()}>Email</th>
              <th style={th()}>Role</th>
              <th style={th()}>Status</th>
              <th style={th()}>Last Login</th>
              <th style={{ ...th(), textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...td(), textAlign: 'center', padding: 30, color: C.tx3 }}>
                  {searchTerm ? 'No users match your search' : 'No team members yet'}
                </td>
              </tr>
            )}
            {filteredUsers.map(u => {
              const isMe = u.id === user.id;
              const rc = ROLE_COLORS[u.role];
              return (
                <tr key={u.id} style={{ background: isMe ? `${C.primary}06` : undefined }}>
                  <td style={td()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: isMe ? C.grad : `${rc.color}18`,
                        color: isMe ? '#fff' : rc.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.tx }}>{u.name}</div>
                        {isMe && <div style={{ fontSize: 11, color: C.primary, fontWeight: 500 }}>You</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td(), fontSize: 13, color: C.tx2 }}>{u.email}</td>
                  <td style={td()}>
                    {editingRoleId === u.id ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select
                          style={{ ...sel(), fontSize: 12, padding: '4px 8px' }}
                          value={editingRole}
                          onChange={e => setEditingRole(e.target.value as UserRole)}
                        >
                          {Object.entries(ROLE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ok, padding: 2 }}
                          onClick={() => handleRoleChange(u.id, editingRole)}
                        ><Check size={14} /></button>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.tx3, padding: 2 }}
                          onClick={() => setEditingRoleId(null)}
                        ><X size={14} /></button>
                      </div>
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600, background: rc.bg, color: rc.color,
                      }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    )}
                  </td>
                  <td style={td()}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: u.active ? C.okBg : C.errBg,
                      color: u.active ? C.ok : C.err,
                    }}>
                      {u.active ? <UserCheck size={11} /> : <UserX size={11} />}
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...td(), fontSize: 12, color: C.tx3 }}>
                    {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}
                  </td>
                  <td style={{ ...td(), textAlign: 'right' }}>
                    {!isMe && (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          style={{ background: 'none', border: `1px solid ${C.bdr}`, borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: C.tx2, display: 'flex', alignItems: 'center' }}
                          title="Edit role"
                          onClick={() => { setEditingRoleId(u.id); setEditingRole(u.role); }}
                        ><Edit2 size={13} /></button>
                        <button
                          style={{ background: 'none', border: `1px solid ${C.bdr}`, borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: u.active ? C.warn : C.ok, display: 'flex', alignItems: 'center' }}
                          title={u.active ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleActive(u.id)}
                        >{u.active ? <UserX size={13} /> : <UserCheck size={13} />}</button>
                        {deleteConfirm === u.id ? (
                          <>
                            <button
                              style={{ background: C.err, border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 600 }}
                              onClick={() => handleDeleteUser(u.id)}
                            >Confirm</button>
                            <button
                              style={{ background: 'none', border: `1px solid ${C.bdr}`, borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: C.tx3, display: 'flex', alignItems: 'center' }}
                              onClick={() => setDeleteConfirm(null)}
                            ><X size={13} /></button>
                          </>
                        ) : (
                          <button
                            style={{ background: 'none', border: `1px solid ${C.bdr}`, borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: C.err, display: 'flex', alignItems: 'center' }}
                            title="Delete user"
                            onClick={() => setDeleteConfirm(u.id)}
                          ><Trash2 size={13} /></button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ──────── SUBSCRIPTION TAB ────────
  const renderSubscriptionTab = () => {
    const currentTier = company.subscription;
    const currentInfo = TIER_INFO[currentTier];
    const tiers: SubscriptionTier[] = ['starter', 'professional', 'enterprise'];

    return (
      <div>
        {/* Current Plan Summary */}
        <div style={{ ...card, background: C.grad, color: '#fff', marginBottom: 24, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Current Plan</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{currentInfo.name}</div>
              <div style={{ fontSize: 15, opacity: 0.9 }}>{currentInfo.price}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Expires</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {company.subscriptionExpiry ? formatDate(company.subscriptionExpiry) : 'No expiry set'}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{company.users.length}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>of {currentInfo.maxUsers} users</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{currentInfo.modules}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>modules</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Comparison */}
        <div style={{ ...secTitle() }}>All Plans</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {tiers.map(tier => {
            const info = TIER_INFO[tier];
            const isCurrent = tier === currentTier;
            const tierIndex = tiers.indexOf(tier);
            const currentIndex = tiers.indexOf(currentTier);
            const isUpgrade = tierIndex > currentIndex;
            const tierIcon = tier === 'starter' ? <Star size={20} /> : tier === 'professional' ? <Shield size={20} /> : <Crown size={20} />;

            return (
              <div key={tier} style={{
                flex: '1 1 260px', minWidth: 260, maxWidth: 400,
                borderRadius: 14,
                border: isCurrent ? 'none' : `1px solid ${C.bdr}`,
                background: isCurrent ? '#fff' : C.bgW,
                boxShadow: isCurrent ? `0 0 0 2px transparent` : '0 1px 3px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {isCurrent && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 14, border: '2px solid transparent', backgroundImage: C.grad, backgroundOrigin: 'border-box', backgroundClip: 'border-box', WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', pointerEvents: 'none' }} />
                )}
                <div style={{ padding: 24 }}>
                  {isCurrent && (
                    <div style={{
                      display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                      background: C.grad, color: '#fff', fontSize: 11, fontWeight: 700,
                      marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      Current Plan
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: isCurrent ? C.grad : `${C.primary}10`,
                      color: isCurrent ? '#fff' : C.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {tierIcon}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.tx }}>{info.name}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.tx, marginBottom: 4 }}>{info.price}</div>

                  <div style={{ display: 'flex', gap: 16, margin: '14px 0', paddingBottom: 14, borderBottom: `1px solid ${C.bdr}` }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{info.maxUsers}</div>
                      <div style={{ fontSize: 11, color: C.tx3 }}>Users</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.purple }}>{info.maxProjects === 999 ? '∞' : info.maxProjects}</div>
                      <div style={{ fontSize: 11, color: C.tx3 }}>Projects</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.ok }}>{info.modules}</div>
                      <div style={{ fontSize: 11, color: C.tx3 }}>Modules</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    {info.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: C.tx2 }}>
                        <Check size={13} style={{ color: C.ok, flexShrink: 0 }} />
                        {f}
                      </div>
                    ))}
                  </div>

                  {!isCurrent && (
                    <button
                      style={{
                        ...(isUpgrade ? btnP() : btnS()),
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                      onClick={() => handleTierChange(tier)}
                    >
                      {isUpgrade ? 'Upgrade' : 'Downgrade'}
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ──────── COMPANY SETTINGS TAB ────────
  const renderCompanyTab = () => (
    <div style={{ maxWidth: 600 }}>
      <div style={{ ...card, padding: 28 }}>
        {/* Logo Placeholder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${C.bdr}` }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: C.grad, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, flexShrink: 0,
          }}>
            {getInitials(companyForm.name || 'CO')}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.tx }}>{companyForm.name || 'Company Name'}</div>
            <div style={{ fontSize: 13, color: C.tx3, marginTop: 2 }}>
              Member since {formatDate(company.createdAt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 6 }}>Company Name</label>
            <input
              style={inp()}
              value={companyForm.name}
              onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 6 }}>Industry</label>
            <input
              style={inp()}
              value={companyForm.industry}
              onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })}
              placeholder="e.g. Construction, Engineering"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 6 }}>Country</label>
            <input
              style={inp()}
              value={companyForm.country}
              onChange={e => setCompanyForm({ ...companyForm, country: e.target.value })}
              placeholder="e.g. United Kingdom"
            />
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ ...btnP(), display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleCompanySave}>
            <Save size={14} /> Save Changes
          </button>
          {companySaved && (
            <span style={{ fontSize: 13, color: C.ok, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} /> Saved successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ──────── AUDIT TRAIL TAB ────────
  const renderAuditTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, color: C.tx3 }}>
          Showing {auditLogs.length} most recent entries
        </div>
        <button
          style={{ ...btnD(), ...btnSm(), display: 'flex', alignItems: 'center', gap: 4, opacity: auditLogs.length === 0 ? 0.5 : 1 }}
          onClick={handleClearAudit}
          disabled={auditLogs.length === 0}
        >
          <Trash2 size={12} /> Clear Log
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 10 }}>
        <table style={tbl()}>
          <thead>
            <tr>
              <th style={th()}>Timestamp</th>
              <th style={th()}>User</th>
              <th style={th()}>Action</th>
              <th style={th()}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...td(), textAlign: 'center', padding: 40, color: C.tx3 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <ClipboardList size={28} style={{ color: C.tx3, opacity: 0.4 }} />
                    No audit entries recorded yet
                  </div>
                </td>
              </tr>
            )}
            {auditLogs.map(log => {
              const ac = getActionColor(log.action);
              return (
                <tr key={log.id}>
                  <td style={{ ...td(), fontSize: 12, color: C.tx3, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={11} />
                      {formatDateTime(log.timestamp)}
                    </div>
                  </td>
                  <td style={{ ...td(), fontSize: 13, fontWeight: 600, color: C.tx }}>
                    {log.userName}
                  </td>
                  <td style={td()}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700, background: ac.bg, color: ac.color,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ ...td(), fontSize: 13, color: C.tx2, maxWidth: 400 }}>
                    {log.detail}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Top Bar */}
      <div style={{ background: C.bgW, borderBottom: `1px solid ${C.bdr}`, padding: isMobile ? '12px 12px' : '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, flexWrap: 'wrap' }}>
          <button
            style={{ background: 'none', border: `1px solid ${C.bdr}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: C.tx2, display: 'flex', alignItems: 'center' }}
            onClick={onBack}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.tx }}>Admin Panel</div>
            <div style={{ fontSize: 12, color: C.tx3 }}>{company.name} • {TIER_INFO[company.subscription].name} Plan</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '12px 10px' : '20px 24px' }}>
        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.bdr}`, marginBottom: 24, overflowX: 'auto' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '12px 20px', fontSize: 13, fontWeight: 600,
                  color: isActive ? C.primary : C.tx3,
                  borderBottom: isActive ? '2px solid transparent' : '2px solid transparent',
                  backgroundImage: isActive ? C.grad : 'none',
                  backgroundClip: isActive ? 'text' : undefined,
                  WebkitBackgroundClip: isActive ? 'text' : undefined,
                  WebkitTextFillColor: isActive ? 'transparent' : undefined,
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 7,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span style={{
                    padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: isActive ? `${C.primary}15` : C.bgD,
                    color: isActive ? C.primary : C.tx3,
                  }}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div style={{
                    position: 'absolute', bottom: -1, left: 0, right: 0, height: 2,
                    background: C.grad, borderRadius: 1,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ ...card, padding: 24 }}>
          {activeTab === 'team' && renderTeamTab()}
          {activeTab === 'subscription' && renderSubscriptionTab()}
          {activeTab === 'company' && renderCompanyTab()}
          {activeTab === 'audit' && renderAuditTab()}
        </div>
      </div>
    </div>
  );
};
