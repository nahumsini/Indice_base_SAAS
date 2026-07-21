package com.indice.erp.billing.ownership;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CompanyOwnershipTransferService {

    private static final Duration TRANSFER_TTL = Duration.ofHours(24);

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAuditService audit;
    private final Clock clock;

    public CompanyOwnershipTransferService(JdbcTemplate jdbcTemplate, PlatformAuditService audit, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional
    public Map<String, Object> request(long companyId, long actorUserId, String targetEmail, String reason) {
        var ownership = lockOwnership(companyId);
        if (ownership.ownerUserId() != actorUserId) {
            throw new OwnershipForbiddenException("Only the current account owner can transfer ownership.");
        }
        var normalizedEmail = targetEmail == null ? "" : targetEmail.trim().toLowerCase(Locale.ROOT);
        if (normalizedEmail.isBlank()) {
            throw new IllegalArgumentException("The new owner email is required.");
        }
        var target = jdbcTemplate.query(
            """
                SELECT membership.user_id, membership.id AS user_company_id, user.email
                FROM users user
                JOIN user_companies membership ON membership.user_id = user.id
                WHERE membership.company_id = ?
                  AND LOWER(user.email) = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                LIMIT 1
                FOR UPDATE
                """,
            (rs, rowNum) -> new Target(rs.getLong("user_id"), rs.getLong("user_company_id"), rs.getString("email")),
            companyId,
            normalizedEmail
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException(
            "The new owner must first be an active member of this company."
        ));
        if (target.userId() == actorUserId) {
            throw new IllegalArgumentException("This user already owns the account.");
        }
        var ownedCompanies = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM company_ownerships WHERE owner_user_id = ? AND status = 'ACTIVE'",
            Integer.class,
            target.userId()
        );
        if (ownedCompanies != null && ownedCompanies > 0) {
            throw new IllegalStateException(
                "The target user already owns another account. Complete an audited account-merge process first."
            );
        }
        jdbcTemplate.update(
            """
                UPDATE company_ownership_transfer_requests
                SET status = 'CANCELED', canceled_at = CURRENT_TIMESTAMP(6)
                WHERE company_id = ? AND status = 'PENDING'
                """,
            companyId
        );
        var rawToken = UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
        var reference = UUID.randomUUID().toString().replace("-", "");
        jdbcTemplate.update(
            """
                INSERT INTO company_ownership_transfer_requests (
                    public_reference, company_id, from_user_id, to_user_id,
                    token_hash, reason, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
            reference,
            companyId,
            actorUserId,
            target.userId(),
            BillingHashing.sha256(rawToken),
            blankToNull(reason),
            Timestamp.from(clock.instant().plus(TRANSFER_TTL))
        );
        jdbcTemplate.update(
            """
                INSERT INTO company_ownership_history (
                    company_id, transfer_request_id, from_user_id, to_user_id,
                    action_code, reason, actor_user_id
                ) SELECT company_id, id, from_user_id, to_user_id, 'REQUESTED', reason, ?
                    FROM company_ownership_transfer_requests WHERE public_reference = ?
                """,
            actorUserId,
            reference
        );
        audit.record(actorUserId, "OWNERSHIP_TRANSFER_REQUESTED", "COMPANY", Long.toString(companyId), companyId,
            "SUCCESS", Map.of("reference", reference, "target_user_id", target.userId()));
        var result = new LinkedHashMap<String, Object>();
        result.put("reference", reference);
        result.put("acceptance_token", rawToken);
        result.put("target_email", target.email());
        result.put("expires_at", clock.instant().plus(TRANSFER_TTL));
        result.put("delivery_required", true);
        return result;
    }

    @Transactional
    public Map<String, Object> accept(long actorUserId, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("The ownership transfer token is required.");
        }
        var transfer = jdbcTemplate.query(
            """
                SELECT id, public_reference, company_id, from_user_id, to_user_id, reason, expires_at
                FROM company_ownership_transfer_requests
                WHERE token_hash = ? AND status = 'PENDING'
                FOR UPDATE
                """,
            (rs, rowNum) -> new Transfer(
                rs.getLong("id"), rs.getString("public_reference"), rs.getLong("company_id"),
                rs.getLong("from_user_id"), rs.getLong("to_user_id"), rs.getString("reason"),
                rs.getTimestamp("expires_at").toInstant()
            ),
            BillingHashing.sha256(rawToken.trim())
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("Ownership transfer not found."));
        if (transfer.toUserId() != actorUserId) {
            throw new OwnershipForbiddenException("This ownership transfer belongs to another user.");
        }
        if (!transfer.expiresAt().isAfter(clock.instant())) {
            jdbcTemplate.update(
                "UPDATE company_ownership_transfer_requests SET status = 'EXPIRED' WHERE id = ?",
                transfer.id()
            );
            throw new IllegalStateException("This ownership transfer has expired.");
        }
        var ownership = lockOwnership(transfer.companyId());
        if (ownership.ownerUserId() != transfer.fromUserId()) {
            throw new IllegalStateException("The account owner changed while this transfer was pending.");
        }
        var targetMembership = membership(transfer.companyId(), transfer.toUserId());
        var priorMembership = membership(transfer.companyId(), transfer.fromUserId());
        jdbcTemplate.update(
            """
                UPDATE company_ownerships
                SET owner_user_id = ?, owner_user_company_id = ?, source_signup_intent_id = NULL,
                    ownership_started_at = CURRENT_TIMESTAMP(6), ownership_ended_at = NULL
                WHERE company_id = ? AND status = 'ACTIVE'
                """,
            transfer.toUserId(),
            targetMembership,
            transfer.companyId()
        );
        jdbcTemplate.update("UPDATE user_companies SET role = 'admin' WHERE id = ?", priorMembership);
        jdbcTemplate.update("UPDATE user_companies SET role = 'owner' WHERE id = ?", targetMembership);
        jdbcTemplate.update(
            "UPDATE company_ownership_transfer_requests SET status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP(6) WHERE id = ?",
            transfer.id()
        );
        jdbcTemplate.update(
            """
                INSERT INTO company_ownership_history (
                    company_id, transfer_request_id, from_user_id, to_user_id,
                    action_code, reason, actor_user_id
                ) VALUES (?, ?, ?, ?, 'ACCEPTED', ?, ?)
                """,
            transfer.companyId(), transfer.id(), transfer.fromUserId(), transfer.toUserId(),
            transfer.reason(), actorUserId
        );
        audit.record(actorUserId, "OWNERSHIP_TRANSFER_ACCEPTED", "COMPANY", Long.toString(transfer.companyId()),
            transfer.companyId(), "SUCCESS", Map.of("reference", transfer.reference()));
        return Map.of(
            "status", "ACCEPTED",
            "company_id", transfer.companyId(),
            "reference", transfer.reference(),
            "new_owner_user_id", transfer.toUserId()
        );
    }

    private Ownership lockOwnership(long companyId) {
        return jdbcTemplate.query(
            "SELECT owner_user_id, owner_user_company_id FROM company_ownerships WHERE company_id = ? AND status = 'ACTIVE' FOR UPDATE",
            (rs, rowNum) -> new Ownership(rs.getLong(1), rs.getLong(2)),
            companyId
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException(
            "This company has not been enrolled in premium ownership yet."
        ));
    }

    private long membership(long companyId, long userId) {
        return jdbcTemplate.query(
            """
                SELECT id FROM user_companies
                WHERE company_id = ? AND user_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                FOR UPDATE
                """,
            (rs, rowNum) -> rs.getLong(1), companyId, userId
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("An active company membership is required."));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record Ownership(long ownerUserId, long ownerMembershipId) {}
    private record Target(long userId, long userCompanyId, String email) {}
    private record Transfer(long id, String reference, long companyId, long fromUserId, long toUserId,
                            String reason, java.time.Instant expiresAt) {}
}
