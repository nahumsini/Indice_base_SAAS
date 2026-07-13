import { useEffect, useState } from 'react';
import { useLanguage } from '../../shared/context';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Columns3, GripVertical, RotateCcw, Search, X } from 'lucide-react';
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
  theme?: 'default' | 'processes' | 'humanResources' | 'sales' | 'receivables' | 'expenses';
}

interface DraggableColumnItemProps {
  column: ColumnConfig;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  toggleColumn: (id: string) => void;
  fixedLabel: string;
  accentClassName: string;
  checkboxClassName: string;
  interactiveClassName: string;
}

function DraggableColumnItem({
  accentClassName,
  checkboxClassName,
  column,
  index,
  interactiveClassName,
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
        'flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800',
        isDragging && 'opacity-50',
        isFixed
          ? 'bg-slate-50 dark:bg-slate-900/60'
          : interactiveClassName,
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
        <GripVertical className={cn('h-4 w-4', accentClassName)} />
      </div>
      
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={() => !column.locked && toggleColumn(column.id)}
        disabled={column.locked}
        className={checkboxClassName}
      />
      
      <label htmlFor={column.id} className="min-w-0 flex-1 cursor-pointer">
        <span
          className={`block truncate text-sm font-bold ${
            isFixed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'
          }`}
        >
          {column.label}
          {isFixed && <span className="ml-2 text-xs text-slate-400">({fixedLabel})</span>}
        </span>
        {column.description ? (
          <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-600 dark:text-slate-400">
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
  const modalTheme = (() => {
    if (theme === 'processes') {
      return {
        accent: 'text-[#9A6B05]',
        checkbox:
          'data-[state=checked]:border-[#F4C84A] data-[state=checked]:bg-[#F4C84A] data-[state=checked]:text-slate-950 focus-visible:ring-[#F4C84A]/30',
        content: 'max-w-[760px] rounded-2xl',
        footer: 'bg-[#F4C84A]',
        header: 'bg-[#F4C84A]',
        interactive: 'hover:border-[#F4C84A]/60 hover:bg-[#F4C84A]/10',
        primary:
          'h-10 rounded-xl border border-white/80 bg-white px-5 text-sm font-semibold text-[#7A5404] shadow-sm hover:bg-white/85 hover:text-[#7A5404] focus-visible:ring-white/40 dark:bg-white dark:text-[#7A5404] dark:hover:bg-slate-100',
      };
    }

    if (theme === 'humanResources') {
      return {
        accent: 'text-[#59C3A5]',
        checkbox:
          'data-[state=checked]:border-[#59C3A5] data-[state=checked]:bg-[#59C3A5] focus-visible:ring-[#59C3A5]/30',
        content: 'max-w-[900px] rounded-3xl',
        footer: 'bg-[#59C3A5]',
        header: 'bg-[#59C3A5]',
        interactive: 'hover:border-[#59C3A5]/40 hover:bg-[#59C3A5]/5',
        primary:
          'h-10 rounded-xl bg-white px-5 text-sm font-semibold text-[#59C3A5] shadow-sm hover:bg-slate-100 hover:text-[#59C3A5] focus-visible:ring-white/40 dark:bg-white dark:text-[#59C3A5] dark:hover:bg-slate-100',
      };
    }

    if (theme === 'sales') {
      return {
        accent: 'text-[#FF6B5E]',
        checkbox:
          'data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E] focus-visible:ring-[#FF6B5E]/30',
        content: 'max-w-[900px] rounded-3xl',
        footer: 'bg-[#FF6B5E]',
        header: 'bg-[#FF6B5E]',
        interactive: 'hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/5',
        primary:
          'h-10 rounded-xl bg-white px-5 text-sm font-bold text-[#B63B32] shadow-sm hover:bg-slate-100 hover:text-[#B63B32] focus-visible:ring-white/40 dark:bg-white dark:text-[#B63B32] dark:hover:bg-slate-100',
      };
    }

    if (theme === 'receivables' || theme === 'expenses') {
      return {
        accent: 'text-[#147514]',
        checkbox:
          'data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514] focus-visible:ring-[#147514]/30',
        content: 'max-w-[900px] rounded-3xl',
        footer: 'bg-[#147514]',
        header: 'bg-[#147514]',
        interactive: 'hover:border-[#147514]/40 hover:bg-[#147514]/5',
        primary:
          'h-10 rounded-xl bg-white px-5 text-sm font-bold text-[#147514] shadow-sm hover:bg-slate-100 hover:text-[#147514] focus-visible:ring-white/40 dark:bg-white dark:text-[#147514] dark:hover:bg-slate-100',
      };
    }

    return {
      accent: 'text-[rgb(235,165,52)]',
      checkbox: '',
      content: 'max-w-[760px] rounded-2xl',
      footer: 'bg-[#143675]',
      header: 'bg-[#143675]',
      interactive: 'hover:border-[rgb(235,165,52)]/40 hover:bg-[rgb(235,165,52)]/5',
      primary: moduleModalPrimaryButtonClassName,
    };
  })();
  const usesProcessesTheme = theme === 'processes';
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
        searchPlaceholder: 'Nombre o descripción',
        noColumns: 'No hay columnas con ese criterio.',
        cancel: 'Cancelar',
        apply: 'Aplicar cambios',
      };
    }

    if (currentLanguage.code.startsWith('fr')) {
      return {
        title: 'Configurer les colonnes',
        description:
          'Sélectionnez et ordonnez les colonnes à afficher dans le tableau. Faites glisser pour réordonner.',
        close: 'Fermer',
        fixed: 'Fixe',
        visibleCount: (visible: number, total: number) =>
          `${visible} sur ${total} colonnes visibles`,
        selectAll: 'Tout sélectionner',
        deselectAll: 'Tout désélectionner',
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
        className={cn(
          '!flex h-[min(86vh,820px)] max-h-[calc(100vh-3rem)] flex-col gap-0 overflow-hidden border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800',
          modalTheme.content,
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className={cn('shrink-0 px-6 py-4', usesProcessesTheme ? 'text-slate-950' : 'text-white', modalTheme.header)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm', usesProcessesTheme ? 'border border-[#9A6B05]/15 bg-white/35 text-slate-950' : 'bg-white/15 text-white')}>
                <Columns3 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className={cn('pr-4 text-xl font-semibold leading-tight tracking-tight', usesProcessesTheme ? 'text-slate-950' : 'text-white')} aria-hidden="true">
                  {copy.title}
                </h2>
                <span className={cn('mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', usesProcessesTheme ? 'border border-[#9A6B05]/20 bg-white/30 text-slate-800' : 'border border-white/25 bg-white/15 text-white')}>
                  {copy.visibleCount(visibleCount, totalColumns)}
                </span>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors', usesProcessesTheme ? 'border border-[#9A6B05]/25 bg-white/35 text-slate-950 hover:bg-white/60' : 'border border-white/25 bg-white/10 text-white hover:bg-white/20')}
              aria-label={copy.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-900/60">
          <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400" aria-hidden="true">
                  {copy.description}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  onClick={handleSelectAll}
                >
                  {copy.selectAll}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  onClick={handleDeselectAll}
                >
                  {copy.deselectAll}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
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
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-3 pr-2 pb-2">
              <DndProvider backend={HTML5Backend}>
                {visibleFixedColumns.map((column) => (
                  <DraggableColumnItem
                    key={column.id}
                    accentClassName={modalTheme.accent}
                    checkboxClassName={modalTheme.checkbox}
                    column={column}
                    index={-1}
                    interactiveClassName={modalTheme.interactive}
                    moveColumn={() => {}}
                    toggleColumn={() => {}}
                    fixedLabel={copy.fixed}
                  />
                ))}
                {visibleLocalColumns.map(({ column, index }) => (
                  <DraggableColumnItem
                    key={column.id}
                    accentClassName={modalTheme.accent}
                    checkboxClassName={modalTheme.checkbox}
                    column={column}
                    index={index}
                    interactiveClassName={modalTheme.interactive}
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

        <DialogFooter className={cn('sticky bottom-0 z-10 shrink-0 px-6 py-4', modalTheme.footer)}>
          <Button
            variant="outline"
            className={usesProcessesTheme
              ? 'h-10 rounded-xl border-[#9A6B05]/30 bg-transparent px-5 text-sm font-semibold text-slate-950 shadow-none hover:bg-white/35 hover:text-slate-950'
              : moduleModalOutlineButtonClassName}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
