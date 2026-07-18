package com.indice.erp.kiosk.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.customerdisplay.CustomerDisplayService;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.CreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.StatusRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.UpdateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
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

/** Module-owned administration surface shared by every POS kiosk experience. */
@RestController
@RequestMapping("/api/v2/point-of-sale/kiosks")
public class PointOfSaleKioskAdminV2Controller {

    private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private final PosRequestGuard guard;
    private final CustomerDisplayService customerDisplays;
    private final SelfServiceKioskService selfService;
    private final KioskRegistryService registry;
    private final KioskCenterService center;
    private final KioskV2ResponseFactory responses;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public PointOfSaleKioskAdminV2Controller(
            PosRequestGuard guard,
            CustomerDisplayService customerDisplays,
            SelfServiceKioskService selfService,
            KioskRegistryService registry,
            KioskCenterService center,
            KioskV2ResponseFactory responses,
            ObjectMapper objectMapper,
            Validator validator) {
        this.guard = guard;
        this.customerDisplays = customerDisplays;
        this.selfService = selfService;
        this.registry = registry;
        this.center = center;
        this.responses = responses;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @GetMapping
    public ResponseEntity<?> list(
            HttpSession session,
            @RequestParam(name = "type", required = false) String type) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var items = new ArrayList<Object>();
        if (type == null || type.isBlank()
                || PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(type)) {
            items.addAll(customerDisplays.listAdmin(access.context()));
        }
        if (type == null || type.isBlank()
                || PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(type)) {
            selfService.list(access.context()).stream()
                .map(item -> selfServiceView(access.context().companyId(), item))
                .forEach(items::add);
        }
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestParam(name = "type", defaultValue = "self_service") String type,
            @Valid @RequestBody CreateRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        if (!PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(type)) {
            throw new UnsupportedOperationException("This POS kiosk type has a different creation flow.");
        }
        var created = selfService.create(access.context(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(
            selfServiceView(access.context().companyId(), created), null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        Object data;
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())) {
            data = customerDisplays.adminDetail(access.context(), kioskId);
        } else if (PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            data = selfServiceView(access.context().companyId(), requireSelfService(
                access.context(), definition.legacyReferenceId()));
        } else {
            throw new java.util.NoSuchElementException("Point of Sale kiosk not found.");
        }
        return ResponseEntity.ok(responses.success(data, null, null));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        Object data;
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())) {
            data = customerDisplays.rename(
                access.context(), kioskId, String.valueOf(payload.getOrDefault("name", "")));
        } else if (PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            var request = valid(objectMapper.convertValue(payload, UpdateRequest.class));
            data = selfServiceView(access.context().companyId(), selfService.update(
                access.context(), definition.legacyReferenceId(), request));
        } else {
            throw new java.util.NoSuchElementException("Point of Sale kiosk not found.");
        }
        return ResponseEntity.ok(responses.success(data, null, null));
    }

    @PostMapping("/{kioskId}/rotate-public-access-token")
    public ResponseEntity<?> rotate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        if (!PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            throw new UnsupportedOperationException("This POS kiosk type does not expose link rotation.");
        }
        return ResponseEntity.ok(responses.success(selfServiceView(
            access.context().companyId(), selfService.rotateLink(
                access.context(), definition.legacyReferenceId())), null, null));
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
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())) {
            customerDisplays.delete(access.context(), kioskId, reason(payload));
        } else if (PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            requireSelfService(access.context(), definition.legacyReferenceId());
            selfService.delete(access.context(), definition.legacyReferenceId(), reason(payload));
        } else {
            throw new java.util.NoSuchElementException("Point of Sale kiosk not found.");
        }
        return ResponseEntity.ok(responses.success(Map.of("deleted", true), null, null));
    }

    @GetMapping("/{kioskId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        requireVisible(access.context(), definition);
        var items = new ArrayList<Map<String, Object>>();
        items.addAll(center.audit(access.context().companyId(), kioskId));
        if (PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            items.addAll(selfService.audit(access.context(), definition.legacyReferenceId()));
        }
        items.sort(Comparator.comparing(
            item -> String.valueOf(item.getOrDefault("created_at", "")), Comparator.reverseOrder()));
        return ResponseEntity.ok(responses.success(Map.of(
            "items", items), null, null));
    }

    private ResponseEntity<?> transition(
            HttpSession session,
            String csrfToken,
            long kioskId,
            Map<String, Object> payload,
            KioskDefinitionStatus status) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        Object data;
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())) {
            data = customerDisplays.transition(
                access.context(), kioskId, status, reason(payload));
        } else if (PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            requireSelfService(access.context(), definition.legacyReferenceId());
            data = selfServiceView(access.context().companyId(), selfService.transition(
                access.context(), definition.legacyReferenceId(),
                new StatusRequest(status.name(), reason(payload))));
        } else {
            throw new java.util.NoSuchElementException("Point of Sale kiosk not found.");
        }
        return ResponseEntity.ok(responses.success(data, null, null));
    }

    private KioskResolvedDefinition definition(long companyId, long kioskId) {
        var definition = registry.requireById(companyId, kioskId);
        if (!PointOfSaleKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || definition.legacyReferenceId() == null) {
            throw new java.util.NoSuchElementException("Point of Sale kiosk not found.");
        }
        return definition;
    }

    private void requireVisible(
            com.indice.erp.pos.PosContext context,
            KioskResolvedDefinition definition) {
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())) {
            customerDisplays.adminDetail(context, definition.id());
        } else if (PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            requireSelfService(context, definition.legacyReferenceId());
        } else {
            throw new java.util.NoSuchElementException("Point of Sale kiosk not found.");
        }
    }

    private com.indice.erp.pos.selfservice.SelfServiceKioskDtos.AdminResponse requireSelfService(
            com.indice.erp.pos.PosContext context,
            long legacyReferenceId) {
        return selfService.list(context).stream()
            .filter(item -> item.id() == legacyReferenceId)
            .findFirst()
            .orElseThrow(() -> new java.util.NoSuchElementException("Self-service kiosk not found."));
    }

    private Map<String, Object> selfServiceView(
            long companyId,
            com.indice.erp.pos.selfservice.SelfServiceKioskDtos.AdminResponse item) {
        var definition = registry.requireByLegacyReference(
            companyId, PointOfSaleKioskCapabilities.OWNER_MODULE, item.id());
        if (!PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())) {
            throw new java.util.NoSuchElementException("Self-service kiosk not found.");
        }
        var view = objectMapper.convertValue(item, MAP_TYPE);
        view.put("legacyReferenceId", item.id());
        view.put("id", definition.id());
        view.put("kioskType", definition.kioskType());
        view.put("configurationVersion", definition.configurationVersion());
        return java.util.Collections.unmodifiableMap(view);
    }

    private <T> T valid(T request) {
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            var violation = violations.iterator().next();
            throw new IllegalArgumentException(
                violation.getPropertyPath() + " " + violation.getMessage());
        }
        return request;
    }

    private String reason(Map<String, Object> payload) {
        return payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
    }
}
