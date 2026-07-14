import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import { validationStatusClasses } from '../utils/salesStatuses';

type BadgeTone = keyof typeof validationStatusClasses;

export function ValidationStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-normal', validationStatusClasses[tone])}>
      {label}
    </Badge>
  );
}
