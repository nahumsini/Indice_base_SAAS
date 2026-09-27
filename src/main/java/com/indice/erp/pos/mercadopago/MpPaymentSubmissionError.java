package com.indice.erp.pos.mercadopago;

public record MpPaymentSubmissionError(String code, String submissionState,
        String requestKey, String message) {
    public static MpPaymentSubmissionError from(MpPaymentNotSubmittedException exception) {
        return new MpPaymentSubmissionError("PAYMENT_NOT_SUBMITTED", "not_submitted",
            exception.requestKey(), exception.getMessage());
    }
}
