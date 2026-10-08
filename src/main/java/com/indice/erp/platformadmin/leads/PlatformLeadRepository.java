package com.indice.erp.platformadmin.leads;

import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Assignee;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Event;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Page;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Summary;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PlatformLeadRepository {
    private static final String SELECT = """
        SELECT lead_row.*, administrator_user.full_name AS assigned_name
        FROM platform_leads lead_row
        LEFT JOIN platform_administrators administrator ON administrator.id = lead_row.assigned_admin_id
        LEFT JOIN users administrator_user ON administrator_user.id = administrator.user_id
        """;

    private static final RowMapper<Summary> SUMMARY_MAPPER = (rs, rowNum) -> new Summary(
        rs.getLong("id"), rs.getString("full_name"), rs.getString("company_name"),
        rs.getString("email"), rs.getString("phone"), rs.getString("country"),
        rs.getString("challenge"), rs.getString("landing_path"), rs.getString("source_channel"),
        rs.getString("utm_source"), rs.getString("utm_medium"), rs.getString("utm_campaign"),
        rs.getString("plan_interest"),
        rs.getString("status"), rs.getObject("assigned_admin_id", Long.class),
        rs.getString("assigned_name"), instant(rs.getTimestamp("next_action_at")),
        instant(rs.getTimestamp("diagnosis_completed_at")), instant(rs.getTimestamp("trial_started_at")),
        instant(rs.getTimestamp("trial_ends_at")), instant(rs.getTimestamp("created_at")),
        instant(rs.getTimestamp("updated_at")), rs.getInt("version")
    );

    private final JdbcTemplate jdbc;

    public PlatformLeadRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Long findIdBySubmission(String submissionId) {
        var ids = jdbc.query("SELECT id FROM platform_leads WHERE submission_id = ?", (rs, rowNum) -> rs.getLong(1), submissionId);
        return ids.isEmpty() ? null : ids.getFirst();
    }

    public String payloadHash(long id) {
        return jdbc.queryForObject("SELECT payload_hash FROM platform_leads WHERE id = ?", String.class, id);
    }

    public long insert(String submissionId, String payloadHash, PlatformLeadContracts.Submission input, Instant now) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO platform_leads (
                    submission_id, payload_hash, full_name, company_name, email, phone, country,
                    challenge, landing_path, source_channel, utm_source, utm_medium, utm_campaign,
                    plan_interest, contact_consent_at, next_action_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, submissionId);
            statement.setString(2, payloadHash);
            statement.setString(3, input.fullName());
            statement.setString(4, input.companyName());
            statement.setString(5, input.email());
            statement.setString(6, input.phone());
            statement.setString(7, input.country());
            statement.setString(8, input.challenge());
            statement.setString(9, input.landingPath());
            statement.setString(10, input.sourceChannel());
            statement.setString(11, input.utmSource());
            statement.setString(12, input.utmMedium());
            statement.setString(13, input.utmCampaign());
            statement.setString(14, input.planInterest());
            statement.setTimestamp(15, Timestamp.from(now));
            statement.setTimestamp(16, Timestamp.from(now.plus(Duration.ofDays(1))));
            return statement;
        }, key);
        return key.getKey().longValue();
    }

    public Page list(String query, String status, int limit) {
        var filter = " WHERE (? = '' OR lead_row.status = ?) AND (? = '' OR lead_row.full_name LIKE ? OR lead_row.company_name LIKE ? OR lead_row.email LIKE ?)";
        var like = "%" + query + "%";
        var items = jdbc.query(SELECT + filter + " ORDER BY lead_row.created_at DESC, lead_row.id DESC LIMIT ?",
            SUMMARY_MAPPER, status, status, query, like, like, like, limit);
        var total = jdbc.queryForObject("SELECT COUNT(*) FROM platform_leads lead_row" + filter,
            Long.class, status, status, query, like, like, like);
        return new Page(items, total == null ? 0 : total);
    }

    public Summary find(long id) {
        var rows = jdbc.query(SELECT + " WHERE lead_row.id = ?", SUMMARY_MAPPER, id);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public List<Event> events(long id) {
        return jdbc.query("""
            SELECT event.id, event.event_type, event.from_status, event.to_status,
                   event.note, event.occurred_at, actor.full_name AS actor_name
            FROM platform_lead_events event
            LEFT JOIN users actor ON actor.id = event.actor_user_id
            WHERE event.lead_id = ? ORDER BY event.occurred_at DESC, event.id DESC
            """, (rs, rowNum) -> new Event(rs.getLong("id"), rs.getString("event_type"),
                rs.getString("from_status"), rs.getString("to_status"), rs.getString("note"),
                rs.getString("actor_name"), instant(rs.getTimestamp("occurred_at"))), id);
    }

    public boolean activeAssignee(long id) {
        var count = jdbc.queryForObject("SELECT COUNT(*) FROM platform_administrators WHERE id = ? AND status = 'ACTIVE'",
            Integer.class, id);
        return count != null && count > 0;
    }

    public List<Assignee> assignees() {
        return jdbc.query("""
            SELECT administrator.id, user.full_name, user.email
            FROM platform_administrators administrator
            JOIN users user ON user.id = administrator.user_id
            WHERE administrator.status = 'ACTIVE'
            ORDER BY user.full_name, user.email
            """, (rs, rowNum) -> new Assignee(rs.getLong("id"), rs.getString("full_name"), rs.getString("email")));
    }

    public boolean update(long id, int version, String status, Long assignedAdminId, Instant nextActionAt,
                          Instant diagnosisCompletedAt, Instant trialStartedAt, Instant trialEndsAt) {
        return jdbc.update("""
            UPDATE platform_leads
            SET status = ?, assigned_admin_id = ?, next_action_at = ?,
                diagnosis_completed_at = ?, trial_started_at = ?, trial_ends_at = ?,
                version = version + 1
            WHERE id = ? AND version = ?
            """, status, assignedAdminId, timestamp(nextActionAt), timestamp(diagnosisCompletedAt),
            timestamp(trialStartedAt), timestamp(trialEndsAt), id, version) == 1;
    }

    public void event(long leadId, Long actorUserId, String type, String from, String to, String note) {
        jdbc.update("""
            INSERT INTO platform_lead_events (lead_id, actor_user_id, event_type, from_status, to_status, note)
            VALUES (?, ?, ?, ?, ?, ?)
            """, leadId, actorUserId, type, from, to, note);
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
