import React from 'react';

export const C = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  purple: '#7c3aed',
  purpleLight: '#8b5cf6',
  purpleDark: '#6d28d9',
  grad: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  gradR: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
  gradSubtle: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
  bg: '#f8fafc',
  bgW: '#ffffff',
  bgD: '#f1f5f9',
  tx: '#0f172a',
  tx2: '#475569',
  tx3: '#94a3b8',
  bdr: '#e2e8f0',
  bdrL: '#f1f5f9',
  ok: '#10b981',
  okBg: '#ecfdf5',
  warn: '#f59e0b',
  warnBg: '#fffbeb',
  err: '#ef4444',
  errBg: '#fef2f2',
  info: '#3b82f6',
  infoBg: '#eff6ff',
};

export const card: React.CSSProperties = {
  background: C.bgW, borderRadius: 12, border: `1px solid ${C.bdr}`,
  padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

export const btnP: React.CSSProperties = {
  background: C.grad, color: '#fff', border: 'none', borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
};

export const btnS: React.CSSProperties = {
  background: '#fff', color: C.primary, border: `1px solid ${C.bdr}`, borderRadius: 8,
  padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
};

export const btnD: React.CSSProperties = {
  background: C.errBg, color: C.err, border: `1px solid #fecaca`, borderRadius: 8,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

export const btnSm: React.CSSProperties = {
  ...btnS, padding: '6px 14px', fontSize: 13,
};

export const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: `1px solid ${C.bdr}`, borderRadius: 8,
  fontSize: 14, outline: 'none', transition: 'border-color 0.2s', background: '#fff', color: C.tx,
  boxSizing: 'border-box' as const,
};

export const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

export const tbl: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse' as const, fontSize: 13,
};

export const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left' as const, fontWeight: 600, fontSize: 11,
  textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: C.tx2,
  borderBottom: `2px solid ${C.bdr}`, background: C.bgD,
};

export const td: React.CSSProperties = {
  padding: '10px 12px', borderBottom: `1px solid ${C.bdrL}`, color: C.tx,
};

export const badge = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99,
  fontSize: 12, fontWeight: 600, color, background: bg,
});

export const secTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: C.tx, marginBottom: 16,
  display: 'flex', alignItems: 'center', gap: 8,
};

export const empty: React.CSSProperties = {
  textAlign: 'center' as const, padding: '60px 20px', color: C.tx3,
};

export const statusBadge = (s: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    pending: [C.warn, C.warnBg], submitted: [C.info, C.infoBg], reviewed: [C.purple, '#f5f3ff'],
    approved: [C.ok, C.okBg], rejected: [C.err, C.errBg], open: [C.info, C.infoBg],
    responded: [C.ok, C.okBg], closed: [C.tx3, C.bgD], 'in-progress': [C.primary, C.infoBg],
    verified: [C.ok, C.okBg], resolved: [C.ok, C.okBg], 'not-started': [C.tx3, C.bgD],
    complete: [C.ok, C.okBg], critical: [C.err, C.errBg], major: [C.warn, C.warnBg],
    minor: [C.info, C.infoBg], low: [C.ok, C.okBg], medium: [C.warn, C.warnBg],
    high: [C.err, C.errBg],
  };
  const [c, b] = map[s] || [C.tx2, C.bgD];
  return badge(c, b);
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
