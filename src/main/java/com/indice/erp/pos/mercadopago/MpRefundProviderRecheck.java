package com.indice.erp.pos.mercadopago;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpRefundProviderRecheck {
    private final MpMerchantTokens tokens;
    private final MpPointGateway gateway;
    private final MpOrderVerifier verifier;
    private final MpActionRequiredRecovery actionRequired;
    MpVerifiedOrder read(MpIntent intent) {
        var connection = tokens.connection(intent.companyId());
        if (connection.id() != intent.connectionId() || !connection.sellerId().equals(intent.sellerId())
                || !connection.environment().equals(intent.environment())) {
            throw new IllegalStateException("Original merchant connection is unavailable.");
        }
        return tokens.withCompanyToken(intent.companyId(), token -> {
            var order = gateway.getOrder(token, intent.orderId());
            return new MpVerifiedOrder(order,
                actionRequired.verify(intent, order, token, verifier.verify(intent, order)));
        });
    }
}
