package com.indice.erp.consulting;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/consulting")
public class ConsultingAppointmentApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ConsultingAppointmentService service;

    public ConsultingAppointmentApiController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        ConsultingAppointmentService service
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.service = service;
    }

    @GetMapping("/workspace")
    public ResponseEntity<?> workspace(HttpSession session) {
        var user = auth.currentUser(session).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(service.workspace(user));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/appointments")
    public ResponseEntity<?> create(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ConsultingAppointmentService.BookingRequest request
    ) {
        var user = auth.currentUser(session).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.status(HttpStatus.CREATED).body(service.create(user, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/appointments/{appointmentId}/cancel")
    public ResponseEntity<?> cancel(
        HttpSession session,
        @PathVariable long appointmentId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) ConsultingAppointmentService.CancelRequest request
    ) {
        var user = auth.currentUser(session).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.cancel(user, appointmentId, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof SecurityException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof NoSuchElementException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
        }
        if (exception instanceof IllegalArgumentException || exception instanceof IllegalStateException) {
            return ResponseEntity.badRequest().body(Map.of("message", message));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", message));
    }
}
