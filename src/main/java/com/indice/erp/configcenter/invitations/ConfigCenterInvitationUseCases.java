package com.indice.erp.configcenter.invitations;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.users.ConfigCenterUserAccessUseCases;
import com.indice.erp.configcenter.users.ConfigCenterUserAccessAudit.Snapshot;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

public abstract class ConfigCenterInvitationUseCases extends ConfigCenterUserAccessUseCases {

    private static final Set<String> MODULES_WITH_TABS = Set.of("config_center", "human_resources");

    protected ConfigCenterInvitationUseCases(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        CompanyStorageMeter storageMeter
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties, storageMeter);
    }

    public Map<String, Object> deleteInvitation(long companyId, long actorUserId, String actorRole, long invitationId) {
        var before = loadInvitationAccessSnapshot(companyId, actorUserId, actorRole, invitationId);
        var updated = jdbcTemplate.update(
            """
                UPDATE user_invitations
                SET status = 'cancelled'
                WHERE id = ?
                  AND company_id = ?
                  AND COALESCE(status, 'pending') = 'pending'
                """,
            invitationId,
            companyId
        );

        if (updated == 0) {
            throw new NoSuchElementException("Invitation not found.");
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("success", true);
        result.put("deleted", true);
        userAccessAudit.recordInvitationChange(
            companyId,
            actorUserId,
            invitationId,
            "invitation_cancelled",
            before,
            new Snapshot(before.role(), "cancelled", before.unitId(), before.businessId(), before.modules(), before.tabPermissions())
        );
        return result;
    }

    @Transactional
    public Map<String, Object> inviteUser(
        long companyId,
        long invitedByUserId,
        String actorRole,
        Map<String, Object> payload
    ) {
        var fullName = value(payload, "name", "full_name", "nombre");
        var email = normalizeEmail(value(payload, "email"));
        var role = normalizeRole(value(payload, "role"));
        var moduleSlugs = normalizeModuleSlugs(payload.get("module_slugs"));
        var membership = resolveInvitationMembership(companyId, payload);
        ensureModuleSlugsExist(moduleSlugs);
        var shouldPersistTabPermissions = tabPermissionAccess.hasTabPermissionPayload(payload);
        var tabPermissionKeys = shouldPersistTabPermissions
            ? tabPermissionAccess.normalizeTabPermissionKeys(payload)
            : List.<String>of();
        tabPermissionAccess.ensureTabPermissionKeysValid(tabPermissionKeys, moduleSlugs);
        var actor = loadActorAccess(companyId, invitedByUserId, actorRole);
        userMutationGuard.validateInvite(
            actor,
            value(payload, "role"),
            payload,
            moduleSlugs,
            tabPermissionKeys,
            new com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope(
                membership.unitId(),
                membership.businessId()
            ),
            shouldPersistTabPermissions
        );

        if (fullName.isBlank() || email.isBlank()) {
            throw new IllegalArgumentException("Name and email are required.");
        }

        ensureEmailNotUsedInCompany(companyId, email, null);

        var token = UUID.randomUUID().toString().replace("-", "");
        var expiresAt = LocalDateTime.now().plusDays(7);

        jdbcTemplate.update(
            """
                INSERT INTO user_invitations
                    (company_id, email, full_name, role, module_slugs_json, unit_id, business_id, token, status, invited_by, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
            companyId,
            email,
            fullName,
            role,
            serializeModuleSlugs(moduleSlugs),
            membership.unitId(),
            membership.businessId(),
            token,
            invitedByUserId,
            expiresAt
        );
        var invitationId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (invitationId == null) {
            throw new IllegalStateException("Unable to create invitation.");
        }
        if (shouldPersistTabPermissions) {
            tabPermissionAccess.replaceInvitationTabPermissions(invitationId, tabPermissionKeys, moduleSlugs);
        }
        userAccessAudit.recordInvitationChange(
            companyId,
            invitedByUserId,
            invitationId,
            "invitation_created",
            null,
            new Snapshot(role, "pending", membership.unitId(), membership.businessId(), moduleSlugs, tabPermissionKeys)
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("email", email);
        result.put("full_name", fullName);
        result.put("token", token);
        result.put("invitation_id", invitationId);
        return result;
    }

    public Map<String, Object> getInvitation(String token) {
        var invitation = loadInvitationByToken(token, false);
        return invitationPublicView(invitation);
    }

    @Transactional
    public Map<String, Object> acceptInvitation(String token, Map<String, Object> payload) {
        var invitation = loadInvitationByToken(token, true);
        var invitationStatus = invitationStatus(invitation);
        if ("accepted".equals(invitationStatus)) {
            throw new IllegalArgumentException("This invitation has already been accepted.");
        }
        if ("expired".equals(invitationStatus)) {
            throw new IllegalArgumentException("This invitation has expired.");
        }
        ensureInvitationHasRequiredAccess(invitation);

        var password = value(payload, "password", "new_password");
        var confirmPassword = value(payload, "confirm_password", "confirm_new_password", "password_confirmation");
        if (password.isBlank() || confirmPassword.isBlank()) {
            throw new IllegalArgumentException("Password and confirmation are required.");
        }
        if (!password.equals(confirmPassword)) {
            throw new IllegalArgumentException("Password and confirmation must match.");
        }
        ensureInvitationEmailCanBeAccepted(invitation.companyId(), invitation.email(), invitation.id());
        var existingUsers = jdbcTemplate.query(
            "SELECT id, password_hash FROM users WHERE LOWER(email) = ? LIMIT 1 FOR UPDATE",
            (rs, rowNum) -> new ExistingUser(rs.getLong("id"), rs.getString("password_hash")),
            invitation.email()
        );
        final long userId;
        if (existingUsers.isEmpty()) {
            if (password.length() < 8) {
                throw new IllegalArgumentException("Password must be at least 8 characters long.");
            }
            jdbcTemplate.update(
                "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
                invitation.email(),
                passwordEncoder.encode(password),
                nullable(invitation.fullName())
            );
            var insertedUserId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
            if (insertedUserId == null) {
                throw new IllegalStateException("Unable to create invited user.");
            }
            userId = insertedUserId;
            jdbcTemplate.update(
                """
                    INSERT INTO user_profiles (user_id, full_name, preferred_language)
                    VALUES (?, ?, 'es-419')
                    ON DUPLICATE KEY UPDATE
                        full_name = COALESCE(NULLIF(user_profiles.full_name, ''), VALUES(full_name))
                    """,
                userId,
                nullable(invitation.fullName())
            );
        } else {
            var existing = existingUsers.getFirst();
            if (!passwordEncoder.matches(password, existing.passwordHash())) {
                throw new IllegalArgumentException("The existing account password is incorrect.");
            }
            userId = existing.id();
        }

        jdbcTemplate.update(
            """
                INSERT INTO user_companies (user_id, company_id, role, status, visibility)
                VALUES (?, ?, ?, 'active', 'all')
                """,
            userId,
            invitation.companyId(),
            invitation.role()
        );
        var userCompanyId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (userCompanyId == null) {
            throw new IllegalStateException("Unable to create invited user company access.");
        }
        upsertUserMembership(
            invitation.companyId(),
            userCompanyId,
            userId,
            "active",
            new UserMembership(invitation.unitId(), invitation.businessId()),
            null
        );

        for (var slug : existingModuleSlugs(invitation.moduleSlugs())) {
            jdbcTemplate.update(
                "INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level) VALUES (?, ?, 'viewer', 0)",
                userCompanyId,
                slug
            );
        }
        var invitationTabPermissions = tabPermissionAccess.listInvitationTabPermissionKeys(invitation.id());
        tabPermissionAccess.ensureTabPermissionKeysValid(invitationTabPermissions, invitation.moduleSlugs());
        tabPermissionAccess.copyInvitationTabPermissionsToUserCompany(invitation.id(), userCompanyId);

        jdbcTemplate.update(
            "UPDATE user_invitations SET status = 'accepted' WHERE id = ?",
            invitation.id()
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("accepted", true);
        result.put("user_id", userId);
        result.put("user_company_id", userCompanyId);
        result.put("invitation_id", invitation.id());
        result.put("email", invitation.email());
        result.put("full_name", invitation.fullName());
        result.put("company_id", invitation.companyId());
        result.put("company_name", invitation.companyName());
        result.put("role", invitation.role());
        result.put("status", "active");
        return result;
    }

    private void ensureInvitationHasRequiredAccess(com.indice.erp.configcenter.support.InvitationRecord invitation) {
        if (invitation.unitId() == null || invitation.businessId() == null) {
            throw new IllegalArgumentException("Invitation is missing business unit or business access.");
        }
        if (invitation.moduleSlugs() == null || invitation.moduleSlugs().isEmpty()) {
            throw new IllegalArgumentException("Invitation is missing module permissions.");
        }
        var requiresTabRows = invitation.moduleSlugs().stream().anyMatch(MODULES_WITH_TABS::contains);
        if (requiresTabRows && !tabPermissionAccess.hasInvitationTabPermissionRows(invitation.id())) {
            throw new IllegalArgumentException("Invitation is missing tab permissions.");
        }
    }

    @Transactional
    public Map<String, Object> resendInvitation(
        long companyId,
        long actorUserId,
        String actorRole,
        long invitationId,
        Map<String, Object> payload
    ) {
        var before = loadInvitationAccessSnapshot(companyId, actorUserId, actorRole, invitationId);
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

        var stored = rows.get(0);
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

        var result = new LinkedHashMap<String, Object>();
        result.put("email", finalEmail);
        result.put("full_name", String.valueOf(stored.get("full_name")));
        result.put("token", token);
        userAccessAudit.recordInvitationChange(companyId, actorUserId, invitationId, "invitation_resent", before, before);
        return result;
    }

    private Snapshot loadInvitationAccessSnapshot(
        long companyId,
        long actorUserId,
        String actorRole,
        long invitationId
    ) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(role, 'user') AS role,
                       COALESCE(status, 'pending') AS status,
                       unit_id,
                       business_id,
                       COALESCE(module_slugs_json, '[]') AS module_slugs_json
                FROM user_invitations
                WHERE id = ?
                  AND company_id = ?
                  AND COALESCE(status, 'pending') = 'pending'
                LIMIT 1
                """,
            (rs, rowNum) -> new Snapshot(
                normalizeRole(rs.getString("role")),
                normalizeStatus(rs.getString("status")),
                getNullableLong(rs, "unit_id"),
                getNullableLong(rs, "business_id"),
                parseStoredModuleSlugs(safe(rs.getString("module_slugs_json"))),
                tabPermissionAccess.listInvitationTabPermissionKeys(invitationId)
            ),
            invitationId,
            companyId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Invitation not found.");
        }
        var snapshot = rows.getFirst();
        invitationAccessGuard.validateManage(
            loadActorAccess(companyId, actorUserId, actorRole),
            snapshot.role(),
            snapshot.modules(),
            snapshot.tabPermissions(),
            new AccessScope(snapshot.unitId(), snapshot.businessId())
        );
        return snapshot;
    }

    private record ExistingUser(long id, String passwordHash) {
    }
}
