package com.indice.erp.pos.mercadopago;

import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public record MpPaymentDispatch(MpDispatchStore dispatch, MpMerchantTokens tokens,
        MpPointGateway gateway, MpIntentWriter writer, MpIntentReviewWriter review, MpPaymentAudit audit,
        MpPaymentDispatchAdmission admission, Clock clock) {
    public void send(MpIntent intent) { send(intent, MpAuditActor.system()); }
    public void send(MpIntent intent, MpAuditActor actor) {
        if (intent.orderId() != null || !intent.pending()
                || intent.status().equals("RECONCILIATION_REQUIRED")) return;
        if (clock.instant().isAfter(intent.createdAt().plusSeconds(72000))) {
            if (review.requireReview(intent,
                    "Original order could not be located; authenticated merchant review is required.")) {
                audit.recordAs(intent, actor, "ORDER_REVIEW_REQUIRED", "RECONCILIATION_REQUIRED");
            }
            return;
        }
        var lease = UUID.randomUUID().toString();
        if (!dispatch.claim(intent, lease, clock.instant().plusSeconds(90))) return;
        var started = new boolean[] {false};
        try {
            var response = tokens.withCompanyToken(intent.companyId(), token -> {
                admission.require(intent, lease);
                started[0] = true;
                return gateway.createOrder(token, intent.providerRequestJson(), intent.idempotencyKey());
            });
            var id = response.path("id").asText();
            if (!id.matches("ORD[A-Za-z0-9_-]{1,125}")) {
                throw new IllegalStateException("Provider order identifier is missing.");
            }
            dispatch.order(intent, lease, id);
            audit.recordAs(intent, actor, "ORDER_SENT", "WAITING");
        } catch (RuntimeException exception) {
            if (started[0]) {
                writer.uncertain(intent, "Order submission is uncertain. Recover this payment before retrying.");
                audit.recordAs(intent, actor, "ORDER_SUBMISSION_UNCERTAIN", "UNCERTAIN");
            } else {
                writer.dispatchBlocked(intent, "Payment was not submitted because dispatch eligibility changed.");
                audit.recordAs(intent, actor, "ORDER_NOT_SUBMITTED", intent.status());
            }
        } finally {
            dispatch.release(intent, lease);
        }
    }
}
