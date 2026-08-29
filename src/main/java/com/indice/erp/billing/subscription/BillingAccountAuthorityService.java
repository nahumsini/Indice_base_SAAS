package com.indice.erp.billing.subscription;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class BillingAccountAuthorityService {

    private final JdbcTemplate jdbc;

    public BillingAccountAuthorityService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isOwner(long companyId, long userId) {
        var count = jdbc.queryForObject(
            """
                SELECT COUNT(*)
                FROM company_ownerships
                WHERE company_id = ? AND owner_user_id = ? AND status = 'ACTIVE'
                """,
            Integer.class,
            companyId,
            userId
        );
        return count != null && count > 0;
    }

    public void requireOwner(long companyId, long userId) {
        if (!isOwner(companyId, userId)) {
            throw new BillingOwnerRequiredException("Sólo el propietario puede administrar el método de pago.");
        }
    }

    public static class BillingOwnerRequiredException extends SecurityException {
        public BillingOwnerRequiredException(String message) {
            super(message);
        }
    }
}
