package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.notifications.AppNotificationService;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = "app.sales.call-reminder-initial-delay-ms=86400000")
@Transactional
class OpportunityReminderIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired SalesService sales;
    @Autowired AppNotificationService notifications;
    @Autowired FinanceBusinessTimeZoneResolver zones;
    @Autowired PlatformTransactionManager transactions;
    ModuleAccessService modules;
    TabPermissionAccessService tabs;
    OpportunityReminderService reminders;
    Instant now = Instant.parse("2026-10-18T14:00:00Z");
    long company, user, recipient, opportunity;

    @BeforeEach void setup() {
        modules = mock(ModuleAccessService.class);
        tabs = mock(TabPermissionAccessService.class);
        when(modules.companyCanAccessForMutation(anyLong(), eq("sales"))).thenReturn(true);
        when(modules.canAccess(any(), eq("sales"))).thenReturn(true);
        when(tabs.canAccess(any(), any())).thenReturn(true);
        reminders = new OpportunityReminderService(db, modules, tabs, notifications, zones, Clock.fixed(now, ZoneOffset.UTC));
        String key = UUID.randomUUID().toString();
        db.update("INSERT INTO companies(name) VALUES(?)", key);
        company = db.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, key);
        user = db.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'admin','active','all')", company, user);
        recipient = db.queryForObject("SELECT id FROM user_companies WHERE company_id=?", Long.class, company);
        var saved = sales.create(company, user, "opportunities", new LinkedHashMap<>(Map.of(
                "opportunityName", "Reminder test", "ownerUserCompanyId", recipient, "nextAction", "call",
                "nextActionAt", "2026-10-18 11:00", "status", "active")));
        opportunity = ((Number) saved.get("id")).longValue();
    }

    @Test void deliversAtOneHourNeverEarlyAndSurvivesRestartWithoutRevivingDismissedNotice() {
        setTime(now.plusSeconds(3601)); dispatch(company);
        assertThat(count()).isZero();
        setTime(now.plusSeconds(3600)); dispatch(company);
        assertThat(count()).isEqualTo(1);
        var note = db.queryForMap("SELECT * FROM app_notifications WHERE company_id=?", company);
        assertThat(note).containsEntry("recipient_user_company_id", recipient).containsEntry("source_id", opportunity);
        assertThat(note.get("action_url").toString()).contains("opportunity=" + opportunity);
        db.update("UPDATE app_notifications SET read_at=UTC_TIMESTAMP(), dismissed_at=UTC_TIMESTAMP() WHERE company_id=?", company);
        reminders = new OpportunityReminderService(db, modules, tabs, notifications, zones, Clock.fixed(now, ZoneOffset.UTC));
        dispatch(company); dispatch(company);
        assertThat(count()).isEqualTo(1);
        assertThat(db.queryForObject("SELECT dismissed_at IS NOT NULL FROM app_notifications WHERE company_id=?", Boolean.class, company)).isTrue();
    }

    @Test void lateSchedulingNotifiesOnceButPastCallsNeverNotify() {
        setTime(now.minusSeconds(1)); dispatch(company); assertThat(count()).isZero();
        setTime(now); dispatch(company); assertThat(count()).isZero();
        setTime(now.plusSeconds(10)); dispatch(company); dispatch(company); assertThat(count()).isEqualTo(1);
    }

    @Test void scheduleRoundTripClearingAndReprogrammingInvalidateThePreviousReminder() {
        dispatch(company); assertThat(count()).isEqualTo(1);
        var saved = sales.update(company, user, "opportunities", opportunity, Map.of("nextActionAt", "2026-10-18 10:30"));
        assertThat(saved.get("nextActionAt").toString()).contains("10:30");
        assertThat(saved.get("nextActionScheduledAt").toString()).contains("14:30");
        assertThat(activeCount()).isZero();
        dispatch(company); assertThat(activeCount()).isEqualTo(1); assertThat(count()).isEqualTo(2);
        sales.update(company, user, "opportunities", opportunity, Map.of("nextActionAt", ""));
        dispatch(company); assertThat(activeCount()).isZero();
        assertThat(sales.get(company, "opportunities", opportunity).get("nextActionAt")).isNull();
        sales.update(company, user, "opportunities", opportunity, Map.of("nextActionAt", "2026-10-19"));
        assertThat(sales.get(company, "opportunities", opportunity).get("nextActionScheduledAt")).isNull();
    }

    @Test void changedActionClosedStageAndDeletedOpportunityCancelReminders() {
        dispatch(company);
        sales.update(company, user, "opportunities", opportunity, Map.of("nextAction", "email"));
        assertThat(activeCount()).isZero();
        sales.update(company, user, "opportunities", opportunity, Map.of("nextAction", "call", "nextActionAt", "2026-10-18 10:30"));
        dispatch(company); assertThat(activeCount()).isEqualTo(1);
        sales.update(company, user, "opportunities", opportunity, Map.of("stage", "won"));
        dispatch(company); assertThat(activeCount()).isZero();
        db.update("UPDATE sales_opportunities SET lifecycle_status='OPEN',next_action_scheduled_at=? WHERE company_id=? AND id=?", LocalDateTime.ofInstant(now.plusSeconds(600), ZoneOffset.UTC), company, opportunity);
        dispatch(company); assertThat(activeCount()).isEqualTo(1);
        sales.delete(company, "opportunities", opportunity);
        assertThat(activeCount()).isZero();
    }

    @Test void wrongTenantMissingOwnerAndInactiveOrUnauthorizedRecipientCannotReceive() {
        dispatch(company + 999999); assertThat(count()).isZero();
        when(modules.companyCanAccessForMutation(company, "sales")).thenReturn(false);
        dispatch(company); assertThat(count()).isZero();
        when(modules.companyCanAccessForMutation(company, "sales")).thenReturn(true);
        when(modules.canAccess(any(), eq("sales"))).thenReturn(false);
        dispatch(company); assertThat(count()).isZero();
        when(modules.canAccess(any(), eq("sales"))).thenReturn(true);
        when(tabs.canAccess(any(), any())).thenReturn(false);
        dispatch(company); assertThat(count()).isZero();
        when(tabs.canAccess(any(), any())).thenReturn(true);
        db.update("UPDATE user_companies SET status='inactive' WHERE company_id=? AND id=?", company, recipient);
        dispatch(company); assertThat(count()).isZero();
        db.update("UPDATE sales_opportunities SET owner_user_company_id=NULL WHERE company_id=? AND id=?", company, opportunity);
        dispatch(company); assertThat(count()).isZero();
    }

    @Test void reassigningToAnActiveOwnerCancelsOldRecipientAndCreatesOneNewNotice() {
        dispatch(company);
        String email = UUID.randomUUID() + "@example.com";
        db.update("INSERT INTO users(full_name,email,password_hash) VALUES('Test recipient',?,'test-only-no-login')", email);
        long otherUser = db.queryForObject("SELECT id FROM users WHERE email=?", Long.class, email);
        db.update("INSERT INTO user_companies(company_id,user_id,role,status,visibility) VALUES(?,?,'admin','active','all')", company, otherUser);
        long other = db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?", Long.class, company, otherUser);
        sales.update(company, user, "opportunities", opportunity, Map.of("ownerUserCompanyId", other));
        assertThat(activeCount()).isZero(); dispatch(company);
        assertThat(activeCount()).isEqualTo(1);
        assertThat(db.queryForObject("SELECT recipient_user_company_id FROM app_notifications WHERE company_id=? AND status<>'cancelled'", Long.class, company)).isEqualTo(other);
    }

    @Test void legacyExplicitTimesAreAdoptedButDateOnlyMidnightIsNotInvented() {
        db.update("UPDATE sales_opportunities SET next_action_scheduled_at=NULL,next_action_timezone=NULL,next_action_at='2026-10-18 00:00:00' WHERE company_id=? AND id=?", company, opportunity);
        dispatch(company); assertThat(count()).isZero();
        db.update("UPDATE sales_opportunities SET next_action_at='2026-10-18 10:30:00' WHERE company_id=? AND id=?", company, opportunity);
        dispatch(company); assertThat(count()).isEqualTo(1);
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void simultaneousWorkersUseOneDurableReceipt() throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            var tasks = List.of(pool.submit(() -> { start.await(); dispatch(company); return true; }),
                    pool.submit(() -> { start.await(); dispatch(company); return true; }));
            start.countDown();
            for (var task : tasks) task.get(15, TimeUnit.SECONDS);
        }
        assertThat(count()).isEqualTo(1);
    }

    @Test void schedulerFindsDueRecordsWithoutAnyBrowserRequest() {
        setTime(Instant.now().plusSeconds(1200));
        var dispatcher = mock(OpportunityReminderService.class);
        new OpportunityReminderScheduler(db, dispatcher).dispatch();
        verify(dispatcher).dispatch(company, opportunity);
    }

    void dispatch(long tenant) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> reminders.dispatch(tenant, opportunity));
    }
    void setTime(Instant due) {
        db.update("UPDATE sales_opportunities SET next_action_scheduled_at=? WHERE company_id=? AND id=?",
                LocalDateTime.ofInstant(due, ZoneOffset.UTC), company, opportunity);
    }
    int count() { return db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND event_type='sales_call_reminder'", Integer.class, company); }
    int activeCount() { return db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND event_type='sales_call_reminder' AND status<>'cancelled'", Integer.class, company); }
}
