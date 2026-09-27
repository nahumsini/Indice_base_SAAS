package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.settlement.TerminalRefundStore;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public record MpRefundEvidence(TerminalRefundStore ledger, MpOrderOwnership ownership,
        MpRefundRequestStore requests) {
    public boolean record(MpIntent intent, JsonNode order, MpEvidence evidence) {
        if (evidence.refundedAmount().signum() <= 0) return false;
        var previous = ledger.confirmed(intent.companyId(), intent.id());
        var cumulative = BigDecimal.ZERO;
        for (var refund : order.path("transactions").path("refunds")) {
            if (!refund.path("status").asText().equals("processed")) continue;
            var amount = ownership.money(refund, "amount");
            cumulative = cumulative.add(amount);
            ledger.record(intent, refund.path("id").asText(), amount, cumulative);
        }
        if (ledger.confirmed(intent.companyId(), intent.id()).compareTo(evidence.refundedAmount()) != 0) {
            throw new IllegalStateException("Provider refunds differ from immutable reversal evidence.");
        }
        requests.confirm(intent, evidence.refundedAmount());
        return previous.compareTo(evidence.refundedAmount()) != 0;
    }
}
