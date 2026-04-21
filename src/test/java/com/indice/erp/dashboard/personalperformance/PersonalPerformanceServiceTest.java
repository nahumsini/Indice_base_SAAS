package com.indice.erp.dashboard.personalperformance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

@ExtendWith(MockitoExtension.class)
class PersonalPerformanceServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void getPersonalPerformanceReturnsDefaultSectionsWhenProfileDoesNotExist() {
        var service = new PersonalPerformanceService(jdbcTemplate, new ObjectMapper());

        when(jdbcTemplate.query(
            eq("""
                SELECT id, user_id, company_id, version, status, started_at, completed_at
                FROM user_personal_performance_profiles
                WHERE user_id = ?
                ORDER BY version DESC, id DESC
                LIMIT 1
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(4L)
        )).thenReturn(List.of());

        var response = service.getPersonalPerformance(4L, 7L);

        @SuppressWarnings("unchecked")
        var profile = (Map<String, Object>) response.get("profile");
        @SuppressWarnings("unchecked")
        var sections = (Map<String, Object>) response.get("sections");
        @SuppressWarnings("unchecked")
        var sleepRecovery = (Map<String, Object>) sections.get("sleep_recovery");
        @SuppressWarnings("unchecked")
        var data = (Map<String, Object>) sleepRecovery.get("data");

        assertEquals("draft", profile.get("status"));
        assertEquals(4L, profile.get("user_id"));
        assertEquals(7L, profile.get("company_id"));
        assertEquals("sleep_recovery", data.get("ui_key"));
        assertEquals(0, data.get("answered_count"));
        assertEquals(10, data.get("question_count"));
    }

    @Test
    void savePersonalPerformanceNormalizesSectionJsonAndReturnsSavedEnvelope() throws Exception {
        var service = new PersonalPerformanceService(jdbcTemplate, new ObjectMapper());
        var storedJson = new AtomicReference<String>();

        when(jdbcTemplate.query(
            eq("""
                SELECT id, user_id, company_id, version, status, started_at, completed_at
                FROM user_personal_performance_profiles
                WHERE user_id = ?
                ORDER BY version DESC, id DESC
                LIMIT 1
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(4L)
        )).thenReturn(List.of());

        when(jdbcTemplate.update(any(org.springframework.jdbc.core.PreparedStatementCreator.class), any(KeyHolder.class)))
            .thenAnswer(invocation -> {
                var keyHolder = (GeneratedKeyHolder) invocation.getArgument(1);
                keyHolder.getKeyList().add(Map.of("id", 1L));
                return 1;
            });

        when(jdbcTemplate.update(
            startsWith("""
                INSERT INTO user_personal_performance_answers
                """),
            eq(1L),
            eq("sleep_recovery"),
            eq("completed"),
            any(),
            anyString()
        )).thenAnswer(invocation -> {
            storedJson.set(invocation.getArgument(5, String.class));
            return 1;
        });

        when(jdbcTemplate.update(
            startsWith("""
                UPDATE user_personal_performance_profiles
                """),
            eq(7L),
            eq("in_progress"),
            eq((Object) null),
            eq(1L)
        )).thenReturn(1);

        when(jdbcTemplate.query(
            eq("""
                SELECT id, section_key, status, completed_at, data
                FROM user_personal_performance_answers
                WHERE personal_performance_profile_id = ?
                ORDER BY CASE section_key
                    WHEN 'sleep_recovery' THEN 1
                    WHEN 'nutrition_energy' THEN 2
                    WHEN 'stress_clarity' THEN 3
                    WHEN 'balance_sustainability' THEN 4
                    ELSE 99
                END, id ASC
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(11L);
            when(rs.getString("section_key")).thenReturn("sleep_recovery");
            when(rs.getString("status")).thenReturn("completed");
            when(rs.getTimestamp("completed_at")).thenReturn(java.sql.Timestamp.valueOf(LocalDateTime.of(2026, 4, 8, 12, 0)));
            when(rs.getString("data")).thenReturn(storedJson.get());
            return List.of(rowMapper.mapRow(rs, 0));
        });

        when(jdbcTemplate.query(
            eq("""
                SELECT id, user_id, company_id, version, status, started_at, completed_at
                FROM user_personal_performance_profiles
                WHERE id = ?
                LIMIT 1
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getLong("user_id")).thenReturn(4L);
            when(rs.getLong("company_id")).thenReturn(7L);
            when(rs.getInt("version")).thenReturn(1);
            when(rs.getString("status")).thenReturn("in_progress");
            when(rs.getTimestamp("started_at")).thenReturn(java.sql.Timestamp.valueOf(LocalDateTime.of(2026, 4, 8, 11, 0)));
            when(rs.getTimestamp("completed_at")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var response = service.savePersonalPerformance(4L, 7L, Map.of(
            "sections", Map.of(
                "sleep_recovery", Map.of(
                    "status", "completed",
                    "data", Map.of(
                        "answers", Map.of("sr1", 2, "sr2", 4)
                    )
                )
            )
        ));

        @SuppressWarnings("unchecked")
        var profile = (Map<String, Object>) response.get("profile");
        @SuppressWarnings("unchecked")
        var sections = (Map<String, Object>) response.get("sections");
        @SuppressWarnings("unchecked")
        var sleepRecovery = (Map<String, Object>) sections.get("sleep_recovery");
        @SuppressWarnings("unchecked")
        var data = (Map<String, Object>) sleepRecovery.get("data");

        assertEquals("in_progress", profile.get("status"));
        assertEquals(4L, profile.get("user_id"));
        assertEquals("completed", sleepRecovery.get("status"));
        assertEquals("sleep_recovery", data.get("ui_key"));
        assertEquals(2, data.get("answered_count"));
    }
}
