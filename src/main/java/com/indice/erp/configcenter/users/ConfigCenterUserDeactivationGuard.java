package com.indice.erp.configcenter.users;

import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.AccessScope;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.ActorAccess;
import com.indice.erp.configcenter.users.ConfigCenterUserMutationGuard.TargetUser;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ConfigCenterUserDeactivationGuard {

    private static final Set<String> PROTECTED_ROLES = Set.of("root", "superadmin");
    private static final Set<String> ADMIN_MANAGED_ROLES = Set.of("admin", "user");

    public void validate(
        ActorAccess actor,
        TargetUser target,
        List<String> targetModuleSlugs,
        List<String> targetTabPermissionKeys,
        AccessScope targetScope
    ) {
        if (actor.userId() == target.userId()) {
            throw new IllegalArgumentException("You cannot deactivate your own user.");
        }
        ensureCanManageUsers(actor);
        if (isProtected(target.role()) && !isProtected(actor.role())) {
            throw new IllegalArgumentException("Protected users can only be changed by Super Admin.");
        }
        if (isProtected(actor.role())) {
            return;
        }
        if (!ADMIN_MANAGED_ROLES.contains(normalize(target.role()))) {
            throw new IllegalArgumentException("Admin can deactivate only Admin or User access.");
        }
        if (!actor.moduleSlugs().containsAll(targetModuleSlugs)) {
            throw new IllegalArgumentException("Admin cannot deactivate users outside their module access.");
        }
        if (!actor.tabPermissionKeys().containsAll(targetTabPermissionKeys)) {
            throw new IllegalArgumentException("Admin cannot deactivate users outside their tab access.");
        }
        if (!withinScope(actor.scope(), targetScope)) {
            throw new IllegalArgumentException("Admin cannot deactivate users outside their unit or business scope.");
        }
    }

    private void ensureCanManageUsers(ActorAccess actor) {
        if (!isProtected(actor.role()) && !"admin".equals(normalize(actor.role()))) {
            throw new IllegalArgumentException("Only Admin or Super Admin can manage users.");
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

    private boolean isProtected(String role) {
        return PROTECTED_ROLES.contains(normalize(role));
    }

    private String normalize(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }
}
