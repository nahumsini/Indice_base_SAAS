package com.indice.erp.pos.terminal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.access.tab.TabPermissionRequirement;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class PaymentTerminalRequestGuardTest {
    @ParameterizedTest @CsvSource({"read,pos.sale", "write,pos.sale", "adminRead,pos.cortes", "adminWrite,pos.cortes"})
    void paymentAndAdministrativeActionsRequireTheirOwnTab(String operation, String permission) {
        var fixture = new TerminalRequestGuardFixtures();
        var requirement = TabPermissionRequirement.one(permission);
        when(fixture.tabs.canAccess(fixture.user, requirement)).thenReturn(true);
        assertSame(fixture.allowed, fixture.invoke(operation));
        verify(fixture.tabs).canAccess(fixture.user, requirement);
        when(fixture.tabs.canAccess(fixture.user, requirement)).thenReturn(false);
        assertTrue(fixture.invoke(operation).denied());
    }
    @ParameterizedTest @ValueSource(strings={"read", "write", "adminRead", "adminWrite", "setupRead", "adminSetupRead"})
    void authenticationEntitlementCsrfAndAdminDenialsCannotBeOverriddenByTabs(String operation) {
        var fixture = new TerminalRequestGuardFixtures();
        fixture.denyBase();
        assertTrue(fixture.invoke(operation).denied());
        verifyNoInteractions(fixture.auth, fixture.tabs);
    }
    @Test void setupStatusAllowsSaleOrClosingTabButMutationsStillRequireCsrf() {
        var fixture = new TerminalRequestGuardFixtures();
        when(fixture.tabs.canAccess(fixture.user, TabPermissionRequirement.any("pos.sale", "pos.cortes"))).thenReturn(true);
        assertSame(fixture.allowed, fixture.guard.setupRead(fixture.session));
        assertSame(fixture.allowed, fixture.guard.adminSetupRead(fixture.session));
        fixture.guard.write(fixture.session, "csrf");
        fixture.guard.adminWrite(fixture.session, "csrf");
        verify(fixture.base).requireWriteAccess(fixture.session, "csrf");
        verify(fixture.base).requireAdminWriteAccess(fixture.session, "csrf");
        verify(fixture.base).requireAdminReadAccess(fixture.session);
    }
}
