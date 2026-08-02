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

    private static final List<TabDefinition> CATALOG = List.of(
        tab(CONFIG_CENTER_MODULE, "profile", "Profile", "Perfil"),
        tab(CONFIG_CENTER_MODULE, "business-structure", "Business Structure", "Estructura empresarial"),
        tab(CONFIG_CENTER_MODULE, "business-profile", "Business Profile", "Perfil empresarial"),
        tab(CONFIG_CENTER_MODULE, "personal-performance", "Personal Performance", "Desempeño personal"),
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
}
