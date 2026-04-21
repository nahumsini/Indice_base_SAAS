package com.indice.erp.auth;

public record LoginAttemptResult(
    boolean success,
    String message
) {
}
