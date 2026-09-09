package com.indice.erp.kiosk.engine;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Single authorization boundary for the company-wide Provider Center. */
@Service
public class ProviderCenterAccessPolicy {

    private final JdbcTemplate jdbcTemplate;

    public ProviderCenterAccessPolicy(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean hasAccess(long companyId, long providerId) {
        return activeIdentity(companyId, providerId).isPresent();
    }

    public ProviderIdentity requireAccess(long companyId, long providerId) {
        return activeIdentity(companyId, providerId)
            .orElseThrow(() -> new SecurityException("Provider Center access is unavailable."));
    }

    public Optional<ProviderIdentity> activeIdentity(long companyId, long providerId) {
        if (companyId <= 0 || providerId <= 0) return Optional.empty();
        return jdbcTemplate.query(
            """
                SELECT provider.id, provider.company_id, provider.name, provider.email,
                       provider.unit_id, provider.business_id
                FROM finance_providers provider
                INNER JOIN kiosk_identity_credentials credential
                  ON credential.company_id = provider.company_id
                 AND credential.identity_type = 'PROVIDER'
                 AND credential.identity_id = provider.id
                 AND credential.credential_type = 'PIN'
                 AND credential.status = 'ACTIVE'
                 AND credential.credential_origin = 'PROVIDER_CENTER_ADMIN'
                 AND credential.secret_hash IS NOT NULL
                 AND credential.secret_hash <> ''
                WHERE provider.company_id = ? AND provider.id = ?
                  AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                  AND provider.unit_id IS NOT NULL AND provider.business_id IS NOT NULL
                LIMIT 1
                """,
            (rs, rowNum) -> new ProviderIdentity(
                rs.getLong("id"), rs.getLong("company_id"), rs.getString("name"),
                rs.getString("email"), rs.getObject("unit_id", Long.class),
                rs.getObject("business_id", Long.class)),
            companyId, providerId).stream().findFirst();
    }

    public record ProviderIdentity(
        long id, long companyId, String name, String email, Long unitId, Long businessId) {
    }
}
