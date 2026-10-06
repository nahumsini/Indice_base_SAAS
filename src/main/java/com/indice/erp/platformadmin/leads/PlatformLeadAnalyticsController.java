package com.indice.erp.platformadmin.leads;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.function.LongFunction;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-admin/leads/analytics")
public class PlatformLeadAnalyticsController {
    private final SessionAuthService auth;
    private final PlatformLeadAnalyticsService analytics;

    public PlatformLeadAnalyticsController(SessionAuthService auth, PlatformLeadAnalyticsService analytics) {
        this.auth = auth; this.analytics = analytics;
    }

    @GetMapping
    public ResponseEntity<?> dashboard(HttpSession session,
        @RequestParam(defaultValue = "30") int days, @RequestParam(defaultValue = "all") String market) {
        return handle(session, actor -> analytics.dashboard(actor, days, market));
    }

    @GetMapping("/details")
    public ResponseEntity<?> details(HttpSession session,
        @RequestParam(defaultValue = "30") int days, @RequestParam(defaultValue = "all") String market,
        @RequestParam(defaultValue = "received") String view, @RequestParam(defaultValue = "") String source,
        @RequestParam(defaultValue = "") String medium, @RequestParam(defaultValue = "") String campaign,
        @RequestParam(defaultValue = "") String plan, @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int pageSize) {
        return handle(session, actor -> analytics.details(actor, days, market, view, source, medium, campaign, plan, page, pageSize));
    }

    private ResponseEntity<?> handle(HttpSession session, LongFunction<?> action) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(action.apply(actor.userId()));
        } catch (PlatformAdminForbiddenException denied) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Platform lead access is required."));
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.badRequest().body(Map.of("message", invalid.getMessage()));
        }
    }
}
