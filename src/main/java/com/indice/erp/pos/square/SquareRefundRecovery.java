package com.indice.erp.pos.square;

import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
class SquareRefundRecovery {
    private final SquareRefundClaims claims; private final SquareRefundMerchantGuard merchants;
    private final SquareConnectionTokenService tokens; private final SquareRefundGateway gateway;
    private final SquareRefundEvidencePolicy evidence; private final SquareRefundConfirmation confirmation;
    private final SquareRefundRecoveryTransition transitions; private final SquareRefundQueries queries; private final Clock clock;
    SquareRefundRecovery(SquareRefundClaims claims, SquareRefundMerchantGuard merchants,
            SquareConnectionTokenService tokens, SquareRefundGateway gateway, SquareRefundEvidencePolicy evidence,
            SquareRefundConfirmation confirmation, SquareRefundRecoveryTransition transitions,
            SquareRefundQueries queries, Clock clock) {
        this.claims=claims; this.merchants=merchants; this.tokens=tokens; this.gateway=gateway;
        this.evidence=evidence; this.confirmation=confirmation; this.transitions=transitions; this.queries=queries; this.clock=clock;
    }
    SquareRefundRecord check(SquareRecords.PaymentIntent intent, SquareRefundRecord refund,
            SquareRefundActor actor, String reason, boolean manual) {
        if (refund.providerRefundId() == null) return refund;
        var lease = UUID.randomUUID().toString();
        if (!claims.recovery(refund, lease, clock.instant().plusSeconds(90), manual)) return reload(refund);
        try {
            merchants.require(refund);
            var verified = tokens.withCompanyToken(refund.companyId(), token -> evidence.verify(
                intent, refund, gateway.get(token, refund.providerRefundId())));
            if (verified.status().equals("COMPLETED"))
                confirmation.confirm(refund, lease, verified, actor, reason);
            else transitions.evidence(refund, lease, verified, actor, reason, manual);
        } catch (SquareRefundEvidenceException mismatch) {
            transitions.mismatch(refund, lease, actor, reason);
        } catch (RuntimeException failure) {
            transitions.failure(refund, lease, actor, reason, manual);
        }
        return reload(refund);
    }
    private SquareRefundRecord reload(SquareRefundRecord value) {
        return queries.find(value.companyId(), value.id(), false).orElseThrow();
    }
}
