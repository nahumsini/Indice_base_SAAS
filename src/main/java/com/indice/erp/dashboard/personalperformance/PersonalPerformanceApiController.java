package com.indice.erp.dashboard.personalperformance;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard/personal-performance")
public class PersonalPerformanceApiController {

    private final SessionAuthService sessionAuthService;
    private final PersonalPerformanceService personalPerformanceService;

    public PersonalPerformanceApiController(
        SessionAuthService sessionAuthService,
        PersonalPerformanceService personalPerformanceService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.personalPerformanceService = personalPerformanceService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getPersonalPerformance(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(
            personalPerformanceService.getPersonalPerformance(
                currentUser.get().userId(),
                currentUser.get().companyId()
            )
        );
    }

    @PutMapping("/me")
    public ResponseEntity<?> savePersonalPerformance(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
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
}
