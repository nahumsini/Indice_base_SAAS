package com.indice.erp.pos.square;

import org.springframework.stereotype.Component;

@Component
record SquareRefundProviderSubmission(SquareRefundMerchantGuard merchants,
        SquareConnectionTokenService tokens, SquarePaymentEvidenceGateway payments,
        SquareRefundPaymentProof proof, SquareRefundGateway gateway,
        SquareRefundStoredRequestPolicy stored) {
    SquareRefundSubmissionOutcome submit(SquareRecords.PaymentIntent intent, SquareRefundRecord refund) {
        var started = new boolean[] {false};
        try {
            var request = gateway.request(refund.requestJson());
            stored.require(intent,refund,request);
            merchants.require(refund);
            var node = tokens.withCompanyToken(refund.companyId(), token -> {
                var payment=payments.payment(token,intent.squarePaymentId());
                if (!refund.status().equals("WAITING")) proof.requireReplay(intent,refund,payment);
                else proof.require(intent,refund,payment);
                started[0] = true;
                return gateway.create(token, request);
            });
            var idNode = node.path("id"); var id = idNode.textValue();
            if (!SquareProviderIdentifiers.refund(idNode))
                return new SquareRefundSubmissionOutcome("UNCERTAIN", "PROVIDER_ID_MISSING", null);
            return new SquareRefundSubmissionOutcome("PENDING", null, id);
        } catch (SquareRefundEvidenceException mismatch) {
            var status = refund.status().equals("WAITING") ? "NOT_SUBMITTED" : "RECONCILIATION_REQUIRED";
            return new SquareRefundSubmissionOutcome(status,
                "PAYMENT_EVIDENCE_MISMATCH", null);
        } catch (SquareGatewayException failure) {
            var status = started[0] ? failure.uncertain() ? "UNCERTAIN"
                : refund.status().equals("WAITING") ? "REJECTED" : "RECONCILIATION_REQUIRED"
                : refund.status().equals("WAITING") ? "NOT_SUBMITTED" : "UNCERTAIN";
            var code = failure.statusCode() == 0 ? "TRANSPORT_UNVERIFIED" : "HTTP_" + failure.statusCode();
            return new SquareRefundSubmissionOutcome(status, code, null);
        } catch (RuntimeException failure) {
            var status = started[0] ? "UNCERTAIN"
                : refund.status().equals("WAITING") ? "NOT_SUBMITTED" : "RECONCILIATION_REQUIRED";
            return new SquareRefundSubmissionOutcome(status,
                started[0] ? "SUBMISSION_UNVERIFIED" : "LOCAL_REJECTION", null);
        }
    }
}
