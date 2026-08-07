package com.indice.erp.face;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/face")
public class HrFaceApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final HrFaceAccessService hrFaceAccessService;
    private final HrFaceService hrFaceService;

    public HrFaceApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        HrFaceAccessService hrFaceAccessService,
        HrFaceService hrFaceService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.hrFaceAccessService = hrFaceAccessService;
        this.hrFaceService = hrFaceService;
    }

    @PostMapping("/enrollment-sessions")
    public ResponseEntity<?> createEnrollmentSession(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            hrFaceAccessService.requireEnrollmentTargetInScope(
                user.get(),
                requiredUserCompanyId(payload)
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrFaceService.createEnrollmentSession(user.get().companyId(), user.get().userId(), payload)
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FaceVerificationIntegrationException ex) {
            return ResponseEntity.status(ex.statusCode()).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/enrollment-sessions/{enrollmentId}/captures/presign-upload")
    public ResponseEntity<?> presignEnrollmentCapture(
        HttpSession session,
        @PathVariable long enrollmentId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            hrFaceAccessService.requireEnrollmentSessionInScope(user.get(), enrollmentId);
            return ResponseEntity.ok(
                hrFaceService.createEnrollmentCaptureUpload(user.get().companyId(), enrollmentId, payload)
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FaceVerificationIntegrationException ex) {
            return ResponseEntity.status(ex.statusCode()).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/enrollment-sessions/{enrollmentId}/complete")
    public ResponseEntity<?> completeEnrollment(
        HttpSession session,
        @PathVariable long enrollmentId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            hrFaceAccessService.requireEnrollmentSessionInScope(user.get(), enrollmentId);
            return ResponseEntity.ok(
                hrFaceService.completeEnrollment(user.get().companyId(), user.get().userId(), enrollmentId)
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FaceVerificationIntegrationException ex) {
            return ResponseEntity.status(ex.statusCode()).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/enrollments/{userCompanyId}")
    public ResponseEntity<?> getEnrollment(HttpSession session, @PathVariable long userCompanyId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            hrFaceAccessService.requireEnrollmentTargetInScope(user.get(), userCompanyId);
            return ResponseEntity.ok(hrFaceService.getEnrollment(user.get().companyId(), userCompanyId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/enrollments/{userCompanyId}")
    public ResponseEntity<?> deleteEnrollment(
        HttpSession session,
        @PathVariable long userCompanyId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            hrFaceAccessService.requireEnrollmentTargetInScope(user.get(), userCompanyId);
            return ResponseEntity.ok(hrFaceService.deleteEnrollment(user.get().companyId(), userCompanyId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private long requiredUserCompanyId(Map<String, Object> payload) {
        if (payload == null) {
            throw new IllegalArgumentException("user_company_id is required.");
        }
        var raw = payload.get("user_company_id");
        if (raw instanceof Number number) {
            var value = number.longValue();
            if (value > 0) {
                return value;
            }
        }
        if (raw instanceof String text && !text.isBlank()) {
            try {
                var value = Long.parseLong(text.trim());
                if (value > 0) {
                    return value;
                }
            } catch (NumberFormatException ignored) {
            }
        }
        throw new IllegalArgumentException("user_company_id is required.");
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
    }

    private ResponseEntity<?> requireCsrf(HttpSession session, String csrfToken) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
            return null;
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }
}
