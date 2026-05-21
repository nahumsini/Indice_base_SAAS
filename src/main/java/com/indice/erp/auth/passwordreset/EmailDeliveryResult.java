package com.indice.erp.auth.passwordreset;

public record EmailDeliveryResult(
    boolean sent,
    String status,
    String message
) {

    public static EmailDeliveryResult sentSuccessfully() {
        return new EmailDeliveryResult(true, "sent", "Password reset email sent.");
    }

    public static EmailDeliveryResult disabled() {
        return new EmailDeliveryResult(false, "disabled", "Email delivery is disabled for this environment.");
    }

    public static EmailDeliveryResult failed(String message) {
        return new EmailDeliveryResult(false, "failed", message);
    }
}
