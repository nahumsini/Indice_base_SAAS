package com.indice.erp.pos.mercadopago;

import org.springframework.stereotype.Component;

@Component
class MpActivationEligibility {
    void require(MpConnection connection, MpActivationState target) {
        if (!target.allowsCharges()) return;
        if (!"production".equals(connection.environment()) || !connection.liveMode()
                || !"CONNECTED".equals(connection.state())) {
            throw new IllegalStateException("A connected production merchant is required for activation.");
        }
        if (!"MX".equals(connection.countryCode()) || !"MLM".equals(connection.siteId())
                || connection.sellerId() == null || !connection.sellerId().matches("[0-9]{1,32}")) {
            throw new IllegalStateException("The original verified Mexican merchant is required for activation.");
        }
    }
}
