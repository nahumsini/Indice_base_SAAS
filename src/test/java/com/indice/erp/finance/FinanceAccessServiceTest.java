package com.indice.erp.finance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.shared.FinanceScope;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinanceAccessServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void resolveContextReturnsCorporateScopeForRootWithoutDatabaseLookup() {
        var service = new FinanceAccessService(jdbcTemplate);
        var context = service.resolveContext(new AuthSessionUser(1L, 7L, "Root User", "root"));

        assertTrue(context.isPresent());
        assertEquals(FinanceScope.Type.CORPORATE_OFFICE, context.get().scope().type());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void resolveContextAllowsExistingExpensesModuleSlug() {
        var service = new FinanceAccessService(jdbcTemplate);

        stubUserCompanyId(33L);
        stubModuleSlugs(List.of("expenses"));
        stubScope(FinanceScope.businessOffice(5L, 9L));

        var context = service.resolveContext(new AuthSessionUser(1L, 7L, "Finance User", "user"));

        assertTrue(context.isPresent());
        assertEquals(FinanceScope.Type.BUSINESS_OFFICE, context.get().scope().type());
        assertEquals(9L, context.get().scope().businessId());
    }

    @Test
    void resolveContextAllowsFutureFinanceModuleSlug() {
        var service = new FinanceAccessService(jdbcTemplate);

        stubUserCompanyId(33L);
        stubModuleSlugs(List.of("finance"));
        stubScope(FinanceScope.unitHeadquarters(5L));

        var context = service.resolveContext(new AuthSessionUser(1L, 7L, "Finance User", "user"));

        assertTrue(context.isPresent());
        assertEquals(FinanceScope.Type.UNIT_HEADQUARTERS, context.get().scope().type());
    }

    @Test
    void resolveContextAllowsLegacyAdminWhenModuleRowsAreEmpty() {
        var service = new FinanceAccessService(jdbcTemplate);

        stubUserCompanyId(33L);
        stubModuleSlugs(List.of());
        stubScope(FinanceScope.corporateOffice());

        var context = service.resolveContext(new AuthSessionUser(1L, 7L, "Admin User", "admin"));

        assertTrue(context.isPresent());
        assertEquals(FinanceScope.Type.CORPORATE_OFFICE, context.get().scope().type());
    }

    @Test
    void resolveContextDeniesWhenExplicitModulesExcludeFinance() {
        var service = new FinanceAccessService(jdbcTemplate);

        stubUserCompanyId(33L);
        stubModuleSlugs(List.of("processes"));

        var context = service.resolveContext(new AuthSessionUser(1L, 7L, "Scoped User", "user"));

        assertTrue(context.isEmpty());
    }

    @Test
    void paymentAccountReadContextAllowsCrmWithoutGrantingGeneralFinanceContext() {
        var service = new FinanceAccessService(jdbcTemplate);

        stubUserCompanyId(33L);
        stubModuleSlugs(List.of("crm"));
        stubScope(FinanceScope.businessOffice(5L, 9L));

        var context = service.resolvePaymentAccountContext(
            new AuthSessionUser(1L, 7L, "Sales User", "user")
        );

        assertTrue(context.isPresent());
        assertEquals(FinanceScope.Type.BUSINESS_OFFICE, context.get().scope().type());
        assertEquals(9L, context.get().scope().businessId());
    }

    private void stubUserCompanyId(long userCompanyId) {
        when(jdbcTemplate.query(
            contains("FROM user_companies"),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(1L),
            eq(7L)
        )).thenReturn(List.of(userCompanyId));
    }

    private void stubModuleSlugs(List<String> moduleSlugs) {
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(33L)
        )).thenReturn(moduleSlugs);
    }

    private void stubScope(FinanceScope scope) {
        when(jdbcTemplate.query(
            contains("FROM user_work_profiles"),
            ArgumentMatchers.<RowMapper<FinanceScope>>any(),
            eq(7L),
            eq(33L)
        )).thenReturn(List.of(scope));
    }
}
