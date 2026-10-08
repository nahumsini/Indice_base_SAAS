package com.indice.erp.ai.access;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import java.util.List;
import java.util.TreeSet;
import java.util.function.BooleanSupplier;
import org.springframework.stereotype.Service;

@Service
public class AiToolCapabilityService {

    private final AiToolAuthorizationService authorizationService;
    private final HrAccessService hrAccessService;

    public AiToolCapabilityService(
        AiToolAuthorizationService authorizationService,
        HrAccessService hrAccessService
    ) {
        this.authorizationService = authorizationService;
        this.hrAccessService = hrAccessService;
    }

    public List<String> allowedTools(AiAccessTokenRepository.StoredToken token) {
        return authorizationService.withCapabilityEvaluation(() -> resolveAllowedTools(token));
    }

    private List<String> resolveAllowedTools(AiAccessTokenRepository.StoredToken token) {
        var tools = new TreeSet<String>();
        var user = token.user();
        add(tools, token, AiAccessTokenService.LEARNING_READ, () -> canReadLearning(user), "get_system_guide", "get_learning_progress", "get_next_learning_mission");
        add(tools, token, AiAccessTokenService.LEARNING_MANAGE, () -> canReadLearning(user), "preview_update_learning_progress", "update_learning_progress");
        add(tools,token,AiAccessTokenService.HR_KPIS_READ,()->authorizationService.canReadGuideTab(user,"human_resources","kpis")&&hrAccessService.canAccessManagementTab(user,HrTab.KPIS),"get_hr_kpis");
        var hrTools = new com.indice.erp.ai.hr.AiHrAccess(authorizationService, hrAccessService);
        for (var tool : com.indice.erp.ai.hr.AiHrAccess.READS)
            add(tools, token, com.indice.erp.ai.hr.AiHrAccess.scope(tool), () -> hrTools.allowed(token, tool), tool);
        for (var action : com.indice.erp.hr.assistant.HrAssistantService.ACTIONS)
            add(tools, token, com.indice.erp.ai.hr.AiHrAccess.scope(action), () -> hrTools.allowed(token, action), "preview_" + action, action);

        for(var tool:com.indice.erp.processTasks.assistant.ProcessAssistantService.READS)
            add(tools,token,com.indice.erp.ai.process.AiProcessAccess.scope(tool),()->authorizationService.canUseProcessWorkflowTool(user,tool),tool);
        for(var action:com.indice.erp.processTasks.assistant.ProcessAssistantService.ACTIONS)
            add(tools,token,com.indice.erp.ai.process.AiProcessAccess.scope(action),()->authorizationService.canUseProcessWorkflowTool(user,action),"preview_"+action,action);

        for(var tool:com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService.READS)
            add(tools,token,com.indice.erp.ai.procurement.AiProcurementAccess.scope(tool),()->authorizationService.canUseProcurementTool(user,tool),tool);
        for(var action:com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService.ACTIONS)
            add(tools,token,com.indice.erp.ai.procurement.AiProcurementAccess.scope(action),()->authorizationService.canUseProcurementTool(user,action),"preview_"+action,action);
        for(var tool:com.indice.erp.pos.assistant.PosTerminalReadService.READS)
            add(tools,token,com.indice.erp.ai.terminal.AiTerminalAccess.scope(tool),()->authorizationService.canUseTerminalTool(user,tool),tool);
        for(var action:com.indice.erp.pos.assistant.PosTerminalPreparation.ACTIONS)
            add(tools,token,com.indice.erp.ai.terminal.AiTerminalAccess.scope(action),()->authorizationService.canUseTerminalTool(user,action),"preview_"+action,action);
        for(var tool:com.indice.erp.pos.assistant.PosOperationsService.READS)
            add(tools,token,com.indice.erp.ai.posoperations.AiPosOperationsAccess.scope(tool),()->authorizationService.canUsePosOperationsTool(user,tool),tool);
        for(var action:com.indice.erp.pos.assistant.PosOperationsService.ACTIONS)
            add(tools,token,com.indice.erp.ai.posoperations.AiPosOperationsAccess.scope(action),()->authorizationService.canUsePosOperationsTool(user,action),"preview_"+action,action);
        var commissionAccess=new com.indice.erp.ai.commission.AiCommissionAccess(authorizationService);
        for(var tool:com.indice.erp.sales.SalesCommissionAssistantService.READS)
            add(tools,token,com.indice.erp.ai.commission.AiCommissionAccess.scope(tool),()->commissionAccess.allowed(token,tool),tool);
        for(var action:com.indice.erp.sales.SalesCommissionAssistantService.ACTIONS)
            add(tools,token,com.indice.erp.ai.commission.AiCommissionAccess.scope(action),()->commissionAccess.allowed(token,action),"preview_"+action,action);
        for(var tool:com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantService.READS)
            add(tools,token,com.indice.erp.ai.inventorycatalog.AiInventoryCatalogAccess.scope(tool),()->authorizationService.canUseInventoryCatalogTool(user,tool),tool);
        for(var action:com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantService.ACTIONS)
            add(tools,token,com.indice.erp.ai.inventorycatalog.AiInventoryCatalogAccess.scope(action),()->authorizationService.canUseInventoryCatalogTool(user,action),"preview_"+action,action);
        add(tools, token, AiAccessTokenService.SALES_TODAY_READ,
            () -> authorizationService.canReadSalesToday(user),
            "get_sales_today");
        add(tools, token, AiAccessTokenService.BUSINESS_SNAPSHOT_READ,
            () -> authorizationService.canReadBusinessSnapshot(user),
            "get_business_snapshot", "get_attention_items");
        add(tools, token, AiAccessTokenService.HR_PEOPLE_READ,
            () -> authorizationService.canReadGuideTab(user,"human_resources","collaborators")
                && hrAccessService.canAccessReadableTab(user, HrTab.COLLABORATORS),
            "search_employees", "get_employee_overview");
        add(tools, token, AiAccessTokenService.HR_ATTENDANCE_READ,
            () -> authorizationService.canReadGuideTab(user,"human_resources","attendance")
                && hrAccessService.canAccessReadableTab(user, HrTab.ATTENDANCE),
            "get_attendance_exceptions");
        add(tools, token, AiAccessTokenService.TASKS_READ,
            () -> authorizationService.canReadTasks(user),
            "list_tasks", "get_task_detail", "list_task_organization");
        add(tools, token, AiAccessTokenService.TASKS_KPIS_READ,
            () -> authorizationService.canReadGuideTab(user, "processes", "kpis"), "get_process_task_kpis");
        add(tools, token, AiAccessTokenService.SALES_READ,
            () -> authorizationService.canReadCommercialSales(user)
                || authorizationService.canReadPosSales(user),
            "get_sales_summary", "list_sales", "get_sale_detail");
        add(tools, token, AiAccessTokenService.POS_READ,
            () -> authorizationService.canReadPosCash(user),
            "get_cash_status");
        add(tools, token, AiAccessTokenService.INVENTORY_READ,
            () -> authorizationService.canReadProductCatalog(user),
            "search_products", "get_product_detail");
        add(tools, token, AiAccessTokenService.INVENTORY_READ,
            () -> authorizationService.canReadInventory(user),
            "get_inventory_summary");
        add(tools, token, AiAccessTokenService.EXPENSES_READ,
            () -> authorizationService.canReadExpenses(user),
            "get_expense_summary", "list_expenses", "get_expense_detail");
        add(tools, token, AiAccessTokenService.PETTY_CASH_READ,
            () -> authorizationService.canReadPettyCash(user),
            "get_funds_status");
        add(tools, token, AiAccessTokenService.RECEIVABLES_READ,
            () -> authorizationService.canReadReceivables(user),
            "get_receivables_status");
        add(tools, token, AiAccessTokenService.BUSINESS_CONTEXT_READ,
            () -> authorizationService.canReadOrganizationStructure(user),
            "get_my_business_context", "list_units_and_businesses");
        add(tools, token, AiAccessTokenService.FINANCE_REFERENCES_READ,
            () -> authorizationService.canReadPaymentAccounts(user),
            "list_payment_accounts");
        add(tools, token, AiAccessTokenService.PETTY_CASH_READ,
            () -> authorizationService.canReadPettyCash(user),
            "list_funds");

        add(tools, token, AiAccessTokenService.TASKS_CREATE,
            () -> authorizationService.canCreateTask(user),
            "preview_create_task", "create_task");
        add(tools, token, AiAccessTokenService.TASKS_DELEGATE,
            () -> authorizationService.canCreateTask(user), "search_task_assignees");
        add(tools, token, AiAccessTokenService.TASKS_UPDATE,
            () -> authorizationService.canCreateTask(user), "preview_update_task", "update_task");
        for (var action : com.indice.erp.processTasks.tasks.ProcessTaskOperation.ACTIONS) {
            add(tools, token, com.indice.erp.ai.task.AiTaskDraftService.operationScope(action),
                () -> authorizationService.canCreateTask(user)
                    && (!"share_task".equals(action) || token.scopes().contains(AiAccessTokenService.TASKS_DELEGATE)),
                "preview_" + action, action);
        }
        add(tools, token, AiAccessTokenService.CUSTOMERS_READ,
            () -> authorizationService.canReadCustomers(user), "search_customers");
        add(tools, token, AiAccessTokenService.PROVIDERS_READ,
            () -> authorizationService.canReadProviders(user), "search_providers");
        add(tools, token, AiAccessTokenService.WAREHOUSES_READ,
            () -> authorizationService.canReadWarehouses(user), "list_warehouses");
        add(tools, token, AiAccessTokenService.BUDGET_LINES_READ,
            () -> authorizationService.canReadBudgetLines(user), "search_budget_lines");
        add(tools, token, AiAccessTokenService.ACCOUNTING_ACCOUNTS_READ,
            () -> authorizationService.canReadAccountingAccounts(user), "search_accounting_accounts");
        add(tools, token, AiAccessTokenService.EXPENSES_CREATE,
            () -> authorizationService.canCreateExpenseDraft(user),
            "preview_create_expense_draft", "create_expense_draft");
        add(tools, token, AiAccessTokenService.PETTY_CASH_EXPENSE_CREATE,
            () -> authorizationService.canRegisterFundExpense(user),
            "preview_register_fund_expense", "register_fund_expense");
        add(tools, token, AiAccessTokenService.PETTY_CASH_DEPOSIT_CREATE,
            () -> authorizationService.canAddMoneyToFund(user),
            "preview_add_money_to_fund", "add_money_to_fund");

        for (String tool : com.indice.erp.ai.commercial.AiCommercialAccess.READS) {
            add(tools, token, com.indice.erp.ai.commercial.AiCommercialAccess.scope(tool),
                () -> authorizationService.canUseCommercialTool(user, tool), tool);
        }
        for (String tool : com.indice.erp.ai.commercial.AiCommercialAccess.ACTIONS) {
            add(tools, token, com.indice.erp.ai.commercial.AiCommercialAccess.scope(tool),
                () -> authorizationService.canUseCommercialTool(user, tool), "preview_" + tool, tool);
        }
        for(var tool:com.indice.erp.sales.InventoryAssistantService.READS)
            add(tools,token,com.indice.erp.ai.inventory.AiInventoryAccess.scope(tool),()->authorizationService.canUseInventoryTool(user,tool),tool);
        for(var action:com.indice.erp.sales.InventoryAssistantService.ACTIONS)
            add(tools,token,com.indice.erp.ai.inventory.AiInventoryAccess.scope(action),()->authorizationService.canUseInventoryTool(user,action),"preview_"+action,action);
        var fileAccess=new com.indice.erp.ai.files.AiFileAccess(hrTools,authorizationService);
        var salesWorkflowAccess=new com.indice.erp.ai.salesworkflow.AiSalesWorkflowAccess(authorizationService);
        var posAccess=new com.indice.erp.ai.pos.AiPosAccess(authorizationService);
        for(var tool:com.indice.erp.pos.assistant.PosAssistantService.READS)
            add(tools,token,com.indice.erp.ai.pos.AiPosAccess.scope(tool),()->posAccess.allowed(token,tool),tool);
        for(var action:com.indice.erp.pos.assistant.PosAssistantService.ACTIONS)
            add(tools,token,com.indice.erp.ai.pos.AiPosAccess.scope(action),()->posAccess.allowed(token,action),"preview_"+action,action);
        for(var tool:com.indice.erp.sales.SalesWorkflowService.READS)
            add(tools,token,com.indice.erp.ai.salesworkflow.AiSalesWorkflowAccess.scope(tool),()->salesWorkflowAccess.allowed(token,tool),tool);
        for(var action:com.indice.erp.sales.SalesWorkflowService.ACTIONS)
            add(tools,token,com.indice.erp.ai.salesworkflow.AiSalesWorkflowAccess.scope(action),()->salesWorkflowAccess.allowed(token,action),"preview_"+action,action);
        add(tools,token,AiAccessTokenService.FILES_ATTACH,()->fileAccess.any(token,true),"stage_operational_file","stage_chatgpt_file");
        add(tools,token,AiAccessTokenService.FILES_READ,()->fileAccess.any(token,false),"list_operational_files","get_operational_file");
        add(tools,token,AiAccessTokenService.FILES_READ,()->fileAccess.exportAllowed(token),"export_hr_payroll");
        add(tools,token,AiAccessTokenService.FILES_READ,()->java.util.Arrays.stream(com.indice.erp.ai.files.AiCommerceReportContracts.Report.values()).anyMatch(r->com.indice.erp.ai.files.AiCommerceReportService.allowed(token,r,authorizationService)),"export_commerce_report");
        for(var entry:com.indice.erp.ai.files.AiFileAccess.ACTIONS.entrySet())
            add(tools,token,AiAccessTokenService.FILES_ATTACH,()->fileAccess.allowed(token,entry.getValue(),true),"preview_"+entry.getKey(),entry.getKey());
        for(var spec:com.indice.erp.finance.assistant.FinanceAssistantTools.ALL.values()) {
            if(spec.write())add(tools,token,spec.scope(),()->authorizationService.canUseFinanceWorkflowTool(user,spec.name())
                &&(!spec.name().equals("update_finance_expense_due_status")||token.scopes().contains("expenses.approve"))
                &&(!spec.operation().equals("remove_attachment")||token.scopes().contains("files.attach")),"preview_"+spec.name(),spec.name());
            else add(tools,token,spec.scope(),()->authorizationService.canUseFinanceWorkflowTool(user,spec.name()),spec.name());
        }
        add(tools,token,AiAccessTokenService.FILES_READ,()->java.util.Arrays.stream(com.indice.erp.ai.financeworkflow.AiFinanceReportService.Report.values()).anyMatch(r->com.indice.erp.ai.financeworkflow.AiFinanceReportService.allowed(token,r,authorizationService)),"export_finance_report");
        return List.copyOf(tools);
    }

    private boolean canReadLearning(AuthSessionUser user) {
        for(var entry:java.util.Map.of("config_center",List.of("profile","business-structure","business-profile","consulting","integrations","users"),
            "expenses",List.of("accounting","providers","payment_accounts","budgets","expenses","kpis"),
            "petty_cash",List.of("cash","control","statements","kpis"),
            "receivables",List.of("credit-customers","credit-sales","accounts-receivable","payments","kpis"),
            "kpis",List.of("kpis","accounting-reports","automated-reports")).entrySet())
            for(var tab:entry.getValue())if(authorizationService.canReadGuideTab(user,entry.getKey(),tab))return true;
        for(var entry:java.util.Map.of("inventory",List.of("products","warehouses","inventory","providers","purchase-orders","discounts"),
                "crm",List.of("contacts","leads","quotes","sales","kpis","commissions","payment-accounts","contracts"),
                "pos",List.of("sale","cajas","kiosks","clientes","cortes","kpis")).entrySet())
            for(var tab:entry.getValue())if(authorizationService.canReadGuideTab(user,entry.getKey(),tab))return true;
        for(var tab:List.of("calendar","projects","processes","kpis"))
            if(authorizationService.canReadGuideTab(user,"processes",tab))return true;
        for (var tab : HrTab.values()) {
            if (authorizationService.canReadGuideTab(user, "human_resources", tab.name().toLowerCase(java.util.Locale.ROOT))
                    && hrAccessService.canAccessReadableTab(user, tab)) return true;
        }
        return false;
    }

    private void add(
        TreeSet<String> tools,
        AiAccessTokenRepository.StoredToken token,
        String requiredScope,
        BooleanSupplier currentPermission,
        String... toolNames
    ) {
        if (!token.scopes().contains(requiredScope) || !currentPermission.getAsBoolean()) {
            return;
        }
        tools.addAll(List.of(toolNames));
    }
}
