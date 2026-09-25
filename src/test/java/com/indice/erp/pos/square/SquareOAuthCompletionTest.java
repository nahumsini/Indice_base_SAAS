package com.indice.erp.pos.square;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class SquareOAuthCompletionTest {
    private final SquareTerminalGateway gateway = mock(SquareTerminalGateway.class);
    private final SquareOAuthStateStore states = mock(SquareOAuthStateStore.class);
    private final SquareConnectionPersistence persistence = mock(SquareConnectionPersistence.class);
    private final Instant now = Instant.parse("2026-09-18T12:00:00Z");
    private final PosContext context = new PosContext(11L, 7L, "Synthetic", "admin", true, PosScope.corporateOffice());
    private final String state = "a".repeat(64);
    private SquareOAuthCompletion service() {
        var properties = new SquareTerminalProperties(); properties.setEnabled(true);
        var codec = new SquareTokenCodec("synthetic-square-protection-secret-1234", new java.security.SecureRandom());
        var d = new SquareSetupDependencies(properties, new SquareTerminalSecretProvider(properties), codec, null,
            gateway, null, null, mock(SquareTerminalVerificationStore.class),mock(SquareTerminalPairingPersistence.class),
            null,mock(SquareAuditService.class), Clock.fixed(now, ZoneOffset.UTC));
        return new SquareOAuthCompletion(d, states, new SquareOAuthSetup(d, persistence));
    }
    @Test void wrongCompanyActorEnvironmentOrExpiredStateNeverReachesProvider() {
        when(states.consume(eq(context), anyString(), eq("sandbox"), eq(now)))
            .thenThrow(PosApiException.badRequest("Invalid state"));
        assertThrows(PosApiException.class, () -> service().complete(context, new SquareOAuthComplete("synthetic-code", state)));
        verify(states).consume(context, SquareHashing.sha256(state), "sandbox", now);
        verifyNoInteractions(gateway, persistence);
    }
    @Test void scopedSingleUseConsumptionPrecedesProviderAndLockedCredentialSave() {
        var stored = new SquareConnectionRepository.OAuthState(3, 7, 11, "sandbox");
        when(states.consume(any(), anyString(), anyString(), any())).thenReturn(stored);
        when(gateway.exchangeCode("synthetic-code")).thenReturn(new SquareTerminalGateway.OAuthToken(
            "merchant-7", "synthetic-access", "synthetic-refresh", now.plusSeconds(3600)));
        assertTrue(service().complete(context, new SquareOAuthComplete("synthetic-code", state)).connected());
        var order = inOrder(states, gateway, persistence);
        order.verify(states).consume(context, SquareHashing.sha256(state), "sandbox", now);
        order.verify(gateway).exchangeCode("synthetic-code");
        order.verify(persistence).save(eq(stored), any(SquareRecords.Connection.class));
    }
}
