package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class MpTerminalConfigurationStoreTest {
    private final MpTerminalStore terminals = mock(MpTerminalStore.class);
    private final TerminalPaymentGuard guard = mock(TerminalPaymentGuard.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final MpTerminalConfigurationStore configurations = new MpTerminalConfigurationStore(terminals, guard, jdbc);

    @Test void unresolvedPaymentPreventsPdvConfigurationBeforeTerminalMutation() {
        var context = MpTestFixtures.context();
        doThrow(PosApiException.conflict("pending")).when(guard).assertNoPending(context, 8);
        assertThrows(PosApiException.class, () -> configurations.claim(context, MpTestFixtures.terminal("READY", 8L)));
        var ordered = inOrder(guard);
        ordered.verify(guard).lockRegister(context, 8);
        ordered.verify(guard).assertNoPending(context, 8);
        verifyNoInteractions(terminals, jdbc);
    }
    @Test void concurrentReassignmentOrPdvClaimCannotBeOverwritten() {
        var context = MpTestFixtures.context();
        when(terminals.require(context, 5, true)).thenReturn(MpTestFixtures.terminal("READY", 9L));
        assertThrows(PosApiException.class, () -> configurations.claim(context, MpTestFixtures.terminal("READY", 8L)));
        when(terminals.require(context, 5, true)).thenReturn(MpTestFixtures.terminal("CONFIGURING", null));
        assertThrows(PosApiException.class, () -> configurations.claim(context, MpTestFixtures.terminal("READY", null)));
        verifyNoInteractions(jdbc);
    }
    @Test void uncertainProviderResponseCannotPromoteTerminalToReady() {
        configurations.failed(MpTestFixtures.terminal("READY", null));
        verify(jdbc).update(contains("verification_status='STALE'"), eq(42L), eq(5L), eq(3L));
    }
}
