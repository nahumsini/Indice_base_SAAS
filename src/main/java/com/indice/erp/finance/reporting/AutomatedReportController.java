package com.indice.erp.finance.reporting;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/kpis/automated-reports")
class AutomatedReportController {
    private final SessionAuthService sessions;
    private final SessionCsrfService csrf;
    private final AutomatedReportService service;
    AutomatedReportController(SessionAuthService sessions, SessionCsrfService csrf, AutomatedReportService service) {
        this.sessions = sessions; this.csrf = csrf; this.service = service;
    }
    @GetMapping ListResponse list(HttpSession session) { return new ListResponse(service.list(user(session))); }
    @PostMapping Object create(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String token,
            @RequestBody AutomatedReportService.RuleRequest request) { var user = user(session); csrf.requireCsrf(session, token); return service.save(user, null, request); }
    @PutMapping("/{id}") Object update(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String token,
            @PathVariable long id, @RequestBody AutomatedReportService.RuleRequest request) { var user = user(session); csrf.requireCsrf(session, token); return service.save(user, id, request); }
    @PostMapping("/{id}/runs") Object generate(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String token,
            @PathVariable long id, @RequestBody RunRequest request) { var user = user(session); csrf.requireCsrf(session, token); return service.generate(user, id, request.idempotencyKey()); }
    @GetMapping("/{id}/runs/{runId}") Object download(HttpSession session, @PathVariable long id, @PathVariable long runId) { return service.download(user(session), id, runId); }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> invalid(IllegalArgumentException error) { return ResponseEntity.badRequest().body(Map.of("message", error.getMessage())); }
    @ExceptionHandler(IllegalStateException.class) ResponseEntity<?> notReady(IllegalStateException error) { return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Inicializa y revisa las fuentes del informe antes de generarlo.")); }
    private AuthSessionUser user(HttpSession session) { return sessions.currentUser(session).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)); }
    record ListResponse(java.util.List<AutomatedReportService.Rule> items) {}
    record RunRequest(String idempotencyKey) {}
}
