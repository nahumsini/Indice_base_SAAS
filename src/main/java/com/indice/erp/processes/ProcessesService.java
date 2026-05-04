package com.indice.erp.processes;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessesService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ProcessesService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> listProcesses(long companyId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT id,
                               company_id,
                               folio,
                               unit_name,
                               business_name,
                               title,
                               description,
                               frequency,
                               priority,
                               creator_user_id,
                               creator_name,
                               responsible_name,
                               recurrence_json,
                               is_active,
                               created_at,
                               updated_at
                        FROM processes
                        WHERE company_id = ?
                          AND deleted_at IS NULL
                        ORDER BY id DESC
                        """,
                (rs, rowNum) -> mapProcessRow(rs),
                companyId);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createProcess(long companyId, long userId, String userName,
            Map<String, Object> payload) {
        var title = requiredString(payload, "title");
        var description = requiredString(payload, "description");
        var folio = nextProcessFolio(companyId);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                            INSERT INTO processes
                            (company_id, folio, unit_name, business_name, title, description, frequency, priority,
                             creator_user_id, creator_name, responsible_name, recurrence_json, is_active)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    new String[] { "id" });

            statement.setLong(1, companyId);
            statement.setString(2, folio);
            setNullableString(statement, 3, optionalString(payload, "unit", "unit_name"));
            setNullableString(statement, 4, optionalString(payload, "business", "business_name"));
            statement.setString(5, title);
            statement.setString(6, description);
            statement.setString(7, normalizedOrFallback(optionalString(payload, "frequency"), "weekly"));
            statement.setString(8, normalizedOrFallback(optionalString(payload, "priority"), "medium"));
            statement.setLong(9, userId);
            statement.setString(10, normalizedOrFallback(userName, "System user"));
            setNullableString(statement, 11, optionalString(payload, "responsible", "responsible_name"));
            setJson(statement, 12, payload.get("recurrence"));
            statement.setBoolean(13, booleanValue(payload, "isActive", true));

            return statement;
        }, keyHolder);

        var processId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
        return getProcess(companyId, processId);
    }

    @Transactional
    public Map<String, Object> updateProcess(long companyId, long processId, Map<String, Object> payload) {
        requireProcess(companyId, processId);

        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                            UPDATE processes
                            SET unit_name = ?,
                                business_name = ?,
                                title = ?,
                                description = ?,
                                frequency = ?,
                                priority = ?,
                                responsible_name = ?,
                                recurrence_json = ?,
                                is_active = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            setNullableString(statement, 1, optionalString(payload, "unit", "unit_name"));
            setNullableString(statement, 2, optionalString(payload, "business", "business_name"));
            statement.setString(3, requiredString(payload, "title"));
            statement.setString(4, requiredString(payload, "description"));
            statement.setString(5, normalizedOrFallback(optionalString(payload, "frequency"), "weekly"));
            statement.setString(6, normalizedOrFallback(optionalString(payload, "priority"), "medium"));
            setNullableString(statement, 7, optionalString(payload, "responsible", "responsible_name"));
            setJson(statement, 8, payload.get("recurrence"));
            statement.setBoolean(9, booleanValue(payload, "isActive", true));
            statement.setLong(10, companyId);
            statement.setLong(11, processId);

            return statement;
        });

        return getProcess(companyId, processId);
    }

    @Transactional
    public void deleteProcess(long companyId, long processId) {
        requireProcess(companyId, processId);

        jdbcTemplate.update(
                """
                        UPDATE processes
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                processId);
    }

    public Map<String, Object> getProcess(long companyId, long processId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT id,
                               company_id,
                               folio,
                               unit_name,
                               business_name,
                               title,
                               description,
                               frequency,
                               priority,
                               creator_user_id,
                               creator_name,
                               responsible_name,
                               recurrence_json,
                               is_active,
                               created_at,
                               updated_at
                        FROM processes
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                (rs, rowNum) -> mapProcessRow(rs),
                companyId,
                processId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Process not found.");
        }

        return rows.getFirst();
    }

    private void requireProcess(long companyId, long processId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM processes
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                Integer.class,
                companyId,
                processId);

        if (count == null || count == 0) {
            throw new NoSuchElementException("Process not found.");
        }
    }

    private String nextProcessFolio(long companyId) {
        var currentYear = Year.now().getValue();
        Integer nextNumber = jdbcTemplate.queryForObject(
                """
                        SELECT COALESCE(MAX(CAST(SUBSTRING(folio, 9) AS UNSIGNED)), 0) + 1
                        FROM processes
                        WHERE company_id = ?
                          AND folio LIKE ?
                          AND folio LIKE 'PR-%'
                        """,
                Integer.class,
                companyId,
                "PR-" + currentYear + "-%");

        int value = nextNumber != null ? nextNumber : 1;
        return "PR-" + currentYear + "-" + String.format("%03d", value);
    }

    private Map<String, Object> mapProcessRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("folio", rs.getString("folio"));
        row.put("unit", normalizedOrFallback(rs.getString("unit_name"), ""));
        row.put("business", normalizedOrFallback(rs.getString("business_name"), ""));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("frequency", rs.getString("frequency"));
        row.put("priority", rs.getString("priority"));
        row.put("creator", normalizedOrFallback(rs.getString("creator_name"), ""));
        row.put("responsible", normalizedOrFallback(rs.getString("responsible_name"), ""));
        row.put("recurrence", parseJson(rs.getString("recurrence_json")));
        row.put("isActive", rs.getBoolean("is_active"));
        row.put("createdAt",
                rs.getTimestamp("created_at") != null
                        ? rs.getTimestamp("created_at").toLocalDateTime().toLocalDate().toString()
                        : null);
        row.put("updatedAt",
                rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime().toString()
                        : null);
        return row;
    }

    private Object parseJson(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }

        try {
            return objectMapper.readValue(value, Object.class);
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    private void setNullableString(java.sql.PreparedStatement statement, int index, String value) throws SQLException {
        if (value == null || value.isBlank()) {
            statement.setNull(index, Types.VARCHAR);
            return;
        }

        statement.setString(index, value);
    }

    private void setJson(java.sql.PreparedStatement statement, int index, Object value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.VARCHAR);
            return;
        }

        try {
            statement.setString(index, objectMapper.writeValueAsString(value));
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Invalid recurrence payload.");
        }
    }

    private String requiredString(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            throw new IllegalArgumentException(key + " is required.");
        }
        return value.toString().trim();
    }

    private String optionalString(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value != null && !value.toString().trim().isEmpty()) {
                return value.toString().trim();
            }
        }

        return null;
    }

    private String normalizedOrFallback(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        return value.trim();
    }

    private boolean booleanValue(Map<String, Object> payload, String key, boolean fallback) {
        var value = payload.get(key);
        if (value == null) {
            return fallback;
        }

        if (value instanceof Boolean bool) {
            return bool;
        }

        return Boolean.parseBoolean(value.toString());
    }
}
