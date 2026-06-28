package com.indice.erp.hr.announcements;

import com.indice.erp.hr.HrOperationalScope;
import java.util.List;
import java.util.Locale;

public record HrAnnouncementActor(
    long userId,
    long companyId,
    long userCompanyId,
    String userName,
    String role,
    Long unitId,
    Long businessId,
    String department,
    List<String> moduleSlugs,
    boolean managementAccess
) {
    public HrOperationalScope operationalScope() {
        var normalizedRole = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        if ("root".equals(normalizedRole) || "superadmin".equals(normalizedRole) || "super admin".equals(normalizedRole)) {
            return HrOperationalScope.corporateOffice();
        }
        if ("admin".equals(normalizedRole) || "owner".equals(normalizedRole) || "dueno".equals(normalizedRole) || "dueño".equals(normalizedRole)) {
            return HrOperationalScope.unitHeadquarters(unitId);
        }
        if ("manager".equals(normalizedRole) || "approver".equals(normalizedRole)) {
            return HrOperationalScope.businessOffice(unitId, businessId);
        }
        return HrOperationalScope.unassigned();
    }

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
            businessId,
            department,
            moduleSlugs,
            nextManagementAccess
        );
    }
}
