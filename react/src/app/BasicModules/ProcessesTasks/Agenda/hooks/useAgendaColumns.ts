import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { AgendaTranslations } from '../translations';
import type { AgendaColumnId, AgendaFixedColumnId, AgendaTableColumnId } from '../types';

const agendaColumnsStorageKey = 'processes-tasks-agenda-columns-v3';
const agendaColumnWidthsStorageKey = 'processes-tasks-agenda-column-widths-v2';
const selectionColumnWidth = 64;

const defaultAgendaColumnWidths: Record<AgendaTableColumnId, number> = {
  folio: 140,
  type: 160,
  unit: 180,
  business: 200,
  title: 260,
  description: 320,
  createdAt: 190,
  startDate: 170,
  dueDate: 180,
  predecessor: 250,
  agendaTime: 170,
  status: 180,
  creator: 220,
  responsible: 240,
  priority: 160,
  attachments: 150,
  project: 240,
  completion: 190,
  notes: 280,
  weighting: 230,
  auditNotes: 320,
  actions: 330,
};

const minimumAgendaColumnWidths: Record<AgendaTableColumnId, number> = {
  folio: 110,
  type: 140,
  unit: 170,
  business: 180,
  title: 210,
  description: 240,
  createdAt: 170,
  startDate: 150,
  dueDate: 160,
  predecessor: 220,
  agendaTime: 150,
  status: 160,
  creator: 180,
  responsible: 220,
  priority: 140,
  attachments: 120,
  project: 220,
  completion: 160,
  notes: 240,
  weighting: 210,
  auditNotes: 280,
  actions: 310,
};

function createDefaultAgendaColumns(copy: AgendaTranslations): ColumnConfig[] {
  return [
    { id: 'folio', label: copy.columns.folio.label, visible: true, description: copy.columns.folio.description },
    { id: 'type', label: copy.columns.type.label, visible: true, description: copy.columns.type.description },
    { id: 'unit', label: copy.columns.unit.label, visible: false, description: copy.columns.unit.description },
    { id: 'business', label: copy.columns.business.label, visible: false, description: copy.columns.business.description },
    { id: 'title', label: copy.columns.title.label, visible: true, description: copy.columns.title.description },
    { id: 'description', label: copy.columns.description.label, visible: false, description: copy.columns.description.description },
    { id: 'createdAt', label: copy.columns.createdAt.label, visible: false, description: copy.columns.createdAt.description },
    { id: 'startDate', label: copy.columns.startDate.label, visible: false, description: copy.columns.startDate.description },
    { id: 'dueDate', label: copy.columns.dueDate.label, visible: true, description: copy.columns.dueDate.description },
    { id: 'predecessor', label: copy.columns.predecessor.label, visible: false, description: copy.columns.predecessor.description },
    { id: 'agendaTime', label: copy.columns.agendaTime.label, visible: true, description: copy.columns.agendaTime.description },
    { id: 'status', label: copy.columns.status.label, visible: true, description: copy.columns.status.description },
    { id: 'creator', label: copy.columns.creator.label, visible: false, description: copy.columns.creator.description },
    { id: 'responsible', label: copy.columns.responsible.label, visible: true, description: copy.columns.responsible.description },
    { id: 'priority', label: copy.columns.priority.label, visible: true, description: copy.columns.priority.description },
    { id: 'attachments', label: copy.columns.attachments.label, visible: true, description: copy.columns.attachments.description },
    { id: 'project', label: copy.columns.project.label, visible: true, description: copy.columns.project.description },
    { id: 'completion', label: copy.columns.completion.label, visible: true, description: copy.columns.completion.description },
    { id: 'notes', label: copy.columns.notes.label, visible: false, description: copy.columns.notes.description },
    { id: 'weighting', label: copy.columns.weighting.label, visible: true, description: copy.columns.weighting.description },
    { id: 'auditNotes', label: copy.columns.auditNotes.label, visible: false, description: copy.columns.auditNotes.description },
  ];
}

function getInitialAgendaColumns(defaultColumns: ColumnConfig[]) {
  if (typeof window === 'undefined') {
    return defaultColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(agendaColumnsStorageKey);
    if (!rawColumns) {
      return defaultColumns;
    }

    const parsedColumns = JSON.parse(rawColumns) as Array<Partial<ColumnConfig>>;
    const defaultColumnMap = new Map(defaultColumns.map((column) => [column.id, column]));
    const restoredColumns = parsedColumns
      .map((column) => {
        if (!column?.id || !defaultColumnMap.has(column.id)) {
          return null;
        }

        const baseColumn = defaultColumnMap.get(column.id)!;
        return {
          ...baseColumn,
          visible: typeof column.visible === 'boolean' ? column.visible : baseColumn.visible,
        };
      })
      .filter((column): column is ColumnConfig => column !== null);
    const missingColumns = defaultColumns.filter(
      (column) => !restoredColumns.some((restoredColumn) => restoredColumn.id === column.id),
    );

    return restoredColumns.length > 0 ? [...restoredColumns, ...missingColumns] : defaultColumns;
  } catch {
    return defaultColumns;
  }
}

function getInitialAgendaColumnWidths() {
  if (typeof window === 'undefined') {
    return defaultAgendaColumnWidths;
  }

  try {
    const rawWidths = window.localStorage.getItem(agendaColumnWidthsStorageKey);
    if (!rawWidths) {
      return defaultAgendaColumnWidths;
    }

    const parsedWidths = JSON.parse(rawWidths) as Record<string, unknown>;
    const nextWidths = { ...defaultAgendaColumnWidths };

    Object.entries(parsedWidths).forEach(([columnId, width]) => {
      if (!(columnId in defaultAgendaColumnWidths) || typeof width !== 'number') {
        return;
      }

      const supportedColumnId = columnId as AgendaTableColumnId;
      nextWidths[supportedColumnId] = Math.max(minimumAgendaColumnWidths[supportedColumnId], width);
    });

    return nextWidths;
  } catch {
    return defaultAgendaColumnWidths;
  }
}

export function useAgendaColumns(agendaCopy: AgendaTranslations) {
  const defaultAgendaColumns = useMemo(() => createDefaultAgendaColumns(agendaCopy), [agendaCopy]);
  const fixedAgendaColumns = useMemo<ColumnConfig[]>(
    () => [
      {
        id: 'actions',
        label: agendaCopy.columns.actions.label,
        visible: true,
        locked: true,
        description: agendaCopy.columns.actions.description,
      },
    ],
    [agendaCopy],
  );
  const [agendaColumns, setAgendaColumns] = useState<ColumnConfig[]>(() =>
    getInitialAgendaColumns(defaultAgendaColumns),
  );
  const [agendaColumnWidths, setAgendaColumnWidths] = useState<Record<AgendaTableColumnId, number>>(() =>
    getInitialAgendaColumnWidths(),
  );
  const [resizingColumn, setResizingColumn] = useState<AgendaTableColumnId | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(agendaColumnsStorageKey, JSON.stringify(agendaColumns));
  }, [agendaColumns]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(agendaColumnWidthsStorageKey, JSON.stringify(agendaColumnWidths));
  }, [agendaColumnWidths]);

  useEffect(() => {
    if (!resizingColumn) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.max(
        minimumAgendaColumnWidths[resizingColumn],
        resizeStartWidth + event.clientX - resizeStartX,
      );

      setAgendaColumnWidths((currentWidths) => ({
        ...currentWidths,
        [resizingColumn]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  const translatedAgendaColumns = useMemo(() => {
    const defaultColumnMap = new Map(defaultAgendaColumns.map((column) => [column.id, column]));

    return agendaColumns.map((column) => {
      const defaultColumn = defaultColumnMap.get(column.id);
      return defaultColumn ? { ...column, label: defaultColumn.label, description: defaultColumn.description } : column;
    });
  }, [agendaColumns, defaultAgendaColumns]);

  const visibleAgendaColumns = useMemo(
    () => translatedAgendaColumns.filter((column) => column.visible),
    [translatedAgendaColumns],
  );

  const agendaTableColumnCount = visibleAgendaColumns.length + fixedAgendaColumns.length + 1;
  const agendaTableMinWidth = useMemo(
    () =>
      Math.max(
        1120,
        selectionColumnWidth +
          visibleAgendaColumns.reduce(
            (totalWidth, column) => totalWidth + agendaColumnWidths[column.id as AgendaColumnId],
            0,
          ) +
          fixedAgendaColumns.reduce(
            (totalWidth, column) => totalWidth + agendaColumnWidths[column.id as AgendaFixedColumnId],
            0,
          ),
      ),
    [agendaColumnWidths, fixedAgendaColumns, visibleAgendaColumns],
  );

  const handleResizeStart = (event: ReactMouseEvent, columnId: AgendaTableColumnId) => {
    event.preventDefault();
    event.stopPropagation();
    setResizingColumn(columnId);
    setResizeStartX(event.clientX);
    setResizeStartWidth(agendaColumnWidths[columnId]);
  };

  return {
    agendaColumnWidths,
    agendaColumns,
    agendaTableColumnCount,
    agendaTableMinWidth,
    defaultAgendaColumns,
    fixedAgendaColumns,
    handleResizeStart,
    resizingColumn,
    selectionColumnWidth,
    setAgendaColumns,
    translatedAgendaColumns,
    visibleAgendaColumns,
  };
}
