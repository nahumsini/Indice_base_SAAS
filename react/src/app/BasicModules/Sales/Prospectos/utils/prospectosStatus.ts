import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import {
  salesOwners,
  type OpportunityStage,
  type OpportunityStatus,
  type OpportunityTemperature,
} from '../../salesCrmContext';
import type { OpportunityColumnId, OpportunityFormState } from '../types/prospectosTypes';

export const opportunityInputClassName =
  'h-11 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20';

export const opportunitySelectClassName =
  'h-11 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20';

export const initialOpportunityForm: OpportunityFormState = {
  opportunityName: '',
  contactId: '',
  source: 'Manual',
  stage: 'New',
  temperature: 'Warm',
  ownerValue: '',
  owner: salesOwners[0],
  estimatedValue: '0',
  probability: '25%',
  expectedCloseDate: '',
  nextAction: 'Call',
  nextActionDate: '',
  lastContact: '',
  status: 'Active',
  notes: '',
  files: '',
};

export const opportunityColumnsStorageKey = 'sales-opportunities-columns-v2';
export const opportunityColumnWidthsStorageKey = 'sales-opportunities-column-widths-v1';
export const agendaScheduleStorageKey = 'sales-opportunities-agenda-schedule-v1';
export const opportunityDragDataType = 'application/x-indice-sales-opportunity-id';

export const opportunitySortCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });

export const agendaWorkHours = Array.from({ length: 12 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);

export const spanishWeekdayAliases: Array<{ aliases: string[]; dayIndex: number }> = [
  { aliases: ['domingo', 'dom'], dayIndex: 0 },
  { aliases: ['lunes', 'lun'], dayIndex: 1 },
  { aliases: ['martes', 'mar'], dayIndex: 2 },
  { aliases: ['miércoles', 'miercoles', 'mié', 'mie'], dayIndex: 3 },
  { aliases: ['jueves', 'jue'], dayIndex: 4 },
  { aliases: ['viernes', 'vie'], dayIndex: 5 },
  { aliases: ['sábado', 'sabado', 'sáb', 'sab'], dayIndex: 6 },
];

export const defaultOpportunityColumns: ColumnConfig[] = [
  { id: 'opportunity', label: 'Oportunidad / empresa', visible: true, locked: true, description: 'Nombre comercial de la oportunidad, empresa y folio.' },
  { id: 'contact', label: 'Contacto', visible: true, description: 'Persona principal relacionada con la venta.' },
  { id: 'phone', label: 'Teléfono', visible: true, description: 'Teléfono principal para llamadas o WhatsApp.' },
  { id: 'email', label: 'Email', visible: true, description: 'Correo principal del contacto.' },
  { id: 'source', label: 'Origen', visible: true, description: 'Fuente comercial que generó la oportunidad.' },
  { id: 'stage', label: 'Etapa', visible: true, description: 'Avance dentro del pipeline comercial.' },
  { id: 'temperature', label: 'Temperatura', visible: true, description: 'Prioridad comercial de la oportunidad.' },
  { id: 'owner', label: 'Responsable', visible: true, description: 'Vendedor o ejecutivo responsable.' },
  { id: 'estimatedValue', label: 'Valor comercial', visible: true, description: 'Monto inteligente: estimado, cotizado o cerrado según avance comercial.' },
  { id: 'probability', label: 'Probabilidad', visible: true, description: 'Probabilidad estimada de cierre.' },
  { id: 'quoteSignal', label: 'Cotización', visible: true, description: 'Estado de cotizaciones ligadas a la oportunidad.' },
  { id: 'expectedCloseDate', label: 'Cierre esperado', visible: true, description: 'Fecha objetivo de cierre.' },
  { id: 'nextAction', label: 'Siguiente acción', visible: true, description: 'Próximo paso comercial.' },
  { id: 'nextActionDate', label: 'Fecha de acción', visible: true, description: 'Fecha y hora programada para el siguiente contacto.' },
  { id: 'lastContact', label: 'Último contacto', visible: false, description: 'Último registro de contacto comercial.' },
  { id: 'files', label: 'Archivos', visible: true, description: 'Documentos relacionados con la oportunidad.' },
  { id: 'status', label: 'Estado', visible: true, description: 'Estado operativo de la oportunidad.' },
  { id: 'pipeline', label: 'Pipeline cotizado', visible: false, description: 'Total cotizado ligado a la oportunidad por divisa.' },
];

export const defaultOpportunityColumnWidths: Record<OpportunityColumnId, number> = {
  opportunity: 280,
  contact: 180,
  phone: 150,
  email: 220,
  source: 170,
  stage: 170,
  temperature: 170,
  owner: 220,
  estimatedValue: 170,
  probability: 160,
  quoteSignal: 190,
  pipeline: 210,
  expectedCloseDate: 170,
  nextAction: 170,
  nextActionDate: 260,
  lastContact: 170,
  files: 130,
  status: 170,
};

export const stageLabels: Record<OpportunityStage, string> = {
  New: 'Nueva',
  Contacted: 'Contactada',
  Qualified: 'Calificada',
  Proposal: 'Propuesta',
  Negotiation: 'Negociación',
  Won: 'Ganada',
  Lost: 'Perdida',
};

export const stageProgressStyles: Record<OpportunityStage, string> = {
  New: 'bg-[#2F80FF]',
  Contacted: 'bg-[#59C3A5]',
  Qualified: 'bg-[#22C55E]',
  Proposal: 'bg-[#F4C84A]',
  Negotiation: 'bg-violet-500',
  Won: 'bg-emerald-600',
  Lost: 'bg-[#FF2D5E]',
};

export const stageClasses: Record<OpportunityStage, string> = {
  New: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  Contacted: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  Qualified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Proposal: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  Negotiation: 'border-violet-200 bg-violet-50 text-violet-700',
  Won: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Lost: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
};

export const temperatureClasses: Record<OpportunityTemperature, string> = {
  Hot: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  Warm: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  Cold: 'border-slate-200 bg-slate-50 text-slate-600',
};

export const statusClasses: Record<OpportunityStatus, string> = {
  Active: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  'Pending follow-up': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  Overdue: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  'On hold': 'border-slate-200 bg-slate-50 text-slate-600',
  Closed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};
