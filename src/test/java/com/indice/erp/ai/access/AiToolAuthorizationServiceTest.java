package com.indice.erp.ai.access;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import com.indice.erp.billing.subscription.CompanySubscriptionStatus;
import com.indice.erp.billing.subscription.CompanySubscriptionStatusProvider;
import com.indice.erp.entitlement.CompanyEntitlementResolution;
import com.indice.erp.entitlement.CompanyEntitlementService;
import com.indice.erp.entitlement.EntitlementPolicyMode;
import com.indice.erp.processTasks.ProcessTasksAccessService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiToolAuthorizationServiceTest {

    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Reader", "user");

    @Mock private CompanySubscriptionStatusProvider subscriptionStatusProvider;
    @Mock private CompanyModuleEntitlementService moduleEntitlementService;
    @Mock private ModuleAccessService moduleAccessService;
    @Mock private TabPermissionAccessService tabPermissionAccessService;
    @Mock private CompanyEntitlementService companyEntitlementService;
    @Mock private ProcessTasksAccessService processTasksAccessService;

    private AiToolAuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new AiToolAuthorizationService(
            subscriptionStatusProvider,
            moduleEntitlementService,
            moduleAccessService,
            tabPermissionAccessService,
            companyEntitlementService,
            processTasksAccessService
        );
    }

    @Test
    void commercialActionsRequireTheOwningTabAndLiveEntitlement() {
        allowLegacyAccess();
        for (String tool : com.indice.erp.ai.commercial.AiCommercialAccess.ACTIONS) {
            assertTrue(service.canUseCommercialTool(USER, tool));
            String tab = tool.endsWith("customer") ? "crm.contacts" : tool.endsWith("opportunity") ? "crm.leads" : "crm.quotes";
            verify(tabPermissionAccessService, org.mockito.Mockito.atLeastOnce()).canAccess(USER, TabPermissionRequirement.one(tab));
        }
        when(tabPermissionAccessService.canAccess(eq(USER), any())).thenReturn(false);
        for (String tool : com.indice.erp.ai.commercial.AiCommercialAccess.ACTIONS) assertFalse(service.canUseCommercialTool(USER, tool));
    }

    @Test
    void allowsOnlyWhenCurrentIndiceAccessStillAllowsSalesKpis() {
        allowLegacyAccess();

        assertTrue(service.canReadSalesToday(USER));
    }

    @Test
    void revokingTabPermissionImmediatelyBlocksExistingToken() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "crm")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "crm")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(eq(USER), any())).thenReturn(false);

        assertFalse(service.canReadSalesToday(USER));
    }

    @Test
    void enforcedCommercialEntitlementBlocksUnlicensedCompany() {
        allowLegacyAccess();
        when(companyEntitlementService.resolve(23L, "sales")).thenReturn(
            new CompanyEntitlementResolution(23L, "sales", false, EntitlementPolicyMode.ENFORCE, List.of())
        );

        assertFalse(service.canReadSalesToday(USER));
    }

    @Test
    void allowsBusinessSnapshotOnlyWithCurrentExecutiveKpiAccess() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "kpis")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "kpis")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(eq(USER), any())).thenReturn(true);

        assertTrue(service.canReadBusinessSnapshot(USER));
    }

    @Test
    void revokingExecutiveKpiPermissionImmediatelyBlocksBusinessSnapshot() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "kpis")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "kpis")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(eq(USER), any())).thenReturn(false);

        assertFalse(service.canReadBusinessSnapshot(USER));
    }

    @Test
    void allowsTaskCreationOnlyWithCurrentProcessesAccess() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "processes")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "processes")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(
            USER,
            TabPermissionRequirement.any("processes.calendar", "processes.projects", "processes.processes")
        )).thenReturn(true);
        when(processTasksAccessService.canAccess(USER)).thenReturn(true);

        assertTrue(service.canCreateTask(USER));
    }

    @Test
    void revokingProcessesAccessImmediatelyBlocksTaskCreation() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "processes")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "processes")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(
            USER,
            TabPermissionRequirement.any("processes.calendar", "processes.projects", "processes.processes")
        )).thenReturn(true);
        when(processTasksAccessService.canAccess(USER)).thenReturn(false);

        assertFalse(service.canCreateTask(USER));
    }

    @Test
    void kpiOnlyProcessPermissionAllowsReadButNotTaskCreation() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "processes")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "processes")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(
            USER,
            TabPermissionRequirement.any(
                "processes.calendar", "processes.projects", "processes.processes", "processes.kpis"
            )
        )).thenReturn(true);
        when(processTasksAccessService.canAccess(USER)).thenReturn(true);

        assertTrue(service.canReadTasks(USER));
        assertFalse(service.canCreateTask(USER));
    }

    @Test
    void commercialSalesRequireTheSalesTabInAdditionToTheOAuthScope() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "crm")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "crm")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(USER, TabPermissionRequirement.one("crm.sales")))
            .thenReturn(false);

        assertFalse(service.canReadCommercialSales(USER));
    }

    @Test
    void inventoryRequiresItsOwnModuleAndInventoryTab() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "inventory")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "inventory")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(USER, TabPermissionRequirement.one("inventory.inventory")))
            .thenReturn(true);
        when(companyEntitlementService.resolve(23L, "inventory")).thenReturn(
            new CompanyEntitlementResolution(23L, "inventory", true, EntitlementPolicyMode.ENFORCE, List.of())
        );

        assertTrue(service.canReadInventory(USER));
        assertFalse(service.canReadCommercialSales(USER));
    }

    @Test
    void expenseAccessDoesNotGrantPettyCashAccess() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "expenses")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "expenses")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(
            USER,
            TabPermissionRequirement.any("expenses.expenses", "expenses.kpis")
        )).thenReturn(true);
        when(companyEntitlementService.resolve(23L, "expenses")).thenReturn(
            new CompanyEntitlementResolution(23L, "expenses", true, EntitlementPolicyMode.ENFORCE, List.of())
        );

        assertTrue(service.canReadExpenses(USER));
        assertFalse(service.canReadPettyCash(USER));
    }

    @Test
    void pettyCashReadPermissionDoesNotGrantMoneyMovements() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "petty_cash")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "petty_cash")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(
            USER,
            TabPermissionRequirement.any(
                "petty_cash.cash", "petty_cash.control", "petty_cash.statements", "petty_cash.kpis"
            )
        )).thenReturn(true);
        when(companyEntitlementService.resolve(23L, "petty_cash")).thenReturn(
            new CompanyEntitlementResolution(23L, "petty_cash", true, EntitlementPolicyMode.ENFORCE, List.of())
        );

        assertTrue(service.canReadPettyCash(USER));
        assertFalse(service.canRegisterFundExpense(USER));
        assertFalse(service.canAddMoneyToFund(USER));
    }

    @Test
    void organizationResolversRequireTheBusinessStructureTab() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "config_center")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "config_center")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(
            USER,
            TabPermissionRequirement.one("config_center.business-structure")
        )).thenReturn(true);

        assertTrue(service.canReadOrganizationStructure(USER));
    }

    @Test
    void paymentAccountResolverAcceptsTheExactExpensesAccountTab() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "expenses")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "expenses")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(
            USER,
            TabPermissionRequirement.one("expenses.payment-accounts")
        )).thenReturn(true);
        when(companyEntitlementService.resolve(23L, "expenses")).thenReturn(
            new CompanyEntitlementResolution(23L, "expenses", true, EntitlementPolicyMode.ENFORCE, List.of())
        );

        assertTrue(service.canReadPaymentAccounts(USER));
    }

    @Test
    void reusesChecksOnlyWithinOneCapabilityEvaluationAndRechecksTheNextRequest() {
        allowLegacyAccess();
        service.withCapabilityEvaluation(() -> {
            assertTrue(service.canReadSalesToday(USER));
            assertTrue(service.canReadSalesToday(USER));
            assertTrue(service.canReadCommercialSales(USER));
            return null;
        });
        verify(subscriptionStatusProvider).currentStatus(23L);
        verify(moduleEntitlementService).hasActiveEntitlement(23L, "crm");
        verify(moduleAccessService).canAccess(USER, "crm");
        verify(companyEntitlementService).resolve(23L, "sales");
        verify(tabPermissionAccessService).canAccess(USER, TabPermissionRequirement.one("crm.kpis"));
        verify(tabPermissionAccessService).canAccess(USER, TabPermissionRequirement.one("crm.sales"));

        when(tabPermissionAccessService.canAccess(eq(USER), any())).thenReturn(false);
        assertFalse(service.withCapabilityEvaluation(() -> service.canReadSalesToday(USER)));
        // Calls outside discovery must also consult live authorization, never a leftover memo.
        assertFalse(service.canReadSalesToday(USER));
        verify(subscriptionStatusProvider, times(3)).currentStatus(23L);
        verify(moduleAccessService, times(3)).canAccess(USER, "crm");
    }

    @Test
    void evaluationDoesNotSharePermissionsAcrossMembersOrCompanies() {
        allowLegacyAccess();
        var otherMember = new AuthSessionUser(4L, 23L, 42L, "Other", "user");
        var otherCompany = new AuthSessionUser(3L, 24L, 41L, "Reader", "user");
        when(subscriptionStatusProvider.currentStatus(24L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        service.withCapabilityEvaluation(() -> {
            assertTrue(service.canReadSalesToday(USER));
            assertFalse(service.canReadSalesToday(otherMember));
            assertFalse(service.canReadSalesToday(otherCompany));
            assertTrue(service.canReadSalesToday(USER));
            return null;
        });
        verify(moduleAccessService).canAccess(otherMember, "crm");
        verify(moduleEntitlementService).hasActiveEntitlement(24L, "crm");
        verify(companyEntitlementService).resolve(23L, "sales");
    }

    @Test
    void exceptionalEvaluationAlwaysClearsTheMemoOnReusedThreads() {
        allowLegacyAccess();
        assertThrows(IllegalStateException.class, () -> service.withCapabilityEvaluation(() -> {
            assertTrue(service.canReadSalesToday(USER));
            throw new IllegalStateException("synthetic failure");
        }));
        when(moduleAccessService.canAccess(USER, "crm")).thenReturn(false);
        assertFalse(service.canReadSalesToday(USER));
        assertFalse(service.withCapabilityEvaluation(() -> service.canReadSalesToday(USER)));
        verify(moduleAccessService, times(3)).canAccess(USER, "crm");
    }

    @Test
    void concurrentEvaluationsNeverShareTheSameAuthorizationMemo() throws Exception {
        allowLegacyAccess();
        var barrier = new java.util.concurrent.CyclicBarrier(2);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var operation = (java.util.concurrent.Callable<Boolean>) () -> service.withCapabilityEvaluation(() -> {
                boolean first = service.canReadSalesToday(USER);
                try { barrier.await(5, java.util.concurrent.TimeUnit.SECONDS); }
                catch (Exception error) { throw new IllegalStateException(error); }
                return first && service.canReadSalesToday(USER);
            });
            var first = executor.submit(operation);
            var second = executor.submit(operation);
            assertTrue(first.get(10, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(second.get(10, java.util.concurrent.TimeUnit.SECONDS));
        }
        verify(subscriptionStatusProvider, times(2)).currentStatus(23L);
        verify(companyEntitlementService, times(2)).resolve(23L, "sales");
    }

    private void allowLegacyAccess() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "crm")).thenReturn(true);
        when(moduleAccessService.canAccess(USER, "crm")).thenReturn(true);
        when(tabPermissionAccessService.canAccess(eq(USER), any())).thenReturn(true);
        when(companyEntitlementService.resolve(23L, "sales")).thenReturn(
            new CompanyEntitlementResolution(23L, "sales", false, EntitlementPolicyMode.LEGACY, List.of())
        );
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
        "customers,crm,sales,crm.contacts",
        "customers,pos,pos,pos.clientes",
        "providers,expenses,expenses,expenses.providers",
        "providers,inventory,inventory,inventory.providers",
        "warehouses,inventory,inventory,inventory.inventory",
        "warehouses,crm,sales,crm.sales",
        "budgets,expenses,expenses,expenses.budgets",
        "accounts,expenses,expenses,expenses.accounting"
    })
    void operationalReferencesRequireCurrentModuleExactTabAndEntitlement(String tool, String module, String capability, String tab) {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(eq(23L), anyString()))
            .thenAnswer(invocation -> module.equals(invocation.getArgument(1)));
        when(moduleAccessService.canAccess(USER, module)).thenReturn(true);
        var requirement = switch (tool) {
            case "customers" -> module.equals("crm") ? TabPermissionRequirement.any(
                "crm.leads", "crm.contacts", "crm.quotes", "crm.sales", "crm.contracts") : TabPermissionRequirement.one(tab);
            case "budgets" -> TabPermissionRequirement.any("expenses.budgets", "expenses.kpis");
            default -> TabPermissionRequirement.one(tab);
        };
        java.util.function.BooleanSupplier check = switch (tool) {
            case "customers" -> () -> service.canReadCustomers(USER);
            case "providers" -> () -> service.canReadProviders(USER);
            case "warehouses" -> () -> service.canReadWarehouses(USER);
            case "budgets" -> () -> service.canReadBudgetLines(USER);
            default -> () -> service.canReadAccountingAccounts(USER);
        };
        assertFalse(check.getAsBoolean());
        when(tabPermissionAccessService.canAccess(USER, requirement)).thenReturn(true);
        when(companyEntitlementService.resolve(23L, capability)).thenReturn(
            new CompanyEntitlementResolution(23L, capability, true, EntitlementPolicyMode.ENFORCE, List.of()));
        assertTrue(check.getAsBoolean());
        when(companyEntitlementService.resolve(23L, capability)).thenReturn(
            new CompanyEntitlementResolution(23L, capability, false, EntitlementPolicyMode.ENFORCE, List.of()));
        assertFalse(check.getAsBoolean());
        when(moduleEntitlementService.hasActiveEntitlement(eq(23L), anyString())).thenReturn(false);
        assertFalse(check.getAsBoolean());
    }
}
