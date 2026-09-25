package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SquareRefundEvidencePolicyTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final SquareRefundEvidencePolicy policy = new SquareRefundEvidencePolicy(mapper);
    @Test void acceptsOnlyExactCompletedProviderEvidence() throws Exception {
        var node = mapper.readTree("""
            {"id":"refund-1","payment_id":"payment-1","status":"COMPLETED",
             "location_id":"loc-1","amount_money":{"amount":250,"currency":"CAD"}}
            """);
        var proof = policy.verify(SquareRefundFixtures.intent(),
            SquareRefundFixtures.refund("PENDING", "refund-1", null), node);
        assertThat(proof.status()).isEqualTo("COMPLETED");
        assertThat(proof.safeJson()).doesNotContain("card");
    }
    @Test void rejectsMismatchedAmountBeforeAccounting() throws Exception {
        var node = mapper.readTree("""
            {"id":"refund-1","payment_id":"payment-1","status":"COMPLETED",
             "location_id":"loc-1","amount_money":{"amount":249,"currency":"CAD"}}
            """);
        assertThatThrownBy(() -> policy.verify(SquareRefundFixtures.intent(),
            SquareRefundFixtures.refund("PENDING", "refund-1", null), node))
            .isInstanceOf(SquareRefundEvidenceException.class);
    }
}
