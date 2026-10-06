package com.indice.erp.messaging;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.billing.subscription.CompanySubscriptionStatusProvider;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.billing.lifecycle.CommercialAccessRestrictedException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.messaging.MessagingContracts.*;

@Service
public class MessagingAccess {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final JdbcTemplate jdbc;
    private final PlatformAdminAccessService platform;
    private final DistributorPortfolioAccessPolicy distributors;
    private final CompanySubscriptionStatusProvider subscription;
    private final CommercialLifecycleAccessService lifecycle;

    public MessagingAccess(SessionAuthService auth, SessionCsrfService csrf, JdbcTemplate jdbc,
        PlatformAdminAccessService platform, DistributorPortfolioAccessPolicy distributors,
        CompanySubscriptionStatusProvider subscription, CommercialLifecycleAccessService lifecycle) {
        this.auth = auth; this.csrf = csrf; this.jdbc = jdbc; this.platform = platform; this.distributors = distributors;
        this.subscription=subscription; this.lifecycle=lifecycle;
    }

    public Actor actor(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        var user = auth.currentUser(session).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (auth.isPublicDemoSession(session)) throw forbidden();
        if (!"GET".equals(request.getMethod())) csrf.requireCsrf(session, request.getHeader("X-CSRF-Token"));
        var path = request.getRequestURI();
        if (path.startsWith("/api/v1/platform-admin/")) {
            platform.require(user.userId(), "SYSTEM_TICKETS_MANAGE");
            return new Actor(user.userId(), user.companyId(), user.userCompanyId(), "PLATFORM");
        }
        if (path.startsWith("/api/v1/distributor-portal/")) {
            distributors.requireDistributor(user);
            return new Actor(user.userId(), user.companyId(), user.userCompanyId(), "DISTRIBUTOR");
        }
        if (user.userCompanyId() == null) throw forbidden();
        var active = jdbc.queryForObject("""
            SELECT COUNT(*) FROM user_companies uc JOIN companies c ON c.id = uc.company_id
            WHERE uc.id = ? AND uc.user_id = ? AND uc.company_id = ?
              AND LOWER(COALESCE(uc.status,'active')) = 'active' AND c.platform_status = 'ACTIVE'
            """, Integer.class, user.userCompanyId(), user.userId(), user.companyId());
        if (active == null || active != 1) throw forbidden();
        boolean supportOnly=!subscription.currentStatus(user.companyId()).accessAllowed();
        try { lifecycle.requireWrite(user.companyId()); } catch(CommercialAccessRestrictedException restricted) { supportOnly=true; }
        return new Actor(user.userId(), user.companyId(), user.userCompanyId(), "MEMBER",supportOnly);
    }

    public void conversation(Actor actor, Conversation conversation) {
        if (actor.member()) {
            if(actor.supportOnly() && !"SUPPORT".equals(conversation.kind())) throw forbidden();
            var count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM messaging_participants p
                JOIN user_companies uc ON uc.id = p.membership_id
                WHERE p.conversation_id = ? AND p.membership_id = ? AND uc.company_id = ?
                  AND uc.user_id = ? AND LOWER(COALESCE(uc.status,'active')) = 'active'
                """, Integer.class, conversation.id(), actor.membershipId(), actor.companyId(), actor.userId());
            if (conversation.companyId() != actor.companyId() || count == null || count != 1) throw notFound();
        } else if ("PLATFORM".equals(actor.scope())) {
            platform.require(actor.userId(), "SYSTEM_TICKETS_MANAGE");
            if (!"SUPPORT".equals(conversation.kind())) throw notFound();
        } else {
            if (!"DISTRIBUTOR".equals(conversation.kind())
                || conversation.distributorCompanyId() == null
                || conversation.distributorCompanyId() != actor.companyId()) throw notFound();
            var role = jdbc.queryForObject("SELECT role FROM user_companies WHERE id = ?", String.class, actor.membershipId());
            distributors.requireClient(new AuthSessionUser(actor.userId(), actor.companyId(), actor.membershipId(), "", role), conversation.companyId());
        }
    }

    public static ResponseStatusException forbidden() { return new ResponseStatusException(HttpStatus.FORBIDDEN, "messaging_access_denied"); }
    public static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "conversation_not_found"); }
}
