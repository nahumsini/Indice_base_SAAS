package com.indice.erp.billing.lifecycle;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.billing.lifecycle.enabled=true",
    "app.billing.lifecycle.scheduler-enabled=false",
    "app.billing.lifecycle.grace-days=14",
    "app.billing.lifecycle.read-only-days=14",
    "app.billing.lifecycle.retention-days=90"
})
class CommercialLifecycleIntegrationTest {

    private static final String COMPANY_PREFIX = "phase6-lifecycle-test-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CommercialLifecycleService lifecycle;

    @BeforeEach
    void cleanBefore() {
        cleanTestState();
    }

    @AfterEach
    void cleanAfter() {
        cleanTestState();
    }

    @Test
    void paymentFailureStartsOneGraceWindowAndPaymentRecoveryRestoresAccess() {
        var companyId = premiumCompany("recovery");
        var started = Instant.now().minus(1, ChronoUnit.HOURS);
        lifecycle.applySubscriptionEvent(companyId, "evt-active", started, "active", null);

        var failedAt = started.plus(10, ChronoUnit.MINUTES);
        var failure = lifecycle.applyInvoiceEvent(
            companyId, "evt-failed-1", failedAt, "invoice.payment_failed", "open"
        );

        assertThat(failure.snapshot().state()).isEqualTo("GRACE");
        assertThat(failure.snapshot().allows_operational_write()).isTrue();
        assertThat(failure.snapshot().grace_ends_at())
            .isEqualTo(failedAt.plus(14, ChronoUnit.DAYS));

        var repeated = lifecycle.applyInvoiceEvent(
            companyId, "evt-failed-2", failedAt.plus(1, ChronoUnit.DAYS),
            "invoice.payment_failed", "open"
        );
        assertThat(repeated.snapshot().grace_ends_at())
            .isEqualTo(failedAt.plus(14, ChronoUnit.DAYS));

        var recovered = lifecycle.applyInvoiceEvent(
            companyId, "evt-paid", failedAt.plus(2, ChronoUnit.DAYS), "invoice.paid", "paid"
        );
        assertThat(recovered.snapshot().state()).isEqualTo("ACTIVE");
        assertThat(recovered.snapshot().grace_ends_at()).isNull();
        assertThat(recovered.snapshot().allows_operational_write()).isTrue();
    }

    @Test
    void ignoresOlderStripeEventsAndDoesNotRegressAnActiveCompany() {
        var companyId = premiumCompany("ordering");
        var newer = Instant.now();
        lifecycle.applySubscriptionEvent(companyId, "evt-newer", newer, "active", null);

        var ignored = lifecycle.applyInvoiceEvent(
            companyId, "evt-older", newer.minus(1, ChronoUnit.HOURS),
            "invoice.payment_failed", "open"
        );

        assertThat(ignored.state_changed()).isFalse();
        assertThat(ignored.snapshot().state()).isEqualTo("ACTIVE");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_commercial_state_events WHERE company_id = ?",
            Integer.class, companyId
        )).isEqualTo(1);
    }

    @Test
    void advancesToReadOnlySuspensionAndPurgeReviewWithoutDeletingTenantData() {
        var companyId = premiumCompany("retention");
        lifecycle.applyInvoiceEvent(
            companyId, "evt-failed", Instant.now().minus(1, ChronoUnit.DAYS),
            "invoice.payment_failed", "open"
        );
        expire(companyId, "grace_ends_at");

        assertThat(lifecycle.advanceDueStates()).isEqualTo(1);
        assertThat(lifecycle.snapshot(companyId).orElseThrow().state()).isEqualTo("READ_ONLY");
        assertThat(lifecycle.snapshot(companyId).orElseThrow().allows_operational_write()).isFalse();

        expire(companyId, "read_only_ends_at");
        assertThat(lifecycle.advanceDueStates()).isEqualTo(1);
        assertThat(lifecycle.snapshot(companyId).orElseThrow().state()).isEqualTo("SUSPENDED");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_data_retention_jobs WHERE company_id = ? AND status = 'SCHEDULED'",
            Integer.class, companyId
        )).isEqualTo(1);

        expire(companyId, "retention_until");
        assertThat(lifecycle.advanceDueStates()).isEqualTo(1);
        assertThat(lifecycle.snapshot(companyId).orElseThrow().state()).isEqualTo("PURGE_PENDING");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM companies WHERE id = ?", Integer.class, companyId
        )).isEqualTo(1);
    }

    @Test
    void legacyCompanyWithoutPremiumPolicyRemainsOutsideCommercialEnforcement() {
        var companyId = company("legacy");

        var result = lifecycle.applyInvoiceEvent(
            companyId, "evt-legacy", Instant.now(), "invoice.payment_failed", "open"
        );

        assertThat(result.enrolled()).isFalse();
        assertThat(result.snapshot()).isNull();
        assertThat(lifecycle.snapshot(companyId)).isEmpty();
    }

    private long premiumCompany(String label) {
        var companyId = company(label);
        jdbc.update(
            "INSERT INTO company_entitlement_policies (company_id, mode, reason) VALUES (?, 'SHADOW', 'phase6 test')",
            companyId
        );
        return companyId;
    }

    private long company(String label) {
        jdbc.update(
            "INSERT INTO companies (name) VALUES (?)",
            COMPANY_PREFIX + label + "-" + UUID.randomUUID()
        );
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private void expire(long companyId, String column) {
        jdbc.update(
            "UPDATE company_commercial_states SET " + column + " = ? WHERE company_id = ?",
            Timestamp.from(Instant.now().minus(1, ChronoUnit.MINUTES)), companyId
        );
    }

    private void cleanTestState() {
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
    }
}
