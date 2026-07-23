package com.indice.erp.billing.subscription;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class CompanySubscriptionServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-06-30T12:00:00Z"), ZoneOffset.UTC);

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void futureTrialIsAllowed() {
        var service = new CompanySubscriptionService(jdbcTemplate, CLOCK);
        stubSubscription("trialing", "all-modules", "2026-07-01T12:00:00Z", null, null);

        var status = service.currentStatus(7L);

        assertTrue(status.accessAllowed());
        assertEquals("trialing", status.status());
    }

    @Test
    void expiredTrialIsBlockedEvenBeforeJobRuns() {
        var service = new CompanySubscriptionService(jdbcTemplate, CLOCK);
        stubSubscription("trialing", "all-modules", "2026-06-29T12:00:00Z", null, null);

        var status = service.currentStatus(7L);

        assertFalse(status.accessAllowed());
        assertEquals("trial_expired", status.lockReason());
    }

    @Test
    void missingSubscriptionFallsBackToLegacyAccess() {
        var service = new CompanySubscriptionService(jdbcTemplate, CLOCK);
        when(jdbcTemplate.query(contains("FROM company_billing_subscriptions"), ArgumentMatchers.<RowMapper<CompanySubscriptionStatus>>any(), eq(7L)))
            .thenReturn(List.of());
        when(jdbcTemplate.query(contains("FROM company_commercial_states"), ArgumentMatchers.<RowMapper<CompanySubscriptionStatus>>any(), eq(7L)))
            .thenReturn(List.of());

        var status = service.currentStatus(7L);

        assertTrue(status.accessAllowed());
        assertEquals("active", status.status());
    }

    @Test
    void paymentGraceAllowsPastDueAccessUntilGraceExpires() {
        var service = new CompanySubscriptionService(jdbcTemplate, CLOCK);
        stubSubscription("past_due", "all-modules", "2026-07-01T12:00:00Z", null, "payment_grace", "2026-07-01T12:00:00Z");

        var status = service.currentStatus(7L);

        assertTrue(status.accessAllowed());
        assertEquals("payment_grace", status.lockReason());
    }

    @Test
    void expireTrialsMarksExpiredTrialRows() {
        var service = new CompanySubscriptionService(jdbcTemplate, CLOCK);
        when(jdbcTemplate.update(contains("UPDATE company_commercial_states"))).thenReturn(2);

        assertEquals(2, service.expireTrials());
    }

    private void stubSubscription(String status, String planId, String trialEnd, String lockedAt, String lockReason) {
        stubSubscription(status, planId, trialEnd, lockedAt, lockReason, null);
    }

    private void stubSubscription(String status, String planId, String trialEnd, String lockedAt, String lockReason, String paymentGraceUntil) {
        when(jdbcTemplate.query(contains("FROM company_billing_subscriptions"), ArgumentMatchers.<RowMapper<CompanySubscriptionStatus>>any(), eq(7L)))
            .thenAnswer((invocation) -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<CompanySubscriptionStatus>) invocation.getArgument(1);
                ResultSet rs = mock(ResultSet.class);
                when(rs.getString("subscription_status")).thenReturn(status);
                when(rs.getString("plan_id")).thenReturn(planId);
                when(rs.getTimestamp("trial_ends_at")).thenReturn(timestamp(trialEnd));
                when(rs.getString("lifecycle_state")).thenReturn(lockedAt == null ? "" : "SUSPENDED");
                when(rs.getString("access_mode")).thenReturn(lockedAt == null ? "" : "BILLING_ONLY");
                when(rs.getString("reason_code")).thenReturn(lockReason);
                when(rs.getTimestamp("grace_ends_at")).thenReturn(timestamp(paymentGraceUntil));
                return List.of(rowMapper.mapRow(rs, 0));
            });
    }

    private Timestamp timestamp(String instant) {
        return instant == null ? null : Timestamp.from(Instant.parse(instant));
    }
}
