package com.indice.erp.auth.passwordreset;

public record PasswordResetUser(
    long id,
    String email,
    String fullName
) {
}
