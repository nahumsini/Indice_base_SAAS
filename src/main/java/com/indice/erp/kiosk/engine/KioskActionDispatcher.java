package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.slf4j.MDC;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskActionDispatcher {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final int MAX_IDEMPOTENCY_KEY_LENGTH = 128;
    private static final Set<String> IDEMPOTENCY_TRANSPORT_FIELDS = Set.of(
        "kiosk_session_token", "identification_token", "identificationToken");
    private final KioskAdapterRegistry registry;
    private final KioskRegistryService definitionRegistry;
    private final KioskSessionService sessionService;
    private final KioskFileIntentService fileIntentService;
    private final KioskEngineFeatureFlags featureFlags;
    private final KioskActionAuditService auditService;
    private final KioskRateLimitService rateLimitService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ObjectWriter canonicalWriter;
    private final KioskPayloadProtectionService payloadProtection;
    private final KioskPaymentCollectionGuard collectionGuard;

    public KioskActionDispatcher(
            KioskAdapterRegistry registry,
            KioskRegistryService definitionRegistry,
            KioskSessionService sessionService,
            KioskFileIntentService fileIntentService,
            KioskEngineFeatureFlags featureFlags,
            KioskActionAuditService auditService,
            KioskRateLimitService rateLimitService,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            KioskPayloadProtectionService payloadProtection,
            KioskPaymentCollectionGuard collectionGuard) {
        this.registry = registry;
        this.definitionRegistry = definitionRegistry;
        this.sessionService = sessionService;
        this.fileIntentService = fileIntentService;
        this.featureFlags = featureFlags;
        this.auditService = auditService;
        this.rateLimitService = rateLimitService;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.payloadProtection = payloadProtection;
        this.collectionGuard = collectionGuard;
        this.canonicalWriter = objectMapper.writer()
            .with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    }

    @Transactional
    public Map<String, Object> dispatch(
            KioskExecutionContext context,
            KioskActionRequest request,
            String idempotencyKey) {
        return dispatchInternal(context, request, idempotencyKey).data();
    }

    @Transactional
    public KioskDispatchResult dispatchWithMetadata(
            KioskExecutionContext context,
            KioskActionRequest request,
            String idempotencyKey) {
        return dispatchInternal(context, request, idempotencyKey);
    }

    private KioskDispatchResult dispatchInternal(
            KioskExecutionContext context,
            KioskActionRequest request,
            String idempotencyKey) {
        var adapter = registry.requireAdapter(context.ownerModule());
        var capability = registry.requireCapability(request.versionedCapabilityKey());
        var accessReferenceHash = sha256(context.accessReference());
        // Before authentication, correlate retries with the browser boundary.
        // Never persist a fast hash derived from a low-entropy PIN or public PII.
        var identityReferenceHash = sha256("browser:" + context.browserSessionReference());
        var executionContext = context;
        String actionId = null;
        boolean recordingSuccessAudit = false;
        var previousActionId = MDC.get("actionId");

        try {
            if (!featureFlags.registryEnabled() || !featureFlags.sessionsEnabled()
                    || !featureFlags.auditEnabled() || !featureFlags.adapterEnabled(context.ownerModule())) {
                throw new KioskUnavailableException();
            }
            var definition = context.definition() == null
                ? definitionRegistry.resolvePublic(context.ownerModule(), context.accessReference())
                : definitionRegistry.requireById(
                    context.definition().companyId(), context.definition().id());
            if (!definition.ownerModule().equals(context.ownerModule())) {
                throw new SecurityException("Kiosk definition does not belong to this module.");
            }
            collectionGuard.requireOperationalAccess(definition.companyId());
            var definitionCapabilities = adapter.capabilities(definition);
            if (definitionCapabilities.stream()
                    .noneMatch(candidate -> candidate.versionedKey().equals(capability.versionedKey()))) {
                throw new SecurityException("Kiosk capability is not available for this kiosk type.");
            }
            /*
             * Employee channels arrive with a principal that was already restored from the
             * authoritative parent/child session boundary. Keep that principal while consuming
             * the rate-limit bucket so one collaborator cannot exhaust the shared "mobile"
             * network bucket for every other collaborator. The token is still revalidated below
             * and must match this principal before authorization or execution.
             */
            executionContext = context.resolved(definition, context.session());
            var moduleManagedPinThrottle = isIdentityEstablishment(request)
                && Boolean.TRUE.equals(capability.inputContract().get("moduleManagedPinThrottle"));
            var stablePinScope = "";
            if (isIdentityEstablishment(request) && !moduleManagedPinThrottle) {
                stablePinScope = String.valueOf(
                    capability.inputContract().getOrDefault("stablePinScope", ""))
                    .trim().toUpperCase(java.util.Locale.ROOT);
                switch (stablePinScope) {
                    case "" -> { }
                    case "KIOSK" -> rateLimitService.requireStablePinAllowed(executionContext);
                    case "PERSON" ->
                        rateLimitService.requireStablePersonalPinAllowed(executionContext);
                    default -> throw new SecurityException(
                        "Kiosk PIN throttling scope is not supported.");
                }
            }
            if (!moduleManagedPinThrottle) {
                rateLimitService.requireAllowed(rateLimitType(capability), executionContext, request.payload());
            }
            definitionRegistry.synchronizeCapabilities(definition, definitionCapabilities);
            if (!definitionRegistry.capabilityEnabled(definition.id(), capability)) {
                throw new SecurityException("Kiosk capability is not available.");
            }
            if (!isIdentityEstablishment(request) && capability.accessLevel() != KioskAccessLevel.PUBLIC) {
                KioskSessionPrincipal session;
                if (KioskExecutionChannels.MOBILE_MULTI_KIOSK.equals(context.channel())) {
                    if (context.session() == null) {
                        throw new SecurityException("Mobile Multi-kiosk authority is required.");
                    }
                    session = sessionService.requirePrevalidatedMobileSession(
                        definition, capability, request.payload(), context.browserSessionReference(),
                        context.session());
                } else {
                    session = sessionService.requireSession(
                        definition, capability, request.payload(), context.browserSessionReference(),
                        context.channel());
                    if (context.session() != null) {
                        requireSameSession(context.session(), session, definition);
                    }
                }
                executionContext = executionContext.resolved(definition, session);
                identityReferenceHash = sha256(
                    definition.companyId() + ":" + session.identityType() + ":" + session.identityId());
            }
            adapter.authorize(executionContext, request).requireAllowed();

            var normalizedKey = normalizeIdempotencyKey(idempotencyKey);
            var requestFingerprint = fingerprint(request);
            if (capability.mutation() && normalizedKey == null) {
                throw new IllegalArgumentException("Idempotency-Key is required for kiosk mutations.");
            }
            Map<String, Object> replay = null;
            if (capability.mutation()) {
                replay = reserveOrReplay(
                    executionContext, request, capability, accessReferenceHash, identityReferenceHash,
                    normalizedKey, requestFingerprint, false);
            }
            if (replay != null) {
                actionId = auditService.beginAction(executionContext, request, capability, normalizedKey);
                MDC.put("actionId", actionId);
                recordingSuccessAudit = true;
                auditService.recordSuccess(
                    actionId, requestId(), executionContext, request, capability, replay, true);
                recordingSuccessAudit = false;
                return result(replay, executionContext, capability);
            }
            fileIntentService.validateTechnicalPolicy(executionContext, request, capability);
            adapter.validate(executionContext, request).requireValid();
            actionId = auditService.beginAction(executionContext, request, capability, normalizedKey);
            MDC.put("actionId", actionId);

            var response = KioskExecutionChannels.isEmployeeChannel(executionContext.channel())
                ? adapter.executeEmployee(executionContext, request)
                : KioskExecutionChannels.PROVIDER_MULTI_KIOSK.equals(executionContext.channel())
                    ? adapter.executeProvider(executionContext, request)
                    : adapter.execute(executionContext, request);
            fileIntentService.captureOutcome(executionContext, request, capability, response);
            if (isIdentityEstablishment(request)) {
                response = establishControlledSession(executionContext, definitionCapabilities, response);
                if (!moduleManagedPinThrottle) {
                    rateLimitService.resetSuccessfulPinVerification(
                        executionContext, request.payload(), stablePinScope);
                }
                executionContext = executionContext.resolved(
                    definition, (KioskSessionPrincipal) response.get("engine_session"));
                response = publicSessionResponse(response);
            }
            if (capability.mutation()) {
                completeIdempotency(
                    executionContext, capability, accessReferenceHash, identityReferenceHash, normalizedKey, response);
            }
            recordingSuccessAudit = true;
            auditService.recordSuccess(
                actionId, requestId(), executionContext, request, capability, response, false);
            recordingSuccessAudit = false;
            return result(response, executionContext, capability);
        } catch (RuntimeException failure) {
            if (actionId != null && !recordingSuccessAudit) {
                auditService.recordFailure(
                    actionId, requestId(), executionContext, request, capability, failure);
            } else if (executionContext.definition() != null) {
                auditService.recordRejected(
                    requestId(), executionContext, request, capability, failure);
            }
            throw failure;
        } finally {
            if (previousActionId == null) {
                MDC.remove("actionId");
            } else {
                MDC.put("actionId", previousActionId);
            }
        }
    }

    private KioskDispatchResult result(
            Map<String, Object> data,
            KioskExecutionContext context,
            KioskCapabilityDescriptor capability) {
        var sessionId = context.session() == null ? null : context.session().sessionId();
        return new KioskDispatchResult(data, sessionId, capability.versionedKey());
    }

    private void requireSameSession(
            KioskSessionPrincipal expected,
            KioskSessionPrincipal validated,
            KioskResolvedDefinition definition) {
        if (validated == null
                || !expected.sessionId().equals(validated.sessionId())
                || expected.kioskDefinitionId() != definition.id()
                || expected.companyId() != definition.companyId()
                || expected.identityId() != validated.identityId()
                || !expected.identityType().equals(validated.identityType())) {
            throw new SecurityException("Kiosk session context does not match the request channel.");
        }
    }

    private boolean isIdentityEstablishment(KioskActionRequest request) {
        return request.capabilityKey().endsWith(".identity.verify");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> establishControlledSession(
            KioskExecutionContext context,
            Set<KioskCapabilityDescriptor> definitionCapabilities,
            Map<String, Object> response) {
        var identity = response.get("engine_identity") instanceof Map<?, ?> map
            ? (Map<String, Object>) map : Map.<String, Object>of();
        var identificationToken = String.valueOf(response.getOrDefault(
            "kiosk_session_token", response.getOrDefault("identification_token", ""))).trim();
        var user = response.get("user") instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.<String, Object>of();
        var provider = response.get("provider") instanceof Map<?, ?> map
            ? (Map<String, Object>) map : Map.<String, Object>of();
        var identityId = number(identity.get("id"));
        if (identityId == null) {
            identityId = number(user.get("id"));
        }
        if (identityId == null) {
            identityId = number(provider.get("id"));
        }
        var identityType = String.valueOf(identity.getOrDefault(
            "type", provider.isEmpty() ? "EMPLOYEE" : "PROVIDER")).trim().toUpperCase();
        if (identificationToken.isBlank() || identityId == null) {
            throw new IllegalStateException("The module did not return a controlled kiosk identity.");
        }
        var expiresAt = parseInstant(response.get("expires_at"));
        var granted = definitionCapabilities.stream()
            .map(KioskCapabilityDescriptor::versionedKey)
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
        /*
         * The module identification token is also the controlled Engine session token.
         * Besides avoiding two independent credentials for the same public interaction,
         * this keeps kiosk tabs opened before a deployment compatible with the backend
         * after a deployment. The Engine still binds the token to the definition,
         * browser reference, expiry and granted capabilities.
         */
        var session = sessionService.createControlledSession(
            context.definition(), identityType, identityId, identificationToken,
            context.browserSessionReference(), granted, expiresAt);
        var enriched = new LinkedHashMap<>(response);
        enriched.put("kiosk_session_id", session.sessionId());
        enriched.put("kiosk_session_token", identificationToken);
        enriched.put("engine_session", session);
        return enriched;
    }

    private Map<String, Object> publicSessionResponse(Map<String, Object> response) {
        var result = new LinkedHashMap<>(response);
        result.remove("engine_session");
        result.remove("engine_identity");
        return result;
    }

    private Long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? null : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Instant parseInstant(Object value) {
        try {
            return value == null ? null : Instant.parse(String.valueOf(value));
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private Map<String, Object> reserveOrReplay(
            KioskExecutionContext context,
            KioskActionRequest request,
            KioskCapabilityDescriptor capability,
            String accessReferenceHash,
            String identityReferenceHash,
            String idempotencyKey,
            String requestFingerprint,
            boolean retriedAfterExpiry) {
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO kiosk_engine_idempotency (
                        owner_module, capability_key, access_reference_hash, identity_reference_hash,
                        idempotency_key, request_fingerprint, status, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
                    """,
                context.ownerModule(),
                capability.key(),
                accessReferenceHash,
                identityReferenceHash,
                idempotencyKey,
                requestFingerprint,
                Timestamp.from(Instant.now().plus(24, ChronoUnit.HOURS))
            );
            return null;
        } catch (DuplicateKeyException duplicate) {
            var rows = jdbcTemplate.query(
                """
                    SELECT request_fingerprint, status, response_json, expires_at
                    FROM kiosk_engine_idempotency
                    WHERE owner_module = ?
                      AND capability_key = ?
                      AND access_reference_hash = ?
                      AND identity_reference_hash = ?
                      AND idempotency_key = ?
                    LIMIT 1
                    """,
                (rs, rowNum) -> new IdempotencyRow(
                    rs.getString("request_fingerprint"),
                    rs.getString("status"),
                    rs.getString("response_json"),
                    rs.getTimestamp("expires_at").toInstant()
                ),
                context.ownerModule(),
                capability.key(),
                accessReferenceHash,
                identityReferenceHash,
                idempotencyKey
            );
            if (rows.isEmpty()) {
                throw duplicate;
            }
            var row = rows.getFirst();
            if (row.expiresAt().isBefore(Instant.now()) && !retriedAfterExpiry) {
                jdbcTemplate.update(
                    """
                        DELETE FROM kiosk_engine_idempotency
                        WHERE owner_module = ? AND capability_key = ?
                          AND access_reference_hash = ? AND identity_reference_hash = ?
                          AND idempotency_key = ? AND expires_at < CURRENT_TIMESTAMP
                        """,
                    context.ownerModule(), capability.key(), accessReferenceHash,
                    identityReferenceHash, idempotencyKey
                );
                return reserveOrReplay(
                    context, request, capability, accessReferenceHash, identityReferenceHash,
                    idempotencyKey, requestFingerprint, true);
            }
            if (!requestFingerprint.equals(row.requestFingerprint())) {
                throw KioskIdempotencyConflictException.requestMismatch();
            }
            if (!"COMPLETED".equals(row.status()) || row.responseJson() == null) {
                throw KioskIdempotencyConflictException.inProgress();
            }
            return fromJson(row.responseJson());
        }
    }

    private void completeIdempotency(
            KioskExecutionContext context,
            KioskCapabilityDescriptor capability,
            String accessReferenceHash,
            String identityReferenceHash,
            String idempotencyKey,
            Map<String, Object> response) {
        jdbcTemplate.update(
            """
                UPDATE kiosk_engine_idempotency
                SET status = 'COMPLETED', response_json = ?, completed_at = CURRENT_TIMESTAMP
                WHERE owner_module = ?
                  AND capability_key = ?
                  AND access_reference_hash = ?
                  AND identity_reference_hash = ?
                  AND idempotency_key = ?
                  AND status = 'PENDING'
                """,
            protectedResponse(response),
            context.ownerModule(),
            capability.key(),
            accessReferenceHash,
            identityReferenceHash,
            idempotencyKey
        );
    }

    private String normalizeIdempotencyKey(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var normalized = value.trim();
        if (normalized.length() > MAX_IDEMPOTENCY_KEY_LENGTH) {
            throw new IllegalArgumentException("Idempotency-Key is too long.");
        }
        return normalized;
    }

    private String fingerprint(KioskActionRequest request) {
        var fingerprintPayload = new LinkedHashMap<>(request.payload());
        IDEMPOTENCY_TRANSPORT_FIELDS.forEach(fingerprintPayload::remove);
        if (request.capabilityKey().endsWith(".attachment.register")
                && request.payload().containsKey("logical_file_id")) {
            fingerprintPayload.remove("object_key");
            fingerprintPayload.remove("objectKey");
        }
        return sha256(request.versionedCapabilityKey() + "\n" + request.resourceId()
            + "\n" + toJson(fingerprintPayload));
    }

    private String requestId() {
        return MDC.get("requestId");
    }

    private KioskRateLimitType rateLimitType(KioskCapabilityDescriptor capability) {
        if (!capability.filePolicy().isEmpty()
                || capability.key().contains(".attachment.")
                || capability.key().contains(".file.")) {
            return KioskRateLimitType.FILE;
        }
        if (capability.key().endsWith(".identity.verify")) {
            return KioskRateLimitType.PIN_VERIFICATION;
        }
        return capability.mutation() ? KioskRateLimitType.MUTATION : KioskRateLimitType.QUERY;
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private String toJson(Object value) {
        try {
            return canonicalWriter.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Kiosk action payload is not serializable.", ex);
        }
    }

    private Map<String, Object> fromJson(String value) {
        try {
            var stored = objectMapper.readValue(value, MAP_TYPE);
            var protectedValue = stored.get("_protected_response");
            if (protectedValue instanceof String encrypted) {
                return objectMapper.readValue(payloadProtection.reveal(encrypted), MAP_TYPE);
            }
            // Rows written before payload protection remain replayable until their
            // existing 24-hour expiration removes them.
            return stored;
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Stored kiosk action response is invalid.", ex);
        }
    }

    private String protectedResponse(Map<String, Object> response) {
        return toJson(Map.of("_protected_response", payloadProtection.protect(toJson(response))));
    }

    private record IdempotencyRow(
            String requestFingerprint,
            String status,
            String responseJson,
            Instant expiresAt) {
    }
}
