package com.indice.erp.distributorportal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class DistributorPortalServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private DistributorPortfolioAccessPolicy accessPolicy;

    private DistributorPortalService service;
    private final AuthSessionUser actor = new AuthSessionUser(7L, 12L, 22L, "Owner", "superadmin");

    @BeforeEach
    void setUp() {
        service = new DistributorPortalService(
            jdbc,
            accessPolicy,
            Clock.fixed(Instant.parse("2026-08-13T12:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void distributorAdministratorReceivesTheDedicatedPortalContext() {
        when(accessPolicy.requireDistributor(actor)).thenReturn(
            new DistributorPortfolioAccessPolicy.DistributorIdentity(12L, "Aliado Norte")
        );

        var context = service.context(actor);

        assertThat(context.account_type()).isEqualTo("DISTRIBUTOR");
        assertThat(context.operator_name()).isEqualTo("Owner");
        assertThat(context.available_tabs()).containsExactly(
            "CONTRACTS_ACCESS",
            "CONSULTING",
            "TRAINING",
            "SYSTEM_TICKETS"
        );
    }

    @Test
    void directCustomerCannotOpenTheDistributorPortal() {
        when(accessPolicy.requireDistributor(actor)).thenThrow(
            new DistributorPortalForbiddenException("The active company is not an authorized distributor account.")
        );

        assertThatThrownBy(() -> service.context(actor))
            .isInstanceOf(DistributorPortalForbiddenException.class)
            .hasMessageContaining("not an authorized distributor");
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void portfolioQueryIsAlwaysScopedToTheActiveDistributorCompany() {
        var adminActor = new AuthSessionUser(7L, 12L, 22L, "Owner", "admin");
        when(accessPolicy.requireDistributor(adminActor)).thenReturn(
            new DistributorPortfolioAccessPolicy.DistributorIdentity(12L, "Aliado Norte")
        );
        when(jdbc.query(
            contains("client.distributor_company_id = ?"),
            any(RowMapper.class),
            eq(12L),
            eq(12L),
            eq(12L)
        )).thenReturn((List) List.of());

        var portfolio = service.portfolio(
            adminActor,
            "",
            "ALL"
        );

        assertThat(portfolio.clients()).isEmpty();
        verify(jdbc).query(
            contains("client.distributor_company_id = ?"),
            any(RowMapper.class),
            eq(12L),
            eq(12L),
            eq(12L)
        );
    }

}
