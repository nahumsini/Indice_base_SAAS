package com.indice.erp.billing.storage;

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
@RequestMapping("/api/v1/billing/storage")
public class StorageQuotaApiController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final StorageBlockPurchaseService storage;

    public StorageQuotaApiController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        StorageBlockPurchaseService storage
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.storage = storage;
    }

    @GetMapping
    public ResponseEntity<?> snapshot(HttpSession session) {
        var user = auth.currentUser(session).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(storage.snapshot(user.companyId(), user.userId()));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PutMapping
    public ResponseEntity<?> update(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody StorageBlockRequest body
    ) {
        var user = auth.currentUser(session).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(storage.setPurchasedBlocks(
                user.companyId(), user.userId(), body.purchased_blocks(), idempotencyKey));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof StoragePurchaseForbiddenException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof StorageQuotaExceededException capacity) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", message,
                "limit_bytes", capacity.snapshot().limitBytes(),
                "used_and_reserved_bytes", capacity.snapshot().usedAndReservedBytes()));
        }
        if (exception instanceof IllegalStateException) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    public record StorageBlockRequest(int purchased_blocks) {}
}
