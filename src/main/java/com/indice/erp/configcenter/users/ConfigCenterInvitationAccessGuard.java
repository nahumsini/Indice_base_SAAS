package com.indice.erp.configcenter.users;

import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.ActorAccess;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ConfigCenterInvitationAccessGuard {

    private static final Set<String> PROTECTED_ROLES = Set.of("root", "superadmin");
    private static final Set<String> ADMIN_MANAGED_ROLES = Set.of("admin", "user");

    public void validateManage(
        ActorAccess actor,
        String invitationRole,
        List<String> moduleSlugs,
        List<String> tabPermissionKeys,
        AccessScope scope
    ) {
        if (!isProtected(actor.role()) && !"admin".equals(normalize(actor.role()))) {
            throw new IllegalArgumentException("Only Admin or Super Admin can manage invitations.");
        }
        if (isProtected(actor.role())) {
            return;
        }
        if (!ADMIN_MANAGED_ROLES.contains(normalize(invitationRole))) {
            throw new IllegalArgumentException("Admin can manage only Admin or User invitations.");
        }
        if (!actor.moduleSlugs().containsAll(moduleSlugs)) {
            throw new IllegalArgumentException("Admin cannot manage invitations outside their module access.");
        }
        if (!actor.tabPermissionKeys().containsAll(tabPermissionKeys)) {
            throw new IllegalArgumentException("Admin cannot manage invitations outside their tab access.");
        }
        if (!withinScope(actor.scope(), scope)) {
            throw new IllegalArgumentException("Admin cannot manage invitations outside their unit or business scope.");
        }
    }

    private boolean withinScope(AccessScope actorScope, AccessScope invitationScope) {
        if (actorScope.businessId() != null) {
            return actorScope.businessId().equals(invitationScope.businessId());
        }
        if (actorScope.unitId() != null) {
            return actorScope.unitId().equals(invitationScope.unitId());
        }
        return true;
    }

    private boolean isProtected(String role) {
        return PROTECTED_ROLES.contains(normalize(role));
    }

    private String normalize(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }
}
