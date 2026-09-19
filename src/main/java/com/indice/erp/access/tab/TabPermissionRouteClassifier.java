package com.indice.erp.access.tab;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class TabPermissionRouteClassifier {

    private static final String[] CONFIG_CENTER_ANY = {
        "config_center.profile",
        "config_center.business-structure",
        "config_center.business-profile",
        "config_center.consulting",
        "config_center.integrations",
        "config_center.personal-performance",
        "config_center.users"
    };
    private static final String[] CRM_ANY = {
        "crm.leads", "crm.contacts", "crm.quotes", "crm.sales", "crm.contracts", "crm.kpis"
    };
    private static final String[] HR_ANY = {
        "human_resources.collaborators", "human_resources.attendance", "human_resources.control",
        "human_resources.payroll", "human_resources.announcements", "human_resources.assets",
        "human_resources.records", "human_resources.permissions", "human_resources.incentives",
        "human_resources.kpis"
    };
    private static final String[] PROCESSES_ANY = {
        "processes.calendar", "processes.projects", "processes.processes", "processes.kpis"
    };
    private static final String[] POS_ANY = {
        "pos.sale", "pos.cortes", "pos.clientes", "pos.facturacion", "pos.descuentos", "pos.kpis", "pos.kiosks"
    };
    private static final String[] FINANCE_ANY = {
        "expenses.expenses", "expenses.budgets", "expenses.providers", "expenses.accounting",
        "expenses.payment-accounts", "expenses.kpis",
        "petty_cash.cash", "petty_cash.control", "petty_cash.statements", "petty_cash.kpis",
        "receivables.credit-sales", "receivables.accounts-receivable", "receivables.payments",
        "receivables.credit-customers"
    };
    private static final String[] KIOSK_ADMIN_ANY = {
        "human_resources.control", "processes.calendar", "petty_cash.cash", "expenses.providers",
        "inventory.products", "inventory.providers", "pos.kiosks"
    };

    public Optional<TabPermissionRequirement> classify(HttpServletRequest request) {
        var path = normalizedPath(request.getRequestURI());
        var method = request.getMethod().toUpperCase(Locale.ROOT);
        if (!path.startsWith("/api/") || "OPTIONS".equals(method) || isPublicSurface(path)) {
            return Optional.empty();
        }

        var v2Requirement = classifyKioskAdmin(path);
        if (v2Requirement.isPresent()) {
            return v2Requirement;
        }

        if (path.startsWith("/api/v1/config-center/current-user")) {
            return one("config_center.profile");
        }
        if (path.startsWith("/api/v1/config-center/users")) {
            return one("config_center.users");
        }
        if (path.startsWith("/api/v1/ai/connections")) {
            return one("config_center.integrations");
        }
        if (path.startsWith("/api/v1/config-center/business-structure")
            || path.startsWith("/api/v1/config-center/locations")) {
            return one("config_center.business-structure");
        }
        if (path.startsWith("/api/v1/config-center/company")) {
            return any("config_center.business-structure", "config_center.business-profile");
        }
        if (path.startsWith("/api/v1/config-center/config")) {
            return any(CONFIG_CENTER_ANY);
        }
        if (path.startsWith("/api/v1/dashboard/personal-performance")) {
            return one("config_center.personal-performance");
        }
        if (path.startsWith("/api/v1/dashboard/business-profile")) {
            return one("config_center.business-profile");
        }
        if (path.startsWith("/api/v1/consulting")) {
            return one("config_center.consulting");
        }
        if (path.startsWith("/api/v1/billing/seats")) {
            return one("config_center.users");
        }
        if (path.startsWith("/api/v1/billing/subscription")) {
            return "GET".equals(method)
                ? any("config_center.plan", "config_center.users")
                : one("config_center.plan");
        }
        if (path.startsWith("/api/v1/billing/storage")
            || path.startsWith("/api/v1/billing/recovery")) {
            return one("config_center.plan");
        }
        if (path.startsWith("/api/v1/account/ownership")) {
            return any("config_center.business-structure", "config_center.business-profile");
        }

        var hrRequirement = classifyHumanResources(path, method);
        if (hrRequirement.isPresent()) {
            return hrRequirement;
        }

        if (path.startsWith("/api/v1/agenda")) {
            return one("processes.calendar");
        }
        if (path.startsWith("/api/v1/process-tasks")) {
            return "GET".equals(method) ? any(PROCESSES_ANY) : any(
                "processes.calendar", "processes.projects", "processes.processes"
            );
        }
        if (path.startsWith("/api/v1/projects")) {
            return one("processes.projects");
        }
        if (path.startsWith("/api/v1/processes")) {
            return one("processes.processes");
        }
        if (path.startsWith("/api/v1/process-task-kpis")) {
            return one("processes.kpis");
        }

        var financeRequirement = classifyFinance(path, method);
        if (financeRequirement.isPresent()) {
            return financeRequirement;
        }

        var posRequirement = classifyPointOfSaleAndInventory(path, method);
        if (posRequirement.isPresent()) {
            return posRequirement;
        }

        var salesRequirement = classifySales(path, method);
        if (salesRequirement.isPresent()) {
            return salesRequirement;
        }

        if (path.startsWith("/api/v1/kpis/monetary-aggregate")) {
            return any(com.indice.erp.kpis.KpiRequestAccessService.monetaryPermissions());
        }
        if (path.startsWith("/api/v1/kpis/accounting-reports")) {
            return one("kpis.accounting-reports");
        }
        if (path.startsWith("/api/v1/kpis/automated-reports")) {
            return one("kpis.automated-reports");
        }
        if (path.startsWith("/api/v1/kpis")) {
            return one("kpis.kpis");
        }

        return Optional.empty();
    }

    private Optional<TabPermissionRequirement> classifyKioskAdmin(String path) {
        if (path.startsWith("/api/v2/kiosks/public/")
                || path.startsWith("/api/v2/multi-kiosks/public/")) {
            return Optional.empty();
        }
        if (path.startsWith("/api/v2/hr/attendance/kiosks")) {
            return one("human_resources.control");
        }
        if (path.startsWith("/api/v2/process-tasks/kiosks")) {
            return one("processes.calendar");
        }
        if (path.startsWith("/api/v2/finance/petty-cash/kiosks")) {
            return one("petty_cash.cash");
        }
        if (path.startsWith("/api/v2/finance/payable-kiosks")) {
            return one("expenses.providers");
        }
        if (path.startsWith("/api/v2/procurement/kiosks")) {
            return one("inventory.providers");
        }
        if (path.startsWith("/api/v2/sales/kiosks")) {
            return one("inventory.products");
        }
        if (path.startsWith("/api/v2/point-of-sale/kiosks")) {
            return one("pos.kiosks");
        }
        if (path.startsWith("/api/v2/me/kiosks")) {
            // Employee Center authorization is calculated per definition from module, scope,
            // exact grant, lifecycle and capability. It must not inherit admin tab requirements.
            return Optional.empty();
        }
        if (path.startsWith("/api/v2/kiosk-center")) {
            return any(KIOSK_ADMIN_ANY);
        }
        return Optional.empty();
    }

    private Optional<TabPermissionRequirement> classifyHumanResources(String path, String method) {
        if (path.startsWith("/api/v1/hr/users")) {
            return "GET".equals(method) ? any(HR_ANY) : one("human_resources.collaborators");
        }
        if (path.startsWith("/api/v1/hr/assets")) {
            return one("human_resources.assets");
        }
        if (path.startsWith("/api/v1/hr/records")) {
            return one("human_resources.records");
        }
        if (path.startsWith("/api/v1/hr/payroll")) {
            return one("human_resources.payroll");
        }
        if (path.startsWith("/api/v1/hr/announcements")) {
            return one("human_resources.announcements");
        }
        if (path.startsWith("/api/v1/hr/permissions")) {
            return one("human_resources.permissions");
        }
        if (path.startsWith("/api/v1/hr/incentives")) {
            return one("human_resources.incentives");
        }
        if (path.startsWith("/api/v1/hr/kpis")) {
            return one("human_resources.kpis");
        }
        if (path.startsWith("/api/v1/hr/face")) {
            return any("human_resources.collaborators", "human_resources.attendance", "human_resources.control");
        }
        if (!path.startsWith("/api/v1/hr/attendance")) {
            return Optional.empty();
        }
        if (path.contains("/public-kiosk/")) {
            return Optional.empty();
        }
        if (path.contains("/me/") || path.endsWith("/me")) {
            return one("human_resources.attendance");
        }
        if (path.endsWith("/dashboard") || path.endsWith("/kiosk-events")) {
            return any("human_resources.attendance", "human_resources.control");
        }
        return one("human_resources.control");
    }

    private Optional<TabPermissionRequirement> classifyFinance(String path, String method) {
        if (path.equals("/api/v1/finance") || path.startsWith("/api/v1/finance/context")) {
            return any(FINANCE_ANY);
        }
        if (path.startsWith("/api/v1/finance/expenses")) {
            return "GET".equals(method)
                ? any("expenses.expenses", "expenses.kpis")
                : one("expenses.expenses");
        }
        if (path.startsWith("/api/v1/finance/budgets") || path.startsWith("/api/v1/finance/budget-lines")) {
            return "GET".equals(method)
                ? any("expenses.budgets", "expenses.kpis")
                : one("expenses.budgets");
        }
        if (path.startsWith("/api/v1/finance/providers") || path.startsWith("/api/v1/finance/payable-kiosks")) {
            return one("expenses.providers");
        }
        if (path.startsWith("/api/v1/finance/accounting-accounts")) {
            return one("expenses.accounting");
        }
        if (path.startsWith("/api/v1/finance/payment-accounts")) {
            return any("expenses.payment-accounts", "crm.sales");
        }
        if (path.startsWith("/api/v1/finance/kpis")) {
            return one("expenses.kpis");
        }
        if (path.startsWith("/api/v1/finance/petty-cash")) {
            if (path.contains("/statements/")) {
                return one("petty_cash.statements");
            }
            if (path.contains("/movements") || path.contains("/settlement-lines")) {
                return one("petty_cash.control");
            }
            if (path.contains("/kpis")) {
                return one("petty_cash.kpis");
            }
            return "GET".equals(method)
                ? any("petty_cash.cash", "petty_cash.control", "petty_cash.statements", "petty_cash.kpis")
                : one("petty_cash.cash");
        }
        if (path.startsWith("/api/v1/finance/receivables")) {
            if ("GET".equals(method) && path.equals("/api/v1/finance/receivables/kpis/workspace")) {
                return one("receivables.kpis");
            }
            if ("GET".equals(method) && path.matches("/api/v1/finance/receivables/payments/[0-9]+/receipt")) {
                return any("receivables.payments", "receivables.kpis");
            }
            if (path.endsWith("/payment-accounts")) {
                return any("receivables.payments", "receivables.accounts-receivable");
            }
            if (path.endsWith("/payments") || path.contains("/payments/") || path.contains("/payment-receipts/")) {
                return one("receivables.payments");
            }
            if (path.endsWith("/credit-policies") || path.contains("/credit-policies/")) {
                return one("receivables.credit-customers");
            }
            if (path.endsWith("/workspace")) {
                return any(
                    "receivables.credit-sales",
                    "receivables.accounts-receivable",
                    "receivables.payments",
                    "receivables.credit-customers"
                );
            }
            return any("receivables.credit-sales", "receivables.accounts-receivable");
        }
        return Optional.empty();
    }

    private Optional<TabPermissionRequirement> classifyPointOfSaleAndInventory(String path, String method) {
        if (!path.startsWith("/api/v1/pos")) {
            return Optional.empty();
        }
        if (path.contains("/public/supplier-portal/")) {
            return Optional.empty();
        }
        if (path.startsWith("/api/v1/pos/product-suppliers")) {
            return any("inventory.providers", "inventory.purchase-orders");
        }
        if (path.startsWith("/api/v1/pos/supplier-portal-access")) {
            return one("inventory.providers");
        }
        if (path.startsWith("/api/v1/pos/purchase-orders")
            || path.startsWith("/api/v1/pos/supplier-submissions")
            || path.startsWith("/api/v1/pos/supplier-invoices")) {
            return one("inventory.purchase-orders");
        }
        if (path.startsWith("/api/v1/pos/self-service-kiosks")
            || path.startsWith("/api/v1/pos/customer-displays")) {
            return one("pos.kiosks");
        }
        if (path.startsWith("/api/v1/pos/customers")) {
            return one("pos.clientes");
        }
        if (path.startsWith("/api/v1/pos/invoices")) {
            return one("pos.facturacion");
        }
        if (path.startsWith("/api/v1/pos/discounts")) {
            return one("pos.descuentos");
        }
        if (path.startsWith("/api/v1/pos/kpis")) {
            return one("pos.kpis");
        }
        if (path.startsWith("/api/v1/pos/inventory-receipts")) {
            return one("pos.sale");
        }
        if (path.startsWith("/api/v1/pos/shifts")
            || path.startsWith("/api/v1/pos/cash-closings")
            || path.startsWith("/api/v1/pos/cash-movements")
            || path.startsWith("/api/v1/pos/cash-registers")) {
            return "GET".equals(method) ? any("pos.cortes", "pos.kpis") : one("pos.cortes");
        }
        if (path.startsWith("/api/v1/pos/tickets") || path.startsWith("/api/v1/pos/sales")) {
            return "GET".equals(method) ? any("pos.sale", "pos.kpis") : one("pos.sale");
        }
        if (path.startsWith("/api/v1/pos/context")) {
            return any(POS_ANY);
        }
        return Optional.empty();
    }

    private Optional<TabPermissionRequirement> classifySales(String path, String method) {
        if (!path.startsWith("/api/v1/sales")) {
            return Optional.empty();
        }
        if (path.startsWith("/api/v1/sales/public-catalogs")) {
            return one("inventory.products");
        }
        if (path.startsWith("/api/v1/sales/context") || path.startsWith("/api/v1/sales/files")) {
            return any(
                "crm.leads", "crm.contacts", "crm.quotes", "crm.sales", "crm.contracts",
                "inventory.products", "inventory.inventory", "inventory.providers"
            );
        }
        if (path.startsWith("/api/v1/sales/kpis")) {
            return one("crm.kpis");
        }
        if (path.startsWith("/api/v1/sales/opportunity-flow")) {
            return one("crm.leads");
        }
        if (path.startsWith("/api/v1/sales/meta-leads")) {
            return one("crm.contacts");
        }

        var collection = firstPathSegment(path.substring("/api/v1/sales".length()));
        return switch (collection) {
            case "opportunities" -> "GET".equals(method)
                ? any("crm.leads", "crm.quotes", "crm.sales", "crm.contracts")
                : one("crm.leads");
            case "contacts" -> "GET".equals(method)
                ? any("crm.leads", "crm.contacts", "crm.quotes", "crm.sales", "crm.contracts")
                : one("crm.contacts");
            case "quotes" -> "GET".equals(method)
                ? any("crm.quotes", "crm.sales", "crm.contracts")
                : one("crm.quotes");
            case "sales", "commission-summary" -> one("crm.sales");
            case "contracts", "post-sales" -> one("crm.contracts");
            case "products" -> "GET".equals(method)
                ? any("inventory.products", "inventory.inventory", "inventory.purchase-orders", "crm.quotes", "crm.sales")
                : one("inventory.products");
            case "providers" -> one("inventory.providers");
            case "inventory-warehouses" -> "GET".equals(method)
                ? any("inventory.inventory", "crm.sales")
                : one("inventory.inventory");
            case "inventory-balances", "inventory-movements" -> one("inventory.inventory");
            default -> Optional.empty();
        };
    }

    private Optional<TabPermissionRequirement> one(String permissionKey) {
        return Optional.of(TabPermissionRequirement.one(permissionKey));
    }

    private Optional<TabPermissionRequirement> any(String... permissionKeys) {
        return Optional.of(TabPermissionRequirement.any(permissionKeys));
    }

    private String firstPathSegment(String suffix) {
        var normalized = suffix == null ? "" : suffix.replaceFirst("^/+", "");
        var separator = normalized.indexOf('/');
        return separator < 0 ? normalized : normalized.substring(0, separator);
    }

    private String normalizedPath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return "";
        }
        var duplicateSlashFree = rawPath.replaceAll("/{2,}", "/");
        return duplicateSlashFree.length() > 1 && duplicateSlashFree.endsWith("/")
            ? duplicateSlashFree.substring(0, duplicateSlashFree.length() - 1)
            : duplicateSlashFree;
    }

    private boolean isPublicSurface(String path) {
        return path.startsWith("/api/v1/auth/")
            || path.startsWith("/api/v1/invitations/")
            || path.startsWith("/api/v1/billing/signup")
            || path.startsWith("/api/v1/billing/stripe")
            || path.startsWith("/api/v1/platform")
            || path.contains("/public-kiosk/")
            || path.contains("/public-payable-kiosks/")
            || path.startsWith("/api/v2/kiosks/public/")
            || path.startsWith("/api/v2/multi-kiosks/public/");
    }
}
