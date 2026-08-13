package com.indice.erp.distributorportal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import java.sql.ResultSet;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class DistributorPortfolioAccessPolicyTest {

    @Mock
    private JdbcTemplate jdbc;

    private DistributorPortfolioAccessPolicy policy;
    private AuthSessionUser actor;

    @BeforeEach
    void setUp() {
        policy = new DistributorPortfolioAccessPolicy(jdbc);
        actor = new AuthSessionUser(7L, 12L, 22L, "Distributor Owner", "superadmin");
    }

    @Test
    void assignedClientCanBeManaged() throws Exception {
        stubDistributor();
        when(jdbc.queryForObject(
            contains("client.distributor_company_id = ?"),
            eq(Integer.class),
            eq(41L), eq(12L), eq(12L), eq(12L)
        )).thenReturn(1);

        var identity = policy.requireClient(actor, 41L);

        assertThat(identity.companyId()).isEqualTo(12L);
        assertThat(identity.companyName()).isEqualTo("Aliado Norte");
    }

    @Test
    void clientOutsidePortfolioIsRejected() throws Exception {
        stubDistributor();
        when(jdbc.queryForObject(
            contains("client.distributor_company_id = ?"),
            eq(Integer.class),
            eq(99L), eq(12L), eq(12L), eq(12L)
        )).thenReturn(0);

        assertThatThrownBy(() -> policy.requireClient(actor, 99L))
            .isInstanceOf(DistributorPortalForbiddenException.class)
            .hasMessageContaining("does not belong");
    }

    @Test
    void appointmentFromPortfolioCanBeManaged() throws Exception {
        stubDistributor();
        when(jdbc.queryForObject(
            contains("JOIN companies client"),
            eq(Integer.class),
            eq(73L), eq(12L), eq(12L), eq(12L)
        )).thenReturn(1);

        var identity = policy.requireAppointment(actor, 73L);

        assertThat(identity.companyId()).isEqualTo(12L);
    }

    @Test
    void appointmentOutsidePortfolioIsRejected() throws Exception {
        stubDistributor();
        when(jdbc.queryForObject(
            contains("JOIN companies client"),
            eq(Integer.class),
            eq(74L), eq(12L), eq(12L), eq(12L)
        )).thenReturn(0);

        assertThatThrownBy(() -> policy.requireAppointment(actor, 74L))
            .isInstanceOf(DistributorPortalForbiddenException.class)
            .hasMessageContaining("consulting session");
    }

    @Test
    void inactiveMembershipCannotOperateThePortal() {
        when(jdbc.query(
            contains("LOWER(COALESCE(membership.status, 'active')) = 'active'"),
            ArgumentMatchers.<RowMapper<DistributorPortfolioAccessPolicy.DistributorIdentity>>any(),
            eq(22L), eq(7L), eq(12L)
        )).thenReturn(List.of());

        assertThatThrownBy(() -> policy.requireDistributor(actor))
            .isInstanceOf(DistributorPortalForbiddenException.class)
            .hasMessageContaining("authorized distributor");
    }

    private void stubDistributor() throws Exception {
        when(jdbc.query(
            contains("company.commercial_account_type"),
            ArgumentMatchers.<RowMapper<DistributorPortfolioAccessPolicy.DistributorIdentity>>any(),
            eq(22L), eq(7L), eq(12L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var mapper = (RowMapper<DistributorPortfolioAccessPolicy.DistributorIdentity>) invocation.getArgument(1);
            var resultSet = org.mockito.Mockito.mock(ResultSet.class);
            when(resultSet.getLong("id")).thenReturn(12L);
            when(resultSet.getString("name")).thenReturn("Aliado Norte");
            return List.of(mapper.mapRow(resultSet, 0));
        });
    }
}
