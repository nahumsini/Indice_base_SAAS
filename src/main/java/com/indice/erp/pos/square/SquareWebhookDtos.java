package com.indice.erp.pos.square;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

final class SquareWebhookDtos {
    private SquareWebhookDtos() {}
    record DeadLetterResponse(long eventId, String squareEventId, String eventType,
        int lifetimeAttempts, int replayCount, Instant receivedAt, Instant deadLetteredAt,
        String message) {}
    record ReplayRequest(@NotBlank @Size(min = 8, max = 500) String reason) {}
}
