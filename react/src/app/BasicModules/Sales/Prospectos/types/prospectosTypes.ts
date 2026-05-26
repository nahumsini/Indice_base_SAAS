import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type {
  OpportunityNextAction,
  OpportunityProbability,
  OpportunitySource,
  OpportunityStage,
  OpportunityStatus,
  OpportunityTemperature,
} from '../../salesCrmContext';

export type OpportunityView = 'table' | 'kanban' | 'agenda';

export type OpportunityColumnId =
  | 'opportunity'
  | 'contact'
  | 'phone'
  | 'email'
  | 'source'
  | 'stage'
  | 'temperature'
  | 'owner'
  | 'estimatedValue'
  | 'probability'
  | 'expectedCloseDate'
  | 'nextAction'
  | 'nextActionDate'
  | 'lastContact'
  | 'files'
  | 'status';

export type OpportunitySortDirection = 'asc' | 'desc';
export type OpportunitySortValue = string | number | null;

export type OpportunitySortState = {
  columnId: OpportunityColumnId;
  direction: OpportunitySortDirection;
};

export type AgendaViewMode = 'day' | 'week' | 'list';

export type OpportunityHistoryEntry = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: 'blue' | 'green' | 'yellow' | 'coral' | 'slate';
};

export type OpportunityFormState = {
  opportunityName: string;
  contactId: string;
  source: OpportunitySource;
  stage: OpportunityStage;
  temperature: OpportunityTemperature;
  ownerValue: string;
  owner: string;
  estimatedValue: string;
  probability: OpportunityProbability;
  expectedCloseDate: string;
  nextAction: OpportunityNextAction;
  nextActionDate: string;
  lastContact: string;
  status: OpportunityStatus;
  notes: string;
  files: string;
};

export type OpportunityColumnConfig = ColumnConfig & {
  id: OpportunityColumnId;
};

