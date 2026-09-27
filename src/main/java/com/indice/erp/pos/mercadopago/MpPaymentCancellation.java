package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.stereotype.Service;

@Service
public record MpPaymentCancellation(MpMerchantTokens tokens, MpPointGateway gateway,
        MpOrderOwnership ownership, MpIntentWriter writer, MpPaymentRecovery recovery, MpJson json) {
    public void cancel(MpIntent intent) {
        cancel(intent, MpAuditActor.system());
    }
    public void cancel(MpIntent intent, MpAuditActor actor) {
        if (!intent.pending() || intent.status().equals("APPROVED") || intent.posTicketId() != null) {
            throw PosApiException.conflict("This payment cannot be cancelled.");
        }
        if (intent.orderId() == null) {
            writer.uncertain(intent, "Submission may have reached the terminal. Recover before cancelling.");
            return;
        }
        var order = tokens.withCompanyToken(intent.companyId(), token -> gateway.getOrder(token, intent.orderId()));
        ownership.validate(intent, order);
        if (!order.path("status").asText().equals("created")) {
            recovery.recover(intent, actor);
            throw PosApiException.conflict("Cancellation must be completed on the terminal or the payment recovered.");
        }
        try {
            tokens.withCompanyToken(intent.companyId(), token -> gateway.cancelOrder(
                token, intent.orderId(), "cancel_" + json.hash(intent.idempotencyKey()).substring(0, 48)));
        } catch (RuntimeException exception) {
            writer.uncertain(intent, "Cancellation requires provider confirmation.");
        }
        recovery.recover(intent, actor);
    }
}
