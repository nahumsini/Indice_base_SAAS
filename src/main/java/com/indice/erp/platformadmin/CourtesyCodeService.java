package com.indice.erp.platformadmin;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourtesyCodeService {

    private final JdbcTemplate jdbc;
    private final PlatformAdminAccessService access;
    private final PlatformAuditService audit;
    private final Clock clock;
    private final CommercialOfferSelectionService offers;

    public CourtesyCodeService(
        JdbcTemplate jdbc,
        PlatformAdminAccessService access,
        PlatformAuditService audit,
        Clock clock,
        CommercialOfferSelectionService offers
    ) {
        this.jdbc = jdbc;
        this.access = access;
        this.audit = audit;
        this.clock = clock;
        this.offers = offers;
    }

    public Map<String, Object> list(long actorUserId) {
        access.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        var codes = jdbc.query(
            """
                SELECT public_reference, label, status, allowed_email, all_basic_products,
                       product_codes_csv, included_extra_seats, access_days, max_redemptions,
                       redemption_count, starts_at, expires_at, reason, campaign_code,
                       created_by_user_id, revoked_at, created_at
                FROM billing_courtesy_codes
                ORDER BY created_at DESC, id DESC
                LIMIT 200
                """,
            (rs, rowNum) -> row(
                rs.getString("public_reference"), rs.getString("label"), rs.getString("status"),
                rs.getString("allowed_email"), rs.getBoolean("all_basic_products"),
                rs.getString("product_codes_csv"), rs.getInt("included_extra_seats"),
                (Integer) rs.getObject("access_days"), rs.getInt("max_redemptions"),
                rs.getInt("redemption_count"), instant(rs.getTimestamp("starts_at")),
                instant(rs.getTimestamp("expires_at")), rs.getString("reason"),
                rs.getString("campaign_code"), rs.getLong("created_by_user_id"),
                instant(rs.getTimestamp("revoked_at")), instant(rs.getTimestamp("created_at")), null
            )
        );
        return Map.of("codes", codes, "products", activeCommercialProducts());
    }

    @Transactional
    public Map<String, Object> create(
        long actorUserId,
        String idempotencyKey,
        CreateRequest request
    ) {
        access.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        return createAfterAuthorization(actorUserId, idempotencyKey, request);
    }

    /** Caller must authorize the commercial operation before invoking this shared operation. */
    @Transactional
    public Map<String, Object> createAfterAuthorization(
        long actorUserId,
        String idempotencyKey,
        CreateRequest request
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key is required.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Courtesy code details are required.");
        }
        var label = required(request.label(), "Label", 2, 120);
        var reason = required(request.reason(), "Reason", 5, 500);
        var allowedEmail = normalizeEmail(request.allowed_email());
        var permanent = Boolean.TRUE.equals(request.permanent());
        var accessDays = permanent ? null : request.access_days() == null ? 30 : request.access_days();
        if (!permanent && (accessDays < 1 || accessDays > 3650)) {
            throw new IllegalArgumentException("access_days must be between 1 and 3650, or permanent must be true.");
        }
        var maxRedemptions = request.max_redemptions() == null ? 1 : request.max_redemptions();
        if (maxRedemptions < 1 || maxRedemptions > 1000) {
            throw new IllegalArgumentException("max_redemptions must be between 1 and 1000.");
        }
        var extraSeats = request.included_extra_seats() == null ? 0 : request.included_extra_seats();
        if (extraSeats < 0 || extraSeats > 500) {
            throw new IllegalArgumentException("included_extra_seats must be between 0 and 500.");
        }
        var startsAt = request.starts_at() == null ? clock.instant() : request.starts_at();
        var expiresAt = request.expires_at();
        if (expiresAt != null && !expiresAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("expires_at must be after starts_at.");
        }
        var products = normalizeProducts(request.product_codes());
        requireActiveProducts(products);
        var allBasicProducts = products.isEmpty();
        var idempotencyHash = BillingHashing.sha256(idempotencyKey.trim());
        var existing = byIdempotency(idempotencyHash);
        if (existing != null) {
            return existing;
        }

        var clearCode = generateCode();
        var reference = BillingHashing.randomReference().substring(0, 32);
        try {
            jdbc.update(
                """
                    INSERT INTO billing_courtesy_codes (
                        public_reference, code_hash, label, allowed_email,
                        all_basic_products, product_codes_csv, included_extra_seats,
                        access_days, max_redemptions, starts_at, expires_at,
                        reason, campaign_code, idempotency_key_hash, created_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                reference,
                codeHash(clearCode),
                label,
                allowedEmail,
                allBasicProducts,
                products.isEmpty() ? null : String.join(",", products),
                extraSeats,
                accessDays,
                maxRedemptions,
                Timestamp.from(startsAt),
                expiresAt == null ? null : Timestamp.from(expiresAt),
                reason,
                blank(request.campaign_code()),
                idempotencyHash,
                actorUserId
            );
        } catch (DuplicateKeyException exception) {
            var replay = byIdempotency(idempotencyHash);
            if (replay != null) return replay;
            throw exception;
        }
        audit.record(actorUserId, "COURTESY_CODE_CREATED", "BILLING_COURTESY_CODE", reference, null, "SUCCESS", Map.of(
            "permanent", permanent,
            "max_redemptions", maxRedemptions,
            "all_basic_products", allBasicProducts,
            "included_extra_seats", extraSeats
        ));
        return byReference(reference, clearCode);
    }

    @Transactional
    public Map<String, Object> revoke(long actorUserId, String reference, String reason) {
        access.require(actorUserId, "PLATFORM_BENEFITS_WRITE");
        var existing = byReference(reference, null);
        if (existing == null) throw new NoSuchElementException("Courtesy code not found.");
        var updated = jdbc.update(
            """
                UPDATE billing_courtesy_codes
                SET status = 'REVOKED', revoked_by_user_id = ?, revoked_at = CURRENT_TIMESTAMP(6),
                    reason = CONCAT(reason, '\nRevoked: ', ?)
                WHERE public_reference = ? AND status = 'ACTIVE'
                """,
            actorUserId,
            reason == null || reason.isBlank() ? "Administrative decision" : reason.trim(),
            reference
        );
        if (updated == 0) throw new IllegalStateException("Courtesy code is not active.");
        audit.record(actorUserId, "COURTESY_CODE_REVOKED", "BILLING_COURTESY_CODE", reference, null, "SUCCESS", Map.of(
            "reason", reason == null ? "" : reason.trim()
        ));
        return byReference(reference, null);
    }

    @Transactional
    public RedemptionResult redeem(long signupIntentId, String rawCode, String email) {
        var prior = jdbc.query(
            """
                SELECT r.courtesy_code_id, i.courtesy_access_ends_at, i.courtesy_permanent
                FROM billing_courtesy_redemptions r
                JOIN billing_signup_intents i ON i.id = r.signup_intent_id
                WHERE r.signup_intent_id = ?
                """,
            (rs, rowNum) -> new RedemptionResult(
                rs.getLong("courtesy_code_id"),
                instant(rs.getTimestamp("courtesy_access_ends_at")),
                rs.getBoolean("courtesy_permanent")
            ),
            signupIntentId
        );
        if (!prior.isEmpty()) return prior.getFirst();

        var normalizedEmail = normalizeEmail(email);
        var codes = jdbc.query(
            """
                SELECT id, status, allowed_email, access_days, max_redemptions,
                       redemption_count, starts_at, expires_at
                FROM billing_courtesy_codes
                WHERE code_hash = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new RedeemableCode(
                rs.getLong("id"), rs.getString("status"), rs.getString("allowed_email"),
                (Integer) rs.getObject("access_days"), rs.getInt("max_redemptions"),
                rs.getInt("redemption_count"), instant(rs.getTimestamp("starts_at")),
                instant(rs.getTimestamp("expires_at"))
            ),
            codeHash(rawCode)
        );
        if (codes.isEmpty()) throw new IllegalArgumentException("Courtesy code is invalid.");
        var code = codes.getFirst();
        var now = clock.instant();
        if (!"ACTIVE".equals(code.status()) || code.startsAt().isAfter(now)
            || (code.expiresAt() != null && !code.expiresAt().isAfter(now))) {
            throw new IllegalArgumentException("Courtesy code is not active.");
        }
        if (code.redemptionCount() >= code.maxRedemptions()) {
            throw new IllegalArgumentException("Courtesy code has reached its redemption limit.");
        }
        if (code.allowedEmail() != null && !code.allowedEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("Courtesy code is assigned to another email.");
        }
        var permanent = code.accessDays() == null;
        var accessEndsAt = permanent ? null : now.plus(code.accessDays(), ChronoUnit.DAYS);
        var changed = jdbc.update(
            """
                UPDATE billing_signup_intents
                SET signup_channel = 'COURTESY', courtesy_code_id = ?, courtesy_access_ends_at = ?,
                    courtesy_permanent = ?, status = 'COURTESY_COMPLETED',
                    completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP(6)), version = version + 1
                WHERE id = ? AND status = 'PENDING'
                """,
            code.id(), accessEndsAt == null ? null : Timestamp.from(accessEndsAt), permanent, signupIntentId
        );
        if (changed == 0) throw new IllegalStateException("Signup is no longer eligible for a courtesy code.");
        jdbc.update(
            "UPDATE billing_courtesy_codes SET redemption_count = redemption_count + 1 WHERE id = ?",
            code.id()
        );
        jdbc.update(
            """
                INSERT INTO billing_courtesy_redemptions (
                    courtesy_code_id, signup_intent_id, email_normalized
                ) VALUES (?, ?, ?)
                """,
            code.id(), signupIntentId, normalizedEmail
        );
        return new RedemptionResult(code.id(), accessEndsAt, permanent);
    }

    public boolean isCourtesy(String rawCode) {
        return rawCode != null && !rawCode.isBlank();
    }

    private List<Map<String, Object>> activeCommercialProducts() {
        return offers.activeProducts("MONTH").stream()
            .map(product -> Map.<String, Object>of(
                "code", product.code(),
                "name", product.displayName(),
                "type", product.productType()
            ))
            .toList();
    }

    private void requireActiveProducts(Set<String> products) {
        if (products.isEmpty()) return;
        var active = activeCommercialProducts().stream()
            .map(row -> String.valueOf(row.get("code")))
            .collect(java.util.stream.Collectors.toSet());
        if (!active.containsAll(products)) {
            throw new IllegalArgumentException("product_codes contains an unavailable commercial product.");
        }
    }

    private Set<String> normalizeProducts(List<String> values) {
        var products = new TreeSet<String>();
        if (values == null) return products;
        for (var value : values) {
            if (value != null && !value.isBlank()) products.add(value.trim().toLowerCase(Locale.ROOT));
        }
        return products;
    }

    private Map<String, Object> byIdempotency(String hash) {
        var rows = jdbc.query(
            """
                SELECT public_reference, label, status, allowed_email, all_basic_products,
                       product_codes_csv, included_extra_seats, access_days, max_redemptions,
                       redemption_count, starts_at, expires_at, reason, campaign_code,
                       created_by_user_id, revoked_at, created_at
                FROM billing_courtesy_codes WHERE idempotency_key_hash = ?
                """,
            (rs, rowNum) -> row(
                rs.getString("public_reference"), rs.getString("label"), rs.getString("status"),
                rs.getString("allowed_email"), rs.getBoolean("all_basic_products"),
                rs.getString("product_codes_csv"), rs.getInt("included_extra_seats"),
                (Integer) rs.getObject("access_days"), rs.getInt("max_redemptions"),
                rs.getInt("redemption_count"), instant(rs.getTimestamp("starts_at")),
                instant(rs.getTimestamp("expires_at")), rs.getString("reason"),
                rs.getString("campaign_code"), rs.getLong("created_by_user_id"),
                instant(rs.getTimestamp("revoked_at")), instant(rs.getTimestamp("created_at")), null
            ),
            hash
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Map<String, Object> byReference(String reference, String clearCode) {
        var rows = jdbc.query(
            """
                SELECT public_reference, label, status, allowed_email, all_basic_products,
                       product_codes_csv, included_extra_seats, access_days, max_redemptions,
                       redemption_count, starts_at, expires_at, reason, campaign_code,
                       created_by_user_id, revoked_at, created_at
                FROM billing_courtesy_codes WHERE public_reference = ?
                """,
            (rs, rowNum) -> row(
                rs.getString("public_reference"), rs.getString("label"), rs.getString("status"),
                rs.getString("allowed_email"), rs.getBoolean("all_basic_products"),
                rs.getString("product_codes_csv"), rs.getInt("included_extra_seats"),
                (Integer) rs.getObject("access_days"), rs.getInt("max_redemptions"),
                rs.getInt("redemption_count"), instant(rs.getTimestamp("starts_at")),
                instant(rs.getTimestamp("expires_at")), rs.getString("reason"),
                rs.getString("campaign_code"), rs.getLong("created_by_user_id"),
                instant(rs.getTimestamp("revoked_at")), instant(rs.getTimestamp("created_at")), clearCode
            ),
            reference
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Map<String, Object> row(
        String reference, String label, String status, String allowedEmail, boolean allBasic,
        String productCsv, int extraSeats, Integer accessDays, int maxRedemptions,
        int redemptionCount, Instant startsAt, Instant expiresAt, String reason,
        String campaignCode, long createdBy, Instant revokedAt, Instant createdAt, String clearCode
    ) {
        var row = new LinkedHashMap<String, Object>();
        row.put("reference", reference);
        if (clearCode != null) row.put("code", clearCode);
        row.put("label", label);
        row.put("status", status);
        row.put("allowed_email", allowedEmail);
        row.put("all_basic_products", allBasic);
        row.put("product_codes", splitProducts(productCsv));
        row.put("included_extra_seats", extraSeats);
        row.put("permanent", accessDays == null);
        row.put("access_days", accessDays);
        row.put("max_redemptions", maxRedemptions);
        row.put("redemption_count", redemptionCount);
        row.put("starts_at", startsAt);
        row.put("expires_at", expiresAt);
        row.put("reason", reason);
        row.put("campaign_code", campaignCode);
        row.put("created_by_user_id", createdBy);
        row.put("revoked_at", revokedAt);
        row.put("created_at", createdAt);
        return row;
    }

    private List<String> splitProducts(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        var result = new ArrayList<String>();
        for (var value : csv.split(",")) if (!value.isBlank()) result.add(value.trim());
        return List.copyOf(result);
    }

    private String generateCode() {
        var raw = BillingHashing.randomReference().substring(0, 16).toUpperCase(Locale.ROOT);
        return "IND-" + raw.substring(0, 4) + "-" + raw.substring(4, 8) + "-"
            + raw.substring(8, 12) + "-" + raw.substring(12, 16);
    }

    private String codeHash(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Courtesy code is required.");
        return BillingHashing.sha256(value.trim().toUpperCase(Locale.ROOT));
    }

    private String normalizeEmail(String value) {
        if (value == null || value.isBlank()) return null;
        var email = value.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 190 || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("allowed_email must be a valid email.");
        }
        return email;
    }

    private String required(String value, String field, int min, int max) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.length() < min || normalized.length() > max) {
            throw new IllegalArgumentException(field + " must contain between " + min + " and " + max + " characters.");
        }
        return normalized;
    }

    private String blank(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }

    public record CreateRequest(
        String label,
        String allowed_email,
        List<String> product_codes,
        Integer included_extra_seats,
        Integer access_days,
        Boolean permanent,
        Integer max_redemptions,
        Instant starts_at,
        Instant expires_at,
        String reason,
        String campaign_code
    ) {}

    public record RevokeRequest(String reason) {}
    public record RedemptionResult(long courtesyCodeId, Instant accessEndsAt, boolean permanent) {}
    private record RedeemableCode(
        long id, String status, String allowedEmail, Integer accessDays, int maxRedemptions,
        int redemptionCount, Instant startsAt, Instant expiresAt
    ) {}
}
