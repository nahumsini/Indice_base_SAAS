package com.indice.erp.analytics;

import com.indice.erp.analytics.ProductAnalyticsContracts.ObservationRequest;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/product-analytics")
public class ProductAnalyticsController {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ProductAnalyticsService analytics;

    public ProductAnalyticsController(
        SessionAuthService auth,
        SessionCsrfService csrf,
        ProductAnalyticsService analytics
    ) {
        this.auth = auth;
        this.csrf = csrf;
        this.analytics = analytics;
    }

    @PostMapping("/app/collect")
    public ResponseEntity<?> collectApp(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody ObservationRequest request
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            csrf.requireCsrf(session, csrfToken);
            return ResponseEntity.accepted().body(analytics.collectApp(actor, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @PostMapping("/web/collect")
    public ResponseEntity<?> collectWeb(
        @RequestHeader(name = "X-Analytics-Ingest-Token", required = false) String token,
        @RequestBody ObservationRequest request
    ) {
        try {
            return ResponseEntity.accepted().body(analytics.collectWeb(token, request));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    @GetMapping("/platform-dashboard")
    public ResponseEntity<?> dashboard(
        HttpSession session,
        @RequestParam(name = "days", defaultValue = "30") int days,
        @RequestParam(name = "companyId", required = false) Long companyId
    ) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return unauthorized();
        try {
            return ResponseEntity.ok(analytics.dashboard(actor.userId(), days, companyId));
        } catch (RuntimeException exception) {
            return error(exception);
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    private ResponseEntity<?> error(RuntimeException exception) {
        var message = exception.getMessage() == null ? "Request could not be completed." : exception.getMessage();
        if (exception instanceof PlatformAdminForbiddenException || exception instanceof ProductAnalyticsForbiddenException) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
        }
        if (exception instanceof ProductAnalyticsUnavailableException) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", message));
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }
}
