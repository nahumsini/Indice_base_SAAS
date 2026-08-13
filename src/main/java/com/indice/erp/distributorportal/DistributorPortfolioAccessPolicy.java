package com.indice.erp.distributorportal;

import com.indice.erp.auth.AuthSessionUser;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Server-side authorization boundary for the distributor portfolio.
 *
 * <p>A distributor can operate its own portal and only the SUPER_ADMIN client
 * companies that it created or that Root explicitly assigned to it. Controllers
 * must call this policy before delegating to the shared platform operations.</p>
 */
@Service
public class DistributorPortfolioAccessPolicy {

    private static final Set<String> ADMIN_ROLES = Set.of("root", "superadmin", "owner", "dueno", "admin");

    private final JdbcTemplate jdbcTemplate;

    public DistributorPortfolioAccessPolicy(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public DistributorIdentity requireDistributor(AuthSessionUser actor) {
        if (actor == null
            || actor.userId() == null
            || actor.companyId() == null
            || actor.userCompanyId() == null
            || !ADMIN_ROLES.contains(normalize(actor.role()))) {
            throw new DistributorPortalForbiddenException("Distributor administration access is required.");
        }

        return jdbcTemplate.query(
            """
                SELECT company.id, company.name
                FROM companies company
                JOIN user_companies membership
                  ON membership.id = ?
                 AND membership.user_id = ?
                 AND membership.company_id = company.id
                 AND LOWER(COALESCE(membership.status, 'active')) = 'active'
                WHERE company.id = ?
                  AND UPPER(COALESCE(company.commercial_account_type, '')) = 'DISTRIBUTOR'
                LIMIT 1
                """,
            (rs, rowNum) -> new DistributorIdentity(rs.getLong("id"), rs.getString("name")),
            actor.userCompanyId(),
            actor.userId(),
            actor.companyId()
        ).stream().findFirst().orElseThrow(() ->
            new DistributorPortalForbiddenException("The active company is not an authorized distributor account.")
        );
    }

    public DistributorIdentity requireClient(AuthSessionUser actor, long clientCompanyId) {
        var distributor = requireDistributor(actor);
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM companies client
                WHERE client.id = ?
                  AND client.id <> ?
                  AND UPPER(COALESCE(client.commercial_account_type, '')) = 'SUPER_ADMIN'
                  AND (
                      client.distributor_company_id = ?
                      OR (
                          client.distributor_company_id IS NULL
                          AND client.created_by_distributor_company_id = ?
                      )
                  )
                """,
            Integer.class,
            clientCompanyId,
            distributor.companyId(),
            distributor.companyId(),
            distributor.companyId()
        );
        if (count == null || count == 0) {
            throw new DistributorPortalForbiddenException("This client does not belong to the active distributor portfolio.");
        }
        return distributor;
    }

    public DistributorIdentity requireAppointment(AuthSessionUser actor, long appointmentId) {
        var distributor = requireDistributor(actor);
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM consulting_appointments appointment
                JOIN companies client ON client.id = appointment.company_id
                WHERE appointment.id = ?
                  AND client.id <> ?
                  AND UPPER(COALESCE(client.commercial_account_type, '')) = 'SUPER_ADMIN'
                  AND (
                      client.distributor_company_id = ?
                      OR (
                          client.distributor_company_id IS NULL
                          AND client.created_by_distributor_company_id = ?
                      )
                  )
                """,
            Integer.class,
            appointmentId,
            distributor.companyId(),
            distributor.companyId(),
            distributor.companyId()
        );
        if (count == null || count == 0) {
            throw new DistributorPortalForbiddenException("This consulting session does not belong to the active distributor portfolio.");
        }
        return distributor;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    public record DistributorIdentity(long companyId, String companyName) {
    }
}
