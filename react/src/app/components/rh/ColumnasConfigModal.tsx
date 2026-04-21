import { useEffect, useState } from 'react';
import { useLanguage } from '../../shared/context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { GripVertical } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Para columnas que no se pueden ocultar
}

interface ColumnasConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
  fixedColumns?: ColumnConfig[];
}

interface DraggableColumnItemProps {
  column: ColumnConfig;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  toggleColumn: (id: string) => void;
  fixedLabel: string;
}

function DraggableColumnItem({
  column,
  index,
  moveColumn,
  toggleColumn,
  fixedLabel,
}: DraggableColumnItemProps) {
  const isFixed = Boolean(column.locked);
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'column',
    item: { index },
    canDrag: !isFixed,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'column',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveColumn(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => {
        if (node) {
          preview(drop(node));
        }
      }}
      className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isFixed ? 'bg-gray-50 dark:bg-gray-800' : 'hover:shadow-sm'}`}
    >
      <div
        ref={(node) => {
          if (node && !isFixed) {
            drag(node);
          }
        }}
        className={isFixed ? 'cursor-not-allowed' : 'cursor-move'}
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={() => !column.locked && toggleColumn(column.id)}
        disabled={column.locked}
      />
      
      <label
        htmlFor={column.id}
        className={`flex-1 text-sm ${
          isFixed
            ? 'text-gray-500 dark:text-gray-500'
            : 'text-gray-900 dark:text-white cursor-pointer'
        }`}
      >
        {column.label}
        {isFixed && <span className="ml-2 text-xs text-gray-400">({fixedLabel})</span>}
      </label>
    </div>
  );
}

export function ColumnasConfigModal({
  isOpen,
  onClose,
  columns,
  onSave,
  fixedColumns = [],
}: ColumnasConfigModalProps) {
  const { currentLanguage } = useLanguage();
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const copy = currentLanguage.code.startsWith('es')
    ? {
        title: 'Configurar columnas',
        description:
          'Selecciona y ordena las columnas que deseas visualizar en la tabla. Arrastra para reordenar.',
        close: 'Cerrar',
        fixed: 'Fija',
        visibleCount: (visible: number, total: number) =>
          `${visible} de ${total} columnas visibles`,
        selectAll: 'Seleccionar todas',
        deselectAll: 'Deseleccionar todas',
        cancel: 'Cancelar',
        apply: 'Aplicar cambios',
      }
    : {
        title: 'Configure columns',
        description:
          'Choose and reorder the columns you want to display in the table. Drag to rearrange them.',
        close: 'Close',
        fixed: 'Fixed',
        visibleCount: (visible: number, total: number) =>
          `${visible} of ${total} visible columns`,
        selectAll: 'Select all',
        deselectAll: 'Deselect all',
        cancel: 'Cancel',
        apply: 'Apply changes',
      };

  useEffect(() => {
    if (isOpen) {
      setLocalColumns(columns);
    }
  }, [columns, isOpen]);

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const dragColumn = localColumns[dragIndex];
    const newColumns = [...localColumns];
    newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, dragColumn);
    setLocalColumns(newColumns);
  };

  const toggleColumn = (id: string) => {
    setLocalColumns(
      localColumns.map((col) =>
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleCancel = () => {
    setLocalColumns(columns);
    onClose();
  };

  const handleSelectAll = () => {
    setLocalColumns(localColumns.map((col) => ({ ...col, visible: true })));
  };

  const handleDeselectAll = () => {
    setLocalColumns(
      localColumns.map((col) => ({
        ...col,
        visible: col.locked ? true : false,
      }))
    );
  };

  const visibleCount = fixedColumns.filter((col) => col.visible).length + localColumns.filter((col) => col.visible).length;
  const totalColumns = fixedColumns.length + localColumns.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent hideCloseButton className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {/* Header con estilo homologado */}
        <div className="px-6 py-5 bg-[#143675] dark:bg-[#0f2855] flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold text-white" aria-hidden="true">
            {copy.title}
          </h2>
          <button
            onClick={handleCancel}
            className="text-white/70 hover:text-white transition-colors"
            aria-label={copy.close}
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-6 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4" aria-hidden="true">
            {copy.description}
          </p>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {copy.visibleCount(visibleCount, totalColumns)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {copy.selectAll}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  {copy.deselectAll}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            <DndProvider backend={HTML5Backend}>
              {fixedColumns.map((column) => (
                <DraggableColumnItem
                  key={column.id}
                  column={column}
                  index={-1}
                  moveColumn={() => {}}
                  toggleColumn={() => {}}
                  fixedLabel={copy.fixed}
                />
              ))}
              {localColumns.map((column, index) => (
                <DraggableColumnItem
                  key={column.id}
                  column={column}
                  index={index}
                  moveColumn={moveColumn}
                  toggleColumn={toggleColumn}
                  fixedLabel={copy.fixed}
                />
              ))}
            </DndProvider>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleCancel}>
            {copy.cancel}
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#143675] hover:bg-[#0f2855] text-white"
          >
            {copy.apply}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
