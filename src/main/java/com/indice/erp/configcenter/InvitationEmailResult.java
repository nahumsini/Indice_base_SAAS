package com.indice.erp.configcenter;

public record InvitationEmailResult(
    boolean sent,
    String status,
    String message
) {
    public static InvitationEmailResult sentSuccessfully() {
        return new InvitationEmailResult(true, "sent", "Invitation email sent.");
    }

    public static InvitationEmailResult disabled() {
        return new InvitationEmailResult(false, "disabled", "Email delivery is disabled for this environment. Use the invitation link below for local testing.");
    }

    public static InvitationEmailResult failed(String message) {
        return new InvitationEmailResult(false, "failed", message);
    }
}
