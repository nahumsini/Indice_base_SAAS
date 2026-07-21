package com.indice.erp.platformadmin;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import com.indice.erp.billing.storage.StorageQuotaService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformAdminService {

    private static final Set<String> BENEFIT_TYPES = Set.of("PRODUCT", "SEAT", "STORAGE");
    private static final Set<String> SOURCE_TYPES = Set.of("COURTESY", "PROMOTION", "SUPPORT", "TEST");

    private final JdbcTemplate jdbcTemplate;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService audit;
    private final CompanyEntitlementProjectionService entitlementProjection;
    private final StorageQuotaService storageQuota;
    private final Clock clock;

    public PlatformAdminService(
        JdbcTemplate jdbcTemplate,
        PlatformAdminAccessService accessService,
        PlatformAuditService audit,
        CompanyEntitlementProjectionService entitlementProjection,
        StorageQuotaService storageQuota,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessService = accessService;
        this.audit = audit;
        this.entitlementProjection = entitlementProjection;
        this.storageQuota = storageQuota;
        this.clock = clock;
    }

    public Map<String, Object> context(long actorUserId) {
        var access = accessService.require(actorUserId, "PLATFORM_VIEW");
        var body = new LinkedHashMap<String, Object>();
        body.put("role", access.role());
        body.put("permissions", access.permissions());
        body.put("can_manage_benefits", access.allows("PLATFORM_BENEFITS_WRITE"));
        body.put("can_manage_ownership", access.allows("PLATFORM_OWNERSHIP_WRITE"));
        return body;
    }

    public Map<String, Object> overview(long actorUserId, String rawQuery, int requestedLimit) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        var limit = Math.max(1, Math.min(requestedLimit, 100));
        var pattern = "%" + query + "%";
        var companies = jdbcTemplate.query(
            """
                SELECT company.id, company.name,
                       policy.mode AS entitlement_mode,
                       subscription.status AS billing_status,
                       lifecycle.state AS lifecycle_state,
                       lifecycle.access_mode AS access_mode,
                       COALESCE(seats.included_seats, 0) AS included_seats,
                       COALESCE(seats.purchased_extra_seats, 0) AS purchased_extra_seats,
                       (SELECT COUNT(*) FROM user_companies membership
                         WHERE membership.company_id = company.id
                           AND LOWER(COALESCE(membership.status, 'active')) = 'active') AS active_members,
                       (SELECT COUNT(*) FROM company_benefit_grants benefit
                         WHERE benefit.company_id = company.id
                           AND benefit.status = 'ACTIVE'
                           AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                           AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))) AS active_benefits
                FROM companies company
                LEFT JOIN company_entitlement_policies policy ON policy.company_id = company.id
                LEFT JOIN company_seat_states seats ON seats.company_id = company.id
                LEFT JOIN company_commercial_states lifecycle ON lifecycle.company_id = company.id
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.id = (
                      SELECT MAX(candidate.id)
                      FROM company_billing_subscriptions candidate
                      WHERE candidate.company_id = company.id
                  )
                WHERE (? = '' OR LOWER(company.name) LIKE ? OR CAST(company.id AS CHAR) = ?)
                ORDER BY company.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("entitlement_mode", nullable(rs.getString("entitlement_mode")));
                row.put("billing_status", nullable(rs.getString("billing_status")));
                row.put("lifecycle_state", nullable(rs.getString("lifecycle_state")));
                row.put("access_mode", nullable(rs.getString("access_mode")));
                row.put("included_seats", rs.getInt("included_seats"));
                row.put("purchased_extra_seats", rs.getInt("purchased_extra_seats"));
                row.put("active_members", rs.getInt("active_members"));
                row.put("active_benefits", rs.getInt("active_benefits"));
                return row;
            },
            query,
            pattern,
            query,
            limit
        );
        var totals = new LinkedHashMap<String, Object>();
        totals.put("companies", scalar("SELECT COUNT(*) FROM companies"));
        totals.put("premium_companies", scalar("SELECT COUNT(*) FROM company_entitlement_policies"));
        totals.put("active_subscriptions", scalar("SELECT COUNT(*) FROM company_billing_subscriptions WHERE LOWER(status) IN ('trialing', 'active')"));
        totals.put("active_benefits", scalar("SELECT COUNT(*) FROM company_benefit_grants WHERE status = 'ACTIVE' AND starts_at <= CURRENT_TIMESTAMP(6) AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP(6))"));
        return Map.of("totals", totals, "companies", companies);
    }

    public Map<String, Object> company(long actorUserId, long companyId) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var companies = jdbcTemplate.query(
            """
                SELECT company.id, company.name, policy.mode,
                       ownership.owner_user_id, owner.email AS owner_email,
                       subscription.status AS billing_status,
                       subscription.offer_code, subscription.billing_interval,
                       subscription.included_seats, subscription.extra_seats,
                       seats.reserved_seats,
                       lifecycle.state AS lifecycle_state,
                       lifecycle.access_mode,
                       lifecycle.grace_ends_at,
                       lifecycle.read_only_ends_at,
                       lifecycle.retention_until
                FROM companies company
                LEFT JOIN company_entitlement_policies policy ON policy.company_id = company.id
                LEFT JOIN company_ownerships ownership
                  ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
                LEFT JOIN users owner ON owner.id = ownership.owner_user_id
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.id = (SELECT MAX(candidate.id) FROM company_billing_subscriptions candidate WHERE candidate.company_id = company.id)
                LEFT JOIN company_seat_states seats ON seats.company_id = company.id
                LEFT JOIN company_commercial_states lifecycle ON lifecycle.company_id = company.id
                WHERE company.id = ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("entitlement_mode", nullable(rs.getString("mode")));
                row.put("owner_user_id", rs.getObject("owner_user_id"));
                row.put("owner_email", nullable(rs.getString("owner_email")));
                row.put("billing_status", nullable(rs.getString("billing_status")));
                row.put("offer_code", nullable(rs.getString("offer_code")));
                row.put("billing_interval", nullable(rs.getString("billing_interval")));
                row.put("included_seats", rs.getObject("included_seats"));
                row.put("extra_seats", rs.getObject("extra_seats"));
                row.put("reserved_seats", rs.getObject("reserved_seats"));
                row.put("lifecycle_state", nullable(rs.getString("lifecycle_state")));
                row.put("access_mode", nullable(rs.getString("access_mode")));
                row.put("grace_ends_at", rs.getTimestamp("grace_ends_at"));
                row.put("read_only_ends_at", rs.getTimestamp("read_only_ends_at"));
                row.put("retention_until", rs.getTimestamp("retention_until"));
                return row;
            },
            companyId
        );
        if (companies.isEmpty()) {
            throw new NoSuchElementException("Company not found.");
        }
        var body = new LinkedHashMap<>(companies.getFirst());
        body.put("benefits", listBenefits(companyId));
        body.put("seat_usage", seatUsage(companyId));
        body.put("storage_usage", storageQuota.snapshot(companyId));
        return body;
    }

    @Transactional
    public Map<String, Object> grantBenefit(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        BenefitRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key is required.");
        }
        requireCompany(companyId);
        var type = upper(request == null ? null : request.benefit_type());
        var source = upper(request == null ? null : request.source_type());
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        var quantity = request == null || request.quantity() == null ? 1 : request.quantity();
        if (!BENEFIT_TYPES.contains(type)) {
            throw new IllegalArgumentException("benefit_type must be PRODUCT, SEAT or STORAGE.");
        }
        if (!SOURCE_TYPES.contains(source)) {
            throw new IllegalArgumentException("source_type must be COURTESY, PROMOTION, SUPPORT or TEST.");
        }
        if (reason.length() < 5 || quantity < 1) {
            throw new IllegalArgumentException("A reason and a positive quantity are required.");
        }
        var startsAt = request == null || request.starts_at() == null ? clock.instant() : request.starts_at();
        var endsAt = request == null ? null : request.ends_at();
        if (endsAt != null && !endsAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("ends_at must be after starts_at.");
        }
        Long productId = null;
        if ("PRODUCT".equals(type)) {
            productId = productId(request.product_code());
            quantity = 1;
        } else if (request.product_code() != null && !request.product_code().isBlank()) {
            throw new IllegalArgumentException("product_code is only valid for PRODUCT benefits.");
        }
        var hash = BillingHashing.sha256(idempotencyKey.trim());
        var existing = benefitByIdempotency(hash);
        if (existing != null) {
            return existing;
        }
        var reference = BillingHashing.randomReference().substring(0, 32);
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO company_benefit_grants (
                        public_reference, company_id, benefit_type, catalog_product_id,
                        quantity, source_type, status, starts_at, ends_at, reason,
                        campaign_code, stripe_coupon_id, stripe_promotion_code_id,
                        idempotency_key_hash, created_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                reference,
                companyId,
                type,
                productId,
                quantity,
                source,
                Timestamp.from(startsAt),
                endsAt == null ? null : Timestamp.from(endsAt),
                reason,
                nullable(request.campaign_code()),
                nullable(request.stripe_coupon_id()),
                nullable(request.stripe_promotion_code_id()),
                hash,
                actorUserId
            );
        } catch (DuplicateKeyException exception) {
            var replay = benefitByIdempotency(hash);
            if (replay != null) {
                return replay;
            }
            throw exception;
        }
        if ("PRODUCT".equals(type)) {
            entitlementProjection.refreshIfEnrolled(companyId);
        }
        audit.record(actorUserId, "BENEFIT_GRANTED", "COMPANY_BENEFIT", reference, companyId, "SUCCESS", Map.of(
            "benefit_type", type,
            "source_type", source,
            "quantity", quantity,
            "reason", reason
        ));
        return benefitByReference(reference);
    }

    @Transactional
    public Map<String, Object> revokeBenefit(long actorUserId, long companyId, String reference, String reason) {
        accessService.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        var before = benefitByReference(reference);
        if (before == null || ((Number) before.get("company_id")).longValue() != companyId) {
            throw new NoSuchElementException("Benefit not found.");
        }
        var updated = jdbcTemplate.update(
            """
                UPDATE company_benefit_grants
                SET status = 'REVOKED', revoked_by_user_id = ?, revoked_at = CURRENT_TIMESTAMP(6),
                    reason = CONCAT(reason, '\nRevoked: ', ?)
                WHERE company_id = ? AND public_reference = ? AND status = 'ACTIVE'
                """,
            actorUserId,
            reason == null || reason.isBlank() ? "Administrative decision" : reason.trim(),
            companyId,
            reference
        );
        if (updated == 0) {
            throw new IllegalStateException("Benefit is not active.");
        }
        if ("PRODUCT".equals(before.get("benefit_type"))) {
            entitlementProjection.refreshIfEnrolled(companyId);
        }
        audit.record(actorUserId, "BENEFIT_REVOKED", "COMPANY_BENEFIT", reference, companyId, "SUCCESS", Map.of(
            "reason", reason == null ? "" : reason
        ));
        return benefitByReference(reference);
    }

    private List<Map<String, Object>> listBenefits(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT benefit.public_reference, benefit.company_id, benefit.benefit_type,
                       product.product_code, benefit.quantity, benefit.source_type, benefit.status,
                       benefit.starts_at, benefit.ends_at, benefit.reason, benefit.campaign_code,
                       benefit.stripe_coupon_id, benefit.stripe_promotion_code_id,
                       benefit.created_by_user_id, benefit.created_at, benefit.revoked_at
                FROM company_benefit_grants benefit
                LEFT JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.company_id = ?
                ORDER BY benefit.created_at DESC, benefit.id DESC
                """,
            (rs, rowNum) -> benefitRow(rs),
            companyId
        );
    }

    private Map<String, Object> benefitByIdempotency(String hash) {
        return jdbcTemplate.query(
            """
                SELECT benefit.public_reference, benefit.company_id, benefit.benefit_type,
                       product.product_code, benefit.quantity, benefit.source_type, benefit.status,
                       benefit.starts_at, benefit.ends_at, benefit.reason, benefit.campaign_code,
                       benefit.stripe_coupon_id, benefit.stripe_promotion_code_id,
                       benefit.created_by_user_id, benefit.created_at, benefit.revoked_at
                FROM company_benefit_grants benefit
                LEFT JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.idempotency_key_hash = ?
                """,
            (rs, rowNum) -> benefitRow(rs),
            hash
        ).stream().findFirst().orElse(null);
    }

    private Map<String, Object> benefitByReference(String reference) {
        return jdbcTemplate.query(
            """
                SELECT benefit.public_reference, benefit.company_id, benefit.benefit_type,
                       product.product_code, benefit.quantity, benefit.source_type, benefit.status,
                       benefit.starts_at, benefit.ends_at, benefit.reason, benefit.campaign_code,
                       benefit.stripe_coupon_id, benefit.stripe_promotion_code_id,
                       benefit.created_by_user_id, benefit.created_at, benefit.revoked_at
                FROM company_benefit_grants benefit
                LEFT JOIN billing_catalog_products product ON product.id = benefit.catalog_product_id
                WHERE benefit.public_reference = ?
                """,
            (rs, rowNum) -> benefitRow(rs),
            reference
        ).stream().findFirst().orElse(null);
    }

    private Map<String, Object> benefitRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("reference", rs.getString("public_reference"));
        row.put("company_id", rs.getLong("company_id"));
        row.put("benefit_type", rs.getString("benefit_type"));
        row.put("product_code", nullable(rs.getString("product_code")));
        row.put("quantity", rs.getInt("quantity"));
        row.put("source_type", rs.getString("source_type"));
        row.put("status", rs.getString("status"));
        row.put("starts_at", instant(rs.getTimestamp("starts_at")));
        row.put("ends_at", instant(rs.getTimestamp("ends_at")));
        row.put("reason", rs.getString("reason"));
        row.put("campaign_code", nullable(rs.getString("campaign_code")));
        row.put("stripe_coupon_id", nullable(rs.getString("stripe_coupon_id")));
        row.put("stripe_promotion_code_id", nullable(rs.getString("stripe_promotion_code_id")));
        row.put("created_by_user_id", rs.getLong("created_by_user_id"));
        row.put("created_at", instant(rs.getTimestamp("created_at")));
        row.put("revoked_at", instant(rs.getTimestamp("revoked_at")));
        return row;
    }

    private Map<String, Object> seatUsage(long companyId) {
        var state = jdbcTemplate.query(
            """
                SELECT included_seats, purchased_extra_seats, reserved_seats
                FROM company_seat_states WHERE company_id = ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("included", rs.getInt("included_seats"));
                row.put("purchased_extra", rs.getInt("purchased_extra_seats"));
                row.put("reserved", rs.getInt("reserved_seats"));
                return row;
            },
            companyId
        ).stream().findFirst().orElseGet(LinkedHashMap::new);
        var enforced = !state.isEmpty();
        state.put("active", jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_companies WHERE company_id = ? AND LOWER(COALESCE(status, 'active')) = 'active'",
            Integer.class,
            companyId
        ));
        state.put("courtesy_extra", jdbcTemplate.queryForObject(
            """
                SELECT COALESCE(SUM(quantity), 0) FROM company_benefit_grants
                WHERE company_id = ? AND benefit_type = 'SEAT' AND status = 'ACTIVE'
                  AND starts_at <= CURRENT_TIMESTAMP(6)
                  AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP(6))
                """,
            Integer.class,
            companyId
        ));
        state.put("enforced", enforced);
        return state;
    }

    private Long productId(String productCode) {
        var code = productCode == null ? "" : productCode.trim().toLowerCase(Locale.ROOT);
        if (code.isBlank()) {
            throw new IllegalArgumentException("product_code is required for PRODUCT benefits.");
        }
        return jdbcTemplate.query(
            """
                SELECT product.id
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE product.product_code = ? AND product.active = 1 AND version.status = 'ACTIVE'
                ORDER BY version.effective_from DESC, version.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong(1),
            code
        ).stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown active product_code."));
    }

    private void requireCompany(long companyId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM companies WHERE id = ?",
            Integer.class,
            companyId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("Company not found.");
        }
    }

    private int scalar(String sql) {
        var result = jdbcTemplate.queryForObject(sql, Integer.class);
        return result == null ? 0 : result;
    }

    private static String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record BenefitRequest(
        String benefit_type,
        String product_code,
        Integer quantity,
        String source_type,
        String reason,
        String campaign_code,
        String stripe_coupon_id,
        String stripe_promotion_code_id,
        Instant starts_at,
        Instant ends_at
    ) {
    }

    public record RevokeRequest(String reason) {
    }
}
