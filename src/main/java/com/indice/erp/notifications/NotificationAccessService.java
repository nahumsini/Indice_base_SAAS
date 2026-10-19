package com.indice.erp.notifications;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.hr.announcements.AnnVisSvc;
import com.indice.erp.hr.announcements.HrAnnouncementActor;
import com.indice.erp.hr.announcements.HrAnnouncementApiException;
import com.indice.erp.hr.announcements.HrAnnouncementSecurityService;
import com.indice.erp.messaging.MessagingAccess;
import com.indice.erp.billing.subscription.BillingAccountAuthorityService;
import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** The global inbox requires an active membership, not permission to read HR announcements. */
@Service
class NotificationAccessService {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final HrAnnouncementSecurityService identities;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final AnnVisSvc announcements;
    private final MessagingAccess messaging;
    private final DistributorPortfolioAccessPolicy distributors;
    private final BillingAccountAuthorityService billing;
    private final java.util.List<NotificationSignalSource> sources;

    NotificationAccessService(SessionAuthService auth, SessionCsrfService csrf, HrAnnouncementSecurityService identities,
            ModuleAccessService modules, TabPermissionAccessService tabs, AnnVisSvc announcements,
            MessagingAccess messaging, DistributorPortfolioAccessPolicy distributors, BillingAccountAuthorityService billing, java.util.List<NotificationSignalSource> sources) {
        this.auth=auth; this.csrf=csrf; this.identities=identities; this.modules=modules;
        this.tabs=tabs; this.announcements=announcements; this.messaging=messaging; this.distributors=distributors;
        this.billing=billing; this.sources=java.util.List.copyOf(sources);
    }
    HrAnnouncementActor actor(HttpSession session, String token, boolean write) {
        if (session == null) throw new HrAnnouncementApiException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        var user=auth.currentUser(session).orElseThrow(() -> new HrAnnouncementApiException(HttpStatus.UNAUTHORIZED,"Unauthorized"));
        if (auth.isPublicDemoSession(session)) throw new HrAnnouncementApiException(HttpStatus.FORBIDDEN,"Forbidden");
        var actor=identities.delegatedActor(user);
        if (write) {
            try { csrf.requireCsrf(session,token); }
            catch (IllegalArgumentException error) { throw new HrAnnouncementApiException(HttpStatus.FORBIDDEN,"Invalid CSRF token."); }
        }
        return actor;
    }
    Scope scope(HrAnnouncementActor actor) { return new Scope(actor); }
    static boolean management(HrAnnouncementActor actor) {
        return Set.of("root","superadmin","admin","owner","dueno","dueño","manager","approver").contains(actor.role());
    }

    final class Scope {
        private final HrAnnouncementActor actor;
        private final AuthSessionUser user;
        private final Map<String,Boolean> grants=new HashMap<>();
        private final Map<String,Boolean> moduleGrants=new HashMap<>();
        Scope(HrAnnouncementActor actor) {
            this.actor=actor;
            this.user=new AuthSessionUser(actor.userId(),actor.companyId(),actor.userCompanyId(),actor.userName(),actor.role());
        }
        private boolean tab(String permission) {
            return grants.computeIfAbsent(permission, key -> {
                var module=key.substring(0,key.indexOf('.'));
                return moduleGrants.computeIfAbsent(module, ignored -> modules.canAccess(user,module))
                    && tabs.canAccess(user,TabPermissionRequirement.one(key));
            });
        }
        boolean allowed(String source, String event) {
            String module=NotificationPreferenceCatalog.module(source,event);
            return switch (module) {
                case "human_resources" -> event.startsWith("hr_permission_") ? sourceAllowed(module,event) : tab("human_resources.announcements");
                case "processes_tasks" -> event.startsWith("process_run_") || event.startsWith("finalized")
                    ? tab("processes.processes") : tab("processes.calendar");
                case "expenses" -> tab("expenses.expenses");
                case "point_of_sale" -> sourceAllowed(module,event);
                case "petty_cash", "receivables", "kpis" -> sourceAllowed(module,event);
                case "inventory" -> tab("pos_stock_low".equals(event) ? "inventory.inventory" : "inventory.purchase-orders");
                case "sales" -> tab(switch (event) {
                    case "sales_quote_follow_up" -> "crm.quotes";
                    case "sales_customer_activity" -> "crm.contracts";
                    case "sales_call_reminder" -> "crm.leads";
                    case "sales_whatsapping_reminder" -> "crm.contacts";
                    default -> "crm.sales";
                });
                case "scheduling" -> tab("scheduling.calendar") || tab("scheduling.reservations");
                case "maintenance" -> tab("maintenance.orders");
                case "control_minutas" -> tab("overdue_agreement".equals(event) ? "control_minutas.agreements" : "control_minutas.meetings");
                // These are targeted owner-delivered notices; row scope is checked separately below.
                case "messaging" -> true;
                case "billing" -> grants.computeIfAbsent("billing", ignored -> billing.isOwner(actor.companyId(),actor.userId())
                    || Set.of("root","superadmin","admin","owner","dueno").contains(actor.role()));
                case "system_tickets" -> grants.computeIfAbsent("distributor", ignored -> {
                    try { distributors.requireDistributor(user); return true; }
                    catch (com.indice.erp.distributorportal.DistributorPortalForbiddenException denied) { return false; }
                });
                default -> false;
            };
        }
        private boolean sourceAllowed(String module,String event) {
            return sources.stream().filter(source->source.module().equals(module)).anyMatch(source->source.canConfigure(user,event));
        }
        boolean announcement(NotificationRow row) {
            if (!allowed("human_resources",row.announcementType())) return false;
            try { announcements.requireVisible(actor,row.announcementId()); return true; }
            catch (java.util.NoSuchElementException denied) { return false; }
        }
        boolean app(AppNotificationRow row) {
            if (!allowed(row.sourceModule(),row.eventType())) return false;
            if ("messaging".equals(row.sourceModule())) return row.sourceId()!=null && messaging.canReadNotification(user,row.sourceId());
            String module=NotificationPreferenceCatalog.module(row.sourceModule(),row.eventType());
            for(var source:sources) if(source.module().equals(module) && source.supports(row.sourceType())) {
                return row.sourceId()!=null && source.visible(user,row.sourceType(),row.sourceId(),row.eventType());
            }
            return true;
        }
    }
}
