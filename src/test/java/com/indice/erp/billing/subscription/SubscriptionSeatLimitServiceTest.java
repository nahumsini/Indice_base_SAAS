package com.indice.erp.billing.subscription;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class SubscriptionSeatLimitServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void usageCountsActiveUsersAndPendingInvitationsAgainstPaidLimit() {
        var service = new SubscriptionSeatLimitService(jdbcTemplate);
        stubSeatLimit(7L, 6);
        stubBenefitSeats(7L, 3);
        stubActiveSeats(7L, 4);
        stubPendingInvitations(7L, 1);

        var usage = service.usage(7L);

        assertTrue(usage.enforced());
        assertEquals(9, usage.allowedSeats());
        assertEquals(5, usage.usedSeats());
        assertEquals(4, usage.remainingSeats());
    }

    @Test
    void legacySubscriptionsAreNotSeatLimited() {
        var service = new SubscriptionSeatLimitService(jdbcTemplate);
        stubSeatLimit(7L);
        stubActiveSeats(7L, 12);
        stubPendingInvitations(7L, 2);

        var usage = service.usage(7L);

        assertFalse(usage.enforced());
        assertEquals(14, usage.usedSeats());
    }

    @Test
    void availableSeatIsRequiredBeforeCreatingNewCollaborator() {
        var service = new SubscriptionSeatLimitService(jdbcTemplate);
        stubSeatLimit(7L, 5);
        stubBenefitSeats(7L, 0);
        stubActiveSeats(7L, 5);
        stubPendingInvitations(7L, 0);

        var error = assertThrows(IllegalStateException.class, () -> service.requireAvailableSeat(7L));

        assertEquals("Company seat limit reached. Add extra collaborators before inviting or creating another user.", error.getMessage());
    }

    @SafeVarargs
    private void stubSeatLimit(long companyId, Integer... limits) {
        when(jdbcTemplate.query(
            contains("FROM company_seat_states"),
            org.mockito.ArgumentMatchers.<RowMapper<Integer>>any(),
            eq(companyId)
        )).thenReturn(List.of(limits));
        if (limits.length == 0) {
            when(jdbcTemplate.query(
                contains("FROM company_billing_subscriptions"),
                org.mockito.ArgumentMatchers.<RowMapper<Integer>>any(),
                eq(companyId)
            )).thenReturn(List.of());
        }
    }

    private void stubActiveSeats(long companyId, int count) {
        when(jdbcTemplate.queryForObject(
            contains("FROM user_companies"),
            eq(Integer.class),
            eq(companyId)
        )).thenReturn(count);
    }

    private void stubBenefitSeats(long companyId, int count) {
        when(jdbcTemplate.queryForObject(
            contains("benefit_type = 'SEAT'"),
            eq(Integer.class),
            eq(companyId)
        )).thenReturn(count);
    }

    private void stubPendingInvitations(long companyId, int count) {
        when(jdbcTemplate.queryForObject(
            contains("FROM user_invitations"),
            eq(Integer.class),
            eq(companyId)
        )).thenReturn(count);
    }
}
