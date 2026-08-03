package com.indice.erp.configcenter.users;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.profile.ConfigCenterProfileUseCases;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.ActorAccess;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.TargetUser;
import com.indice.erp.configcenter.users.ConfigCenterUserAccessAudit.Snapshot;
import com.indice.erp.kiosk.engine.KioskEmployeeAccessService;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

public abstract class ConfigCenterUserAccessUseCases extends ConfigCenterProfileUseCases {

    private static final java.util.Set<String> PROTECTED_ROLES = new HashSet<>(Arrays.asList("root", "superadmin"));
    private static final java.util.Set<String> ADMIN_ROLES = new HashSet<>(Arrays.asList("root", "superadmin", "admin"));

    protected final ConfigCenterTabPermissionAccess tabPermissionAccess;
    protected final ConfigCenterUserMutationGuard userMutationGuard;
    protected final ConfigCenterUserDeactivationGuard userDeactivationGuard;
    protected final ConfigCenterInvitationAccessGuard invitationAccessGuard;
    protected final ConfigCenterUserAccessAudit userAccessAudit;
    protected final ConfigCenterModuleAccessRegistry moduleAccessRegistry;
    protected final KioskEmployeeAccessService employeeKioskAccess;

    protected ConfigCenterUserAccessUseCases(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        CompanyStorageMeter storageMeter
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties, storageMeter);
        this.tabPermissionAccess = new ConfigCenterTabPermissionAccess(jdbcTemplate);
        this.userMutationGuard = new ConfigCenterUserMutationGuard();
        this.userDeactivationGuard = new ConfigCenterUserDeactivationGuard();
        this.invitationAccessGuard = new ConfigCenterInvitationAccessGuard();
        this.userAccessAudit = new ConfigCenterUserAccessAudit(jdbcTemplate, objectMapper);
        this.moduleAccessRegistry = new ConfigCenterModuleAccessRegistry(jdbcTemplate);
        this.employeeKioskAccess = new KioskEmployeeAccessService(jdbcTemplate);
    }

    public Map<String, Object> getUsers(AuthSessionUser currentUser) {
        var companyId = currentUser.companyId();
        var actor = loadActorAccess(companyId, currentUser.userId(), currentUser.role());
        var protectedActor = PROTECTED_ROLES.contains(actor.role());
        var userOnly = !ADMIN_ROLES.contains(actor.role());
        var businessScopeId = !userOnly && !protectedActor ? actor.scope().businessId() : null;
        var unitScopeId = !userOnly && !protectedActor && businessScopeId == null ? actor.scope().unitId() : null;
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
                       COALESCE(uc.status, 'active') AS status,
                       wp.unit_id,
                       COALESCE(unit_ref.name, '') AS unit_name,
                       wp.business_id,
                       COALESCE(business_ref.name, '') AS business_name
                FROM users u
                INNER JOIN user_companies uc ON uc.user_id = u.id
                LEFT JOIN user_profiles p ON p.user_id = u.id
                LEFT JOIN user_work_profiles wp
                    ON wp.company_id = uc.company_id
                   AND wp.user_company_id = uc.id
                LEFT JOIN units unit_ref ON unit_ref.id = wp.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = wp.business_id
                WHERE uc.company_id = ?
                  AND (? = 0 OR uc.user_id = ?)
                  AND (? = 0 OR wp.business_id = ?)
                  AND (? = 0 OR wp.unit_id = ?)
                ORDER BY u.full_name ASC, u.email ASC
                """,
            (rs, rowNum) -> {
                var name = splitFullName(safe(rs.getString("full_name")));
                var avatarObjectKey = safe(rs.getString("avatar_object_key"));
                var unitId = getNullableLong(rs, "unit_id");
                var businessId = getNullableLong(rs, "business_id");
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
                user.put("scope_type", scopeType(unitId, businessId));
                user.put("unit_id", unitId);
                user.put("unit_name", safe(rs.getString("unit_name")));
                user.put("business_id", businessId);
                user.put("business_name", safe(rs.getString("business_name")));
                var userCompanyId = rs.getLong("user_company_id");
                user.put("module_slugs", listModuleSlugs(userCompanyId));
                user.put("tab_permission_keys", tabPermissionAccess.listUserTabPermissionKeys(userCompanyId));
                user.put("tab_permissions_configured", tabPermissionAccess.hasUserTabPermissionRows(userCompanyId));
                user.put("kiosk_definition_ids", employeeKioskAccess.assignedToUser(companyId, rs.getLong("id")));
                user.put("is_protected", PROTECTED_ROLES.contains(safe(rs.getString("role"))));
                user.put("source", "user");
                return user;
            },
            companyId,
            userOnly ? 1 : 0,
            currentUser.userId(),
            businessScopeId == null ? 0 : 1,
            businessScopeId,
            unitScopeId == null ? 0 : 1,
            unitScopeId
        );

        var invitations = userOnly ? List.<LinkedHashMap<String, Object>>of() : jdbcTemplate.query(
            """
                SELECT invitation.id,
                       invitation.email,
                       COALESCE(invitation.full_name, '') AS full_name,
                       COALESCE(invitation.role, 'user') AS role,
                       COALESCE(invitation.module_slugs_json, '[]') AS module_slugs_json,
                       invitation.unit_id,
                       COALESCE(unit_ref.name, '') AS unit_name,
                       invitation.business_id,
                       COALESCE(business_ref.name, '') AS business_name
                FROM user_invitations invitation
                LEFT JOIN units unit_ref ON unit_ref.id = invitation.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = invitation.business_id
                WHERE invitation.company_id = ?
                  AND COALESCE(invitation.status, 'pending') = 'pending'
                  AND (? = 0 OR invitation.business_id = ?)
                  AND (? = 0 OR invitation.unit_id = ?)
                ORDER BY invitation.created_at DESC
                """,
            (rs, rowNum) -> {
                var name = splitFullName(safe(rs.getString("full_name")));
                var unitId = getNullableLong(rs, "unit_id");
                var businessId = getNullableLong(rs, "business_id");
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
                invitation.put("scope_type", scopeType(unitId, businessId));
                invitation.put("unit_id", unitId);
                invitation.put("unit_name", safe(rs.getString("unit_name")));
                invitation.put("business_id", businessId);
                invitation.put("business_name", safe(rs.getString("business_name")));
                var invitationId = rs.getLong("id");
                invitation.put("module_slugs", parseStoredModuleSlugs(safe(rs.getString("module_slugs_json"))));
                invitation.put("tab_permission_keys", tabPermissionAccess.listInvitationTabPermissionKeys(invitationId));
                invitation.put("tab_permissions_configured", tabPermissionAccess.hasInvitationTabPermissionRows(invitationId));
                invitation.put("kiosk_definition_ids", employeeKioskAccess.assignedToInvitation(invitationId));
                invitation.put("is_protected", false);
                invitation.put("source", "invitation");
                return invitation;
            },
            companyId,
            businessScopeId == null ? 0 : 1,
            businessScopeId,
            unitScopeId == null ? 0 : 1,
            unitScopeId
        );

        users.addAll(invitations);
        users.forEach(user -> user.put("capabilities", capabilitiesFor(user, actor)));

        var catalogUnitId = !userOnly && !protectedActor ? actor.scope().unitId() : null;
        var catalogBusinessId = !userOnly && !protectedActor ? actor.scope().businessId() : null;
        var catalogUnits = userOnly ? List.<LinkedHashMap<String, Object>>of() : jdbcTemplate.query(
            """
                SELECT id, name
                FROM units
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                  AND (? = 0 OR id = ?)
                ORDER BY name ASC
                """,
            (rs, rowNum) -> {
                var unit = new LinkedHashMap<String, Object>();
                unit.put("id", rs.getLong("id"));
                unit.put("name", safe(rs.getString("name")));
                return unit;
            },
            companyId,
            catalogUnitId == null ? 0 : 1,
            catalogUnitId
        );

        var catalogBusinesses = userOnly ? List.<LinkedHashMap<String, Object>>of() : jdbcTemplate.query(
            """
                SELECT id, unit_id, name
                FROM businesses
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                  AND (? = 0 OR id = ?)
                  AND (? = 0 OR unit_id = ?)
                ORDER BY name ASC
                """,
            (rs, rowNum) -> {
                var business = new LinkedHashMap<String, Object>();
                business.put("id", rs.getLong("id"));
                business.put("unit_id", getNullableLong(rs, "unit_id"));
                business.put("name", safe(rs.getString("name")));
                return business;
            },
            companyId,
            catalogBusinessId == null ? 0 : 1,
            catalogBusinessId,
            catalogBusinessId == null && catalogUnitId != null ? 1 : 0,
            catalogBusinessId == null ? catalogUnitId : null
        );

        var catalogModules = userOnly
            ? List.<LinkedHashMap<String, Object>>of()
            : moduleAccessRegistry.catalogForCompany(companyId, protectedActor, actor.moduleSlugs());
        var catalogTabs = userOnly ? List.of() : tabPermissionAccess.catalogTabs().stream()
            .filter(tab -> protectedActor || actor.tabPermissionKeys().contains(String.valueOf(tab.get("permission_key"))))
            .toList();

        var catalog = new LinkedHashMap<String, Object>();
        catalog.put("units", catalogUnits);
        catalog.put("businesses", catalogBusinesses);
        catalog.put("modules", catalogModules);
        catalog.put("tabs", catalogTabs);
        catalog.put("employee_kiosks", userOnly ? List.of() : employeeKioskAccess.catalog(companyId));

        var result = new LinkedHashMap<String, Object>();
        result.put("users", users);
        result.put("catalog", catalog);
        result.put("company_id", companyId);
        result.put("capabilities", Map.of(
            "can_manage_users", ADMIN_ROLES.contains(actor.role()),
            "can_invite", ADMIN_ROLES.contains(actor.role()),
            "can_assign_super_admin", protectedActor
        ));
        return result;
    }

    @Transactional
    public Map<String, Object> updateUser(
        long companyId,
        long actorUserId,
        String actorRole,
        long userId,
        Map<String, Object> payload
    ) {
        var role = normalizeRole(value(payload, "role"));
        var status = normalizeStatus(value(payload, "status"));
        var moduleSlugs = normalizeModuleSlugs(payload.get("module_slugs"));
        var shouldReplaceTabPermissions = tabPermissionAccess.hasTabPermissionPayload(payload);
        var shouldReplaceKioskAssignments = employeeKioskAccess.hasAssignmentPayload(payload);
        var kioskDefinitionIds = shouldReplaceKioskAssignments
            ? employeeKioskAccess.normalizeDefinitionIds(payload.get("kiosk_definition_ids"))
            : List.<Long>of();
        var tabPermissionKeys = shouldReplaceTabPermissions ? tabPermissionAccess.normalizeTabPermissionKeys(payload) : List.<String>of();
        tabPermissionAccess.ensureTabPermissionKeysValid(tabPermissionKeys, moduleSlugs);
        var actor = loadActorAccess(companyId, actorUserId, actorRole);

        var rows = jdbcTemplate.query(
            """
                SELECT uc.user_id,
                       uc.id AS user_company_id,
                       COALESCE(uc.role, 'user') AS role
                FROM user_companies uc
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new TargetUser(
                rs.getLong("user_id"),
                rs.getLong("user_company_id"),
                normalizeRole(rs.getString("role"))
            ),
            userId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("User not found.");
        }

        var target = rows.get(0);
        var before = loadUserAccessSnapshot(companyId, target.userCompanyId());
        moduleAccessRegistry.ensureAssignableToCompany(companyId, moduleSlugs, before.modules());
        if (!before.status().equals(status)) {
            throw new IllegalArgumentException("Use the dedicated activate or deactivate action to change user status.");
        }
        var membership = resolveRequestedMembership(
            companyId,
            payload,
            loadCurrentMembership(companyId, target.userCompanyId())
        );
        userMutationGuard.validateUpdate(
            actor,
            target,
            payload,
            moduleSlugs,
            tabPermissionKeys,
            new AccessScope(membership.unitId(), membership.businessId()),
            shouldReplaceTabPermissions
        );
        var userCompanyId = target.userCompanyId();

        jdbcTemplate.update(
            "UPDATE user_companies SET role = ?, status = ? WHERE id = ?",
            role,
            status,
            userCompanyId
        );
        upsertUserMembership(companyId, userCompanyId, userId, status, membership, null);

        jdbcTemplate.update("DELETE FROM user_company_module_roles WHERE user_company_id = ?", userCompanyId);
        for (var slug : moduleSlugs) {
            jdbcTemplate.update(
                "INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level) VALUES (?, ?, 'viewer', 0)",
                userCompanyId,
                slug
            );
        }
        if (shouldReplaceTabPermissions) {
            tabPermissionAccess.replaceUserTabPermissions(userCompanyId, tabPermissionKeys, moduleSlugs);
        }
        if (shouldReplaceKioskAssignments) {
            employeeKioskAccess.replaceUserAssignments(
                companyId,
                target.userId(),
                Set.copyOf(moduleSlugs),
                membership.unitId(),
                membership.businessId(),
                kioskDefinitionIds,
                actorUserId
            );
        }
        userAccessAudit.recordUserChange(
            companyId,
            actorUserId,
            target.userId(),
            userCompanyId,
            "user_access_updated",
            before,
            new Snapshot(role, status, membership.unitId(), membership.businessId(), moduleSlugs, tabPermissionKeys)
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("success", true);
        return result;
    }

    @Transactional
    public Map<String, Object> activateUser(long companyId, long actorUserId, String actorRole, long userId) {
        var target = requireAuthorizedActivationTarget(companyId, actorUserId, actorRole, userId);
        var userCompanyId = target.target().userCompanyId();
        var before = loadUserAccessSnapshot(companyId, userCompanyId);
        if ("active".equals(before.status())) {
            return Map.of("success", true, "active", true);
        }

        jdbcTemplate.update(
            "UPDATE user_companies SET status = 'active' WHERE id = ? AND company_id = ?",
            userCompanyId,
            companyId
        );
        upsertUserMembership(
            companyId,
            userCompanyId,
            userId,
            "active",
            new UserMembership(target.scope().unitId(), target.scope().businessId()),
            actorUserId
        );
        userAccessAudit.recordUserChange(
            companyId,
            actorUserId,
            target.target().userId(),
            userCompanyId,
            "user_activated",
            before,
            new Snapshot(
                before.role(),
                "active",
                before.unitId(),
                before.businessId(),
                before.modules(),
                before.tabPermissions()
            )
        );

        return Map.of("success", true, "active", true);
    }

    public void requireCanActivateUser(long companyId, long actorUserId, String actorRole, long userId) {
        requireAuthorizedActivationTarget(companyId, actorUserId, actorRole, userId);
    }

    private UserAccessTarget requireAuthorizedActivationTarget(
        long companyId,
        long actorUserId,
        String actorRole,
        long userId
    ) {
        if (userId == actorUserId) {
            throw new IllegalArgumentException("You cannot activate your own user.");
        }
        var actor = loadActorAccess(companyId, actorUserId, actorRole);
        var rows = jdbcTemplate.query(
            """
                SELECT uc.user_id,
                       uc.id AS user_company_id,
                       COALESCE(uc.role, 'user') AS role,
                       wp.unit_id,
                       wp.business_id
                FROM user_companies uc
                LEFT JOIN user_work_profiles wp
                  ON wp.company_id = uc.company_id
                 AND wp.user_company_id = uc.id
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new UserAccessTarget(
                new TargetUser(
                    rs.getLong("user_id"),
                    rs.getLong("user_company_id"),
                    normalizeRole(rs.getString("role"))
                ),
                new AccessScope(getNullableLong(rs, "unit_id"), getNullableLong(rs, "business_id"))
            ),
            userId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("User not found.");
        }

        var target = rows.getFirst();
        var userCompanyId = target.target().userCompanyId();
        var moduleSlugs = listModuleSlugs(userCompanyId);
        var tabPermissionKeys = tabPermissionAccess.listUserTabPermissionKeys(userCompanyId);
        userDeactivationGuard.validate(actor, target.target(), moduleSlugs, tabPermissionKeys, target.scope());
        return target;
    }

    @Transactional
    public Map<String, Object> deleteUser(long companyId, long actorUserId, String actorRole, long userId) {
        if (userId == actorUserId) {
            throw new IllegalArgumentException("You cannot deactivate your own user.");
        }
        var actor = loadActorAccess(companyId, actorUserId, actorRole);

        var rows = jdbcTemplate.query(
            """
                SELECT uc.user_id,
                       uc.id AS user_company_id,
                       COALESCE(uc.role, 'user') AS role,
                       wp.unit_id,
                       wp.business_id
                FROM user_companies uc
                LEFT JOIN user_work_profiles wp
                  ON wp.company_id = uc.company_id
                 AND wp.user_company_id = uc.id
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new UserAccessTarget(
                new TargetUser(
                    rs.getLong("user_id"),
                    rs.getLong("user_company_id"),
                    normalizeRole(rs.getString("role"))
                ),
                new AccessScope(getNullableLong(rs, "unit_id"), getNullableLong(rs, "business_id"))
            ),
            userId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("User not found.");
        }

        var target = rows.get(0);
        var userCompanyId = target.target().userCompanyId();
        var moduleSlugs = listModuleSlugs(userCompanyId);
        var tabPermissionKeys = tabPermissionAccess.listUserTabPermissionKeys(userCompanyId);
        userDeactivationGuard.validate(actor, target.target(), moduleSlugs, tabPermissionKeys, target.scope());

        if (ADMIN_ROLES.contains(target.target().role())) {
            var adminCount = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM user_companies
                    WHERE company_id = ?
                      AND id <> ?
                      AND LOWER(COALESCE(role, 'user')) IN ('root', 'superadmin', 'admin')
                      AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                    """,
                Integer.class,
                companyId,
                userCompanyId
            );
            if (adminCount == null || adminCount < 1) {
                throw new IllegalArgumentException("At least one administrator must remain.");
            }
        }

        var before = loadUserAccessSnapshot(companyId, userCompanyId);
        jdbcTemplate.update(
            "UPDATE user_companies SET status = 'inactive' WHERE id = ? AND company_id = ?",
            userCompanyId,
            companyId
        );
        jdbcTemplate.update(
            """
                UPDATE user_work_profiles
                SET status = CASE
                        WHEN LOWER(COALESCE(status, 'active')) = 'terminated' THEN status
                        ELSE 'inactive'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_company_id = ?
                  AND company_id = ?
                """,
            userCompanyId,
            companyId
        );
        employeeKioskAccess.revokeUserSessions(companyId, target.target().userId());
        userAccessAudit.recordUserChange(
            companyId,
            actorUserId,
            target.target().userId(),
            userCompanyId,
            "user_deactivated",
            before,
            new Snapshot(
                before.role(),
                "inactive",
                before.unitId(),
                before.businessId(),
                before.modules(),
                before.tabPermissions()
            )
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("success", true);
        result.put("deleted", true);
        result.put("archived", true);
        result.put("inactive", true);
        return result;
    }

    protected UserMembership resolveInvitationMembership(long companyId, Map<String, Object> payload) {
        return resolveRequestedMembership(companyId, payload, new UserMembership(null, null));
    }

    protected ActorAccess loadActorAccess(long companyId, long actorUserId, String actorRole) {
        var rows = jdbcTemplate.query(
            """
                SELECT uc.id AS user_company_id,
                       COALESCE(uc.role, ?) AS role,
                       wp.unit_id,
                       wp.business_id
                FROM user_companies uc
                LEFT JOIN user_work_profiles wp
                  ON wp.company_id = uc.company_id
                 AND wp.user_company_id = uc.id
                WHERE uc.user_id = ?
                  AND uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                ORDER BY CASE WHEN wp.id IS NULL THEN 1 ELSE 0 END, wp.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new ActorAccess(
                actorUserId,
                rs.getLong("user_company_id"),
                normalizeRole(rs.getString("role")),
                listModuleSlugs(rs.getLong("user_company_id")),
                tabPermissionAccess.listUserTabPermissionKeys(rs.getLong("user_company_id")),
                new AccessScope(getNullableLong(rs, "unit_id"), getNullableLong(rs, "business_id"))
            ),
            actorRole,
            actorUserId,
            companyId
        );

        if (!rows.isEmpty()) {
            return rows.getFirst();
        }

        return new ActorAccess(
            actorUserId,
            0L,
            normalizeRole(actorRole),
            List.of(),
            List.of(),
            new AccessScope(null, null)
        );
    }

    protected UserMembership loadCurrentMembership(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT unit_id, business_id
                FROM user_work_profiles
                WHERE company_id = ?
                  AND user_company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new UserMembership(
                getNullableLong(rs, "unit_id"),
                getNullableLong(rs, "business_id")
            ),
            companyId,
            userCompanyId
        );

        return rows.isEmpty() ? new UserMembership(null, null) : rows.get(0);
    }

    protected Snapshot loadUserAccessSnapshot(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(uc.role, 'user') AS role,
                       COALESCE(uc.status, 'active') AS status,
                       wp.unit_id,
                       wp.business_id
                FROM user_companies uc
                LEFT JOIN user_work_profiles wp
                  ON wp.company_id = uc.company_id
                 AND wp.user_company_id = uc.id
                WHERE uc.company_id = ?
                  AND uc.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new Snapshot(
                normalizeRole(rs.getString("role")),
                normalizeStatus(rs.getString("status")),
                getNullableLong(rs, "unit_id"),
                getNullableLong(rs, "business_id"),
                listModuleSlugs(userCompanyId),
                tabPermissionAccess.listUserTabPermissionKeys(userCompanyId)
            ),
            companyId,
            userCompanyId
        );

        return rows.isEmpty() ? new Snapshot("", "", null, null, List.of(), List.of()) : rows.get(0);
    }

    protected UserMembership resolveRequestedMembership(
        long companyId,
        Map<String, Object> payload,
        UserMembership fallback
    ) {
        if (!containsMembershipPayload(payload)) {
            return fallback;
        }

        var requestedUnitId = parseLong(payload, "unit_id", "unitId");
        var requestedBusinessId = parseLong(payload, "business_id", "businessId");
        if (requestedBusinessId == null) {
            if (requestedUnitId == null) {
                return new UserMembership(null, null);
            }
            return new UserMembership(loadScopedUnit(companyId, requestedUnitId), null);
        }

        var business = loadScopedBusiness(companyId, requestedBusinessId);
        if (requestedUnitId != null && business.unitId() != null && !requestedUnitId.equals(business.unitId())) {
            throw new IllegalArgumentException("The selected business does not belong to the selected unit.");
        }

        var resolvedUnitId = business.unitId() == null ? requestedUnitId : business.unitId();
        if (resolvedUnitId != null) {
            loadScopedUnit(companyId, resolvedUnitId);
        }

        return new UserMembership(resolvedUnitId, business.id());
    }

    protected void upsertUserMembership(
        long companyId,
        long userCompanyId,
        long userId,
        String status,
        UserMembership membership,
        Long createdBy
    ) {
        ensureHrWorkProfileForCompanyAccess(companyId, userCompanyId, userId, status, createdBy);
        jdbcTemplate.update(
            """
                UPDATE user_work_profiles
                SET unit_id = ?,
                    business_id = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND user_company_id = ?
                """,
            membership.unitId(),
            membership.businessId(),
            companyId,
            userCompanyId
        );
    }

    protected String scopeType(Long unitId, Long businessId) {
        if (businessId != null) {
            return "business_office";
        }
        if (unitId != null) {
            return "unit_headquarters";
        }
        return "corporate_office";
    }

    private boolean containsMembershipPayload(Map<String, Object> payload) {
        return payload.containsKey("unit_id")
            || payload.containsKey("unitId")
            || payload.containsKey("business_id")
            || payload.containsKey("businessId");
    }

    private Map<String, Object> capabilitiesFor(Map<String, Object> user, ActorAccess actor) {
        var actorProtected = PROTECTED_ROLES.contains(actor.role());
        var actorCanManage = ADMIN_ROLES.contains(actor.role());
        var source = safe(String.valueOf(user.get("source")));
        var targetRole = normalizeRole(safe(String.valueOf(user.get("role"))));
        var targetProtected = PROTECTED_ROLES.contains(targetRole);
        var targetModules = stringList(user.get("module_slugs"));
        var targetTabs = stringList(user.get("tab_permission_keys"));
        var targetScope = new AccessScope(number(user.get("unit_id")), number(user.get("business_id")));
        var withinCeiling = actorProtected || (
            "admin".equals(actor.role())
                && !targetProtected
                && actor.moduleSlugs().containsAll(targetModules)
                && actor.tabPermissionKeys().containsAll(targetTabs)
                && withinScope(actor.scope(), targetScope)
        );
        var targetUserId = number(user.get("id"));
        var isSelf = "user".equals(source) && targetUserId != null && targetUserId == actor.userId();
        var canManageTarget = actorCanManage && withinCeiling;
        var status = normalizeStatus(safe(String.valueOf(user.get("status"))));

        var capabilities = new LinkedHashMap<String, Object>();
        capabilities.put("can_edit_access", "user".equals(source) && canManageTarget && (!isSelf || actorProtected));
        capabilities.put("can_activate", "user".equals(source) && canManageTarget && !isSelf && "inactive".equals(status));
        capabilities.put("can_deactivate", "user".equals(source) && canManageTarget && !isSelf && "active".equals(status));
        capabilities.put("can_resend_invitation", "invitation".equals(source) && canManageTarget);
        capabilities.put("can_cancel_invitation", "invitation".equals(source) && canManageTarget);
        return capabilities;
    }

    private boolean withinScope(AccessScope actorScope, AccessScope requestedScope) {
        if (actorScope.businessId() != null) {
            return actorScope.businessId().equals(requestedScope.businessId());
        }
        if (actorScope.unitId() != null) {
            return actorScope.unitId().equals(requestedScope.unitId());
        }
        return true;
    }

    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> values)) {
            return List.of();
        }
        return values.stream().map(String::valueOf).toList();
    }

    private Long number(Object value) {
        return value instanceof Number numeric ? numeric.longValue() : null;
    }

    private Long loadScopedUnit(long companyId, long unitId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM units
                WHERE id = ?
                  AND (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            unitId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("The selected business unit is not available in this company.");
        }

        return rows.get(0);
    }

    private ScopedBusiness loadScopedBusiness(long companyId, long businessId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, unit_id
                FROM businesses
                WHERE id = ?
                  AND (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                LIMIT 1
                """,
            (rs, rowNum) -> new ScopedBusiness(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id")
            ),
            businessId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("The selected business is not available in this company.");
        }

        return rows.get(0);
    }

    public record UserMembership(
        Long unitId,
        Long businessId
    ) {
    }

    private record ScopedBusiness(
        long id,
        Long unitId
    ) {
    }

    private record UserAccessTarget(
        TargetUser target,
        AccessScope scope
    ) {
    }
}
