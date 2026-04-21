import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { cn } from '../../../components/ui/utils';
import { useHRLanguage } from '../HRLanguage';
import { useAssetsPortalTheme } from './useAssetsPortalTheme';

export interface AssetColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
}

interface AssetColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: AssetColumnConfig[];
  onApply: (columns: AssetColumnConfig[]) => void;
}

export function AssetColumnsModal({
  isOpen,
  onClose,
  columns,
  onApply,
}: AssetColumnsModalProps) {
  const t = useHRLanguage().assets.columnPicker;
  const isDarkMode = useAssetsPortalTheme();
  const [localColumns, setLocalColumns] = useState<AssetColumnConfig[]>(columns);

  useEffect(() => {
    if (isOpen) {
      setLocalColumns(columns);
    }
  }, [columns, isOpen]);

  const handleToggle = (columnId: string) => {
    setLocalColumns((current) =>
      current.map((column) =>
        column.id === columnId && !column.locked ? { ...column, visible: !column.visible } : column,
      ),
    );
  };

  const handleSelectAll = () => {
    setLocalColumns((current) => current.map((column) => ({ ...column, visible: true })));
  };

  const handleReset = () => {
    setLocalColumns(columns);
  };

  const handleApply = () => {
    onApply(localColumns);
    onClose();
  };

  const visibleCount = localColumns.filter((column) => column.visible).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        className={cn(
          'max-w-xl p-0 sm:rounded-2xl',
          isDarkMode
            ? 'border border-gray-700 bg-gray-800/95 text-white shadow-[0_28px_60px_rgba(4,10,30,0.5)]'
            : 'border border-gray-200 bg-white text-gray-900 shadow-[0_28px_60px_rgba(15,23,42,0.18)]',
        )}
      >
        <DialogHeader
          className={cn(
            'border-b px-6 py-5 text-left',
            isDarkMode
              ? 'border-gray-700 bg-[linear-gradient(135deg,rgba(20,54,117,0.18)_0%,rgba(37,24,130,0.22)_100%)]'
              : 'border-gray-200 bg-[linear-gradient(135deg,#f7faff_0%,#eef3ff_100%)]',
          )}
        >
          <DialogTitle className={cn('text-xl font-semibold', isDarkMode ? 'text-white' : 'text-gray-900')}>
            {t.title}
          </DialogTitle>
          <DialogDescription className={cn('text-sm', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
            {t.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={cn('text-sm', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
              {t.visibleCount(visibleCount, localColumns.length)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className={cn(
                  isDarkMode
                    ? 'border-gray-600 bg-gray-800 text-slate-200 hover:bg-gray-700 hover:text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                {t.selectAll}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className={cn(
                  isDarkMode
                    ? 'border-gray-600 bg-gray-800 text-slate-200 hover:bg-gray-700 hover:text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                {t.reset}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {localColumns.map((column) => (
              <label
                key={column.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3',
                  isDarkMode
                    ? 'border-gray-700 bg-gray-900/35'
                    : 'border-gray-200 bg-gray-50/90',
                  column.locked ? 'opacity-80' : 'cursor-pointer',
                )}
              >
                <Checkbox
                  checked={column.visible}
                  onCheckedChange={() => handleToggle(column.id)}
                  disabled={column.locked}
                />
                <div className="flex-1">
                  <p className={cn('text-sm font-medium', isDarkMode ? 'text-white' : 'text-gray-900')}>
                    {column.label}
                  </p>
                  {column.locked ? (
                    <p className={cn('mt-0.5 text-xs', isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
                      {t.required}
                    </p>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter
          className={cn(
            'border-t px-6 py-4 sm:justify-end',
            isDarkMode ? 'border-gray-700 bg-gray-900/55' : 'border-gray-200 bg-gray-50',
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              isDarkMode
                ? 'border-gray-600 bg-gray-800 text-slate-200 hover:bg-gray-700 hover:text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            {t.cancel}
          </Button>
          <Button type="button" onClick={handleApply} className="bg-[#5d35ff] text-white hover:bg-[#4e29ef]">
            {t.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
