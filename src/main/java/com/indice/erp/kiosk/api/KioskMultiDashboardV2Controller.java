package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskMultiDashboardService;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/me/kiosks")
public class KioskMultiDashboardV2Controller {

    private final KioskInternalRequestGuard guard;
    private final KioskEngineFeatureFlags flags;
    private final KioskMultiDashboardService dashboard;
    private final KioskV2ResponseFactory responses;

    public KioskMultiDashboardV2Controller(
            KioskInternalRequestGuard guard,
            KioskEngineFeatureFlags flags,
            KioskMultiDashboardService dashboard,
            KioskV2ResponseFactory responses) {
        this.guard = guard;
        this.flags = flags;
        this.dashboard = dashboard;
        this.responses = responses;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        requireEnabled();
        var user = guard.requireAuthenticated(session);
        return ResponseEntity.ok(responses.success(
            Map.of("items", dashboard.list(user)), null, null));
    }

    @PostMapping("/{kioskId}/sessions")
    public ResponseEntity<?> session(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        requireEnabled();
        var user = guard.requireAuthenticatedWrite(session, csrfToken);
        var result = dashboard.createSession(user, kioskId, session.getId());
        return ResponseEntity.ok(responses.success(
            result, String.valueOf(result.get("kiosk_session_id")), null));
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.multiDashboardEnabled()) {
            throw new KioskUnavailableException();
        }
    }
}
