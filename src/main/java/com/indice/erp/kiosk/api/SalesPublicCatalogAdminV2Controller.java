package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.ReviewRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SaveRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.StatusRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogAdminAccess;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogAdminAccess.AdminContext;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/sales/kiosks")
public class SalesPublicCatalogAdminV2Controller {

    private final KioskInternalRequestGuard guard;
    private final SalesPublicCatalogService service;
    private final KioskRegistryService registry;
    private final KioskCenterService center;
    private final KioskV2ResponseFactory responses;
    private final SalesPublicCatalogAdminAccess adminAccess;

    public SalesPublicCatalogAdminV2Controller(
            KioskInternalRequestGuard guard,
            SalesPublicCatalogService service,
            KioskRegistryService registry,
            KioskCenterService center,
            KioskV2ResponseFactory responses,
            SalesPublicCatalogAdminAccess adminAccess) {
        this.guard = guard;
        this.service = service;
        this.registry = registry;
        this.center = center;
        this.responses = responses;
        this.adminAccess = adminAccess;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = access(guard.requireAuthenticated(session));
        var items = center.list(access.companyId()).stream()
            .filter(item -> SalesPublicCatalogService.OWNER_MODULE.equals(item.get("owner_module")))
            .filter(item -> SalesPublicCatalogService.KIOSK_TYPE.equals(item.get("kiosk_type")))
            .filter(item -> access.includes(number(item.get("unit_id")), number(item.get("business_id"))))
            .toList();
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SaveRequest request) {
        var access = access(guard.requireAuthenticatedWrite(session, csrfToken));
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(
            service.create(access, request), null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        var access = access(guard.requireAuthenticated(session));
        var definition = definition(access, kioskId);
        var configuration = service.list(access).stream()
            .filter(item -> item.id().equals(definition.legacyReferenceId()))
            .findFirst().orElseThrow();
        return ResponseEntity.ok(responses.success(Map.of(
            "definition", center.detail(access.companyId(), definition.id()),
            "configuration", configuration), null, null));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @Valid @RequestBody SaveRequest request) {
        var access = access(guard.requireAuthenticatedWrite(session, csrfToken));
        var definition = definition(access, kioskId);
        return ResponseEntity.ok(responses.success(service.update(
            access, definition.legacyReferenceId(), request), null, null));
    }

    @PostMapping("/{kioskId}/rotate-public-access-token")
    public ResponseEntity<?> rotate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = access(guard.requireAuthenticatedWrite(session, csrfToken));
        var definition = definition(access, kioskId);
        return ResponseEntity.ok(responses.success(service.rotate(
            access, definition.legacyReferenceId()), null, null));
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

    @DeleteMapping("/{kioskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = access(guard.requireAuthenticatedWrite(session, csrfToken));
        var definition = definition(access, kioskId);
        service.delete(access, definition.legacyReferenceId(), reason(payload));
        return ResponseEntity.ok(responses.success(Map.of("deleted", true), null, null));
    }

    @GetMapping("/requests")
    public ResponseEntity<?> requests(
            HttpSession session,
            @RequestParam(required = false) String status) {
        var access = access(guard.requireAuthenticated(session));
        return ResponseEntity.ok(responses.success(
            service.requests(access, status), null, null));
    }

    @PostMapping("/requests/{requestId}/review")
    public ResponseEntity<?> review(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @Valid @RequestBody ReviewRequest request) {
        var access = access(guard.requireAuthenticatedWrite(session, csrfToken));
        return ResponseEntity.ok(responses.success(service.review(
            access, requestId, request), null, null));
    }

    @GetMapping("/{kioskId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long kioskId) {
        var access = access(guard.requireAuthenticated(session));
        var definition = definition(access, kioskId);
        var items = new ArrayList<Map<String, Object>>();
        items.addAll(center.audit(access.companyId(), definition.id()));
        items.addAll(service.audit(access, definition.legacyReferenceId()));
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
        var access = access(guard.requireAuthenticatedWrite(session, csrfToken));
        var definition = definition(access, kioskId);
        return ResponseEntity.ok(responses.success(service.transition(
            access, definition.legacyReferenceId(),
            new StatusRequest(status, reason(payload))), null, null));
    }

    private com.indice.erp.kiosk.engine.KioskResolvedDefinition definition(
            AdminContext access,
            long kioskDefinitionId) {
        var definition = registry.requireById(access.companyId(), kioskDefinitionId);
        if (!SalesPublicCatalogService.OWNER_MODULE.equals(definition.ownerModule())
                || !SalesPublicCatalogService.KIOSK_TYPE.equals(definition.kioskType())
                || definition.legacyReferenceId() == null) {
            throw new java.util.NoSuchElementException("Public catalog kiosk not found.");
        }
        access.requireIncludes(definition.unitId(), definition.businessId());
        return definition;
    }

    private AdminContext access(com.indice.erp.auth.AuthSessionUser user) {
        return adminAccess.require(user);
    }

    private Long number(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private String reason(Map<String, Object> payload) {
        return payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
    }
}
