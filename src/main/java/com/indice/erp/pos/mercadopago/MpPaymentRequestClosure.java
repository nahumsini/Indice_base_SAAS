package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;

@Service
public record MpPaymentRequestClosure(TerminalPaymentGuard guard, MpPaymentAdmissionStore admissions,
        MpPaymentClosureIntents intents) {
    public Outcome close(PosContext context, String key, long registerId) {
        if (key == null || !key.matches("[A-Za-z0-9_-]{1,64}") || registerId <= 0) {
            throw PosApiException.badRequest("Payment request identity is invalid.");
        }
        return guard.withRegisterLock(context, registerId, () -> {
            var admission = admissions.claim(context, key, registerId, "0".repeat(64));
            var intent = intents.find(context, key, registerId).orElse(null);
            if (intent != null) return new Outcome(intent, null);
            if (admission.status().equals("REJECTED")) return new Outcome(null, MpPaymentSubmissionError.from(admission.rejection()));
            var rejected = admissions.reject(context, admission, "REQUEST_CLOSED",
                PosApiException.conflict("Original payment request was closed before submission."));
            return new Outcome(null, MpPaymentSubmissionError.from(rejected));
        });
    }
    public record Outcome(MpIntent intent, MpPaymentSubmissionError rejection) { }
}
