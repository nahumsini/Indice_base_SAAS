package com.indice.erp.distributorportal;

import java.time.Instant;
import java.util.List;

public final class DistributorPortalResponse {

    private DistributorPortalResponse() {
    }

    public record Context(
        long company_id,
        String company_name,
        String operator_name,
        String account_type,
        String role,
        List<String> available_tabs
    ) {
    }

    public record Portfolio(
        Summary summary,
        List<Client> clients,
        int matching_clients
    ) {
    }

    public record Summary(
        int total_clients,
        int prospects,
        int demos_and_trials,
        int active_contracts,
        int attention_required
    ) {
    }

    public record Client(
        long company_id,
        String company_name,
        String owner_email,
        String country_code,
        String commercial_stage,
        String billing_status,
        String offer_code,
        String billing_interval,
        String currency,
        String access_mode,
        List<String> module_names,
        int active_members,
        int seat_capacity,
        String last_payment_status,
        Instant next_event_at,
        Instant trial_ends_at,
        String trial_source,
        int trial_days_remaining,
        boolean trial_extendable,
        boolean trial_permanent
    ) {
    }
}
