package com.indice.erp.pos.restaurant;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/restaurant")
@RequiresCapability("pos")
public class RestaurantOrderController {

    private final PosRequestGuard guard;
    private final RestaurantOrderService service;

    public RestaurantOrderController(PosRequestGuard guard, RestaurantOrderService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping("/ecosystems")
    public ResponseEntity<?> ecosystems(HttpSession session) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(Map.of("items", service.listEcosystems(access.context())));
    }

    @GetMapping("/ecosystems/{ecosystemId}/trace")
    public ResponseEntity<?> trace(HttpSession session, @PathVariable long ecosystemId) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.ecosystemTrace(access.context(), ecosystemId));
    }

    @GetMapping("/checkout/pending")
    public ResponseEntity<?> pending(HttpSession session, @RequestParam long cashRegisterId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(Map.of(
            "items", service.pendingCheckout(access.context(), cashRegisterId)));
    }

    @PostMapping("/orders/{orderId}/claim")
    public ResponseEntity<?> claim(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long orderId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.status(HttpStatus.OK).body(service.claim(
            access.context(), orderId, number(payload.get("cashRegisterId"))));
    }

    @PostMapping("/orders/{orderId}/release")
    public ResponseEntity<?> release(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long orderId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.release(
            access.context(), orderId, number(payload.get("cashRegisterId"))));
    }

    private long number(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value == null) throw new IllegalArgumentException("cashRegisterId is required.");
        return Long.parseLong(String.valueOf(value));
    }
}
