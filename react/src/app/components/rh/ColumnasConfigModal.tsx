import { useEffect, useState } from 'react';
import { useLanguage } from '../../shared/context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { GripVertical, RotateCcw, Search, X } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { cn } from '../ui/utils';

const moduleModalOutlineButtonClassName =
  'h-10 rounded-xl border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none hover:bg-white/20 hover:text-white disabled:border-white/20 disabled:bg-white/5 disabled:text-white/50 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20';
const moduleModalPrimaryButtonClassName =
  'h-10 rounded-xl bg-white px-5 text-sm font-semibold text-[#143675] shadow-sm hover:bg-slate-100 hover:text-[#143675] focus-visible:ring-white/40 dark:bg-white dark:text-[#143675] dark:hover:bg-slate-100';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Columns that cannot be hidden.
  description?: string;
}

interface ColumnasConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
  defaultColumns?: ColumnConfig[];
  fixedColumns?: ColumnConfig[];
  theme?: 'default' | 'processes';
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
      if (index < 0 || item.index < 0) {
        return;
      }

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
      className={cn(
        'flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all dark:border-slate-700 dark:bg-slate-800',
        isDragging && 'opacity-50',
        isFixed
          ? 'bg-slate-50 dark:bg-slate-900/60'
          : 'hover:border-[rgb(235,165,52)]/40 hover:bg-[rgb(235,165,52)]/5',
      )}
    >
      <div
        ref={(node) => {
          if (node && !isFixed) {
            drag(node);
          }
        }}
        className={isFixed ? 'cursor-not-allowed' : 'cursor-grab'}
      >
        <GripVertical className="h-5 w-5 text-[rgb(235,165,52)]" />
      </div>
      
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={() => !column.locked && toggleColumn(column.id)}
        disabled={column.locked}
      />
      
      <label htmlFor={column.id} className="min-w-0 flex-1 cursor-pointer">
        <span
          className={`block truncate text-base font-semibold ${
            isFixed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'
          }`}
        >
          {column.label}
          {isFixed && <span className="ml-2 text-xs text-slate-400">({fixedLabel})</span>}
        </span>
        {column.description ? (
          <span className="mt-0.5 block text-sm leading-5 text-slate-600 dark:text-slate-400">
            {column.description}
          </span>
        ) : null}
      </label>
    </div>
  );
}

export function ColumnasConfigModal({
  isOpen,
  onClose,
  columns,
  onSave,
  defaultColumns,
  fixedColumns = [],
  theme = 'default',
}: ColumnasConfigModalProps) {
  const { currentLanguage } = useLanguage();
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [searchQuery, setSearchQuery] = useState('');
  const modalTheme = theme === 'processes'
    ? {
        header: 'bg-[rgb(235,165,52)]',
        footer: 'bg-[rgb(235,165,52)]',
        primary:
          'h-10 rounded-xl bg-white px-5 text-sm font-semibold text-[rgb(176,111,22)] shadow-sm hover:bg-slate-100 hover:text-[rgb(176,111,22)] focus-visible:ring-white/40 dark:bg-white dark:text-[rgb(176,111,22)] dark:hover:bg-slate-100',
      }
    : {
        header: 'bg-[#143675]',
        footer: 'bg-[#143675]',
        primary: moduleModalPrimaryButtonClassName,
      };
  const copy = (() => {
    if (currentLanguage.code.startsWith('es')) {
      return {
        title: 'Configurar columnas',
        description:
          'Selecciona y ordena las columnas que deseas visualizar en la tabla. Arrastra para reordenar.',
        close: 'Cerrar',
        fixed: 'Fija',
        visibleCount: (visible: number, total: number) =>
          `${visible} de ${total} columnas visibles`,
        selectAll: 'Seleccionar todas',
        deselectAll: 'Deseleccionar todas',
        restoreDefaults: 'Restaurar',
        search: 'Buscar columnas',
        searchPlaceholder: 'Nombre o descripcion',
        noColumns: 'No hay columnas con ese criterio.',
        cancel: 'Cancelar',
        apply: 'Aplicar cambios',
      };
    }

    if (currentLanguage.code.startsWith('fr')) {
      return {
        title: 'Configurer les colonnes',
        description:
          'Selectionnez et ordonnez les colonnes a afficher dans le tableau. Faites glisser pour reordonner.',
        close: 'Fermer',
        fixed: 'Fixe',
        visibleCount: (visible: number, total: number) =>
          `${visible} sur ${total} colonnes visibles`,
        selectAll: 'Tout selectionner',
        deselectAll: 'Tout deselectionner',
        restoreDefaults: 'Restaurer',
        search: 'Rechercher des colonnes',
        searchPlaceholder: 'Nom ou description',
        noColumns: 'Aucune colonne ne correspond.',
        cancel: 'Annuler',
        apply: 'Appliquer les changements',
      };
    }

    if (currentLanguage.code.startsWith('pt')) {
      return {
        title: 'Configurar colunas',
        description:
          'Selecione e ordene as colunas que deseja visualizar na tabela. Arraste para reordenar.',
        close: 'Fechar',
        fixed: 'Fixa',
        visibleCount: (visible: number, total: number) =>
          `${visible} de ${total} colunas visíveis`,
        selectAll: 'Selecionar todas',
        deselectAll: 'Desmarcar todas',
        restoreDefaults: 'Restaurar',
        search: 'Buscar colunas',
        searchPlaceholder: 'Nome ou descrição',
        noColumns: 'Nenhuma coluna encontrada.',
        cancel: 'Cancelar',
        apply: 'Aplicar alterações',
      };
    }

    if (currentLanguage.code.startsWith('ko')) {
      return {
        title: '열 설정',
        description:
          '테이블에 표시할 열을 선택하고 순서를 조정하세요. 드래그하여 재정렬할 수 있습니다.',
        close: '닫기',
        fixed: '고정',
        visibleCount: (visible: number, total: number) =>
          `${total}개 중 ${visible}개 열 표시`,
        selectAll: '전체 선택',
        deselectAll: '전체 해제',
        restoreDefaults: '기본값',
        search: '열 검색',
        searchPlaceholder: '이름 또는 설명',
        noColumns: '일치하는 열이 없습니다.',
        cancel: '취소',
        apply: '변경 적용',
      };
    }

    if (currentLanguage.code.startsWith('zh')) {
      return {
        title: '配置列',
        description:
          '选择并排序要在表格中显示的列。拖动即可重新排序。',
        close: '关闭',
        fixed: '固定',
        visibleCount: (visible: number, total: number) =>
          `${total} 列中显示 ${visible} 列`,
        selectAll: '全选',
        deselectAll: '取消全选',
        restoreDefaults: '恢复默认',
        search: '搜索列',
        searchPlaceholder: '名称或描述',
        noColumns: '没有匹配的列。',
        cancel: '取消',
        apply: '应用更改',
      };
    }

    return {
      title: 'Configure columns',
      description:
        'Choose and reorder the columns you want to display in the table. Drag to rearrange them.',
      close: 'Close',
      fixed: 'Fixed',
      visibleCount: (visible: number, total: number) =>
        `${visible} of ${total} visible columns`,
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      restoreDefaults: 'Restore defaults',
      search: 'Search columns',
      searchPlaceholder: 'Name or description',
      noColumns: 'No columns match this search.',
      cancel: 'Cancel',
      apply: 'Apply changes',
    };
  })();

  useEffect(() => {
    if (isOpen) {
      setLocalColumns(columns);
      setSearchQuery('');
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

  const handleRestoreDefaults = () => {
    setLocalColumns(defaultColumns ?? columns);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleFixedColumns = normalizedSearch
    ? fixedColumns.filter((column) =>
        `${column.label} ${column.description ?? ''}`.toLowerCase().includes(normalizedSearch),
      )
    : fixedColumns;
  const visibleLocalColumns = normalizedSearch
    ? localColumns
        .map((column, index) => ({ column, index }))
        .filter(({ column }) =>
          `${column.label} ${column.description ?? ''}`.toLowerCase().includes(normalizedSearch),
        )
    : localColumns.map((column, index) => ({ column, index }));

  const visibleCount = fixedColumns.filter((col) => col.visible).length + localColumns.filter((col) => col.visible).length;
  const totalColumns = fixedColumns.length + localColumns.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        hideCloseButton
        className="!flex h-[min(86vh,820px)] max-h-[calc(100vh-3rem)] max-w-[760px] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className={cn('shrink-0 px-6 py-4 text-white', modalTheme.header)}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="pr-4 text-xl font-semibold leading-tight tracking-tight text-white" aria-hidden="true">
              {copy.title}
            </h2>
            <button
              onClick={handleCancel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={copy.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-900/60">
          <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2.5">
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400" aria-hidden="true">
                  {copy.description}
                </p>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                  {copy.visibleCount(visibleCount, totalColumns)}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  onClick={handleSelectAll}
                >
                  {copy.selectAll}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  onClick={handleDeselectAll}
                >
                  {copy.deselectAll}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  onClick={handleRestoreDefaults}
                >
                  <RotateCcw className="h-4 w-4" />
                  {copy.restoreDefaults}
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="sr-only" htmlFor="column-search">{copy.search}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="column-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-3 pr-2 pb-2 sm:pr-3">
              <DndProvider backend={HTML5Backend}>
                {visibleFixedColumns.map((column) => (
                  <DraggableColumnItem
                    key={column.id}
                    column={column}
                    index={-1}
                    moveColumn={() => {}}
                    toggleColumn={() => {}}
                    fixedLabel={copy.fixed}
                  />
                ))}
                {visibleLocalColumns.map(({ column, index }) => (
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
              {visibleFixedColumns.length === 0 && visibleLocalColumns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {copy.noColumns}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={cn('sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-3 px-6 py-3', modalTheme.footer)}>
          <Button
            variant="outline"
            className={moduleModalOutlineButtonClassName}
            onClick={handleCancel}
          >
            {copy.cancel}
          </Button>
          <Button
            onClick={handleSave}
            className={modalTheme.primary}
          >
            {copy.apply}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
