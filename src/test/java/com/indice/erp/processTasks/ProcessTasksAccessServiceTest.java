package com.indice.erp.processTasks;

import com.indice.erp.auth.AuthSessionUser;
import java.sql.ResultSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProcessTasksAccessServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void canAccessReturnsTrueForRootWithoutDatabaseLookup() {
        var service = new ProcessTasksAccessService(jdbcTemplate);

        assertTrue(service.canAccess(new AuthSessionUser(1L, 7L, "Root User", "root")));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void canAccessReturnsTrueWhenExplicitProcessesModuleExists() throws Exception {
        var service = new ProcessTasksAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Scoped User", "user");

        stubUserCompanyId(33L);
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(33L)
        )).thenReturn(List.of("expenses", "processes"));

        assertTrue(service.canAccess(currentUser));
    }

    @Test
    void canAccessReturnsTrueWhenLegacyProcessesAliasExists() {
        var service = new ProcessTasksAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Scoped User", "user");

        stubUserCompanyId(33L);
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(33L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<String>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getString("module_slug")).thenReturn("processes-tasks");
            return List.of(rowMapper.mapRow(rs, 0));
        });

        assertTrue(service.canAccess(currentUser));
    }

    @Test
    void canAccessReturnsTrueForLegacyAdminWithoutExplicitModuleRows() {
        var service = new ProcessTasksAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Admin User", "admin");

        stubUserCompanyId(33L);
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(33L)
        )).thenReturn(List.of());

        assertTrue(service.canAccess(currentUser));
    }

    @Test
    void canAccessReturnsFalseWhenExplicitModuleRowsDoNotIncludeProcesses() {
        var service = new ProcessTasksAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Normal User", "user");

        stubUserCompanyId(33L);
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(33L)
        )).thenReturn(List.of("expenses", "sales"));

        assertFalse(service.canAccess(currentUser));
    }

    private void stubUserCompanyId(long userCompanyId) {
        when(jdbcTemplate.query(
            contains("FROM user_companies"),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(1L),
            eq(7L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Long>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(userCompanyId);
            return List.of(rowMapper.mapRow(rs, 0));
        });
    }
}
