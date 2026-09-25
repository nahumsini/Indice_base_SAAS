package com.indice.erp.pos.square;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class SquareActivationDtos {
    private SquareActivationDtos() {}
    public record Change(@NotBlank @Size(max = 16) String state,
        @NotBlank @Size(min = 8, max = 500) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Status(long companyId, String environment, String connectionState,
        String activationState, Instant changedAt, Instant activatedAt, Instant suspendedAt,
        String reason, long version, boolean liveChargeAllowed) {}
}
