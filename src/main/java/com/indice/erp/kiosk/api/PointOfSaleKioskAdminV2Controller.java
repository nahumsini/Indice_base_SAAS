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
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.SelfCheckoutCreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.StatusRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.UpdateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskService;
import com.indice.erp.pos.shift.ShiftRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Validator;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
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
    private final ShiftRepository shifts;
    private final KioskV2ResponseFactory responses;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public PointOfSaleKioskAdminV2Controller(
            PosRequestGuard guard,
            CustomerDisplayService customerDisplays,
            SelfServiceKioskService selfService,
            KioskRegistryService registry,
            KioskCenterService center,
            ShiftRepository shifts,
            KioskV2ResponseFactory responses,
            ObjectMapper objectMapper,
            Validator validator) {
        this.guard = guard;
        this.customerDisplays = customerDisplays;
        this.selfService = selfService;
        this.registry = registry;
        this.center = center;
        this.shifts = shifts;
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
        var items = new ArrayList<Map<String, Object>>();
        if (type == null || type.isBlank()
                || PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(type)) {
            customerDisplays.listAdmin(access.context()).stream()
                .map(item -> customerDisplayView(access.context(), item))
                .forEach(items::add);
        }
        if (type == null || type.isBlank()
                || PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(type)
                || PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(type)) {
            for (var source : selfService.list(access.context())) {
                try {
                    var item = selfServiceAdminView(access.context(), source);
                    if (type == null || type.isBlank() || type.equals(item.get("kioskType"))) {
                        items.add(item);
                    }
                } catch (java.util.NoSuchElementException orphanedLegacyRow) {
                    // A legacy row without a typed Engine definition is not an operable kiosk.
                    // Keep the rest of the administration inventory available for repair.
                }
            }
        }
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestParam(name = "type", defaultValue = "self_service") String type,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        final com.indice.erp.pos.selfservice.SelfServiceKioskDtos.AdminResponse created;
        if (PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(type)) {
            created = selfService.create(
                access.context(), valid(objectMapper.convertValue(payload, CreateRequest.class)));
        } else if (PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(type)) {
            created = selfService.createSelfCheckout(
                access.context(), valid(objectMapper.convertValue(
                    payload, SelfCheckoutCreateRequest.class)));
        } else {
            throw new UnsupportedOperationException("This POS kiosk type has a different creation flow.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(
            selfServiceView(access.context().companyId(), created), null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        Map<String, Object> data;
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())) {
            data = customerDisplayView(
                access.context(), customerDisplays.adminDetail(access.context(), kioskId));
        } else if (isSelfServiceBacked(definition)) {
            data = selfServiceAdminView(access.context(), requireSelfService(
                access.context(), definition.legacyReferenceId()));
        } else {
            throw new java.util.NoSuchElementException("Point of Sale kiosk not found.");
        }
        return ResponseEntity.ok(responses.success(data, null, null));
    }

    @GetMapping("/{kioskId}/public-access")
    public ResponseEntity<?> publicAccess(HttpSession session, @PathVariable long kioskId) {
        var access = guard.requireAdminReadAccess(session);
        if (access.denied()) return access.error();
        var definition = definition(access.context().companyId(), kioskId);
        var data = PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())
            ? customerDisplays.publicAccess(access.context(), kioskId)
            : isSelfServiceBacked(definition)
                ? selfService.publicAccess(access.context(), definition.legacyReferenceId())
                : null;
        if (data == null) {
            throw new UnsupportedOperationException("This POS kiosk type does not expose a link.");
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
        } else if (isSelfServiceBacked(definition)) {
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
        Map<String, Object> data;
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())) {
            data = customerDisplays.rotatePublicAccess(access.context(), kioskId);
        } else if (isSelfServiceBacked(definition)) {
            var rotated = selfService.rotateLink(access.context(), definition.legacyReferenceId());
            data = Map.of(
                "kioskId", definition.id(),
                "name", rotated.name(),
                "displayUrl", rotated.publicUrl(),
                "publicTokenHint", rotated.publicTokenHint());
        } else {
            throw new UnsupportedOperationException("This POS kiosk type does not expose link rotation.");
        }
        return ResponseEntity.ok(responses.success(data, null, null));
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
        } else if (isSelfServiceBacked(definition)) {
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
        if (isSelfServiceBacked(definition)) {
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
        } else if (isSelfServiceBacked(definition)) {
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
        } else if (isSelfServiceBacked(definition)) {
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

    private Map<String, Object> customerDisplayView(
            com.indice.erp.pos.PosContext context,
            Map<String, Object> source) {
        var kioskId = number(source.get("id"));
        var status = string(source.get("status"));
        var lastSeen = stringOrNull(source.get("lastSeenAt"));
        var cashRegisterId = numberOrNull(source.get("cashRegisterId"));
        var centerView = center.detail(context.companyId(), kioskId);
        var result = baseAdminView(
            kioskId,
            number(source.get("deviceId")),
            PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE,
            string(source.get("name")),
            string(source.get("code")),
            status,
            assignment(
                source.get("unitId"), source.get("unitName"),
                source.get("businessId"), source.get("businessName"),
                source.get("warehouseId"), source.get("warehouseName"),
                source.get("cashRegisterId"), source.get("cashRegisterCode"),
                source.get("cashRegisterName")),
            Boolean.TRUE.equals(source.get("connected"))
                ? "ONLINE" : lastSeen == null ? "NEVER_CONNECTED" : "OFFLINE",
            lastSeen,
            stringOrNull(centerView.get("expires_at")),
            string(source.get("publicTokenHint")),
            true,
            numberOrDefault(source.get("version"),
                numberOrDefault(source.get("configurationVersion"), 1L)),
            sourceRegisterState(context.companyId(), cashRegisterId));
        return result;
    }

    private Map<String, Object> selfServiceAdminView(
            com.indice.erp.pos.PosContext context,
            com.indice.erp.pos.selfservice.SelfServiceKioskDtos.AdminResponse source) {
        var definition = selfServiceDefinition(context.companyId(), source.id());
        var centerView = center.detail(context.companyId(), definition.id());
        var lastSeen = stringOrNull(centerView.get("last_seen_at"));
        return baseAdminView(
            definition.id(), source.id(), definition.kioskType(),
            source.name(), source.code(), source.status(),
            assignment(
                source.unitId(), source.unitName(), source.businessId(), source.businessName(),
                source.warehouseId(), source.warehouseName(), source.cashRegisterId(),
                source.cashRegisterCode(), source.cashRegisterName()),
            connectionStatus(lastSeen),
            stringOrNull(centerView.get("last_activity_at")),
            source.expiresAt() == null ? null : source.expiresAt().toString(),
            source.publicTokenHint(),
            Boolean.TRUE.equals(centerView.get("access_recoverable")),
            source.version(),
            sourceRegisterState(context.companyId(), source.cashRegisterId()));
    }

    private Map<String, Object> baseAdminView(
            long id,
            long legacyReferenceId,
            String kioskType,
            String name,
            String code,
            String status,
            Map<String, Object> assignment,
            String connectionStatus,
            String lastActivityAt,
            String expiresAt,
            String publicTokenHint,
            boolean accessRecoverable,
            long version,
            SourceRegisterState sourceRegisterState) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", id);
        result.put("legacyReferenceId", legacyReferenceId);
        result.put("kioskType", kioskType);
        result.put("name", name);
        result.put("code", code);
        result.put("status", status);
        result.put("configurationStatus", "CONFIGURED");
        result.put("assignment", assignment);
        result.put("connectionStatus", connectionStatus);
        put(result, "lastActivityAt", lastActivityAt);
        put(result, "expiresAt", expiresAt);
        result.put("publicTokenHint", publicTokenHint);
        result.put("accessRecoverable", accessRecoverable);
        result.put("version", version);
        result.put("sourceRegisterOpen", sourceRegisterState.open());
        result.put("operationalStatus", sourceRegisterState.status());
        result.put("actions", actionAvailability(status, accessRecoverable));
        return Collections.unmodifiableMap(result);
    }

    private Map<String, Object> assignment(
            Object unitId,
            Object unitName,
            Object businessId,
            Object businessName,
            Object warehouseId,
            Object warehouseName,
            Object cashRegisterId,
            Object cashRegisterCode,
            Object cashRegisterName) {
        var result = new LinkedHashMap<String, Object>();
        put(result, "unitId", unitId);
        put(result, "unitName", unitName);
        put(result, "businessId", businessId);
        put(result, "businessName", businessName);
        put(result, "warehouseId", warehouseId);
        put(result, "warehouseName", warehouseName);
        put(result, "cashRegisterId", cashRegisterId);
        put(result, "cashRegisterCode", cashRegisterCode);
        put(result, "cashRegisterName", cashRegisterName);
        result.put("kind", "CASH_REGISTER");
        result.put("primaryLabel", firstText(warehouseName, businessName, unitName));
        result.put("secondaryLabel", joined(cashRegisterCode, cashRegisterName));
        return Collections.unmodifiableMap(result);
    }

    private Map<String, Boolean> actionAvailability(String status, boolean accessRecoverable) {
        var mutable = List.of("ACTIVE", "DISABLED").contains(status);
        return Map.of(
            "edit", mutable,
            "access", "ACTIVE".equals(status) && accessRecoverable,
            "copy", mutable && accessRecoverable,
            "rotate", mutable,
            "toggle", mutable,
            "delete", true);
    }

    private String connectionStatus(String lastSeenAt) {
        if (lastSeenAt == null) return "NEVER_CONNECTED";
        try {
            return Instant.parse(lastSeenAt).isAfter(Instant.now().minus(2, ChronoUnit.MINUTES))
                ? "ONLINE" : "OFFLINE";
        } catch (java.time.format.DateTimeParseException invalid) {
            return "NEVER_CONNECTED";
        }
    }

    private String firstText(Object... values) {
        for (var value : values) {
            var text = stringOrNull(value);
            if (text != null) return text;
        }
        return "";
    }

    private String joined(Object code, Object name) {
        var left = stringOrNull(code);
        var right = stringOrNull(name);
        if (left == null) return right == null ? "" : right;
        return right == null ? left : left + " · " + right;
    }

    private long number(Object value) {
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(String.valueOf(value));
    }

    private long numberOrDefault(Object value, long fallback) {
        return value == null ? fallback : number(value);
    }

    private Long numberOrNull(Object value) {
        return value == null ? null : number(value);
    }

    private SourceRegisterState sourceRegisterState(long companyId, Long cashRegisterId) {
        if (cashRegisterId == null) {
            return new SourceRegisterState(false, "SOURCE_REGISTER_UNASSIGNED");
        }
        var open = shifts.hasOpenShift(companyId, cashRegisterId);
        return new SourceRegisterState(open, open ? "READY" : "SOURCE_REGISTER_CLOSED");
    }

    private record SourceRegisterState(boolean open, String status) {
    }

    private String string(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String stringOrNull(Object value) {
        var text = string(value).trim();
        return text.isEmpty() || "null".equalsIgnoreCase(text) ? null : text;
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null && !String.valueOf(value).isBlank()) target.put(key, value);
    }

    private Map<String, Object> selfServiceView(
            long companyId,
            com.indice.erp.pos.selfservice.SelfServiceKioskDtos.AdminResponse item) {
        var definition = selfServiceDefinition(companyId, item.id());
        if (!isSelfServiceBacked(definition)) {
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

    private boolean isSelfServiceBacked(KioskResolvedDefinition definition) {
        return PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())
            || PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(definition.kioskType());
    }

    private KioskResolvedDefinition selfServiceDefinition(long companyId, long legacyReferenceId) {
        for (var kioskType : List.of(
                PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE,
                PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE)) {
            try {
                return registry.requireByLegacyReference(
                    companyId, PointOfSaleKioskCapabilities.OWNER_MODULE,
                    kioskType, legacyReferenceId);
            } catch (java.util.NoSuchElementException ignored) {
                // Try the other self-service-backed experience.
            }
        }
        throw new java.util.NoSuchElementException("Self-service kiosk definition not found.");
    }

    private String reason(Map<String, Object> payload) {
        return payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
    }
}
