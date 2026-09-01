package com.indice.erp.pos.square;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/square")
@RequiresCapability("pos")
public class SquareTerminalController {

    private final PosRequestGuard guard;
    private final SquareTerminalProperties properties;
    private final SquareSetupService setup;
    private final SquareTerminalPaymentService payments;

    public SquareTerminalController(PosRequestGuard guard, SquareTerminalProperties properties,
            SquareSetupService setup, SquareTerminalPaymentService payments) {
        this.guard = guard;
        this.properties = properties;
        this.setup = setup;
        this.payments = payments;
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(Map.of(
            "enabled", properties.isEnabled(),
            "environment", properties.getEnvironment()));
    }

    @PostMapping("/oauth/start")
    public ResponseEntity<?> oauthStart(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(setup.startOAuth(access.context()));
    }

    @GetMapping("/locations")
    public ResponseEntity<?> locations(HttpSession session) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(Map.of(
            "items", setup.squareLocations(access.context())));
    }

    @PostMapping("/locations/link")
    public ResponseEntity<?> linkLocation(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SquareTerminalDtos.LinkLocationRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(setup.linkLocation(
            access.context(), request.squareLocationId()));
    }

    @PostMapping("/terminals/pairing-code")
    public ResponseEntity<?> pairTerminal(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SquareTerminalDtos.PairTerminalRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(setup.pairTerminal(access.context(), request));
    }

    @GetMapping("/terminals")
    public ResponseEntity<?> terminals(HttpSession session) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(Map.of(
            "items", setup.listTerminals(access.context())));
    }

    @PostMapping("/registers/{registerId}/terminal")
    public ResponseEntity<?> assignTerminal(@PathVariable long registerId, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SquareTerminalDtos.AssignTerminalRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            setup.assignTerminal(access.context(), registerId, request.terminalId()));
    }

    @DeleteMapping("/registers/{registerId}/terminal")
    public ResponseEntity<?> unassignTerminal(@PathVariable long registerId, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        setup.unassignTerminal(access.context(), registerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/terminals/{terminalId}/disable")
    public ResponseEntity<?> disableTerminal(@PathVariable long terminalId, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            setup.disableTerminal(access.context(), terminalId));
    }

    @PostMapping("/terminals/{terminalId}/pairing-code")
    public ResponseEntity<?> refreshPairingCode(@PathVariable long terminalId, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            setup.refreshPairingCode(access.context(), terminalId));
    }

    @PostMapping("/terminal-payments")
    public ResponseEntity<?> createPayment(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SquareTerminalDtos.CreatePaymentRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(payments.create(access.context(), request));
    }

    @GetMapping("/terminal-payments/recoverable")
    public ResponseEntity<?> recoverablePayments(
            @RequestParam(required = false) Long cashRegisterId,
            @RequestParam(required = false) Long shiftId,
            @RequestParam(defaultValue = "25") int limit,
            HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(
            payments.recoverable(access.context(), cashRegisterId, shiftId, limit));
    }

    @GetMapping("/terminal-payments/{intentId}")
    public ResponseEntity<?> paymentStatus(@PathVariable long intentId, HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(payments.status(access.context(), intentId));
    }

    @PostMapping("/terminal-payments/{intentId}/cancel")
    public ResponseEntity<?> cancelPayment(@PathVariable long intentId, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(payments.cancel(access.context(), intentId));
    }

    @PostMapping("/terminal-payments/{intentId}/recover")
    public ResponseEntity<?> recoverPayment(@PathVariable long intentId, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(payments.recover(access.context(), intentId));
    }
}
