package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public record PosReturnReviewService(PosReturnService returns, PosReturnPaymentGateway payments) {
    private static final Set<String> REVIEWABLE = Set.of(
        "PENDING", "UNCERTAIN", "RECONCILIATION_REQUIRED", "DEAD_LETTER");

    public PosReturnSummary recheck(PosContext context, String reference, PosReturnReviewRequest request) {
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 8 || reason.length() > 500) {
            throw PosApiException.badRequest("Review reason is invalid.");
        }
        var sale = returns.requireEligible(context, reference);
        var refund = sale.latestRefund();
        if (refund == null || request.expectedVersion() == null
                || refund.version() != request.expectedVersion()
                || !REVIEWABLE.contains(refund.status())) {
            throw PosApiException.conflict("Refund changed during review; reload it.");
        }
        payments.recheck(context, sale.providerCode(), sale.intentId(), refund.refundId(),
            new PosReturnReviewRequest(reason, request.expectedVersion()));
        return returns.find(context, reference);
    }
}
