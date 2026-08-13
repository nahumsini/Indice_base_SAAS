package com.indice.erp.platformadmin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.seats.SeatService;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionAccess;
import com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog;
import java.sql.Timestamp;
import java.time.Clock;
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
    private static final Set<String> PROTECTED_ROLES = Set.of("root", "superadmin", "super_admin", "owner");

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
        if (!Set.of("admin", "root", "superadmin", "super_admin", "owner").contains(normalizeRole(role))) {
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

    public record InvitationRequest(String name, String email, String role) {
    }

    public record MemberStatusRequest(String status) {
    }

    private record Invitation(long id, String email, String name) {
    }

    private record Member(long membershipId, long userId, String role, String status, boolean owner) {
    }
}
