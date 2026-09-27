package com.indice.erp.access.tab;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PaymentProviderTabPolicyTest {
    private final PaymentProviderTabPolicy policy = new PaymentProviderTabPolicy();
    @Test void separatesSaleSetupRefundAndFinanceOwners() {
        assertKeys("POST", "/api/v1/pos/square/terminal-payments", "pos.sale");
        assertKeys("POST", "/api/v1/pos/square/terminal-payments/2/refunds", "pos.cortes");
        assertKeys("POST", "/api/v1/pos/mercado-pago/terminal-payments/2/recover", "pos.sale");
        assertKeys("POST", "/api/v1/pos/mercado-pago/terminals/sync", "pos.cortes");
        assertKeys("GET", "/api/v1/pos/returns/POS-2", "pos.cortes");
        assertKeys("POST", "/api/v1/finance/terminal-refund-adjustments/2/post",
            "expenses.payment-accounts");
    }
    @Test void setupReadsAllowEitherPosOwnerAndProviderRoutesStayPublic() {
        assertKeys("GET", "/api/v1/pos/square/terminals", "pos.sale", "pos.cortes");
        assertKeys("GET", "/api/v1/pos/mercado-pago/status", "pos.sale", "pos.cortes");
        assertKeys("GET", "/api/v1/pos/mercado-pago/terminals", "pos.sale", "pos.cortes");
        assertThat(policy.classify("POST", "/api/v1/pos/square/webhook")).isEmpty();
        assertThat(policy.classify("GET", "/api/v1/pos/mercado-pago/oauth/callback")).isEmpty();
    }
    private void assertKeys(String method, String path, String... keys) {
        assertThat(policy.classify(method, path).orElseThrow().anyOf()).containsExactlyInAnyOrder(keys);
    }
}
