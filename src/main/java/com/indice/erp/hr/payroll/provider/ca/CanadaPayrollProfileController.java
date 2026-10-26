package com.indice.erp.hr.payroll.provider.ca;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessDeniedException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hr/payroll/canada/profiles")
public class CanadaPayrollProfileController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final CanadaPayrollProfileService profiles;

    public CanadaPayrollProfileController(SessionAuthService auth, SessionCsrfService csrf, CanadaPayrollProfileService profiles) {
        this.auth = auth; this.csrf = csrf; this.profiles = profiles;
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long employeeId) {
        var actor = auth.currentUser(session);
        if (actor.isEmpty()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        return ResponseEntity.ok(profiles.get(actor.get(), employeeId));
    }

    @PutMapping("/{employeeId}")
    public ResponseEntity<?> save(HttpSession session, @PathVariable long employeeId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        @RequestBody CanadaPayrollProfileService.SaveRequest request) {
        var actor = auth.currentUser(session);
        if (actor.isEmpty()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try { csrf.requireCsrf(session, token); }
        catch (IllegalArgumentException ex) { return ResponseEntity.status(403).body(Map.of("message", "Invalid CSRF token.")); }
        return ResponseEntity.ok(profiles.save(actor.get(), employeeId, request));
    }

    @ExceptionHandler(CanadaPayrollProfileService.ProfileConflictException.class)
    ResponseEntity<?> conflict(IllegalArgumentException ex) { return ResponseEntity.status(409).body(Map.of("message", ex.getMessage())); }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> invalid(IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    @ExceptionHandler(HrAccessDeniedException.class)
    ResponseEntity<?> forbidden() { return ResponseEntity.status(403).body(Map.of("message", "Forbidden")); }
    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<?> missing(NoSuchElementException ex) { return ResponseEntity.status(404).body(Map.of("message", ex.getMessage())); }
}
