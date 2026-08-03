package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Administration and mobile access boundary for curated employee multi-kiosks. */
@Service
public class MultiKioskService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Set<String> FULL_MODULE_ROLES = Set.of("root", "superadmin");
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final KioskPayloadProtectionService protection;
    private final KioskEmployeeAccessService employeeAccess;
    private final KioskMultiDashboardService dashboard;
    private final KioskRateLimitService rateLimits;
    private final Duration inactivityTimeout;
    private final Duration absoluteLifetime;

    public MultiKioskService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            BCryptPasswordEncoder passwordEncoder,
            KioskPayloadProtectionService protection,
            KioskEmployeeAccessService employeeAccess,
            KioskMultiDashboardService dashboard,
            KioskRateLimitService rateLimits,
            @Value("${app.kiosk.multi.inactivity-timeout-seconds:28800}") int inactivitySeconds,
            @Value("${app.kiosk.multi.session-ttl-seconds:43200}") int sessionTtlSeconds) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
        this.protection = protection;
        this.employeeAccess = employeeAccess;
        this.dashboard = dashboard;
        this.rateLimits = rateLimits;
        this.inactivityTimeout = Duration.ofSeconds(Math.max(60, inactivitySeconds));
        this.absoluteLifetime = Duration.ofSeconds(Math.max(300, sessionTtlSeconds));
    }

    public List<Map<String, Object>> list(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT definition.*, COALESCE(unit_ref.name, '') AS unit_name,
                       COALESCE(business_ref.name, '') AS business_name,
                       (SELECT COUNT(*) FROM multi_kiosk_items item
                         WHERE item.multi_kiosk_id = definition.id) AS kiosk_count,
                       (SELECT COUNT(*) FROM multi_kiosk_assignments assignment
                         WHERE assignment.multi_kiosk_id = definition.id
                           AND assignment.status = 'ACTIVE') AS employee_count
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
                       (SELECT COUNT(*) FROM multi_kiosk_assignments assignment
                         WHERE assignment.multi_kiosk_id = definition.id
                           AND assignment.status = 'ACTIVE') AS employee_count
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
        result.put("kiosks", items(multiKioskId));
        result.put("employees", assignments(multiKioskId));
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
                row.put("pin_ready", rs.getBoolean("pin_ready"));
                return Collections.unmodifiableMap(row);
            },
            companyId
        );
        return Map.of(
            "kiosks", employeeAccess.catalog(companyId),
            "employees", employees
        );
    }

    @Transactional
    public Map<String, Object> create(long companyId, long actorUserId, Map<String, Object> payload) {
        var input = normalizeInput(companyId, payload);
        var token = randomToken();
        var code = "MK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        jdbcTemplate.update(
            """
                INSERT INTO multi_kiosk_definitions (
                    company_id, code, name, description, status, unit_id, business_id,
                    theme_key, default_locale, expires_at, public_token_hash,
                    public_token_hint, protected_public_token, created_by, updated_by
                ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            companyId, code, input.name(), nullable(input.description()), input.unitId(),
            input.businessId(), input.themeKey(), input.locale(), input.expiresAt(),
            sha256(token), tokenHint(token), protection.protect(token), actorUserId, actorUserId
        );
        var id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (id == null) throw new IllegalStateException("Multi-kiosk could not be created.");
        replaceComposition(id, input.kioskIds());
        replaceAssignments(id, input.employeeIds(), actorUserId);
        audit(companyId, id, "MULTI_KIOSK_CREATED", "USER", actorUserId,
            Map.of("kiosk_count", input.kioskIds().size(), "employee_count", input.employeeIds().size()));
        return detail(companyId, id);
    }

    @Transactional
    public Map<String, Object> update(
            long companyId, long multiKioskId, long actorUserId, Map<String, Object> payload) {
        requireAdminDefinition(companyId, multiKioskId, false);
        var input = normalizeInput(companyId, payload);
        jdbcTemplate.update(
            """
                UPDATE multi_kiosk_definitions
                SET name = ?, description = ?, unit_id = ?, business_id = ?, theme_key = ?,
                    default_locale = ?, expires_at = ?, configuration_version = configuration_version + 1,
                    updated_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ? AND status NOT IN ('REVOKED', 'DELETED')
                """,
            input.name(), nullable(input.description()), input.unitId(), input.businessId(),
            input.themeKey(), input.locale(), input.expiresAt(), actorUserId,
            multiKioskId, companyId
        );
        replaceComposition(multiKioskId, input.kioskIds());
        replaceAssignments(multiKioskId, input.employeeIds(), actorUserId);
        revokeSessions(multiKioskId);
        audit(companyId, multiKioskId, "MULTI_KIOSK_UPDATED", "USER", actorUserId,
            Map.of("kiosk_count", input.kioskIds().size(), "employee_count", input.employeeIds().size()));
        return detail(companyId, multiKioskId);
    }

    @Transactional
    public Map<String, Object> rotateLink(long companyId, long multiKioskId, long actorUserId) {
        requireAdminDefinition(companyId, multiKioskId, true);
        var token = randomToken();
        jdbcTemplate.update(
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
            "scope", scope(definition),
            "access_methods", List.of("PIN")
        );
    }

    @Transactional
    public Map<String, Object> authenticate(
            String publicToken, String pin, String browserReference, String networkSignal) {
        var definition = resolve(publicToken, true);
        rateLimits.requireMultiKioskPinAllowed(definition.companyId(), definition.id(), networkSignal);
        if (pin == null || !pin.trim().matches("^[0-9]{4,12}$")) {
            audit(definition.companyId(), definition.id(), "MULTI_KIOSK_PIN_FAILED", "ANONYMOUS", null, Map.of());
            throw new SecurityException("Invalid personal PIN.");
        }
        var candidates = identityCandidates(definition.id(), definition.companyId());
        var matches = candidates.stream()
            .filter(candidate -> passwordEncoder.matches(pin.trim(), candidate.secretHash()))
            .toList();
        if (matches.size() != 1) {
            audit(definition.companyId(), definition.id(), "MULTI_KIOSK_PIN_FAILED", "ANONYMOUS", null, Map.of());
            throw new SecurityException("Invalid personal PIN.");
        }
        var identity = matches.getFirst();
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

    public Map<String, Object> session(
            String publicToken, String sessionToken, String browserReference) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, sessionToken, browserReference);
        return Map.of(
            "employee", Map.of("name", session.name()),
            "multi_kiosk", publicView(definition),
            "kiosks", effectiveCards(definition.id(), session.asUser()),
            "expires_at", session.expiresAt().toString()
        );
    }

    public Map<String, Object> launchChild(
            String publicToken, String multiSessionToken, long kioskId, String browserReference) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, multiSessionToken, browserReference);
        requireChild(definition.id(), session.asUser(), kioskId);
        return dashboard.createMobileSession(
            session.asUser(), definition.id(), kioskId, browserReference);
    }

    public Map<String, Object> childWorkspace(
            String publicToken, String multiSessionToken, String childSessionToken,
            long kioskId, String browserReference) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, multiSessionToken, browserReference);
        requireChild(definition.id(), session.asUser(), kioskId);
        return dashboard.mobileWorkspace(
            session.asUser(), definition.id(), kioskId, childSessionToken, browserReference);
    }

    public KioskDispatchResult childAction(
            String publicToken, String multiSessionToken, String childSessionToken,
            long kioskId, String capability, String browserReference,
            Map<String, Object> payload, String idempotencyKey) {
        var definition = resolve(publicToken, true);
        var session = requireSession(definition, multiSessionToken, browserReference);
        requireChild(definition.id(), session.asUser(), kioskId);
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
        var unitId = longValue(payload.get("unit_id"));
        var businessId = longValue(payload.get("business_id"));
        validateScope(companyId, unitId, businessId);
        var kioskIds = idList(payload.get("kiosk_definition_ids"), "kiosk_definition_ids", 24);
        var employeeIds = idList(payload.get("employee_ids"), "employee_ids", 250);
        if (kioskIds.isEmpty()) throw new IllegalArgumentException("Select at least one kiosk.");
        if (employeeIds.isEmpty()) throw new IllegalArgumentException("Assign at least one employee.");
        validateChildren(companyId, unitId, businessId, kioskIds);
        validateEmployees(companyId, unitId, businessId, kioskIds, employeeIds);
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
        return new MultiInput(name, description, theme, locale, unitId, businessId,
            kioskIds, employeeIds, expiresAt);
    }

    private void validateScope(long companyId, Long unitId, Long businessId) {
        if (businessId != null && unitId == null) {
            throw new IllegalArgumentException("Business Unit is required when Business is selected.");
        }
        if (unitId != null) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM units WHERE id = ? AND company_id = ?", Integer.class,
                unitId, companyId);
            if (count == null || count == 0) throw new IllegalArgumentException("Unit is unavailable.");
        }
        if (businessId != null) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM businesses WHERE id = ? AND company_id = ? AND unit_id = ?",
                Integer.class, businessId, companyId, unitId);
            if (count == null || count == 0) throw new IllegalArgumentException("Business is unavailable.");
        }
    }

    private void validateChildren(
            long companyId, Long unitId, Long businessId, List<Long> kioskIds) {
        var catalog = employeeAccess.catalog(companyId);
        var byId = new LinkedHashMap<Long, Map<String, Object>>();
        catalog.forEach(row -> byId.put(((Number) row.get("id")).longValue(), row));
        for (var id : kioskIds) {
            var child = byId.get(id);
            if (child == null) throw new IllegalArgumentException("One or more kiosks are unavailable.");
            var childUnit = number(child.get("unit_id"));
            var childBusiness = number(child.get("business_id"));
            if (unitId != null && childUnit != null && !unitId.equals(childUnit)) {
                throw new IllegalArgumentException("A kiosk is outside the multi-kiosk unit.");
            }
            if (businessId != null && childBusiness != null && !businessId.equals(childBusiness)) {
                throw new IllegalArgumentException("A kiosk is outside the multi-kiosk business.");
            }
        }
    }

    private void validateEmployees(
            long companyId, Long unitId, Long businessId,
            List<Long> kioskIds, List<Long> employeeIds) {
        var childModules = jdbcTemplate.query(
            "SELECT id, owner_module, unit_id, business_id FROM kiosk_definitions WHERE company_id = ? AND id IN (" + placeholders(kioskIds.size()) + ")",
            (rs, rowNum) -> new ChildRequirement(
                rs.getLong("id"), KioskEmployeeAccessService.moduleSlug(rs.getString("owner_module")),
                rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class)),
            args(companyId, kioskIds)
        );
        for (var userCompanyId : employeeIds) {
            var memberships = jdbcTemplate.query(
                """
                    SELECT membership.user_id, COALESCE(membership.role, 'user') AS role,
                           work.unit_id, work.business_id,
                           EXISTS(
                             SELECT 1 FROM kiosk_identity_credentials credential
                             WHERE credential.company_id = membership.company_id
                               AND credential.credential_type = 'PIN' AND credential.status = 'ACTIVE'
                               AND credential.secret_hash IS NOT NULL AND credential.secret_hash <> ''
                               AND ((credential.identity_type = 'EMPLOYEE' AND credential.identity_id = membership.id)
                                 OR (credential.identity_type = 'USER' AND credential.identity_id = membership.user_id))
                           ) AS pin_ready
                    FROM user_companies membership
                    LEFT JOIN user_work_profiles work
                      ON work.company_id = membership.company_id
                     AND work.user_company_id = membership.id
                    WHERE membership.id = ? AND membership.company_id = ?
                      AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                    LIMIT 1
                    """,
                (rs, rowNum) -> new EmployeeScope(
                    rs.getLong("user_id"), rs.getString("role"),
                    rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class),
                    rs.getBoolean("pin_ready")),
                userCompanyId, companyId
            );
            if (memberships.isEmpty()) throw new IllegalArgumentException("An employee is unavailable.");
            var membership = memberships.getFirst();
            if (!membership.pinReady()) {
                throw new IllegalArgumentException("Every assigned employee must have an active personal PIN.");
            }
            var modules = FULL_MODULE_ROLES.contains(normalizeRole(membership.role()))
                ? Set.<String>of()
                : Set.copyOf(jdbcTemplate.query(
                    "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ?",
                    (rs, rowNum) -> com.indice.erp.access.ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
                    userCompanyId));
            for (var child : childModules) {
                if (!FULL_MODULE_ROLES.contains(normalizeRole(membership.role()))
                        && !modules.contains(child.moduleSlug())) {
                    throw new IllegalArgumentException("An employee does not have access to every selected module.");
                }
                if (membership.unitId() != null && child.unitId() != null
                        && !membership.unitId().equals(child.unitId())) {
                    throw new IllegalArgumentException("An employee is outside a selected kiosk unit.");
                }
                if (membership.businessId() != null && child.businessId() != null
                        && !membership.businessId().equals(child.businessId())) {
                    throw new IllegalArgumentException("An employee is outside a selected kiosk business.");
                }
            }
            if (unitId != null && membership.unitId() != null && !unitId.equals(membership.unitId())) {
                throw new IllegalArgumentException("An employee is outside the multi-kiosk unit.");
            }
            if (businessId != null && membership.businessId() != null
                    && !businessId.equals(membership.businessId())) {
                throw new IllegalArgumentException("An employee is outside the multi-kiosk business.");
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

    private void replaceAssignments(long multiKioskId, List<Long> employeeIds, long actorUserId) {
        var requested = Set.copyOf(employeeIds);
        jdbcTemplate.update(
            "UPDATE multi_kiosk_assignments SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP WHERE multi_kiosk_id = ? AND user_company_id NOT IN (" + placeholders(employeeIds.size()) + ")",
            args(multiKioskId, employeeIds)
        );
        for (var userCompanyId : requested) {
            jdbcTemplate.update(
                """
                    INSERT INTO multi_kiosk_assignments (
                        multi_kiosk_id, user_company_id, status, granted_by, revoked_at
                    ) VALUES (?, ?, 'ACTIVE', ?, NULL)
                    ON DUPLICATE KEY UPDATE status = 'ACTIVE', granted_by = VALUES(granted_by), revoked_at = NULL
                    """,
                multiKioskId, userCompanyId, actorUserId
            );
        }
    }

    private List<Map<String, Object>> items(long multiKioskId) {
        return jdbcTemplate.query(
            """
                SELECT definition.id, definition.name, definition.owner_module,
                       definition.kiosk_type, definition.unit_id, definition.business_id,
                       item.sort_order
                FROM multi_kiosk_items item
                INNER JOIN kiosk_definitions definition ON definition.id = item.kiosk_definition_id
                WHERE item.multi_kiosk_id = ?
                ORDER BY item.sort_order, definition.id
                """,
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "name", rs.getString("name"),
                "owner_module", rs.getString("owner_module"),
                "module_slug", KioskEmployeeAccessService.moduleSlug(rs.getString("owner_module")),
                "kiosk_type", rs.getString("kiosk_type"),
                "sort_order", rs.getInt("sort_order")
            ),
            multiKioskId
        );
    }

    private List<Map<String, Object>> assignments(long multiKioskId) {
        return jdbcTemplate.query(
            """
                SELECT membership.id AS user_company_id, membership.user_id,
                       COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email) AS name,
                       user.email
                FROM multi_kiosk_assignments assignment
                INNER JOIN user_companies membership ON membership.id = assignment.user_company_id
                INNER JOIN users user ON user.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                WHERE assignment.multi_kiosk_id = ? AND assignment.status = 'ACTIVE'
                ORDER BY name, user.email
                """,
            (rs, rowNum) -> Map.of(
                "user_company_id", rs.getLong("user_company_id"),
                "user_id", rs.getLong("user_id"),
                "name", rs.getString("name"),
                "email", rs.getString("email")
            ),
            multiKioskId
        );
    }

    private Map<String, Object> adminRow(ResultSet rs, int rowNum) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("code", rs.getString("code"));
        row.put("name", rs.getString("name"));
        row.put("description", rs.getString("description"));
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
        row.put("employee_count", rs.getInt("employee_count"));
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
                SELECT id, company_id, name, description, status, unit_id, business_id,
                       theme_key, default_locale, expires_at
                FROM multi_kiosk_definitions
                WHERE public_token_hash = ? LIMIT 1
                """,
            (rs, rowNum) -> new MultiDefinition(
                rs.getLong("id"), rs.getLong("company_id"), rs.getString("name"),
                rs.getString("description"), rs.getString("status"),
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

    private MultiSession requireSession(
            MultiDefinition definition, String sessionToken, String browserReference) {
        if (sessionToken == null || sessionToken.isBlank()) throw new SecurityException("Session required.");
        var rows = jdbcTemplate.query(
            """
                SELECT session.session_id, session.user_id, session.user_company_id,
                       COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email) AS name,
                       COALESCE(membership.role, 'user') AS role,
                       GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, session.expires_at)) AS expires_in
                FROM multi_kiosk_sessions session
                INNER JOIN user_companies membership ON membership.id = session.user_company_id
                  AND membership.company_id = session.company_id
                INNER JOIN users user ON user.id = session.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                INNER JOIN multi_kiosk_assignments assignment
                  ON assignment.multi_kiosk_id = session.multi_kiosk_id
                 AND assignment.user_company_id = session.user_company_id
                 AND assignment.status = 'ACTIVE'
                WHERE session.multi_kiosk_id = ? AND session.company_id = ?
                  AND session.access_token_hash = ? AND session.browser_session_hash = ?
                  AND session.revoked_at IS NULL AND session.expires_at > CURRENT_TIMESTAMP
                  AND session.last_activity_at >= TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP)
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                LIMIT 1
                """,
            (rs, rowNum) -> new MultiSession(
                rs.getString("session_id"), definition.companyId(), rs.getLong("user_id"),
                rs.getLong("user_company_id"), rs.getString("name"), rs.getString("role"),
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

    private List<IdentityCandidate> identityCandidates(long multiKioskId, long companyId) {
        return jdbcTemplate.query(
            """
                SELECT membership.id AS user_company_id, membership.user_id,
                       COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email) AS name,
                       COALESCE(membership.role, 'user') AS role, credential.secret_hash
                FROM multi_kiosk_assignments assignment
                INNER JOIN user_companies membership ON membership.id = assignment.user_company_id
                INNER JOIN users user ON user.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                INNER JOIN kiosk_identity_credentials credential
                  ON credential.company_id = membership.company_id
                 AND credential.credential_type = 'PIN' AND credential.status = 'ACTIVE'
                 AND ((credential.identity_type = 'EMPLOYEE' AND credential.identity_id = membership.id)
                   OR (credential.identity_type = 'USER' AND credential.identity_id = membership.user_id))
                WHERE assignment.multi_kiosk_id = ? AND assignment.status = 'ACTIVE'
                  AND membership.company_id = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND credential.secret_hash IS NOT NULL AND credential.secret_hash <> ''
                ORDER BY membership.id
                LIMIT 250
                """,
            (rs, rowNum) -> new IdentityCandidate(
                companyId, rs.getLong("user_id"), rs.getLong("user_company_id"),
                rs.getString("name"), rs.getString("role"), rs.getString("secret_hash")),
            multiKioskId, companyId
        );
    }

    private List<Map<String, Object>> effectiveCards(long multiKioskId, AuthSessionUser user) {
        var available = dashboard.list(user);
        var byId = new LinkedHashMap<Long, Map<String, Object>>();
        available.forEach(card -> byId.put(((Number) card.get("id")).longValue(), card));
        var orderedIds = jdbcTemplate.query(
            "SELECT kiosk_definition_id FROM multi_kiosk_items WHERE multi_kiosk_id = ? ORDER BY sort_order, kiosk_definition_id",
            (rs, rowNum) -> rs.getLong("kiosk_definition_id"), multiKioskId);
        return orderedIds.stream().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }

    private void requireChild(long multiKioskId, AuthSessionUser user, long kioskId) {
        var available = effectiveCards(multiKioskId, user).stream()
            .anyMatch(card -> ((Number) card.get("id")).longValue() == kioskId);
        if (!available) throw new KioskUnavailableException();
    }

    private void revokeSessions(long multiKioskId) {
        jdbcTemplate.update(
            "UPDATE multi_kiosk_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE multi_kiosk_id = ? AND revoked_at IS NULL",
            multiKioskId);
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions child
                SET child.revoked_at = COALESCE(child.revoked_at, CURRENT_TIMESTAMP)
                WHERE child.channel = 'MOBILE_MULTI_KIOSK'
                  AND JSON_UNQUOTE(JSON_EXTRACT(child.scope_snapshot_json, '$.multi_kiosk_id')) = CAST(? AS CHAR)
                  AND child.revoked_at IS NULL
                """,
            multiKioskId);
    }

    private void audit(
            long companyId, Long multiKioskId, String eventType,
            String actorType, Long actorId, Map<String, Object> snapshot) {
        jdbcTemplate.update(
            """
                INSERT INTO multi_kiosk_audit_events (
                    event_id, multi_kiosk_id, historical_multi_kiosk_id, company_id,
                    event_type, outcome, actor_type, actor_id, snapshot_json,
                    retain_until
                ) VALUES (?, ?, ?, ?, ?, 'SUCCEEDED', ?, ?, ?, TIMESTAMPADD(DAY, 365, CURRENT_TIMESTAMP))
                """,
            UUID.randomUUID().toString(), multiKioskId, multiKioskId, companyId,
            eventType, actorType, actorId, json(snapshot)
        );
    }

    private Map<String, Object> publicView(MultiDefinition definition) {
        return Map.of(
            "id", definition.id(), "name", definition.name(),
            "description", definition.description() == null ? "" : definition.description(),
            "company_name", companyName(definition.companyId()),
            "theme_key", definition.themeKey(), "scope", scope(definition)
        );
    }

    private Map<String, Object> scope(MultiDefinition definition) {
        var result = new LinkedHashMap<String, Object>();
        result.put("unit_id", definition.unitId());
        result.put("business_id", definition.businessId());
        return Collections.unmodifiableMap(result);
    }

    private String companyName(long companyId) {
        return jdbcTemplate.query(
            "SELECT name FROM companies WHERE id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("name"), companyId).stream()
            .findFirst().orElse("Indice");
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

    private Object[] args(long first, List<Long> values) {
        var result = new ArrayList<Object>();
        result.add(first);
        result.addAll(values);
        return result.toArray();
    }

    private String placeholders(int count) {
        if (count <= 0) throw new IllegalArgumentException("At least one item is required.");
        return String.join(",", java.util.Collections.nCopies(count, "?"));
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

    private Long number(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private Object nullable(String value) {
        return value == null || value.isBlank() ? null : value;
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

    private record MultiInput(
        String name, String description, String themeKey, String locale,
        Long unitId, Long businessId, List<Long> kioskIds, List<Long> employeeIds,
        Timestamp expiresAt) {}

    private record MultiDefinition(
        long id, long companyId, String name, String description, String status,
        Long unitId, Long businessId, String themeKey, String locale, Instant expiresAt) {}

    private record AdminDefinition(String status) {}
    private record ChildRequirement(long id, String moduleSlug, Long unitId, Long businessId) {}
    private record EmployeeScope(
        long userId, String role, Long unitId, Long businessId, boolean pinReady) {}

    private record IdentityCandidate(
        long companyId, long userId, long userCompanyId, String name, String role, String secretHash) {
        AuthSessionUser asUser() {
            return new AuthSessionUser(userId, companyId, userCompanyId, name, role);
        }
    }

    private record MultiSession(
        String sessionId, long companyId, long userId, long userCompanyId,
        String name, String role, Instant expiresAt) {
        AuthSessionUser asUser() {
            return new AuthSessionUser(userId, companyId, userCompanyId, name, role);
        }
    }
}
