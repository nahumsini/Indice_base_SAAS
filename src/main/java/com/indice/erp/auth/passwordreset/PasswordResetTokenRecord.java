package com.indice.erp.auth.passwordreset;

import java.time.Instant;

public record PasswordResetTokenRecord(
    long id,
    long userId,
    String status,
    Instant expiresAt,
    Instant usedAt,
    Instant invalidatedAt
) {
}
