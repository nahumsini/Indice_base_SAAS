package com.indice.erp.sales;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.notifications.AppNotificationService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sales owns scheduling/eligibility; the shared notification service owns inbox delivery. */
@Service
public class OpportunityReminderService {
    static final String EVENT = "sales_call_reminder";
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final AppNotificationService notifications;
    private final FinanceBusinessTimeZoneResolver zones;
    private final Clock clock;

    public OpportunityReminderService(JdbcTemplate db, ModuleAccessService modules,
            TabPermissionAccessService tabs, AppNotificationService notifications,
            FinanceBusinessTimeZoneResolver zones, Clock clock) {
        this.db = db;
        this.modules = modules;
        this.tabs = tabs;
        this.notifications = notifications;
        this.zones = zones;
        this.clock = clock;
    }

    @Transactional
    public void dispatch(long company, long opportunity) {
        // Serialize with edits/deletion as well as other scheduler instances.
        var locks = db.query("SELECT id FROM sales_opportunities WHERE company_id=? AND id=? FOR UPDATE",
                (rs, n) -> rs.getLong(1), company, opportunity);
        if (locks.isEmpty()) return;
        var rows = db.query("""
                SELECT o.next_action_at, o.next_action_scheduled_at, o.next_action_timezone,
                       o.assigned_flow_id, uc.id, uc.user_id, uc.role
                FROM sales_opportunities o
                JOIN user_companies uc ON uc.company_id=o.company_id AND uc.id=o.owner_user_company_id AND uc.status='active'
                WHERE o.company_id=? AND o.id=? AND o.deleted_at IS NULL AND o.lifecycle_status='OPEN'
                  AND o.next_action='call' AND o.status NOT IN ('closed','on_hold')
                """, (rs, n) -> new Pending(
                    rs.getObject(1, LocalDateTime.class),
                    rs.getObject(2, LocalDateTime.class),
                    rs.getString(3), rs.getLong(4), new AuthSessionUser(rs.getLong(6), company,
                        rs.getLong(5), "Sales reminder recipient", rs.getString(7))), company, opportunity);
        if (rows.isEmpty() || !modules.companyCanAccessForMutation(company, "sales")) {
            cancelExcept(db, company, opportunity, null, 0);
            return;
        }
        var row = rows.getFirst();
        if (!modules.canAccess(row.actor(), "sales")
                || !tabs.canAccess(row.actor(), new TabPermissionRequirement(List.of("crm.leads")))) {
            cancelExcept(db, company, opportunity, null, 0);
            return;
        }
        // Adopt existing explicit clock times once, without inventing a time for legacy dates.
        if (row.utc() == null && row.local() != null && !row.local().toLocalTime().equals(LocalTime.MIDNIGHT)) {
            var schedule = new LinkedHashMap<String, Object>();
            schedule.put("nextActionAt", row.local());
            OpportunitySchedule.normalize(schedule, zones.resolve(company));
            db.update("UPDATE sales_opportunities SET next_action_scheduled_at=?, next_action_timezone=? WHERE company_id=? AND id=?",
                    schedule.get("nextActionScheduledAt"), schedule.get("nextActionTimezone"), company, opportunity);
            row = new Pending(row.local(), (LocalDateTime) schedule.get("nextActionScheduledAt"),
                    (String) schedule.get("nextActionTimezone"), row.flow(), row.actor());
        }
        String key = row.utc() == null ? null : eventKey(opportunity, row.utc());
        cancelExcept(db, company, opportunity, key, row.actor().userCompanyId());
        if (row.utc() == null) return;
        var due = row.utc().toInstant(ZoneOffset.UTC);
        var now = clock.instant();
        if (!due.isAfter(now) || due.isAfter(now.plusSeconds(3600))) return;
        // The durable inbox row is the receipt. Never republish a read/dismissed/cancelled event.
        if (db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND recipient_user_company_id=? AND event_key=?",
                Integer.class, company, row.actor().userCompanyId(), key) > 0) return;
        String when = row.local().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) + " · " + row.zone();
        String url = "/sales/leads?flow=" + row.flow()
                + "&view=table&focus=all&period=all&stage=all&owner=all&temperature=all&source=all&q=&page=1"
                + "&opportunity=" + opportunity;
        notifications.publish(new AppNotificationEvent(company, row.actor().userCompanyId(), "sales", "opportunity",
                opportunity, EVENT, key, "Siguiente acción · Llamada próxima", when, url));
    }

    static String eventKey(long opportunity, LocalDateTime utc) {
        return "sales:call:" + opportunity + ":" + utc.toInstant(ZoneOffset.UTC);
    }

    /** Called inside the existing opportunity mutation transaction; retains notification history. */
    static void cancelObsolete(JdbcTemplate db, long company, long opportunity) {
        var current = db.query("""
                SELECT next_action_scheduled_at, owner_user_company_id FROM sales_opportunities
                WHERE company_id=? AND id=? AND deleted_at IS NULL AND lifecycle_status='OPEN'
                  AND next_action='call' AND status NOT IN ('closed','on_hold')
                """, (rs, n) -> rs.getObject(1, LocalDateTime.class) == null ? null
                        : new Current(rs.getObject(1, LocalDateTime.class), rs.getLong(2)), company, opportunity);
        var row = current.isEmpty() ? null : current.getFirst();
        cancelExcept(db, company, opportunity, row == null ? null : eventKey(opportunity, row.utc()),
                row == null ? 0 : row.recipient());
    }

    private static void cancelExcept(JdbcTemplate db, long company, long opportunity, String key, long recipient) {
        db.update("""
                UPDATE app_notifications SET status='cancelled'
                WHERE company_id=? AND source_module='sales' AND source_type='opportunity' AND source_id=?
                  AND event_type=? AND status<>'cancelled'
                  AND (? IS NULL OR event_key<>? OR recipient_user_company_id<>?)
                """, company, opportunity, EVENT, key, key, recipient);
    }

    private record Current(LocalDateTime utc, long recipient) { }
    private record Pending(LocalDateTime local, LocalDateTime utc, String zone, long flow, AuthSessionUser actor) { }
}
