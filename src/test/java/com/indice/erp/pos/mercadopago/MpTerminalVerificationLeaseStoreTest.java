package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpTerminalVerificationLeaseStoreTest {
    @Test void activeDurableLeaseBoundsConcurrentProviderRefresh() {
        var terminals = mock(MpTerminalStore.class);
        var jdbc = mock(JdbcTemplate.class);
        var initial = MpTestFixtures.terminal("READY", 9L);
        var current = new MpTerminal(initial.id(),initial.companyId(),initial.connectionId(),initial.providerTerminalId(),
            initial.storeId(),initial.posId(),initial.name(),initial.status(),initial.operatingMode(),9L,
            initial.providerLastSeenAt(),initial.providerVerifiedAt(),"STALE",null,initial.version(),"active-lease",
            MpTestFixtures.NOW.plusSeconds(30));
        when(terminals.require(MpTestFixtures.context(), initial.id(), true)).thenReturn(current);
        var store = new MpTerminalVerificationLeaseStore(terminals, jdbc, MpTestFixtures.CLOCK);
        assertThrows(PosApiException.class, () -> store.claim(MpTestFixtures.context(), initial));
        verifyNoInteractions(jdbc);
    }
}
