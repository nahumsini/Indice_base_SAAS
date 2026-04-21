package com.indice.erp.dashboard.businessprofile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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
class BusinessProfileServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void getBusinessProfileReturnsDefaultSectionsWhenProfileDoesNotExist() {
        var service = new BusinessProfileService(jdbcTemplate, new ObjectMapper());

        when(jdbcTemplate.query(
            eq("""
                SELECT id, company_id, version, status, started_at, completed_at
                FROM company_business_profiles
                WHERE company_id = ?
                ORDER BY version DESC, id DESC
                LIMIT 1
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenReturn(List.of());

        var response = service.getBusinessProfile(1L);

        @SuppressWarnings("unchecked")
        var profile = (Map<String, Object>) response.get("profile");
        @SuppressWarnings("unchecked")
        var sections = (Map<String, Object>) response.get("sections");
        @SuppressWarnings("unchecked")
        var people = (Map<String, Object>) sections.get("people");
        @SuppressWarnings("unchecked")
        var data = (Map<String, Object>) people.get("data");

        assertEquals("draft", profile.get("status"));
        assertEquals(1L, profile.get("company_id"));
        assertEquals("personas", data.get("ui_key"));
        assertEquals(0, data.get("answered_count"));
        assertEquals(10, data.get("question_count"));
    }

    @Test
    void saveBusinessProfileNormalizesSectionJsonAndReturnsSavedEnvelope() throws Exception {
        var service = new BusinessProfileService(jdbcTemplate, new ObjectMapper());
        var storedJson = new AtomicReference<String>();

        when(jdbcTemplate.query(
            eq("""
                SELECT id, company_id, version, status, started_at, completed_at
                FROM company_business_profiles
                WHERE company_id = ?
                ORDER BY version DESC, id DESC
                LIMIT 1
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenReturn(List.of());

        when(jdbcTemplate.update(any(org.springframework.jdbc.core.PreparedStatementCreator.class), any(KeyHolder.class)))
            .thenAnswer(invocation -> {
                var keyHolder = (GeneratedKeyHolder) invocation.getArgument(1);
                keyHolder.getKeyList().add(Map.of("id", 1L));
                return 1;
            });

        when(jdbcTemplate.update(
            startsWith("""
                INSERT INTO company_business_profile_answers
                """),
            eq(1L),
            eq("people"),
            eq("completed"),
            any(),
            anyString()
        )).thenAnswer(invocation -> {
            storedJson.set(invocation.getArgument(5, String.class));
            return 1;
        });

        when(jdbcTemplate.update(
            startsWith("""
                UPDATE company_business_profiles
                """),
            eq("in_progress"),
            eq((Object) null),
            eq(10L),
            eq(1L)
        )).thenReturn(1);

        when(jdbcTemplate.query(
            eq("""
                SELECT id, section_key, status, completed_at, data
                FROM company_business_profile_answers
                WHERE business_profile_id = ?
                ORDER BY CASE section_key
                    WHEN 'people' THEN 1
                    WHEN 'processes' THEN 2
                    WHEN 'products' THEN 3
                    WHEN 'finance' THEN 4
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
            when(rs.getString("section_key")).thenReturn("people");
            when(rs.getString("status")).thenReturn("completed");
            when(rs.getTimestamp("completed_at")).thenReturn(java.sql.Timestamp.valueOf(LocalDateTime.of(2026, 4, 2, 12, 0)));
            when(rs.getString("data")).thenReturn(storedJson.get());
            return List.of(rowMapper.mapRow(rs, 0));
        });

        when(jdbcTemplate.query(
            eq("""
                SELECT id, company_id, version, status, started_at, completed_at
                FROM company_business_profiles
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
            when(rs.getLong("company_id")).thenReturn(1L);
            when(rs.getInt("version")).thenReturn(1);
            when(rs.getString("status")).thenReturn("in_progress");
            when(rs.getTimestamp("started_at")).thenReturn(java.sql.Timestamp.valueOf(LocalDateTime.of(2026, 4, 2, 11, 0)));
            when(rs.getTimestamp("completed_at")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var response = service.saveBusinessProfile(1L, 10L, Map.of(
            "sections", Map.of(
                "people", Map.of(
                    "status", "completed",
                    "data", Map.of(
                        "answers", Map.of("p1", 2, "p2", 4)
                    )
                )
            )
        ));

        @SuppressWarnings("unchecked")
        var profile = (Map<String, Object>) response.get("profile");
        @SuppressWarnings("unchecked")
        var sections = (Map<String, Object>) response.get("sections");
        @SuppressWarnings("unchecked")
        var people = (Map<String, Object>) sections.get("people");
        @SuppressWarnings("unchecked")
        var data = (Map<String, Object>) people.get("data");

        assertEquals("in_progress", profile.get("status"));
        assertEquals("completed", people.get("status"));
        assertEquals("personas", data.get("ui_key"));
        assertEquals(2, data.get("answered_count"));
    }
}
