package com.indice.erp.platformadmin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.seats.SeatService;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionAccess;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog;
import java.lang.management.ManagementFactory;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformCompanyUserService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Set<String> INVITABLE_ROLES = Set.of("admin", "user");
    private static final Set<String> ASSIGNABLE_ROLES = Set.of("user", "admin", "superadmin", "root");
    private static final Set<String> ADMIN_ROLES = Set.of("admin", "root", "superadmin", "super_admin", "owner");
    private static final Set<String> PROTECTED_ROLES = Set.of("root", "superadmin", "super_admin", "owner");
    private static final int DEFAULT_RECENT_ACTIVITY_LIMIT = 10;
    private static final int MAX_RECENT_ACTIVITY_LIMIT = 100;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final PlatformAdminAccessService accessService;
    private final PlatformAuditService auditService;
    private final SeatService seatService;
    private final ConfigCenterTabPermissionAccess tabPermissionAccess;

    public PlatformCompanyUserService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        Clock clock,
        PlatformAdminAccessService accessService,
        PlatformAuditService auditService,
        SeatService seatService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.accessService = accessService;
        this.auditService = auditService;
        this.seatService = seatService;
        this.tabPermissionAccess = new ConfigCenterTabPermissionAccess(jdbcTemplate);
    }

    @Transactional
    public Map<String, Object> invite(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        InvitationRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        return inviteAfterAuthorization(actorUserId, companyId, idempotencyKey, request);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    @Transactional
    public Map<String, Object> inviteAfterAuthorization(
        long actorUserId,
        long companyId,
        String idempotencyKey,
        InvitationRequest request
    ) {
        requireCompany(companyId);
        if (request == null) {
            throw new IllegalArgumentException("Los datos de la invitación son obligatorios.");
        }

        var name = normalizeName(request.name());
        var email = normalizeEmail(request.email());
        var role = normalizeRole(request.role());
        if (name.isBlank()) {
            throw new IllegalArgumentException("El nombre del usuario es obligatorio.");
        }
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("Ingresa un correo electrónico válido.");
        }
        if (!INVITABLE_ROLES.contains(role)) {
            throw new IllegalArgumentException("El perfil debe ser Administrador o Colaborador.");
        }
        ensureEmailAvailable(companyId, email);

        var moduleSlugs = activeModuleSlugs(companyId);
        if (moduleSlugs.isEmpty()) {
            throw new IllegalStateException("La cuenta no tiene módulos activos para asignar al usuario.");
        }

        var reservationKey = idempotencyKey == null || idempotencyKey.isBlank()
            ? "platform-user-invite:" + companyId + ":" + UUID.randomUUID()
            : idempotencyKey.trim();
        var reservation = seatService.reserveInvitation(companyId, email, actorUserId, reservationKey);
        var token = UUID.randomUUID().toString().replace("-", "");
        var expiresAt = clock.instant().plus(7, ChronoUnit.DAYS);

        jdbcTemplate.update(
            """
                INSERT INTO user_invitations
                    (company_id, email, full_name, role, module_slugs_json,
                     unit_id, business_id, token, status, invited_by, expires_at)
                VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'pending', ?, ?)
                """,
            companyId,
            email,
            name,
            role,
            json(moduleSlugs),
            token,
            actorUserId,
            Timestamp.from(expiresAt)
        );
        var invitationId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (invitationId == null) {
            throw new IllegalStateException("No se pudo crear la invitación.");
        }

        var permissionKeys = ConfigCenterTabPermissionCatalog.permissionKeysForModuleSlugs(
            new LinkedHashSet<>(moduleSlugs)
        ).stream().filter(key -> ConfigCenterTabPermissionCatalog.isRoleCompatible(key, role)).toList();
        tabPermissionAccess.replaceInvitationTabPermissions(invitationId, permissionKeys, moduleSlugs);
        seatService.attachInvitation(reservation, invitationId);

        auditService.record(
            actorUserId,
            "COMPANY_USER_INVITED",
            "USER_INVITATION",
            String.valueOf(invitationId),
            companyId,
            "SUCCESS",
            Map.of("email", email, "role", role, "reserved_seat", reservation.enforced())
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("invitation_id", invitationId);
        result.put("email", email);
        result.put("full_name", name);
        result.put("role", role);
        result.put("token", token);
        result.put("expires_at", expiresAt.toString());
        result.put("seat_usage", seatBody(seatService.snapshot(companyId)));
        return result;
    }

    @Transactional
    public Map<String, Object> cancelInvitation(long actorUserId, long companyId, long invitationId) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        return cancelInvitationAfterAuthorization(actorUserId, companyId, invitationId);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    @Transactional
    public Map<String, Object> cancelInvitationAfterAuthorization(long actorUserId, long companyId, long invitationId) {
        var invitation = pendingInvitation(companyId, invitationId);
        var updated = jdbcTemplate.update(
            """
                UPDATE user_invitations
                SET status = 'cancelled'
                WHERE id = ? AND company_id = ? AND LOWER(COALESCE(status, 'pending')) = 'pending'
                """,
            invitationId,
            companyId
        );
        if (updated == 0) {
            throw new NoSuchElementException("La invitación ya no está pendiente.");
        }
        seatService.releaseInvitation(companyId, invitationId);
        auditService.record(
            actorUserId,
            "COMPANY_USER_INVITATION_CANCELLED",
            "USER_INVITATION",
            String.valueOf(invitationId),
            companyId,
            "SUCCESS",
            Map.of("email", invitation.email())
        );
        return Map.of(
            "success", true,
            "invitation_id", invitationId,
            "seat_usage", seatBody(seatService.snapshot(companyId))
        );
    }

    @Transactional
    public Map<String, Object> resendInvitation(long actorUserId, long companyId, long invitationId) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        return resendInvitationAfterAuthorization(actorUserId, companyId, invitationId);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    @Transactional
    public Map<String, Object> resendInvitationAfterAuthorization(long actorUserId, long companyId, long invitationId) {
        var invitation = pendingInvitation(companyId, invitationId);
        var token = UUID.randomUUID().toString().replace("-", "");
        var expiresAt = clock.instant().plus(7, ChronoUnit.DAYS);
        jdbcTemplate.update(
            """
                UPDATE user_invitations
                SET token = ?, expires_at = ?, status = 'pending'
                WHERE id = ? AND company_id = ?
                """,
            token,
            Timestamp.from(expiresAt),
            invitationId,
            companyId
        );
        seatService.refreshInvitation(companyId, invitationId, invitation.email(), actorUserId);
        auditService.record(
            actorUserId,
            "COMPANY_USER_INVITATION_RESENT",
            "USER_INVITATION",
            String.valueOf(invitationId),
            companyId,
            "SUCCESS",
            Map.of("email", invitation.email())
        );

        var result = new LinkedHashMap<String, Object>();
        result.put("invitation_id", invitationId);
        result.put("email", invitation.email());
        result.put("full_name", invitation.name());
        result.put("token", token);
        result.put("expires_at", expiresAt.toString());
        result.put("seat_usage", seatBody(seatService.snapshot(companyId)));
        return result;
    }

    @Transactional
    public Map<String, Object> updateStatus(
        long actorUserId,
        long companyId,
        long userId,
        MemberStatusRequest request
    ) {
        accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        return updateStatusAfterAuthorization(actorUserId, companyId, userId, request);
    }

    /** Caller must authorize the target company before invoking this shared operation. */
    @Transactional
    public Map<String, Object> updateStatusAfterAuthorization(
        long actorUserId,
        long companyId,
        long userId,
        MemberStatusRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException("El estado del usuario es obligatorio.");
        }
        var requestedStatus = normalizeStatus(request.status());
        if (!Set.of("active", "inactive").contains(requestedStatus)) {
            throw new IllegalArgumentException("El estado debe ser activo o inactivo.");
        }
        var member = member(companyId, userId);
        var currentlyActive = "active".equals(normalizeStatus(member.status()));
        if (requestedStatus.equals(currentlyActive ? "active" : "inactive")) {
            return memberResult(companyId, member, requestedStatus);
        }

        if ("inactive".equals(requestedStatus)) {
            if (member.owner() || PROTECTED_ROLES.contains(normalizeRole(member.role()))) {
                throw new IllegalStateException("El propietario o Super Admin de la cuenta no puede desactivarse aquí.");
            }
            ensureAnotherAdministrator(companyId, member.membershipId(), member.role());
        } else {
            seatService.requireAvailableSeatForActivation(companyId, userId);
        }

        jdbcTemplate.update(
            "UPDATE user_companies SET status = ? WHERE id = ? AND company_id = ?",
            requestedStatus,
            member.membershipId(),
            companyId
        );
        jdbcTemplate.update(
            """
                UPDATE user_work_profiles
                SET status = CASE
                        WHEN LOWER(COALESCE(status, 'active')) = 'terminated' THEN status
                        ELSE ?
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_company_id = ? AND company_id = ?
                """,
            requestedStatus,
            member.membershipId(),
            companyId
        );
        auditService.record(
            actorUserId,
            "active".equals(requestedStatus) ? "COMPANY_USER_ACTIVATED" : "COMPANY_USER_DEACTIVATED",
            "USER",
            String.valueOf(userId),
            companyId,
            "SUCCESS",
            Map.of("membership_id", member.membershipId(), "role", member.role(), "status", requestedStatus)
        );
        return memberResult(companyId, member, requestedStatus);
    }

    @Transactional
    public Map<String, Object> updateRole(
        long actorUserId,
        long companyId,
        long userId,
        MemberRoleRequest request
    ) {
        var authority = accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        requirePlatformRoot(authority);
        if (request == null) {
            throw new IllegalArgumentException("El rol del usuario es obligatorio.");
        }
        var requestedRole = normalizeRole(request.role());
        if (!ASSIGNABLE_ROLES.contains(requestedRole)) {
            throw new IllegalArgumentException("El rol debe ser Usuario, Administrador, Super Admin o Root.");
        }
        var member = member(companyId, userId);
        if (member.owner()) {
            throw new IllegalStateException("La propiedad de la cuenta se administra desde transferencia de propietario.");
        }
        var currentRole = normalizeRole(member.role());
        if (requestedRole.equals(currentRole)) {
            return memberRoleResult(companyId, member, requestedRole);
        }
        if (ADMIN_ROLES.contains(currentRole) && !ADMIN_ROLES.contains(requestedRole)) {
            ensureAnotherAdministrator(companyId, member.membershipId(), member.role());
        }
        jdbcTemplate.update(
            "UPDATE user_companies SET role = ? WHERE id = ? AND company_id = ?",
            requestedRole,
            member.membershipId(),
            companyId
        );
        refreshRoleAccess(companyId, member.membershipId(), requestedRole);
        auditService.record(
            actorUserId,
            "COMPANY_USER_ROLE_UPDATED",
            "USER",
            String.valueOf(userId),
            companyId,
            "SUCCESS",
            Map.of("membership_id", member.membershipId(), "from_role", currentRole, "to_role", requestedRole)
        );
        return memberRoleResult(companyId, member, requestedRole);
    }

    @Transactional
    public Map<String, Object> updatePlatformAccess(
        long actorUserId,
        long companyId,
        long userId,
        PlatformAccessRequest request
    ) {
        var authority = accessService.require(actorUserId, "PLATFORM_ACCOUNTS_WRITE");
        requirePlatformRoot(authority);
        var member = member(companyId, userId);
        if (!"active".equals(normalizeStatus(member.status()))) {
            throw new IllegalStateException("Sólo un usuario activo puede recibir acceso de plataforma.");
        }
        var requestedRole = normalizePlatformRole(request == null ? null : request.platform_role());
        if ("PLATFORM_ROOT".equals(requestedRole)) {
            jdbcTemplate.update(
                """
                    INSERT INTO platform_administrators
                        (user_id, platform_role, status, mfa_required, created_by_user_id)
                    VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 1, ?)
                    ON DUPLICATE KEY UPDATE
                        platform_role = 'PLATFORM_ROOT',
                        status = 'ACTIVE',
                        mfa_required = 1,
                        revoked_by_user_id = NULL,
                        revoked_at = NULL
                    """,
                userId,
                actorUserId
            );
        } else {
            if (userId == actorUserId) {
                throw new IllegalStateException("No puedes revocar tu propio acceso Platform Root.");
            }
            jdbcTemplate.update(
                """
                    UPDATE platform_administrators
                    SET status = 'REVOKED',
                        revoked_by_user_id = ?,
                        revoked_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                    """,
                actorUserId,
                userId
            );
        }
        auditService.record(
            actorUserId,
            "PLATFORM_USER_ACCESS_UPDATED",
            "USER",
            String.valueOf(userId),
            companyId,
            "SUCCESS",
            Map.of("membership_id", member.membershipId(), "platform_role", requestedRole)
        );
        return memberRoleResult(companyId, member, normalizeRole(member.role()));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> activity(long actorUserId, long companyId) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        requireCompany(companyId);
        var generatedAt = clock.instant();
        var activeSince = generatedAt.minus(15, ChronoUnit.MINUTES);
        var recentSince = generatedAt.minus(24, ChronoUnit.HOURS);
        var userSince = generatedAt.minus(30, ChronoUnit.DAYS);
        var members = activityMembers(companyId, userSince, recentSince, activeSince);
        var totals = activityTotals(members);
        var result = new LinkedHashMap<String, Object>();
        result.put("company_id", companyId);
        result.put("generated_at", generatedAt.toString());
        result.put("activity_window_minutes", 15);
        result.put("new_user_window_days", 30);
        result.put("totals", totals);
        result.put("members", members);
        result.put("activity_buckets", activityBuckets(companyId, recentSince));
        result.put("recent_events", recentActivityEvents(companyId));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> allActivity(long actorUserId) {
        return allActivity(actorUserId, DEFAULT_RECENT_ACTIVITY_LIMIT);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> allActivity(long actorUserId, int requestedRecentLimit) {
        accessService.require(actorUserId, "PLATFORM_VIEW");
        var generatedAt = clock.instant();
        var activeSince = generatedAt.minus(15, ChronoUnit.MINUTES);
        var recentSince = generatedAt.minus(24, ChronoUnit.HOURS);
        var userSince = generatedAt.minus(30, ChronoUnit.DAYS);
        var recentLimit = normalizeRecentActivityLimit(requestedRecentLimit);
        var recentEvents = recentActivityEvents(recentLimit + 1);
        var companies = allCompanyActivityRows(userSince, recentSince, activeSince);
        var totals = allCompanyActivityTotals(companies);
        var result = new LinkedHashMap<String, Object>();
        result.put("generated_at", generatedAt.toString());
        result.put("activity_window_minutes", 15);
        result.put("new_user_window_days", 30);
        result.put("totals", totals);
        result.put("server", serverLoadSnapshot());
        result.put("companies", companies);
        result.put("activity_buckets", allActivityBuckets(recentSince));
        result.put("recent_events", trimRecentActivityEvents(recentEvents, recentLimit));
        result.put("recent_events_limit", recentLimit);
        result.put("recent_events_has_more", recentEvents.size() > recentLimit);
        return result;
    }

    private void requireCompany(long companyId) {
        var count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM companies WHERE id = ?", Integer.class, companyId);
        if (count == null || count == 0) {
            throw new NoSuchElementException("No se encontró la cuenta.");
        }
    }

    private void ensureEmailAvailable(long companyId, String email) {
        var memberships = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_companies membership
                JOIN users user ON user.id = membership.user_id
                WHERE membership.company_id = ? AND LOWER(user.email) = ?
                """,
            Integer.class,
            companyId,
            email
        );
        var invitations = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM user_invitations
                WHERE company_id = ? AND LOWER(email) = ?
                  AND LOWER(COALESCE(status, 'pending')) = 'pending'
                  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                """,
            Integer.class,
            companyId,
            email
        );
        if ((memberships != null && memberships > 0) || (invitations != null && invitations > 0)) {
            throw new IllegalStateException("Ese correo ya pertenece a la cuenta o tiene una invitación pendiente.");
        }
    }

    private List<String> activeModuleSlugs(long companyId) {
        return new ArrayList<>(new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT entitlement.module_slug
                FROM company_module_entitlements entitlement
                JOIN modules module_row ON module_row.slug = entitlement.module_slug
                WHERE entitlement.company_id = ?
                  AND LOWER(COALESCE(entitlement.status, 'active')) = 'active'
                  AND COALESCE(module_row.is_active, 1) = 1
                  AND COALESCE(module_row.assignment_enabled, 1) = 1
                ORDER BY module_row.sort_order, module_row.name
                """,
            (rs, rowNum) -> rs.getString("module_slug"),
            companyId
        )));
    }

    private Invitation pendingInvitation(long companyId, long invitationId) {
        return jdbcTemplate.query(
            """
                SELECT id, email, COALESCE(full_name, '') AS full_name
                FROM user_invitations
                WHERE id = ? AND company_id = ?
                  AND LOWER(COALESCE(status, 'pending')) = 'pending'
                LIMIT 1
                """,
            (rs, rowNum) -> new Invitation(rs.getLong("id"), rs.getString("email"), rs.getString("full_name")),
            invitationId,
            companyId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("No se encontró la invitación pendiente."));
    }

    private Member member(long companyId, long userId) {
        return jdbcTemplate.query(
            """
                SELECT membership.id, membership.user_id, membership.role, membership.status,
                       EXISTS (
                           SELECT 1 FROM company_ownerships ownership
                           WHERE ownership.company_id = membership.company_id
                             AND ownership.owner_user_id = membership.user_id
                             AND ownership.status = 'ACTIVE'
                       ) AS is_owner
                FROM user_companies membership
                WHERE membership.company_id = ? AND membership.user_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new Member(
                rs.getLong("id"),
                rs.getLong("user_id"),
                rs.getString("role"),
                rs.getString("status"),
                rs.getBoolean("is_owner")
            ),
            companyId,
            userId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("No se encontró el usuario en esta cuenta."));
    }

    private void ensureAnotherAdministrator(long companyId, long membershipId, String role) {
        if (!ADMIN_ROLES.contains(normalizeRole(role))) {
            return;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM user_companies
                WHERE company_id = ? AND id <> ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND LOWER(COALESCE(role, 'user')) IN ('admin', 'root', 'superadmin', 'super_admin', 'owner')
                """,
            Integer.class,
            companyId,
            membershipId
        );
        if (count == null || count < 1) {
            throw new IllegalStateException("Debe permanecer al menos un administrador activo en la cuenta.");
        }
    }

    private Map<String, Object> memberResult(long companyId, Member member, String status) {
        var result = new LinkedHashMap<String, Object>();
        result.put("success", true);
        result.put("company_id", companyId);
        result.put("membership_id", member.membershipId());
        result.put("user_id", member.userId());
        result.put("status", status);
        result.put("seat_usage", seatBody(seatService.snapshot(companyId)));
        return result;
    }

    private Map<String, Object> memberRoleResult(long companyId, Member member, String role) {
        var result = memberResult(companyId, member, normalizeStatus(member.status()));
        result.put("role", role);
        var platform = platformAccess(member.userId());
        result.put("platform_role", platform.role());
        result.put("platform_status", platform.status());
        return result;
    }

    private PlatformAccess platformAccess(long userId) {
        return jdbcTemplate.query(
            """
                SELECT platform_role, status
                FROM platform_administrators
                WHERE user_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PlatformAccess(rs.getString("platform_role"), rs.getString("status")),
            userId
        ).stream().findFirst().orElse(new PlatformAccess(null, null));
    }

    private List<Map<String, Object>> activityMembers(
        long companyId,
        Instant userSince,
        Instant recentSince,
        Instant activeSince
    ) {
        return jdbcTemplate.query(
            """
                SELECT membership.id, membership.user_id, user.full_name, user.email,
                       membership.role, membership.status, membership.created_at,
                       administrator.platform_role, administrator.status AS platform_status,
                       MAX(CASE WHEN audit.outcome = 'SUCCESS' THEN audit.created_at ELSE NULL END) AS last_login_at,
                       SUM(CASE
                           WHEN audit.created_at >= ? AND audit.outcome IN ('FAILURE', 'BLOCKED') THEN 1
                           ELSE 0
                       END) AS failed_login_events_24h
                FROM user_companies membership
                JOIN users user ON user.id = membership.user_id
                LEFT JOIN platform_administrators administrator
                  ON administrator.user_id = user.id
                LEFT JOIN user_login_audit audit
                  ON audit.company_id = membership.company_id
                 AND audit.user_id = membership.user_id
                 AND audit.created_at >= ?
                WHERE membership.company_id = ?
                GROUP BY membership.id, membership.user_id, user.full_name, user.email,
                         membership.role, membership.status, membership.created_at,
                         administrator.platform_role, administrator.status
                ORDER BY last_login_at DESC, membership.created_at DESC, user.full_name, user.email
                """,
            (rs, rowNum) -> {
                var createdAt = instant(rs.getTimestamp("created_at"));
                var lastLoginAt = instant(rs.getTimestamp("last_login_at"));
                var row = new LinkedHashMap<String, Object>();
                row.put("membership_id", rs.getLong("id"));
                row.put("user_id", rs.getLong("user_id"));
                row.put("name", nullable(rs.getString("full_name")));
                row.put("email", rs.getString("email"));
                row.put("role", nullable(rs.getString("role")));
                row.put("status", nullable(rs.getString("status")));
                row.put("platform_role", nullable(rs.getString("platform_role")));
                row.put("platform_status", nullable(rs.getString("platform_status")));
                row.put("created_at", createdAt);
                row.put("last_login_at", lastLoginAt);
                row.put("new_user", createdAt != null && !createdAt.isBefore(userSince));
                row.put("recently_active", lastLoginAt != null && !lastLoginAt.isBefore(activeSince));
                row.put("logged_in_last_24h", lastLoginAt != null && !lastLoginAt.isBefore(recentSince));
                row.put("failed_login_events_24h", rs.getInt("failed_login_events_24h"));
                return row;
            },
            Timestamp.from(recentSince),
            Timestamp.from(userSince),
            companyId
        );
    }

    private List<Map<String, Object>> allCompanyActivityRows(
        Instant userSince,
        Instant recentSince,
        Instant activeSince
    ) {
        return jdbcTemplate.query(
            """
                SELECT company.id,
                       company.name,
                       company.platform_status,
                       COALESCE(owner.email, (
                           SELECT member_user.email
                           FROM user_companies member
                           JOIN users member_user ON member_user.id = member.user_id
                           WHERE member.company_id = company.id
                             AND LOWER(COALESCE(member.status, 'active')) = 'active'
                           ORDER BY FIELD(LOWER(COALESCE(member.role, 'user')),
                               'root', 'superadmin', 'owner', 'admin', 'manager', 'user'), member.id
                           LIMIT 1
                       )) AS owner_email,
                       subscription.status AS billing_status,
                       subscription.currency AS billing_currency,
                       subscription.billing_interval,
                       subscription.current_period_ends_at,
                       invoice.status AS last_invoice_status,
                       invoice.amount_due_cents AS last_invoice_due_cents,
                       invoice.amount_paid_cents AS last_invoice_paid_cents,
                       invoice.period_ends_at AS last_invoice_period_ends_at,
                       COALESCE(members.total_users, 0) AS total_users,
                       COALESCE(members.active_users, 0) AS active_users,
                       COALESCE(members.new_users_30d, 0) AS new_users_30d,
                       COALESCE(members.platform_roots, 0) AS platform_roots,
                       COALESCE(audit.active_now_users, 0) AS active_now_users,
                       COALESCE(audit.logged_in_users_24h, 0) AS logged_in_users_24h,
                       COALESCE(audit.failed_login_events_24h, 0) AS failed_login_events_24h,
                       COALESCE(audit.auth_events_24h, 0) AS auth_events_24h
                FROM companies company
                LEFT JOIN company_ownerships ownership
                  ON ownership.company_id = company.id AND ownership.status = 'ACTIVE'
                LEFT JOIN users owner ON owner.id = ownership.owner_user_id
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.id = (
                      SELECT MAX(candidate.id)
                      FROM company_billing_subscriptions candidate
                      WHERE candidate.company_id = company.id
                  )
                LEFT JOIN billing_invoice_snapshots invoice
                  ON invoice.id = (
                      SELECT MAX(candidate_invoice.id)
                      FROM billing_invoice_snapshots candidate_invoice
                      WHERE candidate_invoice.company_id = company.id
                  )
                LEFT JOIN (
                    SELECT membership.company_id,
                           COUNT(*) AS total_users,
                           SUM(CASE WHEN LOWER(COALESCE(membership.status, 'active')) = 'active' THEN 1 ELSE 0 END) AS active_users,
                           SUM(CASE WHEN membership.created_at >= ? THEN 1 ELSE 0 END) AS new_users_30d,
                           COUNT(DISTINCT CASE
                               WHEN administrator.platform_role = 'PLATFORM_ROOT'
                                AND administrator.status = 'ACTIVE'
                               THEN membership.user_id
                               ELSE NULL
                           END) AS platform_roots
                    FROM user_companies membership
                    LEFT JOIN platform_administrators administrator
                      ON administrator.user_id = membership.user_id
                    GROUP BY membership.company_id
                ) members ON members.company_id = company.id
                LEFT JOIN (
                    SELECT company_id,
                           COUNT(DISTINCT CASE
                               WHEN outcome = 'SUCCESS' AND created_at >= ? AND user_id IS NOT NULL
                               THEN user_id
                               ELSE NULL
                           END) AS active_now_users,
                           COUNT(DISTINCT CASE
                               WHEN outcome = 'SUCCESS' AND user_id IS NOT NULL
                               THEN user_id
                               ELSE NULL
                           END) AS logged_in_users_24h,
                           SUM(CASE WHEN outcome IN ('FAILURE', 'BLOCKED') THEN 1 ELSE 0 END) AS failed_login_events_24h,
                           COUNT(*) AS auth_events_24h
                    FROM user_login_audit
                    WHERE company_id IS NOT NULL
                      AND created_at >= ?
                    GROUP BY company_id
                ) audit ON audit.company_id = company.id
                ORDER BY active_now_users DESC, auth_events_24h DESC, failed_login_events_24h DESC, company.name
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("company_id", rs.getLong("id"));
                row.put("company_name", rs.getString("name"));
                row.put("owner_email", nullable(rs.getString("owner_email")));
                row.put("platform_status", nullable(rs.getString("platform_status")));
                row.put("billing_status", nullable(rs.getString("billing_status")));
                row.put("billing_currency", nullable(rs.getString("billing_currency")));
                row.put("billing_interval", nullable(rs.getString("billing_interval")));
                row.put("current_period_ends_at", instant(rs.getTimestamp("current_period_ends_at")));
                row.put("last_invoice_status", nullable(rs.getString("last_invoice_status")));
                row.put("last_invoice_due_cents", rs.getObject("last_invoice_due_cents"));
                row.put("last_invoice_paid_cents", rs.getObject("last_invoice_paid_cents"));
                row.put("last_invoice_period_ends_at", instant(rs.getTimestamp("last_invoice_period_ends_at")));
                row.put("total_users", rs.getInt("total_users"));
                row.put("active_users", rs.getInt("active_users"));
                row.put("active_now_users", rs.getInt("active_now_users"));
                row.put("logged_in_users_24h", rs.getInt("logged_in_users_24h"));
                row.put("new_users_30d", rs.getInt("new_users_30d"));
                row.put("platform_roots", rs.getInt("platform_roots"));
                row.put("failed_login_events_24h", rs.getInt("failed_login_events_24h"));
                row.put("auth_events_24h", rs.getInt("auth_events_24h"));
                return row;
            },
            Timestamp.from(userSince),
            Timestamp.from(activeSince),
            Timestamp.from(recentSince)
        );
    }

    private Map<String, Object> activityTotals(List<Map<String, Object>> members) {
        var totals = new LinkedHashMap<String, Object>();
        totals.put("total_users", members.size());
        totals.put("active_users", count(members, member -> "active".equals(normalizeStatus((String) member.get("status")))));
        totals.put("inactive_users", count(members, member -> !"active".equals(normalizeStatus((String) member.get("status")))));
        totals.put("active_now_users", count(members, member -> Boolean.TRUE.equals(member.get("recently_active"))));
        totals.put("logged_in_users_24h", count(members, member -> Boolean.TRUE.equals(member.get("logged_in_last_24h"))));
        totals.put("new_users_30d", count(members, member -> Boolean.TRUE.equals(member.get("new_user"))));
        totals.put("old_users", count(members, member -> !Boolean.TRUE.equals(member.get("new_user"))));
        totals.put("platform_roots", count(members, member ->
            "PLATFORM_ROOT".equals(member.get("platform_role"))
                && "ACTIVE".equals(member.get("platform_status"))));
        totals.put("failed_login_events_24h", members.stream()
            .map(member -> member.get("failed_login_events_24h"))
            .filter(Number.class::isInstance)
            .map(Number.class::cast)
            .mapToInt(Number::intValue)
            .sum());
        return totals;
    }

    private Map<String, Object> allCompanyActivityTotals(List<Map<String, Object>> companies) {
        var totals = new LinkedHashMap<String, Object>();
        totals.put("companies", companies.size());
        totals.put("total_users", sum(companies, "total_users"));
        totals.put("active_users", sum(companies, "active_users"));
        totals.put("active_now_users", sum(companies, "active_now_users"));
        totals.put("logged_in_users_24h", sum(companies, "logged_in_users_24h"));
        totals.put("new_users_30d", sum(companies, "new_users_30d"));
        totals.put("platform_roots", sum(companies, "platform_roots"));
        totals.put("failed_login_events_24h", sum(companies, "failed_login_events_24h"));
        totals.put("auth_events_24h", sum(companies, "auth_events_24h"));
        return totals;
    }

    private List<Map<String, Object>> activityBuckets(long companyId, Instant since) {
        return jdbcTemplate.query(
            """
                SELECT DATE_FORMAT(created_at, '%m-%d %H:00') AS bucket_label,
                       COUNT(DISTINCT CASE WHEN outcome = 'SUCCESS' AND user_id IS NOT NULL THEN user_id ELSE NULL END) AS unique_active_users,
                       SUM(CASE WHEN outcome = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_logins,
                       SUM(CASE WHEN outcome IN ('FAILURE', 'BLOCKED') THEN 1 ELSE 0 END) AS failed_attempts,
                       COUNT(*) AS total_events
                FROM user_login_audit
                WHERE company_id = ?
                  AND created_at >= ?
                GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00'), DATE_FORMAT(created_at, '%m-%d %H:00')
                ORDER BY MIN(created_at)
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("label", rs.getString("bucket_label"));
                row.put("unique_active_users", rs.getInt("unique_active_users"));
                row.put("successful_logins", rs.getInt("successful_logins"));
                row.put("failed_attempts", rs.getInt("failed_attempts"));
                row.put("total_events", rs.getInt("total_events"));
                return row;
            },
            companyId,
            Timestamp.from(since)
        );
    }

    private List<Map<String, Object>> allActivityBuckets(Instant since) {
        return jdbcTemplate.query(
            """
                SELECT DATE_FORMAT(created_at, '%m-%d %H:00') AS bucket_label,
                       COUNT(DISTINCT CASE WHEN outcome = 'SUCCESS' AND user_id IS NOT NULL THEN user_id ELSE NULL END) AS unique_active_users,
                       SUM(CASE WHEN outcome = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_logins,
                       SUM(CASE WHEN outcome IN ('FAILURE', 'BLOCKED') THEN 1 ELSE 0 END) AS failed_attempts,
                       COUNT(*) AS total_events
                FROM user_login_audit
                WHERE created_at >= ?
                GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00'), DATE_FORMAT(created_at, '%m-%d %H:00')
                ORDER BY MIN(created_at)
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("label", rs.getString("bucket_label"));
                row.put("unique_active_users", rs.getInt("unique_active_users"));
                row.put("successful_logins", rs.getInt("successful_logins"));
                row.put("failed_attempts", rs.getInt("failed_attempts"));
                row.put("total_events", rs.getInt("total_events"));
                return row;
            },
            Timestamp.from(since)
        );
    }

    private List<Map<String, Object>> recentActivityEvents(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT audit.id, audit.user_id, user.full_name, audit.email_normalized,
                       audit.event_type, audit.stage, audit.outcome, audit.failure_reason_code,
                       audit.ip_address, audit.user_agent, audit.created_at
                FROM user_login_audit audit
                LEFT JOIN users user ON user.id = audit.user_id
                WHERE audit.company_id = ?
                ORDER BY audit.created_at DESC, audit.id DESC
                LIMIT 20
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("user_id", rs.getObject("user_id"));
                row.put("name", nullable(rs.getString("full_name")));
                row.put("email", nullable(rs.getString("email_normalized")));
                row.put("event_type", nullable(rs.getString("event_type")));
                row.put("stage", nullable(rs.getString("stage")));
                row.put("outcome", nullable(rs.getString("outcome")));
                row.put("failure_reason_code", nullable(rs.getString("failure_reason_code")));
                row.put("ip_address", nullable(rs.getString("ip_address")));
                row.put("user_agent", nullable(rs.getString("user_agent")));
                row.put("created_at", instant(rs.getTimestamp("created_at")));
                return row;
            },
            companyId
        );
    }

    private List<Map<String, Object>> recentActivityEvents(int limit) {
        return jdbcTemplate.query(
            """
                SELECT audit.id, audit.company_id, company.name AS company_name,
                       audit.user_id, user.full_name, audit.email_normalized,
                       audit.event_type, audit.stage, audit.outcome, audit.failure_reason_code,
                       audit.ip_address, audit.user_agent, audit.created_at
                FROM user_login_audit audit
                LEFT JOIN users user ON user.id = audit.user_id
                LEFT JOIN companies company ON company.id = audit.company_id
                ORDER BY audit.created_at DESC, audit.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("company_id", rs.getObject("company_id"));
                row.put("company_name", nullable(rs.getString("company_name")));
                row.put("user_id", rs.getObject("user_id"));
                row.put("name", nullable(rs.getString("full_name")));
                row.put("email", nullable(rs.getString("email_normalized")));
                row.put("event_type", nullable(rs.getString("event_type")));
                row.put("stage", nullable(rs.getString("stage")));
                row.put("outcome", nullable(rs.getString("outcome")));
                row.put("failure_reason_code", nullable(rs.getString("failure_reason_code")));
                row.put("ip_address", nullable(rs.getString("ip_address")));
                row.put("user_agent", nullable(rs.getString("user_agent")));
                row.put("created_at", instant(rs.getTimestamp("created_at")));
                return row;
            },
            limit
        );
    }

    private int normalizeRecentActivityLimit(int requestedLimit) {
        return Math.max(1, Math.min(requestedLimit, MAX_RECENT_ACTIVITY_LIMIT));
    }

    private List<Map<String, Object>> trimRecentActivityEvents(List<Map<String, Object>> events, int limit) {
        if (events.size() <= limit) {
            return events;
        }
        return new ArrayList<>(events.subList(0, limit));
    }

    private int count(List<Map<String, Object>> members, java.util.function.Predicate<Map<String, Object>> predicate) {
        return (int) members.stream().filter(predicate).count();
    }

    private long sum(List<Map<String, Object>> rows, String key) {
        return rows.stream()
            .map(row -> row.get(key))
            .filter(Number.class::isInstance)
            .map(Number.class::cast)
            .mapToLong(Number::longValue)
            .sum();
    }

    private Map<String, Object> serverLoadSnapshot() {
        var os = ManagementFactory.getOperatingSystemMXBean();
        var runtime = Runtime.getRuntime();
        var result = new LinkedHashMap<String, Object>();
        result.put("available_processors", os.getAvailableProcessors());
        result.put("system_load_average", os.getSystemLoadAverage());
        result.put("heap_used_bytes", runtime.totalMemory() - runtime.freeMemory());
        result.put("heap_max_bytes", runtime.maxMemory());
        return result;
    }

    private void refreshRoleAccess(long companyId, long userCompanyId, String role) {
        var moduleSlugs = activeModuleSlugs(companyId);
        jdbcTemplate.update("DELETE FROM user_company_module_roles WHERE user_company_id = ?", userCompanyId);
        for (var slug : moduleSlugs) {
            jdbcTemplate.update(
                "INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level) VALUES (?, ?, 'viewer', 0)",
                userCompanyId,
                slug
            );
        }
        var permissionRole = "root".equals(role) ? "superadmin" : role;
        var permissionKeys = ConfigCenterTabPermissionCatalog.permissionKeysForModuleSlugs(
            new LinkedHashSet<>(moduleSlugs)
        ).stream().filter(key -> ConfigCenterTabPermissionCatalog.isRoleCompatible(key, permissionRole)).toList();
        tabPermissionAccess.replaceUserTabPermissions(userCompanyId, permissionKeys, moduleSlugs);
    }

    private void requirePlatformRoot(PlatformAdminAccessService.Access authority) {
        if (!"PLATFORM_ROOT".equals(authority.role())) {
            throw new PlatformAdminForbiddenException("Sólo Platform Root puede modificar roles elevados.");
        }
    }

    private String normalizePlatformRole(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank() || "NONE".equals(normalized)) {
            return "NONE";
        }
        if (!"PLATFORM_ROOT".equals(normalized)) {
            throw new IllegalArgumentException("El acceso de plataforma debe ser NONE o PLATFORM_ROOT.");
        }
        return normalized;
    }

    private Map<String, Object> seatBody(SeatService.SeatSnapshot snapshot) {
        var result = new LinkedHashMap<String, Object>();
        result.put("enforced", snapshot.enforced());
        result.put("included", snapshot.included());
        result.put("purchased_extra", snapshot.purchasedExtra());
        result.put("courtesy_extra", snapshot.benefitExtra());
        result.put("active", snapshot.active());
        result.put("reserved", snapshot.reserved());
        result.put("limit", snapshot.enforced() ? snapshot.limit() : null);
        result.put("available", snapshot.enforced() ? snapshot.available() : null);
        return result;
    }

    private String json(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No se pudieron preparar los permisos de la invitación.", exception);
        }
    }

    private static String normalizeName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private static String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeRole(String value) {
        return value == null ? "user" : value.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private static String normalizeStatus(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record InvitationRequest(String name, String email, String role) {
    }

    public record MemberStatusRequest(String status) {
    }

    public record MemberRoleRequest(String role) {
    }

    public record PlatformAccessRequest(String platform_role) {
    }

    private record Invitation(long id, String email, String name) {
    }

    private record Member(long membershipId, long userId, String role, String status, boolean owner) {
    }

    private record PlatformAccess(String role, String status) {
    }
}
