package com.indice.erp.billing.subscription;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionSeatLimitService {

    private final JdbcTemplate jdbcTemplate;

    public SubscriptionSeatLimitService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public SubscriptionSeatUsage usage(long companyId) {
        var activeSeats = activeSeatCount(companyId);
        var pendingInvitations = pendingInvitationCount(companyId);
        var limit = seatLimit(companyId);
        if (limit <= 0) {
            return SubscriptionSeatUsage.notEnforced(activeSeats, pendingInvitations);
        }
        var usedSeats = activeSeats + pendingInvitations;
        return new SubscriptionSeatUsage(
            limit,
            activeSeats,
            pendingInvitations,
            usedSeats,
            Math.max(0, limit - usedSeats),
            true
        );
    }

    public void requireAvailableSeat(long companyId) {
        var usage = usage(companyId);
        if (usage.enforced() && usage.usedSeats() >= usage.allowedSeats()) {
            throw new IllegalStateException("Company seat limit reached. Add extra collaborators before inviting or creating another user.");
        }
    }

    public void requireInvitationAcceptanceWithinLimit(long companyId) {
        var usage = usage(companyId);
        if (usage.enforced() && usage.usedSeats() > usage.allowedSeats()) {
            throw new IllegalStateException("Company seat limit reached. Add extra collaborators before accepting this invitation.");
        }
    }

    private int seatLimit(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT included_seats + purchased_extra_seats AS seat_limit
                FROM company_seat_states
                WHERE company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getInt("seat_limit"),
            companyId
        );
        if (!rows.isEmpty()) {
            return Math.max(0, rows.getFirst()) + activeBenefitSeats(companyId);
        }
        var subscriptionRows = jdbcTemplate.query(
            """
                SELECT included_seats + extra_seats AS seat_limit
                FROM company_billing_subscriptions
                WHERE company_id = ?
                ORDER BY last_event_created_at DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getInt("seat_limit"),
            companyId
        );
        return subscriptionRows.isEmpty()
            ? 0
            : Math.max(0, subscriptionRows.getFirst()) + activeBenefitSeats(companyId);
    }

    private int activeBenefitSeats(long companyId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COALESCE(SUM(quantity), 0)
                FROM company_benefit_grants
                WHERE company_id = ?
                  AND benefit_type = 'SEAT'
                  AND status = 'ACTIVE'
                  AND starts_at <= CURRENT_TIMESTAMP(6)
                  AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP(6))
                """,
            Integer.class,
            companyId
        );
        return count == null ? 0 : Math.max(0, count);
    }

    private int activeSeatCount(long companyId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_companies
                WHERE company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                """,
            Integer.class,
            companyId
        );
        return count == null ? 0 : count;
    }

    private int pendingInvitationCount(long companyId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_invitations
                WHERE company_id = ?
                  AND COALESCE(status, 'pending') = 'pending'
                  AND expires_at > UTC_TIMESTAMP()
                """,
            Integer.class,
            companyId
        );
        return count == null ? 0 : count;
    }
}
