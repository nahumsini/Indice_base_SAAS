package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Service;

@Service
public record MpPaymentReservation(MpPaymentIdentity identity, MpIntentReader reader,
        MpTerminalVerification verification, MpPaymentReservationTransaction transaction) {
    public MpIntent reserve(PosContext context, MpCreatePayment request) {
        var hash = identity.hash(request);
        var existing = reader.byKey(context, request.idempotencyKey()).orElse(null);
        if (existing != null) return matching(existing, hash);
        MpTerminalVerificationProof proof;
        try { proof = verification.verify(context, request.cashRegisterId()); }
        catch (PosApiException rejected) {
            return transaction.reserve(context, request, hash, null, rejected);
        }
        return transaction.reserve(context, request, hash, proof, null);
    }
    private MpIntent matching(MpIntent intent, String hash) {
        if (!intent.payloadHash().equals(hash)) throw PosApiException.conflict("Payment request changed.");
        return intent;
    }
}
