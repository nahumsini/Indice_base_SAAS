package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SquareSetupServiceTest {

    @Mock private SquareTerminalGateway gateway;
    @Mock private SquareConnectionRepository connections;
    @Mock private SquareTerminalRepository terminals;
    @Mock private CashRegisterService cashRegisters;
    @Mock private SquareAuditService audit;

    private SquareTokenCodec codec;
    private SquareSetupService service;

    @BeforeEach
    void setUp() {
        var properties = new SquareTerminalProperties();
        properties.setEnvironment("sandbox");
        codec = new SquareTokenCodec("square-token-test-secret-value-0001", new java.security.SecureRandom());
        var tokenService = new SquareConnectionTokenService(properties, codec, gateway, connections,
            Clock.fixed(Instant.parse("2026-08-28T20:00:00Z"), ZoneOffset.UTC));
        service = new SquareSetupService(properties, enabledSecrets(), codec, tokenService, gateway, connections,
            terminals, cashRegisters, audit, Clock.fixed(Instant.parse("2026-08-28T20:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void refreshesExpiredTokenBeforeCallingSquare() {
        given(connections.findConnection(context(), "sandbox")).willReturn(Optional.of(connection(
            "access-old", "refresh-old", Instant.parse("2026-08-28T19:59:00Z"))));
        given(gateway.refreshToken("refresh-old")).willReturn(new SquareTerminalGateway.OAuthToken(
            null, "access-new", "refresh-new", Instant.parse("2026-08-29T20:00:00Z")));
        given(gateway.listLocations("access-new")).willReturn(List.of(
            new SquareTerminalDtos.SquareLocation("loc-1", "Main", "CAD", "CA")));

        var locations = service.squareLocations(context());

        assertThat(locations).hasSize(1);
        var captor = ArgumentCaptor.forClass(SquareRecords.Connection.class);
        verify(connections).updateTokens(org.mockito.ArgumentMatchers.eq(5L), captor.capture(),
            org.mockito.ArgumentMatchers.eq(11L));
        assertThat(codec.reveal(captor.getValue().accessToken())).isEqualTo("access-new");
        assertThat(codec.reveal(captor.getValue().refreshToken())).isEqualTo("refresh-new");
    }

    @Test
    void retriesOnceAfterSquareUnauthorizedResponse() {
        given(connections.findConnection(context(), "sandbox")).willReturn(Optional.of(connection(
            "access-old", "refresh-old", Instant.parse("2026-08-29T20:00:00Z"))));
        given(gateway.refreshToken("refresh-old")).willReturn(new SquareTerminalGateway.OAuthToken(
            null, "access-new", "refresh-new", Instant.parse("2026-08-29T20:00:00Z")));
        given(gateway.listLocations("access-old")).willThrow(
            new SquareGatewayException("unauthorized", false, 401, null));
        given(gateway.listLocations("access-new")).willReturn(List.of());

        service.squareLocations(context());

        verify(gateway).listLocations("access-old");
        verify(gateway).listLocations("access-new");
    }

    private SquareRecords.Connection connection(String access, String refresh, Instant expiresAt) {
        return new SquareRecords.Connection(5L, 7L, "merchant-1",
            codec.protect(access), codec.protect(refresh), expiresAt);
    }

    private PosContext context() {
        return new PosContext(11L, 7L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private SquareTerminalSecretProvider enabledSecrets() {
        var properties = new SquareTerminalProperties();
        properties.setEnabled(true);
        properties.setApplicationId("app");
        properties.setApplicationSecret("secret");
        properties.setWebhookSignatureKey("signature");
        return new SquareTerminalSecretProvider(properties);
    }
}
