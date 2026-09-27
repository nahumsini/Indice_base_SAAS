package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.http.HttpStatus;

public record MpPaymentAdmission(String key, long registerId, long actorId, String payloadHash,
        String status, String message, Integer statusCode) {
    public void requireOwner(PosContext context, MpCreatePayment request, String hash) {
        requireOwner(context, request.cashRegisterId());
        requirePayload(hash);
    }
    public void requireOwner(PosContext context, long requestedRegisterId) {
        if (registerId != requestedRegisterId || actorId != context.userId()) {
            throw PosApiException.conflict("Payment request key belongs to another immutable attempt.");
        }
    }
    public void requirePayload(String hash) {
        if (!payloadHash.equals(hash)) throw PosApiException.conflict("Payment request changed.");
    }
    public MpPaymentNotSubmittedException rejection() {
        return new MpPaymentNotSubmittedException(HttpStatus.valueOf(statusCode), key, message);
    }
}
