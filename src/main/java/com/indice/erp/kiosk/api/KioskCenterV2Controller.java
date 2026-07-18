package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskLifecycleCoordinator;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/kiosk-center/kiosks")
public class KioskCenterV2Controller {

    private final KioskInternalRequestGuard guard;
    private final KioskEngineFeatureFlags flags;
    private final KioskCenterService center;
    private final KioskRegistryService registry;
    private final KioskLifecycleCoordinator lifecycle;
    private final KioskV2ResponseFactory responses;

    public KioskCenterV2Controller(
            KioskInternalRequestGuard guard,
            KioskEngineFeatureFlags flags,
            KioskCenterService center,
            KioskRegistryService registry,
            KioskLifecycleCoordinator lifecycle,
            KioskV2ResponseFactory responses) {
        this.guard = guard;
        this.flags = flags;
        this.center = center;
        this.registry = registry;
        this.lifecycle = lifecycle;
        this.responses = responses;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        requireEnabled();
        var user = guard.requireCenterRead(session);
        return ResponseEntity.ok(responses.success(
            Map.of("items", center.list(user.companyId())), null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        requireEnabled();
        var user = guard.requireCenterRead(session);
        return ResponseEntity.ok(responses.success(center.detail(user.companyId(), kioskId), null, null));
    }

    @GetMapping("/{kioskId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long kioskId) {
        requireEnabled();
        var user = guard.requireCenterRead(session);
        java.util.List<Map<String, Object>> items;
        try {
            items = center.audit(user.companyId(), kioskId);
        } catch (KioskUnavailableException deleted) {
            items = center.auditHistorical(user.companyId(), kioskId);
        }
        return ResponseEntity.ok(responses.success(
            Map.of("items", items), null, null));
    }

    @PostMapping("/{kioskId}/disable")
    public ResponseEntity<?> disable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.DISABLED);
    }

    @PostMapping("/{kioskId}/revoke")
    public ResponseEntity<?> revoke(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.REVOKED);
    }

    private ResponseEntity<?> transition(
            HttpSession session,
            String csrfToken,
            long kioskId,
            Map<String, Object> payload,
            KioskDefinitionStatus target) {
        requireEnabled();
        var user = guard.requireCenterWrite(session, csrfToken);
        var definition = registry.requireById(user.companyId(), kioskId);
        var reasonValue = payload == null ? null : payload.get("reason");
        var reason = reasonValue == null ? null : String.valueOf(reasonValue);
        lifecycle.transition(definition, user.userId(), target, reason);
        return ResponseEntity.ok(responses.success(center.detail(user.companyId(), kioskId), null, null));
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.auditEnabled() || !flags.globalCenterEnabled()) {
            throw new KioskUnavailableException();
        }
    }
}
