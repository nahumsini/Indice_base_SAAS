package com.indice.erp.dashboard.personalperformance;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard/personal-performance")
public class PersonalPerformanceApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final PersonalPerformanceService personalPerformanceService;

    public PersonalPerformanceApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        PersonalPerformanceService personalPerformanceService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.personalPerformanceService = personalPerformanceService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getPersonalPerformance(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        return ResponseEntity.ok(
            personalPerformanceService.getPersonalPerformance(
                currentUser.get().userId(),
                currentUser.get().companyId()
            )
        );
    }

    @PutMapping("/me")
    public ResponseEntity<?> savePersonalPerformance(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(
                personalPerformanceService.savePersonalPerformance(
                    currentUser.get().userId(),
                    currentUser.get().companyId(),
                    payload
                )
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
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
