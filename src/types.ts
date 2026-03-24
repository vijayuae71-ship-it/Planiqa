export interface Drawing {
  id: string;
  name: string;
  base64: string;
  mediaType: string;
  thumbnail: string;
  uploadedAt: string;
  version: number;
  archived: boolean;
  analysis?: string;
  size: number;
}

export interface ScopeItem {
  id: string;
  division: string;
  divisionName: string;
  trade: string;
  description: string;
  notes: string;
}

export interface BOMItem {
  id: string;
  trade: string;
  item: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  total: number;
}

export interface WBSItem {
  id: string;
  code: string;
  task: string;
  duration: string;
  predecessor: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  status: 'pending' | 'complete';
}

export interface BBSItem {
  id: string;
  member: string;
  barMark: string;
  type: string;
  diameter: number;
  shapeCode: string;
  a: number;
  b: number;
  c: number;
  r: number;
  length: number;
  quantity: number;
  totalLength: number;
  weight: number;
}

export interface CostItem {
  id: string;
  csiCode: string;
  description: string;
  quantity: number;
  unit: string;
  materialRate: number;
  laborRate: number;
  equipmentRate: number;
  total: number;
}

export interface CashFlowItem {
  month: string;
  planned: number;
  cumulative: number;
}

export interface MTOItem {
  id: string;
  category: string;
  item: string;
  description: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  adjustedQty: number;
  unitRate: number;
  total: number;
}

export interface SubmittalItem {
  id: string;
  number: string;
  title: string;
  trade: string;
  type: string;
  status: 'pending' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  submittedDate: string;
  requiredDate: string;
  reviewer: string;
  notes: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  weather: string;
  temperature: string;
  workforceCount: number;
  activities: string;
  equipment: string;
  materials: string;
  delays: string;
  notes: string;
}

export interface AsBuiltItem {
  id: string;
  drawingNumber: string;
  title: string;
  discipline: string;
  revision: string;
  status: 'pending' | 'in-progress' | 'submitted' | 'verified';
  verifiedBy: string;
  date: string;
  completion: number;
}

export interface RFIItem {
  id: string;
  number: string;
  subject: string;
  from: string;
  to: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'responded' | 'closed';
  dateSubmitted: string;
  dateRequired: string;
  dateResponded: string;
  response: string;
}

export interface PunchItem {
  id: string;
  number: string;
  location: string;
  description: string;
  trade: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'open' | 'in-progress' | 'resolved' | 'verified';
  assignedTo: string;
  dateIdentified: string;
  dateResolved: string;
}

export type ModuleId = 'upload' | 'scope' | 'bom' | 'execution' | 'bbs' | 'cost' | 'compare' | 'mto' | 'submittal' | 'diary' | 'asbuilt' | 'rfi' | 'punch';

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  number: number;
}

export const MODULES: ModuleInfo[] = [
  { id: 'upload', name: 'Upload & Analyze', number: 1 },
  { id: 'scope', name: 'Scope of Work', number: 2 },
  { id: 'bom', name: 'Bill of Materials', number: 3 },
  { id: 'execution', name: 'Execution Document', number: 4 },
  { id: 'bbs', name: 'Bar Bending Schedule', number: 5 },
  { id: 'cost', name: 'Cost Estimate', number: 6 },
  { id: 'compare', name: 'Compare Revisions', number: 7 },
  { id: 'mto', name: 'Material Take-Off', number: 8 },
  { id: 'submittal', name: 'Submittal Log', number: 9 },
  { id: 'diary', name: 'Site Diary', number: 10 },
  { id: 'asbuilt', name: 'As-Built Tracker', number: 11 },
  { id: 'rfi', name: 'RFI Tracker', number: 12 },
  { id: 'punch', name: 'Punch List', number: 13 },
];

export interface ModuleProps {
  drawings: Drawing[];
  selectedDrawingIds: string[];
  apiKey: string;
  onStatusChange: (status: 'not-started' | 'in-progress' | 'complete') => void;
}

// ===== SaaS Types =====

export type UserRole = 'admin' | 'project-manager' | 'engineer' | 'qs' | 'site-manager' | 'viewer';

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

export interface SaaSUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  createdAt: string;
  lastLogin: string;
  active: boolean;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  industry: string;
  country: string;
  subscription: SubscriptionTier;
  subscriptionExpiry: string;
  maxUsers: number;
  maxProjects: number;
  users: SaaSUser[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  location: string;
  status: 'active' | 'on-hold' | 'completed' | 'archived';
  startDate: string;
  endDate: string;
  budget: string;
  currency: string;
  createdBy: string;
  createdAt: string;
  drawings: Drawing[];
  moduleStatuses: Record<ModuleId, 'not-started' | 'in-progress' | 'complete'>;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  detail: string;
  timestamp: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  'project-manager': 'Project Manager',
  engineer: 'Engineer',
  qs: 'Quantity Surveyor',
  'site-manager': 'Site Manager',
  viewer: 'Viewer (Read Only)',
};

export const TIER_INFO: Record<SubscriptionTier, { name: string; price: string; modules: number; maxUsers: number; maxProjects: number; features: string[] }> = {
  starter: {
    name: 'Starter',
    price: '$99/mo',
    modules: 5,
    maxUsers: 5,
    maxProjects: 3,
    features: ['Upload & Analyze', 'Scope of Work', 'Bill of Materials', 'Cost Estimate', 'Punch List'],
  },
  professional: {
    name: 'Professional',
    price: '$299/mo',
    modules: 13,
    maxUsers: 25,
    maxProjects: 15,
    features: ['All 13 Modules', 'CSV/TXT Exports', 'Multi-currency', 'Priority Support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: '$999/mo',
    modules: 13,
    maxUsers: 999,
    maxProjects: 999,
    features: ['All 13 Modules', 'Unlimited Users', 'Unlimited Projects', 'White-label', 'API Access', 'Dedicated Support', 'Audit Trail'],
  },
};

export const STARTER_MODULES: ModuleId[] = ['upload', 'scope', 'bom', 'cost', 'punch'];
