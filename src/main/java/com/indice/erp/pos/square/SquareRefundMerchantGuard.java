package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import org.springframework.stereotype.Component;

@Component
class SquareRefundMerchantGuard {
    private final SquareConnectionRepository connections; private final SquareMerchantOwnership ownership;
    private final SquareTerminalProperties properties;
    SquareRefundMerchantGuard(SquareConnectionRepository connections,
            SquareMerchantOwnership ownership, SquareTerminalProperties properties) {
        this.connections=connections; this.ownership=ownership; this.properties=properties;
    }
    void require(SquareRefundRecord refund) {
        if (!refund.environment().equals(properties.getEnvironment()))
            throw PosApiException.conflict("The original Square environment is unavailable.");
        var connection = connections.findConnection(refund.companyId(), refund.environment())
            .orElseThrow(() -> PosApiException.conflict("The original Square merchant connection is unavailable."));
        if (!refund.merchantId().equals(connection.merchantId())
                || !Long.valueOf(refund.companyId()).equals(
                    ownership.company(refund.environment(), refund.merchantId()))) {
            throw PosApiException.conflict("The original Square merchant connection changed.");
        }
    }
}
