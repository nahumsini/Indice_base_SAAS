package com.indice.erp.billing.collection;

import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Deadline enforcement is independent of worker availability and rollout switches. */
@Service
public class PaymentCollectionAccessService {
    public static final String OVERDUE = "PAYMENT_REQUEST_OVERDUE";
    public enum Access { NONE, GRACE, PAYMENT_ONLY }
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final PaymentCollectionProtectionService protection;

    public PaymentCollectionAccessService(JdbcTemplate jdbc, Clock clock, PaymentCollectionProtectionService protection) {
        this.jdbc = jdbc; this.clock = clock; this.protection = protection;
    }

    public Access access(long companyId) {
        var rule = jdbc.query("""
            SELECT request.deadline_at, commercial.state, commercial.reason_code
            FROM company_payment_requests request
            LEFT JOIN company_commercial_states commercial ON commercial.company_id = request.company_id
            WHERE request.company_id = ? AND request.status = 'OPEN'
            """, (rs, n) -> new Rule(rs.getTimestamp(1).toInstant(), rs.getString(2), rs.getString(3)), companyId)
            .stream().findFirst().orElse(null);
        if (rule == null) return Access.NONE;
        // Explicit later trial/benefit promises survive; unrelated invoice payments cannot lift this hold.
        var protectedAccess = protection.collectionProtection(companyId);
        var deadline = later(rule.deadline(), protectedAccess.protectedUntil());
        if (!protectedAccess.indefiniteBenefit() && !clock.instant().isBefore(deadline)) return Access.PAYMENT_ONLY;
        // Neither a collection extension nor a benefit removes a separate suspension or dispute.
        if (Set.of("SUSPENDED", "RETENTION", "PURGE_PENDING").contains(rule.state() == null ? "" : rule.state())
            || Set.of("SUBSCRIPTION_CANCELED", "PAYMENT_DISPUTED").contains(rule.reason() == null ? "" : rule.reason())) return Access.NONE;
        return Access.GRACE;
    }

    public PaymentCollectionContracts.Request requestView(PaymentCollectionRepository.Row row) {
        if (row == null) return null;
        if (!row.open()) return row.dto();
        var protectedAccess = protection.collectionProtection(row.companyId());
        return new PaymentCollectionContracts.Request(row.reference(), row.kind(), row.status(), row.version(), row.startedAt(),
            later(row.deadline(), protectedAccess.protectedUntil()), row.reason(), row.amountCents(), row.currency(),
            row.billingInterval(), row.paidAt(), protectedAccess.indefiniteBenefit());
    }

    private Instant later(Instant deadline, Instant protectedUntil) {
        return protectedUntil != null && protectedUntil.isAfter(deadline) ? protectedUntil : deadline;
    }
    private record Rule(Instant deadline, String state, String reason) { }

    /** Exact recovery routes; existing authentication, ownership, CSRF and MFA guards still apply. */
    public static boolean permitsRecovery(String method, String path) {
        if (path.startsWith("/api/v1/platform-admin/")) return true;
        if ("DELETE".equals(method) && path.equals("/api/v1/auth/managed-company")) return true;
        if ("GET".equals(method) && path.matches("/api/v1/auth/password-reset/[^/]+")) return true;
        if ("POST".equals(method) && path.matches("/api/v1/auth/password-reset/[^/]+/complete")) return true;
        if ("GET".equals(method)) return Set.of(
            "/api/v1/auth/me", "/api/v1/auth/csrf", "/api/v1/auth/managed-companies",
            "/api/v1/billing/payment-request"
        ).contains(path);
        if ("POST".equals(method)) return Set.of(
            "/api/v1/auth/login", "/api/v1/auth/login/otp/verify", "/api/v1/auth/login/otp/resend",
            "/api/v1/auth/logout", "/api/v1/auth/company", "/api/v1/auth/managed-company",
            "/api/v1/auth/password-reset/request",
            "/api/v1/billing/payment-request/pay", "/api/v1/billing/payment-request/refresh",
            "/api/v1/billing/stripe/webhook"
        ).contains(path);
        return "OPTIONS".equals(method);
    }
}
