package com.indice.erp.pos.checkout;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class TerminalCheckoutSnapshotPolicyTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final TerminalCheckoutSnapshotPolicy policy = new TerminalCheckoutSnapshotPolicy(mapper);
    @Test
    void acceptsExactApprovedStoredSale() throws Exception {
        var request = TerminalCheckoutFixtures.request();
        var evidence = TerminalCheckoutFixtures.evidence(10L, mapper.writeValueAsString(request));
        assertThatCode(() -> policy.validate(evidence, request)).doesNotThrowAnyException();
    }
    @Test
    void rejectsSubstitutingCustomerAfterProviderApproval() throws Exception {
        var request = TerminalCheckoutFixtures.request();
        var changed = new PosCheckoutRequest(20L, 999L, null, "MXN", request.items(), request.payments(), null);
        var evidence = TerminalCheckoutFixtures.evidence(10L, mapper.writeValueAsString(request));
        assertThatThrownBy(() -> policy.validate(evidence, changed)).isInstanceOf(PosApiException.class);
    }
    @Test
    void rejectsPaymentWithoutCapturedProviderProof() throws Exception {
        var saved = TerminalCheckoutFixtures.evidence(10L, mapper.writeValueAsString(TerminalCheckoutFixtures.request()));
        var evidence = new TerminalCheckoutEvidence(saved.registerId(), saved.shiftId(), saved.userId(), saved.role(),
            saved.scopeType(), saved.unitId(), saved.businessId(), saved.amount(), saved.currency(), null, saved.checkoutJson());
        assertThatThrownBy(() -> policy.validate(evidence, TerminalCheckoutFixtures.request())).isInstanceOf(PosApiException.class);
    }
}
