package com.indice.erp.internaldevelopment;

import static com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Entry;
import static com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Filters;
import static com.indice.erp.internaldevelopment.InternalDevelopmentContracts.History;
import static com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Member;
import static com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Participant;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class InternalDevelopmentRepository {

    private final JdbcTemplate jdbc;

    InternalDevelopmentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    List<Member> listRootMembers() {
        return jdbc.query(
            """
                SELECT DISTINCT administrator.user_id,
                       COALESCE(NULLIF(account_user.full_name, ''), account_user.email) AS name,
                       account_user.email
                FROM platform_administrators administrator
                JOIN users account_user ON account_user.id = administrator.user_id
                WHERE administrator.status = 'ACTIVE'
                  AND administrator.platform_role = 'PLATFORM_ROOT'
                ORDER BY name, account_user.email
                """,
            (rs, rowNum) -> new Member(rs.getLong("user_id"), rs.getString("name"), rs.getString("email"))
        );
    }

    List<Entry> list(Filters filters, int limit) {
        var where = filterClause(filters);
        var params = new ArrayList<>(where.params());
        params.add(limit);
        var entries = jdbc.query(
            entrySelect() + where.sql() + " ORDER BY entry.event_at DESC, entry.id DESC LIMIT ?",
            this::mapEntry,
            params.toArray()
        );
        return attachParticipants(entries);
    }

    long count(Filters filters) {
        var where = filterClause(filters);
        var value = jdbc.queryForObject(
            "SELECT COUNT(*) FROM internal_development_entries entry" + where.sql(),
            Long.class,
            where.params().toArray()
        );
        return value == null ? 0 : value;
    }

    Entry find(long entryId) {
        var rows = jdbc.query(
            entrySelect() + " WHERE entry.id = ? LIMIT 1",
            this::mapEntry,
            entryId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Internal development entry was not found.");
        }
        return attachParticipants(rows).getFirst();
    }

    long insert(long actorUserId, ValidatedEntry value, String temporaryFolio) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO internal_development_entries (
                        folio, entry_type, area, status, title, summary, details, decisions,
                        next_steps, event_at, period_start, period_end, location, reference_url,
                        owner_user_id, related_entry_id, created_by_user_id, updated_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, temporaryFolio);
            statement.setString(2, value.entryType());
            statement.setString(3, value.area());
            statement.setString(4, value.status());
            statement.setString(5, value.title());
            statement.setString(6, value.summary());
            statement.setString(7, value.details());
            statement.setString(8, value.decisions());
            statement.setString(9, value.nextSteps());
            statement.setTimestamp(10, Timestamp.from(value.eventAt()));
            statement.setObject(11, value.periodStart());
            statement.setObject(12, value.periodEnd());
            statement.setString(13, value.location());
            statement.setString(14, value.referenceUrl());
            statement.setLong(15, value.ownerUserId());
            if (value.relatedEntryId() == null) statement.setNull(16, java.sql.Types.BIGINT);
            else statement.setLong(16, value.relatedEntryId());
            statement.setLong(17, actorUserId);
            statement.setLong(18, actorUserId);
            return statement;
        }, keyHolder);
        var key = keyHolder.getKey();
        if (key == null) throw new IllegalStateException("The created registry entry could not be identified.");
        return key.longValue();
    }

    void assignFolio(long entryId, String folio) {
        jdbc.update("UPDATE internal_development_entries SET folio = ? WHERE id = ?", folio, entryId);
    }

    boolean update(long entryId, long actorUserId, int expectedVersion, ValidatedEntry value) {
        return jdbc.update(
            """
                UPDATE internal_development_entries
                SET entry_type = ?, area = ?, status = ?, title = ?, summary = ?, details = ?,
                    decisions = ?, next_steps = ?, event_at = ?, period_start = ?, period_end = ?,
                    location = ?, reference_url = ?, owner_user_id = ?, related_entry_id = ?,
                    updated_by_user_id = ?, version = version + 1
                WHERE id = ? AND version = ?
                """,
            value.entryType(), value.area(), value.status(), value.title(), value.summary(),
            value.details(), value.decisions(), value.nextSteps(), Timestamp.from(value.eventAt()),
            value.periodStart(), value.periodEnd(), value.location(), value.referenceUrl(),
            value.ownerUserId(), value.relatedEntryId(), actorUserId, entryId, expectedVersion
        ) == 1;
    }

    void replaceParticipants(long entryId, List<Long> participantUserIds) {
        jdbc.update("DELETE FROM internal_development_entry_participants WHERE entry_id = ?", entryId);
        participantUserIds.forEach(userId -> jdbc.update(
            "INSERT INTO internal_development_entry_participants (entry_id, user_id) VALUES (?, ?)",
            entryId,
            userId
        ));
    }

    void appendHistory(long entryId, int entryVersion, String action, long actorUserId, String snapshotJson) {
        jdbc.update(
            """
                INSERT INTO internal_development_entry_history (
                    entry_id, entry_version, action_code, changed_by_user_id, snapshot_json
                ) VALUES (?, ?, ?, ?, CAST(? AS JSON))
                """,
            entryId,
            entryVersion,
            action,
            actorUserId,
            snapshotJson
        );
    }

    List<History> history(long entryId) {
        return jdbc.query(
            """
                SELECT history.id, history.entry_version, history.action_code,
                       history.changed_by_user_id,
                       COALESCE(NULLIF(actor.full_name, ''), actor.email) AS changed_by_name,
                       actor.email AS changed_by_email,
                       CAST(history.snapshot_json AS CHAR) AS snapshot_json,
                       history.changed_at
                FROM internal_development_entry_history history
                JOIN users actor ON actor.id = history.changed_by_user_id
                WHERE history.entry_id = ?
                ORDER BY history.entry_version DESC
                """,
            (rs, rowNum) -> new History(
                rs.getLong("id"), rs.getInt("entry_version"), rs.getString("action_code"),
                rs.getLong("changed_by_user_id"), rs.getString("changed_by_name"),
                rs.getString("changed_by_email"), rs.getString("snapshot_json"),
                instant(rs.getTimestamp("changed_at"))
            ),
            entryId
        );
    }

    List<Long> weeklyReportOwnerIds(LocalDate weekStart, LocalDate weekEnd) {
        return jdbc.query(
            """
                SELECT DISTINCT owner_user_id
                FROM internal_development_entries
                WHERE entry_type = 'WEEKLY_REPORT'
                  AND status IN ('RECORDED', 'CLOSED')
                  AND period_start <= ?
                  AND period_end >= ?
                """,
            (rs, rowNum) -> rs.getLong("owner_user_id"),
            weekEnd,
            weekStart
        );
    }

    int upcomingMeetingCount(Instant now) {
        var value = jdbc.queryForObject(
            """
                SELECT COUNT(*)
                FROM internal_development_entries
                WHERE entry_type IN ('BOARD_MEETING', 'WORKING_MEETING')
                  AND status = 'PLANNED'
                  AND event_at >= ?
                """,
            Integer.class,
            Timestamp.from(now)
        );
        return value == null ? 0 : value;
    }

    int recordsCreatedBetween(Instant from, Instant to) {
        var value = jdbc.queryForObject(
            """
                SELECT COUNT(*)
                FROM internal_development_entries
                WHERE created_at >= ? AND created_at < ?
                """,
            Integer.class,
            Timestamp.from(from),
            Timestamp.from(to)
        );
        return value == null ? 0 : value;
    }

    boolean exists(long entryId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT COUNT(*) > 0 FROM internal_development_entries WHERE id = ?",
            Boolean.class,
            entryId
        ));
    }

    private List<Entry> attachParticipants(List<Entry> entries) {
        if (entries.isEmpty()) return entries;
        var placeholders = entries.stream().map(ignored -> "?").collect(Collectors.joining(","));
        var ids = entries.stream().map(Entry::id).toArray();
        var byEntry = new HashMap<Long, List<Participant>>();
        jdbc.query(
            """
                SELECT participant.entry_id, account_user.id,
                       COALESCE(NULLIF(account_user.full_name, ''), account_user.email) AS name,
                       account_user.email
                FROM internal_development_entry_participants participant
                JOIN users account_user ON account_user.id = participant.user_id
                WHERE participant.entry_id IN (
                """ + placeholders + ") ORDER BY name, account_user.email",
            (RowCallbackHandler) rs -> byEntry.computeIfAbsent(rs.getLong("entry_id"), ignored -> new ArrayList<>()).add(
                new Participant(rs.getLong("id"), rs.getString("name"), rs.getString("email"))
            ),
            ids
        );
        return entries.stream()
            .map(entry -> entry.withParticipants(List.copyOf(byEntry.getOrDefault(entry.id(), List.of()))))
            .toList();
    }

    private FilterSql filterClause(Filters filters) {
        var clauses = new ArrayList<String>();
        var params = new ArrayList<Object>();
        if (filters != null) {
            var query = filters.query() == null ? "" : filters.query().trim().toLowerCase();
            if (!query.isBlank()) {
                clauses.add("(LOWER(entry.folio) LIKE ? OR LOWER(entry.title) LIKE ? OR LOWER(entry.summary) LIKE ? OR LOWER(COALESCE(entry.details, '')) LIKE ?)");
                var like = "%" + query + "%";
                params.add(like);
                params.add(like);
                params.add(like);
                params.add(like);
            }
            addEnumFilter(clauses, params, "entry.entry_type", filters.entryType());
            addEnumFilter(clauses, params, "entry.area", filters.area());
            addEnumFilter(clauses, params, "entry.status", filters.status());
            if (filters.ownerUserId() != null) {
                clauses.add("entry.owner_user_id = ?");
                params.add(filters.ownerUserId());
            }
            if (filters.from() != null) {
                clauses.add("entry.event_at >= ?");
                params.add(filters.from().atStartOfDay());
            }
            if (filters.to() != null) {
                clauses.add("entry.event_at < ?");
                params.add(filters.to().plusDays(1).atStartOfDay());
            }
        }
        return new FilterSql(clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses), params);
    }

    private void addEnumFilter(List<String> clauses, List<Object> params, String column, String value) {
        if (value != null && !value.isBlank() && !"ALL".equalsIgnoreCase(value)) {
            clauses.add(column + " = ?");
            params.add(value.trim().toUpperCase());
        }
    }

    private String entrySelect() {
        return """
            SELECT entry.id, entry.folio, entry.entry_type, entry.area, entry.status,
                   entry.title, entry.summary, entry.details, entry.decisions, entry.next_steps,
                   entry.event_at, entry.period_start, entry.period_end, entry.location,
                   entry.reference_url, entry.owner_user_id,
                   COALESCE(NULLIF(owner.full_name, ''), owner.email) AS owner_name,
                   owner.email AS owner_email, entry.related_entry_id,
                   related.title AS related_entry_title, entry.created_by_user_id,
                   COALESCE(NULLIF(creator.full_name, ''), creator.email) AS created_by_name,
                   entry.updated_by_user_id,
                   COALESCE(NULLIF(updater.full_name, ''), updater.email) AS updated_by_name,
                   entry.version, entry.created_at, entry.updated_at
            FROM internal_development_entries entry
            JOIN users owner ON owner.id = entry.owner_user_id
            JOIN users creator ON creator.id = entry.created_by_user_id
            JOIN users updater ON updater.id = entry.updated_by_user_id
            LEFT JOIN internal_development_entries related ON related.id = entry.related_entry_id
            """;
    }

    private Entry mapEntry(ResultSet rs, int rowNum) throws SQLException {
        return new Entry(
            rs.getLong("id"), rs.getString("folio"), rs.getString("entry_type"), rs.getString("area"),
            rs.getString("status"), rs.getString("title"), rs.getString("summary"),
            rs.getString("details"), rs.getString("decisions"), rs.getString("next_steps"),
            instant(rs.getTimestamp("event_at")), localDate(rs.getDate("period_start")),
            localDate(rs.getDate("period_end")), rs.getString("location"), rs.getString("reference_url"),
            rs.getLong("owner_user_id"), rs.getString("owner_name"), rs.getString("owner_email"),
            rs.getObject("related_entry_id", Long.class), rs.getString("related_entry_title"),
            rs.getLong("created_by_user_id"), rs.getString("created_by_name"),
            rs.getLong("updated_by_user_id"), rs.getString("updated_by_name"), rs.getInt("version"),
            instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("updated_at")), List.of()
        );
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private LocalDate localDate(java.sql.Date value) {
        return value == null ? null : value.toLocalDate();
    }

    record ValidatedEntry(
        String entryType,
        String area,
        String status,
        String title,
        String summary,
        String details,
        String decisions,
        String nextSteps,
        Instant eventAt,
        LocalDate periodStart,
        LocalDate periodEnd,
        String location,
        String referenceUrl,
        long ownerUserId,
        Long relatedEntryId,
        List<Long> participantUserIds
    ) {
    }

    private record FilterSql(String sql, List<Object> params) {
    }
}
