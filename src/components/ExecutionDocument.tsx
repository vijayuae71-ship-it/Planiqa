import React, { useState } from 'react';
import { FileText, Sparkles, Download, RefreshCw, X, CheckCircle2, Circle, ListOrdered, Network, ShieldCheck, HardHat, Zap } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, inp, tbl, th, td, badge, secTitle, empty, uid, fmt } from '../utils/theme';
import { callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { downloadTXT } from '../utils/export';
import { generatePDF, PDFSection } from '../utils/pdf';

interface Props {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

interface WBSItem {
  code: string;
  task: string;
  duration: string;
  predecessor: string;
  resources: string;
  deliverable: string;
}

interface ExecutionData {
  constructionSequence: { phase: string; activities: string[]; duration: string; keyStandards: string }[];
  wbs: WBSItem[];
  qcPlan: { activity: string; standard: string; testMethod: string; frequency: string; acceptanceCriteria: string }[];
  safetyPlan: { hazard: string; riskLevel: string; control: string; standard: string; ppe: string }[];
  commissioning: string[];
  clarificationsNeeded: { question: string; directedTo: string; priority: string; reason: string }[];
  assumptions: string[];
}

type TabKey = 'sequence' | 'wbs' | 'qc' | 'safety' | 'commissioning' | 'clarifications';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'sequence', label: 'Construction Sequence', icon: <ListOrdered size={14} /> },
  { key: 'wbs', label: 'WBS', icon: <Network size={14} /> },
  { key: 'qc', label: 'QC Plan', icon: <ShieldCheck size={14} /> },
  { key: 'safety', label: 'Safety Plan', icon: <HardHat size={14} /> },
  { key: 'commissioning', label: 'Commissioning', icon: <Zap size={14} /> },
  { key: 'clarifications', label: 'Clarifications & RFIs', icon: <FileText size={14} /> },
];

export const ExecutionDocument: React.FC<Props> = ({ drawings, selectedDrawingIds, apiKey, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ExecutionData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('sequence');
  const [commissioningChecks, setCommissioningChecks] = useState<Record<number, boolean>>({});

  const generate = async () => {
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the header first'); return; }
    setLoading(true);
    setError('');
    try {
      const systemPrompt = `You are a senior construction project planner (PMP/CIOB/PMI-SP certified, 25+ years experience) preparing execution plans for Tier-1 contractors (L&T, Sobha, Danube, Nagarjuna). Your execution document will be reviewed by project directors and client PMCs.

DRAWING ANALYSIS FIRST:
Before generating the plan, deeply analyze every element visible in the drawings:
- Building type, configuration, number of floors, structural system
- Foundation types visible, column grid layout
- Wall types, partition layouts, opening schedules
- MEP provisions, riser locations, service corridors
- Site access constraints, adjacent structures
- Any dimensions, annotations, notes, specifications marked on drawings

CONSTRUCTION SEQUENCE REQUIREMENTS:
- Generate 15-25 phases with detailed sub-activities per phase
- Each phase must include: phase name, key activities, estimated duration, applicable standards
- Follow logical construction methodology: Enabling Works → Substructure → Superstructure → MEP Rough-in → Envelope → Finishes → MEP Second Fix → Testing → Handover
- Duration estimates must be realistic based on project scale visible
- Reference IS/NBC/BS/ACI codes for methodology

WBS REQUIREMENTS:
- Generate 30-50+ WBS items with proper hierarchy (1.0, 1.1, 1.1.1 etc.)
- Include resources needed and deliverables for each task
- Predecessors must form a logical network (FS, SS, FF relationships)
- Duration based on crew productivity rates per CPWD norms

QC PLAN REQUIREMENTS:
- Each QC item must specify: Activity, Applicable Standard (IS/BS/ASTM code with clause), Test Method, Frequency, Acceptance Criteria
- Example: {"activity":"RCC Column Concrete","standard":"IS 456:2000 Cl. 15.2, IS 516:1959","testMethod":"Cube test (150mm) - 28 day compressive strength","frequency":"1 set of 6 cubes per 5 m³ or per pour, whichever is more","acceptanceCriteria":"Mean ≥ fck + 0.825×s, Individual ≥ fck - 3 N/mm²"}
- Cover: soil testing, concrete, rebar, masonry, waterproofing, MEP, finishes

SAFETY PLAN REQUIREMENTS:
- Each item must specify: Hazard, Risk Level (Critical/High/Medium/Low), Control Measure, Standard Reference, Required PPE
- Reference OSHA 29 CFR 1926, IS 3696, IS 4130, BOCW Act, local municipality requirements
- Include: excavation, formwork, working at height, crane operations, electrical, confined space, hot work

CLARIFICATIONS NEEDED (CRITICAL):
- List 10-20 questions that need answers from architects/engineers/consultants
- Group by: Structural Engineer, Architect, MEP Consultant, Geotechnical, Client
- Priority: Critical (blocks execution), High (affects cost/schedule), Medium (design clarification)
- Example: {"question":"Foundation design details and soil bearing capacity report required","directedTo":"Structural Engineer / Geotechnical","priority":"Critical","reason":"Cannot commence substructure without confirmed foundation design and SBC values"}

Return JSON object format:
{"constructionSequence":[{"phase":"Phase 1: Enabling Works & Site Preparation","activities":["Site clearing and demolition of existing structures","Temporary fencing, site office, and welfare facilities setup","Setting out and benchmarking per grid layout","Temporary utilities (water, power, drainage) connection","Environmental protection measures and tree protection"],"duration":"3-4 weeks","keyStandards":"IS 3764:1992/OSHA 1926.550"}],"wbs":[{"code":"1.0","task":"Enabling Works","duration":"4 weeks","predecessor":"-","resources":"Survey team, laborers, JCB, tipper","deliverable":"Site ready for construction"}],"qcPlan":[{"activity":"RCC Foundation Concrete","standard":"IS 456:2000 Cl. 15.2, IS 516:1959","testMethod":"Cube test 150mm - 28 day compressive strength","frequency":"1 set per 5 m³ or per pour","acceptanceCriteria":"Mean ≥ fck + 0.825×s"}],"safetyPlan":[{"hazard":"Fall from height during formwork","riskLevel":"Critical","control":"Full body harness with double lanyard, safety net below 6m, guardrails at all edges","standard":"IS 3696:1991, OSHA 1926.502","ppe":"Full body harness, hard hat, safety shoes, high-vis vest"}],"commissioning":["HVAC system testing and balancing per ASHRAE 111","Fire alarm and detection system testing per IS 2189","Lift installation testing per IS 14665","DG set load testing and synchronization"],"clarificationsNeeded":[{"question":"Structural design calculations and foundation details","directedTo":"Structural Engineer","priority":"Critical","reason":"Cannot proceed with substructure without confirmed structural design"}],"assumptions":["Soil bearing capacity assumed at 150 kN/m² pending geotechnical report","Water table assumed below foundation level","No contaminated soil conditions assumed"]}`;
      const userMsg = 'Generate a comprehensive, contract-grade execution document from these construction drawings. This document will be reviewed by project directors at Tier-1 firms. Analyze every element visible in the drawings. For EVERY activity: cite the applicable IS/BS/ASTM standard, provide realistic durations, and identify all clarifications needed from architects, structural engineers, and MEP consultants. List ALL assumptions made.';
      const result = await callClaude(apiKey, systemPrompt, userMsg, selected);
      const parsed = extractJSON(result);
      if (parsed._aiNote) { setError(parsed._aiNote); return; }
      setData({
        constructionSequence: parsed.constructionSequence || [],
        wbs: (parsed.wbs || []).map((w: any) => ({ ...w, resources: w.resources || '', deliverable: w.deliverable || '' })),
        qcPlan: parsed.qcPlan || [],
        safetyPlan: parsed.safetyPlan || [],
        commissioning: parsed.commissioning || [],
        clarificationsNeeded: parsed.clarificationsNeeded || [],
        assumptions: parsed.assumptions || []
      });
      setCommissioningChecks({});
      onStatusChange('complete');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCommissioning = (idx: number) => {
    setCommissioningChecks(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const exportPDF = () => {
    if (!data) return;
    const sections: PDFSection[] = [];
    if (data.assumptions && data.assumptions.length > 0) {
      sections.push({
        type: 'list',
        title: 'Key Assumptions',
        items: data.assumptions
      });
    }
    if (data.constructionSequence.length > 0) {
      sections.push({
        type: 'table',
        title: 'Construction Sequence',
        headers: ['#', 'Phase', 'Duration', 'Key Standards', 'Activities'],
        rows: data.constructionSequence.map((s: any, i: number) => [
          String(i + 1),
          String(typeof s === 'string' ? s : (s.phase ?? '')),
          String(typeof s === 'string' ? '' : (s.duration ?? '')),
          String(typeof s === 'string' ? '' : (s.keyStandards ?? '')),
          typeof s === 'string' ? '' : (s.activities || []).join('; ')
        ])
      });
    }
    if (data.wbs.length > 0) {
      sections.push({
        type: 'table',
        title: 'Work Breakdown Structure',
        headers: ['Code', 'Task', 'Duration', 'Predecessor', 'Resources', 'Deliverable'],
        rows: data.wbs.map(w => [
          String(w.code ?? ''),
          String(w.task ?? ''),
          String(w.duration ?? ''),
          String(w.predecessor ?? ''),
          String(w.resources ?? ''),
          String(w.deliverable ?? '')
        ])
      });
    }
    if (data.qcPlan.length > 0) {
      sections.push({
        type: 'table',
        title: 'Quality Control & Inspection Plan',
        headers: ['Activity', 'Standard', 'Test Method', 'Frequency', 'Acceptance Criteria'],
        rows: data.qcPlan.map((q: any) => [
          String(typeof q === 'string' ? q : (q.activity ?? '')),
          String(typeof q === 'string' ? '' : (q.standard ?? '')),
          String(typeof q === 'string' ? '' : (q.testMethod ?? '')),
          String(typeof q === 'string' ? '' : (q.frequency ?? '')),
          String(typeof q === 'string' ? '' : (q.acceptanceCriteria ?? ''))
        ])
      });
    }
    if (data.safetyPlan.length > 0) {
      sections.push({
        type: 'table',
        title: 'HSE Plan',
        headers: ['Hazard', 'Risk Level', 'Control Measure', 'Standard', 'PPE Required'],
        rows: data.safetyPlan.map((s: any) => [
          String(typeof s === 'string' ? s : (s.hazard ?? '')),
          String(typeof s === 'string' ? '' : (s.riskLevel ?? '')),
          String(typeof s === 'string' ? '' : (s.control ?? '')),
          String(typeof s === 'string' ? '' : (s.standard ?? '')),
          String(typeof s === 'string' ? '' : (s.ppe ?? ''))
        ])
      });
    }
    if (data.commissioning.length > 0) {
      sections.push({
        type: 'list',
        title: 'Commissioning Checklist',
        items: data.commissioning.map((c: any) => typeof c === 'string' ? c : JSON.stringify(c)),
        ordered: true
      });
    }
    if (data.clarificationsNeeded && data.clarificationsNeeded.length > 0) {
      sections.push({
        type: 'table',
        title: 'Clarifications & RFIs',
        headers: ['Priority', 'Directed To', 'Question', 'Reason'],
        rows: data.clarificationsNeeded.map((c: any) => [
          String(c.priority ?? ''),
          String(c.directedTo ?? ''),
          String(c.question ?? ''),
          String(c.reason ?? '')
        ])
      });
    }
    generatePDF({
      title: 'Execution Document',
      module: 'Execution Document',
      sections
    });
  };

  const exportTXT = () => {
    if (!data) return;
    let text = '=== EXECUTION DOCUMENT ===\n';
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += 'Prepared by: PlanIQ — AI Drawing Intelligence\n';
    text += '='.repeat(60) + '\n\n';

    if (data.assumptions && data.assumptions.length > 0) {
      text += '--- KEY ASSUMPTIONS ---\n\n';
      data.assumptions.forEach((a: string, i: number) => { text += `  ${i + 1}. ${a}\n`; });
      text += '\n';
    }

    text += '--- CONSTRUCTION SEQUENCE ---\n\n';
    data.constructionSequence.forEach((s: any, i: number) => {
      if (typeof s === 'string') { text += `  ${s}\n`; }
      else {
        text += `  Phase ${i + 1}: ${s.phase || ''} [${s.duration || ''}]\n`;
        text += `  Standards: ${s.keyStandards || 'N/A'}\n`;
        (s.activities || []).forEach((a: string, j: number) => { text += `    ${j + 1}. ${a}\n`; });
        text += '\n';
      }
    });

    text += '\n--- WORK BREAKDOWN STRUCTURE ---\n\n';
    text += '  Code      | Task                         | Duration     | Predecessor  | Resources\n';
    text += '  ' + '-'.repeat(100) + '\n';
    data.wbs.forEach(w => {
      text += `  ${w.code.padEnd(10)}| ${w.task.padEnd(29)}| ${w.duration.padEnd(13)}| ${w.predecessor.padEnd(13)}| ${w.resources || ''}\n`;
    });

    text += '\n--- QUALITY CONTROL & INSPECTION PLAN ---\n\n';
    data.qcPlan.forEach((q: any, i: number) => {
      if (typeof q === 'string') { text += `  ${i + 1}. ${q}\n`; }
      else {
        text += `  ${i + 1}. ${q.activity || ''}\n`;
        text += `     Standard: ${q.standard || 'N/A'}\n`;
        text += `     Test: ${q.testMethod || 'N/A'} | Frequency: ${q.frequency || 'N/A'}\n`;
        text += `     Acceptance: ${q.acceptanceCriteria || 'N/A'}\n\n`;
      }
    });

    text += '\n--- HSE PLAN ---\n\n';
    data.safetyPlan.forEach((s: any, i: number) => {
      if (typeof s === 'string') { text += `  ${i + 1}. ${s}\n`; }
      else {
        text += `  ${i + 1}. HAZARD: ${s.hazard || ''} [Risk: ${s.riskLevel || ''}]\n`;
        text += `     Control: ${s.control || 'N/A'}\n`;
        text += `     Standard: ${s.standard || 'N/A'} | PPE: ${s.ppe || 'N/A'}\n\n`;
      }
    });

    text += '\n--- COMMISSIONING CHECKLIST ---\n\n';
    data.commissioning.forEach((c: any, i: number) => {
      const checked = commissioningChecks[i] ? '✓' : '☐';
      text += `  ${checked} ${typeof c === 'string' ? c : JSON.stringify(c)}\n`;
    });

    if (data.clarificationsNeeded && data.clarificationsNeeded.length > 0) {
      text += '\n--- CLARIFICATIONS & RFIs ---\n\n';
      data.clarificationsNeeded.forEach((c: any, i: number) => {
        text += `  ${i + 1}. [${c.priority}] To: ${c.directedTo}\n`;
        text += `     Q: ${c.question}\n`;
        text += `     Reason: ${c.reason}\n\n`;
      });
    }

    downloadTXT(text, 'execution-document.txt');
  };

  const tabStyle = (key: TabKey): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: activeTab === key ? 600 : 400,
    color: activeTab === key ? C.primary : C.tx3,
    background: activeTab === key ? C.infoBg : 'transparent',
    border: 'none',
    borderBottom: activeTab === key ? `2px solid ${C.primary}` : '2px solid transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap'
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 4 — Execution Document</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Comprehensive construction execution planning</p>
        </div>
      </div>

      {error && (
        <div style={{ background: C.errBg, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.err, fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <X size={14} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}

      {!data && !loading && (
        <div style={empty}>
          <FileText size={40} color={C.tx3} style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 600, color: C.tx }}>No execution document generated yet</p>
          <p style={{ fontSize: 13, color: C.tx3, marginBottom: 16 }}>Generate sequence, WBS, QC, safety, and commissioning plans</p>
          <button onClick={generate} style={btnP}>
            <Sparkles size={14} />
            <span style={{ marginLeft: 6 }}>Generate Execution Plan</span>
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is generating execution document...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-end' }}>
            <button onClick={generate} style={btnS}>
              <RefreshCw size={14} />
              <span style={{ marginLeft: 4 }}>Regenerate</span>
            </button>
            <button onClick={exportPDF} style={{ ...btnS, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>📄 PDF</button>
            <button onClick={exportTXT} style={btnS}>
              <Download size={14} />
              <span style={{ marginLeft: 4 }}>Export TXT</span>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.bdr}`, marginBottom: 20, overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={tabStyle(tab.key)}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'sequence' && (
            <div style={card}>
              <h3 style={secTitle}>
                <ListOrdered size={16} />
                Construction Sequence
              </h3>
              {data.assumptions && data.assumptions.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fbbf2433', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⚠️ KEY ASSUMPTIONS</div>
                  {data.assumptions.map((a: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>• {a}</div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.constructionSequence.map((phase: any, i: number) => {
                  const phaseStr = typeof phase === 'string' ? phase : null;
                  const phaseObj = typeof phase === 'object' && phase !== null ? phase : null;
                  return (
                    <div key={i} style={{ padding: '14px 16px', background: i % 2 === 0 ? C.bgD : '#fff', borderRadius: 10, border: `1px solid ${C.bdr}` }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.tx, marginBottom: 4 }}>
                            {phaseStr ? phaseStr.replace(/^\d+\.\s*/, '') : (phaseObj?.phase || '')}
                          </div>
                          {phaseObj?.duration && (
                            <span style={{ display: 'inline-block', background: C.infoBg, color: C.primary, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>⏱ {phaseObj.duration}</span>
                          )}
                          {phaseObj?.keyStandards && (
                            <span style={{ display: 'inline-block', background: '#f3f0ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, marginLeft: 6 }}>📋 {phaseObj.keyStandards}</span>
                          )}
                          {phaseObj?.activities && (
                            <div style={{ marginTop: 6 }}>
                              {phaseObj.activities.map((act: string, j: number) => (
                                <div key={j} style={{ fontSize: 12, color: C.tx2, lineHeight: 1.8, paddingLeft: 8, borderLeft: `2px solid ${C.primary}22` }}>
                                  {j + 1}. {act}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'wbs' && (
            <div style={card}>
              <h3 style={secTitle}>
                <Network size={16} />
                Work Breakdown Structure ({data.wbs.length} tasks)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={th}>Code</th>
                      <th style={{ ...th, minWidth: 200 }}>Task</th>
                      <th style={th}>Duration</th>
                      <th style={th}>Predecessor</th>
                      <th style={{ ...th, minWidth: 140 }}>Resources</th>
                      <th style={{ ...th, minWidth: 140 }}>Deliverable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.wbs.map((item, i) => {
                      const isParent = item.code && !item.code.includes('.') || (item.code.split('.').length <= 2 && item.code.endsWith('.0'));
                      return (
                        <tr key={i} style={{ background: isParent ? C.bgD : 'transparent' }}>
                          <td style={td}>
                            <span style={{ fontFamily: 'monospace', fontWeight: isParent ? 700 : 600, color: C.primary }}>{item.code}</span>
                          </td>
                          <td style={{ ...td, fontWeight: isParent ? 700 : 500, paddingLeft: isParent ? 8 : 20 }}>{item.task}</td>
                          <td style={td}>
                            <span style={badge(C.purple, '#f3f0ff')}>{item.duration}</span>
                          </td>
                          <td style={{ ...td, fontFamily: 'monospace', color: C.tx3, fontSize: 12 }}>{item.predecessor}</td>
                          <td style={{ ...td, fontSize: 12, color: C.tx2 }}>{item.resources || '—'}</td>
                          <td style={{ ...td, fontSize: 12, color: C.tx2 }}>{item.deliverable || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'qc' && (
            <div style={card}>
              <h3 style={secTitle}>
                <ShieldCheck size={16} />
                Quality Control & Inspection Plan ({data.qcPlan.length} items)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={{ ...th, minWidth: 140 }}>Activity</th>
                      <th style={{ ...th, minWidth: 140 }}>Standard / Code</th>
                      <th style={{ ...th, minWidth: 140 }}>Test Method</th>
                      <th style={th}>Frequency</th>
                      <th style={{ ...th, minWidth: 140 }}>Acceptance Criteria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.qcPlan.map((item: any, i: number) => {
                      const isStr = typeof item === 'string';
                      return (
                        <tr key={i}>
                          <td style={{ ...td, color: C.tx3, fontSize: 12 }}>{i + 1}</td>
                          <td style={{ ...td, fontWeight: 600, fontSize: 13 }}>{isStr ? item : (item.activity || '')}</td>
                          <td style={{ ...td, fontSize: 12, color: C.primary, fontFamily: 'monospace' }}>{isStr ? '' : (item.standard || '—')}</td>
                          <td style={{ ...td, fontSize: 12 }}>{isStr ? '' : (item.testMethod || '—')}</td>
                          <td style={{ ...td, fontSize: 12 }}>{isStr ? '' : (item.frequency || '—')}</td>
                          <td style={{ ...td, fontSize: 12, fontWeight: 500 }}>{isStr ? '' : (item.acceptanceCriteria || '—')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div style={card}>
              <h3 style={secTitle}>
                <HardHat size={16} />
                Health, Safety & Environment Plan ({data.safetyPlan.length} items)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={{ ...th, minWidth: 130 }}>Hazard</th>
                      <th style={th}>Risk</th>
                      <th style={{ ...th, minWidth: 160 }}>Control Measure</th>
                      <th style={{ ...th, minWidth: 120 }}>Standard</th>
                      <th style={{ ...th, minWidth: 120 }}>PPE Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.safetyPlan.map((item: any, i: number) => {
                      const isStr = typeof item === 'string';
                      const riskColor = !isStr && item.riskLevel === 'Critical' ? C.err : !isStr && item.riskLevel === 'High' ? '#ea580c' : !isStr && item.riskLevel === 'Medium' ? C.warn : C.ok;
                      const riskBg = !isStr && item.riskLevel === 'Critical' ? C.errBg : !isStr && item.riskLevel === 'High' ? '#fff7ed' : !isStr && item.riskLevel === 'Medium' ? C.warnBg : C.okBg;
                      return (
                        <tr key={i}>
                          <td style={{ ...td, color: C.tx3, fontSize: 12 }}>{i + 1}</td>
                          <td style={{ ...td, fontWeight: 600, fontSize: 13 }}>{isStr ? item : (item.hazard || '')}</td>
                          <td style={td}>{!isStr && item.riskLevel ? <span style={badge(riskColor, riskBg)}>{item.riskLevel}</span> : '—'}</td>
                          <td style={{ ...td, fontSize: 12 }}>{isStr ? '' : (item.control || '—')}</td>
                          <td style={{ ...td, fontSize: 11, color: C.primary, fontFamily: 'monospace' }}>{isStr ? '' : (item.standard || '—')}</td>
                          <td style={{ ...td, fontSize: 12 }}>{isStr ? '' : (item.ppe || '—')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'commissioning' && (
            <div style={card}>
              <h3 style={secTitle}>
                <Zap size={16} />
                Commissioning Checklist
              </h3>
              <div style={{ marginBottom: 12, fontSize: 13, color: C.tx3 }}>
                {Object.values(commissioningChecks).filter(Boolean).length} of {data.commissioning.length} items completed
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: C.bgD, borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${data.commissioning.length > 0 ? (Object.values(commissioningChecks).filter(Boolean).length / data.commissioning.length) * 100 : 0}%`,
                  background: C.grad,
                  borderRadius: 3,
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.commissioning.map((item, i) => {
                  const checked = !!commissioningChecks[i];
                  return (
                    <div
                      key={i}
                      onClick={() => toggleCommissioning(i)}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px',
                        background: checked ? C.okBg : (i % 2 === 0 ? C.bgD : 'transparent'),
                        borderRadius: 8, cursor: 'pointer',
                        border: checked ? `1px solid ${C.ok}33` : '1px solid transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      {checked ? (
                        <CheckCircle2 size={18} color={C.ok} style={{ marginTop: 1, flexShrink: 0 }} />
                      ) : (
                        <Circle size={18} color={C.tx3} style={{ marginTop: 1, flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: 13, lineHeight: 1.6, color: checked ? C.ok : C.tx,
                        textDecoration: checked ? 'line-through' : 'none'
                      }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'clarifications' && data.clarificationsNeeded && (
            <div style={card}>
              <h3 style={secTitle}>
                <FileText size={16} />
                Clarifications & RFIs for Consultants ({data.clarificationsNeeded.length} items)
              </h3>
              <div style={{ background: '#fef3c7', border: '1px solid #fbbf2433', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                ⚠️ These questions MUST be resolved before proceeding with detailed execution planning. Share with respective consultants immediately.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>Priority</th>
                      <th style={{ ...th, minWidth: 120 }}>Directed To</th>
                      <th style={{ ...th, minWidth: 250 }}>Question / Clarification</th>
                      <th style={{ ...th, minWidth: 180 }}>Reason / Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clarificationsNeeded.map((item: any, i: number) => {
                      const pColor = item.priority === 'Critical' ? C.err : item.priority === 'High' ? '#ea580c' : C.warn;
                      const pBg = item.priority === 'Critical' ? C.errBg : item.priority === 'High' ? '#fff7ed' : C.warnBg;
                      return (
                        <tr key={i}>
                          <td style={{ ...td, color: C.tx3, fontSize: 12 }}>{i + 1}</td>
                          <td style={td}><span style={badge(pColor, pBg)}>{item.priority}</span></td>
                          <td style={{ ...td, fontWeight: 600, fontSize: 12 }}>{item.directedTo}</td>
                          <td style={{ ...td, fontSize: 13 }}>{item.question}</td>
                          <td style={{ ...td, fontSize: 12, color: C.tx2, fontStyle: 'italic' }}>{item.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
