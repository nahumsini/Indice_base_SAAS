package com.indice.erp.training;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-admin/training")
public class PlatformTrainingController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final TrainingProgramService training;

    public PlatformTrainingController(SessionAuthService auth, SessionCsrfService csrf, TrainingProgramService training) {
        this.auth = auth;
        this.csrf = csrf;
        this.training = training;
    }

    @GetMapping
    public ResponseEntity<?> workspace(HttpSession session) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(training.platformWorkspace(actor.userId()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        }
    }

    @PatchMapping("/progress")
    public ResponseEntity<?> updateProgress(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody TrainingProgramService.ProgressRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(training.updatePlatformProgress(actor.userId(), request));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", safeMessage(exception)));
        }
    }

    private String safeMessage(RuntimeException exception) {
        return exception.getMessage() == null ? "No fue posible guardar el avance." : exception.getMessage();
    }
}
