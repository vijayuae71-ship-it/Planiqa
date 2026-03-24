import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ModuleId, Drawing, Company, SaaSUser, Project } from './types';
import { C } from './utils/theme';
import { useResponsive } from './utils/responsive';
import { getEmbeddedApiKey, setUsageContext } from './utils/ai';
import { LockScreen } from './components/LockScreen';
import { LoginScreen } from './components/LoginScreen';
import { CompanyDashboard } from './components/CompanyDashboard';
import { AdminPanel } from './components/AdminPanel';
import { UsageBilling } from './components/UsageBilling';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { UploadAnalyze } from './components/UploadAnalyze';
import { ScopeOfWork } from './components/ScopeOfWork';
import { BillOfMaterials } from './components/BillOfMaterials';
import { ExecutionDocument } from './components/ExecutionDocument';
import { BarBendingSchedule } from './components/BarBendingSchedule';
import { CostEstimate } from './components/CostEstimate';
import { CompareRevisions } from './components/CompareRevisions';
import { MaterialTakeOff } from './components/MaterialTakeOff';
import { SubmittalLog } from './components/SubmittalLog';
import { SiteDiary } from './components/SiteDiary';
import { AsBuiltTracker } from './components/AsBuiltTracker';
import { RFITracker } from './components/RFITracker';
import { PunchList } from './components/PunchList';

type AppView = 'lock' | 'login' | 'dashboard' | 'admin' | 'workspace' | 'usage';

const initStatuses = (): Record<ModuleId, 'not-started' | 'in-progress' | 'complete'> => ({
  upload: 'not-started', scope: 'not-started', bom: 'not-started',
  execution: 'not-started', bbs: 'not-started', cost: 'not-started',
  compare: 'not-started', mto: 'not-started', submittal: 'not-started',
  diary: 'not-started', asbuilt: 'not-started', rfi: 'not-started', punch: 'not-started',
});

const App: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const [view, setView] = useState<AppView>('lock');
  const [company, setCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<SaaSUser | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleId>('upload');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState(getEmbeddedApiKey());
  const [statuses, setStatuses] = useState(initStatuses);

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  // Keep usage context updated for AI call tracking
  useEffect(() => {
    if (company && user && project) {
      setUsageContext({
        companyId: company.id,
        companyName: company.name,
        userId: user.id,
        userName: user.name,
        projectId: project.id,
        projectName: project.name,
        module: activeModule,
      });
    } else {
      setUsageContext(null);
    }
  }, [company, user, project, activeModule]);

  const updateStatus = useCallback((mod: ModuleId) => (s: 'not-started' | 'in-progress' | 'complete') => {
    setStatuses(prev => ({ ...prev, [mod]: s }));
    if (project && company) {
      const key = `planiq_projects_${company.id}`;
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = stored.findIndex((p: Project) => p.id === project.id);
        if (idx >= 0) {
          stored[idx].moduleStatuses = { ...stored[idx].moduleStatuses, [mod]: s };
          localStorage.setItem(key, JSON.stringify(stored));
        }
      } catch {}
    }
  }, [project, company]);

  const handleLogin = useCallback((c: Company, u: SaaSUser) => {
    setCompany(c);
    setUser(u);
    setView('dashboard');
  }, []);

  const handleSelectProject = useCallback((p: Project) => {
    setProject(p);
    setDrawings(p.drawings || []);
    setSelectedIds([]);
    setStatuses(p.moduleStatuses || initStatuses());
    setActiveModule('upload');
    setView('workspace');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    if (project && company) {
      const key = `planiq_projects_${company.id}`;
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = stored.findIndex((p: Project) => p.id === project.id);
        if (idx >= 0) {
          stored[idx].drawings = drawings;
          stored[idx].moduleStatuses = statuses;
          localStorage.setItem(key, JSON.stringify(stored));
        }
      } catch {}
    }
    setProject(null);
    setView('dashboard');
  }, [project, company, drawings, statuses]);

  const handleCompanyUpdate = useCallback((updated: Company) => {
    setCompany(updated);
  }, []);

  const handleLogout = useCallback(() => {
    setCompany(null);
    setUser(null);
    setProject(null);
    setView('login');
  }, []);

  const handleModuleChange = useCallback((m: ModuleId) => {
    setActiveModule(m);
    // Auto-close sidebar on mobile when module selected
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // LOCK SCREEN
  if (view === 'lock') return <LockScreen onAuth={() => setView('login')} />;

  // LOGIN SCREEN
  if (view === 'login') return <LoginScreen onLogin={handleLogin} />;

  // DASHBOARD
  if (view === 'dashboard' && company && user) {
    return (
      <CompanyDashboard
        company={company}
        user={user}
        onSelectProject={handleSelectProject}
        onAdminPanel={() => setView('admin')}
        onUsageBilling={() => setView('usage')}
        onLogout={handleLogout}
      />
    );
  }

  // ADMIN PANEL
  if (view === 'admin' && company && user) {
    return (
      <AdminPanel
        company={company}
        user={user}
        onCompanyUpdate={handleCompanyUpdate}
        onBack={() => setView('dashboard')}
      />
    );
  }

  // USAGE & BILLING
  if (view === 'usage' && company && user) {
    const isOwner = user.email === 'vijayuae71@gmail.com' || user.role === 'admin';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg }}>
        <div style={{
          background: C.grad, padding: isMobile ? '12px 16px' : '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>PlanIQ</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Usage & Billing</span>
          </div>
          <button onClick={() => setView('dashboard')} style={{
            padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.2)',
            color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          }}>← Back</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <UsageBilling companyId={company.id} companyName={company.name} isOwner={isOwner} />
        </div>
      </div>
    );
  }

  // WORKSPACE
  if (view === 'workspace' && company && user && project) {
    const moduleProps = {
      drawings, selectedDrawingIds: selectedIds, apiKey,
      onStatusChange: updateStatus(activeModule),
    };

    const renderModule = () => {
      switch (activeModule) {
        case 'upload': return <UploadAnalyze {...moduleProps} drawings={drawings} onDrawingsChange={setDrawings} selectedDrawingIds={selectedIds} onSelectionChange={setSelectedIds} onStatusChange={updateStatus('upload')} />;
        case 'scope': return <ScopeOfWork {...moduleProps} onStatusChange={updateStatus('scope')} />;
        case 'bom': return <BillOfMaterials {...moduleProps} onStatusChange={updateStatus('bom')} />;
        case 'execution': return <ExecutionDocument {...moduleProps} onStatusChange={updateStatus('execution')} />;
        case 'bbs': return <BarBendingSchedule {...moduleProps} onStatusChange={updateStatus('bbs')} />;
        case 'cost': return <CostEstimate {...moduleProps} onStatusChange={updateStatus('cost')} />;
        case 'compare': return <CompareRevisions {...moduleProps} onStatusChange={updateStatus('compare')} />;
        case 'mto': return <MaterialTakeOff {...moduleProps} onStatusChange={updateStatus('mto')} />;
        case 'submittal': return <SubmittalLog {...moduleProps} onStatusChange={updateStatus('submittal')} />;
        case 'diary': return <SiteDiary {...moduleProps} onStatusChange={updateStatus('diary')} />;
        case 'asbuilt': return <AsBuiltTracker {...moduleProps} onStatusChange={updateStatus('asbuilt')} />;
        case 'rfi': return <RFITracker {...moduleProps} onStatusChange={updateStatus('rfi')} />;
        case 'punch': return <PunchList {...moduleProps} onStatusChange={updateStatus('punch')} />;
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg }}>
        <Header
          projectName={project.name} onProjectNameChange={() => {}}
          drawingCount={drawings.filter(d => !d.archived).length}
          selectedCount={selectedIds.length}
          moduleStatuses={statuses} apiKey={apiKey} onApiKeyChange={setApiKey}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          drawings={drawings} selectedDrawingIds={selectedIds} onSelectionChange={setSelectedIds}
          isMobile={isMobile}
        />
        {/* Project context bar */}
        <div style={{
          background: C.bgW, borderBottom: `1px solid ${C.bdr}`,
          padding: isMobile ? '6px 12px' : '8px 20px',
          display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
          flexWrap: 'wrap', fontSize: isMobile ? 12 : 13,
        }}>
          <button
            onClick={handleBackToDashboard}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.primary, fontWeight: 600, fontSize: isMobile ? 12 : 13,
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
            }}
            onMouseOver={e => (e.currentTarget.style.background = C.infoBg)}
            onMouseOut={e => (e.currentTarget.style.background = 'none')}
          >
            ← {isMobile ? '' : 'Dashboard'}
          </button>
          <div style={{ width: 1, height: 20, background: C.bdr }} />
          {!isMobile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                }}>
                  {company.name[0]}
                </div>
                <span style={{ fontSize: 13, color: C.tx2, fontWeight: 500 }}>{company.name}</span>
              </div>
              <div style={{ width: 1, height: 20, background: C.bdr }} />
            </>
          )}
          <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.tx }}>
            {isMobile ? project.name.substring(0, 20) + (project.name.length > 20 ? '...' : '') : project.name}
          </span>
          {!isMobile && project.client && (
            <>
              <div style={{ width: 1, height: 20, background: C.bdr }} />
              <span style={{ fontSize: 12, color: C.tx3 }}>Client: {project.client}</span>
            </>
          )}
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20,
            background: project.status === 'active' ? C.okBg : project.status === 'on-hold' ? C.warnBg : C.infoBg,
            color: project.status === 'active' ? C.ok : project.status === 'on-hold' ? C.warn : C.info,
            fontWeight: 600, textTransform: 'uppercase',
          }}>
            {project.status}
          </span>
          {!isMobile && (
            <span style={{ fontSize: 12, color: C.tx3 }}>
              {user.name} ({user.role})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Sidebar
            open={sidebarOpen} activeModule={activeModule}
            onModuleChange={handleModuleChange} moduleStatuses={statuses}
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
          />
          <main style={{
            flex: 1, overflow: 'auto',
            padding: isMobile ? 12 : isTablet ? 16 : 24,
            animation: 'fadeIn 0.2s ease-out',
          }} key={activeModule}>
            {renderModule()}
          </main>
        </div>
      </div>
    );
  }

  return <LockScreen onAuth={() => setView('login')} />;
};

createRoot(document.getElementById('root')!).render(<App />);
