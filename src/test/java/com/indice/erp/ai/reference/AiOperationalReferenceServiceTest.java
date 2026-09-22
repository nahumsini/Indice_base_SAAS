package com.indice.erp.ai.reference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.accountingaccounts.AccountingAccountService;
import com.indice.erp.finance.accountingaccounts.AccountingAccountGroup;
import com.indice.erp.finance.accountingaccounts.AccountingAccountStatus;
import com.indice.erp.finance.accountingaccounts.dto.AccountingAccountListResponse;
import com.indice.erp.finance.accountingaccounts.dto.AccountingAccountResponse;
import com.indice.erp.finance.budgetlines.BudgetLineService;
import com.indice.erp.finance.budgetlines.dto.BudgetLineListResponse;
import com.indice.erp.finance.budgetlines.dto.BudgetLineResponse;
import com.indice.erp.finance.providers.ProviderService;
import com.indice.erp.finance.providers.ProviderStatus;
import com.indice.erp.finance.providers.dto.ProviderListResponse;
import com.indice.erp.finance.providers.dto.ProviderResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.BudgetHealthStatus;
import com.indice.erp.finance.status.BudgetStatus;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.sales.SalesReferenceReadService;
import java.time.Clock;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiOperationalReferenceServiceTest {
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Reader", "manager");
    @Mock AiToolAuthorizationService authorization;
    @Mock HrOperationalScopeService scopes;
    @Mock SalesReferenceReadService sales;
    @Mock FinanceAccessService finance;
    @Mock ProviderService providers;
    @Mock BudgetLineService budgets;
    @Mock AccountingAccountService accounts;
    AiOperationalReferenceService service;

    @BeforeEach
    void setUp() {
        service = new AiOperationalReferenceService(authorization, scopes, sales, finance, providers, budgets, accounts, Clock.systemUTC());
    }

    @Test
    void allFiveQueriesFailBeforeDataAccessWhenCurrentPermissionWasRevoked() {
        assertThrows(SecurityException.class, () -> service.customers(USER, null));
        assertThrows(SecurityException.class, () -> service.providers(USER, null));
        assertThrows(SecurityException.class, () -> service.warehouses(USER, null));
        assertThrows(SecurityException.class, () -> service.budgetLines(USER, null));
        assertThrows(SecurityException.class, () -> service.accountingAccounts(USER, null));
        verifyNoInteractions(scopes, sales, finance, providers, budgets, accounts);
    }

    @Test
    void customersAndWarehousesUseTokenTenantAndServerScopeWithCompleteTotals() {
        when(authorization.canReadCustomers(USER)).thenReturn(true);
        when(authorization.canReadWarehouses(USER)).thenReturn(true);
        var scope = HrOperationalScope.businessOffice(10L, 101L);
        when(scopes.resolve(USER)).thenReturn(scope);
        var customer = new SalesReferenceReadService.Customer(7L, "CON7", "Shop", "active", 10L, 101L);
        when(sales.customers(23L, scope, "shop", 0, 1)).thenReturn(new SalesReferenceReadService.Page<>(List.of(customer), 2));
        when(sales.customers(23L, scope, "shop", 1, 1)).thenReturn(new SalesReferenceReadService.Page<>(List.of(customer), 2));
        when(sales.warehouses(23L, scope, "", 0, 25)).thenReturn(new SalesReferenceReadService.Page<>(List.of(), 0));
        var first = service.customers(USER, new PageRequest(" Shop ", 1, null));
        var second = service.customers(USER, new PageRequest("Shop", 1, first.nextCursor()));
        assertEquals(2, first.totalCount());
        assertEquals(1, first.returnedCount());
        assertTrue(first.hasMore());
        assertFalse(second.hasMore());
        assertEquals("BUSINESS_OFFICE", first.scopeType());
        assertTrue(service.warehouses(USER, null).items().isEmpty());
        verify(sales).warehouses(23L, scope, "", 0, 25);
    }

    @Test
    void providerBridgePreservesTenantScopeAndReturnsOnlyWhitelistedBusinessFields() {
        when(authorization.canReadProviders(USER)).thenReturn(true);
        when(scopes.resolve(USER)).thenReturn(HrOperationalScope.businessOffice(10L, 101L));
        when(providers.list(any())).thenReturn(new ProviderListResponse(List.of(
            provider(2L, "Beta"), provider(1L, "Alpha")), 2));
        var first = service.providers(USER, new PageRequest(null, 1, null));
        var second = service.providers(USER, new PageRequest(null, 1, first.nextCursor()));
        assertEquals(1L, first.items().getFirst().id());
        assertEquals(2L, second.items().getFirst().id());
        assertEquals(2, first.totalCount());
        assertFalse(second.hasMore());
        var context = ArgumentCaptor.forClass(FinanceContext.class);
        verify(providers, times(2)).list(context.capture());
        assertEquals(23L, context.getValue().companyId());
        assertEquals(101L, context.getValue().scope().businessId());
        var json = new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(first.items().getFirst());
        assertFalse(json.has("taxId"));
        assertFalse(json.has("metadata"));
        assertFalse(json.has("email"));
        verifyNoInteractions(finance);
    }

    @Test
    void unassignedProviderScopeAndMissingFinanceContextFailClosed() {
        when(authorization.canReadProviders(USER)).thenReturn(true);
        when(authorization.canReadBudgetLines(USER)).thenReturn(true);
        when(authorization.canReadAccountingAccounts(USER)).thenReturn(true);
        when(scopes.resolve(USER)).thenReturn(HrOperationalScope.unassigned());
        when(finance.resolveContext(USER)).thenReturn(Optional.empty());
        assertThrows(SecurityException.class, () -> service.providers(USER, null));
        assertThrows(SecurityException.class, () -> service.budgetLines(USER, null));
        assertThrows(SecurityException.class, () -> service.accountingAccounts(USER, null));
        verifyNoInteractions(providers, budgets, accounts);
    }

    @Test
    void budgetReferencesPreserveOwnerAmountsCurrencyAndScopedFilteredTotals() {
        when(authorization.canReadBudgetLines(USER)).thenReturn(true);
        var context = new FinanceContext(3L, 23L, "Reader", "manager", true, FinanceScope.unitHeadquarters(10L));
        when(finance.resolveContext(USER)).thenReturn(Optional.of(context));
        when(budgets.list(context)).thenReturn(new BudgetLineListResponse(List.of(
            budgetLine(2L, "Rent east"), budgetLine(3L, "Travel"), budgetLine(1L, "Rent west")), 3));
        var first = service.budgetLines(USER, new PageRequest(" RENT ", 1, null));
        assertEquals(2, first.totalCount());
        assertEquals(1, first.returnedCount());
        assertEquals(1L, first.items().getFirst().id());
        assertEquals("MXN", first.items().getFirst().currencyCode());
        assertEquals(new BigDecimal("666.99"), first.items().getFirst().availableAmount());
        assertEquals(new BigDecimal("1000.25"), first.items().getFirst().plannedAmount());
        assertEquals("UNIT_HEADQUARTERS", first.scopeType());
        var second = service.budgetLines(USER, new PageRequest("rent", 1, first.nextCursor()));
        assertEquals(2L, second.items().getFirst().id());
        assertFalse(second.hasMore());
        assertNull(second.nextCursor());
        assertEquals(0, service.budgetLines(USER, new PageRequest("private", 1, null)).totalCount());
        verifyNoInteractions(scopes, sales, accounts);
    }

    @Test
    void accountingReferencesUseFinanceScopeAndSearchOnlyVisibleFields() {
        when(authorization.canReadAccountingAccounts(USER)).thenReturn(true);
        var context = new FinanceContext(3L, 23L, "Reader", "manager", true, FinanceScope.businessOffice(10L, 101L));
        when(finance.resolveContext(USER)).thenReturn(Optional.of(context));
        when(accounts.list(context)).thenReturn(new AccountingAccountListResponse(List.of(
            new AccountingAccountResponse(7L, 23L, 10L, 101L, "6100", "Tools", AccountingAccountGroup.SOFTWARE,
                "private notes", AccountingAccountStatus.ACTIVE, 3L, null, null, null, null, 0L, null, null)), 1));
        var result = service.accountingAccounts(USER, new PageRequest(" software ", null, null));
        assertEquals(1, result.totalCount());
        assertEquals("6100", result.items().getFirst().code());
        assertEquals("BUSINESS_OFFICE", result.scopeType());
        assertEquals(0, service.accountingAccounts(USER, new PageRequest("private", null, null)).totalCount());
        var json = new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(result.items().getFirst());
        assertFalse(json.has("description"));
        assertFalse(json.has("customFields"));
        assertFalse(json.has("metadata"));
        verifyNoInteractions(scopes, sales, budgets);
    }

    @Test
    void malformedAndOverflowingPaginationFailsBeforeOwnerAccess() {
        when(authorization.canReadCustomers(USER)).thenReturn(true);
        for (var request : List.of(new PageRequest(null, 51, null), new PageRequest(null, 0, null),
                new PageRequest("x".repeat(121), null, null), new PageRequest(null, 1, "not-a-cursor"),
                new PageRequest(null, 1, "djE6MjE0NzQ4MzY0Nw"))) {
            assertThrows(IllegalArgumentException.class, () -> service.customers(USER, request));
        }
        verifyNoInteractions(sales);
    }

    private ProviderResponse provider(long id, String name) {
        return new ProviderResponse(id, 23L, 10L, 101L, name, name + " LLC", "private-tax-id", "private@email.test",
            "private-phone", "private-contact", 30, ProviderStatus.ACTIVE, "private notes", 3L, null,
            null, null, null, 0L, null, null);
    }

    private BudgetLineResponse budgetLine(long id, String name) {
        return new BudgetLineResponse(id, 23L, 10L, 101L, 8L, name, "OPERATIONS",
            new BigDecimal("1000.25"), new BigDecimal("125.10"), new BigDecimal("75.15"),
            new BigDecimal("200.00"), new BigDecimal("66.99"), new BigDecimal("666.99"),
            BudgetHealthStatus.ON_TRACK, "MXN", BudgetStatus.ACTIVE, "private notes", 0,
            3L, null, null, null, null, 0L, null, null);
    }
}
