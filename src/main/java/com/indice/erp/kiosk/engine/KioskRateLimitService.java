package com.indice.erp.kiosk.engine;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskRateLimitService {

    private final JdbcTemplate jdbcTemplate;
    private final int multiKioskAggregateMaximumAttempts;
    private final Duration multiKioskAggregateWindow;

    public KioskRateLimitService(
            JdbcTemplate jdbcTemplate,
            @Value("${kiosk.engine.multi-kiosk.pin.aggregate.maximum-attempts:30}")
            int multiKioskAggregateMaximumAttempts,
            @Value("${kiosk.engine.multi-kiosk.pin.aggregate.window-seconds:1800}")
            long multiKioskAggregateWindowSeconds) {
        if (multiKioskAggregateMaximumAttempts
                <= KioskRateLimitType.PIN_VERIFICATION.maximumRequests()) {
            throw new IllegalStateException(
                "The aggregate Multi-kiosk PIN limit must exceed the per-network limit.");
        }
        if (multiKioskAggregateWindowSeconds
                <= KioskRateLimitType.PIN_VERIFICATION.window().getSeconds()) {
            throw new IllegalStateException(
                "The aggregate Multi-kiosk PIN window must exceed the per-network window.");
        }
        this.jdbcTemplate = jdbcTemplate;
        this.multiKioskAggregateMaximumAttempts = multiKioskAggregateMaximumAttempts;
        this.multiKioskAggregateWindow = Duration.ofSeconds(multiKioskAggregateWindowSeconds);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void requireAllowed(
            KioskRateLimitType type,
            KioskExecutionContext context,
            Map<String, Object> payload) {
        if (context.session() == null && requiresStableNetworkBucket(type)) {
            consume(type, stableNetworkScopeHash(type, context), type.maximumRequests());
        }
        consume(type, requestScopeHash(type, context, payload), type.maximumRequests());
    }

    /** A valid PIN starts a fresh attempt budget for this kiosk and browser boundary. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resetSuccessfulPinVerification(
            KioskExecutionContext context,
            Map<String, Object> payload,
            String stablePinScope) {
        var scopeHashes = new LinkedHashSet<String>();
        if (context.session() == null) {
            scopeHashes.add(stableNetworkScopeHash(KioskRateLimitType.PIN_VERIFICATION, context));
        }
        scopeHashes.add(requestScopeHash(KioskRateLimitType.PIN_VERIFICATION, context, payload));
        switch (stablePinScope == null ? "" : stablePinScope.trim().toUpperCase()) {
            case "KIOSK" -> scopeHashes.add(stablePinScopeHash(context));
            case "PERSON" -> scopeHashes.add(stablePersonalPinScopeHash(context));
            default -> { }
        }
        for (var scopeHash : scopeHashes) {
            jdbcTemplate.update(
                "DELETE FROM kiosk_engine_rate_limit_buckets WHERE limit_type = ? AND scope_hash = ?",
                KioskRateLimitType.PIN_VERIFICATION.name(), scopeHash);
        }
    }

    private boolean requiresStableNetworkBucket(KioskRateLimitType type) {
        return type != KioskRateLimitType.BOOTSTRAP && type != KioskRateLimitType.QUERY;
    }

    String requestScopeHash(
            KioskRateLimitType type,
            KioskExecutionContext context,
            Map<String, Object> payload) {
        var identitySignal = context.session() == null
            ? unauthenticatedSignal(type, payload)
            : sha256(context.session().companyId() + ":" + context.session().identityType()
                + ":" + context.session().identityId());
        var companySignal = context.definition() == null
            ? "unresolved" : String.valueOf(context.definition().companyId());
        return sha256(String.join("\n",
            context.ownerModule(),
            companySignal,
            context.accessReference(),
            context.networkSignal(),
            context.browserSessionReference(),
            identitySignal
        ));
    }

    String stableNetworkScopeHash(KioskRateLimitType type, KioskExecutionContext context) {
        var companySignal = context.definition() == null
            ? "unresolved" : String.valueOf(context.definition().companyId());
        return sha256(String.join("\n",
            context.ownerModule(),
            companySignal,
            context.accessReference(),
            context.networkSignal(),
            type.name(),
            "stable-network-challenge"
        ));
    }

    /**
     * Adds a non-rotatable PIN bucket for kiosks whose public link resolves one expected
     * identity. Network headers and browser cookies intentionally do not participate.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void requireStablePinAllowed(KioskExecutionContext context) {
        if (context.definition() == null) {
            throw new IllegalArgumentException("A resolved kiosk is required for PIN throttling.");
        }
        consume(
            KioskRateLimitType.PIN_VERIFICATION,
            stablePinScopeHash(context),
            KioskRateLimitType.PIN_VERIFICATION.maximumRequests());
    }

    /**
     * Adds a company-wide bucket for a personal PIN. The identity is resolved only from the
     * Engine grant, never from attacker-controlled payload, network or browser signals. Every
     * kiosk granted to the same person therefore shares the same attempt budget.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void requireStablePersonalPinAllowed(KioskExecutionContext context) {
        consume(
            KioskRateLimitType.PIN_VERIFICATION,
            stablePersonalPinScopeHash(context),
            KioskRateLimitType.PIN_VERIFICATION.maximumRequests());
    }

    /**
     * Two-layer PIN defense for a Multi-kiosk link. The low per-network budget limits one
     * origin, while the larger aggregate budget also limits distributed attempts that rotate
     * networks. Neither scope contains the guessed PIN, browser state or personal data.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void requireMultiKioskPinAllowed(
            long companyId,
            long multiKioskId,
            String networkSignal) {
        if (companyId <= 0 || multiKioskId <= 0) {
            throw new IllegalArgumentException("A resolved multi-kiosk is required for PIN throttling.");
        }
        consume(
            KioskRateLimitType.PIN_VERIFICATION,
            multiKioskPinScopeHash(companyId, multiKioskId, networkSignal),
            KioskRateLimitType.PIN_VERIFICATION.maximumRequests());
        consume(
            KioskRateLimitType.PIN_VERIFICATION,
            multiKioskAggregatePinScopeHash(companyId, multiKioskId),
            multiKioskAggregateMaximumAttempts,
            multiKioskAggregateWindow);
    }

    /**
     * Removes only the attempt consumed by a successful multi-kiosk authentication from both
     * layers. Existing failures remain, so normal employee sign-ins do not exhaust the shared
     * aggregate budget or reset an attacker's failure history.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void releaseSuccessfulMultiKioskPinAttempt(
            long companyId,
            long multiKioskId,
            String networkSignal) {
        if (companyId <= 0 || multiKioskId <= 0) {
            throw new IllegalArgumentException("A resolved multi-kiosk is required for PIN throttling.");
        }
        for (var scopeHash : java.util.List.of(
                multiKioskPinScopeHash(companyId, multiKioskId, networkSignal),
                multiKioskAggregatePinScopeHash(companyId, multiKioskId))) {
            jdbcTemplate.update(
                """
                    UPDATE kiosk_engine_rate_limit_buckets
                    SET request_count = GREATEST(request_count - 1, 0),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE limit_type = ? AND scope_hash = ?
                    """,
                KioskRateLimitType.PIN_VERIFICATION.name(), scopeHash);
            jdbcTemplate.update(
                """
                    DELETE FROM kiosk_engine_rate_limit_buckets
                    WHERE limit_type = ? AND scope_hash = ? AND request_count <= 0
                    """,
                KioskRateLimitType.PIN_VERIFICATION.name(), scopeHash);
        }
    }

    String multiKioskPinScopeHash(long companyId, long multiKioskId, String networkSignal) {
        return sha256(String.join("\n",
            String.valueOf(companyId),
            String.valueOf(multiKioskId),
            networkSignal == null || networkSignal.isBlank() ? "unknown" : networkSignal.trim(),
            "multi-kiosk-pin-challenge"));
    }

    String multiKioskAggregatePinScopeHash(long companyId, long multiKioskId) {
        if (companyId <= 0 || multiKioskId <= 0) {
            throw new IllegalArgumentException("A resolved multi-kiosk is required for PIN throttling.");
        }
        return sha256(String.join("\n",
            String.valueOf(companyId),
            String.valueOf(multiKioskId),
            "multi-kiosk-pin-aggregate-challenge"));
    }

    private void consume(KioskRateLimitType type, String scopeHash, int maximumRequests) {
        consume(type, scopeHash, maximumRequests, type.window());
    }

    private void consume(
            KioskRateLimitType type,
            String scopeHash,
            int maximumRequests,
            Duration window) {
        var now = Instant.now();
        var resetBefore = now.minus(window);

        jdbcTemplate.update(
            """
                INSERT INTO kiosk_engine_rate_limit_buckets (
                    limit_type, scope_hash, window_started_at, request_count, updated_at
                ) VALUES (?, ?, ?, 1, ?)
                ON DUPLICATE KEY UPDATE
                    request_count = IF(window_started_at < ?, 1, request_count + 1),
                    window_started_at = IF(window_started_at < ?, VALUES(window_started_at), window_started_at),
                    updated_at = VALUES(updated_at)
                """,
            type.name(),
            scopeHash,
            Timestamp.from(now),
            Timestamp.from(now),
            Timestamp.from(resetBefore),
            Timestamp.from(resetBefore)
        );

        var bucket = jdbcTemplate.queryForObject(
            """
                SELECT request_count, window_started_at
                FROM kiosk_engine_rate_limit_buckets
                WHERE limit_type = ? AND scope_hash = ?
                """,
            (rs, rowNum) -> new RateLimitBucket(
                rs.getInt("request_count"),
                rs.getTimestamp("window_started_at").toInstant()
            ),
            type.name(),
            scopeHash
        );
        if (bucket != null && bucket.requestCount() > maximumRequests) {
            var retryAt = bucket.windowStartedAt().plus(window);
            throw new KioskRateLimitExceededException(retryAt.getEpochSecond() - now.getEpochSecond());
        }
    }

    private String stablePinScopeHash(KioskExecutionContext context) {
        return sha256(String.join("\n",
            context.ownerModule(),
            String.valueOf(context.definition().companyId()),
            context.accessReference(),
            "stable-pin-challenge"
        ));
    }

    String stablePersonalPinScopeHash(KioskExecutionContext context) {
        if (context.definition() == null) {
            throw new IllegalArgumentException("A resolved kiosk is required for PIN throttling.");
        }
        var identities = jdbcTemplate.queryForList(
            """
                SELECT CONCAT(UPPER(identity_type), ':', identity_id)
                FROM kiosk_grants
                WHERE kiosk_definition_id = ? AND status = 'ACTIVE'
                GROUP BY UPPER(identity_type), identity_id
                ORDER BY UPPER(identity_type), identity_id
                LIMIT 2
                """,
            String.class,
            context.definition().id()
        );
        if (identities.size() != 1) {
            throw new SecurityException(
                "Kiosk personal identity scope is missing or ambiguous.");
        }
        return sha256(String.join("\n",
            String.valueOf(context.definition().companyId()),
            identities.getFirst(),
            "stable-person-pin-challenge"
        ));
    }

    private String unauthenticatedSignal(KioskRateLimitType type, Map<String, Object> payload) {
        // A PIN candidate must not create its own bucket; otherwise an attacker can
        // bypass throttling simply by changing the guessed value on every request.
        if (type == KioskRateLimitType.PIN_VERIFICATION) {
            return "pin-challenge";
        }
        return identitySignal(payload);
    }

    private String identitySignal(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return "anonymous";
        }
        for (var key : new String[] {
            "identification_token", "identificationToken", "credential_payload", "credential", "pin", "email"
        }) {
            var value = payload.get(key);
            if (value != null && !String.valueOf(value).isBlank()) {
                return sha256(String.valueOf(value).trim());
            }
        }
        return "anonymous";
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private record RateLimitBucket(int requestCount, Instant windowStartedAt) {
    }
}
