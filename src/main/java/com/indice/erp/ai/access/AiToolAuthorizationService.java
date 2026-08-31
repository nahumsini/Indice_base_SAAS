package com.indice.erp.ai.access;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import com.indice.erp.billing.subscription.CompanySubscriptionStatusProvider;
import com.indice.erp.entitlement.CompanyEntitlementService;
import com.indice.erp.entitlement.EntitlementPolicyMode;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AiToolAuthorizationService {

    private static final Set<String> PRIVILEGED_ROLES = Set.of("root", "superadmin");
    private static final TabPermissionRequirement SALES_KPI_PERMISSION =
        TabPermissionRequirement.one("crm.kpis");

    private final CompanySubscriptionStatusProvider subscriptionStatusProvider;
    private final CompanyModuleEntitlementService moduleEntitlementService;
    private final ModuleAccessService moduleAccessService;
    private final TabPermissionAccessService tabPermissionAccessService;
    private final CompanyEntitlementService companyEntitlementService;

    public AiToolAuthorizationService(
        CompanySubscriptionStatusProvider subscriptionStatusProvider,
        CompanyModuleEntitlementService moduleEntitlementService,
        ModuleAccessService moduleAccessService,
        TabPermissionAccessService tabPermissionAccessService,
        CompanyEntitlementService companyEntitlementService
    ) {
        this.subscriptionStatusProvider = subscriptionStatusProvider;
        this.moduleEntitlementService = moduleEntitlementService;
        this.moduleAccessService = moduleAccessService;
        this.tabPermissionAccessService = tabPermissionAccessService;
        this.companyEntitlementService = companyEntitlementService;
    }

    public boolean canReadSalesToday(AuthSessionUser user) {
        if (!subscriptionStatusProvider.currentStatus(user.companyId()).accessAllowed()) {
            return false;
        }
        if (!moduleEntitlementService.hasActiveEntitlement(user.companyId(), "crm")) {
            return false;
        }
        if (!moduleAccessService.canAccess(user, "crm")
            || !tabPermissionAccessService.canAccess(user, SALES_KPI_PERMISSION)) {
            return false;
        }

        var commercialEntitlement = companyEntitlementService.resolve(user.companyId(), "sales");
        return commercialEntitlement.policy_mode() != EntitlementPolicyMode.ENFORCE
            || commercialEntitlement.allowed()
            || PRIVILEGED_ROLES.contains(normalizeRole(user.role()));
    }

    private String normalizeRole(String role) {
        var normalized = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        return "super admin".equals(normalized) ? "superadmin" : normalized;
    }
}
