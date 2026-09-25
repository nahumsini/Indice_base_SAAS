package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class SquareLocationSetup {
    private final SquareSetupDependencies d;
    SquareLocationSetup(SquareSetupDependencies dependencies) {
        this.d = dependencies;
    }
    List<SquareTerminalDtos.SquareLocation> list(PosContext context) {
        return d.tokens().withToken(context, d.gateway()::listLocations);
    }
    SquareRecords.Location link(PosContext context, String id) {
        var match = list(context).stream().filter(location -> location.id().equals(id)).findFirst()
            .orElseThrow(() -> PosApiException.badRequest("Square location was not found for this merchant."));
        SquareLocationEligibility.require(match.countryCode(), match.currencyCode(), match.currencyCode());
        var linked = d.connections().upsertLocation(context, match);
        d.audit().record(context, "LOCATION_LINKED", "OK", "Square location linked.");
        return linked;
    }
}
