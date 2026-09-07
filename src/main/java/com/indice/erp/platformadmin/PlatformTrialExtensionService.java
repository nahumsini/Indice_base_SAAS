package com.indice.erp.platformadmin;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.auth.SignupTrialTerms;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import com.stripe.exception.StripeException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PlatformTrialExtensionService {

    private static final int EXTENSION_DAYS = 15;

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final PlatformAdminAccessService access;
    private final PlatformAuditService audit;
    private final StripeBillingGateway stripe;
    private final CommercialLifecycleService lifecycle;
    private final CompanyEntitlementProjectionService entitlements;
    private final Clock clock;

    public PlatformTrialExtensionService(
        JdbcTemplate jdbc,
        TransactionTemplate transactions,
        PlatformAdminAccessService access,
        PlatformAuditService audit,
        StripeBillingGateway stripe,
        CommercialLifecycleService lifecycle,
        CompanyEntitlementProjectionService entitlements,
        Clock clock
    ) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.access = access;
        this.audit = audit;
        this.stripe = stripe;
        this.lifecycle = lifecycle;
        this.entitlements = entitlements;
        this.clock = clock;
    }

    public Map<String, Object> extend(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        ExtensionRequest request
    ) {
        var authority = access.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        if (!"PLATFORM_ROOT".equals(authority.role())) {
            throw new PlatformAdminForbiddenException("Sólo Root puede extender periodos de prueba.");
        }
        return extendAfterAuthorization(actorUserId, companyId, idempotencyKey, request);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    public Map<String, Object> extendAfterAuthorization(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        ExtensionRequest request
    ) {
        var cleanKey = requireIdempotencyKey(idempotencyKey);
        var days = request == null || request.days() == null ? 0 : request.days();
        if (days != EXTENSION_DAYS) {
            throw new IllegalArgumentException("La extensión autorizada es de 15 días.");
        }
        if (request == null || !Boolean.TRUE.equals(request.consultation_confirmed())) {
            throw new IllegalArgumentException("Confirma que la sesión de consultoría se realizó.");
        }

        var keyHash = BillingHashing.sha256("platform-trial-extension:" + companyId + ":" + cleanKey);
        var replay = completedExtension(keyHash);
        if (replay != null) return replay;
        var mutation = transactions.execute(status -> prepare(
            actorUserId, companyId, keyHash, days
        ));
        if (mutation == null) throw new IllegalStateException("No se pudo preparar la extensión de prueba.");
        if (mutation.completed()) return completedExtension(keyHash);

        if (mutation.source().stripeManaged()) {
            updateStripeTrial(actorUserId, mutation.source(), companyId, mutation.reference(), mutation.extendedEndsAt());
        }

        try {
            transactions.executeWithoutResult(status -> complete(companyId, mutation));
        } catch (RuntimeException exception) {
            markFailed(mutation.reference(), "LOCAL_UPDATE_FAILED", exception.getMessage());
            audit.record(
                actorUserId,
                "COMPANY_TRIAL_EXTENDED",
                "COMPANY",
                String.valueOf(companyId),
                companyId,
                "FAILED",
                Map.of(
                    "reference", mutation.reference(),
                    "source", mutation.source().type(),
                    "reason", "LOCAL_UPDATE_FAILED"
                )
            );
            throw exception;
        }
        audit.record(
            actorUserId,
            "COMPANY_TRIAL_EXTENDED",
            "COMPANY",
            String.valueOf(companyId),
            companyId,
            "SUCCESS",
            Map.of(
                "reference", mutation.reference(),
                "source", mutation.source().type(),
                "added_days", days,
                "prior_ends_at", mutation.source().priorEndsAt().toString(),
                "extended_ends_at", mutation.extendedEndsAt().toString(),
                "consultation_confirmed", true,
                "charged_now", false
            )
        );
        return response(
            mutation.reference(), companyId, mutation.source().type(), days,
            mutation.source().priorEndsAt(), mutation.extendedEndsAt(), false
        );
    }

    private PreparedMutation prepare(
        long actorUserId,
        long companyId,
        String keyHash,
        int days
    ) {
        lockActiveCompany(companyId);
        var existing = preparedExtension(keyHash);
        if (existing != null) {
            if (existing.addedDays() != days) {
                throw new IllegalStateException("La llave de idempotencia ya se usó con otra duración.");
            }
            return existing;
        }
        var pending = jdbc.queryForObject(
            "SELECT COUNT(*) FROM platform_trial_extensions WHERE company_id = ? AND status = 'PREPARED'",
            Integer.class,
            companyId
        );
        if (pending != null && pending > 0) {
            throw new IllegalStateException("Ya existe una extensión en proceso para esta cuenta.");
        }
        var completed = jdbc.queryForObject(
            "SELECT COUNT(*) FROM platform_trial_extensions WHERE company_id = ? AND status = 'COMPLETED'",
            Integer.class,
            companyId
        );
        if (completed != null && completed > 0) {
            throw new IllegalStateException("La cuenta ya utilizó su única extensión de prueba.");
        }
        var source = trialSource(companyId);
        if (source == null) {
            throw new IllegalStateException("La cuenta no tiene una prueba o demo extensible.");
        }
        var maximumEnd = source.startedAt().plus(
            SignupTrialTerms.MAX_EXTENDED_TRIAL_DAYS,
            ChronoUnit.DAYS
        );
        var now = clock.instant();
        var base = source.priorEndsAt().isAfter(now) ? source.priorEndsAt() : now;
        var extendedEndsAt = base.plus(days, ChronoUnit.DAYS);
        if (extendedEndsAt.isAfter(maximumEnd)) {
            throw new IllegalStateException("La prueba no puede superar 30 días totales.");
        }
        var reference = BillingHashing.randomReference().substring(0, 32);
        jdbc.update(
            """
                INSERT INTO platform_trial_extensions (
                    public_reference, company_id, actor_user_id, idempotency_key_hash,
                    source_type, source_record_id, stripe_subscription_id, added_days,
                    trial_started_at, consultation_confirmed,
                    prior_ends_at, extended_ends_at, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'PREPARED')
                """,
            reference, companyId, actorUserId, keyHash, source.type(), source.recordId(),
            source.stripeSubscriptionId(), days, Timestamp.from(source.startedAt()),
            Timestamp.from(source.priorEndsAt()),
            Timestamp.from(extendedEndsAt)
        );
        return new PreparedMutation(reference, source, days, extendedEndsAt, false);
    }

    private void complete(long companyId, PreparedMutation mutation) {
        lockActiveCompany(companyId);
        var extensionStatus = jdbc.queryForObject(
            "SELECT status FROM platform_trial_extensions WHERE public_reference = ? FOR UPDATE",
            String.class,
            mutation.reference()
        );
        if ("COMPLETED".equals(extensionStatus)) return;
        if (!"PREPARED".equals(extensionStatus) && !"FAILED".equals(extensionStatus)) {
            throw new IllegalStateException("La extensión no está disponible para completarse.");
        }
        var source = mutation.source();
        if (source.stripeManaged()) {
            var updatedSubscription = jdbc.update(
                """
                    UPDATE company_billing_subscriptions
                    SET trial_ends_at = ?
                    WHERE id = ? AND UPPER(status) = 'TRIALING'
                    """,
                Timestamp.from(mutation.extendedEndsAt()), source.recordId()
            );
            if (updatedSubscription != 1) {
                throw new IllegalStateException("La suscripción dejó de estar en prueba antes de aplicar la extensión.");
            }
            jdbc.update(
                """
                    UPDATE company_trial_product_grants
                    SET ends_at = ?, status = 'ACTIVE'
                    WHERE company_id = ? AND status = 'ACTIVE' AND ends_at = ?
                    """,
                Timestamp.from(mutation.extendedEndsAt()), companyId, Timestamp.from(source.priorEndsAt())
            );
        } else {
            var updatedBenefits = jdbc.update(
                """
                    UPDATE company_benefit_grants
                    SET ends_at = ?, status = 'ACTIVE'
                    WHERE company_id = ?
                      AND source_type IN ('COURTESY', 'PROMOTION', 'SUPPORT', 'TEST')
                      AND status = 'ACTIVE'
                      AND ends_at = ?
                    """,
                Timestamp.from(mutation.extendedEndsAt()), companyId, Timestamp.from(source.priorEndsAt())
            );
            if (updatedBenefits == 0) {
                throw new IllegalStateException("No se encontró la vigencia local que debía extenderse.");
            }
            if (source.recordId() != null) {
                jdbc.update(
                    "UPDATE billing_signup_intents SET courtesy_access_ends_at = ? WHERE id = ?",
                    Timestamp.from(mutation.extendedEndsAt()), source.recordId()
                );
            }
        }
        lifecycle.extendTrial(
            companyId, mutation.extendedEndsAt(), source.stripeManaged(),
            "trial-extension:" + mutation.reference()
        );
        entitlements.refreshIfEnrolled(companyId);
        jdbc.update(
            """
                UPDATE platform_trial_extensions
                SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP(6),
                    failure_code = NULL, failure_message = NULL
                WHERE public_reference = ?
                """,
            mutation.reference()
        );
    }

    private void updateStripeTrial(
        long actorUserId,
        TrialSource source,
        long companyId,
        String reference,
        Instant extendedEndsAt
    ) {
        try {
            stripe.updateSubscription(
                source.stripeSubscriptionId(),
                Map.of(
                    "trial_end", extendedEndsAt.getEpochSecond(),
                    "proration_behavior", "none"
                ),
                "indice.platform.company." + companyId + ".trial-extension." + reference
            );
        } catch (StripeException exception) {
            markFailed(reference, "STRIPE_UPDATE_FAILED", exception.getMessage());
            audit.record(
                actorUserId,
                "COMPANY_TRIAL_EXTENDED",
                "COMPANY",
                String.valueOf(companyId),
                companyId,
                "FAILED",
                Map.of("reference", reference, "source", source.type(), "reason", "STRIPE_UPDATE_FAILED")
            );
            throw new IllegalStateException("Stripe no pudo extender el periodo de prueba.", exception);
        }
    }

    private TrialSource trialSource(long companyId) {
        return jdbc.query(
            """
                SELECT company.id,
                       subscription.id AS subscription_id,
                       UPPER(COALESCE(subscription.status, '')) AS subscription_status,
                       subscription.stripe_subscription_id,
                       subscription.trial_starts_at AS stripe_trial_starts_at,
                       subscription.trial_ends_at AS stripe_trial_ends_at,
                       courtesy.id AS courtesy_signup_intent_id,
                       (
                           SELECT MAX(benefit.ends_at)
                           FROM company_benefit_grants benefit
                           WHERE benefit.company_id = company.id
                             AND benefit.benefit_type = 'PRODUCT'
                             AND benefit.source_type IN ('COURTESY', 'PROMOTION', 'SUPPORT', 'TEST')
                             AND benefit.status = 'ACTIVE'
                             AND benefit.ends_at IS NOT NULL
                       ) AS local_demo_ends_at,
                       (
                           SELECT MIN(benefit.starts_at)
                           FROM company_benefit_grants benefit
                           WHERE benefit.company_id = company.id
                             AND benefit.benefit_type = 'PRODUCT'
                             AND benefit.source_type IN ('COURTESY', 'PROMOTION', 'SUPPORT', 'TEST')
                             AND benefit.status = 'ACTIVE'
                             AND benefit.ends_at IS NOT NULL
                       ) AS local_demo_starts_at,
                       EXISTS (
                           SELECT 1
                           FROM company_benefit_grants benefit
                           WHERE benefit.company_id = company.id
                             AND benefit.benefit_type = 'PRODUCT'
                             AND benefit.status = 'ACTIVE'
                             AND benefit.ends_at IS NULL
                       ) AS permanent_access
                FROM companies company
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.id = (
                      SELECT MAX(candidate.id)
                      FROM company_billing_subscriptions candidate
                      WHERE candidate.company_id = company.id
                  )
                LEFT JOIN billing_signup_intents courtesy
                  ON courtesy.id = (
                      SELECT MAX(candidate.id)
                      FROM billing_signup_intents candidate
                      WHERE candidate.company_id = company.id
                        AND candidate.signup_channel = 'COURTESY'
                  )
                WHERE company.id = ?
                """,
            (rs, rowNum) -> {
                var subscriptionStatus = rs.getString("subscription_status");
                var stripeSubscriptionId = rs.getString("stripe_subscription_id");
                var stripeStartsAt = instant(rs.getTimestamp("stripe_trial_starts_at"));
                var stripeEndsAt = instant(rs.getTimestamp("stripe_trial_ends_at"));
                var stripeManaged = stripeSubscriptionId != null
                    && !stripeSubscriptionId.isBlank()
                    && !stripeSubscriptionId.startsWith("internal_")
                    && !stripeSubscriptionId.startsWith("legacy_");
                if ("TRIALING".equals(subscriptionStatus) && stripeManaged && stripeEndsAt != null) {
                    return new TrialSource(
                        "STRIPE",
                        (Long) rs.getObject("subscription_id"),
                        stripeSubscriptionId,
                        stripeStartsAt == null ? stripeEndsAt.minus(SignupTrialTerms.TRIAL_DAYS, ChronoUnit.DAYS) : stripeStartsAt,
                        stripeEndsAt
                    );
                }
                if (!subscriptionStatus.isBlank() || rs.getBoolean("permanent_access")) return null;
                var localEndsAt = instant(rs.getTimestamp("local_demo_ends_at"));
                if (localEndsAt == null) return null;
                var localStartsAt = instant(rs.getTimestamp("local_demo_starts_at"));
                return new TrialSource(
                    "LOCAL_DEMO",
                    (Long) rs.getObject("courtesy_signup_intent_id"),
                    null,
                    localStartsAt == null ? localEndsAt.minus(SignupTrialTerms.TRIAL_DAYS, ChronoUnit.DAYS) : localStartsAt,
                    localEndsAt
                );
            },
            companyId
        ).stream().filter(source -> source != null).findFirst().orElse(null);
    }

    private void lockActiveCompany(long companyId) {
        var statuses = jdbc.query(
            "SELECT platform_status FROM companies WHERE id = ? FOR UPDATE",
            (rs, rowNum) -> rs.getString("platform_status"),
            companyId
        );
        if (statuses.isEmpty()) throw new NoSuchElementException("Company not found.");
        if (!"ACTIVE".equalsIgnoreCase(statuses.getFirst())) {
            throw new IllegalStateException("Deleted accounts cannot receive trial extensions.");
        }
    }

    private Map<String, Object> completedExtension(String keyHash) {
        return jdbc.query(
            """
                SELECT public_reference, company_id, source_type, added_days,
                       prior_ends_at, extended_ends_at
                FROM platform_trial_extensions
                WHERE idempotency_key_hash = ? AND status = 'COMPLETED'
                LIMIT 1
                """,
            (rs, rowNum) -> response(
                rs.getString("public_reference"),
                rs.getLong("company_id"),
                rs.getString("source_type"),
                rs.getInt("added_days"),
                instant(rs.getTimestamp("prior_ends_at")),
                instant(rs.getTimestamp("extended_ends_at")),
                true
            ),
            keyHash
        ).stream().findFirst().orElse(null);
    }

    private PreparedMutation preparedExtension(String keyHash) {
        return jdbc.query(
            """
                SELECT public_reference, source_type, source_record_id, stripe_subscription_id,
                       added_days, trial_started_at, prior_ends_at, extended_ends_at, status
                FROM platform_trial_extensions
                WHERE idempotency_key_hash = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PreparedMutation(
                rs.getString("public_reference"),
                new TrialSource(
                    rs.getString("source_type"),
                    (Long) rs.getObject("source_record_id"),
                    rs.getString("stripe_subscription_id"),
                    instant(rs.getTimestamp("trial_started_at")),
                    instant(rs.getTimestamp("prior_ends_at"))
                ),
                rs.getInt("added_days"),
                instant(rs.getTimestamp("extended_ends_at")),
                "COMPLETED".equals(rs.getString("status"))
            ),
            keyHash
        ).stream().findFirst().orElse(null);
    }

    private Map<String, Object> response(
        String reference,
        long companyId,
        String source,
        int addedDays,
        Instant priorEndsAt,
        Instant extendedEndsAt,
        boolean replayed
    ) {
        var result = new LinkedHashMap<String, Object>();
        result.put("reference", reference);
        result.put("company_id", companyId);
        result.put("source", source);
        result.put("added_days", addedDays);
        result.put("prior_ends_at", priorEndsAt.toString());
        result.put("trial_ends_at", extendedEndsAt.toString());
        result.put("charged_now", false);
        result.put("replayed", replayed);
        return result;
    }

    private String requireIdempotencyKey(String value) {
        var clean = value == null ? "" : value.trim();
        if (clean.length() < 8 || clean.length() > 120) {
            throw new IllegalArgumentException("Se requiere una llave de idempotencia válida.");
        }
        return clean.replaceAll("[^a-zA-Z0-9._-]", "-");
    }

    private String cleanFailure(String value) {
        var clean = value == null ? "Stripe update failed." : value.trim();
        return clean.length() <= 500 ? clean : clean.substring(0, 500);
    }

    private void markFailed(String reference, String code, String message) {
        jdbc.update(
            """
                UPDATE platform_trial_extensions
                SET status = 'FAILED', failure_code = ?, failure_message = ?
                WHERE public_reference = ?
                """,
            code,
            cleanFailure(message),
            reference
        );
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record ExtensionRequest(Integer days, Boolean consultation_confirmed) {
    }

    private record TrialSource(
        String type,
        Long recordId,
        String stripeSubscriptionId,
        Instant startedAt,
        Instant priorEndsAt
    ) {
        boolean stripeManaged() {
            return "STRIPE".equals(type);
        }
    }

    private record PreparedMutation(
        String reference,
        TrialSource source,
        int addedDays,
        Instant extendedEndsAt,
        boolean completed
    ) {
    }
}
