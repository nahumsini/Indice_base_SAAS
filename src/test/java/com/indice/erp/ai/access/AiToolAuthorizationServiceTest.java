package com.indice.erp.ai.access;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
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
        when(processTasksAccessService.canAccess(USER)).thenReturn(true);

        assertTrue(service.canCreateTask(USER));
    }

    @Test
    void revokingProcessesAccessImmediatelyBlocksTaskCreation() {
        when(subscriptionStatusProvider.currentStatus(23L)).thenReturn(CompanySubscriptionStatus.activeLegacy());
        when(moduleEntitlementService.hasActiveEntitlement(23L, "processes")).thenReturn(true);
        when(processTasksAccessService.canAccess(USER)).thenReturn(false);

        assertFalse(service.canCreateTask(USER));
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
}
