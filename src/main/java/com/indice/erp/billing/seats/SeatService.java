package com.indice.erp.billing.seats;

import com.indice.erp.billing.BillingHashing;
import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeatService {

    private static final Duration INVITATION_RESERVATION_TTL = Duration.ofDays(7);

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public SeatService(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    @Transactional
    public Reservation reserveInvitation(long companyId, String email, long actorUserId, String idempotencyKey) {
        var state = lockState(companyId);
        if (state == null) {
            return Reservation.unlimited();
        }
        expireAndSynchronize(companyId);
        var hash = BillingHashing.sha256(idempotencyKey);
        var existing = jdbcTemplate.query(
            """
                SELECT id, status FROM company_seat_reservations
                WHERE idempotency_key_hash = ?
                """,
            (rs, rowNum) -> new ExistingReservation(rs.getLong(1), rs.getString(2)),
            hash
        );
        if (!existing.isEmpty()) {
            if (!"RESERVED".equals(existing.getFirst().status())) {
                throw new IllegalStateException("The invitation seat reservation is no longer active.");
            }
            return new Reservation(existing.getFirst().id(), true);
        }
        var snapshot = snapshotLocked(companyId);
        if (snapshot.usedAndReserved() >= snapshot.limit()) {
            throw new SeatCapacityExceededException(
                "The company has reached its seat limit. Purchase another seat before inviting this user.",
                snapshot
            );
        }
        jdbcTemplate.update(
            """
                INSERT INTO company_seat_reservations (
                    company_id, email_normalized, status, expires_at,
                    idempotency_key_hash, reserved_by_user_id
                ) VALUES (?, ?, 'RESERVED', ?, ?, ?)
                """,
            companyId,
            normalizeEmail(email),
            java.sql.Timestamp.from(clock.instant().plus(INVITATION_RESERVATION_TTL)),
            hash,
            actorUserId
        );
        var id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbcTemplate.update(
            "UPDATE company_seat_states SET reserved_seats = reserved_seats + 1, version = version + 1 WHERE company_id = ?",
            companyId
        );
        return new Reservation(id == null ? 0 : id, true);
    }

    @Transactional
    public void attachInvitation(Reservation reservation, long invitationId) {
        if (reservation == null || !reservation.enforced()) {
            return;
        }
        jdbcTemplate.update(
            "UPDATE company_seat_reservations SET invitation_id = ? WHERE id = ? AND status = 'RESERVED'",
            invitationId,
            reservation.id()
        );
    }

    @Transactional
    public void refreshInvitation(long companyId, long invitationId, String email, long actorUserId) {
        if (lockState(companyId) == null) {
            return;
        }
        expireAndSynchronize(companyId);
        var reservation = jdbcTemplate.query(
            """
                SELECT id, status FROM company_seat_reservations
                WHERE company_id = ? AND invitation_id = ? FOR UPDATE
                """,
            (rs, rowNum) -> new ExistingReservation(rs.getLong(1), rs.getString(2)),
            companyId,
            invitationId
        ).stream().findFirst().orElse(null);
        if (reservation != null && "RESERVED".equals(reservation.status())) {
            jdbcTemplate.update(
                """
                    UPDATE company_seat_reservations
                    SET email_normalized = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP(6)
                    WHERE id = ?
                    """,
                normalizeEmail(email),
                java.sql.Timestamp.from(clock.instant().plus(INVITATION_RESERVATION_TTL)),
                reservation.id()
            );
            synchronizeReserved(companyId);
            return;
        }
        var snapshot = snapshotLocked(companyId);
        if (snapshot.usedAndReserved() >= snapshot.limit()) {
            throw new SeatCapacityExceededException(
                "The company has reached its seat limit. Purchase another seat before resending this invitation.",
                snapshot
            );
        }
        if (reservation != null) {
            jdbcTemplate.update(
                """
                    UPDATE company_seat_reservations
                    SET email_normalized = ?, status = 'RESERVED', expires_at = ?,
                        reserved_by_user_id = ?, consumed_by_user_company_id = NULL,
                        consumed_at = NULL, released_at = NULL, updated_at = CURRENT_TIMESTAMP(6)
                    WHERE id = ?
                    """,
                normalizeEmail(email),
                java.sql.Timestamp.from(clock.instant().plus(INVITATION_RESERVATION_TTL)),
                actorUserId,
                reservation.id()
            );
        } else {
            jdbcTemplate.update(
                """
                    INSERT INTO company_seat_reservations (
                        company_id, invitation_id, email_normalized, status, expires_at,
                        idempotency_key_hash, reserved_by_user_id
                    ) VALUES (?, ?, ?, 'RESERVED', ?, ?, ?)
                    """,
                companyId,
                invitationId,
                normalizeEmail(email),
                java.sql.Timestamp.from(clock.instant().plus(INVITATION_RESERVATION_TTL)),
                BillingHashing.sha256("invitation-resend:" + companyId + ":" + invitationId),
                actorUserId
            );
        }
        synchronizeReserved(companyId);
    }

    @Transactional
    public void releaseInvitation(long companyId, long invitationId) {
        if (lockState(companyId) == null) {
            return;
        }
        var updated = jdbcTemplate.update(
            """
                UPDATE company_seat_reservations
                SET status = 'RELEASED', released_at = CURRENT_TIMESTAMP(6)
                WHERE company_id = ? AND invitation_id = ? AND status = 'RESERVED'
                """,
            companyId,
            invitationId
        );
        if (updated > 0) {
            synchronizeReserved(companyId);
        }
    }

    @Transactional
    public void consumeInvitation(long companyId, long invitationId, long userCompanyId) {
        if (lockState(companyId) == null) {
            return;
        }
        expireAndSynchronize(companyId);
        jdbcTemplate.update(
            """
                UPDATE company_seat_reservations
                SET status = 'CONSUMED', consumed_by_user_company_id = ?, consumed_at = CURRENT_TIMESTAMP(6)
                WHERE company_id = ? AND invitation_id = ? AND status = 'RESERVED'
                  AND expires_at > CURRENT_TIMESTAMP(6)
                """,
            userCompanyId,
            companyId,
            invitationId
        );
        synchronizeReserved(companyId);
        var snapshot = snapshotLocked(companyId);
        if (snapshot.usedAndReserved() > snapshot.limit()) {
            throw new SeatCapacityExceededException(
                "The invitation can no longer be accepted because the company seat limit was reached.",
                snapshot
            );
        }
    }

    @Transactional(readOnly = true)
    public SeatSnapshot snapshot(long companyId) {
        var state = jdbcTemplate.query(
            "SELECT company_id FROM company_seat_states WHERE company_id = ?",
            (rs, rowNum) -> rs.getLong(1),
            companyId
        );
        return state.isEmpty() ? unlimitedSnapshot(companyId) : snapshotLocked(companyId);
    }

    @Transactional
    public SeatSnapshot requireAvailableSeatForActivation(long companyId, long userId) {
        var state = lockState(companyId);
        if (state == null) {
            return SeatSnapshot.unlimited(companyId);
        }
        expireAndSynchronize(companyId);
        var snapshot = snapshotLocked(companyId);
        var alreadyActive = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_companies
                WHERE company_id = ?
                  AND user_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                """,
            Integer.class,
            companyId,
            userId
        );
        if (alreadyActive != null && alreadyActive > 0) {
            return snapshot;
        }
        if (snapshot.usedAndReserved() >= snapshot.limit()) {
            throw new SeatCapacityExceededException(
                "The company has reached its seat limit. Purchase another seat before activating this user.",
                snapshot
            );
        }
        return snapshot;
    }

    private State lockState(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT included_seats, purchased_extra_seats
                FROM company_seat_states WHERE company_id = ? FOR UPDATE
                """,
            (rs, rowNum) -> new State(rs.getInt(1), rs.getInt(2)),
            companyId
        ).stream().findFirst().orElse(null);
    }

    private void expireAndSynchronize(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE company_seat_reservations
                SET status = 'EXPIRED', released_at = CURRENT_TIMESTAMP(6)
                WHERE company_id = ? AND status = 'RESERVED' AND expires_at <= CURRENT_TIMESTAMP(6)
                """,
            companyId
        );
        synchronizeReserved(companyId);
    }

    private void synchronizeReserved(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE company_seat_states state
                SET reserved_seats = (
                    SELECT COUNT(*) FROM company_seat_reservations reservation
                    WHERE reservation.company_id = state.company_id
                      AND reservation.status = 'RESERVED'
                      AND reservation.expires_at > CURRENT_TIMESTAMP(6)
                ), version = version + 1
                WHERE state.company_id = ?
                """,
            companyId
        );
    }

    private SeatSnapshot snapshotLocked(long companyId) {
        return jdbcTemplate.queryForObject(
            """
                SELECT state.included_seats,
                       state.purchased_extra_seats,
                       state.reserved_seats,
                       (SELECT COUNT(*) FROM user_companies membership
                         WHERE membership.company_id = state.company_id
                           AND LOWER(COALESCE(membership.status, 'active')) = 'active') AS active_seats,
                       (SELECT COALESCE(SUM(benefit.quantity), 0)
                          FROM company_benefit_grants benefit
                         WHERE benefit.company_id = state.company_id
                           AND benefit.benefit_type = 'SEAT'
                           AND benefit.status = 'ACTIVE'
                           AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                           AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))) AS benefit_seats
                FROM company_seat_states state
                WHERE state.company_id = ?
                """,
            (rs, rowNum) -> new SeatSnapshot(
                companyId,
                true,
                rs.getInt("included_seats"),
                rs.getInt("purchased_extra_seats"),
                rs.getInt("benefit_seats"),
                rs.getInt("active_seats"),
                rs.getInt("reserved_seats")
            ),
            companyId
        );
    }

    private SeatSnapshot unlimitedSnapshot(long companyId) {
        return jdbcTemplate.queryForObject(
            """
                SELECT
                    (SELECT COUNT(*) FROM user_companies membership
                      WHERE membership.company_id = ?
                        AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')) AS active_seats,
                    (SELECT COUNT(*) FROM user_invitations invitation
                      WHERE invitation.company_id = ?
                        AND LOWER(COALESCE(invitation.status, 'pending')) = 'pending'
                        AND invitation.expires_at > UTC_TIMESTAMP()) AS pending_invitations
                """,
            (rs, rowNum) -> new SeatSnapshot(
                companyId, false, 0, 0, 0,
                rs.getInt("active_seats"), rs.getInt("pending_invitations")
            ),
            companyId,
            companyId
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private record State(int includedSeats, int purchasedExtraSeats) {
    }

    private record ExistingReservation(long id, String status) {
    }

    public record Reservation(long id, boolean enforced) {
        static Reservation unlimited() {
            return new Reservation(0, false);
        }
    }

    public record SeatSnapshot(
        long companyId,
        boolean enforced,
        int included,
        int purchasedExtra,
        int benefitExtra,
        int active,
        int reserved
    ) {
        public int limit() {
            return enforced ? included + purchasedExtra + benefitExtra : Integer.MAX_VALUE;
        }

        public int usedAndReserved() {
            return active + reserved;
        }

        public int available() {
            return enforced ? Math.max(0, limit() - usedAndReserved()) : Integer.MAX_VALUE;
        }

        static SeatSnapshot unlimited(long companyId) {
            return new SeatSnapshot(companyId, false, 0, 0, 0, 0, 0);
        }
    }
}
