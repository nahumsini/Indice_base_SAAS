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
          className="h-10 w-10 rounded-lg border-slate-200 text-slate-600 hover:border-[#143675]/30 hover:bg-[#143675]/5 hover:text-[#143675] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#8bb3ff]/10 dark:hover:text-[#8bb3ff]"
          aria-label="Open kiosk actions"
          title="Open kiosk actions"
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
          Copy public link
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
          Show QR code
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
          Regenerate QR
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
          Edit kiosk
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
          Delete kiosk
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
