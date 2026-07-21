package com.indice.erp.tenant;

import com.indice.erp.auth.AuthSessionResponse;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class TenantContextResolver {

    private final SessionAuthService sessionAuthService;

    public TenantContextResolver(SessionAuthService sessionAuthService) {
        this.sessionAuthService = sessionAuthService;
    }

    public Optional<TenantContext> resolve(HttpSession session) {
        return sessionAuthService.currentSession(session).map(this::resolve);
    }

    public TenantContext resolve(AuthSessionResponse session) {
        var company = session.company();
        return new TenantContext(
            session.user().id(),
            company.id(),
            company.user_company_id(),
            company.role(),
            new TenantScope(
                company.scope().type(),
                company.scope().unit_id(),
                company.scope().business_id()
            )
        );
    }
}
