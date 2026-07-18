package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.processTasks.ProcessTasksRequestGuard;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskCapabilities;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskModuleAuditService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/process-tasks/kiosks")
public class ProcessTaskKioskAdminV2Controller {

    private final ProcessTasksRequestGuard guard;
    private final ProcessTaskKioskService kioskService;
    private final KioskRegistryService registry;
    private final KioskGrantService grants;
    private final KioskCenterService center;
    private final ProcessTaskKioskModuleAuditService moduleAudit;
    private final KioskV2ResponseFactory responses;

    public ProcessTaskKioskAdminV2Controller(
            ProcessTasksRequestGuard guard,
            ProcessTaskKioskService kioskService,
            KioskRegistryService registry,
            KioskGrantService grants,
            KioskCenterService center,
            ProcessTaskKioskModuleAuditService moduleAudit,
            KioskV2ResponseFactory responses) {
        this.guard = guard;
        this.kioskService = kioskService;
        this.registry = registry;
        this.grants = grants;
        this.center = center;
        this.moduleAudit = moduleAudit;
        this.responses = responses;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return denied(access);
        }
        return ResponseEntity.ok(responses.success(
            kioskService.listKiosks(access.user().companyId()), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return denied(access);
        }
        var result = kioskService.saveKiosk(
            access.user().companyId(), access.user().userId(), null, payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(result, null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return denied(access);
        }
        return ResponseEntity.ok(responses.success(
            kioskService.kioskDetail(access.user().companyId(), kioskId), null, null));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return denied(access);
        }
        return ResponseEntity.ok(responses.success(kioskService.saveKiosk(
            access.user().companyId(), access.user().userId(), kioskId, payload), null, null));
    }

    @PostMapping("/{kioskId}/disable")
    public ResponseEntity<?> disable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.DISABLED);
    }

    @PostMapping("/{kioskId}/enable")
    public ResponseEntity<?> enable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.ACTIVE);
    }

    @PostMapping("/{kioskId}/revoke")
    public ResponseEntity<?> revoke(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.REVOKED);
    }

    @DeleteMapping("/{kioskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return denied(access);
        }
        kioskService.deleteKiosk(access.user().companyId(), access.user().userId(), kioskId);
        return ResponseEntity.ok(responses.success(Map.of("deleted", true), null, null));
    }

    @GetMapping("/{kioskId}/grants")
    public ResponseEntity<?> listGrants(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return denied(access);
        }
        var definition = registry.requireByLegacyReference(
            access.user().companyId(), ProcessTaskKioskCapabilities.OWNER_MODULE, kioskId);
        return ResponseEntity.ok(responses.success(Map.of("items", grants.list(definition)), null, null));
    }

    @GetMapping("/{kioskId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return denied(access);
        }
        var definition = registry.requireByLegacyReference(
            access.user().companyId(), ProcessTaskKioskCapabilities.OWNER_MODULE, kioskId);
        var items = new java.util.ArrayList<Map<String, Object>>();
        items.addAll(center.audit(access.user().companyId(), definition.id()));
        items.addAll(moduleAudit.list(access.user().companyId(), kioskId));
        items.sort(java.util.Comparator.comparing(
            item -> String.valueOf(item.getOrDefault("created_at", "")),
            java.util.Comparator.reverseOrder()));
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    @PostMapping("/{kioskId}/grants")
    public ResponseEntity<?> grant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return denied(access);
        }
        var definition = registry.requireByLegacyReference(
            access.user().companyId(), ProcessTaskKioskCapabilities.OWNER_MODULE, kioskId);
        var identityId = number(payload.get("identity_id"));
        var result = grants.grant(
            definition, String.valueOf(payload.getOrDefault("identity_type", "")), identityId,
            String.valueOf(payload.getOrDefault("capability_key", "*")), access.user().userId());
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(result, null, null));
    }

    @DeleteMapping("/{kioskId}/grants/{grantId}")
    public ResponseEntity<?> revokeGrant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @PathVariable long grantId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return denied(access);
        }
        var definition = registry.requireByLegacyReference(
            access.user().companyId(), ProcessTaskKioskCapabilities.OWNER_MODULE, kioskId);
        grants.revoke(definition, grantId, access.user().userId());
        return ResponseEntity.ok(responses.success(Map.of("revoked", true), null, null));
    }

    private ResponseEntity<?> transition(
            HttpSession session,
            String csrfToken,
            long kioskId,
            Map<String, Object> payload,
            KioskDefinitionStatus status) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return denied(access);
        }
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        var result = kioskService.transitionKiosk(
            access.user().companyId(), access.user().userId(), kioskId, status, reason);
        return ResponseEntity.ok(responses.success(result, null, null));
    }

    private ResponseEntity<?> denied(ProcessTasksRequestGuard.Result access) {
        var status = access.error().getStatusCode();
        var code = status.value() == 401 ? "KIOSK_ADMIN_AUTH_REQUIRED" : "KIOSK_ADMIN_FORBIDDEN";
        return ResponseEntity.status(status).body(
            responses.error(code, "No tienes acceso para administrar kioskos.", false));
    }

    private long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? 0L : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("identity_id must be numeric.");
        }
    }
}
