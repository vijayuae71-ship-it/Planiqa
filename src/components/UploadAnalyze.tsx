import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, Trash2, CheckSquare, Square, Search, Eye, Archive, RefreshCw, Sparkles, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Drawing } from '../types';
import { C, card, btnP, btnS, btnSm, btnD, inp, tbl, th, td, badge, secTitle, empty, uid, fmt } from '../utils/theme';
import { compressImage, createThumbnail, callClaude, getSelectedDrawings, extractJSON } from '../utils/ai';
import { generatePDF, PDFSection } from '../utils/pdf';

function getExtLabel(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  const labels: Record<string, string> = { jpg: 'JPG', jpeg: 'JPG', png: 'PNG', webp: 'WEBP', gif: 'GIF', bmp: 'BMP', tiff: 'TIFF', tif: 'TIFF', svg: 'SVG', pdf: 'PDF', dwg: 'DWG', dxf: 'DXF', dgn: 'DGN', dwf: 'DWF', rvt: 'RVT', rfa: 'RFA', ifc: 'IFC', nwd: 'NWD', nwc: 'NWC', skp: 'SKP', '3dm': '3DM', doc: 'DOC', docx: 'DOCX', xls: 'XLS', xlsx: 'XLSX', csv: 'CSV' };
  return labels[ext] || ext.toUpperCase() || 'FILE';
}
function getExtColor(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  const cadExts = ['dwg', 'dxf', 'dgn', 'dwf', 'dwfx'];
  const bimExts = ['rvt', 'rfa', 'ifc', 'nwd', 'nwc', 'skp', '3dm'];
  if (ext === 'pdf') return '#dc2626';
  if (cadExts.includes(ext)) return '#f59e0b';
  if (bimExts.includes(ext)) return '#10b981';
  if (['doc', 'docx', 'xls', 'xlsx', 'csv'].includes(ext)) return '#6366f1';
  return '#2563eb';
}

interface Props {
  drawings: Drawing[];
  onDrawingsChange: (d: Drawing[]) => void;
  selectedDrawingIds: string[];
  onSelectionChange: (ids: string[]) => void;
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

export const UploadAnalyze: React.FC<Props> = ({ drawings, onDrawingsChange, selectedDrawingIds, onSelectionChange, apiKey, onStatusChange }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDrawings = drawings.filter(d => showArchived ? d.archived : !d.archived);
  const filtered = activeDrawings.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const newDrawings = [...drawings];
      for (const file of fileArr) {
        const compressed = await compressImage(file);
        const thumb = await createThumbnail(compressed.base64, compressed.mediaType, file.name);
        const existingIdx = newDrawings.findIndex(d => d.name === file.name && !d.archived);
        const version = existingIdx >= 0 ? (newDrawings[existingIdx].version || 1) + 1 : 1;
        if (existingIdx >= 0) {
          newDrawings[existingIdx] = {
            ...newDrawings[existingIdx],
            archived: true
          };
        }
        const drawing: Drawing = {
          id: uid(),
          name: file.name,
          base64: compressed.base64,
          mediaType: compressed.mediaType,
          thumbnail: thumb,
          uploadedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          version,
          archived: false,
          analysis: '',
          size: file.size
        };
        newDrawings.push(drawing);
      }
      onDrawingsChange(newDrawings);
      onStatusChange(newDrawings.filter(d => !d.archived).length > 0 ? 'in-progress' : 'not-started');
    } catch (e: any) {
      setError(e.message || 'Failed to process files');
    } finally {
      setUploading(false);
    }
  }, [drawings, onDrawingsChange, onStatusChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const toggleSelect = (id: string) => {
    if (selectedDrawingIds.includes(id)) {
      onSelectionChange(selectedDrawingIds.filter(s => s !== id));
    } else {
      onSelectionChange([...selectedDrawingIds, id]);
    }
  };

  const selectAll = () => {
    const activeIds = filtered.map(d => d.id);
    const allSelected = activeIds.every(id => selectedDrawingIds.includes(id));
    if (allSelected) {
      onSelectionChange(selectedDrawingIds.filter(id => !activeIds.includes(id)));
    } else {
      const merged = [...new Set([...selectedDrawingIds, ...activeIds])];
      onSelectionChange(merged);
    }
  };

  const archiveDrawing = (id: string) => {
    const updated = drawings.map(d => d.id === id ? { ...d, archived: true } : d);
    onDrawingsChange(updated);
    onSelectionChange(selectedDrawingIds.filter(s => s !== id));
  };

  const analyzeSelected = async () => {
    const selected = getSelectedDrawings(drawings, selectedDrawingIds);
    if (selected.length === 0) { setError('Select drawings from the checkboxes first'); return; }
    setAnalyzing(true);
    setError('');
    try {
      const systemPrompt = `You are a senior construction drawing analyst and technical reviewer at a Tier-1 EPC contractor (L&T, Bechtel, or equivalent). You prepare drawing review reports shared with architects, structural engineers, MEP consultants, and project directors.

MANDATORY ANALYSIS PROTOCOL — FOLLOW THESE STEPS IN ORDER:

STEP 1 — DRAWING INTERPRETATION (DO THIS FIRST):
Carefully examine the uploaded drawing(s)/document(s). Before generating ANY data, analyze and report:
- What type of drawing is this? (floor plan, section, elevation, structural detail, schedule, site plan, MEP layout)
- What building/structure type? (residential villa, commercial office, auditorium, warehouse, hospital, etc.)
- List every visible element: walls, columns, beams, slabs, openings (doors/windows), stairs, ramps, services, annotations, room labels, dimensions
- List all readable dimensions with locations (e.g., "Overall building: 45m × 30m", "Column grid: 6m c/c both ways", "Room R1: 5m × 4m")
- Note any specifications, material callouts, or standards referenced on the drawing
- Note the scale if shown

STEP 2 — CONFIRMED vs ASSUMED:
For EVERY element you identify:
- "confirmed": true → This item has explicit dimensions/specs/quantities readable from the drawing. Cite the source: "As shown on drawing: 12m × 8m stage area"
- "confirmed": false → This item is professionally assumed based on standard practice for this building type. State your assumption.

STEP 3 — COMPREHENSIVE ELEMENT INVENTORY:
This is the FIRST analysis of this drawing. Be thorough — every detail you identify here will be used by other modules (BOM, Cost Estimate, Scope, BBS, etc.).

For each drawing, perform a deep technical analysis covering:
- Structural: Columns (C1, C2...), Beams (B1, B2...), Slabs, Foundations with sizes
- Architectural: Rooms with areas, Doors (D1, D2...) with sizes, Windows (W1, W2...), Wall types & thicknesses
- MEP: Duct routes, pipe sizes, equipment schedules, panel locations
- Civil: Levels, contours, drainage, road widths, setbacks
- Finishes: Floor types, wall finishes, ceiling types & heights
- Include ALL dimensions, levels (FFL, SSL, etc.), and references visible
- Materials & specifications noted on drawing
- Code & standard compliance observations
- Drawing completeness rating: Complete / Substantially Complete / Incomplete / Preliminary

STEP 4 — GAPS & MISSING INFORMATION:
Identify what information is NOT in the drawing but NEEDED. Categorize by priority:
- HIGH: Critical — will significantly impact scope, cost, or schedule if not clarified
- MEDIUM: Important — needed for detailed design/execution
- LOW: Desirable — for optimization or best practice

STEP 5 — STAKEHOLDER QUESTIONS:
Generate professional RFI-style questions directed at specific consultants:
- Architect: Design intent, finishes, aesthetic requirements
- Structural Engineer: Loading, reinforcement, foundation design
- MEP Consultant: Services capacity, routing, equipment specifications
- QS/Cost Consultant: Budget, procurement, value engineering
Each question must have: to, question, priority (HIGH/MEDIUM/LOW), impactArea

CRITICAL JSON RULES:
- You MUST respond with ONLY a valid JSON object
- Be thorough — a comprehensive analysis per drawing is expected
- The summary field should contain a full text narrative analysis (use \\n for newlines)

Return JSON: {"analyses":[{"drawingIndex":0,"drawingAnalysis":{"drawingType":"Floor Plan - Ground Floor","buildingType":"Commercial - Auditorium","visibleElements":["list of every element seen"],"readableDimensions":["list of all dims with locations"],"specsOnDrawing":["any specs/notes visible"],"scale":"1:100 or Not indicated"},"summary":"full structured analysis text here","elements":[{"name":"Column C1","type":"Structural","details":"450mm x 450mm RCC column","dimensions":"450x450mm","confirmed":true}],"constructionType":"RCC Framed Structure","estimatedArea":"1250 sqm","gaps":[{"priority":"HIGH","description":"Foundation design not shown"}],"consultantQuestions":[{"to":"Structural Engineer","question":"What is the foundation type?","priority":"HIGH","impactArea":"Substructure scope and cost"}]}]}`;
      const userMsg = `Perform a comprehensive professional drawing review of these ${selected.length} construction drawing(s). For each drawing, provide a DEEP technical analysis covering: complete element inventory with all visible labels/dimensions, materials and specifications, code compliance observations, drawing completeness rating, information gaps in priority order (HIGH/MEDIUM/LOW), and specific questions/RFIs for the architect, structural engineer, MEP consultant, and QS. This report will be shared with the design team and project directors at major construction firms.`;
      const result = await callClaude(apiKey, systemPrompt, userMsg, selected);
      const parsed = extractJSON(result);
      const updated = [...drawings];
      const selectedList = selected;
      if (parsed.analyses && Array.isArray(parsed.analyses)) {
        parsed.analyses.forEach((a: any) => {
          const drawing = selectedList[a.drawingIndex];
          if (drawing) {
            const idx = updated.findIndex(d => d.id === drawing.id);
            if (idx >= 0) {
              const { drawingIndex, ...analysisData } = a;
              updated[idx] = { ...updated[idx], analysis: JSON.stringify(analysisData) };
            }
          }
        });
      } else if (typeof parsed === 'string') {
        selectedList.forEach(d => {
          const idx = updated.findIndex(ud => ud.id === d.id);
          if (idx >= 0) updated[idx] = { ...updated[idx], analysis: parsed };
        });
      }
      onDrawingsChange(updated);
      onStatusChange('complete');
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(d => selectedDrawingIds.includes(d.id));

  const tryParseAnalysis = (analysis: string): any | null => {
    try {
      const parsed = JSON.parse(analysis);
      if (parsed && parsed.drawingAnalysis) return parsed;
    } catch {}
    return null;
  };

  const renderAnalysis = (analysis: string) => {
    const parsed = tryParseAnalysis(analysis);
    if (!parsed) {
      return (
        <div style={{ borderTop: `1px solid ${C.bdr}`, padding: 14, background: C.bgD, fontSize: 13, lineHeight: 1.6, color: C.tx2, whiteSpace: 'pre-wrap' }}>
          {analysis}
        </div>
      );
    }

    const da = parsed.drawingAnalysis;
    const elements = parsed.elements || [];
    const gaps = parsed.gaps || [];
    const cqs = parsed.consultantQuestions || [];

    return (
      <div style={{ borderTop: `1px solid ${C.bdr}`, padding: 14, background: C.bgD, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Drawing Analysis Card */}
        {da && (
          <div style={{ ...card, border: '2px solid #2563eb', background: 'linear-gradient(135deg,#eff6ff,#f0f7ff)' }}>
            <h3 style={{ ...secTitle, color: '#2563eb' }}>📐 Drawing Analysis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <p style={{ margin: 0 }}><strong>Drawing Type:</strong> {da.drawingType}</p>
              <p style={{ margin: 0 }}><strong>Building Type:</strong> {da.buildingType}</p>
            </div>
            {parsed.constructionType && <p style={{ margin: '8px 0 0' }}><strong>Construction Type:</strong> {parsed.constructionType}</p>}
            {parsed.estimatedArea && <p style={{ margin: '4px 0 0' }}><strong>Estimated Area:</strong> {parsed.estimatedArea}</p>}
            {da.visibleElements?.length > 0 && (
              <div style={{ marginTop: '8px' }}><strong>Visible Elements:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {da.visibleElements.map((e: string, i: number) => (
                    <span key={i} style={badge('#1e40af', '#dbeafe')}>{e}</span>
                  ))}
                </div>
              </div>
            )}
            {da.readableDimensions?.length > 0 && (
              <div style={{ marginTop: '8px' }}><strong>Readable Dimensions:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {da.readableDimensions.map((d: string, i: number) => <li key={i} style={{ fontSize: '13px' }}>{d}</li>)}
                </ul>
              </div>
            )}
            {da.specsOnDrawing?.length > 0 && (
              <div style={{ marginTop: '8px' }}><strong>Specifications on Drawing:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {da.specsOnDrawing.map((s: string, i: number) => <li key={i} style={{ fontSize: '13px' }}>{s}</li>)}
                </ul>
              </div>
            )}
            {da.scale && <p style={{ marginTop: '4px', marginBottom: 0 }}><strong>Scale:</strong> {da.scale}</p>}
          </div>
        )}

        {/* Elements Table */}
        {elements.length > 0 && (
          <div style={{ ...card }}>
            <h3 style={{ ...secTitle, color: C.tx }}>🏗️ Element Inventory ({elements.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Element</th>
                    <th style={th}>Type</th>
                    <th style={{ ...th, minWidth: 200 }}>Details</th>
                    <th style={th}>Dimensions</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {elements.map((el: any, i: number) => (
                    <tr key={i} style={{ background: el.confirmed === false ? '#fef9c3' : 'transparent' }}>
                      <td style={{ ...td, fontWeight: 600 }}>{el.name}</td>
                      <td style={td}><span style={badge('#4338ca', '#e0e7ff')}>{el.type}</span></td>
                      <td style={{ ...td, fontSize: 13 }}>{el.details}</td>
                      <td style={{ ...td, fontSize: 13, fontFamily: 'monospace' }}>{el.dimensions || '—'}</td>
                      <td style={td}>
                        <span style={badge(el.confirmed ? '#16a34a' : '#f59e0b', el.confirmed ? '#dcfce7' : '#fef3c7')}>
                          {el.confirmed ? '✓ Confirmed' : '⚠ Assumed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gaps Section */}
        {gaps.length > 0 && (
          <div style={{ ...card, border: '2px solid #f59e0b', background: '#fffbeb' }}>
            <h3 style={{ ...secTitle, color: '#d97706' }}>⚠️ Gaps & Missing Information ({gaps.length})</h3>
            {gaps.map((g: any, i: number) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < gaps.length - 1 ? '1px solid #fde68a' : 'none', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ ...badge('#fff', g.priority === 'HIGH' ? '#ef4444' : g.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6'), flexShrink: 0, fontSize: '10px', minWidth: '55px', textAlign: 'center' as const }}>{g.priority}</span>
                <span style={{ fontSize: '13px' }}>{g.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Consultant Questions Section */}
        {cqs.length > 0 && (
          <div style={{ ...card, border: '2px solid #7c3aed', background: '#f5f3ff' }}>
            <h3 style={{ ...secTitle, color: '#7c3aed' }}>💬 Stakeholder Questions ({cqs.length})</h3>
            {['Architect', 'Structural Engineer', 'MEP Consultant', 'QS/Cost Consultant'].map(role => {
              const qs = cqs.filter((q: any) => q.to === role);
              return qs.length > 0 ? (
                <div key={role} style={{ marginBottom: '12px' }}>
                  <h4 style={{ fontWeight: 600, color: '#4c1d95', margin: '8px 0 4px', fontSize: '14px' }}>{role}</h4>
                  {qs.map((q: any, i: number) => (
                    <div key={i} style={{ padding: '6px 8px', borderBottom: '1px solid #e9e5f5', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ ...badge('#fff', q.priority === 'HIGH' ? '#ef4444' : '#f59e0b'), fontSize: '10px', flexShrink: 0 }}>{q.priority}</span>
                      <div><span style={{ fontSize: '13px' }}>{q.question}</span>
                        {q.impactArea && <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>→ {q.impactArea}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Full Summary Text */}
        {parsed.summary && (
          <div style={{ ...card }}>
            <h3 style={{ ...secTitle, color: C.tx }}>📝 Full Analysis Summary</h3>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: C.tx2, whiteSpace: 'pre-wrap' }}>
              {parsed.summary}
            </div>
          </div>
        )}
      </div>
    );
  };

  const exportPDF = () => {
    const sections: PDFSection[] = [];
    const active = drawings.filter(d => !d.archived);
    sections.push({
      type: 'table',
      title: 'Uploaded Drawings',
      headers: ['Name', 'Version', 'Size', 'Uploaded', 'Status'],
      rows: active.map(d => [
        String(d.name ?? ''),
        `v${String(d.version ?? 1)}`,
        formatSize(d.size || 0),
        String(d.uploadedAt ?? ''),
        d.analysis ? 'Analyzed' : 'Pending'
      ]),
      summary: [
        { label: 'Total Active', value: String(active.length) },
        { label: 'Analyzed', value: String(active.filter(d => d.analysis).length) }
      ]
    });
    active.filter(d => d.analysis).forEach(d => {
      const parsed = tryParseAnalysis(d.analysis);
      if (parsed) {
        let content = '';
        const da = parsed.drawingAnalysis;
        if (da) {
          content += `DRAWING TYPE: ${da.drawingType || 'N/A'}\nBUILDING TYPE: ${da.buildingType || 'N/A'}\n`;
          if (da.scale) content += `SCALE: ${da.scale}\n`;
          if (parsed.constructionType) content += `CONSTRUCTION TYPE: ${parsed.constructionType}\n`;
          if (parsed.estimatedArea) content += `ESTIMATED AREA: ${parsed.estimatedArea}\n`;
          if (da.visibleElements?.length) content += `\nVISIBLE ELEMENTS:\n${da.visibleElements.map((e: string) => `  • ${e}`).join('\n')}\n`;
          if (da.readableDimensions?.length) content += `\nREADABLE DIMENSIONS:\n${da.readableDimensions.map((d: string) => `  • ${d}`).join('\n')}\n`;
          if (da.specsOnDrawing?.length) content += `\nSPECIFICATIONS:\n${da.specsOnDrawing.map((s: string) => `  • ${s}`).join('\n')}\n`;
        }
        if (parsed.elements?.length) {
          content += `\nELEMENT INVENTORY (${parsed.elements.length} items):\n`;
          parsed.elements.forEach((el: any) => {
            content += `  • [${el.confirmed ? 'CONFIRMED' : 'ASSUMED'}] ${el.name} (${el.type}) — ${el.details}${el.dimensions ? ', ' + el.dimensions : ''}\n`;
          });
        }
        if (parsed.gaps?.length) {
          content += `\nGAPS & MISSING INFO (${parsed.gaps.length}):\n`;
          parsed.gaps.forEach((g: any) => { content += `  [${g.priority}] ${g.description}\n`; });
        }
        if (parsed.consultantQuestions?.length) {
          content += `\nSTAKEHOLDER QUESTIONS (${parsed.consultantQuestions.length}):\n`;
          parsed.consultantQuestions.forEach((q: any) => { content += `  → ${q.to}: ${q.question} [${q.priority}]\n`; });
        }
        if (parsed.summary) content += `\nFULL SUMMARY:\n${parsed.summary}`;
        sections.push({ type: 'text', title: `Analysis — ${d.name}`, content });
      } else {
        sections.push({ type: 'text', title: `Analysis — ${d.name}`, content: String(d.analysis ?? '') });
      }
    });
    generatePDF({
      title: 'Drawing Upload & Analysis Report',
      module: 'Upload & Analyze',
      sections
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Upload size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: 0 }}>Module 1 — Upload & Analyze</h2>
          <p style={{ fontSize: 13, color: C.tx3, margin: 0 }}>Upload construction drawings for AI-powered analysis</p>
        </div>
      </div>

      {error && (
        <div style={{ background: C.errBg, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.err, fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <X size={14} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? C.primary : C.bdr}`,
          borderRadius: 12,
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? C.infoBg : C.bgW,
          transition: 'all 0.2s',
          marginBottom: 20
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.dwg,.dxf,.dgn,.dwf,.dwfx,.rvt,.rfa,.ifc,.nwd,.nwc,.nwf,.skp,.3dm,.doc,.docx,.xls,.xlsx,.csv,.svg"
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: C.tx3, fontSize: 14 }}>Processing files...</p>
          </div>
        ) : (
          <>
            <Upload size={40} color={dragOver ? C.primary : C.tx3} style={{ marginBottom: 8 }} />
            <p style={{ color: C.tx, fontWeight: 600, fontSize: 15, margin: '8px 0 4px' }}>Drop drawings here or click to browse</p>
            <p style={{ color: C.tx3, fontSize: 13, margin: 0 }}>Supports Images, PDF, AutoCAD (DWG/DXF), Revit, IFC, SketchUp & more</p>
          </>
        )}
      </div>

      {/* Toolbar */}
      {drawings.filter(d => !d.archived).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.tx3 }} />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...inp, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={selectAll} style={btnS}>
            {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            <span style={{ marginLeft: 4 }}>{allFilteredSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
          <button onClick={analyzeSelected} disabled={analyzing || selectedDrawingIds.length === 0} style={{ ...btnP, opacity: analyzing || selectedDrawingIds.length === 0 ? 0.5 : 1 }}>
            {analyzing ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
            <span style={{ marginLeft: 6 }}>Analyze Selected ({selectedDrawingIds.length})</span>
          </button>
          <button onClick={() => setShowArchived(!showArchived)} style={btnSm}>
            <Archive size={14} />
            <span style={{ marginLeft: 4 }}>{showArchived ? 'Show Active' : 'Show Archived'}</span>
          </button>
          <button onClick={exportPDF} style={{ ...btnSm, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>📄 PDF</button>
        </div>
      )}

      {/* Analyzing State */}
      {analyzing && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: C.tx3 }}>AI is analyzing drawings...</p>
        </div>
      )}

      {/* Drawings List */}
      {filtered.length === 0 && !analyzing ? (
        <div style={empty}>
          <FileImage size={40} color={C.tx3} style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 600, color: C.tx }}>
            {showArchived ? 'No archived drawings' : drawings.length === 0 ? 'No drawings uploaded yet' : 'No drawings match your search'}
          </p>
          <p style={{ fontSize: 13, color: C.tx3 }}>
            {showArchived ? 'Archived drawings will appear here' : 'Upload construction drawings to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(drawing => {
            const isSelected = selectedDrawingIds.includes(drawing.id);
            const isExpanded = expandedId === drawing.id;
            return (
              <div key={drawing.id} style={{ ...card, border: isSelected ? `2px solid ${C.primary}` : `1px solid ${C.bdr}`, padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                  {/* Checkbox */}
                  {!drawing.archived && (
                    <div onClick={() => toggleSelect(drawing.id)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                      {isSelected ? <CheckSquare size={20} color={C.primary} /> : <Square size={20} color={C.tx3} />}
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: C.bgD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {drawing.thumbnail ? (
                      <img src={drawing.thumbnail} alt={drawing.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FileImage size={24} color={C.tx3} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: C.tx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawing.name}</span>
                      <span style={badge('#fff', getExtColor(drawing.name))}>{getExtLabel(drawing.name)}</span>
                      <span style={badge(C.primary, C.infoBg)}>v{drawing.version || 1}</span>
                      {drawing.archived && <span style={badge(C.tx3, C.bgD)}>Archived</span>}
                      {drawing.analysis && <span style={badge(C.ok, C.okBg)}>Analyzed</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.tx3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>{formatSize(drawing.size || 0)}</span>
                      <span>{drawing.uploadedAt}</span>
                      {(() => {
                        const p = tryParseAnalysis(drawing.analysis);
                        if (p) {
                          return (
                            <>
                              {p.elements?.length > 0 && <span>🏗️ {p.elements.length} elements</span>}
                              {p.gaps?.length > 0 && <span>⚠️ {p.gaps.length} gaps</span>}
                              {p.consultantQuestions?.length > 0 && <span>💬 {p.consultantQuestions.length} RFIs</span>}
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {drawing.analysis && (
                      <button onClick={() => setExpandedId(isExpanded ? null : drawing.id)} style={{ ...btnSm, padding: '4px 8px' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span style={{ marginLeft: 4 }}>Analysis</span>
                      </button>
                    )}
                    {!drawing.archived && (
                      <button onClick={() => archiveDrawing(drawing.id)} style={{ ...btnSm, padding: '4px 8px' }}>
                        <Archive size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Analysis Result */}
                {isExpanded && drawing.analysis && renderAnalysis(drawing.analysis)}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {drawings.length > 0 && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: C.bgD, borderRadius: 8, fontSize: 12, color: C.tx3, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Total: {drawings.filter(d => !d.archived).length} active</span>
          <span>Archived: {drawings.filter(d => d.archived).length}</span>
          <span>Selected: {selectedDrawingIds.length}</span>
          <span>Analyzed: {drawings.filter(d => d.analysis && !d.archived).length}</span>
        </div>
      )}
    </div>
  );
};
