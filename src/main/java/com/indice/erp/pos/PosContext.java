package com.indice.erp.pos;

import java.util.Set;

public record PosContext(
        Long userId,
        Long companyId,
        String userName,
        String role,
        boolean moduleAccess,
        PosScope scope) {

    private static final Set<String> ADMIN_ROLES = Set.of("root", "superadmin", "admin", "owner");

    public boolean canManageOtherUsers() {
        return ADMIN_ROLES.contains(role);
    }
}
