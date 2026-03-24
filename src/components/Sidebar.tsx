import React from 'react';
import {
  Upload, FileText, Package, Hammer, Construction, DollarSign,
  GitCompare, Layers, ClipboardList, BookOpen, Building, HelpCircle,
  CheckSquare, X
} from 'lucide-react';
import { C, statusBadge } from '../utils/theme';
import { ModuleId, MODULES } from '../types';

const ICONS: Record<ModuleId, React.ReactNode> = {
  upload: <Upload size={18} />, scope: <FileText size={18} />,
  bom: <Package size={18} />, execution: <Hammer size={18} />,
  bbs: <Construction size={18} />, cost: <DollarSign size={18} />,
  compare: <GitCompare size={18} />, mto: <Layers size={18} />,
  submittal: <ClipboardList size={18} />, diary: <BookOpen size={18} />,
  asbuilt: <Building size={18} />, rfi: <HelpCircle size={18} />,
  punch: <CheckSquare size={18} />,
};

interface Props {
  open: boolean;
  activeModule: ModuleId;
  onModuleChange: (m: ModuleId) => void;
  moduleStatuses: Record<ModuleId, 'not-started' | 'in-progress' | 'complete'>;
  onClose: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<Props> = ({ open, activeModule, onModuleChange, moduleStatuses, onClose, isMobile = false }) => {
  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {open && (
          <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60,
            transition: 'opacity 0.2s',
          }} />
        )}
        {/* Drawer */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 280, maxWidth: '85vw',
          background: C.bgW, borderRight: `1px solid ${C.bdr}`,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          zIndex: 70,
          display: 'flex', flexDirection: 'column',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
        }}>
          <div style={{
            padding: '16px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                background: C.grad, borderRadius: 8, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>P</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, background: C.grad,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                PlanIQ
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              borderRadius: 6, display: 'flex',
            }}>
              <X size={18} color={C.tx3} />
            </button>
          </div>

          <div style={{ padding: '4px 12px 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.tx3 }}>
              Modules
            </span>
          </div>

          <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px', WebkitOverflowScrolling: 'touch' }}>
            {MODULES.map(m => {
              const active = activeModule === m.id;
              const status = moduleStatuses[m.id];
              return (
                <button key={m.id} onClick={() => onModuleChange(m.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: active ? C.gradSubtle : 'transparent',
                    color: active ? C.primary : C.tx2,
                    fontWeight: active ? 600 : 400, fontSize: 14,
                    transition: 'all 0.15s', marginBottom: 2, textAlign: 'left',
                    borderLeft: active ? `3px solid ${C.primary}` : '3px solid transparent',
                  }}>
                  <span style={{ opacity: active ? 1 : 0.6, display: 'flex' }}>{ICONS[m.id]}</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.number}. {m.name}
                  </span>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: status === 'complete' ? C.ok : status === 'in-progress' ? C.warn : C.bdr,
                    flexShrink: 0,
                  }} />
                </button>
              );
            })}
          </nav>

          <div style={{
            padding: '12px 16px', borderTop: `1px solid ${C.bdr}`,
            fontSize: 11, color: C.tx3, textAlign: 'center',
          }}>
            Powered by <span style={{ fontWeight: 700, background: C.grad,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vijay</span>
          </div>
        </aside>
      </>
    );
  }

  // Desktop: inline sidebar
  return (
    <aside style={{
      width: open ? 260 : 0, minWidth: open ? 260 : 0,
      background: C.bgW, borderRight: `1px solid ${C.bdr}`,
      overflow: 'hidden', transition: 'all 0.2s ease',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{
        padding: '16px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.tx3 }}>
          Modules
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          borderRadius: 4, display: 'flex',
        }}>
          <X size={14} color={C.tx3} />
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {MODULES.map(m => {
          const active = activeModule === m.id;
          const status = moduleStatuses[m.id];
          return (
            <button key={m.id} onClick={() => onModuleChange(m.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? C.gradSubtle : 'transparent',
                color: active ? C.primary : C.tx2,
                fontWeight: active ? 600 : 400, fontSize: 13,
                transition: 'all 0.15s', marginBottom: 2, textAlign: 'left',
                borderLeft: active ? `3px solid ${C.primary}` : '3px solid transparent',
              }}>
              <span style={{ opacity: active ? 1 : 0.6, display: 'flex' }}>{ICONS[m.id]}</span>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {m.number}. {m.name}
              </span>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: status === 'complete' ? C.ok : status === 'in-progress' ? C.warn : C.bdr,
                flexShrink: 0,
              }} />
            </button>
          );
        })}
      </nav>

      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${C.bdr}`,
        fontSize: 11, color: C.tx3, textAlign: 'center',
      }}>
        Powered by <span style={{ fontWeight: 700, background: C.grad,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vijay</span>
      </div>
    </aside>
  );
};
