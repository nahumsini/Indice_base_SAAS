package com.indice.erp.kiosk.api;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.kiosk.FinanceKioskModuleAuditService;
import com.indice.erp.finance.pettycash.PettyCashKioskCapabilities;
import com.indice.erp.finance.pettycash.PettyCashService;
import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import jakarta.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Map;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/v2/finance/petty-cash/kiosks")
public class PettyCashKioskAdminV2Controller {

    private final FinanceRequestGuard guard;
    private final PettyCashService service;
    private final KioskRegistryService registry;
    private final KioskGrantService grants;
    private final KioskCenterService center;
    private final FinanceKioskModuleAuditService moduleAudit;
    private final KioskV2ResponseFactory responses;

    public PettyCashKioskAdminV2Controller(
            FinanceRequestGuard guard,
            PettyCashService service,
            KioskRegistryService registry,
            KioskGrantService grants,
            KioskCenterService center,
            FinanceKioskModuleAuditService moduleAudit,
            KioskV2ResponseFactory responses) {
        this.guard = guard;
        this.service = service;
        this.registry = registry;
        this.grants = grants;
        this.center = center;
        this.moduleAudit = moduleAudit;
        this.responses = responses;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        var items = center.list(access.context().companyId()).stream()
            .filter(item -> PettyCashKioskCapabilities.OWNER_MODULE.equals(item.get("owner_module")))
            .toList();
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    @GetMapping("/{fundId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long fundId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), fundId);
        return ResponseEntity.ok(responses.success(
            center.detail(access.context().companyId(), definition.id()), null, null));
    }

    @PostMapping("/{fundId}/rotate-public-access-token")
    public ResponseEntity<?> rotate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(
            service.rotateKioskPublicToken(access.context(), fundId), null, null));
    }

    @DeleteMapping("/{fundId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(
            service.deleteKioskAccess(access.context(), fundId), null, null));
    }

    @PostMapping("/{fundId}/disable")
    public ResponseEntity<?> disable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, fundId, payload, KioskDefinitionStatus.DISABLED);
    }

    @PostMapping("/{fundId}/enable")
    public ResponseEntity<?> enable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, fundId, payload, KioskDefinitionStatus.ACTIVE);
    }

    @PostMapping("/{fundId}/revoke")
    public ResponseEntity<?> revoke(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, fundId, payload, KioskDefinitionStatus.REVOKED);
    }

    @GetMapping("/{fundId}/grants")
    public ResponseEntity<?> listGrants(HttpSession session, @PathVariable long fundId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(Map.of(
            "items", grants.list(definition(access.context().companyId(), fundId))), null, null));
    }

    @PostMapping("/{fundId}/grants")
    public ResponseEntity<?> grant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var result = grants.grant(
            definition(access.context().companyId(), fundId),
            String.valueOf(payload.getOrDefault("identity_type", "")),
            number(payload.get("identity_id")),
            String.valueOf(payload.getOrDefault("capability_key", "*")),
            access.context().userId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(responses.success(result, null, null));
    }

    @DeleteMapping("/{fundId}/grants/{grantId}")
    public ResponseEntity<?> revokeGrant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @PathVariable long grantId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        grants.revoke(definition(access.context().companyId(), fundId), grantId, access.context().userId());
        return ResponseEntity.ok(responses.success(Map.of("revoked", true), null, null));
    }

    @GetMapping("/{fundId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long fundId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), fundId);
        var items = new ArrayList<Map<String, Object>>();
        items.addAll(center.audit(access.context().companyId(), definition.id()));
        items.addAll(moduleAudit.list(
            access.context().companyId(), PettyCashKioskCapabilities.OWNER_MODULE, fundId));
        items.sort(Comparator.comparing(
            item -> String.valueOf(item.getOrDefault("created_at", "")), Comparator.reverseOrder()));
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    private ResponseEntity<?> transition(
            HttpSession session, String csrfToken, long fundId,
            Map<String, Object> payload, KioskDefinitionStatus status) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        return ResponseEntity.ok(responses.success(
            service.transitionKiosk(access.context(), fundId, status, reason), null, null));
    }

    private com.indice.erp.kiosk.engine.KioskResolvedDefinition definition(long companyId, long fundId) {
        return registry.requireByLegacyReference(
            companyId, PettyCashKioskCapabilities.OWNER_MODULE, fundId);
    }

    private long number(Object value) {
        if (value instanceof Number number) return number.longValue();
        try {
            return value == null ? 0L : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException failure) {
            throw new IllegalArgumentException("identity_id must be numeric.");
        }
    }
}
