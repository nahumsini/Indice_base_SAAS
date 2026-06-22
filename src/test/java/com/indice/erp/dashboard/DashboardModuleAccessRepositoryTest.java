package com.indice.erp.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.ResultSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class DashboardModuleAccessRepositoryTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void normalUserGetsOnlyAssignedModules() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        mockUserCompanyAccess(9L, 1L, 20L, "user");
        mockModuleSlugs(20L, "expenses", "human_resources");

        var access = repository.loadAccess(9L, 1L, "user");

        assertFalse(access.allModules());
        assertEquals(Set.of("expenses", "human_resources"), access.moduleSlugs());
    }

    @Test
    void adminWithoutAssignmentsGetsNoModules() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        mockUserCompanyAccess(9L, 1L, 20L, "admin");
        mockModuleSlugs(20L);

        var access = repository.loadAccess(9L, 1L, "admin");

        assertFalse(access.allModules());
        assertEquals(Set.of(), access.moduleSlugs());
    }

    @Test
    void rootGetsFullAccess() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        mockUserCompanyAccess(9L, 1L, 20L, "root");

        var access = repository.loadAccess(9L, 1L, "root");

        assertTrue(access.allModules());
    }

    @Test
    void missingCompanyAccessGetsNoModules() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        when(jdbcTemplate.query(
            argThat((String sql) -> sql.contains("FROM user_companies")),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(9L),
            eq(1L)
        )).thenReturn(List.of());

        var access = repository.loadAccess(9L, 1L, "user");

        assertFalse(access.allModules());
        assertEquals(Set.of(), access.moduleSlugs());
    }

    private void mockUserCompanyAccess(long userId, long companyId, long userCompanyId, String role) {
        when(jdbcTemplate.query(
            argThat((String sql) -> sql.contains("FROM user_companies")),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(userId),
            eq(companyId)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(userCompanyId);
            when(rs.getString("role")).thenReturn(role);
            return List.of(rowMapper.mapRow(rs, 0));
        });
    }

    private void mockModuleSlugs(long userCompanyId, String... slugs) {
        when(jdbcTemplate.query(
            argThat((String sql) -> sql.contains("FROM user_company_module_roles")),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(userCompanyId)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rows = new java.util.ArrayList<Object>();
            for (var index = 0; index < slugs.length; index++) {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getString("module_slug")).thenReturn(slugs[index]);
                rows.add(rowMapper.mapRow(rs, index));
            }
            return rows;
        });
    }
}
