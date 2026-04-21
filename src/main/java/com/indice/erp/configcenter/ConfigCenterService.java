package com.indice.erp.configcenter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDateTime;
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

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;

    public ConfigCenterService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
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
        var storedMap = normalizeStoredMap(configCenterNode.path("map"));
        var map = storedMap.isEmpty() ? buildStructureMap(companyId) : storedMap;

        var estructura = firstNonBlank(
            readOptionalText(configCenterNode, "estructura"),
            map.isEmpty() ? "simple" : "multi"
        );

        var empresa = new LinkedHashMap<>(companyRows.getFirst());
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
                       COALESCE(p.avatar_url, '') AS avatar_url
                FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE u.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var fullName = safe(rs.getString("full_name"));
                var parsed = splitFullName(fullName);

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
                user.put("avatar_url", safe(rs.getString("avatar_url")));
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
                var user = new LinkedHashMap<String, Object>();
                user.put("id", rs.getLong("id"));
                user.put("user_company_id", rs.getLong("user_company_id"));
                user.put("apodo", null);
                user.put("nombres", name.firstName());
                user.put("apellidos", name.lastName());
                user.put("email", safe(rs.getString("email")));
                user.put("telefono", null);
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

    @Transactional
    public Map<String, Object> saveCurrentUser(long userId, String currentRole, Map<String, Object> payload) {
        var firstName = value(payload, "primer_nombre", "nombres");
        var secondName = value(payload, "segundo_nombre");
        var lastName = value(payload, "apellido_paterno", "apellidos");
        var maternalLastName = value(payload, "apellido_materno");
        var phone = value(payload, "telefono");
        var country = normalizeCountry(value(payload, "country", "pais"));
        var preferredLanguage = firstNonBlank(value(payload, "preferred_language"), "es-419");
        var avatarUrl = value(payload, "avatar_url");
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
        jdbcTemplate.update(
            """
                INSERT INTO user_profiles (user_id, full_name, phone, country, preferred_language, avatar_url)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    phone = VALUES(phone),
                    country = VALUES(country),
                    preferred_language = VALUES(preferred_language),
                    avatar_url = VALUES(avatar_url)
                """,
            userId,
            fullName,
            nullable(phone),
            nullable(country),
            preferredLanguage,
            nullable(avatarUrl)
        );

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
    public Map<String, Object> saveStructure(long companyId, Map<String, Object> payload) {
        var estructura = value(payload, "modo", "estructura");
        if (!"multi".equals(estructura)) {
            estructura = "simple";
        }

        var map = normalizeMap(payload);
        if ("multi".equals(estructura) && map.isEmpty()) {
            throw new IllegalArgumentException("At least one unit is required in multi mode.");
        }

        persistStructure(companyId, map);

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
    public Map<String, Object> saveEmpresa(long companyId, Map<String, Object> payload) {
        var name = value(payload, "nombre_empresa");
        if (!name.isBlank()) {
            jdbcTemplate.update("UPDATE companies SET name = ? WHERE id = ?", name, companyId);
        }

        var settingsRoot = loadSettingsRoot(companyId);
        var configCenterNode = ensureConfigCenterNode(settingsRoot);
        var empresaTemplateNode = ensureObjectNode(configCenterNode, "empresa_template");

        empresaTemplateNode.put("industria", value(payload, "industria"));
        empresaTemplateNode.put("modelo_negocio", value(payload, "modelo_negocio"));
        empresaTemplateNode.put("descripcion", value(payload, "descripcion"));
        empresaTemplateNode.put("currency", value(payload, "moneda"));
        empresaTemplateNode.put("timezone", value(payload, "zona_horaria", "tz"));
        empresaTemplateNode.put("tamano_empresa", value(payload, "tamano_empresa"));
        if (!name.isBlank()) {
            empresaTemplateNode.put("display_name", name);
        }

        if (!configCenterNode.hasNonNull("estructura")) {
            configCenterNode.put("estructura", buildStructureMap(companyId).isEmpty() ? "simple" : "multi");
        }
        if (!configCenterNode.has("map")) {
            configCenterNode.set("map", objectMapper.valueToTree(buildStructureMap(companyId)));
        }
        configCenterNode.put("tamano_empresa", value(payload, "tamano_empresa"));

        upsertSettingsRoot(companyId, settingsRoot);

        var data = new LinkedHashMap<String, Object>();
        data.put("nombre_empresa", name);
        data.put("industria", value(payload, "industria"));
        data.put("descripcion", value(payload, "descripcion"));
        data.put("tamano_empresa", value(payload, "tamano_empresa"));
        data.put("modelo_negocio", value(payload, "modelo_negocio"));
        data.put("moneda", value(payload, "moneda"));
        data.put("zona_horaria", value(payload, "zona_horaria", "tz"));
        return data;
    }

    private void persistStructure(long companyId, List<UnitInput> desiredUnits) {
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
                if (businessId == null) {
                    jdbcTemplate.update(
                        "INSERT INTO businesses (company_id, unit_id, name, status) VALUES (?, ?, ?, 'active')",
                        companyId,
                        unitId,
                        desiredBusiness.name()
                    );
                    businessId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
                } else {
                    jdbcTemplate.update(
                        "UPDATE businesses SET name = ?, unit_id = ?, status = 'active' WHERE id = ? AND company_id = ?",
                        desiredBusiness.name(),
                        unitId,
                        businessId,
                        companyId
                    );
                }

                keptBusinessIds.add(businessId);
            }
        }

        for (var business : existingBusinesses) {
            if (!keptBusinessIds.contains(business.id())) {
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
                SELECT id, unit_id, name
                FROM businesses
                WHERE company_id = ?
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new ExistingBusiness(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("name"))
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
                SELECT id, unit_id, name
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
        return template;
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
                objectString(businessMap.get("horario"))
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
            ""
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

    private Long getNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
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
        String horario
    ) {
    }

    private record ExistingUnit(
        Long id,
        String name
    ) {
    }

    private record ExistingBusiness(
        Long id,
        Long unitId,
        String name
    ) {
    }
}
