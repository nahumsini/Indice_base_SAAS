package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import org.springframework.stereotype.Component;

@Component
record SquareRefundReplay(ObjectMapper mapper) {
    SquareRefundRecord require(SquareRefundRecord existing, SquareRecords.PaymentIntent intent,
            SquareRefundPayload payload) {
        if (existing.intentId() != intent.id() || !sameJson(existing.requestJson(),payload.json())
                || !SquareHashing.sha256(existing.requestJson()).equals(existing.payloadHash()))
            throw PosApiException.conflict("Square refund key was reused for a different request.");
        return existing;
    }
    private boolean sameJson(String persisted, String requested) {
        try { return mapper.readTree(persisted).equals(mapper.readTree(requested)); }
        catch (Exception invalid) { return false; }
    }
}
