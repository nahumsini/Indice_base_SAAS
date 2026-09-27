package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SquareDispatchAuthorizationTest {
    @Test void rejectsProviderDeviceMismatchBeforeCharge() throws Exception {
        var terminals = mock(SquareTerminalRepository.class);
        var tokens = mock(SquareConnectionTokenService.class);
        var evidence = mock(SquarePaymentEvidenceGateway.class);
        var verification = mock(SquareTerminalVerificationStore.class);
        var context = new PosContext(1L, 7L, "Cashier", "admin", true, PosScope.corporateOffice());
        var terminal = new SquareRecords.Terminal(3, 7, 4, "loc", "code", "device", "Front", "PAIRED", 5L);
        var intent = new SquareRecords.PaymentIntent(9, 7, 5, 6, 3, "loc", "device", "key", null, null,
            SquareTerminalPaymentStatus.WAITING, BigDecimal.ONE, "CAD", "hash", "{}", null, null, 1, "admin",
            "CORPORATE_OFFICE", null, null, Instant.now(), Instant.now(), Instant.now());
        when(terminals.findById(context, 3)).thenReturn(Optional.of(terminal));
        when(tokens.withToken(eq(context), any())).thenAnswer(call -> ((java.util.function.Function<String, ?>) call.getArgument(1)).apply("token"));
        when(evidence.device("token", "code")).thenReturn(new ObjectMapper().readTree(
            "{\"id\":\"code\",\"status\":\"PAIRED\",\"location_id\":\"loc\",\"product_type\":\"TERMINAL_API\",\"device_id\":\"other\"}"));
        assertThatThrownBy(() -> new SquareDispatchAuthorization(terminals, verification, tokens, evidence).require(context, intent))
            .isInstanceOf(PosApiException.class).hasMessageContaining("verification failed");
        verify(verification).unavailable(7L,3L);
    }
}
