package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Statement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Administration and mobile access boundary for curated employee multi-kiosks. */
@Service
public class MultiKioskService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String DUMMY_PROVIDER_SECRET_HASH =
        "$2a$12$r4v9ajhCqzMS9en6YqQCuOYnQy.y3GEMpSoaFVfW0i9YvN1ub/8xy";
    private static final Set<String> FULL_MODULE_ROLES = Set.of("root", "superadmin");
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final KioskPayloadProtectionService protection;
    private final KioskEmployeeAccessService employeeAccess;
    private final KioskEmployeeToolCatalogService employeeTools;
    private final KioskProviderToolCatalogService providerTools;
    private final KioskMultiDashboardService dashboard;
    private final KioskProviderMultiDashboardService providerDashboard;
    private final KioskRateLimitService rateLimits;
    private final Duration inactivityTimeout;
    private final Duration absoluteLifetime;

    @Autowired
    public MultiKioskService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            BCryptPasswordEncoder passwordEncoder,
            KioskPayloadProtectionService protection,
            KioskEmployeeAccessService employeeAccess,
            KioskEmployeeToolCatalogService employeeTools,
            KioskProviderToolCatalogService providerTools,
            KioskMultiDashboardService dashboard,
            KioskProviderMultiDashboardService providerDashboard,
            KioskRateLimitService rateLimits,
            @Value("${app.kiosk.multi.inactivity-timeout-seconds:28800}") int inactivitySeconds,
            @Value("${app.kiosk.multi.session-ttl-seconds:43200}") int sessionTtlSeconds) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
        this.protection = protection;
        this.employeeAccess = employeeAccess;
        this.employeeTools = employeeTools;
        this.providerTools = providerTools;
        this.dashboard = dashboard;
        this.providerDashboard = providerDashboard;
        this.rateLimits = rateLimits;
        this.inactivityTimeout = Duration.ofSeconds(Math.max(60, inactivitySeconds));
        this.absoluteLifetime = Duration.ofSeconds(Math.max(300, sessionTtlSeconds));
    }

    /** Compatibility constructor retained for focused unit tests of the employee launcher. */
    MultiKioskService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            BCryptPasswordEncoder passwordEncoder,
            KioskPayloadProtectionService protection,
            KioskEmployeeAccessService employeeAccess,
            KioskEmployeeToolCatalogService employeeTools,
            KioskMultiDashboardService dashboard,
            KioskRateLimitService rateLimits,
            int inactivitySeconds,
            int sessionTtlSeconds) {
        this(jdbcTemplate, objectMapper, passwordEncoder, protection, employeeAccess,
            employeeTools, null, dashboard, null, rateLimits, inactivitySeconds, sessionTtlSeconds);
    }

    public List<Map<String, Object>> list(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT definition.*, COALESCE(unit_ref.name, '') AS unit_name,
                       COALESCE(business_ref.name, '') AS business_name,
                       (SELECT COUNT(*) FROM multi_kiosk_items item
                         WHERE item.multi_kiosk_id = definition.id) AS kiosk_count,
                       (SELECT COUNT(*) FROM multi_kiosk_items item
                          INNER JOIN kiosk_definitions child
                            ON child.id = item.kiosk_definition_id
                           AND child.company_id = definition.company_id
                         WHERE item.multi_kiosk_id = definition.id
                           AND (child.code LIKE 'INDICE-EMPLOYEE-TOOL-%'
                             OR child.code LIKE 'INDICE-PROVIDER-TOOL-%')) AS tool_count,
                       (SELECT COUNT(DISTINCT membership.id)
                          FROM user_companies membership
                         WHERE membership.company_id = definition.company_id
                           AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                           AND EXISTS (
                               SELECT 1 FROM kiosk_identity_credentials credential
                                WHERE credential.company_id = membership.company_id
                                  AND credential.credential_type = 'PIN'
                                  AND credential.status = 'ACTIVE'
                                  AND credential.secret_hash IS NOT NULL
                                  AND credential.secret_hash <> ''
                                  AND ((credential.identity_type = 'EMPLOYEE'
                                        AND credential.identity_id = membership.id)
                                    OR (credential.identity_type = 'USER'
                                        AND credential.identity_id = membership.user_id))
                           )) AS eligible_member_count,
                       (SELECT COUNT(DISTINCT provider.id)
                          FROM finance_providers provider
                         WHERE provider.company_id = definition.company_id
                           AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                           AND provider.unit_id IS NOT NULL AND provider.business_id IS NOT NULL
                           AND EXISTS (
                               SELECT 1 FROM kiosk_identity_credentials credential
                                WHERE credential.company_id = provider.company_id
                                  AND credential.identity_type = 'PROVIDER'
                                  AND credential.identity_id = provider.id
                                  AND credential.credential_type = 'PIN'
                                  AND credential.status = 'ACTIVE'
                                  AND credential.credential_origin = 'PROVIDER_CENTER_ADMIN'
                                  AND credential.secret_hash IS NOT NULL
                                  AND credential.secret_hash <> ''
                           )) AS eligible_provider_count
                FROM multi_kiosk_definitions definition
                LEFT JOIN units unit_ref ON unit_ref.id = definition.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = definition.business_id
                WHERE definition.company_id = ? AND definition.status <> 'DELETED'
                ORDER BY definition.updated_at DESC, definition.id DESC
                """,
            this::adminRow,
            companyId
        );
    }

    public Map<String, Object> detail(long companyId, long multiKioskId) {
        var rows = jdbcTemplate.query(
            """
                SELECT definition.*, COALESCE(unit_ref.name, '') AS unit_name,
                       COALESCE(business_ref.name, '') AS business_name,
                       (SELECT COUNT(*) FROM multi_kiosk_items item
                         WHERE item.multi_kiosk_id = definition.id) AS kiosk_count,
                       (SELECT COUNT(*) FROM multi_kiosk_items item
                          INNER JOIN kiosk_definitions child
                            ON child.id = item.kiosk_definition_id
                           AND child.company_id = definition.company_id
                         WHERE item.multi_kiosk_id = definition.id
                           AND (child.code LIKE 'INDICE-EMPLOYEE-TOOL-%'
                             OR child.code LIKE 'INDICE-PROVIDER-TOOL-%')) AS tool_count,
                       (SELECT COUNT(DISTINCT membership.id)
                          FROM user_companies membership
                         WHERE membership.company_id = definition.company_id
                           AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                           AND EXISTS (
                               SELECT 1 FROM kiosk_identity_credentials credential
                                WHERE credential.company_id = membership.company_id
                                  AND credential.credential_type = 'PIN'
                                  AND credential.status = 'ACTIVE'
                                  AND credential.secret_hash IS NOT NULL
                                  AND credential.secret_hash <> ''
                                  AND ((credential.identity_type = 'EMPLOYEE'
                                        AND credential.identity_id = membership.id)
                                    OR (credential.identity_type = 'USER'
                                        AND credential.identity_id = membership.user_id))
                           )) AS eligible_member_count,
                       (SELECT COUNT(DISTINCT provider.id)
                          FROM finance_providers provider
                         WHERE provider.company_id = definition.company_id
                           AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                           AND provider.unit_id IS NOT NULL AND provider.business_id IS NOT NULL
                           AND EXISTS (
                               SELECT 1 FROM kiosk_identity_credentials credential
                                WHERE credential.company_id = provider.company_id
                                  AND credential.identity_type = 'PROVIDER'
                                  AND credential.identity_id = provider.id
                                  AND credential.credential_type = 'PIN'
                                  AND credential.status = 'ACTIVE'
                                  AND credential.credential_origin = 'PROVIDER_CENTER_ADMIN'
                                  AND credential.secret_hash IS NOT NULL
                                  AND credential.secret_hash <> ''
                           )) AS eligible_provider_count
                FROM multi_kiosk_definitions definition
                LEFT JOIN units unit_ref ON unit_ref.id = definition.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = definition.business_id
                WHERE definition.company_id = ? AND definition.id = ?
                  AND definition.status <> 'DELETED'
                LIMIT 1
                """,
            this::adminRow,
            companyId, multiKioskId
        );
        if (rows.isEmpty()) throw new KioskUnavailableException();
        var result = new LinkedHashMap<>(rows.getFirst());
        var composition = items(multiKioskId);
        result.put("kiosks", composition);
        result.put("tools", composition.stream()
            .filter(item -> item.get("tool_key") != null)
            .toList());
        result.put("tool_keys", composition.stream()
            .map(item -> item.get("tool_key"))
            .filter(java.util.Objects::nonNull)
            .map(String::valueOf)
            .toList());
        result.put("legacy_kiosk_definition_ids", composition.stream()
            .filter(item -> item.get("tool_key") == null)
            .map(item -> ((Number) item.get("id")).longValue())
            .toList());
        // Kept only as a response-shape compatibility field. Company PIN access is not
        // represented or authorized by legacy per-Multi-kiosk assignment rows.
        result.put("employees", List.of());
        return Collections.unmodifiableMap(result);
    }

    public Map<String, Object> catalog(long companyId) {
        var employees = jdbcTemplate.query(
            """
                SELECT membership.id AS user_company_id, membership.user_id,
                       COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email) AS name,
                       user.email, COALESCE(membership.role, 'user') AS role,
                       work.unit_id, COALESCE(unit_ref.name, '') AS unit_name,
                       work.business_id, COALESCE(business_ref.name, '') AS business_name,
                       (SELECT GROUP_CONCAT(DISTINCT module_role.module_slug ORDER BY module_role.module_slug)
                          FROM user_company_module_roles module_role
                         WHERE module_role.user_company_id = membership.id) AS module_slugs,
                       (SELECT GROUP_CONCAT(
                                   DISTINCT CONCAT(tab_permission.module_slug, '.', tab_permission.tab_key)
                                   ORDER BY tab_permission.module_slug, tab_permission.tab_key)
                          FROM user_company_tab_permissions tab_permission
                         WHERE tab_permission.user_company_id = membership.id
                           AND tab_permission.can_view = 1) AS tab_scopes,
                       EXISTS(
                         SELECT 1 FROM kiosk_identity_credentials credential
                         WHERE credential.company_id = membership.company_id
                           AND credential.credential_type = 'PIN' AND credential.status = 'ACTIVE'
                           AND credential.secret_hash IS NOT NULL AND credential.secret_hash <> ''
                           AND ((credential.identity_type = 'EMPLOYEE' AND credential.identity_id = membership.id)
                             OR (credential.identity_type = 'USER' AND credential.identity_id = membership.user_id))
                       ) AS pin_ready
                FROM user_companies membership
                INNER JOIN users user ON user.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                LEFT JOIN user_work_profiles work
                  ON work.company_id = membership.company_id
                 AND work.user_company_id = membership.id
                LEFT JOIN units unit_ref ON unit_ref.id = work.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = work.business_id
                WHERE membership.company_id = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                ORDER BY name, user.email
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("user_company_id", rs.getLong("user_company_id"));
                row.put("user_id", rs.getLong("user_id"));
                row.put("name", rs.getString("name"));
                row.put("email", rs.getString("email"));
                row.put("role", rs.getString("role"));
                row.put("unit_id", rs.getObject("unit_id", Long.class));
                row.put("unit_name", rs.getString("unit_name"));
                row.put("business_id", rs.getObject("business_id", Long.class));
                row.put("business_name", rs.getString("business_name"));
                var modules = rs.getString("module_slugs");
                row.put("module_slugs", modules == null || modules.isBlank()
                    ? List.of()
                    : java.util.Arrays.stream(modules.split(","))
                        .map(com.indice.erp.access.ModuleSlugNormalizer::normalize)
                        .filter(value -> !value.isBlank())
                        .distinct()
                        .toList());
                row.put("tab_scopes", normalizedTabScopes(rs.getString("tab_scopes")));
                row.put("tab_scopes_unrestricted",
                    FULL_MODULE_ROLES.contains(normalizeRole(rs.getString("role"))));
                row.put("pin_ready", rs.getBoolean("pin_ready"));
                return Collections.unmodifiableMap(row);
            },
            companyId
        );
        var result = new LinkedHashMap<String, Object>();
        result.put("tools", employeeTools.availableTools(companyId));
        result.put("provider_tools", providerTools == null ? List.of() : providerTools.availableTools(companyId));
        result.put("kiosks", dashboard.contextualCatalog(companyId));
        result.put("employees", employees);
        result.put("access_population", "COMPANY_PIN");
        return Map.copyOf(result);
    }

    @Transactional
    public Map<String, Object> create(long companyId, long actorUserId, Map<String, Object> payload) {
        var input = normalizeInput(companyId, payload);
        if ("PROVIDER".equals(input.audienceType())) {
            var current = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM multi_kiosk_definitions WHERE company_id = ? AND audience_type = 'PROVIDER' AND status IN ('ACTIVE', 'DISABLED')",
                Integer.class, companyId);
            if (current != null && current > 0) {
                throw new IllegalArgumentException("La empresa ya tiene un Centro de Proveedores.");
            }
        }
        var composition = resolveComposition(
            companyId, actorUserId, input, List.of());
        var token = randomToken();
        var code = "MK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        jdbcTemplate.update(
            """
                INSERT INTO multi_kiosk_definitions (
                    company_id, code, name, description, audience_type,
                    allow_provider_registration, status, unit_id, business_id,
                    theme_key, default_locale, expires_at, public_token_hash,
                    public_token_hint, protected_public_token, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            companyId, code, input.name(), nullable(input.description()), input.audienceType(),
            input.allowProviderRegistration(), input.unitId(),
            input.businessId(), input.themeKey(), input.locale(), input.expiresAt(),
            sha256(token), tokenHint(token), protection.protect(token), actorUserId, actorUserId
        );
        var id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (id == null) throw new IllegalStateException("Multi-kiosk could not be created.");
        replaceComposition(id, composition);
        // On create every native tool was resolved from the canonical manifest immediately
        // before provisioning, so its normalized key set is the authoritative audit count.
        // Avoid re-reading the compatibility definitions only to classify the same items.
        var toolCount = (long) input.toolKeys().size();
        audit(companyId, id, "MULTI_KIOSK_CREATED", "USER", actorUserId,
            Map.of("kiosk_count", composition.size(), "tool_count", toolCount));
        return detail(companyId, id);
    }

    @Transactional
    public Map<String, Object> update(
            long companyId, long multiKioskId, long actorUserId, Map<String, Object> payload) {
        requireAdminDefinition(companyId, multiKioskId, false);
        var input = normalizeInput(companyId, payload);
        var currentAudience = definitionAudience(companyId, multiKioskId);
        if (!currentAudience.equals(input.audienceType())) {
            throw new IllegalArgumentException("Multi-kiosk audience cannot be changed after creation.");
        }
        var composition = resolveComposition(
            companyId, actorUserId, input, compositionIds(multiKioskId));
        jdbcTemplate.update(
            """
                UPDATE multi_kiosk_definitions
                SET name = ?, description = ?, unit_id = ?, business_id = ?, theme_key = ?,
                    default_locale = ?, expires_at = ?, allow_provider_registration = ?,
                    configuration_version = configuration_version + 1,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ? AND status NOT IN ('REVOKED', 'DELETED')
                """,
            input.name(), nullable(input.description()), input.unitId(), input.businessId(),
            input.themeKey(), input.locale(), input.expiresAt(), input.allowProviderRegistration(), actorUserId,
            multiKioskId, companyId
        );
        replaceComposition(multiKioskId, composition);
        revokeSessions(multiKioskId);
        var toolCount = compositionMetadata(companyId, composition).stream()
            .filter(CompositionItem::nativeTool).count();
        audit(companyId, multiKioskId, "MULTI_KIOSK_UPDATED", "USER", actorUserId,
            Map.of("kiosk_count", composition.size(), "tool_count", toolCount));
        return detail(companyId, multiKioskId);
    }

    @Transactional
    public Map<String, Object> rotateLink(long companyId, long multiKioskId, long actorUserId) {
        var current = requireAdminDefinition(companyId, multiKioskId, true);
        if ("REVOKED".equals(current.status())) {
            throw new IllegalStateException("Multi-kiosk is revoked.");
        }
        var token = randomToken();
        var updated = jdbcTemplate.update(
            """
                UPDATE multi_kiosk_definitions
                SET public_token_hash = ?, public_token_hint = ?, protected_public_token = ?,
                    configuration_version = configuration_version + 1,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ? AND status IN ('ACTIVE', 'DISABLED')
                """,
            sha256(token), tokenHint(token), protection.protect(token), actorUserId,
            multiKioskId, companyId
        );
        if (updated != 1) throw new KioskUnavailableException();
        revokeSessions(multiKioskId);
        audit(companyId, multiKioskId, "MULTI_KIOSK_LINK_ROTATED", "USER", actorUserId, Map.of());
        return detail(companyId, multiKioskId);
    }

    @Transactional
    public Map<String, Object> transition(
            long companyId, long multiKioskId, long actorUserId, String targetStatus) {
        var normalized = targetStatus == null ? "" : targetStatus.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("ACTIVE", "DISABLED", "REVOKED").contains(normalized)) {
            throw new IllegalArgumentException("Unsupported multi-kiosk status.");
        }
        var current = requireAdminDefinition(companyId, multiKioskId, true);
        if ("REVOKED".equals(current.status())) throw new IllegalStateException("Multi-kiosk is revoked.");
        if ("ACTIVE".equals(normalized) && !"DISABLED".equals(current.status())) {
            throw new IllegalStateException("Only a disabled multi-kiosk can be enabled.");
        }
        jdbcTemplate.update(
            "UPDATE multi_kiosk_definitions SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
            normalized, actorUserId, multiKioskId, companyId
        );
        if (!"ACTIVE".equals(normalized)) revokeSessions(multiKioskId);
        audit(companyId, multiKioskId, "MULTI_KIOSK_" + normalized, "USER", actorUserId, Map.of());
        return detail(companyId, multiKioskId);
    }

    public Map<String, Object> bootstrap(String publicToken) {
        var definition = resolve(publicToken, true);
        return Map.of(
            "name", definition.name(),
            "description", definition.description() == null ? "" : definition.description(),
            "company_name", companyName(definition.companyId()),
            "theme_key", definition.themeKey(),
            "locale", definition.locale(),
            "audience_type", definition.audienceType(),
            "allow_provider_registration", definition.allowProviderRegistration(),
            "access_methods", List.of("PIN")
        );
    }

    @Transactional
    public Map<String, Object> registerProvider(
            String publicToken, Map<String, Object> payload, String networkSignal) {
        var definition = resolve(publicToken, true);
        if (!"PROVIDER".equals(definition.audienceType())
                || !definition.allowProviderRegistration()) {
            throw new KioskUnavailableException();
        }
        rateLimits.requireProviderRegistrationAllowed(
            definition.companyId(), definition.id(), networkSignal);
        var name = requiredText(payload, "name", 2, 180);
        var legalName = optionalText(payload, "legal_name", 220);
        var taxId = optionalText(payload, "tax_id", 80);
        var email = requiredText(payload, "email", 5, 180).toLowerCase(Locale.ROOT);
        var phone = optionalText(payload, "phone", 60);
        var contactName = requiredText(payload, "contact_name", 2, 180);
        var notes = optionalText(payload, "notes", 4000);
        if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("El correo del contacto no es válido.");
        }
        // The legacy provider tables do not have a normalized identity uniqueness key.
        // Serialize registration checks with internal approvals so concurrent requests cannot
        // create two pending identities for the same company/name, email or tax identifier.
        lockCompany(definition.companyId());
        var existing = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM (
                    SELECT provider.id
                      FROM finance_providers provider
                     WHERE provider.company_id = ? AND provider.deleted_at IS NULL
                       AND (LOWER(TRIM(provider.name)) = LOWER(TRIM(?))
                         OR LOWER(provider.email) = LOWER(?)
                         OR (? IS NOT NULL AND provider.tax_id = ?))
                    UNION ALL
                    SELECT request.id
                      FROM provider_registration_requests request
                     WHERE request.company_id = ? AND request.status IN ('SUBMITTED', 'IN_REVIEW', 'APPROVED')
                       AND (LOWER(TRIM(request.name)) = LOWER(TRIM(?))
                         OR LOWER(request.email) = LOWER(?)
                         OR (? IS NOT NULL AND request.tax_id = ?))
                ) duplicate_candidate
                """,
            Integer.class,
            definition.companyId(), name, email, nullable(taxId), nullable(taxId),
            definition.companyId(), name, email, nullable(taxId), nullable(taxId));
        Long requestId = null;
        if (existing == null || existing == 0) {
            var keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO provider_registration_requests (
                            company_id, name, legal_name, tax_id, email, phone,
                            contact_name, notes, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
                        """,
                    Statement.RETURN_GENERATED_KEYS);
                statement.setLong(1, definition.companyId());
                statement.setString(2, name);
                statement.setString(3, nullableString(legalName));
                statement.setString(4, nullableString(taxId));
                statement.setString(5, email);
                statement.setString(6, nullableString(phone));
                statement.setString(7, contactName);
                statement.setString(8, nullableString(notes));
                return statement;
            }, keyHolder);
            requestId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        }
        audit(definition.companyId(), definition.id(), "PROVIDER_REGISTRATION_SUBMITTED",
            "ANONYMOUS", null, Map.of("created", requestId != null));
        return Map.of(
            "status", "SUBMITTED",
            "message", "Recibimos tu solicitud. La empresa revisará tus datos antes de activar el acceso.");
    }

    @Transactional
    public Map<String, Object> authenticate(
            String publicToken, String pin, String browserReference, String networkSignal) {
        return authenticate(publicToken, null, pin, browserReference, networkSignal);
    }

    @Transactional
    public Map<String, Object> authenticate(
            String publicToken,
            String providerName,
            String pin,
            String browserReference,
            String networkSignal) {
        var definition = resolve(publicToken, true);
        rateLimits.requireMultiKioskPinAllowed(definition.companyId(), definition.id(), networkSignal);
        if ("PROVIDER".equals(definition.audienceType())) {
            return authenticateProvider(definition, providerName, pin, browserReference, networkSignal);
        }
        if (pin == null || !pin.trim().matches("^[0-9]{4,12}$")) {
            audit(definition.companyId(), definition.id(), "MULTI_KIOSK_PIN_FAILED", "ANONYMOUS", null, Map.of());
            throw new SecurityException("Invalid personal PIN.");
        }
        var matchesByMembership = new LinkedHashMap<Long, IdentityCandidate>();
        for (var candidate : identityCandidates(definition)) {
            if (passwordEncoder.matches(pin.trim(), candidate.secretHash())) {
                // EMPLOYEE and USER compatibility credentials may both point to the same
                // membership. They represent one person, not an ambiguous PIN collision.
                matchesByMembership.putIfAbsent(candidate.userCompanyId(), candidate);
            }
        }
        if (matchesByMembership.size() != 1) {
            audit(definition.companyId(), definition.id(), "MULTI_KIOSK_PIN_FAILED", "ANONYMOUS", null, Map.of());
            throw new SecurityException("Invalid personal PIN.");
        }
        var identity = matchesByMembership.values().iterator().next();
        rateLimits.releaseSuccessfulMultiKioskPinAttempt(
            definition.companyId(), definition.id(), networkSignal);
        var rawToken = randomToken();
        var sessionId = UUID.randomUUID().toString();
        var expiresAt = Instant.now().plus(absoluteLifetime);
        jdbcTemplate.update(
            """
                INSERT INTO multi_kiosk_sessions (
                    session_id, multi_kiosk_id, company_id, user_id, user_company_id,
                    access_token_hash, browser_session_hash, verified_factors_json, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, JSON_ARRAY('PIN'), ?)
                """,
            sessionId, definition.id(), definition.companyId(), identity.userId(),
            identity.userCompanyId(), sha256(rawToken), sha256(browserReference),
            Timestamp.from(expiresAt)
        );
        audit(definition.companyId(), definition.id(), "MULTI_KIOSK_SESSION_CREATED",
            "EMPLOYEE", identity.userCompanyId(), Map.of("session_id", sessionId));
        var result = new LinkedHashMap<String, Object>();
        result.put("session_id", sessionId);
        result.put("session_token", rawToken);
        result.put("expires_at", expiresAt.toString());
        result.put("employee", Map.of("name", identity.name()));
        result.put("multi_kiosk", publicView(definition));
        result.put("kiosks", effectiveCards(definition.id(), identity.asUser()));
        return Map.copyOf(result);
    }

    private Map<String, Object> authenticateProvider(
            MultiDefinition definition,
            String providerName,
            String pin,
            String browserReference,
            String networkSignal) {
        var normalizedName = string(providerName);
        if (normalizedName.length() < 2 || normalizedName.length() > 180
                || pin == null || !pin.trim().matches("^[0-9]{6}$")) {
            providerAuthenticationFailed(definition);
        }
        var candidates = providerIdentityCandidates(definition, normalizedName);
        if (candidates.isEmpty()) {
            // Preserve roughly the same BCrypt work for an unknown supplier name so the
            // public login does not become a practical supplier-name enumeration oracle.
            passwordEncoder.matches(pin.trim(), DUMMY_PROVIDER_SECRET_HASH);
            providerAuthenticationFailed(definition);
        }
        var matches = candidates.stream()
            .filter(candidate -> passwordEncoder.matches(pin.trim(), candidate.secretHash()))
            .toList();
        if (matches.size() != 1) providerAuthenticationFailed(definition);
        var identity = matches.getFirst();
        var cards = providerCards(definition, identity.providerId());
        if (cards.isEmpty()) providerAuthenticationFailed(definition);
        rateLimits.releaseSuccessfulMultiKioskPinAttempt(
            definition.companyId(), definition.id(), networkSignal);
        var rawToken = randomToken();
        var sessionId = UUID.randomUUID().toString();
        var expiresAt = Instant.now().plus(absoluteLifetime);
        jdbcTemplate.update(
            """
                INSERT INTO multi_kiosk_sessions (
                    session_id, multi_kiosk_id, company_id, identity_type, identity_id,
                    user_id, user_company_id, access_token_hash, browser_session_hash,
                    verified_factors_json, expires_at
                ) VALUES (?, ?, ?, 'PROVIDER', ?, NULL, NULL, ?, ?, JSON_ARRAY('PIN'), ?)
                """,
            sessionId, definition.id(), definition.companyId(), identity.providerId(),
            sha256(rawToken), sha256(browserReference), Timestamp.from(expiresAt));
        audit(definition.companyId(), definition.id(), "PROVIDER_CENTER_SESSION_CREATED",
            "PROVIDER", identity.providerId(), Map.of("session_id", sessionId));
        var result = new LinkedHashMap<String, Object>();
        result.put("session_id", sessionId);
        result.put("session_token", rawToken);
        result.put("expires_at", expiresAt.toString());
        result.put("identity", Map.of(
            "type", "PROVIDER", "id", identity.providerId(), "name", identity.name()));
        result.put("provider", Map.of("id", identity.providerId(), "name", identity.name()));
        result.put("multi_kiosk", publicView(definition));
        result.put("kiosks", cards);
        return Map.copyOf(result);
    }

    private void providerAuthenticationFailed(MultiDefinition definition) {
        audit(definition.companyId(), definition.id(), "PROVIDER_CENTER_PIN_FAILED",
            "ANONYMOUS", null, Map.of());
        throw new SecurityException("Nombre de proveedor o NIP incorrecto.");
    }

    @Transactional
    public Map<String, Object> session(
            String publicToken, String sessionToken, String browserReference) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, sessionToken, browserReference);
        var result = new LinkedHashMap<String, Object>();
        result.put("identity", Map.of(
            "type", session.identityType(), "id", session.identityId(), "name", session.name()));
        if (session.provider()) {
            result.put("provider", Map.of("id", session.identityId(), "name", session.name()));
            result.put("kiosks", providerCards(definition, session.identityId()));
        } else {
            result.put("employee", Map.of("name", session.name()));
            result.put("kiosks", effectiveCards(definition.id(), session.asUser()));
        }
        result.put("multi_kiosk", publicView(definition));
        result.put("expires_at", session.expiresAt().toString());
        return Map.copyOf(result);
    }

    /**
     * Closes only the supplied browser-bound parent session and its safely correlated child
     * sessions. The parent row remains resolvable after revocation so retries are idempotent.
     */
    @Transactional
    public Map<String, Object> logout(
            String publicToken, String sessionToken, String browserReference) {
        var definition = resolve(publicToken, false);
        if (sessionToken == null || sessionToken.isBlank()
                || browserReference == null || browserReference.isBlank()) {
            throw new SecurityException("Session required.");
        }
        var accessTokenHash = sha256(sessionToken.trim());
        var browserHash = sha256(browserReference.trim());
        var rows = jdbcTemplate.query(
            """
                SELECT session_id, identity_type, identity_id, user_id, user_company_id
                FROM multi_kiosk_sessions
                WHERE multi_kiosk_id = ? AND company_id = ?
                  AND access_token_hash = ? AND browser_session_hash = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new LogoutSession(
                rs.getString("session_id"), normalizeAudience(rs.getString("identity_type")),
                rs.getLong("identity_id"), rs.getLong("user_id"),
                rs.getLong("user_company_id")),
            definition.id(), definition.companyId(), accessTokenHash, browserHash
        );
        if (rows.isEmpty()) throw new SecurityException("Session required.");
        var current = rows.getFirst();
        var parentRevoked = jdbcTemplate.update(
            """
                UPDATE multi_kiosk_sessions
                SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                WHERE session_id = ? AND multi_kiosk_id = ? AND company_id = ?
                  AND access_token_hash = ? AND browser_session_hash = ?
                  AND revoked_at IS NULL
                """,
            current.sessionId(), definition.id(), definition.companyId(),
            accessTokenHash, browserHash
        );
        var providerSession = "PROVIDER".equals(current.identityType())
            || "PROVIDER".equals(definition.audienceType());
        var childSessionsRevoked = providerSession
            ? jdbcTemplate.update(
                """
                    UPDATE kiosk_sessions child
                    SET child.revoked_at = COALESCE(child.revoked_at, CURRENT_TIMESTAMP)
                    WHERE child.company_id = ?
                      AND child.channel = 'PROVIDER_MULTI_KIOSK'
                      AND child.identity_type = 'PROVIDER' AND child.identity_id = ?
                      AND child.browser_session_hash = ?
                      AND JSON_UNQUOTE(JSON_EXTRACT(
                            child.scope_snapshot_json, '$.multi_kiosk_id')) = CAST(? AS CHAR)
                      AND child.revoked_at IS NULL
                    """,
                definition.companyId(), current.identityId(), browserHash, definition.id())
            : jdbcTemplate.update(
                """
                    UPDATE kiosk_sessions child
                    SET child.revoked_at = COALESCE(child.revoked_at, CURRENT_TIMESTAMP)
                    WHERE child.company_id = ?
                      AND child.channel = 'MOBILE_MULTI_KIOSK'
                      AND child.identity_type = 'USER' AND child.identity_id = ?
                      AND child.browser_session_hash = ?
                      AND JSON_UNQUOTE(JSON_EXTRACT(
                            child.scope_snapshot_json, '$.multi_kiosk_id')) = CAST(? AS CHAR)
                      AND JSON_UNQUOTE(JSON_EXTRACT(
                            child.scope_snapshot_json, '$.user_company_id')) = CAST(? AS CHAR)
                      AND child.revoked_at IS NULL
                    """,
                definition.companyId(), current.userId(), browserHash,
                definition.id(), current.userCompanyId());
        if (parentRevoked > 0 || childSessionsRevoked > 0) {
            audit(definition.companyId(), definition.id(), "MULTI_KIOSK_SESSION_CLOSED",
                providerSession ? "PROVIDER" : "EMPLOYEE",
                providerSession ? current.identityId() : current.userCompanyId(), Map.of(
                    "session_id", current.sessionId(),
                    "child_sessions_revoked", childSessionsRevoked,
                    "reason", providerSession ? "PROVIDER_LOGOUT" : "EMPLOYEE_LOGOUT"
                ));
        }
        return Map.of("signed_out", true);
    }

    public Map<String, Object> launchChild(
            String publicToken, String multiSessionToken, long kioskId, String browserReference) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, multiSessionToken, browserReference);
        if (session.provider()) {
            return requireProviderDashboard().createSession(
                definition.companyId(), definition.id(), session.identityId(),
                kioskId, browserReference);
        }
        return dashboard.createMobileSession(
            session.asUser(), definition.id(), kioskId, browserReference);
    }

    public Map<String, Object> childWorkspace(
            String publicToken, String multiSessionToken, String childSessionToken,
            long kioskId, String browserReference) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, multiSessionToken, browserReference);
        if (session.provider()) {
            return requireProviderDashboard().workspace(
                definition.companyId(), definition.id(), session.identityId(), kioskId,
                childSessionToken, browserReference);
        }
        return dashboard.mobileWorkspace(
            session.asUser(), definition.id(), kioskId, childSessionToken, browserReference);
    }

    public KioskDispatchResult childAction(
            String publicToken, String multiSessionToken, String childSessionToken,
            long kioskId, String capability, String browserReference,
            Map<String, Object> payload, String idempotencyKey) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, multiSessionToken, browserReference);
        if (session.provider()) {
            return requireProviderDashboard().executeAction(
                definition.companyId(), definition.id(), session.identityId(), kioskId,
                capability, childSessionToken, browserReference, payload, idempotencyKey);
        }
        return dashboard.executeMobileAction(
            session.asUser(), definition.id(), kioskId, capability, childSessionToken,
            browserReference, payload, idempotencyKey);
    }

    private MultiInput normalizeInput(long companyId, Map<String, Object> payload) {
        if (payload == null) throw new IllegalArgumentException("Multi-kiosk data is required.");
        var name = string(payload.get("name"));
        if (name.length() < 3 || name.length() > 140) {
            throw new IllegalArgumentException("Multi-kiosk name must contain 3 to 140 characters.");
        }
        var description = string(payload.get("description"));
        if (description.length() > 500) throw new IllegalArgumentException("Description is too long.");
        var theme = string(payload.get("theme_key"));
        if (theme.isBlank()) theme = "indice-blue";
        if (!Set.of("indice-blue", "indice-green", "indice-yellow", "indice-coral").contains(theme)) {
            throw new IllegalArgumentException("Unsupported multi-kiosk theme.");
        }
        var locale = string(payload.get("default_locale"));
        if (locale.isBlank()) locale = "es-MX";
        var audienceType = string(payload.get("audience_type")).toUpperCase(Locale.ROOT);
        if (audienceType.isBlank()) audienceType = "EMPLOYEE";
        if (!Set.of("EMPLOYEE", "PROVIDER").contains(audienceType)) {
            throw new IllegalArgumentException("Unsupported Multi-kiosk audience.");
        }
        var allowProviderRegistration = "PROVIDER".equals(audienceType)
            && booleanValue(payload.get("allow_provider_registration"));
        var toolKeysSpecified = payload.containsKey("tool_keys");
        var toolKeys = "PROVIDER".equals(audienceType)
            ? requireProviderTools().requiredToolKeys()
            : toolKeysSpecified
                ? employeeTools.normalizeToolKeys(payload.get("tool_keys"))
                : List.<String>of();
        if ("PROVIDER".equals(audienceType)) toolKeysSpecified = true;
        if ("PROVIDER".equals(audienceType)) {
            requireProviderTools().requireAvailable(companyId, toolKeys);
        } else {
            employeeTools.requireAvailable(companyId, toolKeys);
        }
        var legacyField = payload.containsKey("legacy_kiosk_definition_ids")
            ? "legacy_kiosk_definition_ids"
            : payload.containsKey("kiosk_definition_ids") ? "kiosk_definition_ids" : null;
        var legacySpecified = legacyField != null;
        var legacyIds = legacySpecified
            ? idList(payload.get(legacyField), legacyField, 24)
            : List.<Long>of();
        if ("PROVIDER".equals(audienceType) && !legacyIds.isEmpty()) {
            throw new IllegalArgumentException("Provider Centers accept only native provider tools.");
        }
        if (!toolKeysSpecified && !legacySpecified) {
            throw new IllegalArgumentException("tool_keys is required.");
        }
        Timestamp expiresAt = null;
        var expiresText = string(payload.get("expires_at"));
        if (!expiresText.isBlank()) {
            try {
                var instant = Instant.parse(expiresText);
                if (!instant.isAfter(Instant.now())) throw new IllegalArgumentException("Expiration must be in the future.");
                expiresAt = Timestamp.from(instant);
            } catch (java.time.format.DateTimeParseException failure) {
                throw new IllegalArgumentException("Expiration is invalid.");
            }
        }
        // A Multi-kiosk is a company launcher. Organizational authority belongs to each
        // child definition and the authenticated membership, never to the parent launcher.
        return new MultiInput(name, description, theme, locale, audienceType,
            allowProviderRegistration, null, null,
            toolKeys, toolKeysSpecified, legacyIds, legacySpecified, expiresAt);
    }

    private List<Long> resolveComposition(
            long companyId,
            long actorUserId,
            MultiInput input,
            List<Long> existingIds) {
        if (!input.toolKeysSpecified() && !input.legacyIdsSpecified()) {
            if (existingIds.isEmpty()) {
                throw new IllegalArgumentException("Select at least one employee tool.");
            }
            return existingIds;
        }
        var existing = compositionMetadata(companyId, existingIds);
        var existingContextualIds = existing.stream()
            .filter(item -> !item.nativeTool())
            .map(CompositionItem::id)
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
        if (input.legacyIdsSpecified()) {
            validateChildren(companyId, input.legacyIds(), existingContextualIds);
        }
        var toolIds = input.toolKeysSpecified()
            ? "PROVIDER".equals(input.audienceType())
                ? requireProviderTools().provisionDefinitions(companyId, actorUserId, input.toolKeys())
                : employeeTools.provisionDefinitions(companyId, actorUserId, input.toolKeys())
            : existing.stream().filter(CompositionItem::nativeTool).map(CompositionItem::id).toList();
        var legacyIds = input.legacyIdsSpecified()
            ? input.legacyIds()
            : existing.stream().filter(item -> !item.nativeTool()).map(CompositionItem::id).toList();
        var merged = new LinkedHashSet<Long>();
        merged.addAll(toolIds);
        merged.addAll(legacyIds);
        if (merged.isEmpty()) {
            throw new IllegalArgumentException("Select at least one tool.");
        }
        if (merged.size() > 24) {
            throw new IllegalArgumentException("Multi-kiosk composition contains too many items.");
        }
        return List.copyOf(merged);
    }

    private void validateChildren(
            long companyId,
            List<Long> kioskIds,
            Set<Long> existingContextualIds) {
        var catalog = dashboard.contextualCatalog(companyId);
        var byId = new LinkedHashMap<Long, Map<String, Object>>();
        catalog.forEach(row -> byId.put(((Number) row.get("id")).longValue(), row));
        for (var id : kioskIds) {
            // Existing unavailable children may be preserved during an unrelated edit, but an
            // administrator can never add an unavailable definition to a composition.
            if (!byId.containsKey(id) && !existingContextualIds.contains(id)) {
                throw new IllegalArgumentException("One or more kiosks are unavailable.");
            }
        }
    }

    private void replaceComposition(long multiKioskId, List<Long> kioskIds) {
        jdbcTemplate.update("DELETE FROM multi_kiosk_items WHERE multi_kiosk_id = ?", multiKioskId);
        for (var index = 0; index < kioskIds.size(); index++) {
            jdbcTemplate.update(
                "INSERT INTO multi_kiosk_items (multi_kiosk_id, kiosk_definition_id, sort_order) VALUES (?, ?, ?)",
                multiKioskId, kioskIds.get(index), index
            );
        }
    }

    private List<Long> compositionIds(long multiKioskId) {
        return jdbcTemplate.query(
            """
                SELECT kiosk_definition_id
                FROM multi_kiosk_items
                WHERE multi_kiosk_id = ?
                ORDER BY sort_order, kiosk_definition_id
                """,
            (rs, rowNum) -> rs.getLong("kiosk_definition_id"),
            multiKioskId
        );
    }

    private List<CompositionItem> compositionMetadata(long companyId, List<Long> definitionIds) {
        var result = new java.util.ArrayList<CompositionItem>();
        for (var definitionId : definitionIds) {
            var rows = jdbcTemplate.query(
                """
                    SELECT id, owner_module, kiosk_type, legacy_reference_id, code
                    FROM kiosk_definitions
                    WHERE id = ? AND company_id = ?
                    LIMIT 1
                    """,
                (rs, rowNum) -> new CompositionItem(
                    rs.getLong("id"),
                    employeeTools.manifestForCode(
                        rs.getString("owner_module"), rs.getString("kiosk_type"),
                        rs.getString("code"), rs.getObject("legacy_reference_id", Long.class))
                        .isPresent()
                        || (providerTools != null && providerTools.manifestForCode(
                            rs.getString("owner_module"), rs.getString("kiosk_type"),
                            rs.getString("code"), rs.getObject("legacy_reference_id", Long.class))
                            .isPresent())),
                definitionId, companyId
            );
            if (rows.isEmpty()) {
                throw new KioskUnavailableException();
            }
            result.add(rows.getFirst());
        }
        return List.copyOf(result);
    }

    private List<Map<String, Object>> items(long multiKioskId) {
        return jdbcTemplate.query(
            """
                SELECT definition.id, definition.name, definition.owner_module,
                       definition.kiosk_type, definition.legacy_reference_id, definition.code,
                       definition.unit_id, definition.business_id,
                       item.sort_order
                FROM multi_kiosk_items item
                INNER JOIN kiosk_definitions definition ON definition.id = item.kiosk_definition_id
                WHERE item.multi_kiosk_id = ?
                ORDER BY item.sort_order, definition.id
                """,
            (rs, rowNum) -> {
                var tool = employeeTools.manifestForCode(
                    rs.getString("owner_module"), rs.getString("kiosk_type"),
                    rs.getString("code"), rs.getObject("legacy_reference_id", Long.class));
                if (tool.isPresent()) {
                    return employeeTools.detailRow(
                        tool.get(), rs.getLong("id"), rs.getInt("sort_order"));
                }
                if (providerTools != null) {
                    var providerTool = providerTools.manifestForCode(
                        rs.getString("owner_module"), rs.getString("kiosk_type"),
                        rs.getString("code"), rs.getObject("legacy_reference_id", Long.class));
                    if (providerTool.isPresent()) {
                        return providerTools.detailRow(
                            providerTool.get(), rs.getLong("id"), rs.getInt("sort_order"));
                    }
                }
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("owner_module", rs.getString("owner_module"));
                row.put("module_slug", KioskEmployeeAccessService.moduleSlug(
                    rs.getString("owner_module")));
                row.put("kiosk_type", rs.getString("kiosk_type"));
                row.put("sort_order", rs.getInt("sort_order"));
                return Collections.unmodifiableMap(row);
            },
            multiKioskId
        );
    }

    private Map<String, Object> adminRow(ResultSet rs, int rowNum) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("code", rs.getString("code"));
        row.put("name", rs.getString("name"));
        row.put("description", rs.getString("description"));
        var audience = normalizeAudience(rs.getString("audience_type"));
        row.put("audience_type", audience);
        row.put("allow_provider_registration", rs.getBoolean("allow_provider_registration"));
        row.put("status", effectiveStatus(rs.getString("status"), rs.getTimestamp("expires_at")));
        row.put("unit_id", rs.getObject("unit_id", Long.class));
        row.put("unit_name", rs.getString("unit_name"));
        row.put("business_id", rs.getObject("business_id", Long.class));
        row.put("business_name", rs.getString("business_name"));
        row.put("theme_key", rs.getString("theme_key"));
        row.put("default_locale", rs.getString("default_locale"));
        row.put("expires_at", instant(rs.getTimestamp("expires_at")));
        row.put("public_token_hint", rs.getString("public_token_hint"));
        row.put("configuration_version", rs.getInt("configuration_version"));
        row.put("kiosk_count", rs.getInt("kiosk_count"));
        row.put("tool_count", rs.getInt("tool_count"));
        var eligibleMemberCount = "PROVIDER".equals(audience)
            ? rs.getInt("eligible_provider_count") : rs.getInt("eligible_member_count");
        row.put("access_population", "PROVIDER".equals(audience)
            ? "PROVIDER_NAME_PIN" : "COMPANY_PIN");
        row.put("eligible_member_count", eligibleMemberCount);
        // Backward-compatible alias for clients that still render this count.
        row.put("employee_count", eligibleMemberCount);
        row.put("updated_at", instant(rs.getTimestamp("updated_at")));
        try {
            row.put("access_path", "/multi-kiosk/" + protection.reveal(rs.getString("protected_public_token")));
        } catch (RuntimeException failure) {
            row.put("access_path", null);
        }
        return Collections.unmodifiableMap(row);
    }

    private MultiDefinition resolve(String publicToken, boolean requireActive) {
        if (publicToken == null || publicToken.isBlank()) throw new KioskUnavailableException();
        var rows = jdbcTemplate.query(
            """
                SELECT id, company_id, name, description, audience_type,
                       allow_provider_registration, status, unit_id, business_id,
                       theme_key, default_locale, expires_at
                FROM multi_kiosk_definitions
                WHERE public_token_hash = ? LIMIT 1
                """,
            (rs, rowNum) -> new MultiDefinition(
                rs.getLong("id"), rs.getLong("company_id"), rs.getString("name"),
                rs.getString("description"), normalizeAudience(rs.getString("audience_type")),
                rs.getBoolean("allow_provider_registration"), rs.getString("status"),
                rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class),
                rs.getString("theme_key"), rs.getString("default_locale"),
                instantValue(rs.getTimestamp("expires_at"))),
            sha256(publicToken.trim())
        );
        if (rows.isEmpty()) throw new KioskUnavailableException();
        var definition = rows.getFirst();
        if (requireActive && (!"ACTIVE".equals(definition.status())
                || (definition.expiresAt() != null && !definition.expiresAt().isAfter(Instant.now())))) {
            throw new KioskUnavailableException();
        }
        return definition;
    }

    private AdminDefinition requireAdminDefinition(long companyId, long id, boolean allowDisabled) {
        var rows = jdbcTemplate.query(
            "SELECT status FROM multi_kiosk_definitions WHERE id = ? AND company_id = ? LIMIT 1",
            (rs, rowNum) -> new AdminDefinition(rs.getString("status")), id, companyId);
        if (rows.isEmpty()) throw new KioskUnavailableException();
        var result = rows.getFirst();
        if ("DELETED".equals(result.status()) || (!allowDisabled && "REVOKED".equals(result.status()))) {
            throw new KioskUnavailableException();
        }
        return result;
    }

    private String definitionAudience(long companyId, long id) {
        var value = jdbcTemplate.queryForObject(
            "SELECT audience_type FROM multi_kiosk_definitions WHERE id = ? AND company_id = ?",
            String.class, id, companyId);
        return normalizeAudience(value);
    }

    private MultiSession requireSession(
            MultiDefinition definition, String sessionToken, String browserReference) {
        if (sessionToken == null || sessionToken.isBlank()) throw new SecurityException("Session required.");
        if ("PROVIDER".equals(definition.audienceType())) {
            return requireProviderSession(definition, sessionToken, browserReference);
        }
        var rows = jdbcTemplate.query(
            """
                SELECT session.session_id, session.user_id, session.user_company_id,
                       COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email) AS name,
                       COALESCE(membership.role, 'user') AS role,
                       GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, session.expires_at)) AS expires_in
                FROM multi_kiosk_sessions session
                INNER JOIN user_companies membership ON membership.id = session.user_company_id
                  AND membership.company_id = session.company_id
                INNER JOIN users user
                  ON user.id = session.user_id AND user.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                WHERE session.multi_kiosk_id = ? AND session.company_id = ?
                  AND session.access_token_hash = ? AND session.browser_session_hash = ?
                  AND session.revoked_at IS NULL AND session.expires_at > CURRENT_TIMESTAMP
                  AND session.last_activity_at >= TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP)
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND EXISTS (
                      SELECT 1 FROM kiosk_identity_credentials credential
                       WHERE credential.company_id = session.company_id
                         AND credential.credential_type = 'PIN'
                         AND credential.status = 'ACTIVE'
                         AND credential.secret_hash IS NOT NULL
                         AND credential.secret_hash <> ''
                         AND ((credential.identity_type = 'EMPLOYEE'
                               AND credential.identity_id = membership.id)
                           OR (credential.identity_type = 'USER'
                               AND credential.identity_id = membership.user_id))
                  )
                LIMIT 1
                """,
            (rs, rowNum) -> new MultiSession(
                rs.getString("session_id"), definition.companyId(), rs.getLong("user_id"),
                rs.getLong("user_company_id"), "EMPLOYEE", rs.getLong("user_company_id"),
                rs.getString("name"), rs.getString("role"),
                Instant.now().plusSeconds(rs.getLong("expires_in"))),
            definition.id(), definition.companyId(), sha256(sessionToken.trim()),
            sha256(browserReference), -inactivityTimeout.getSeconds()
        );
        if (rows.isEmpty()) throw new SecurityException("Session required.");
        var result = rows.getFirst();
        jdbcTemplate.update(
            "UPDATE multi_kiosk_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE session_id = ?",
            result.sessionId());
        return result;
    }

    private MultiSession requireProviderSession(
            MultiDefinition definition, String sessionToken, String browserReference) {
        var rows = jdbcTemplate.query(
            """
                SELECT session.session_id, session.identity_id,
                       provider.name,
                       GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, session.expires_at)) AS expires_in
                FROM multi_kiosk_sessions session
                INNER JOIN finance_providers provider
                  ON provider.id = session.identity_id
                 AND provider.company_id = session.company_id
                 AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                WHERE session.multi_kiosk_id = ? AND session.company_id = ?
                  AND session.identity_type = 'PROVIDER'
                  AND session.access_token_hash = ? AND session.browser_session_hash = ?
                  AND session.revoked_at IS NULL AND session.expires_at > CURRENT_TIMESTAMP
                  AND session.last_activity_at >= TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP)
                  AND EXISTS (
                      SELECT 1 FROM kiosk_identity_credentials credential
                       WHERE credential.company_id = session.company_id
                         AND credential.identity_type = 'PROVIDER'
                         AND credential.identity_id = provider.id
                         AND credential.credential_type = 'PIN'
                         AND credential.status = 'ACTIVE'
                         AND credential.secret_hash IS NOT NULL
                         AND credential.secret_hash <> '')
                LIMIT 1
                """,
            (rs, rowNum) -> new MultiSession(
                rs.getString("session_id"), definition.companyId(), null, null,
                "PROVIDER", rs.getLong("identity_id"), rs.getString("name"), "provider",
                Instant.now().plusSeconds(rs.getLong("expires_in"))),
            definition.id(), definition.companyId(), sha256(sessionToken.trim()),
            sha256(browserReference), -inactivityTimeout.getSeconds());
        if (rows.isEmpty()) throw new SecurityException("Session required.");
        var result = rows.getFirst();
        jdbcTemplate.update(
            "UPDATE multi_kiosk_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE session_id = ?",
            result.sessionId());
        return result;
    }

    private List<IdentityCandidate> identityCandidates(MultiDefinition definition) {
        return jdbcTemplate.query(
            """
                SELECT membership.id AS user_company_id, membership.user_id,
                       COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email) AS name,
                       COALESCE(membership.role, 'user') AS role, credential.secret_hash
                FROM user_companies membership
                INNER JOIN users user ON user.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                INNER JOIN kiosk_identity_credentials credential
                  ON credential.company_id = membership.company_id
                 AND credential.credential_type = 'PIN' AND credential.status = 'ACTIVE'
                 AND ((credential.identity_type = 'EMPLOYEE' AND credential.identity_id = membership.id)
                   OR (credential.identity_type = 'USER' AND credential.identity_id = membership.user_id))
                WHERE membership.company_id = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND credential.secret_hash IS NOT NULL AND credential.secret_hash <> ''
                ORDER BY membership.id
            """,
            (rs, rowNum) -> new IdentityCandidate(
                definition.companyId(), rs.getLong("user_id"), rs.getLong("user_company_id"),
                rs.getString("name"), rs.getString("role"), rs.getString("secret_hash")),
            definition.companyId()
        );
    }

    private List<ProviderIdentityCandidate> providerIdentityCandidates(
            MultiDefinition definition, String providerName) {
        return jdbcTemplate.query(
            """
                SELECT provider.id AS provider_id, provider.name, credential.secret_hash
                FROM finance_providers provider
                INNER JOIN kiosk_identity_credentials credential
                  ON credential.company_id = provider.company_id
                 AND credential.identity_type = 'PROVIDER'
                 AND credential.identity_id = provider.id
                 AND credential.credential_type = 'PIN'
                 AND credential.status = 'ACTIVE'
                 AND credential.credential_origin = 'PROVIDER_CENTER_ADMIN'
                WHERE provider.company_id = ?
                  AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                  AND provider.unit_id IS NOT NULL AND provider.business_id IS NOT NULL
                  AND LOWER(TRIM(provider.name)) = LOWER(TRIM(?))
                  AND credential.secret_hash IS NOT NULL AND credential.secret_hash <> ''
                ORDER BY provider.id
                """,
            (rs, rowNum) -> new ProviderIdentityCandidate(
                rs.getLong("provider_id"), rs.getString("name"), rs.getString("secret_hash")),
            definition.companyId(), providerName);
    }

    private List<Map<String, Object>> effectiveCards(long multiKioskId, AuthSessionUser user) {
        return dashboard.listForMultiKiosk(user, multiKioskId);
    }

    private List<Map<String, Object>> providerCards(
            MultiDefinition definition, long providerId) {
        reconcileProviderComposition(definition);
        return requireProviderDashboard().listForMultiKiosk(
            definition.companyId(), definition.id(), providerId);
    }

    private void reconcileProviderComposition(MultiDefinition definition) {
        if (!"PROVIDER".equals(definition.audienceType())) return;
        var actorId = jdbcTemplate.query(
            """
                SELECT COALESCE(updated_by, created_by) AS actor_id
                FROM multi_kiosk_definitions
                WHERE company_id = ? AND id = ? LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("actor_id"),
            definition.companyId(), definition.id()).stream().findFirst()
            .orElseThrow(KioskUnavailableException::new);
        var required = requireProviderTools().provisionDefinitions(
            definition.companyId(), actorId, requireProviderTools().requiredToolKeys());
        if (!compositionIds(definition.id()).equals(required)) {
            replaceComposition(definition.id(), required);
            audit(definition.companyId(), definition.id(),
                "PROVIDER_CENTER_COMPOSITION_RECONCILED", "SYSTEM", null,
                Map.of("tool_count", required.size()));
        }
    }

    private KioskProviderMultiDashboardService requireProviderDashboard() {
        if (providerDashboard == null) {
            throw new KioskUnavailableException();
        }
        return providerDashboard;
    }

    private void revokeSessions(long multiKioskId) {
        jdbcTemplate.update(
            "UPDATE multi_kiosk_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE multi_kiosk_id = ? AND revoked_at IS NULL",
            multiKioskId);
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions child
                SET child.revoked_at = COALESCE(child.revoked_at, CURRENT_TIMESTAMP)
                WHERE child.channel IN ('MOBILE_MULTI_KIOSK', 'PROVIDER_MULTI_KIOSK')
                  AND JSON_UNQUOTE(JSON_EXTRACT(child.scope_snapshot_json, '$.multi_kiosk_id')) = CAST(? AS CHAR)
                  AND child.revoked_at IS NULL
                """,
            multiKioskId);
    }

    private void audit(
            long companyId, Long multiKioskId, String eventType,
            String actorType, Long actorId, Map<String, Object> snapshot) {
        var effectiveSnapshot = new LinkedHashMap<String, Object>();
        if (snapshot != null) effectiveSnapshot.putAll(snapshot);
        var providerEvent = "PROVIDER".equals(actorType)
            || (eventType != null && eventType.startsWith("PROVIDER_"));
        effectiveSnapshot.putIfAbsent(
            "access_population", providerEvent ? "PROVIDER_NAME_PIN" : "COMPANY_PIN");
        var outcome = eventType != null && eventType.endsWith("_FAILED")
            ? "FAILED" : "SUCCEEDED";
        jdbcTemplate.update(
            """
                INSERT INTO multi_kiosk_audit_events (
                    event_id, multi_kiosk_id, historical_multi_kiosk_id, company_id,
                    event_type, outcome, actor_type, actor_id, snapshot_json,
                    retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TIMESTAMPADD(DAY, 365, CURRENT_TIMESTAMP))
                """,
            UUID.randomUUID().toString(), multiKioskId, multiKioskId, companyId,
            eventType, outcome, actorType, actorId, json(effectiveSnapshot)
        );
    }

    private Map<String, Object> publicView(MultiDefinition definition) {
        return Map.of(
            "id", definition.id(), "name", definition.name(),
            "description", definition.description() == null ? "" : definition.description(),
            "company_name", companyName(definition.companyId()),
            "theme_key", definition.themeKey(),
            "audience_type", definition.audienceType()
        );
    }

    private String companyName(long companyId) {
        return jdbcTemplate.query(
            "SELECT name FROM companies WHERE id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("name"), companyId).stream()
            .findFirst().orElse("Indice");
    }

    private void lockCompany(long companyId) {
        var locked = jdbcTemplate.queryForObject(
            "SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, companyId);
        if (locked == null) throw new KioskUnavailableException();
    }

    private List<Long> idList(Object raw, String field, int maximum) {
        if (!(raw instanceof List<?> values)) throw new IllegalArgumentException(field + " must be a list.");
        var result = new LinkedHashSet<Long>();
        for (var value : values) {
            var id = longValue(value);
            if (id == null || id <= 0) throw new IllegalArgumentException(field + " contains an invalid id.");
            result.add(id);
        }
        if (result.size() > maximum) throw new IllegalArgumentException(field + " contains too many items.");
        return List.copyOf(result);
    }

    private String effectiveStatus(String status, Timestamp expiresAt) {
        return "ACTIVE".equals(status) && expiresAt != null && !expiresAt.toInstant().isAfter(Instant.now())
            ? "EXPIRED" : status;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Multi-kiosk audit could not be serialized.", failure);
        }
    }

    private String randomToken() {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String tokenHint(String token) {
        return token.length() <= 8 ? token : token.substring(0, 4) + "…" + token.substring(token.length() - 4);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private String string(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private Long longValue(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        try {
            return value instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException failure) {
            throw new IllegalArgumentException("Numeric id is invalid.");
        }
    }

    private Object nullable(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String nullableString(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String requiredText(
            Map<String, Object> payload, String field, int minimum, int maximum) {
        var value = optionalText(payload, field, maximum);
        if (value.length() < minimum) {
            throw new IllegalArgumentException(field + " is required.");
        }
        return value;
    }

    private String optionalText(Map<String, Object> payload, String field, int maximum) {
        var value = payload == null ? "" : string(payload.get(field));
        if (value.length() > maximum) {
            throw new IllegalArgumentException(field + " is too long.");
        }
        return value;
    }

    private String instant(Timestamp value) {
        return value == null ? null : value.toInstant().toString();
    }

    private Instant instantValue(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }

    private String normalizeAudience(String value) {
        return "PROVIDER".equalsIgnoreCase(value == null ? "" : value.trim())
            ? "PROVIDER" : "EMPLOYEE";
    }

    private boolean booleanValue(Object value) {
        if (value instanceof Boolean flag) return flag;
        if (value instanceof Number number) return number.intValue() != 0;
        return Set.of("true", "1", "yes", "si", "sí").contains(
            value == null ? "" : String.valueOf(value).trim().toLowerCase(Locale.ROOT));
    }

    private KioskProviderToolCatalogService requireProviderTools() {
        if (providerTools == null) throw new IllegalStateException("Provider tools are unavailable.");
        return providerTools;
    }

    private List<String> normalizedTabScopes(String rawScopes) {
        if (rawScopes == null || rawScopes.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(rawScopes.split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .map(value -> {
                var separator = value.indexOf('.');
                if (separator <= 0 || separator == value.length() - 1) {
                    return "";
                }
                return com.indice.erp.access.ModuleSlugNormalizer.normalize(
                    value.substring(0, separator)) + value.substring(separator);
            })
            .filter(value -> !value.isBlank())
            .distinct()
            .sorted()
            .toList();
    }

    private record MultiInput(
        String name, String description, String themeKey, String locale,
        String audienceType, boolean allowProviderRegistration,
        Long unitId, Long businessId,
        List<String> toolKeys, boolean toolKeysSpecified,
        List<Long> legacyIds, boolean legacyIdsSpecified,
        Timestamp expiresAt) {}

    private record CompositionItem(long id, boolean nativeTool) {}

    private record MultiDefinition(
        long id, long companyId, String name, String description, String audienceType,
        boolean allowProviderRegistration, String status,
        Long unitId, Long businessId, String themeKey, String locale, Instant expiresAt) {}

    private record AdminDefinition(String status) {}
    private record IdentityCandidate(
        long companyId, long userId, long userCompanyId, String name, String role,
        String secretHash) {
        AuthSessionUser asUser() {
            return new AuthSessionUser(userId, companyId, userCompanyId, name, role);
        }
    }
    private record ProviderIdentityCandidate(long providerId, String name, String secretHash) {}

    private record MultiSession(
        String sessionId, long companyId, Long userId, Long userCompanyId,
        String identityType, long identityId, String name, String role, Instant expiresAt) {
        AuthSessionUser asUser() {
            if (provider() || userId == null || userCompanyId == null) {
                throw new SecurityException("Employee session required.");
            }
            return new AuthSessionUser(userId, companyId, userCompanyId, name, role);
        }
        boolean provider() { return "PROVIDER".equals(identityType); }
    }
    private record LogoutSession(
        String sessionId, String identityType, long identityId, long userId, long userCompanyId) {}
}
