package com.indice.erp.access.tab;

import java.util.List;

public record TabPermissionRequirement(List<String> anyOf) {

    public TabPermissionRequirement {
        anyOf = List.copyOf(anyOf);
        if (anyOf.isEmpty()) {
            throw new IllegalArgumentException("At least one tab permission is required.");
        }
    }

    public static TabPermissionRequirement one(String permissionKey) {
        return new TabPermissionRequirement(List.of(permissionKey));
    }

    public static TabPermissionRequirement any(String... permissionKeys) {
        return new TabPermissionRequirement(List.of(permissionKeys));
    }
}
