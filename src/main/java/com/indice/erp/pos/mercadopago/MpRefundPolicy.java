package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MpRefundPolicy {
    private final boolean enabled;

    public MpRefundPolicy(@Value("${app.pos.mercado-pago.refunds-enabled:false}") boolean enabled) {
        this.enabled = enabled;
    }

    public void requireEnabled() {
        if (!enabled) throw PosApiException.conflict("Refunds require approved Treasury reconciliation procedures.");
    }
    boolean enabled() { return enabled; }
}
