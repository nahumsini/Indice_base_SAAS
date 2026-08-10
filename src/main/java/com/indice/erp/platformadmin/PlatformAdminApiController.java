package com.indice.erp.platformadmin;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.consulting.ConsultingAdministrationService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-admin")
public class PlatformAdminApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final PlatformAdminService service;
    private final PlatformAccountProvisioningService accountProvisioning;
    private final CourtesyCodeService courtesyCodes;
    private final ConsultingAdministrationService consulting;

    public PlatformAdminApiController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        PlatformAdminService service,
        PlatformAccountProvisioningService accountProvisioning,
        CourtesyCodeService courtesyCodes,
        ConsultingAdministrationService consulting
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.service = service;
        this.accountProvisioning = accountProvisioning;
        this.courtesyCodes = courtesyCodes;
        this.consulting = consulting;
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

    @GetMapping("/modules")
    public ResponseEntity<?> modules(HttpSession session) {
        return withUser(session, service::modules);
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
        if (exception instanceof IllegalStateException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @FunctionalInterface
    private interface UserOperation {
        Map<String, Object> execute(long userId);
    }
}
