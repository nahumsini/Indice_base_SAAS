package com.indice.erp.configcenter.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public abstract class ConfigCenterSupport {

    protected static final String CONFIG_CENTER_KEY = "config_center";
    protected static final String HEADQUARTERS_LOCATION_KEY = "headquarters_location";
    protected static final String ADDRESS_KEY = "address";
    protected static final String CORPORATE_OFFICE_UNIT_NAME = "Corporate office";
    protected static final String HEADQUARTERS_UNIT_NAME = "Headquarter";
    protected static final String LEGACY_HEADQUARTERS_UNIT_NAME = "Headquarters";
    protected static final String CORPORATE_OFFICE_BUSINESS_FALLBACK_NAME = "Corporate office";
    protected static final long MAX_PROFILE_AVATAR_SIZE_BYTES = 1024 * 1024;
    protected static final Set<String> PROFILE_AVATAR_CONTENT_TYPES = Collections.unmodifiableSet(
        new LinkedHashSet<>(Arrays.asList("image/jpeg", "image/png", "image/webp"))
    );

    protected final JdbcTemplate jdbcTemplate;
    protected final ObjectMapper objectMapper;
    protected final BCryptPasswordEncoder passwordEncoder;
    protected final ObjectStorageService objectStorageService;
    protected final ObjectStorageProperties objectStorageProperties;

    protected ConfigCenterSupport(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
    }

    protected int resolveCollaborators(long companyId, Integer storedCollaborators) {
        if (storedCollaborators != null && storedCollaborators > 0) {
            return storedCollaborators;
        }

        var totalEmployees = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_users WHERE company_id = ?",
            Integer.class,
            companyId
        );
        return totalEmployees == null ? 0 : totalEmployees;
    }

    protected String value(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value instanceof String string) {
                return string.trim();
            }
        }
        return "";
    }

    protected boolean booleanValue(Map<String, Object> payload, boolean defaultValue, String... keys) {
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }

            var value = payload.get(key);
            if (value instanceof Boolean bool) {
                return bool;
            }
            if (value instanceof Number number) {
                return number.intValue() != 0;
            }

            var text = objectString(value).toLowerCase(Locale.ROOT);
            if ("true".equals(text) || "1".equals(text) || "yes".equals(text)) {
                return true;
            }
            if ("false".equals(text) || "0".equals(text) || "no".equals(text)) {
                return false;
            }
            return defaultValue;
        }
        return defaultValue;
    }

    protected boolean hasAnyKey(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    protected Long parseLong(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }

            var value = payload.get(key);
            if (value instanceof Number number) {
                return number.longValue();
            }

            if (value instanceof String string && !string.isBlank()) {
                try {
                    return Long.parseLong(string.trim());
                } catch (NumberFormatException ex) {
                    throw new IllegalArgumentException(key + " must be a number.");
                }
            }
        }
        return null;
    }

    protected String normalizeProfileAvatarContentType(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(normalized)) {
            normalized = "image/jpeg";
        }

        if (!PROFILE_AVATAR_CONTENT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Profile photos must be JPG, PNG, or WebP images.");
        }
        return normalized;
    }

    protected String buildCurrentUserAvatarObjectKey(long companyId, long userId, String contentType) {
        return currentUserAvatarPrefix(companyId, userId)
            + UUID.randomUUID().toString().replace("-", "")
            + extensionForProfileAvatarContentType(contentType);
    }

    protected String normalizeCurrentUserAvatarObjectKey(long companyId, long userId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return "";
        }

        var normalized = objectKey.trim();
        if (!normalized.startsWith(currentUserAvatarPrefix(companyId, userId))) {
            throw new IllegalArgumentException("avatar_object_key must match the expected profile photo upload prefix.");
        }
        return normalized;
    }

    protected String currentUserAvatarPrefix(long companyId, long userId) {
        return "config-center/user-profiles/" + companyId + "/" + userId + "/avatar/";
    }

    protected String extensionForProfileAvatarContentType(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    protected String loadCurrentUserAvatarObjectKey(long userId) {
        var rows = jdbcTemplate.query(
            "SELECT COALESCE(avatar_object_key, '') AS avatar_object_key FROM user_profiles WHERE user_id = ? LIMIT 1",
            (rs, rowNum) -> safe(rs.getString("avatar_object_key")),
            userId
        );
        return rows.isEmpty() ? "" : rows.get(0);
    }

    protected String signedProfileAvatarUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }

        try {
            return objectStorageService.presignDownload(
                documentsBucket(),
                objectKey,
                objectStorageProperties.getMinio().getPresignExpirySeconds()
            );
        } catch (RuntimeException ex) {
            return null;
        }
    }

    protected void deleteProfileAvatarObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }

        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Profile metadata should stay saved even if the replaced object is already gone.
        }
    }

    protected String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }

    protected List<String> normalizeModuleSlugs(Object rawValue) {
        var result = new LinkedHashSet<String>();
        if (rawValue instanceof List<?> rawList) {
            for (var entry : rawList) {
                var slug = safe(objectString(entry)).trim().toLowerCase(Locale.ROOT);
                if (!slug.isBlank()) {
                    result.add(slug);
                }
            }
        }
        return new ArrayList<>(result);
    }

    protected List<String> parseStoredModuleSlugs(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Collections.emptyList();
        }

        try {
            var node = objectMapper.readTree(rawJson);
            if (!node.isArray()) {
                return Collections.emptyList();
            }

            var result = new LinkedHashSet<String>();
            for (var item : node) {
                var slug = item.asText("").trim().toLowerCase(Locale.ROOT);
                if (!slug.isBlank()) {
                    result.add(slug);
                }
            }
            return new ArrayList<>(result);
        } catch (JsonProcessingException ex) {
            return Collections.emptyList();
        }
    }

    protected void ensureModuleSlugsExist(List<String> moduleSlugs) {
        if (moduleSlugs == null || moduleSlugs.isEmpty()) {
            return;
        }

        var existing = existingModuleSlugs(moduleSlugs);
        if (existing.size() == moduleSlugs.size()) {
            return;
        }

        var missing = new LinkedHashSet<>(moduleSlugs);
        missing.removeAll(existing);
        throw new IllegalArgumentException("Unknown module access: " + String.join(", ", missing));
    }

    protected List<String> existingModuleSlugs(List<String> moduleSlugs) {
        if (moduleSlugs == null || moduleSlugs.isEmpty()) {
            return Collections.emptyList();
        }

        var uniqueSlugs = new ArrayList<>(new LinkedHashSet<>(moduleSlugs));
        var placeholders = String.join(",", Collections.nCopies(uniqueSlugs.size(), "?"));
        var rows = jdbcTemplate.queryForList(
            "SELECT slug FROM modules WHERE slug IN (" + placeholders + ")",
            String.class,
            uniqueSlugs.toArray()
        );
        var existing = new LinkedHashSet<>(rows);
        var ordered = new ArrayList<String>();
        for (var slug : uniqueSlugs) {
            if (existing.contains(slug)) {
                ordered.add(slug);
            }
        }
        return ordered;
    }

    protected String serializeModuleSlugs(List<String> moduleSlugs) {
        try {
            return objectMapper.writeValueAsString(moduleSlugs == null ? Collections.emptyList() : moduleSlugs);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize invited module access.", ex);
        }
    }

    protected List<String> listModuleSlugs(long userCompanyId) {
        return jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ? ORDER BY module_slug ASC",
            (rs, rowNum) -> safe(rs.getString("module_slug")),
            userCompanyId
        );
    }

    protected InvitationRecord loadInvitationByToken(String token, boolean lockForUpdate) {
        var normalizedToken = safe(token);
        if (normalizedToken.isBlank()) {
            throw new NoSuchElementException("Invitation not found.");
        }

        var sql = """
            SELECT invitation.id,
                   invitation.company_id,
                   invitation.email,
                   COALESCE(invitation.full_name, '') AS full_name,
                   COALESCE(invitation.role, 'user') AS role,
                   COALESCE(invitation.module_slugs_json, '[]') AS module_slugs_json,
                   invitation.token,
                   COALESCE(invitation.status, 'pending') AS status,
                   invitation.expires_at,
                   COALESCE(company.name, '') AS company_name
            FROM user_invitations invitation
            INNER JOIN companies company ON company.id = invitation.company_id
            WHERE invitation.token = ?
            LIMIT 1
            """;
        if (lockForUpdate) {
            sql = sql + " FOR UPDATE";
        }

        var rows = jdbcTemplate.query(
            sql,
            (rs, rowNum) -> {
                var expiresAt = rs.getTimestamp("expires_at");
                return new InvitationRecord(
                    rs.getLong("id"),
                    rs.getLong("company_id"),
                    normalizeEmail(rs.getString("email")),
                    safe(rs.getString("full_name")),
                    normalizeRole(rs.getString("role")),
                    parseStoredModuleSlugs(safe(rs.getString("module_slugs_json"))),
                    safe(rs.getString("token")),
                    safe(rs.getString("status")).toLowerCase(Locale.ROOT),
                    expiresAt == null ? null : expiresAt.toLocalDateTime(),
                    safe(rs.getString("company_name"))
                );
            },
            normalizedToken
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Invitation not found.");
        }
        return rows.get(0);
    }

    protected Map<String, Object> invitationPublicView(InvitationRecord invitation) {
        var body = new LinkedHashMap<String, Object>();
        body.put("email", invitation.email());
        body.put("full_name", invitation.fullName());
        body.put("role", invitation.role());
        body.put("company_id", invitation.companyId());
        body.put("company_name", invitation.companyName());
        body.put("status", invitationStatus(invitation));
        body.put("expires_at", invitation.expiresAt() == null ? null : invitation.expiresAt().toString());
        return body;
    }

    protected String invitationStatus(InvitationRecord invitation) {
        if (!"pending".equals(invitation.status())) {
            return invitation.status();
        }
        if (invitation.expiresAt() != null && invitation.expiresAt().isBefore(LocalDateTime.now())) {
            return "expired";
        }
        return "pending";
    }

    protected void ensureEmailNotUsedInCompany(long companyId, String email, Long invitationIdToIgnore) {
        var existingUsers = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM users u
                INNER JOIN user_companies uc ON uc.user_id = u.id
                WHERE uc.company_id = ?
                  AND LOWER(u.email) = ?
                """,
            Integer.class,
            companyId,
            email
        );

        if (existingUsers != null && existingUsers > 0) {
            throw new IllegalArgumentException("That email is already used in this company.");
        }

        var existingInvitations = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_invitations
                WHERE company_id = ?
                  AND LOWER(email) = ?
                  AND COALESCE(status, 'pending') = 'pending'
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            email,
            invitationIdToIgnore,
            invitationIdToIgnore
        );

        if (existingInvitations != null && existingInvitations > 0) {
            throw new IllegalArgumentException("That email already has a pending invitation.");
        }
    }

    protected void ensureInvitationEmailCanBeAccepted(long companyId, String email, long invitationIdToIgnore) {
        ensureEmailNotUsedInCompany(companyId, email, invitationIdToIgnore);
        ensureEmailNotRegistered(email);
    }

    protected void ensureEmailNotRegistered(String email) {
        var existingUsers = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE LOWER(email) = ?",
            Integer.class,
            email
        );
        if (existingUsers != null && existingUsers > 0) {
            throw new IllegalArgumentException("That email is already registered.");
        }
    }

    protected void ensureHrWorkProfileForCompanyAccess(
        long companyId,
        long userCompanyId,
        long userId,
        String status,
        Long createdBy
    ) {
        var workProfileStatus = normalizeHrWorkProfileStatus(status);
        var updated = jdbcTemplate.update(
            """
                UPDATE user_work_profiles
                SET user_id = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND user_company_id = ?
                """,
            userId,
            workProfileStatus,
            companyId,
            userCompanyId
        );
        if (updated > 0) {
            return;
        }

        jdbcTemplate.update(
            """
                INSERT INTO user_work_profiles
                    (company_id, user_company_id, user_id, user_code, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
            companyId,
            userCompanyId,
            userId,
            generateNextUserWorkProfileCode(companyId),
            workProfileStatus,
            createdBy
        );
    }

    protected String normalizeHrWorkProfileStatus(String status) {
        var normalized = normalizeStatus(status);
        return "pending".equals(normalized) ? "inactive" : normalized;
    }

    protected String generateNextUserWorkProfileCode(long companyId) {
        while (true) {
            var sequence = loadUserCodeSequence(companyId);
            var candidate = formatUserCode(sequence.prefix(), sequence.padding(), sequence.nextNumber());

            jdbcTemplate.update(
                """
                    UPDATE user_number_sequences
                    SET next_number = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ?
                    """,
                sequence.nextNumber() + 1,
                companyId
            );

            var existingCount = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM user_work_profiles
                    WHERE company_id = ?
                      AND user_code = ?
                    """,
                Integer.class,
                companyId,
                candidate
            );
            if (existingCount == null || existingCount == 0) {
                return candidate;
            }
        }
    }

    protected UserCodeSequenceRow loadUserCodeSequence(long companyId) {
        ensureUserCodeSequenceRow(companyId);

        var rows = jdbcTemplate.query(
            """
                SELECT prefix, padding, next_number
                FROM user_number_sequences
                WHERE company_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new UserCodeSequenceRow(
                safe(rs.getString("prefix")),
                rs.getInt("padding"),
                rs.getLong("next_number")
            ),
            companyId
        );

        if (rows.isEmpty()) {
            throw new IllegalStateException("User code sequence could not be initialized.");
        }
        return rows.get(0);
    }

    protected void ensureUserCodeSequenceRow(long companyId) {
        jdbcTemplate.update(
            """
                INSERT INTO user_number_sequences (company_id, prefix, padding, next_number)
                SELECT ?, 'USR', 4,
                       COALESCE(MAX(
                         CASE
                           WHEN TRIM(COALESCE(user_code, '')) REGEXP '^USR-[0-9]+$'
                             THEN CAST(SUBSTRING(TRIM(user_code), 5) AS UNSIGNED)
                           ELSE 0
                         END
                       ), 0) + 1
                FROM user_work_profiles
                WHERE company_id = ?
                ON DUPLICATE KEY UPDATE
                  next_number = GREATEST(user_number_sequences.next_number, VALUES(next_number))
                """,
            companyId,
            companyId
        );
    }

    protected String formatUserCode(String prefix, int padding, long nextNumber) {
        var normalizedPrefix = normalizeUserCodePrefix(prefix);
        var effectivePadding = Math.max(padding, 4);
        var digits = String.format(Locale.ROOT, "%0" + effectivePadding + "d", nextNumber);
        return normalizedPrefix + "-" + digits;
    }

    protected String normalizeUserCodePrefix(String prefix) {
        var normalizedPrefix = safe(prefix).trim().toUpperCase(Locale.ROOT);
        while (normalizedPrefix.endsWith("-")) {
            normalizedPrefix = normalizedPrefix.substring(0, normalizedPrefix.length() - 1).trim();
        }
        return normalizedPrefix.isBlank() ? "USR" : normalizedPrefix;
    }

    protected String normalizeEmail(String value) {
        return safe(value).trim().toLowerCase();
    }

    protected String normalizeRole(String rawRole) {
        var normalized = safe(rawRole).trim().toLowerCase();
        return switch (normalized) {
            case "super admin", "superadmin", "root" -> "superadmin";
            case "admin", "owner", "manager" -> "admin";
            default -> "user";
        };
    }

    protected String normalizeStatus(String rawStatus) {
        var normalized = safe(rawStatus).trim().toLowerCase();
        return switch (normalized) {
            case "inactive", "inactivo", "disabled" -> "inactive";
            case "pending" -> "pending";
            default -> "active";
        };
    }

    protected String joinParts(String... values) {
        return java.util.Arrays.stream(values)
            .map(this::safe)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .reduce("", (left, right) -> left.isBlank() ? right : left + " " + right);
    }

    protected String objectString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    protected String objectString(Map<?, ?> values, String... fields) {
        for (var field : fields) {
            if (!values.containsKey(field)) {
                continue;
            }

            var value = objectString(values.get(field));
            if (!value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    protected String safe(String value) {
        return value == null ? "" : value;
    }

    protected String normalizeCountry(String value) {
        var normalized = safe(value).trim().toUpperCase(Locale.ROOT);
        if (normalized.length() != 2 || !normalized.chars().allMatch(Character::isLetter)) {
            return "";
        }
        return normalized;
    }

    protected Object nullable(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    protected Object nullableText(String value) {
        return nullable(value);
    }

    protected String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    protected String normalizeKey(String value) {
        return safe(value).trim().toLowerCase();
    }

    protected String firstNonBlank(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    protected Object firstNonNull(Object... values) {
        for (var value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    protected String readOptionalText(JsonNode node, String... fields) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        for (var field : fields) {
            var childNode = node.get(field);
            if (childNode != null && !childNode.isNull()) {
                var text = childNode.asText("").trim();
                if (!text.isBlank()) {
                    return text;
                }
            }
        }
        return "";
    }

    protected Integer readOptionalInt(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        var childNode = node.get(field);
        if (childNode == null || childNode.isNull()) {
            return null;
        }

        if (childNode.isInt() || childNode.isLong()) {
            return childNode.asInt();
        }

        var text = childNode.asText("").trim();
        if (text.isBlank()) {
            return null;
        }

        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    protected Long readOptionalLong(JsonNode node, String... fields) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        for (var field : fields) {
            var childNode = node.get(field);
            if (childNode == null || childNode.isNull()) {
                continue;
            }
            if (childNode.isLong() || childNode.isInt()) {
                return childNode.asLong();
            }
            var text = childNode.asText("").trim();
            if (text.isBlank()) {
                continue;
            }
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                // continue to next field
            }
        }
        return null;
    }

    protected Boolean readOptionalBoolean(JsonNode node, String... fields) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        for (var field : fields) {
            var childNode = node.get(field);
            if (childNode == null || childNode.isNull()) {
                continue;
            }
            if (childNode.isBoolean()) {
                return childNode.asBoolean();
            }
            if (childNode.isNumber()) {
                return childNode.asInt() != 0;
            }
            var text = childNode.asText("").trim().toLowerCase(Locale.ROOT);
            if ("true".equals(text) || "1".equals(text) || "yes".equals(text)) {
                return true;
            }
            if ("false".equals(text) || "0".equals(text) || "no".equals(text)) {
                return false;
            }
        }
        return null;
    }

    protected Long readOptionalLong(Map<?, ?> values, String... fields) {
        for (var field : fields) {
            var value = values.get(field);
            if (value instanceof Number number) {
                return number.longValue();
            }
            if (value instanceof String string && !string.isBlank()) {
                try {
                    return Long.parseLong(string.trim());
                } catch (NumberFormatException ignored) {
                    // continue to next field
                }
            }
        }
        return null;
    }

    protected boolean readOptionalBoolean(Map<?, ?> values, boolean defaultValue, String... fields) {
        for (var field : fields) {
            if (!values.containsKey(field)) {
                continue;
            }
            var value = values.get(field);
            if (value instanceof Boolean bool) {
                return bool;
            }
            if (value instanceof Number number) {
                return number.intValue() != 0;
            }
            var text = objectString(value).toLowerCase(Locale.ROOT);
            if ("true".equals(text) || "1".equals(text) || "yes".equals(text)) {
                return true;
            }
            if ("false".equals(text) || "0".equals(text) || "no".equals(text)) {
                return false;
            }
        }
        return defaultValue;
    }

    protected BigDecimal readOptionalDecimal(JsonNode node, String... fields) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        for (var field : fields) {
            var childNode = node.get(field);
            if (childNode == null || childNode.isNull()) {
                continue;
            }

            var text = childNode.asText("").trim();
            if (text.isBlank()) {
                continue;
            }

            try {
                return new BigDecimal(text).setScale(7, RoundingMode.HALF_UP);
            } catch (NumberFormatException ignored) {
                // continue to next field
            }
        }
        return null;
    }

    protected BigDecimal readOptionalDecimal(Map<?, ?> values, String... fields) {
        for (var field : fields) {
            if (!values.containsKey(field)) {
                continue;
            }

            var value = values.get(field);
            if (value == null) {
                continue;
            }

            var text = value instanceof Number ? value.toString() : objectString(value);
            if (text.isBlank()) {
                continue;
            }

            try {
                return new BigDecimal(text).setScale(7, RoundingMode.HALF_UP);
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(field + " must be a valid decimal.");
            }
        }
        return null;
    }

    protected Integer readOptionalInteger(JsonNode node, String... fields) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        for (var field : fields) {
            var childNode = node.get(field);
            if (childNode == null || childNode.isNull()) {
                continue;
            }

            if (childNode.isInt() || childNode.isLong()) {
                return childNode.asInt();
            }

            var text = childNode.asText("").trim();
            if (text.isBlank()) {
                continue;
            }

            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
                // continue to next field
            }
        }
        return null;
    }

    protected Integer readOptionalInteger(Map<?, ?> values, String... fields) {
        for (var field : fields) {
            if (!values.containsKey(field)) {
                continue;
            }

            var value = values.get(field);
            if (value instanceof Number number) {
                return number.intValue();
            }

            var text = objectString(value);
            if (text.isBlank()) {
                continue;
            }

            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(field + " must be a valid integer.");
            }
        }
        return null;
    }

    protected boolean hasCoordinatePayload(Map<?, ?> values) {
        return values.containsKey("latitude")
            || values.containsKey("latitud")
            || values.containsKey("longitude")
            || values.containsKey("longitud")
            || values.containsKey("lng")
            || values.containsKey("radius_meters")
            || values.containsKey("radiusMeters")
            || values.containsKey("radius")
            || values.containsKey("radio")
            || values.containsKey("coordinate_source")
            || values.containsKey("coordinateSource")
            || values.containsKey("source")
            || values.containsKey("google_maps_url")
            || values.containsKey("googleMapsUrl")
            || values.containsKey("map_url")
            || values.containsKey("mapUrl");
    }

    protected boolean hasHeadquartersLocationPayload(Map<String, Object> payload) {
        if (hasCoordinatePayload(payload) || hasHeadquartersAddressPayload(payload)) {
            return true;
        }

        var locationPayload = nestedMap(payload, HEADQUARTERS_LOCATION_KEY, "headquartersLocation", "business_location", "businessLocation");
        return locationPayload != null && (hasCoordinatePayload(locationPayload) || hasHeadquartersAddressPayload(locationPayload));
    }

    protected boolean hasHeadquartersAddressPayload(Map<?, ?> values) {
        return values.containsKey(ADDRESS_KEY)
            || values.containsKey("addressLine")
            || values.containsKey("address_line")
            || values.containsKey("street")
            || values.containsKey("direccion")
            || values.containsKey("country")
            || values.containsKey("pais")
            || values.containsKey("state")
            || values.containsKey("province")
            || values.containsKey("state_province")
            || values.containsKey("stateProvince")
            || values.containsKey("estado")
            || values.containsKey("city")
            || values.containsKey("ciudad")
            || values.containsKey("zip")
            || values.containsKey("postal_code")
            || values.containsKey("postalCode")
            || values.containsKey("cp");
    }

    protected HeadquartersLocationInput normalizeHeadquartersLocationInput(Map<String, Object> payload) {
        var locationPayload = nestedMap(payload, HEADQUARTERS_LOCATION_KEY, "headquartersLocation", "business_location", "businessLocation");
        var sourcePayload = locationPayload == null ? payload : locationPayload;
        var hasCoordinatePayload = hasCoordinatePayload(sourcePayload);
        var coordinates = hasCoordinatePayload ? normalizeCoordinateInput(sourcePayload) : null;
        var address = normalizeHeadquartersAddressInput(payload, sourcePayload);

        return new HeadquartersLocationInput(coordinates, hasCoordinatePayload, address);
    }

    protected HeadquartersAddressInput normalizeHeadquartersAddressInput(Map<String, Object> rootPayload, Map<?, ?> locationPayload) {
        var sourcePayload = locationPayload == null ? rootPayload : locationPayload;
        var addressPayload = nestedMap(sourcePayload, ADDRESS_KEY);
        if (addressPayload == null) {
            addressPayload = nestedMap(rootPayload, ADDRESS_KEY);
        }

        var street = "";
        if (sourcePayload.get(ADDRESS_KEY) instanceof String addressText) {
            street = addressText.trim();
        }
        if (street.isBlank() && rootPayload.get(ADDRESS_KEY) instanceof String addressText) {
            street = addressText.trim();
        }

        if (addressPayload != null) {
            street = firstNonBlank(
                objectString(addressPayload, "street", "address_line", "addressLine", "direccion"),
                street
            );
            return new HeadquartersAddressInput(
                street,
                objectString(addressPayload, "country", "pais"),
                objectString(addressPayload, "state", "province", "state_province", "stateProvince", "estado"),
                objectString(addressPayload, "city", "ciudad"),
                objectString(addressPayload, "zip", "postal_code", "postalCode", "cp")
            );
        }

        return new HeadquartersAddressInput(
            firstNonBlank(
                objectString(sourcePayload, "street", "address_line", "addressLine", "direccion"),
                objectString(rootPayload, "street", "address_line", "addressLine", "direccion"),
                street
            ),
            firstNonBlank(
                objectString(sourcePayload, "country", "pais"),
                objectString(rootPayload, "country", "pais")
            ),
            firstNonBlank(
                objectString(sourcePayload, "state", "province", "state_province", "stateProvince", "estado"),
                objectString(rootPayload, "state", "province", "state_province", "stateProvince", "estado")
            ),
            firstNonBlank(
                objectString(sourcePayload, "city", "ciudad"),
                objectString(rootPayload, "city", "ciudad")
            ),
            firstNonBlank(
                objectString(sourcePayload, "zip", "postal_code", "postalCode", "cp"),
                objectString(rootPayload, "zip", "postal_code", "postalCode", "cp")
            )
        );
    }

    protected Map<?, ?> nestedMap(Map<?, ?> values, String... fields) {
        for (var field : fields) {
            var candidate = values.get(field);
            if (candidate instanceof Map<?, ?> nested) {
                return nested;
            }
        }
        return null;
    }

    protected CoordinateInput normalizeCoordinateInput(Map<?, ?> values) {
        var latitude = readOptionalDecimal(values, "latitude", "latitud");
        var longitude = readOptionalDecimal(values, "longitude", "longitud", "lng");
        var radiusMeters = readOptionalInteger(values, "radius_meters", "radiusMeters", "radius", "radio");
        var coordinateSource = normalizeCoordinateSource(firstNonBlank(
            objectString(values, "coordinate_source", "coordinateSource"),
            objectString(values, "source")
        ));
        var googleMapsUrl = objectString(values, "google_maps_url", "googleMapsUrl", "map_url", "mapUrl");

        if (latitude == null && longitude == null) {
            return new CoordinateInput(null, null, null, "", googleMapsUrl);
        }

        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("latitude and longitude must both be provided.");
        }

        validateCoordinateRange(latitude, new BigDecimal("-90"), new BigDecimal("90"), "latitude");
        validateCoordinateRange(longitude, new BigDecimal("-180"), new BigDecimal("180"), "longitude");

        if (radiusMeters == null) {
            radiusMeters = 100;
        }
        if (radiusMeters <= 0) {
            throw new IllegalArgumentException("radius_meters must be greater than zero.");
        }

        return new CoordinateInput(
            latitude,
            longitude,
            radiusMeters,
            coordinateSource.isBlank() ? "manual" : coordinateSource,
            googleMapsUrl
        );
    }

    protected void validateCoordinateRange(BigDecimal value, BigDecimal minimum, BigDecimal maximum, String label) {
        if (value.compareTo(minimum) < 0 || value.compareTo(maximum) > 0) {
            throw new IllegalArgumentException(label + " is outside the supported range.");
        }
    }

    protected String normalizeCoordinateSource(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "google_maps_link", "google_maps", "maps_link" -> "google_maps_link";
            case "current_location", "device_location", "here" -> "current_location";
            case "manual" -> "manual";
            default -> "";
        };
    }

    protected void putCoordinateFields(Map<String, Object> target, JsonNode sourceNode) {
        var latitude = readOptionalDecimal(sourceNode, "latitude", "latitud");
        var longitude = readOptionalDecimal(sourceNode, "longitude", "longitud", "lng");
        if (latitude == null || longitude == null) {
            putIfPresent(target, "google_maps_url", readOptionalText(sourceNode, "google_maps_url", "googleMapsUrl", "map_url", "mapUrl"));
            return;
        }

        putIfPresent(target, "latitude", latitude);
        putIfPresent(target, "longitude", longitude);
        putIfPresent(target, "radius_meters", readOptionalInteger(sourceNode, "radius_meters", "radiusMeters", "radius", "radio"));
        putIfPresent(target, "coordinate_source", normalizeCoordinateSource(firstNonBlank(
            readOptionalText(sourceNode, "coordinate_source", "coordinateSource"),
            readOptionalText(sourceNode, "source")
        )));
        putIfPresent(target, "google_maps_url", readOptionalText(sourceNode, "google_maps_url", "googleMapsUrl", "map_url", "mapUrl"));
    }

    protected void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value == null) {
            return;
        }

        if (value instanceof String stringValue && stringValue.isBlank()) {
            return;
        }

        target.put(key, value);
    }

    protected void putText(ObjectNode node, String fieldName, String value) {
        node.put(fieldName, safe(value));
    }

    protected void putCoordinateInput(ObjectNode node, CoordinateInput coordinates) {
        if (coordinates == null || !coordinates.hasCoordinates()) {
            node.remove(Arrays.asList("latitude", "longitude", "radius_meters", "coordinate_source"));
            putOptionalText(node, "google_maps_url", coordinates == null ? "" : coordinates.googleMapsUrl());
            return;
        }

        putDecimal(node, "latitude", coordinates.latitude());
        putDecimal(node, "longitude", coordinates.longitude());
        putInteger(node, "radius_meters", coordinates.radiusMeters());
        putOptionalText(node, "coordinate_source", firstNonBlank(coordinates.coordinateSource(), "manual"));
        putOptionalText(node, "google_maps_url", coordinates.googleMapsUrl());
    }

    protected void putHeadquartersLocationInput(ObjectNode templateNode, HeadquartersLocationInput location) {
        var locationNode = ensureObjectNode(templateNode, HEADQUARTERS_LOCATION_KEY);

        if (location.hasCoordinatePayload()) {
            putCoordinateInput(templateNode, location.coordinates());
            putCoordinateInput(locationNode, location.coordinates());
        }

        putHeadquartersAddressInput(templateNode, location.address());
        putHeadquartersAddressInput(locationNode, location.address());

        if (locationNode.isEmpty()) {
            templateNode.remove(HEADQUARTERS_LOCATION_KEY);
        }
    }

    protected ObjectNode ensureObjectNode(ObjectNode parentNode, String fieldName) {
        var childNode = parentNode.get(fieldName);
        if (childNode instanceof ObjectNode objectNode) {
            return objectNode;
        }

        var objectNode = objectMapper.createObjectNode();
        parentNode.set(fieldName, objectNode);
        return objectNode;
    }

    protected void syncCompanyStructureAttendanceLocation(
        long companyId,
        long userId,
        String companyName,
        CoordinateInput coordinates
    ) {
        if (coordinates == null || !coordinates.hasCoordinates()) {
            deactivateCompanyStructureAttendanceLocation(companyId);
            return;
        }

        var locationName = firstNonBlank(companyName, "Company location");
        var existingLocationId = findCompanyStructureAttendanceLocationId(companyId);
        if (existingLocationId == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO attendance_locations
                    (company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude, radius_meters,
                     required_hours_per_day, required_start_time, required_end_time, required_days_per_week, status, managed_source, created_by)
                    VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'business_structure', ?)
                    """,
                companyId,
                LocalDate.of(1970, 1, 1),
                LocalDate.of(9999, 12, 31),
                locationName,
                coordinates.latitude(),
                coordinates.longitude(),
                coordinates.radiusMeters(),
                new BigDecimal("8.00"),
                LocalTime.of(8, 0),
                LocalTime.of(16, 0),
                5,
                userId
            );
            return;
        }

        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET unit_id = NULL,
                    business_id = NULL,
                    contract_start_date = ?,
                    contract_end_date = ?,
                    name = ?,
                    latitude = ?,
                    longitude = ?,
                    radius_meters = ?,
                    required_hours_per_day = ?,
                    required_start_time = ?,
                    required_end_time = ?,
                    required_days_per_week = ?,
                    status = 'active',
                    managed_source = 'business_structure'
                WHERE id = ? AND company_id = ?
                """,
            LocalDate.of(1970, 1, 1),
            LocalDate.of(9999, 12, 31),
            locationName,
            coordinates.latitude(),
            coordinates.longitude(),
            coordinates.radiusMeters(),
            new BigDecimal("8.00"),
            LocalTime.of(8, 0),
            LocalTime.of(16, 0),
            5,
            existingLocationId,
            companyId
        );
    }

    protected Long findCompanyStructureAttendanceLocationId(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM attendance_locations
                WHERE company_id = ?
                  AND business_id IS NULL
                  AND unit_id IS NULL
                  AND managed_source = 'business_structure'
                ORDER BY id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    protected void deactivateCompanyStructureAttendanceLocation(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET status = 'inactive'
                WHERE company_id = ?
                  AND business_id IS NULL
                  AND unit_id IS NULL
                  AND managed_source = 'business_structure'
                """,
            companyId
        );
    }

    protected void putHeadquartersAddressInput(ObjectNode node, HeadquartersAddressInput address) {
        if (address == null || address.isEmpty()) {
            node.remove(ADDRESS_KEY);
            return;
        }

        var addressNode = objectMapper.createObjectNode();
        putOptionalText(addressNode, "street", address.street());
        putOptionalText(addressNode, "country", address.country());
        putOptionalText(addressNode, "state", address.state());
        putOptionalText(addressNode, "city", address.city());
        putOptionalText(addressNode, "zip", address.zip());
        node.set(ADDRESS_KEY, addressNode);
    }

    protected void putDecimal(ObjectNode node, String fieldName, BigDecimal value) {
        if (value == null) {
            node.remove(fieldName);
        } else {
            node.put(fieldName, value);
        }
    }

    protected void putInteger(ObjectNode node, String fieldName, Integer value) {
        if (value == null) {
            node.remove(fieldName);
        } else {
            node.put(fieldName, value);
        }
    }

    protected void putOptionalText(ObjectNode node, String fieldName, String value) {
        if (value == null || value.isBlank()) {
            node.remove(fieldName);
        } else {
            node.put(fieldName, value);
        }
    }

    protected Long getNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    protected Integer getNullableInt(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    protected NameParts splitFullName(String fullName) {
        var normalized = safe(fullName).trim();
        if (normalized.isBlank()) {
            return new NameParts("", "");
        }
        var parts = normalized.split("\\s+");
        if (parts.length == 1) {
            return new NameParts(parts[0], "");
        }
        var firstName = String.join(" ", java.util.Arrays.copyOf(parts, parts.length - 1));
        return new NameParts(firstName, parts[parts.length - 1]);
    }

}
