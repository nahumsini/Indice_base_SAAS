package com.indice.erp.billing.signup;

import com.indice.erp.billing.lifecycle.CommercialAccessRestrictedException;
import com.indice.erp.billing.lifecycle.CommercialLifecycleState;
import java.time.Clock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Persistent new-cohort policy. Turning signup off must never turn expiry enforcement off. */
@Service
public class PublicTrialAccessService {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public PublicTrialAccessService(JdbcTemplate jdbc, Clock clock) { this.jdbc = jdbc; this.clock = clock; }

    public void requireActive(long companyId) {
        deadline(companyId).ifPresent(end -> {
            if (!end.isAfter(clock.instant())) {
                throw new CommercialAccessRestrictedException(CommercialLifecycleState.SUSPENDED, false);
            }
        });
    }

    /** The legacy USD flow has neither this cohort's regional price nor payment consent contract. */
    public void requireLegacyPaidFlowAllowed(long companyId) {
        if (isRegionalCohort(companyId)) {
            throw new IllegalStateException("Regional trial payment activation is not available yet.");
        }
    }

    public boolean isRegionalCohort(long companyId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM billing_trial_entries WHERE company_id = ?)",
            Boolean.class, companyId));
    }

    public java.util.Optional<java.time.Instant> deadline(long companyId) {
        var deadlines = jdbc.query("""
            SELECT trial_ends_at FROM billing_trial_entries
            WHERE company_id = ? AND status = 'ACTIVE'
            """, (rs, n) -> rs.getTimestamp(1).toInstant(), companyId);
        return deadlines.stream().findFirst();
    }
}
