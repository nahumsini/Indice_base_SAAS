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
        var tools = new TreeSet<String>();
        var user = token.user();

        add(tools, token, AiAccessTokenService.SALES_TODAY_READ,
            () -> authorizationService.canReadSalesToday(user),
            "get_sales_today");
        add(tools, token, AiAccessTokenService.BUSINESS_SNAPSHOT_READ,
            () -> authorizationService.canReadBusinessSnapshot(user),
            "get_business_snapshot", "get_attention_items");
        add(tools, token, AiAccessTokenService.HR_PEOPLE_READ,
            () -> hrAccessService.canAccessReadableTab(user, HrTab.COLLABORATORS),
            "search_employees", "get_employee_overview");
        add(tools, token, AiAccessTokenService.HR_ATTENDANCE_READ,
            () -> hrAccessService.canAccessReadableTab(user, HrTab.ATTENDANCE),
            "get_attendance_exceptions");
        add(tools, token, AiAccessTokenService.TASKS_READ,
            () -> authorizationService.canReadTasks(user),
            "list_tasks", "get_task_detail");
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
        add(tools, token, AiAccessTokenService.EXPENSES_CREATE,
            () -> authorizationService.canCreateExpenseDraft(user),
            "preview_create_expense_draft", "create_expense_draft");
        add(tools, token, AiAccessTokenService.PETTY_CASH_EXPENSE_CREATE,
            () -> authorizationService.canRegisterFundExpense(user),
            "preview_register_fund_expense", "register_fund_expense");
        add(tools, token, AiAccessTokenService.PETTY_CASH_DEPOSIT_CREATE,
            () -> authorizationService.canAddMoneyToFund(user),
            "preview_add_money_to_fund", "add_money_to_fund");

        return List.copyOf(tools);
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
