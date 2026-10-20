import { BookOpenCheck, BriefcaseBusiness, Globe2, LayoutDashboard } from 'lucide-react';
import { IndiceWorkspaceNavigation } from '../components/frontend-os';
import type { TrainingProgramCopy } from './translations/program';

export const trainingViews = ['home', 'induction', 'program', 'sales'] as const;
export type TrainingView = typeof trainingViews[number];

export function TrainingNavigation({ copy, view, onViewChange }: { copy: TrainingProgramCopy; view: TrainingView; onViewChange: (view: TrainingView) => void }) {
  return <IndiceWorkspaceNavigation ariaLabel={copy.trainingNavigation} variant="workbar" moduleId="training" tone="blue" value={view} onValueChange={onViewChange} items={[
    { id: 'home', label: copy.home, icon: <LayoutDashboard /> },
    { id: 'induction', label: copy.getToKnowIndice, icon: <Globe2 /> },
    { id: 'program', label: copy.certificationPath, icon: <BookOpenCheck /> },
    { id: 'sales', label: copy.salesProcess, icon: <BriefcaseBusiness /> },
  ]} />;
}
