package com.indice.erp.systemticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
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
class SystemTicketServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private DistributorPortfolioAccessPolicy distributorAccess;

    @Mock
    private PlatformAdminAccessService platformAccess;

    private SystemTicketService service;

    @BeforeEach
    void setUp() {
        service = new SystemTicketService(
            jdbcTemplate,
            distributorAccess,
            platformAccess,
            Clock.fixed(Instant.parse("2026-08-14T18:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    @SuppressWarnings("unchecked")
    void distributorQueueIsAlwaysScopedToItsOwnCompany() {
        var actor = new AuthSessionUser(11L, 31L, 41L, "Distributor", "owner");
        given(distributorAccess.requireDistributor(actor))
            .willReturn(new DistributorPortfolioAccessPolicy.DistributorIdentity(31L, "Aliado Norte"));
        given(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(31L)))
            .willReturn(List.of());

        var workspace = service.listForDistributor(actor, "", "ACTIVE", "ALL");

        assertThat(workspace.tickets()).isEmpty();
        verify(jdbcTemplate).query(
            argThat(sql -> sql.contains("WHERE ticket.distributor_company_id = ?\nORDER BY")
                && !sql.contains("?ORDER BY")),
            any(RowMapper.class),
            eq(31L)
        );
    }

    @Test
    void invalidReportsAreRejectedBeforeAnythingIsPersisted() {
        var actor = new AuthSessionUser(11L, 31L, 41L, "Distributor", "owner");
        given(distributorAccess.requireDistributor(actor))
            .willReturn(new DistributorPortfolioAccessPolicy.DistributorIdentity(31L, "Aliado Norte"));

        assertThatThrownBy(() -> service.create(actor, new SystemTicketService.CreateRequest(
            "FAILURE", "HIGH", "Inventarios", " ", "No carga la tabla."
        )))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Title");
    }
}
