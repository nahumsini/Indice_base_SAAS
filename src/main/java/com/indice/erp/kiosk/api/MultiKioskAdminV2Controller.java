package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.kiosk.engine.MultiKioskService;
import com.indice.erp.kiosk.engine.ProviderCenterAccessAdminService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/kiosk-center/multi-kiosks")
public class MultiKioskAdminV2Controller {

    private final KioskInternalRequestGuard guard;
    private final KioskEngineFeatureFlags flags;
    private final MultiKioskService multiKiosks;
    private final ProviderCenterAccessAdminService providerAccess;
    private final KioskV2ResponseFactory responses;

    public MultiKioskAdminV2Controller(
            KioskInternalRequestGuard guard,
            KioskEngineFeatureFlags flags,
            MultiKioskService multiKiosks,
            ProviderCenterAccessAdminService providerAccess,
            KioskV2ResponseFactory responses) {
        this.guard = guard;
        this.flags = flags;
        this.multiKiosks = multiKiosks;
        this.providerAccess = providerAccess;
        this.responses = responses;
    }

    @GetMapping("/{multiKioskId}/providers")
    public ResponseEntity<?> providers(HttpSession session, @PathVariable long multiKioskId) {
        requireEnabled();
        var user = guard.requireCenterRead(session);
        return ResponseEntity.ok(responses.success(
            providerAccess.list(user.companyId(), multiKioskId), null, null));
    }

    @PostMapping("/{multiKioskId}/providers/{providerId}/pin")
    public ResponseEntity<?> issueProviderPin(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long multiKioskId,
            @PathVariable long providerId) {
        requireEnabled();
        var user = guard.requireCenterWrite(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            providerAccess.issueOrRotate(
                user.companyId(), multiKioskId, providerId, user.userId()), null, null));
    }

    @PostMapping("/{multiKioskId}/providers/{providerId}/revoke")
    public ResponseEntity<?> revokeProviderPin(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long multiKioskId,
            @PathVariable long providerId) {
        requireEnabled();
        var user = guard.requireCenterWrite(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            providerAccess.revoke(
                user.companyId(), multiKioskId, providerId, user.userId()), null, null));
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        requireEnabled();
        var user = guard.requireCenterRead(session);
        return ResponseEntity.ok(responses.success(
            Map.of("items", multiKiosks.list(user.companyId())), null, null));
    }

    @GetMapping("/catalog")
    public ResponseEntity<?> catalog(HttpSession session) {
        requireEnabled();
        var user = guard.requireCenterRead(session);
        return ResponseEntity.ok(responses.success(multiKiosks.catalog(user.companyId()), null, null));
    }

    @GetMapping("/{multiKioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long multiKioskId) {
        requireEnabled();
        var user = guard.requireCenterRead(session);
        return ResponseEntity.ok(responses.success(
            multiKiosks.detail(user.companyId(), multiKioskId), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload) {
        requireEnabled();
        var user = guard.requireCenterWrite(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            multiKiosks.create(user.companyId(), user.userId(), payload), null, null));
    }

    @PutMapping("/{multiKioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long multiKioskId,
            @RequestBody Map<String, Object> payload) {
        requireEnabled();
        var user = guard.requireCenterWrite(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            multiKiosks.update(user.companyId(), multiKioskId, user.userId(), payload), null, null));
    }

    @PostMapping("/{multiKioskId}/rotate-link")
    public ResponseEntity<?> rotateLink(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long multiKioskId) {
        requireEnabled();
        var user = guard.requireCenterWrite(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            multiKiosks.rotateLink(user.companyId(), multiKioskId, user.userId()), null, null));
    }

    @PostMapping("/{multiKioskId}/{transition:enable|disable|revoke}")
    public ResponseEntity<?> transition(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long multiKioskId,
            @PathVariable String transition) {
        requireEnabled();
        var user = guard.requireCenterWrite(session, csrfToken);
        var status = switch (transition) {
            case "enable" -> "ACTIVE";
            case "disable" -> "DISABLED";
            case "revoke" -> "REVOKED";
            default -> throw new IllegalArgumentException("Unsupported transition.");
        };
        return ResponseEntity.ok(responses.success(
            multiKiosks.transition(user.companyId(), multiKioskId, user.userId(), status), null, null));
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled()
                || !flags.auditEnabled() || !flags.globalCenterEnabled()
                || !flags.multiDashboardEnabled()) {
            throw new KioskUnavailableException();
        }
    }
}
