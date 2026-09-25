package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterService;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.Optional;
import java.util.function.Function;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

final class SquareApprovedRecoveryFixture {
    final PosContext context = new PosContext(11L, 7L, "Cashier", "admin", true, PosScope.corporateOffice());
    final SquareRecords.PaymentIntent held;
    final SquarePaymentIntentRepository intents = mock(SquarePaymentIntentRepository.class);
    final SquarePaymentFinalizer finalizer = mock(SquarePaymentFinalizer.class);
    final SquareTerminalGateway terminal = mock(SquareTerminalGateway.class);
    final SquarePaymentEvidenceGateway payments = mock(SquarePaymentEvidenceGateway.class);
    final SquarePaymentRecovery recovery;
    SquareApprovedRecoveryFixture() {
        this("pay-1");
    }
    SquareApprovedRecoveryFixture(String storedPaymentId) {
        held = new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1", "key-1",
            "co-1", storedPaymentId, SquareTerminalPaymentStatus.APPROVED, new BigDecimal("10.50"), "CAD", "hash", "{}", null, null,
            11L, "admin", "CORPORATE_OFFICE", null, null, null, null, null);
        var tokens = mock(SquareConnectionTokenService.class);
        when(tokens.withToken(eq(context), any())).thenAnswer(call -> {
            Function<String, ?> work = call.getArgument(1);
            return work.apply("synthetic-token");
        });
        when(intents.findById(context, 91L)).thenReturn(Optional.of(held));
        var mapper = new ObjectMapper();
        var evidence = new SquareVerifiedPaymentStatus(tokens, payments,
            new SquareCheckoutEvidencePolicy(mapper, new SquareCheckoutIdentityPolicy()), new SquarePaymentEvidencePolicy(), new SquareCheckoutStatusMapper());
        var d = new SquarePaymentDependencies(new SquareTerminalProperties(), mock(SquareTerminalSecretProvider.class), tokens, terminal,
            mock(SquareTerminalRepository.class), intents, new SquareCheckoutStatusMapper(), finalizer, mock(SquarePaymentRequestPreparer.class),
            mock(SquareAuditService.class), Clock.systemUTC(), evidence, mock(SquarePaymentMerchantGuard.class));
        recovery = new SquarePaymentRecovery(d, new SquarePaymentResponses(d, SquarePaymentAccessFixtures.access()),
            new SquareCheckoutSearchRecovery(d, new SquareCheckoutIdentityPolicy(), mapper));
    }
}
