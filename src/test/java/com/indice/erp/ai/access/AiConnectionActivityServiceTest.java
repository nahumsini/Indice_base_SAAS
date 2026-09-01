package com.indice.erp.ai.access;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;

class AiConnectionActivityServiceTest {

    private static final AuthSessionUser OWNER = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");

    @Test
    void mergesReadsAndActionsInDescendingTimeOrder() {
        var repository = mock(AiToolUsageAuditRepository.class);
        var service = new AiConnectionActivityService(repository);
        when(repository.connectionBelongsTo(91L, 3L, 23L)).thenReturn(true);
        when(repository.listReadEvents(91L, 3L, 23L, 10)).thenReturn(List.of(
            event("read-1", "READ", "get_inventory_summary", "2026-08-31T12:00:00Z")
        ));
        when(repository.listActionEvents(91L, 3L, 23L, 10)).thenReturn(List.of(
            event("action-1", "ACTION", "create_task", "2026-08-31T12:05:00Z")
        ));

        var events = service.list(OWNER, 91L, 10);

        assertThat(events).extracting(AiConnectionActivityService.ActivityEvent::id)
            .containsExactly("action-1", "read-1");
    }

    @Test
    void hidesConnectionsOwnedByAnotherUserOrCompany() {
        var repository = mock(AiToolUsageAuditRepository.class);
        var service = new AiConnectionActivityService(repository);
        when(repository.connectionBelongsTo(91L, 3L, 23L)).thenReturn(false);

        assertThrows(NoSuchElementException.class, () -> service.list(OWNER, 91L, 25));
    }

    private AiConnectionActivityService.ActivityEvent event(String id, String kind, String tool, String createdAt) {
        return new AiConnectionActivityService.ActivityEvent(
            id, kind, tool, kind, "SUCCESS", kind.equals("READ") ? 200 : null,
            kind.equals("ACTION") ? 2 : 0, Instant.parse(createdAt)
        );
    }
}
