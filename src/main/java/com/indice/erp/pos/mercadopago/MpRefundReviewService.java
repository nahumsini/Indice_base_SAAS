package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public record MpRefundReviewService(MpIntentReader intents, MpRefundRequestStore requests,
        MpRefundWorkClaims claims, MpRefundProviderRecheck recheck,
        MpRefundReviewCompletion completion, Clock clock) {
    public MpRefundRecord recheck(PosContext context, long intentId, long refundId,
            MpRefundReviewRequest request) {
        var intent = intents.find(context, intentId)
            .orElseThrow(() -> PosApiException.notFound("Payment attempt was not found."));
        var refund = requests.find(context.companyId(), refundId)
            .orElseThrow(() -> PosApiException.notFound("Refund request was not found."));
        requireReviewable(intent, refund, request);
        var lease = UUID.randomUUID().toString();
        if (!claims.review(refund, lease, clock.instant().plusSeconds(90))) {
            throw PosApiException.conflict("Refund review changed concurrently; reload it.");
        }
        MpVerifiedOrder verified;
        try { verified = recheck.read(intent); }
        catch (RuntimeException failure) { verified = null; }
        return completion.complete(context, intent, refund, lease, request, verified);
    }
    private void requireReviewable(MpIntent intent, MpRefundRecord refund, MpRefundReviewRequest request) {
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 8 || reason.length() > 500) throw PosApiException.badRequest("Review reason is invalid.");
        if (request == null || refund.intentId() != intent.id() || request.expectedVersion() == null
                || request.expectedVersion() != refund.version()
                || !java.util.Set.of("PENDING","UNCERTAIN","RECONCILIATION_REQUIRED","DEAD_LETTER")
                    .contains(refund.status())) {
            throw PosApiException.conflict("Refund is not available for this review version.");
        }
    }
}
