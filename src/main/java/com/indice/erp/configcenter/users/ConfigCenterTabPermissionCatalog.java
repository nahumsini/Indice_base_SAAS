package com.indice.erp.configcenter.users;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ConfigCenterTabPermissionCatalog {

    public static final String CONFIG_CENTER_MODULE = "config_center";
    public static final String HR_MODULE = "human_resources";

    private static final Set<String> PROTECTED_ROLES = Set.of("root", "superadmin");
    private static final Set<String> USER_SELF_SERVICE_SCOPES = Set.of(
        "config_center.profile",
        "human_resources.attendance",
        "human_resources.control",
        "human_resources.announcements",
        "human_resources.assets",
        "human_resources.permissions"
    );
    private static final Set<String> PERSONAL_SCOPES = Set.of(
        "config_center.profile"
    );

    private static final List<TabDefinition> CATALOG = List.of(
        tab(CONFIG_CENTER_MODULE, "profile", "Profile", "Perfil"),
        tab(CONFIG_CENTER_MODULE, "business-structure", "Business Structure", "Estructura empresarial"),
        tab(CONFIG_CENTER_MODULE, "business-profile", "Business Profile", "Perfil empresarial"),
        tab(CONFIG_CENTER_MODULE, "consulting", "Consulting", "Consultoría"),
        tab(CONFIG_CENTER_MODULE, "integrations", "Integrations", "Integraciones"),
        tab(CONFIG_CENTER_MODULE, "users", "Users", "Usuarios"),
        protectedTab(CONFIG_CENTER_MODULE, "plan", "Plan", "Plan"),

        tab(HR_MODULE, "collaborators", "Collaborators", "Colaboradores"),
        tab(HR_MODULE, "attendance", "Attendance", "Asistencia"),
        tab(HR_MODULE, "control", "Control", "Control"),
        tab(HR_MODULE, "payroll", "Payroll", "Nómina"),
        tab(HR_MODULE, "announcements", "Announcements", "Comunicados"),
        tab(HR_MODULE, "assets", "Assets", "Activos"),
        tab(HR_MODULE, "records", "Records", "Expedientes"),
        tab(HR_MODULE, "permissions", "Permissions", "Permisos"),
        tab(HR_MODULE, "incentives", "Incentives", "Incentivos"),
        tab(HR_MODULE, "kpis", "KPIs", "KPIs"),

        tab("processes", "calendar", "Agenda", "Agenda"),
        tab("processes", "projects", "Projects", "Proyectos"),
        tab("processes", "processes", "Processes", "Procesos"),
        tab("processes", "kpis", "KPIs", "KPIs"),

        tab("expenses", "expenses", "Expenses", "Gastos"),
        tab("expenses", "budgets", "Budgets", "Presupuestos"),
        tab("expenses", "providers", "Providers", "Proveedores"),
        tab("expenses", "accounting", "Accounting", "Contabilidad"),
        tab("expenses", "payment-accounts", "Payment Accounts", "Cuentas de pago"),
        tab("expenses", "kpis", "KPIs", "KPIs"),

        tab("petty_cash", "cash", "Cash", "Caja"),
        tab("petty_cash", "control", "Control", "Control"),
        tab("petty_cash", "statements", "Statements", "Estados de cuenta"),
        tab("petty_cash", "kpis", "KPIs", "KPIs"),

        tab("crm", "leads", "Leads", "Prospectos"),
        tab("crm", "contacts", "Contacts", "Contactos"),
        tab("crm", "quotes", "Quotes", "Cotizaciones"),
        tab("crm", "sales", "Sales", "Ventas"),
        tab("crm", "contracts", "Contracts", "Contratos"),
        tab("crm", "kpis", "KPIs", "KPIs"),

        tab("pos", "sale", "Sale", "Venta"),
        tab("pos", "cortes", "Cash Closings", "Cortes de caja"),
        tab("pos", "clientes", "Customers", "Clientes"),
        tab("pos", "facturacion", "Invoicing", "Facturación"),
        tab("pos", "descuentos", "Discounts", "Descuentos"),
        tab("pos", "kpis", "KPIs", "KPIs"),
        tab("pos", "kiosks", "Kiosks", "Kioscos"),

        tab("inventory", "products", "Products", "Productos"),
        tab("inventory", "inventory", "Inventory", "Inventario"),
        tab("inventory", "providers", "Providers", "Proveedores"),
        tab("inventory", "purchase-orders", "Purchase Orders", "Órdenes de compra"),

        tab("receivables", "credit-sales", "Credit Sales", "Ventas a crédito"),
        tab("receivables", "accounts-receivable", "Accounts Receivable", "Cuentas por cobrar"),
        tab("receivables", "payments", "Payments", "Pagos"),
        tab("receivables", "credit-customers", "Credit Customers", "Clientes de crédito"),

        tab("kpis", "kpis", "KPIs", "KPIs"),
        tab("kpis", "accounting-reports", "Accounting Reports", "Informes contables"),
        tab("kpis", "automated-reports", "Automated Reports", "Informes automatizados")
    );
    static final Set<String> VALID_KEYS = validKeys();

    private ConfigCenterTabPermissionCatalog() {
    }

    public static List<Map<String, Object>> catalogTabs() {
        var rows = new ArrayList<Map<String, Object>>();
        var moduleOrder = new LinkedHashMap<String, Integer>();
        for (var tab : CATALOG) {
            var currentModuleOrder = moduleOrder.computeIfAbsent(tab.moduleSlug(), ignored -> moduleOrder.size());
            var row = new LinkedHashMap<String, Object>();
            row.put("module_slug", tab.moduleSlug());
            row.put("tab_key", tab.tabKey());
            row.put("permission_key", permissionKey(tab.moduleSlug(), tab.tabKey()));
            row.put("name", tab.nameEn());
            row.put("name_en", tab.nameEn());
            row.put("name_es", tab.nameEs());
            var description = descriptionFor(permissionKey(tab.moduleSlug(), tab.tabKey()));
            row.put("description_en", description.en());
            row.put("description_es", description.es());
            row.put("access_level", accessLevel(tab));
            row.put("compatible_roles", compatibleRoles(tab));
            row.put("role_access", roleAccess(tab));
            row.put("module_order", currentModuleOrder);
            row.put("tab_order", rowsForModule(rows, tab.moduleSlug()));
            row.put("protected_scope", tab.protectedScope());
            rows.add(row);
        }
        return rows;
    }

    public static List<String> permissionKeysForModuleSlugs(Set<String> moduleSlugs) {
        var keys = new ArrayList<String>();
        for (var tab : CATALOG) {
            if (moduleSlugs.contains(tab.moduleSlug())) {
                keys.add(permissionKey(tab.moduleSlug(), tab.tabKey()));
            }
        }
        return keys;
    }

    public static Set<String> moduleSlugsWithTabs() {
        var modules = new LinkedHashSet<String>();
        for (var tab : CATALOG) {
            modules.add(tab.moduleSlug());
        }
        return Set.copyOf(modules);
    }

    public static boolean isProtectedScope(String permissionKey) {
        return CATALOG.stream()
            .anyMatch(tab -> permissionKey(tab.moduleSlug(), tab.tabKey()).equals(permissionKey) && tab.protectedScope());
    }

    public static boolean isValidPermissionKey(String permissionKey) {
        return VALID_KEYS.contains(permissionKey);
    }

    public static boolean isRoleCompatible(String permissionKey, String role) {
        var normalizedRole = normalizeRole(role);
        if (PROTECTED_ROLES.contains(normalizedRole)) {
            return true;
        }
        if (isProtectedScope(permissionKey)) {
            return false;
        }
        if (!"user".equals(normalizedRole)) {
            return true;
        }
        if (!permissionKey.startsWith(CONFIG_CENTER_MODULE + ".")
            && !permissionKey.startsWith(HR_MODULE + ".")) {
            return true;
        }
        return USER_SELF_SERVICE_SCOPES.contains(permissionKey);
    }

    public static String permissionKey(String moduleSlug, String tabKey) {
        return moduleSlug + "." + tabKey;
    }

    private static Set<String> validKeys() {
        var keys = new LinkedHashSet<String>();
        for (var tab : CATALOG) {
            keys.add(permissionKey(tab.moduleSlug(), tab.tabKey()));
        }
        return Set.copyOf(keys);
    }

    private static int rowsForModule(List<Map<String, Object>> rows, String moduleSlug) {
        return (int) rows.stream().filter(row -> moduleSlug.equals(row.get("module_slug"))).count();
    }

    private static String accessLevel(TabDefinition tab) {
        var key = permissionKey(tab.moduleSlug(), tab.tabKey());
        if (tab.protectedScope()) {
            return "protected";
        }
        if (PERSONAL_SCOPES.contains(key)) {
            return "personal";
        }
        if (USER_SELF_SERVICE_SCOPES.contains(key)) {
            return "self_service";
        }
        if (CONFIG_CENTER_MODULE.equals(tab.moduleSlug()) || HR_MODULE.equals(tab.moduleSlug())) {
            return "management";
        }
        return "operational";
    }

    private static List<String> compatibleRoles(TabDefinition tab) {
        var key = permissionKey(tab.moduleSlug(), tab.tabKey());
        if (tab.protectedScope()) {
            return List.of("superadmin");
        }
        if (isRoleCompatible(key, "user")) {
            return List.of("user", "admin", "superadmin");
        }
        return List.of("admin", "superadmin");
    }

    private static Map<String, Object> roleAccess(TabDefinition tab) {
        var access = new LinkedHashMap<String, Object>();
        access.put("user", roleAccessFor(tab, "user"));
        access.put("admin", roleAccessFor(tab, "admin"));
        access.put("superadmin", roleAccessFor(tab, "superadmin"));
        return access;
    }

    private static Map<String, Object> roleAccessFor(TabDefinition tab, String role) {
        var key = permissionKey(tab.moduleSlug(), tab.tabKey());
        var allowed = isRoleCompatible(key, role);
        var details = new LinkedHashMap<String, Object>();
        details.put("allowed", allowed);
        details.put("capability_keys", allowed ? capabilityKeys(tab, role) : List.of());
        if (allowed) {
            details.put("summary_en", allowedSummary(tab, role, false));
            details.put("summary_es", allowedSummary(tab, role, true));
        } else {
            var protectedScope = tab.protectedScope();
            details.put(
                "restriction_reason_en",
                protectedScope
                    ? "Only Super Admin can receive this protected access."
                    : "This management tab requires an Administrator or Super Admin role."
            );
            details.put(
                "restriction_reason_es",
                protectedScope
                    ? "Solo Superadministrador puede recibir este acceso protegido."
                    : "Esta pestaña de gestión requiere el rol Administrador o Superadministrador."
            );
        }
        return details;
    }

    private static List<String> capabilityKeys(TabDefinition tab, String role) {
        var normalizedRole = normalizeRole(role);
        if ("superadmin".equals(normalizedRole)) {
            return tab.protectedScope()
                ? List.of("view", "manage_company", "protected_access")
                : List.of("view", "manage_company", "delegate_access");
        }
        if ("admin".equals(normalizedRole)) {
            return List.of("view", "manage_scope", "delegate_owned");
        }
        return PERSONAL_SCOPES.contains(permissionKey(tab.moduleSlug(), tab.tabKey()))
            ? List.of("view", "personal_use")
            : List.of("view", "operate_scope");
    }

    private static String allowedSummary(TabDefinition tab, String role, boolean spanish) {
        var normalizedRole = normalizeRole(role);
        if ("superadmin".equals(normalizedRole)) {
            if (tab.protectedScope()) {
                return spanish
                    ? "Administra esta función protegida para toda la empresa."
                    : "Manages this protected function for the entire company.";
            }
            return spanish
                ? "Administra esta pestaña para toda la empresa y puede delegar su acceso."
                : "Manages this tab across the company and can delegate its access.";
        }
        if ("admin".equals(normalizedRole)) {
            return spanish
                ? "Administra esta pestaña dentro de su alcance y solo delega accesos que ya posee."
                : "Manages this tab within their scope and delegates only access they already hold.";
        }
        if (PERSONAL_SCOPES.contains(permissionKey(tab.moduleSlug(), tab.tabKey()))) {
            return spanish
                ? "Usa esta pestaña para consultar y actualizar su propia información."
                : "Uses this tab to view and update their own information.";
        }
        return spanish
            ? "Opera esta pestaña dentro de la unidad o negocio que tenga asignado."
            : "Operates this tab within the assigned unit or business.";
    }

    private static LocalizedDescription descriptionFor(String permissionKey) {
        return switch (permissionKey) {
            case "config_center.profile" -> description("Update personal identity, contact details and account security.", "Actualizar identidad, datos de contacto y seguridad de la cuenta.");
            case "config_center.business-structure" -> description("Organize corporate office, units, businesses and their locations.", "Organizar oficina corporativa, unidades, negocios y sus ubicaciones.");
            case "config_center.business-profile" -> description("Complete the company diagnosis and turn its results into an improvement plan.", "Completar el diagnóstico de la empresa y convertir sus resultados en un plan de mejora.");
            case "config_center.consulting" -> description("Request and track consulting sessions with the Indice team.", "Solicitar y dar seguimiento a sesiones de consultoría con el equipo de Índice.");
            case "config_center.integrations" -> description("Create, audit and revoke secure AI connections for the company.", "Crear, auditar y revocar conexiones seguras de IA para la empresa.");
            case "config_center.users" -> description("Invite users and manage their role, scope, modules, tabs and kiosks.", "Invitar usuarios y administrar su rol, alcance, módulos, pestañas y kioscos.");
            case "config_center.plan" -> description("Manage the company subscription, limits and protected billing settings.", "Administrar la suscripción, límites y configuración protegida de facturación.");
            case "human_resources.collaborators" -> description("Manage employee records, assignments, schedules and employment context.", "Administrar expedientes, asignaciones, horarios y contexto laboral.");
            case "human_resources.attendance" -> description("Review attendance records, entries, exits and daily incidents.", "Consultar registros de asistencia, entradas, salidas e incidencias diarias.");
            case "human_resources.control" -> description("Use attendance control tools and the authorized attendance kiosk.", "Usar las herramientas de control y el kiosco de asistencia autorizado.");
            case "human_resources.payroll" -> description("Prepare, review and manage payroll periods and employee payments.", "Preparar, revisar y administrar periodos de nómina y pagos al personal.");
            case "human_resources.announcements" -> description("Read and manage internal announcements for the assigned team.", "Leer y gestionar comunicados internos para el equipo asignado.");
            case "human_resources.assets" -> description("View and manage assets assigned to employees.", "Consultar y gestionar activos asignados a colaboradores.");
            case "human_resources.records" -> description("Manage employee documents, records and pending requirements.", "Administrar documentos, expedientes y requisitos pendientes del personal.");
            case "human_resources.permissions" -> description("Request, review and manage leave and employee permission records.", "Solicitar, consultar y gestionar permisos y ausencias del personal.");
            case "human_resources.incentives" -> description("Configure and review incentives, recognitions and team benefits.", "Configurar y consultar incentivos, reconocimientos y beneficios del equipo.");
            case "human_resources.kpis" -> description("Review workforce, attendance, payroll and people indicators.", "Consultar indicadores de personal, asistencia, nómina y gestión humana.");
            case "processes.calendar" -> description("Plan, assign and follow up operational tasks in the agenda.", "Planear, asignar y dar seguimiento a tareas operativas en la agenda.");
            case "processes.projects" -> description("Create and coordinate projects, stages, owners and due dates.", "Crear y coordinar proyectos, etapas, responsables y fechas límite.");
            case "processes.processes" -> description("Design and run recurring operational processes and checklists.", "Diseñar y ejecutar procesos operativos recurrentes y listas de verificación.");
            case "processes.kpis" -> description("Review productivity, completion and process performance indicators.", "Consultar indicadores de productividad, cumplimiento y desempeño de procesos.");
            case "expenses.expenses" -> description("Capture, classify, review and follow up company expenses.", "Capturar, clasificar, revisar y dar seguimiento a gastos de la empresa.");
            case "expenses.budgets" -> description("Define budgets and compare planned amounts against actual spending.", "Definir presupuestos y comparar montos planeados contra gasto real.");
            case "expenses.providers" -> description("Manage supplier information used by expenses and payments.", "Administrar proveedores utilizados en gastos y pagos.");
            case "expenses.accounting" -> description("Review the accounting context and classification of expenses.", "Consultar el contexto y la clasificación contable de los gastos.");
            case "expenses.payment-accounts" -> description("Manage the accounts and payment methods used for company expenses.", "Administrar cuentas y medios de pago usados en los gastos de la empresa.");
            case "expenses.kpis" -> description("Review spending, budget and supplier performance indicators.", "Consultar indicadores de gasto, presupuesto y desempeño de proveedores.");
            case "petty_cash.cash" -> description("Record petty cash income, expenses and supporting evidence.", "Registrar ingresos, egresos y evidencias de caja chica.");
            case "petty_cash.control" -> description("Control balances, custodians and cash movement approvals.", "Controlar saldos, responsables y autorizaciones de movimientos de caja.");
            case "petty_cash.statements" -> description("Review petty cash statements, reconciliations and movement history.", "Consultar estados de cuenta, conciliaciones e historial de movimientos.");
            case "petty_cash.kpis" -> description("Review petty cash balances, usage and control indicators.", "Consultar saldos, uso e indicadores de control de caja chica.");
            case "crm.leads" -> description("Capture and follow up prospects through the commercial funnel.", "Capturar y dar seguimiento a prospectos dentro del embudo comercial.");
            case "crm.contacts" -> description("Manage customer and prospect contact information.", "Administrar datos de contacto de clientes y prospectos.");
            case "crm.quotes" -> description("Prepare and follow up commercial quotes and proposals.", "Preparar y dar seguimiento a cotizaciones y propuestas comerciales.");
            case "crm.sales" -> description("Register and monitor sales opportunities and completed sales.", "Registrar y monitorear oportunidades y ventas realizadas.");
            case "crm.contracts" -> description("Manage commercial contracts, terms and related documents.", "Administrar contratos comerciales, condiciones y documentos relacionados.");
            case "crm.kpis" -> description("Review pipeline, conversion and commercial performance indicators.", "Consultar indicadores de embudo, conversión y desempeño comercial.");
            case "pos.sale" -> description("Run point-of-sale transactions and collect customer payments.", "Realizar ventas en punto de venta y cobrar pagos de clientes.");
            case "pos.cortes" -> description("Perform and review cash register closings and differences.", "Realizar y revisar cortes de caja y diferencias.");
            case "pos.clientes" -> description("Consult and manage customers used by point of sale.", "Consultar y administrar clientes del punto de venta.");
            case "pos.facturacion" -> description("Manage invoicing information and documents related to sales.", "Administrar datos y documentos de facturación relacionados con ventas.");
            case "pos.descuentos" -> description("Configure and apply authorized discounts at point of sale.", "Configurar y aplicar descuentos autorizados en punto de venta.");
            case "pos.kpis" -> description("Review sales, tickets, products and cashier performance indicators.", "Consultar indicadores de ventas, tickets, productos y desempeño de cajas.");
            case "pos.kiosks" -> description("Configure and supervise point-of-sale kiosks.", "Configurar y supervisar kioscos de punto de venta.");
            case "inventory.products" -> description("Manage the product catalog, codes, costs and sales data.", "Administrar catálogo de productos, códigos, costos y datos de venta.");
            case "inventory.inventory" -> description("Review stock and manage inventory movements and adjustments.", "Consultar existencias y administrar movimientos y ajustes de inventario.");
            case "inventory.providers" -> description("Manage suppliers connected to products and purchasing.", "Administrar proveedores relacionados con productos y compras.");
            case "inventory.purchase-orders" -> description("Create and follow up purchase orders and their receipt.", "Crear y dar seguimiento a órdenes de compra y su recepción.");
            case "receivables.credit-sales" -> description("Register and monitor sales granted on credit.", "Registrar y monitorear ventas otorgadas a crédito.");
            case "receivables.accounts-receivable" -> description("Review open balances, due dates and collection status.", "Consultar saldos abiertos, vencimientos y estado de cobranza.");
            case "receivables.payments" -> description("Register and reconcile customer payments against receivables.", "Registrar y conciliar pagos de clientes contra cuentas por cobrar.");
            case "receivables.credit-customers" -> description("Manage customers, limits and conditions for credit sales.", "Administrar clientes, límites y condiciones para ventas a crédito.");
            case "kpis.kpis" -> description("Build and review operational indicators for the assigned scope.", "Crear y consultar indicadores operativos del alcance asignado.");
            case "kpis.accounting-reports" -> description("Review accounting-oriented reports generated from operational data.", "Consultar reportes contables generados a partir de datos operativos.");
            case "kpis.automated-reports" -> description("Configure and review recurring automated reports.", "Configurar y consultar reportes automatizados recurrentes.");
            default -> description("Access this operational tab within the assigned scope.", "Acceder a esta pestaña operativa dentro del alcance asignado.");
        };
    }

    private static LocalizedDescription description(String en, String es) {
        return new LocalizedDescription(en, es);
    }

    private static String normalizeRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(java.util.Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }

    private static TabDefinition tab(String moduleSlug, String tabKey, String nameEn, String nameEs) {
        return new TabDefinition(moduleSlug, tabKey, nameEn, nameEs, false);
    }

    private static TabDefinition protectedTab(String moduleSlug, String tabKey, String nameEn, String nameEs) {
        return new TabDefinition(moduleSlug, tabKey, nameEn, nameEs, true);
    }

    private record TabDefinition(
        String moduleSlug,
        String tabKey,
        String nameEn,
        String nameEs,
        boolean protectedScope
    ) {
    }

    private record LocalizedDescription(String en, String es) {
    }
}
