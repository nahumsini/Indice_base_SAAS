import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/ProcessesTasks');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Procesos y Tareas respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Procesos y Tareas conserva el shell, los modales y el Kiosk Engine compartidos', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'ProcessesTasks.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(moduleRoot, 'Kiosk/PublicTaskKioskPage.tsx'), 'utf8');
  const managerSource = readFileSync(resolve(moduleRoot, 'Kiosk/TaskKioskManagementModal.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(kioskSource, /<KioskPublicShell/);
  assert.match(kioskSource, /<KioskIdentityGate/);
  assert.match(managerSource, /<KioskModalFrame/);
});

test('los catálogos de asignación pertenecen a Procesos y no requieren acceso a Colaboradores de RH', () => {
  const assignmentCatalogSource = readFileSync(resolve(moduleRoot, 'shared/assignmentCatalogApi.ts'), 'utf8');
  const consumers = [
    'Agenda/hooks/useAgendaCatalogs.ts',
    'Tasks/Tasks.tsx',
    'Processes/Processes.tsx',
    'Projects/Projects.tsx',
    'KPIs/KPIs.tsx',
  ];

  assert.match(assignmentCatalogSource, /\/api\/v1\/process-tasks\/assignment-catalog/);
  assert.doesNotMatch(assignmentCatalogSource, /email:\s*item\./);

  for (const relativePath of consumers) {
    const source = readFileSync(resolve(moduleRoot, relativePath), 'utf8');
    assert.match(source, /listProcessTaskAssignmentOptions/);
    assert.doesNotMatch(source, /humanResourcesApi|\/api\/v1\/hr\/users/);
  }
});

test('tareas y agenda mantienen nombres relacionados, actualización y lista móvil compacta', () => {
  const taskApiSource = readFileSync(resolve(moduleRoot, 'Tasks/tasksApi.ts'), 'utf8');
  const tasksSource = readFileSync(resolve(moduleRoot, 'Tasks/Tasks.tsx'), 'utf8');
  const agendaSource = readFileSync(resolve(moduleRoot, 'Agenda/Agenda.tsx'), 'utf8');
  const taskFormSource = readFileSync(resolve(moduleRoot, 'Agenda/hooks/useAgendaTaskFormDialog.ts'), 'utf8');
  const mobileSource = readFileSync(resolve(moduleRoot, 'Agenda/components/AgendaTableView.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(moduleRoot, 'Kiosk/PublicTaskKioskPage.tsx'), 'utf8');

  assert.match(taskApiSource, /projectName: record\.projectName/);
  assert.match(taskApiSource, /processTitle: record\.processTitle/);
  assert.match(tasksSource, /task\.projectName \?\? task\.projectFolio/);
  assert.match(tasksSource, /task\.processTitle \?\? task\.processFolio/);
  assert.match(tasksSource, /window\.setInterval\(refreshTasks, 30_000\)/);
  assert.match(tasksSource, /loadTasks\(\{ background: true \}\)/);
  assert.match(tasksSource, /backgroundRefreshPromiseRef/);
  assert.match(tasksSource, /paginationResetRevision/);
  assert.match(agendaSource, /window\.setInterval\(refreshAgenda, 30_000\)/);
  assert.match(agendaSource, /loadVisibleAgenda\(\{ background: true \}\)/);
  assert.match(agendaSource, /backgroundRefreshPromiseRef/);
  assert.match(agendaSource, /const revealCreatedTask/);
  assert.match(agendaSource, /onTaskCreated: revealCreatedTask/);
  assert.match(agendaSource, /setSearchQuery\(''\)/);
  assert.match(agendaSource, /setStatusFilter\('all'\)/);
  assert.match(taskFormSource, /if \(isEditing\) \{\s+await loadAgenda\(\);\s+\}/);
  assert.match(kioskSource, /window\.setInterval\(refreshWhenVisible, 20_000\)/);
  assert.match(mobileSource, /mobileDetailTask/);
  assert.match(mobileSource, /agendaCopy\.actions\.viewDetails/);
});

test('las barras KPI conservan los datos resueltos durante recargas posteriores', () => {
  const tasksSource = readFileSync(resolve(moduleRoot, 'Tasks/Tasks.tsx'), 'utf8');
  const agendaSource = readFileSync(resolve(moduleRoot, 'Agenda/Agenda.tsx'), 'utf8');
  const processesSource = readFileSync(resolve(moduleRoot, 'Processes/Processes.tsx'), 'utf8');

  assert.match(tasksSource, /hasLoadedTasksRef/);
  assert.match(agendaSource, /hasLoadedAgendaRef/);
  assert.match(processesSource, /hasLoadedProcessesRef/);

  for (const source of [tasksSource, agendaSource, processesSource]) {
    assert.match(source, /showInitialLoading/);
  }
});

test('agenda separa las vistas y prioriza el enfoque con filtros avanzados plegables', () => {
  const agendaSource = readFileSync(resolve(moduleRoot, 'Agenda/Agenda.tsx'), 'utf8');
  const filtersSource = readFileSync(resolve(moduleRoot, 'Agenda/components/AgendaFilters.tsx'), 'utf8');
  const viewTabsSource = readFileSync(resolve(moduleRoot, 'Agenda/components/AgendaViewTabs.tsx'), 'utf8');

  assert.match(agendaSource, /<AgendaViewTabs/);
  assert.match(agendaSource, /onClearFilters=\{clearFilters\}/);
  assert.match(filtersSource, /advancedFilterCount/);
  assert.match(filtersSource, /showAdvancedFilters/);
  assert.match(filtersSource, /copy\.filters\.more/);
  assert.match(filtersSource, /border-\[#E2B931\]/);
  assert.doesNotMatch(filtersSource, /onViewModeChange/);
  assert.match(viewTabsSource, /AgendaViewMode/);
  assert.match(viewTabsSource, /bg-\[#F4C84A\]/);
});

test('agenda abre con siete columnas operativas, integra la hora y conserva personalizaciones', () => {
  const columnsSource = readFileSync(resolve(moduleRoot, 'Agenda/hooks/useAgendaColumns.ts'), 'utf8');
  const cellsSource = readFileSync(resolve(moduleRoot, 'Agenda/components/AgendaTaskCells.tsx'), 'utf8');
  const presetSource = columnsSource.slice(
    columnsSource.indexOf('function createDefaultAgendaColumns'),
    columnsSource.indexOf('const legacyWideAgendaColumnsPreset'),
  );

  for (const columnId of ['title', 'dueDate', 'status', 'responsible', 'priority', 'completion', 'attachments']) {
    assert.match(presetSource, new RegExp(`id: '${columnId}'[^\n]+visible: true`));
  }
  for (const columnId of ['folio', 'type', 'unit', 'business', 'description', 'createdAt', 'startDate', 'predecessor', 'agendaTime', 'creator', 'project', 'notes', 'weighting', 'auditNotes']) {
    assert.match(presetSource, new RegExp(`id: '${columnId}'[^\n]+visible: false`));
  }

  assert.ok(presetSource.indexOf("id: 'title'") < presetSource.indexOf("id: 'dueDate'"));
  assert.ok(presetSource.indexOf("id: 'completion'") < presetSource.indexOf("id: 'attachments'"));
  assert.match(columnsSource, /matchesStoredAgendaColumnPreset\(parsedColumns, legacyWideAgendaColumnsPreset\)/);
  assert.match(columnsSource, /visible: typeof column\.visible === 'boolean' \? column\.visible : baseColumn\.visible/);
  assert.match(cellsSource, /const scheduleHour = getTaskScheduleHour\(task, todayAgendaValue\)/);
  assert.match(cellsSource, /task\.dueDate \? formatDate\(task\.dueDate\) : copy\.common\.noDate/);
});

test('el Kanban transporta la tarea de forma estable y conserva las transiciones reabiertas', () => {
  const kanbanSource = readFileSync(resolve(moduleRoot, 'Agenda/components/AgendaKanbanView.tsx'), 'utf8');
  const dropSource = readFileSync(resolve(moduleRoot, 'Agenda/hooks/useAgendaKanbanDrop.ts'), 'utf8');
  const statusSource = readFileSync(resolve(moduleRoot, 'Agenda/utils/agendaTaskStatus.ts'), 'utf8');

  assert.match(kanbanSource, /dataTransfer\.setData\('text\/plain', String\(task\.taskId\)\)/);
  assert.match(kanbanSource, /readDraggedTaskId/);
  assert.match(kanbanSource, /onDrop\(column\.id, taskId\)/);
  assert.match(dropSource, /droppedTaskId \?\? draggingTaskId/);
  assert.match(dropSource, /currentColumnId === 'overdue' && columnId === 'pending'/);
  assert.ok(
    statusSource.indexOf('const openStatus = currentOpenStatus(task);')
      < statusSource.indexOf('const auditedDate = dateKeyFromDateTime(task.auditedAt);'),
    'El estado operativo actual debe prevalecer sobre marcas históricas de cierre.',
  );
});

test('la creación rápida de tareas explica el flujo y resume la decisión antes de guardar', () => {
  const dialogSource = readFileSync(resolve(moduleRoot, 'Tasks/components/TaskFormDialog.tsx'), 'utf8');
  const translationSource = readFileSync(resolve(moduleRoot, 'Agenda/translations/es-MX.ts'), 'utf8');

  assert.match(dialogSource, /formCopy\.quickCreate\.sections\.work/);
  assert.match(dialogSource, /formCopy\.quickCreate\.sections\.planning/);
  assert.match(dialogSource, /formCopy\.quickCreate\.sections\.assignment/);
  assert.match(dialogSource, /footerSummary=\{isQuickCreate \? quickCreateSummary : undefined\}/);
  assert.match(dialogSource, /autoFocus=\{isQuickCreate\}/);
  assert.match(dialogSource, /formCopy\.quickCreate\.hints\.titleRequired/);
  assert.match(translationSource, /eyebrow: 'Nueva tarea · Agenda'/);
  assert.match(translationSource, /Aparecerá en la Agenda en cuanto la crees/);
  assert.match(translationSource, /La fecha de vencimiento no puede ser anterior a la fecha de inicio/);
});

test('delegar separa al creador de la ejecución y permite volver a incluirlo de forma explícita', () => {
  const dialogSource = readFileSync(resolve(moduleRoot, 'Tasks/components/TaskFormDialog.tsx'), 'utf8');
  const agendaSource = readFileSync(resolve(moduleRoot, 'Agenda/Agenda.tsx'), 'utf8');
  const selectorSource = readFileSync(resolve(moduleRoot, 'shared/TaskAssigneeSelector.tsx'), 'utf8');
  const teamDialogSource = readFileSync(resolve(moduleRoot, 'Agenda/components/TaskTeamDialog.tsx'), 'utf8');
  const cellsSource = readFileSync(resolve(moduleRoot, 'Agenda/components/AgendaTaskCells.tsx'), 'utf8');
  const projectWorkspaceSource = readFileSync(resolve(moduleRoot, 'Projects/components/ProjectTasksWorkspace.tsx'), 'utf8');
  const statusSource = readFileSync(resolve(moduleRoot, 'Agenda/utils/agendaTaskStatus.ts'), 'utf8');

  assert.match(dialogSource, /<TaskAssigneeSelector/);
  assert.match(dialogSource, /maxSelections=\{2\}/);
  assert.match(dialogSource, /También puedes seleccionarte a ti/);
  assert.match(selectorSource, /currentUserCompanyId/);
  assert.match(selectorSource, /leadUserCompanyId/);
  assert.match(selectorSource, /selectionAtLimit/);
  assert.match(teamDialogSource, /<TaskAssigneeSelector/);
  assert.match(teamDialogSource, /Guardar responsables/);
  assert.match(teamDialogSource, /patchProcessTask\(task\.taskId/);
  assert.match(cellsSource, /onClick=\{\(\) => onOpenTeam\(task\)\}/);
  assert.doesNotMatch(cellsSource, /<ResponsibleCell/);
  assert.match(projectWorkspaceSource, /onClick=\{\(\) => setTeamTask\(task\)\}/);
  assert.match(projectWorkspaceSource, /<TaskTeamDialog/);
  assert.doesNotMatch(projectWorkspaceSource, /handleResponsibleCellChange/);
  assert.match(statusSource, /const assignedToAnotherUser/);
  assert.match(statusSource, /task\.createdBy === currentUserId && assignedToAnotherUser/);
  assert.match(agendaSource, /matchesAgendaFocus\(task, 'delegated', currentUserId\)/);
  assert.match(agendaSource, /setFocusFilter\('delegated'\)/);
});

test('los diálogos de eliminación explican el resultado sin términos técnicos internos', () => {
  const agendaTranslationsRoot = resolve(moduleRoot, 'Agenda/translations');
  const userCopySources = [
    ...collectFiles(agendaTranslationsRoot),
    resolve(moduleRoot, 'Tasks/taskQueueTranslations.ts'),
  ];
  const technicalTerms = /soft delete|backend|eliminaci[oó]n lógica|suppression logique|exclusão lógica|소프트|백엔드|逻辑删除|后端/iu;
  const violations = userCopySources.flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return technicalTerms.test(source) ? [relative(root, file).replaceAll('\\', '/')] : [];
  });
  const spanishAgendaCopy = readFileSync(resolve(agendaTranslationsRoot, 'es-MX.ts'), 'utf8');

  assert.deepEqual(violations, [], `Texto técnico visible para clientes:\n${violations.join('\n')}`);
  assert.match(spanishAgendaCopy, /La tarea dejará de aparecer en la agenda activa/);
  assert.match(spanishAgendaCopy, /permanecerá disponible en el historial/);
});

test('proyectos usa un wizard real de tres pasos con revisión antes de guardar', () => {
  const dialogSource = readFileSync(resolve(moduleRoot, 'Projects/components/ProjectFormDialog.tsx'), 'utf8');
  const translationSource = readFileSync(resolve(moduleRoot, 'Projects/translations/es-MX.ts'), 'utf8');

  assert.match(dialogSource, /type ProjectWizardStep = 'identity' \| 'planning' \| 'assignment'/);
  assert.match(dialogSource, /modalType="wizard"/);
  assert.match(dialogSource, /<IndiceModalWizardStepper/);
  assert.match(dialogSource, /activeStep === 'identity'/);
  assert.match(dialogSource, /activeStep === 'planning'/);
  assert.match(dialogSource, /activeStep === 'assignment'/);
  assert.match(dialogSource, /<IndiceModalSummary/);
  assert.match(dialogSource, /formCopy\.wizard\.actions\.previous/);
  assert.match(dialogSource, /formCopy\.wizard\.actions\.continue/);
  assert.match(translationSource, /stepOf: \(current: number, total: number\) => `Paso \$\{current\} de \$\{total\}`/);
  assert.match(translationSource, /title: 'Resumen del proyecto'/);
});

test('el wizard de procesos oculta gracia y ventana sin alterar los valores técnicos predeterminados', () => {
  const dialogSource = readFileSync(resolve(moduleRoot, 'Processes/components/ProcessFormDialog.tsx'), 'utf8');
  const dataSource = readFileSync(resolve(moduleRoot, 'Processes/processesData.ts'), 'utf8');
  const apiSource = readFileSync(resolve(moduleRoot, 'Processes/processesApi.ts'), 'utf8');

  assert.doesNotMatch(dialogSource, /process-grace-days/);
  assert.doesNotMatch(dialogSource, /process-window/);
  assert.doesNotMatch(dialogSource, /form\.graceDays/);
  assert.doesNotMatch(dialogSource, /form\.generationWindowDays/);
  assert.match(dataSource, /graceDays: '0'/);
  assert.match(dataSource, /generationWindowDays: '45'/);
  assert.match(apiSource, /graceDays: parseProcessInteger\(form\.graceDays, 0\)/);
  assert.match(apiSource, /generationWindowDays: parseProcessInteger\(form\.generationWindowDays, 45\)/);
});

test('procesos abre con seis columnas operativas y conserva personalizaciones del usuario', () => {
  const processesSource = readFileSync(resolve(moduleRoot, 'Processes/Processes.tsx'), 'utf8');
  const presetSource = processesSource.slice(
    processesSource.indexOf('function createProcessColumns'),
    processesSource.indexOf('const legacyWideProcessColumnsPreset'),
  );

  for (const columnId of ['folio', 'title', 'responsible', 'nextOccurrence', 'tasks', 'frequency']) {
    assert.match(presetSource, new RegExp(`id: '${columnId}'[^\n]+visible: true`));
  }
  for (const columnId of ['priority', 'unit', 'business', 'description', 'template', 'createdAt', 'generatedUntil', 'creator']) {
    assert.match(presetSource, new RegExp(`id: '${columnId}'[^\n]+visible: false`));
  }

  assert.ok(presetSource.indexOf("id: 'title'") < presetSource.indexOf("id: 'responsible'"));
  assert.ok(presetSource.indexOf("id: 'responsible'") < presetSource.indexOf("id: 'nextOccurrence'"));
  assert.match(processesSource, /matchesStoredProcessColumnPreset\(parsedColumns, legacyWideProcessColumnsPreset\)/);
  assert.match(processesSource, /visible: typeof column\.visible === 'boolean' \? column\.visible : baseColumn\.visible/);
});

test('las notas usan una bitácora fechada y accesible desde las tres vistas de agenda', () => {
  const apiSource = readFileSync(resolve(moduleRoot, 'Tasks/tasksApi.ts'), 'utf8');
  const agendaSource = readFileSync(resolve(moduleRoot, 'Agenda/Agenda.tsx'), 'utf8');
  const dialogSource = readFileSync(resolve(moduleRoot, 'Agenda/components/TaskFollowUpDialog.tsx'), 'utf8');

  assert.match(apiSource, /listProcessTaskFollowUps/);
  assert.match(apiSource, /createProcessTaskFollowUp/);
  assert.match(apiSource, /followUpDate: string/);
  assert.match(dialogSource, /modalType="standard-form"/);
  assert.match(dialogSource, /Bitácora interna/);
  assert.match(dialogSource, /value: 'update'/);
  assert.match(dialogSource, /value: 'decision'/);
  assert.match(dialogSource, /value: 'blocker'/);
  assert.match(dialogSource, /value: 'reminder'/);
  assert.match(dialogSource, /Historial del seguimiento/);
  assert.match(agendaSource, /<TaskFollowUpDialog/);
  assert.ok((agendaSource.match(/onOpenFollowUps=\{setFollowUpTask\}/g) ?? []).length >= 4);
});
