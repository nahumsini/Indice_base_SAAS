package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CashRegisterControllerAuthorizationTest {

    private final PosRequestGuard guard = mock(PosRequestGuard.class);
    private final CashRegisterService service = mock(CashRegisterService.class);
    private final HttpSession session = mock(HttpSession.class);
    private CashRegisterController controller;

    @BeforeEach
    void setUp() {
        controller = new CashRegisterController(guard, service);
    }

    @Test
    void compatibilityPreparationRequiresAdministrativeWriteAccessAndCsrf() {
        when(guard.requireAdminWriteAccess(session, "csrf")).thenReturn(forbidden());

        controller.settlementPolicy(session, "csrf", 11L, "MXN");
        controller.settlementAccounts(session, "csrf", 11L, "MXN");
        controller.settlementAccountsForWarehouse(session, "csrf", 7L, "MXN");

        verify(guard, times(3)).requireAdminWriteAccess(session, "csrf");
        verify(guard, never()).requireAdminReadAccess(session);
        verifyNoInteractions(service);
    }

    private PosRequestGuard.Result forbidden() {
        return new PosRequestGuard.Result(
            null, ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }
}
