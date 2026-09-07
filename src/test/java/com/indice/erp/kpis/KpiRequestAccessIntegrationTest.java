package com.indice.erp.kpis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({KpiRequestAccessService.class, ModuleAccessService.class, TabPermissionAccessService.class, HrOperationalScopeService.class})
class KpiRequestAccessIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired KpiRequestAccessService access;
    AuthSessionUser user;
    long unit;
    @BeforeEach void setup() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        long id = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')", company, id);
        long membership = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO units (company_id, name, status) VALUES (?, 'Assigned unit', 'active')", company);
        unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO user_work_profiles (company_id, user_company_id, user_id, unit_id) VALUES (?, ?, ?, ?)", company, membership, id, unit);
        user = new AuthSessionUser(id, company, membership, "Scoped synthetic analyst", "admin");
    }
    void grant(String module, String tab) {
        jdbc.update("INSERT IGNORE INTO company_module_entitlements (company_id, module_slug, status) VALUES (?, ?, 'active')", user.companyId(), module);
        jdbc.update("INSERT INTO user_company_module_roles (user_company_id, module_slug, role) VALUES (?, ?, 'admin')", user.userCompanyId(), module);
        jdbc.update("INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view) VALUES (?, ?, ?, 1)", user.userCompanyId(), module, tab);
    }
    @Test void aLocalKpiTabDoesNotGrantOtherModulesAndRequiresEntitlement() {
        grant("expenses", "kpis");
        assertThat(access.monetary(user, "EXPENSE_TOTAL")).isEqualTo(HrOperationalScope.unitHeadquarters(unit));
        assertThatThrownBy(() -> access.monetary(user, "RECEIVABLE_PAYMENT_AMOUNT")).isInstanceOf(ResponseStatusException.class);
        jdbc.update("UPDATE company_module_entitlements SET status = 'inactive' WHERE company_id = ?", user.companyId());
        assertThatThrownBy(() -> access.monetary(user, "EXPENSE_TOTAL")).isInstanceOf(ResponseStatusException.class);
    }
    @Test void centralScopeIsEnforcedAndCompanyMutationsAreNotGrantedToUnitAdmins() {
        grant("kpis", "accounting-reports");
        assertThat(access.central(user, "accounting-reports", null, null)).isEqualTo(new KpiRequestAccessService.Selection(unit, null));
        assertThatThrownBy(() -> access.central(user, "accounting-reports", unit + 10000, null)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> access.central(user, "accounting-reports", unit, 999999L)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> access.requireCorporate(user, "accounting-reports")).isInstanceOf(ResponseStatusException.class);
        jdbc.update("UPDATE user_company_tab_permissions SET can_view = 0 WHERE user_company_id = ?", user.userCompanyId());
        assertThatThrownBy(() -> access.central(user, "accounting-reports", null, null)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void everyMonetaryPermissionMatchesTheActualPermissionCatalog() {
        for (var permission : KpiRequestAccessService.monetaryPermissions()) assertThat(ConfigCenterTabPermissionCatalog.isValidPermissionKey(permission)).as(permission).isTrue();
    }
}
