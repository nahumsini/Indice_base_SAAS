package com.indice.erp.platformadmin.leads;

import static com.indice.erp.platformadmin.leads.PlatformLeadAnalyticsContracts.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PlatformLeadAnalyticsRepository {
    private static final String MARKET = """
        CASE WHEN LOWER(TRIM(COALESCE(prospect.country, ''))) IN ('mx', 'mexico', 'méxico', 'mexique') THEN 'MX'
             WHEN LOWER(TRIM(COALESCE(prospect.country, ''))) IN ('ca', 'canada', 'canadá') THEN 'CA'
             ELSE 'OTHER' END
        """;
    private static final String OPEN = "report.status NOT IN ('WON', 'LOST', 'NURTURE')";
    private final JdbcTemplate jdbc;

    public PlatformLeadAnalyticsRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Totals totals(Instant from, Instant now, String market) {
        var query = base(from, now, market);
        return jdbc.queryForObject("""
            SELECT COUNT(*) AS received,
              COALESCE(SUM(first_contact_at IS NOT NULL), 0) AS contacted,
              COALESCE(SUM(scheduled_at IS NOT NULL), 0) AS scheduled,
              COALESCE(SUM(diagnosed_at IS NOT NULL), 0) AS diagnosed,
              COALESCE(SUM(trial_at IS NOT NULL), 0) AS trials,
              COALESCE(SUM(proposed_at IS NOT NULL), 0) AS proposals,
              COALESCE(SUM(won_at IS NOT NULL), 0) AS won,
              COALESCE(SUM(status = 'LOST'), 0) AS lost,
              COALESCE(SUM(status = 'NURTURE'), 0) AS nurture,
              COALESCE(SUM(created_at <= DATE_SUB(measured_at, INTERVAL 24 HOUR)), 0) AS sla_eligible,
              COALESCE(SUM(created_at <= DATE_SUB(measured_at, INTERVAL 24 HOUR)
                AND first_contact_at BETWEEN created_at AND DATE_ADD(created_at, INTERVAL 24 HOUR)), 0) AS sla_met,
              ROUND(AVG(CASE WHEN first_contact_at >= created_at
                THEN TIMESTAMPDIFF(SECOND, created_at, first_contact_at) / 3600.0 END), 2) AS contact_hours
            FROM (
            """ + query.sql() + ") report", (rs, row) -> new Totals(
                rs.getLong("received"), rs.getLong("contacted"), rs.getLong("scheduled"),
                rs.getLong("diagnosed"), rs.getLong("trials"), rs.getLong("proposals"),
                rs.getLong("won"), rs.getLong("lost"), rs.getLong("nurture"),
                rs.getLong("sla_eligible"), rs.getLong("sla_met"), rs.getBigDecimal("contact_hours")),
            query.arguments().toArray());
    }

    public Attention attention(Instant now, String market) {
        var query = base(null, now, market);
        return jdbc.queryForObject("""
            SELECT COALESCE(SUM(next_action_at < measured_at), 0) AS overdue,
              COALESCE(SUM(assigned_admin_id IS NULL), 0) AS unassigned,
              COALESCE(SUM(next_action_at IS NULL), 0) AS missing_action,
              COALESCE(SUM(first_contact_at IS NULL AND created_at <= DATE_SUB(measured_at, INTERVAL 24 HOUR)), 0) AS uncontacted,
              COALESCE(SUM(status = 'TRIAL_ACTIVE' AND trial_ends_at BETWEEN measured_at AND DATE_ADD(measured_at, INTERVAL 3 DAY)), 0) AS trials_ending,
              COALESCE(SUM(status = 'TRIAL_ACTIVE' AND trial_ends_at < measured_at), 0) AS trials_expired
            FROM (
            """ + query.sql() + ") report WHERE " + OPEN, (rs, row) -> new Attention(
                rs.getLong("overdue"), rs.getLong("unassigned"), rs.getLong("missing_action"),
                rs.getLong("uncontacted"), rs.getLong("trials_ending"), rs.getLong("trials_expired")),
            query.arguments().toArray());
    }

    public List<Breakdown> breakdown(Instant from, Instant now, String market, boolean plans) {
        var query = base(from, now, market);
        var group = plans ? "plan" : "source, medium, campaign";
        var dimensions = plans ? "'' AS source, '' AS medium, '' AS campaign, plan"
            : "source, medium, campaign, '' AS plan";
        return jdbc.query("SELECT " + dimensions + """
            , COUNT(*) AS received, SUM(diagnosed_at IS NOT NULL) AS diagnosed,
              SUM(proposed_at IS NOT NULL) AS proposals, SUM(won_at IS NOT NULL) AS won
            FROM (
            """ + query.sql() + ") report GROUP BY " + group + " ORDER BY received DESC, " + group + " LIMIT 20",
            (rs, row) -> new Breakdown(rs.getString("source"), rs.getString("medium"), rs.getString("campaign"),
                rs.getString("plan"), rs.getLong("received"), rs.getLong("diagnosed"), rs.getLong("proposals"),
                rs.getLong("won"), rate(rs.getLong("diagnosed"), rs.getLong("received")),
                rate(rs.getLong("won"), rs.getLong("proposals"))), query.arguments().toArray());
    }

    public long sourceGroups(Instant from, Instant now, String market) {
        var query = base(from, now, market);
        return jdbc.queryForObject("SELECT COUNT(*) FROM (SELECT source, medium, campaign FROM ("
            + query.sql() + ") report GROUP BY source, medium, campaign) groups_count", Long.class,
            query.arguments().toArray());
    }

    public record DetailResult(List<LeadRow> items, long total) { }

    public DetailResult details(Instant from, Instant now, String market, String view,
                                String source, String medium, String campaign, String plan,
                                int page, int pageSize) {
        var query = base(isCurrentView(view) ? null : from, now, market);
        var arguments = new ArrayList<>(query.arguments());
        var filter = new StringBuilder(" WHERE ").append(viewPredicate(view));
        for (var entry : List.of(new String[]{"source", source}, new String[]{"medium", medium},
                                 new String[]{"campaign", campaign}, new String[]{"plan", plan})) {
            if (!entry[1].isEmpty()) {
                filter.append(" AND report.").append(entry[0]).append(" = ?");
                arguments.add(entry[1]);
            }
        }
        var sql = " FROM (" + query.sql() + ") report" + filter;
        var total = jdbc.queryForObject("SELECT COUNT(*)" + sql, Long.class, arguments.toArray());
        arguments.add(pageSize);
        arguments.add((page - 1) * pageSize);
        var order = isCurrentView(view) ? "next_action_at IS NULL, next_action_at, created_at, id"
            : "created_at DESC, id DESC";
        var items = jdbc.query("SELECT *" + sql + " ORDER BY " + order + " LIMIT ? OFFSET ?",
            (rs, row) -> new LeadRow(rs.getLong("id"), rs.getString("company_name"), rs.getString("status"),
                rs.getString("market"), rs.getString("assigned_name"), rs.getString("source"),
                rs.getString("medium"), rs.getString("campaign"), rs.getString("plan"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("next_action_at")),
                instant(rs.getTimestamp("first_contact_at"))), arguments.toArray());
        return new DetailResult(items, total);
    }

    static boolean isCurrentView(String view) {
        return switch (view) {
            case "overdue", "unassigned", "missing_action", "uncontacted", "trial_attention" -> true;
            default -> false;
        };
    }

    private static String viewPredicate(String view) {
        return switch (view) {
            case "received" -> "1 = 1";
            case "contacted" -> "first_contact_at IS NOT NULL";
            case "scheduled" -> "scheduled_at IS NOT NULL";
            case "diagnosed" -> "diagnosed_at IS NOT NULL";
            case "trial" -> "trial_at IS NOT NULL";
            case "proposal" -> "proposed_at IS NOT NULL";
            case "won" -> "won_at IS NOT NULL";
            case "lost" -> "status = 'LOST'";
            case "nurture" -> "status = 'NURTURE'";
            case "sla_missed" -> "created_at <= DATE_SUB(measured_at, INTERVAL 24 HOUR) AND (first_contact_at IS NULL OR first_contact_at NOT BETWEEN created_at AND DATE_ADD(created_at, INTERVAL 24 HOUR))";
            case "overdue" -> OPEN + " AND next_action_at < measured_at";
            case "unassigned" -> OPEN + " AND assigned_admin_id IS NULL";
            case "missing_action" -> OPEN + " AND next_action_at IS NULL";
            case "uncontacted" -> OPEN + " AND first_contact_at IS NULL AND created_at <= DATE_SUB(measured_at, INTERVAL 24 HOUR)";
            case "trial_attention" -> "status = 'TRIAL_ACTIVE' AND trial_ends_at <= DATE_ADD(measured_at, INTERVAL 3 DAY)";
            default -> throw new IllegalArgumentException("Unknown analytics view.");
        };
    }

    private record Query(String sql, List<Object> arguments) { }

    private Query base(Instant from, Instant now, String market) {
        var arguments = new ArrayList<Object>(List.of(Timestamp.from(now), Timestamp.from(now), Timestamp.from(now)));
        var sql = """
            SELECT prospect.id, prospect.company_name, prospect.status, prospect.created_at, prospect.next_action_at,
              prospect.assigned_admin_id, administrator_user.full_name AS assigned_name, prospect.trial_ends_at,
              COALESCE(NULLIF(TRIM(prospect.utm_source), ''), 'unattributed') AS source,
              COALESCE(NULLIF(TRIM(prospect.utm_medium), ''), 'unattributed') AS medium,
              COALESCE(NULLIF(TRIM(prospect.utm_campaign), ''), 'unattributed') AS campaign,
              COALESCE(NULLIF(prospect.plan_interest, ''), 'UNKNOWN') AS plan,
            """ + MARKET + " AS market, ? AS measured_at, " + """
              history.first_contact_at, history.scheduled_at, history.proposed_at, history.won_at,
              COALESCE(prospect.diagnosis_completed_at, history.diagnosed_at) AS diagnosed_at,
              COALESCE(prospect.trial_started_at, history.trial_at) AS trial_at
            FROM platform_leads prospect
            LEFT JOIN platform_administrators administrator ON administrator.id = prospect.assigned_admin_id
            LEFT JOIN users administrator_user ON administrator_user.id = administrator.user_id
            LEFT JOIN (
              SELECT event.lead_id,
                MIN(CASE WHEN event.to_status IN ('CONTACTED', 'DIAGNOSIS_SCHEDULED') THEN event.occurred_at END) AS first_contact_at,
                MIN(CASE WHEN event.to_status = 'DIAGNOSIS_SCHEDULED' THEN event.occurred_at END) AS scheduled_at,
                MIN(CASE WHEN event.to_status = 'DIAGNOSIS_COMPLETED' THEN event.occurred_at END) AS diagnosed_at,
                MIN(CASE WHEN event.to_status = 'TRIAL_ACTIVE' THEN event.occurred_at END) AS trial_at,
                MIN(CASE WHEN event.to_status = 'PROPOSAL' THEN event.occurred_at END) AS proposed_at,
                MIN(CASE WHEN event.to_status = 'WON' THEN event.occurred_at END) AS won_at
              FROM platform_lead_events event WHERE event.occurred_at <= ? GROUP BY event.lead_id
            ) history ON history.lead_id = prospect.id
            WHERE prospect.created_at <= ?
            """;
        if (from != null) { sql += " AND prospect.created_at >= ?"; arguments.add(Timestamp.from(from)); }
        if (!"all".equals(market)) { sql += " AND (" + MARKET + ") = ?"; arguments.add(market); }
        return new Query(sql, arguments);
    }

    static BigDecimal rate(long numerator, long denominator) {
        return denominator == 0 ? null : BigDecimal.valueOf(numerator).multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }

    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
}
