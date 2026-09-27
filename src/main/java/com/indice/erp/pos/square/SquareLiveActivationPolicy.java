package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import org.springframework.stereotype.Component;

@Component
class SquareLiveActivationPolicy {
    private final SquareTerminalProperties terminal;
    private final SquareActivationProperties activation;
    private final SquareActivationStore store;
    SquareLiveActivationPolicy(SquareTerminalProperties terminal, SquareActivationProperties activation,
            SquareActivationStore store) {
        this.terminal = terminal; this.activation = activation; this.store = store;
    }
    void require(long companyId) {
        if (!terminal.isProduction()) return;
        var connection = store.find(companyId, "production").orElseThrow(() ->
            PosApiException.conflict("Square production connection is not available."));
        if (!activation.isLiveActivationApproved() || !"CONNECTED".equals(connection.connectionState())
                || !connection.state().allowsCharges()) {
            throw PosApiException.conflict("Live Square terminal payments are not activated for this company.");
        }
    }
    boolean allows(SquareActivationStore.Record value) {
        return "sandbox".equals(value.environment()) || activation.isLiveActivationApproved()
            && "CONNECTED".equals(value.connectionState()) && value.state().allowsCharges();
    }
}
