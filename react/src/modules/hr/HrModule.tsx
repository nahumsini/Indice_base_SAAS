import { ModuleShell } from '../shared';
import { hrModule } from './module.config';

export interface HrModuleProps {
  initialTabId?: string;
}

export function HrModule({ initialTabId }: HrModuleProps) {
  return <ModuleShell module={hrModule} initialTabId={initialTabId} />;
}

export default HrModule;
