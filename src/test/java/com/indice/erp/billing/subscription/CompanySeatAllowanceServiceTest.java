package com.indice.erp.billing.subscription;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.ResultSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class CompanySeatAllowanceServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void currentUsageCountsActiveUsersAndPendingUnexpiredInvitations() throws Exception {
        var service = new CompanySeatAllowanceService(jdbcTemplate);
        givenPlan(5, 2);
        givenActiveUsers(3);
        givenPendingInvitations(2);

        var usage = service.currentUsage(7L);

        assertEquals(7, usage.allowedSeats());
        assertEquals(5, usage.usedSeats());
        assertEquals(2, usage.remainingSeats());
    }

    @Test
    void inviteBlocksWhenPlanHasNoRemainingSeats() throws Exception {
        var service = new CompanySeatAllowanceService(jdbcTemplate);
        givenPlan(5, 0);
        givenActiveUsers(5);
        givenPendingInvitations(0);

        var error = assertThrows(
            CompanySeatLimitExceededException.class,
            () -> service.requireAvailableSeatForInvitation(7L)
        );

        assertEquals("seat_limit_exceeded", error.responseBody().get("code"));
    }

    @Test
    void invitationAcceptanceAllowsReservedInviteToBecomeActiveUser() throws Exception {
        var service = new CompanySeatAllowanceService(jdbcTemplate);
        givenPlan(1, 0);
        givenActiveUsers(0);
        when(jdbcTemplate.queryForObject(contains("id <> ?"), eq(Integer.class), eq(7L), eq(99L)))
            .thenReturn(0);

        assertDoesNotThrow(() -> service.requireAvailableSeatForInvitationAcceptance(7L, 99L));
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void givenPlan(int included, int extra) throws Exception {
        when(jdbcTemplate.query(
            contains("FROM company_seat_states"),
            ArgumentMatchers.<RowMapper>any(),
            eq(7L)
        )).thenAnswer(invocation -> {
            RowMapper mapper = invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getInt("included_seats")).thenReturn(included);
            when(rs.getInt("extra_seats")).thenReturn(extra);
            return List.of(mapper.mapRow(rs, 0));
        });
    }

    private void givenActiveUsers(int count) {
        when(jdbcTemplate.queryForObject(contains("FROM user_companies"), eq(Integer.class), eq(7L)))
            .thenReturn(count);
    }

    private void givenPendingInvitations(int count) {
        when(jdbcTemplate.queryForObject(contains("FROM user_invitations"), eq(Integer.class), eq(7L)))
            .thenReturn(count);
    }
}
