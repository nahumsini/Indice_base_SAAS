package com.indice.erp.access.tab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class TabPermissionRouteClassifierTest {

    private final TabPermissionRouteClassifier classifier = new TabPermissionRouteClassifier();

    @Test
    void classifiesRepresentativeRoutesAcrossEveryModule() {
        assertRequirement("GET", "/api/v1/config-center/users", "config_center.users");
        assertAnyOf("GET", "/api/v1/billing/subscription", "config_center.plan", "config_center.users");
        assertRequirement("POST", "/api/v1/billing/subscription/cancel", "config_center.plan");
        assertRequirement("GET", "/api/v1/dashboard/business-profile", "config_center.business-profile");
        assertRequirement("PUT", "/api/v1/dashboard/business-profile", "config_center.business-profile");
        assertRequirement("GET", "/api/v1/consulting/workspace", "config_center.consulting");
        assertRequirement("POST", "/api/v1/consulting/appointments", "config_center.consulting");
        assertRequirement("GET", "/api/v1/dashboard/personal-performance/me", "config_center.personal-performance");
        assertRequirement("PUT", "/api/v1/dashboard/personal-performance/me", "config_center.personal-performance");
        assertRequirement("POST", "/api/v1/hr/users", "human_resources.collaborators");
        assertRequirement("GET", "/api/v1/hr/kpis", "human_resources.kpis");
        assertRequirement("GET", "/api/v1/projects", "processes.projects");
        assertRequirement("GET", "/api/v1/process-task-kpis", "processes.kpis");
        assertRequirement("GET", "/api/v1/finance/payment-accounts", "expenses.payment-accounts");
        assertRequirement("GET", "/api/v1/finance/kpis", "expenses.kpis");
        assertRequirement("POST", "/api/v1/finance/petty-cash/funds/2/movements", "petty_cash.control");
        assertRequirement("POST", "/api/v1/finance/petty-cash/funds/2/statements/3/close", "petty_cash.statements");
        assertRequirement("POST", "/api/v1/sales/quotes", "crm.quotes");
        assertRequirement("PUT", "/api/v1/sales/opportunity-flow", "crm.leads");
        assertRequirement("POST", "/api/v1/sales/meta-leads/import", "crm.contacts");
        assertRequirement("GET", "/api/v1/sales/kpis", "crm.kpis");
        assertRequirement("GET", "/api/v1/pos/discounts", "pos.descuentos");
        assertRequirement("GET", "/api/v1/pos/self-service-kiosks", "pos.kiosks");
        assertRequirement("POST", "/api/v1/sales/products", "inventory.products");
        assertRequirement("GET", "/api/v1/pos/purchase-orders", "inventory.purchase-orders");
        assertRequirement("POST", "/api/v1/finance/receivables/payments", "receivables.payments");
        assertRequirement("POST", "/api/v1/finance/receivables/credit-policies", "receivables.credit-customers");
        assertRequirement("GET", "/api/v1/kpis/executive-panel", "kpis.kpis");
        assertRequirement("GET", "/api/v1/kpis/accounting-reports", "kpis.accounting-reports");
        assertRequirement("GET", "/api/v1/kpis/automated-reports", "kpis.automated-reports");
    }

    @Test
    void sharedReadRoutesAcceptTheScopesThatConsumeTheirData() {
        assertAnyOf("GET", "/api/v1/hr/users", "human_resources.collaborators", "human_resources.kpis");
        assertAnyOf("GET", "/api/v1/process-tasks", "processes.calendar", "processes.projects", "processes.processes");
        assertAnyOf("GET", "/api/v1/finance/petty-cash", "petty_cash.cash", "petty_cash.control", "petty_cash.statements", "petty_cash.kpis");
        assertAnyOf("GET", "/api/v1/pos/cash-closings", "pos.cortes", "pos.kpis");
        assertAnyOf("GET", "/api/v1/sales/products", "inventory.products", "inventory.inventory", "inventory.purchase-orders");
        assertAnyOf("GET", "/api/v1/finance/payment-accounts", "expenses.payment-accounts", "crm.sales");
        assertAnyOf("POST", "/api/v1/finance/payment-accounts", "expenses.payment-accounts", "crm.sales");
        assertAnyOf("GET", "/api/v1/sales/inventory-warehouses", "inventory.inventory", "crm.sales");
        assertRequirement("POST", "/api/v1/sales/inventory-warehouses", "inventory.inventory");
    }

    @Test
    void classifiesNonPayrollHumanResourcesRoutesByTab() {
        assertRequirement("POST", "/api/v1/hr/users/12/documents/presign-upload", "human_resources.collaborators");
        assertRequirement("POST", "/api/v1/hr/assets/8/status", "human_resources.assets");
        assertRequirement("POST", "/api/v1/hr/records/12/attachments", "human_resources.records");
        assertRequirement("POST", "/api/v1/hr/announcements/4/read", "human_resources.announcements");
        assertRequirement("POST", "/api/v1/hr/permissions/5/approve", "human_resources.permissions");
        assertRequirement("POST", "/api/v1/hr/incentives", "human_resources.incentives");
        assertRequirement("POST", "/api/v1/hr/attendance/schedule-assignments/bulk", "human_resources.control");
        assertAnyOf("POST", "/api/v1/hr/attendance/kiosk-events", "human_resources.attendance", "human_resources.control");
        assertRequirement("POST", "/api/v1/hr/attendance/me/kiosk-events", "human_resources.attendance");
        assertAnyOf("POST", "/api/v1/hr/face/enrollment-sessions", "human_resources.collaborators", "human_resources.control");
    }

    @Test
    void excludesPublicAndPreflightSurfaces() {
        assertTrue(classify("GET", "/api/v2/kiosks/public/token").isEmpty());
        assertTrue(classify("GET", "/api/v2/multi-kiosks/public/token").isEmpty());
        assertTrue(classify("GET", "/api/v1/hr/attendance/public-kiosk/token/config").isEmpty());
        assertTrue(classify("GET", "/api/v1/auth/me").isEmpty());
        assertTrue(classify("OPTIONS", "/api/v1/config-center/users").isEmpty());
        assertTrue(classify("GET", "/api/v2/me/kiosks").isEmpty());
        assertTrue(classify("POST", "/api/v2/me/kiosks/12/sessions").isEmpty());
    }

    @Test
    void keepsEmployeeCenterSeparateFromAdministrativeKioskAuthority() {
        assertTrue(classify("GET", "/api/v2/me/kiosks/12/workspace").isEmpty());
        assertAnyOf(
            "GET", "/api/v2/kiosk-center/kiosks",
            "human_resources.control", "processes.calendar", "petty_cash.cash");
    }

    @Test
    void everyClassifiedRequirementUsesCanonicalCatalogKeys() {
        var routes = List.of(
            "/api/v1/config-center/users", "/api/v1/billing/subscription", "/api/v1/hr/users",
            "/api/v1/process-tasks", "/api/v1/finance", "/api/v1/finance/petty-cash",
            "/api/v1/finance/receivables/workspace", "/api/v1/pos/context", "/api/v1/sales/context",
            "/api/v1/kpis/executive-panel", "/api/v2/kiosk-center/kiosks"
        );

        for (var route : routes) {
            var requirement = classify("GET", route).orElseThrow();
            assertTrue(requirement.anyOf().stream().allMatch(ConfigCenterTabPermissionCatalog::isValidPermissionKey));
        }
    }

    private void assertRequirement(String method, String path, String permissionKey) {
        var requirement = classify(method, path).orElseThrow();
        assertTrue(requirement.anyOf().contains(permissionKey), path + " should require " + permissionKey);
    }

    private void assertAnyOf(String method, String path, String... permissionKeys) {
        var requirement = classify(method, path).orElseThrow();
        for (var permissionKey : permissionKeys) {
            assertTrue(requirement.anyOf().contains(permissionKey), path + " should accept " + permissionKey);
        }
    }

    private java.util.Optional<TabPermissionRequirement> classify(String method, String path) {
        var request = new MockHttpServletRequest(method, path);
        return classifier.classify(request);
    }
}
