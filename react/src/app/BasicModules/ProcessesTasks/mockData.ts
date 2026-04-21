export type ProcessTaskType = 'task' | 'project-task' | 'process';
export type ProcessTaskStatus = 'pending' | 'in-progress' | 'completed' | 'audited' | 'overdue';
export type ProcessTaskPriority = 'high' | 'medium' | 'low';

export type AgendaStatus = ProcessTaskStatus;
export type AgendaPriority = ProcessTaskPriority;

export interface ProcessTaskFile {
  id: string;
  name: string;
  type: string;
  sizeLabel: string;
  uploadedAt: string;
  uploadedBy: string;
  url: string;
}

export interface ProcessTaskHistoryEntry {
  id: string;
  kind: 'created' | 'updated' | 'completed' | 'duplicated' | 'file-added' | 'audit';
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface ProcessAgendaItem {
  id: number;
  folio: string;
  type: ProcessTaskType;
  unit: string;
  business: string;
  title: string;
  description: string;
  createdAt: string;
  startDate: string;
  dueDate: string;
  status: ProcessTaskStatus;
  creator: string;
  responsible: string;
  priority: ProcessTaskPriority;
  attachments: number;
  projectId: number | null;
  project: string;
  completion: number;
  notes: string;
  weighting: number;
  audited: boolean;
  auditNotes: string;
  files: ProcessTaskFile[];
  history: ProcessTaskHistoryEntry[];
}

export type ProjectStatus = 'active' | 'at-risk' | 'planning' | 'closed';

export interface ProcessProject {
  id: number;
  folio: string;
  name: string;
  unit: string;
  business: string;
  owner: string;
  createdAt: string;
  startDate: string;
  dueDate: string;
  progress: number;
  status: ProjectStatus;
  budget: number;
  priority: ProcessTaskPriority;
  summary: string;
}

function buildHistoryEntry(
  id: string,
  kind: ProcessTaskHistoryEntry['kind'],
  title: string,
  description: string,
  createdAt: string,
  createdBy: string,
): ProcessTaskHistoryEntry {
  return {
    id,
    kind,
    title,
    description,
    createdAt,
    createdBy,
  };
}

function buildFile(
  id: string,
  name: string,
  sizeLabel: string,
  uploadedBy: string,
  uploadedAt: string,
): ProcessTaskFile {
  return {
    id,
    name,
    type: 'application/pdf',
    sizeLabel,
    uploadedAt,
    uploadedBy,
    url: `data:text/plain;charset=utf-8,${encodeURIComponent(`${name} preview generated from mock workspace data.`)}`,
  };
}

export const processProjects: ProcessProject[] = [
  {
    id: 1,
    folio: 'P-2026-001',
    name: 'Digital onboarding rollout',
    unit: 'Human Resources',
    business: 'People',
    owner: 'Jorge Herrera',
    createdAt: '2026-03-28',
    startDate: '2026-04-01',
    dueDate: '2026-05-10',
    progress: 72,
    status: 'active',
    budget: 320000,
    priority: 'high',
    summary: 'Standardize the onboarding experience with automated tasks, approvals, and training checkpoints.',
  },
  {
    id: 2,
    folio: 'P-2026-002',
    name: 'Procurement governance',
    unit: 'Finance',
    business: 'Administration',
    owner: 'Carlos Ibarra',
    createdAt: '2026-03-24',
    startDate: '2026-04-03',
    dueDate: '2026-05-02',
    progress: 46,
    status: 'at-risk',
    budget: 180000,
    priority: 'high',
    summary: 'Reduce approval delays and create a clearer purchasing governance flow across the company.',
  },
  {
    id: 3,
    folio: 'P-2026-003',
    name: 'Preventive maintenance cycle',
    unit: 'Warehouse',
    business: 'Operations',
    owner: 'Luis Mejia',
    createdAt: '2026-03-20',
    startDate: '2026-04-05',
    dueDate: '2026-05-28',
    progress: 61,
    status: 'active',
    budget: 250000,
    priority: 'medium',
    summary: 'Coordinate Q2 preventive maintenance without affecting the operating schedule of each unit.',
  },
  {
    id: 4,
    folio: 'P-2026-004',
    name: 'Service performance ritual',
    unit: 'Sales',
    business: 'Commercial',
    owner: 'Daniela Solis',
    createdAt: '2026-04-01',
    startDate: '2026-04-12',
    dueDate: '2026-05-22',
    progress: 28,
    status: 'planning',
    budget: 90000,
    priority: 'medium',
    summary: 'Create a repeatable operational ritual for KPI reviews, action plans, and leadership follow-ups.',
  },
  {
    id: 5,
    folio: 'P-2026-005',
    name: 'Support playbook refresh',
    unit: 'Technology',
    business: 'Operations',
    owner: 'Marta Ruiz',
    createdAt: '2026-03-18',
    startDate: '2026-03-21',
    dueDate: '2026-04-15',
    progress: 100,
    status: 'closed',
    budget: 76000,
    priority: 'low',
    summary: 'Refresh operating playbooks for support squads and close recurring coordination gaps.',
  },
];

export const processAgendaItems: ProcessAgendaItem[] = [
  {
    id: 1,
    folio: 'T-2026-001',
    type: 'project-task',
    unit: 'Human Resources',
    business: 'People',
    title: 'Approve onboarding journey map',
    description: 'Review the final onboarding journey map before activating the automated workflow.',
    createdAt: '2026-04-01',
    startDate: '2026-04-02',
    dueDate: '2026-04-18',
    status: 'in-progress',
    creator: 'Jorge Herrera',
    responsible: 'Maria Rodriguez',
    priority: 'high',
    attachments: 2,
    projectId: 1,
    project: 'Digital onboarding rollout',
    completion: 68,
    notes: 'Waiting for legal wording on the policy acknowledgment step.',
    weighting: 4,
    audited: false,
    auditNotes: '',
    files: [
      buildFile('file-1', 'Onboarding-flow-v3.pdf', '1.2 MB', 'Jorge Herrera', '2026-04-02T09:15:00'),
      buildFile('file-2', 'Welcome-email-draft.pdf', '640 KB', 'Maria Rodriguez', '2026-04-05T14:40:00'),
    ],
    history: [
      buildHistoryEntry(
        'history-1',
        'updated',
        'Task updated',
        'The onboarding scope was adjusted after the legal review.',
        '2026-04-08T16:10:00',
        'Maria Rodriguez',
      ),
      buildHistoryEntry(
        'history-2',
        'created',
        'Task created',
        'Jorge Herrera created the task from the project workspace.',
        '2026-04-01T09:00:00',
        'Jorge Herrera',
      ),
    ],
  },
  {
    id: 2,
    folio: 'T-2026-002',
    type: 'project-task',
    unit: 'Finance',
    business: 'Administration',
    title: 'Validate approver matrix',
    description: 'Confirm purchase approval levels by amount, vendor risk, and emergency scenario.',
    createdAt: '2026-04-03',
    startDate: '2026-04-04',
    dueDate: '2026-04-21',
    status: 'overdue',
    creator: 'Carlos Ibarra',
    responsible: 'Sofia Campos',
    priority: 'high',
    attachments: 1,
    projectId: 2,
    project: 'Procurement governance',
    completion: 74,
    notes: 'Two business leaders still have not confirmed delegated approvers.',
    weighting: 5,
    audited: false,
    auditNotes: '',
    files: [buildFile('file-3', 'Approval-matrix.xlsx', '512 KB', 'Carlos Ibarra', '2026-04-04T11:20:00')],
    history: [
      buildHistoryEntry(
        'history-3',
        'updated',
        'Task updated',
        'The due date was escalated after the governance review.',
        '2026-04-12T08:30:00',
        'Carlos Ibarra',
      ),
      buildHistoryEntry(
        'history-4',
        'created',
        'Task created',
        'Carlos Ibarra created the task from the project workspace.',
        '2026-04-03T10:00:00',
        'Carlos Ibarra',
      ),
    ],
  },
  {
    id: 3,
    folio: 'T-2026-003',
    type: 'project-task',
    unit: 'Warehouse',
    business: 'Operations',
    title: 'Publish maintenance windows',
    description: 'Share the preventive maintenance windows with the warehouse supervisors for sign-off.',
    createdAt: '2026-04-05',
    startDate: '2026-04-06',
    dueDate: '2026-04-24',
    status: 'completed',
    creator: 'Luis Mejia',
    responsible: 'Ana Garcia',
    priority: 'medium',
    attachments: 1,
    projectId: 3,
    project: 'Preventive maintenance cycle',
    completion: 100,
    notes: 'All warehouse leads confirmed the proposed windows.',
    weighting: 3,
    audited: false,
    auditNotes: '',
    files: [buildFile('file-4', 'Maintenance-calendar.pdf', '880 KB', 'Luis Mejia', '2026-04-06T13:45:00')],
    history: [
      buildHistoryEntry(
        'history-5',
        'completed',
        'Task completed',
        'Ana Garcia closed the publication round after receiving all confirmations.',
        '2026-04-14T17:20:00',
        'Ana Garcia',
      ),
      buildHistoryEntry(
        'history-6',
        'created',
        'Task created',
        'Luis Mejia created the task from the project workspace.',
        '2026-04-05T09:30:00',
        'Luis Mejia',
      ),
    ],
  },
  {
    id: 4,
    folio: 'T-2026-004',
    type: 'project-task',
    unit: 'Sales',
    business: 'Commercial',
    title: 'Design KPI review script',
    description: 'Prepare the talking points that team leads will use during weekly KPI reviews.',
    createdAt: '2026-04-10',
    startDate: '2026-04-12',
    dueDate: '2026-04-28',
    status: 'pending',
    creator: 'Daniela Solis',
    responsible: 'Carlos Lopez',
    priority: 'medium',
    attachments: 0,
    projectId: 4,
    project: 'Service performance ritual',
    completion: 0,
    notes: '',
    weighting: 3,
    audited: false,
    auditNotes: '',
    files: [],
    history: [
      buildHistoryEntry(
        'history-7',
        'created',
        'Task created',
        'Daniela Solis created the task from the project workspace.',
        '2026-04-10T08:10:00',
        'Daniela Solis',
      ),
    ],
  },
  {
    id: 5,
    folio: 'T-2026-005',
    type: 'project-task',
    unit: 'Technology',
    business: 'Operations',
    title: 'Close support playbook sign-off',
    description: 'Collect final approvals from operations and archive the updated support playbook.',
    createdAt: '2026-03-25',
    startDate: '2026-03-27',
    dueDate: '2026-04-10',
    status: 'audited',
    creator: 'Marta Ruiz',
    responsible: 'Marta Ruiz',
    priority: 'low',
    attachments: 1,
    projectId: 5,
    project: 'Support playbook refresh',
    completion: 100,
    notes: 'The playbook is now part of the support squad onboarding pack.',
    weighting: 5,
    audited: true,
    auditNotes: 'Approved after the final service review.',
    files: [buildFile('file-5', 'Support-playbook-v5.pdf', '1.0 MB', 'Marta Ruiz', '2026-04-01T12:00:00')],
    history: [
      buildHistoryEntry(
        'history-8',
        'audit',
        'Audit registered',
        'Marta Ruiz registered the closing audit and approved the final package.',
        '2026-04-11T10:00:00',
        'Marta Ruiz',
      ),
      buildHistoryEntry(
        'history-9',
        'completed',
        'Task completed',
        'The support playbook sign-off was completed.',
        '2026-04-09T15:45:00',
        'Marta Ruiz',
      ),
    ],
  },
  {
    id: 6,
    folio: 'T-2026-006',
    type: 'task',
    unit: 'Technology',
    business: 'Operations',
    title: 'Review escalation queue',
    description: 'Validate blockers escalated from daily support operations and assign owners.',
    createdAt: '2026-04-14',
    startDate: '2026-04-15',
    dueDate: '2026-04-16',
    status: 'in-progress',
    creator: 'Marta Ruiz',
    responsible: 'Carlos Lopez',
    priority: 'high',
    attachments: 1,
    projectId: null,
    project: 'No project',
    completion: 55,
    notes: 'Need final input from platform operations before noon.',
    weighting: 4,
    audited: false,
    auditNotes: '',
    files: [buildFile('file-6', 'Escalation-queue.csv', '340 KB', 'Marta Ruiz', '2026-04-15T08:50:00')],
    history: [
      buildHistoryEntry(
        'history-10',
        'created',
        'Task created',
        'Marta Ruiz created the task directly from the agenda table.',
        '2026-04-14T18:00:00',
        'Marta Ruiz',
      ),
    ],
  },
  {
    id: 7,
    folio: 'T-2026-007',
    type: 'process',
    unit: 'Finance',
    business: 'Administration',
    title: 'Weekly close checklist',
    description: 'Run the weekly close checklist and log exceptions that require leadership review.',
    createdAt: '2026-04-11',
    startDate: '2026-04-11',
    dueDate: '2026-04-17',
    status: 'pending',
    creator: 'Sofia Campos',
    responsible: 'Sofia Campos',
    priority: 'medium',
    attachments: 0,
    projectId: null,
    project: 'No project',
    completion: 0,
    notes: '',
    weighting: 3,
    audited: false,
    auditNotes: '',
    files: [],
    history: [
      buildHistoryEntry(
        'history-11',
        'created',
        'Task created',
        'Sofia Campos scheduled the weekly close checklist.',
        '2026-04-11T07:30:00',
        'Sofia Campos',
      ),
    ],
  },
  {
    id: 8,
    folio: 'T-2026-008',
    type: 'task',
    unit: 'Sales',
    business: 'Commercial',
    title: 'Follow up on pilot feedback',
    description: 'Consolidate pilot feedback after the first KPI ritual dry run.',
    createdAt: '2026-04-13',
    startDate: '2026-04-14',
    dueDate: '2026-04-25',
    status: 'pending',
    creator: 'Daniela Solis',
    responsible: 'Ana Garcia',
    priority: 'low',
    attachments: 0,
    projectId: null,
    project: 'No project',
    completion: 0,
    notes: '',
    weighting: 2,
    audited: false,
    auditNotes: '',
    files: [],
    history: [
      buildHistoryEntry(
        'history-12',
        'created',
        'Task created',
        'Daniela Solis requested a follow-up report for the pilot feedback round.',
        '2026-04-13T10:25:00',
        'Daniela Solis',
      ),
    ],
  },
];

export type OrgCollaboratorRole =
  | 'Director General'
  | 'Director Operaciones'
  | 'Director Finanzas'
  | 'Jefe Almacen'
  | 'Jefe Compras'
  | 'Contador'
  | 'Supervisor'
  | 'Analista de procesos'
  | 'Coordinadora PMO'
  | 'Lider de servicio';

export interface OrgCollaborator {
  id: number;
  name: string;
  role: OrgCollaboratorRole;
  title: string;
  area: string;
  location: string;
  responsibilities: string[];
}

export interface OrgChartAssignment {
  collaboratorId: number;
  managerId: number | null;
}

export const processOrgCollaborators: OrgCollaborator[] = [
  {
    id: 1,
    name: 'Andrea Molina',
    role: 'Director General',
    title: 'CEO',
    area: 'Direccion',
    location: 'Corporativo',
    responsibilities: ['Vision general del sistema', 'Aprobacion de prioridades', 'Direccion ejecutiva'],
  },
  {
    id: 2,
    name: 'Marta Ruiz',
    role: 'Director Operaciones',
    title: 'COO',
    area: 'Operaciones',
    location: 'Corporativo',
    responsibilities: ['Rituales operativos', 'Ejecucion interequipos', 'Seguimiento de backlog'],
  },
  {
    id: 3,
    name: 'Carlos Ibarra',
    role: 'Director Finanzas',
    title: 'CFO',
    area: 'Finanzas',
    location: 'Monterrey',
    responsibilities: ['Control presupuestal', 'Aprobaciones criticas', 'Gobierno financiero'],
  },
  {
    id: 4,
    name: 'Luis Mejia',
    role: 'Jefe Almacen',
    title: 'Jefe',
    area: 'Operaciones',
    location: 'Saltillo',
    responsibilities: ['Inventario operativo', 'Recepcion de insumos', 'Coordinacion de cuadrillas'],
  },
  {
    id: 5,
    name: 'Jorge Herrera',
    role: 'Jefe Compras',
    title: 'Jefe',
    area: 'Compras',
    location: 'Monterrey',
    responsibilities: ['Compras estrategicas', 'Proveedores', 'Aprobaciones de requisiciones'],
  },
  {
    id: 6,
    name: 'Sofia Campos',
    role: 'Contador',
    title: 'Contador',
    area: 'Finanzas',
    location: 'Guadalajara',
    responsibilities: ['Cierres semanales', 'Revision de documentos', 'Control contable'],
  },
  {
    id: 7,
    name: 'Ana Garcia',
    role: 'Supervisor',
    title: 'Supervisor',
    area: 'Servicio',
    location: 'Queretaro',
    responsibilities: ['Seguimiento de incidencias', 'Cobertura de turnos', 'Reportes diarios'],
  },
  {
    id: 8,
    name: 'Carlos Lopez',
    role: 'Analista de procesos',
    title: 'Analista',
    area: 'Transformacion',
    location: 'Remoto',
    responsibilities: ['Mapeo de flujos', 'Documentacion de hallazgos', 'Soporte a despliegues'],
  },
  {
    id: 9,
    name: 'Maria Rodriguez',
    role: 'Coordinadora PMO',
    title: 'Coordinador',
    area: 'Transformacion',
    location: 'Corporativo',
    responsibilities: ['Seguimiento de hitos', 'Control de dependencias', 'Comunicacion ejecutiva'],
  },
  {
    id: 10,
    name: 'Daniela Solis',
    role: 'Lider de servicio',
    title: 'Lider',
    area: 'Servicio',
    location: 'Queretaro',
    responsibilities: ['KPIs semanales', 'Planes correctivos', 'Escalamiento de hallazgos'],
  },
];

export const defaultProcessOrgChartAssignments: OrgChartAssignment[] = [
  { collaboratorId: 1, managerId: null },
  { collaboratorId: 2, managerId: 1 },
  { collaboratorId: 3, managerId: 1 },
  { collaboratorId: 4, managerId: 2 },
  { collaboratorId: 5, managerId: 2 },
  { collaboratorId: 6, managerId: 3 },
];
