package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Service;

@Service
public record MpMerchantReviewService(MpIntentReader reader, MpMerchantTokens tokens,
        MpPointGateway gateway, MpOrderVerifier verifier, MpActionRequiredRecovery actionRequired,
        MpEvidenceApplication application, MpMerchantReviewCompletion completion) {
    public MpPaymentResponse review(PosContext context, long id, MpMerchantReviewRequest request) {
        var intent = reader.find(context, id)
            .orElseThrow(() -> PosApiException.notFound("Payment attempt was not found."));
        requireReviewable(intent, request);
        var verified = tokens.withCompanyToken(context.companyId(), token -> {
            var order = gateway.getOrder(token, request.providerOrderId());
            var evidence = actionRequired.verify(intent, order, token, verifier.verify(intent, order));
            return new MpVerifiedOrder(order, evidence);
        });
        var actor = MpAuditActor.user(context.userId());
        if (!application.applyReview(intent, verified, actor, request.reason().trim())) {
            throw PosApiException.conflict("Payment changed during merchant review; reload it.");
        }
        return completion.complete(context, intent, actor);
    }
    private void requireReviewable(MpIntent intent, MpMerchantReviewRequest request) {
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 8 || reason.length() > 500) {
            throw PosApiException.badRequest("Review reason is invalid.");
        }
        if (!intent.status().equals("RECONCILIATION_REQUIRED") || intent.orderId() != null) {
            throw PosApiException.conflict("This payment does not require missing-order review.");
        }
        if (request == null || request.expectedVersion() == null || intent.version() != request.expectedVersion()) {
            throw PosApiException.conflict("Payment changed during merchant review; reload it.");
        }
    }
}
