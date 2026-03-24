import React, { useState } from 'react';
import { Menu, FileText, CheckCircle, Clock, Settings, X, Key, Image } from 'lucide-react';
import { C, btnP, inp } from '../utils/theme';
import { ModuleId, MODULES, Drawing } from '../types';

interface Props {
  projectName: string;
  onProjectNameChange: (n: string) => void;
  drawingCount: number;
  selectedCount: number;
  moduleStatuses: Record<ModuleId, 'not-started' | 'in-progress' | 'complete'>;
  apiKey: string;
  onApiKeyChange: (k: string) => void;
  onToggleSidebar: () => void;
  drawings: Drawing[];
  selectedDrawingIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isMobile?: boolean;
}

export const Header: React.FC<Props> = ({
  projectName, onProjectNameChange, drawingCount, selectedCount,
  moduleStatuses, apiKey, onApiKeyChange, onToggleSidebar,
  drawings, selectedDrawingIds, onSelectionChange, isMobile = false,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawingSel, setShowDrawingSel] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const complete = Object.values(moduleStatuses).filter(s => s === 'complete').length;
  const inProg = Object.values(moduleStatuses).filter(s => s === 'in-progress').length;
  const pct = Math.round((complete / 13) * 100);

  const toggleDrawing = (id: string) => {
    onSelectionChange(
      selectedDrawingIds.includes(id)
        ? selectedDrawingIds.filter(x => x !== id)
        : [...selectedDrawingIds, id]
    );
  };

  return (
    <>
      <header style={{
        height: isMobile ? 48 : 56, background: C.bgW, borderBottom: `1px solid ${C.bdr}`,
        display: 'flex', alignItems: 'center', padding: isMobile ? '0 8px' : '0 16px', gap: isMobile ? 6 : 12,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={onToggleSidebar} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          borderRadius: 6, display: 'flex',
        }}>
          <Menu size={isMobile ? 18 : 20} color={C.tx2} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
          <div style={{
            background: C.grad, borderRadius: isMobile ? 6 : 8,
            width: isMobile ? 26 : 32, height: isMobile ? 26 : 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: isMobile ? 11 : 14 }}>P</span>
          </div>
          {!isMobile && (
            <span style={{ fontWeight: 800, fontSize: 16, background: C.grad,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PlanIQ
            </span>
          )}
        </div>

        {!isMobile && <div style={{ width: 1, height: 24, background: C.bdr, margin: '0 4px' }} />}

        {!isMobile && (
          <input
            value={projectName} onChange={e => onProjectNameChange(e.target.value)}
            style={{
              border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600,
              color: C.tx, outline: 'none', width: 200,
            }}
            placeholder="Project Name"
          />
        )}

        <div style={{ flex: 1 }} />

        {/* Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 16, fontSize: 12, color: C.tx2 }}>
          <button onClick={() => setShowDrawingSel(true)} style={{
            display: 'flex', alignItems: 'center', gap: 4, background: C.infoBg,
            border: `1px solid #bfdbfe`, borderRadius: 6, padding: isMobile ? '3px 6px' : '4px 10px', cursor: 'pointer',
            fontSize: isMobile ? 11 : 12, color: C.primary, fontWeight: 600,
          }}>
            <Image size={isMobile ? 12 : 14} /> {selectedCount}/{drawingCount}
            {!isMobile && ' Drawings'}
          </button>

          {!isMobile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={14} color={C.ok} />
                <span>{complete} Done</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={14} color={C.warn} />
                <span>{inProg} Active</span>
              </div>
            </>
          )}

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: isMobile ? 50 : 80, height: 6, background: C.bgD, borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', background: C.grad,
                borderRadius: 3, transition: 'width 0.3s',
              }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: isMobile ? 11 : 12 }}>{pct}%</span>
          </div>
        </div>

        <button onClick={() => setShowSettings(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          borderRadius: 6, display: 'flex',
        }}>
          <Settings size={isMobile ? 16 : 18} color={apiKey ? C.tx2 : C.err} />
        </button>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.bgW, borderRadius: 16, padding: isMobile ? 16 : 24,
            width: 440, maxWidth: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} color={C.primary} /> API Settings
              </h3>
              <button onClick={() => setShowSettings(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              }}>
                <X size={18} color={C.tx3} />
              </button>
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 6, display: 'block' }}>
              Anthropic API Key
            </label>
            <input
              type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
              placeholder="sk-ant-..." style={{ ...inp, marginBottom: 16 }}
            />
            <p style={{ fontSize: 12, color: C.tx3, marginBottom: 16 }}>
              Required for AI analysis features. Uses Claude claude-sonnet-4-20250514 model.
            </p>
            <button onClick={() => { onApiKeyChange(keyInput); setShowSettings(false); }}
              style={btnP}>Save API Key</button>
          </div>
        </div>
      )}

      {/* Drawing Selector Modal */}
      {showDrawingSel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20,
        }} onClick={() => setShowDrawingSel(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.bgW, borderRadius: isMobile ? '16px 16px 0 0' : 16,
            padding: isMobile ? 16 : 24, width: 500,
            maxWidth: '100%', maxHeight: isMobile ? '80vh' : '80vh', overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Image size={18} color={C.primary} /> Select Drawings
              </h3>
              <button onClick={() => setShowDrawingSel(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
              }}>
                <X size={18} color={C.tx3} />
              </button>
            </div>
            {drawings.filter(d => !d.archived).length === 0 ? (
              <p style={{ textAlign: 'center', padding: 40, color: C.tx3 }}>No drawings uploaded yet. Go to Upload & Analyze to add drawings.</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => onSelectionChange(drawings.filter(d => !d.archived).map(d => d.id))}
                    style={{ fontSize: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Select All
                  </button>
                  <button onClick={() => onSelectionChange([])}
                    style={{ fontSize: 12, color: C.tx3, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Clear
                  </button>
                </div>
                {drawings.filter(d => !d.archived).map(d => (
                  <label key={d.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    background: selectedDrawingIds.includes(d.id) ? C.infoBg : 'transparent',
                    border: `1px solid ${selectedDrawingIds.includes(d.id) ? '#bfdbfe' : 'transparent'}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedDrawingIds.includes(d.id)}
                      onChange={() => toggleDrawing(d.id)}
                      style={{ accentColor: C.primary }}
                    />
                    {d.thumbnail && (
                      <img src={d.thumbnail} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: C.tx3 }}>v{d.version} · {d.uploadedAt}</div>
                    </div>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
