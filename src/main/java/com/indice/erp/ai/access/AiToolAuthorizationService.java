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
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;

@Service
public class AiToolAuthorizationService {

    // Bounded to one synchronous capability evaluation, never reused by the next HTTP request.
    private final ThreadLocal<Map<Check, Boolean>> capabilityEvaluation = new ThreadLocal<>();

    public <T> T withCapabilityEvaluation(Supplier<T> operation) {
        var previous = capabilityEvaluation.get();
        capabilityEvaluation.set(new HashMap<>());
        try { return operation.get(); }
        finally {
            if (previous == null) capabilityEvaluation.remove();
            else capabilityEvaluation.set(previous);
        }
    }

    private boolean check(AuthSessionUser user, String kind, Object detail, BooleanSupplier evaluate) {
        var memo = capabilityEvaluation.get();
        if (memo == null) return evaluate.getAsBoolean();
        return memo.computeIfAbsent(new Check(user, kind, detail), ignored -> evaluate.getAsBoolean());
    }

    private record Check(AuthSessionUser user, String kind, Object detail) { }

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
    private static final TabPermissionRequirement ORGANIZATION_STRUCTURE_PERMISSION =
        TabPermissionRequirement.one("config_center.business-structure");
    private static final TabPermissionRequirement PAYMENT_ACCOUNT_PERMISSION =
        TabPermissionRequirement.one("expenses.payment-accounts");

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

    public boolean canUseProcessWorkflowTool(AuthSessionUser user,String tool) {
        var base=tool.startsWith("preview_")?tool.substring(8):tool;
        var permission=TabPermissionRequirement.one(base.endsWith("_project")||base.equals("list_projects")?"processes.projects":"processes.processes");
        return (base.endsWith("_project")||base.equals("list_projects")
            ?canUseModule(user,"processes",permission)
            :canUseModuleCapability(user,"processes","processes",permission))
            && processTasksAccessService.canAccess(user);
    }

    public boolean canUseTerminalTool(AuthSessionUser user,String tool) {
        if(!com.indice.erp.pos.assistant.PosTerminalReadService.READS.contains(tool)&&!com.indice.erp.pos.assistant.PosTerminalPreparation.ACTIONS.contains(tool))return false;
        boolean returns=tool.contains("refund")||tool.contains("return");
        if(returns&&!Set.of("root","superadmin","admin","owner").contains(normalizeRole(user.role())))return false;
        return canUseModuleCapability(user,"pos","pos",TabPermissionRequirement.one(returns?"pos.cortes":"pos.sale"));
    }

    public boolean canUsePosOperationsTool(AuthSessionUser user,String tool) {
        if(!com.indice.erp.pos.assistant.PosOperationsService.READS.contains(tool)&&!com.indice.erp.pos.assistant.PosOperationsService.ACTIONS.contains(tool))return false;
        if(tool.contains("settlement")&&!Set.of("root","superadmin","admin","owner").contains(normalizeRole(user.role())))return false;
        return canUseModuleCapability(user,"pos","pos",TabPermissionRequirement.one(tool.contains("closing")?"pos.cortes":"pos.sale"));
    }

    public boolean canUseCommissionTool(AuthSessionUser user,String tool) {
        if(!com.indice.erp.sales.SalesCommissionAssistantService.READS.contains(tool)&&!com.indice.erp.sales.SalesCommissionAssistantService.ACTIONS.contains(tool))return false;
        return Set.of("root","superadmin").contains(normalizeRole(user.role()))&&canUseModuleCapability(user,"crm","sales",TabPermissionRequirement.one("crm.commissions"));
    }

    public boolean canUseInventoryCatalogTool(AuthSessionUser user,String tool) {
        boolean action=com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantService.ACTIONS.contains(tool);
        if(!action&&!com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantService.READS.contains(tool))return false;
        if(action&&!Set.of("root","superadmin","admin","owner").contains(normalizeRole(user.role())))return false;
        return canUseModuleCapability(user,"inventory","inventory",TabPermissionRequirement.one(tool.contains("provider")?"inventory.providers":"inventory.discounts"));
    }
    public boolean canUseProcurementTool(AuthSessionUser user,String tool) {
        if(!com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService.READS.contains(tool)&&!com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService.ACTIONS.contains(tool))return false;
        String kind=com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService.kind(tool);
        if((kind.equals("invoice")||tool.startsWith("review_")||tool.equals("approve_purchase_order")||tool.equals("cancel_purchase_order")||tool.equals("convert_supplier_submission"))&&!Set.of("root","superadmin","admin","owner").contains(normalizeRole(user.role())))return false;
        String tab=kind.equals("invoice")?"inventory.purchase-orders":kind.equals("submission")||kind.equals("link")?"inventory.providers":"inventory.purchase-orders";
        return canUseModuleCapability(user,"inventory","inventory",TabPermissionRequirement.one(tab));
    }

    public boolean canUseInventoryTool(AuthSessionUser user, String tool) {
        if(!com.indice.erp.sales.InventoryAssistantService.READS.contains(tool)&&!com.indice.erp.sales.InventoryAssistantService.ACTIONS.contains(tool))return false;
        String tab=tool.contains("product")?"inventory.products":tool.contains("warehouse")?"inventory.warehouses":"inventory.inventory";
        if(tool.endsWith("_product")&&!tool.startsWith("get_")&&!Set.of("root","superadmin","admin","owner","dueno").contains(normalizeRole(user.role())))return false;
        return canUseModuleCapability(user,"inventory","inventory",TabPermissionRequirement.one(tab));
    }

    public boolean canReadGuideTab(AuthSessionUser user, String module, String tab) {
        if(Set.of("crm","inventory","pos").contains(module)) {
            var permissionTab = module.equals("inventory") ? switch(tab) { case "warehouses" -> "inventory"; case "discounts" -> "products"; default -> tab; }
                : module.equals("crm") && Set.of("commissions", "payment-accounts").contains(tab) ? "sales" : tab;
            return canUseModuleCapability(user,module,module.equals("crm")?"sales":module,TabPermissionRequirement.one(module+"."+permissionTab));
        }
        if (!Set.of("human_resources", "processes", "config_center", "expenses", "petty_cash", "receivables", "kpis").contains(module)) return false;
        var permissionTab=module.equals("expenses")&&tab.equals("payment_accounts")?"payment-accounts":tab;
        return canUseModule(user, module, TabPermissionRequirement.one(module + "." + permissionTab))
            && (!"processes".equals(module) || processTasksAccessService.canAccess(user));
    }

    public boolean canUseSalesWorkflowTool(AuthSessionUser user,String tool) {
        if(!com.indice.erp.sales.SalesWorkflowService.READS.contains(tool)&&!com.indice.erp.sales.SalesWorkflowService.ACTIONS.contains(tool))return false;
        String kind=com.indice.erp.sales.SalesWorkflowService.kind(tool);
        if(kind.equals("rule")&&!Set.of("root","superadmin").contains(normalizeRole(user.role())))return false;
        if((kind.equals("rule")||Set.of("confirm_sale_collection","cancel_commercial_sale").contains(tool))&&!Set.of("root","superadmin","admin","owner").contains(normalizeRole(user.role())))return false;
        String tab=kind.equals("contract")?"crm.contracts":kind.equals("rule")?"crm.commissions":"crm.sales";
        return canUseModuleCapability(user,"crm","sales",TabPermissionRequirement.one(tab));
    }

    public boolean canUsePosWorkflowTool(AuthSessionUser user,String tool) {
        if(!com.indice.erp.pos.assistant.PosAssistantService.READS.contains(tool)&&!com.indice.erp.pos.assistant.PosAssistantService.ACTIONS.contains(tool))return false;
        boolean admin=tool.endsWith("_register")&&!tool.startsWith("get_")||tool.contains("return")||tool.equals("reverse_pos_inventory_receipt");
        if(admin&&!Set.of("root","superadmin","admin","owner").contains(normalizeRole(user.role())))return false;
        String tab=tool.contains("register")?"pos.cajas":tool.contains("closing")||tool.contains("return")||tool.equals("close_pos_shift")||tool.equals("cancel_pos_shift")?"pos.cortes":"pos.sale";
        return canUseModuleCapability(user,"pos","pos",TabPermissionRequirement.one(tab));
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

    public boolean canUseFinanceWorkflowTool(AuthSessionUser user,String tool) {
        var spec=com.indice.erp.finance.assistant.FinanceAssistantTools.ALL.get(tool);
        if(spec==null)return false;
        if(spec.write()&&Set.of("accounting_account","payment_account","provider","budget","budget_line","fund").contains(spec.kind())
                &&!Set.of("deposit","remove_attachment").contains(spec.operation())
                &&!Set.of("root","superadmin","admin","owner","dueno").contains(normalizeRole(user.role())))return false;
        return canUseModuleCapability(user,spec.module(),spec.module(),TabPermissionRequirement.one(spec.module()+"."+spec.tab()));
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

    public boolean canReadOrganizationStructure(AuthSessionUser user) {
        return canUseModule(user, "config_center", ORGANIZATION_STRUCTURE_PERMISSION);
    }

    public boolean canReadPaymentAccounts(AuthSessionUser user) {
        return canUseModuleCapability(user, "expenses", "expenses", PAYMENT_ACCOUNT_PERMISSION)
            || canReadCommercialSales(user);
    }

    public boolean canReadCustomers(AuthSessionUser user) {
        return canUseModuleCapability(user, "crm", "sales", TabPermissionRequirement.any(
            "crm.leads", "crm.contacts", "crm.quotes", "crm.sales", "crm.contracts"))
            || canUseModuleCapability(user, "pos", "pos", TabPermissionRequirement.one("pos.clientes"));
    }

    public boolean canUseCommercialTool(AuthSessionUser user, String tool) {
        if (tool.equals("get_customer_detail")) return canReadCustomers(user);
        if (tool.equals("search_commercial_assignees")) return canUseModuleCapability(user, "crm", "sales",
            TabPermissionRequirement.any("crm.contacts", "crm.leads", "crm.quotes"));
        String tab = tool.endsWith("customer") ? "crm.contacts"
            : (tool.contains("opportunit") ? "crm.leads" : "crm.quotes");
        return canUseModuleCapability(user, "crm", "sales", TabPermissionRequirement.one(tab));
    }

    public boolean canReadProviders(AuthSessionUser user) {
        return canUseModuleCapability(user, "expenses", "expenses", TabPermissionRequirement.one("expenses.providers"))
            || canUseModuleCapability(user, "inventory", "inventory", TabPermissionRequirement.one("inventory.providers"));
    }

    public boolean canReadWarehouses(AuthSessionUser user) {
        return canReadInventory(user) || canReadCommercialSales(user);
    }

    public boolean canReadBudgetLines(AuthSessionUser user) {
        return canUseModuleCapability(user, "expenses", "expenses",
            TabPermissionRequirement.any("expenses.budgets", "expenses.kpis"));
    }

    public boolean canReadAccountingAccounts(AuthSessionUser user) {
        return canUseModuleCapability(user, "expenses", "expenses", TabPermissionRequirement.one("expenses.accounting"));
    }

    private boolean canUseModule(
        AuthSessionUser user,
        String module,
        TabPermissionRequirement permission
    ) {
        if (!check(user, "subscription", "", () -> subscriptionStatusProvider.currentStatus(user.companyId()).accessAllowed())) {
            return false;
        }
        return check(user, "module", module, () -> moduleEntitlementService.hasActiveEntitlement(user.companyId(), module)
            && moduleAccessService.canAccess(user, module))
            && check(user, "tab", permission, () -> tabPermissionAccessService.canAccess(user, permission));
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
        return check(user, "capability", capability, () -> {
            var entitlement = companyEntitlementService.resolve(user.companyId(), capability);
            return entitlement.policy_mode() != EntitlementPolicyMode.ENFORCE
                || entitlement.allowed()
                || PRIVILEGED_ROLES.contains(normalizeRole(user.role()));
        });
    }

    private String normalizeRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }
}
