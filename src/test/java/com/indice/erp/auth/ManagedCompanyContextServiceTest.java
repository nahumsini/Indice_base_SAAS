package com.indice.erp.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.indice.erp.distributorportal.DistributorPortalForbiddenException;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy.DistributorIdentity;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAuditService;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class ManagedCompanyContextServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private SessionAuthService auth;

    @Mock
    private PlatformAdminAccessService platformAccess;

    @Mock
    private DistributorPortfolioAccessPolicy distributorAccess;

    @Mock
    private PlatformAuditService audit;

    @Mock
    private HttpSession session;

    private ManagedCompanyContextService service;
    private AuthSessionUser actor;

    @BeforeEach
    void setUp() {
        service = new ManagedCompanyContextService(jdbcTemplate, auth, platformAccess, distributorAccess, audit);
        actor = new AuthSessionUser(41L, 7L, 11L, "Operator", "owner");
        given(auth.isPublicDemoSession(session)).willReturn(false);
    }

    @Test
    void ordinaryTenantAccountsCannotActivateAClientContext() {
        given(distributorAccess.requireDistributor(actor)).willThrow(
            new DistributorPortalForbiddenException("Distributor administration access is required.")
        );

        assertThatThrownBy(() -> service.activate(actor, 44L, session))
            .isInstanceOf(ManagedCompanyContextForbiddenException.class)
            .hasMessageContaining("not available");

        verify(audit).record(
            eq(41L),
            eq("DELEGATED_COMPANY_CONTEXT_DENIED"),
            eq("COMPANY"),
            eq("44"),
            eq(44L),
            eq("DENIED"),
            any()
        );
    }

    @Test
    void distributorCannotActivateACompanyOutsideItsPortfolio() {
        given(distributorAccess.requireDistributor(actor)).willReturn(new DistributorIdentity(7L, "Distribuidor Uno"));
        given(distributorAccess.requireClient(actor, 44L)).willThrow(
            new DistributorPortalForbiddenException("This client does not belong to the active distributor portfolio.")
        );

        assertThatThrownBy(() -> service.activate(actor, 44L, session))
            .isInstanceOf(ManagedCompanyContextForbiddenException.class)
            .hasMessageContaining("not part of the distributor portfolio");

        verify(audit).record(
            eq(41L),
            eq("DELEGATED_COMPANY_CONTEXT_DENIED"),
            eq("COMPANY"),
            eq("44"),
            eq(44L),
            eq("DENIED"),
            any()
        );
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void platformRootCannotActivateADeletedClientCompany() {
        given(platformAccess.find(41L)).willReturn(
            new PlatformAdminAccessService.Access(1L, "PLATFORM_ROOT", List.of())
        );
        given(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(7L))).willReturn(List.of());
        given(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(44L))).willReturn(List.of());

        assertThatThrownBy(() -> service.activate(actor, 44L, session))
            .isInstanceOf(ManagedCompanyContextForbiddenException.class)
            .hasMessageContaining("not available");

        verify(jdbcTemplate).query(
            argThat((String sql) -> sql.contains("platform_status = 'ACTIVE'")),
            any(RowMapper.class),
            eq(44L)
        );
    }
}
