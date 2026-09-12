package com.indice.erp.ai.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessService;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiToolCapabilityServiceTest {

    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Reader", "user");

    @Mock private AiToolAuthorizationService authorizationService;
    @Mock private HrAccessService hrAccessService;

    private AiToolCapabilityService service;

    @BeforeEach
    void setUp() {
        service = new AiToolCapabilityService(authorizationService, hrAccessService);
    }

    @Test
    void exposesOnlyToolsAllowedByBothOAuthScopeAndCurrentIndicePermission() {
        var token = token(Set.of(
            AiAccessTokenService.SALES_TODAY_READ,
            AiAccessTokenService.TASKS_READ,
            AiAccessTokenService.TASKS_CREATE,
            AiAccessTokenService.EXPENSES_CREATE
        ));
        when(authorizationService.canReadSalesToday(USER)).thenReturn(true);
        when(authorizationService.canReadTasks(USER)).thenReturn(true);
        when(authorizationService.canCreateTask(USER)).thenReturn(false);
        when(authorizationService.canCreateExpenseDraft(USER)).thenReturn(true);

        assertEquals(Set.of(
            "get_sales_today",
            "list_tasks",
            "get_task_detail",
            "preview_create_expense_draft",
            "create_expense_draft"
        ), Set.copyOf(service.allowedTools(token)));
    }

    @Test
    void neverEvaluatesBusinessPermissionsForScopesTheConnectionDoesNotHave() {
        var token = token(Set.of(AiAccessTokenService.OPENID, AiAccessTokenService.EMAIL));

        assertEquals(Set.of(), Set.copyOf(service.allowedTools(token)));
        verifyNoInteractions(authorizationService, hrAccessService);
    }

    @Test
    void completeAuthorizedCatalogContainsAllThirtyTwoTools() {
        var token = token(Set.of(
            AiAccessTokenService.SALES_TODAY_READ,
            AiAccessTokenService.BUSINESS_SNAPSHOT_READ,
            AiAccessTokenService.HR_PEOPLE_READ,
            AiAccessTokenService.HR_ATTENDANCE_READ,
            AiAccessTokenService.TASKS_READ,
            AiAccessTokenService.SALES_READ,
            AiAccessTokenService.POS_READ,
            AiAccessTokenService.INVENTORY_READ,
            AiAccessTokenService.EXPENSES_READ,
            AiAccessTokenService.PETTY_CASH_READ,
            AiAccessTokenService.RECEIVABLES_READ,
            AiAccessTokenService.BUSINESS_CONTEXT_READ,
            AiAccessTokenService.FINANCE_REFERENCES_READ,
            AiAccessTokenService.TASKS_CREATE,
            AiAccessTokenService.EXPENSES_CREATE,
            AiAccessTokenService.PETTY_CASH_EXPENSE_CREATE,
            AiAccessTokenService.PETTY_CASH_DEPOSIT_CREATE
        ));
        when(authorizationService.canReadSalesToday(USER)).thenReturn(true);
        when(authorizationService.canReadBusinessSnapshot(USER)).thenReturn(true);
        when(hrAccessService.canAccessReadableTab(eq(USER), any())).thenReturn(true);
        when(authorizationService.canReadTasks(USER)).thenReturn(true);
        when(authorizationService.canReadCommercialSales(USER)).thenReturn(true);
        when(authorizationService.canReadPosCash(USER)).thenReturn(true);
        when(authorizationService.canReadProductCatalog(USER)).thenReturn(true);
        when(authorizationService.canReadInventory(USER)).thenReturn(true);
        when(authorizationService.canReadExpenses(USER)).thenReturn(true);
        when(authorizationService.canReadPettyCash(USER)).thenReturn(true);
        when(authorizationService.canReadReceivables(USER)).thenReturn(true);
        when(authorizationService.canReadOrganizationStructure(USER)).thenReturn(true);
        when(authorizationService.canReadPaymentAccounts(USER)).thenReturn(true);
        when(authorizationService.canCreateTask(USER)).thenReturn(true);
        when(authorizationService.canCreateExpenseDraft(USER)).thenReturn(true);
        when(authorizationService.canRegisterFundExpense(USER)).thenReturn(true);
        when(authorizationService.canAddMoneyToFund(USER)).thenReturn(true);

        assertEquals(Set.of(
            "get_sales_today",
            "get_business_snapshot",
            "get_attention_items",
            "search_employees",
            "get_employee_overview",
            "get_attendance_exceptions",
            "list_tasks",
            "get_task_detail",
            "get_sales_summary",
            "list_sales",
            "get_sale_detail",
            "get_cash_status",
            "search_products",
            "get_product_detail",
            "get_inventory_summary",
            "get_expense_summary",
            "list_expenses",
            "get_expense_detail",
            "get_funds_status",
            "get_receivables_status",
            "get_my_business_context",
            "list_units_and_businesses",
            "list_payment_accounts",
            "list_funds",
            "preview_create_task",
            "create_task",
            "preview_create_expense_draft",
            "create_expense_draft",
            "preview_register_fund_expense",
            "register_fund_expense",
            "preview_add_money_to_fund",
            "add_money_to_fund"
        ), Set.copyOf(service.allowedTools(token)));
    }

    private AiAccessTokenRepository.StoredToken token(Set<String> scopes) {
        return new AiAccessTokenRepository.StoredToken(91L, USER, scopes);
    }
}
