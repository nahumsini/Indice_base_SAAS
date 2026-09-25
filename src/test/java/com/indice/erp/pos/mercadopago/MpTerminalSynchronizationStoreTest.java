package com.indice.erp.pos.mercadopago;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpTerminalSynchronizationStoreTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final MpTerminalSynchronizationStore store = new MpTerminalSynchronizationStore(jdbc, MpTestFixtures.CLOCK);
    @Test void completeProviderFeedUpdatesSeenAndDemotesMissingTerminals() {
        var terminal = new MpProviderDtos.Terminal("PAX_A910__TEST1", " store ", " pos ", "PDV");
        store.complete(MpTestFixtures.connection(), List.of(terminal));
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(2)).update(sql.capture(), any(Object[].class));
        assertTrue(sql.getAllValues().get(0).contains("provider_verified_at"));
        assertTrue(sql.getAllValues().get(1).contains("status='UNAVAILABLE'"));
        assertTrue(sql.getAllValues().get(1).contains("provider_terminal_id NOT IN"));
    }
    @Test void invalidCompleteFeedDoesNotPartiallyMutateTerminalState() {
        var terminal = new MpProviderDtos.Terminal("PAX_A910__TEST1", "store", "pos", "PDV");
        assertThrows(MpGatewayException.class,
            () -> store.complete(MpTestFixtures.connection(), List.of(terminal, terminal)));
        verifyNoInteractions(jdbc);
    }
}
