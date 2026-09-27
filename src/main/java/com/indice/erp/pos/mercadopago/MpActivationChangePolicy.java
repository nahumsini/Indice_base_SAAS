package com.indice.erp.pos.mercadopago;

import org.springframework.stereotype.Component;

@Component
record MpActivationChangePolicy(MpActivationEligibility eligibility) {
    Decision require(MpActivationDtos.Change request, MpConnection connection) {
        var state = MpActivationState.parse(request == null ? null : request.state());
        var reason = request == null || request.reason() == null ? null : request.reason().trim();
        var expected = request == null ? null : request.expectedVersion();
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("Activation reason is required.");
        if (reason.length() < 8) throw new IllegalArgumentException("Activation reason is too short.");
        if (reason.length() > 500) throw new IllegalArgumentException("Activation reason is too long.");
        if (expected == null || expected < 0) throw new IllegalArgumentException("Activation version is required.");
        if (connection.activation().version() != expected) {
            throw new IllegalStateException("Merchant activation changed concurrently.");
        }
        eligibility.require(connection, state);
        return new Decision(state, reason, expected);
    }
    record Decision(MpActivationState state, String reason, long expectedVersion) {}
}
