package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskEngineDisabledException;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessPinRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessConfigurationRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessStatusRequest;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementKioskModuleAuditService;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalAdminService;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalCapabilities;
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
@RequestMapping("/api/v2/procurement/kiosks")
public class ProcurementSupplierPortalAdminV2Controller {

    private final PosRequestGuard guard;
    private final ProcurementSupplierPortalAdminService service;
    private final ProcurementKioskModuleAuditService moduleAudit;
    private final KioskRegistryService registry;
    private final KioskGrantService grants;
    private final KioskCenterService center;
    private final KioskV2ResponseFactory responses;
    private final KioskEngineFeatureFlags flags;

    public ProcurementSupplierPortalAdminV2Controller(
            PosRequestGuard guard,
            ProcurementSupplierPortalAdminService service,
            ProcurementKioskModuleAuditService moduleAudit,
            KioskRegistryService registry,
            KioskGrantService grants,
            KioskCenterService center,
            KioskV2ResponseFactory responses,
            KioskEngineFeatureFlags flags) {
        this.guard = guard;
        this.service = service;
        this.moduleAudit = moduleAudit;
        this.registry = registry;
        this.grants = grants;
        this.center = center;
        this.responses = responses;
        this.flags = flags;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        requireEnabled();
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var items = center.list(access.context().companyId()).stream()
            .filter(item -> ProcurementSupplierPortalCapabilities.OWNER_MODULE.equals(item.get("owner_module")))
            .filter(item -> ProcurementSupplierPortalCapabilities.KIOSK_TYPE.equals(item.get("kiosk_type")))
            // Scope is owned by the immutable Engine snapshot, not by a live JOIN
            // against the provider row. This keeps revoked/orphaned definitions
            // manageable so an administrator can audit and delete them safely.
            .filter(item -> scopeAllows(access.context(),
                number(item.get("unit_id")), number(item.get("business_id"))))
            .toList();
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SupplierPortalAccessRequest request) {
        requireEnabled();
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var created = service.create(access.context(), request);
        var definition = service.definition(access.context(), created.id());
        var data = new java.util.LinkedHashMap<>(
            center.detail(access.context().companyId(), definition.id()));
        data.put("issued_link", Map.of(
            "portal_code", created.portalCode(), "portal_url", created.portalUrl()));
        data.put("personal_pin_created", created.personalPinCreated());
        return ResponseEntity.status(HttpStatus.CREATED).body(
            responses.success(data, null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context(), kioskId);
        return ResponseEntity.ok(responses.success(
            center.detail(access.context().companyId(), definition.id()), null, null));
    }

    @PostMapping("/{kioskId}/disable")
    public ResponseEntity<?> disable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, "DISABLED");
    }

    @PostMapping("/{kioskId}/enable")
    public ResponseEntity<?> enable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, "ACTIVE");
    }

    @PostMapping("/{kioskId}/revoke")
    public ResponseEntity<?> revoke(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, "REVOKED");
    }

    @PostMapping("/{kioskId}/rotate-pin")
    public ResponseEntity<?> rotatePin(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @Valid @RequestBody SupplierPortalAccessPinRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context(), kioskId);
        service.rotatePin(access.context(), definition.legacyReferenceId(), request);
        return ResponseEntity.ok(responses.success(
            center.detail(access.context().companyId(), definition.id()), null, null));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> updateConfiguration(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @Valid @RequestBody SupplierPortalAccessConfigurationRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context(), kioskId);
        var updated = service.updateConfiguration(
            access.context(), definition.legacyReferenceId(), request);
        return ResponseEntity.ok(responses.success(
            center.detail(access.context().companyId(), updated.id()), null, null));
    }

    @DeleteMapping("/{kioskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context(), kioskId);
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        service.delete(access.context(), definition.legacyReferenceId(), reason);
        return ResponseEntity.ok(responses.success(Map.of("deleted", true), null, null));
    }

    @GetMapping("/{kioskId}/grants")
    public ResponseEntity<?> grants(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(responses.success(Map.of(
            "items", grants.list(definition(access.context(), kioskId))), null, null));
    }

    @PostMapping("/{kioskId}/grants")
    public ResponseEntity<?> createGrant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context(), kioskId);
        var identityType = text(payload, "identity_type", "identityType");
        var identityId = number(first(payload, "identity_id", "identityId"));
        var capability = text(payload, "capability_key", "capabilityKey");
        if (identityId == null) {
            throw new IllegalArgumentException("identity_id is required.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(
            service.grant(access.context(), definition.legacyReferenceId(),
                identityType, identityId, capability), null, null));
    }

    @DeleteMapping("/{kioskId}/grants/{grantId}")
    public ResponseEntity<?> revokeGrant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @PathVariable long grantId) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context(), kioskId);
        service.revokeGrant(access.context(), definition.legacyReferenceId(), grantId);
        return ResponseEntity.ok(responses.success(Map.of("revoked", true), null, null));
    }

    @GetMapping("/{kioskId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var items = new ArrayList<Map<String, Object>>();
        try {
            var definition = definition(access.context(), kioskId);
            items.addAll(center.audit(access.context().companyId(), definition.id()));
            items.addAll(moduleAudit.list(
                access.context().companyId(), definition.legacyReferenceId()));
        } catch (java.util.NoSuchElementException unavailable) {
            var historical = center.historicalDefinition(
                access.context().companyId(), kioskId);
            if (!ProcurementSupplierPortalCapabilities.OWNER_MODULE.equals(historical.ownerModule())
                    || !ProcurementSupplierPortalCapabilities.KIOSK_TYPE.equals(historical.kioskType())
                    || historical.legacyReferenceId() == null
                    || !scopeAllows(access.context(), historical.unitId(), historical.businessId())) {
                throw new java.util.NoSuchElementException("Supplier portal kiosk not found.");
            }
            items.addAll(center.auditHistorical(access.context().companyId(), kioskId));
            items.addAll(moduleAudit.list(
                access.context().companyId(), historical.legacyReferenceId()));
        }
        items.sort(Comparator.comparing(
            item -> String.valueOf(item.getOrDefault("created_at", "")), Comparator.reverseOrder()));
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    private ResponseEntity<?> transition(
            HttpSession session,
            String csrfToken,
            long kioskId,
            Map<String, Object> payload,
            String status) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context(), kioskId);
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        service.transition(
            access.context(), definition.legacyReferenceId(),
            new SupplierPortalAccessStatusRequest(status), reason);
        return ResponseEntity.ok(responses.success(
            center.detail(access.context().companyId(), definition.id()), null, null));
    }

    private com.indice.erp.kiosk.engine.KioskResolvedDefinition definition(
            PosContext context,
            long kioskId) {
        requireEnabled();
        var definition = registry.requireById(context.companyId(), kioskId);
        if (!ProcurementSupplierPortalCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || !ProcurementSupplierPortalCapabilities.KIOSK_TYPE.equals(definition.kioskType())
                || definition.legacyReferenceId() == null
                || !scopeAllows(context, definition.unitId(), definition.businessId())) {
            throw new java.util.NoSuchElementException("Supplier portal kiosk not found.");
        }
        return definition;
    }

    private Long number(Object value) {
        if (value instanceof Number number) return number.longValue();
        try {
            return value == null ? null : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Object first(Map<String, Object> payload, String primary, String fallback) {
        if (payload == null) return null;
        return payload.containsKey(primary) ? payload.get(primary) : payload.get(fallback);
    }

    private String text(Map<String, Object> payload, String primary, String fallback) {
        var value = first(payload, primary, fallback);
        return value == null ? "" : String.valueOf(value).trim();
    }

    private boolean scopeAllows(PosContext context, Long unitId, Long businessId) {
        return switch (context.scope().type()) {
            case CORPORATE_OFFICE -> true;
            case UNIT_HEADQUARTERS -> java.util.Objects.equals(context.scope().unitId(), unitId);
            case BUSINESS_OFFICE -> java.util.Objects.equals(context.scope().businessId(), businessId)
                && java.util.Objects.equals(context.scope().unitId(), unitId);
        };
    }

    private void requireEnabled() {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.auditEnabled()
                || !flags.adapterEnabled(ProcurementSupplierPortalCapabilities.OWNER_MODULE)) {
            throw new KioskEngineDisabledException();
        }
    }
}
