package com.indice.erp.ai.access;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import com.indice.erp.billing.subscription.CompanySubscriptionStatusProvider;
import com.indice.erp.entitlement.CompanyEntitlementService;
import com.indice.erp.entitlement.EntitlementPolicyMode;
import com.indice.erp.processTasks.ProcessTasksAccessService;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AiToolAuthorizationService {

    private static final Set<String> PRIVILEGED_ROLES = Set.of("root", "superadmin");
    private static final TabPermissionRequirement SALES_KPI_PERMISSION =
        TabPermissionRequirement.one("crm.kpis");
    private static final TabPermissionRequirement EXECUTIVE_KPI_PERMISSION =
        TabPermissionRequirement.one("kpis.kpis");
    private static final TabPermissionRequirement COMMERCIAL_SALES_PERMISSION =
        TabPermissionRequirement.one("crm.sales");
    private static final TabPermissionRequirement COMMERCIAL_PRODUCT_PERMISSION =
        TabPermissionRequirement.any("crm.quotes", "crm.sales");
    private static final TabPermissionRequirement INVENTORY_PRODUCT_PERMISSION =
        TabPermissionRequirement.any("inventory.products", "inventory.inventory", "inventory.purchase-orders");
    private static final TabPermissionRequirement INVENTORY_BALANCE_PERMISSION =
        TabPermissionRequirement.one("inventory.inventory");
    private static final TabPermissionRequirement POS_SALES_PERMISSION =
        TabPermissionRequirement.any("pos.sale", "pos.kpis");
    private static final TabPermissionRequirement POS_CASH_PERMISSION =
        TabPermissionRequirement.any("pos.cortes", "pos.kpis");
    private static final TabPermissionRequirement PROCESS_TASK_READ_PERMISSION =
        TabPermissionRequirement.any(
            "processes.calendar", "processes.projects", "processes.processes", "processes.kpis"
        );
    private static final TabPermissionRequirement PROCESS_TASK_CREATE_PERMISSION =
        TabPermissionRequirement.any("processes.calendar", "processes.projects", "processes.processes");
    private static final TabPermissionRequirement EXPENSE_READ_PERMISSION =
        TabPermissionRequirement.any("expenses.expenses", "expenses.kpis");
    private static final TabPermissionRequirement EXPENSE_CREATE_PERMISSION =
        TabPermissionRequirement.one("expenses.expenses");
    private static final TabPermissionRequirement PETTY_CASH_READ_PERMISSION =
        TabPermissionRequirement.any(
            "petty_cash.cash", "petty_cash.control", "petty_cash.statements", "petty_cash.kpis"
        );
    private static final TabPermissionRequirement PETTY_CASH_MOVEMENT_PERMISSION =
        TabPermissionRequirement.one("petty_cash.control");
    private static final TabPermissionRequirement RECEIVABLES_READ_PERMISSION =
        TabPermissionRequirement.any(
            "receivables.credit-sales",
            "receivables.accounts-receivable",
            "receivables.payments",
            "receivables.credit-customers"
        );

    private final CompanySubscriptionStatusProvider subscriptionStatusProvider;
    private final CompanyModuleEntitlementService moduleEntitlementService;
    private final ModuleAccessService moduleAccessService;
    private final TabPermissionAccessService tabPermissionAccessService;
    private final CompanyEntitlementService companyEntitlementService;
    private final ProcessTasksAccessService processTasksAccessService;

    public AiToolAuthorizationService(
        CompanySubscriptionStatusProvider subscriptionStatusProvider,
        CompanyModuleEntitlementService moduleEntitlementService,
        ModuleAccessService moduleAccessService,
        TabPermissionAccessService tabPermissionAccessService,
        CompanyEntitlementService companyEntitlementService,
        ProcessTasksAccessService processTasksAccessService
    ) {
        this.subscriptionStatusProvider = subscriptionStatusProvider;
        this.moduleEntitlementService = moduleEntitlementService;
        this.moduleAccessService = moduleAccessService;
        this.tabPermissionAccessService = tabPermissionAccessService;
        this.companyEntitlementService = companyEntitlementService;
        this.processTasksAccessService = processTasksAccessService;
    }

    public boolean canReadSalesToday(AuthSessionUser user) {
        return canUseModuleCapability(user, "crm", "sales", SALES_KPI_PERMISSION);
    }

    public boolean canReadBusinessSnapshot(AuthSessionUser user) {
        return canUseModule(user, "kpis", EXECUTIVE_KPI_PERMISSION);
    }

    public boolean canCreateTask(AuthSessionUser user) {
        return canUseModule(user, "processes", PROCESS_TASK_CREATE_PERMISSION)
            && processTasksAccessService.canAccess(user);
    }

    public boolean canReadTasks(AuthSessionUser user) {
        return canUseModule(user, "processes", PROCESS_TASK_READ_PERMISSION)
            && processTasksAccessService.canAccess(user);
    }

    public boolean canReadCommercialSales(AuthSessionUser user) {
        return canUseModuleCapability(user, "crm", "sales", COMMERCIAL_SALES_PERMISSION);
    }

    public boolean canReadPosSales(AuthSessionUser user) {
        return canUseModuleCapability(user, "pos", "pos", POS_SALES_PERMISSION);
    }

    public boolean canReadProductCatalog(AuthSessionUser user) {
        return canUseModuleCapability(user, "inventory", "inventory", INVENTORY_PRODUCT_PERMISSION)
            || canUseModuleCapability(user, "crm", "sales", COMMERCIAL_PRODUCT_PERMISSION);
    }

    public boolean canReadInventory(AuthSessionUser user) {
        return canUseModuleCapability(user, "inventory", "inventory", INVENTORY_BALANCE_PERMISSION);
    }

    public boolean canReadPosCash(AuthSessionUser user) {
        return canUseModuleCapability(user, "pos", "pos", POS_CASH_PERMISSION);
    }

    public boolean canReadExpenses(AuthSessionUser user) {
        return canUseModuleCapability(user, "expenses", "expenses", EXPENSE_READ_PERMISSION);
    }

    public boolean canCreateExpenseDraft(AuthSessionUser user) {
        return canUseModuleCapability(user, "expenses", "expenses", EXPENSE_CREATE_PERMISSION);
    }

    public boolean canReadPettyCash(AuthSessionUser user) {
        return canUseModuleCapability(user, "petty_cash", "petty_cash", PETTY_CASH_READ_PERMISSION);
    }

    public boolean canRegisterFundExpense(AuthSessionUser user) {
        return canUseModuleCapability(user, "petty_cash", "petty_cash", PETTY_CASH_MOVEMENT_PERMISSION);
    }

    public boolean canAddMoneyToFund(AuthSessionUser user) {
        return canUseModuleCapability(user, "petty_cash", "petty_cash", PETTY_CASH_MOVEMENT_PERMISSION);
    }

    public boolean canReadReceivables(AuthSessionUser user) {
        return canUseModuleCapability(user, "receivables", "receivables", RECEIVABLES_READ_PERMISSION);
    }

    private boolean canUseModule(
        AuthSessionUser user,
        String module,
        TabPermissionRequirement permission
    ) {
        if (!subscriptionStatusProvider.currentStatus(user.companyId()).accessAllowed()) {
            return false;
        }
        return moduleEntitlementService.hasActiveEntitlement(user.companyId(), module)
            && moduleAccessService.canAccess(user, module)
            && tabPermissionAccessService.canAccess(user, permission);
    }

    private boolean canUseModuleCapability(
        AuthSessionUser user,
        String module,
        String capability,
        TabPermissionRequirement permission
    ) {
        if (!canUseModule(user, module, permission)) {
            return false;
        }
        var entitlement = companyEntitlementService.resolve(user.companyId(), capability);
        return entitlement.policy_mode() != EntitlementPolicyMode.ENFORCE
            || entitlement.allowed()
            || PRIVILEGED_ROLES.contains(normalizeRole(user.role()));
    }

    private String normalizeRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }
}
