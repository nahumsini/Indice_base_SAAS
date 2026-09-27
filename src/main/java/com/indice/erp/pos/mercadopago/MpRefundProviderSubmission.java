package com.indice.erp.pos.mercadopago;

import org.springframework.stereotype.Component;

@Component
record MpRefundProviderSubmission(MpRefundEligibility eligibility, MpMerchantTokens tokens,
        MpPointGateway gateway) {
    Outcome submit(MpIntent intent, MpRefundRecord refund) {
        var started = new boolean[] {false};
        try {
            eligibility.require(intent);
            tokens.withCompanyToken(intent.companyId(), token -> {
                started[0] = true;
                return gateway.refundOrder(token, intent.orderId(), refund.requestJson(), refund.key());
            });
            return new Outcome("PENDING", null);
        } catch (MpGatewayException failure) {
            var status = failure.uncertain() ? "UNCERTAIN"
                : refund.status().equals("WAITING") ? "REJECTED" : "RECONCILIATION_REQUIRED";
            return new Outcome(status,
                failure.status() == 0 ? "TRANSPORT_UNVERIFIED" : "HTTP_" + failure.status());
        } catch (RuntimeException failure) {
            var status = started[0] ? "UNCERTAIN"
                : refund.status().equals("WAITING") ? "NOT_SUBMITTED" : "RECONCILIATION_REQUIRED";
            return new Outcome(status, started[0] ? "SUBMISSION_UNVERIFIED" : "LOCAL_REJECTION");
        }
    }
    record Outcome(String status, String error) {}
}
