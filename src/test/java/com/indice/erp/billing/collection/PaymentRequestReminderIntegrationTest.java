package com.indice.erp.billing.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.notifications.AppNotificationService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
    "app.billing.collection.reminders-enabled=false",
    "app.billing.collection.email-enabled=false",
    "app.email.enabled=false"
})
class PaymentRequestReminderIntegrationTest {
    private static final String PREFIX = "collection-reminder-test-";
    @Autowired private JdbcTemplate jdbc;
    @Autowired private TransactionTemplate transactions;
    private PaymentRequestReminderRepository repository;
    @Autowired private AppNotificationService notifications;
    private PaymentRequestReminderEmailService email;
    private PaymentRequestReminderService worker;
    private MutableClock clock;

    @BeforeEach
    void setUp() {
        clean();
        clock = new MutableClock(Instant.parse("2026-09-08T12:00:00Z"));
        repository = new PaymentRequestReminderRepository(jdbc, transactions, new PaymentCollectionProtectionService(jdbc, clock));
        email = mock(PaymentRequestReminderEmailService.class);
        when(email.send(any())).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return new PaymentRequestReminderEmailService.DeliveryResult(true, "test-provider-message", null);
        });
        worker = worker(true, true);
    }

    @AfterEach
    void tearDown() { clean(); }

    @Test
    void immediateAndSevenDailySlotsAreDurableAndIdempotent() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        assertThat(count(fixture, null)).isEqualTo(14);

        for (var day = 0; day < 7; day++) {
            worker.processDue();
            worker.processDue();
            assertThat(count(fixture, "SENT")).isEqualTo((day + 1) * 2);
            clock.advance(1, ChronoUnit.DAYS);
        }
        worker.processDue();
        verify(email, times(7)).send(any());
        assertThat(notificationCount(fixture)).isEqualTo(7);
    }

    @Test
    void defaultsLeaveWorkQueuedAndEmailCanBeDisabledIndependently() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        worker(false, false).processDue();
        assertThat(count(fixture, "PENDING")).isEqualTo(14);
        worker(true, false).processDue();
        assertThat(count(fixture, "SENT")).isEqualTo(1);
        assertThat(notificationCount(fixture)).isEqualTo(1);
        verifyNoInteractions(email);
    }

    @Test
    void failedEmailRetriesTheSameDailySlotWithoutDuplicatingItsInAppNotice() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        when(email.send(any())).thenReturn(PaymentRequestReminderEmailService.DeliveryResult.failure("EMAIL_PROVIDER_HTTP_503"))
            .thenReturn(new PaymentRequestReminderEmailService.DeliveryResult(true, "accepted-after-retry", null));
        worker.processDue();
        assertThat(count(fixture, "FAILED")).isEqualTo(1);
        worker.processDue();
        verify(email, times(1)).send(any());
        clock.advance(61, ChronoUnit.SECONDS);
        worker.processDue();
        var sent = ArgumentCaptor.forClass(PaymentRequestReminderRepository.Dispatch.class);
        verify(email, times(2)).send(sent.capture());
        assertThat(sent.getAllValues().getFirst().deliveryKey()).isEqualTo(sent.getAllValues().getLast().deliveryKey());
        assertThat(count(fixture, "SENT")).isEqualTo(2);
        assertThat(notificationCount(fixture)).isEqualTo(1);
    }

    @Test
    void extendingTheWindowCancelsAClaimedOldReminderAndRestartsSevenSlots() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        var claim = repository.claim(emailCandidate(fixture), clock.instant());
        clock.advance(2, ChronoUnit.DAYS);
        jdbc.update("""
            UPDATE company_payment_requests SET window_version = 2, started_at = ?, deadline_at = ?
            WHERE id = ? AND company_id = ?
            """, ts(clock.instant()), ts(clock.instant().plus(7, ChronoUnit.DAYS)), fixture.requestId(), fixture.companyId());
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        assertThat(repository.prepareDispatch(claim, clock.instant())).isNull();
        repository.complete(claim, clock.instant(), true, "stale-message", null);
        assertThat(count(fixture, "SKIPPED")).isEqualTo(14);
        worker.processDue();
        assertThat(count(fixture, "SENT")).isEqualTo(2);
        assertThat(count(fixture, null)).isEqualTo(28);
        verify(email, times(1)).send(any());
    }

    @Test
    void paymentBetweenClaimAndDispatchPreventsSendingAndStaleCompletion() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        var claim = repository.claim(emailCandidate(fixture), clock.instant());
        jdbc.update("UPDATE company_payment_requests SET status = 'PAID', paid_at = ? WHERE id = ? AND company_id = ?",
            ts(clock.instant()), fixture.requestId(), fixture.companyId());
        assertThat(repository.prepareDispatch(claim, clock.instant())).isNull();
        repository.complete(claim, clock.instant(), true, "stale-message", null);
        worker.processDue();
        verifyNoInteractions(email);
        assertThat(count(fixture, "SENT")).isZero();
        assertThat(notificationCount(fixture)).isZero();
    }

    @Test
    void expiredLeaseCanBeReclaimedButOldWorkerCannotCompleteIt() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        var candidate = emailCandidate(fixture);
        var first = repository.claim(candidate, clock.instant());
        assertThat(repository.claim(candidate, clock.instant())).isNull();
        clock.advance(121, ChronoUnit.SECONDS);
        var second = repository.claim(candidate, clock.instant());
        assertThat(second.leaseToken()).isNotEqualTo(first.leaseToken());
        repository.complete(first, clock.instant(), true, "stale", null);
        assertThat(deliveryStatus(candidate)).isEqualTo("PROCESSING");
        repository.complete(second, clock.instant(), true, "current", null);
        assertThat(deliveryStatus(candidate)).isEqualTo("SENT");
    }

    @Test
    void dispatchResolvesTheCurrentOwnerRatherThanThePayerSnapshot() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        var claim = repository.claim(emailCandidate(fixture), clock.instant());
        var newOwner = owner(fixture.companyId());
        jdbc.update("UPDATE company_ownerships SET owner_user_id = ?, owner_user_company_id = ? WHERE company_id = ?",
            newOwner.userId(), newOwner.membershipId(), fixture.companyId());
        var dispatch = repository.prepareDispatch(claim, clock.instant());
        assertThat(dispatch.owner().userId()).isEqualTo(newOwner.userId());
        assertThat(dispatch.owner().email()).isEqualTo(newOwner.email());
        assertThat(dispatch.owner().userId()).isNotEqualTo(fixture.owner().userId());
    }

    @Test
    void unavailableOwnerIsVisibleAndRetryableInsteadOfSendingToAFormerOwner() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        jdbc.update("UPDATE user_companies SET status = 'inactive' WHERE id = ?", fixture.owner().membershipId());
        worker.processDue();
        assertThat(count(fixture, "FAILED")).isEqualTo(2);
        verifyNoInteractions(email);
        jdbc.update("UPDATE user_companies SET status = 'active' WHERE id = ?", fixture.owner().membershipId());
        clock.advance(301, ChronoUnit.SECONDS);
        worker.processDue();
        assertThat(count(fixture, "SENT")).isEqualTo(2);
    }

    @Test
    void restartSkipsMissedDaysAndDeadlineStopsAllRemainingDeliveries() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        clock.advance(3, ChronoUnit.DAYS);
        worker.processDue();
        assertThat(count(fixture, "SKIPPED")).isEqualTo(6);
        assertThat(count(fixture, "SENT")).isEqualTo(2);
        clock.advance(4, ChronoUnit.DAYS);
        worker.processDue();
        assertThat(count(fixture, "SKIPPED")).isEqualTo(12);
        verify(email, times(1)).send(any());
    }

    @Test
    void candidateCannotClaimAnotherCompanysDelivery() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        var other = fixture();
        var candidate = emailCandidate(fixture);
        var forged = new PaymentRequestReminderRepository.Candidate(candidate.id(), other.companyId(), candidate.requestId());
        assertThat(repository.claim(forged, clock.instant())).isNull();
        assertThat(deliveryStatus(candidate)).isEqualTo("PENDING");
    }

    @Test
    void indefiniteBenefitGrantedAfterClaimSuppressesDeliveryWithoutCreatingAnotherCampaign() {
        var fixture = fixture();
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        var claim = repository.claim(emailCandidate(fixture), clock.instant());
        benefit(fixture, null);
        assertThat(repository.prepareDispatch(claim, clock.instant())).isNull();
        worker.processDue();
        verifyNoInteractions(email);
        assertThat(notificationCount(fixture)).isZero();
        assertThat(count(fixture, "SKIPPED")).isEqualTo(2);
        clock.advance(1, ChronoUnit.DAYS);
        worker.processDue();
        assertThat(count(fixture, "SKIPPED")).isEqualTo(4);
        jdbc.update("UPDATE company_benefit_grants SET status = 'REVOKED' WHERE company_id = ?", fixture.companyId());
        clock.advance(1, ChronoUnit.DAYS);
        worker.processDue();
        verify(email, times(1)).send(any());
        assertThat(count(fixture, null)).isEqualTo(14);
    }

    @Test
    void finiteBenefitExtendsTheMessageDeadlineButNotTheOriginalSevenReminderSlots() {
        var fixture = fixture();
        var promisedUntil = clock.instant().plus(10, ChronoUnit.DAYS);
        worker.enqueueWindow(fixture.companyId(), fixture.requestId());
        benefit(fixture, promisedUntil);
        worker.processDue();
        var dispatch = ArgumentCaptor.forClass(PaymentRequestReminderRepository.Dispatch.class);
        verify(email).send(dispatch.capture());
        assertThat(dispatch.getValue().deadlineAt()).isEqualTo(promisedUntil);
        assertThat(jdbc.queryForObject("SELECT description FROM app_notifications WHERE company_id = ? AND source_type = 'payment_request'", String.class, fixture.companyId()))
            .contains(promisedUntil.toString());
        assertThat(jdbc.queryForObject("SELECT deadline_at FROM company_payment_requests WHERE company_id = ? AND id = ?", Timestamp.class,
            fixture.companyId(), fixture.requestId()).toInstant()).isEqualTo(clock.instant().plus(7, ChronoUnit.DAYS));
        clock.advance(7, ChronoUnit.DAYS);
        worker.processDue();
        verify(email, times(1)).send(any());
        assertThat(count(fixture, null)).isEqualTo(14);
        assertThat(count(fixture, "SKIPPED")).isEqualTo(12);
    }

    private PaymentRequestReminderService worker(boolean enabled, boolean sendEmail) {
        return new PaymentRequestReminderService(repository, email, notifications, transactions, clock, enabled, sendEmail);
    }

    private Fixture fixture() {
        var suffix = UUID.randomUUID().toString().replace("-", "");
        jdbc.update("INSERT INTO companies(name) VALUES (?)", PREFIX + suffix);
        var companyId = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, PREFIX + suffix);
        var owner = owner(companyId);
        jdbc.update("INSERT INTO company_ownerships(company_id, owner_user_id, owner_user_company_id) VALUES (?, ?, ?)",
            companyId, owner.userId(), owner.membershipId());
        jdbc.update("""
            INSERT INTO company_payment_requests
                (public_reference, company_id, kind, started_at, deadline_at, reason, payer_name, payer_email,
                 amount_cents, currency, stripe_mode, quote_token, created_by_user_id)
            VALUES (?, ?, 'ACTIVATION', ?, ?, 'Reminder test', 'Old snapshot', 'old-snapshot@example.test',
                    9900, 'USD', 'TEST', ?, ?)
            """, suffix, companyId, ts(clock.instant()), ts(clock.instant().plus(7, ChronoUnit.DAYS)),
            suffix + suffix, owner.userId());
        var requestId = jdbc.queryForObject("SELECT id FROM company_payment_requests WHERE public_reference = ?", Long.class, suffix);
        return new Fixture(companyId, requestId, owner);
    }

    private Owner owner(long companyId) {
        var email = PREFIX + UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users(email, password_hash, full_name) VALUES (?, 'test-only-hash', 'Current Owner')", email);
        var userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO user_companies(user_id, company_id, role, status, visibility) VALUES (?, ?, 'owner', 'active', 'all')",
            userId, companyId);
        var membershipId = jdbc.queryForObject("SELECT id FROM user_companies WHERE user_id = ? AND company_id = ?",
            Long.class, userId, companyId);
        return new Owner(userId, membershipId, email);
    }

    private void benefit(Fixture fixture, Instant end) {
        var reference = UUID.randomUUID().toString().replace("-", "");
        jdbc.update("""
            INSERT INTO company_benefit_grants(public_reference, company_id, benefit_type, source_type, status,
                starts_at, ends_at, reason, idempotency_key_hash, created_by_user_id)
            VALUES (?, ?, 'PRODUCT', 'COURTESY', 'ACTIVE', ?, ?, 'Reminder protection regression', ?, ?)
            """, reference, fixture.companyId(), ts(clock.instant().minus(1, ChronoUnit.HOURS)),
            end == null ? null : ts(end), reference + reference, fixture.owner().userId());
    }

    private PaymentRequestReminderRepository.Candidate emailCandidate(Fixture fixture) {
        var id = jdbc.queryForObject("""
            SELECT id FROM company_payment_request_deliveries
            WHERE company_id = ? AND request_id = ? AND channel = 'EMAIL' AND window_version = 1 AND slot_index = 0
            """, Long.class, fixture.companyId(), fixture.requestId());
        return new PaymentRequestReminderRepository.Candidate(id, fixture.companyId(), fixture.requestId());
    }

    private int count(Fixture fixture, String status) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM company_payment_request_deliveries WHERE company_id = ? AND request_id = ?"
            + (status == null ? "" : " AND status = ?"), Integer.class,
            status == null ? new Object[] {fixture.companyId(), fixture.requestId()}
                : new Object[] {fixture.companyId(), fixture.requestId(), status});
    }

    private int notificationCount(Fixture fixture) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id = ? AND source_type = 'payment_request'",
            Integer.class, fixture.companyId());
    }

    private String deliveryStatus(PaymentRequestReminderRepository.Candidate candidate) {
        return jdbc.queryForObject("SELECT status FROM company_payment_request_deliveries WHERE id = ? AND company_id = ?",
            String.class, candidate.id(), candidate.companyId());
    }

    private Timestamp ts(Instant instant) { return Timestamp.from(instant); }

    private void clean() {
        for (var table : new String[] {"company_payment_request_deliveries", "company_payment_request_events",
                "company_payment_requests", "app_notifications", "company_benefit_grants", "company_ownerships", "user_companies"}) {
            jdbc.update("DELETE FROM " + table + " WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", PREFIX + "%");
        }
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", PREFIX + "%");
    }

    private record Fixture(long companyId, long requestId, Owner owner) {}
    private record Owner(long userId, long membershipId, String email) {}
    private static final class MutableClock extends Clock {
        private Instant now;
        private MutableClock(Instant now) { this.now = now; }
        void advance(long amount, ChronoUnit unit) { now = now.plus(amount, unit); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
