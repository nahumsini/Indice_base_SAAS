package com.indice.erp.billing.seats;

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
@RequestMapping("/api/v1/billing/seats")
public class SeatApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final SeatPurchaseService service;

    public SeatApiController(SessionAuthService auth, SessionCsrfService csrf, SeatPurchaseService service) {
        this.auth = auth;
        this.csrf = csrf;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> snapshot(HttpSession session) {
        try {
            var user = auth.currentUser(session).orElse(null);
            if (user == null) return unauthorized();
            return ResponseEntity.ok(service.snapshot(user.companyId(), user.userId()));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PutMapping
    public ResponseEntity<?> update(HttpSession session,
                                    @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
                                    @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
                                    @RequestBody SeatRequest body) {
        try {
            var user = auth.currentUser(session).orElse(null);
            if (user == null) return unauthorized();
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(service.setExtraSeats(
                user.companyId(), user.userId(), body.extra_seats(), idempotencyKey
            ));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof SeatPurchaseForbiddenException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof SeatCapacityExceededException capacity) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", message,
                "seat_limit", capacity.snapshot().limit(),
                "seat_usage", capacity.snapshot().usedAndReserved()
            ));
        }
        if (exception instanceof IllegalStateException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    public record SeatRequest(int extra_seats) {}
}
