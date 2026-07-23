package com.indice.erp.billing.subscription;

import com.indice.erp.auth.BasicModuleCatalog;
import java.util.Collection;
import org.springframework.stereotype.Service;

@Service
public class CompanyModuleEntitlementService {

    private final CompanyModuleEntitlementRepository repository;

    CompanyModuleEntitlementService(CompanyModuleEntitlementRepository repository) {
        this.repository = repository;
    }

    public void grantLaunchOffer(long companyId) {
        repository.grantLaunchOffer(companyId);
    }

    public void grantUserLaunchRoles(long userCompanyId) {
        repository.grantUserLaunchRoles(userCompanyId);
    }

    public void storePaidPlan(long companyId, Collection<String> selectedModules) {
        repository.storePaidPlan(companyId, selectedModules);
    }

    public void activatePaidPlan(long companyId) {
        repository.activatePaidPlan(companyId);
    }

    public void activatePaidPlanBySubscription(String stripeSubscriptionId) {
        if (stripeSubscriptionId != null && !stripeSubscriptionId.isBlank()) {
            repository.activatePaidPlanBySubscription(stripeSubscriptionId.trim());
        }
    }

    public boolean hasActiveEntitlement(long companyId, String moduleSlug) {
        var normalized = BasicModuleCatalog.normalize(moduleSlug);
        return normalized.isBlank() || repository.hasActiveEntitlement(companyId, normalized);
    }
}
