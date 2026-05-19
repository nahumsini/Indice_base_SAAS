package com.indice.erp.hr.permissions;

import java.util.List;

public record PermissionActor(
    long userId,
    long companyId,
    long userCompanyId,
    String userName,
    String role,
    List<String> moduleSlugs
) {
}
