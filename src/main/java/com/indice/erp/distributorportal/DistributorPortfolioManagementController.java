package com.indice.erp.distributorportal;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.seats.SeatCapacityExceededException;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.InvitationEmailResult;
import com.indice.erp.configcenter.InvitationEmailService;
import com.indice.erp.consulting.ConsultingAdministrationService;
import com.indice.erp.platformadmin.PlatformAccountProvisioningService;
import com.indice.erp.platformadmin.PlatformAdminService;
import com.indice.erp.platformadmin.PlatformCompanyModuleService;
import com.indice.erp.platformadmin.PlatformCompanyUserService;
import com.indice.erp.platformadmin.PlatformTrialExtensionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * Distributor-facing façade over the shared account operations.
 *
 * <p>The implementation deliberately delegates to the same services used by
 * Platform Admin. Every request is first scoped by
 * {@link DistributorPortfolioAccessPolicy}, so a manipulated company id cannot
 * cross distributor portfolios.</p>
 */
@RestController
@RequestMapping("/api/v1/distributor-portal")
public class DistributorPortfolioManagementController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final DistributorPortfolioAccessPolicy portfolioAccess;
    private final PlatformAdminService accounts;
    private final PlatformAccountProvisioningService provisioning;
    private final PlatformCompanyModuleService companyModules;
    private final PlatformCompanyUserService companyUsers;
    private final PlatformTrialExtensionService trialExtensions;
    private final ConsultingAdministrationService consulting;
    private final InvitationEmailService invitationEmailService;
    private final AppWebProperties appWebProperties;

    public DistributorPortfolioManagementController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        DistributorPortfolioAccessPolicy portfolioAccess,
        PlatformAdminService accounts,
        PlatformAccountProvisioningService provisioning,
        PlatformCompanyModuleService companyModules,
        PlatformCompanyUserService companyUsers,
        PlatformTrialExtensionService trialExtensions,
        ConsultingAdministrationService consulting,
        InvitationEmailService invitationEmailService,
        AppWebProperties appWebProperties
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.portfolioAccess = portfolioAccess;
        this.accounts = accounts;
        this.provisioning = provisioning;
        this.companyModules = companyModules;
        this.companyUsers = companyUsers;
        this.trialExtensions = trialExtensions;
        this.consulting = consulting;
        this.invitationEmailService = invitationEmailService;
        this.appWebProperties = appWebProperties;
    }

    @GetMapping("/catalog")
    public ResponseEntity<?> catalog(HttpSession session) {
        return withActor(session, actor -> {
            portfolioAccess.requireDistributor(actor);
            return accounts.activeCatalogAfterAuthorization();
        });
    }

    @GetMapping("/companies/{companyId}")
    public ResponseEntity<?> company(HttpSession session, @PathVariable long companyId) {
        return withActor(session, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return accounts.companyAfterAuthorization(companyId);
        });
    }

    @PostMapping("/companies")
    public ResponseEntity<?> createCompany(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformAccountProvisioningService.CreateAccountRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            var distributor = portfolioAccess.requireDistributor(actor);
            return ResponseEntity.status(HttpStatus.CREATED).body(provisioning.createForDistributor(
                actor.userId(), distributor.companyId(), distributor.companyName(), idempotencyKey, request
            ));
        });
    }

    @PatchMapping("/companies/{companyId}/products")
    public ResponseEntity<?> updateProducts(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformCompanyModuleService.ProductSelectionRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return ResponseEntity.ok(companyModules.updateTrialProductsAfterAuthorization(
                actor.userId(), companyId, idempotencyKey, request
            ));
        });
    }

    @PostMapping("/companies/{companyId}/products/preview")
    public ResponseEntity<?> previewProducts(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCompanyModuleService.ProductSelectionRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return ResponseEntity.ok(companyModules.previewProductsAfterAuthorization(companyId, request));
        });
    }

    @PostMapping("/companies/{companyId}/benefits")
    public ResponseEntity<?> grantBenefit(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformAdminService.BenefitRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return ResponseEntity.status(HttpStatus.CREATED).body(accounts.grantBenefitAfterAuthorization(
                actor.userId(), companyId, idempotencyKey, request
            ));
        });
    }

    @DeleteMapping("/companies/{companyId}/benefits/{reference}")
    public ResponseEntity<?> revokeBenefit(
        HttpSession session,
        @PathVariable long companyId,
        @PathVariable String reference,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) PlatformAdminService.RevokeRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return ResponseEntity.ok(accounts.revokeBenefitAfterAuthorization(
                actor.userId(), companyId, reference, request == null ? null : request.reason()
            ));
        });
    }

    @PatchMapping("/companies/{companyId}/trial-extension")
    public ResponseEntity<?> extendTrial(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformTrialExtensionService.ExtensionRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return ResponseEntity.ok(trialExtensions.extendAfterAuthorization(
                actor.userId(), companyId, idempotencyKey, request
            ));
        });
    }

    @PostMapping("/companies/{companyId}/users/invitations")
    public ResponseEntity<?> inviteUser(
        HttpSession session,
        HttpServletRequest servletRequest,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformCompanyUserService.InvitationRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            var result = companyUsers.inviteAfterAuthorization(actor.userId(), companyId, idempotencyKey, request);
            var inviteLink = buildInviteLink(servletRequest, String.valueOf(result.get("token")));
            var emailResult = invitationEmailService.sendInvitation(
                String.valueOf(result.get("email")), String.valueOf(result.get("full_name")), inviteLink
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(
                invitationResponse(result, inviteLink, emailResult)
            );
        });
    }

    @DeleteMapping("/companies/{companyId}/users/invitations/{invitationId}")
    public ResponseEntity<?> cancelInvitation(
        HttpSession session,
        @PathVariable long companyId,
        @PathVariable long invitationId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return ResponseEntity.ok(companyUsers.cancelInvitationAfterAuthorization(
                actor.userId(), companyId, invitationId
            ));
        });
    }

    @PostMapping("/companies/{companyId}/users/invitations/{invitationId}/resend")
    public ResponseEntity<?> resendInvitation(
        HttpSession session,
        HttpServletRequest servletRequest,
        @PathVariable long companyId,
        @PathVariable long invitationId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            var result = companyUsers.resendInvitationAfterAuthorization(actor.userId(), companyId, invitationId);
            var inviteLink = buildInviteLink(servletRequest, String.valueOf(result.get("token")));
            var emailResult = invitationEmailService.sendInvitation(
                String.valueOf(result.get("email")), String.valueOf(result.get("full_name")), inviteLink
            );
            return ResponseEntity.ok(invitationResponse(result, inviteLink, emailResult));
        });
    }

    @PatchMapping("/companies/{companyId}/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(
        HttpSession session,
        @PathVariable long companyId,
        @PathVariable long userId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCompanyUserService.MemberStatusRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireClient(actor, companyId);
            return ResponseEntity.ok(companyUsers.updateStatusAfterAuthorization(
                actor.userId(), companyId, userId, request
            ));
        });
    }

    @GetMapping("/consulting")
    public ResponseEntity<?> consultingWorkspace(HttpSession session) {
        return withActor(session, actor -> {
            var distributor = portfolioAccess.requireDistributor(actor);
            return consulting.workspaceForDistributorAfterAuthorization(distributor.companyId());
        });
    }

    @PostMapping("/consulting/appointments")
    public ResponseEntity<?> createConsultingAppointment(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.AdminAppointmentCreateRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            var distributor = portfolioAccess.requireClient(actor, request.companyId());
            return ResponseEntity.status(HttpStatus.CREATED).body(
                consulting.createDistributorAppointmentAfterAuthorization(
                    actor.userId(), distributor.companyId(), distributor.companyName(), request
                )
            );
        });
    }

    @PatchMapping("/consulting/appointments/{appointmentId}")
    public ResponseEntity<?> updateConsultingAppointment(
        HttpSession session,
        @PathVariable long appointmentId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.AppointmentUpdateRequest request
    ) {
        return mutate(session, csrfToken, actor -> {
            portfolioAccess.requireAppointment(actor, appointmentId);
            return ResponseEntity.ok(consulting.updateDistributorAppointmentAfterAuthorization(
                actor.userId(), appointmentId, request
            ));
        });
    }

    private ResponseEntity<?> withActor(HttpSession session, ActorOperation operation) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(operation.execute(actor));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> mutate(HttpSession session, String csrfToken, ActorMutation operation) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            csrf.requireCsrf(session, csrfToken);
            return operation.execute(actor);
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof DistributorPortalForbiddenException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof NoSuchElementException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
        }
        if (exception instanceof SeatCapacityExceededException capacity) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", "Esta cuenta alcanzó su límite de usuarios. Agrega otro lugar antes de continuar.",
                "code", "SEAT_CAPACITY_EXCEEDED",
                "seats", Map.of(
                    "limit", capacity.snapshot().limit(),
                    "active", capacity.snapshot().active(),
                    "reserved", capacity.snapshot().reserved(),
                    "available", capacity.snapshot().available()
                )
            ));
        }
        if (exception instanceof IllegalStateException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    private String buildInviteLink(HttpServletRequest request, String token) {
        var configuredBaseUrl = appWebProperties.resolveInvitationBaseUrl();
        if (!configuredBaseUrl.isBlank()) return configuredBaseUrl + "/invite/" + token;
        var browserBaseUrl = browserBaseUrl(request);
        if (!browserBaseUrl.isBlank()) return browserBaseUrl + "/invite/" + token;
        return ServletUriComponentsBuilder.fromCurrentContextPath().path("/invite/").path(token).toUriString();
    }

    private String browserBaseUrl(HttpServletRequest request) {
        if (request == null) return "";
        var origin = originFromHeader(request.getHeader("Origin"));
        if (!origin.isBlank() && isAllowedOrigin(origin)) return origin;
        var referer = originFromHeader(request.getHeader("Referer"));
        return !referer.isBlank() && isAllowedOrigin(referer) ? referer : "";
    }

    private String originFromHeader(String value) {
        if (value == null || value.isBlank()) return "";
        try {
            var uri = URI.create(value.trim());
            if (uri.getScheme() == null || uri.getHost() == null) return "";
            var scheme = uri.getScheme().toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) return "";
            return scheme + "://" + uri.getHost() + (uri.getPort() >= 0 ? ":" + uri.getPort() : "");
        } catch (IllegalArgumentException exception) {
            return "";
        }
    }

    private boolean isAllowedOrigin(String origin) {
        var allowedOrigins = appWebProperties.getAllowedOrigins();
        return allowedOrigins == null || allowedOrigins.isEmpty() || allowedOrigins.stream()
            .map(value -> value == null ? "" : value.trim().replaceAll("/+$", ""))
            .anyMatch(origin::equals);
    }

    private Map<String, Object> invitationResponse(
        Map<String, Object> result,
        String inviteLink,
        InvitationEmailResult emailResult
    ) {
        var response = new LinkedHashMap<String, Object>(result);
        response.remove("token");
        response.put("invite_link", inviteLink);
        response.put("email_sent", emailResult.sent());
        response.put("email_status", emailResult.status());
        response.put("email_message", emailResult.message());
        return response;
    }

    @FunctionalInterface
    private interface ActorOperation {
        Object execute(AuthSessionUser actor);
    }

    @FunctionalInterface
    private interface ActorMutation {
        ResponseEntity<?> execute(AuthSessionUser actor);
    }
}
