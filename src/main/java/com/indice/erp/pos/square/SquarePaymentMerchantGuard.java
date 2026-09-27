package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentMerchantGuard {
    private final SquareConnectionRepository connections;
    private final SquareMerchantOwnership ownership;
    private final SquareTerminalProperties properties;
    private final SquareConnectionChangeGuard guard;
    SquarePaymentMerchantGuard(SquareConnectionRepository connections, SquareMerchantOwnership ownership,
            SquareTerminalProperties properties, SquareConnectionChangeGuard guard) {
        this.connections = connections;
        this.ownership = ownership;
        this.properties = properties;
        this.guard = guard;
    }
    void require(PosContext context, String locationId, String currency) {
        var lockedMerchant = guard.lock(context.companyId(), properties.getEnvironment());
        var connection = connections.findConnection(context, properties.getEnvironment()).orElseThrow();
        if (!connection.merchantId().equals(lockedMerchant)) throw PosApiException.conflict("Square merchant connection changed.");
        var company = ownership.company(properties.getEnvironment(), connection.merchantId());
        if (!context.companyId().equals(company)) throw PosApiException.conflict("Square merchant ownership is invalid.");
        var location = connections.findLocation(context, locationId)
            .orElseThrow(() -> PosApiException.conflict("Square location is not linked to this company."));
        SquareLocationEligibility.require(location.countryCode(), location.currencyCode(), currency);
        if ("JPY".equals(currency)) throw PosApiException.conflict("Square terminal JPY payments require certified currency exponent support.");
    }
}
