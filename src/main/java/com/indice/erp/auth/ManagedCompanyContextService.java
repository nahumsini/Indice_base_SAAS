package com.indice.erp.auth;

import com.indice.erp.distributorportal.DistributorPortalForbiddenException;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAuditService;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Keeps the authenticated company separate from a client company being inspected.
 *
 * <p>The delegated target is intentionally consumed only by APIs that explicitly
 * opt in (billing first). It never creates a membership and never replaces the
 * company that owns the authenticated session.</p>
 */
@Service
public class ManagedCompanyContextService {

    public static final String SESSION_MANAGED_COMPANY_ID = "auth.managed.company.id";
    public static final String SESSION_MANAGED_MODE = "auth.managed.mode";
    public static final String PLATFORM_ROOT = "PLATFORM_ROOT";
    public static final String DISTRIBUTOR_PORTFOLIO = "DISTRIBUTOR_PORTFOLIO";
    public static final String NONE = "NONE";

    private final JdbcTemplate jdbcTemplate;
    private final SessionAuthService auth;
    private final PlatformAdminAccessService platformAccess;
    private final DistributorPortfolioAccessPolicy distributorAccess;
    private final PlatformAuditService audit;

    public ManagedCompanyContextService(
        JdbcTemplate jdbcTemplate,
        SessionAuthService auth,
        PlatformAdminAccessService platformAccess,
        DistributorPortfolioAccessPolicy distributorAccess,
        PlatformAuditService audit
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auth = auth;
        this.platformAccess = platformAccess;
        this.distributorAccess = distributorAccess;
        this.audit = audit;
    }

    public ManagedCompanyContextResponse current(AuthSessionUser actor, HttpSession session) {
        var authority = authority(actor, session);
        if (NONE.equals(authority.mode())) {
            clearAttributes(session);
            return response(authority, null, List.of());
        }
        var companies = companies(authority);
        var selectedId = selectedCompanyId(session);
        var selected = selectedId == null ? null : companies.stream()
            .filter(company -> company.id() == selectedId)
            .findFirst()
            .orElse(null);
        if (selectedId != null && selected == null) {
            clearAttributes(session);
        }
        return response(authority, selected, companies);
    }

    public ManagedCompanyContextResponse activate(AuthSessionUser actor, long companyId, HttpSession session) {
        var authority = authority(actor, session);
        if (NONE.equals(authority.mode())) {
            denied(actor, companyId, NONE, "The account has no delegated client access.");
            throw new ManagedCompanyContextForbiddenException("Delegated client access is not available for this account.");
        }
        var company = requireCompany(authority, actor, companyId);
        session.setAttribute(SESSION_MANAGED_COMPANY_ID, company.id());
        session.setAttribute(SESSION_MANAGED_MODE, authority.mode());
        audit.record(actor.userId(), "DELEGATED_COMPANY_CONTEXT_STARTED", "COMPANY",
            Long.toString(company.id()), company.id(), "SUCCESS", Map.of(
                "authority_mode", authority.mode(),
                "authority_company_id", authority.companyId(),
                "read_only", true
            ));
        return current(actor, session);
    }

    public ManagedCompanyContextResponse clear(AuthSessionUser actor, HttpSession session) {
        var selected = selectedCompanyId(session);
        var mode = String.valueOf(session.getAttribute(SESSION_MANAGED_MODE));
        clearAttributes(session);
        if (selected != null) {
            audit.record(actor.userId(), "DELEGATED_COMPANY_CONTEXT_CLEARED", "COMPANY",
                Long.toString(selected), selected, "SUCCESS", Map.of("authority_mode", mode));
        }
        return current(actor, session);
    }

    public BillingContext resolveBillingContext(AuthSessionUser actor, HttpSession session) {
        var workspace = resolveWorkspaceContext(actor, session);
        if (workspace.isEmpty()) {
            return new BillingContext(actor.companyId(), "", "DIRECT", false, false);
        }
        var selected = workspace.get();
        return new BillingContext(selected.companyId(), selected.companyName(), selected.accessMode(), true, true);
    }

    /**
     * Resolves the effective tenant for a protected consultation request.
     *
     * <p>The authenticated actor is deliberately kept separate from the target
     * company. Authorization is revalidated on every resolution so a revoked
     * platform or distributor relationship cannot leave a stale client tenant
     * active in the session.</p>
     */
    public Optional<WorkspaceContext> resolveWorkspaceContext(AuthSessionUser actor, HttpSession session) {
        var selectedId = selectedCompanyId(session);
        if (selectedId == null) {
            return Optional.empty();
        }
        var authority = authority(actor, session);
        if (NONE.equals(authority.mode())) {
            clearAttributes(session);
            throw new ManagedCompanyContextForbiddenException("The delegated client context is no longer authorized.");
        }
        var company = requireCompany(authority, actor, selectedId);
        return Optional.of(new WorkspaceContext(company.id(), company.name(), authority.mode(), true));
    }

    public static Long effectiveCompanyId(HttpSession session) {
        if (session == null) return null;
        var managedCompanyId = session.getAttribute(SESSION_MANAGED_COMPANY_ID);
        if (managedCompanyId instanceof Number number) {
            return number.longValue();
        }
        var authenticatedCompanyId = session.getAttribute(SessionAuthService.SESSION_COMPANY_ID);
        return authenticatedCompanyId instanceof Number number ? number.longValue() : null;
    }

    public static void clearAttributes(HttpSession session) {
        if (session == null) return;
        session.removeAttribute(SESSION_MANAGED_COMPANY_ID);
        session.removeAttribute(SESSION_MANAGED_MODE);
    }

    private Authority authority(AuthSessionUser actor, HttpSession session) {
        if (actor == null || actor.userId() == null || actor.companyId() == null || auth.isPublicDemoSession(session)) {
            return new Authority(NONE, null, "");
        }
        var platform = platformAccess.find(actor.userId());
        if (platform != null && PLATFORM_ROOT.equals(platform.role())) {
            return new Authority(PLATFORM_ROOT, actor.companyId(), companyName(actor.companyId()));
        }
        try {
            var distributor = distributorAccess.requireDistributor(actor);
            return new Authority(DISTRIBUTOR_PORTFOLIO, distributor.companyId(), distributor.companyName());
        } catch (DistributorPortalForbiddenException exception) {
            return new Authority(NONE, null, "");
        }
    }

    private List<ManagedCompanyContextResponse.ManagedCompany> companies(Authority authority) {
        if (PLATFORM_ROOT.equals(authority.mode())) {
            return jdbcTemplate.query(
                """
                    SELECT company.id, company.name
                    FROM companies company
                    WHERE UPPER(COALESCE(company.commercial_account_type, '')) = 'SUPER_ADMIN'
                      AND company.platform_status = 'ACTIVE'
                    ORDER BY company.name ASC, company.id ASC
                    """,
                (rs, rowNum) -> managedCompany(rs.getLong("id"), rs.getString("name"), authority.mode(), null)
            );
        }
        return jdbcTemplate.query(
            """
                SELECT client.id, client.name
                FROM companies client
                WHERE UPPER(COALESCE(client.commercial_account_type, '')) = 'SUPER_ADMIN'
                  AND client.platform_status = 'ACTIVE'
                  AND client.id <> ?
                  AND (
                      client.distributor_company_id = ?
                      OR (
                          client.distributor_company_id IS NULL
                          AND client.created_by_distributor_company_id = ?
                      )
                  )
                ORDER BY client.name ASC, client.id ASC
                """,
            (rs, rowNum) -> managedCompany(rs.getLong("id"), rs.getString("name"), authority.mode(), null),
            authority.companyId(), authority.companyId(), authority.companyId()
        );
    }

    private ManagedCompanyContextResponse.ManagedCompany requireCompany(
        Authority authority,
        AuthSessionUser actor,
        long companyId
    ) {
        if (DISTRIBUTOR_PORTFOLIO.equals(authority.mode())) {
            try {
                distributorAccess.requireClient(actor, companyId);
            } catch (DistributorPortalForbiddenException exception) {
                denied(actor, companyId, authority.mode(), exception.getMessage());
                throw new ManagedCompanyContextForbiddenException("This client is not part of the distributor portfolio.");
            }
        }
        var company = jdbcTemplate.query(
            """
                SELECT id, name
                FROM companies
                WHERE id = ?
                  AND UPPER(COALESCE(commercial_account_type, '')) = 'SUPER_ADMIN'
                  AND platform_status = 'ACTIVE'
                LIMIT 1
                """,
            (rs, rowNum) -> managedCompany(rs.getLong("id"), rs.getString("name"), authority.mode(), null),
            companyId
        ).stream().findFirst().orElse(null);
        if (company == null) {
            denied(actor, companyId, authority.mode(), "The requested client company does not exist.");
            throw new ManagedCompanyContextForbiddenException("The requested client company is not available.");
        }
        return company;
    }

    private ManagedCompanyContextResponse response(
        Authority authority,
        ManagedCompanyContextResponse.ManagedCompany selected,
        List<ManagedCompanyContextResponse.ManagedCompany> companies
    ) {
        var activeCompanies = companies.stream()
            .map(company -> new ManagedCompanyContextResponse.ManagedCompany(
                company.id(), company.name(), company.access_mode(),
                selected != null && selected.id() == company.id(), true
            ))
            .toList();
        var active = selected == null ? null : new ManagedCompanyContextResponse.ManagedCompany(
            selected.id(), selected.name(), authority.mode(), true, true
        );
        return new ManagedCompanyContextResponse(
            authority.mode(), authority.companyId(), authority.companyName(),
            active != null, active, active != null, activeCompanies
        );
    }

    private ManagedCompanyContextResponse.ManagedCompany managedCompany(
        long id,
        String name,
        String mode,
        Long selectedId
    ) {
        return new ManagedCompanyContextResponse.ManagedCompany(
            id, name, mode, selectedId != null && selectedId == id, true
        );
    }

    private Long selectedCompanyId(HttpSession session) {
        var value = session == null ? null : session.getAttribute(SESSION_MANAGED_COMPANY_ID);
        return value instanceof Number number ? number.longValue() : null;
    }

    private String companyName(long companyId) {
        return jdbcTemplate.query(
            "SELECT name FROM companies WHERE id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString(1),
            companyId
        ).stream().findFirst().orElse("");
    }

    private void denied(AuthSessionUser actor, long companyId, String mode, String reason) {
        if (actor == null || actor.userId() == null) return;
        audit.record(actor.userId(), "DELEGATED_COMPANY_CONTEXT_DENIED", "COMPANY",
            Long.toString(companyId), companyId, "DENIED", Map.of(
                "authority_mode", mode == null ? NONE : mode,
                "reason", reason == null ? "Denied" : reason
            ));
    }

    private record Authority(String mode, Long companyId, String companyName) {
    }

    public record BillingContext(
        long companyId,
        String companyName,
        String accessMode,
        boolean delegated,
        boolean readOnly
    ) {
    }

    public record WorkspaceContext(
        long companyId,
        String companyName,
        String accessMode,
        boolean readOnly
    ) {
    }
}
