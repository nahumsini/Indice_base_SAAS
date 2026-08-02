# Procesos y Tareas, Recursos Humanos, Panel Inicial y KPIs — estandarización visual 2026-08-01

## Estado

Implementación terminada y validada contra `docs/indice-frontend-operating-system-v2.md`.

El alcance fue exclusivamente de presentación frontend. No se modificaron backend, APIs, DTO, rutas, payloads, servicios, cálculos, permisos, persistencia ni reglas de negocio.

## Objetivo aplicado

- peso regular para cuerpo, ayuda y metadatos;
- peso medio para títulos, nombres, acciones, etiquetas importantes, valores y estados;
- sentence case para navegación, encabezados y tablas;
- jerarquía mediante escala, color, separación y superficies, sin negritas repetidas;
- texto grafito sobre aqua claro y texto blanco únicamente sobre fondos oscuros;
- conservación de tema oscuro, responsividad, Modo aprendiz, navegación, permisos y comportamiento operativo.

## Alcance ejecutado

| Módulo | Fuentes auditadas | Fuentes modificadas | Incidencias tipográficas normalizadas |
| --- | ---: | ---: | ---: |
| Procesos y Tareas | 171 | 35 | 438 |
| Recursos Humanos | 435 | 106 | 640 |
| Panel Inicial | 111 | 17 | 86 |
| KPIs | 12 | 4 | 134 |
| Total | 729 | 162 | 1,298 |

Además se corrigieron 40 combinaciones de texto blanco sobre aqua claro en Recursos Humanos. La auditoría exacta contra `HEAD` confirmó que los 162 archivos fuente solo contienen cambios de peso, mayúsculas/tracking o contraste autorizados.

## Arquitectura preservada

- Procesos y Tareas conserva Agenda, Procesos, Proyectos, Tareas, Organigrama, KPIs y el kiosco público de tareas.
- Recursos Humanos conserva Anuncios, Activos, Asistencia, Control, Empleados, Incentivos, Nómina, Permisos, Expedientes, KPIs y el kiosco de asistencia.
- Panel Inicial conserva Perfil, Usuarios, Estructura del negocio, Perfil empresarial, Facturación, Plan y Desempeño personal.
- KPIs conserva las rutas de indicadores, informes automatizados e informes contables.
- `IndiceModuleShell`, title bars, frames de modal, Kiosk Engine, permisos de acceso y Modo aprendiz permanecen como contratos compartidos.

## Inventario de fuentes modificadas

### Procesos y Tareas — 35 archivos

#### Agenda

- `Agenda/Agenda.tsx`
- `Agenda/components/AgendaBulkActionsBar.tsx`
- `Agenda/components/AgendaFilters.tsx`
- `Agenda/components/AgendaKanbanView.tsx`
- `Agenda/components/AgendaKpiStrip.tsx`
- `Agenda/components/AgendaReportDialog.tsx`
- `Agenda/components/AgendaScheduleTaskCard.tsx`
- `Agenda/components/AgendaScheduleToolbar.tsx`
- `Agenda/components/AgendaScheduleView.tsx`
- `Agenda/components/AgendaTablePrimitives.tsx`
- `Agenda/components/AgendaTableView.tsx`
- `Agenda/components/AgendaTaskAuditCells.tsx`
- `Agenda/components/AgendaTaskCells.tsx`
- `Agenda/components/TaskAttachmentsDialog.tsx`

#### KPIs, kiosco y estructura

- `KPIs/KPIs.tsx`
- `KPIs/components/KpiControls.tsx`
- `KPIs/components/KpiPerformanceWorkspace.tsx`
- `Kiosk/PublicTaskKioskPage.tsx`
- `Kiosk/TaskKioskManagementModal.tsx`
- `Kiosk/components/PublicTaskKioskDialogs.tsx`
- `Kiosk/components/PublicTaskKioskWorkspaceSections.tsx`
- `Kiosk/components/TaskKioskConfirmationDialog.tsx`
- `Kiosk/components/TaskKioskSecurityPanel.tsx`
- `OrgChart/OrgChart.tsx`

#### Procesos, proyectos y tareas

- `Processes/Processes.tsx`
- `Processes/components/ProcessFormDialog.tsx`
- `Processes/components/ProcessPrimitives.tsx`
- `Projects/Projects.tsx`
- `Projects/components/ProjectFormDialog.tsx`
- `Projects/components/ProjectTablePrimitives.tsx`
- `Projects/components/ProjectTaskTablePrimitives.tsx`
- `Projects/components/ProjectTasksWorkspace.tsx`
- `Tasks/Tasks.tsx`
- `Tasks/components/TaskFormDialog.tsx`
- `shared/ProgressSlider.tsx`

### Recursos Humanos — 106 archivos

#### Anuncios, activos y asistencia

- `Announcements/components/AnnouncementBulkActionsBar.tsx`
- `Announcements/components/AnnouncementDetailPanel.tsx`
- `Announcements/components/AnnouncementFilters.tsx`
- `Announcements/components/AnnouncementKpiStrip.tsx`
- `Announcements/components/AnnouncementTable.tsx`
- `Announcements/components/CreateAnnouncementModal.tsx`
- `Assets/AddNewAssests.tsx`
- `Assets/AssetDetailsModal.tsx`
- `Assets/AssetPhotosModal.tsx`
- `Assets/Assets.tsx`
- `Assets/components/AssetFilters.tsx`
- `Assets/components/AssetKpiStrip.tsx`
- `Attendance/AttendancePage.tsx`
- `Attendance/AttendanceRecorderPhotoCard.tsx`

#### Control operativo

- `Control/components/AttendanceControlFilters.tsx`
- `Control/components/AttendanceDailyBoard.tsx`
- `Control/components/AttendanceQuickActions.tsx`
- `Control/components/ControlDialogs.tsx`
- `Control/components/ControlKpiStrip/ControlKpiMetric.tsx`
- `Control/components/ControlKpiStrip/ControlKpiStrip.tsx`
- `Control/components/EmployeeAccessActions.tsx`
- `Control/components/EmployeeActionBar.tsx`
- `Control/components/EmployeeAttendanceDetailPanel.tsx`
- `Control/components/EmployeeCalendarPanel.tsx`
- `Control/components/EmployeeHeaderCard.tsx`
- `Control/components/RestDayPlannerModal.tsx`
- `Control/components/SelfShiftCalendar.tsx`
- `Control/components/widgets/attendance/AttendanceCalendarWidgets.tsx`
- `Control/components/widgets/attendance/AttendanceRowWidgets.tsx`
- `Control/hooks/useControlController.ts`

#### Kiosco de asistencia

- `Control/components/kiosk/PublicKioskActivityCard.tsx`
- `Control/components/kiosk/PublicKioskAside.tsx`
- `Control/components/kiosk/PublicKioskComponents.tsx`
- `Control/components/kiosk/PublicKioskHeader.tsx`
- `Control/components/kiosk/PublicKioskIdentityPanel.tsx`
- `Control/components/kiosk/PublicKioskPage.tsx`
- `Control/components/kiosk/PublicKioskVerificationSection.tsx`
- `Control/components/kiosks/CreateKioskModal.tsx`
- `Control/components/kiosks/KioskCard.tsx`
- `Control/components/kiosks/KioskFormSection.tsx`
- `Control/components/kiosks/KioskManagementModal.tsx`
- `Control/components/kiosks/KioskTypeSelector.tsx`

#### Centros de trabajo y horarios

- `Control/components/modals/contract-site-registration/ContractSiteBasicStep.tsx`
- `Control/components/modals/contract-site-registration/ContractSiteDetailModal.tsx`
- `Control/components/modals/contract-site-registration/ContractSiteExistingLocations.tsx`
- `Control/components/modals/contract-site-registration/ContractSiteLocationStep.tsx`
- `Control/components/modals/contract-site-registration/ContractSiteRegistrationFrame.tsx`
- `Control/components/modals/contract-site-registration/ContractSiteReviewStep.tsx`
- `Control/components/modals/contract-site-registration/ContractSiteWizardFooter.tsx`
- `Control/components/modals/contract-site-registration/ContractSiteWizardStepper.tsx`
- `Control/components/modals/schedule/EmployeeSelectionTable.tsx`
- `Control/components/modals/schedule/ScheduleBuilder.tsx`
- `Control/components/modals/schedule/ScheduleImpactSummary.tsx`
- `Control/components/modals/schedule/ScheduleModalFrame.tsx`
- `Control/components/modals/schedule/ScheduleReviewStep.tsx`
- `Control/components/modals/schedule/ScheduleRulesStep.tsx`
- `Control/components/modals/schedule/ScheduleSetupStep.tsx`
- `Control/components/modals/schedule/ScheduleWorkdaysStep.tsx`
- `Control/components/modals/schedule/ScheduleWorkflowTabs.tsx`
- `Control/components/modals/timetable/TimeTableEmployeeTable.tsx`
- `Control/components/modals/timetable/TimeTableSections.tsx`

#### Empleados

- `Employees/components/CreateEmployeeModal/components/EmployeeModalFrame.tsx`
- `Employees/components/CreateEmployeeModal/components/FieldGroup.tsx`
- `Employees/components/CreateEmployeeModal/components/StepHeader.tsx`
- `Employees/components/CreateEmployeeModal/components/StepProgress.tsx`
- `Employees/components/CreateEmployeeModal/fields/AutoAssignedOrganizationField.tsx`
- `Employees/components/CreateEmployeeModal/fields/CreatableOptionField.tsx`
- `Employees/components/CreateEmployeeModal/fields/OrganizationSelectField.tsx`
- `Employees/components/CreateEmployeeModal/steps/DocumentUploadList.tsx`
- `Employees/components/CreateEmployeeModal/steps/JobStepFields.tsx`
- `Employees/components/CreateEmployeeModal/steps/ScheduleOnHireFields.tsx`
- `Employees/components/CreateEmployeeModal/styles.ts`
- `Employees/components/EmployeeBulkAssignmentControls.tsx`
- `Employees/components/EmployeeTableCellValues.tsx`
- `Employees/components/EmployeeTableControls.tsx`
- `Employees/components/EmployeesTable.tsx`
- `Employees/components/EmployeesTableCells.tsx`
- `Employees/components/EmployeesTableSection.tsx`

#### Incentivos, KPI y nómina

- `Incentives/Incentives.tsx`
- `Incentives/components/IncentiveColumnsModal.tsx`
- `Incentives/components/IncentiveFilters.tsx`
- `Incentives/components/IncentiveFormModal.tsx`
- `Incentives/components/IncentiveKpiStrip.tsx`
- `Incentives/components/IncentivesTable.tsx`
- `KPIs/KPIs.tsx`
- `KPIs/components/HrEmployeeOperationsTable.tsx`
- `Payroll/Payroll.tsx`
- `Payroll/components/DetailMetric.tsx`
- `Payroll/components/PayrollFormFields.tsx`
- `Payroll/components/PayrollOperationsPanel.tsx`
- `Payroll/components/PayrollSetupGuide.tsx`
- `Payroll/modules/payroll/components/VariablePayModal/VariablePayModal.tsx`

#### Permisos, expedientes y primitivas compartidas

- `Permissions/components/CreatePermissionModal.tsx`
- `Permissions/components/PermissionDetailModal.tsx`
- `Permissions/components/PermissionFilters.tsx`
- `Permissions/components/PermissionKpiStrip.tsx`
- `Permissions/components/PermissionsTable.tsx`
- `Records/Records.tsx`
- `Records/components/CreateRecordModal.tsx`
- `Records/components/RecordDetailModal.tsx`
- `Records/components/RecordFilters.tsx`
- `Records/components/RecordKpiStrip.tsx`
- `Records/components/RecordsList.tsx`
- `components/HumanResourcesTabErrorBoundary.tsx`
- `shared/HrMobileDataCard.tsx`
- `shared/HrTitleBar.tsx`

### Panel Inicial — 17 archivos

- `Billing/Billing.tsx`
- `BusinessProfile/BusinessProfile.tsx`
- `BusinessStructure/BusinessStructure.tsx`
- `BusinessStructure/components/BusinessIdentitySection.tsx`
- `BusinessStructure/components/OperationTypeSection.tsx`
- `BusinessStructure/components/UnitsSection.tsx`
- `PersonalPerformance/PersonalPerformance.tsx`
- `Plan/Plan.tsx`
- `Profile/Profile.tsx`
- `Users/Users.tsx`
- `Users/UsersTabPermissionPicker.tsx`
- `Users/components/UsersFilters.tsx`
- `Users/components/UsersKpiStrip.tsx`
- `components/DashboardTitleBar.tsx`
- `components/PanelInicialErrorBoundary.tsx`
- `components/PanelInicialHeader.tsx`
- `components/PanelInicialState.tsx`

### KPIs — 4 archivos

- `InformesAutomatizados/InformesAutomatizados.tsx`
- `InformesContables/InformesContables.tsx`
- `KPIs/KPIs.tsx`
- `Kpis.tsx`

## Modales y flujos revisados

| Propietario | Modal o flujo | Clasificación conservada |
| --- | --- | --- |
| Procesos y Tareas | Crear/editar tarea, proceso y proyecto | Standard Form |
| Procesos y Tareas | Agenda, adjuntos y tareas de proyecto | Operational Workspace acotado |
| Procesos y Tareas | Administrar kioscos | Operational Workspace |
| Procesos y Tareas | Confirmaciones del kiosco | Confirmation |
| Recursos Humanos | Alta de empleado | Wizard |
| Recursos Humanos | Alta de centro de trabajo | Wizard |
| Recursos Humanos | Construcción de horarios | Wizard / Operational Workspace |
| Recursos Humanos | Nómina y pago variable | Operational Workspace |
| Recursos Humanos | Permisos, expedientes, activos e incentivos | Standard Form / detalle operativo |
| Recursos Humanos | Administrar kioscos de asistencia | Operational Workspace |
| Panel Inicial | Perfil, usuarios y accesos | Standard Form |
| Panel Inicial | Estructura del negocio | Operational Workspace |
| KPIs | Indicadores e informes | Dashboard / configuración de reportes |

No se alteraron anatomía, pasos, validaciones, submit, cierre, estados ocupados, navegación entre vistas ni consecuencias de acciones.

## Kioscos preservados

### Tareas y Procesos

- ruta pública y enlace por definición de kiosco conservados;
- identificación y acceso existentes conservados;
- captura, consulta, evidencias, confirmaciones e idempotencia sin cambios;
- administración y primitivas compartidas del Kiosk Engine sin cambios funcionales.

### Recursos Humanos

- acceso del kiosco de asistencia por PIN y rostro conservado;
- captura de ubicación, fotografía, actividad y verificación conservada;
- creación, administración, tipo y seguridad de kiosco conservados;
- contraste corregido sin cambiar consentimiento, identidad, sesión ni persistencia.

## Superficies excluidas deliberadamente

Los estilos dedicados a PDF, impresión y documentos exportables se revisaron, pero no se migraron en masa. Sus pesos tipográficos y reglas físicas se conservan porque pertenecen al contrato del documento, no a la interfaz operativa.

## Automatización y candados agregados

- `react/scripts/frontend-typography-standardize.mjs`
- `react/tests/processes-tasks-frontend-standard-regression.test.mjs`
- `react/tests/human-resources-frontend-standard-regression.test.mjs`
- `react/tests/dashboard-frontend-standard-regression.test.mjs`
- `react/tests/kpis-frontend-standard-regression.test.mjs`

Scripts agregados a `react/package.json`:

- `test:processes-tasks-ui`
- `test:human-resources-ui`
- `test:dashboard-ui`
- `test:kpis-ui`

El automatizador reconoce variantes responsivas y elimina `tracking-wide`, `tracking-wider`, `tracking-widest` y tracking arbitrario. Los candados comprueban tipografía, shells, rutas, permisos, Modo aprendiz y Kiosk Engine.

## Validación final

| Verificación | Resultado |
| --- | --- |
| Auditoría exacta de 162 fuentes contra `HEAD` | Aprobada; 0 cambios fuera del conjunto visual |
| Tokens tipográficos prohibidos | 0 |
| Artefactos de reemplazo automático | 0 |
| `test:processes-tasks-ui` | 2/2 |
| `test:human-resources-ui` | 2/2 |
| `test:dashboard-ui` | 2/2 |
| `test:kpis-ui` | 2/2 |
| Matriz Node completa | 31/31 |
| Validación telefónica | 18 positivas, 6 negativas y prefijos visibles |
| TypeScript | Aprobado |
| Build Vite | Aprobado, 4,525 módulos transformados |
| `git diff --check` del alcance | Aprobado |

## Puntos de retorno locales

| Momento | Ref local | Commit |
| --- | --- | --- |
| Antes de los cuatro módulos | `refs/codex/backups/pre-processes-hr-dashboard-kpis-2026-08-01` | `4e83f822c761c3e7df5751540641f38abbe1143b` |
| Procesos y Tareas terminado | `refs/codex/backups/post-processes-tasks-pre-human-resources-2026-08-01` | `96f473e4bc4a3abdd6eb369a62fcb8e93efbae2f` |
| Recursos Humanos terminado | `refs/codex/backups/post-human-resources-pre-dashboard-2026-08-01` | `c3d4e1b79fb52a62203996380d069e30b3ed39cb` |
| Panel Inicial terminado | `refs/codex/backups/post-dashboard-pre-kpis-2026-08-01` | `a7eb8ee3d18d002527ff0a59794a71d97fadc081` |
| KPIs terminado, antes del cierre | `refs/codex/backups/post-kpis-pre-final-validation-2026-08-01` | `edc4b09e0c96c033f5a030dd4948244219266340` |

`deployment/compose/docker-compose.local.yml` quedó deliberadamente fuera de los snapshots y del alcance de producto.

## Regla para un retorno parcial

El retorno debe hacerse por módulo o archivo desde el snapshot inmediatamente anterior, sin restablecer todo el repositorio. Esto protege los cambios acumulados de Inventarios, Ventas, POS, Expenses, Petty Cash, Cartera y cualquier trabajo ajeno presente en el árbol.

## Criterio de cierre

La fase queda cerrada porque los cuatro módulos usan la jerarquía tipográfica del Frontend Engine V2, conservan sus contratos funcionales, pasan las regresiones existentes y nuevas, y generan correctamente el build de producción.
