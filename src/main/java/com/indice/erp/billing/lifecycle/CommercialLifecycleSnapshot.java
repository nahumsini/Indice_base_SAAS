package com.indice.erp.billing.lifecycle;

import java.time.Instant;

public record CommercialLifecycleSnapshot(
    long company_id,
    String state,
    String access_mode,
    String subscription_status,
    String payment_status,
    Instant trial_ends_at,
    Instant grace_ends_at,
    Instant read_only_ends_at,
    Instant retention_until,
    String reason_code,
    boolean operational_read_allowed,
    boolean operational_write_allowed
) {}
