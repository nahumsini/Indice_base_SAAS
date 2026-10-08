/** Reviewed business workflows shared by the web companion and the MCP catalog.
 * Domain owners retain all permissions, validation, calculation and mutation authority.
 * Update the affected chapter version when its learning requirements change.
 */
export type LearningLocale = 'es-MX' | 'en-CA';
export type LearningText = readonly [string, string];
export interface LearningChapter {
  id: string; module: string; tab: string; version: number; stage: number;
  pageId: string; label: LearningText; steps: readonly LearningText[];
  evidenceTools: readonly string[]; companion: boolean; journey: boolean;
}
export const learningStages = [
  ['Estructura de la empresa', 'Company structure'], ['Organiza tu equipo', 'Organize your team'],
  ['Procesos y tareas', 'Processes and tasks'], ['Control del dinero', 'Manage money'],
  ['Productos y ventas', 'Products and sales'], ['Indicadores', 'Indicators'],
] as const;
const definitions: Record<string, readonly [string, number]> = {
  config_center: ['home-panel', 0], human_resources: ['human-resources', 1],
  processes: ['processes-tasks', 2], expenses: ['expenses', 3], petty_cash: ['petty-cash', 3],
  receivables: ['receivables', 3], inventory: ['inventory', 4], crm: ['sales', 4],
  pos: ['point-of-sale', 4], kpis: ['kpis', 5],
};
function chapter(module: string, tab: string, label: LearningText, steps: readonly LearningText[], evidenceTools: readonly string[] = []): LearningChapter {
  const [pageId, stage] = definitions[module];
  return { id: `${module}.${tab}`, module, tab, version: ["expenses","petty_cash"].includes(module) ? 3 : 2, pageId, stage, label, steps, evidenceTools,
    companion: module !== 'config_center' && !(module === 'pos' && tab === 'sale'),
    journey: !(module === 'pos' && tab === 'sale') };
}
export const learningChapters: readonly LearningChapter[] = [
  chapter('config_center', 'business-structure', ['Empresa, unidades y negocios', 'Company, units and businesses'], [
    ['Define la identidad y tipo de operación de la empresa; distingue una unidad de negocio de una sucursal.', 'Set the company identity and operation type; distinguish a business unit from a branch.'],
    ['Crea las unidades y sus negocios, revisa dirección y ubicación y guarda desde Panel Inicial.', 'Create units and their businesses, check the address and location, and save in Home panel.'],
    ['Comprueba que colaboradores, tareas y almacenes utilicen la estructura correcta; cambiar una asignación no reescribe el historial.', 'Check that people, tasks and warehouses use the correct structure; changing an assignment does not rewrite history.'],
  ]),
  chapter('config_center', 'profile', ['Preferencias, comunicación y ayuda', 'Preferences, communication and help'], [
    ['Configura idioma y perfil. Abre la moneda preferida desde el menú de tu fotografía; es una preferencia de presentación.', 'Set your language and profile. Open preferred currency from your profile photo menu; it is a display preference.'],
    ['Abre Mensajes, selecciona un compañero o canal autorizado y adjunta fotografías antes de enviar. Si no hay consultor asignado, usa Soporte.', 'Open Messages, select an authorized colleague or channel, and attach photos before sending. If no consultant is assigned, use Support.'],
    ['Comprueba la conversación y el envío. En móvil vuelve a la bandeja para cambiar de conversación; la moneda preferida no cambia la moneda original de una operación.', 'Check the conversation and delivery. On mobile, return to the inbox to switch conversations; preferred currency does not change an operation’s original currency.'],
  ]),
  chapter('config_center', 'users', ['Accesos y conexión del agente', 'Access and agent connection'], [
    ['Revisa el rol, alcance por unidad y negocio, módulos y pestañas que necesita cada persona.', 'Review each person’s role, unit and business scope, modules and required tabs.'],
    ['Invita usuarios y configura sus permisos. Para conectar un agente, usa la sección de conexiones de IA disponible en tu cuenta y autoriza solo los alcances necesarios.', 'Invite users and configure permissions. To connect an agent, use the AI connections section available to your account and grant only the necessary scopes.'],
    ['Una guía no concede permisos. Las lecturas y acciones del agente se verifican en cada solicitud; las acciones operativas requieren vista previa y confirmación. Revoca conexiones que ya no uses.', 'A guide grants no permissions. Agent reads and actions are checked on every request; operational actions require preview and confirmation. Revoke unused connections.'],
  ]),
  chapter('config_center', 'business-profile', ['Diagnóstico del negocio', 'Business diagnosis'], [
    ['Identifica el negocio y los pilares del diagnóstico; responde con información de la operación actual.', 'Identify the business and diagnosis pillars; answer using current operational information.'],
    ['Inicia o continúa un pilar, recorre sus preguntas y guarda las respuestas antes de completar.', 'Start or resume a pillar, work through its questions, and save answers before completing it.'],
    ['Revisa y descarga el diagnóstico disponible; completar preguntas no ejecuta las acciones de mejora.', 'Review and download the available diagnosis; answering questions does not execute improvement actions.'],
  ]),
  chapter('config_center', 'consulting', ['Consultoría y soporte', 'Consulting and support'], [
    ['Comprueba si tu cuenta tiene consultor asignado y qué servicios están disponibles.', 'Check whether your account has an assigned consultant and which services are available.'],
    ['Si hay consultoría habilitada, solicita horario y explica el contexto. Para dudas técnicas, usa Mensajes con Soporte y agrega evidencia útil.', 'If consulting is enabled, request a time and explain the context. For technical questions, use Messages with Support and attach useful evidence.'],
    ['Confirma el estado de la solicitud. En Canadá el aprendizaje autónomo y Soporte permiten continuar sin depender de una consultoría asignada.', 'Confirm the request status. In Canada, self-guided learning and Support allow you to continue without an assigned consultant.'],
  ]),
  chapter('config_center', 'integrations', ['Conexiones de IA y MCP', 'AI and MCP connections'], [
    ['Revisa tu cuenta, permisos actuales y conexiones activas antes de crear una conexión de IA.', 'Review your account, current permissions and active connections before creating an AI connection.'],
    ['Conecta mediante el flujo autorizado y elige alcances de lectura o acción de forma explícita. Las conexiones anteriores conservan sus permisos.', 'Connect through the authorized flow and explicitly choose read or action scopes. Existing connections retain their permissions.'],
    ['Consulta la guía y retoma tu avance desde el agente. Los cambios requieren vista previa y confirmación; revoca una conexión que ya no utilices antes de alcanzar el límite.', 'Read the guide and resume your progress through the agent. Changes require preview and confirmation; revoke an unused connection before reaching the limit.'],
  ]),
  chapter('human_resources', 'collaborators', ['Colaboradores y expediente', 'Employees and employee files'], [
    ['Revisa país, moneda, identidad, contacto, unidad, negocio y condiciones laborales. Busca antes de crear para evitar duplicados.', 'Review country, currency, identity, contact, unit, business and employment terms. Search before creating to avoid duplicates.'],
    ['Crea, edita o importa colaboradores mediante la revisión de datos. Adjunta documentos al expediente correcto; los archivos requieren carga y registro confirmados.', 'Create, edit or import employees through data review. Attach documents to the correct file; files require confirmed upload and registration.'],
    ['Completa contrato, compensación, horario, ubicación y acceso según corresponda. Una excepción de aprendizaje exige motivo y no cambia la política laboral. Inactivar y terminar son acciones distintas y conservan historia.', 'Complete contract, compensation, schedule, location and access as applicable. A learning exception requires a reason and does not change employment policy. Inactivation and termination are distinct actions that preserve history.'],
  ], ['create_employee', 'update_employee', 'import_employees', 'attach_employee_document']),
  chapter('human_resources', 'control', ['Horarios, ubicaciones y acceso', 'Schedules, locations and access'], [
    ['Define horarios, descansos, ubicaciones y el alcance del kiosco antes de asignar personas.', 'Define schedules, rest days, locations and kiosk scope before assigning people.'],
    ['Asigna horarios y sitios con sus fechas vigentes; configura kiosco individual o multikiosco según la operación y prepara el acceso desde RH.', 'Assign schedules and work sites with effective dates; configure individual or multiuser kiosks for the operation and prepare access in HR.'],
    ['Comprueba el calendario y las asignaciones. Los cambios no reescriben marcaciones previas; PIN, biometría y credenciales físicas se administran en sus pantallas autorizadas, no en el chat.', 'Check the calendar and assignments. Changes do not rewrite previous attendance events; PINs, biometrics and physical credentials are managed in authorized screens, not in chat.'],
  ], ['create_hr_schedule', 'assign_hr_schedule', 'assign_hr_work_site', 'assign_hr_rest_days']),
  chapter('human_resources', 'attendance', ['Asistencia y calendario', 'Attendance and calendar'], [
    ['Elige fecha y alcance permitido. Distingue registros propios de la administración de asistencia.', 'Choose a date and authorized scope. Distinguish personal records from attendance administration.'],
    ['Consulta calendario, marcaciones e incidencias. Revisa horario, descanso y permiso antes de interpretar una ausencia.', 'Review calendar, attendance events and exceptions. Check schedule, rest days and leave before interpreting an absence.'],
    ['Corrige solo desde la función autorizada y conserva motivo y evidencia. Pendiente o sin horario no equivale a ausencia; el agente no obtiene fotografías biométricas ni coordenadas.', 'Correct only through the authorized function and preserve reason and evidence. Pending or unscheduled does not mean absent; the agent does not obtain biometric photos or coordinates.'],
  ]),
  chapter('human_resources', 'permissions', ['Solicitudes y permisos laborales', 'Leave requests and approvals'], [
    ['Selecciona las fechas, tipo de solicitud y evidencia; el colaborador opera sus solicitudes propias.', 'Choose dates, request type and evidence; employees operate their own requests.'],
    ['Presenta la solicitud o retírala mientras esté pendiente. Un responsable autorizado puede aprobar o rechazar tras revisar cobertura.', 'Submit a request or withdraw it while pending. An authorized manager may approve or reject it after reviewing coverage.'],
    ['Comprueba el estado y su efecto en asistencia y nómina; aprobar una solicitud no registra un pago.', 'Check the status and its effect on attendance and payroll; approving a request does not record a payment.'],
  ], ['create_my_hr_permission', 'approve_hr_permission', 'reject_hr_permission']),
  chapter('human_resources', 'payroll', ['Preparar, aprobar y pagar nómina', 'Prepare, approve and pay payroll'], [
    ['Revisa periodo, país, moneda, compensación, asistencia, permisos e incentivos con permisos de nómina.', 'Review period, country, currency, compensation, attendance, leave and incentives with payroll permissions.'],
    ['Prepara el borrador, revisa variables y deducciones, ajusta y recalcula antes de aprobar. Exportar es una consulta, no una aprobación.', 'Prepare a draft, review variable pay and deductions, adjust and recalculate before approval. Exporting is a read, not approval.'],
    ['La aprobación genera la obligación financiera correspondiente. Marcar pagada exige el pago conciliado del propietario financiero; nunca mezcles monedas ni confundas aprobación con pago.', 'Approval creates the corresponding financial obligation. Marking paid requires the finance owner’s settled payment; never mix currencies or confuse approval with payment.'],
  ], ['prepare_hr_payroll', 'approve_hr_payroll']),
  chapter('human_resources', 'announcements', ['Comunicados y acuses', 'Announcements and read receipts'], [
    ['Define contenido, audiencia por equipo o estructura y archivos; confirma quién debe recibirlo.', 'Define content, audience by team or organization and files; confirm who should receive it.'],
    ['Guarda el borrador, edita y publica o programa según el estado autorizado. El colaborador consulta y marca sus propios comunicados como leídos.', 'Save a draft, edit and publish or schedule according to the allowed state. Employees read and mark their own announcements as read.'],
    ['Comprueba publicación, audiencia y acuses desde la vista autorizada; programado no equivale a entregado ni leído.', 'Check publication, audience and receipts in the authorized view; scheduled does not mean delivered or read.'],
  ], ['create_announcement', 'update_announcement', 'mark_announcement_read']),
  chapter('human_resources', 'assets', ['Activos, asignación y devolución', 'Assets, assignment and return'], [
    ['Identifica el activo, estado, alcance y fotografías; busca antes de crear.', 'Identify the asset, status, scope and photos; search before creating.'],
    ['Registra o edita el activo, asígnalo o reasígnalo a una persona autorizada y registra cambios de condición o devolución.', 'Create or edit the asset, assign or reassign it to an authorized employee, and record condition changes or return.'],
    ['Revisa responsable actual e historial. Las fotografías se registran con el activo; una reasignación conserva las responsabilidades anteriores.', 'Review the current responsible person and history. Photos are registered with the asset; reassignment preserves previous responsibility records.'],
  ], ['create_hr_asset', 'update_hr_asset', 'reassign_hr_asset']),
  chapter('human_resources', 'records', ['Actas, acuerdos y evidencia', 'HR records, agreements and evidence'], [
    ['Selecciona colaborador y contexto; prepara hechos, acuerdos, testigos y evidencia pertinente.', 'Select the employee and context; prepare facts, agreements, witnesses and relevant evidence.'],
    ['Crea o edita el acta, registra su estado y adjunta archivos al expediente autorizado.', 'Create or edit the record, record its status, and attach files to the authorized case.'],
    ['Consulta acuerdos, evidencia y estado. Registrar un acta no representa una firma legal ni sustituye sus revisiones.', 'Review agreements, evidence and status. Recording an HR record is not a legal signature and does not replace its reviews.'],
  ], ['create_hr_record', 'update_hr_record', 'attach_hr_record_file']),
  chapter('human_resources', 'incentives', ['Incentivos y aplicación', 'Incentives and application'], [
    ['Revisa regla, audiencia, importe y moneda antes de crear un incentivo.', 'Review rule, audience, amount and currency before creating an incentive.'],
    ['Registra el incentivo autorizado y consulta sus aplicaciones reales en nómina.', 'Record the authorized incentive and review its actual payroll applications.'],
    ['Pausar o cancelar no borra aplicaciones históricas; el incentivo no equivale a un pago ejecutado.', 'Pausing or cancelling does not delete historical applications; an incentive does not mean payment has been executed.'],
  ], ['create_hr_incentive']),
  chapter('human_resources', 'kpis', ['Indicadores de RH', 'HR indicators'], [
    ['Selecciona fecha, periodo y estructura; cada fuente requiere su permiso correspondiente.', 'Select date, period and organization; each source requires its corresponding permission.'],
    ['Revisa plantilla, asistencia, activos, actas y permisos con sus detalles y filtros.', 'Review workforce, attendance, assets, HR records and leave with details and filters.'],
    ['Conserva denominadores y N/A. Una página de registros no es el total; una muestra pendiente no se cuenta como ausencia.', 'Preserve denominators and N/A. A page of records is not the total; a pending sample is not counted as an absence.'],
  ]),
  chapter('processes', 'calendar', ['Agenda y tareas', 'Agenda and tasks'], [
    ['Define título, fechas, prioridad, responsable y alcance por unidad y negocio. Confirma que los asignados pertenezcan al alcance permitido.', 'Define title, dates, priority, assignee and unit/business scope. Confirm assignees belong to the allowed scope.'],
    ['Crea o edita tareas; usa tabla, kanban o diagrama. Configura dependencias sin ciclos y revisa el efecto en fechas y proyecto.', 'Create or edit tasks; use table, kanban or diagram. Configure dependencies without cycles and review effects on dates and project.'],
    ['Registra notas, avance y archivos; completa y audita mediante las acciones autorizadas. Cambiar el estado, adjuntar evidencia y auditar son operaciones distintas.', 'Record notes, progress and files; complete and audit through authorized actions. Changing status, attaching evidence and auditing are distinct operations.'],
  ], ['create_task', 'update_task', 'complete_task', 'attach_task_evidence']),
  chapter('processes', 'projects', ['Proyectos y portafolio', 'Projects and portfolio'], [
    ['Define resultado, alcance y responsables del proyecto; revisa tareas existentes antes de vincularlas.', 'Define project outcome, scope and owners; review existing tasks before linking them.'],
    ['Crea o edita el proyecto, relaciona tareas y consulta carga, dependencias y avance.', 'Create or edit the project, link tasks, and review workload, dependencies and progress.'],
    ['Distingue completar, cancelar y archivar. El historial y los vínculos se conservan; cerrar el proyecto no debe ocultar tareas pendientes.', 'Distinguish completion, cancellation and archiving. History and links are retained; closing a project must not hide pending tasks.'],
  ], ['create_project', 'update_project', 'complete_project']),
  chapter('processes', 'processes', ['Procesos, versiones y ejecuciones', 'Processes, versions and runs'], [
    ['Elige proceso recurrente u ocasional, individual o compartido. Define coordinador, unidad, negocio, tareas, responsables y evidencia.', 'Choose recurring or occasional, individual or shared execution. Define coordinator, unit, business, tasks, assignees and evidence.'],
    ['Organiza tareas en paralelo, secuencia o etapas. Publica la definición; revisa la versión, fechas y plan antes de generar tareas o iniciar una ejecución ocasional.', 'Organize tasks in parallel, sequence or stages. Publish the definition; review version, dates and plan before generating tasks or starting an occasional run.'],
    ['Una edición publicada crea una versión nueva: las ejecuciones existentes conservan la anterior. Revisa estados e incidencias; pausar o archivar detiene trabajo futuro y conserva el ya generado.', 'A published edit creates a new version: existing runs retain their original version. Review statuses and incidents; pausing or archiving stops future work and preserves generated work.'],
  ], ['create_process', 'update_process', 'create_process_run', 'generate_process_tasks']),
  chapter('processes', 'kpis', ['Indicadores de ejecución', 'Execution indicators'], [
    ['Revisa definición, periodo, filtros y alcance de cada medición.', 'Review definition, period, filters and scope for each measurement.'],
    ['Consulta tareas, proyectos, procesos y responsables; abre los detalles para localizar retrasos e incidencias.', 'Review tasks, projects, processes and assignees; open details to locate delays and incidents.'],
    ['Compara cohortes completas y tendencias; N/A no es cero y cambiar filtros no cambia el estado de las tareas.', 'Compare complete cohorts and trends; N/A is not zero and changing filters does not change task status.'],
  ]),
  chapter('expenses', 'accounting', ['Cuentas contables', 'Accounting accounts'], [
    ['Revisa el catálogo y su jerarquía antes de crear o importar cuentas.', 'Review the catalog and hierarchy before creating or importing accounts.'],
    ['Agrega, importa o edita mediante la función autorizada; valida duplicados y relación padre-hijo.', 'Add, import or edit through the authorized function; validate duplicates and parent-child relationships.'],
    ['Comprueba estado y clasificación antes de usarla en gastos; cambiar el catálogo no borra operaciones anteriores.', 'Check status and classification before using an account in expenses; changing the catalog does not delete previous operations.'],
  ], ["create_finance_accounting_account","update_finance_accounting_account","inactivate_finance_accounting_account"]),
  chapter('expenses', 'providers', ['Proveedores', 'Providers'], [
    ['Busca al proveedor y verifica su alcance antes de registrar uno nuevo.', 'Search for the provider and verify its scope before creating another.'],
    ['Crea o edita datos y configura el kiosco o portal disponible sin compartir acceso interno.', 'Create or edit details and configure the available kiosk or portal without sharing internal access.'],
    ['Comprueba estado y vínculo con gastos y compras; desactivar conserva historial y no cancela obligaciones existentes.', 'Check status and links to expenses and purchases; deactivation preserves history and does not cancel existing obligations.'],
  ], ["create_finance_provider","update_finance_provider","inactivate_finance_provider"]),
  chapter('expenses', 'payment_accounts', ['Cuentas de pago', 'Payment accounts'], [
    ['Identifica moneda, tipo, propietario y alcance de la cuenta.', 'Identify the account currency, type, owner and scope.'],
    ['Registra o edita una cuenta autorizada y revisa su estado antes de utilizarla.', 'Create or edit an authorized account and review its status before use.'],
    ['Distingue cuenta de pago de fondo de Caja chica; seleccionarla no registra un movimiento ni convierte monedas.', 'Distinguish a payment account from a petty cash fund; selecting it does not post a movement or convert currencies.'],
  ], ["create_finance_payment_account","update_finance_payment_account","inactivate_finance_payment_account"]),
  chapter('expenses', 'budgets', ['Presupuestos y obligaciones', 'Budgets and obligations'], [
    ['Define periodo, estructura, cuenta y moneda del presupuesto.', 'Define budget period, organization, account and currency.'],
    ['Crea o edita partidas; revisa compromisos, gastos y disponibilidad en el detalle.', 'Create or edit budget lines; review commitments, expenses and availability in details.'],
    ['El agente puede programar obligaciones con inicio, fin e intervalo expl?citos. Revisa importe bruto e impuesto incluido; el propietario genera la cuenta por pagar en su mes y muestra bloqueos. El disponible lo calcula el backend.', 'The agent can schedule obligations with explicit start, end and interval. Review gross amount and included tax; the owner creates the payable in its month and reports blockers. Availability is calculated by the backend.'],
  ], ["create_finance_budget","update_finance_budget","inactivate_finance_budget","create_finance_budget_line","update_finance_budget_line","inactivate_finance_budget_line","create_budget_obligation_schedule","remove_budget_line_attachment","attach_budget_line_file"]),
  chapter('expenses', 'expenses', ['Gastos, revisión y pago', 'Expenses, review and payment'], [
    ['Revisa proveedor, concepto, fecha, moneda, presupuesto, cuenta contable y evidencia.', 'Review provider, description, date, currency, budget, accounting account and evidence.'],
    ['Registra borrador o cuenta por pagar, adjunta comprobantes y sigue el ciclo autorizado de revisión, autorización y pago. En importación o acciones masivas revisa cada registro antes de confirmar.', 'Record a draft or payable, attach evidence and follow the authorized review, approval and payment cycle. For imports or bulk actions, review each record before confirming.'],
    ['Comprueba estado y movimiento financiero. Una corrección o reversa requiere motivo y conserva evidencia; crear un gasto pendiente no prueba que se haya pagado.', 'Check status and financial movement. A correction or reversal requires a reason and retains evidence; creating a pending expense is not proof of payment.'],
  ], ["create_expense_draft","attach_expense_file","create_expense_payable","correct_finance_expense","submit_finance_expense","approve_finance_expense","reject_finance_expense","cancel_finance_expense","close_finance_expense","remove_finance_expense","classify_finance_expense","import_finance_expenses","classify_finance_expenses","update_finance_expense_due_status","register_expense_payment","settle_expense_payment","reverse_expense_payment","pay_finance_expenses","correct_finance_expenses","remove_expense_attachment"]),
  chapter('expenses', 'kpis', ['Indicadores financieros', 'Financial indicators'], [
    ['Elige periodo, estructura y moneda; verifica qué fuentes están autorizadas.', 'Choose period, organization and currency; check which sources are authorized.'],
    ['Consulta panorama, alertas y concentraciones; abre la operación que explica cada señal.', 'Review overview, alerts and concentrations; open the operation behind each signal.'],
    ['Exporta el contexto revisado. Separa pendiente, aprobado y pagado; conserva las monedas nativas y los valores N/A.', 'Export the reviewed context. Separate pending, approved and paid; preserve native currencies and N/A values.'],
  ]),
  chapter('petty_cash', 'cash', ['Fondos de Caja chica', 'Petty cash funds'], [
    ['Define responsable, estructura, moneda, clasificación interna o externa y fuente de fondeo.', 'Define owner, organization, currency, internal/external classification and funding source.'],
    ['Crea o edita el fondo y sus activos asociados; configura kiosco y fondeo con los medios autorizados.', 'Create or edit the fund and associated assets; configure its kiosk and funding using authorized means.'],
    ['Comprueba movimientos y saldo. Cambiar clasificación afecta lo futuro y conserva los estados históricos; cierre y fondeo son operaciones distintas.', 'Check movements and balance. Classification changes affect future operations and preserve historical statements; closure and funding are distinct operations.'],
  ], ["create_petty_cash_fund","update_petty_cash_fund","close_petty_cash_fund","schedule_type_change_petty_cash_fund","cancel_type_change_petty_cash_fund","disable_kiosk_petty_cash_fund","enable_kiosk_petty_cash_fund","revoke_kiosk_petty_cash_fund"]),
  chapter('petty_cash', 'control', ['Comprobación y conciliación', 'Evidence and reconciliation'], [
    ['Selecciona el fondo correcto y revisa saldo, moneda, proveedor y documento.', 'Select the correct fund and review balance, currency, provider and document.'],
    ['Registra gasto o ingreso y evidencia. Revisa, aprueba, rechaza o devuelve desde las funciones disponibles.', 'Record an expense or deposit and evidence. Review, approve, reject or return through available functions.'],
    ['Comprueba la conciliación y los movimientos del fondo; subir un comprobante no equivale a aprobarlo. Evita repetir un ingreso al reintentar.', 'Check reconciliation and fund movements; uploading evidence does not mean approval. Avoid repeating a deposit when retrying.'],
  ], ["register_fund_expense","add_money_to_fund","attach_petty_cash_receipt_file","deposit_petty_cash_fund","capture_petty_cash_receipt","authorize_petty_cash_receipt","reject_petty_cash_receipt","reverse_petty_cash_receipt","classify_petty_cash_receipt","bulk_classify_petty_cash_receipt","remove_petty_cash_receipt_attachment"]),
  chapter('petty_cash', 'statements', ['Estados de cuenta', 'Statements'], [
    ['Selecciona fondo, fechas y moneda; identifica el periodo del estado.', 'Select fund, dates and currency; identify the statement period.'],
    ['Resuelve comprobantes pendientes y revisa el saldo firmado. Confirma cierre limpio, devoluci?n, arrastre, condonaci?n de faltante o sobrante, o cargo al empleado cuando corresponda. El cargo se env?a a RH para aplicaci?n; no altera n?mina finalizada.', 'Resolve pending receipts and review the signed balance. Confirm a clean close, return, carry forward, shortage or surplus forgiveness, or employee charge when appropriate. A charge is queued for HR application; it does not alter finalized payroll.'],
    ['Compara saldo inicial, ingresos, egresos y saldo final. Los estados conservan la identidad histórica del fondo, aunque cambie su configuración.', 'Compare opening balance, deposits, expenses and closing balance. Statements retain historical fund identity even if configuration changes.'],
  ], ["close_petty_cash_statement"]),
  chapter('petty_cash', 'kpis', ['Indicadores de Caja chica', 'Petty cash indicators'], [
    ['Filtra periodo, fondo, unidad y moneda.', 'Filter by period, fund, unit and currency.'],
    ['Consulta salud del fondo, comprobación y movimientos relacionados.', 'Review fund health, evidence and related movements.'],
    ['Abre el detalle antes de corregir una diferencia; limpiar filtros no modifica fondos ni conciliaciones.', 'Open details before correcting a difference; clearing filters does not change funds or reconciliations.'],
  ]),
  chapter('receivables', 'credit-customers', ['Cliente y política de crédito', 'Customer and credit policy'], [
    ['Identifica cliente, límite, plazo, tasa y moneda autorizados.', 'Identify the customer, authorized limit, term, rate and currency.'],
    ['Crea o edita la política y revisa disponibilidad antes de financiar una venta.', 'Create or edit the policy and review availability before financing a sale.'],
    ['Eliminar o cambiar una política no borra créditos existentes. Conserva acuerdos y trazabilidad.', 'Deleting or changing a policy does not delete existing credit obligations. Preserve agreements and traceability.'],
  ]),
  chapter('receivables', 'credit-sales', ['Ventas a crédito', 'Credit sales'], [
    ['Selecciona una venta elegible y comprueba política, moneda y crédito disponible.', 'Select an eligible sale and check policy, currency and available credit.'],
    ['Simula y revisa anticipo, plazo, tasa y vencimientos antes de confirmar.', 'Simulate and review down payment, term, rate and due dates before confirming.'],
    ['Comprueba la obligación y calendario generados. Confirmar crédito no significa recibir el pago ni autoriza exceder el límite.', 'Check the resulting obligation and schedule. Confirming credit does not mean receiving payment or authorize exceeding the limit.'],
  ]),
  chapter('receivables', 'accounts-receivable', ['Cuentas por cobrar', 'Accounts receivable'], [
    ['Filtra cliente, vencimiento, estado y alcance financiero.', 'Filter by customer, due date, status and financial scope.'],
    ['Abre expediente y parcialidades; registra seguimiento y aplica un pago desde la función autorizada.', 'Open the case and instalments; record follow-up and apply a payment through the authorized function.'],
    ['Comprueba saldo y aplicación a la obligación correcta. Un abono parcial no liquida toda la cuenta.', 'Check balance and application to the correct obligation. A partial payment does not settle the whole account.'],
  ]),
  chapter('receivables', 'payments', ['Abonos y evidencia', 'Payments and evidence'], [
    ['Verifica el dinero recibido, cuenta destino, moneda, referencia y obligación.', 'Verify money received, destination account, currency, reference and obligation.'],
    ['Registra el pago y adjunta los documentos al registro correcto.', 'Record payment and attach documents to the correct record.'],
    ['Comprueba importe aplicado y saldo restante. Conservar un archivo no acredita por sí solo un cobro conciliado.', 'Check the applied amount and remaining balance. Storing a file alone is not proof of a settled collection.'],
  ]),
  chapter('receivables', 'kpis', ['Indicadores de cartera', 'Receivables indicators'], [
    ['Selecciona periodo, estructura y moneda; distingue saldos actuales de cobros del periodo.', 'Select period, organization and currency; distinguish current balances from collections within the period.'],
    ['Revisa cartera, vencimientos, parcialidades y cobros; abre el detalle que explica cada cifra.', 'Review receivables, due dates, instalments and collections; open the details behind each figure.'],
    ['No sumes monedas distintas. Un crédito pendiente o un pago parcial no se interpreta como ingreso cobrado completo.', 'Do not add different currencies. Pending credit or a partial payment is not interpreted as fully collected revenue.'],
  ]),
  chapter('inventory', 'products', ['Productos y catálogo', 'Products and catalog'], [
    ['Busca por nombre o SKU; define moneda, unidad de inventario, categoría y seguimiento de stock.', 'Search by name or SKU; define currency, inventory unit, category and stock tracking.'],
    ['Crea, edita o duplica con identidad propia; registra imagen, precio, costo y visibilidad por canal.', 'Create, edit or duplicate with a distinct identity; record image, price, cost and visibility by channel.'],
    ['Un producto no representa existencia. Cantidades y costos conservan su precisión; no cambies unidades físicas mediante una recepción.', 'A product does not represent stock. Quantities and costs retain their precision; do not change physical units through a receipt.'],
  ], ['create_inventory_product', 'update_inventory_product', 'attach_inventory_product_image']),
  chapter('inventory', 'warehouses', ['Almacenes y ubicación', 'Warehouses and location'], [
    ['Define ubicación, responsable y alcance del almacén antes de recibir mercancía.', 'Define warehouse location, owner and scope before receiving goods.'],
    ['Crea o edita el almacén y comprueba su relación con negocios y cajas.', 'Create or edit the warehouse and check its relationship to businesses and registers.'],
    ['Antes de retirar un almacén revisa existencias y transferencias. Ubicación, catálogo y cantidad son conceptos distintos.', 'Before retiring a warehouse, review stock and transfers. Location, catalog and quantity are distinct concepts.'],
  ], ['create_inventory_warehouse', 'update_inventory_warehouse']),
  chapter('inventory', 'inventory', ['Existencias y movimientos', 'Stock and movements'], [
    ['Selecciona producto y almacén; revisa unidad física, saldo, reservas y disponibilidad.', 'Select product and warehouse; review physical unit, balance, reservations and availability.'],
    ['Recibe mercancía, transfiere entre ubicaciones o ajusta una diferencia verificada con motivo. El backend calcula saldos y costos.', 'Receive goods, transfer between locations or adjust a verified difference with a reason. The backend calculates balances and costs.'],
    ['Consulta historial y origen. Cancelar usa compensaciones y no borra movimientos; una orden pendiente no aumenta existencias.', 'Review history and origin. Cancellation uses compensating records and does not delete movements; a pending order does not increase stock.'],
  ], ['transfer_inventory_stock', 'receive_purchase_order']),
  chapter('inventory', 'providers', ['Proveedores y colaboración', 'Providers and collaboration'], [
    ['Reutiliza el proveedor autorizado de Finanzas y revisa moneda y productos vinculados.', 'Reuse the authorized Finance provider and review currency and linked products.'],
    ['Registra o actualiza datos, relación producto-proveedor y acceso limitado al portal.', 'Create or update details, product-provider relationships and limited portal access.'],
    ['Revisa cotizaciones, entregas y archivos. Convertir una cotización puede actualizar costos del catálogo y exige revisión explícita.', 'Review quotations, deliveries and files. Converting a quotation may update catalog costs and requires explicit review.'],
  ], ['create_inventory_provider', 'update_inventory_provider', 'save_product_supplier']),
  chapter('inventory', 'purchase-orders', ['Compras, recepción y facturas', 'Purchases, receipts and invoices'], [
    ['Define proveedor, almacén, moneda, partidas, impuestos y fechas; revisa productos y costos.', 'Define provider, warehouse, currency, lines, taxes and dates; review products and costs.'],
    ['Guarda borrador, solicita aprobación y sigue el estado autorizado. Registra recepciones parciales contra cantidades pendientes y revisa las facturas y entregas del proveedor.', 'Save a draft, request approval and follow the authorized status. Record partial receipts against outstanding quantities and review provider invoices and deliveries.'],
    ['Solo lo recibido aumenta stock. Una factura puede generar un gasto pendiente, no un pago. Enviada es un estado interno, no prueba de correo entregado; cancelaciones conservan historial.', 'Only received goods increase stock. An invoice may create a pending expense, not a payment. Sent is an internal status, not proof of delivered email; cancellations retain history.'],
  ], ['create_purchase_order', 'receive_purchase_order', 'submit_supplier_invoice']),
  chapter('inventory', 'discounts', ['Descuentos y promociones', 'Discounts and promotions'], [
    ['Revisa productos, vigencia, moneda, canal, margen y reglas de combinación.', 'Review products, validity, currency, channel, margin and combination rules.'],
    ['Crea o edita la promoción y habilita únicamente los canales autorizados: POS, Ventas o kioscos.', 'Create or edit the promotion and enable only authorized channels: POS, Sales or kiosks.'],
    ['Verifica elegibilidad y aprobación al aplicarla. El backend calcula el descuento y rechaza reglas incompatibles.', 'Verify eligibility and approval when applying it. The backend calculates the discount and rejects incompatible rules.'],
  ], ['create_inventory_discount', 'update_inventory_discount']),
  chapter('crm', 'contacts', ['Contactos y clientes', 'Contacts and customers'], [
    ['Busca primero al cliente; revisa contacto, empresa, responsable y alcance.', 'Search for the customer first; review contact details, company, owner and scope.'],
    ['Crea, edita o importa contactos y usa los canales de comunicación disponibles.', 'Create, edit or import contacts and use available communication channels.'],
    ['Relaciona oportunidades y cotizaciones con la misma identidad; un contacto no es una venta ni un ingreso.', 'Link opportunities and quotations to the same identity; a contact is neither a sale nor revenue.'],
  ], ['create_customer', 'update_customer']),
  chapter('crm', 'leads', ['Oportunidades y flujos comerciales', 'Opportunities and commercial flows'], [
    ['Selecciona el flujo de venta correcto, cliente, responsable, valor, moneda y siguiente acción.', 'Select the correct sales flow, customer, owner, value, currency and next action.'],
    ['Crea o edita oportunidades; administra flujos y etapas desde la función autorizada. Tabla, embudo y agenda muestran el mismo trabajo.', 'Create or edit opportunities; manage flows and stages through the authorized function. Table, funnel and agenda display the same work.'],
    ['Una etapa ganada requiere el cierre comercial compatible, no un cambio de etiqueta aislado. Revisa historial y próxima actividad; el valor potencial no es dinero cobrado.', 'A won stage requires the compatible commercial close, not an isolated label change. Review history and next activity; potential value is not collected money.'],
  ], ['create_opportunity', 'update_opportunity']),
  chapter('crm', 'quotes', ['Cotizaciones y conversión', 'Quotations and conversion'], [
    ['Revisa cliente, moneda, partidas, impuestos, margen, descuentos y vigencia.', 'Review customer, currency, lines, taxes, margin, discounts and validity.'],
    ['Crea o edita, imprime y registra la aceptación desde las acciones autorizadas; convierte una cotización elegible a venta.', 'Create or edit, print and record acceptance through authorized actions; convert an eligible quotation to a sale.'],
    ['Comprueba la venta vinculada antes de reintentar la conversión; no dupliques el cierre. Aceptada no significa pagada ni entregada.', 'Check the linked sale before retrying conversion; do not duplicate the close. Accepted does not mean paid or delivered.'],
  ], ['create_quote', 'update_quote', 'create_commercial_sale']),
  chapter('crm', 'sales', ['Venta, entrega y cobro', 'Sale, delivery and collection'], [
    ['Revisa cliente, origen, moneda, partidas y stock. Los tickets POS se consultan desde Ventas sin adquirir autoridad para modificarlos.', 'Review customer, source, currency, lines and stock. POS tickets can be read in Sales without gaining authority to modify them.'],
    ['Registra o edita una venta elegible y revisa por separado inventario, entrega, aprobación financiera, crédito y cobro.', 'Record or edit an eligible sale and review inventory, delivery, financial approval, credit and collection separately.'],
    ['Confirmar cobro exige evidencia financiera; registrar entrega no prueba pago. Cancelar conserva historia mediante compensaciones y respeta inventario, comisiones y obligaciones existentes.', 'Confirming collection requires financial evidence; recording delivery is not proof of payment. Cancellation preserves history through compensating records and respects inventory, commissions and existing obligations.'],
  ], ['create_commercial_sale', 'update_commercial_sale', 'confirm_sale_collection']),
  chapter('crm', 'contracts', ['Contratos y seguimiento', 'Contracts and follow-up'], [
    ['Relaciona cliente, venta o cotización, fechas, alcance y plantilla.', 'Link customer, sale or quotation, dates, scope and template.'],
    ['Crea o edita el contrato y registra seguimiento, vigencia o renovación desde su pantalla autorizada.', 'Create or edit the contract and record follow-up, validity or renewal in its authorized screen.'],
    ['El agente registra estados internos; no envía correos ni ejecuta una firma legal por describir esa función. Confirma las acciones externas en su canal real.', 'The agent records internal states; describing a function does not send emails or execute a legal signature. Confirm external actions in their actual channel.'],
  ], ['create_sales_contract', 'update_sales_contract']),
  chapter('crm', 'commissions', ['Comisiones y cortes', 'Commissions and cuts'], [
    ['Revisa política, rol autorizado, moneda y ventas elegibles.', 'Review policy, authorized role, currency and eligible sales.'],
    ['Consulta comisiones generadas y crea un corte o programación desde la función disponible.', 'Review generated commissions and create a cut or schedule through the available function.'],
    ['Conserva la regla aplicada y el historial. Generar un corte no equivale a efectuar su pago.', 'Preserve the applied rule and history. Creating a cut does not mean paying it.'],
  ], ['create_sales_commission_cut', 'create_sales_commission_schedule']),
  chapter('crm', 'payment-accounts', ['Cuentas de pago comerciales', 'Commercial payment accounts'], [
    ['Revisa moneda, estructura y origen de la cuenta antes de usarla.', 'Review account currency, organization and source before using it.'],
    ['Crea o edita únicamente cuentas disponibles para tu rol; una cuenta proveniente de otro propietario se administra en su módulo.', 'Create or edit only accounts available to your role; an account belonging to another owner is managed in that owner’s module.'],
    ['Comprueba estado y destino del cobro. Agregar una cuenta no mueve dinero ni duplica un fondo de Caja chica.', 'Check status and collection destination. Adding an account does not move money or duplicate a petty cash fund.'],
  ]),
  chapter('crm', 'kpis', ['Indicadores comerciales', 'Commercial indicators'], [
    ['Filtra periodo, unidad, negocio, responsable y moneda.', 'Filter by period, unit, business, owner and currency.'],
    ['Revisa conversión, flujo, margen y ejecución; consulta los registros incluidos y ranking.', 'Review conversion, pipeline, margin and execution; inspect included records and rankings.'],
    ['Distingue valor potencial, venta registrada y cobro confirmado. Los tipos de cambio usados para presentación no cambian los importes originales.', 'Distinguish potential value, recorded sales and confirmed collections. Display exchange rates do not change original amounts.'],
  ]),
  chapter('pos', 'cajas', ['Cajas y terminales', 'Registers and terminals'], [
    ['Vincula la caja con su almacén, alcance y moneda. Cada caja y operador mantiene un solo turno activo.', 'Link the register to its warehouse, scope and currency. Each register and operator maintains a single active shift.'],
    ['Configura la caja y, si está habilitado, conecta y asigna una terminal. Mercado Pago Point corresponde a México/MXN; Square depende de país, moneda y habilitación del proveedor.', 'Configure the register and, if enabled, connect and assign a terminal. Mercado Pago Point supports Mexico/MXN; Square depends on provider country, currency and activation.'],
    ['Comprueba que la terminal esté lista antes de cobrar. Cambiar proveedor requiere resolver intentos pendientes y retirar la asignación anterior.', 'Check terminal readiness before charging. Changing provider requires resolving pending attempts and removing the previous assignment.'],
  ], ['create_pos_register', 'update_pos_register']),
  chapter('pos', 'kiosks', ['Kioscos POS', 'POS kiosks'], [
    ['Elige pantalla de cliente, autoservicio o restaurante y revisa caja, catálogo y alcance.', 'Choose customer display, self-service or restaurant mode and review register, catalog and scope.'],
    ['Configura el dispositivo y genera su enlace mediante el gestor autorizado; rota o revoca cuando cambie el equipo.', 'Configure the device and generate its link through the authorized manager; rotate or revoke when the device changes.'],
    ['Un pre-ticket no cobra ni descuenta stock por sí mismo. Confirma el traspaso a caja y conserva trazabilidad sin compartir el enlace privado en el chat.', 'A pre-ticket does not charge or reduce stock on its own. Confirm its handoff to the register and preserve traceability without sharing private links in chat.'],
  ]),
  chapter('pos', 'clientes', ['Clientes del POS', 'POS customers'], [
    ['Busca el cliente antes de crear uno nuevo y revisa datos necesarios para el ticket.', 'Search for the customer before creating another and review required ticket details.'],
    ['Crea, importa o edita mediante la función autorizada y relaciona el cliente con la operación.', 'Create, import or edit through the authorized function and link the customer to the operation.'],
    ['Comprueba identidad e historial; seleccionar un cliente no autoriza crédito ni modifica la venta original.', 'Check identity and history; selecting a customer does not approve credit or modify the original sale.'],
  ]),
  chapter('pos', 'cortes', ['Cierre, conciliación y devoluciones', 'Closing, settlement and returns'], [
    ['Revisa turno, ventas, efectivo, movimientos, cobros pendientes y permisos administrativos.', 'Review shift, sales, cash, movements, pending charges and administrative permissions.'],
    ['Declara conteo y cierra desde el propietario POS; consulta el corte guardado y concilia depósitos desde la función disponible.', 'Declare the count and close through the POS owner; review the saved closing and settle deposits through the available function.'],
    ['Las devoluciones usan la venta y medio originales. Un reembolso pendiente no confirma devolución ni reposición de stock; recupera el mismo intento y confirma evidencia del proveedor antes de darlo por terminado.', 'Returns use the original sale and tender. A pending refund does not confirm a return or stock restoration; recover the same attempt and confirm provider evidence before declaring completion.'],
  ], ['close_pos_shift', 'confirm_pos_closing_settlement']),
  chapter('pos', 'kpis', ['Indicadores POS', 'POS indicators'], [
    ['Selecciona periodo, tienda, caja, responsable y moneda.', 'Select period, store, register, owner and currency.'],
    ['Revisa ventas, tickets, métodos de pago, cierres y diferencias; imprime el reporte autorizado.', 'Review sales, tickets, tender methods, closings and differences; print the authorized report.'],
    ['Distingue operación guardada de cobro pendiente; reimprimir un ticket no repite la venta o el cierre.', 'Distinguish a saved operation from a pending charge; reprinting a ticket does not repeat a sale or closing.'],
  ]),
  chapter('pos', 'sale', ['Operación de caja bajo demanda', 'On-demand register operation'], [
    ['Abre turno en la caja correcta y revisa almacén, moneda, fondo y terminal. La pantalla Venta permanece libre del acompañante aprendiz.', 'Open a shift in the correct register and review warehouse, currency, opening cash and terminal. The Sale screen remains free of the learning companion.'],
    ['Agrega productos, revisa cantidades y descuentos y cobra con el medio autorizado. Si un cobro queda incierto, consulta y recupera el mismo intento antes de iniciar otro.', 'Add products, review quantities and discounts, and charge with an authorized tender. If a charge is uncertain, look up and recover the same attempt before starting another.'],
    ['En recepción pagada, verifica proveedor, unidad física y comprobante: pago y entrada de inventario se guardan juntos. Reintenta con la misma identidad y reimprime sin repetir movimientos.', 'For a paid inventory receipt, verify provider, physical unit and document: payout and stock entry are saved together. Retry using the same identity and reprint without repeating movements.'],
  ], ['open_pos_shift', 'receive_pos_inventory']),
  chapter('kpis', 'kpis', ['Indicadores ejecutivos', 'Executive indicators'], [
    ['Selecciona periodo, unidad y negocio y comprueba las fuentes autorizadas.', 'Select period, unit and business and check authorized sources.'],
    ['Actualiza matrices y consulta madurez, FODA y detalles que explican cada señal.', 'Refresh matrices and review maturity, SWOT and details behind each signal.'],
    ['Exporta la matriz activa con su contexto. Los indicadores son calculados por sus módulos; el avance de una guía no modifica resultados empresariales.', 'Export the active matrix with its context. Indicators are calculated by their modules; guide progress does not change business results.'],
  ]),
  chapter('kpis', 'accounting-reports', ['Informes contables', 'Accounting reports'], [
    ['Revisa periodo, estructura, fuentes y moneda del informe.', 'Review report period, organization, sources and currency.'],
    ['Sincroniza operaciones mediante la función autorizada y consulta estados, balance y calidad.', 'Synchronize operations through the authorized function and review statements, balance and quality.'],
    ['Comprueba detalle y advertencias antes de exportar; no mezcles monedas ni sustituyas registros por un resumen del agente.', 'Check details and notices before exporting; do not mix currencies or replace records with an agent summary.'],
  ]),
  chapter('kpis', 'automated-reports', ['Informes automatizados', 'Automated reports'], [
    ['Define informe, filtros, periodicidad y destinatarios autorizados.', 'Define report, filters, schedule and authorized recipients.'],
    ['Crea o edita la automatización, activa o pausa y ejecuta desde su pantalla disponible.', 'Create or edit the automation, activate or pause, and run it from its available screen.'],
    ['Consulta historial de ejecuciones y entregas. Programar no demuestra envío exitoso; el agente no inventa destinatarios ni entrega externa.', 'Review execution and delivery history. Scheduling is not proof of successful delivery; the agent does not invent recipients or external delivery.'],
  ]),
];
export const learningGuideModules: Record<string, string> = {
  'human-resources-guidance': 'human_resources', 'processes-tasks-guidance': 'processes',
  'sales-guidance': 'crm', 'sales-operational-guidance': 'crm', 'sales-learning-guide': 'crm',
  'inventory-learning-guide': 'inventory', 'point-of-sale-learning-guide': 'pos',
  'expenses-learning-guide': 'expenses', 'petty-cash-learning-guide': 'petty_cash',
  'receivables-learning-guide': 'receivables', 'kpis-learning-guide': 'kpis',
};
export function chapterFor(module: string, tab: string) { return learningChapters.find(c => c.module === module && c.tab === tab); }
export function learningText(text: LearningText, locale: string) { return text[locale.toLowerCase().startsWith('es') ? 0 : 1]; }
