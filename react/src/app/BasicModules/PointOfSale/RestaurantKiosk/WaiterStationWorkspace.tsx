import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Armchair,
  Check,
  ChevronDown,
  Circle,
  CircleDollarSign,
  Grip,
  Minus,
  Move,
  Pencil,
  Plus,
  RectangleHorizontal,
  ReceiptText,
  RotateCw,
  Save,
  Send,
  Square,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react';
import type {
  RestaurantOrder,
  RestaurantTable,
  RestaurantTableShape,
  RestaurantWorkspace,
} from './restaurantKioskApi';
import { RestaurantProductModal } from './RestaurantProductModal';

type TableSort = 'floor' | 'name' | 'status';

export type RestaurantWorkspaceMutation = (
  capability: string,
  payload: Record<string, unknown>,
  success: string,
) => Promise<boolean>;

export function RestaurantFloorPlanPanel({
  mutate,
  onSelectTable,
  selectedTableId,
  workspace,
}: {
  mutate: RestaurantWorkspaceMutation;
  onSelectTable: (table: RestaurantTable) => void;
  selectedTableId: number | null;
  workspace: RestaurantWorkspace;
}) {
  const [areaFilter, setAreaFilter] = useState('all');
  const [tableSort, setTableSort] = useState<TableSort>('floor');
  const areas = useMemo(
    () => [...new Set(workspace.tables.map(table => table.areaName).filter(Boolean))],
    [workspace.tables],
  );
  const visibleTables = useMemo(
    () => sortTables(
      workspace.tables.filter(table => areaFilter === 'all' || table.areaName === areaFilter),
      tableSort,
    ),
    [areaFilter, tableSort, workspace.tables],
  );
  const areaGroups = useMemo(() => groupTablesByArea(visibleTables), [visibleTables]);

  return (
    <TableMapPanel
      areaFilter={areaFilter}
      areaGroups={areaGroups}
      areas={areas}
      canEditFloorPlan={workspace.canEditFloorPlan}
      mutate={mutate}
      onAreaFilterChange={setAreaFilter}
      onSelectTable={onSelectTable}
      onSortChange={setTableSort}
      selectedTableId={selectedTableId}
      sort={tableSort}
      tableCount={workspace.tables.length}
      tables={workspace.tables}
    />
  );
}

export function WaiterStationWorkspace({
  mutate,
  workspace,
}: {
  mutate: RestaurantWorkspaceMutation;
  workspace: RestaurantWorkspace;
}) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(() => initialTableId(workspace.tables));
  const [guestCount, setGuestCount] = useState(1);
  const [mobilePane, setMobilePane] = useState<'tables' | 'order'>('tables');

  const selectedTable = workspace.tables.find(table => table.id === selectedTableId);
  const selectedOrder = workspace.orders.find(order => order.id === selectedTable?.orderId);

  useEffect(() => {
    if (selectedTableId != null && workspace.tables.some(table => table.id === selectedTableId)) return;
    setSelectedTableId(initialTableId(workspace.tables));
  }, [selectedTableId, workspace.tables]);

  const selectTable = (table: RestaurantTable) => {
    setSelectedTableId(table.id);
    setGuestCount(Math.max(1, table.guestCount || 1));
    setMobilePane('order');
  };

  const openSelectedTable = async () => {
    if (!selectedTable) return;
    await mutate(
      'pos.restaurant.order.open',
      { tableId: selectedTable.id, guestCount },
      `${selectedTable.name} se abrió correctamente.`,
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-waiter-workspace>
      <nav className="sticky top-0 z-20 grid grid-cols-2 gap-2 border-y border-slate-200 bg-white/95 p-2 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:rounded-xl sm:border sm:shadow-sm lg:hidden" data-mobile-waiter-navigation aria-label="Navegación de la estación de mesero">
        <button aria-pressed={mobilePane === 'tables'} className={`min-h-12 rounded-xl px-3 text-sm font-medium ${mobilePane === 'tables' ? 'bg-[#222831] text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'}`} onClick={() => setMobilePane('tables')} type="button">
          Mesas · {workspace.tables.length}
        </button>
        <button aria-pressed={mobilePane === 'order'} className={`min-h-12 rounded-xl px-3 text-sm font-medium disabled:opacity-40 ${mobilePane === 'order' ? 'bg-[#FF6B5E] text-[#222831]' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'}`} disabled={!selectedTable} onClick={() => setMobilePane('order')} type="button">
          {selectedTable ? selectedTable.name : 'Comanda'}{selectedOrder ? ` · ${selectedOrder.items.length}` : ''}
        </button>
      </nav>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className={`${mobilePane === 'tables' ? 'flex' : 'hidden'} min-h-0 min-w-0 lg:flex`}>
          <RestaurantFloorPlanPanel
            mutate={mutate}
            onSelectTable={selectTable}
            selectedTableId={selectedTableId}
            workspace={workspace}
          />
        </div>

        <div className={`${mobilePane === 'order' ? 'flex' : 'hidden'} min-h-0 min-w-0 lg:flex`}>
          <SelectedTablePanel
            guestCount={guestCount}
            onGuestCountChange={setGuestCount}
            onOpenTable={openSelectedTable}
            mutate={mutate}
            order={selectedOrder}
            selectedTable={selectedTable}
            sourceRegisterOpen={workspace.sourceRegisterOpen}
            workspace={workspace}
          />
        </div>
      </div>
    </div>
  );
}

function TableMapPanel({
  areaFilter,
  areaGroups,
  areas,
  canEditFloorPlan,
  mutate,
  onAreaFilterChange,
  onSelectTable,
  onSortChange,
  selectedTableId,
  sort,
  tableCount,
  tables,
}: {
  areaFilter: string;
  areaGroups: Array<{ areaName: string; tables: RestaurantTable[] }>;
  areas: string[];
  canEditFloorPlan: boolean;
  mutate: RestaurantWorkspaceMutation;
  onAreaFilterChange: (value: string) => void;
  onSelectTable: (table: RestaurantTable) => void;
  onSortChange: (value: TableSort) => void;
  selectedTableId: number | null;
  sort: TableSort;
  tableCount: number;
  tables: RestaurantTable[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editorTables, setEditorTables] = useState<RestaurantTable[]>(() => cloneTables(tables));
  const [editingTableId, setEditingTableId] = useState<number | null>(null);
  const [editorError, setEditorError] = useState('');
  const dragRef = useRef<FloorDrag | null>(null);

  useEffect(() => {
    if (!isEditing) setEditorTables(cloneTables(tables));
  }, [isEditing, tables]);

  const displayedGroups = useMemo(() => {
    if (!isEditing) return areaGroups;
    return groupTablesByArea(editorTables.filter(table => areaFilter === 'all' || table.areaName === areaFilter));
  }, [areaFilter, areaGroups, editorTables, isEditing]);
  const editingTable = editorTables.find(table => table.id === editingTableId);

  const beginEditing = () => {
    setEditorTables(cloneTables(tables));
    setEditingTableId(selectedTableId ?? tables[0]?.id ?? null);
    setEditorError('');
    onSortChange('floor');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    dragRef.current = null;
    setEditorTables(cloneTables(tables));
    setEditingTableId(null);
    setEditorError('');
    setIsEditing(false);
  };

  const saveFloorPlan = async () => {
    const validationError = validateEditorTables(editorTables);
    if (validationError) {
      setEditorError(validationError);
      return;
    }
    const saved = await mutate(
      'pos.restaurant.floor-plan.update',
      {
        tables: editorTables.map(table => ({
          tableId: table.id,
          name: table.name.trim(),
          capacity: table.capacity,
          shape: table.layoutShape,
          x: table.layoutX,
          y: table.layoutY,
          width: table.layoutWidth,
          height: table.layoutHeight,
          rotation: table.layoutRotation,
          version: table.version,
        })),
      },
      'El acomodo del salón se guardó correctamente.',
    );
    if (saved) {
      setEditingTableId(null);
      setEditorError('');
      setIsEditing(false);
    }
  };

  const updateEditorTable = (tableId: number, patch: Partial<RestaurantTable>) => {
    setEditorError('');
    setEditorTables(current => current.map(table => table.id === tableId ? { ...table, ...patch } : table));
  };

  const changeShape = (shape: RestaurantTableShape) => {
    if (!editingTable) return;
    const dimensions = shapeDimensions(shape, 0);
    setEditorTables(current => replaceTableShape(current, editingTable.id, shape, dimensions));
    setEditorError('');
  };

  const rotateTable = () => {
    if (!editingTable || editingTable.layoutShape !== 'RECTANGLE') return;
    const rotation = editingTable.layoutRotation === 90 ? 0 : 90;
    setEditorTables(current => replaceTableShape(
      current,
      editingTable.id,
      'RECTANGLE',
      shapeDimensions('RECTANGLE', rotation),
    ));
    setEditorError('');
  };

  const autoArrange = () => {
    setEditorTables(current => autoArrangeTables(current));
    setEditorError('');
  };

  return (
    <section className="flex min-h-[28rem] w-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950 sm:rounded-xl sm:border sm:border-[#222831]/10 sm:dark:border-slate-700 lg:min-h-0">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]">
                <Armchair aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-medium">Mapa de mesas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tableCount} mesas en el salón</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.length > 1 ? (
              <SelectControl
                ariaLabel="Filtrar mesas por área"
                onChange={onAreaFilterChange}
                value={areaFilter}
              >
                <option value="all">Todas las áreas</option>
                {areas.map(area => <option key={area} value={area}>{area}</option>)}
              </SelectControl>
            ) : null}
            {!isEditing ? (
              <SelectControl
                ariaLabel="Ordenar mesas"
                onChange={value => onSortChange(value as TableSort)}
                value={sort}
              >
                <option value="floor">Orden del salón</option>
                <option value="name">Nombre</option>
                <option value="status">Estado</option>
              </SelectControl>
            ) : null}
            {canEditFloorPlan && !isEditing ? (
              <button
                className="hidden h-11 items-center gap-2 rounded-xl bg-[#222831] px-3 text-xs font-medium text-white transition hover:bg-slate-700 lg:inline-flex"
                onClick={beginEditing}
                type="button"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />Editar salón
              </button>
            ) : null}
          </div>
        </div>

        {isEditing ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/[0.06] p-2.5">
            <p className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Move aria-hidden="true" className="h-4 w-4 text-[#B63B32]" />Arrastra las mesas y toca una para personalizarla.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-900" onClick={autoArrange} type="button">
                <Grip aria-hidden="true" className="h-4 w-4" />Acomodar automáticamente
              </button>
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-900" onClick={cancelEditing} type="button">
                <X aria-hidden="true" className="h-4 w-4" />Cancelar
              </button>
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FF6B5E] px-3 text-xs font-medium text-[#222831]" onClick={() => void saveFloorPlan()} type="button">
                <Save aria-hidden="true" className="h-4 w-4" />Guardar acomodo
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400" aria-label="Estados de las mesas">
            <TableLegend color="bg-emerald-500" label="Disponible" />
            <TableLegend color="bg-[#FF6B5E]" label="En servicio" />
            <TableLegend color="bg-amber-500" label="Cuenta solicitada" />
          </div>
        )}

        {isEditing && editingTable ? (
          <TableEditor
            onCapacityChange={capacity => updateEditorTable(editingTable.id, { capacity })}
            onNameChange={name => updateEditorTable(editingTable.id, { name })}
            onRotate={rotateTable}
            onShapeChange={changeShape}
            table={editingTable}
          />
        ) : null}
        {editorError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300" role="alert">{editorError}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] px-3 py-4 dark:bg-slate-900/65 sm:px-4">
        {displayedGroups.length === 0 ? (
          <EmptyState
            description="Cambia el filtro de área para volver a mostrar las mesas."
            icon={<Armchair className="h-8 w-8" />}
            title="No hay mesas en esta vista"
          />
        ) : displayedGroups.map(group => (
          <section className="mb-6 last:mb-0" key={group.areaName}>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">{group.areaName}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                {group.tables.length}
              </span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
            </div>
            {sort === 'floor' || isEditing ? (
              <FloorPlanCanvas
                dragRef={dragRef}
                editing={isEditing}
                editingTableId={editingTableId}
                onEditorTablesChange={setEditorTables}
                onSelectEditorTable={setEditingTableId}
                onSelectTable={onSelectTable}
                selectedTableId={selectedTableId}
                tables={group.tables}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {group.tables.map(table => (
                  <TableShapeButton
                    key={table.id}
                    onSelect={() => onSelectTable(table)}
                    selected={selectedTableId === table.id}
                    table={table}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

function TableShapeButton({
  onSelect,
  selected,
  table,
}: {
  onSelect: () => void;
  selected: boolean;
  table: RestaurantTable;
}) {
  const requested = ['READY_FOR_CHECKOUT', 'CLAIMED_FOR_CHECKOUT'].includes(table.orderStatus || '');
  const occupied = Boolean(table.orderId);
  const stateLabel = requested ? 'Cuenta solicitada' : occupied ? 'En servicio' : 'Disponible';
  const tone = requested
    ? 'border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100'
    : occupied
      ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-slate-950 dark:text-white'
      : 'border-emerald-300 bg-white text-slate-950 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-500/35 dark:bg-slate-950 dark:text-white dark:hover:bg-emerald-500/10';
  const ariaLabel = `${table.name}, ${stateLabel}, ${table.capacity} lugares${occupied ? `, total ${money(table.totalAmount)}` : ''}`;

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={`group relative mx-auto flex aspect-square w-full max-w-[8.6rem] flex-col items-center justify-center border-2 p-3 text-center shadow-sm outline-none transition focus-visible:ring-4 focus-visible:ring-[#FF6B5E]/25 ${tableShapeClass(table.layoutShape)} ${tone} ${selected ? 'ring-4 ring-[#FF6B5E]/20 shadow-[0_10px_28px_-18px_rgba(182,59,50,0.9)]' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`absolute right-[13%] top-[12%] h-3 w-3 rounded-full border-2 border-white shadow-sm dark:border-slate-950 ${requested ? 'bg-amber-500' : occupied ? 'bg-[#FF6B5E]' : 'bg-emerald-500'}`}
      />
      <span className="max-w-full truncate text-sm font-medium sm:text-base">{table.name}</span>
      <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
        {occupied ? `${Math.max(1, table.guestCount || 1)} personas` : `${table.capacity} lugares`}
      </span>
      <span className={`mt-1 text-xs font-medium ${requested ? 'text-amber-700 dark:text-amber-300' : occupied ? 'text-[#B63B32] dark:text-[#FFB0AA]' : 'text-emerald-700 dark:text-emerald-300'}`}>
        {occupied ? money(table.totalAmount) : stateLabel}
      </span>
      {occupied ? <span className="mt-1 max-w-full truncate text-[10px] text-slate-500 dark:text-slate-300" title={table.responsibleWaiterName || 'Mesero por asignar'}>{table.responsibleWaiterName ? `Mesero · ${table.responsibleWaiterName}` : 'Mesero por asignar'}</span> : null}
      {selected ? (
        <span className="absolute bottom-[4%] grid h-6 w-6 place-items-center rounded-full bg-[#222831] text-white" aria-hidden="true">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </button>
  );
}

type FloorDrag = {
  tableId: number;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

function FloorPlanCanvas({
  dragRef,
  editing,
  editingTableId,
  onEditorTablesChange,
  onSelectEditorTable,
  onSelectTable,
  selectedTableId,
  tables,
}: {
  dragRef: React.MutableRefObject<FloorDrag | null>;
  editing: boolean;
  editingTableId: number | null;
  onEditorTablesChange: React.Dispatch<React.SetStateAction<RestaurantTable[]>>;
  onSelectEditorTable: (tableId: number) => void;
  onSelectTable: (table: RestaurantTable) => void;
  selectedTableId: number | null;
  tables: RestaurantTable[];
}) {
  const occupiedRows = tables.reduce((maximum, table) => Math.max(maximum, table.layoutY + table.layoutHeight), 0);
  const rows = Math.max(12, occupiedRows + (editing ? 6 : 1));

  const pointerDown = (event: React.PointerEvent<HTMLButtonElement>, table: RestaurantTable) => {
    if (!editing) return;
    const canvas = event.currentTarget.closest<HTMLElement>('[data-floor-canvas]');
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const unit = bounds.width / 12;
    dragRef.current = {
      tableId: table.id,
      pointerId: event.pointerId,
      offsetX: (event.clientX - bounds.left) / unit - table.layoutX,
      offsetY: (event.clientY - bounds.top) / unit - table.layoutY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectEditorTable(table.id);
    event.preventDefault();
  };

  const pointerMove = (event: React.PointerEvent<HTMLButtonElement>, table: RestaurantTable) => {
    const drag = dragRef.current;
    if (!editing || !drag || drag.tableId !== table.id || drag.pointerId !== event.pointerId) return;
    const canvas = event.currentTarget.closest<HTMLElement>('[data-floor-canvas]');
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const unit = bounds.width / 12;
    const nextX = clamp(Math.round((event.clientX - bounds.left) / unit - drag.offsetX), 0, 12 - table.layoutWidth);
    const nextY = clamp(Math.round((event.clientY - bounds.top) / unit - drag.offsetY), 0, 999 - table.layoutHeight);
    onEditorTablesChange(current => canPlaceTable(current, table.id, table.areaId, nextX, nextY, table.layoutWidth, table.layoutHeight)
      ? current.map(item => item.id === table.id ? { ...item, layoutX: nextX, layoutY: nextY } : item)
      : current);
  };

  const pointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border ${editing ? 'border-[#FF6B5E]/35 bg-white shadow-inner dark:bg-slate-950' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
      data-floor-canvas
      data-floor-rows={rows}
      style={{
        aspectRatio: `12 / ${rows}`,
        backgroundImage: editing
          ? 'linear-gradient(to right, rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.16) 1px, transparent 1px)'
          : undefined,
        backgroundSize: editing ? `${100 / 12}% ${100 / rows}%` : undefined,
      }}
    >
      {tables.map(table => {
        const requested = ['READY_FOR_CHECKOUT', 'CLAIMED_FOR_CHECKOUT'].includes(table.orderStatus || '');
        const occupied = Boolean(table.orderId);
        const selected = editing ? editingTableId === table.id : selectedTableId === table.id;
        const stateLabel = requested ? 'Cuenta solicitada' : occupied ? 'En servicio' : 'Disponible';
        const tone = requested
          ? 'border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100'
          : occupied
            ? 'border-[#FF6B5E] bg-[#FF6B5E]/15 text-slate-950 dark:text-white'
            : 'border-emerald-300 bg-white text-slate-950 hover:border-emerald-500 dark:border-emerald-500/45 dark:bg-slate-900 dark:text-white';
        return (
          <button
            aria-label={`${editing ? 'Editar' : 'Seleccionar'} ${table.name}, ${stateLabel}`}
            aria-pressed={selected}
            className={`absolute flex select-none flex-col items-center justify-center overflow-hidden border-2 p-1.5 text-center shadow-sm outline-none transition-[box-shadow,border-color,background-color] focus-visible:ring-4 focus-visible:ring-[#FF6B5E]/25 ${tableShapeClass(table.layoutShape)} ${tone} ${selected ? 'z-10 ring-4 ring-[#FF6B5E]/25 shadow-lg' : ''} ${editing ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
            key={table.id}
            onClick={() => editing ? onSelectEditorTable(table.id) : onSelectTable(table)}
            onPointerCancel={pointerUp}
            onPointerDown={event => pointerDown(event, table)}
            onPointerMove={event => pointerMove(event, table)}
            onPointerUp={pointerUp}
            style={{
              left: `${(table.layoutX / 12) * 100}%`,
              top: `${(table.layoutY / rows) * 100}%`,
              width: `${(table.layoutWidth / 12) * 100}%`,
              height: `${(table.layoutHeight / rows) * 100}%`,
            }}
            type="button"
          >
            {editing ? <Grip aria-hidden="true" className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" /> : null}
            <span className="max-w-[88%] truncate text-xs font-medium sm:text-sm">{table.name}</span>
            <span className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-300 sm:text-[10px]">
              {occupied ? `${Math.max(1, table.guestCount || 1)} personas` : `${table.capacity} lugares`}
            </span>
            <span className={`mt-0.5 text-[9px] font-medium sm:text-[10px] ${requested ? 'text-amber-700 dark:text-amber-300' : occupied ? 'text-[#B63B32] dark:text-[#FFB0AA]' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {occupied ? money(table.totalAmount) : stateLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TableEditor({
  onCapacityChange,
  onNameChange,
  onRotate,
  onShapeChange,
  table,
}: {
  onCapacityChange: (capacity: number) => void;
  onNameChange: (name: string) => void;
  onRotate: () => void;
  onShapeChange: (shape: RestaurantTableShape) => void;
  table: RestaurantTable;
}) {
  return (
    <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-[#F7F8FA] p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(13rem,1fr)]">
      <label className="min-w-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        Nombre visible
        <input
          aria-label="Nombre visible de la mesa"
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-4 focus:ring-[#FF6B5E]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          maxLength={160}
          onChange={event => onNameChange(event.target.value)}
          value={table.name}
        />
        <span className="mt-1 block truncate font-normal text-slate-400">Código estable: {table.code}</span>
      </label>
      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
        Lugares
        <input
          aria-label="Capacidad de la mesa"
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#FF6B5E] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          max={100}
          min={1}
          onChange={event => onCapacityChange(clamp(Number(event.target.value) || 1, 1, 100))}
          type="number"
          value={table.capacity}
        />
      </label>
      <div>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Forma</p>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          <ShapeButton active={table.layoutShape === 'ROUND'} icon={<Circle className="h-4 w-4" />} label="Redonda" onClick={() => onShapeChange('ROUND')} />
          <ShapeButton active={table.layoutShape === 'SQUARE'} icon={<Square className="h-4 w-4" />} label="Cuadrada" onClick={() => onShapeChange('SQUARE')} />
          <ShapeButton active={table.layoutShape === 'RECTANGLE'} icon={<RectangleHorizontal className="h-4 w-4" />} label="Rectangular" onClick={() => onShapeChange('RECTANGLE')} />
        </div>
        {table.layoutShape === 'RECTANGLE' ? (
          <button className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#B63B32] dark:text-[#FFB0AA]" onClick={onRotate} type="button">
            <RotateCw aria-hidden="true" className="h-3.5 w-3.5" />Girar {table.layoutRotation === 90 ? 'horizontal' : 'vertical'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ShapeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={`Usar mesa ${label.toLocaleLowerCase('es-MX')}`}
      aria-pressed={active}
      className={`flex h-10 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-medium transition ${active ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}<span className="hidden 2xl:inline">{label}</span>
    </button>
  );
}

function SelectedTablePanel({
  guestCount,
  mutate,
  onGuestCountChange,
  onOpenTable,
  order,
  selectedTable,
  sourceRegisterOpen,
  workspace,
}: {
  guestCount: number;
  mutate: RestaurantWorkspaceMutation;
  onGuestCountChange: (value: number) => void;
  onOpenTable: () => Promise<void>;
  order?: RestaurantOrder;
  selectedTable?: RestaurantTable;
  sourceRegisterOpen: boolean;
  workspace: RestaurantWorkspace;
}) {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const drafts = order?.items.filter(item => item.status === 'DRAFT').length ?? 0;

  useEffect(() => {
    if (!order) setIsProductModalOpen(false);
  }, [order]);

  return (
    <section className="flex min-h-[calc(100dvh-13rem)] w-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950 sm:rounded-xl sm:border sm:border-[#222831]/10 sm:dark:border-slate-700 lg:min-h-0">
      <SelectedTableHeader order={order} table={selectedTable} />

      {!selectedTable ? (
        <div className="min-h-0 flex-1 bg-[#F7F8FA] p-4 dark:bg-slate-900/60">
          <EmptyState
            description="Toca una mesa del mapa para consultar su comanda o comenzar el servicio."
            icon={<Armchair className="h-9 w-9" />}
            title="Selecciona una mesa"
          />
        </div>
      ) : !order ? (
        <OpenTableState
          guestCount={guestCount}
          onGuestCountChange={onGuestCountChange}
          onOpenTable={onOpenTable}
          sourceRegisterOpen={sourceRegisterOpen}
          table={selectedTable}
        />
      ) : (
        <>
          <CommandToolbar
            onAddProducts={() => setIsProductModalOpen(true)}
            order={order}
            sourceRegisterOpen={sourceRegisterOpen}
          />
          <div className="min-h-0 flex-1 overflow-hidden bg-[#F7F8FA] dark:bg-slate-900/60">
            <OrderContents
              mutate={mutate}
              onAddProducts={() => setIsProductModalOpen(true)}
              order={order}
            />
          </div>
          <OrderActionBar
            drafts={drafts}
            mutate={mutate}
            order={order}
            sourceRegisterOpen={sourceRegisterOpen}
          />
          {isProductModalOpen ? (
            <RestaurantProductModal
              mutate={mutate}
              onClose={() => setIsProductModalOpen(false)}
              order={order}
              products={workspace.catalog ?? []}
              sourceRegisterOpen={sourceRegisterOpen}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function SelectedTableHeader({ order, table }: { order?: RestaurantOrder; table?: RestaurantTable }) {
  const waiterName = order?.responsibleWaiterName || table?.responsibleWaiterName;
  return (
    <div className="flex min-h-[5.25rem] flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#222831] px-4 py-3 text-white">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/20 text-[#FFB0AA]">
          <Utensils aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-slate-300">{order?.orderNumber || 'Mesa seleccionada'}</p>
          <h2 className="truncate text-xl font-medium">{table?.name || 'Comanda actual'}</h2>
          {table ? <p className="truncate text-xs text-slate-400">{table.areaName} · {table.capacity} lugares{order ? ` · ${waiterName ? `Mesero ${waiterName}` : 'Mesero por asignar'}` : ''}</p> : null}
        </div>
      </div>
      {table ? (
        <div className="text-right">
          <p className="text-xs text-slate-300">{order ? `${order.guestCount} personas` : 'Disponible'}</p>
          <p className="mt-0.5 text-lg font-medium text-white">{order ? money(order.totalAmount) : 'Sin consumo'}</p>
        </div>
      ) : null}
    </div>
  );
}

function OpenTableState({
  guestCount,
  onGuestCountChange,
  onOpenTable,
  sourceRegisterOpen,
  table,
}: {
  guestCount: number;
  onGuestCountChange: (value: number) => void;
  onOpenTable: () => Promise<void>;
  sourceRegisterOpen: boolean;
  table: RestaurantTable;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-slate-900/60">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Armchair aria-hidden="true" className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-2xl font-medium">{table.name} está disponible</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          Indica cuántas personas ocuparán la mesa y comienza una nueva comanda.
        </p>

        <div className="mx-auto mt-6 max-w-xs rounded-xl border border-slate-200 bg-[#F7F8FA] p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-sm font-medium">Número de personas</p>
          <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
            <button
              aria-label="Reducir número de personas"
              className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950"
              disabled={guestCount <= 1}
              onClick={() => onGuestCountChange(Math.max(1, guestCount - 1))}
              type="button"
            >
              <Minus aria-hidden="true" className="h-5 w-5" />
            </button>
            <output className="text-3xl font-medium" aria-label={`${guestCount} personas`}>{guestCount}</output>
            <button
              aria-label="Aumentar número de personas"
              className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950"
              disabled={guestCount >= Math.max(20, table.capacity)}
              onClick={() => onGuestCountChange(Math.min(Math.max(20, table.capacity), guestCount + 1))}
              type="button"
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <button
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-base font-medium text-[#222831] shadow-sm transition hover:bg-[#ff5a4c] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!sourceRegisterOpen}
          onClick={() => void onOpenTable()}
          type="button"
        >
          <ReceiptText aria-hidden="true" className="h-5 w-5" />
          Abrir mesa y crear comanda
        </button>
      </div>
    </div>
  );
}

function CommandToolbar({
  onAddProducts,
  order,
  sourceRegisterOpen,
}: {
  onAddProducts: () => void;
  order: RestaurantOrder;
  sourceRegisterOpen: boolean;
}) {
  return (
    <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div>
        <div className="flex items-center gap-2">
          <ReceiptText aria-hidden="true" className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
          <h3 className="text-lg font-medium">Comanda por comensal</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{order.items.length}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{order.guestCount} personas · cada partida conserva a quién pertenece</p>
      </div>
      <button
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#ff5a4c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        disabled={!sourceRegisterOpen || ['READY_FOR_CHECKOUT', 'CLAIMED_FOR_CHECKOUT'].includes(order.status)}
        onClick={onAddProducts}
        type="button"
      >
        <ShoppingBag aria-hidden="true" className="h-5 w-5" />Agregar productos
      </button>
    </div>
  );
}

function OrderContents({
  mutate,
  onAddProducts,
  order,
}: {
  mutate: RestaurantWorkspaceMutation;
  onAddProducts: () => void;
  order: RestaurantOrder;
}) {
  if (order.items.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <EmptyState
          action={<button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#222831] px-4 py-3 text-sm font-medium text-white" onClick={onAddProducts} type="button"><Plus className="h-4 w-4" />Agregar el primer producto</button>}
          description="Agrega productos para comenzar a preparar la orden de esta mesa."
          icon={<ReceiptText className="h-9 w-9" />}
          title="La comanda está vacía"
        />
      </div>
    );
  }

  const groups = Array.from({ length: order.guestCount }, (_, index) => {
    const guestNumber = index + 1;
    const items = order.items.filter(item => (item.guestNumber || 1) === guestNumber);
    return {
      guestNumber,
      items,
      subtotal: items.reduce((total, item) => total + Number(item.lineTotal || 0), 0),
    };
  });

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4">
      <div className="grid items-start gap-3 2xl:grid-cols-2">
        {groups.map(group => (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950" key={group.guestNumber}>
            <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FF6B5E]/10 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA]">{group.guestNumber}</span>
                <div><h4 className="text-sm font-medium">Comensal {group.guestNumber}</h4><p className="text-[11px] text-slate-500">{group.items.length} partidas</p></div>
              </div>
              <span className="text-sm font-medium">{money(group.subtotal)}</span>
            </header>
            {group.items.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs text-slate-400">Aún no tiene productos asignados.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.items.map(item => (
                  <article className="p-3" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <span className="grid h-10 min-w-10 place-items-center rounded-xl bg-[#FF6B5E]/10 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA]">{Number(item.quantity)}×</span>
                        <div className="min-w-0"><h5 className="text-sm font-medium leading-5">{item.name}</h5>{item.notes || item.modifierSummary ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{item.modifierSummary || item.notes}</p> : null}<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{money(item.unitPrice)} c/u</p></div>
                      </div>
                      <span className="shrink-0 text-sm font-medium">{money(item.lineTotal)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <OrderStatusBadge status={item.status} />
                      {item.status === 'READY' ? (
                        <button className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" onClick={() => void mutate('pos.restaurant.item.status', { itemId: item.id, status: 'SERVED' }, 'Partida marcada como servida.')} type="button"><Check aria-hidden="true" className="h-4 w-4" />Marcar servido</button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function OrderActionBar({
  drafts,
  mutate,
  order,
  sourceRegisterOpen,
}: {
  drafts: number;
  mutate: RestaurantWorkspaceMutation;
  order: RestaurantOrder;
  sourceRegisterOpen: boolean;
}) {
  const canRequestCheck = drafts === 0 && order.items.length > 0 && !['READY_FOR_CHECKOUT', 'CLAIMED_FOR_CHECKOUT'].includes(order.status);

  return (
    <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Comanda actual</p>
          <p className="text-sm font-medium">{order.items.length} partidas · {drafts} por enviar</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-xl font-medium">{money(order.totalAmount)}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#222831] px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!sourceRegisterOpen || drafts === 0}
          onClick={() => void mutate('pos.restaurant.round.send', { orderId: order.id }, 'La ronda se envió a cocina.')}
          type="button"
        >
          <Send aria-hidden="true" className="h-4 w-4" />Enviar {drafts} a cocina
        </button>
        <button
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] transition hover:bg-[#ff5a4c] disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!canRequestCheck}
          onClick={() => void mutate('pos.restaurant.check.request', { orderId: order.id }, 'La cuenta se envió a la caja asignada.')}
          type="button"
        >
          <CircleDollarSign aria-hidden="true" className="h-4 w-4" />Solicitar cuenta
        </button>
      </div>
    </footer>
  );
}

function SelectControl({
  ariaLabel,
  children,
  onChange,
  value,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{ariaLabel}</span>
      <select
        aria-label={ariaLabel}
        className="h-11 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-medium text-slate-700 outline-none focus-visible:ring-4 focus-visible:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        onChange={event => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function TableLegend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />{label}</span>;
}

function OrderStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    ACKNOWLEDGED: 'Confirmado por cocina',
    DRAFT: 'Por enviar',
    PREPARING: 'En preparación',
    READY: 'Listo para servir',
    SENT: 'Enviado a cocina',
    SERVED: 'Servido',
  };
  const tones: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    READY: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    SERVED: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[status] || 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>{labels[status] || status}</span>;
}

function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-[18rem] h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#FF6B5E]/30 bg-[#FF6B5E]/[0.04] p-6 text-center">
      <span className="text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden="true">{icon}</span>
      <h3 className="mt-3 text-xl font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action}
    </div>
  );
}

export function initialTableId(tables: RestaurantTable[]) {
  return tables.find(table => table.orderId)?.id ?? tables[0]?.id ?? null;
}

function sortTables(tables: RestaurantTable[], sort: TableSort) {
  if (sort === 'floor') return tables;
  return [...tables].sort((left, right) => {
    if (sort === 'status') {
      const stateDifference = tablePriority(left) - tablePriority(right);
      if (stateDifference !== 0) return stateDifference;
    }
    return left.name.localeCompare(right.name, 'es-MX', { numeric: true, sensitivity: 'base' });
  });
}

function groupTablesByArea(tables: RestaurantTable[]) {
  const groups = new Map<string, RestaurantTable[]>();
  tables.forEach(table => {
    const areaName = table.areaName || 'Sin área';
    groups.set(areaName, [...(groups.get(areaName) ?? []), table]);
  });
  return [...groups.entries()].map(([areaName, areaTables]) => ({ areaName, tables: areaTables }));
}

function cloneTables(tables: RestaurantTable[]) {
  return tables.map(table => ({ ...table }));
}

function tableShapeClass(shape: RestaurantTableShape) {
  if (shape === 'ROUND') return 'rounded-full';
  if (shape === 'RECTANGLE') return 'rounded-2xl';
  return 'rounded-xl';
}

function shapeDimensions(shape: RestaurantTableShape, rotation: number) {
  if (shape === 'RECTANGLE') {
    return rotation === 90
      ? { layoutWidth: 2, layoutHeight: 4, layoutRotation: 90 as const }
      : { layoutWidth: 4, layoutHeight: 2, layoutRotation: 0 as const };
  }
  return { layoutWidth: 3, layoutHeight: 3, layoutRotation: 0 as const };
}

function replaceTableShape(
  tables: RestaurantTable[],
  tableId: number,
  shape: RestaurantTableShape,
  dimensions: Pick<RestaurantTable, 'layoutWidth' | 'layoutHeight' | 'layoutRotation'>,
) {
  const current = tables.find(table => table.id === tableId);
  if (!current) return tables;
  const preferredX = clamp(current.layoutX, 0, 12 - dimensions.layoutWidth);
  const preferredY = current.layoutY;
  const position = canPlaceTable(
    tables,
    tableId,
    current.areaId,
    preferredX,
    preferredY,
    dimensions.layoutWidth,
    dimensions.layoutHeight,
  )
    ? { x: preferredX, y: preferredY }
    : findOpenPosition(tables, tableId, current.areaId, dimensions.layoutWidth, dimensions.layoutHeight);
  return tables.map(table => table.id === tableId ? {
    ...table,
    layoutShape: shape,
    layoutX: position.x,
    layoutY: position.y,
    ...dimensions,
  } : table);
}

function autoArrangeTables(tables: RestaurantTable[]) {
  const arranged = tables.map(table => ({ ...table }));
  const areaIds = [...new Set(arranged.map(table => table.areaId))];
  areaIds.forEach(areaId => {
    const areaTables = arranged
      .filter(table => table.areaId === areaId)
      .sort((left, right) => left.layoutY - right.layoutY || left.layoutX - right.layoutX || left.id - right.id);
    const placed: RestaurantTable[] = [];
    areaTables.forEach(table => {
      const position = findOpenPositionWithGutter(placed, table.layoutWidth, table.layoutHeight);
      table.layoutX = position.x;
      table.layoutY = position.y;
      placed.push(table);
    });
  });
  return arranged;
}

function findOpenPosition(
  tables: RestaurantTable[],
  tableId: number,
  areaId: number,
  width: number,
  height: number,
) {
  for (let y = 0; y <= 999 - height; y += 1) {
    for (let x = 0; x <= 12 - width; x += 1) {
      if (canPlaceTable(tables, tableId, areaId, x, y, width, height)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

function findOpenPositionWithGutter(tables: RestaurantTable[], width: number, height: number) {
  for (let y = 0; y <= 999 - height; y += 1) {
    for (let x = 0; x <= 12 - width; x += 1) {
      const collides = tables.some(table => rectanglesOverlap(
        x,
        y,
        width,
        height,
        Math.max(0, table.layoutX - 1),
        Math.max(0, table.layoutY - 1),
        table.layoutWidth + (table.layoutX > 0 ? 1 : 0) + (table.layoutX + table.layoutWidth < 12 ? 1 : 0),
        table.layoutHeight + (table.layoutY > 0 ? 1 : 0) + 1,
      ));
      if (!collides) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

function canPlaceTable(
  tables: RestaurantTable[],
  tableId: number,
  areaId: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return x >= 0 && y >= 0 && x + width <= 12 && y + height <= 1000
    && !tables.some(table => table.id !== tableId
      && table.areaId === areaId
      && rectanglesOverlap(
        x,
        y,
        width,
        height,
        table.layoutX,
        table.layoutY,
        table.layoutWidth,
        table.layoutHeight,
      ));
}

function rectanglesOverlap(
  leftX: number,
  leftY: number,
  leftWidth: number,
  leftHeight: number,
  rightX: number,
  rightY: number,
  rightWidth: number,
  rightHeight: number,
) {
  return leftX < rightX + rightWidth
    && leftX + leftWidth > rightX
    && leftY < rightY + rightHeight
    && leftY + leftHeight > rightY;
}

function validateEditorTables(tables: RestaurantTable[]) {
  const namesByArea = new Map<number, Set<string>>();
  for (const table of tables) {
    const name = table.name.trim();
    if (!name) return 'Cada mesa necesita un nombre visible.';
    const normalizedName = name.toLocaleLowerCase('es-MX');
    const names = namesByArea.get(table.areaId) ?? new Set<string>();
    if (names.has(normalizedName)) return `El nombre “${name}” está repetido dentro de ${table.areaName}.`;
    names.add(normalizedName);
    namesByArea.set(table.areaId, names);
    if (table.orderId && table.capacity < Math.max(1, table.guestCount || 1)) {
      return `${table.name} tiene una comanda activa y no puede reducirse por debajo de sus comensales.`;
    }
  }
  for (let index = 0; index < tables.length; index += 1) {
    const left = tables[index];
    const overlap = tables.slice(index + 1).find(right => left.areaId === right.areaId && rectanglesOverlap(
      left.layoutX,
      left.layoutY,
      left.layoutWidth,
      left.layoutHeight,
      right.layoutX,
      right.layoutY,
      right.layoutWidth,
      right.layoutHeight,
    ));
    if (overlap) return `${left.name} y ${overlap.name} se están superponiendo.`;
  }
  return '';
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function tablePriority(table: RestaurantTable) {
  if (['READY_FOR_CHECKOUT', 'CLAIMED_FOR_CHECKOUT'].includes(table.orderStatus || '')) return 0;
  if (table.orderId) return 1;
  return 2;
}

function money(value?: number | string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
}
