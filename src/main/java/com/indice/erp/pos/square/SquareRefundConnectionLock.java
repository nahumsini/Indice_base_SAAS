package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import org.springframework.stereotype.Component;

@Component
class SquareRefundConnectionLock {
    private final SquareConnectionChangeGuard guard; private final SquareConnectionRepository connections;
    private final SquareTerminalProperties properties;
    SquareRefundConnectionLock(SquareConnectionChangeGuard guard,
            SquareConnectionRepository connections, SquareTerminalProperties properties) {
        this.guard=guard; this.connections=connections; this.properties=properties;
    }
    SquareRefundMerchant lock(PosContext context) {
        var environment=properties.getEnvironment();
        var locked=guard.lock(context.companyId(),environment);
        var current=connections.findConnection(context,environment).orElseThrow(()->
            PosApiException.conflict("The original Square merchant connection is required."));
        if (!java.util.Objects.equals(locked,current.merchantId()))
            throw PosApiException.conflict("The Square merchant connection changed.");
        return new SquareRefundMerchant(environment,locked);
    }
}
