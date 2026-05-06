package com.indice.erp.configcenter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfigCenterService {

    private static final String CONFIG_CENTER_KEY = "config_center";
    private static final String HEADQUARTERS_LOCATION_KEY = "headquarters_location";
    private static final String ADDRESS_KEY = "address";
    private static final long MAX_PROFILE_AVATAR_SIZE_BYTES = 1024 * 1024;
    private static final Set<String> PROFILE_AVATAR_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp"
    );

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;

    public ConfigCenterService(
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

    public Map<String, Object> getEmpresa(long companyId) {
        var companyRows = jdbcTemplate.query(
            "SELECT id, name, logo_url FROM companies WHERE id = ? LIMIT 1",
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("nombre_empresa", safe(rs.getString("name")));
                row.put("logo_url", safe(rs.getString("logo_url")));
                return row;
            },
            companyId
        );

        if (companyRows.isEmpty()) {
            throw new IllegalArgumentException("Company not found.");
        }

        var settingsRoot = loadSettingsRoot(companyId);
        var configCenterNode = settingsRoot.path(CONFIG_CENTER_KEY);
        var empresaTemplate = normalizeEmpresaTemplate(configCenterNode.path("empresa_template"));
        var mapNode = configCenterNode.path("map");
        var storedMap = normalizeStoredMap(mapNode);
        var map = mapNode.isArray() ? storedMap : buildStructureMap(companyId);

        var estructura = firstNonBlank(
            readOptionalText(configCenterNode, "estructura"),
            map.isEmpty() ? "simple" : "multi"
        );

        var empresa = new LinkedHashMap<>(companyRows.getFirst());
        if (configCenterNode.path("empresa_template").has("logo")) {
            empresa.put("logo_url", configCenterNode.path("empresa_template").path("logo").asText("").trim());
        } else {
            empresa.put("logo_url", firstNonBlank(
                objectString(empresa.get("logo_url")),
                readOptionalText(configCenterNode.path("empresa_template"), "logo_url")
            ));
        }
        empresa.put("plan_id", null);
        empresa.put("industria", firstNonBlank(
            stringValue(empresaTemplate.get("industria")),
            readOptionalText(configCenterNode.path("empresa_template"), "industria")
        ));
        empresa.put("modelo_negocio", firstNonBlank(
            stringValue(empresaTemplate.get("modelo_negocio")),
            readOptionalText(configCenterNode.path("empresa_template"), "modelo_negocio")
        ));
        empresa.put("descripcion", firstNonBlank(
            stringValue(empresaTemplate.get("descripcion")),
            readOptionalText(configCenterNode.path("empresa_template"), "descripcion")
        ));
        empresa.put("moneda", firstNonBlank(
            stringValue(empresaTemplate.get("currency")),
            readOptionalText(configCenterNode.path("empresa_template"), "moneda")
        ));
        empresa.put("zona_horaria", firstNonBlank(
            stringValue(empresaTemplate.get("timezone")),
            readOptionalText(configCenterNode.path("empresa_template"), "zona_horaria")
        ));
        empresa.put("tamano_empresa", firstNonBlank(
            stringValue(empresaTemplate.get("tamano_empresa")),
            readOptionalText(configCenterNode, "tamano_empresa")
        ));
        putIfPresent(empresa, "latitude", empresaTemplate.get("latitude"));
        putIfPresent(empresa, "longitude", empresaTemplate.get("longitude"));
        putIfPresent(empresa, "radius_meters", empresaTemplate.get("radius_meters"));
        putIfPresent(empresa, "coordinate_source", empresaTemplate.get("coordinate_source"));
        putIfPresent(empresa, "google_maps_url", empresaTemplate.get("google_maps_url"));
        putIfPresent(empresa, ADDRESS_KEY, empresaTemplate.get(ADDRESS_KEY));
        putIfPresent(empresa, HEADQUARTERS_LOCATION_KEY, empresaTemplate.get(HEADQUARTERS_LOCATION_KEY));
        empresa.put("colaboradores", resolveCollaborators(companyId, readOptionalInt(configCenterNode, "colaboradores")));
        empresa.put("estructura", "multi".equals(estructura) ? "multi" : "simple");
        empresa.put("empresa_template", empresaTemplate);
        empresa.put("map", map);
        return empresa;
    }

    public Object getConfig(long companyId) {
        var empresa = getEmpresa(companyId);
        var config = new LinkedHashMap<String, Object>();
        config.put("estructura", empresa.get("estructura"));
        config.put("colaboradores", empresa.get("colaboradores"));
        config.put("empresa_template", empresa.get("empresa_template"));
        config.put("map", empresa.get("map"));
        return config;
    }

    public Map<String, Object> getCurrentUser(long userId, String currentRole) {
        var rows = jdbcTemplate.query(
            """
                SELECT u.id,
                       u.email,
                       COALESCE(NULLIF(p.full_name, ''), COALESCE(u.full_name, '')) AS full_name,
                       COALESCE(p.phone, '') AS phone,
                       COALESCE(p.country, '') AS country,
                       COALESCE(p.preferred_language, 'es-419') AS preferred_language,
                       COALESCE(p.avatar_url, '') AS avatar_url,
                       COALESCE(p.avatar_object_key, '') AS avatar_object_key,
                       COALESCE(p.avatar_content_type, '') AS avatar_content_type
                FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE u.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var fullName = safe(rs.getString("full_name"));
                var parsed = splitFullName(fullName);
                var avatarObjectKey = safe(rs.getString("avatar_object_key"));
                var avatarUrl = firstNonBlank(
                    safe(signedProfileAvatarUrl(avatarObjectKey)),
                    safe(rs.getString("avatar_url"))
                );

                var user = new LinkedHashMap<String, Object>();
                user.put("id", rs.getLong("id"));
                user.put("email", safe(rs.getString("email")));
                user.put("apodo", "");
                user.put("nombres", parsed.firstName());
                user.put("apellidos", parsed.lastName());
                user.put("primer_nombre", parsed.firstName());
                user.put("segundo_nombre", "");
                user.put("apellido_paterno", parsed.lastName());
                user.put("apellido_materno", "");
                user.put("telefono", safe(rs.getString("phone")));
                user.put("country", safe(rs.getString("country")));
                user.put("preferred_language", safe(rs.getString("preferred_language")));
                user.put("avatar_url", avatarUrl);
                user.put("avatar_object_key", avatarObjectKey);
                user.put("avatar_content_type", safe(rs.getString("avatar_content_type")));
                user.put("role", currentRole);
                return user;
            },
            userId
        );

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("User not found.");
        }
        return rows.getFirst();
    }

    public Map<String, Object> getUsers(long companyId) {
        var users = jdbcTemplate.query(
            """
                SELECT u.id,
                       u.email,
                       COALESCE(NULLIF(p.full_name, ''), COALESCE(u.full_name, '')) AS full_name,
                       COALESCE(p.avatar_url, '') AS avatar_url,
                       COALESCE(p.avatar_object_key, '') AS avatar_object_key,
                       COALESCE(p.avatar_content_type, '') AS avatar_content_type,
                       uc.id AS user_company_id,
                       COALESCE(uc.role, 'user') AS role,
                       COALESCE(uc.status, 'active') AS status
                FROM users u
                INNER JOIN user_companies uc ON uc.user_id = u.id
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE uc.company_id = ?
                ORDER BY u.full_name ASC, u.email ASC
                """,
            (rs, rowNum) -> {
                var name = splitFullName(safe(rs.getString("full_name")));
                var avatarObjectKey = safe(rs.getString("avatar_object_key"));
                var user = new LinkedHashMap<String, Object>();
                user.put("id", rs.getLong("id"));
                user.put("user_company_id", rs.getLong("user_company_id"));
                user.put("apodo", null);
                user.put("nombres", name.firstName());
                user.put("apellidos", name.lastName());
                user.put("email", safe(rs.getString("email")));
                user.put("telefono", null);
                user.put("avatar_url", firstNonBlank(
                    safe(signedProfileAvatarUrl(avatarObjectKey)),
                    safe(rs.getString("avatar_url"))
                ));
                user.put("avatar_object_key", avatarObjectKey);
                user.put("avatar_content_type", safe(rs.getString("avatar_content_type")));
                user.put("role", safe(rs.getString("role")));
                user.put("department", null);
                user.put("status", safe(rs.getString("status")));
                user.put("created_at", null);
                user.put("business_id", null);
                user.put("module_slugs", listModuleSlugs(rs.getLong("user_company_id")));
                user.put("is_protected", Set.of("root", "superadmin").contains(safe(rs.getString("role"))));
                user.put("source", "user");
                return user;
            },
            companyId
        );

        var invitations = jdbcTemplate.query(
            """
                SELECT id, email, COALESCE(full_name, '') AS full_name, COALESCE(role, 'user') AS role,
                       COALESCE(module_slugs_json, '[]') AS module_slugs_json
                FROM user_invitations
                WHERE company_id = ?
                  AND COALESCE(status, 'pending') = 'pending'
                ORDER BY created_at DESC
                """,
            (rs, rowNum) -> {
                var name = splitFullName(safe(rs.getString("full_name")));
                var invitation = new LinkedHashMap<String, Object>();
                invitation.put("id", rs.getLong("id"));
                invitation.put("invitation_id", rs.getLong("id"));
                invitation.put("user_company_id", null);
                invitation.put("apodo", null);
                invitation.put("nombres", name.firstName());
                invitation.put("apellidos", name.lastName());
                invitation.put("email", safe(rs.getString("email")));
                invitation.put("telefono", null);
                invitation.put("avatar_url", null);
                invitation.put("avatar_object_key", null);
                invitation.put("avatar_content_type", null);
                invitation.put("role", safe(rs.getString("role")));
                invitation.put("department", null);
                invitation.put("status", "pending");
                invitation.put("created_at", null);
                invitation.put("business_id", null);
                invitation.put("module_slugs", parseStoredModuleSlugs(safe(rs.getString("module_slugs_json"))));
                invitation.put("is_protected", false);
                invitation.put("source", "invitation");
                return invitation;
            },
            companyId
        );

        users.addAll(invitations);

        var catalogBusinesses = jdbcTemplate.query(
            """
                SELECT id, name
                FROM businesses
                WHERE company_id = ?
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
                """,
            (rs, rowNum) -> {
                var business = new LinkedHashMap<String, Object>();
                business.put("id", rs.getLong("id"));
                business.put("name", safe(rs.getString("name")));
                return business;
            },
            companyId
        );

        var catalogModules = jdbcTemplate.query(
            "SELECT slug, name FROM modules WHERE COALESCE(is_active, 1) = 1 ORDER BY sort_order ASC, name ASC",
            (rs, rowNum) -> {
                var module = new LinkedHashMap<String, Object>();
                module.put("slug", safe(rs.getString("slug")));
                module.put("name", safe(rs.getString("name")));
                return module;
            }
        );

        var catalog = new LinkedHashMap<String, Object>();
        catalog.put("businesses", catalogBusinesses);
        catalog.put("modules", catalogModules);

        var result = new LinkedHashMap<String, Object>();
        result.put("users", users);
        result.put("catalog", catalog);
        return result;
    }

    public Map<String, Object> createCurrentUserAvatarUpload(long companyId, long userId, Map<String, Object> payload) {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var contentType = normalizeProfileAvatarContentType(value(payload, "content_type", "contentType", "mime_type"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (sizeBytes > MAX_PROFILE_AVATAR_SIZE_BYTES) {
            throw new IllegalArgumentException("Profile photos must be 1MB or smaller.");
        }

        var objectKey = buildCurrentUserAvatarObjectKey(companyId, userId, contentType);
        var upload = objectStorageService.presignUpload(
            documentsBucket(),
            objectKey,
            contentType,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt());
        body.put("upload_headers", upload.uploadHeaders());
        body.put("content_type", contentType);
        return body;
    }

    @Transactional
    public Map<String, Object> saveCurrentUser(long companyId, long userId, String currentRole, Map<String, Object> payload) {
        var firstName = value(payload, "primer_nombre", "nombres");
        var secondName = value(payload, "segundo_nombre");
        var lastName = value(payload, "apellido_paterno", "apellidos");
        var maternalLastName = value(payload, "apellido_materno");
        var phone = value(payload, "telefono");
        var country = normalizeCountry(value(payload, "country", "pais"));
        var preferredLanguage = firstNonBlank(value(payload, "preferred_language"), "es-419");
        var hasAvatarUpdate = hasAnyKey(payload, "avatar_object_key", "avatarObjectKey");
        var avatarObjectKey = "";
        var avatarContentType = "";
        if (hasAvatarUpdate) {
            avatarObjectKey = normalizeCurrentUserAvatarObjectKey(
                companyId,
                userId,
                value(payload, "avatar_object_key", "avatarObjectKey")
            );
            avatarContentType = avatarObjectKey.isBlank()
                ? ""
                : normalizeProfileAvatarContentType(value(payload, "avatar_content_type", "avatarContentType", "content_type"));
            if (!avatarObjectKey.isBlank() && !objectStorageService.objectExists(documentsBucket(), avatarObjectKey)) {
                throw new IllegalArgumentException("avatar_object_key does not reference an existing uploaded profile photo.");
            }
        }
        var newPassword = value(payload, "new_password");
        var confirmNewPassword = value(payload, "confirm_new_password", "password_confirmation", "confirm_password");
        var hasPasswordChange = !newPassword.isBlank() || !confirmNewPassword.isBlank();

        var fullName = joinParts(firstName, secondName, lastName, maternalLastName);
        if (fullName.isBlank()) {
            throw new IllegalArgumentException("At least one name field is required.");
        }

        if (hasPasswordChange) {
            if (!newPassword.equals(confirmNewPassword)) {
                throw new IllegalArgumentException("The new password and its confirmation must match.");
            }

            if (newPassword.length() < 8) {
                throw new IllegalArgumentException("The new password must be at least 8 characters long.");
            }
        }

        jdbcTemplate.update("UPDATE users SET full_name = ? WHERE id = ?", fullName, userId);
        if (hasPasswordChange) {
            jdbcTemplate.update(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                passwordEncoder.encode(newPassword),
                userId
            );
        }

        if (hasAvatarUpdate) {
            var previousAvatarObjectKey = loadCurrentUserAvatarObjectKey(userId);
            jdbcTemplate.update(
                """
                    INSERT INTO user_profiles
                    (user_id, full_name, phone, country, preferred_language, avatar_url, avatar_object_key, avatar_content_type, avatar_updated_at)
                    VALUES (?, ?, ?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP)
                    ON DUPLICATE KEY UPDATE
                        full_name = VALUES(full_name),
                        phone = VALUES(phone),
                        country = VALUES(country),
                        preferred_language = VALUES(preferred_language),
                        avatar_url = VALUES(avatar_url),
                        avatar_object_key = VALUES(avatar_object_key),
                        avatar_content_type = VALUES(avatar_content_type),
                        avatar_updated_at = VALUES(avatar_updated_at)
                    """,
                userId,
                fullName,
                nullable(phone),
                nullable(country),
                preferredLanguage,
                nullable(avatarObjectKey),
                nullable(avatarContentType)
            );
            if (!previousAvatarObjectKey.isBlank() && !previousAvatarObjectKey.equals(avatarObjectKey)) {
                deleteProfileAvatarObjectQuietly(previousAvatarObjectKey);
            }
        } else {
            jdbcTemplate.update(
                """
                    INSERT INTO user_profiles (user_id, full_name, phone, country, preferred_language)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        full_name = VALUES(full_name),
                        phone = VALUES(phone),
                        country = VALUES(country),
                        preferred_language = VALUES(preferred_language)
                    """,
                userId,
                fullName,
                nullable(phone),
                nullable(country),
                preferredLanguage
            );
        }

        return getCurrentUser(userId, currentRole);
    }

    @Transactional
    public Map<String, Object> updateUser(long companyId, long userId, Map<String, Object> payload) {
        var role = normalizeRole(value(payload, "role"));
        var status = normalizeStatus(value(payload, "status"));
        var moduleSlugs = normalizeModuleSlugs(payload.get("module_slugs"));

        var rows = jdbcTemplate.query(
            """
                SELECT uc.id AS user_company_id
                FROM user_companies uc
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("user_company_id"),
            userId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("User not found.");
        }

        var userCompanyId = rows.getFirst();
        jdbcTemplate.update(
            "UPDATE user_companies SET role = ?, status = ? WHERE id = ?",
            role,
            status,
            userCompanyId
        );

        jdbcTemplate.update("DELETE FROM user_company_module_roles WHERE user_company_id = ?", userCompanyId);
        for (var slug : moduleSlugs) {
            jdbcTemplate.update(
                "INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level) VALUES (?, ?, 'viewer', 0)",
                userCompanyId,
                slug
            );
        }

        return Map.of("success", true);
    }

    @Transactional
    public Map<String, Object> inviteUser(long companyId, long invitedByUserId, Map<String, Object> payload) {
        var fullName = value(payload, "name", "full_name", "nombre");
        var email = normalizeEmail(value(payload, "email"));
        var role = normalizeRole(value(payload, "role"));

        if (fullName.isBlank() || email.isBlank()) {
            throw new IllegalArgumentException("Name and email are required.");
        }

        ensureEmailNotUsedInCompany(companyId, email, null);

        var token = UUID.randomUUID().toString().replace("-", "");
        var expiresAt = LocalDateTime.now().plusDays(7);

        jdbcTemplate.update(
            """
                INSERT INTO user_invitations (company_id, email, full_name, role, module_slugs_json, token, status, invited_by, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
            companyId,
            email,
            fullName,
            role,
            "[]",
            token,
            invitedByUserId,
            expiresAt
        );

        return Map.of(
            "email", email,
            "full_name", fullName,
            "token", token
        );
    }

    @Transactional
    public Map<String, Object> resendInvitation(long companyId, long invitationId, Map<String, Object> payload) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, email, COALESCE(full_name, '') AS full_name
                FROM user_invitations
                WHERE id = ?
                  AND company_id = ?
                  AND COALESCE(status, 'pending') = 'pending'
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var invitation = new LinkedHashMap<String, Object>();
                invitation.put("id", rs.getLong("id"));
                invitation.put("email", safe(rs.getString("email")));
                invitation.put("full_name", safe(rs.getString("full_name")));
                return invitation;
            },
            invitationId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Invitation not found.");
        }

        var stored = rows.getFirst();
        var newEmail = normalizeEmail(value(payload, "email"));
        var finalEmail = newEmail.isBlank() ? String.valueOf(stored.get("email")) : newEmail;

        ensureEmailNotUsedInCompany(companyId, finalEmail, invitationId);

        var token = UUID.randomUUID().toString().replace("-", "");
        var expiresAt = LocalDateTime.now().plusDays(7);

        jdbcTemplate.update(
            """
                UPDATE user_invitations
                SET email = ?, token = ?, expires_at = ?, status = 'pending'
                WHERE id = ? AND company_id = ?
                """,
            finalEmail,
            token,
            expiresAt,
            invitationId,
            companyId
        );

        return Map.of(
            "email", finalEmail,
            "full_name", String.valueOf(stored.get("full_name")),
            "token", token
        );
    }

    @Transactional
    public Map<String, Object> saveStructure(long companyId, long userId, Map<String, Object> payload) {
        var estructura = value(payload, "modo", "estructura");
        if (!"multi".equals(estructura)) {
            estructura = "simple";
        }

        var map = normalizeMap(payload);

        persistStructure(companyId, userId, map);

        var settingsRoot = loadSettingsRoot(companyId);
        var configCenterNode = ensureConfigCenterNode(settingsRoot);
        configCenterNode.put("estructura", estructura);
        configCenterNode.put("colaboradores", resolveCollaborators(companyId, readOptionalInt(configCenterNode, "colaboradores")));
        configCenterNode.set("map", buildStoredMapNode(map, configCenterNode.path("map")));
        upsertSettingsRoot(companyId, settingsRoot);

        var response = new LinkedHashMap<String, Object>();
        response.put("modo", estructura);
        response.put("colaboradores", resolveCollaborators(companyId, readOptionalInt(configCenterNode, "colaboradores")));
        response.put("unidades_aprox", map.size());
        response.put("map", normalizeStoredMap(configCenterNode.path("map")));
        return response;
    }

    @Transactional
    public Map<String, Object> saveEmpresa(long companyId, long userId, Map<String, Object> payload) {
        var name = value(payload, "nombre_empresa");
        if (!name.isBlank()) {
            jdbcTemplate.update("UPDATE companies SET name = ? WHERE id = ?", name, companyId);
        }

        var settingsRoot = loadSettingsRoot(companyId);
        var configCenterNode = ensureConfigCenterNode(settingsRoot);
        var empresaTemplateNode = ensureObjectNode(configCenterNode, "empresa_template");

        if (hasAnyKey(payload, "logo_url", "logoUrl", "logo")) {
            empresaTemplateNode.put("logo", value(payload, "logo_url", "logoUrl", "logo"));
        }
        empresaTemplateNode.put("industria", value(payload, "industria"));
        empresaTemplateNode.put("modelo_negocio", value(payload, "modelo_negocio"));
        empresaTemplateNode.put("descripcion", value(payload, "descripcion"));
        empresaTemplateNode.put("currency", value(payload, "moneda"));
        empresaTemplateNode.put("timezone", value(payload, "zona_horaria", "tz"));
        empresaTemplateNode.put("tamano_empresa", value(payload, "tamano_empresa"));
        if (!name.isBlank()) {
            empresaTemplateNode.put("display_name", name);
        }
        CoordinateInput companyCoordinates = null;
        var hasCompanyCoordinatePayload = hasCoordinatePayload(payload);
        var hasHeadquartersLocationPayload = hasHeadquartersLocationPayload(payload);
        if (hasHeadquartersLocationPayload) {
            var headquartersLocation = normalizeHeadquartersLocationInput(payload);
            companyCoordinates = headquartersLocation.coordinates();
            hasCompanyCoordinatePayload = headquartersLocation.hasCoordinatePayload();
            putHeadquartersLocationInput(empresaTemplateNode, headquartersLocation);
        }

        if (!configCenterNode.hasNonNull("estructura")) {
            configCenterNode.put("estructura", buildStructureMap(companyId).isEmpty() ? "simple" : "multi");
        }
        if (!configCenterNode.has("map")) {
            configCenterNode.set("map", objectMapper.valueToTree(buildStructureMap(companyId)));
        }
        configCenterNode.put("tamano_empresa", value(payload, "tamano_empresa"));

        upsertSettingsRoot(companyId, settingsRoot);
        if (hasCompanyCoordinatePayload) {
            if (booleanValue(payload, true, "sync_company_location", "syncCompanyLocation")) {
                syncCompanyStructureAttendanceLocation(companyId, userId, name, companyCoordinates);
            } else {
                deactivateCompanyStructureAttendanceLocation(companyId);
            }
        }

        var data = new LinkedHashMap<String, Object>();
        data.put("nombre_empresa", name);
        data.put("logo_url", value(payload, "logo_url", "logoUrl", "logo"));
        data.put("industria", value(payload, "industria"));
        data.put("descripcion", value(payload, "descripcion"));
        data.put("tamano_empresa", value(payload, "tamano_empresa"));
        data.put("modelo_negocio", value(payload, "modelo_negocio"));
        data.put("moneda", value(payload, "moneda"));
        data.put("zona_horaria", value(payload, "zona_horaria", "tz"));
        putIfPresent(data, "latitude", readOptionalDecimal(payload, "latitude", "latitud"));
        putIfPresent(data, "longitude", readOptionalDecimal(payload, "longitude", "longitud", "lng"));
        putIfPresent(data, "radius_meters", readOptionalInteger(payload, "radius_meters", "radiusMeters", "radius", "radio"));
        putIfPresent(data, "coordinate_source", firstNonBlank(
            objectString(payload, "coordinate_source", "coordinateSource"),
            objectString(payload, "source")
        ));
        putIfPresent(data, "google_maps_url", objectString(payload, "google_maps_url", "googleMapsUrl", "map_url", "mapUrl"));
        if (hasHeadquartersLocationPayload) {
            var savedLocation = normalizeEmpresaTemplate(empresaTemplateNode).get(HEADQUARTERS_LOCATION_KEY);
            if (savedLocation instanceof Map<?, ?> savedLocationMap) {
                putIfPresent(data, HEADQUARTERS_LOCATION_KEY, savedLocationMap);
                putIfPresent(data, ADDRESS_KEY, savedLocationMap.get(ADDRESS_KEY));
                putIfPresent(data, "latitude", savedLocationMap.get("latitude"));
                putIfPresent(data, "longitude", savedLocationMap.get("longitude"));
                putIfPresent(data, "radius_meters", savedLocationMap.get("radius_meters"));
                putIfPresent(data, "coordinate_source", savedLocationMap.get("coordinate_source"));
                putIfPresent(data, "google_maps_url", savedLocationMap.get("google_maps_url"));
            }
        }
        return data;
    }

    private void persistStructure(long companyId, long userId, List<UnitInput> desiredUnits) {
        var existingUnits = loadExistingUnits(companyId);
        var existingBusinesses = loadExistingBusinesses(companyId);

        var existingUnitsById = new LinkedHashMap<Long, ExistingUnit>();
        var existingUnitsByName = new LinkedHashMap<String, ExistingUnit>();
        for (var unit : existingUnits) {
            existingUnitsById.put(unit.id(), unit);
            existingUnitsByName.put(normalizeKey(unit.name()), unit);
        }

        var existingBusinessesById = new LinkedHashMap<Long, ExistingBusiness>();
        var existingBusinessesByKey = new LinkedHashMap<String, ExistingBusiness>();
        for (var business : existingBusinesses) {
            existingBusinessesById.put(business.id(), business);
            existingBusinessesByKey.put(
                normalizeKey(business.name()) + "::" + String.valueOf(business.unitId()),
                business
            );
        }

        var keptUnitIds = new LinkedHashSet<Long>();
        var keptBusinessIds = new LinkedHashSet<Long>();

        for (var desiredUnit : desiredUnits) {
            var unitId = matchUnitId(desiredUnit, existingUnitsById, existingUnitsByName);
            if (unitId == null) {
                jdbcTemplate.update(
                    "INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')",
                    companyId,
                    desiredUnit.name()
                );
                unitId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
            } else {
                jdbcTemplate.update(
                    "UPDATE units SET name = ?, status = 'active' WHERE id = ? AND company_id = ?",
                    desiredUnit.name(),
                    unitId,
                    companyId
                );
            }

            keptUnitIds.add(unitId);

            for (var desiredBusiness : desiredUnit.businesses()) {
                var businessId = matchBusinessId(desiredBusiness, unitId, existingBusinessesById, existingBusinessesByKey);
                var coordinates = desiredBusiness.coordinates();
                if (businessId == null) {
                    jdbcTemplate.update(
                        """
                            INSERT INTO businesses
                            (company_id, unit_id, name, address, latitude, longitude, radius_meters, coordinate_source, google_maps_url, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
                            """,
                        companyId,
                        unitId,
                        desiredBusiness.name(),
                        nullableText(desiredBusiness.direccion()),
                        coordinateLatitude(coordinates),
                        coordinateLongitude(coordinates),
                        coordinateRadius(coordinates),
                        coordinateSource(coordinates),
                        nullableText(coordinates == null ? "" : coordinates.googleMapsUrl())
                    );
                    businessId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
                } else {
                    jdbcTemplate.update(
                        """
                            UPDATE businesses
                            SET name = ?,
                                unit_id = ?,
                                address = ?,
                                latitude = ?,
                                longitude = ?,
                                radius_meters = ?,
                                coordinate_source = ?,
                                google_maps_url = ?,
                                status = 'active'
                            WHERE id = ? AND company_id = ?
                            """,
                        desiredBusiness.name(),
                        unitId,
                        nullableText(desiredBusiness.direccion()),
                        coordinateLatitude(coordinates),
                        coordinateLongitude(coordinates),
                        coordinateRadius(coordinates),
                        coordinateSource(coordinates),
                        nullableText(coordinates == null ? "" : coordinates.googleMapsUrl()),
                        businessId,
                        companyId
                    );
                }

                keptBusinessIds.add(businessId);
                syncBusinessStructureAttendanceLocation(companyId, userId, unitId, businessId, desiredBusiness);
            }
        }

        for (var business : existingBusinesses) {
            if (!keptBusinessIds.contains(business.id())) {
                deactivateBusinessStructureAttendanceLocation(companyId, business.id());
                jdbcTemplate.update("DELETE FROM businesses WHERE id = ? AND company_id = ?", business.id(), companyId);
            }
        }

        for (var unit : existingUnits) {
            if (!keptUnitIds.contains(unit.id())) {
                jdbcTemplate.update("DELETE FROM units WHERE id = ? AND company_id = ?", unit.id(), companyId);
            }
        }
    }

    private List<ExistingUnit> loadExistingUnits(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, name
                FROM units
                WHERE company_id = ?
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new ExistingUnit(
                rs.getLong("id"),
                safe(rs.getString("name"))
            ),
            companyId
        );
    }

    private List<ExistingBusiness> loadExistingBusinesses(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       unit_id,
                       name,
                       latitude,
                       longitude,
                       radius_meters,
                       coordinate_source,
                       google_maps_url
                FROM businesses
                WHERE company_id = ?
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new ExistingBusiness(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                getNullableInt(rs, "radius_meters"),
                safe(rs.getString("coordinate_source")),
                safe(rs.getString("google_maps_url"))
            ),
            companyId
        );
    }

    private Long matchUnitId(
        UnitInput desiredUnit,
        Map<Long, ExistingUnit> existingUnitsById,
        Map<String, ExistingUnit> existingUnitsByName
    ) {
        if (desiredUnit.legacyUnitId() != null && existingUnitsById.containsKey(desiredUnit.legacyUnitId())) {
            return desiredUnit.legacyUnitId();
        }

        var existingUnit = existingUnitsByName.get(normalizeKey(desiredUnit.name()));
        return existingUnit == null ? null : existingUnit.id();
    }

    private Long matchBusinessId(
        BusinessInput desiredBusiness,
        long unitId,
        Map<Long, ExistingBusiness> existingBusinessesById,
        Map<String, ExistingBusiness> existingBusinessesByKey
    ) {
        if (desiredBusiness.legacyBusinessId() != null && existingBusinessesById.containsKey(desiredBusiness.legacyBusinessId())) {
            return desiredBusiness.legacyBusinessId();
        }

        var existingBusiness = existingBusinessesByKey.get(normalizeKey(desiredBusiness.name()) + "::" + unitId);
        return existingBusiness == null ? null : existingBusiness.id();
    }

    private void syncBusinessStructureAttendanceLocation(
        long companyId,
        long userId,
        long unitId,
        long businessId,
        BusinessInput business
    ) {
        var coordinates = business.coordinates();
        if (coordinates == null || !coordinates.hasCoordinates()) {
            deactivateBusinessStructureAttendanceLocation(companyId, businessId);
            return;
        }

        var existingLocationId = findBusinessStructureAttendanceLocationId(companyId, businessId);
        if (existingLocationId == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO hr_attendance_locations
                    (company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude, radius_meters,
                     required_hours_per_day, required_start_time, required_end_time, required_days_per_week, status, managed_source, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'business_structure', ?)
                    """,
                companyId,
                unitId,
                businessId,
                LocalDate.of(1970, 1, 1),
                LocalDate.of(9999, 12, 31),
                business.name(),
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
                UPDATE hr_attendance_locations
                SET unit_id = ?,
                    business_id = ?,
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
            unitId,
            businessId,
            LocalDate.of(1970, 1, 1),
            LocalDate.of(9999, 12, 31),
            business.name(),
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

    private void syncCompanyStructureAttendanceLocation(
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
                    INSERT INTO hr_attendance_locations
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
                UPDATE hr_attendance_locations
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

    private Long findBusinessStructureAttendanceLocationId(long companyId, long businessId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM hr_attendance_locations
                WHERE company_id = ?
                  AND business_id = ?
                  AND managed_source = 'business_structure'
                ORDER BY id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId,
            businessId
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Long findCompanyStructureAttendanceLocationId(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM hr_attendance_locations
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
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private void deactivateBusinessStructureAttendanceLocation(long companyId, long businessId) {
        jdbcTemplate.update(
            """
                UPDATE hr_attendance_locations
                SET status = 'inactive'
                WHERE company_id = ?
                  AND business_id = ?
                  AND managed_source = 'business_structure'
                """,
            companyId,
            businessId
        );
    }

    private void deactivateCompanyStructureAttendanceLocation(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE hr_attendance_locations
                SET status = 'inactive'
                WHERE company_id = ?
                  AND business_id IS NULL
                  AND unit_id IS NULL
                  AND managed_source = 'business_structure'
                """,
            companyId
        );
    }

    private BigDecimal coordinateLatitude(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : coordinates.latitude();
    }

    private BigDecimal coordinateLongitude(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : coordinates.longitude();
    }

    private Integer coordinateRadius(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : coordinates.radiusMeters();
    }

    private String coordinateSource(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : firstNonBlank(coordinates.coordinateSource(), "manual");
    }

    private List<String> listModuleSlugs(long userCompanyId) {
        return jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ? ORDER BY module_slug ASC",
            (rs, rowNum) -> safe(rs.getString("module_slug")),
            userCompanyId
        );
    }

    private List<Map<String, Object>> buildStructureMap(long companyId) {
        var businessesByUnit = new LinkedHashMap<Long, List<Map<String, Object>>>();
        jdbcTemplate.query(
            """
                SELECT id,
                       unit_id,
                       name,
                       latitude,
                       longitude,
                       radius_meters,
                       coordinate_source,
                       google_maps_url
                FROM businesses
                WHERE company_id = ?
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY id ASC
                """,
            rs -> {
                var unitId = rs.getLong("unit_id");
                var business = new LinkedHashMap<String, Object>();
                business.put("name", safe(rs.getString("name")));
                business.put("legacy_business_id", rs.getLong("id"));
                putIfPresent(business, "latitude", rs.getBigDecimal("latitude"));
                putIfPresent(business, "longitude", rs.getBigDecimal("longitude"));
                putIfPresent(business, "radius_meters", getNullableInt(rs, "radius_meters"));
                putIfPresent(business, "coordinate_source", safe(rs.getString("coordinate_source")));
                putIfPresent(business, "google_maps_url", safe(rs.getString("google_maps_url")));
                businessesByUnit.computeIfAbsent(unitId, ignored -> new ArrayList<>()).add(business);
            },
            companyId
        );

        return jdbcTemplate.query(
            """
                SELECT id, name
                FROM units
                WHERE company_id = ?
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY id ASC
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("name", safe(rs.getString("name")));
                row.put("legacy_unit_id", rs.getLong("id"));
                row.put("businesses", businessesByUnit.getOrDefault(rs.getLong("id"), List.of()));
                return row;
            },
            companyId
        );
    }

    private List<Map<String, Object>> normalizeStoredMap(JsonNode mapNode) {
        var normalizedMap = new ArrayList<Map<String, Object>>();
        if (!mapNode.isArray()) {
            return normalizedMap;
        }

        for (var unitNode : mapNode) {
            var name = firstNonBlank(
                readOptionalText(unitNode, "name"),
                readOptionalText(unitNode.path("unit_profile"), "display_name")
            );

            if (name.isBlank()) {
                continue;
            }

            var unit = new LinkedHashMap<String, Object>();
            unit.put("name", name);
            putIfPresent(unit, "legacy_unit_id", readOptionalLong(unitNode, "legacy_unit_id", "os_unit_id", "id"));
            putIfPresent(unit, "logo", firstNonBlank(
                readOptionalText(unitNode, "logo"),
                readOptionalText(unitNode.path("unit_profile"), "photo")
            ));
            putIfPresent(unit, "industria", firstNonBlank(
                readOptionalText(unitNode, "industria"),
                readOptionalText(unitNode.path("unit_profile"), "industria")
            ));
            putIfPresent(unit, "direccion", firstNonBlank(
                readOptionalText(unitNode, "direccion"),
                readOptionalText(unitNode.path("unit_profile"), "address")
            ));
            putIfPresent(unit, "ciudad", readOptionalText(unitNode, "ciudad"));
            putIfPresent(unit, "estado", readOptionalText(unitNode, "estado"));
            putIfPresent(unit, "pais", readOptionalText(unitNode, "pais"));
            putIfPresent(unit, "cp", readOptionalText(unitNode, "cp"));
            putIfPresent(unit, "telefono", firstNonBlank(
                readOptionalText(unitNode, "telefono"),
                readOptionalText(unitNode.path("unit_profile"), "phone")
            ));
            putIfPresent(unit, "email", firstNonBlank(
                readOptionalText(unitNode, "email"),
                readOptionalText(unitNode.path("unit_profile"), "email")
            ));
            putCoordinateFields(unit, unitNode);

            var businesses = new ArrayList<Map<String, Object>>();
            if (unitNode.path("businesses").isArray()) {
                for (var businessNode : unitNode.path("businesses")) {
                    var businessName = firstNonBlank(
                        readOptionalText(businessNode, "name"),
                        readOptionalText(businessNode.path("biz_profile"), "display_name")
                    );
                    if (businessName.isBlank()) {
                        continue;
                    }

                    var business = new LinkedHashMap<String, Object>();
                    business.put("name", businessName);
                    putIfPresent(business, "legacy_business_id", readOptionalLong(businessNode, "legacy_business_id", "os_business_id", "id"));
                    putIfPresent(business, "logo", firstNonBlank(
                        readOptionalText(businessNode, "logo"),
                        readOptionalText(businessNode.path("biz_profile"), "photo")
                    ));
                    putIfPresent(business, "industria", firstNonBlank(
                        readOptionalText(businessNode, "industria"),
                        readOptionalText(businessNode.path("biz_profile"), "industria")
                    ));
                    putIfPresent(business, "direccion", firstNonBlank(
                        readOptionalText(businessNode, "direccion"),
                        readOptionalText(businessNode.path("biz_profile"), "address")
                    ));
                    putIfPresent(business, "ciudad", readOptionalText(businessNode, "ciudad"));
                    putIfPresent(business, "estado", readOptionalText(businessNode, "estado"));
                    putIfPresent(business, "pais", readOptionalText(businessNode, "pais"));
                    putIfPresent(business, "cp", readOptionalText(businessNode, "cp"));
                    putIfPresent(business, "telefono", firstNonBlank(
                        readOptionalText(businessNode, "telefono"),
                        readOptionalText(businessNode.path("biz_profile"), "phone")
                    ));
                    putIfPresent(business, "email", firstNonBlank(
                        readOptionalText(businessNode, "email"),
                        readOptionalText(businessNode.path("biz_profile"), "email")
                    ));
                    putIfPresent(business, "gerente", readOptionalText(businessNode, "gerente"));
                    putIfPresent(business, "horario", readOptionalText(businessNode, "horario"));
                    putCoordinateFields(business, businessNode);
                    businesses.add(business);
                }
            }

            unit.put("businesses", businesses);
            normalizedMap.add(unit);
        }

        return normalizedMap;
    }

    private ArrayNode buildStoredMapNode(List<UnitInput> desiredUnits, JsonNode existingMapNode) {
        var storedMap = objectMapper.createArrayNode();
        var existingUnitsById = new LinkedHashMap<Long, ObjectNode>();
        var existingUnitsByName = new LinkedHashMap<String, ObjectNode>();

        if (existingMapNode.isArray()) {
            for (var existingUnit : existingMapNode) {
                if (!(existingUnit instanceof ObjectNode existingUnitObject)) {
                    continue;
                }
                var existingUnitId = readOptionalLong(existingUnit, "legacy_unit_id", "os_unit_id", "id");
                if (existingUnitId != null) {
                    existingUnitsById.put(existingUnitId, existingUnitObject);
                }
                var existingName = firstNonBlank(
                    readOptionalText(existingUnit, "name"),
                    readOptionalText(existingUnit.path("unit_profile"), "display_name")
                );
                if (!existingName.isBlank()) {
                    existingUnitsByName.put(normalizeKey(existingName), existingUnitObject);
                }
            }
        }

        for (var desiredUnit : desiredUnits) {
            var baseUnit = findStoredUnitNode(desiredUnit, existingUnitsById, existingUnitsByName);
            var storedUnit = baseUnit == null ? objectMapper.createObjectNode() : baseUnit.deepCopy();

            var mergedLegacyUnitId = desiredUnit.legacyUnitId() != null
                ? desiredUnit.legacyUnitId()
                : readOptionalLong(storedUnit, "legacy_unit_id", "os_unit_id", "id");

            storedUnit.put("name", desiredUnit.name());
            putText(storedUnit, "logo", desiredUnit.logo());
            putText(storedUnit, "industria", desiredUnit.industria());
            putText(storedUnit, "direccion", desiredUnit.direccion());
            putText(storedUnit, "ciudad", desiredUnit.ciudad());
            putText(storedUnit, "estado", desiredUnit.estado());
            putText(storedUnit, "pais", desiredUnit.pais());
            putText(storedUnit, "cp", desiredUnit.cp());
            putText(storedUnit, "telefono", desiredUnit.telefono());
            putText(storedUnit, "email", desiredUnit.email());
            putCoordinateInput(storedUnit, desiredUnit.coordinates());
            if (mergedLegacyUnitId != null) {
                storedUnit.put("legacy_unit_id", mergedLegacyUnitId);
            }

            var storedBusinesses = objectMapper.createArrayNode();
            var existingBusinessesNode = baseUnit == null ? objectMapper.createArrayNode() : ensureArrayNode(baseUnit, "businesses");
            var existingBusinessesById = new LinkedHashMap<Long, ObjectNode>();
            var existingBusinessesByName = new LinkedHashMap<String, ObjectNode>();
            for (var existingBusiness : existingBusinessesNode) {
                if (!(existingBusiness instanceof ObjectNode existingBusinessObject)) {
                    continue;
                }
                var existingBusinessId = readOptionalLong(existingBusiness, "legacy_business_id", "os_business_id", "id");
                if (existingBusinessId != null) {
                    existingBusinessesById.put(existingBusinessId, existingBusinessObject);
                }
                var existingBusinessName = firstNonBlank(
                    readOptionalText(existingBusiness, "name"),
                    readOptionalText(existingBusiness.path("biz_profile"), "display_name")
                );
                if (!existingBusinessName.isBlank()) {
                    existingBusinessesByName.put(normalizeKey(existingBusinessName), existingBusinessObject);
                }
            }

            for (var desiredBusiness : desiredUnit.businesses()) {
                var baseBusiness = findStoredBusinessNode(desiredBusiness, existingBusinessesById, existingBusinessesByName);
                var storedBusiness = baseBusiness == null ? objectMapper.createObjectNode() : baseBusiness.deepCopy();

                var mergedLegacyBusinessId = desiredBusiness.legacyBusinessId() != null
                    ? desiredBusiness.legacyBusinessId()
                    : readOptionalLong(storedBusiness, "legacy_business_id", "os_business_id", "id");

                storedBusiness.put("name", desiredBusiness.name());
                putText(storedBusiness, "logo", desiredBusiness.logo());
                putText(storedBusiness, "industria", desiredBusiness.industria());
                putText(storedBusiness, "direccion", desiredBusiness.direccion());
                putText(storedBusiness, "ciudad", desiredBusiness.ciudad());
                putText(storedBusiness, "estado", desiredBusiness.estado());
                putText(storedBusiness, "pais", desiredBusiness.pais());
                putText(storedBusiness, "cp", desiredBusiness.cp());
                putText(storedBusiness, "telefono", desiredBusiness.telefono());
                putText(storedBusiness, "email", desiredBusiness.email());
                putText(storedBusiness, "gerente", desiredBusiness.gerente());
                putText(storedBusiness, "horario", desiredBusiness.horario());
                putCoordinateInput(storedBusiness, desiredBusiness.coordinates());
                if (mergedLegacyBusinessId != null) {
                    storedBusiness.put("legacy_business_id", mergedLegacyBusinessId);
                }

                storedBusinesses.add(storedBusiness);
            }

            storedUnit.set("businesses", storedBusinesses);
            storedMap.add(storedUnit);
        }

        return storedMap;
    }

    private ObjectNode findStoredUnitNode(
        UnitInput desiredUnit,
        Map<Long, ObjectNode> existingUnitsById,
        Map<String, ObjectNode> existingUnitsByName
    ) {
        if (desiredUnit.legacyUnitId() != null && existingUnitsById.containsKey(desiredUnit.legacyUnitId())) {
            return existingUnitsById.get(desiredUnit.legacyUnitId());
        }

        return existingUnitsByName.get(normalizeKey(desiredUnit.name()));
    }

    private ObjectNode findStoredBusinessNode(
        BusinessInput desiredBusiness,
        Map<Long, ObjectNode> existingBusinessesById,
        Map<String, ObjectNode> existingBusinessesByName
    ) {
        if (desiredBusiness.legacyBusinessId() != null && existingBusinessesById.containsKey(desiredBusiness.legacyBusinessId())) {
            return existingBusinessesById.get(desiredBusiness.legacyBusinessId());
        }

        return existingBusinessesByName.get(normalizeKey(desiredBusiness.name()));
    }

    private Map<String, Object> normalizeEmpresaTemplate(JsonNode templateNode) {
        var template = new LinkedHashMap<String, Object>();
        putIfPresent(template, "logo", readOptionalText(templateNode, "logo", "logo_url"));
        putIfPresent(template, "industria", readOptionalText(templateNode, "industria"));
        putIfPresent(template, "modelo_negocio", readOptionalText(templateNode, "modelo_negocio"));
        putIfPresent(template, "descripcion", readOptionalText(templateNode, "descripcion"));
        putIfPresent(template, "currency", firstNonBlank(
            readOptionalText(templateNode, "currency"),
            readOptionalText(templateNode, "moneda")
        ));
        putIfPresent(template, "timezone", firstNonBlank(
            readOptionalText(templateNode, "timezone"),
            readOptionalText(templateNode, "zona_horaria")
        ));
        putIfPresent(template, "tamano_empresa", readOptionalText(templateNode, "tamano_empresa"));
        putIfPresent(template, "display_name", readOptionalText(templateNode, "display_name"));
        var headquartersLocation = normalizeHeadquartersLocation(templateNode);
        if (headquartersLocation.isEmpty()) {
            putCoordinateFields(template, templateNode);
        } else {
            putIfPresent(template, HEADQUARTERS_LOCATION_KEY, headquartersLocation);
            putIfPresent(template, ADDRESS_KEY, headquartersLocation.get(ADDRESS_KEY));
            putIfPresent(template, "latitude", headquartersLocation.get("latitude"));
            putIfPresent(template, "longitude", headquartersLocation.get("longitude"));
            putIfPresent(template, "radius_meters", headquartersLocation.get("radius_meters"));
            putIfPresent(template, "coordinate_source", headquartersLocation.get("coordinate_source"));
            putIfPresent(template, "google_maps_url", headquartersLocation.get("google_maps_url"));
        }
        return template;
    }

    private Map<String, Object> normalizeHeadquartersLocation(JsonNode templateNode) {
        var location = new LinkedHashMap<String, Object>();
        if (templateNode == null || templateNode.isMissingNode() || templateNode.isNull()) {
            return location;
        }

        var locationNode = templateNode.path(HEADQUARTERS_LOCATION_KEY);

        putCoordinateFields(location, templateNode);
        if (locationNode.isObject()) {
            putCoordinateFields(location, locationNode);
        }

        var address = normalizeHeadquartersAddress(templateNode, locationNode);
        if (!address.isEmpty()) {
            location.put(ADDRESS_KEY, address);
        }

        return location;
    }

    private Map<String, Object> normalizeHeadquartersAddress(JsonNode templateNode, JsonNode locationNode) {
        var address = new LinkedHashMap<String, Object>();
        addHeadquartersAddressFields(address, templateNode);

        var rootAddressNode = templateNode == null ? null : templateNode.path(ADDRESS_KEY);
        if (rootAddressNode != null && rootAddressNode.isObject()) {
            addHeadquartersAddressFields(address, rootAddressNode);
        } else if (rootAddressNode != null && rootAddressNode.isTextual()) {
            putIfPresent(address, "street", rootAddressNode.asText("").trim());
        }

        if (locationNode != null && locationNode.isObject()) {
            addHeadquartersAddressFields(address, locationNode);
            var locationAddressNode = locationNode.path(ADDRESS_KEY);
            if (locationAddressNode.isObject()) {
                addHeadquartersAddressFields(address, locationAddressNode);
            } else if (locationAddressNode.isTextual()) {
                putIfPresent(address, "street", locationAddressNode.asText("").trim());
            }
        }

        return address;
    }

    private void addHeadquartersAddressFields(Map<String, Object> address, JsonNode sourceNode) {
        if (sourceNode == null || sourceNode.isMissingNode() || sourceNode.isNull()) {
            return;
        }

        putIfPresent(address, "street", readOptionalText(sourceNode, "street", "address_line", "addressLine", "direccion"));
        putIfPresent(address, "country", readOptionalText(sourceNode, "country", "pais"));
        putIfPresent(address, "state", readOptionalText(sourceNode, "state", "province", "state_province", "stateProvince", "estado"));
        putIfPresent(address, "city", readOptionalText(sourceNode, "city", "ciudad"));
        putIfPresent(address, "zip", readOptionalText(sourceNode, "zip", "postal_code", "postalCode", "cp"));
    }

    private ObjectNode loadSettingsRoot(long companyId) {
        var rows = jdbcTemplate.query(
            "SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("settings_json"),
            companyId
        );

        if (rows.isEmpty() || rows.getFirst() == null || rows.getFirst().isBlank()) {
            return objectMapper.createObjectNode();
        }

        try {
            var node = objectMapper.readTree(rows.getFirst());
            if (node instanceof ObjectNode objectNode) {
                return objectNode.deepCopy();
            }
        } catch (JsonProcessingException ignored) {
            // fall through to empty object
        }

        return objectMapper.createObjectNode();
    }

    private ObjectNode ensureConfigCenterNode(ObjectNode settingsRoot) {
        return ensureObjectNode(settingsRoot, CONFIG_CENTER_KEY);
    }

    private ObjectNode ensureObjectNode(ObjectNode parentNode, String fieldName) {
        var childNode = parentNode.get(fieldName);
        if (childNode instanceof ObjectNode objectNode) {
            return objectNode;
        }

        var objectNode = objectMapper.createObjectNode();
        parentNode.set(fieldName, objectNode);
        return objectNode;
    }

    private ArrayNode ensureArrayNode(JsonNode parentNode, String fieldName) {
        if (parentNode instanceof ObjectNode objectNode) {
            var childNode = objectNode.get(fieldName);
            if (childNode instanceof ArrayNode arrayNode) {
                return arrayNode;
            }
        }
        return objectMapper.createArrayNode();
    }

    private void upsertSettingsRoot(long companyId, ObjectNode settingsRoot) {
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO company_settings (company_id, settings_json)
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)
                    """,
                companyId,
                objectMapper.writeValueAsString(settingsRoot)
            );
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize company settings.", ex);
        }
    }

    private List<UnitInput> normalizeMap(Map<String, Object> payload) {
        var result = new ArrayList<UnitInput>();

        var rawMap = payload.get("map");
        if (rawMap instanceof List<?> mapList) {
            for (var unitCandidate : mapList) {
                if (!(unitCandidate instanceof Map<?, ?> unitMap)) {
                    continue;
                }

                var unit = normalizeUnitMap(unitMap);
                if (unit != null) {
                    result.add(unit);
                }
            }
        }

        if (!result.isEmpty()) {
            return result;
        }

        var rawUnits = payload.get("unidades");
        if (rawUnits instanceof List<?> unitsList) {
            for (var unitCandidate : unitsList) {
                if (!(unitCandidate instanceof Map<?, ?> unitMap)) {
                    continue;
                }

                var normalizedUnitMap = new LinkedHashMap<String, Object>();
                normalizedUnitMap.put("name", unitMap.get("nombre"));
                normalizedUnitMap.put("legacy_unit_id", unitMap.get("legacy_unit_id"));
                normalizedUnitMap.put("logo", unitMap.get("logo"));
                normalizedUnitMap.put("industria", unitMap.get("industria"));
                normalizedUnitMap.put("direccion", unitMap.get("direccion"));
                normalizedUnitMap.put("ciudad", unitMap.get("ciudad"));
                normalizedUnitMap.put("estado", unitMap.get("estado"));
                normalizedUnitMap.put("pais", unitMap.get("pais"));
                normalizedUnitMap.put("cp", unitMap.get("cp"));
                normalizedUnitMap.put("telefono", unitMap.get("telefono"));
                normalizedUnitMap.put("email", unitMap.get("email"));
                normalizedUnitMap.put("latitude", firstNonNull(unitMap.get("latitude"), unitMap.get("latitud")));
                normalizedUnitMap.put("longitude", firstNonNull(unitMap.get("longitude"), unitMap.get("longitud"), unitMap.get("lng")));
                normalizedUnitMap.put("radius_meters", firstNonNull(unitMap.get("radius_meters"), unitMap.get("radiusMeters"), unitMap.get("radio")));
                normalizedUnitMap.put("coordinate_source", firstNonNull(unitMap.get("coordinate_source"), unitMap.get("coordinateSource"), unitMap.get("source")));
                normalizedUnitMap.put("google_maps_url", firstNonNull(unitMap.get("google_maps_url"), unitMap.get("googleMapsUrl"), unitMap.get("map_url"), unitMap.get("mapUrl")));
                normalizedUnitMap.put("businesses", unitMap.get("negocios"));

                var unit = normalizeUnitMap(normalizedUnitMap);
                if (unit != null) {
                    result.add(unit);
                }
            }
        }

        return result;
    }

    private UnitInput normalizeUnitMap(Map<?, ?> unitMap) {
        var name = firstNonBlank(
            safe(objectString(unitMap.get("name"))),
            safe(objectString(unitMap.get("nombre")))
        );
        if (name.isBlank()) {
            return null;
        }

        var businesses = new ArrayList<BusinessInput>();
        var rawBusinesses = unitMap.get("businesses");
        if (!(rawBusinesses instanceof List<?>)) {
            rawBusinesses = unitMap.get("negocios");
        }

        if (rawBusinesses instanceof List<?> businessList) {
            for (var businessCandidate : businessList) {
                var business = normalizeBusinessInput(businessCandidate);
                if (business != null) {
                    businesses.add(business);
                }
            }
        }

        return new UnitInput(
            name,
            readOptionalLong(unitMap, "legacy_unit_id", "os_unit_id", "id"),
            objectString(unitMap.get("logo")),
            objectString(unitMap.get("industria")),
            objectString(unitMap.get("direccion")),
            objectString(unitMap.get("ciudad")),
            objectString(unitMap.get("estado")),
            objectString(unitMap.get("pais")),
            objectString(unitMap.get("cp")),
            objectString(unitMap.get("telefono")),
            objectString(unitMap.get("email")),
            normalizeCoordinateInput(unitMap),
            businesses
        );
    }

    private BusinessInput normalizeBusinessInput(Object businessCandidate) {
        if (businessCandidate instanceof Map<?, ?> businessMap) {
            var name = firstNonBlank(
                safe(objectString(businessMap.get("name"))),
                safe(objectString(businessMap.get("nombre")))
            );
            if (name.isBlank()) {
                return null;
            }

            return new BusinessInput(
                name,
                readOptionalLong(businessMap, "legacy_business_id", "os_business_id", "id"),
                objectString(businessMap.get("logo")),
                objectString(businessMap.get("industria")),
                objectString(businessMap.get("direccion")),
                objectString(businessMap.get("ciudad")),
                objectString(businessMap.get("estado")),
                objectString(businessMap.get("pais")),
                objectString(businessMap.get("cp")),
                objectString(businessMap.get("telefono")),
                objectString(businessMap.get("email")),
                objectString(businessMap.get("gerente")),
                objectString(businessMap.get("horario")),
                normalizeCoordinateInput(businessMap)
            );
        }

        var businessName = safe(objectString(businessCandidate));
        if (businessName.isBlank()) {
            return null;
        }

        return new BusinessInput(
            businessName,
            null,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            new CoordinateInput(null, null, null, "", "")
        );
    }

    private int resolveCollaborators(long companyId, Integer storedCollaborators) {
        if (storedCollaborators != null && storedCollaborators > 0) {
            return storedCollaborators;
        }

        var totalEmployees = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employees WHERE company_id = ?",
            Integer.class,
            companyId
        );
        return totalEmployees == null ? 0 : totalEmployees;
    }

    private String value(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value instanceof String string) {
                return string.trim();
            }
        }
        return "";
    }

    private boolean booleanValue(Map<String, Object> payload, boolean defaultValue, String... keys) {
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

    private boolean hasAnyKey(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    private Long parseLong(Map<String, Object> payload, String... keys) {
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

    private String normalizeProfileAvatarContentType(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(normalized)) {
            normalized = "image/jpeg";
        }

        if (!PROFILE_AVATAR_CONTENT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Profile photos must be JPG, PNG, or WebP images.");
        }
        return normalized;
    }

    private String buildCurrentUserAvatarObjectKey(long companyId, long userId, String contentType) {
        return currentUserAvatarPrefix(companyId, userId)
            + UUID.randomUUID().toString().replace("-", "")
            + extensionForProfileAvatarContentType(contentType);
    }

    private String normalizeCurrentUserAvatarObjectKey(long companyId, long userId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return "";
        }

        var normalized = objectKey.trim();
        if (!normalized.startsWith(currentUserAvatarPrefix(companyId, userId))) {
            throw new IllegalArgumentException("avatar_object_key must match the expected profile photo upload prefix.");
        }
        return normalized;
    }

    private String currentUserAvatarPrefix(long companyId, long userId) {
        return "config-center/user-profiles/" + companyId + "/" + userId + "/avatar/";
    }

    private String extensionForProfileAvatarContentType(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String loadCurrentUserAvatarObjectKey(long userId) {
        var rows = jdbcTemplate.query(
            "SELECT COALESCE(avatar_object_key, '') AS avatar_object_key FROM user_profiles WHERE user_id = ? LIMIT 1",
            (rs, rowNum) -> safe(rs.getString("avatar_object_key")),
            userId
        );
        return rows.isEmpty() ? "" : rows.getFirst();
    }

    private String signedProfileAvatarUrl(String objectKey) {
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

    private void deleteProfileAvatarObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }

        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Profile metadata should stay saved even if the replaced object is already gone.
        }
    }

    private String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }

    private List<String> normalizeModuleSlugs(Object rawValue) {
        var result = new ArrayList<String>();
        if (rawValue instanceof List<?> rawList) {
            for (var entry : rawList) {
                var slug = safe(objectString(entry));
                if (!slug.isBlank()) {
                    result.add(slug);
                }
            }
        }
        return result;
    }

    private List<String> parseStoredModuleSlugs(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }

        try {
            var node = objectMapper.readTree(rawJson);
            if (!node.isArray()) {
                return List.of();
            }

            var result = new ArrayList<String>();
            for (var item : node) {
                var slug = item.asText("").trim();
                if (!slug.isBlank()) {
                    result.add(slug);
                }
            }
            return result;
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private void ensureEmailNotUsedInCompany(long companyId, String email, Long invitationIdToIgnore) {
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

    private String normalizeEmail(String value) {
        return safe(value).trim().toLowerCase();
    }

    private String normalizeRole(String rawRole) {
        var normalized = safe(rawRole).trim().toLowerCase();
        return switch (normalized) {
            case "super admin", "superadmin", "root" -> "superadmin";
            case "admin", "owner", "manager" -> "admin";
            default -> "user";
        };
    }

    private String normalizeStatus(String rawStatus) {
        var normalized = safe(rawStatus).trim().toLowerCase();
        return switch (normalized) {
            case "inactive", "inactivo", "disabled" -> "inactive";
            case "pending" -> "pending";
            default -> "active";
        };
    }

    private String joinParts(String... values) {
        return java.util.Arrays.stream(values)
            .map(this::safe)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .reduce("", (left, right) -> left.isBlank() ? right : left + " " + right);
    }

    private String objectString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String objectString(Map<?, ?> values, String... fields) {
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

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String normalizeCountry(String value) {
        var normalized = safe(value).trim().toUpperCase(Locale.ROOT);
        if (normalized.length() != 2 || !normalized.chars().allMatch(Character::isLetter)) {
            return "";
        }
        return normalized;
    }

    private Object nullable(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private Object nullableText(String value) {
        return nullable(value);
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String normalizeKey(String value) {
        return safe(value).trim().toLowerCase();
    }

    private String firstNonBlank(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private Object firstNonNull(Object... values) {
        for (var value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String readOptionalText(JsonNode node, String... fields) {
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

    private Integer readOptionalInt(JsonNode node, String field) {
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

    private Long readOptionalLong(JsonNode node, String... fields) {
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

    private Long readOptionalLong(Map<?, ?> values, String... fields) {
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

    private BigDecimal readOptionalDecimal(JsonNode node, String... fields) {
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

    private BigDecimal readOptionalDecimal(Map<?, ?> values, String... fields) {
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

    private Integer readOptionalInteger(JsonNode node, String... fields) {
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

    private Integer readOptionalInteger(Map<?, ?> values, String... fields) {
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

    private boolean hasCoordinatePayload(Map<?, ?> values) {
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

    private boolean hasHeadquartersLocationPayload(Map<String, Object> payload) {
        if (hasCoordinatePayload(payload) || hasHeadquartersAddressPayload(payload)) {
            return true;
        }

        var locationPayload = nestedMap(payload, HEADQUARTERS_LOCATION_KEY, "headquartersLocation", "business_location", "businessLocation");
        return locationPayload != null && (hasCoordinatePayload(locationPayload) || hasHeadquartersAddressPayload(locationPayload));
    }

    private boolean hasHeadquartersAddressPayload(Map<?, ?> values) {
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

    private HeadquartersLocationInput normalizeHeadquartersLocationInput(Map<String, Object> payload) {
        var locationPayload = nestedMap(payload, HEADQUARTERS_LOCATION_KEY, "headquartersLocation", "business_location", "businessLocation");
        var sourcePayload = locationPayload == null ? payload : locationPayload;
        var hasCoordinatePayload = hasCoordinatePayload(sourcePayload);
        var coordinates = hasCoordinatePayload ? normalizeCoordinateInput(sourcePayload) : null;
        var address = normalizeHeadquartersAddressInput(payload, sourcePayload);

        return new HeadquartersLocationInput(coordinates, hasCoordinatePayload, address);
    }

    private HeadquartersAddressInput normalizeHeadquartersAddressInput(Map<String, Object> rootPayload, Map<?, ?> locationPayload) {
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

    private Map<?, ?> nestedMap(Map<?, ?> values, String... fields) {
        for (var field : fields) {
            var candidate = values.get(field);
            if (candidate instanceof Map<?, ?> nested) {
                return nested;
            }
        }
        return null;
    }

    private CoordinateInput normalizeCoordinateInput(Map<?, ?> values) {
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

    private void validateCoordinateRange(BigDecimal value, BigDecimal minimum, BigDecimal maximum, String label) {
        if (value.compareTo(minimum) < 0 || value.compareTo(maximum) > 0) {
            throw new IllegalArgumentException(label + " is outside the supported range.");
        }
    }

    private String normalizeCoordinateSource(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "google_maps_link", "google_maps", "maps_link" -> "google_maps_link";
            case "current_location", "device_location", "here" -> "current_location";
            case "manual" -> "manual";
            default -> "";
        };
    }

    private void putCoordinateFields(Map<String, Object> target, JsonNode sourceNode) {
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

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value == null) {
            return;
        }

        if (value instanceof String stringValue && stringValue.isBlank()) {
            return;
        }

        target.put(key, value);
    }

    private void putText(ObjectNode node, String fieldName, String value) {
        node.put(fieldName, safe(value));
    }

    private void putCoordinateInput(ObjectNode node, CoordinateInput coordinates) {
        if (coordinates == null || !coordinates.hasCoordinates()) {
            node.remove(List.of("latitude", "longitude", "radius_meters", "coordinate_source"));
            putOptionalText(node, "google_maps_url", coordinates == null ? "" : coordinates.googleMapsUrl());
            return;
        }

        putDecimal(node, "latitude", coordinates.latitude());
        putDecimal(node, "longitude", coordinates.longitude());
        putInteger(node, "radius_meters", coordinates.radiusMeters());
        putOptionalText(node, "coordinate_source", firstNonBlank(coordinates.coordinateSource(), "manual"));
        putOptionalText(node, "google_maps_url", coordinates.googleMapsUrl());
    }

    private void putHeadquartersLocationInput(ObjectNode templateNode, HeadquartersLocationInput location) {
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

    private void putHeadquartersAddressInput(ObjectNode node, HeadquartersAddressInput address) {
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

    private void putDecimal(ObjectNode node, String fieldName, BigDecimal value) {
        if (value == null) {
            node.remove(fieldName);
        } else {
            node.put(fieldName, value);
        }
    }

    private void putInteger(ObjectNode node, String fieldName, Integer value) {
        if (value == null) {
            node.remove(fieldName);
        } else {
            node.put(fieldName, value);
        }
    }

    private void putOptionalText(ObjectNode node, String fieldName, String value) {
        if (value == null || value.isBlank()) {
            node.remove(fieldName);
        } else {
            node.put(fieldName, value);
        }
    }

    private Long getNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Integer getNullableInt(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private NameParts splitFullName(String fullName) {
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

    private record NameParts(
        String firstName,
        String lastName
    ) {
    }

    private record UnitInput(
        String name,
        Long legacyUnitId,
        String logo,
        String industria,
        String direccion,
        String ciudad,
        String estado,
        String pais,
        String cp,
        String telefono,
        String email,
        CoordinateInput coordinates,
        List<BusinessInput> businesses
    ) {
    }

    private record BusinessInput(
        String name,
        Long legacyBusinessId,
        String logo,
        String industria,
        String direccion,
        String ciudad,
        String estado,
        String pais,
        String cp,
        String telefono,
        String email,
        String gerente,
        String horario,
        CoordinateInput coordinates
    ) {
    }

    private record HeadquartersLocationInput(
        CoordinateInput coordinates,
        boolean hasCoordinatePayload,
        HeadquartersAddressInput address
    ) {
    }

    private record HeadquartersAddressInput(
        String street,
        String country,
        String state,
        String city,
        String zip
    ) {
        private boolean isEmpty() {
            return safeText(street).isBlank()
                && safeText(country).isBlank()
                && safeText(state).isBlank()
                && safeText(city).isBlank()
                && safeText(zip).isBlank();
        }

        private static String safeText(String value) {
            return value == null ? "" : value.trim();
        }
    }

    private record CoordinateInput(
        BigDecimal latitude,
        BigDecimal longitude,
        Integer radiusMeters,
        String coordinateSource,
        String googleMapsUrl
    ) {
        private boolean hasCoordinates() {
            return latitude != null && longitude != null;
        }
    }

    private record ExistingUnit(
        Long id,
        String name
    ) {
    }

    private record ExistingBusiness(
        Long id,
        Long unitId,
        String name,
        BigDecimal latitude,
        BigDecimal longitude,
        Integer radiusMeters,
        String coordinateSource,
        String googleMapsUrl
    ) {
    }
}
