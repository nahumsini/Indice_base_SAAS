package com.indice.erp.configcenter.invitations;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.configcenter.users.ConfigCenterUserAccessUseCases;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

public abstract class ConfigCenterInvitationUseCases extends ConfigCenterUserAccessUseCases {

    protected ConfigCenterInvitationUseCases(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties);
    }

    public Map<String, Object> deleteInvitation(long companyId, long invitationId) {
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
        return result;
    }

    @Transactional
    public Map<String, Object> inviteUser(long companyId, long invitedByUserId, Map<String, Object> payload) {
        var fullName = value(payload, "name", "full_name", "nombre");
        var email = normalizeEmail(value(payload, "email"));
        var role = normalizeRole(value(payload, "role"));
        var moduleSlugs = normalizeModuleSlugs(payload.get("module_slugs"));
        var membership = resolveInvitationMembership(companyId, payload);
        ensureModuleSlugsExist(moduleSlugs);

        if (fullName.isBlank() || email.isBlank()) {
            throw new IllegalArgumentException("Name and email are required.");
        }

        ensureEmailNotUsedInCompany(companyId, email, null);
        ensureEmailNotRegistered(email);

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

        var result = new LinkedHashMap<String, Object>();
        result.put("email", email);
        result.put("full_name", fullName);
        result.put("token", token);
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

        var password = value(payload, "password", "new_password");
        var confirmPassword = value(payload, "confirm_password", "confirm_new_password", "password_confirmation");
        if (password.isBlank() || confirmPassword.isBlank()) {
            throw new IllegalArgumentException("Password and confirmation are required.");
        }
        if (!password.equals(confirmPassword)) {
            throw new IllegalArgumentException("Password and confirmation must match.");
        }
        if (password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long.");
        }

        ensureInvitationEmailCanBeAccepted(invitation.companyId(), invitation.email(), invitation.id());

        jdbcTemplate.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
            invitation.email(),
            passwordEncoder.encode(password),
            nullable(invitation.fullName())
        );
        var userId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (userId == null) {
            throw new IllegalStateException("Unable to create invited user.");
        }

        jdbcTemplate.update(
            """
                INSERT INTO user_profiles (user_id, full_name, preferred_language)
                VALUES (?, ?, 'es-419')
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    preferred_language = VALUES(preferred_language)
                """,
            userId,
            nullable(invitation.fullName())
        );

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

        jdbcTemplate.update(
            "UPDATE user_invitations SET status = 'accepted' WHERE id = ?",
            invitation.id()
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("accepted", true);
        result.put("user_id", userId);
        result.put("email", invitation.email());
        result.put("full_name", invitation.fullName());
        result.put("company_id", invitation.companyId());
        result.put("company_name", invitation.companyName());
        result.put("role", invitation.role());
        result.put("status", "active");
        return result;
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

        var stored = rows.get(0);
        var newEmail = normalizeEmail(value(payload, "email"));
        var finalEmail = newEmail.isBlank() ? String.valueOf(stored.get("email")) : newEmail;

        ensureEmailNotUsedInCompany(companyId, finalEmail, invitationId);
        ensureEmailNotRegistered(finalEmail);

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
        return result;
    }
}
