package com.indice.erp.pos.mercadopago;

import java.time.Instant;

public record MpCompanyActivation(String state, Instant changedAt, Instant activatedAt,
        Instant suspendedAt, Long actorUserId, String reason, long version) {
    public MpActivationState parsedState() { return MpActivationState.parse(state); }
    public static MpCompanyActivation disabled() {
        return new MpCompanyActivation("DISABLED", null, null, null, null, null, 0);
    }
    public MpCompanyActivation transition(MpActivationState next, long actor, String why, Instant now) {
        var activated = next.allowsCharges() && parsedState() != next ? now : activatedAt;
        var suspended = next == MpActivationState.SUSPENDED && parsedState() != next ? now : suspendedAt;
        return new MpCompanyActivation(next.name(), now, activated, suspended, actor, why, version + 1);
    }
}
