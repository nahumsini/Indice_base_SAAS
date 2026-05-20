package com.indice.erp.hr.announcements;

import java.util.List;

public record HrAnnouncementActor(
    long userId,
    long companyId,
    long userCompanyId,
    String userName,
    String role,
    Long unitId,
    String department,
    List<String> moduleSlugs,
    boolean managementAccess
) {
    public String unitTargetValue() {
        return unitId == null ? "" : String.valueOf(unitId);
    }

    public String normalizedDepartment() {
        return department == null ? "" : department.trim();
    }

    public HrAnnouncementActor withManagementAccess(boolean nextManagementAccess) {
        return new HrAnnouncementActor(
            userId,
            companyId,
            userCompanyId,
            userName,
            role,
            unitId,
            department,
            moduleSlugs,
            nextManagementAccess
        );
    }
}
