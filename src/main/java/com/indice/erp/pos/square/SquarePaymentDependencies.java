package com.indice.erp.pos.square;

import java.time.Clock;
import org.springframework.stereotype.Component;

@Component
record SquarePaymentDependencies(SquareTerminalProperties properties, SquareTerminalSecretProvider secrets,
        SquareConnectionTokenService tokens, SquareTerminalGateway gateway, SquareTerminalRepository terminals,
        SquarePaymentIntentRepository intents, SquareCheckoutStatusMapper statuses,
        SquarePaymentFinalizer finalizer, SquarePaymentRequestPreparer preparer, SquareAuditService audit, Clock clock,
        SquareVerifiedPaymentStatus evidence, SquarePaymentMerchantGuard merchant) {
}
