package com.indice.erp.platformadmin;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.seats.SeatCapacityExceededException;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.InvitationEmailResult;
import com.indice.erp.configcenter.InvitationEmailService;
import com.indice.erp.consulting.ConsultingAdministrationService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/platform-admin")
public class PlatformAdminApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final PlatformAdminService service;
    private final PlatformAccountProvisioningService accountProvisioning;
    private final PlatformCompanyModuleService companyModules;
    private final PlatformTrialExtensionService trialExtensions;
    private final CourtesyCodeService courtesyCodes;
    private final ConsultingAdministrationService consulting;
    private final PlatformCatalogManagementService catalogManagement;
    private final PlatformCatalogStripeSynchronizationService catalogStripeSynchronization;
    private final PlatformModuleWorkOrderService moduleWorkOrders;
    private final PlatformCompanyUserService companyUsers;
    private final InvitationEmailService invitationEmailService;
    private final AppWebProperties appWebProperties;

    public PlatformAdminApiController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        PlatformAdminService service,
        PlatformAccountProvisioningService accountProvisioning,
        PlatformCompanyModuleService companyModules,
        PlatformTrialExtensionService trialExtensions,
        CourtesyCodeService courtesyCodes,
        ConsultingAdministrationService consulting,
        PlatformCatalogManagementService catalogManagement,
        PlatformCatalogStripeSynchronizationService catalogStripeSynchronization,
        PlatformModuleWorkOrderService moduleWorkOrders,
        PlatformCompanyUserService companyUsers,
        InvitationEmailService invitationEmailService,
        AppWebProperties appWebProperties
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.service = service;
        this.accountProvisioning = accountProvisioning;
        this.companyModules = companyModules;
        this.trialExtensions = trialExtensions;
        this.courtesyCodes = courtesyCodes;
        this.consulting = consulting;
        this.catalogManagement = catalogManagement;
        this.catalogStripeSynchronization = catalogStripeSynchronization;
        this.moduleWorkOrders = moduleWorkOrders;
        this.companyUsers = companyUsers;
        this.invitationEmailService = invitationEmailService;
        this.appWebProperties = appWebProperties;
    }

    @GetMapping("/context")
    public ResponseEntity<?> context(HttpSession session) {
        return withUser(session, userId -> service.context(userId));
    }

    @GetMapping("/overview")
    public ResponseEntity<?> overview(
        HttpSession session,
        @RequestParam(name = "q", defaultValue = "") String query,
        @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        return withUser(session, userId -> service.overview(userId, query, limit));
    }

    @GetMapping("/billing")
    public ResponseEntity<?> billing(
        HttpSession session,
        @RequestParam(name = "limit", defaultValue = "100") int limit
    ) {
        return withUser(session, userId -> service.billing(userId, limit));
    }

    @GetMapping("/catalog")
    public ResponseEntity<?> catalog(HttpSession session) {
        return withUser(session, service::catalog);
    }

    @PostMapping("/catalog/complementary-products/synchronize")
    public ResponseEntity<?> synchronizeComplementaryProducts(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(catalogManagement.synchronizeComplementaryProducts(current.userId()));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/catalog/drafts")
    public ResponseEntity<?> createCatalogDraft(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(catalogManagement.createDraft(current.userId()));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/catalog/drafts/{versionId}/validation")
    public ResponseEntity<?> validateCatalogDraft(HttpSession session, @PathVariable long versionId) {
        return withUser(session, userId -> catalogManagement.validateDraft(userId, versionId));
    }

    @PostMapping("/catalog/drafts/{versionId}/publish")
    public ResponseEntity<?> publishCatalogDraft(
        HttpSession session,
        @PathVariable long versionId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(catalogManagement.publishDraft(current.userId(), versionId));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/catalog/products/{productId}")
    public ResponseEntity<?> updateCatalogProduct(
        HttpSession session,
        @PathVariable long productId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCatalogManagementService.ProductUpdateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(catalogManagement.updateProduct(current.userId(), productId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/catalog/products")
    public ResponseEntity<?> createCatalogProduct(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCatalogManagementService.ProductCreateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(catalogManagement.createProduct(current.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/catalog/prices/{priceId}")
    public ResponseEntity<?> updateCatalogPrice(
        HttpSession session,
        @PathVariable long priceId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCatalogManagementService.PriceUpdateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(catalogManagement.updatePrice(current.userId(), priceId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/catalog/products/{productId}/stripe-prices/synchronize")
    public ResponseEntity<?> synchronizeCatalogProductPrices(
        HttpSession session,
        @PathVariable long productId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCatalogStripeSynchronizationService.SynchronizeRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(catalogStripeSynchronization.synchronize(current.userId(), productId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/catalog/promotions")
    public ResponseEntity<?> createCatalogPromotion(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCatalogManagementService.PromotionRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(catalogManagement.createPromotion(current.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/catalog/promotions/{promotionId}")
    public ResponseEntity<?> updateCatalogPromotion(
        HttpSession session,
        @PathVariable long promotionId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCatalogManagementService.PromotionRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(catalogManagement.updatePromotion(current.userId(), promotionId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/modules")
    public ResponseEntity<?> modules(HttpSession session) {
        return withUser(session, service::modules);
    }

    @GetMapping("/modules/work-orders")
    public ResponseEntity<?> moduleWorkOrders(HttpSession session) {
        return withUser(session, moduleWorkOrders::list);
    }

    @PostMapping("/modules/work-orders")
    public ResponseEntity<?> createModuleWorkOrder(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformModuleWorkOrderService.CreateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(moduleWorkOrders.create(current.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @DeleteMapping("/modules/work-orders/{workOrderId}")
    public ResponseEntity<?> deleteModuleWorkOrder(
        HttpSession session,
        @PathVariable long workOrderId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(moduleWorkOrders.cancel(current.userId(), workOrderId));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/modules/{moduleId}/availability")
    public ResponseEntity<?> updateModuleAvailability(
        HttpSession session,
        @PathVariable long moduleId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformAdminService.ModuleAvailabilityRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.updateModuleAvailability(current.userId(), moduleId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/audit")
    public ResponseEntity<?> audit(
        HttpSession session,
        @RequestParam(name = "limit", defaultValue = "100") int limit
    ) {
        return withUser(session, userId -> service.audit(userId, limit));
    }

    @GetMapping("/consulting")
    public ResponseEntity<?> consulting(HttpSession session) {
        return withUser(session, consulting::workspace);
    }

    @PostMapping("/consulting/consultants")
    public ResponseEntity<?> createConsultingConsultant(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.ConsultantCreateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(consulting.createConsultant(current.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/consulting/appointments")
    public ResponseEntity<?> createConsultingAppointment(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.AdminAppointmentCreateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(consulting.createAppointment(current.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/consulting/availability")
    public ResponseEntity<?> consultingAvailability(
        HttpSession session,
        @RequestParam("consultantEmail") String consultantEmail
    ) {
        return withUser(session, userId -> consulting.consultantAvailability(userId, consultantEmail));
    }

    @PutMapping("/consulting/availability")
    public ResponseEntity<?> updateConsultingAvailability(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.AvailabilityUpdateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(consulting.updateConsultantAvailability(current.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/consulting/locations")
    public ResponseEntity<?> createConsultingLocation(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.LocationCreateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(consulting.createLocation(current.userId(), request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/consulting/appointments/{appointmentId}")
    public ResponseEntity<?> updateConsultingAppointment(
        HttpSession session,
        @PathVariable long appointmentId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.AppointmentUpdateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(consulting.updateAppointment(current.userId(), appointmentId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/consulting/locations/{locationId}")
    public ResponseEntity<?> updateConsultingLocation(
        HttpSession session,
        @PathVariable long locationId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAdministrationService.LocationUpdateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(consulting.updateLocation(current.userId(), locationId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/companies/{companyId}")
    public ResponseEntity<?> company(HttpSession session, @PathVariable long companyId) {
        return withUser(session, userId -> service.company(userId, companyId));
    }

    @PostMapping("/companies/{companyId}/users/invitations")
    public ResponseEntity<?> inviteCompanyUser(
        HttpSession session,
        HttpServletRequest servletRequest,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformCompanyUserService.InvitationRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            var result = companyUsers.invite(current.userId(), companyId, idempotencyKey, request);
            var inviteLink = buildInviteLink(servletRequest, String.valueOf(result.get("token")));
            var emailResult = invitationEmailService.sendInvitation(
                String.valueOf(result.get("email")),
                String.valueOf(result.get("full_name")),
                inviteLink
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(invitationResponse(result, inviteLink, emailResult));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @DeleteMapping("/companies/{companyId}/users/invitations/{invitationId}")
    public ResponseEntity<?> cancelCompanyUserInvitation(
        HttpSession session,
        @PathVariable long companyId,
        @PathVariable long invitationId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(companyUsers.cancelInvitation(current.userId(), companyId, invitationId));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/companies/{companyId}/users/invitations/{invitationId}/resend")
    public ResponseEntity<?> resendCompanyUserInvitation(
        HttpSession session,
        HttpServletRequest servletRequest,
        @PathVariable long companyId,
        @PathVariable long invitationId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            var result = companyUsers.resendInvitation(current.userId(), companyId, invitationId);
            var inviteLink = buildInviteLink(servletRequest, String.valueOf(result.get("token")));
            var emailResult = invitationEmailService.sendInvitation(
                String.valueOf(result.get("email")),
                String.valueOf(result.get("full_name")),
                inviteLink
            );
            return ResponseEntity.ok(invitationResponse(result, inviteLink, emailResult));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/companies/{companyId}/users/{userId}/status")
    public ResponseEntity<?> updateCompanyUserStatus(
        HttpSession session,
        @PathVariable long companyId,
        @PathVariable long userId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformCompanyUserService.MemberStatusRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(companyUsers.updateStatus(current.userId(), companyId, userId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/companies")
    public ResponseEntity<?> createCompanyAccount(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformAccountProvisioningService.CreateAccountRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                accountProvisioning.create(current.userId(), idempotencyKey, request)
            );
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/companies/{companyId}/account-type")
    public ResponseEntity<?> updateCompanyAccountType(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformAdminService.AccountTypeUpdateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.updateCompanyAccountType(current.userId(), companyId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @DeleteMapping("/companies/{companyId}")
    public ResponseEntity<?> deleteCompanyAccount(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformAdminService.CompanyDeletionRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.deleteCompanyAccount(current.userId(), companyId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/companies/{companyId}/public-demo")
    public ResponseEntity<?> updatePublicDemoAccess(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformAdminService.PublicDemoUpdateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.updatePublicDemoAccess(current.userId(), companyId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/companies/{companyId}/distributor")
    public ResponseEntity<?> updateCompanyDistributor(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody PlatformAdminService.DistributorAssignmentRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.updateCompanyDistributor(current.userId(), companyId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/courtesy-codes")
    public ResponseEntity<?> courtesyCodes(HttpSession session) {
        return withUser(session, courtesyCodes::list);
    }

    @PostMapping("/courtesy-codes")
    public ResponseEntity<?> createCourtesyCode(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody CourtesyCodeService.CreateRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                courtesyCodes.create(current.userId(), idempotencyKey, request)
            );
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @DeleteMapping("/courtesy-codes/{reference}")
    public ResponseEntity<?> revokeCourtesyCode(
        HttpSession session,
        @PathVariable String reference,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) CourtesyCodeService.RevokeRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(courtesyCodes.revoke(
                current.userId(), reference, request == null ? null : request.reason()
            ));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/companies/{companyId}/benefits")
    public ResponseEntity<?> grantBenefit(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformAdminService.BenefitRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                service.grantBenefit(current.userId(), companyId, idempotencyKey, request)
            );
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/companies/{companyId}/products")
    public ResponseEntity<?> updateTrialProducts(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformCompanyModuleService.ProductSelectionRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(companyModules.updateTrialProducts(
                current.userId(), companyId, idempotencyKey, request
            ));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PatchMapping("/companies/{companyId}/trial-extension")
    public ResponseEntity<?> extendCompanyTrial(
        HttpSession session,
        @PathVariable long companyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody PlatformTrialExtensionService.ExtensionRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(trialExtensions.extend(
                current.userId(), companyId, idempotencyKey, request
            ));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @DeleteMapping("/companies/{companyId}/benefits/{reference}")
    public ResponseEntity<?> revokeBenefit(
        HttpSession session,
        @PathVariable long companyId,
        @PathVariable String reference,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) PlatformAdminService.RevokeRequest request
    ) {
        try {
            var current = auth.currentUser(session).orElse(null);
            if (current == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
            }
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.revokeBenefit(
                current.userId(),
                companyId,
                reference,
                request == null ? null : request.reason()
            ));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> withUser(HttpSession session, UserOperation operation) {
        var current = auth.currentUser(session).orElse(null);
        if (current == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(operation.execute(current.userId()));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof PlatformAdminForbiddenException) {
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
        if (!configuredBaseUrl.isBlank()) {
            return configuredBaseUrl + "/invite/" + token;
        }
        var browserBaseUrl = browserBaseUrl(request);
        if (!browserBaseUrl.isBlank()) {
            return browserBaseUrl + "/invite/" + token;
        }
        return ServletUriComponentsBuilder.fromCurrentContextPath()
            .path("/invite/")
            .path(token)
            .toUriString();
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
    private interface UserOperation {
        Map<String, Object> execute(long userId);
    }
}
