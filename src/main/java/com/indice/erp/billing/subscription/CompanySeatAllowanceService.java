package com.indice.erp.billing.subscription;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CompanySeatAllowanceService {

    private final JdbcTemplate jdbcTemplate;

    public CompanySeatAllowanceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public CompanySeatAllowance currentUsage(long companyId) {
        return loadPlan(companyId, false)
            .map((plan) -> usage(companyId, plan, null))
            .orElseGet(this::emptyAllowance);
    }

    public void requireAvailableSeatForInvitation(long companyId) {
        requireAvailableSeat(companyId, null);
    }

    public void requireAvailableSeatForUserCreation(long companyId) {
        requireAvailableSeat(companyId, null);
    }

    public void requireAvailableSeatForInvitationAcceptance(long companyId, long invitationId) {
        requireAvailableSeat(companyId, invitationId);
    }

    private void requireAvailableSeat(long companyId, Long excludedInvitationId) {
        var plan = loadPlan(companyId, true);
        if (plan.isEmpty()) {
            return;
        }
        var allowance = usage(companyId, plan.get(), excludedInvitationId);
        if (allowance.remainingSeats() <= 0) {
            throw new CompanySeatLimitExceededException(
                "Your plan has no remaining collaborator seats. Add extra collaborators before adding more users.",
                "seat_limit_exceeded",
                allowance
            );
        }
    }

    private Optional<SeatPlan> loadPlan(long companyId, boolean lock) {
        var sql = """
            SELECT included_seats, purchased_extra_seats AS extra_seats
            FROM company_seat_states
            WHERE company_id = ?
            LIMIT 1
            """;
        if (lock) {
            sql += " FOR UPDATE";
        }
        var rows = jdbcTemplate.query(
            sql,
            (rs, rowNum) -> new SeatPlan(rs.getInt("included_seats"), rs.getInt("extra_seats")),
            companyId
        );
        if (!rows.isEmpty()) {
            return Optional.of(rows.getFirst());
        }
        var subscriptionSql = """
            SELECT included_seats, extra_seats
            FROM company_billing_subscriptions
            WHERE company_id = ?
            ORDER BY last_event_created_at DESC, id DESC
            LIMIT 1
            """;
        if (lock) {
            subscriptionSql += " FOR UPDATE";
        }
        return jdbcTemplate.query(
            subscriptionSql,
            (rs, rowNum) -> new SeatPlan(rs.getInt("included_seats"), rs.getInt("extra_seats")),
            companyId
        ).stream().findFirst();
    }

    private CompanySeatAllowance usage(long companyId, SeatPlan plan, Long excludedInvitationId) {
        var allowed = Math.max(0, plan.includedSeats()) + Math.max(0, plan.extraSeats());
        var used = activeUsers(companyId) + pendingInvitations(companyId, excludedInvitationId);
        return new CompanySeatAllowance(allowed, used, Math.max(0, allowed - used), plan.includedSeats(), plan.extraSeats());
    }

    private int activeUsers(long companyId) {
        return count(
            """
                SELECT COUNT(*)
                FROM user_companies
                WHERE company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                """,
            companyId
        );
    }

    private int pendingInvitations(long companyId, Long excludedInvitationId) {
        if (excludedInvitationId == null) {
            return count(
                """
                    SELECT COUNT(*)
                    FROM user_invitations
                    WHERE company_id = ?
                      AND COALESCE(status, 'pending') = 'pending'
                      AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
                    """,
                companyId
            );
        }
        return count(
            """
                SELECT COUNT(*)
                FROM user_invitations
                WHERE company_id = ?
                  AND id <> ?
                  AND COALESCE(status, 'pending') = 'pending'
                  AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
                """,
            companyId,
            excludedInvitationId
        );
    }

    private int count(String sql, Object... args) {
        var value = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }

    private CompanySeatAllowance emptyAllowance() {
        return new CompanySeatAllowance(0, 0, 0, 0, 0);
    }

    private record SeatPlan(int includedSeats, int extraSeats) {
    }
}
