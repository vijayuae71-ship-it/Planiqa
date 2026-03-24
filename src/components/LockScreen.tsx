import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { C } from '../utils/theme';
import { useResponsive } from '../utils/responsive';

interface Props { onAuth: () => void; }

export const LockScreen: React.FC<Props> = ({ onAuth }) => {
  const { isMobile } = useResponsive();
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.toLowerCase() === 'vijay') { onAuth(); }
    else { setError('Invalid access code'); setShake(true); setTimeout(() => setShake(false), 500); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc',
      padding: isMobile ? 16 : 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative gradient circles */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        top: '-15%', right: '-10%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        bottom: '-10%', left: '-5%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)',
        top: '40%', left: '60%', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420, width: '100%' }}>
        {/* Logo */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: C.grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 30px rgba(37,99,235,0.3)',
        }}>
          <Shield size={40} color="#fff" />
        </div>

        <h1 style={{
          fontSize: isMobile ? 32 : 42, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4,
          background: C.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>PlanIQ</h1>
        <p style={{ color: C.tx2, fontSize: 16, marginBottom: 40, fontWeight: 500 }}>
          AI Drawing Intelligence
        </p>

        <form onSubmit={submit} style={{
          background: '#ffffff',
          borderRadius: isMobile ? 12 : 16, padding: isMobile ? 20 : 32,
          border: `1px solid ${C.bdr}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          transform: shake ? 'translateX(-10px)' : 'none',
          transition: 'transform 0.1s',
          animation: shake ? 'shake 0.5s ease' : 'none',
        }}>
          <div style={{ marginBottom: 8, textAlign: 'left' }}>
            <label style={{ fontSize: 13, color: C.tx2, fontWeight: 600 }}>
              Access Code
            </label>
          </div>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
            }}>
              <Lock size={16} color={C.tx3} />
            </div>
            <input
              type={show ? 'text' : 'password'}
              value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              placeholder="Enter access code"
              autoFocus
              style={{
                width: '100%', padding: '12px 44px 12px 40px',
                background: C.bg, border: `1px solid ${C.bdr}`,
                borderRadius: 10, color: C.tx, fontSize: 15, outline: 'none',
                boxSizing: 'border-box' as const,
              }}
            />
            <button type="button" onClick={() => setShow(!show)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            }}>
              {show ? <EyeOff size={16} color={C.tx3} /> : <Eye size={16} color={C.tx3} />}
            </button>
          </div>

          {error && (
            <div style={{
              background: C.errBg, border: `1px solid #fecaca`,
              borderRadius: 8, padding: '8px 12px', marginBottom: 16,
              color: C.err, fontSize: 13, textAlign: 'left',
            }}>{error}</div>
          )}

          <button type="submit" style={{
            width: '100%', padding: '12px 24px',
            background: C.grad,
            border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
          }}>
            Unlock Platform
          </button>
        </form>

        <p style={{ color: C.tx3, fontSize: 12, marginTop: 32 }}>
          Powered by <span style={{
            fontWeight: 700,
            background: C.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Vijay</span>
        </p>
      </div>
    </div>
  );
};
