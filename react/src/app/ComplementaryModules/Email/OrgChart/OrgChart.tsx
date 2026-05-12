import { DragEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  defaultProcessOrgChartAssignments,
  OrgChartAssignment,
  OrgCollaborator,
  processOrgCollaborators,
} from '../mockData';

const STORAGE_KEY = 'indice-processes-orgchart-v1';
const NODE_WIDTH = 160;
const NODE_HEIGHT = 76;
const HORIZONTAL_GAP = 220;
const VERTICAL_GAP = 132;
const PADDING_X = 120;
const PADDING_Y = 56;

interface CanvasPosition {
  x: number;
  y: number;
}

interface DragState {
  collaboratorId: number;
  offsetX: number;
  offsetY: number;
}

interface SavedOrgChartState {
  assignments: OrgChartAssignment[];
  manualPositions: Record<number, CanvasPosition>;
  levelCount: number;
  zoom: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getChildren = (assignments: OrgChartAssignment[], managerId: number | null) =>
  assignments
    .filter((assignment) => assignment.managerId === managerId)
    .map((assignment) => assignment.collaboratorId);

const getDepth = (assignments: OrgChartAssignment[], collaboratorId: number) => {
  let depth = 0;
  let current = assignments.find((assignment) => assignment.collaboratorId === collaboratorId) ?? null;

  while (current?.managerId != null) {
    depth += 1;
    current =
      assignments.find((assignment) => assignment.collaboratorId === current?.managerId) ?? null;
  }

  return depth;
};

const managerChainContains = (
  assignments: OrgChartAssignment[],
  startingManagerId: number | null,
  collaboratorId: number,
) => {
  let currentId = startingManagerId;

  while (currentId != null) {
    if (currentId === collaboratorId) {
      return true;
    }

    currentId =
      assignments.find((assignment) => assignment.collaboratorId === currentId)?.managerId ?? null;
  }

  return false;
};

const buildAutoLayout = (assignments: OrgChartAssignment[], levelCount: number) => {
  const widthMap = new Map<number, number>();

  const getWidth = (collaboratorId: number): number => {
    const children = getChildren(assignments, collaboratorId);

    if (children.length === 0) {
      widthMap.set(collaboratorId, 1);
      return 1;
    }

    const total = children.reduce((sum, childId) => sum + getWidth(childId), 0);
    const width = Math.max(1, total);
    widthMap.set(collaboratorId, width);

    return width;
  };

  const positions: Record<number, CanvasPosition> = {};
  const roots = getChildren(assignments, null);

  roots.forEach((rootId) => {
    getWidth(rootId);
  });

  let cursor = 0;

  const placeNode = (collaboratorId: number, depth: number, startUnit: number) => {
    const children = getChildren(assignments, collaboratorId);
    const width = widthMap.get(collaboratorId) ?? 1;
    const centerUnit = startUnit + width / 2;

    positions[collaboratorId] = {
      x: PADDING_X + centerUnit * HORIZONTAL_GAP - NODE_WIDTH / 2,
      y: PADDING_Y + depth * VERTICAL_GAP,
    };

    let childCursor = startUnit;

    children.forEach((childId) => {
      placeNode(childId, depth + 1, childCursor);
      childCursor += widthMap.get(childId) ?? 1;
    });
  };

  roots.forEach((rootId) => {
    placeNode(rootId, 0, cursor);
    cursor += (widthMap.get(rootId) ?? 1) + 0.55;
  });

  const canvasWidth = Math.max(980, PADDING_X * 2 + cursor * HORIZONTAL_GAP + NODE_WIDTH);
  const canvasHeight = Math.max(
    540,
    PADDING_Y * 2 + Math.max(levelCount - 1, 0) * VERTICAL_GAP + NODE_HEIGHT + 36,
  );

  return { positions, canvasWidth, canvasHeight };
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export default function OrgChart() {
  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState<OrgChartAssignment[]>(
    defaultProcessOrgChartAssignments,
  );
  const [manualPositions, setManualPositions] = useState<Record<number, CanvasPosition>>({});
  const [levelCount, setLevelCount] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(
    defaultProcessOrgChartAssignments[0]?.collaboratorId ?? null,
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    'Arrastra colaboradores al lienzo o sobre otro nodo para definir jerarquias.',
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return;
    }

    try {
      const savedState = JSON.parse(rawState) as SavedOrgChartState;

      if (Array.isArray(savedState.assignments)) {
        setAssignments(savedState.assignments);
      }

      if (savedState.manualPositions && typeof savedState.manualPositions === 'object') {
        setManualPositions(savedState.manualPositions);
      }

      if (typeof savedState.levelCount === 'number') {
        setLevelCount(savedState.levelCount);
      }

      if (typeof savedState.zoom === 'number') {
        setZoom(savedState.zoom);
      }

      setStatusMessage('Organigrama cargado desde tu ultima configuracion guardada.');
    } catch {
      setStatusMessage('No se pudo cargar el organigrama guardado. Se uso la configuracion base.');
    }
  }, []);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const { canvasWidth, canvasHeight } = buildAutoLayout(
      assignments,
      Math.max(levelCount, Math.max(...assignments.map((assignment) => getDepth(assignments, assignment.collaboratorId))) + 1),
    );

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const nextX =
        (event.clientX - bounds.left + canvas.scrollLeft) / zoom - dragState.offsetX;
      const nextY =
        (event.clientY - bounds.top + canvas.scrollTop) / zoom - dragState.offsetY;

      setManualPositions((prev) => ({
        ...prev,
        [dragState.collaboratorId]: {
          x: clamp(nextX, 24, canvasWidth - NODE_WIDTH - 24),
          y: clamp(nextY, 24, canvasHeight - NODE_HEIGHT - 24),
        },
      }));
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [assignments, dragState, levelCount, zoom]);

  const collaboratorMap = new Map(
    processOrgCollaborators.map((collaborator) => [collaborator.id, collaborator]),
  );
  const assignedIds = new Set(assignments.map((assignment) => assignment.collaboratorId));
  const requiredLevels =
    assignments.length > 0
      ? Math.max(...assignments.map((assignment) => getDepth(assignments, assignment.collaboratorId))) + 1
      : 1;
  const displayLevels = Math.max(levelCount, requiredLevels);
  const autoLayout = buildAutoLayout(assignments, displayLevels);
  const actualPositions = assignments.reduce<Record<number, CanvasPosition>>((acc, assignment) => {
    acc[assignment.collaboratorId] =
      manualPositions[assignment.collaboratorId] ?? autoLayout.positions[assignment.collaboratorId];
    return acc;
  }, {});

  const connectors = assignments
    .filter((assignment) => assignment.managerId != null)
    .map((assignment) => {
      const parentPosition = actualPositions[assignment.managerId as number];
      const childPosition = actualPositions[assignment.collaboratorId];

      if (!parentPosition || !childPosition) {
        return null;
      }

      const startX = parentPosition.x + NODE_WIDTH / 2;
      const startY = parentPosition.y + NODE_HEIGHT;
      const endX = childPosition.x + NODE_WIDTH / 2;
      const endY = childPosition.y;
      const middleY = startY + (endY - startY) / 2;

      return {
        id: `${assignment.managerId}-${assignment.collaboratorId}`,
        path: `M ${startX} ${startY} V ${middleY} H ${endX} V ${endY}`,
      };
    })
    .filter(Boolean) as { id: string; path: string }[];

  const filteredCollaborators = processOrgCollaborators
    .filter((collaborator) => {
      const search = searchQuery.toLowerCase();

      return (
        collaborator.name.toLowerCase().includes(search) ||
        collaborator.role.toLowerCase().includes(search) ||
        collaborator.area.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const assignedWeight = Number(assignedIds.has(b.id)) - Number(assignedIds.has(a.id));

      if (assignedWeight !== 0) {
        return assignedWeight;
      }

      return a.name.localeCompare(b.name);
    });

  const selectedCollaborator =
    processOrgCollaborators.find((collaborator) => collaborator.id === selectedNodeId) ?? null;
  const selectedAssignment =
    assignments.find((assignment) => assignment.collaboratorId === selectedNodeId) ?? null;
  const assignedCount = assignments.length;
  const availableCount = processOrgCollaborators.length - assignedCount;

  const getManagerName = (managerId: number | null) =>
    managerId == null ? 'Raiz principal' : collaboratorMap.get(managerId)?.name ?? 'Sin asignar';

  const startNodeDrag = (event: MouseEvent<HTMLButtonElement>, collaboratorId: number) => {
    const canvas = canvasRef.current;
    const currentPosition = actualPositions[collaboratorId];

    if (!canvas || !currentPosition) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();

    setSelectedNodeId(collaboratorId);
    setDragState({
      collaboratorId,
      offsetX: (event.clientX - bounds.left + canvas.scrollLeft) / zoom - currentPosition.x,
      offsetY: (event.clientY - bounds.top + canvas.scrollTop) / zoom - currentPosition.y,
    });
  };

  const assignCollaborator = (collaboratorId: number, managerId: number | null) => {
    if (collaboratorId === managerId) {
      setStatusMessage('Un colaborador no puede reportarse a si mismo.');
      return;
    }

    if (managerChainContains(assignments, managerId, collaboratorId)) {
      setStatusMessage('No puedes asignar un colaborador debajo de uno de sus reportes.');
      return;
    }

    setAssignments((prev) => {
      const exists = prev.some((assignment) => assignment.collaboratorId === collaboratorId);

      if (exists) {
        return prev.map((assignment) =>
          assignment.collaboratorId === collaboratorId ? { ...assignment, managerId } : assignment,
        );
      }

      return [...prev, { collaboratorId, managerId }];
    });

    setManualPositions((prev) => {
      const next = { ...prev };
      delete next[collaboratorId];
      return next;
    });
    setSelectedNodeId(collaboratorId);
    setStatusMessage(
      managerId == null
        ? 'Colaborador agregado al nivel raiz del organigrama.'
        : 'Jerarquia actualizada correctamente.',
    );
  };

  const readDraggedCollaborator = (event: DragEvent<HTMLElement>) => {
    const collaboratorId = Number(event.dataTransfer.getData('text/org-collaborator'));
    return Number.isFinite(collaboratorId) ? collaboratorId : null;
  };

  const handleCollaboratorDragStart = (
    event: DragEvent<HTMLButtonElement>,
    collaboratorId: number,
  ) => {
    event.dataTransfer.setData('text/org-collaborator', String(collaboratorId));
    event.dataTransfer.effectAllowed = 'move';
    setSelectedNodeId(collaboratorId);
  };

  const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const collaboratorId = readDraggedCollaborator(event);

    if (collaboratorId == null) {
      return;
    }

    assignCollaborator(collaboratorId, null);
  };

  const handleNodeDrop = (event: DragEvent<HTMLButtonElement>, managerId: number) => {
    event.preventDefault();
    event.stopPropagation();

    const collaboratorId = readDraggedCollaborator(event);

    if (collaboratorId == null) {
      return;
    }

    assignCollaborator(collaboratorId, managerId);
  };

  const handleMoveSelectedToRoot = () => {
    if (selectedNodeId == null) {
      return;
    }

    assignCollaborator(selectedNodeId, null);
  };

  const handleRemoveSelected = () => {
    if (selectedNodeId == null) {
      return;
    }

    setAssignments((prev) =>
      prev
        .filter((assignment) => assignment.collaboratorId !== selectedNodeId)
        .map((assignment) =>
          assignment.managerId === selectedNodeId ? { ...assignment, managerId: null } : assignment,
        ),
    );
    setManualPositions((prev) => {
      const next = { ...prev };
      delete next[selectedNodeId];
      return next;
    });
    setStatusMessage('Colaborador retirado del organigrama y sus reportes quedaron en raiz.');
    setSelectedNodeId(null);
  };

  const handleAutoOrganize = () => {
    setManualPositions({});
    setStatusMessage('Organigrama reorganizado automaticamente.');
  };

  const handleReset = () => {
    setAssignments(defaultProcessOrgChartAssignments);
    setManualPositions({});
    setLevelCount(3);
    setZoom(1);
    setSelectedNodeId(defaultProcessOrgChartAssignments[0]?.collaboratorId ?? null);
    setStatusMessage('Organigrama reiniciado a la configuracion base.');
  };

  const handleSave = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const stateToSave: SavedOrgChartState = {
      assignments,
      manualPositions,
      levelCount: displayLevels,
      zoom,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    setLastSavedAt(
      new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    );
    setStatusMessage('Organigrama guardado localmente en este navegador.');
  };

  return (
    <>
      <div className="bg-[rgb(235,165,52)]/10 dark:bg-[rgb(235,165,52)]/15 rounded-lg p-6 mb-6 border border-[rgb(235,165,52)]/30 dark:border-[rgb(235,165,52)]/40">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-2xl">🏢</span>
              Organigrama
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Arrastra colaboradores para construir niveles jerarquicos y visualizar la estructura operativa.
            </p>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {lastSavedAt ? `Ultimo guardado: ${lastSavedAt}` : 'Aun no has guardado cambios'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Colaboradores</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {assignedCount} en organigrama · {availableCount} disponibles
              </p>
            </div>
            <div className="rounded-full bg-[rgb(235,165,52)]/15 text-[rgb(147,92,18)] px-3 py-1 text-xs font-medium">
              Drag & drop
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar colaborador..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredCollaborators.map((collaborator) => {
              const isAssigned = assignedIds.has(collaborator.id);
              const isSelected = selectedNodeId === collaborator.id;

              return (
                <button
                  key={collaborator.id}
                  draggable
                  onDragStart={(event) => handleCollaboratorDragStart(event, collaborator.id)}
                  onClick={() => setSelectedNodeId(collaborator.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                    isSelected
                      ? 'border-[rgb(235,165,52)] bg-[rgb(235,165,52)]/10 ring-2 ring-[rgb(235,165,52)]/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[rgb(235,165,52)]/50 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-[rgb(235,165,52)]/15 text-[rgb(147,92,18)] flex items-center justify-center text-sm font-semibold shrink-0">
                      {getInitials(collaborator.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {collaborator.name}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            isAssigned
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {isAssigned ? 'Asignado' : 'Disponible'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {collaborator.role}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {collaborator.area}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCollaborator && (
            <div className="mt-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {selectedCollaborator.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedCollaborator.role} · {selectedCollaborator.title}
                  </p>
                </div>
                <Building2 className="h-5 w-5 text-[rgb(235,165,52)] shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Area
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {selectedCollaborator.area}
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Ubicacion
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {selectedCollaborator.location}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Reporta a</p>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {getManagerName(selectedAssignment?.managerId ?? null)}
                </p>
              </div>

              <div className="space-y-2 mb-4">
                {selectedCollaborator.responsibilities.slice(0, 2).map((item) => (
                  <div
                    key={item}
                    className="rounded-lg bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleMoveSelectedToRoot}>
                  <UserRoundPlus className="h-4 w-4" />
                  Mover a raiz
                </Button>
                {selectedAssignment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveSelected}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Organigrama</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Lienzo editable con niveles jerarquicos, zoom y guardado local.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setLevelCount((prev) => prev + 1)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Nivel
              </Button>
              <Button
                variant="outline"
                onClick={() => setLevelCount((prev) => Math.max(requiredLevels, prev - 1))}
                className="gap-2"
              >
                <Minus className="h-4 w-4" />
                Nivel
              </Button>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((prev) => clamp(Number((prev - 0.1).toFixed(2)), 0.7, 1.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((prev) => clamp(Number((prev + 0.1).toFixed(2)), 0.7, 1.5))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
              <Button variant="outline" onClick={handleAutoOrganize} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Auto organizar
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reiniciar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[rgb(235,165,52)] hover:bg-[rgb(214,144,35)] text-white gap-2"
              >
                <Save className="h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>

          <div
            ref={canvasRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleCanvasDrop}
            className="relative overflow-auto rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-[radial-gradient(circle_at_top,_rgba(235,165,52,0.08),_transparent_35%),linear-gradient(to_bottom,_rgba(249,250,251,0.95),_rgba(255,255,255,1))] dark:bg-[radial-gradient(circle_at_top,_rgba(235,165,52,0.08),_transparent_35%),linear-gradient(to_bottom,_rgba(17,24,39,0.92),_rgba(17,24,39,1))]"
            style={{ minHeight: '560px' }}
          >
            <div
              className="relative origin-top-left"
              style={{
                width: `${autoLayout.canvasWidth * zoom}px`,
                height: `${autoLayout.canvasHeight * zoom}px`,
              }}
            >
              <div
                className="absolute inset-0 origin-top-left"
                style={{
                  width: `${autoLayout.canvasWidth}px`,
                  height: `${autoLayout.canvasHeight}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                {Array.from({ length: displayLevels }).map((_, index) => {
                  const top = PADDING_Y + index * VERTICAL_GAP;

                  return (
                    <div key={`level-${index}`} className="absolute inset-x-0">
                      <div
                        className="absolute left-6 right-6 border-t border-dashed border-gray-200 dark:border-gray-700"
                        style={{ top: `${top + NODE_HEIGHT / 2}px` }}
                      />
                      <div
                        className="absolute left-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400"
                        style={{ top: `${top - 22}px` }}
                      >
                        Nivel {index + 1}
                      </div>
                    </div>
                  );
                })}

                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={autoLayout.canvasWidth}
                  height={autoLayout.canvasHeight}
                >
                  {connectors.map((connector) => (
                    <path
                      key={connector.id}
                      d={connector.path}
                      fill="none"
                      stroke="rgb(245 158 11)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>

                {assignments.map((assignment) => {
                  const collaborator = collaboratorMap.get(assignment.collaboratorId) as OrgCollaborator;
                  const position = actualPositions[assignment.collaboratorId];
                  const reportCount = assignments.filter(
                    (item) => item.managerId === assignment.collaboratorId,
                  ).length;

                  if (!collaborator || !position) {
                    return null;
                  }

                  return (
                    <button
                      key={assignment.collaboratorId}
                      onMouseDown={(event) => startNodeDrag(event, assignment.collaboratorId)}
                      onClick={() => setSelectedNodeId(assignment.collaboratorId)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleNodeDrop(event, assignment.collaboratorId)}
                      className={`absolute rounded-2xl border bg-white dark:bg-gray-900 px-4 py-3 text-left shadow-sm transition-all ${
                        selectedNodeId === assignment.collaboratorId
                          ? 'border-[rgb(235,165,52)] ring-2 ring-[rgb(235,165,52)]/20 shadow-lg'
                          : 'border-[rgb(235,165,52)]/80 hover:shadow-md'
                      }`}
                      style={{
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        width: `${NODE_WIDTH}px`,
                        height: `${NODE_HEIGHT}px`,
                        cursor: dragState?.collaboratorId === assignment.collaboratorId ? 'grabbing' : 'grab',
                      }}
                    >
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight">
                        {collaborator.role}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {collaborator.title}
                      </p>
                      {reportCount > 0 && (
                        <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-[rgb(235,165,52)]/15 px-2 py-0.5 text-[11px] font-medium text-[rgb(147,92,18)]">
                          {reportCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm">
            <p className="text-gray-600 dark:text-gray-400">{statusMessage}</p>
            <div className="text-gray-500 dark:text-gray-400">
              Zoom {Math.round(zoom * 100)}% · Niveles visibles {displayLevels}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
