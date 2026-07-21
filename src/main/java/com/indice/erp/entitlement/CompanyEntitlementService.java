package com.indice.erp.entitlement;

import com.indice.erp.billing.catalog.CommercialCapabilityNormalizer;
import org.springframework.stereotype.Service;

@Service
public class CompanyEntitlementService {

    private final CompanyEntitlementRepository repository;

    public CompanyEntitlementService(CompanyEntitlementRepository repository) {
        this.repository = repository;
    }

    public CompanyEntitlementResolution resolve(long companyId, String rawCapability) {
        var capability = CommercialCapabilityNormalizer.normalize(rawCapability);
        var policy = repository.policy(companyId);
        if (policy.mode() == EntitlementPolicyMode.LEGACY || policy.mode() == EntitlementPolicyMode.DISABLED) {
            return new CompanyEntitlementResolution(companyId, capability, false, policy.mode(), java.util.List.of());
        }
        var sources = repository.activeSources(companyId, capability).stream()
            .map(CompanyEntitlementRepository.EntitlementSource::summary)
            .toList();
        return new CompanyEntitlementResolution(companyId, capability, !sources.isEmpty(), policy.mode(), sources);
    }
}
