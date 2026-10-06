package com.indice.erp.platformadmin.leads;

import static org.assertj.core.api.Assertions.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PlatformLeadAnalyticsRepositoryIntegrationTest {
    private static final Instant NOW = Instant.parse("2036-10-06T12:00:00Z");
    private static final Instant FROM = Instant.parse("2036-09-07T00:00:00Z");
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformLeadAnalyticsRepository repository;

    @Test void historyCountsStagesOnceAfterProgressionAndYoungLeadsDoNotFailTheSla() {
        var source = UUID.randomUUID().toString();
        var created = NOW.minus(48, ChronoUnit.HOURS);
        var won = lead(created, "México", "WON", source, null, null);
        event(won, "CONTACTED", created.plus(2, ChronoUnit.HOURS));
        event(won, "DIAGNOSIS_SCHEDULED", created.plus(3, ChronoUnit.HOURS));
        event(won, "DIAGNOSIS_COMPLETED", created.plus(4, ChronoUnit.HOURS));
        event(won, "PROPOSAL", created.plus(5, ChronoUnit.HOURS));
        event(won, "PROPOSAL", created.plus(6, ChronoUnit.HOURS));
        event(won, "WON", created.plus(8, ChronoUnit.HOURS));
        lead(NOW.minus(2, ChronoUnit.HOURS), "MX", "NEW", source, NOW.plus(22, ChronoUnit.HOURS), null);
        lead(NOW.minus(50, ChronoUnit.HOURS), "Mexico", "LOST", source, null, null);
        lead(NOW.minus(40, ChronoUnit.HOURS), "Canada", "NEW", source, NOW.plus(1, ChronoUnit.DAYS), null);

        var totals = repository.totals(FROM, NOW, "MX");
        assertThat(totals.received()).isEqualTo(3);
        assertThat(totals.contacted()).isEqualTo(1);
        assertThat(totals.scheduled()).isEqualTo(1);
        assertThat(totals.diagnosed()).isEqualTo(1);
        assertThat(totals.proposals()).isEqualTo(1);
        assertThat(totals.won()).isEqualTo(1);
        assertThat(totals.slaEligible()).isEqualTo(2);
        assertThat(totals.slaMet()).isEqualTo(1);
        assertThat(totals.averageContactHours()).isEqualByComparingTo("2.00");
        var breakdown = repository.breakdown(FROM, NOW, "MX", false);
        assertThat(breakdown).singleElement().satisfies(row -> {
            assertThat(row.received()).isEqualTo(3);
            assertThat(row.diagnosisRate()).isEqualByComparingTo("33.33");
            assertThat(row.proposalWinRate()).isEqualByComparingTo("100.00");
        });
        assertThat(repository.details(FROM, NOW, "MX", "proposal", source, "", "", "", 1, 25).items())
            .singleElement().satisfies(row -> assertThat(row.id()).isEqualTo(won));
        assertThat(repository.details(FROM, NOW, "MX", "sla_missed", source, "", "", "", 1, 25).total()).isEqualTo(1);
    }

    @Test void currentBacklogIncludesOlderLeadsAndExcludesClosedAndNurture() {
        var baseline = repository.attention(NOW, "MX");
        var source = UUID.randomUUID().toString();
        var old = lead(NOW.minus(120, ChronoUnit.DAYS), "MX", "NEW", source, NOW.minus(1, ChronoUnit.HOURS), null);
        lead(NOW.minus(121, ChronoUnit.DAYS), "MX", "NURTURE", source, NOW.minus(1, ChronoUnit.HOURS), null);
        lead(NOW.minus(122, ChronoUnit.DAYS), "MX", "WON", source, NOW.minus(1, ChronoUnit.HOURS), null);
        lead(NOW.minus(123, ChronoUnit.DAYS), "MX", "TRIAL_ACTIVE", source, NOW.plus(1, ChronoUnit.DAYS), NOW.minus(1, ChronoUnit.HOURS));
        var attention = repository.attention(NOW, "MX");
        assertThat(attention.overdue()).isEqualTo(baseline.overdue() + 1);
        assertThat(attention.unassigned()).isEqualTo(baseline.unassigned() + 2);
        assertThat(attention.trialsExpired()).isEqualTo(baseline.trialsExpired() + 1);
        assertThat(repository.totals(FROM, NOW, "MX").received()).isZero();
        assertThat(repository.details(FROM, NOW, "MX", "overdue", source, "", "", "", 1, 25).items())
            .singleElement().satisfies(row -> assertThat(row.id()).isEqualTo(old));
    }

    @Test void allRecordsAreCountedBeyondTheInboxLimitAndDetailPaginationUsesTheSameScope() {
        var source = UUID.randomUUID().toString();
        var rows = new ArrayList<Object[]>();
        for (var index = 0; index < 205; index++) rows.add(new Object[]{UUID.randomUUID().toString(), "a".repeat(64),
            "Test", "Report " + index, "test@example.test", source, Timestamp.from(NOW.minus(2, ChronoUnit.DAYS))});
        jdbc.batchUpdate("""
            INSERT INTO platform_leads (submission_id, payload_hash, full_name, company_name, email,
              challenge, source_channel, country, utm_source, contact_consent_at, created_at)
            VALUES (?, ?, ?, ?, ?, 'Test', 'WEBSITE', 'CA', ?, ?, ?)
            """, rows.stream().map(row -> new Object[]{row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[6]}).toList());
        assertThat(repository.totals(FROM, NOW, "CA").received()).isEqualTo(205);
        assertThat(repository.sourceGroups(FROM, NOW, "CA")).isEqualTo(1);
        var page = repository.details(FROM, NOW, "CA", "received", source, "", "", "UNKNOWN", 9, 25);
        assertThat(page.total()).isEqualTo(205);
        assertThat(page.items()).hasSize(5);
        assertThat(repository.details(FROM, NOW, "CA", "received", "missing-source", "", "", "", 1, 25).total()).isZero();
    }

    private long lead(Instant created, String country, String status, String source, Instant next, Instant trialEnd) {
        jdbc.update("""
            INSERT INTO platform_leads (submission_id, payload_hash, full_name, company_name, email, challenge,
              source_channel, country, utm_source, contact_consent_at, created_at, status, next_action_at, trial_ends_at)
            VALUES (?, ?, 'Test', 'Report Company', 'test@example.test', 'Test', 'WEBSITE', ?, ?, ?, ?, ?, ?, ?)
            """, UUID.randomUUID().toString(), "a".repeat(64), country, source, Timestamp.from(created), Timestamp.from(created),
            status, timestamp(next), timestamp(trialEnd));
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private void event(long id, String status, Instant occurred) {
        jdbc.update("INSERT INTO platform_lead_events (lead_id, event_type, to_status, occurred_at) VALUES (?, 'STATUS_CHANGED', ?, ?)",
            id, status, Timestamp.from(occurred));
    }
    private Timestamp timestamp(Instant value) { return value == null ? null : Timestamp.from(value); }
}
