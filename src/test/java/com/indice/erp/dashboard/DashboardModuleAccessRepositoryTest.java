package com.indice.erp.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
        mockCompanyEntitlements(1L, "expenses");
        mockModuleSlugs(20L, "expenses", "human_resources");

        var access = repository.loadAccess(9L, 1L, "user");

        assertFalse(access.allModules());
        assertEquals(Set.of("expenses"), access.moduleSlugs());
    }

    @Test
    void adminWithoutAssignmentsGetsNoModules() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        mockUserCompanyAccess(9L, 1L, 20L, "admin");
        mockCompanyEntitlements(1L, "expenses", "human_resources");
        mockModuleSlugs(20L);

        var access = repository.loadAccess(9L, 1L, "admin");

        assertFalse(access.allModules());
        assertEquals(Set.of(), access.moduleSlugs());
    }

    @Test
    void databaseDemotionOverridesAStaleSuperAdminSessionRole() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        mockUserCompanyAccess(9L, 1L, 20L, "user");
        mockCompanyEntitlements(1L, "crm", "human_resources");
        mockModuleSlugs(20L, "crm");

        var access = repository.loadAccess(9L, 1L, "superadmin");

        assertFalse(access.allModules());
        assertEquals(Set.of("crm"), access.moduleSlugs());
    }

    @Test
    void rootGetsCompanyEntitledModules() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        mockUserCompanyAccess(9L, 1L, 20L, "root");
        mockCompanyEntitlements(1L, "expenses", "human_resources");

        var access = repository.loadAccess(9L, 1L, "root");

        assertFalse(access.allModules());
        assertEquals(Set.of("expenses", "human_resources"), access.moduleSlugs());
    }

    @Test
    void missingCompanyAccessGetsNoModules() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        when(jdbcTemplate.query(
            argThat((String sql) -> containsSql(sql, "FROM user_companies")),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(9L),
            eq(1L)
        )).thenReturn(List.of());

        var access = repository.loadAccess(9L, 1L, "user");

        assertFalse(access.allModules());
        assertEquals(Set.of(), access.moduleSlugs());
    }

    @Test
    void delegatedSuperadminGetsClientEntitlementsWithoutCreatingAMembership() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        when(jdbcTemplate.query(
            argThat((String sql) -> containsSql(sql, "FROM user_companies")),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(9L),
            eq(44L)
        )).thenReturn(List.of());
        mockCompanyEntitlements(44L, "expenses", "human_resources");

        var access = repository.loadAccess(9L, 44L, "superadmin");

        assertFalse(access.allModules());
        assertEquals(Set.of("expenses", "human_resources"), access.moduleSlugs());
    }

    @Test
    void publicDemoGetsOperationalModulesWithoutCompanyEntitlements() {
        var repository = new DashboardModuleAccessRepository(jdbcTemplate);
        when(jdbcTemplate.query(
            argThat((String sql) -> containsSql(sql, "slug <> 'config_center'")),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any()
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet sales = mock(ResultSet.class);
            ResultSet inventory = mock(ResultSet.class);
            when(sales.getString("slug")).thenReturn("crm");
            when(inventory.getString("slug")).thenReturn("inventory");
            return List.of(rowMapper.mapRow(sales, 0), rowMapper.mapRow(inventory, 1));
        });

        var access = repository.loadPublicDemoAccess();

        assertEquals(Set.of("crm", "inventory"), access.moduleSlugs());
    }

    private void mockUserCompanyAccess(long userId, long companyId, long userCompanyId, String role) {
        when(jdbcTemplate.query(
            argThat((String sql) -> containsSql(sql, "FROM user_companies")),
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
            argThat((String sql) -> containsSql(sql, "FROM user_company_module_roles")),
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

    private void mockCompanyEntitlements(long companyId, String... slugs) {
        when(jdbcTemplate.query(
            argThat((String sql) -> containsSql(sql, "FROM company_module_entitlements")),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(companyId)
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

    private boolean containsSql(String sql, String expected) {
        return sql != null && sql.contains(expected);
    }
}
