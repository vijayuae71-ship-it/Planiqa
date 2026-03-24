import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Building2, Mail, Lock, User, Globe, Factory, ChevronDown, LogIn, UserPlus, ArrowRight, AlertCircle } from 'lucide-react';
import { Company, SaaSUser } from '../types';
import { C, uid, btnP, inp, sel } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

interface Props {
  onLogin: (company: Company, user: SaaSUser) => void;
}

const INDUSTRIES = ['Construction', 'Real Estate', 'Infrastructure', 'Industrial', 'Oil & Gas', 'Other'];
const COUNTRIES = ['UAE', 'India', 'Saudi Arabia', 'Qatar', 'Oman', 'Bahrain', 'Kuwait', 'UK', 'US', 'Singapore', 'Other'];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);

const seedDemoCompanies = (): Company[] => {
  const demos = [
    { name: 'L&T Construction', industry: 'Infrastructure', country: 'India', emailSlug: 'lnt' },
    { name: 'Sobha Realty', industry: 'Real Estate', country: 'UAE', emailSlug: 'sobha' },
    { name: 'Danube Properties', industry: 'Real Estate', country: 'UAE', emailSlug: 'danube' },
    { name: 'Nagarjuna Construction', industry: 'Infrastructure', country: 'India', emailSlug: 'nagarjuna' },
  ];

  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  return demos.map(d => {
    const adminId = uid();
    const admin: SaaSUser = {
      id: adminId,
      name: 'Admin',
      email: `admin@${d.emailSlug}.com`,
      password: 'demo123',
      role: 'admin',
      avatar: 'AD',
      createdAt: now,
      lastLogin: now,
      active: true,
    };
    return {
      id: uid(),
      name: d.name,
      logo: getInitials(d.name),
      industry: d.industry,
      country: d.country,
      subscription: 'professional' as const,
      subscriptionExpiry: expiry,
      maxUsers: 25,
      maxProjects: 15,
      users: [admin],
      createdAt: now,
    };
  });
};

const loadCompanies = (): Company[] => {
  try {
    const raw = localStorage.getItem('planiq_companies');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  const demo = seedDemoCompanies();
  localStorage.setItem('planiq_companies', JSON.stringify(demo));
  return demo;
};

export const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCompanyId, setLoginCompanyId] = useState('');

  // Register state
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regIndustry, setRegIndustry] = useState('');
  const [regCountry, setRegCountry] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    const loaded = loadCompanies();
    setCompanies(loaded);
    if (loaded.length > 0) setLoginCompanyId(loaded[0].id);
  }, []);

  const switchMode = useCallback((m: 'login' | 'register') => {
    setMode(m);
    setError('');
  }, []);

  const handleLogin = useCallback(() => {
    setError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter email and password');
      return;
    }
    if (!loginCompanyId) {
      setError('Please select a company');
      return;
    }
    const company = companies.find(c => c.id === loginCompanyId);
    if (!company) {
      setError('Company not found');
      return;
    }
    const user = company.users.find(
      u => u.email.toLowerCase() === loginEmail.trim().toLowerCase() && u.password === loginPassword
    );
    if (!user) {
      setError('Invalid email or password');
      return;
    }
    if (!user.active) {
      setError('Your account has been deactivated. Contact your admin.');
      return;
    }
    const updatedUser = { ...user, lastLogin: new Date().toISOString() };
    const updatedCompany = {
      ...company,
      users: company.users.map(u => (u.id === user.id ? updatedUser : u)),
    };
    const updatedCompanies = companies.map(c => (c.id === company.id ? updatedCompany : c));
    localStorage.setItem('planiq_companies', JSON.stringify(updatedCompanies));
    onLogin(updatedCompany, updatedUser);
  }, [loginEmail, loginPassword, loginCompanyId, companies, onLogin]);

  const handleRegister = useCallback(() => {
    setError('');
    if (!regCompanyName.trim()) { setError('Company name is required'); return; }
    if (!regIndustry) { setError('Please select an industry'); return; }
    if (!regCountry) { setError('Please select a country'); return; }
    if (!regAdminName.trim()) { setError('Admin name is required'); return; }
    if (!regEmail.trim()) { setError('Email is required'); return; }
    if (!regEmail.includes('@')) { setError('Please enter a valid email'); return; }
    if (regPassword.length < 4) { setError('Password must be at least 4 characters'); return; }

    const now = new Date().toISOString();
    const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const adminId = uid();

    const admin: SaaSUser = {
      id: adminId,
      name: regAdminName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      role: 'admin',
      avatar: getInitials(regAdminName.trim()),
      createdAt: now,
      lastLogin: now,
      active: true,
    };

    const newCompany: Company = {
      id: uid(),
      name: regCompanyName.trim(),
      logo: getInitials(regCompanyName.trim()),
      industry: regIndustry,
      country: regCountry,
      subscription: 'professional',
      subscriptionExpiry: expiry,
      maxUsers: 25,
      maxProjects: 15,
      users: [admin],
      createdAt: now,
    };

    const updatedCompanies = [...companies, newCompany];
    localStorage.setItem('planiq_companies', JSON.stringify(updatedCompanies));
    setCompanies(updatedCompanies);
    onLogin(newCompany, admin);
  }, [regCompanyName, regIndustry, regCountry, regAdminName, regEmail, regPassword, companies, onLogin]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px 12px 42px',
    background: C.bg,
    border: `1px solid ${C.bdr}`,
    borderRadius: 12,
    color: C.tx,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    paddingLeft: 42,
    appearance: 'none' as const,
    cursor: 'pointer',
  };

  const iconWrap: React.CSSProperties = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: C.tx3,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  };

  const chevronWrap: React.CSSProperties = {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: C.tx3,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: C.tx2,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  };

  const fieldWrap: React.CSSProperties = {
    position: 'relative',
    marginBottom: 16,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 12,
    background: active ? C.grad : 'transparent',
    border: 'none',
    borderRadius: 12,
    color: active ? '#ffffff' : C.tx3,
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.3s ease',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: 20,
    }}>
      {/* Decorative gradient circles */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
        top: '-20%', right: '-15%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
        bottom: '-15%', left: '-10%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 10, marginBottom: 28, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: C.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
          }}>
            <Building2 size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{
              fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1,
              background: C.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              PlanIQ
            </div>
            <div style={{ color: C.tx3, fontSize: 11, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Construction Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 24,
        border: `1px solid ${C.bdr}`,
        padding: 40,
        width: '100%',
        maxWidth: 440,
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: C.bg,
          borderRadius: 14,
          padding: 4,
          marginBottom: 28,
        }}>
          <button style={tabStyle(mode === 'login')} onClick={() => switchMode('login')}>
            <LogIn size={16} /> Sign In
          </button>
          <button style={tabStyle(mode === 'register')} onClick={() => switchMode('register')}>
            <UserPlus size={16} /> Register
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: C.errBg,
            border: `1px solid #fecaca`,
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: C.err,
            fontSize: 13,
            marginBottom: 16,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Company</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrap}><Building2 size={16} /></div>
                <select
                  style={selectStyle}
                  value={loginCompanyId}
                  onChange={e => setLoginCompanyId(e.target.value)}
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div style={chevronWrap}><ChevronDown size={16} /></div>
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Email</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrap}><Mail size={16} /></div>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="you@company.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrap}><Lock size={16} /></div>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            <button
              style={{
                width: '100%', padding: 14,
                background: C.grad, border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 8, transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
              }}
              onClick={handleLogin}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(37,99,235,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37,99,235,0.3)'; }}
            >
              Sign In <ArrowRight size={18} />
            </button>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <div style={{ color: C.tx3, fontSize: 12 }}>
                Demo: admin@lnt.com / demo123
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.tx2, fontSize: 13, marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Company Details
              </div>

              <div style={fieldWrap}>
                <div style={{ position: 'relative' }}>
                  <div style={iconWrap}><Building2 size={16} /></div>
                  <input
                    style={inputStyle}
                    placeholder="Company Name"
                    value={regCompanyName}
                    onChange={e => setRegCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ ...fieldWrap, flex: 1, minWidth: 140 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={iconWrap}><Factory size={16} /></div>
                    <select
                      style={selectStyle}
                      value={regIndustry}
                      onChange={e => setRegIndustry(e.target.value)}
                    >
                      <option value="">Industry</option>
                      {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                    <div style={chevronWrap}><ChevronDown size={16} /></div>
                  </div>
                </div>

                <div style={{ ...fieldWrap, flex: 1, minWidth: 140 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={iconWrap}><Globe size={16} /></div>
                    <select
                      style={selectStyle}
                      value={regCountry}
                      onChange={e => setRegCountry(e.target.value)}
                    >
                      <option value="">Country</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div style={chevronWrap}><ChevronDown size={16} /></div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ color: C.tx2, fontSize: 13, marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Admin Account
              </div>

              <div style={fieldWrap}>
                <div style={{ position: 'relative' }}>
                  <div style={iconWrap}><User size={16} /></div>
                  <input
                    style={inputStyle}
                    placeholder="Full Name"
                    value={regAdminName}
                    onChange={e => setRegAdminName(e.target.value)}
                  />
                </div>
              </div>

              <div style={fieldWrap}>
                <div style={{ position: 'relative' }}>
                  <div style={iconWrap}><Mail size={16} /></div>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="Email Address"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={fieldWrap}>
                <div style={{ position: 'relative' }}>
                  <div style={iconWrap}><Lock size={16} /></div>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="Password (min 4 characters)"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  />
                </div>
              </div>
            </div>

            <button
              style={{
                width: '100%', padding: 14,
                background: C.grad, border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 8, transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
              }}
              onClick={handleRegister}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(37,99,235,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37,99,235,0.3)'; }}
            >
              Create Company <ArrowRight size={18} />
            </button>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ color: C.tx3, fontSize: 12 }}>
                Professional tier • 25 users • 15 projects • 1 year
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        marginTop: 28,
        textAlign: 'center',
        color: C.tx3,
        fontSize: 12,
      }}>
        Powered by <span style={{
          fontWeight: 700,
          background: C.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Vijay</span>
      </div>
    </div>
  );
};

export default LoginScreen;
