package com.indice.erp.entitlement;

import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CompanyEntitlementProjectionService {

    private final CompanyEntitlementRepository repository;
    private final Clock clock;

    public CompanyEntitlementProjectionService(CompanyEntitlementRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public void enrollPremiumSignup(long companyId, long catalogVersionId, long ownerUserId) {
        repository.enrollShadow(
            companyId,
            catalogVersionId,
            ownerUserId,
            "Premium signup shadow cohort"
        );
        refresh(companyId);
    }

    @Transactional
    public void refresh(long companyId) {
        repository.replaceProjection(companyId, clock.instant());
    }

    @Transactional
    public boolean refreshIfEnrolled(long companyId) {
        var mode = repository.policy(companyId).mode();
        if (mode == EntitlementPolicyMode.LEGACY || mode == EntitlementPolicyMode.DISABLED) {
            return false;
        }
        refresh(companyId);
        return true;
    }

    @Transactional
    public ProjectionBatch refreshCohort(long afterCompanyId, int batchSize) {
        var companies = repository.cohortCompanyIdsAfter(afterCompanyId, batchSize);
        for (var companyId : companies) {
            repository.replaceProjection(companyId, clock.instant());
        }
        repository.purgeDecisionEvents(clock.instant());
        var lastCompanyId = companies.isEmpty() ? afterCompanyId : companies.getLast();
        return new ProjectionBatch(companies.size(), lastCompanyId);
    }

    public record ProjectionBatch(int refreshed, long lastCompanyId) {
    }
}
