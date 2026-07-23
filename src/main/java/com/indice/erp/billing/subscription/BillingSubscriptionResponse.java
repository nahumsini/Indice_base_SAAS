package com.indice.erp.billing.subscription;

import java.util.List;

public record BillingSubscriptionResponse(
    String status,
    String plan_id,
    int module_count,
    int included_collaborators,
    int extra_collaborators,
    int allowed_collaborators,
    int used_collaborators,
    int remaining_collaborators,
    int monthly_amount_cents,
    String currency,
    String trial_start_at,
    String trial_end_at,
    String current_period_start_at,
    String current_period_end_at,
    boolean cancel_at_period_end,
    String canceled_at,
    String cancellation_effective_at,
    String payment_failed_at,
    String payment_grace_until,
    String payment_failure_reason,
    String latest_invoice_id,
    String source,
    boolean access_allowed,
    String lock_reason,
    boolean prices_exclude_taxes,
    List<String> selected_module_slugs,
    int used_seats,
    int active_seats,
    int pending_invitations,
    int remaining_seats,
    boolean seat_limit_enforced
) {
}
