package com.indice.erp.kiosk.api;

import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.pos.PosAccessService;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.processTasks.ProcessTasksAccessService;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class KioskCenterInventoryAccessServiceTest {

    private final KioskInternalRequestGuard guard = mock(KioskInternalRequestGuard.class);
    private final FinanceAccessService financeAccess = mock(FinanceAccessService.class);
    private final HrAccessService hrAccess = mock(HrAccessService.class);
    private final PosAccessService posAccess = mock(PosAccessService.class);
    private final ProcessTasksAccessService processTasksAccess = mock(ProcessTasksAccessService.class);
    private final TabPermissionAccessService tabPermissions = mock(TabPermissionAccessService.class);
    private final HttpSession session = mock(HttpSession.class);
    private final KioskCenterInventoryAccessService service = new KioskCenterInventoryAccessService(
        guard, financeAccess, hrAccess, posAccess, processTasksAccess, tabPermissions);

    @Test
    void rootReceivesTheGlobalInventoryWithoutConsultingOwnerModules() {
        var root = user("root");
        when(guard.requireAuthenticated(session)).thenReturn(root);

        var access = service.requireRead(session);

        assertThat(access.global()).isTrue();
        assertThat(access.ownerModules()).isEmpty();
        assertThat(access.ownerScopes()).isEmpty();
        verifyNoInteractions(financeAccess, hrAccess, posAccess, processTasksAccess, tabPermissions);
    }

    @Test
    void managerOnlyReceivesInventoriesWhoseOwnerContractAuthorizesAdministration() {
        var manager = user("manager");
        when(guard.requireAuthenticated(session)).thenReturn(manager);
        when(hrAccess.canAccessManagementTab(manager, HrAccessService.HrTab.CONTROL)).thenReturn(true);
        when(processTasksAccess.canAccess(manager)).thenReturn(false);

        var access = service.requireRead(session);

        assertThat(access.global()).isFalse();
        assertThat(access.ownerModules()).containsExactly("HUMAN_RESOURCES");
    }

    @Test
    void processAdministratorReceivesTheProcessTasksInventory() {
        var admin = user("admin");
        when(guard.requireAuthenticated(session)).thenReturn(admin);
        when(processTasksAccess.canAccess(admin)).thenReturn(true);

        assertThat(service.requireRead(session).ownerModules()).containsExactly("PROCESS_TASKS");
    }

    @Test
    void financeInventoryIsLimitedToTheOwnerTabsTheUserCanOpen() {
        var admin = user("admin");
        when(guard.requireAuthenticated(session)).thenReturn(admin);
        when(financeAccess.resolveContext(admin)).thenReturn(Optional.of(new FinanceContext(
            7L, 20L, "User", "admin", true, FinanceScope.corporateOffice())));
        when(tabPermissions.canAccess(admin, TabPermissionRequirement.one("expenses.expenses")))
            .thenReturn(true);

        var access = service.requireRead(session);

        assertThat(access.ownerModules()).containsExactly("EXPENSES");
        assertThat(access.ownerScopes().get("EXPENSES").type())
            .isEqualTo(com.indice.erp.kiosk.engine.KioskCenterService.OwnerScope.Type.CORPORATE_OFFICE);
    }

    @Test
    void posInventoryRequiresBothOwnerAdministrationAndTheKioskTab() {
        var admin = user("admin");
        var posContext = new PosContext(7L, 20L, "User", "admin", true, PosScope.corporateOffice());
        when(guard.requireAuthenticated(session)).thenReturn(admin);
        when(posAccess.resolveContext(admin)).thenReturn(Optional.of(posContext));
        when(tabPermissions.canAccess(admin, TabPermissionRequirement.one("pos.kiosks")))
            .thenReturn(true);

        var access = service.requireRead(session);

        assertThat(access.ownerModules()).containsExactly("POINT_OF_SALE");
        assertThat(access.ownerScopes().get("POINT_OF_SALE").type())
            .isEqualTo(com.indice.erp.kiosk.engine.KioskCenterService.OwnerScope.Type.CORPORATE_OFFICE);
    }

    @Test
    void ownerInventoryCarriesTheResolvedOrganizationalScopeIntoTheCenterQuery() {
        var admin = user("admin");
        when(guard.requireAuthenticated(session)).thenReturn(admin);
        when(financeAccess.resolveContext(admin)).thenReturn(Optional.of(new FinanceContext(
            7L, 20L, "User", "admin", true, FinanceScope.unitHeadquarters(41L))));
        when(tabPermissions.canAccess(admin, TabPermissionRequirement.one("petty_cash.cash")))
            .thenReturn(true);
        when(posAccess.resolveContext(admin)).thenReturn(Optional.of(new PosContext(
            7L, 20L, "User", "admin", true, PosScope.businessOffice(41L, 52L))));
        when(tabPermissions.canAccess(admin, TabPermissionRequirement.one("pos.kiosks")))
            .thenReturn(true);

        var access = service.requireRead(session);

        assertThat(access.ownerScopes().get("PETTY_CASH").unitId()).isEqualTo(41L);
        assertThat(access.ownerScopes().get("POINT_OF_SALE").businessId()).isEqualTo(52L);
    }

    @Test
    void posOperatorWithoutAdministrationCapabilityDoesNotReceiveTheInventory() {
        var operator = user("user");
        var posContext = new PosContext(7L, 20L, "User", "user", true, PosScope.corporateOffice());
        when(guard.requireAuthenticated(session)).thenReturn(operator);
        when(posAccess.resolveContext(operator)).thenReturn(Optional.of(posContext));
        when(tabPermissions.canAccess(operator, TabPermissionRequirement.one("pos.kiosks")))
            .thenReturn(true);

        assertThatThrownBy(() -> service.requireRead(session))
            .isInstanceOf(KioskInternalAccessException.class);
    }

    @Test
    void userWithoutAnOwnerAdministrationContractFailsClosed() {
        var user = user("user");
        when(guard.requireAuthenticated(session)).thenReturn(user);

        assertThatThrownBy(() -> service.requireRead(session))
            .isInstanceOf(KioskInternalAccessException.class);
    }

    private AuthSessionUser user(String role) {
        return new AuthSessionUser(7L, 20L, 30L, "User", role);
    }
}
