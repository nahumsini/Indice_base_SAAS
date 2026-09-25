package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MpLiveActivationPolicy {
    private final boolean approved;

    public MpLiveActivationPolicy(
            @Value("${app.pos.mercado-pago.live-activation-approved:false}") boolean approved) {
        this.approved = approved;
    }

    public void requireChargeAllowed(MpConnection connection) {
        if (!allows(connection)) {
            throw PosApiException.conflict("Live terminal payments require an approved physical-terminal pilot.");
        }
    }
    public boolean allows(MpConnection connection) {
        return allows(connection.environment(), connection.activation().state());
    }
    boolean allows(String environment, String state) {
        return "sandbox".equals(environment) || "production".equals(environment)
            && approved && MpActivationState.parse(state).allowsCharges();
    }
}
