package com.indice.erp.pos.returns;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosRequestGuard;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpSession;

class PosReturnControllerTest {
    final PosRequestGuard guard = mock(PosRequestGuard.class);
    final PosReturnService service = mock(PosReturnService.class);
    final PosReturnRepository repository = mock(PosReturnRepository.class);
    final PosReturnCoordinator coordinator = mock(PosReturnCoordinator.class);
    final PosReturnController controller = new PosReturnController(guard, service, repository, coordinator);
    final MockHttpSession session = new MockHttpSession();

    @Test void deniedAdminOrCsrfAccessNeverTouchesMoneyOrInventory() {
        var denial = new PosRequestGuard.Result(null, ResponseEntity.status(403).build());
        when(guard.requireAdminWriteAccess(session, null)).thenReturn(denial);
        assertThat(controller.prepare(session, null, new PosReturnDtos.PrepareRequest(1L, "Return test", true, UUID.randomUUID().toString()))).isEqualTo(denial.error());
        assertThat(controller.confirm(session, 1L, null, new PosReturnDtos.ConfirmRequest(true, Map.of()))).isEqualTo(denial.error());
        assertThat(controller.cancel(session, 1L, null)).isEqualTo(denial.error());
        verify(guard, times(3)).requireAdminWriteAccess(session, null);
        verifyNoInteractions(service, repository, coordinator);
    }

    @Test void deniedReadAccessNeverExposesTicketOrRefundEvidence() {
        var denial = new PosRequestGuard.Result(null, ResponseEntity.status(401).build());
        when(guard.requireAdminReadAccess(session)).thenReturn(denial);
        assertThat(controller.candidates(session, 1L, "")).isEqualTo(denial.error());
        assertThat(controller.active(session, 1L)).isEqualTo(denial.error());
        assertThat(controller.get(session, 1L)).isEqualTo(denial.error());
        verifyNoInteractions(service, repository, coordinator);
    }
}
