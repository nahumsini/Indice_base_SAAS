package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MpPaymentReservationTransaction {
    private final MpIntentReader reader;
    private final TerminalPaymentGuard guard;
    private final MpPaymentPreparation preparation;
    private final MpIntentCreator creator;
    private final MpPaymentAdmissionStore admissions;
    public MpIntent reserve(PosContext context, MpCreatePayment request, String hash,
            MpTerminalVerificationProof proof, PosApiException verificationError) {
        var outcome = guard.withRegisterLock(context, request.cashRegisterId(), () -> {
            var admission = admissions.claim(context, request, hash);
            var existing = reader.byKey(context, request.idempotencyKey()).orElse(null);
            if (existing != null) return existing(existing, hash);
            if (admission.status().equals("REJECTED")) return new Outcome(null, admission.rejection());
            admission.requirePayload(hash);
            if (verificationError != null)
                return new Outcome(null, admissions.reject(context, admission, verificationError));
            try {
                guard.assertNoPending(context, request.cashRegisterId());
                var prepared = preparation.prepare(context, request, proof);
                return new Outcome(creator.create(context, request, prepared.draft(), prepared.terminal(),
                    prepared.connection(), hash, prepared.reference(), prepared.providerJson(), prepared.expiresAt()), null);
            } catch (PosApiException error) {
                return new Outcome(null, admissions.reject(context, admission, error));
            }
        });
        if (outcome.rejection() != null) throw outcome.rejection();
        return outcome.intent();
    }
    private Outcome existing(MpIntent intent, String hash) {
        if (!intent.payloadHash().equals(hash)) throw PosApiException.conflict("Payment request changed.");
        return new Outcome(intent, null);
    }
    private record Outcome(MpIntent intent, MpPaymentNotSubmittedException rejection) { }
}
