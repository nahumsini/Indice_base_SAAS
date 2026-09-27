package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.stereotype.Component;

@Component
public record MpRefundReplay(MpRefundRequestStore requests, MpJson json) {
    public MpRefundRecord existing(MpIntent intent, MpRefundRequest request) {
        var existing = requests.byKey(intent.companyId(), request.idempotencyKey()).orElse(null);
        if (existing == null) return null;
        if (existing.intentId() != intent.id() || !existing.payloadHash().equals(json.hash(json.write(request)))) {
            throw PosApiException.conflict("Refund key was reused for a different request.");
        }
        return existing;
    }
}
