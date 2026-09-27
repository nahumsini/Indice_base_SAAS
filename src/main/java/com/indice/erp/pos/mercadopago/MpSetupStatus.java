package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class MpSetupStatus {
    private final MpProperties properties;
    private final MpConnectionStore store;
    private final MpLiveActivationPolicy activation;

    MpSetupDtos.Status get(PosContext context) {
        if (!properties.isEnabled()) return unavailable(false, properties.getEnvironment(), "DISABLED");
        var connection = store.find(context.companyId(), properties.environment());
        return connection.map(c -> {
            boolean connected = "CONNECTED".equals(c.state()) && c.liveMode() == properties.isProduction()
                && "MX".equals(c.countryCode()) && "MLM".equals(c.siteId());
            return new MpSetupDtos.Status(true, properties.environment(), connected, c.sellerId(), c.state(),
                c.countryCode(), c.activation().state(), connected && activation.allows(c));
        }).orElseGet(() -> unavailable(true, properties.environment(), "DISCONNECTED"));
    }
    private MpSetupDtos.Status unavailable(boolean enabled, String environment, String state) {
        return new MpSetupDtos.Status(enabled, environment, false, null, state, "MX", "DISABLED", false);
    }
}
