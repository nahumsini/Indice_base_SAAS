package com.indice.erp.pos.selfservice;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SelfServiceKioskControllerAuthorizationTest {

    private final PosRequestGuard guard = mock(PosRequestGuard.class);
    private final SelfServiceKioskService service = mock(SelfServiceKioskService.class);
    private final HttpSession session = mock(HttpSession.class);
    private SelfServiceKioskController controller;

    @BeforeEach
    void setUp() {
        controller = new SelfServiceKioskController(guard, service);
    }

    @Test
    void requiresAdministrativeReadAccessForKioskManagementReads() {
        when(guard.requireAdminReadAccess(session)).thenReturn(forbidden());

        controller.list(session);

        verify(guard).requireAdminReadAccess(session);
        verify(guard, never()).requireReadAccess(session);
        verifyNoInteractions(service);
    }

    @Test
    void requiresAdministrativeWriteAccessForEveryKioskManagementMutation() {
        when(guard.requireAdminWriteAccess(session, "csrf")).thenReturn(forbidden());

        controller.create(session, "csrf", null);
        controller.update(session, "csrf", 11L, null);
        controller.status(session, "csrf", 11L, null);
        controller.rotateLink(session, "csrf", 11L);
        controller.delete(session, "csrf", 11L, null);

        verify(guard, times(5)).requireAdminWriteAccess(session, "csrf");
        verify(guard, never()).requireWriteAccess(session, "csrf");
        verifyNoInteractions(service);
    }

    @Test
    void keepsPreticketQueueClaimAndReleaseOnOrdinaryPosAccess() {
        when(guard.requireReadAccess(session)).thenReturn(forbidden());
        when(guard.requireWriteAccess(session, "csrf")).thenReturn(forbidden());

        controller.pending(session, 3L);
        controller.claim(session, "csrf", 21L, 3L);
        controller.releaseClaim(session, "csrf", 21L, 3L);

        verify(guard).requireReadAccess(session);
        verify(guard, times(2)).requireWriteAccess(session, "csrf");
        verify(guard, never()).requireAdminReadAccess(session);
        verify(guard, never()).requireAdminWriteAccess(session, "csrf");
        verifyNoInteractions(service);
    }

    @Test
    void delegatesClaimReleaseAfterOrdinaryWriteAuthorization() {
        var context = new PosContext(7L, 20L, "Cashier", "user", true, null);
        when(guard.requireWriteAccess(session, "csrf"))
            .thenReturn(new PosRequestGuard.Result(context, null));

        var response = controller.releaseClaim(session, "csrf", 21L, 3L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(guard).requireWriteAccess(session, "csrf");
        verify(guard, never()).requireAdminWriteAccess(session, "csrf");
        verify(service).releaseClaim(context, 21L, 3L);
    }

    private PosRequestGuard.Result forbidden() {
        return new PosRequestGuard.Result(
            null, ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }
}
