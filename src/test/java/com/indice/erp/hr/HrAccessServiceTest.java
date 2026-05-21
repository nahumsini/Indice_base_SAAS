package com.indice.erp.hr;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessService.HrTab;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class HrAccessServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void legacyAdminWithoutModuleRowsCanUseManagementTabs() {
        var service = new HrAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Admin", "admin");
        givenUserCompanyId(currentUser, 10L);
        givenModuleRows(10L, List.of());
        givenTabRowsConfigured(10L, false);

        assertTrue(service.canAccessManagementTab(currentUser, HrTab.COLLABORATORS));
    }

    @Test
    void explicitModuleRowsMustIncludeHumanResources() {
        var service = new HrAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Admin", "admin");
        givenUserCompanyId(currentUser, 10L);
        givenModuleRows(10L, List.of("config_center"));

        assertFalse(service.canAccessManagementTab(currentUser, HrTab.COLLABORATORS));
    }

    @Test
    void configuredTabsMustAllowRequestedTab() {
        var service = new HrAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Admin", "admin");
        givenUserCompanyId(currentUser, 10L);
        givenModuleRows(10L, List.of("human_resources"));
        givenTabRowsConfigured(10L, true);
        givenAllowedTab(10L, HrTab.PAYROLL, false);

        assertFalse(service.canAccessManagementTab(currentUser, HrTab.PAYROLL));
    }

    @Test
    void normalUserCannotUseManagementEndpointsEvenWithConfiguredTab() {
        var service = new HrAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "User", "user");

        assertFalse(service.canAccessManagementTab(currentUser, HrTab.CONTROL));
    }

    @Test
    void rootBypassesModuleAndTabChecks() {
        var service = new HrAccessService(jdbcTemplate);
        var currentUser = new AuthSessionUser(1L, 7L, "Root", "root");

        assertTrue(service.canAccessManagementTab(currentUser, HrTab.PAYROLL));
    }

    private void givenUserCompanyId(AuthSessionUser currentUser, long userCompanyId) {
        when(jdbcTemplate.query(
            contains("FROM user_companies"),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(currentUser.userId()),
            eq(currentUser.companyId())
        )).thenReturn(List.of(userCompanyId));
    }

    private void givenModuleRows(long userCompanyId, List<String> moduleSlugs) {
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(userCompanyId)
        )).thenReturn(moduleSlugs);
    }

    private void givenTabRowsConfigured(long userCompanyId, boolean configured) {
        when(jdbcTemplate.queryForObject(
            contains("COUNT(*) FROM user_company_tab_permissions WHERE user_company_id = ?"),
            eq(Long.class),
            eq(userCompanyId)
        )).thenReturn(configured ? 1L : 0L);
    }

    private void givenAllowedTab(long userCompanyId, HrTab tab, boolean allowed) {
        when(jdbcTemplate.queryForObject(
            contains("AND tab_key = ?"),
            eq(Long.class),
            eq(userCompanyId),
            eq("human_resources"),
            eq(tab.tabKey())
        )).thenReturn(allowed ? 1L : 0L);
    }
}
