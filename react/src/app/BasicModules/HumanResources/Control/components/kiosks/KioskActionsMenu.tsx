import { Copy, MoreHorizontal, Pencil, QrCode, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../../components/ui/dropdown-menu';

export interface KioskActionsMenuProps {
  hasPublicLink: boolean;
  isSaving: boolean;
  onCopy: () => void;
  onShowQr: () => void;
  onRotate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function KioskActionsMenu({
  hasPublicLink,
  isSaving,
  onCopy,
  onShowQr,
  onRotate,
  onEdit,
  onDelete,
}: KioskActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-lg border-slate-200 text-slate-600 hover:border-[#59C3A5]/30 hover:bg-[#59C3A5]/5 hover:text-[#59C3A5] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#8FE0CA]/10 dark:hover:text-[#8FE0CA]"
          aria-label="Open attendance point actions"
          title="Open attendance point actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          disabled={!hasPublicLink}
          onSelect={(event) => {
            event.preventDefault();
            if (hasPublicLink) {
              onCopy();
            }
          }}
        >
          <Copy className="h-4 w-4" />
          Copy access link
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasPublicLink}
          onSelect={(event) => {
            event.preventDefault();
            if (hasPublicLink) {
              onShowQr();
            }
          }}
        >
          <QrCode className="h-4 w-4" />
          Show attendance QR
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSaving}
          onSelect={(event) => {
            event.preventDefault();
            if (!isSaving) {
              onRotate();
            }
          }}
        >
          <RotateCw className="h-4 w-4" />
          Reset access link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
          Edit attendance point
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={isSaving}
          onSelect={(event) => {
            event.preventDefault();
            if (!isSaving) {
              onDelete();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete attendance point
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
