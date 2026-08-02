package com.indice.erp.configcenter.users;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class ConfigCenterUserMutationGuard {

    private static final Set<String> PROTECTED_ROLES = Set.of("root", "superadmin");
    private static final Set<String> ADMIN_ASSIGNABLE_ROLES = Set.of("admin", "user");
    private static final Set<String> USER_SELF_SERVICE_SCOPES = Set.of(
        "config_center.profile",
        "config_center.personal-performance",
        "human_resources.attendance",
        "human_resources.control",
        "human_resources.announcements",
        "human_resources.assets",
        "human_resources.permissions"
    );

    public void validateInvite(ActorAccess actor, String targetRole, Map<String, Object> payload, List<String> moduleSlugs,
        List<String> tabPermissionKeys, AccessScope scope, boolean hasTabPermissionPayload) {
        ensureCanMutateUsers(actor);
        ensureCanAssignRole(actor, targetRole);
        ensureAccessPayload(payload, moduleSlugs, hasTabPermissionPayload);
        ensureRoleTabPermissionCompatibility(targetRole, tabPermissionKeys);
        ensureAdminCeiling(actor, targetRole, moduleSlugs, tabPermissionKeys, scope);
    }

    public void validateUpdate(ActorAccess actor, TargetUser target, Map<String, Object> payload, List<String> moduleSlugs,
        List<String> tabPermissionKeys, AccessScope scope, boolean hasTabPermissionPayload) {
        ensureCanMutateUsers(actor);
        if (actor.userId() == target.userId() && !isProtected(actor.role()) && changesOwnAccess(payload, hasTabPermissionPayload)) {
            throw new IllegalArgumentException("You cannot change your own role or permissions.");
        }
        if (isProtected(target.role()) && !isProtected(actor.role())) {
            throw new IllegalArgumentException("Protected users can only be changed by Super Admin.");
        }
        ensureCanAssignRole(actor, text(payload, "role"));
        ensureAccessPayload(payload, moduleSlugs, hasTabPermissionPayload);
        ensureRoleTabPermissionCompatibility(text(payload, "role"), tabPermissionKeys);
        ensureAdminCeiling(actor, text(payload, "role"), moduleSlugs, tabPermissionKeys, scope);
    }

    private void ensureRoleTabPermissionCompatibility(String targetRole, List<String> tabPermissionKeys) {
        if (isProtected(targetRole)) {
            return;
        }
        for (var permissionKey : tabPermissionKeys == null ? List.<String>of() : tabPermissionKeys) {
            if (ConfigCenterTabPermissionCatalog.isProtectedScope(permissionKey)) {
                throw new IllegalArgumentException("Protected tab permissions can only be assigned to Super Admin.");
            }
            if ("user".equals(normalizeRole(targetRole)) && isAdministrativeSelfServiceModule(permissionKey)
                && !USER_SELF_SERVICE_SCOPES.contains(permissionKey)) {
                throw new IllegalArgumentException(
                    "User role cannot receive administrative Panel Inicial or HR permissions. Choose Admin for management access."
                );
            }
        }
    }

    private boolean isAdministrativeSelfServiceModule(String permissionKey) {
        return permissionKey != null
            && (permissionKey.startsWith("config_center.") || permissionKey.startsWith("human_resources."));
    }

    private void ensureAccessPayload(Map<String, Object> payload, List<String> moduleSlugs, boolean hasTabPermissionPayload) {
        if (text(payload, "role").isBlank()) {
            throw new IllegalArgumentException("Role is required.");
        }
        if (!hasAnyKey(payload, "unit_id", "unitId") || !hasAnyKey(payload, "business_id", "businessId")) {
            throw new IllegalArgumentException("Organizational scope is required.");
        }
        if (!payload.containsKey("module_slugs") || moduleSlugs == null || moduleSlugs.isEmpty()) {
            throw new IllegalArgumentException("At least one module permission is required.");
        }
        if (!hasTabPermissionPayload) {
            throw new IllegalArgumentException("Tab permissions are required.");
        }
    }

    private void ensureCanMutateUsers(ActorAccess actor) {
        if (!isProtected(actor.role()) && !"admin".equals(normalizeRole(actor.role()))) {
            throw new IllegalArgumentException("Only Admin or Super Admin can manage users.");
        }
    }

    private void ensureCanAssignRole(ActorAccess actor, String targetRole) {
        if (isProtected(normalizeRole(targetRole)) && !isProtected(actor.role())) {
            throw new IllegalArgumentException("Only Super Admin can assign Super Admin access.");
        }
    }

    private void ensureAdminCeiling(ActorAccess actor, String targetRole, List<String> moduleSlugs,
        List<String> tabPermissionKeys, AccessScope scope) {
        if (isProtected(actor.role())) {
            return;
        }
        if (!ADMIN_ASSIGNABLE_ROLES.contains(normalizeRole(targetRole))) {
            throw new IllegalArgumentException("Admin can assign only Admin or User access.");
        }
        if (!actor.moduleSlugs().containsAll(moduleSlugs)) {
            throw new IllegalArgumentException("Admin cannot assign modules outside their own access.");
        }
        if (!actor.tabPermissionKeys().containsAll(tabPermissionKeys)) {
            throw new IllegalArgumentException("Admin cannot assign tab permissions outside their own access.");
        }
        if (!withinScope(actor.scope(), scope)) {
            throw new IllegalArgumentException("Admin cannot assign unit or business outside their own scope.");
        }
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

    private boolean changesOwnAccess(Map<String, Object> payload, boolean hasTabPermissionPayload) {
        return payload.containsKey("role")
            || payload.containsKey("module_slugs")
            || hasTabPermissionPayload
            || payload.containsKey("unit_id")
            || payload.containsKey("unitId")
            || payload.containsKey("business_id")
            || payload.containsKey("businessId");
    }

    private boolean hasAnyKey(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    private String text(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        return value instanceof String text ? text.trim() : "";
    }

    private boolean isProtected(String role) {
        return PROTECTED_ROLES.contains(normalizeRole(role));
    }

    private String normalizeRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "super admin" -> "superadmin";
            case "dueño" -> "dueno";
            default -> normalized;
        };
    }

    public record TargetUser(long userId, long userCompanyId, String role) {}

    public record ActorAccess(long userId, long userCompanyId, String role, List<String> moduleSlugs,
        List<String> tabPermissionKeys, AccessScope scope) {}

    public record AccessScope(Long unitId, Long businessId) {}
}
