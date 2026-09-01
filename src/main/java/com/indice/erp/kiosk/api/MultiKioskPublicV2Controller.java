package com.indice.erp.kiosk.api;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskClientNetworkSignal;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.kiosk.engine.MultiKioskService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/multi-kiosks/public/{publicToken}")
public class MultiKioskPublicV2Controller {

    private final KioskEngineFeatureFlags flags;
    private final SessionCsrfService csrf;
    private final MultiKioskService multiKiosks;
    private final KioskV2ResponseFactory responses;

    public MultiKioskPublicV2Controller(
            KioskEngineFeatureFlags flags,
            SessionCsrfService csrf,
            MultiKioskService multiKiosks,
            KioskV2ResponseFactory responses) {
        this.flags = flags;
        this.csrf = csrf;
        this.multiKiosks = multiKiosks;
        this.responses = responses;
    }

    @GetMapping
    public ResponseEntity<?> bootstrap(
            HttpSession session,
            @PathVariable String publicToken) {
        requireEnabled();
        var data = new java.util.LinkedHashMap<String, Object>(multiKiosks.bootstrap(publicToken));
        data.put("csrf_token", csrf.ensureCsrf(session));
        return ResponseEntity.ok(responses.success(data, null, null));
    }

    @PostMapping("/sessions")
    public ResponseEntity<?> authenticate(
            HttpSession session,
            HttpServletRequest request,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String publicToken,
            @RequestBody Map<String, Object> payload) {
        requireEnabled();
        csrf.requireCsrf(session, csrfToken);
        var pin = payload == null ? null : String.valueOf(payload.getOrDefault("pin", ""));
        var result = multiKiosks.authenticate(
            publicToken, pin, session.getId(), networkSignal(request));
        return ResponseEntity.ok(responses.success(
            result, String.valueOf(result.get("session_id")), null));
    }

    @GetMapping("/session")
    public ResponseEntity<?> session(
            HttpSession session,
            @RequestHeader("X-Multi-Kiosk-Session-Token") String multiSessionToken,
            @PathVariable String publicToken) {
        requireEnabled();
        return ResponseEntity.ok(responses.success(
            multiKiosks.session(publicToken, multiSessionToken, session.getId()), null, null));
    }

    @DeleteMapping("/session")
    public ResponseEntity<?> logout(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader("X-Multi-Kiosk-Session-Token") String multiSessionToken,
            @PathVariable String publicToken) {
        requireEnabled();
        csrf.requireCsrf(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            multiKiosks.logout(publicToken, multiSessionToken, session.getId()), null, null));
    }

    @PostMapping("/kiosks/{kioskId}/sessions")
    public ResponseEntity<?> launchChild(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader("X-Multi-Kiosk-Session-Token") String multiSessionToken,
            @PathVariable String publicToken,
            @PathVariable long kioskId) {
        requireEnabled();
        csrf.requireCsrf(session, csrfToken);
        var result = multiKiosks.launchChild(
            publicToken, multiSessionToken, kioskId, session.getId());
        return ResponseEntity.ok(responses.success(
            result, String.valueOf(result.get("kiosk_session_id")), null));
    }

    @GetMapping("/kiosks/{kioskId}/workspace")
    public ResponseEntity<?> childWorkspace(
            HttpSession session,
            @RequestHeader("X-Multi-Kiosk-Session-Token") String multiSessionToken,
            @RequestHeader("X-Kiosk-Session-Token") String childSessionToken,
            @PathVariable String publicToken,
            @PathVariable long kioskId) {
        requireEnabled();
        var result = multiKiosks.childWorkspace(
            publicToken, multiSessionToken, childSessionToken, kioskId, session.getId());
        return ResponseEntity.ok(responses.success(result, null, null));
    }

    @PostMapping("/kiosks/{kioskId}/actions/{capabilityKey}")
    public ResponseEntity<?> childAction(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader("X-Multi-Kiosk-Session-Token") String multiSessionToken,
            @RequestHeader("X-Kiosk-Session-Token") String childSessionToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String publicToken,
            @PathVariable long kioskId,
            @PathVariable String capabilityKey,
            @RequestBody(required = false) Map<String, Object> payload) {
        requireEnabled();
        csrf.requireCsrf(session, csrfToken);
        var result = multiKiosks.childAction(
            publicToken, multiSessionToken, childSessionToken, kioskId, capabilityKey,
            session.getId(), payload, idempotencyKey);
        return ResponseEntity.ok(responses.success(
            result.data(), result.kioskSessionId(), result.versionedCapability()));
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled()
                || !flags.auditEnabled() || !flags.multiDashboardEnabled()) {
            throw new KioskUnavailableException();
        }
    }

    private String networkSignal(HttpServletRequest request) {
        return KioskClientNetworkSignal.from(request);
    }
}
