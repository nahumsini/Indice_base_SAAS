package com.indice.erp.kiosk.api;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.kiosk.FinanceKioskModuleAuditService;
import com.indice.erp.finance.payablekiosk.PayableKioskCapabilities;
import com.indice.erp.finance.payablekiosk.PayableKioskService;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskRequest;
import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskIdentityBiometricService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.Comparator;
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
@RequestMapping("/api/v2/finance/payable-kiosks")
public class PayableKioskAdminV2Controller {

    private final FinanceRequestGuard guard;
    private final PayableKioskService service;
    private final KioskRegistryService registry;
    private final KioskGrantService grants;
    private final KioskCenterService center;
    private final KioskIdentityBiometricService biometrics;
    private final FinanceKioskModuleAuditService moduleAudit;
    private final KioskV2ResponseFactory responses;

    public PayableKioskAdminV2Controller(
            FinanceRequestGuard guard,
            PayableKioskService service,
            KioskRegistryService registry,
            KioskGrantService grants,
            KioskCenterService center,
            KioskIdentityBiometricService biometrics,
            FinanceKioskModuleAuditService moduleAudit,
            KioskV2ResponseFactory responses) {
        this.guard = guard;
        this.service = service;
        this.registry = registry;
        this.grants = grants;
        this.center = center;
        this.biometrics = biometrics;
        this.moduleAudit = moduleAudit;
        this.responses = responses;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        var items = center.list(access.context().companyId()).stream()
            .filter(item -> PayableKioskCapabilities.OWNER_MODULE.equals(item.get("owner_module")))
            .toList();
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody PayableKioskRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(
            service.create(access.context(), request), null, null));
    }

    @GetMapping("/biometric-policy")
    public ResponseEntity<?> biometricPolicy(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(
            biometrics.companyPolicy(access.context().companyId()), null, null));
    }

    @PutMapping("/biometric-policy")
    public ResponseEntity<?> updateBiometricPolicy(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        if (payload == null || !(payload.get("enabled") instanceof Boolean enabled)) {
            throw new IllegalArgumentException("enabled must be boolean.");
        }
        return ResponseEntity.ok(responses.success(
            biometrics.updateCompanyPolicy(
                access.context().companyId(), access.context().userId(), enabled),
            null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        return ResponseEntity.ok(responses.success(
            center.detail(access.context().companyId(), definition.id()), null, null));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @Valid @RequestBody PayableKioskRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(
            service.update(access.context(), kioskId, request), null, null));
    }

    @PostMapping("/{kioskId}/rotate-public-access-token")
    public ResponseEntity<?> rotate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(
            service.rotatePublicToken(access.context(), kioskId), null, null));
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
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(
            service.delete(access.context(), kioskId), null, null));
    }

    @GetMapping("/{kioskId}/grants")
    public ResponseEntity<?> listGrants(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(Map.of(
            "items", grants.list(definition(access.context().companyId(), kioskId))), null, null));
    }

    @PostMapping("/{kioskId}/grants")
    public ResponseEntity<?> grant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var result = grants.grant(
            definition(access.context().companyId(), kioskId),
            String.valueOf(payload.getOrDefault("identity_type", "")),
            number(payload.get("identity_id")),
            String.valueOf(payload.getOrDefault("capability_key", "*")),
            access.context().userId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(responses.success(result, null, null));
    }

    @DeleteMapping("/{kioskId}/grants/{grantId}")
    public ResponseEntity<?> revokeGrant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @PathVariable long grantId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        grants.revoke(definition(access.context().companyId(), kioskId), grantId, access.context().userId());
        return ResponseEntity.ok(responses.success(Map.of("revoked", true), null, null));
    }

    @GetMapping("/{kioskId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        var items = new ArrayList<Map<String, Object>>();
        items.addAll(center.audit(access.context().companyId(), definition.id()));
        items.addAll(moduleAudit.list(
            access.context().companyId(), PayableKioskCapabilities.OWNER_MODULE, kioskId));
        items.sort(Comparator.comparing(
            item -> String.valueOf(item.getOrDefault("created_at", "")), Comparator.reverseOrder()));
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    private ResponseEntity<?> transition(
            HttpSession session, String csrfToken, long kioskId,
            Map<String, Object> payload, KioskDefinitionStatus status) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        return ResponseEntity.ok(responses.success(
            service.transition(access.context(), kioskId, status, reason), null, null));
    }

    private com.indice.erp.kiosk.engine.KioskResolvedDefinition definition(long companyId, long kioskId) {
        return registry.requireByLegacyReference(
            companyId, PayableKioskCapabilities.OWNER_MODULE, kioskId);
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
