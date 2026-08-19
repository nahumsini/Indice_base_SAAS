import { Warehouse } from 'lucide-react';
import { cn } from '../../../../../components/ui/utils';

interface WarehouseColorIconProps {
  className?: string;
}

/** Bicolor warehouse mark shared by Inventory navigation and title bars. */
export function WarehouseColorIcon({ className }: WarehouseColorIconProps) {
  return (
    <Warehouse
      aria-hidden="true"
      className={cn('text-[#b9382f] [fill:#fcdca8]', className)}
      strokeWidth={2}
    />
  );
}
