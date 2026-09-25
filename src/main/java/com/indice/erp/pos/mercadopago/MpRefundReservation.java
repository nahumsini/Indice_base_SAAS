package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.settlement.TerminalRefundStore;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public record MpRefundReservation(MpFinancialEvidenceLock locks, MpIntentStore intents,
        TerminalRefundStore ledger, MpRefundRequestStore requests, MpJson json,
        MpRefundAmounts amounts, MpRefundOutstanding outstanding) {
    public MpRefundRecord reserve(PosContext context, MpIntent candidate, MpRefundRequest request) {
        if (!request.idempotencyKey().matches("[A-Za-z0-9_-]{1,64}")) {
            throw PosApiException.badRequest("Refund idempotency key is invalid.");
        }
        var hash = json.hash(json.write(request));
        return locks.apply(candidate, () -> {
            var intent = intents.lock(candidate.companyId(), candidate.id());
            var existing = requests.byKey(intent.companyId(), request.idempotencyKey()).orElse(null);
            if (existing != null) {
                if (existing.intentId() != intent.id() || !existing.payloadHash().equals(hash)) {
                    throw PosApiException.conflict("Refund key was reused for a different request.");
                }
                return existing;
            }
            outstanding.assertNone(intent);
            if (intent.paymentId() == null || intent.orderId() == null
                    || !(intent.status().equals("APPROVED") || intent.status().equals("PARTIALLY_REFUNDED"))) {
                throw PosApiException.conflict("An approved card payment is required.");
            }
            var baseline = ledger.confirmed(intent.companyId(), intent.id());
            var remaining = intent.amount().subtract(baseline);
            var amount = amounts.requested(request, remaining);
            var body = request.amount() == null ? "{}" : json.write(Map.of("transactions",
                List.of(Map.of("id", intent.paymentId(), "amount", amount.toPlainString()))));
            return requests.create(context, intent, request, amount, baseline, body, hash);
        });
    }
}
